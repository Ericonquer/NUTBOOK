import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { copyFileSync, lstatSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

const [action, kind, directory] = process.argv.slice(2);
assert(action === 'stage' || action === 'verify');
assert(kind === 'probe' || kind === 'app');
assert(directory);

const revision = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
assert.equal(revision, process.env.GITHUB_SHA, 'Checkout must match the CI revision');
const runId = process.env.GITHUB_RUN_ID;
assert(/^\d+$/.test(runId ?? ''), 'The artifact must belong to a CI run');
const manifestPath = join(directory, 'manifest.json');
const release = 'src-tauri/target/release';
const roots = kind === 'probe'
  ? ['content_protocol_probe.exe']
  : ['NUTBOOK.exe', 'nutbook-cli-bin.exe', 'export-templates', 'nbskill', 'publishing-runtime'];

function filesIn(root, relative) {
  const path = join(root, relative);
  const metadata = lstatSync(path);
  if (metadata.isFile()) return [relative];
  assert(metadata.isDirectory(), `Unsupported artifact path: ${relative}`);
  return readdirSync(path, { withFileTypes: true }).flatMap(entry => {
    // The upload action excludes hidden files. Build outputs do not use them.
    if (entry.name.startsWith('.')) return [];
    assert(entry.isFile() || entry.isDirectory(), `Unsupported artifact entry: ${entry.name}`);
    return filesIn(root, `${relative}/${entry.name}`);
  });
}

if (action === 'stage') {
  const sourceRoot = kind === 'probe' ? join(release, 'examples') : release;
  for (const root of roots) {
    const files = filesIn(sourceRoot, root);
    assert(files.length, `No Windows artifact files under ${root}`);
    for (const file of files) {
      const destination = join(directory, file);
      mkdirSync(dirname(destination), { recursive: true });
      copyFileSync(join(sourceRoot, file), destination);
    }
  }
}

const files = Object.fromEntries(roots.flatMap(root => filesIn(directory, root)).sort().map(file => {
  const bytes = readFileSync(join(directory, file));
  return [file, { size: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') }];
}));
const manifest = { revision, runId, kind, files };
if (action === 'stage') {
  writeFileSync(manifestPath, JSON.stringify(manifest), { flag: 'wx' });
} else {
  assert.deepEqual(readdirSync(directory).sort(), [...roots, 'manifest.json'].sort(), 'Unexpected Windows artifact entries');
  assert.deepEqual(JSON.parse(readFileSync(manifestPath, 'utf8')), manifest, 'Windows artifact revision, run or bytes differ');
}
const total = Object.values(files).reduce((sum, file) => sum + file.size, 0);
console.log(`${action}: ${kind}, ${Object.keys(files).length} files, ${total} bytes, revision ${revision}`);
