import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const EXPECTED_NODE_MAJOR = 22;
const projectRoot = fileURLToPath(new URL("../", import.meta.url));
const mode = process.argv[2];
const nodeMajor = Number.parseInt(process.versions.node.split(".")[0], 10);

const QUALITY_COMMANDS = [
  ["npm", ["ci"]],
  ["npx", ["playwright", "install", "chromium"]],
  ["npm", ["run", "build:frontend"]],
  ["npm", ["run", "check:frontend"]],
  ["npm", ["run", "check:i18n"]],
  ["npm", ["run", "check:regressions"]],
  ["cargo", ["check", "--manifest-path", "src-tauri/Cargo.toml"]],
  ["cargo", ["test", "--manifest-path", "src-tauri/Cargo.toml", "--lib", "--", "--nocapture"]],
  ["cargo", ["test", "--manifest-path", "src-tauri/Cargo.toml", "--test", "html_edit", "--", "--nocapture"]],
];

const WINDOWS_COMMANDS = [
  ["npm", ["ci"]],
  ["npm", ["run", "build:frontend"]],
  ["cargo", ["check", "--manifest-path", "src-tauri/Cargo.toml"]],
];

const commandsByMode = {
  quality: QUALITY_COMMANDS,
  windows: WINDOWS_COMMANDS,
};

if (!(mode in commandsByMode)) {
  console.error("Usage: node scripts/check-ci.mjs <quality|windows>");
  process.exit(2);
}

if (nodeMajor !== EXPECTED_NODE_MAJOR) {
  console.error(
    `CI preflight requires Node ${EXPECTED_NODE_MAJOR}.x, but this shell is running ${process.version}. `
      + "Install the version declared in .nvmrc, then run `nvm use` before retrying.",
  );
  process.exit(1);
}

const executableFor = (command) => (
  process.platform === "win32" && (command === "npm" || command === "npx")
    ? `${command}.cmd`
    : command
);

const run = (command, args) => {
  console.log(`\n==> ${[command, ...args].join(" ")}`);
  const result = spawnSync(executableFor(command), args, {
    cwd: projectRoot,
    stdio: "inherit",
  });

  if (result.error) {
    console.error(`Unable to start ${command}: ${result.error.message}`);
    process.exit(1);
  }
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
};

console.log(`Running ${mode} CI preflight with Node ${process.version}.`);
for (const [command, args] of commandsByMode[mode]) {
  run(command, args);
}
console.log(`\n${mode} CI preflight passed.`);
