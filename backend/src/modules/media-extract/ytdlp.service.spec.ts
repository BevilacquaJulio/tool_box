import type { ConfigService } from '@nestjs/config';
import { EventEmitter } from 'node:events';
import { existsSync } from 'node:fs';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { PassThrough } from 'node:stream';
import type { EnvConfig } from '../../config/env.validation';
import { validateEnv } from '../../config/env.validation';

const mockExecFile = jest.fn();
const mockSpawn = jest.fn();

jest.mock('node:child_process', () => ({
  execFile: (...args: unknown[]) => mockExecFile(...args),
  spawn: (...args: unknown[]) => mockSpawn(...args),
}));

import { YtdlpService } from './ytdlp.service';

function makeConfig(overrides: Partial<Record<keyof EnvConfig, unknown>> = {}): ConfigService<EnvConfig, true> {
  const values: Partial<Record<keyof EnvConfig, unknown>> = {
    YTDLP_BINARY_PATH: 'yt-dlp',
    FFMPEG_BINARY_PATH: 'ffmpeg',
    YTDLP_COOKIES_PATH: undefined,
    ...overrides,
  };
  return {
    get: (key: keyof EnvConfig) => values[key],
  } as unknown as ConfigService<EnvConfig, true>;
}

type ExecFileCallback = (
  error: Error | null,
  result?: { stdout: string; stderr: string },
) => void;

function stubExecFile(
  handler: (cmd: string, args: string[]) => Promise<{ stdout: string; stderr: string }> | { stdout: string; stderr: string },
) {
  mockExecFile.mockImplementation(
    (cmd: string, args: string[], _opts: unknown, callback?: ExecFileCallback) => {
      const cb = typeof _opts === 'function' ? (_opts as ExecFileCallback) : callback;
      Promise.resolve()
        .then(() => handler(cmd, args))
        .then(
          (res) => cb?.(null, res),
          (err: Error) => cb?.(err),
        );
    },
  );
}

