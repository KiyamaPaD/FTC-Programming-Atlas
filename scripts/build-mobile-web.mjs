import {
  cp,
  mkdir,
  readFile,
  rm,
  writeFile
} from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { ATLAS_RELEASE, LEGACY_I18N_RELEASE, atlasVersionedPath } from './release-meta.mjs'

const scriptDirectory = dirname(fileURLToPath(import.meta.url))
const projectRoot = join(scriptDirectory, '..')
const outputRoot = join(projectRoot, 'www')

const MOBILE_MARKER = `data-atlas-mobile="v${ATLAS_RELEASE}"`

const rootFiles = [
  'index.html',
  'privacy.html',
  'privacy-en.html',
  'site.webmanifest',
  'favicon.ico',
  'favicon-48x48.png',
  'favicon-96x96.png',
  'apple-touch-icon.png'
]

const rootDirectories = [
  'img',
  'js'
]

async function copyFileOrDirectory(relativePath) {
  const source = join(projectRoot, relativePath)
  const destination = join(outputRoot, relativePath)

  await mkdir(dirname(destination), { recursive: true })
  await cp(source, destination, {
    recursive: true,
    force: true
  })
}

function injectMobileRuntime(html) {
  if (html.includes(MOBILE_MARKER)) {
    return html
  }

  const atlasScriptPattern =
    /<script\s+type=["']module["']\s+src=["']\/js\/atlas-script\.js\?v=\d+["']\s*><\/script>/i

  const atlasScript = html.match(atlasScriptPattern)?.[0]

  if (!atlasScript) {
    throw new Error(
      'Could not find the Atlas application script in index.html. ' +
      'Update scripts/build-mobile-web.mjs if its version/path changed.'
    )
  }

  const mobileScripts = [
    atlasScript,
    `<script type="module" src="${atlasVersionedPath('/js/atlas-i18n.js')}"></script>`,
    `<script type="module" src="${atlasVersionedPath(`/js/atlas-i18n-v${LEGACY_I18N_RELEASE}.js`, LEGACY_I18N_RELEASE)}" ${MOBILE_MARKER}></script>`
  ].join('\n  ')

  html = html.replace(
    atlasScriptPattern,
    mobileScripts
  )

  if (!/name=["']mobile-web-app-capable["']/i.test(html)) {
    html = html.replace(
      '</head>',
      '  <meta name="mobile-web-app-capable" content="yes" />\n</head>'
    )
  }

  if (!/name=["']apple-mobile-web-app-capable["']/i.test(html)) {
    html = html.replace(
      '</head>',
      '  <meta name="apple-mobile-web-app-capable" content="yes" />\n</head>'
    )
  }

  return html
}

async function buildMobileWeb() {
  await rm(outputRoot, {
    recursive: true,
    force: true
  })

  await mkdir(outputRoot, {
    recursive: true
  })

  for (const file of rootFiles) {
    await copyFileOrDirectory(file)
  }

  for (const directory of rootDirectories) {
    await copyFileOrDirectory(directory)
  }

  const indexPath = join(outputRoot, 'index.html')
  const indexHtml = await readFile(indexPath, 'utf8')
  const mobileHtml = injectMobileRuntime(indexHtml)

  await writeFile(
    indexPath,
    mobileHtml,
    'utf8'
  )

  console.log('FTC Programming Atlas mobile web bundle ready: www/')
  console.log(`Included bilingual runtime: atlas-i18n v${ATLAS_RELEASE} + v${LEGACY_I18N_RELEASE}`)
}

buildMobileWeb().catch((error) => {
  console.error('Mobile web build failed:')
  console.error(error)
  process.exitCode = 1
})
