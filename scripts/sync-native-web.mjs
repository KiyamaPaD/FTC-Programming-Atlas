import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { ATLAS_RELEASE } from './release-meta.mjs'

const scriptDirectory = dirname(fileURLToPath(import.meta.url))
const projectRoot = join(scriptDirectory, '..')
const webRoot = join(projectRoot, 'www')
const androidPublicRoot = join(projectRoot, 'android', 'app', 'src', 'main', 'assets', 'public')
const capacitorSource = join(projectRoot, 'capacitor.config.json')
const capacitorDestination = join(projectRoot, 'android', 'app', 'src', 'main', 'assets', 'capacitor.config.json')

async function syncAndroidBundle() {
  const index = await readFile(join(webRoot, 'index.html'), 'utf8')
  if (!index.includes(`/js/atlas-script.js?v=${ATLAS_RELEASE}`)) {
    throw new Error(`www/ is not built for Atlas v${ATLAS_RELEASE}. Run npm run mobile:build first.`)
  }

  await rm(androidPublicRoot, { recursive: true, force: true })
  await mkdir(androidPublicRoot, { recursive: true })
  await cp(webRoot, androidPublicRoot, { recursive: true, force: true })

  // Capacitor normally writes these during `cap sync`. Keep the checked-in Android
  // project self-contained too, so Android Studio cannot accidentally build an old web bundle.
  await cp(capacitorSource, capacitorDestination, { force: true })

  // This project has no Cordova plugins, but Capacitor expects the shims to exist in
  // generated Android web assets when it has performed a sync.
  await writeFile(join(androidPublicRoot, 'cordova.js'), 'globalThis.cordova = globalThis.cordova || {};\n', 'utf8')
  await writeFile(join(androidPublicRoot, 'cordova_plugins.js'), 'globalThis.cordova = globalThis.cordova || {};\nglobalThis.cordova.define = globalThis.cordova.define || function() {};\n', 'utf8')

  console.log(`Android embedded web bundle synchronized to Atlas v${ATLAS_RELEASE}.`)
}

syncAndroidBundle().catch((error) => {
  console.error('Native web sync failed:')
  console.error(error)
  process.exitCode = 1
})