describe('YtdlpService — cookies isolados e runtime JS', () => {
  let fixtureDir: string;

  beforeEach(async () => {
    jest.clearAllMocks();
    fixtureDir = await mkdtemp(join(tmpdir(), 'toolbox-ytdlp-test-'));
  });

  afterEach(async () => {
    await rm(fixtureDir, { recursive: true, force: true });
  });

  it('valida YTDLP_COOKIES_PATH opcional no schema de ambiente', () => {
    const base = {
      CORS_ORIGIN: 'http://localhost:5173',
      INTERNAL_API_KEY: 'a'.repeat(32),
    };

    expect(validateEnv({ ...base, YTDLP_COOKIES_PATH: '   ' }).YTDLP_COOKIES_PATH).toBeUndefined();
    expect(
      validateEnv({ ...base, YTDLP_COOKIES_PATH: '/run/ytdlp/cookies.txt' }).YTDLP_COOKIES_PATH,
    ).toBe('/run/ytdlp/cookies.txt');
  });

  it('passa --js-runtimes node:<execPath> quando yt-dlp suporta a flag e omite --cookies sem config', async () => {
    const seenArgs: string[][] = [];
    stubExecFile((_cmd, args) => {
      seenArgs.push(args);
      if (args.includes('--help')) {
        return { stdout: '  --js-runtimes RUNTIME[:PATH]\n', stderr: '' };
      }
      return { stdout: JSON.stringify({ id: 'abc', title: 'Demo' }), stderr: '' };
    });

    const service = new YtdlpService(makeConfig());
    const info = await service.getInfo('https://www.youtube.com/watch?v=abc');

    expect(info.title).toBe('Demo');
    const infoArgs = seenArgs.find((args) => args.includes('--dump-single-json'));
    expect(infoArgs).toBeDefined();
    expect(infoArgs).toContain('--js-runtimes');
    expect(infoArgs).toContain(`node:${process.execPath}`);
    expect(infoArgs).not.toContain('--cookies');
  });

  it('omite --js-runtimes quando a versão do yt-dlp não conhece a flag', async () => {
    const seenArgs: string[][] = [];
    stubExecFile((_cmd, args) => {
      seenArgs.push(args);
      if (args.includes('--help')) {
        return { stdout: '  --dump-single-json\n  --cookies FILE\n', stderr: '' };
      }
      return { stdout: JSON.stringify({ id: 'abc', title: 'Legacy' }), stderr: '' };
    });

    const service = new YtdlpService(makeConfig());
    await service.getInfo('https://www.youtube.com/watch?v=abc');

    const infoArgs = seenArgs.find((args) => args.includes('--dump-single-json'));
    expect(infoArgs).not.toContain('--js-runtimes');
  });

  it('copia YTDLP_COOKIES_PATH para arquivo temporário isolado em getInfo e apaga após concluir', async () => {
    const sourceCookies = join(fixtureDir, 'cookies.txt');
    const cookieContent = '# Netscape HTTP Cookie File\n.youtube.com\tTRUE\t/\tTRUE\t0\tSID\ttest\n';
    await writeFile(sourceCookies, cookieContent, 'utf8');

    let tempCookiesPath: string | undefined;
    let copiedContentWhileRunning: string | undefined;

    stubExecFile(async (_cmd, args) => {
      if (args.includes('--help')) {
        return { stdout: '--js-runtimes', stderr: '' };
      }
      const cookieFlagIndex = args.indexOf('--cookies');
      if (cookieFlagIndex !== -1) {
        tempCookiesPath = args[cookieFlagIndex + 1];
        copiedContentWhileRunning = await readFile(tempCookiesPath, 'utf8');
      }
      return { stdout: JSON.stringify({ id: 'abc', title: 'Autenticado' }), stderr: '' };
    });

    const service = new YtdlpService(makeConfig({ YTDLP_COOKIES_PATH: sourceCookies }));
    const info = await service.getInfo('https://www.youtube.com/watch?v=abc');

    expect(info.title).toBe('Autenticado');
    expect(tempCookiesPath).toBeDefined();
    expect(tempCookiesPath).not.toBe(sourceCookies);
    expect(copiedContentWhileRunning).toBe(cookieContent);
    expect(existsSync(tempCookiesPath!)).toBe(false);
    expect(existsSync(dirname(tempCookiesPath!))).toBe(false);
    // Arquivo original segue intacto.
    expect(await readFile(sourceCookies, 'utf8')).toBe(cookieContent);
  });

  it('remove a cópia temporária de cookies mesmo quando getInfo falha', async () => {
    const sourceCookies = join(fixtureDir, 'cookies.txt');
    await writeFile(sourceCookies, '# Netscape HTTP Cookie File\n', 'utf8');

    let tempCookiesPath: string | undefined;
    stubExecFile((_cmd, args) => {
      if (args.includes('--help')) {
        return { stdout: '--js-runtimes', stderr: '' };
      }
      const idx = args.indexOf('--cookies');
      tempCookiesPath = idx !== -1 ? args[idx + 1] : undefined;
      throw new Error('ERROR: Sign in to confirm you are not a bot');
    });

    const service = new YtdlpService(makeConfig({ YTDLP_COOKIES_PATH: sourceCookies }));
    await expect(service.getInfo('https://www.youtube.com/watch?v=abc')).rejects.toThrow(/bot/);

    expect(tempCookiesPath).toBeDefined();
    expect(existsSync(tempCookiesPath!)).toBe(false);
    expect(existsSync(dirname(tempCookiesPath!))).toBe(false);
  });

  it('segue sem --cookies quando YTDLP_COOKIES_PATH não existe, é diretório ou está vazio', async () => {
    const emptyFile = join(fixtureDir, 'empty.txt');
    const dirPath = join(fixtureDir, 'subdir');
    await writeFile(emptyFile, '   \n', 'utf8');
    await mkdir(dirPath);

    const seenArgs: string[][] = [];
    stubExecFile((_cmd, args) => {
      seenArgs.push(args);
      if (args.includes('--help')) {
        return { stdout: '', stderr: '' };
      }
      return { stdout: JSON.stringify({ id: 'abc', title: 'Ok' }), stderr: '' };
    });

    for (const candidate of [join(fixtureDir, 'missing.txt'), dirPath, emptyFile]) {
      const service = new YtdlpService(makeConfig({ YTDLP_COOKIES_PATH: candidate }));
      await service.getInfo('https://www.youtube.com/watch?v=abc');
    }

    const infoCalls = seenArgs.filter((args) => args.includes('--dump-single-json'));
    expect(infoCalls).toHaveLength(3);
    for (const args of infoCalls) {
      expect(args).not.toContain('--cookies');
    }
  });

  it('usa cópia temporária de cookies no createDownloadStream e limpa ao encerrar o processo', async () => {
    const sourceCookies = join(fixtureDir, 'cookies.txt');
    await writeFile(sourceCookies, '# Netscape HTTP Cookie File\n', 'utf8');

    stubExecFile((_cmd, args) => {
      if (args.includes('--help')) {
        return { stdout: '--js-runtimes', stderr: '' };
      }
      return { stdout: '', stderr: '' };
    });

    const fakeChild = Object.assign(new EventEmitter(), {
      stdout: new PassThrough(),
      stderr: new PassThrough(),
      killed: false,
      exitCode: null as number | null,
      kill: jest.fn(() => {
        fakeChild.killed = true;
        return true;
      }),
    });

    let spawnArgs: string[] = [];
    mockSpawn.mockImplementation((_cmd: string, args: string[]) => {
      spawnArgs = args;
      return fakeChild;
    });

    const service = new YtdlpService(makeConfig({ YTDLP_COOKIES_PATH: sourceCookies }));
    const { stream } = await service.createDownloadStream(
      'https://www.youtube.com/watch?v=abc',
      '140',
    );

    expect(stream).toBe(fakeChild.stdout);
    expect(spawnArgs).toContain('--js-runtimes');
    expect(spawnArgs).toContain(`node:${process.execPath}`);

    const cookieIdx = spawnArgs.indexOf('--cookies');
    expect(cookieIdx).toBeGreaterThan(-1);
    const tempCookiesPath = spawnArgs[cookieIdx + 1];
    expect(tempCookiesPath).not.toBe(sourceCookies);
    expect(existsSync(tempCookiesPath)).toBe(true);

    fakeChild.exitCode = 0;
    fakeChild.emit('close', 0);

    const deadline = Date.now() + 1_000;
    while (existsSync(dirname(tempCookiesPath)) && Date.now() < deadline) {
      await new Promise((resolve) => setTimeout(resolve, 10));
    }

    expect(existsSync(tempCookiesPath)).toBe(false);
    expect(existsSync(dirname(tempCookiesPath))).toBe(false);
  });
});
