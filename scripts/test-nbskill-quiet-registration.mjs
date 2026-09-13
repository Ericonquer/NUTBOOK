import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, readFileSync, statSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
const root = mkdtempSync(join(tmpdir(), 'nutbook-registration-'));
try {
  writeFileSync(join(root, 'report.md'), '# Report\nInitial body\n');
  const args = [resolve('integrations/nbskill/scripts/register.mjs'), '--project-root', root, '--id', 'report', '--path', 'report.md', '--skill', 'writer', '--kind', 'report'];
  const run = () => spawnSync(process.execPath, args, { encoding: 'utf8' });
  const first = run(); assert.equal(first.status, 0, first.stderr); assert.equal(first.stdout, '');
  const file = join(root, '.agent-outputs/manifest.json');
  const before = statSync(file, { bigint: true });
  writeFileSync(join(root, 'report.md'), '# Report\nUpdated body\n');
  const again = run(); assert.equal(again.status, 0, again.stderr); assert.equal(again.stdout, '');
  assert.equal(statSync(file, { bigint: true }).mtimeNs, before.mtimeNs, 'same metadata must not rewrite the manifest');
  assert.equal(JSON.parse(readFileSync(file)).entries.length, 1);
  const failed = spawnSync(process.execPath, [...args.slice(0, 7), 'missing.md', ...args.slice(8)], { encoding: 'utf8' });
  assert.notEqual(failed.status, 0); assert.match(failed.stderr, /failed/);
  console.log('Quiet registration: stable identity, no-op mtime, and visible errors passed');
} finally { rmSync(root, { recursive: true, force: true }); }
