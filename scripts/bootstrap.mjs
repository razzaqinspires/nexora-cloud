#!/usr/bin/env node
import { randomBytes } from 'node:crypto';
import { chmod, mkdir, readFile, writeFile, rename, access } from 'node:fs/promises';
import { constants } from 'node:fs';
import { spawn } from 'node:child_process';
import path from 'node:path';
import process from 'node:process';

const ROOT = process.cwd();
const ENV_PATH = path.join(ROOT, '.env');
const EXAMPLE_PATH = path.join(ROOT, '.env.example');
const REQUIRED_SECRETS = {
  POSTGRES_PASSWORD: 64,
  NEXORA_APP_DB_PASSWORD: 64,
  NEXORA_ADMIN_TOKEN: 64,
  NEXORA_BACKUP_ENCRYPTION_KEY: 64,
};
// This is a newly introduced integration credential, not a credential that unlocks an existing database.
// It may be generated during an upgrade without rotating the existing database/admin/backup secrets.
const ADDITIVE_SECRETS = { NEXORA_METRICS_AGENT_API_KEY: 64 };
const EXISTING_VOLUME_IDENTITY_KEYS = ['POSTGRES_DB', 'POSTGRES_USER', 'NEXORA_APP_DB_USER'];
const args = new Set(process.argv.slice(2));
const dryRun = args.has('--dry-run');
const doctorOnly = args.has('--doctor');

