import { copyFile, mkdir, readdir, stat } from 'node:fs/promises'
import { spawnSync } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { NATIVE_VERSION } from './native-meta.mjs'

const mode = (process.argv[2] || 'release').toLowerCase()
if (!['release', 'debug'].includes(mode)) {
  throw new Error('Usage: node scripts/build-android.mjs [release|debug]')
}

const scriptDirectory = dirname(fileURLToPath(import.meta.url))
const root = join(scriptDirectory, '..')
const androidRoot = join(root, 'android')
const gradleCommand = process.platform === 'win32' ? 'gradlew.bat' : './gradlew'
const task = mode === 'release' ? 'assembleRelease' : 'assembleDebug'

const result = spawnSync(gradleCommand, [task], {
  cwd: androidRoot,
  stdio: 'inherit',
  shell: process.platform === 'win32'
})

if (result.status !== 0) {
  process.exit(result.status ?? 1)
}

const outputDir = join(androidRoot, 'app', 'build', 'outputs', 'apk', mode)
const files = await readdir(outputDir)
const apkName = files.find((name) => name.endsWith('.apk') && !name.includes('unsigned'))

if (!apkName) {
  if (mode === 'release') {
    throw new Error(
      'Release APK was built unsigned. Copy android/keystore.properties.example to ' +
      'android/keystore.properties and add the credentials for your existing signing key, then rebuild.'
    )
  }
  throw new Error(`No ${mode} APK found in ${outputDir}`)
}

const source = join(outputDir, apkName)
await stat(source)
const downloads = join(root, 'downloads')
await mkdir(downloads, { recursive: true })
const destination = join(downloads, `FTC-Programming-Atlas-${NATIVE_VERSION}.apk`)
await copyFile(source, destination)
console.log(`Android APK ready: ${destination}`)
