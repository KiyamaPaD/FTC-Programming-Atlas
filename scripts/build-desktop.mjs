import { copyFile, mkdir, stat } from 'node:fs/promises'
import { spawnSync } from 'node:child_process'
import { dirname, join } from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { NATIVE_VERSION } from './native-meta.mjs'

const target = (process.argv[2] || 'nsis').toLowerCase()
if (!['nsis', 'portable'].includes(target)) {
  throw new Error('Usage: node scripts/build-desktop.mjs [nsis|portable]')
}

const scriptDirectory = dirname(fileURLToPath(import.meta.url))
const root = join(scriptDirectory, '..')
const require = createRequire(import.meta.url)
let electronBuilderCli
try {
  electronBuilderCli = require.resolve('electron-builder/out/cli/cli.js')
} catch {
  throw new Error('electron-builder is not installed. Run npm ci first.')
}

const artifactName = target === 'portable'
  ? `FTC-Programming-Atlas-${NATIVE_VERSION}-x64-Portable.exe`
  : `FTC-Programming-Atlas-${NATIVE_VERSION}-x64.exe`

const args = [
  '--win', target,
  '--x64',
  `-c.win.artifactName=${artifactName}`
]

const result = spawnSync(process.execPath, [electronBuilderCli, ...args], {
  cwd: root,
  stdio: 'inherit',
  shell: false
})

if (result.status !== 0) {
  process.exit(result.status ?? 1)
}

const source = join(root, 'dist-desktop', artifactName)
await stat(source)
const downloads = join(root, 'downloads')
await mkdir(downloads, { recursive: true })
const destination = join(downloads, artifactName)
await copyFile(source, destination)
console.log(`Windows ${target} build ready: ${destination}`)
