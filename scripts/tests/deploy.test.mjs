import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const old = 'a'.repeat(40);
const next = 'b'.repeat(40);

const repoDeployUrl = new URL('../../deploy/deploy.sh', import.meta.url);
const skillDeployUrl = new URL('../../resources/deploy/deploy.sh', import.meta.url);
const deployPath = process.env.DEPLOY_SCRIPT_PATH || (existsSync(repoDeployUrl) ? repoDeployUrl : skillDeployUrl);
const source = readFileSync(deployPath, 'utf8');

const allowedProject = (source.match(/^readonly ALLOWED_PROJECT="([^"]+)"/m) || [])[1] || 'bl_example';
const ghcrPrefix = (source.match(/^readonly GHCR_IMAGE_PREFIX="([^"]+)"/m) || [])[1] || 'ghcr.io/owner/app';
const appsRootLine = (source.match(/^readonly APPS_ROOT="[^"]+"/m) || [])[0];
assert.ok(appsRootLine, 'deploy.sh precisa declarar readonly APPS_ROOT="..."');

function deploy({ previous = old, fail = '', backup = false, project = allowedProject } = {}) {
  const directory = mkdtempSync(join(tmpdir(), 'vps-deploy-test-'));
  const app = join(directory, allowedProject);
  const bin = join(directory, 'bin');
  mkdirSync(join(app, 'hooks'), { recursive: true });
  mkdirSync(bin);
  writeFileSync(join(app, 'compose.yml'), `name: ${allowedProject}\n`);
  writeFileSync(join(app, '.env'), `DOMAIN=app.example.test\n${previous ? `IMAGE_TAG=${previous}\n` : ''}`);
  writeFileSync(join(app, 'hooks/pre-migrate.sh'), '#!/usr/bin/env bash\n[[ "$FAIL" != backup ]]\n', { mode: 0o755 });
  writeFileSync(join(bin, 'flock'), '#!/usr/bin/env bash\nexit 0\n', { mode: 0o755 });
  writeFileSync(join(bin, 'docker'), `#!/usr/bin/env bash
set -euo pipefail
printf '%s tag=%s\\n' "$*" "\${IMAGE_TAG:-}" >> "$TRACE"
case "$*" in
  *'config --services') echo api; echo migrate; sleep 0.2; echo web ;;
  *'config --images') printf '${ghcrPrefix}/api:%s\\nghcr.io/other/unrelated/api:abc\\n' "$IMAGE_TAG" ;;
  *'pull --quiet') [[ "$FAIL" != pull ]] ;;
  *'run --rm -T migrate') [[ "$FAIL" != migrate ]] ;;
  *'up -d'*) [[ "$FAIL" != up || "$IMAGE_TAG" != '${next}' ]] ;;
  'image ls'*) printf '${ghcrPrefix}/api:${old}\\n${ghcrPrefix}/api:${next}\\n${ghcrPrefix}/api:${'c'.repeat(40)}\\n' ;;
esac
`, { mode: 0o755 });
  const script = join(directory, 'deploy.sh');
  const posixDir = directory.replace(/\\/g, '/');
  writeFileSync(script, source.replace(appsRootLine, `readonly APPS_ROOT="${posixDir}"`));
  const trace = join(directory, 'trace');
  try {
    const result = spawnSync('bash', [script, project, 'deploy', next, ...(backup ? ['--backup'] : [])], {
      env: { ...process.env, PATH: `${bin}:${process.env.PATH}`, TRACE: trace, FAIL: fail, SSH_ORIGINAL_COMMAND: '' },
      encoding: 'utf8',
      timeout: 15000,
    });
    let calls = '';
    try { calls = readFileSync(trace, 'utf8'); } catch { /* Comando rejeitado antes do Docker. */ }
    return { ...result, calls, environment: readFileSync(join(app, '.env'), 'utf8') };
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

test('pull falha antes de migration e mantém tag anterior', () => {
  const result = deploy({ fail: 'pull' });
  assert.notEqual(result.status, 0);
  assert.ok(!result.calls.includes('run --rm'));
  assert.ok(result.environment.includes(old));
});

test('backup falha e impede migration e up', () => {
  const result = deploy({ fail: 'backup', backup: true });
  assert.notEqual(result.status, 0);
  assert.ok(!result.calls.includes('run --rm'));
  assert.ok(!result.calls.includes('up -d'));
});

test('migration falha e mantém versão anterior', () => {
  const result = deploy({ fail: 'migrate' });
  assert.notEqual(result.status, 0);
  assert.ok(!result.calls.includes('up -d'));
  assert.ok(result.environment.includes(old));
});

test('deploy com backup acha migrate mesmo fora da última linha do compose', () => {
  // Regressão: "compose config --services | grep -q" sob pipefail dava SIGPIPE (141).
  const result = deploy({ backup: true });
  assert.equal(result.status, 0, result.stdout + result.stderr);
  assert.ok(result.calls.includes('run --rm -T migrate'));
  assert.ok(result.environment.includes(next));
});

test('versão sem saúde restaura imagem anterior', () => {
  const result = deploy({ fail: 'up' });
  assert.notEqual(result.status, 0);
  assert.ok(result.environment.includes(old));
  assert.ok(result.calls.includes(`tag=${old}`));
  assert.match(result.stdout, /rollback concluído/);
});

test('primeiro deploy falho não registra tag como versão anterior', () => {
  const result = deploy({ fail: 'up', previous: '' });
  assert.notEqual(result.status, 0);
  assert.ok(!result.environment.includes('IMAGE_TAG='));
  assert.match(result.stdout, /sem versão anterior/);
});

test('sucesso instala SHA e limpa apenas imagens deste projeto', () => {
  const result = deploy({ backup: true });
  assert.equal(result.status, 0, result.stderr);
  assert.ok(result.environment.includes(next));
  assert.ok(result.calls.includes(`image rm ${ghcrPrefix}/api:`));
  assert.ok(!result.calls.includes('prune'));
  assert.ok(!result.calls.includes('image rm ghcr.io/other/'));
  assert.ok(!result.calls.includes('down'));
});

test('executor exclusivo rejeita outro projeto antes de acessar Docker', () => {
  const result = deploy({ project: 'bl_outro_projeto' });
  assert.notEqual(result.status, 0);
  assert.equal(result.calls, '');
});
