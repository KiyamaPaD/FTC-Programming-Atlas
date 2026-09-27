import { readFile, stat } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { ATLAS_RELEASE } from './release-meta.mjs'
import { ANDROID_VERSION_CODE, NATIVE_VERSION } from './native-meta.mjs'

const scriptDirectory = dirname(fileURLToPath(import.meta.url))
const root = join(scriptDirectory, '..')
const read = (relativePath) => readFile(join(root, relativePath), 'utf8')
const exists = async (relativePath) => stat(join(root, relativePath)).then(() => true, () => false)

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

const [pkgRaw, gradle, capacitor, androidIndex, androidScript, desktopMain] = await Promise.all([
  read('package.json'),
  read('android/app/build.gradle'),
  read('capacitor.config.json'),
  read('android/app/src/main/assets/public/index.html'),
  read('android/app/src/main/assets/public/js/atlas-script.js'),
  read('desktop/main.cjs')
])

const pkg = JSON.parse(pkgRaw)
const capacitorConfig = JSON.parse(capacitor)

assert(pkg.version === NATIVE_VERSION, `package.json version must be ${NATIVE_VERSION}`)
assert(gradle.includes(`versionCode ${ANDROID_VERSION_CODE}`), 'Android versionCode is stale')
assert(gradle.includes(`versionName "${NATIVE_VERSION}"`), 'Android versionName is stale')
assert(gradle.includes('keystore.properties'), 'Android release signing config is missing')
assert(capacitorConfig.loggingBehavior === 'production', 'Capacitor loggingBehavior must be production')
assert(androidIndex.includes(`/js/atlas-script.js?v=${ATLAS_RELEASE}`), 'Android embedded index.html is stale')
assert(androidScript.includes(`ATLAS SCRIPT LOADED v${ATLAS_RELEASE}`), 'Android embedded Atlas runtime is stale')
assert(!androidIndex.includes('privacy.html'), 'retired privacy surface leaked into Android bundle')
assert(await exists('build/icon.ico'), 'Windows build/icon.ico is missing')
assert(desktopMain.includes("app.setAppUserModelId('com.ftcprogrammingatlas.desktop')"), 'Windows AppUserModelID is missing')
assert(pkg.build?.win?.icon === 'build/icon.ico', 'electron-builder Windows icon is not configured')

console.log(`Native clients ready: Atlas v${ATLAS_RELEASE} / app v${NATIVE_VERSION}`)
console.log('Android embedded bundle, signing configuration, and Windows packaging metadata are synchronized.')
