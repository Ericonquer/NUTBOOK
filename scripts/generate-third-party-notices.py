#!/usr/bin/env python3
"""Generate locked dependency attribution and retain shipped license texts.
Run npm ci first, then: python3 scripts/generate-third-party-notices.py
Cargo metadata downloads missing target-specific source archives if necessary.
"""
import hashlib
import json
from pathlib import Path
import re
import subprocess
import sys

root = Path(__file__).resolve().parent.parent
metadata = json.loads(Path(sys.argv[1]).read_text()) if len(sys.argv) > 1 else json.loads(subprocess.check_output(['cargo', 'metadata', '--locked', '--format-version', '1', '--manifest-path', str(root / 'src-tauri/Cargo.toml')]))
lock = json.loads((root / 'package-lock.json').read_text())
texts = {}
rows = []

def record(ecosystem, name, version, license_id, source, directory):
    if not license_id: raise RuntimeError(f'Missing license: {name}@{version}')
    keys = []
    if directory and directory.exists():
        for path in sorted(directory.rglob('*')):
            rel = path.relative_to(directory)
            if 'node_modules' in rel.parts or not path.is_file() or path.is_symlink(): continue
            if not re.match(r'^(licen[sc]e|copying|notice|copyright)([._-].*)?$', path.name, re.I): continue
            text = '\n'.join(line.rstrip() for line in path.read_text(errors='replace').splitlines()).strip()
            if not text: continue
            digest = hashlib.sha256(text.encode()).hexdigest()[:16]
            texts.setdefault(digest, {'text': text, 'owners': set()})['owners'].add(f'{ecosystem}: {name} {version} ({rel.as_posix()})')
            keys.append(digest)
    rows.append((ecosystem, name, version, license_id, source, sorted(set(keys))))

for package in sorted(metadata['packages'], key=lambda p: (p['name'], p['version'])):
    if package['name'] == 'nutbook-backend': continue
    directory = Path(package['manifest_path']).parent
    record('Rust', package['name'], package['version'], package.get('license') or 'LicenseRef-package', f"https://crates.io/crates/{package['name']}/{package['version']}", directory)
for location, package in sorted(lock['packages'].items()):
    if not location: continue
    name = package.get('name') or location.split('node_modules/')[-1]
    record('JavaScript', name, package['version'], package.get('license'), package.get('resolved', f'https://www.npmjs.com/package/{name}'), root / location)
# Font source and attribution are independent of the package managers.
record('Font', 'Material Symbols Outlined', 'bundled snapshot', 'Apache-2.0', 'https://github.com/google/material-design-icons', root / 'assets/fonts')
lines = ['# Third-Party Licenses / 第三方许可声明', '', 'NUTBOOK 1.0.0 includes third-party software and assets. This inventory covers the complete locked JavaScript and Rust dependency graphs, including transitive, build, development and platform-specific packages; not every listed package is present in every installer.', '', '本清单覆盖锁文件中的直接、传递、构建、开发及平台依赖；各平台安装包实际包含的子集有所不同。上游许可条款保持有效。', '', 'Generated with `python3 scripts/generate-third-party-notices.py` after `npm ci`. Versions come from `package-lock.json` and locked Cargo metadata. License texts retain upstream copyright notices and are included in the application resources.', '', 'Material Symbols Outlined: Copyright 2026 Google LLC. All Rights Reserved. Bundled font source: [Google Material Design Icons](https://github.com/google/material-design-icons).', '']
for ecosystem in ['JavaScript', 'Rust', 'Font']:
    lines += [f'## {ecosystem}', '', '| Package | Version | License | Source | License texts |', '| --- | --- | --- | --- | --- |']
    for eco,name,version,license_id,source,keys in rows:
        if eco != ecosystem: continue
        refs = ', '.join(f'[text](#license-{key})' for key in keys) or 'See upstream package source'
        lines.append(f'| {name} | {version} | {license_id.replace("|", "/")} | [source]({source}) | {refs} |')
    lines.append('')
lines += ['## License texts / 许可原文', '']
for key, entry in sorted(texts.items()):
    lines += [f'<a id="license-{key}"></a>', '', 'Used by: ' + '; '.join(sorted(entry['owners'])), '', '````text', entry['text'], '````', '']
(root / 'THIRD_PARTY_LICENSES.md').write_text('\n'.join(lines))
missing = [(eco,name,version) for eco,name,version,_,_,keys in rows if not keys]
print(f'{len(rows)} packages/assets; {len(texts)} distinct texts; {len(missing)} entries refer to upstream source')
for item in missing: print('source-only:', *item)
