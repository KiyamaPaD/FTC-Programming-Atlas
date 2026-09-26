import { readFile } from 'node:fs/promises'
import { execFileSync } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { ATLAS_RELEASE as RELEASE } from './release-meta.mjs'

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
    index.includes('id="mobileNavBtn"') &&
      index.includes('id="mobileQuickBtn"') &&
      index.includes('id="mobileShellBackdrop"') &&
      index.includes('.atlas-navigation.mobile-open') &&
      index.includes('.floating-tools.collapsed'),
    'mobile navigation / Quick Panel shell is missing'
  )
  const htmlIds = [...index.matchAll(/\bid=["']([^"']+)["']/g)].map((match) => match[1])
  const duplicateIds = htmlIds.filter((id, position) => htmlIds.indexOf(id) !== position)
  assert(duplicateIds.length === 0, `duplicate HTML ids: ${[...new Set(duplicateIds)].join(', ')}`)
  assert(
    !index.includes('.brand-dot') &&
      !index.includes('.atlas-navigation-head') &&
      !index.includes('.icon-actions') &&
      !index.includes('.node-media-section') &&
      !index.includes('.node-files-section') &&
      !index.includes('.node-code-section'),
    'legacy UI CSS from the pre-v91/v93 shell is still present'
  )
  assert(
    appScript.includes('function syncMobileChrome()') &&
      appScript.includes('function setMobileNavigationOpen(open)') &&
      appScript.includes('function closeMobileChrome('),
    'mobile shell runtime is missing or stale'
  )
  assert(
    !appScript.includes('keyboardMoveState') &&
      !appScript.includes('savePositionBtn') &&
      !appScript.includes('richFontSizeSelect') &&
      appScript.includes('confirmUnsavedLayoutBeforeLeaving()'),
    'legacy pre-layout editor code is still present'
  )
  assert(
    i18n.includes("#editorAdminSection .compact-grid") &&
      !i18n.includes("#editorToolsSection .tools-grid"),
    'translation manager is not attached to the consolidated admin controls'
  )
  assert(
    mobileBuilder.includes('ATLAS_RELEASE') &&
      mobileBuilder.includes("atlasVersionedPath('/js/atlas-i18n.js')") &&
      mobileBuilder.includes('data-atlas-mobile="v${ATLAS_RELEASE}"'),
    'mobile bundle release plumbing is missing or stale'
  )
  assert(
    edgeShell.includes(`const ATLAS_RELEASE = ${RELEASE}`) &&
      edgeShell.includes('I18N_SCRIPT = `/js/atlas-i18n.js?v=${ATLAS_RELEASE}`') &&
      edgeShell.includes('data-atlas-i18n="v${ATLAS_RELEASE}"'),
    'Netlify i18n shell release plumbing is missing or stale'
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
    'scripts/release-meta.mjs',
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
