const { spawnSync } = require('node:child_process');

const COMPOSE_ARGS = ['compose', '-f', 'docker-compose.smoke.yml', '-p', 'toolbox_smoke'];
const WAIT_MS = 120_000;
const POLL_MS = 2_000;

function dockerEnv() {
  const env = {
    ...process.env,
    COMPOSE_ANSI: 'never',
    DOCKER_CLI_HINTS: 'false',
  };
  delete env.FORCE_COLOR;
  return env;
}

function run(args, options = {}) {
  const result = spawnSync('docker', args, {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: false,
    env: dockerEnv(),
  });

  if (result.error) {
    throw result.error;
  }

  const stdout = String(result.stdout ?? '');
  const stderr = String(result.stderr ?? '');

  if (!options.capture) {
    if (stdout) {
      process.stdout.write(stdout);
    }
    if (stderr) {
      process.stderr.write(stderr);
    }
  }

  if (typeof result.status === 'number' && result.status !== 0 && !options.allowFail) {
    throw new Error(stderr.trim() || `Command failed: docker ${args.join(' ')}`);
  }

  return { status: result.status ?? 1, stdout, stderr };
}

function capture(args) {
  const result = run(args, { capture: true, allowFail: true });
  return {
    status: result.status ?? 1,
    stdout: String(result.stdout ?? '').trim(),
    stderr: String(result.stderr ?? '').trim(),
  };
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function sleep(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

function waitUntilHealthy() {
  const started = Date.now();

  while (Date.now() - started < WAIT_MS) {
    const ps = capture([...COMPOSE_ARGS, 'ps', '--format', 'json']);
    assert(ps.status === 0, ps.stderr || 'Failed to list smoke containers.');

    const lines = ps.stdout
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);

    const services = lines.flatMap((line) => {
      try {
        const parsed = JSON.parse(line);
        return Array.isArray(parsed) ? parsed : [parsed];
      } catch {
        return [];
      }
    });

    const api = services.find((item) => item.Service === 'api');
    const web = services.find((item) => item.Service === 'web');
    const apiOk = Boolean(api && String(api.Health || api.Status || '').toLowerCase().includes('healthy'));
    const webOk = Boolean(web && String(web.Health || web.Status || '').toLowerCase().includes('healthy'));

    if (apiOk && webOk) {
      return;
    }

    sleep(POLL_MS);
  }

  throw new Error('Timed out waiting for api and web to become healthy.');
}

function execWget(service, url) {
  const result = capture([
    ...COMPOSE_ARGS,
    'exec',
    '-T',
    service,
    'wget',
    '-qO-',
    url,
  ]);

  assert(result.status === 0, result.stderr || `wget failed on ${service} ${url}`);
  return result.stdout;
}

let failed = false;

try {
  console.log('1/4  Building and starting smoke stack...');
  run([...COMPOSE_ARGS, '--progress=plain', 'up', '-d', '--build']);

  console.log('2/4  Waiting for healthchecks...');
  waitUntilHealthy();

  console.log('3/4  Checking endpoints...');
  const apiHealth = execWget('api', 'http://127.0.0.1:3000/api/health');
  assert(apiHealth.includes('"status":"ok"'), `API health unexpected: ${apiHealth}`);

  const proxiedHealth = execWget('web', 'http://127.0.0.1/api/health');
  assert(proxiedHealth.includes('"status":"ok"'), `Nginx /api/health unexpected: ${proxiedHealth}`);

  const home = execWget('web', 'http://127.0.0.1/');
  assert(home.toLowerCase().includes('<!doctype html>'), 'Frontend did not serve index.html');

  console.log('PASS  Docker smoke test');
  console.log('      GET /api/health (api)     ->', apiHealth);
  console.log('      GET /api/health (nginx)   ->', proxiedHealth);
} catch (error) {
  failed = true;
  console.error('FAIL  Docker smoke test');
  console.error(error instanceof Error ? error.message : error);
} finally {
  console.log('4/4  Stopping smoke stack...');
  run([...COMPOSE_ARGS, 'down', '--remove-orphans'], { allowFail: true });
}

process.exit(failed ? 1 : 0);
