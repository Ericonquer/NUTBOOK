#!/usr/bin/env node
import { createHash, randomUUID } from "node:crypto";
import { cpSync, existsSync, lstatSync, mkdirSync, readFileSync, realpathSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { execFileSync } from "node:child_process";
import { parseArgs, required } from "./manifest-lib.mjs";

function version(value) {
  const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(value.trim());
  if (!match) throw new Error(`invalid package version: ${value.trim()}`);
  return match.slice(1).map(Number);
}

function compare(left, right) {
  for (let index = 0; index < 3; index += 1) {
    if (left[index] !== right[index]) return left[index] - right[index];
  }
  return 0;
}

function sha256(path) {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

function verifyPackage(root) {
  const manifest = JSON.parse(readFileSync(join(root, "PACKAGE-MANIFEST.json"), "utf8"));
  if (manifest.package !== "nbskill" || manifest.version !== readFileSync(join(root, "VERSION"), "utf8").trim()) throw new Error("package metadata mismatch");
  for (const file of manifest.files) {
    const path = join(root, ...file.path.split("/"));
    if (!existsSync(path) || lstatSync(path).isSymbolicLink() || sha256(path) !== file.sha256) throw new Error(`package hash mismatch: ${file.path}`);
  }
  return manifest.version;
}

function recordSelfTest(target, packageVersion) {
  writeFileSync(join(target, "SELF-TEST.json"), `${JSON.stringify({ packageVersion, validatedAt: new Date().toISOString() }, null, 2)}\n`, { mode: 0o600 });
}

try {
  const options = parseArgs(process.argv.slice(2));
  const source = realpathSync(resolve(required(options, "source")));
  const target = resolve(required(options, "target"));
  const incomingVersionText = verifyPackage(source);
  const incomingVersion = version(incomingVersionText);
  if (existsSync(target)) {
    if (lstatSync(target).isSymbolicLink()) throw new Error("refusing to replace a symbolic-link target");
    const installedVersionPath = join(target, "VERSION");
    if (!existsSync(installedVersionPath)) throw new Error("existing target has no recognized VERSION; refusing to overwrite");
    const installedVersionText = readFileSync(installedVersionPath, "utf8").trim();
    const installedVersion = version(installedVersionText);
    if (compare(installedVersion, incomingVersion) > 0) throw new Error(`installed version ${installedVersionText} is newer; refusing to downgrade`);
    if (compare(installedVersion, incomingVersion) === 0) {
      verifyPackage(target);
      if (sha256(join(target, "PACKAGE-MANIFEST.json")) !== sha256(join(source, "PACKAGE-MANIFEST.json"))) {
        throw new Error(`installed version ${installedVersionText} has a different package identity; refusing same-version replacement`);
      }
      execFileSync(process.execPath, [join(target, "scripts", "validate.mjs"), "--self-test"], { stdio: "inherit" });
      recordSelfTest(target, installedVersionText);
      console.log(`nbskill ${installedVersionText} is already installed and verified`);
      process.exit(0);
    }
  }
  mkdirSync(dirname(target), { recursive: true });
  const temporary = join(dirname(target), `.nbskill.install-${randomUUID()}`);
  const backup = join(dirname(target), `.nbskill.backup-${Date.now()}`);
  let movedExisting = false;
  try {
    cpSync(source, temporary, { recursive: true, dereference: false, errorOnExist: true });
    verifyPackage(temporary);
    if (existsSync(target)) {
      renameSync(target, backup);
      movedExisting = true;
    }
    renameSync(temporary, target);
    execFileSync(process.execPath, [join(target, "scripts", "validate.mjs"), "--self-test"], { stdio: "inherit" });
    recordSelfTest(target, incomingVersionText);
    console.log(`installed nbskill ${incomingVersionText} at ${target}`);
    if (movedExisting) console.log(`backup retained at ${backup}`);
  } catch (error) {
    if (existsSync(temporary)) rmSync(temporary, { recursive: true, force: true });
    if (existsSync(target) && movedExisting) rmSync(target, { recursive: true, force: true });
    if (movedExisting && existsSync(backup)) renameSync(backup, target);
    throw error;
  }
} catch (error) {
  console.error(`nbskill installation failed: ${error.message}`);
  process.exitCode = 1;
}