function log(message) { process.stdout.write(`[NEXORA BOOTSTRAP] ${message}\n`); }
function fail(message, code = 1) { process.stderr.write(`[NEXORA ERROR] ${message}\n`); process.exit(code); }
function run(command, commandArgs, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, commandArgs, { cwd: ROOT, stdio: 'inherit', shell: false, ...options });
    child.once('error', reject);
    child.once('exit', (code, signal) => code === 0 ? resolve() : reject(new Error(`${command} ${commandArgs.join(' ')} exited with ${code ?? signal}`)));
  });
}
async function exists(file) {
  try { await access(file, constants.F_OK); return true; } catch { return false; }
}
function setEnvLine(text, key, value) {
  const lines = text.split(/\r?\n/);
  const pattern = new RegExp(`^\\s*${key}=`);
  const index = lines.findIndex(line => pattern.test(line));
  if (index >= 0) lines[index] = `${key}=${value}`;
  else lines.push(`${key}=${value}`);
  return lines.join('\n').replace(/\n*$/, '\n');
}
function readEnvValue(text, key) {
  const line = text.split(/\r?\n/).find(item => item.trim().startsWith(`${key}=`));
  return line ? line.slice(line.indexOf('=') + 1).trim().replace(/^(['"])(.*)\1$/, '$2') : '';
}
async function dockerVolumeExists(name) {
  try {
    await run('docker', ['volume', 'inspect', name], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}
async function ensureEnv({ existingDatabaseVolume }) {
  const envExists = await exists(ENV_PATH);
  if (!envExists && existingDatabaseVolume) {
    throw new Error('The existing nexora_pgdata volume was found, but .env is missing. Bootstrap has stopped without generating replacement credentials. Recover the original .env and backup encryption key from the owner offline copy first; otherwise the existing database and encrypted backups may become inaccessible.');
  }
  let text;
  if (envExists) {
    text = await readFile(ENV_PATH, 'utf8');
    log('Found existing .env; preserving configured values.');
  } else {
    text = await readFile(EXAMPLE_PATH, 'utf8');
    log('No .env or existing database volume found; creating initial configuration.');
  }
  if (existingDatabaseVolume) {
    const missingIdentity = EXISTING_VOLUME_IDENTITY_KEYS.filter(key => !readEnvValue(text, key));
    if (missingIdentity.length) throw new Error(`The existing nexora_pgdata volume was found, but these database identity settings are missing: ${missingIdentity.join(', ')}. Bootstrap will not guess connection identity for an existing database; restore the original .env.`);
  }
  for (const [key, length] of Object.entries(REQUIRED_SECRETS)) {
    const current = readEnvValue(text, key);
    if (!current || current.startsWith('REPLACE_') || current.startsWith('CHANGE_ME_')) {
      if (existingDatabaseVolume) {
        throw new Error(`${key} is missing or still a placeholder while nexora_pgdata already exists. Bootstrap will not rotate an existing database/admin/backup secret automatically. Restore the original .env from the owner offline copy.`);
      }
      text = setEnvLine(text, key, randomBytes(length / 2).toString('hex'));
      log(`${key}: generated because it was missing or a placeholder on a new database installation.`);
    } else if (!/^[a-fA-F0-9]{64,}$/.test(current)) {
      throw new Error(`${key} must be at least 64 hexadecimal characters. Generate it with: openssl rand -hex 32`);
    } else {
      log(`${key}: existing value retained.`);
    }
  }
  for (const [key, length] of Object.entries(ADDITIVE_SECRETS)) {
    const current = readEnvValue(text, key);
    if (!current || current.startsWith('REPLACE_') || current.startsWith('CHANGE_ME_')) {
      text = setEnvLine(text, key, randomBytes(length / 2).toString('hex'));
      log(`${key}: generated as a new additive integration credential; existing database secrets were not changed.`);
    } else if (!/^[a-fA-F0-9]{64,}$/.test(current)) {
      throw new Error(`${key} must be at least 64 hexadecimal characters. Generate it with: openssl rand -hex 32`);
    } else {
      log(`${key}: existing value retained.`);
    }
  }
  const existingSecretValues = [...Object.keys(REQUIRED_SECRETS), ...Object.keys(ADDITIVE_SECRETS)].map(key => readEnvValue(text, key).toLowerCase());
  if (new Set(existingSecretValues).size !== existingSecretValues.length) {
    throw new Error('The PostgreSQL owner, runtime DB, admin, and backup secrets must all be different values.');
  }
  for (const [key, value] of Object.entries({
    POSTGRES_DB: 'nexora',
    POSTGRES_USER: 'nexora_owner',
    NEXORA_APP_DB_USER: 'nexora_app',
    NEXORA_PUBLIC_URL: '',
    NEXORA_DATABASE_SSL: 'false',
    NEXORA_BACKUP_RETENTION_DAYS: '30',
  })) {
    if (!readEnvValue(text, key)) text = setEnvLine(text, key, value);
  }
  validateEnv(text);
  const temp = `${ENV_PATH}.tmp-${process.pid}`;
  await writeFile(temp, text, { mode: 0o600, flag: 'wx' });
  await rename(temp, ENV_PATH);
  await chmod(ENV_PATH, 0o600);
  return text;
}
function validateEnv(text) {
  const read = key => process.env[key] ?? readEnvValue(text, key);
  for (const key of [...EXISTING_VOLUME_IDENTITY_KEYS, ...Object.keys(REQUIRED_SECRETS), ...Object.keys(ADDITIVE_SECRETS)]) {
    if (Object.hasOwn(process.env, key) && process.env[key] !== readEnvValue(text, key)) {
      throw new Error(`Process environment variable ${key} conflicts with the owner .env file. Unset the shell override or update .env deliberately; bootstrap will not let Compose silently use a different database identity or secret.`);
    }
  }
  const rolePattern = /^[A-Za-z_][A-Za-z0-9_]{0,62}$/;
  const dbUser = read('POSTGRES_USER');
  const appUser = read('NEXORA_APP_DB_USER');
  const database = read('POSTGRES_DB');
  if (!rolePattern.test(dbUser) || !rolePattern.test(appUser) || !rolePattern.test(database)) {
    throw new Error('POSTGRES_USER, NEXORA_APP_DB_USER, and POSTGRES_DB must be simple PostgreSQL identifiers (1–63 characters; letters, digits, underscores; cannot start with a digit).');
  }
  if (dbUser === appUser) throw new Error('NEXORA_APP_DB_USER must be different from POSTGRES_USER; the app must not run as the database owner.');
  const port = Number(read('NEXORA_LOCAL_PORT') || '3000');
  if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('NEXORA_LOCAL_PORT must be an integer between 1024 and 65535.');
  const retention = Number(read('NEXORA_BACKUP_RETENTION_DAYS') || '30');
  if (!Number.isInteger(retention) || retention < 1 || retention > 3650) throw new Error('NEXORA_BACKUP_RETENTION_DAYS must be an integer between 1 and 3650.');
  const interval = Number(read('NEXORA_BACKUP_INTERVAL_SECONDS') || '86400');
  if (!Number.isInteger(interval) || interval < 60 || interval > 604800) throw new Error('NEXORA_BACKUP_INTERVAL_SECONDS must be between 60 seconds and 7 days.');
  const canonical = read('NEXORA_PUBLIC_URL');
  if (canonical) {
    let parsed;
    try { parsed = new URL(canonical); } catch { throw new Error('NEXORA_PUBLIC_URL must be an absolute HTTP(S) URL.'); }
    if (!['http:', 'https:'].includes(parsed.protocol) || parsed.username || parsed.password || parsed.search || parsed.hash || parsed.pathname !== '/') {
      throw new Error('NEXORA_PUBLIC_URL must contain only the canonical origin (scheme + hostname + optional port), without credentials, path, query, or hash.');
    }
    if (parsed.protocol !== 'https:' && !['localhost', '127.0.0.1'].includes(parsed.hostname)) {
      throw new Error('A non-local NEXORA_PUBLIC_URL must use HTTPS.');
    }
  }
}
async function checkDocker() {
  try { await run('docker', ['--version'], { stdio: 'ignore' }); }
  catch { throw new Error('Docker CLI is missing. Install Docker Engine and the Compose plugin from the official Docker documentation, then run npm start again. The bootstrap will not silently run an untrusted installer with root privileges.'); }
  try { await run('docker', ['compose', 'version'], { stdio: 'ignore' }); }
  catch { throw new Error('Docker Compose plugin is missing. Install the official Docker Compose plugin, then run npm start again.'); }
  try { await run('docker', ['info'], { stdio: 'ignore' }); }
  catch { throw new Error('Docker daemon is not reachable for the current user. Start Docker and grant this user Docker access, then run npm start again.'); }
}
async function waitForHealth(url, timeoutMs = 90000) {
  const deadline = Date.now() + timeoutMs;
  let last = 'not yet responding';
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(4000), cache: 'no-store' });
      const body = await response.json().catch(() => ({}));
      if (response.ok && body.ok === true && body.database === 'connected' && body.schema === 'ready') return body;
      last = `HTTP ${response.status}: ${JSON.stringify(body)}`;
    } catch (error) { last = error instanceof Error ? error.message : String(error); }
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  throw new Error(`Nexora API did not become healthy within ${timeoutMs / 1000}s. Last result: ${last}. Inspect with: docker compose logs --tail=150 app db migrate backup`);
}

async function waitForBackupHealthy(timeoutMs = 600000) {
  const deadline = Date.now() + timeoutMs;
  let last = 'first backup has not completed yet';
  while (Date.now() < deadline) {
    try {
      await run('docker', ['compose', 'exec', '-T', 'backup', '/bin/sh', '/opt/nexora/backup-health.sh'], { stdio: 'ignore' });
      log('Encrypted backup exists and passed its freshness health check.');
      return;
    } catch (error) {
      last = error instanceof Error ? error.message : String(error);
    }
    await new Promise(resolve => setTimeout(resolve, 5000));
  }
  throw new Error(`The first encrypted backup was not verified within ${timeoutMs / 1000}s. The API may be running, but bootstrap will not report full readiness. Inspect: docker compose logs --tail=150 backup db. Last check: ${last}`);
}

async function main() {
  if (process.env.VERCEL === '1' || process.env.VERCEL_ENV) {
    log('Vercel environment detected. Vercel runs Next.js as managed Functions; this script will not attempt to start Docker or PostgreSQL.');
    log('Use npm run build for Vercel. Configure DATABASE_URL for an existing PostgreSQL service. Optional migrations require NEXORA_MIGRATE_ON_BUILD=true and NEXORA_MIGRATION_DATABASE_URL.');
    return;
  }
  let envText = '';
  log('Checking host requirements...');
  const major = Number(process.versions.node.split('.')[0]);
  if (major !== 22) throw new Error(`Node.js 22.x is required; current version is ${process.versions.node}.`);
  await checkDocker();
  if (!doctorOnly) {
    const existingDatabaseVolume = await dockerVolumeExists('nexora_pgdata');
    envText = await ensureEnv({ existingDatabaseVolume });
    await mkdir(path.join(ROOT, 'backups'), { recursive: true, mode: 0o700 });
    await chmod(path.join(ROOT, 'backups'), 0o700);
  }
  for (const required of ['compose.yaml', 'Dockerfile', 'Dockerfile.backup', 'db/schema.sql', 'scripts/migrate.mjs', 'app/docs/page.tsx', 'app/api/v1/openapi.json/route.ts', 'scripts/backup-loop.sh', 'scripts/backup-health.sh', 'scripts/metrics-agent.mjs']) {
    if (!(await exists(path.join(ROOT, required)))) throw new Error(`Required project file is missing: ${required}. Restore it from the official Nexora Cloud source package.`);
  }
  log('Docker, Compose, project files, and Node.js are available.');
  if (doctorOnly) { log('Doctor passed. No services were changed.'); return; }
  if (dryRun) { log('Dry run complete. No containers were started.'); return; }
  log('Validating Compose configuration...');
  await run('docker', ['compose', 'config', '--quiet']);
  log('Starting PostgreSQL without deleting existing volumes...');
  await run('docker', ['compose', 'up', '-d', 'db']);
  log('Re-running the idempotent migration job under an advisory lock...');
  await run('docker', ['compose', 'up', '-d', '--build', '--force-recreate', 'migrate']);
  log('Starting or reconciling the API and encrypted backup worker...');
  await run('docker', ['compose', 'up', '-d', '--build', 'app', 'backup', 'metrics-agent']);
  const port = process.env.NEXORA_LOCAL_PORT || readEnvValue(envText, 'NEXORA_LOCAL_PORT') || '3000';
  const health = await waitForHealth(`http://127.0.0.1:${port}/api/v1/health`);
  log(`Nexora API and schema are healthy: ${health.service} ${health.version}.`);
  await waitForBackupHealthy(Number(process.env.NEXORA_BACKUP_STARTUP_TIMEOUT_MS || 600000));
  await waitForMetricsAgentHealthy(Number(process.env.NEXORA_METRICS_STARTUP_TIMEOUT_MS || 180000));
  log('Nexora Cloud core, initial encrypted backup, and first metrics transfer are ready.');
  log(`Dashboard: http://127.0.0.1:${port}`);
  log(`API documentation: http://127.0.0.1:${port}/docs`);
  log('Database, migrations, and encrypted local backup service are managed by Docker Compose.');
  log('This is still a single-host deployment. Configure an off-device backup before storing irreplaceable data.');
}
main().catch(error => fail(error instanceof Error ? error.message : String(error)));
