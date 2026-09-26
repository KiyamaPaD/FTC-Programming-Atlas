import { readFile } from 'node:fs/promises'
import { execFileSync } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const RELEASE = 94
const scriptDirectory = dirname(fileURLToPath(import.meta.url))
const projectRoot = join(scriptDirectory, '..')

const read = async (relativePath) =>
  readFile(join(projectRoot, relativePath), 'utf8')

function assert(condition, message) {
  if (!condition) {
    throw new Error(message)
  }
}

function checkSyntax(relativePath) {
  execFileSync(process.execPath, ['--check', join(projectRoot, relativePath)], {
    stdio: 'pipe'
  })
}

async function main() {
  const [
    index,
    appScript,
    i18n,
    mobileBuilder,
    edgeShell,
    headers
  ] = await Promise.all([
    read('index.html'),
    read('js/atlas-script.js'),
    read('js/atlas-i18n.js'),
    read('scripts/build-mobile-web.mjs'),
    read('netlify/edge-functions/i18n-shell.js'),
    read('_headers')
  ])

  assert(
    index.includes(`/js/atlas-script.js?v=${RELEASE}`),
    `index.html does not load atlas-script v${RELEASE}`
  )
  assert(
    index.includes(`rel="modulepreload" href="/js/atlas-script.js?v=${RELEASE}"`),
    'index.html modulepreload is missing or stale'
  )
  assert(
    appScript.includes(`ATLAS SCRIPT LOADED v${RELEASE}`),
    'atlas-script release marker is stale'
  )
  assert(
    i18n.includes(`v${RELEASE} · Full English UI`),
    'atlas-i18n release marker is stale'
  )
  assert(
    i18n.includes('applyDynamicEntityTranslations()'),
    'dynamic public-content translation runtime is missing'
  )
  assert(
    index.includes('class="rich-editor-more"') &&
      !index.includes('id="richFontSizeSelect"'),
    'rich-text toolbar simplification is missing or stale'
  )
  assert(
    appScript.includes('data-document-section="sources"') &&
      appScript.includes('id="detailMoreMenu"'),
    'documentation reader disclosure structure is missing'
  )
  assert(
    index.includes('id="editorContextMeta"') &&
      index.includes('id="editorNodeContext"') &&
      index.includes('id="editorEdgeContext"') &&
      index.includes('id="editorEdgeLayoutTools"'),
    'contextual Editor Mode structure is missing'
  )
  assert(
    !index.includes('data-ui-section="editor-node"') &&
      !index.includes('data-ui-section="editor-edge"'),
    'legacy always-visible editor tool groups are still present'
  )
  assert(
    appScript.includes("editorToolsSection.hidden = !editorActive") &&
      appScript.includes('function renderEditorContext()'),
    'contextual editor runtime is missing or stale'
  )
  assert(
    mobileBuilder.includes(`data-atlas-mobile="v${RELEASE}"`) &&
      mobileBuilder.includes(`/js/atlas-i18n.js?v=${RELEASE}`),
    'mobile bundle markers are stale'
  )
  assert(
    edgeShell.includes(`/js/atlas-i18n.js?v=${RELEASE}`) &&
      edgeShell.includes(`data-atlas-i18n="v${RELEASE}"`),
    'Netlify i18n shell markers are stale'
  )
  assert(
    headers.includes('Strict-Transport-Security:') &&
      headers.includes('Cross-Origin-Opener-Policy: same-origin') &&
      headers.includes('Content-Security-Policy:'),
    'security headers are incomplete'
  )
  assert(
    headers.includes('/js/*') && headers.includes('immutable'),
    'static asset cache policy is missing'
  )

  for (const file of [
    'js/atlas-script.js',
    'js/atlas-i18n.js',
    'scripts/build-mobile-web.mjs',
    'scripts/release-check.mjs',
    'netlify/edge-functions/i18n-shell.js'
  ]) {
    checkSyntax(file)
  }

  console.log(`FTC Programming Atlas v${RELEASE} release checks passed.`)
}

main().catch((error) => {
  console.error('Release check failed:')
  console.error(error.message || error)
  process.exitCode = 1
})
