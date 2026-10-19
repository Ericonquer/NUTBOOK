#!/usr/bin/env node
import assert from 'node:assert/strict';
import { execFile, spawn } from 'node:child_process';
import { once } from 'node:events';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
const run = promisify(execFile);
const library = new URL('./manifest-lib.mjs', import.meta.url).href;
const register = fileURLToPath(new URL('./register.mjs', import.meta.url));
const roots = [];
const children = new Set();
function fixture() {
  const root = mkdtempSync(join(tmpdir(), 'nbskill-lock-recovery-'));
  roots.push(root);
  mkdirSync(join(root, '.agent-outputs'));
  writeFileSync(join(root, 'report.md'), '# Report\n');
  return root;
}
const lock = (root) => join(root, '.agent-outputs', '.manifest.lock');
const manifest = (root) => join(root, '.agent-outputs', 'manifest.json');
function args(root, id = 'report', path = 'report.md') {
  return [register, '--project-root', root, '--id', id, '--path', path, '--skill', 'writer', '--kind', 'report'];
}
async function quietRegister(root, id, path) {
  const result = await run(process.execPath, args(root, id, path));
  assert.equal(result.stdout, ''); assert.equal(result.stderr, '');
}
async function heldLock(root) {
  const child = spawn(process.execPath, ['--input-type=module', '-e', `
    import { withManifestLock } from ${JSON.stringify(library)};
    await withManifestLock(${JSON.stringify(root)}, async () => {
      process.stdout.write('locked');
      await new Promise(resolve => process.stdin.once('data', resolve));
    });
  `], { stdio: ['pipe', 'pipe', 'pipe'] });
  children.add(child);
  await Promise.race([
    once(child.stdout, 'data').then(([data]) => assert.equal(data.toString(), 'locked')),
    once(child, 'exit').then(([code]) => { throw new Error(`holder exited early: ${code}`); }),
  ]);
  return child;
}
try {
  // Exact user symptom: empty directory left by a denied owner write.
  const empty = fixture(); mkdirSync(lock(empty));
  await quietRegister(empty);
  assert.equal(existsSync(lock(empty)), false);

  // Actual process death, including legacy owner.json and current unique owner.
  const killed = fixture();
  const holder = await heldLock(killed);
  const deadPid = holder.pid;
  const deadExit = once(holder, 'exit'); holder.kill('SIGKILL'); await deadExit;
  await quietRegister(killed);
  assert.equal(existsSync(lock(killed)), false);
  const legacy = fixture(); mkdirSync(lock(legacy));
  writeFileSync(join(lock(legacy), 'owner.json'), JSON.stringify({ pid: deadPid, createdAt: new Date().toISOString() }));
  await quietRegister(legacy);

  // Concurrent stale recovery must merge every writer; no stolen lock/lost entry.
  const concurrent = fixture(); mkdirSync(lock(concurrent));
  writeFileSync(join(lock(concurrent), 'owner.json'), JSON.stringify({ pid: deadPid }));
  const ids = Array.from({ length: 24 }, (_, i) => `report-${i}`);
  for (const id of ids) writeFileSync(join(concurrent, `${id}.md`), `# ${id}\n`);
  await Promise.all(ids.map(id => quietRegister(concurrent, id, `${id}.md`)));
  assert.deepEqual(JSON.parse(readFileSync(manifest(concurrent))).entries.map(e => e.id).sort(), ids.sort());
  assert.deepEqual(readdirSync(join(concurrent, '.agent-outputs')), ['manifest.json']);

  // A live owner is protected even when its timestamp looks ancient.
  const live = fixture(); const liveHolder = await heldLock(live);
  const ownerPath = join(lock(live), readdirSync(lock(live))[0]);
  const owner = JSON.parse(readFileSync(ownerPath)); owner.createdAt = '2000-01-01T00:00:00Z';
  writeFileSync(ownerPath, JSON.stringify(owner));
  let finished = false;
  const waiting = quietRegister(live).then(() => { finished = true; });
  await new Promise(resolve => setTimeout(resolve, 150));
  assert.equal(finished, false); assert.equal(existsSync(manifest(live)), false);
  assert.equal(JSON.parse(readFileSync(ownerPath)).pid, liveHolder.pid);
  const liveExit = once(liveHolder, 'exit'); liveHolder.stdin.end('release'); await liveExit; await waiting;

  // Inject the sandbox-shaped EACCES exactly between mkdir and owner publication.
  const denied = fixture();
  await assert.rejects(run(process.execPath, ['--input-type=module', '-e', `
    import fs from 'node:fs';
    import { syncBuiltinESMExports } from 'node:module';
    const original = fs.writeFileSync;
    fs.writeFileSync = function(path, ...rest) {
      if (String(path).includes('.manifest-lock-')) throw Object.assign(new Error('owner write denied'), { code: 'EACCES' });
      return original(path, ...rest);
    };
    syncBuiltinESMExports();
    const { withManifestLock } = await import(${JSON.stringify(library)});
    await withManifestLock(${JSON.stringify(denied)}, () => { throw new Error('must not run'); });
  `]), /owner write denied/);
  assert.deepEqual(readdirSync(join(denied, '.agent-outputs')), []);
  await quietRegister(denied);

  // Validation failure also releases only the owned lock; a subsequent retry succeeds.
  const invalid = fixture();
  await assert.rejects(quietRegister(invalid, 'report', 'missing.md'));
  assert.deepEqual(readdirSync(join(invalid, '.agent-outputs')), []);
  await quietRegister(invalid);

  if (process.platform !== 'win32') {
    const unsafe = fixture(); const outside = fixture();
    writeFileSync(join(outside, 'keep'), 'untouched');
    symlinkSync(outside, lock(unsafe));
    await assert.rejects(quietRegister(unsafe));
    assert.equal(readFileSync(join(outside, 'keep'), 'utf8'), 'untouched');
  }
  console.log('nbskill lock recovery: empty/dead locks, concurrent writers, live owner, denied writes and cleanup passed');
} finally {
  for (const child of children) if (child.exitCode === null && child.signalCode === null) child.kill('SIGKILL');
  for (const root of roots) rmSync(root, { recursive: true, force: true });
}
