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
    headers,
    redirects
  ] = await Promise.all([
    read('index.html'),
    read('js/atlas-script.js'),
    read('js/atlas-i18n.js'),
    read('scripts/build-mobile-web.mjs'),
    read('netlify/edge-functions/i18n-shell.js'),
    read('_headers'),
    read('_redirects')
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
    i18n.includes(`// v${RELEASE}`),
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
    appScript.includes('id="detailMoreMenu"') &&
      !appScript.includes('${renderDocumentReferences(node)}') &&
      !appScript.includes('${renderDocumentReviewFact(node)}'),
    'node viewer still exposes Sources/Review or lost its compact action menu'
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
  const translationManagerCalls =
    (i18n.match(/injectTranslationManagerButton\(\)/g) || []).length
  assert(
    translationManagerCalls === 1,
    'legacy public-node translation manager is still injected at runtime'
  )

  assert(
    index.includes('data-public-section="team"') &&
      index.includes('data-public-section="team-roadmaps"') &&
      index.includes('data-public-section="announcements"') &&
      !index.includes('data-public-section="index"') &&
      !index.includes('data-public-section="resources"'),
    'team-first primary navigation is missing or legacy Index/Resources tabs remain'
  )
  assert(
    !index.includes('documentationHealth') &&
      !appScript.includes('documentationHealth'),
    'Documentation Health is still present'
  )
  assert(
    !index.includes('data-public-content-kind="resources"') &&
      !index.includes('id="resourceEditorFields"'),
    'legacy Resources manager UI is still present'
  )
  assert(
    index.includes('class="editor-mode-trigger topbar-editor-btn"') &&
      index.includes('id="editorDock"') &&
      index.includes('id="editorModeBtn"') &&
      !index.includes('id="teamNavigationSection"'),
    'Editor trigger / team workspace navigation is stale'
  )
  assert(
    appScript.includes("localStorage.getItem(CACHE_KEYS.editorMode) === '1'") &&
      appScript.includes("localStorage.setItem(CACHE_KEYS.editorMode, editorMode ? '1' : '0')"),
    'Editor Mode persistence is missing'
  )
  assert(
    index.includes('id="richInsertCodeBtn"') &&
      index.includes('id="richInsertMediaBtn"') &&
      index.includes('id="richInsertFileBtn"') &&
      appScript.includes('function insertInlineEmbed(type, id)') &&
      appScript.includes('function renderRichDocumentationWithEmbeds(node)') &&
      appScript.includes("data-atlas-embed"),
    'inline code/media/file document embeds are missing'
  )
  assert(
    appScript.includes('async function loadActiveTeamAtlasNodes') &&
      appScript.includes("'team-roadmaps',\n  'announcements'") && !appScript.includes("'resources'\n])"),
    'Team Atlas loader or team-first section contract is missing'
  )
  assert(
    !appScript.includes("activePublicSection = 'explore'") &&
      !appScript.includes(".from('atlas_resources')") &&
      !appScript.includes(".from('atlas_nodes')"),
    'legacy global graph/resources runtime is still active'
  )
  assert(
    index.includes('<h2 id="atlasStatusTitle">FTC Programming Atlas · se încarcă...</h2>') &&
      index.includes('id="atlasStatusMessage" hidden') &&
      !index.includes('id="introScreen"') &&
      !appScript.includes('dismissIntro'),
    'v102 loading shell still contains the legacy intro screen'
  )
  assert(
    index.includes('id="teamAtlasPrimary" data-ui-section="team-atlas"') &&
      index.includes('id="teamAtlasIdentity"') &&
      index.includes('class="team-atlas-primary-tabs"') &&
      index.includes('class="announcements-nav-button"') &&
      index.includes('class="atlas-section-switcher"') &&
      index.includes('id="teamAdminBackdrop"') &&
      index.includes('id="teamAdminList"') &&
      index.includes('Echipe și acces'),
    'v100 collapsible Team Atlas / team identity hierarchy is missing'
  )
  assert(
    !index.includes('team-atlas-global-row') &&
      !index.includes('global-primary-tab') &&
      appScript.includes('teamAtlasPrimary.hidden = !currentTeamRecord()'),
    'legacy/broken Global tab layout is still present'
  )
  const navStart = index.indexOf('id="atlasNavigation"')
  const navEnd = index.indexOf('</nav>', navStart)
  const editorTrigger = index.indexOf('id="editorModeBtn"')
  assert(
    navStart >= 0 && navEnd > navStart && editorTrigger > navStart && editorTrigger < navEnd &&
      index.includes('navigation-editor-zone') &&
      index.includes('id="editorModeState"') &&
      index.includes('.editor-mode-trigger {\n    position: static;'),
    'Editor Mode is not embedded in the navigation workspace'
  )
  assert(
    !index.includes('id="teamAtlasTaxonomyBtn"') &&
      !index.includes('id="teamAtlasSettingsBtn"') &&
      !index.includes('id="teamAtlasMembersBtn"') &&
      !index.includes('slug: ${escapeHtml(item.slug') &&
      !appScript.includes('slug: ${escapeHtml(item.slug'),
    'legacy left-side team controls or user-visible slug remain'
  )
  assert(
    appScript.includes('function openTeamAdminManager()') &&
      appScript.includes('data-team-admin-atlas') &&
      appScript.includes('data-team-admin-settings') &&
      appScript.includes('data-team-admin-members') &&
      appScript.includes("currentUser && (hasPlatformAdminPrivileges() || canManageCurrentTeam())"),
    'team administration runtime is missing'
  )
  assert(
    appScript.includes("hasPlatformAdminPrivileges() && editorMode && activePublicSection === 'announcements'") &&
      appScript.includes('function canEditCurrentSection()') &&
      appScript.includes("if (activePublicSection === 'announcements') return hasPlatformAdminPrivileges()") &&
      appScript.includes("editorPrimaryActions.hidden = !teamEditorActive") &&
      appScript.includes("editorContextEmpty.textContent = globalAnnouncementsEditorActive"),
    'Global announcements editor permission repair is missing'
  )
  assert(
    index.includes('id="editorPrimaryActions" data-ui-section="editor-actions"') &&
      index.includes('id="editorNodeContext" data-ui-section="editor-node-context"') &&
      index.includes('id="editorEdgeContext" data-ui-section="editor-edge-context"') &&
      index.includes('<details class="field form-disclosure" id="nodeTagsField">'),
    'v100 collapsible editor actions / selection / node tags are missing'
  )
  assert(
    index.includes('id="rolePreviewBtn"') &&
      index.includes('id="rolePreviewBackdrop"') &&
      index.includes('id="rolePreviewBanner"') &&
      appScript.includes('function startAdminRolePreview()') &&
      appScript.includes('function stopAdminRolePreview()') &&
      appScript.includes('function hasPlatformAdminPrivileges()'),
    'Platform Admin role preview is missing'
  )
  assert(
    appScript.includes("teamAtlasIdentity.textContent = teamName") &&
      appScript.includes('function readableTeamDepartmentIds()') &&
      appScript.includes('function currentViewDepartments()'),
    'team identity / role-scoped Team Atlas view is missing'
  )

  assert(
    appScript.includes('1. Team Atlas\n\nAtlasul este documentația internă a echipei.') &&
      appScript.includes("modalTitle.textContent = 'Cum folosești Atlasul'") &&
      appScript.includes("contentInput.readOnly = true") &&
      !appScript.includes("atlas_update_tutorial") &&
      !appScript.includes("saveTutorial()") &&
      !appScript.includes(".from('atlas_project_tutorials')"),
    'v102 tutorial is not immutable / bundled-only'
  )

  assert(
    index.includes('id="requestTeamBtn"') &&
      index.includes('id="teamAdminRequests"') &&
      appScript.includes("atlas_team_request_create") &&
      appScript.includes("atlas_team_request_review") &&
      appScript.includes('function renderTeamAdminRequests()'),
    'v102 self-service team request flow is missing'
  )

  assert(
    appScript.includes("PRIVATE_DEPARTMENT_KEYS = new Set(['politics'])") &&
      appScript.includes('privateDepartmentIds') &&
      appScript.includes('filter((row) => !privateDepartmentIds.has(Number(row.department_id)))'),
    'v102 Politics privacy filter is missing'
  )

  assert(
    index.includes('data-ui-section="team-atlas"') &&
      index.includes('data-ui-section="global"') &&
      index.includes('data-ui-section="departments"') &&
      index.includes('data-ui-section="editor-zone"'),
    'v102 navigation zones are not fully collapsible'
  )
  assert(
    !index.includes('id="statusSection"') &&
      !index.includes('>Status</span>'),
    'Quick Panel Status section still exists'
  )
  assert(
    appScript.includes("publicSection: 'ftc_atlas_primary_section_v2'") &&
      appScript.includes("activePublicSection = PUBLIC_SECTIONS.has(savedSection)") &&
      appScript.includes("? savedSection\n      : 'team'"),
    'v102 primary-section persistence / Explore default is missing'
  )
  assert(
    i18n.includes('Actualizări importante pentru toate echipele.') &&
      i18n.includes('Scrie aici documentația completă.') &&
      i18n.includes('Paste-ul este curățat automat.') &&
      i18n.includes('Echipe și acces') &&
      i18n.includes('Membri și acces') &&
      i18n.includes('Setări echipă') &&
      i18n.includes('Ce recomandă acest roadmap și pentru cine?'),
    'v102 RO/EN admin coverage is incomplete'
  )
  assert(
    !index.includes('id="newTeamSetupBtn"'),
    'redundant New Team control still exists inside Team settings'
  )
  assert(
    !index.toLowerCase().includes('privacy.html') &&
      !i18n.toLowerCase().includes('privacy.html') &&
      !mobileBuilder.includes("'privacy.html'") &&
      /\/privacy\.html\s+\/\s+301!/.test(redirects) &&
      /\/privacy-en\.html\s+\/\s+301!/.test(redirects) &&
      /\/privacy\s+\/\s+301!/.test(redirects) &&
      /\/privacy-en\s+\/\s+301!/.test(redirects) &&
      mobileBuilder.includes("rm(join(outputRoot, 'js', 'privacy-language.js')"),
    'privacy-policy surface is still publicly exposed'
  )

  assert(
    index.includes('id="navigationRailCollapseBtn"') &&
      index.includes('.atlas-navigation.rail-collapsed') &&
      appScript.includes("navigationRail: 'ftc_atlas_navigation_rail_v1'") &&
      appScript.includes('function setNavigationRailCollapsed(') &&
      appScript.includes('initializeNavigationRailCollapse()'),
    'v104 whole navigation rail collapse is missing'
  )
  assert(
    i18n.includes('Niciun roadmap în acest departament.') &&
      i18n.includes('Toată documentația rămâne accesibilă direct din hartă.') &&
      i18n.includes('Progres personal · fără blocări · documentația rămâne liberă.') &&
      !appScript.includes('hartă și Index'),
    'v104 Team Roadmaps bilingual cleanup is incomplete'
  )
  assert(
    i18n.includes('Active Atlas · ${match[1]}') &&
      i18n.includes('Role preview · ${roleLabels[match[1].toLowerCase()] || match[1]}${match[2]}') &&
      i18n.includes("/^·?\\s*(\\d+)\\s+roadmap-uri$/i") &&
      i18n.includes("/^·?\\s*(\\d+)\\s+membri$/i") &&
      i18n.includes("/^·?\\s*(\\d+)\\s+departamente$/i"),
    'v104 Team Admin / Role Preview dynamic i18n is incomplete'
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
