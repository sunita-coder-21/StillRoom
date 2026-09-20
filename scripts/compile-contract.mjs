import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const source = resolve(root, 'contracts/stillroom.compact');
const target = resolve(root, 'contracts/managed/stillroom');
const staging = resolve(root, `contracts/managed/.stillroom-build-${process.pid}`);
const version = '0.31.1';
const circuits = ['check_in', 'configure_screening', 'pause_admissions', 'resume_admissions', 'issue_credential'];
const quote = (value) => `'${value.replaceAll("'", "'\\''")}'`;
const wslPath = (value) => value.replace(/^([A-Za-z]):/, (_, drive) => `/mnt/${drive.toLowerCase()}`).replaceAll('\\', '/');

// Windows' native compact.exe compresses files: it is NOT the Midnight compiler.
// Resolve Midnight's compact CLI in the WSL login shell without assuming a username.
const invoke = (args, capture = false) => {
  const command = process.platform === 'win32' ? 'wsl.exe' : 'compact';
  const commandArgs = process.platform === 'win32'
    ? ['--', 'bash', '-lc', `export PATH="$HOME/.local/bin:$HOME/.compact/bin:$PATH"; exec compact compile +${version} ${args.map((arg) => quote(wslPath(arg))).join(' ')}`]
    : ['compile', `+${version}`, ...args];
  const result = spawnSync(command, commandArgs, {
    cwd: root,
    stdio: capture ? 'pipe' : 'inherit',
    encoding: 'utf8',
    shell: false,
  });
  if (result.error || result.status !== 0) {
    throw new Error(`Compact ${version} failed: ${result.error?.message ?? result.stderr ?? `exit ${result.status}`}. Install Midnight compact (in WSL on Windows) and compiler ${version}.`);
  }
  return result.stdout?.trim();
};

if (!existsSync(source)) throw new Error(`Missing Compact source: ${source}`);
mkdirSync(resolve(root, 'contracts/managed'), { recursive: true });
try {
  const compilerVersion = invoke(['--version'], true);
  const runtimeVersion = invoke(['--runtime-version'], true);
  console.log(`Compiling Stillroom with Compact ${compilerVersion}, runtime ${runtimeVersion}; generating fresh proving and verifying keys.`);
  // An empty output directory prevents reusing a previous contract's key material.
  rmSync(staging, { recursive: true, force: true });
  invoke([source, staging]);
  const hashes = {};
  for (const circuit of circuits) {
    for (const extension of ['prover', 'verifier']) {
      const relative = `keys/${circuit}.${extension}`;
      const path = resolve(staging, relative);
      if (!existsSync(path) || statSync(path).size === 0) throw new Error(`Compiler did not generate ${relative}`);
      hashes[relative] = createHash('sha256').update(readFileSync(path)).digest('hex');
    }
    const zkir = resolve(staging, `zkir/${circuit}.bzkir`);
    if (!existsSync(zkir) || statSync(zkir).size === 0) throw new Error(`Missing binary ZK IR for ${circuit}`);
  }
  writeFileSync(resolve(staging, 'build-info.json'), JSON.stringify({
    contract: 'Stillroom',
    compilerVersion,
    runtimeVersion,
    source: 'contracts/stillroom.compact',
    sourceSha256: createHash('sha256').update(readFileSync(source)).digest('hex'),
    fullKeyGeneration: true,
    keys: hashes,
  }, null, 2) + '\n');
  // Preserve the last working output unless a full compile and asset validation succeed.
  rmSync(target, { recursive: true, force: true });
  renameSync(staging, target);
  console.log('Stillroom generated artifacts: contracts/managed/stillroom');
} finally {
  rmSync(staging, { recursive: true, force: true });
}
