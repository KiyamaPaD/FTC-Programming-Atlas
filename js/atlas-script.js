import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.112.3'

console.log('ATLAS SCRIPT LOADED v93 · DOCUMENTATION UX + RICH EDITOR REWORK')

// Project configuration and application limits
const SUPABASE_URL = 'https://sznohntrlyynbhdigdgb.supabase.co'
const SUPABASE_KEY = 'sb_publishable_Qv7L9k8PD2zN1LKuXXHzMQ_FfGDR_e4'
const PROJECT_ID = 'ftc-main'
const SITE_ORIGIN = 'https://ftcprogrammingatlas.com'
const HOME_PATH = '/'
const HOME_TITLE = 'FTC Programming Atlas | FTC Robotics Programming Guide'
const HOME_DESCRIPTION =
  'Interactive FTC programming guide for FTC SDK, Pedro Pathing, Road Runner, FTCLib, control loops, vision, autonomous programming, and debugging.'
const MEDIA_BUCKET = 'atlas-media'
const FILE_BUCKET = 'atlas-files'
const TEAM_MEDIA_BUCKET = 'atlas-team-media'
const TEAM_FILE_BUCKET = 'atlas-team-files'
const TEAM_SIGNED_URL_TTL_SECONDS = 6 * 60 * 60
const MAX_MEDIA_FILE_SIZE = 50 * 1024 * 1024
const MAX_NODE_FILE_SIZE = 100 * 1024 * 1024
const MAX_NODE_FILE_BATCH_COUNT = 250
const MAX_NODE_FILE_BATCH_SIZE = 500 * 1024 * 1024
const ALLOWED_MEDIA_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'video/mp4',
  'video/webm',
  'video/quicktime'
])

const CACHE_KEYS = {
  view: 'ftc_atlas_view_v1',
  panel: 'ftc_atlas_panel_v1',
  intro: 'ftc_atlas_intro_v1',
  editorMode: 'ftc_atlas_editor_mode_v1',
  codeDrafts: 'ftc_atlas_code_drafts_v1',
  codeManagerOpen: 'ftc_atlas_code_manager_open_v1',
  department: 'ftc_atlas_department_v1',
  publicSection: 'ftc_atlas_public_section_v1',
  activeTeam: 'ftc_atlas_active_team_v1',
  pendingTeamInvite: 'ftc_atlas_pending_team_invite_v1',
  pendingTeamRoute: 'ftc_atlas_pending_team_route_v1',
  recentDocs: 'ftc_atlas_recent_docs_v1',
  localBookmarks: 'ftc_atlas_local_bookmarks_v1',
  qualityLens: 'ftc_atlas_quality_lens_v1',
  healthStaleDays: 'ftc_atlas_health_stale_days_v1',
  publicIndexSort: 'ftc_atlas_public_index_sort_v1',
  publicIndexGroup: 'ftc_atlas_public_index_group_v1',
  uiSections: 'ftc_atlas_ui_sections_v1'
}

const initialTeamInviteToken = new URLSearchParams(window.location.search).get('teamInvite')
if (initialTeamInviteToken) {
  localStorage.setItem(CACHE_KEYS.pendingTeamInvite, initialTeamInviteToken)
}

const INITIAL_TEAM_ROUTE_MATCH = window.location.hash.match(
  /^#team-(\d+)-node-(\d+)$/
)

if (INITIAL_TEAM_ROUTE_MATCH) {
  localStorage.setItem(
    CACHE_KEYS.pendingTeamRoute,
    JSON.stringify({
      hash: window.location.hash,
      savedAt: Date.now()
    })
  )
}

const DEFAULT_VIEW = { x: -120, y: -80, scale: 1 }

const WORLD_WIDTH = 2600
const WORLD_HEIGHT = 1800
const NODE_WIDTH = 230
const NODE_HEIGHT = 118
const NODE_GAP = 28
const DRAG_THRESHOLD = 5
const MOBILE_LONG_PRESS_MS = 260
const NODE_MIN_WIDTH = 172
const NODE_MIN_HEIGHT = 104
const NODE_MAX_WIDTH = 720
const NODE_MAX_HEIGHT = 520
const MAX_EDGE_CONTROL_POINTS = 12

// Legacy keyboard movement constants kept for compatibility.
// v88 uses explicit Layout Edit Mode with arrow-key nudging instead of WASD.
const WASD_TAP_STEP = 12
const WASD_INITIAL_SPEED = 160
const WASD_ACCELERATION_DELAY_MS = 180
const WASD_ACCELERATION = 500
const WASD_MAX_SPEED = 720
const EDITOR_NODE_DOUBLE_CLICK_MS = 420
const activeTouchPoints = new Map()
let pinchState = null
let edgeControlDragState = null

// Responsive layout and mobile viewport helpers
function isTouchLayout() {
  return window.matchMedia('(pointer: coarse), (max-width: 920px)').matches
}

let mobileFieldScrollTimer = null

function updateAtlasViewportHeight() {
  const viewportHeight = window.visualViewport?.height || window.innerHeight

  if (!Number.isFinite(viewportHeight)) return

  document.documentElement.style.setProperty(
    '--atlas-viewport-height',
    `${Math.round(viewportHeight)}px`
  )
}

function keepFocusedEditorFieldVisible(target) {
  if (!isTouchLayout()) return
  if (!(target instanceof HTMLElement)) return

  const isEditorField = target.matches('input, textarea, select, button')

  if (!isEditorField) return

  const openModal = target.closest('.modal-backdrop.open')

  if (!openModal) return

  if (mobileFieldScrollTimer) {
    clearTimeout(mobileFieldScrollTimer)
  }

  mobileFieldScrollTimer = window.setTimeout(() => {
    mobileFieldScrollTimer = null

    if (!target.isConnected) return

    target.scrollIntoView({
      block: 'center',
      inline: 'nearest',
      behavior: 'smooth'
    })
  }, 220)
}

function restoreModalScrollPosition(container, scrollTop) {
  if (!container) return

  requestAnimationFrame(() => {
    container.scrollTop = Math.max(0, Number(scrollTop) || 0)
  })
}

function prefersReducedMotion() {
  return window.matchMedia('(pointer: coarse), (prefers-reduced-motion: reduce)').matches
}

function getCssPx(varName, fallback) {
  const raw = getComputedStyle(document.documentElement).getPropertyValue(varName).trim()
  const value = parseFloat(raw)
  return Number.isFinite(value) ? value : fallback
}

function getNodeMetrics() {
  return {
    width: getCssPx('--node-width', NODE_WIDTH),
    height: getCssPx('--node-height', NODE_HEIGHT)
  }
}

function nodeWidth(node) {
  const value = Number(node?.width)
  return Number.isFinite(value) && value > 0
    ? clamp(value, NODE_MIN_WIDTH, NODE_MAX_WIDTH)
    : getNodeMetrics().width
}

function nodeHeight(node) {
  const value = Number(node?.height)
  return Number.isFinite(value) && value > 0
    ? clamp(value, NODE_MIN_HEIGHT, NODE_MAX_HEIGHT)
    : getNodeMetrics().height
}

function nodeSize(node) {
  return {
    width: nodeWidth(node),
    height: nodeHeight(node)
  }
}

function getTouchDistance(a, b) {
  return Math.hypot(b.x - a.x, b.y - a.y)
}

function getTouchCenter(a, b) {
  return {
    x: (a.x + b.x) / 2,
    y: (a.y + b.y) / 2
  }
}

// Supabase client configuration
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
})

// Default tutorial shown when no project-specific tutorial is stored
const DEFAULT_TUTORIAL_CONTENT = `1. Ce este site-ul

Acest site este un atlas interactiv pentru documentația de programare FTC. Fiecare nod reprezintă un subiect sau un capitol.

2. Cum te miști pe hartă

- drag pe background pentru pan
- scroll pentru zoom
- butoane pentru fit, reset view și centrează selecția

3. Cum funcționează nodurile

- în modul normal, un click sau tap = deschide documentația full-screen
- în Editor Mode, un click = selectează nodul pentru mutare și relații
- în Editor Mode, dublu click = deschide documentația nodului
- în Editor Mode poți muta nodurile prin drag
- roșu = selectat
- mov = neselectat

4. Cum citești documentația completă

Documentația ocupă tot ecranul și o poți închide cu X.

5. Cum creezi și editezi noduri

Trebuie să fii logat ca editor și să activezi Editor Mode. Atunci apar instrumentele pentru creare, editare, ștergere, relații și istoric.

6. Cum funcționează relațiile

- activezi modul relație
- alegi nodul sursă
- alegi nodul destinație
- se deschide direct formularul relației
- după salvare apare muchia în atlas

7. Undo și Redo

Undo și Redo sunt disponibile în Editor Mode și sunt sincronizate în Supabase.

8. Login

Introduci email-ul și apeși pe Trimite magic link. După ce deschizi link-ul din email pe aceeași adresă a site-ului, devii autentificat și poți edita atlasul.

9. Taxonomy Manager

În Editor Mode poți adăuga, redenumi, dezactiva, reordona și șterge categorii, dificultăți și etichete direct din site.

10. Nod cod

În Editor Mode poți atașa exemple Java, Python și alte formate. Vizitatorii pot selecta codul sau îl pot copia cu un singur click.

11. Ce este salvat online

Nodurile, relațiile, categoriile, dificultățile, etichetele, media, fișierele și folderele, snippet-urile de cod și tutorialul sunt în Supabase.`

// Compatibility hook retained for earlier local-cache versions
function saveCachedNodes() {}

// Persisted map view state
function loadView() {
  const saved = localStorage.getItem(CACHE_KEYS.view)

  if (!saved) {
    return { ...DEFAULT_VIEW }
  }

  try {
    const parsed = JSON.parse(saved)

    const x = Number(parsed.x)
    const y = Number(parsed.y)
    const scale = Number(parsed.scale)

    return {
      x: Number.isFinite(x) ? x : DEFAULT_VIEW.x,
      y: Number.isFinite(y) ? y : DEFAULT_VIEW.y,
      scale: Number.isFinite(scale) ? Math.min(Math.max(scale, 0.45), 1.8) : DEFAULT_VIEW.scale
    }
  } catch (error) {
    console.warn('Saved atlas view is invalid:', error)
    return { ...DEFAULT_VIEW }
  }
}

function saveView() {
  localStorage.setItem(CACHE_KEYS.view, JSON.stringify(view))
}

// Runtime application state
let nodes = []
let publicNodes = []
let teamNodes = []
let activeNodeScope = 'public'
let selectedId = nodes[0]?.id ?? null
let selectedEdge = null
let selectedEdgePointIndex = null
let detailOpen = false
let editingId = null
let searchQuery = ''
let categories = []
let difficulties = []
let taxonomyTags = []

let publicCategories = []
let publicDifficulties = []
let publicTaxonomyTags = []

let teamCategories = []
let teamDifficulties = []
let teamTaxonomyTags = []

let departments = []
let activeDepartmentId = null
let announcements = []
let resources = []
let roadmaps = []
let roadmapProgress = new Set()

let teamRoadmaps = []
let teamRoadmapProgress = new Set()

let teamMemberships = []
let teamRecords = []
let teamMembers = []
let teamMemberDepartments = []
let teamEnabledDepartments = []
let teamInvites = []
let teamManagerInvites = []
let activeTeamId = null

const PUBLIC_SECTIONS = new Set([
  'explore',
  'index',
  'roadmaps',
  'resources',
  'announcements',
  'team',
  'team-index',
  'team-roadmaps'
])

let activePublicSection = PUBLIC_SECTIONS.has(
  localStorage.getItem(CACHE_KEYS.publicSection)
)
  ? localStorage.getItem(CACHE_KEYS.publicSection)
  : 'explore'

let tutorialContent = DEFAULT_TUTORIAL_CONTENT
let publicContentManagerKind = 'announcements'
let publicContentEditingId = null
let publicContentMutationBusy = false
let roadmapManagerEditingId = null
let roadmapManagerDraftSteps = []
let roadmapManagerMutationBusy = false
let roadmapManagerScope = 'public'
let roadmapProgressMutationKeys = new Set()
let teamRoadmapProgressMutationKeys = new Set()

let bookmarkRows = []
let bookmarkKeys = new Set()
let finderResultsCache = []
let finderSelectedIndex = 0

let documentationMetaTarget = null
let documentationReferenceEditingId = null
let documentationMetaMutationBusy = false

let qualityLensEnabled =
  localStorage.getItem(CACHE_KEYS.qualityLens) === '1'

let healthIssueFilter = 'attention'
let healthDepartmentFilter = 'all'

let healthStaleDays = [90, 180, 365].includes(
  Number(localStorage.getItem(CACHE_KEYS.healthStaleDays))
)
  ? Number(localStorage.getItem(CACHE_KEYS.healthStaleDays))
  : 180

let publicIndexSort = ['az', 'updated'].includes(
  localStorage.getItem(CACHE_KEYS.publicIndexSort)
)
  ? localStorage.getItem(CACHE_KEYS.publicIndexSort)
  : 'az'

let publicIndexGroup = ['category', 'flat'].includes(
  localStorage.getItem(CACHE_KEYS.publicIndexGroup)
)
  ? localStorage.getItem(CACHE_KEYS.publicIndexGroup)
  : 'category'

let revisionHistoryTarget = null
let revisionHistoryRows = []
let revisionHistorySelectedId = null
let revisionHistoryBusy = false

let sourceCompareNodeId = null
let sourceCompareBusy = false

let layoutEditMode = false
let layoutSaveBusy = false
let layoutNodeDrafts = new Map()
let layoutEdgeDrafts = new Map()
let layoutUndoStack = []
let layoutRedoStack = []
let teamSetupMutationBusy = false
let teamImportSourceNodeId = null
let teamImportMutationBusy = false
let teamSetupCreateMode = false
let teamMembersMutationBusy = false
let teamMemberEditingId = null
let teamOnboardingMutationBusy = false
let categoryFilterId = null
let difficultyFilterId = null
let tagFilterIds = new Set()
let introDismissed = localStorage.getItem(CACHE_KEYS.intro) === '1'
let relationMode = { active: false, sourceId: null }
let modalMode = 'node'
let relationDraft = { sourceId: null, targetId: null, label: '' }
let view = loadView()
let currentUser = null
let canEdit = false

let editorMode = localStorage.getItem(CACHE_KEYS.editorMode) === '1'

let isAtlasLoading = true
let atlasLoadPromise = null
let nodeTagDraft = new Set()

let taxonomyManagerKind = 'category'
let taxonomyItemDraft = null
let taxonomyDeleteDraft = null
let taxonomyMutationBusy = false

let mediaManagerNodeId = null
let mediaMutationBusy = false

let fileManagerNodeId = null
let fileMutationBusy = false

let codeManagerNodeId = null
let codeMutationBusy = false
let codeDraftSaveTimer = null

let edgeClickState = { key: null, time: 0 }
let editorNodeClickState = { nodeId: null, time: 0 }
let panState = null

const keyboardMoveState = {
  keys: new Set(),
  nodeId: null,
  startedAt: 0,
  lastFrameAt: 0,
  frameId: null,
  dirty: false,
  startX: 0,
  startY: 0
}

// WASD movement is intentionally local-only. One dirty node is kept at a time
// and is persisted only with the Save position button or the F shortcut.
let unsavedNodePosition = null
let positionSaveBusy = false

// Frequently used DOM references
const appRoot = document.querySelector('.app')
const atlasNavigation = document.getElementById('atlasNavigation')
const publicSectionTabs = document.getElementById('publicSectionTabs')
const publicHubPanel = document.getElementById('publicHubPanel')
const atlasNavigationEyebrow = document.getElementById('atlasNavigationEyebrow')
const teamNavigationSection = document.getElementById('teamNavigationSection')
const teamNavigationSummary = document.getElementById('teamNavigationSummary')
const teamSpaceEntry = document.getElementById('teamSpaceEntry')
const teamSpaceEntryName = document.getElementById('teamSpaceEntryName')
const teamSpaceEntryRole = document.getElementById('teamSpaceEntryRole')
const teamAtlasContext = document.getElementById('teamAtlasContext')
const teamAtlasSelect = document.getElementById('teamAtlasSelect')
const teamAtlasContextMeta = document.getElementById('teamAtlasContextMeta')
const teamAtlasIndexBtn = document.getElementById('teamAtlasIndexBtn')
const teamAtlasRoadmapsBtn = document.getElementById('teamAtlasRoadmapsBtn')
const teamAtlasTaxonomyBtn = document.getElementById('teamAtlasTaxonomyBtn')
const teamAtlasSettingsBtn = document.getElementById('teamAtlasSettingsBtn')
const teamAtlasMembersBtn = document.getElementById('teamAtlasMembersBtn')

const teamImportBackdrop = document.getElementById('teamImportBackdrop')
const closeTeamImportBtn = document.getElementById('closeTeamImportBtn')
const cancelTeamImportBtn = document.getElementById('cancelTeamImportBtn')
const confirmTeamImportBtn = document.getElementById('confirmTeamImportBtn')
const teamImportSource = document.getElementById('teamImportSource')
const teamImportTeamInput = document.getElementById('teamImportTeamInput')
const teamImportDepartmentInput = document.getElementById('teamImportDepartmentInput')
const teamImportTitleInput = document.getElementById('teamImportTitleInput')
const teamImportCodeInput = document.getElementById('teamImportCodeInput')
const teamImportStatus = document.getElementById('teamImportStatus')

const mapSurface = document.getElementById('mapSurface')
const world = document.getElementById('world')
const nodeLayer = document.getElementById('nodeLayer')
const linkLayer = document.getElementById('linkLayer')
const detailPanel = document.getElementById('detailPanel')
const emptyPanel = document.getElementById('emptyPanel')
const searchInput = document.getElementById('searchInput')
const departmentTabs = document.getElementById('departmentTabs')
const activeDepartmentTitle = document.getElementById('activeDepartmentTitle')
const departmentContext = document.getElementById('departmentContext')
const categoryFilter = document.getElementById('categoryFilter')
const difficultyFilter = document.getElementById('difficultyFilter')
const tagFilterChips = document.getElementById('tagFilterChips')
const clearFiltersBtn = document.getElementById('clearFiltersBtn')
const createBtn = document.getElementById('createBtn')
const editBtn = document.getElementById('editBtn')
const deleteBtn = document.getElementById('deleteBtn')
const relationBtn = document.getElementById('relationBtn')
const editEdgeBtn = document.getElementById('editEdgeBtn')
const deleteEdgeBtn = document.getElementById('deleteEdgeBtn')
const undoBtn = document.getElementById('undoBtn')
const redoBtn = document.getElementById('redoBtn')
const zoomInBtn = document.getElementById('zoomInBtn')
const zoomOutBtn = document.getElementById('zoomOutBtn')
const fitBtn = document.getElementById('fitBtn')
const addEdgePointBtn = document.getElementById('addEdgePointBtn')
const removeEdgePointBtn = document.getElementById('removeEdgePointBtn')
const resetEdgePathBtn = document.getElementById('resetEdgePathBtn')
const tutorialBtn = document.getElementById('tutorialBtn')
const editorModeBtn = document.getElementById('editorModeBtn')
const savePositionBtn = document.getElementById('savePositionBtn')

const layoutEditorBar = document.getElementById('layoutEditorBar')
const layoutEditorModeLabel = document.getElementById('layoutEditorModeLabel')
const layoutEditorStatus = document.getElementById('layoutEditorStatus')
const layoutEditModeBtn = document.getElementById('layoutEditModeBtn')
const layoutUnsavedCount = document.getElementById('layoutUnsavedCount')
const discardLayoutBtn = document.getElementById('discardLayoutBtn')
const saveLayoutBtn = document.getElementById('saveLayoutBtn')

const editorToolsSection = document.getElementById('editorToolsSection')

const taxonomyManagerBtn = document.getElementById('taxonomyManagerBtn')
const publicContentManagerBtn = document.getElementById('publicContentManagerBtn')
const roadmapManagerBtn = document.getElementById('roadmapManagerBtn')
const teamSetupBtn = document.getElementById('teamSetupBtn')

const mediaManagerBtn = document.getElementById('mediaManagerBtn')

const fileManagerBtn = document.getElementById('fileManagerBtn')

const codeManagerBtn = document.getElementById('codeManagerBtn')

const resetViewBtn = document.getElementById('resetViewBtn')
const fitSelectionBtn = document.getElementById('fitSelectionBtn')
const nodeCount = document.getElementById('nodeCount')
const selectedStrip = document.getElementById('selectedStrip')
const modeStrip = document.getElementById('modeStrip')
const toolPanel = document.getElementById('toolPanel')
const toolsHeader = document.getElementById('toolsHeader')
const collapseBtn = document.getElementById('collapseBtn')
const statusSection = document.getElementById('statusSection')
const uiCollapsibles = Array.from(
  document.querySelectorAll('details[data-ui-section]')
)
const accountBtn = document.getElementById('accountBtn')
const accountPanel = document.getElementById('accountPanel')
const teamInvitesPanel = document.getElementById('teamInvitesPanel')
const teamInvitesCount = document.getElementById('teamInvitesCount')
const teamInvitesList = document.getElementById('teamInvitesList')
const authStatusBox = document.getElementById('authStatusBox')
const authEmailInput = document.getElementById('authEmailInput')
const authOtpRow = document.getElementById('authOtpRow')
const authOtpInput = document.getElementById('authOtpInput')
const verifyOtpBtn = document.getElementById('verifyOtpBtn')
const loginBtn = document.getElementById('loginBtn')
const logoutBtn = document.getElementById('logoutBtn')

const quickFinderBtn = document.getElementById('quickFinderBtn')
const savedDocsBtn = document.getElementById('savedDocsBtn')

const documentationFinderBackdrop = document.getElementById(
  'documentationFinderBackdrop'
)
const closeDocumentationFinderBtn = document.getElementById(
  'closeDocumentationFinderBtn'
)
const documentationFinderInput = document.getElementById(
  'documentationFinderInput'
)
const documentationFinderScope = document.getElementById(
  'documentationFinderScope'
)
const documentationFinderSummary = document.getElementById(
  'documentationFinderSummary'
)
const documentationFinderResults = document.getElementById(
  'documentationFinderResults'
)

const documentationLibraryBackdrop = document.getElementById(
  'documentationLibraryBackdrop'
)
const closeDocumentationLibraryBtn = document.getElementById(
  'closeDocumentationLibraryBtn'
)
const closeDocumentationLibraryFooterBtn = document.getElementById(
  'closeDocumentationLibraryFooterBtn'
)
const clearRecentDocsBtn = document.getElementById('clearRecentDocsBtn')
const documentationLibraryBody = document.getElementById(
  'documentationLibraryBody'
)

const sourceCompareBackdrop = document.getElementById(
  'sourceCompareBackdrop'
)
const sourceCompareTitle = document.getElementById(
  'sourceCompareTitle'
)
const closeSourceCompareBtn = document.getElementById(
  'closeSourceCompareBtn'
)
const closeSourceCompareFooterBtn = document.getElementById(
  'closeSourceCompareFooterBtn'
)
const sourceCompareSummary = document.getElementById(
  'sourceCompareSummary'
)
const sourceCompareTable = document.getElementById(
  'sourceCompareTable'
)
const sourceCompareStatus = document.getElementById(
  'sourceCompareStatus'
)
const sourceCompareOpenPublicBtn = document.getElementById(
  'sourceCompareOpenPublicBtn'
)
const sourceCompareMarkBtn = document.getElementById(
  'sourceCompareMarkBtn'
)
const sourceCompareSyncBtn = document.getElementById(
  'sourceCompareSyncBtn'
)

const revisionHistoryBackdrop = document.getElementById(
  'revisionHistoryBackdrop'
)
const revisionHistoryTitle = document.getElementById(
  'revisionHistoryTitle'
)
const closeRevisionHistoryBtn = document.getElementById(
  'closeRevisionHistoryBtn'
)
const closeRevisionHistoryFooterBtn = document.getElementById(
  'closeRevisionHistoryFooterBtn'
)
const revisionHistorySummary = document.getElementById(
  'revisionHistorySummary'
)
const revisionHistoryList = document.getElementById(
  'revisionHistoryList'
)
const revisionHistoryPreview = document.getElementById(
  'revisionHistoryPreview'
)

const documentationHealthBtn = document.getElementById(
  'documentationHealthBtn'
)

const documentationHealthBackdrop = document.getElementById(
  'documentationHealthBackdrop'
)
const documentationHealthTitle = document.getElementById(
  'documentationHealthTitle'
)
const closeDocumentationHealthBtn = document.getElementById(
  'closeDocumentationHealthBtn'
)
const closeDocumentationHealthFooterBtn = document.getElementById(
  'closeDocumentationHealthFooterBtn'
)
const documentationHealthSummary = document.getElementById(
  'documentationHealthSummary'
)
const documentationHealthIssueInput = document.getElementById(
  'documentationHealthIssueInput'
)
const documentationHealthDepartmentInput = document.getElementById(
  'documentationHealthDepartmentInput'
)
const documentationHealthStaleInput = document.getElementById(
  'documentationHealthStaleInput'
)
const documentationQualityLensInput = document.getElementById(
  'documentationQualityLensInput'
)
const documentationHealthStatus = document.getElementById(
  'documentationHealthStatus'
)
const documentationHealthResults = document.getElementById(
  'documentationHealthResults'
)
const copyDocumentationHealthReportBtn = document.getElementById(
  'copyDocumentationHealthReportBtn'
)

const documentationMetaBackdrop = document.getElementById(
  'documentationMetaBackdrop'
)
const documentationMetaTitle = document.getElementById(
  'documentationMetaTitle'
)
const closeDocumentationMetaBtn = document.getElementById(
  'closeDocumentationMetaBtn'
)
const closeDocumentationMetaFooterBtn = document.getElementById(
  'closeDocumentationMetaFooterBtn'
)

const documentationReviewStatusInput = document.getElementById(
  'documentationReviewStatusInput'
)
const documentationReviewNoteInput = document.getElementById(
  'documentationReviewNoteInput'
)
const documentationReviewSummary = document.getElementById(
  'documentationReviewSummary'
)
const clearDocumentationReviewBtn = document.getElementById(
  'clearDocumentationReviewBtn'
)
const saveDocumentationReviewBtn = document.getElementById(
  'saveDocumentationReviewBtn'
)

const documentationReferenceList = document.getElementById(
  'documentationReferenceList'
)
const documentationReferenceTitleInput = document.getElementById(
  'documentationReferenceTitleInput'
)
const documentationReferenceTypeInput = document.getElementById(
  'documentationReferenceTypeInput'
)
const documentationReferenceUrlInput = document.getElementById(
  'documentationReferenceUrlInput'
)
const documentationReferenceNoteInput = document.getElementById(
  'documentationReferenceNoteInput'
)
const documentationReferenceOrderInput = document.getElementById(
  'documentationReferenceOrderInput'
)
const documentationReferencePrimaryInput = document.getElementById(
  'documentationReferencePrimaryInput'
)
const documentationReferenceStatus = document.getElementById(
  'documentationReferenceStatus'
)
const resetDocumentationReferenceBtn = document.getElementById(
  'resetDocumentationReferenceBtn'
)
const saveDocumentationReferenceBtn = document.getElementById(
  'saveDocumentationReferenceBtn'
)

function isNativeAtlasApp() {
  try {
    if (window.atlasDesktop?.isDesktop === true) {
      return true
    }

    if (window.Capacitor?.isNativePlatform?.()) {
      return true
    }

    const platform = window.Capacitor?.getPlatform?.()
    return platform === 'android' || platform === 'ios'
  } catch {
    return false
  }
}

const nativeAtlasApp = isNativeAtlasApp()

function readUICollapseState() {
  try {
    const parsed = JSON.parse(localStorage.getItem(CACHE_KEYS.uiSections) || '{}')
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

let uiCollapseState = readUICollapseState()

function persistUICollapseState() {
  localStorage.setItem(CACHE_KEYS.uiSections, JSON.stringify(uiCollapseState))
}

function initializeUICollapsibles() {
  uiCollapsibles.forEach((section) => {
    const key = section.dataset.uiSection
    if (!key) return

    if (typeof uiCollapseState[key] === 'boolean') {
      section.open = uiCollapseState[key]
    }

    section.addEventListener('toggle', () => {
      uiCollapseState[key] = section.open
      persistUICollapseState()
    })
  })
}

function openUICollapseSection(key) {
  const section = uiCollapsibles.find(
    (item) => item.dataset.uiSection === key
  )

  if (!section || section.open) return
  section.open = true
}

initializeUICollapsibles()

if (authOtpRow) {
  authOtpRow.hidden = !nativeAtlasApp
}

const modalBackdrop = document.getElementById('modalBackdrop')
const modalTitle = document.getElementById('modalTitle')
const modalSubtitle = document.getElementById('modalSubtitle')
const titleInput = document.getElementById('titleInput')
const categoryInput = document.getElementById('categoryInput')
const difficultyInput = document.getElementById('difficultyInput')
const nodeTagPicker = document.getElementById('nodeTagPicker')
const teamNodeDepartmentField = document.getElementById('teamNodeDepartmentField')
const teamNodeDepartmentInput = document.getElementById('teamNodeDepartmentInput')
const nodeTagsField = document.getElementById('nodeTagsField')
const contentInput = document.getElementById('contentInput')
const contentInputLabel = document.getElementById('contentInputLabel')
const richEditorShell = document.getElementById('richEditorShell')
const richEditorToolbar = document.getElementById('richEditorToolbar')
const richBlockSelect = document.getElementById('richBlockSelect')
const richFontSizeSelect = document.getElementById('richFontSizeSelect')
const richLinkBtn = document.getElementById('richLinkBtn')
const contentRichEditor = document.getElementById('contentRichEditor')
const richEditorHint = document.getElementById('richEditorHint')
const relationSummary = document.getElementById('relationSummary')
const relationLabelInput = document.getElementById('relationLabelInput')
const nodeFields = document.getElementById('nodeFields')
const nodeContentField = document.getElementById('nodeContentField')
const relationTargetField = document.getElementById('relationTargetField')
const relationLabelField = document.getElementById('relationLabelField')
const closeModalBtn = document.getElementById('closeModalBtn')
const cancelBtn = document.getElementById('cancelBtn')
const saveBtn = document.getElementById('saveBtn')

const introScreen = document.getElementById('introScreen')
const enterBtn = document.getElementById('enterBtn')

const atlasStatusOverlay = document.getElementById('atlasStatusOverlay')

const atlasLoader = document.getElementById('atlasLoader')

const atlasStatusKicker = document.getElementById('atlasStatusKicker')

const atlasStatusTitle = document.getElementById('atlasStatusTitle')

const atlasStatusMessage = document.getElementById('atlasStatusMessage')

const retryLoadBtn = document.getElementById('retryLoadBtn')

const networkStatusPill = document.getElementById('networkStatusPill')

const mediaManagerBackdrop = document.getElementById('mediaManagerBackdrop')

const closeMediaManagerBtn = document.getElementById('closeMediaManagerBtn')

const mediaManagerTitle = document.getElementById('mediaManagerTitle')

const mediaManagerSummary = document.getElementById('mediaManagerSummary')

const mediaFileInput = document.getElementById('mediaFileInput')

const mediaUploadTitleInput = document.getElementById('mediaUploadTitleInput')

const mediaUploadCaptionInput = document.getElementById('mediaUploadCaptionInput')

const uploadMediaBtn = document.getElementById('uploadMediaBtn')

const mediaUploadStatus = document.getElementById('mediaUploadStatus')

const mediaExternalUrlInput = document.getElementById('mediaExternalUrlInput')

const mediaExternalTitleInput = document.getElementById('mediaExternalTitleInput')

const mediaExternalCaptionInput = document.getElementById('mediaExternalCaptionInput')

const addExternalMediaBtn = document.getElementById('addExternalMediaBtn')

const mediaManagerList = document.getElementById('mediaManagerList')

const closeMediaManagerFooterBtn = document.getElementById('closeMediaManagerFooterBtn')

const fileManagerBackdrop = document.getElementById('fileManagerBackdrop')
const closeFileManagerBtn = document.getElementById('closeFileManagerBtn')
const closeFileManagerFooterBtn = document.getElementById('closeFileManagerFooterBtn')
const fileManagerTitle = document.getElementById('fileManagerTitle')
const fileManagerSummary = document.getElementById('fileManagerSummary')
const nodeFilesInput = document.getElementById('nodeFilesInput')
const nodeFolderInput = document.getElementById('nodeFolderInput')
const uploadNodeFilesBtn = document.getElementById('uploadNodeFilesBtn')
const uploadNodeFolderBtn = document.getElementById('uploadNodeFolderBtn')
const fileManagerStatus = document.getElementById('fileManagerStatus')
const fileManagerList = document.getElementById('fileManagerList')

const codeManagerBackdrop = document.getElementById('codeManagerBackdrop')

const closeCodeManagerBtn = document.getElementById('closeCodeManagerBtn')

const closeCodeManagerFooterBtn = document.getElementById('closeCodeManagerFooterBtn')

const codeManagerTitle = document.getElementById('codeManagerTitle')

const codeManagerSummary = document.getElementById('codeManagerSummary')

const codeCreateTitleInput = document.getElementById('codeCreateTitleInput')

const codeCreateLanguageInput = document.getElementById('codeCreateLanguageInput')

const codeCreateDescriptionInput = document.getElementById('codeCreateDescriptionInput')

const codeCreateCodeInput = document.getElementById('codeCreateCodeInput')

const addCodeSnippetBtn = document.getElementById('addCodeSnippetBtn')

const codeManagerStatus = document.getElementById('codeManagerStatus')

const codeManagerList = document.getElementById('codeManagerList')

const taxonomyManagerBackdrop = document.getElementById('taxonomyManagerBackdrop')

const closeTaxonomyManagerBtn = document.getElementById('closeTaxonomyManagerBtn')

const taxonomyAddBtn = document.getElementById('taxonomyAddBtn')

const taxonomyManagerSummary = document.getElementById('taxonomyManagerSummary')

const taxonomyManagerList = document.getElementById('taxonomyManagerList')

const taxonomyItemBackdrop = document.getElementById('taxonomyItemBackdrop')

const taxonomyItemTitle = document.getElementById('taxonomyItemTitle')

const taxonomyItemSubtitle = document.getElementById('taxonomyItemSubtitle')

const closeTaxonomyItemBtn = document.getElementById('closeTaxonomyItemBtn')

const taxonomyNameInput = document.getElementById('taxonomyNameInput')

const taxonomyOrderInput = document.getElementById('taxonomyOrderInput')

const taxonomyDescriptionInput = document.getElementById('taxonomyDescriptionInput')

const taxonomyActiveInput = document.getElementById('taxonomyActiveInput')

const taxonomyDeleteNote = document.getElementById('taxonomyDeleteNote')

const taxonomyDeleteBtn = document.getElementById('taxonomyDeleteBtn')

const cancelTaxonomyItemBtn = document.getElementById('cancelTaxonomyItemBtn')

const saveTaxonomyItemBtn = document.getElementById('saveTaxonomyItemBtn')

const taxonomyReplaceBackdrop = document.getElementById('taxonomyReplaceBackdrop')

const taxonomyReplaceTitle = document.getElementById('taxonomyReplaceTitle')

const taxonomyReplaceMessage = document.getElementById('taxonomyReplaceMessage')

const taxonomyReplacementSelect = document.getElementById('taxonomyReplacementSelect')

const closeTaxonomyReplaceBtn = document.getElementById('closeTaxonomyReplaceBtn')

const cancelTaxonomyReplaceBtn = document.getElementById('cancelTaxonomyReplaceBtn')

const confirmTaxonomyReplaceBtn = document.getElementById('confirmTaxonomyReplaceBtn')

const publicContentManagerBackdrop = document.getElementById('publicContentManagerBackdrop')
const closePublicContentManagerBtn = document.getElementById('closePublicContentManagerBtn')
const closePublicContentManagerFooterBtn = document.getElementById('closePublicContentManagerFooterBtn')
const publicContentManagerSummary = document.getElementById('publicContentManagerSummary')
const publicContentManagerList = document.getElementById('publicContentManagerList')
const newPublicContentBtn = document.getElementById('newPublicContentBtn')
const publicContentEditorTitle = document.getElementById('publicContentEditorTitle')
const publicContentEditorHint = document.getElementById('publicContentEditorHint')
const announcementEditorFields = document.getElementById('announcementEditorFields')
const resourceEditorFields = document.getElementById('resourceEditorFields')
const publicContentEditorStatus = document.getElementById('publicContentEditorStatus')
const deletePublicContentBtn = document.getElementById('deletePublicContentBtn')
const resetPublicContentEditorBtn = document.getElementById('resetPublicContentEditorBtn')
const savePublicContentBtn = document.getElementById('savePublicContentBtn')

const announcementTitleInput = document.getElementById('announcementTitleInput')
const announcementCategoryInput = document.getElementById('announcementCategoryInput')
const announcementSummaryInput = document.getElementById('announcementSummaryInput')
const announcementContentInput = document.getElementById('announcementContentInput')
const announcementSourceUrlInput = document.getElementById('announcementSourceUrlInput')
const announcementRelatedNodeInput = document.getElementById('announcementRelatedNodeInput')
const announcementPublishedAtInput = document.getElementById('announcementPublishedAtInput')
const announcementPublishedInput = document.getElementById('announcementPublishedInput')
const announcementPinnedInput = document.getElementById('announcementPinnedInput')
const announcementImportantInput = document.getElementById('announcementImportantInput')

const resourceTitleInput = document.getElementById('resourceTitleInput')
const resourceTypeInput = document.getElementById('resourceTypeInput')
const resourceSourceInput = document.getElementById('resourceSourceInput')
const resourceUrlInput = document.getElementById('resourceUrlInput')
const resourceDescriptionInput = document.getElementById('resourceDescriptionInput')
const resourceRelatedNodeInput = document.getElementById('resourceRelatedNodeInput')
const resourceSortOrderInput = document.getElementById('resourceSortOrderInput')
const resourceDepartmentPicker = document.getElementById('resourceDepartmentPicker')
const resourceActiveInput = document.getElementById('resourceActiveInput')
const resourceFeaturedInput = document.getElementById('resourceFeaturedInput')

const roadmapManagerBackdrop = document.getElementById('roadmapManagerBackdrop')
const closeRoadmapManagerBtn = document.getElementById('closeRoadmapManagerBtn')
const closeRoadmapManagerFooterBtn = document.getElementById('closeRoadmapManagerFooterBtn')
const newRoadmapBtn = document.getElementById('newRoadmapBtn')
const roadmapManagerSummary = document.getElementById('roadmapManagerSummary')
const roadmapManagerScopeLabel = document.getElementById('roadmapManagerScopeLabel')
const roadmapManagerList = document.getElementById('roadmapManagerList')
const roadmapEditorTitle = document.getElementById('roadmapEditorTitle')
const roadmapEditorHint = document.getElementById('roadmapEditorHint')
const roadmapTitleInput = document.getElementById('roadmapTitleInput')
const roadmapDepartmentInput = document.getElementById('roadmapDepartmentInput')
const roadmapDescriptionInput = document.getElementById('roadmapDescriptionInput')
const roadmapSortOrderInput = document.getElementById('roadmapSortOrderInput')
const roadmapActiveInput = document.getElementById('roadmapActiveInput')
const roadmapStepNodeInput = document.getElementById('roadmapStepNodeInput')
const roadmapStepNoteInput = document.getElementById('roadmapStepNoteInput')
const roadmapStepOptionalInput = document.getElementById('roadmapStepOptionalInput')
const addRoadmapStepBtn = document.getElementById('addRoadmapStepBtn')
const roadmapEditorSteps = document.getElementById('roadmapEditorSteps')
const roadmapEditorStatus = document.getElementById('roadmapEditorStatus')
const deleteRoadmapBtn = document.getElementById('deleteRoadmapBtn')
const resetRoadmapEditorBtn = document.getElementById('resetRoadmapEditorBtn')
const saveRoadmapBtn = document.getElementById('saveRoadmapBtn')

const teamSetupBackdrop = document.getElementById('teamSetupBackdrop')
const closeTeamSetupBtn = document.getElementById('closeTeamSetupBtn')
const closeTeamSetupFooterBtn = document.getElementById('closeTeamSetupFooterBtn')
const teamSetupCurrent = document.getElementById('teamSetupCurrent')
const teamNameInput = document.getElementById('teamNameInput')
const teamNumberInput = document.getElementById('teamNumberInput')
const teamDescriptionInput = document.getElementById('teamDescriptionInput')
const teamDisplayNameInput = document.getElementById('teamDisplayNameInput')
const teamSetupDepartmentPicker = document.getElementById('teamSetupDepartmentPicker')
const teamSetupStatus = document.getElementById('teamSetupStatus')
const newTeamSetupBtn = document.getElementById('newTeamSetupBtn')
const saveTeamSetupBtn = document.getElementById('saveTeamSetupBtn')

const teamMembersBackdrop = document.getElementById('teamMembersBackdrop')
const closeTeamMembersBtn = document.getElementById('closeTeamMembersBtn')
const closeTeamMembersFooterBtn = document.getElementById('closeTeamMembersFooterBtn')
const teamMembersSummary = document.getElementById('teamMembersSummary')
const teamMembersManagerList = document.getElementById('teamMembersManagerList')
const teamPendingInvitesList = document.getElementById('teamPendingInvitesList')
const teamInviteEditorFields = document.getElementById('teamInviteEditorFields')
const teamMemberEditorFields = document.getElementById('teamMemberEditorFields')
const teamMemberEditorTitle = document.getElementById('teamMemberEditorTitle')
const teamMemberEditorHint = document.getElementById('teamMemberEditorHint')
const teamInviteEmailInput = document.getElementById('teamInviteEmailInput')
const teamInviteDisplayNameInput = document.getElementById('teamInviteDisplayNameInput')
const teamInviteRoleInput = document.getElementById('teamInviteRoleInput')
const teamInviteDepartmentPicker = document.getElementById('teamInviteDepartmentPicker')
const teamMemberEditorCurrent = document.getElementById('teamMemberEditorCurrent')
const teamMemberRoleInput = document.getElementById('teamMemberRoleInput')
const teamMemberDepartmentPicker = document.getElementById('teamMemberDepartmentPicker')
const teamMemberActiveInput = document.getElementById('teamMemberActiveInput')
const teamMembersManagerStatus = document.getElementById('teamMembersManagerStatus')
const resetTeamMemberEditorBtn = document.getElementById('resetTeamMemberEditorBtn')
const saveTeamMemberBtn = document.getElementById('saveTeamMemberBtn')

const teamOnboardingBackdrop = document.getElementById('teamOnboardingBackdrop')
const closeTeamOnboardingBtn = document.getElementById('closeTeamOnboardingBtn')
const closeTeamOnboardingFooterBtn = document.getElementById('closeTeamOnboardingFooterBtn')
const teamOnboardingContent = document.getElementById('teamOnboardingContent')
const teamOnboardingStatus = document.getElementById('teamOnboardingStatus')
const completeTeamOnboardingBtn = document.getElementById('completeTeamOnboardingBtn')

// Node and relationship selection helpers
function selectedNode() {
  return nodes.find((node) => String(node.id) === String(selectedId)) || null
}

function findNode(id) {
  return nodes.find((node) => String(node.id) === String(id)) || null
}

// SEO-friendly node routes. The numeric id is the stable identifier; the slug
// is human-readable and may change when a node is renamed without breaking old links.
function slugifyNodeTitle(value) {
  const slug = String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 90)

  return slug || 'topic'
}

function nodeRoutePath(node) {
  if (!node) return HOME_PATH

  if (node.isTeamNode) {
    return `${HOME_PATH}#team-${Number(node.teamId)}-node-${Number(node.id)}`
  }

  return `/node/${Number(node.id)}/${slugifyNodeTitle(node.title)}`
}

function nodeCanonicalUrl(node) {
  return `${SITE_ORIGIN}${nodeRoutePath(node)}`
}

function routeNodeIdFromLocation() {
  const match = window.location.pathname.match(/^\/node\/(\d+)(?:\/[^/?#]*)?\/?$/)
  return match ? Number(match[1]) : null
}

function teamNodeRouteFromLocation() {
  const match = window.location.hash.match(
    /^#team-(\d+)-node-(\d+)$/
  )

  if (!match) return null

  return {
    teamId: Number(match[1]),
    nodeId: Number(match[2])
  }
}

function rememberPendingTeamRoute(hash = window.location.hash) {
  if (!/^#team-\d+-node-\d+$/.test(String(hash || ''))) return

  localStorage.setItem(
    CACHE_KEYS.pendingTeamRoute,
    JSON.stringify({
      hash,
      savedAt: Date.now()
    })
  )
}

function pendingTeamRouteHash() {
  const raw = localStorage.getItem(CACHE_KEYS.pendingTeamRoute)
  if (!raw) return null

  try {
    const parsed = JSON.parse(raw)
    const age = Date.now() - Number(parsed?.savedAt || 0)
    const hash = String(parsed?.hash || '')

    if (
      !/^#team-\d+-node-\d+$/.test(hash) ||
      !Number.isFinite(age) ||
      age > 24 * 60 * 60 * 1000
    ) {
      localStorage.removeItem(CACHE_KEYS.pendingTeamRoute)
      return null
    }

    return hash
  } catch {
    localStorage.removeItem(CACHE_KEYS.pendingTeamRoute)
    return null
  }
}

function restorePendingTeamRouteIfNeeded() {
  if (!currentUser) return false
  if (teamNodeRouteFromLocation()) return false
  if (window.location.pathname !== HOME_PATH) return false

  const hash = pendingTeamRouteHash()
  if (!hash) return false

  window.history.replaceState(
    { atlasRoute: 'pending-team-node' },
    '',
    `${HOME_PATH}${hash}`
  )

  return true
}

function setHeadContent(selector, value) {
  const element = document.querySelector(selector)
  if (element) element.setAttribute('content', value)
}

function setCanonicalUrl(url) {
  const canonical = document.querySelector('link[rel="canonical"]')
  if (canonical) canonical.setAttribute('href', url)
}

function nodeSeoDescription(node) {
  const plain = nodeContentPlainText(node).replace(/\s+/g, ' ').trim()
  if (!plain) {
    return `Documentație FTC despre ${node.title} în FTC Programming Atlas.`
  }

  const prefix = `${node.title} — `
  const maxLength = 158
  const available = Math.max(40, maxLength - prefix.length)
  const excerpt = plain.length > available ? `${plain.slice(0, available - 1).trimEnd()}…` : plain
  return `${prefix}${excerpt}`
}

function updateDocumentSeo(node = null) {
  const isNode = Boolean(node)
  const title = isNode ? `${node.title} | FTC Programming Atlas` : HOME_TITLE
  const description = isNode ? nodeSeoDescription(node) : HOME_DESCRIPTION
  const canonicalUrl = isNode ? nodeCanonicalUrl(node) : SITE_ORIGIN + HOME_PATH

  document.title = title
  setHeadContent('meta[name="description"]', description)
  setCanonicalUrl(canonicalUrl)
  setHeadContent('meta[property="og:type"]', isNode ? 'article' : 'website')
  setHeadContent('meta[property="og:title"]', title)
  setHeadContent('meta[property="og:description"]', description)
  setHeadContent('meta[property="og:url"]', canonicalUrl)
  setHeadContent('meta[name="twitter:title"]', title)
  setHeadContent('meta[name="twitter:description"]', description)
}

function replaceRouteState(path, state) {
  window.history.replaceState(state, '', path)
}

function pushRouteState(path, state) {
  const currentRoute = `${window.location.pathname}${window.location.hash}`

  if (currentRoute === path) {
    replaceRouteState(path, state)
    return
  }

  window.history.pushState(state, '', path)
}

function setNodeRoute(node, { push = true } = {}) {
  if (!node) return

  rememberRecentNode(node)

  const path = nodeRoutePath(node)

  if (node.isTeamNode) {
    const state = {
      atlasRoute: 'team-node',
      teamId: Number(node.teamId),
      nodeId: Number(node.id)
    }

    if (push) pushRouteState(path, state)
    else replaceRouteState(path, state)

    const team = currentTeamRecord()
    document.title = `${node.title} | ${team?.name || 'Team Atlas'} | FTC Programming Atlas`
    return
  }

  const state = { atlasRoute: 'node', nodeId: Number(node.id) }

  if (push) pushRouteState(path, state)
  else replaceRouteState(path, state)

  updateDocumentSeo(node)
}

function setHomeRoute({ push = true } = {}) {
  const state = { atlasRoute: 'home' }

  if (push) pushRouteState(HOME_PATH, state)
  else replaceRouteState(HOME_PATH, state)

  updateDocumentSeo(null)
}

function clearFiltersForDeepLink() {
  searchQuery = ''
  categoryFilterId = null
  difficultyFilterId = null
  tagFilterIds = new Set()

  if (searchInput) searchInput.value = ''
}

async function applyRouteFromLocation({ canonicalize = true } = {}) {
  restorePendingTeamRouteIfNeeded()

  const teamRoute = teamNodeRouteFromLocation()

  if (teamRoute) {
    rememberPendingTeamRoute(window.location.hash)

    if (!currentUser) {
      detailOpen = false
      activePublicSection = 'explore'
      syncActiveNodeCollection({ forceReset: true })
      setAccountPanel(true)
      updateDocumentSeo(null)
      return null
    }

    const targetTeam = teamRecords.find(
      (team) => Number(team.id) === Number(teamRoute.teamId)
    )

    const targetMembership = membershipForTeam(teamRoute.teamId)
    const canOpenTargetTeam = Boolean(
      targetTeam && (targetMembership || canEdit)
    )

    if (!canOpenTargetTeam) {
      localStorage.removeItem(CACHE_KEYS.pendingTeamRoute)
      detailOpen = false
      setHomeRoute({ push: false })
      alert('Nu ai acces la Team Atlas-ul din acest link.')
      return null
    }

    activeTeamId = Number(teamRoute.teamId)
    localStorage.setItem(CACHE_KEYS.activeTeam, String(activeTeamId))

    activePublicSection = 'team'
    localStorage.setItem(CACHE_KEYS.publicSection, activePublicSection)

    await loadActiveTeamAtlasNodes({ forceReset: true })
    syncActiveNodeCollection()

    const node = teamNodes.find(
      (candidate) => Number(candidate.id) === Number(teamRoute.nodeId)
    )

    if (!node) {
      localStorage.removeItem(CACHE_KEYS.pendingTeamRoute)
      detailOpen = false
      renderAll()
      alert('Nodul Team Atlas din acest link nu mai este disponibil.')
      return null
    }

    activateDepartmentForNode(node, { persist: false })
    clearFiltersForDeepLink()
    selectedId = node.id
    clearEdgeSelection()
    detailOpen = true
    localStorage.removeItem(CACHE_KEYS.pendingTeamRoute)

    if (canonicalize) {
      setNodeRoute(node, { push: false })
    }

    return node
  }

  const nodeId = routeNodeIdFromLocation()

  if (nodeId == null) {
    detailOpen = false
    updateDocumentSeo(null)
    return null
  }

  activePublicSection = 'explore'
  localStorage.setItem(CACHE_KEYS.publicSection, activePublicSection)
  syncActiveNodeCollection({ forceReset: true })

  const node = publicNodes.find(
    (candidate) => Number(candidate.id) === Number(nodeId)
  )

  if (!node) {
    detailOpen = false
    setHomeRoute({ push: false })
    return null
  }

  activateDepartmentForNode(node, { persist: false })
  clearFiltersForDeepLink()
  selectedId = node.id
  clearEdgeSelection()
  detailOpen = true

  if (canonicalize) {
    setNodeRoute(node, { push: false })
  } else {
    updateDocumentSeo(node)
  }

  return node
}

function openNodeDetail(nodeId, { pushHistory = true } = {}) {
  const node = findNode(nodeId)
  if (!node) return false

  selectedId = node.id
  clearEdgeSelection()
  detailOpen = true
  setNodeRoute(node, { push: pushHistory })
  renderAll()
  return true
}

function closeNodeDetail({ pushHistory = true } = {}) {
  detailOpen = false
  setHomeRoute({ push: pushHistory })
  renderAll()
}

function getEdgeInfo(sourceId, targetId) {
  const source = findNode(sourceId)
  if (!source) return null
  const index = source.links.findIndex((link) => Number(link.targetId) === Number(targetId))
  if (index === -1) return null
  return {
    source,
    index,
    link: source.links[index]
  }
}

// Supports both the current multi-point format and legacy single-point columns
function normalizeEdgeControlPoints(value, legacyX = null, legacyY = null) {
  let points = value

  if (typeof points === 'string') {
    try {
      points = JSON.parse(points)
    } catch {
      points = []
    }
  }

  const normalized = Array.isArray(points)
    ? points
        .map((point) => ({
          x: Number(point?.x),
          y: Number(point?.y)
        }))
        .filter((point) => Number.isFinite(point.x) && Number.isFinite(point.y))
        .slice(0, MAX_EDGE_CONTROL_POINTS)
        .map((point) => ({
          x: clamp(point.x, 0, WORLD_WIDTH),
          y: clamp(point.y, 0, WORLD_HEIGHT)
        }))
    : []

  if (normalized.length > 0) {
    return normalized
  }

  const x = Number(legacyX)
  const y = Number(legacyY)

  if (Number.isFinite(x) && Number.isFinite(y)) {
    return [
      {
        x: clamp(x, 0, WORLD_WIDTH),
        y: clamp(y, 0, WORLD_HEIGHT)
      }
    ]
  }

  return []
}

function selectedEdgeInfo() {
  if (!selectedEdge) return null

  return getEdgeInfo(selectedEdge.sourceId, selectedEdge.targetId)
}

function isEdgeSelected(sourceId, targetId) {
  return !!(
    selectedEdge &&
    Number(selectedEdge.sourceId) === Number(sourceId) &&
    Number(selectedEdge.targetId) === Number(targetId)
  )
}

function clearEdgeSelection() {
  selectedEdge = null
  selectedEdgePointIndex = null
}

function handleNodeTap(nodeId) {
  ;(async () => {
    const numericNodeId = Number(nodeId)

    if (!(await confirmUnsavedPositionBeforeLeaving(numericNodeId))) return

    selectedId = numericNodeId
    clearEdgeSelection()

    // Relation mode keeps single-click behavior: the click is an editor action,
    // not an attempt to open the node documentation.
    if (relationMode.active) {
      editorNodeClickState = { nodeId: null, time: 0 }
      handleRelationNodeClick(numericNodeId)
      return
    }

    // In Editor Mode a single click is reserved strictly for selection/movement.
    // We detect the second click ourselves instead of relying on the native
    // dblclick event because renderAll() rebuilds the node DOM after selection.
    const tappedNode = findNode(numericNodeId)

    if (canEditNode(tappedNode) && editorMode && layoutEditMode) {
      const now = performance.now()
      const isDoubleClick =
        Number(editorNodeClickState.nodeId) === numericNodeId &&
        now - editorNodeClickState.time <= EDITOR_NODE_DOUBLE_CLICK_MS

      if (isDoubleClick) {
        editorNodeClickState = { nodeId: null, time: 0 }
        openNodeDetail(numericNodeId, { pushHistory: true })
        return
      }

      editorNodeClickState = { nodeId: numericNodeId, time: now }
      detailOpen = false
      updateDocumentSeo(null)
      renderAll()
      return
    }

    editorNodeClickState = { nodeId: null, time: 0 }
    openNodeDetail(numericNodeId, { pushHistory: true })
  })().catch((error) => {
    console.error('Node selection failed:', error)
    alert(error.message || 'Nodul nu a putut fi selectat.')
  })
}

function selectEdge(sourceId, targetId) {
  ;(async () => {
    if (!(await confirmUnsavedPositionBeforeLeaving(sourceId))) return

    console.log('selectEdge', { sourceId, targetId })
    selectedEdge = { sourceId: Number(sourceId), targetId: Number(targetId) }
    selectedEdgePointIndex = null
    selectedId = Number(sourceId)
    detailOpen = false
    renderAll()
  })().catch((error) => {
    console.error('Edge selection failed:', error)
    alert(error.message || 'Muchia nu a putut fi selectată.')
  })
}

function openSelectedEdgeEdit() {
  console.log('openSelectedEdgeEdit', { selectedEdge })

  if (!selectedEdge) {
    alert('Selectează mai întâi o muchie.')
    return
  }

  const info = getEdgeInfo(selectedEdge.sourceId, selectedEdge.targetId)
  console.log('edge info', info)

  if (!info) {
    alert('Muchia selectată nu mai există.')
    return
  }

  openRelationEdit(info.source.id, info.index)
}

async function deleteSelectedEdge() {
  if (!selectedEdge) {
    alert('Selectează mai întâi o muchie.')
    return
  }

  const info = getEdgeInfo(selectedEdge.sourceId, selectedEdge.targetId)
  if (!info) {
    alert('Muchia selectată nu mai există.')
    return
  }

  const target = findNode(info.link.targetId)
  const ok = confirm(
    `Sigur vrei să ștergi muchia "${info.source.title} → ${target?.title || 'nod'}"?`
  )
  if (!ok) return

  await removeRelation(info.source.id, info.index)
  selectedEdge = null
  selectedEdgePointIndex = null
  renderAll()
}

// Taxonomy lookup, filtering and search
function slugTag(tag) {
  return String(tag || 'general')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function getCategoryById(id) {
  return categories.find((item) => Number(item.id) === Number(id)) || null
}

function getDifficultyById(id) {
  return difficulties.find((item) => Number(item.id) === Number(id)) || null
}

function getTagById(id) {
  return taxonomyTags.find((item) => Number(item.id) === Number(id)) || null
}




function announcementCategoryLabel(category) {
  const labels = {
    ftc: 'FTC',
    'game-manual': 'Game Manual',
    season: 'Season',
    events: 'Events',
    resources: 'Resources',
    platform: 'Platform'
  }

  return labels[category] || 'FTC'
}

function formatPublicDate(value) {
  if (!value) return ''

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''

  const language = document.documentElement.lang === 'en' ? 'en-GB' : 'ro-RO'

  return new Intl.DateTimeFormat(language, {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  }).format(date)
}

function toDatetimeLocalValue(value = new Date()) {
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return ''

  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
  return local.toISOString().slice(0, 16)
}

function selectedResourceDepartmentIds() {
  if (!resourceDepartmentPicker) return []

  return [...resourceDepartmentPicker.querySelectorAll('input[type="checkbox"]:checked')]
    .map((input) => Number(input.value))
    .filter(Number.isFinite)
}

function resourceMatchesDepartment(resource, departmentId = activeDepartmentId) {
  const ids = Array.isArray(resource?.departmentIds)
    ? resource.departmentIds.map(Number)
    : []

  if (ids.length === 0) return true
  if (departmentId == null) return true

  return ids.includes(Number(departmentId))
}

function publishedAnnouncements() {
  const now = Date.now()

  return announcements
    .filter((item) => {
      if (item.isPublished === false) return false

      const publishedAt = new Date(item.publishedAt || item.createdAt || 0).getTime()
      return !Number.isFinite(publishedAt) || publishedAt <= now
    })
    .sort((a, b) => {
      if (Boolean(a.isPinned) !== Boolean(b.isPinned)) return a.isPinned ? -1 : 1
      if (Boolean(a.isImportant) !== Boolean(b.isImportant)) return a.isImportant ? -1 : 1

      return (
        new Date(b.publishedAt || b.createdAt || 0).getTime() -
        new Date(a.publishedAt || a.createdAt || 0).getTime()
      )
    })
}

function visibleResources() {
  return resources
    .filter((item) => item.isActive !== false && resourceMatchesDepartment(item))
    .sort((a, b) => {
      if (Boolean(a.isFeatured) !== Boolean(b.isFeatured)) return a.isFeatured ? -1 : 1

      const orderDifference = Number(a.sortOrder || 0) - Number(b.sortOrder || 0)
      if (orderDifference !== 0) return orderDifference

      return String(a.title || '').localeCompare(String(b.title || ''), 'ro', {
        sensitivity: 'base'
      })
    })
}

function publicManagerButton(kind) {
  if (!(canEdit && editorMode)) return ''

  return `
    <div class="public-hub-actions">
      <button
        class="public-hub-manage"
        type="button"
        data-open-public-content-manager="${escapeHtmlText(kind)}"
      >
        Manage ${kind === 'resources' ? 'resources' : 'announcements'}
      </button>
    </div>
  `
}

function renderAnnouncementCards() {
  const items = publishedAnnouncements()

  if (items.length === 0) {
    return `
      <div class="public-content-list">
        <article class="public-hub-card wide">
          <span class="public-hub-card-label">Latest announcements</span>
          <h3>Niciun anunț publicat momentan.</h3>
          <p>
            Anunțurile scrise de administratorii Atlasului vor apărea aici și vor rămâne disponibile pentru consultare.
          </p>
        </article>
      </div>
    `
  }

  return `
    <div class="public-content-list">
      ${items
        .map((item) => {
          const sourceUrl = normalizeHttpUrl(item.sourceUrl)
          const relatedNode = item.relatedNodeId ? findNode(item.relatedNodeId) : null

          return `
            <article class="announcement-card ${item.isImportant ? 'important' : ''} ${item.isPinned ? 'pinned' : ''}">
              <div class="public-content-card-top">
                <div class="public-content-card-main">
                  <div class="public-content-card-labels">
                    <span class="public-content-badge accent">${escapeHtmlText(
                      announcementCategoryLabel(item.category)
                    )}</span>
                    ${item.isPinned ? '<span class="public-content-badge">Pinned</span>' : ''}
                    ${item.isImportant ? '<span class="public-content-badge important">Important</span>' : ''}
                  </div>

                  <h2 class="public-content-card-title" data-atlas-i18n-entity="announcement" data-atlas-i18n-id="${Number(item.id)}" data-atlas-i18n-field="title">${escapeHtmlText(item.title)}</h2>
                </div>

                <time class="public-content-card-date">${escapeHtmlText(
                  formatPublicDate(item.publishedAt || item.createdAt)
                )}</time>
              </div>

              ${
                item.summary
                  ? `<p class="public-content-card-summary" data-atlas-i18n-entity="announcement" data-atlas-i18n-id="${Number(item.id)}" data-atlas-i18n-field="summary">${escapeHtml(item.summary)}</p>`
                  : ''
              }

              ${
                item.content
                  ? `<p class="public-content-card-body" data-atlas-i18n-entity="announcement" data-atlas-i18n-id="${Number(item.id)}" data-atlas-i18n-field="content">${escapeHtml(item.content)}</p>`
                  : ''
              }

              ${
                sourceUrl || relatedNode
                  ? `
                    <div class="public-content-card-footer">
                      ${
                        sourceUrl
                          ? `<a class="public-content-link" href="${escapeHtmlText(
                              sourceUrl
                            )}" target="_blank" rel="noopener noreferrer">Deschide sursa</a>`
                          : ''
                      }

                      ${
                        relatedNode
                          ? `
                            <button
                              class="public-content-node-link"
                              type="button"
                              data-public-node-id="${Number(relatedNode.id)}"
                            >
                              Deschide nodul: ${escapeHtmlText(relatedNode.title)}
                            </button>
                          `
                          : ''
                      }
                    </div>
                  `
                  : ''
              }
            </article>
          `
        })
        .join('')}
    </div>
  `
}

function renderResourceCards() {
  const items = visibleResources()

  if (items.length === 0) {
    return `
      <div class="resource-grid">
        <article class="public-hub-card wide">
          <span class="public-hub-card-label">Useful Resources</span>
          <h3>Nicio resursă publicată momentan.</h3>
          <p>Lista va fi organizată pe departamente și topicuri.</p>
        </article>
      </div>
    `
  }

  return `
    <div class="resource-grid">
      ${items
        .map((item) => {
          const url = normalizeHttpUrl(item.url)
          const relatedNode = item.relatedNodeId ? findNode(item.relatedNodeId) : null
          const departmentNames = (item.departmentIds || [])
            .map((id) => getDepartmentById(id)?.short_name || getDepartmentById(id)?.name)
            .filter(Boolean)

          return `
            <article class="resource-card ${item.isFeatured ? 'featured' : ''}">
              <div class="resource-card-top">
                <div class="public-content-card-main">
                  <div class="public-content-card-labels">
                    ${
                      item.resourceType
                        ? `<span class="public-content-badge accent">${escapeHtmlText(
                            item.resourceType
                          )}</span>`
                        : ''
                    }
                    ${
                      item.isFeatured
                        ? '<span class="public-content-badge">Featured</span>'
                        : ''
                    }
                    <span class="public-content-badge">${
                      departmentNames.length > 0
                        ? escapeHtmlText(departmentNames.join(' · '))
                        : 'Universal'
                    }</span>
                  </div>

                  <h2 class="public-content-card-title" data-atlas-i18n-entity="resource" data-atlas-i18n-id="${Number(item.id)}" data-atlas-i18n-field="title">${escapeHtmlText(item.title)}</h2>
                </div>
              </div>

              ${
                item.sourceName
                  ? `<p class="public-content-card-summary">${escapeHtmlText(
                      item.sourceName
                    )}</p>`
                  : ''
              }

              ${
                item.description
                  ? `<p class="public-content-card-body" data-atlas-i18n-entity="resource" data-atlas-i18n-id="${Number(item.id)}" data-atlas-i18n-field="description">${escapeHtml(item.description)}</p>`
                  : ''
              }

              <div class="public-content-card-footer">
                ${
                  url
                    ? `<a class="public-content-link" href="${escapeHtmlText(
                        url
                      )}" target="_blank" rel="noopener noreferrer">Deschide resursa</a>`
                    : ''
                }

                ${
                  relatedNode
                    ? `
                      <button
                        class="public-content-node-link"
                        type="button"
                        data-public-node-id="${Number(relatedNode.id)}"
                      >
                        Nod asociat: ${escapeHtmlText(relatedNode.title)}
                      </button>
                    `
                    : ''
                }
              </div>
            </article>
          `
        })
        .join('')}
    </div>
  `
}

async function openNodeFromPublicContent(nodeId) {
  activePublicSection = 'explore'
  syncActiveNodeCollection({ forceReset: true })

  const node = findNode(nodeId)
  if (!node) return

  if (!(await confirmUnsavedPositionBeforeLeaving(node.id))) return

  activateDepartmentForNode(node, { persist: true })

  activePublicSection = 'explore'
  localStorage.setItem(CACHE_KEYS.publicSection, activePublicSection)

  selectedId = node.id
  clearEdgeSelection()
  detailOpen = true

  setNodeRoute(node, { push: true })
  renderAll()

  requestAnimationFrame(() => centerOnNode(node))
}

function isPublicContentManagerOpen() {
  return Boolean(publicContentManagerBackdrop?.classList.contains('open'))
}

function populatePublicContentNodeSelects() {
  const options = [
    '<option value="">— Fără nod asociat —</option>',
    ...[...publicNodes]
      .sort((a, b) =>
        String(a.title || '').localeCompare(String(b.title || ''), 'ro', {
          sensitivity: 'base'
        })
      )
      .map(
        (node) =>
          `<option value="${Number(node.id)}">${escapeHtmlText(node.title)}</option>`
      )
  ].join('')

  if (announcementRelatedNodeInput) {
    const value = announcementRelatedNodeInput.value
    announcementRelatedNodeInput.innerHTML = options
    announcementRelatedNodeInput.value = value
  }

  if (resourceRelatedNodeInput) {
    const value = resourceRelatedNodeInput.value
    resourceRelatedNodeInput.innerHTML = options
    resourceRelatedNodeInput.value = value
  }
}

function renderResourceDepartmentPicker(selectedIds = selectedResourceDepartmentIds()) {
  if (!resourceDepartmentPicker) return

  const selected = new Set((selectedIds || []).map(Number))

  resourceDepartmentPicker.innerHTML = departments
    .filter((item) => item.is_active !== false)
    .sort((a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0))
    .map(
      (department) => `
        <label>
          <input
            type="checkbox"
            value="${Number(department.id)}"
            ${selected.has(Number(department.id)) ? 'checked' : ''}
          />
          <span>${escapeHtmlText(department.short_name || department.name)}</span>
        </label>
      `
    )
    .join('')
}

function resetPublicContentEditor() {
  publicContentEditingId = null

  const isAnnouncements = publicContentManagerKind === 'announcements'

  announcementEditorFields.hidden = !isAnnouncements
  resourceEditorFields.hidden = isAnnouncements
  deletePublicContentBtn.hidden = true

  populatePublicContentNodeSelects()

  if (isAnnouncements) {
    publicContentEditorTitle.textContent = 'Announcement nou'
    publicContentEditorHint.textContent =
      'Completează datele și publică atunci când este gata.'

    announcementTitleInput.value = ''
    announcementCategoryInput.value = 'ftc'
    announcementSummaryInput.value = ''
    announcementContentInput.value = ''
    announcementSourceUrlInput.value = ''
    announcementRelatedNodeInput.value = ''
    announcementPublishedAtInput.value = toDatetimeLocalValue(new Date())
    announcementPublishedInput.checked = true
    announcementPinnedInput.checked = false
    announcementImportantInput.checked = false
  } else {
    publicContentEditorTitle.textContent = 'Resource nou'
    publicContentEditorHint.textContent =
      'Adaugă o resursă utilă și alege departamentele unde trebuie să apară.'

    resourceTitleInput.value = ''
    resourceTypeInput.value = ''
    resourceSourceInput.value = ''
    resourceUrlInput.value = ''
    resourceDescriptionInput.value = ''
    resourceRelatedNodeInput.value = ''
    resourceSortOrderInput.value = '0'
    resourceActiveInput.checked = true
    resourceFeaturedInput.checked = false

    const defaultDepartments =
      activeDepartmentId == null ? [] : [Number(activeDepartmentId)]

    renderResourceDepartmentPicker(defaultDepartments)
  }

  publicContentEditorStatus.textContent = ''
}

function editPublicContentItem(id) {
  const numericId = Number(id)
  publicContentEditingId = numericId

  populatePublicContentNodeSelects()

  if (publicContentManagerKind === 'announcements') {
    const item = announcements.find((entry) => Number(entry.id) === numericId)
    if (!item) return

    announcementEditorFields.hidden = false
    resourceEditorFields.hidden = true

    publicContentEditorTitle.textContent = 'Editează announcement'
    publicContentEditorHint.textContent =
      'Modificările publicate devin vizibile imediat după salvare.'

    announcementTitleInput.value = item.title || ''
    announcementCategoryInput.value = item.category || 'ftc'
    announcementSummaryInput.value = item.summary || ''
    announcementContentInput.value = item.content || ''
    announcementSourceUrlInput.value = item.sourceUrl || ''
    announcementRelatedNodeInput.value = item.relatedNodeId ? String(item.relatedNodeId) : ''
    announcementPublishedAtInput.value = toDatetimeLocalValue(
      item.publishedAt || item.createdAt || new Date()
    )
    announcementPublishedInput.checked = item.isPublished !== false
    announcementPinnedInput.checked = Boolean(item.isPinned)
    announcementImportantInput.checked = Boolean(item.isImportant)
  } else {
    const item = resources.find((entry) => Number(entry.id) === numericId)
    if (!item) return

    announcementEditorFields.hidden = true
    resourceEditorFields.hidden = false

    publicContentEditorTitle.textContent = 'Editează resource'
    publicContentEditorHint.textContent =
      'Resursele inactive rămân salvate, dar nu apar public.'

    resourceTitleInput.value = item.title || ''
    resourceTypeInput.value = item.resourceType || ''
    resourceSourceInput.value = item.sourceName || ''
    resourceUrlInput.value = item.url || ''
    resourceDescriptionInput.value = item.description || ''
    resourceRelatedNodeInput.value = item.relatedNodeId ? String(item.relatedNodeId) : ''
    resourceSortOrderInput.value = String(Number(item.sortOrder || 0))
    resourceActiveInput.checked = item.isActive !== false
    resourceFeaturedInput.checked = Boolean(item.isFeatured)
    renderResourceDepartmentPicker(item.departmentIds || [])
  }

  deletePublicContentBtn.hidden = false
  publicContentEditorStatus.textContent = ''
}

function renderPublicContentManager() {
  if (!isPublicContentManagerOpen()) return

  document.querySelectorAll('[data-public-content-kind]').forEach((button) => {
    button.classList.toggle(
      'active',
      button.dataset.publicContentKind === publicContentManagerKind
    )
  })

  const items =
    publicContentManagerKind === 'announcements'
      ? [...announcements].sort(
          (a, b) =>
            new Date(b.publishedAt || b.createdAt || 0).getTime() -
            new Date(a.publishedAt || a.createdAt || 0).getTime()
        )
      : [...resources].sort((a, b) => {
          const orderDifference = Number(a.sortOrder || 0) - Number(b.sortOrder || 0)
          if (orderDifference !== 0) return orderDifference
          return String(a.title || '').localeCompare(String(b.title || ''), 'ro', {
            sensitivity: 'base'
          })
        })

  publicContentManagerSummary.innerHTML =
    publicContentManagerKind === 'announcements'
      ? `<strong>${items.length} announcements</strong> · ${
          items.filter((item) => item.isPublished !== false).length
        } publicate.`
      : `<strong>${items.length} resources</strong> · ${
          items.filter((item) => item.isActive !== false).length
        } active.`

  if (items.length === 0) {
    publicContentManagerList.innerHTML = `
      <div class="public-content-manager-empty">
        ${publicContentManagerKind === 'announcements' ? 'Niciun announcement.' : 'Nicio resursă.'}
      </div>
    `
  } else {
    publicContentManagerList.innerHTML = items
      .map((item) => {
        const active =
          publicContentManagerKind === 'announcements'
            ? item.isPublished !== false
            : item.isActive !== false

        const meta =
          publicContentManagerKind === 'announcements'
            ? `${announcementCategoryLabel(item.category)} · ${
                active ? 'Publicat' : 'Draft'
              }`
            : `${item.resourceType || 'Resource'} · ${active ? 'Activ' : 'Inactiv'}`

        return `
          <article class="public-content-manager-item ${active ? '' : 'inactive'}">
            <div>
              <strong>${escapeHtmlText(item.title || 'Fără titlu')}</strong>
              <span>${escapeHtmlText(meta)}</span>
            </div>

            <div class="manager-item-actions">
              <button
                class="taxonomy-mini-btn"
                type="button"
                data-atlas-i18n-edit="${
                  publicContentManagerKind === 'announcements'
                    ? 'announcement'
                    : 'resource'
                }"
                data-atlas-i18n-id="${Number(item.id)}"
              >
                EN
              </button>

              <button
                class="taxonomy-mini-btn"
                type="button"
                data-edit-public-content="${Number(item.id)}"
              >
                Editează
              </button>
            </div>
          </article>
        `
      })
      .join('')
  }

  publicContentManagerList
    .querySelectorAll('[data-edit-public-content]')
    .forEach((button) => {
      button.addEventListener('click', () => {
        editPublicContentItem(Number(button.dataset.editPublicContent))
      })
    })

  setPublicContentMutationBusy(publicContentMutationBusy)
}

function setPublicContentMutationBusy(nextValue) {
  publicContentMutationBusy = Boolean(nextValue)

  newPublicContentBtn.disabled = publicContentMutationBusy
  savePublicContentBtn.disabled = publicContentMutationBusy
  resetPublicContentEditorBtn.disabled = publicContentMutationBusy
  deletePublicContentBtn.disabled = publicContentMutationBusy

  document.querySelectorAll('[data-public-content-kind]').forEach((button) => {
    button.disabled = publicContentMutationBusy
  })

  publicContentManagerList?.querySelectorAll('button').forEach((button) => {
    button.disabled = publicContentMutationBusy
  })
}

async function openPublicContentManager(kind = null) {
  if (!requireAuth()) return

  if (kind === 'resources' || kind === 'announcements') {
    publicContentManagerKind = kind
  } else if (activePublicSection === 'resources') {
    publicContentManagerKind = 'resources'
  } else {
    publicContentManagerKind = 'announcements'
  }

  publicContentManagerBackdrop.classList.add('open')
  publicContentManagerSummary.textContent = 'Se încarcă datele editorului...'
  publicContentManagerList.innerHTML = inlineStateMarkup('Se încarcă datele editorului...')

  try {
    // Refresh here so an editor who just logged in via OTP also sees drafts
    // and inactive resources without needing to reload the whole app.
    await fetchAllData()
    resetPublicContentEditor()
    renderPublicContentManager()
  } catch (error) {
    console.error('Public content manager refresh failed:', error)
    const message =
      error?.message || 'Conținutul public nu a putut fi încărcat.'
    publicContentManagerSummary.textContent = message
    publicContentManagerList.innerHTML = inlineStateMarkup(message, 'error')
  }
}

function closePublicContentManager() {
  publicContentManagerBackdrop.classList.remove('open')
  publicContentEditingId = null
  publicContentMutationBusy = false
}

async function savePublicContentItem() {
  if (!requireAuth() || publicContentMutationBusy) return

  setPublicContentMutationBusy(true)
  publicContentEditorStatus.textContent = 'Se salvează...'

  try {
    if (publicContentManagerKind === 'announcements') {
      const title = announcementTitleInput.value.trim()
      const sourceUrlRaw = announcementSourceUrlInput.value.trim()
      const sourceUrl = sourceUrlRaw ? normalizeHttpUrl(sourceUrlRaw) : null

      if (title.length < 3) {
        throw new Error('Titlul trebuie să aibă cel puțin 3 caractere.')
      }

      if (sourceUrlRaw && !sourceUrl) {
        throw new Error('Link-ul sursă trebuie să fie un URL http:// sau https:// valid.')
      }

      const params = {
        p_project_id: PROJECT_ID,
        p_title: title,
        p_summary: announcementSummaryInput.value.trim(),
        p_content: announcementContentInput.value.trim(),
        p_category: announcementCategoryInput.value,
        p_source_url: sourceUrl,
        p_is_pinned: announcementPinnedInput.checked,
        p_is_important: announcementImportantInput.checked,
        p_is_published: announcementPublishedInput.checked,
        p_published_at: announcementPublishedAtInput.value
          ? new Date(announcementPublishedAtInput.value).toISOString()
          : new Date().toISOString(),
        p_related_node_id: announcementRelatedNodeInput.value
          ? Number(announcementRelatedNodeInput.value)
          : null
      }

      const rpcName =
        publicContentEditingId == null
          ? 'atlas_announcement_create'
          : 'atlas_announcement_update'

      if (publicContentEditingId != null) {
        params.p_announcement_id = Number(publicContentEditingId)
      }

      const { error } = await supabase.rpc(rpcName, params)
      if (error) throw error
    } else {
      const title = resourceTitleInput.value.trim()
      const urlRaw = resourceUrlInput.value.trim()
      const url = normalizeHttpUrl(urlRaw)

      if (title.length < 2) {
        throw new Error('Titlul trebuie să aibă cel puțin 2 caractere.')
      }

      if (!url) {
        throw new Error('Resource URL trebuie să fie un URL http:// sau https:// valid.')
      }

      const params = {
        p_project_id: PROJECT_ID,
        p_title: title,
        p_description: resourceDescriptionInput.value.trim(),
        p_url: url,
        p_source_name: resourceSourceInput.value.trim(),
        p_resource_type: resourceTypeInput.value.trim(),
        p_is_featured: resourceFeaturedInput.checked,
        p_is_active: resourceActiveInput.checked,
        p_sort_order: Number(resourceSortOrderInput.value || 0),
        p_related_node_id: resourceRelatedNodeInput.value
          ? Number(resourceRelatedNodeInput.value)
          : null,
        p_department_ids: selectedResourceDepartmentIds()
      }

      const rpcName =
        publicContentEditingId == null
          ? 'atlas_resource_create'
          : 'atlas_resource_update'

      if (publicContentEditingId != null) {
        params.p_resource_id = Number(publicContentEditingId)
      }

      const { error } = await supabase.rpc(rpcName, params)
      if (error) throw error
    }

    await fetchAllData()
    resetPublicContentEditor()
    renderPublicContentManager()

    publicContentEditorStatus.textContent = 'Salvat.'
  } catch (error) {
    console.error('Public content save failed:', error)
    publicContentEditorStatus.textContent = error?.message || 'Eroare la salvare.'
    alert(error?.message || 'Eroare la salvarea conținutului public.')
  } finally {
    setPublicContentMutationBusy(false)
  }
}

async function deletePublicContentItem() {
  if (!requireAuth() || publicContentMutationBusy || publicContentEditingId == null) return

  const item =
    publicContentManagerKind === 'announcements'
      ? announcements.find((entry) => Number(entry.id) === Number(publicContentEditingId))
      : resources.find((entry) => Number(entry.id) === Number(publicContentEditingId))

  if (!item) return

  const ok = confirm(`Sigur vrei să ștergi „${item.title}”?`)
  if (!ok) return

  setPublicContentMutationBusy(true)
  publicContentEditorStatus.textContent = 'Se șterge...'

  try {
    const rpcName =
      publicContentManagerKind === 'announcements'
        ? 'atlas_announcement_delete'
        : 'atlas_resource_delete'

    const params =
      publicContentManagerKind === 'announcements'
        ? {
            p_project_id: PROJECT_ID,
            p_announcement_id: Number(publicContentEditingId)
          }
        : {
            p_project_id: PROJECT_ID,
            p_resource_id: Number(publicContentEditingId)
          }

    const { error } = await supabase.rpc(rpcName, params)
    if (error) throw error

    await fetchAllData()
    resetPublicContentEditor()
    renderPublicContentManager()

    publicContentEditorStatus.textContent = 'Șters.'
  } catch (error) {
    console.error('Public content delete failed:', error)
    publicContentEditorStatus.textContent = error?.message || 'Eroare la ștergere.'
    alert(error?.message || 'Eroare la ștergerea conținutului public.')
  } finally {
    setPublicContentMutationBusy(false)
  }
}


function teamRoadmapProgressKey(roadmapId, nodeId) {
  return `${Number(roadmapId)}:${Number(nodeId)}`
}

function isTeamRoadmapStepCompleted(roadmapId, nodeId) {
  return teamRoadmapProgress.has(
    teamRoadmapProgressKey(roadmapId, nodeId)
  )
}

function visibleTeamRoadmaps() {
  return teamRoadmaps
    .filter(
      (roadmap) =>
        roadmap.isActive !== false &&
        Number(roadmap.departmentId) === Number(activeDepartmentId)
    )
    .sort((a, b) => {
      const orderDifference =
        Number(a.sortOrder || 0) - Number(b.sortOrder || 0)

      if (orderDifference !== 0) return orderDifference

      return String(a.title || '').localeCompare(
        String(b.title || ''),
        'ro',
        { sensitivity: 'base' }
      )
    })
}

function teamRoadmapProgressStats(roadmap) {
  const steps = Array.isArray(roadmap?.steps) ? roadmap.steps : []

  const completed = steps.filter((step) =>
    isTeamRoadmapStepCompleted(roadmap.id, step.nodeId)
  ).length

  return {
    completed,
    total: steps.length,
    percent:
      steps.length > 0
        ? Math.round((completed / steps.length) * 100)
        : 0
  }
}

async function toggleTeamRoadmapProgress(roadmapId, nodeId) {
  if (!currentUser || activeTeamId == null) {
    setAccountPanel(true)
    return
  }

  const key = teamRoadmapProgressKey(roadmapId, nodeId)

  if (teamRoadmapProgressMutationKeys.has(key)) return

  teamRoadmapProgressMutationKeys.add(key)

  try {
    if (teamRoadmapProgress.has(key)) {
      const { error } = await supabase
        .from('atlas_team_roadmap_progress')
        .delete()
        .eq('project_id', PROJECT_ID)
        .eq('team_id', Number(activeTeamId))
        .eq('roadmap_id', Number(roadmapId))
        .eq('node_id', Number(nodeId))
        .eq('user_id', currentUser.id)

      if (error) throw error

      teamRoadmapProgress.delete(key)
    } else {
      const { error } = await supabase
        .from('atlas_team_roadmap_progress')
        .insert({
          project_id: PROJECT_ID,
          team_id: Number(activeTeamId),
          roadmap_id: Number(roadmapId),
          node_id: Number(nodeId),
          user_id: currentUser.id
        })

      if (error) throw error

      teamRoadmapProgress.add(key)
    }

    renderAll()
  } catch (error) {
    console.error('Team roadmap progress update failed:', error)
    alert(error?.message || 'Progresul Team Atlas nu a putut fi salvat.')
  } finally {
    teamRoadmapProgressMutationKeys.delete(key)
  }
}

function teamRoadmapManagerButton() {
  if (
    !editorMode ||
    !canEditTeamAtlas() ||
    teamAtlasEditableDepartments().length === 0
  ) {
    return ''
  }

  return `
    <div class="public-hub-actions">
      <button
        class="public-hub-manage"
        type="button"
        data-open-team-roadmap-manager
      >
        Manage team roadmaps
      </button>
    </div>
  `
}

function renderTeamRoadmapCards() {
  const items = visibleTeamRoadmaps()

  if (items.length === 0) {
    return `
      <div class="roadmap-list">
        <article class="public-hub-card wide">
          <span class="public-hub-card-label">Team roadmaps</span>
          <h3>Niciun roadmap privat în acest departament.</h3>
          <p>
            Sunt trasee recomandate prin documentația internă, nu task-uri.
            Nu au deadline-uri și nu blochează niciun nod.
          </p>
          <div class="public-hub-empty">
            Toată documentația rămâne accesibilă direct din hartă și Index.
          </div>
        </article>
      </div>
    `
  }

  return `
    <div class="roadmap-list">
      ${items
        .map((roadmap) => {
          const stats = teamRoadmapProgressStats(roadmap)
          const department = getDepartmentById(roadmap.departmentId)

          return `
            <article class="roadmap-card">
              <div class="roadmap-card-head">
                <div class="roadmap-card-main">
                  <span class="roadmap-card-label">${escapeHtmlText(
                    department?.short_name ||
                      department?.name ||
                      'Team roadmap'
                  )}</span>

                  <h2>${escapeHtmlText(roadmap.title)}</h2>

                  ${
                    roadmap.description
                      ? `<p class="roadmap-card-description">${escapeHtml(
                          roadmap.description
                        )}</p>`
                      : ''
                  }
                </div>

                <span class="roadmap-progress-copy">
                  ${stats.completed} / ${stats.total} completed
                </span>
              </div>

              <div class="roadmap-progress-track" aria-hidden="true">
                <div
                  class="roadmap-progress-fill"
                  style="width:${stats.percent}%"
                ></div>
              </div>

              <div class="roadmap-steps">
                ${(roadmap.steps || [])
                  .map((step, index) => {
                    const node = teamNodes.find(
                      (candidate) =>
                        Number(candidate.id) === Number(step.nodeId)
                    )

                    if (!node) return ''

                    const completed = isTeamRoadmapStepCompleted(
                      roadmap.id,
                      step.nodeId
                    )

                    const busy = teamRoadmapProgressMutationKeys.has(
                      teamRoadmapProgressKey(
                        roadmap.id,
                        step.nodeId
                      )
                    )

                    return `
                      <div class="roadmap-step ${
                        completed ? 'completed' : ''
                      }">
                        <button
                          class="roadmap-step-check ${
                            completed ? 'completed' : ''
                          }"
                          type="button"
                          data-team-roadmap-progress-roadmap="${Number(
                            roadmap.id
                          )}"
                          data-team-roadmap-progress-node="${Number(
                            step.nodeId
                          )}"
                          aria-pressed="${completed ? 'true' : 'false'}"
                          aria-label="${
                            completed
                              ? 'Marchează ca nefinalizat'
                              : 'Marchează ca finalizat'
                          }"
                          ${busy ? 'disabled' : ''}
                        >
                          ${completed ? '✓' : ''}
                        </button>

                        <div class="roadmap-step-main">
                          <button
                            class="roadmap-step-node"
                            type="button"
                            data-team-roadmap-node-id="${Number(step.nodeId)}"
                          >
                            ${escapeHtmlText(node.title)}
                          </button>

                          ${
                            step.isOptional
                              ? '<span class="roadmap-step-optional">Optional</span>'
                              : ''
                          }

                          ${
                            step.note
                              ? `<p class="roadmap-step-note">${escapeHtml(
                                  step.note
                                )}</p>`
                              : ''
                          }
                        </div>

                        <span class="roadmap-step-index">
                          ${String(index + 1).padStart(2, '0')}
                        </span>
                      </div>
                    `
                  })
                  .join('')}
              </div>

              <div class="roadmap-card-foot">
                <p>Progres personal · zero locks · documentația rămâne liberă.</p>
                <p>${stats.percent}%</p>
              </div>
            </article>
          `
        })
        .join('')}
    </div>
  `
}

function openTeamRoadmapNode(nodeId) {
  const node = teamNodes.find(
    (candidate) => Number(candidate.id) === Number(nodeId)
  )

  if (!node) return

  activePublicSection = 'team'
  localStorage.setItem(CACHE_KEYS.publicSection, activePublicSection)

  syncActiveNodeCollection({ forceReset: true })
  activateDepartmentForNode(node, { persist: true })
  clearFiltersForDeepLink()

  selectedId = node.id
  clearEdgeSelection()
  detailOpen = true

  renderAll()
  setNodeRoute(node, { push: true })

  requestAnimationFrame(() => centerOnNode(node))
}

function roadmapProgressKey(roadmapId, nodeId) {
  return `${Number(roadmapId)}:${Number(nodeId)}`
}

function isRoadmapStepCompleted(roadmapId, nodeId) {
  return roadmapProgress.has(roadmapProgressKey(roadmapId, nodeId))
}

function visibleRoadmaps() {
  return roadmaps
    .filter(
      (roadmap) =>
        roadmap.isActive !== false &&
        Number(roadmap.departmentId) === Number(activeDepartmentId)
    )
    .sort((a, b) => {
      const orderDifference = Number(a.sortOrder || 0) - Number(b.sortOrder || 0)
      if (orderDifference !== 0) return orderDifference

      return String(a.title || '').localeCompare(String(b.title || ''), 'ro', {
        sensitivity: 'base'
      })
    })
}

function roadmapProgressStats(roadmap) {
  const steps = Array.isArray(roadmap?.steps) ? roadmap.steps : []
  const completed = steps.filter((step) =>
    isRoadmapStepCompleted(roadmap.id, step.nodeId)
  ).length

  return {
    completed,
    total: steps.length,
    percent: steps.length > 0 ? Math.round((completed / steps.length) * 100) : 0
  }
}

async function loadRoadmapProgress({ rerender = false } = {}) {
  roadmapProgress = new Set()

  if (!currentUser) {
    if (rerender) renderAll()
    return
  }

  const { data, error } = await supabase
    .from('atlas_roadmap_progress')
    .select('roadmap_id, node_id')
    .eq('project_id', PROJECT_ID)

  if (error) {
    console.error('Roadmap progress load failed:', error)
    if (rerender) renderAll()
    return
  }

  roadmapProgress = new Set(
    (data || []).map((row) => roadmapProgressKey(row.roadmap_id, row.node_id))
  )

  if (rerender) renderAll()
}

async function toggleRoadmapProgress(roadmapId, nodeId) {
  const key = roadmapProgressKey(roadmapId, nodeId)

  if (!currentUser) {
    setAccountPanel(true)
    return
  }

  if (roadmapProgressMutationKeys.has(key)) return

  roadmapProgressMutationKeys.add(key)

  try {
    if (roadmapProgress.has(key)) {
      const { error } = await supabase
        .from('atlas_roadmap_progress')
        .delete()
        .eq('project_id', PROJECT_ID)
        .eq('roadmap_id', Number(roadmapId))
        .eq('node_id', Number(nodeId))

      if (error) throw error
      roadmapProgress.delete(key)
    } else {
      const { error } = await supabase.from('atlas_roadmap_progress').insert({
        project_id: PROJECT_ID,
        roadmap_id: Number(roadmapId),
        node_id: Number(nodeId),
        user_id: currentUser.id
      })

      if (error) throw error
      roadmapProgress.add(key)
    }

    renderAll()
  } catch (error) {
    console.error('Roadmap progress update failed:', error)
    alert(error?.message || 'Progresul nu a putut fi salvat.')
  } finally {
    roadmapProgressMutationKeys.delete(key)
  }
}

function renderRoadmapCards() {
  const items = visibleRoadmaps()

  if (items.length === 0) {
    return `
      <div class="roadmap-list">
        <article class="public-hub-card wide">
          <span class="public-hub-card-label">Roadmaps publicate</span>
          <h3>Niciun roadmap publicat momentan.</h3>
          <p>
            Roadmap-urile pentru acest departament vor apărea aici, separat de harta de concepte.
          </p>
          <div class="public-hub-empty">
            Poți continua să explorezi toate nodurile direct din Atlas.
          </div>
        </article>
      </div>
    `
  }

  return `
    <div class="roadmap-list">
      ${items
        .map((roadmap) => {
          const stats = roadmapProgressStats(roadmap)
          const department = getDepartmentById(roadmap.departmentId)

          return `
            <article class="roadmap-card">
              <div class="roadmap-card-head">
                <div class="roadmap-card-main">
                  <span class="roadmap-card-label">${escapeHtmlText(
                    department?.short_name || department?.name || 'Roadmap'
                  )}</span>
                  <h2 data-atlas-i18n-entity="roadmap" data-atlas-i18n-id="${Number(roadmap.id)}" data-atlas-i18n-field="title">${escapeHtmlText(roadmap.title)}</h2>
                  ${
                    roadmap.description
                      ? `<p class="roadmap-card-description" data-atlas-i18n-entity="roadmap" data-atlas-i18n-id="${Number(roadmap.id)}" data-atlas-i18n-field="description">${escapeHtml(
                          roadmap.description
                        )}</p>`
                      : ''
                  }
                </div>

                <span class="roadmap-progress-copy">
                  ${stats.completed} / ${stats.total} completed
                </span>
              </div>

              <div class="roadmap-progress-track" aria-hidden="true">
                <div class="roadmap-progress-fill" style="width:${stats.percent}%"></div>
              </div>

              <div class="roadmap-steps">
                ${(roadmap.steps || [])
                  .map((step, index) => {
                    const node = findNode(step.nodeId)
                    if (!node) return ''

                    const completed = isRoadmapStepCompleted(roadmap.id, step.nodeId)
                    const busy = roadmapProgressMutationKeys.has(
                      roadmapProgressKey(roadmap.id, step.nodeId)
                    )

                    return `
                      <div class="roadmap-step ${completed ? 'completed' : ''}">
                        <button
                          class="roadmap-step-check ${completed ? 'completed' : ''}"
                          type="button"
                          data-roadmap-progress-roadmap="${Number(roadmap.id)}"
                          data-roadmap-progress-node="${Number(step.nodeId)}"
                          aria-pressed="${completed ? 'true' : 'false'}"
                          aria-label="${completed ? 'Marchează ca nefinalizat' : 'Marchează ca finalizat'}"
                          ${busy ? 'disabled' : ''}
                        >
                          ${completed ? '✓' : ''}
                        </button>

                        <div class="roadmap-step-main">
                          <button
                            class="roadmap-step-node"
                            type="button"
                            data-roadmap-node-id="${Number(step.nodeId)}"
                          >
                            ${escapeHtmlText(node.title)}
                          </button>

                          ${
                            step.isOptional
                              ? '<span class="roadmap-step-optional">Optional</span>'
                              : ''
                          }

                          ${
                            step.note
                              ? `<p class="roadmap-step-note" data-atlas-i18n-entity="roadmap" data-atlas-i18n-id="${Number(roadmap.id)}" data-atlas-i18n-field="step:${Number(step.nodeId)}:note">${escapeHtml(step.note)}</p>`
                              : ''
                          }
                        </div>

                        <span class="roadmap-step-index">${String(index + 1).padStart(
                          2,
                          '0'
                        )}</span>
                      </div>
                    `
                  })
                  .join('')}
              </div>

              <div class="roadmap-card-foot">
                ${
                  currentUser
                    ? `<p>Progresul este salvat în contul tău. Niciun nod nu este blocat.</p>`
                    : `
                      <p>
                        Toate nodurile sunt accesibile.
                        <button class="roadmap-login-link" type="button" data-roadmap-login>
                          Loghează-te pentru a salva progresul.
                        </button>
                      </p>
                    `
                }
                <p>${stats.percent}%</p>
              </div>
            </article>
          `
        })
        .join('')}
    </div>
  `
}

function roadmapManagerButton() {
  if (!(canEdit && editorMode)) return ''

  return `
    <div class="public-hub-actions">
      <button
        class="public-hub-manage"
        type="button"
        data-open-roadmap-manager
      >
        Manage roadmaps
      </button>
    </div>
  `
}

function currentRoadmapManagerItems() {
  if (roadmapManagerScope !== 'team') return roadmaps

  return teamRoadmaps.filter((roadmap) =>
    canEditTeamDepartment(roadmap.departmentId)
  )
}

function currentRoadmapManagerDepartments() {
  if (roadmapManagerScope === 'team') {
    return teamAtlasEditableDepartments()
  }

  return departments
    .filter((item) => item.is_active !== false)
    .sort(
      (a, b) =>
        Number(a.sort_order || 0) - Number(b.sort_order || 0)
    )
}

function currentRoadmapManagerNodes() {
  if (roadmapManagerScope !== 'team') {
    return publicNodes
  }

  const departmentId = Number(roadmapDepartmentInput?.value)

  return teamNodes.filter((node) => {
    if (!canEditNode(node)) return false

    if (Number.isFinite(departmentId)) {
      return Number(node.departmentId) === departmentId
    }

    return true
  })
}

function canManageRoadmapScope(scope = roadmapManagerScope) {
  if (!editorMode) return false

  if (scope === 'team') {
    return Boolean(
      activeTeamId != null &&
      canEditTeamAtlas() &&
      teamAtlasEditableDepartments().length > 0
    )
  }

  return Boolean(canEdit)
}

function requireRoadmapManagerAuth(scope = roadmapManagerScope) {
  if (!canManageRoadmapScope(scope)) {
    alert(
      scope === 'team'
        ? 'Rolul tău nu permite administrarea roadmap-urilor Team Atlas.'
        : 'Doar editorii aprobați pot administra roadmap-urile publice.'
    )
    return false
  }

  return true
}

async function refreshRoadmapManagerData() {
  if (roadmapManagerScope === 'team') {
    await loadActiveTeamAtlasNodes()
  } else {
    await fetchAllData()
    await loadRoadmapProgress()
  }
}

function isRoadmapManagerOpen() {
  return Boolean(roadmapManagerBackdrop?.classList.contains('open'))
}

function setRoadmapManagerBusy(nextValue) {
  roadmapManagerMutationBusy = Boolean(nextValue)

  newRoadmapBtn.disabled = roadmapManagerMutationBusy
  addRoadmapStepBtn.disabled = roadmapManagerMutationBusy
  resetRoadmapEditorBtn.disabled = roadmapManagerMutationBusy
  saveRoadmapBtn.disabled = roadmapManagerMutationBusy
  deleteRoadmapBtn.disabled = roadmapManagerMutationBusy

  roadmapManagerList?.querySelectorAll('button').forEach((button) => {
    button.disabled = roadmapManagerMutationBusy
  })

  roadmapEditorSteps?.querySelectorAll('button').forEach((button) => {
    button.disabled = roadmapManagerMutationBusy
  })
}

function populateRoadmapEditorSelects() {
  const departmentValue = roadmapDepartmentInput.value
  const departmentItems = currentRoadmapManagerDepartments()

  roadmapDepartmentInput.innerHTML = departmentItems
    .map(
      (department) =>
        `<option value="${Number(department.id)}">${escapeHtmlText(
          department.name
        )}</option>`
    )
    .join('')

  if (
    departmentValue &&
    departmentItems.some(
      (item) => String(item.id) === String(departmentValue)
    )
  ) {
    roadmapDepartmentInput.value = departmentValue
  } else if (
    activeDepartmentId != null &&
    departmentItems.some(
      (item) => Number(item.id) === Number(activeDepartmentId)
    )
  ) {
    roadmapDepartmentInput.value = String(activeDepartmentId)
  } else if (departmentItems[0]) {
    roadmapDepartmentInput.value = String(departmentItems[0].id)
  }

  const selectedNodeValue = roadmapStepNodeInput.value
  const nodeItems = currentRoadmapManagerNodes()

  roadmapStepNodeInput.innerHTML = [
    '<option value="">— Alege un nod —</option>',
    ...[...nodeItems]
      .sort((a, b) =>
        String(a.title || '').localeCompare(
          String(b.title || ''),
          'ro',
          { sensitivity: 'base' }
        )
      )
      .map(
        (node) =>
          `<option value="${Number(node.id)}">${escapeHtmlText(
            node.title
          )}</option>`
      )
  ].join('')

  if (
    selectedNodeValue &&
    nodeItems.some(
      (node) => String(node.id) === String(selectedNodeValue)
    )
  ) {
    roadmapStepNodeInput.value = selectedNodeValue
  } else {
    roadmapStepNodeInput.value = ''
  }
}

function renderRoadmapDraftSteps() {
  if (!roadmapEditorSteps) return

  if (roadmapManagerDraftSteps.length === 0) {
    roadmapEditorSteps.innerHTML = `
      <div class="public-content-manager-empty">
        Nu ai adăugat încă niciun pas. Roadmap-ul poate fi salvat și completat ulterior.
      </div>
    `
    return
  }

  roadmapEditorSteps.innerHTML = roadmapManagerDraftSteps
    .map((step, index) => {
      const node = findNode(step.nodeId)

      return `
        <div class="roadmap-editor-step">
          <span class="roadmap-editor-step-index">${String(index + 1).padStart(
            2,
            '0'
          )}</span>

          <div class="roadmap-editor-step-main">
            <strong>${escapeHtmlText(node?.title || `Node #${step.nodeId}`)}</strong>
            <span>
              ${step.isOptional ? 'Optional' : 'Recommended'}
              ${step.note ? ` · ${escapeHtmlText(step.note)}` : ''}
            </span>
          </div>

          <div class="roadmap-editor-step-actions">
            <button
              class="taxonomy-mini-btn"
              type="button"
              data-roadmap-step-up="${index}"
              ${index === 0 ? 'disabled' : ''}
              aria-label="Move up"
            >↑</button>

            <button
              class="taxonomy-mini-btn"
              type="button"
              data-roadmap-step-down="${index}"
              ${index === roadmapManagerDraftSteps.length - 1 ? 'disabled' : ''}
              aria-label="Move down"
            >↓</button>

            <button
              class="taxonomy-mini-btn danger"
              type="button"
              data-roadmap-step-remove="${index}"
              aria-label="Remove"
            >✕</button>
          </div>
        </div>
      `
    })
    .join('')

  roadmapEditorSteps
    .querySelectorAll('[data-roadmap-step-up]')
    .forEach((button) => {
      button.addEventListener('click', () => {
        const index = Number(button.dataset.roadmapStepUp)
        if (index <= 0) return

        ;[
          roadmapManagerDraftSteps[index - 1],
          roadmapManagerDraftSteps[index]
        ] = [
          roadmapManagerDraftSteps[index],
          roadmapManagerDraftSteps[index - 1]
        ]

        renderRoadmapDraftSteps()
      })
    })

  roadmapEditorSteps
    .querySelectorAll('[data-roadmap-step-down]')
    .forEach((button) => {
      button.addEventListener('click', () => {
        const index = Number(button.dataset.roadmapStepDown)

        if (index >= roadmapManagerDraftSteps.length - 1) return

        ;[
          roadmapManagerDraftSteps[index + 1],
          roadmapManagerDraftSteps[index]
        ] = [
          roadmapManagerDraftSteps[index],
          roadmapManagerDraftSteps[index + 1]
        ]

        renderRoadmapDraftSteps()
      })
    })

  roadmapEditorSteps
    .querySelectorAll('[data-roadmap-step-remove]')
    .forEach((button) => {
      button.addEventListener('click', () => {
        const index = Number(button.dataset.roadmapStepRemove)
        roadmapManagerDraftSteps.splice(index, 1)
        renderRoadmapDraftSteps()
      })
    })

  setRoadmapManagerBusy(roadmapManagerMutationBusy)
}

function resetRoadmapEditor() {
  roadmapManagerEditingId = null
  roadmapManagerDraftSteps = []

  populateRoadmapEditorSelects()

  roadmapEditorTitle.textContent = 'Roadmap nou'
  roadmapEditorHint.textContent =
    'Alege departamentul și adaugă nodurile în ordinea recomandată.'

  roadmapTitleInput.value = ''
  roadmapDescriptionInput.value = ''
  roadmapSortOrderInput.value = '0'
  roadmapActiveInput.checked = true

  if (
    activeDepartmentId != null &&
    currentRoadmapManagerDepartments().some(
      (department) =>
        Number(department.id) === Number(activeDepartmentId)
    )
  ) {
    roadmapDepartmentInput.value = String(activeDepartmentId)
  }

  populateRoadmapEditorSelects()

  roadmapStepNodeInput.value = ''
  roadmapStepNoteInput.value = ''
  roadmapStepOptionalInput.checked = false

  deleteRoadmapBtn.hidden = true
  roadmapEditorStatus.textContent = ''

  renderRoadmapDraftSteps()
}

function editRoadmap(id) {
  const roadmap = currentRoadmapManagerItems().find(
    (item) => Number(item.id) === Number(id)
  )

  if (!roadmap) return

  roadmapManagerEditingId = Number(roadmap.id)
  roadmapManagerDraftSteps = (roadmap.steps || []).map((step) => ({
    nodeId: Number(step.nodeId),
    note: step.note || '',
    isOptional: Boolean(step.isOptional)
  }))

  populateRoadmapEditorSelects()

  roadmapEditorTitle.textContent = 'Editează roadmap'
  roadmapEditorHint.textContent =
    'Poți reordona pașii fără să blochezi accesul la niciun nod.'

  roadmapTitleInput.value = roadmap.title || ''
  roadmapDescriptionInput.value = roadmap.description || ''
  roadmapDepartmentInput.value = String(roadmap.departmentId || '')

  populateRoadmapEditorSelects()

  roadmapSortOrderInput.value = String(Number(roadmap.sortOrder || 0))
  roadmapActiveInput.checked = roadmap.isActive !== false

  roadmapStepNodeInput.value = ''
  roadmapStepNoteInput.value = ''
  roadmapStepOptionalInput.checked = false

  deleteRoadmapBtn.hidden = false
  roadmapEditorStatus.textContent = ''

  renderRoadmapDraftSteps()
}

function renderRoadmapManager() {
  if (!isRoadmapManagerOpen()) return

  const items = [...currentRoadmapManagerItems()].sort((a, b) => {
    const departmentOrder =
      Number(getDepartmentById(a.departmentId)?.sort_order || 0) -
      Number(getDepartmentById(b.departmentId)?.sort_order || 0)

    if (departmentOrder !== 0) return departmentOrder

    const orderDifference =
      Number(a.sortOrder || 0) - Number(b.sortOrder || 0)

    if (orderDifference !== 0) return orderDifference

    return String(a.title || '').localeCompare(
      String(b.title || ''),
      'ro',
      { sensitivity: 'base' }
    )
  })

  if (roadmapManagerScopeLabel) {
    roadmapManagerScopeLabel.textContent =
      roadmapManagerScope === 'team'
        ? `Team roadmaps · ${currentTeamRecord()?.name || 'Team Atlas'}`
        : 'Roadmaps publice'
  }

  roadmapManagerSummary.innerHTML = `
    <strong>${items.length} roadmaps</strong> · ${items.filter((item) => item.isActive !== false).length} active
  `

  if (items.length === 0) {
    roadmapManagerList.innerHTML = `
      <div class="public-content-manager-empty">Niciun roadmap.</div>
    `
  } else {
    roadmapManagerList.innerHTML = items
      .map((roadmap) => {
        const department = getDepartmentById(roadmap.departmentId)

        const visibility =
          roadmap.isActive !== false
            ? roadmapManagerScope === 'team'
              ? 'Private'
              : 'Public'
            : 'Draft'

        return `
          <article class="roadmap-manager-item ${
            roadmap.isActive !== false ? '' : 'inactive'
          }">
            <div>
              <strong>${escapeHtmlText(roadmap.title)}</strong>
              <span>
                ${escapeHtmlText(
                  department?.short_name || department?.name || '—'
                )}
                · ${(roadmap.steps || []).length} steps
                · ${visibility}
              </span>
            </div>

            <div class="manager-item-actions">
              ${
                roadmapManagerScope === 'public'
                  ? `
                    <button
                      class="taxonomy-mini-btn"
                      type="button"
                      data-atlas-i18n-edit="roadmap"
                      data-atlas-i18n-id="${Number(roadmap.id)}"
                    >
                      EN
                    </button>
                  `
                  : ''
              }

              <button
                class="taxonomy-mini-btn"
                type="button"
                data-edit-roadmap="${Number(roadmap.id)}"
              >
                Editează
              </button>
            </div>
          </article>
        `
      })
      .join('')
  }

  roadmapManagerList
    .querySelectorAll('[data-edit-roadmap]')
    .forEach((button) => {
      button.addEventListener('click', () => {
        editRoadmap(Number(button.dataset.editRoadmap))
      })
    })

  setRoadmapManagerBusy(roadmapManagerMutationBusy)
}

async function openRoadmapManager(scope = 'public') {
  roadmapManagerScope = scope === 'team' ? 'team' : 'public'

  if (!requireRoadmapManagerAuth(roadmapManagerScope)) return

  roadmapManagerBackdrop.classList.add('open')
  roadmapManagerSummary.textContent = 'Se încarcă roadmaps...'
  roadmapManagerList.innerHTML = inlineStateMarkup('Se încarcă roadmaps...')

  try {
    await refreshRoadmapManagerData()
    resetRoadmapEditor()
    renderRoadmapManager()
  } catch (error) {
    console.error('Roadmap manager refresh failed:', error)
    const message =
      error?.message || 'Roadmap-urile nu au putut fi încărcate.'
    roadmapManagerSummary.textContent = message
    roadmapManagerList.innerHTML = inlineStateMarkup(message, 'error')
  }
}

function closeRoadmapManager() {
  roadmapManagerBackdrop.classList.remove('open')
  roadmapManagerEditingId = null
  roadmapManagerDraftSteps = []
  roadmapManagerMutationBusy = false
  roadmapManagerScope = 'public'
}

function addRoadmapDraftStep() {
  const nodeId = Number(roadmapStepNodeInput.value)
  const availableNodes = currentRoadmapManagerNodes()

  if (
    !Number.isFinite(nodeId) ||
    !availableNodes.some(
      (node) => Number(node.id) === Number(nodeId)
    )
  ) {
    alert('Alege un nod pentru pasul nou.')
    return
  }

  if (
    roadmapManagerDraftSteps.some(
      (step) => Number(step.nodeId) === nodeId
    )
  ) {
    alert('Acest nod există deja în roadmap.')
    return
  }

  roadmapManagerDraftSteps.push({
    nodeId,
    note: roadmapStepNoteInput.value.trim(),
    isOptional: roadmapStepOptionalInput.checked
  })

  roadmapStepNodeInput.value = ''
  roadmapStepNoteInput.value = ''
  roadmapStepOptionalInput.checked = false

  renderRoadmapDraftSteps()
}

async function saveRoadmap() {
  if (
    !requireRoadmapManagerAuth(roadmapManagerScope) ||
    roadmapManagerMutationBusy
  ) {
    return
  }

  const title = roadmapTitleInput.value.trim()
  const departmentId = Number(roadmapDepartmentInput.value)

  if (title.length < 3) {
    alert('Titlul trebuie să aibă cel puțin 3 caractere.')
    return
  }

  if (
    !Number.isFinite(departmentId) ||
    !getDepartmentById(departmentId)
  ) {
    alert('Alege un departament valid.')
    return
  }

  if (
    roadmapManagerScope === 'team' &&
    !canEditTeamDepartment(departmentId)
  ) {
    alert('Nu ai drept de editare în departamentul ales.')
    return
  }

  setRoadmapManagerBusy(true)
  roadmapEditorStatus.textContent = 'Se salvează...'

  try {
    const params = {
      p_project_id: PROJECT_ID,
      p_title: title,
      p_description: roadmapDescriptionInput.value.trim(),
      p_department_id: departmentId,
      p_is_active: roadmapActiveInput.checked,
      p_sort_order: Number(roadmapSortOrderInput.value || 0),
      p_steps: roadmapManagerDraftSteps.map((step) => ({
        node_id: Number(step.nodeId),
        note: step.note || '',
        is_optional: Boolean(step.isOptional)
      }))
    }

    let rpcName

    if (roadmapManagerScope === 'team') {
      params.p_team_id = Number(activeTeamId)
      rpcName =
        roadmapManagerEditingId == null
          ? 'atlas_team_roadmap_create'
          : 'atlas_team_roadmap_update'
    } else {
      rpcName =
        roadmapManagerEditingId == null
          ? 'atlas_roadmap_create'
          : 'atlas_roadmap_update'
    }

    if (roadmapManagerEditingId != null) {
      params.p_roadmap_id = Number(roadmapManagerEditingId)
    }

    const { error } = await supabase.rpc(rpcName, params)
    if (error) throw error

    await refreshRoadmapManagerData()

    resetRoadmapEditor()
    renderRoadmapManager()
    renderAll()

    roadmapEditorStatus.textContent = 'Salvat.'
  } catch (error) {
    console.error('Roadmap save failed:', error)
    roadmapEditorStatus.textContent =
      error?.message || 'Eroare la salvare.'
    alert(error?.message || 'Roadmap-ul nu a putut fi salvat.')
  } finally {
    setRoadmapManagerBusy(false)
  }
}

async function deleteRoadmap() {
  if (
    !requireRoadmapManagerAuth(roadmapManagerScope) ||
    roadmapManagerMutationBusy ||
    roadmapManagerEditingId == null
  ) {
    return
  }

  const roadmap = currentRoadmapManagerItems().find(
    (item) => Number(item.id) === Number(roadmapManagerEditingId)
  )

  if (!roadmap) return

  if (!confirm(`Sigur vrei să ștergi roadmap-ul „${roadmap.title}”?`)) {
    return
  }

  setRoadmapManagerBusy(true)
  roadmapEditorStatus.textContent = 'Se șterge...'

  try {
    const rpcName =
      roadmapManagerScope === 'team'
        ? 'atlas_team_roadmap_delete'
        : 'atlas_roadmap_delete'

    const params = {
      p_project_id: PROJECT_ID,
      p_roadmap_id: Number(roadmapManagerEditingId)
    }

    if (roadmapManagerScope === 'team') {
      params.p_team_id = Number(activeTeamId)
    }

    const { error } = await supabase.rpc(rpcName, params)
    if (error) throw error

    await refreshRoadmapManagerData()

    resetRoadmapEditor()
    renderRoadmapManager()
    renderAll()

    roadmapEditorStatus.textContent = 'Șters.'
  } catch (error) {
    console.error('Roadmap delete failed:', error)
    roadmapEditorStatus.textContent =
      error?.message || 'Eroare la ștergere.'
    alert(error?.message || 'Roadmap-ul nu a putut fi șters.')
  } finally {
    setRoadmapManagerBusy(false)
  }
}



function isTeamAtlasMode() {
  return (
    (activePublicSection === 'team' ||
      activePublicSection === 'team-index' ||
      activePublicSection === 'team-roadmaps') &&
    activeTeamId != null
  )
}

function teamAtlasRoleCanEdit(role) {
  return ['team_leader', 'department_coordinator', 'mentor'].includes(role)
}

function canEditTeamAtlas() {
  if (!currentUser || !activeTeamId) return false
  if (canEdit) return true

  const membership = currentTeamMembership()
  return Boolean(membership && teamAtlasRoleCanEdit(membership.role))
}

function canUseEditorModeAnywhere() {
  if (canEdit) return true

  return ownActiveTeamMemberships().some((membership) =>
    teamAtlasRoleCanEdit(membership.role)
  )
}

function canEditCurrentAtlas() {
  return isTeamAtlasMode() ? canEditTeamAtlas() : canEdit
}

function canManageTeamTaxonomy() {
  if (!currentUser || !activeTeamId) return false
  if (canEdit) return true

  const membership = currentTeamMembership()

  return Boolean(
    membership &&
      (membership.role === 'team_leader' || membership.role === 'mentor')
  )
}

function canManageCurrentTaxonomy() {
  return isTeamAtlasMode() ? canManageTeamTaxonomy() : canEdit
}

function requireTaxonomyAuth() {
  if (!canManageCurrentTaxonomy()) {
    alert(
      isTeamAtlasMode()
        ? 'Doar Team Leader, Mentor sau Platform Admin poate modifica taxonomia Team Atlas.'
        : 'Doar editorii aprobați pot modifica taxonomia Atlasului public.'
    )
    return false
  }

  if (!editorMode) {
    alert('Activează mai întâi Editor Mode.')
    return false
  }

  return true
}

function canEditNode(node) {
  if (!node) return false

  if (!node.isTeamNode) {
    return canEdit
  }

  return canEditTeamDepartment(node.departmentId)
}

function canEditEdge(sourceId, targetId) {
  const source = findNode(sourceId)
  const target = findNode(targetId)

  return Boolean(
    source &&
    target &&
    canEditNode(source) &&
    canEditNode(target)
  )
}

function syncActiveNodeCollection({ forceReset = false } = {}) {
  const nextScope = isTeamAtlasMode() ? 'team' : 'public'
  const scopeChanged = nextScope !== activeNodeScope

  activeNodeScope = nextScope
  nodes = nextScope === 'team' ? teamNodes : publicNodes
  categories = nextScope === 'team' ? teamCategories : publicCategories
  difficulties =
    nextScope === 'team' ? teamDifficulties : publicDifficulties
  taxonomyTags =
    nextScope === 'team' ? teamTaxonomyTags : publicTaxonomyTags

  normalizeTaxonomyState()

  if (scopeChanged || forceReset) {
    selectedId = nodes[0]?.id ?? null
    selectedEdge = null
    selectedEdgePointIndex = null
    detailOpen = false
    relationMode = { active: false, sourceId: null }

    if (!teamNodeRouteFromLocation()) {
      setHomeRoute({ push: false })
    }
  } else if (
    selectedId != null &&
    !nodes.some((node) => Number(node.id) === Number(selectedId))
  ) {
    selectedId = nodes[0]?.id ?? null
    selectedEdge = null
    selectedEdgePointIndex = null
    detailOpen = false
  }
}

function coordinatorEditableDepartmentIds() {
  const membership = currentTeamMembership()
  if (!membership) return []

  return membershipDepartmentIds(membership.id)
}

function canEditTeamDepartment(departmentId) {
  if (canEdit) return true

  const membership = currentTeamMembership()
  if (!membership) return false

  if (membership.role === 'team_leader' || membership.role === 'mentor') {
    return true
  }

  if (membership.role === 'department_coordinator') {
    return coordinatorEditableDepartmentIds().includes(Number(departmentId))
  }

  return false
}

function teamAtlasEditableDepartments() {
  const enabledIds = new Set(currentTeamDepartmentIds())

  return departments
    .filter(
      (department) =>
        department.is_active !== false &&
        enabledIds.has(Number(department.id)) &&
        canEditTeamDepartment(department.id)
    )
    .sort((a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0))
}

function populateTeamNodeDepartmentSelect(selectedId = null) {
  if (!teamNodeDepartmentInput) return

  const items = teamAtlasEditableDepartments()

  teamNodeDepartmentInput.innerHTML = items
    .map(
      (department) =>
        `<option value="${Number(department.id)}">${escapeHtmlText(
          department.name
        )}</option>`
    )
    .join('')

  if (
    selectedId != null &&
    items.some((department) => Number(department.id) === Number(selectedId))
  ) {
    teamNodeDepartmentInput.value = String(selectedId)
  } else if (
    activeDepartmentId != null &&
    items.some((department) => Number(department.id) === Number(activeDepartmentId))
  ) {
    teamNodeDepartmentInput.value = String(activeDepartmentId)
  }
}

async function loadActiveTeamAtlasNodes({ forceReset = false } = {}) {
  teamNodes = []
  teamCategories = []
  teamDifficulties = []
  teamTaxonomyTags = []
  teamRoadmaps = []
  teamRoadmapProgress = new Set()

  if (!currentUser || activeTeamId == null) {
    syncActiveNodeCollection({ forceReset })
    return
  }

  const [
    nodesResult,
    edgesResult,
    codeResult,
    mediaResult,
    filesResult,
    teamCategoriesResult,
    teamDifficultiesResult,
    teamTagsResult,
    teamRoadmapsResult,
    teamRoadmapStepsResult,
    teamRoadmapProgressResult,
    teamReferencesResult,
    teamReviewStateResult
  ] = await Promise.all([
    supabase
      .from('atlas_team_nodes')
      .select('*')
      .eq('project_id', PROJECT_ID)
      .eq('team_id', Number(activeTeamId))
      .order('id', { ascending: true }),

    supabase
      .from('atlas_team_edges')
      .select('*')
      .eq('project_id', PROJECT_ID)
      .eq('team_id', Number(activeTeamId))
      .order('source_id', { ascending: true })
      .order('target_id', { ascending: true }),

    supabase
      .from('atlas_team_node_code_snippets')
      .select('*')
      .eq('project_id', PROJECT_ID)
      .eq('team_id', Number(activeTeamId))
      .order('sort_order', { ascending: true })
      .order('id', { ascending: true }),

    supabase
      .from('atlas_team_node_media')
      .select('*')
      .eq('project_id', PROJECT_ID)
      .eq('team_id', Number(activeTeamId))
      .order('sort_order', { ascending: true })
      .order('id', { ascending: true }),

    supabase
      .from('atlas_team_node_files')
      .select('*')
      .eq('project_id', PROJECT_ID)
      .eq('team_id', Number(activeTeamId))
      .order('sort_order', { ascending: true })
      .order('id', { ascending: true }),

    supabase
      .from('atlas_team_categories')
      .select('*')
      .eq('project_id', PROJECT_ID)
      .eq('team_id', Number(activeTeamId))
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true }),

    supabase
      .from('atlas_team_difficulties')
      .select('*')
      .eq('project_id', PROJECT_ID)
      .eq('team_id', Number(activeTeamId))
      .order('rank', { ascending: true })
      .order('name', { ascending: true }),

    supabase
      .from('atlas_team_tags')
      .select('*')
      .eq('project_id', PROJECT_ID)
      .eq('team_id', Number(activeTeamId))
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true }),

    supabase
      .from('atlas_team_roadmaps')
      .select('*')
      .eq('project_id', PROJECT_ID)
      .eq('team_id', Number(activeTeamId))
      .order('sort_order', { ascending: true })
      .order('title', { ascending: true }),

    supabase
      .from('atlas_team_roadmap_steps')
      .select('*')
      .eq('project_id', PROJECT_ID)
      .eq('team_id', Number(activeTeamId))
      .order('roadmap_id', { ascending: true })
      .order('position', { ascending: true }),

    supabase
      .from('atlas_team_roadmap_progress')
      .select('roadmap_id, node_id')
      .eq('project_id', PROJECT_ID)
      .eq('team_id', Number(activeTeamId))
      .eq('user_id', currentUser.id),

    supabase
      .from('atlas_document_references')
      .select('*')
      .eq('project_id', PROJECT_ID)
      .eq('node_scope', 'team')
      .eq('team_id', Number(activeTeamId))
      .order('team_node_id', { ascending: true })
      .order('is_primary', { ascending: false })
      .order('sort_order', { ascending: true })
      .order('id', { ascending: true }),

    supabase
      .from('atlas_document_review_state')
      .select('*')
      .eq('project_id', PROJECT_ID)
      .eq('node_scope', 'team')
      .eq('team_id', Number(activeTeamId))
  ])

  if (nodesResult.error) throw nodesResult.error
  if (edgesResult.error) throw edgesResult.error
  if (codeResult.error) throw codeResult.error
  if (mediaResult.error) throw mediaResult.error
  if (filesResult.error) throw filesResult.error
  if (teamCategoriesResult.error) throw teamCategoriesResult.error
  if (teamDifficultiesResult.error) throw teamDifficultiesResult.error
  if (teamTagsResult.error) throw teamTagsResult.error
  if (teamRoadmapsResult.error) throw teamRoadmapsResult.error
  if (teamRoadmapStepsResult.error) throw teamRoadmapStepsResult.error
  if (teamRoadmapProgressResult.error) throw teamRoadmapProgressResult.error
  if (teamReferencesResult.error) throw teamReferencesResult.error
  if (teamReviewStateResult.error) throw teamReviewStateResult.error

  teamCategories = teamCategoriesResult.data || []
  teamDifficulties = teamDifficultiesResult.data || []
  teamTaxonomyTags = teamTagsResult.data || []

  const teamRoadmapStepsByRoadmap = new Map()

  for (const row of teamRoadmapStepsResult.data || []) {
    const roadmapId = Number(row.roadmap_id)

    if (!teamRoadmapStepsByRoadmap.has(roadmapId)) {
      teamRoadmapStepsByRoadmap.set(roadmapId, [])
    }

    teamRoadmapStepsByRoadmap.get(roadmapId).push({
      id: Number(row.id),
      nodeId: Number(row.node_id),
      position: Number(row.position || 0),
      note: row.note || '',
      isOptional: row.is_optional === true
    })
  }

  teamRoadmaps = (teamRoadmapsResult.data || []).map((row) => ({
    id: Number(row.id),
    teamId: Number(row.team_id),
    title: row.title || '',
    description: row.description || '',
    departmentId: Number(row.department_id),
    isActive: row.is_active !== false,
    sortOrder: Number(row.sort_order || 0),
    createdAt: row.created_at || null,
    updatedAt: row.updated_at || null,
    steps:
      teamRoadmapStepsByRoadmap.get(Number(row.id)) || []
  }))

  teamRoadmapProgress = new Set(
    (teamRoadmapProgressResult.data || []).map((row) =>
      teamRoadmapProgressKey(row.roadmap_id, row.node_id)
    )
  )

  const edgesBySource = new Map()

  for (const edge of edgesResult.data || []) {
    const sourceId = Number(edge.source_id)

    if (!edgesBySource.has(sourceId)) {
      edgesBySource.set(sourceId, [])
    }

    edgesBySource.get(sourceId).push({
      targetId: Number(edge.target_id),
      label: edge.label || 'relație',
      controlPoints: normalizeEdgeControlPoints(
        edge.control_points,
        edge.control_x,
        edge.control_y
      )
    })
  }

  const mediaByNode = new Map()

  for (const row of mediaResult.data || []) {
    const nodeId = Number(row.node_id)

    if (!mediaByNode.has(nodeId)) {
      mediaByNode.set(nodeId, [])
    }

    mediaByNode.get(nodeId).push({
      id: Number(row.id),
      nodeId,
      teamId: Number(row.team_id),
      isTeamMedia: true,
      mediaType: row.media_type || 'image',
      storagePath: row.storage_path || null,
      externalUrl: row.external_url || null,
      mimeType: row.mime_type || '',
      fileSize: Number(row.file_size || 0),
      title: row.title || '',
      caption: row.caption || '',
      sortOrder: Number(row.sort_order || 0),
      signedUrl: null,
      createdAt: row.created_at || null,
      updatedAt: row.updated_at || null
    })
  }

  const filesByNode = new Map()

  for (const row of filesResult.data || []) {
    const nodeId = Number(row.node_id)

    if (!filesByNode.has(nodeId)) {
      filesByNode.set(nodeId, [])
    }

    filesByNode.get(nodeId).push({
      id: Number(row.id),
      nodeId,
      teamId: Number(row.team_id),
      isTeamFile: true,
      storagePath: row.storage_path || '',
      originalName: row.original_name || 'fișier',
      relativePath: row.relative_path || '',
      mimeType: row.mime_type || '',
      fileSize: Number(row.file_size || 0),
      title: row.title || '',
      description: row.description || '',
      sortOrder: Number(row.sort_order || 0),
      signedUrl: null,
      createdAt: row.created_at || null,
      updatedAt: row.updated_at || null
    })
  }

  const signTasks = []

  for (const items of mediaByNode.values()) {
    for (const item of items) {
      if (!item.storagePath) continue

      signTasks.push(
        createTeamSignedUrl(TEAM_MEDIA_BUCKET, item.storagePath).then((url) => {
          item.signedUrl = url
        })
      )
    }
  }

  for (const items of filesByNode.values()) {
    for (const item of items) {
      if (!item.storagePath) continue

      signTasks.push(
        createTeamSignedUrl(TEAM_FILE_BUCKET, item.storagePath).then((url) => {
          item.signedUrl = url
        })
      )
    }
  }

  await Promise.all(signTasks)

  const codeByNode = new Map()

  for (const row of codeResult.data || []) {
    const nodeId = Number(row.node_id)

    if (!codeByNode.has(nodeId)) {
      codeByNode.set(nodeId, [])
    }

    codeByNode.get(nodeId).push({
      id: Number(row.id),
      nodeId,
      teamId: Number(row.team_id),
      isTeamCode: true,
      language: row.language || 'text',
      title: row.title || '',
      description: row.description || '',
      code: row.code || '',
      sortOrder: Number(row.sort_order || 0),
      createdAt: row.created_at || null,
      updatedAt: row.updated_at || null
    })
  }

  const referencesByTeamNode = new Map()

  for (const row of teamReferencesResult.data || []) {
    const nodeId = Number(row.team_node_id)

    if (!referencesByTeamNode.has(nodeId)) {
      referencesByTeamNode.set(nodeId, [])
    }

    referencesByTeamNode.get(nodeId).push({
      id: Number(row.id),
      nodeScope: 'team',
      publicNodeId: null,
      teamId: Number(row.team_id),
      teamNodeId: nodeId,
      title: row.title || '',
      url: row.url || '',
      sourceType: row.source_type || 'other',
      note: row.note || '',
      isPrimary: row.is_primary === true,
      sortOrder: Number(row.sort_order || 0),
      createdAt: row.created_at || null,
      updatedAt: row.updated_at || null
    })
  }

  const reviewByTeamNode = new Map()

  for (const row of teamReviewStateResult.data || []) {
    reviewByTeamNode.set(Number(row.team_node_id), {
      id: Number(row.id),
      nodeScope: 'team',
      status: row.review_status || 'needs_review',
      lastReviewedAt: row.last_reviewed_at || null,
      reviewNote: row.review_note || '',
      updatedAt: row.updated_at || null
    })
  }

  teamNodes = (nodesResult.data || []).map((row) => ({
    id: Number(row.id),
    teamId: Number(row.team_id),
    isTeamNode: true,
    title: row.title || '',
    legacyTag: row.tag || '',
    categoryId:
      row.team_category_id == null ? null : Number(row.team_category_id),
    difficultyId:
      row.team_difficulty_id == null
        ? null
        : Number(row.team_difficulty_id),
    departmentId:
      row.department_id == null ? null : Number(row.department_id),
    departmentIds:
      row.department_id == null ? [] : [Number(row.department_id)],
    tagIds: Array.isArray(row.team_tag_ids)
      ? row.team_tag_ids.map(Number)
      : [],
    x: Number(row.x),
    y: Number(row.y),
    width: row.width == null ? null : Number(row.width),
    height: row.height == null ? null : Number(row.height),
    content: row.content || '',
    contentFormat: row.content_format || 'html',
    links: edgesBySource.get(Number(row.id)) || [],
    media: mediaByNode.get(Number(row.id)) || [],
    files: filesByNode.get(Number(row.id)) || [],
    codeSnippets: codeByNode.get(Number(row.id)) || [],
    references: referencesByTeamNode.get(Number(row.id)) || [],
    reviewState: reviewByTeamNode.get(Number(row.id)) || null,
    createdAt: row.created_at || null,
    updatedAt: row.updated_at || null,
    sourcePublicNodeId:
      row.source_public_node_id == null
        ? null
        : Number(row.source_public_node_id),
    sourceImportedAt: row.source_imported_at || null,
    sourceSnapshot:
      row.source_snapshot && typeof row.source_snapshot === 'object'
        ? row.source_snapshot
        : null,
    sourceSyncedAt: row.source_synced_at || null
  }))

  syncActiveNodeCollection({ forceReset })
}

function teamRoleLabel(role) {
  const labels = {
    team_member: 'Member',
    department_coordinator: 'Coordinator',
    team_leader: 'Team Leader',
    mentor: 'Mentor'
  }

  return labels[role] || 'Member'
}

function ownActiveTeamMemberships() {
  if (!currentUser) return []

  return teamMemberships.filter(
    (membership) =>
      membership.userId === currentUser.id &&
      membership.status === 'active'
  )
}

function currentTeamMembership() {
  return (
    ownActiveTeamMemberships().find(
      (membership) => Number(membership.teamId) === Number(activeTeamId)
    ) || null
  )
}

function currentTeamRecord() {
  return (
    teamRecords.find((team) => Number(team.id) === Number(activeTeamId)) || null
  )
}

function currentTeamMembers() {
  return teamMembers.filter(
    (membership) =>
      Number(membership.teamId) === Number(activeTeamId) &&
      membership.status === 'active'
  )
}

function membershipDepartmentIds(membershipId) {
  return teamMemberDepartments
    .filter((row) => Number(row.membershipId) === Number(membershipId))
    .map((row) => Number(row.departmentId))
}

function membershipForTeam(teamId) {
  if (!currentUser) return null

  return (
    teamMemberships.find(
      (membership) =>
        membership.userId === currentUser.id &&
        membership.status === 'active' &&
        Number(membership.teamId) === Number(teamId)
    ) || null
  )
}

function editableDepartmentIdsForTeam(teamId) {
  const enabled = teamEnabledDepartments
    .filter((row) => Number(row.teamId) === Number(teamId))
    .map((row) => Number(row.departmentId))

  if (canEdit) return enabled

  const membership = membershipForTeam(teamId)
  if (!membership) return []

  if (membership.role === 'team_leader' || membership.role === 'mentor') {
    return enabled
  }

  if (membership.role === 'department_coordinator') {
    const assigned = new Set(membershipDepartmentIds(membership.id))
    return enabled.filter((id) => assigned.has(Number(id)))
  }

  return []
}

function importableTeamRecords() {
  if (!currentUser) return []

  return teamRecords
    .filter((team) => {
      if (canEdit) return true

      const membership = membershipForTeam(team.id)
      return Boolean(
        membership &&
          ['team_leader', 'mentor', 'department_coordinator'].includes(
            membership.role
          )
      )
    })
    .filter((team) => editableDepartmentIdsForTeam(team.id).length > 0)
    .sort((a, b) =>
      String(a.name).localeCompare(String(b.name), 'ro', {
        sensitivity: 'base'
      })
    )
}

function canImportPublicNodeToTeam(node) {
  return Boolean(
    node &&
      !node.isTeamNode &&
      currentUser &&
      importableTeamRecords().length > 0
  )
}

function currentTeamDepartmentIds() {
  return teamEnabledDepartments
    .filter((row) => Number(row.teamId) === Number(activeTeamId))
    .map((row) => Number(row.departmentId))
}

function normalizeActiveTeam() {
  const ownMemberships = ownActiveTeamMemberships()

  const availableTeamIds = canEdit
    ? teamRecords.map((team) => Number(team.id))
    : ownMemberships.map((membership) => Number(membership.teamId))

  if (availableTeamIds.length === 0) {
    activeTeamId = null
    teamNodes = []

    if (
      activePublicSection === 'team' ||
      activePublicSection === 'team-index' ||
      activePublicSection === 'team-roadmaps'
    ) {
      activePublicSection = 'explore'
      localStorage.setItem(CACHE_KEYS.publicSection, activePublicSection)
    }

    syncActiveNodeCollection({ forceReset: true })
    return
  }

  const cachedTeamId = Number(localStorage.getItem(CACHE_KEYS.activeTeam))
  const cachedIsAvailable = availableTeamIds.includes(cachedTeamId)

  if (cachedIsAvailable) {
    activeTeamId = cachedTeamId
    return
  }

  activeTeamId = Number(availableTeamIds[0])
  localStorage.setItem(CACHE_KEYS.activeTeam, String(activeTeamId))
}

async function selectActiveTeam(teamId) {
  if (
    Number(teamId) !== Number(activeTeamId) &&
    hasUnsavedLayoutChanges()
  ) {
    if (!(await confirmUnsavedPositionBeforeLeaving())) {
      if (teamAtlasSelect) {
        teamAtlasSelect.value = String(activeTeamId)
      }
      return
    }
  }

  layoutEditMode = false
  layoutUndoStack = []
  layoutRedoStack = []

  const membership = ownActiveTeamMemberships().find(
    (item) => Number(item.teamId) === Number(teamId)
  )

  const adminTeamAccess =
    canEdit &&
    teamRecords.some((team) => Number(team.id) === Number(teamId))

  if (!membership && !adminTeamAccess) return

  activeTeamId = Number(teamId)
  localStorage.setItem(CACHE_KEYS.activeTeam, String(activeTeamId))

  if (isTeamMembersManagerOpen()) {
    closeTeamMembersManager()
  }

  await loadActiveTeamAtlasNodes({ forceReset: true })
  renderAll()
  requestAnimationFrame(fitView)
}

async function loadTeamContext({ rerender = false } = {}) {
  teamMemberships = []
  teamRecords = []
  teamMembers = []
  teamMemberDepartments = []
  teamEnabledDepartments = []
  teamInvites = []
  teamNodes = []
  teamCategories = []
  teamDifficulties = []
  teamTaxonomyTags = []
  teamRoadmaps = []
  teamRoadmapProgress = new Set()

  if (!currentUser) {
    activeTeamId = null
    syncActiveNodeCollection({ forceReset: true })

    if (rerender) renderAll()
    return
  }

  const normalizedEmail = String(currentUser.email || '').trim().toLowerCase()

  const [ownMembershipResult, ownInvitesResult, adminTeamsResult] =
    await Promise.all([
      supabase
        .from('atlas_team_memberships')
        .select('*')
        .eq('project_id', PROJECT_ID)
        .eq('user_id', currentUser.id)
        .eq('status', 'active'),

      normalizedEmail
        ? supabase
            .from('atlas_team_invites')
            .select('*')
            .eq('project_id', PROJECT_ID)
            .eq('email', normalizedEmail)
            .eq('status', 'pending')
            .gt('expires_at', new Date().toISOString())
            .order('created_at', { ascending: false })
        : Promise.resolve({ data: [], error: null }),

      canEdit
        ? supabase
            .from('atlas_teams')
            .select('*')
            .eq('project_id', PROJECT_ID)
            .eq('is_active', true)
            .order('name', { ascending: true })
        : Promise.resolve({ data: [], error: null })
    ])

  if (ownMembershipResult.error) {
    console.error('Team membership load failed:', ownMembershipResult.error)
  }

  if (ownInvitesResult.error) {
    console.error('Team invites load failed:', ownInvitesResult.error)
  }

  if (adminTeamsResult.error) {
    console.error('Admin team list load failed:', adminTeamsResult.error)
  }

  const ownRows = ownMembershipResult.data || []
  const inviteRows = ownInvitesResult.data || []
  const adminTeamRows = adminTeamsResult.data || []

  const membershipTeamIds = ownRows.map((row) => Number(row.team_id))
  const inviteTeamIds = inviteRows.map((row) => Number(row.team_id))
  const adminTeamIds = adminTeamRows.map((row) => Number(row.id))

  const teamIds = [
    ...new Set([
      ...membershipTeamIds,
      ...inviteTeamIds,
      ...adminTeamIds
    ])
  ].filter(Number.isFinite)

  if (teamIds.length === 0) {
    normalizeActiveTeam()
    renderTeamInvites()
    maybeOpenPendingTeamInvite()

    if (rerender) renderAll()
    return
  }

  const membershipTeamIdsUnique = [
    ...new Set(canEdit ? teamIds : membershipTeamIds)
  ].filter(Number.isFinite)

  const [
    teamsResult,
    membershipsResult,
    memberDepartmentsResult,
    enabledDepartmentsResult
  ] = await Promise.all([
    supabase
      .from('atlas_teams')
      .select('*')
      .eq('project_id', PROJECT_ID)
      .in('id', teamIds)
      .eq('is_active', true),

    membershipTeamIdsUnique.length > 0
      ? supabase
          .from('atlas_team_memberships')
          .select('*')
          .eq('project_id', PROJECT_ID)
          .in('team_id', membershipTeamIdsUnique)
      : Promise.resolve({ data: [], error: null }),

    membershipTeamIdsUnique.length > 0
      ? supabase
          .from('atlas_team_member_departments')
          .select('membership_id, department_id, team_id')
          .eq('project_id', PROJECT_ID)
          .in('team_id', membershipTeamIdsUnique)
      : Promise.resolve({ data: [], error: null }),

    membershipTeamIdsUnique.length > 0
      ? supabase
          .from('atlas_team_departments')
          .select('team_id, department_id')
          .eq('project_id', PROJECT_ID)
          .in('team_id', membershipTeamIdsUnique)
      : Promise.resolve({ data: [], error: null })
  ])

  const firstError = [
    teamsResult.error,
    membershipsResult.error,
    memberDepartmentsResult.error,
    enabledDepartmentsResult.error
  ].find(Boolean)

  if (firstError) {
    console.error('Team context load failed:', firstError)
  }

  teamRecords = (teamsResult.data || []).map((row) => ({
    id: Number(row.id),
    name: row.name || '',
    teamNumber: row.team_number || '',
    slug: row.slug || '',
    description: row.description || '',
    isActive: row.is_active !== false,
    createdAt: row.created_at || null,
    updatedAt: row.updated_at || null
  }))

  teamMemberships = (membershipsResult.data || []).map((row) => ({
    id: Number(row.id),
    teamId: Number(row.team_id),
    userId: row.user_id,
    displayName: row.display_name || '',
    role: row.role || 'team_member',
    status: row.status || 'active',
    onboardingCompletedAt: row.onboarding_completed_at || null,
    joinedAt: row.joined_at || null,
    createdAt: row.created_at || null
  }))

  teamMembers = [...teamMemberships]

  teamMemberDepartments = (memberDepartmentsResult.data || []).map((row) => ({
    membershipId: Number(row.membership_id),
    teamId: Number(row.team_id),
    departmentId: Number(row.department_id)
  }))

  teamEnabledDepartments = (enabledDepartmentsResult.data || []).map((row) => ({
    teamId: Number(row.team_id),
    departmentId: Number(row.department_id)
  }))

  teamInvites = inviteRows.map((row) => ({
    id: Number(row.id),
    teamId: Number(row.team_id),
    email: row.email || '',
    displayName: row.display_name || '',
    role: row.role || 'team_member',
    departmentIds: Array.isArray(row.department_ids)
      ? row.department_ids.map(Number)
      : [],
    token: row.token || '',
    status: row.status || 'pending',
    expiresAt: row.expires_at || null,
    createdAt: row.created_at || null
  }))

  normalizeActiveTeam()

  if (activeTeamId != null) {
    await loadActiveTeamAtlasNodes()
  }

  renderTeamInvites()
  maybeOpenPendingTeamInvite()

  if (rerender) renderAll()
}

function renderTeamNavigation() {
  if (!teamSpaceEntry) return

  const membership = currentTeamMembership()
  const team = currentTeamRecord()
  const ownMemberships = ownActiveTeamMemberships()

  const visible = Boolean(currentUser && team && (membership || canEdit))
  const roleLabel = membership
    ? teamRoleLabel(membership.role)
    : canEdit
      ? 'Platform Admin'
      : 'Member'

  if (teamNavigationSection) {
    teamNavigationSection.hidden = !visible
  }

  teamSpaceEntry.hidden = !visible
  teamSpaceEntry.classList.toggle(
    'active',
    visible &&
      (activePublicSection === 'team' ||
        activePublicSection === 'team-index' ||
        activePublicSection === 'team-roadmaps')
  )

  if (!visible) {
    if (teamAtlasContext) teamAtlasContext.hidden = true
    return
  }

  teamSpaceEntryName.textContent = team.teamNumber
    ? `${team.name} #${team.teamNumber}`
    : team.name

  teamSpaceEntryRole.textContent = roleLabel
  if (teamNavigationSummary) {
    teamNavigationSummary.textContent = team.teamNumber
      ? `#${team.teamNumber}`
      : roleLabel
  }

  if (!teamAtlasContext) return

  const inTeamAtlas =
    activePublicSection === 'team' ||
    activePublicSection === 'team-index' ||
    activePublicSection === 'team-roadmaps'

  teamAtlasContext.hidden = !inTeamAtlas

  if (!inTeamAtlas) return

  const selectableTeams = canEdit
    ? teamRecords
    : ownMemberships
        .map((item) =>
          teamRecords.find(
            (candidate) => Number(candidate.id) === Number(item.teamId)
          )
        )
        .filter(Boolean)

  teamAtlasSelect.innerHTML = selectableTeams
    .map((record) => {
      const label = record.teamNumber
        ? `${record.name} #${record.teamNumber}`
        : record.name

      return `
        <option value="${Number(record.id)}" ${
          Number(record.id) === Number(activeTeamId) ? 'selected' : ''
        }>
          ${escapeHtmlText(label)}
        </option>
      `
    })
    .join('')

  teamAtlasContextMeta.innerHTML = `
    <span class="team-atlas-banner">${escapeHtmlText(roleLabel)}</span>
    · documentație privată a echipei
  `

  teamAtlasIndexBtn.textContent =
    activePublicSection === 'team-index'
      ? 'Atlas map'
      : 'Index'

  teamAtlasIndexBtn.classList.toggle(
    'primary',
    activePublicSection === 'team-index'
  )

  teamAtlasIndexBtn.disabled = isAtlasLoading

  teamAtlasRoadmapsBtn.textContent =
    activePublicSection === 'team-roadmaps'
      ? 'Atlas map'
      : 'Roadmaps'

  teamAtlasRoadmapsBtn.classList.toggle(
    'primary',
    activePublicSection === 'team-roadmaps'
  )

  teamAtlasRoadmapsBtn.disabled = isAtlasLoading

  teamAtlasTaxonomyBtn.hidden = !canManageTeamTaxonomy()
  teamAtlasTaxonomyBtn.disabled = !editorMode || isAtlasLoading
  teamAtlasSettingsBtn.hidden = !canManageCurrentTeam()
  teamAtlasMembersBtn.hidden = !canManageTeamMembers()
}

function renderTeamSpace() {
  const membership = currentTeamMembership()
  const team = currentTeamRecord()

  if (!membership || !team) {
    return `
      <div class="public-hub-inner">
        <p class="public-hub-kicker">Your Team</p>
        <h1 class="public-hub-title">Team Space</h1>
        <p class="public-hub-description">
          Nu ai momentan un Team Space activ pe acest cont.
        </p>
      </div>
    `
  }

  const ownDepartments = membershipDepartmentIds(membership.id)
    .map((id) => getDepartmentById(id))
    .filter(Boolean)

  const enabledDepartments = currentTeamDepartmentIds()
    .map((id) => getDepartmentById(id))
    .filter(Boolean)

  const members = currentTeamMembers()
  const memberships = ownActiveTeamMemberships()

  const teamTitle = team.teamNumber
    ? `${team.name} #${team.teamNumber}`
    : team.name

  return `
    <div class="public-hub-inner">
      <p class="public-hub-kicker">Your Team · Private</p>
      <h1 class="public-hub-title">${escapeHtmlText(teamTitle)}</h1>
      <p class="public-hub-description">
        ${escapeHtml(
          team.description ||
            'Spațiul privat al echipei pentru coordonare, resurse și progres intern.'
        )}
      </p>

      ${
        memberships.length > 1
          ? `
            <div class="team-space-switcher">
              ${memberships
                .map((item) => {
                  const itemTeam = teamRecords.find(
                    (record) => Number(record.id) === Number(item.teamId)
                  )
                  if (!itemTeam) return ''

                  const label = itemTeam.teamNumber
                    ? `${itemTeam.name} #${itemTeam.teamNumber}`
                    : itemTeam.name

                  return `
                    <button
                      class="team-space-switch ${
                        Number(item.teamId) === Number(activeTeamId) ? 'active' : ''
                      }"
                      type="button"
                      data-team-select="${Number(item.teamId)}"
                    >
                      ${escapeHtmlText(label)}
                    </button>
                  `
                })
                .join('')}
            </div>
          `
          : ''
      }

      <div class="public-hub-meta">
        <span class="public-hub-chip">${escapeHtmlText(
          teamRoleLabel(membership.role)
        )}</span>
        <span class="public-hub-chip">${members.length} members</span>
        <span class="public-hub-chip">${enabledDepartments.length} departments</span>
      </div>

      <div class="public-hub-actions">
        ${teamSetupManagerButton()}
        ${teamMembersManagerButton()}
        ${
          membership.onboardingCompletedAt
            ? `<button class="public-hub-manage" type="button" data-team-onboarding>View onboarding</button>`
            : ''
        }
      </div>

      <div class="team-space-grid">
        ${renderTeamOnboardingCard(membership)}
        <article class="team-space-card">
          <span class="team-space-card-label">Rolul tău</span>
          <h3>${escapeHtmlText(teamRoleLabel(membership.role))}</h3>
          <p>
            Permisiunile Team Space sunt separate de drepturile de editor ale Atlasului public.
          </p>

          <div class="team-space-chips">
            ${
              ownDepartments.length > 0
                ? ownDepartments
                    .map(
                      (department) =>
                        `<span class="team-space-chip">${escapeHtmlText(
                          department.short_name || department.name
                        )}</span>`
                    )
                    .join('')
                : '<span class="team-space-chip">Universal / team-wide</span>'
            }
          </div>
        </article>

        <article class="team-space-card">
          <span class="team-space-card-label">Departamente active</span>
          <h3>Structura echipei</h3>
          <p>
            Acestea sunt departamentele activate momentan pentru Team Space.
          </p>

          <div class="team-space-chips">
            ${
              enabledDepartments.length > 0
                ? enabledDepartments
                    .map(
                      (department) =>
                        `<span class="team-space-chip">${escapeHtmlText(
                          department.short_name || department.name
                        )}</span>`
                    )
                    .join('')
                : '<span class="team-space-chip">Niciun departament configurat</span>'
            }
          </div>
        </article>

        <article class="team-space-card wide">
          <span class="team-space-card-label">Members</span>
          <h3>${members.length} membri activi</h3>

          <div class="team-member-list">
            ${members
              .map((member) => {
                const departmentNames = membershipDepartmentIds(member.id)
                  .map((id) => getDepartmentById(id)?.short_name || getDepartmentById(id)?.name)
                  .filter(Boolean)

                const fallbackName =
                  member.userId === currentUser?.id
                    ? currentUser?.email || 'You'
                    : 'Team member'

                return `
                  <div class="team-member-row">
                    <div>
                      <strong>${escapeHtmlText(
                        member.displayName || fallbackName
                      )}</strong>
                      <span>${
                        departmentNames.length > 0
                          ? escapeHtmlText(departmentNames.join(' · '))
                          : 'Team-wide'
                      }</span>
                    </div>

                    <span class="team-member-role">${escapeHtmlText(
                      teamRoleLabel(member.role)
                    )}</span>
                  </div>
                `
              })
              .join('')}
          </div>
        </article>

        <article class="team-space-card">
          <span class="team-space-card-label">Private workspace</span>
          <h3>Team-only content</h3>
          <p>
            Fundația este pregătită pentru note private, resurse interne și team roadmaps.
            Acestea vor fi adăugate în fazele următoare.
          </p>
        </article>

        <article class="team-space-card">
          <span class="team-space-card-label">Coordination</span>
          <h3>Announcements & tasks</h3>
          <p>
            Următoarea extensie poate adăuga anunțuri interne, notificări și coordonare pe departamente.
          </p>
        </article>
      </div>

      <div class="team-privacy-note">
        Team Space este privat. Datele de aici sunt citibile doar de membrii activi ai echipei și de editorii platformei autorizați.
      </div>
    </div>
  `
}


function pendingInviteToken() {
  return localStorage.getItem(CACHE_KEYS.pendingTeamInvite) || ''
}

function clearPendingInviteToken(token = null) {
  const current = pendingInviteToken()
  if (token && current && token !== current) return

  localStorage.removeItem(CACHE_KEYS.pendingTeamInvite)

  const url = new URL(window.location.href)
  if (url.searchParams.has('teamInvite')) {
    url.searchParams.delete('teamInvite')
    window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`)
  }
}

function teamNameById(teamId) {
  const team = teamRecords.find((item) => Number(item.id) === Number(teamId))
  if (!team) return 'FTC Team'

  return team.teamNumber
    ? `${team.name} #${team.teamNumber}`
    : team.name
}

function formatInviteExpiry(value) {
  if (!value) return ''

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''

  const language = document.documentElement.lang === 'en' ? 'en-GB' : 'ro-RO'

  return new Intl.DateTimeFormat(language, {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  }).format(date)
}

function renderTeamInvites() {
  if (!teamInvitesPanel || !teamInvitesList || !teamInvitesCount) return

  const items = [...teamInvites]
    .filter((invite) => invite.status === 'pending')
    .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))

  teamInvitesPanel.hidden = !currentUser || items.length === 0
  teamInvitesCount.textContent = String(items.length)

  if (items.length === 0) {
    teamInvitesList.innerHTML = ''
    return
  }

  const highlightedToken = pendingInviteToken()

  teamInvitesList.innerHTML = items
    .map((invite) => {
      const departmentNames = (invite.departmentIds || [])
        .map((id) => getDepartmentById(id)?.short_name || getDepartmentById(id)?.name)
        .filter(Boolean)

      return `
        <article class="team-invite-card ${
          highlightedToken && invite.token === highlightedToken ? 'highlight' : ''
        }">
          <div>
            <strong>${escapeHtmlText(teamNameById(invite.teamId))}</strong>
            <span>
              ${escapeHtmlText(teamRoleLabel(invite.role))}
              ${
                departmentNames.length > 0
                  ? ` · ${escapeHtmlText(departmentNames.join(' · '))}`
                  : ''
              }
              ${
                invite.expiresAt
                  ? ` · expiră ${escapeHtmlText(formatInviteExpiry(invite.expiresAt))}`
                  : ''
              }
            </span>
          </div>

          <div class="team-invite-actions">
            <button
              class="btn primary"
              type="button"
              data-accept-team-invite="${escapeHtmlText(invite.token)}"
            >
              Acceptă
            </button>

            <button
              class="btn"
              type="button"
              data-decline-team-invite="${escapeHtmlText(invite.token)}"
            >
              Refuză
            </button>
          </div>
        </article>
      `
    })
    .join('')
}

async function respondToTeamInvite(token, action) {
  if (!currentUser || !token) {
    setAccountPanel(true)
    return
  }

  const rpcName =
    action === 'accept'
      ? 'atlas_team_invite_accept'
      : 'atlas_team_invite_decline'

  const { data, error } = await supabase.rpc(rpcName, {
    p_project_id: PROJECT_ID,
    p_token: token
  })

  if (error) {
    console.error('Team invite response failed:', error)
    alert(error.message || 'Invitația nu a putut fi procesată.')
    return
  }

  clearPendingInviteToken(token)
  await loadTeamContext()

  if (action === 'accept') {
    const teamId = Number(data?.team_id || 0)

    if (teamId) {
      activeTeamId = teamId
      localStorage.setItem(CACHE_KEYS.activeTeam, String(teamId))
    }

    activePublicSection = 'team'
    localStorage.setItem(CACHE_KEYS.publicSection, activePublicSection)
  }

  updateAuthUI()
  renderAll()
}

function canManageTeamMembers() {
  const membership = currentTeamMembership()

  return Boolean(
    canEdit ||
    (membership && membership.role === 'team_leader')
  )
}

function teamMembersManagerButton() {
  if (!canManageTeamMembers()) return ''

  return `
    <button class="public-hub-manage" type="button" data-open-team-members>
      Members & invites
    </button>
  `
}

function teamOnboardingProfile(role) {
  const profiles = {
    team_leader: {
      title: 'Team Leader',
      intro:
        'Tu configurezi accesul la Team Atlas și stabilești cine poate documenta fiecare departament.',
      steps: [
        [
          'Configurează echipa',
          'Verifică numele, FTC Team Number și departamentele folosite în documentația echipei.'
        ],
        [
          'Invită membrii',
          'Invită persoanele care trebuie să citească sau să contribuie la documentația echipei.'
        ],
        [
          'Atribuie rolurile',
          'Atribuie Coordinator, Mentor sau Team Leader în funcție de cine poate întreține documentația.'
        ],
        [
          'Folosește Atlasul public separat',
          'Rolul de Team Leader nu oferă automat drepturi de editor asupra documentației publice.'
        ]
      ]
    },
    department_coordinator: {
      title: 'Department Coordinator',
      intro:
        'Întreții documentația pentru unul sau mai multe departamente din Team Atlas.',
      steps: [
        [
          'Verifică departamentele tale',
          'Team Atlas îți arată departamentele în care ai drept de editare.'
        ],
        [
          'Documentează departamentul tău',
          'Poți crea noduri, edita documentația, adăuga relații și snippet-uri de cod în departamentele tale.'
        ],
        [
          'Folosește Atlasul public ca referință',
          'Atlasul public rămâne baza comună, iar Team Atlas păstrează particularitățile și cunoștințele echipei.'
        ]
      ]
    },
    mentor: {
      title: 'Mentor',
      intro:
        'Poți ghida și contribui direct la documentația Team Atlas din toate departamentele echipei.',
      steps: [
        [
          'Urmărește structura',
          'Poți vedea structura documentației și toate departamentele active ale echipei.'
        ],
        [
          'Contribuie la documentație',
          'Poți edita nodurile Team Atlas, relațiile și exemplele de cod acolo unde este nevoie.'
        ],
        [
          'Păstrează legătura cu Atlasul public',
          'Team Atlas păstrează informația specifică echipei, iar Public Atlas rămâne documentația comună.'
        ]
      ]
    },
    team_member: {
      title: 'Team Member',
      intro:
        'Team Atlas îți oferă documentația internă a echipei și departamentele relevante pentru tine.',
      steps: [
        [
          'Vezi departamentul tău',
          'Rolul și departamentele asignate controlează ce documentație poți consulta sau edita.'
        ],
        [
          'Explorează Atlasul public',
          'Poți deschide orice nod și urma roadmaps fără sistem de unlock.'
        ],
        [
          'Folosește documentația echipei',
          'Poți consulta nodurile Team Atlas și exemplele păstrate de coordonatori, lideri și mentori.'
        ]
      ]
    }
  }

  return profiles[role] || profiles.team_member
}

function renderTeamOnboardingCard(membership) {
  if (!membership || membership.onboardingCompletedAt) return ''

  const profile = teamOnboardingProfile(membership.role)

  return `
    <article class="team-space-card wide team-onboarding-card">
      <span class="team-space-card-label">Getting started</span>
      <h3>${escapeHtmlText(profile.title)} onboarding</h3>
      <p>${escapeHtml(profile.intro)}</p>

      <div class="public-hub-actions">
        <button class="public-hub-manage" type="button" data-team-onboarding>
          Start onboarding
        </button>
      </div>
    </article>
  `
}

function openTeamOnboarding() {
  const membership = currentTeamMembership()
  const team = currentTeamRecord()

  if (!membership || !team) return

  const profile = teamOnboardingProfile(membership.role)

  teamOnboardingContent.innerHTML = `
    <div class="team-onboarding-hero">
      <span>${escapeHtmlText(teamNameById(team.id))}</span>
      <h3>${escapeHtmlText(profile.title)}</h3>
      <p>${escapeHtml(profile.intro)}</p>
    </div>

    <div class="team-onboarding-steps">
      ${profile.steps
        .map(
          ([title, body], index) => `
            <article class="team-onboarding-step">
              <span class="team-onboarding-step-index">${index + 1}</span>
              <div>
                <strong>${escapeHtmlText(title)}</strong>
                <p>${escapeHtml(body)}</p>
              </div>
            </article>
          `
        )
        .join('')}
    </div>
  `

  teamOnboardingStatus.textContent = membership.onboardingCompletedAt
    ? 'Onboarding deja finalizat. Îl poți reciti oricând.'
    : 'Parcurge pașii și finalizează când e clar.'

  completeTeamOnboardingBtn.hidden = Boolean(membership.onboardingCompletedAt)
  teamOnboardingBackdrop.classList.add('open')
}

function closeTeamOnboarding() {
  teamOnboardingBackdrop.classList.remove('open')
  teamOnboardingMutationBusy = false
}

async function completeTeamOnboarding() {
  const membership = currentTeamMembership()
  if (!currentUser || !membership || teamOnboardingMutationBusy) return

  teamOnboardingMutationBusy = true
  completeTeamOnboardingBtn.disabled = true
  teamOnboardingStatus.textContent = 'Se salvează...'

  try {
    const { error } = await supabase.rpc('atlas_team_onboarding_complete', {
      p_project_id: PROJECT_ID,
      p_team_id: Number(membership.teamId)
    })

    if (error) throw error

    await loadTeamContext()
    renderAll()

    teamOnboardingStatus.textContent = 'Onboarding finalizat.'
    completeTeamOnboardingBtn.hidden = true
  } catch (error) {
    console.error('Complete team onboarding failed:', error)
    teamOnboardingStatus.textContent =
      error?.message || 'Onboarding-ul nu a putut fi salvat.'
  } finally {
    teamOnboardingMutationBusy = false
    completeTeamOnboardingBtn.disabled = false
  }
}

function isTeamMembersManagerOpen() {
  return Boolean(teamMembersBackdrop?.classList.contains('open'))
}

function currentTeamManagerMembers() {
  return teamMembers
    .filter((member) => Number(member.teamId) === Number(activeTeamId))
    .sort((a, b) => {
      if (a.status !== b.status) return a.status === 'active' ? -1 : 1
      return String(a.displayName || '').localeCompare(
        String(b.displayName || ''),
        'ro',
        { sensitivity: 'base' }
      )
    })
}

function enabledTeamDepartments() {
  return currentTeamDepartmentIds()
    .map((id) => getDepartmentById(id))
    .filter(Boolean)
}

function renderTeamManagerDepartmentPicker(container, selectedIds = []) {
  if (!container) return

  const selected = new Set((selectedIds || []).map(Number))

  container.innerHTML = enabledTeamDepartments()
    .map(
      (department) => `
        <label>
          <input
            type="checkbox"
            value="${Number(department.id)}"
            ${selected.has(Number(department.id)) ? 'checked' : ''}
          />
          <span>${escapeHtmlText(department.short_name || department.name)}</span>
        </label>
      `
    )
    .join('')

  if (!container.innerHTML.trim()) {
    container.innerHTML =
      '<div class="public-content-manager-empty">Niciun departament activ.</div>'
  }
}

function checkedDepartmentIds(container) {
  if (!container) return []

  return [...container.querySelectorAll('input[type="checkbox"]:checked')]
    .map((input) => Number(input.value))
    .filter(Number.isFinite)
}

function setTeamMembersBusy(nextValue) {
  teamMembersMutationBusy = Boolean(nextValue)

  resetTeamMemberEditorBtn.disabled = teamMembersMutationBusy
  saveTeamMemberBtn.disabled = teamMembersMutationBusy

  teamMembersManagerList?.querySelectorAll('button').forEach((button) => {
    button.disabled = teamMembersMutationBusy
  })

  teamPendingInvitesList?.querySelectorAll('button').forEach((button) => {
    button.disabled = teamMembersMutationBusy
  })
}

function resetTeamMemberEditor() {
  teamMemberEditingId = null

  teamInviteEditorFields.hidden = false
  teamMemberEditorFields.hidden = true

  teamMemberEditorTitle.textContent = 'Invită un membru'
  teamMemberEditorHint.textContent =
    'Creează invitația și distribuie link-ul persoanei potrivite.'

  teamInviteEmailInput.value = ''
  teamInviteDisplayNameInput.value = ''
  teamInviteRoleInput.value = 'team_member'
  renderTeamManagerDepartmentPicker(teamInviteDepartmentPicker, [])

  saveTeamMemberBtn.textContent = 'Creează invitația'
  teamMembersManagerStatus.textContent = ''
}

function editTeamMember(membershipId) {
  const member = currentTeamManagerMembers().find(
    (item) => Number(item.id) === Number(membershipId)
  )
  if (!member) return

  teamMemberEditingId = Number(member.id)

  teamInviteEditorFields.hidden = true
  teamMemberEditorFields.hidden = false

  teamMemberEditorTitle.textContent = 'Editează membrul'
  teamMemberEditorHint.textContent =
    'Actualizează rolul, departamentele sau accesul în Team Space.'

  teamMemberEditorCurrent.innerHTML = `
    <strong>${escapeHtmlText(
      member.displayName ||
        (member.userId === currentUser?.id ? currentUser.email : 'Team member')
    )}</strong><br>
    ${escapeHtmlText(teamRoleLabel(member.role))}
  `

  teamMemberRoleInput.value = member.role || 'team_member'
  teamMemberActiveInput.checked = member.status === 'active'

  renderTeamManagerDepartmentPicker(
    teamMemberDepartmentPicker,
    membershipDepartmentIds(member.id)
  )

  saveTeamMemberBtn.textContent = 'Salvează membrul'
  teamMembersManagerStatus.textContent = ''
}

function inviteLink(token) {
  const url = new URL(SITE_ORIGIN)
  url.searchParams.set('teamInvite', token)
  return url.toString()
}

async function copyInviteLink(token) {
  const link = inviteLink(token)

  try {
    await navigator.clipboard.writeText(link)
    teamMembersManagerStatus.textContent = 'Link copiat.'
  } catch {
    window.prompt('Copiază link-ul invitației:', link)
  }
}

function renderTeamMembersManager() {
  if (!isTeamMembersManagerOpen()) return

  const members = currentTeamManagerMembers()
  const now = Date.now()
  const pendingInvites = [...teamManagerInvites]
    .filter((invite) => {
      if (invite.status !== 'pending') return false
      if (!invite.expiresAt) return true

      const expiry = new Date(invite.expiresAt).getTime()
      return !Number.isFinite(expiry) || expiry > now
    })
    .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))

  teamMembersSummary.innerHTML = `
    <strong>${members.filter((member) => member.status === 'active').length} active members</strong>
    · ${pendingInvites.length} pending invites
  `

  teamMembersManagerList.innerHTML =
    members.length === 0
      ? '<div class="public-content-manager-empty">Nu există membri.</div>'
      : members
          .map((member) => {
            const departments = membershipDepartmentIds(member.id)
              .map(
                (id) =>
                  getDepartmentById(id)?.short_name ||
                  getDepartmentById(id)?.name
              )
              .filter(Boolean)

            const name =
              member.displayName ||
              (member.userId === currentUser?.id
                ? currentUser.email
                : 'Team member')

            return `
              <article class="team-member-manage-row ${
                member.status === 'active' ? '' : 'disabled'
              }">
                <div>
                  <strong>${escapeHtmlText(name)}</strong>
                  <span>
                    ${escapeHtmlText(teamRoleLabel(member.role))}
                    ${
                      departments.length > 0
                        ? ` · ${escapeHtmlText(departments.join(' · '))}`
                        : ''
                    }
                    ${member.status !== 'active' ? ' · disabled' : ''}
                  </span>
                </div>

                <button
                  class="taxonomy-mini-btn"
                  type="button"
                  data-manage-team-member="${Number(member.id)}"
                >
                  Manage
                </button>
              </article>
            `
          })
          .join('')

  teamPendingInvitesList.innerHTML =
    pendingInvites.length === 0
      ? '<div class="public-content-manager-empty">Nu există invitații pending.</div>'
      : pendingInvites
          .map((invite) => {
            const departments = (invite.departmentIds || [])
              .map(
                (id) =>
                  getDepartmentById(id)?.short_name ||
                  getDepartmentById(id)?.name
              )
              .filter(Boolean)

            return `
              <article class="team-pending-invite-row">
                <div>
                  <strong>${escapeHtmlText(invite.email)}</strong>
                  <span>
                    ${escapeHtmlText(teamRoleLabel(invite.role))}
                    ${
                      departments.length > 0
                        ? ` · ${escapeHtmlText(departments.join(' · '))}`
                        : ''
                    }
                    ${
                      invite.expiresAt
                        ? ` · expiră ${escapeHtmlText(
                            formatInviteExpiry(invite.expiresAt)
                          )}`
                        : ''
                    }
                  </span>
                </div>

                <div class="team-invite-actions">
                  <button
                    class="taxonomy-mini-btn"
                    type="button"
                    data-copy-team-invite="${escapeHtmlText(invite.token)}"
                  >
                    Copy
                  </button>

                  <button
                    class="taxonomy-mini-btn danger"
                    type="button"
                    data-revoke-team-invite="${Number(invite.id)}"
                  >
                    Revoke
                  </button>
                </div>
              </article>
            `
          })
          .join('')

  teamMembersManagerList
    .querySelectorAll('[data-manage-team-member]')
    .forEach((button) => {
      button.addEventListener('click', () => {
        editTeamMember(Number(button.dataset.manageTeamMember))
      })
    })

  teamPendingInvitesList
    .querySelectorAll('[data-copy-team-invite]')
    .forEach((button) => {
      button.addEventListener('click', () => {
        copyInviteLink(button.dataset.copyTeamInvite)
      })
    })

  teamPendingInvitesList
    .querySelectorAll('[data-revoke-team-invite]')
    .forEach((button) => {
      button.addEventListener('click', () => {
        revokeTeamInvite(Number(button.dataset.revokeTeamInvite))
      })
    })

  setTeamMembersBusy(teamMembersMutationBusy)
}

async function loadTeamManagerInvites() {
  teamManagerInvites = []

  if (!activeTeamId || !canManageTeamMembers()) return

  const { data, error } = await supabase
    .from('atlas_team_invites')
    .select('*')
    .eq('project_id', PROJECT_ID)
    .eq('team_id', Number(activeTeamId))
    .order('created_at', { ascending: false })

  if (error) throw error

  teamManagerInvites = (data || []).map((row) => ({
    id: Number(row.id),
    teamId: Number(row.team_id),
    email: row.email || '',
    displayName: row.display_name || '',
    role: row.role || 'team_member',
    departmentIds: Array.isArray(row.department_ids)
      ? row.department_ids.map(Number)
      : [],
    token: row.token || '',
    status: row.status || 'pending',
    expiresAt: row.expires_at || null,
    createdAt: row.created_at || null
  }))
}

async function openTeamMembersManager() {
  if (!currentUser || !canManageTeamMembers()) return

  teamMembersBackdrop.classList.add('open')
  teamMembersSummary.textContent = 'Se încarcă...'

  try {
    await loadTeamContext()
    await loadTeamManagerInvites()
    resetTeamMemberEditor()
    renderTeamMembersManager()
  } catch (error) {
    console.error('Team members manager load failed:', error)
    teamMembersManagerStatus.textContent =
      error?.message || 'Members & Invites nu a putut fi încărcat.'
  }
}

function closeTeamMembersManager() {
  teamMembersBackdrop.classList.remove('open')
  teamMemberEditingId = null
  teamManagerInvites = []
  teamMembersMutationBusy = false
}

async function saveTeamMemberOrInvite() {
  if (!currentUser || !canManageTeamMembers() || teamMembersMutationBusy) return

  setTeamMembersBusy(true)
  teamMembersManagerStatus.textContent = 'Se salvează...'

  try {
    if (teamMemberEditingId == null) {
      const email = teamInviteEmailInput.value.trim().toLowerCase()
      const displayName = teamInviteDisplayNameInput.value.trim()
      const role = teamInviteRoleInput.value
      const departmentIds = checkedDepartmentIds(teamInviteDepartmentPicker)

      if (!email.includes('@')) {
        throw new Error('Scrie un email valid.')
      }

      if (role === 'department_coordinator' && departmentIds.length === 0) {
        throw new Error('Un Department Coordinator trebuie să aibă cel puțin un departament.')
      }

      const { data, error } = await supabase.rpc('atlas_team_invite_create', {
        p_project_id: PROJECT_ID,
        p_team_id: Number(activeTeamId),
        p_email: email,
        p_display_name: displayName,
        p_role: role,
        p_department_ids: departmentIds
      })

      if (error) throw error

      await loadTeamManagerInvites()
      renderTeamMembersManager()

      const token = data?.token || ''
      resetTeamMemberEditor()

      if (token) {
        await copyInviteLink(token)
      }

      teamMembersManagerStatus.textContent =
        'Invitație creată. Link-ul a fost copiat.'
    } else {
      const role = teamMemberRoleInput.value
      const status = teamMemberActiveInput.checked ? 'active' : 'disabled'
      const departmentIds = checkedDepartmentIds(teamMemberDepartmentPicker)

      if (role === 'department_coordinator' && departmentIds.length === 0) {
        throw new Error('Un Department Coordinator trebuie să aibă cel puțin un departament.')
      }

      const { error } = await supabase.rpc('atlas_team_member_update', {
        p_project_id: PROJECT_ID,
        p_team_id: Number(activeTeamId),
        p_membership_id: Number(teamMemberEditingId),
        p_role: role,
        p_status: status,
        p_department_ids: departmentIds
      })

      if (error) throw error

      await loadTeamContext()

      if (!canManageTeamMembers()) {
        closeTeamMembersManager()
        renderAll()
        return
      }

      await loadTeamManagerInvites()

      resetTeamMemberEditor()
      renderTeamMembersManager()
      renderAll()

      teamMembersManagerStatus.textContent = 'Membru actualizat.'
    }
  } catch (error) {
    console.error('Team member/invite save failed:', error)
    teamMembersManagerStatus.textContent =
      error?.message || 'Operația nu a putut fi salvată.'
    alert(error?.message || 'Operația nu a putut fi salvată.')
  } finally {
    setTeamMembersBusy(false)
  }
}

async function revokeTeamInvite(inviteId) {
  if (!currentUser || !canManageTeamMembers() || teamMembersMutationBusy) return

  const invite = teamManagerInvites.find(
    (item) => Number(item.id) === Number(inviteId)
  )
  if (!invite) return

  if (!confirm(`Revoci invitația pentru ${invite.email}?`)) return

  setTeamMembersBusy(true)

  try {
    const { error } = await supabase.rpc('atlas_team_invite_revoke', {
      p_project_id: PROJECT_ID,
      p_team_id: Number(activeTeamId),
      p_invite_id: Number(inviteId)
    })

    if (error) throw error

    await loadTeamManagerInvites()
    renderTeamMembersManager()

    teamMembersManagerStatus.textContent = 'Invitație revocată.'
  } catch (error) {
    console.error('Revoke invite failed:', error)
    teamMembersManagerStatus.textContent =
      error?.message || 'Invitația nu a putut fi revocată.'
  } finally {
    setTeamMembersBusy(false)
  }
}

// Public -> Team Atlas import
function isTeamImportOpen() {
  return Boolean(teamImportBackdrop?.classList.contains('open'))
}

function setTeamImportBusy(nextValue, status = '') {
  teamImportMutationBusy = Boolean(nextValue)
  teamImportTeamInput.disabled = teamImportMutationBusy
  teamImportDepartmentInput.disabled = teamImportMutationBusy
  teamImportTitleInput.disabled = teamImportMutationBusy
  teamImportCodeInput.disabled = teamImportMutationBusy
  confirmTeamImportBtn.disabled = teamImportMutationBusy
  cancelTeamImportBtn.disabled = teamImportMutationBusy
  closeTeamImportBtn.disabled = teamImportMutationBusy

  if (status) teamImportStatus.textContent = status
}

function renderTeamImportDepartmentOptions(preferredDepartmentId = null) {
  const teamId = Number(teamImportTeamInput.value)
  const allowedIds = new Set(editableDepartmentIdsForTeam(teamId))

  const items = departments
    .filter(
      (department) =>
        department.is_active !== false &&
        allowedIds.has(Number(department.id))
    )
    .sort((a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0))

  teamImportDepartmentInput.innerHTML = items
    .map(
      (department) => `
        <option value="${Number(department.id)}">
          ${escapeHtmlText(department.short_name || department.name)}
        </option>
      `
    )
    .join('')

  const preferred = Number(preferredDepartmentId)

  if (
    Number.isFinite(preferred) &&
    items.some((department) => Number(department.id) === preferred)
  ) {
    teamImportDepartmentInput.value = String(preferred)
  }

  confirmTeamImportBtn.disabled =
    teamImportMutationBusy || items.length === 0
}

function renderTeamImportTargetOptions(sourceNode) {
  const teams = importableTeamRecords()

  teamImportTeamInput.innerHTML = teams
    .map((team) => {
      const label = team.teamNumber
        ? `${team.name} #${team.teamNumber}`
        : team.name

      return `<option value="${Number(team.id)}">${escapeHtmlText(label)}</option>`
    })
    .join('')

  if (teams.some((team) => Number(team.id) === Number(activeTeamId))) {
    teamImportTeamInput.value = String(activeTeamId)
  }

  const allowed = editableDepartmentIdsForTeam(
    Number(teamImportTeamInput.value)
  )

  const preferredDepartment = (sourceNode?.departmentIds || []).find((id) =>
    allowed.includes(Number(id))
  )

  renderTeamImportDepartmentOptions(preferredDepartment)
}

function openTeamImport(sourceNodeId) {
  const sourceNode = publicNodes.find(
    (node) => Number(node.id) === Number(sourceNodeId)
  )

  if (!sourceNode || sourceNode.isTeamNode) {
    alert('Poți copia în Team Atlas doar un nod din Atlasul public.')
    return
  }

  if (!currentUser) {
    setAccountPanel(true)
    return
  }

  if (importableTeamRecords().length === 0) {
    alert(
      'Nu ai momentan o echipă/departament în care poți crea documentație.'
    )
    return
  }

  teamImportSourceNodeId = Number(sourceNode.id)
  teamImportTitleInput.value = sourceNode.title
  teamImportCodeInput.checked = true

  teamImportSource.innerHTML = `
    <strong>${escapeHtmlText(sourceNode.title)}</strong>
    ${escapeHtmlText(nodeCategoryName(sourceNode))} ·
    ${escapeHtmlText(nodeDifficultyName(sourceNode))} ·
    ${(sourceNode.codeSnippets || []).length} code snippets
  `

  renderTeamImportTargetOptions(sourceNode)
  teamImportStatus.textContent =
    'Titlul și conținutul pot fi adaptate imediat după copiere.'

  teamImportBackdrop.classList.add('open')

  requestAnimationFrame(() => {
    teamImportTitleInput.focus()
    teamImportTitleInput.select()
  })
}

function closeTeamImport() {
  if (teamImportMutationBusy) return
  teamImportBackdrop.classList.remove('open')
  teamImportSourceNodeId = null
}

async function openImportedTeamNode(teamId, nodeId) {
  activeTeamId = Number(teamId)
  localStorage.setItem(CACHE_KEYS.activeTeam, String(activeTeamId))

  activePublicSection = 'team'
  localStorage.setItem(CACHE_KEYS.publicSection, activePublicSection)

  await loadActiveTeamAtlasNodes({ forceReset: true })

  const importedNode = teamNodes.find(
    (node) => Number(node.id) === Number(nodeId)
  )

  if (!importedNode) {
    renderAll()
    requestAnimationFrame(fitView)
    return
  }

  nodes = teamNodes
  selectedId = importedNode.id
  clearEdgeSelection()
  detailOpen = true
  activateDepartmentForNode(importedNode, { persist: true })

  renderAll()
  setNodeRoute(importedNode, { push: true })
  requestAnimationFrame(() => centerOnNode(importedNode))
}

async function importPublicNodeToTeam() {
  if (teamImportMutationBusy) return

  const sourceNode = publicNodes.find(
    (node) => Number(node.id) === Number(teamImportSourceNodeId)
  )

  if (!sourceNode) throw new Error('Nodul public nu mai există.')

  const teamId = Number(teamImportTeamInput.value)
  const departmentId = Number(teamImportDepartmentInput.value)
  const title = teamImportTitleInput.value.trim()

  if (!teamId || !departmentId) {
    throw new Error('Alege echipa și departamentul.')
  }

  if (!editableDepartmentIdsForTeam(teamId).includes(departmentId)) {
    throw new Error('Nu ai drept de editare în departamentul ales.')
  }

  if (!title) throw new Error('Titlul nodului nu poate fi gol.')

  setTeamImportBusy(true, 'Se copiază nodul în Team Atlas...')

  try {
    const { data, error } = await supabase.rpc(
      'atlas_team_import_public_node',
      {
        p_project_id: PROJECT_ID,
        p_team_id: teamId,
        p_source_node_id: Number(sourceNode.id),
        p_department_id: departmentId,
        p_title: title,
        p_copy_code: teamImportCodeInput.checked
      }
    )

    if (error) throw error
    if (!data?.ok || !data?.node?.id) {
      throw new Error('Importul nu a returnat un nod valid.')
    }

    const importedId = Number(data.node.id)
    const codeCount = Number(data.code_count || 0)

    teamImportStatus.textContent =
      `Copiat cu succes · ${codeCount} code snippets.`

    teamImportMutationBusy = false
    teamImportBackdrop.classList.remove('open')
    teamImportSourceNodeId = null

    await openImportedTeamNode(teamId, importedId)
  } catch (error) {
    setTeamImportBusy(false, error?.message || 'Importul a eșuat.')
    throw error
  }
}

function openPublicSourceFromTeamNode(node) {
  const sourceId = Number(node?.sourcePublicNodeId)
  if (!sourceId) return

  const sourceNode = publicNodes.find(
    (candidate) => Number(candidate.id) === sourceId
  )

  if (!sourceNode) {
    alert('Nodul public sursă nu mai este disponibil.')
    return
  }

  activePublicSection = 'explore'
  localStorage.setItem(CACHE_KEYS.publicSection, activePublicSection)

  syncActiveNodeCollection({ forceReset: true })
  activateDepartmentForNode(sourceNode, { persist: true })
  clearFiltersForDeepLink()

  selectedId = sourceNode.id
  clearEdgeSelection()
  detailOpen = true

  renderAll()
  setNodeRoute(sourceNode, { push: true })
  requestAnimationFrame(() => centerOnNode(sourceNode))
}

function canManageCurrentTeam() {
  const membership = currentTeamMembership()

  return Boolean(
    canEdit ||
    (membership && membership.role === 'team_leader')
  )
}

function teamSetupManagerButton() {
  if (!canManageCurrentTeam()) return ''

  return `
    <button class="public-hub-manage" type="button" data-open-team-setup>
      Manage team
    </button>
  `
}

function isTeamSetupOpen() {
  return Boolean(teamSetupBackdrop?.classList.contains('open'))
}

function setTeamSetupBusy(nextValue) {
  teamSetupMutationBusy = Boolean(nextValue)

  newTeamSetupBtn.disabled = teamSetupMutationBusy
  saveTeamSetupBtn.disabled = teamSetupMutationBusy

  teamSetupDepartmentPicker?.querySelectorAll('input').forEach((input) => {
    input.disabled = teamSetupMutationBusy
  })
}

function selectedTeamSetupDepartmentIds() {
  if (!teamSetupDepartmentPicker) return []

  return [...teamSetupDepartmentPicker.querySelectorAll('input:checked')]
    .map((input) => Number(input.value))
    .filter(Number.isFinite)
}

function renderTeamSetupDepartmentPicker(selectedIds = []) {
  if (!teamSetupDepartmentPicker) return

  const selected = new Set((selectedIds || []).map(Number))

  teamSetupDepartmentPicker.innerHTML = departments
    .filter((item) => item.is_active !== false)
    .sort((a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0))
    .map(
      (department) => `
        <label>
          <input
            type="checkbox"
            value="${Number(department.id)}"
            ${selected.has(Number(department.id)) ? 'checked' : ''}
          />
          <span>${escapeHtmlText(department.short_name || department.name)}</span>
        </label>
      `
    )
    .join('')
}

function resetTeamSetupForm({ createMode = false } = {}) {
  teamSetupCreateMode = Boolean(createMode)

  const team = currentTeamRecord()
  const membership = currentTeamMembership()

  if (!teamSetupCreateMode && team && (membership || canEdit)) {
    const roleLabel = membership
      ? teamRoleLabel(membership.role)
      : 'Platform Admin'

    teamSetupCurrent.innerHTML = `
      <strong>${escapeHtmlText(
        team.teamNumber ? `${team.name} #${team.teamNumber}` : team.name
      )}</strong><br>
      ${escapeHtmlText(roleLabel)}
    `

    teamNameInput.value = team.name || ''
    teamNumberInput.value = team.teamNumber || ''
    teamDescriptionInput.value = team.description || ''
    teamDisplayNameInput.value =
      membership?.displayName ||
      (currentUser?.email ? currentUser.email.split('@')[0] : '')

    renderTeamSetupDepartmentPicker(currentTeamDepartmentIds())
    teamSetupStatus.textContent = ''
  } else {
    teamSetupCurrent.textContent =
      'Creezi o echipă nouă în Team Atlas. Vei deveni Team Leader pentru această echipă.'

    teamNameInput.value = ''
    teamNumberInput.value = ''
    teamDescriptionInput.value = ''
    teamDisplayNameInput.value =
      currentUser?.email ? currentUser.email.split('@')[0] : ''

    renderTeamSetupDepartmentPicker(
      departments
        .filter((item) => item.is_active !== false)
        .map((item) => Number(item.id))
    )

    teamSetupStatus.textContent = ''
  }

  setTeamSetupBusy(false)
}

async function openTeamSetup({ createMode = false } = {}) {
  if (!currentUser) {
    setAccountPanel(true)
    return
  }

  await loadTeamContext()

  const wantsCreate = Boolean(createMode || !currentTeamRecord())

  if (wantsCreate) {
    if (!(canEdit && editorMode)) {
      alert('Crearea unei echipe noi este disponibilă momentan doar editorilor Atlas în Editor Mode.')
      return
    }
  } else if (!canManageCurrentTeam()) {
    alert('Doar Team Leader-ul sau un editor Atlas poate configura această echipă.')
    return
  }

  teamSetupBackdrop.classList.add('open')

  resetTeamSetupForm({
    createMode: wantsCreate
  })
}

function closeTeamSetup() {
  teamSetupBackdrop.classList.remove('open')
  teamSetupMutationBusy = false
}

async function saveTeamSetup() {
  if (!currentUser || teamSetupMutationBusy) return

  const wantsCreate = Boolean(teamSetupCreateMode || !currentTeamRecord())

  if (wantsCreate) {
    if (!(canEdit && editorMode)) {
      alert('Crearea unei echipe noi este disponibilă momentan doar editorilor Atlas în Editor Mode.')
      return
    }
  } else if (!canManageCurrentTeam()) {
    alert('Nu ai permisiunea de a configura această echipă.')
    return
  }

  const name = teamNameInput.value.trim()
  const teamNumber = teamNumberInput.value.trim()
  const description = teamDescriptionInput.value.trim()
  const displayName = teamDisplayNameInput.value.trim()
  const departmentIds = selectedTeamSetupDepartmentIds()

  if (name.length < 2) {
    alert('Numele echipei trebuie să aibă cel puțin 2 caractere.')
    return
  }

  if (displayName.length < 2) {
    alert('Scrie un nume de afișat în Team Atlas.')
    return
  }

  setTeamSetupBusy(true)
  teamSetupStatus.textContent = 'Se salvează...'

  try {
    if (teamSetupCreateMode || !currentTeamRecord()) {
      const { data, error } = await supabase.rpc('atlas_team_create', {
        p_project_id: PROJECT_ID,
        p_name: name,
        p_team_number: teamNumber || null,
        p_description: description,
        p_display_name: displayName,
        p_department_ids: departmentIds
      })

      if (error) throw error

      const createdId = Number(data?.id || data?.team_id || 0)
      if (createdId) {
        activeTeamId = createdId
        localStorage.setItem(CACHE_KEYS.activeTeam, String(createdId))
      }
    } else {
      const team = currentTeamRecord()
      const membership = currentTeamMembership()

      if (!team || (!membership && !canEdit)) {
        throw new Error('Nu există o echipă activă pentru editare.')
      }

      const { error } = await supabase.rpc('atlas_team_update', {
        p_project_id: PROJECT_ID,
        p_team_id: Number(team.id),
        p_name: name,
        p_team_number: teamNumber || null,
        p_description: description,
        p_display_name: displayName,
        p_department_ids: departmentIds
      })

      if (error) throw error
    }

    await loadTeamContext()

    teamSetupCreateMode = false
    resetTeamSetupForm()
    renderAll()

    teamSetupStatus.textContent = 'Salvat.'
  } catch (error) {
    console.error('Team setup save failed:', error)
    teamSetupStatus.textContent = error?.message || 'Eroare la salvare.'
    alert(error?.message || 'Team Space nu a putut fi salvat.')
  } finally {
    setTeamSetupBusy(false)
  }
}


function publicDocumentationIndexNodes() {
  const items = getVisibleNodes()
    .filter((node) => !node.isTeamNode)

  return [...items].sort((a, b) => {
    if (publicIndexSort === 'updated') {
      const bTime = new Date(
        b.updatedAt || b.createdAt || 0
      ).getTime()

      const aTime = new Date(
        a.updatedAt || a.createdAt || 0
      ).getTime()

      if (bTime !== aTime) return bTime - aTime
    }

    return String(a.title || '').localeCompare(
      String(b.title || ''),
      'ro',
      { sensitivity: 'base' }
    )
  })
}

function publicIndexCard(node) {
  const difficulty = nodeDifficultyName(node)
  const tags = nodeTagNames(node)
  const sourceCount = (node.references || []).length
  const codeCount = (node.codeSnippets || []).length
  const fileCount = (node.files || []).length
  const relationCount = (node.links || []).length
  const reviewLabel = documentReviewLabel(node)
  const saved = isNodeBookmarked(node)

  return `
    <article class="team-index-card">
      <div class="team-index-card-main">
        <button
          class="team-index-node-btn"
          type="button"
          data-public-index-node="${Number(node.id)}"
        >
          ${escapeHtmlText(node.title)}
        </button>

        <button
          class="public-index-saved ${saved ? 'active' : ''}"
          type="button"
          data-public-index-save="${Number(node.id)}"
          title="${saved ? 'Remove from saved' : 'Save document'}"
          aria-label="${saved ? 'Remove from saved' : 'Save document'}"
        >
          ${saved ? '★' : '☆'}
        </button>
      </div>

      <div class="team-index-meta">
        <span class="team-index-pill">
          ${escapeHtmlText(difficulty)}
        </span>

        ${tags
          .slice(0, 4)
          .map(
            (tag) => `
              <span class="team-index-pill">
                ${escapeHtmlText(tag)}
              </span>
            `
          )
          .join('')}

        ${
          tags.length > 4
            ? `<span class="team-index-pill">+${tags.length - 4}</span>`
            : ''
        }
      </div>

      <div class="team-index-stats">
        <span>↗ ${sourceCount}</span>
        <span>&lt;/&gt; ${codeCount}</span>
        <span>📎 ${fileCount}</span>
        <span>→ ${relationCount}</span>
      </div>

      <div class="team-index-card-foot">
        ${escapeHtmlText(reviewLabel)}
        ${
          node.updatedAt
            ? ` · Updated ${escapeHtmlText(
                formatPublicDate(node.updatedAt)
              )}`
            : ''
        }
      </div>
    </article>
  `
}

function renderPublicDocumentationIndex() {
  const items = publicDocumentationIndexNodes()

  const controls = `
    <div class="public-index-controls">
      <div class="field">
        <label for="publicIndexGroupInput">Group</label>
        <select
          id="publicIndexGroupInput"
          data-public-index-group
        >
          <option value="category" ${
            publicIndexGroup === 'category' ? 'selected' : ''
          }>Category</option>
          <option value="flat" ${
            publicIndexGroup === 'flat' ? 'selected' : ''
          }>Flat list</option>
        </select>
      </div>

      <div class="field">
        <label for="publicIndexSortInput">Sort</label>
        <select
          id="publicIndexSortInput"
          data-public-index-sort
        >
          <option value="az" ${
            publicIndexSort === 'az' ? 'selected' : ''
          }>A–Z</option>
          <option value="updated" ${
            publicIndexSort === 'updated' ? 'selected' : ''
          }>Recently updated</option>
        </select>
      </div>
    </div>
  `

  if (items.length === 0) {
    return `
      ${controls}

      <article class="public-hub-card wide">
        <span class="public-hub-card-label">Documentation index</span>
        <h3>Niciun document nu corespunde filtrelor curente.</h3>
        <p>
          Indexul folosește același Department, Search, Categories,
          Difficulty și Tags ca harta.
        </p>
      </article>
    `
  }

  if (publicIndexGroup === 'flat') {
    return `
      ${controls}

      <section class="team-index-group">
        <div class="team-index-group-head">
          <h2>All documents</h2>
          <span>
            ${items.length} ${
              items.length === 1 ? 'document' : 'documents'
            }
          </span>
        </div>

        <div class="team-index-grid">
          ${items.map(publicIndexCard).join('')}
        </div>
      </section>
    `
  }

  const groups = new Map()

  for (const node of items) {
    const category = getCategoryById(node.categoryId)
    const key = category?.id ?? 'none'

    if (!groups.has(key)) {
      groups.set(key, {
        category,
        nodes: []
      })
    }

    groups.get(key).nodes.push(node)
  }

  const orderedGroups = [...groups.values()].sort(
    (a, b) => {
      const orderDifference =
        Number(a.category?.sort_order || 0) -
        Number(b.category?.sort_order || 0)

      if (orderDifference !== 0) {
        return orderDifference
      }

      return String(
        a.category?.name || 'Fără categorie'
      ).localeCompare(
        String(
          b.category?.name || 'Fără categorie'
        ),
        'ro',
        { sensitivity: 'base' }
      )
    }
  )

  return `
    ${controls}

    ${orderedGroups
      .map(({ category, nodes: groupNodes }) => {
        const categoryName =
          category?.name || 'Fără categorie'

        return `
          <section class="team-index-group">
            <div class="team-index-group-head">
              <h2>${escapeHtmlText(categoryName)}</h2>
              <span>
                ${groupNodes.length} ${
                  groupNodes.length === 1
                    ? 'document'
                    : 'documents'
                }
              </span>
            </div>

            <div class="team-index-grid">
              ${groupNodes.map(publicIndexCard).join('')}
            </div>
          </section>
        `
      })
      .join('')}
  `
}

function teamDocumentationIndexNodes() {
  return getVisibleNodes()
    .filter((node) => node.isTeamNode)
    .sort((a, b) => {
      const categoryA = getCategoryById(a.categoryId)
      const categoryB = getCategoryById(b.categoryId)

      const categoryOrder =
        Number(categoryA?.sort_order || 0) -
        Number(categoryB?.sort_order || 0)

      if (categoryOrder !== 0) return categoryOrder

      const categoryNameOrder = String(
        categoryA?.name || ''
      ).localeCompare(
        String(categoryB?.name || ''),
        'ro',
        { sensitivity: 'base' }
      )

      if (categoryNameOrder !== 0) return categoryNameOrder

      return String(a.title || '').localeCompare(
        String(b.title || ''),
        'ro',
        { sensitivity: 'base' }
      )
    })
}

function renderTeamDocumentationIndex() {
  const items = teamDocumentationIndexNodes()

  if (items.length === 0) {
    return `
      <article class="public-hub-card wide">
        <span class="public-hub-card-label">Team documentation index</span>
        <h3>Niciun nod nu corespunde filtrelor curente.</h3>
        <p>
          Indexul folosește același departament, Search, Categories,
          Difficulty și Tags ca harta Team Atlas.
        </p>
        <div class="public-hub-empty">
          Curăță filtrele sau revino la hartă pentru a continua explorarea.
        </div>
      </article>
    `
  }

  const groups = new Map()

  for (const node of items) {
    const category = getCategoryById(node.categoryId)
    const key = category?.id ?? 'none'

    if (!groups.has(key)) {
      groups.set(key, {
        category,
        nodes: []
      })
    }

    groups.get(key).nodes.push(node)
  }

  return [...groups.values()]
    .map(({ category, nodes: groupNodes }) => {
      const categoryName =
        category?.name || 'Fără categorie'

      return `
        <section class="team-index-group">
          <div class="team-index-group-head">
            <h2>${escapeHtmlText(categoryName)}</h2>
            <span>
              ${groupNodes.length} ${
                groupNodes.length === 1 ? 'document' : 'documents'
              }
            </span>
          </div>

          <div class="team-index-grid">
            ${groupNodes
              .map((node) => {
                const difficulty = nodeDifficultyName(node)
                const tags = nodeTagNames(node)
                const codeCount = (node.codeSnippets || []).length
                const mediaCount = (node.media || []).length
                const fileCount = (node.files || []).length
                const relationCount = (node.links || []).length

                return `
                  <article class="team-index-card">
                    <div class="team-index-card-main">
                      <button
                        class="team-index-node-btn"
                        type="button"
                        data-team-index-node="${Number(node.id)}"
                      >
                        ${escapeHtmlText(node.title)}
                      </button>

                      <button
                        class="team-index-copy-btn"
                        type="button"
                        data-team-index-copy="${Number(node.id)}"
                        title="Copy private Team Atlas link"
                        aria-label="Copy private Team Atlas link"
                      >
                        🔗
                      </button>
                    </div>

                    <div class="team-index-meta">
                      <span class="team-index-pill">
                        ${escapeHtmlText(difficulty)}
                      </span>

                      ${tags
                        .slice(0, 4)
                        .map(
                          (tag) => `
                            <span class="team-index-pill">
                              ${escapeHtmlText(tag)}
                            </span>
                          `
                        )
                        .join('')}

                      ${
                        tags.length > 4
                          ? `<span class="team-index-pill">+${tags.length - 4}</span>`
                          : ''
                      }

                      ${
                        node.sourcePublicNodeId
                          ? `
                            <span class="team-index-pill source">
                              Public source #${Number(
                                node.sourcePublicNodeId
                              )}
                            </span>
                          `
                          : ''
                      }
                    </div>

                    <div class="team-index-stats">
                      <span>&lt;/&gt; ${codeCount}</span>
                      <span>▣ ${mediaCount}</span>
                      <span>📎 ${fileCount}</span>
                      <span>→ ${relationCount}</span>
                    </div>

                    <div class="team-index-card-foot">
                      ${
                        node.updatedAt
                          ? `Updated ${escapeHtmlText(
                              formatPublicDate(node.updatedAt)
                            )}`
                          : 'Team Atlas document'
                      }
                    </div>
                  </article>
                `
              })
              .join('')}
          </div>
        </section>
      `
    })
    .join('')
}

function openTeamIndexNode(nodeId) {
  const node = teamNodes.find(
    (candidate) => Number(candidate.id) === Number(nodeId)
  )

  if (!node) return

  activePublicSection = 'team'
  localStorage.setItem(
    CACHE_KEYS.publicSection,
    activePublicSection
  )

  syncActiveNodeCollection({ forceReset: true })
  activateDepartmentForNode(node, { persist: true })
  clearFiltersForDeepLink()

  selectedId = node.id
  clearEdgeSelection()
  detailOpen = true

  renderAll()
  setNodeRoute(node, { push: true })

  requestAnimationFrame(() => centerOnNode(node))
}

function publicSectionLabel(section) {
  const labels = {
    explore: 'Explore',
    index: 'Index',
    roadmaps: 'Roadmaps',
    resources: 'Resources',
    announcements: 'Announcements',
    team: 'Team Atlas',
    'team-index': 'Team Index',
    'team-roadmaps': 'Team Roadmaps'
  }

  return labels[section] || 'Explore'
}

function publicSectionEyebrow(section) {
  const labels = {
    explore: 'Explorează Atlasul',
    index: 'Indexul documentației',
    roadmaps: 'Parcursuri recomandate',
    resources: 'Resurse utile',
    announcements: 'Anunțuri universale',
    team: 'Documentația echipei',
    'team-index': 'Indexul documentației echipei',
    'team-roadmaps': 'Parcursuri prin documentația echipei'
  }

  return labels[section] || labels.explore
}

function selectPublicSection(section) {
  if (!PUBLIC_SECTIONS.has(section)) return

  if (
    section !== activePublicSection &&
    hasUnsavedLayoutChanges()
  ) {
    alert(
      'Ai modificări de layout nesalvate. Folosește Save layout sau Discard înainte să schimbi secțiunea.'
    )
    return
  }

  if (
    section !== activePublicSection &&
    layoutEditMode
  ) {
    layoutEditMode = false
    layoutUndoStack = []
    layoutRedoStack = []
  }

  if (
    (
      section === 'team' ||
      section === 'team-index' ||
      section === 'team-roadmaps'
    ) &&
    !currentTeamRecord()
  ) {
    setAccountPanel(true)
    return
  }

  if (isCodeManagerOpen()) {
    closeCodeManager()
  }

  if (isMediaManagerOpen()) {
    closeMediaManager()
  }

  if (isFileManagerOpen()) {
    closeFileManager()
  }

  activePublicSection = section
  localStorage.setItem(CACHE_KEYS.publicSection, section)

  syncActiveNodeCollection({ forceReset: true })
  renderAll()

  if (section === 'explore' || section === 'team') {
    requestAnimationFrame(fitView)
  }
}

function renderPublicShell() {
  if (!appRoot || !publicSectionTabs || !publicHubPanel) return

  const isExplore = activePublicSection === 'explore'
  const isPublicIndex = activePublicSection === 'index'
  const isTeamAtlas = activePublicSection === 'team'
  const isTeamIndex = activePublicSection === 'team-index'
  const isTeamRoadmaps =
    activePublicSection === 'team-roadmaps'
  const isMapSection = isExplore || isTeamAtlas
  const isGlobal = activePublicSection === 'announcements'
  const department = getDepartmentById(activeDepartmentId)
  const departmentName = department?.name || 'Atlas'

  appRoot.classList.toggle('public-section-open', !isMapSection)
  appRoot.dataset.publicSection = activePublicSection

  atlasNavigation?.classList.toggle('global-section', isGlobal)

  publicSectionTabs.querySelectorAll('[data-public-section]').forEach((button) => {
    const selected = button.dataset.publicSection === activePublicSection

    button.classList.toggle('active', selected)
    button.setAttribute('aria-selected', selected ? 'true' : 'false')
  })

  if (atlasNavigationEyebrow) {
    atlasNavigationEyebrow.textContent = publicSectionEyebrow(activePublicSection)
  }

  if (isMapSection) {
    publicHubPanel.classList.remove('open')
    publicHubPanel.innerHTML = ''
    return
  }

  publicHubPanel.classList.add('open')

  if (isPublicIndex) {
    const visibleItems = publicDocumentationIndexNodes()

    publicHubPanel.innerHTML = `
      <div class="public-hub-inner">
        <p class="public-hub-kicker">
          Documentation Index · ${escapeHtml(departmentName)}
        </p>

        <h1 class="public-hub-title">
          Toată documentația publică într-o vedere rapidă, fără să depinzi de hartă.
        </h1>

        <p class="public-hub-description">
          Indexul este o vedere alternativă peste aceleași noduri Public Atlas.
          Search-ul și filtrele curente se aplică automat, iar orice rezultat
          deschide documentul original în Explore.
        </p>

        <div class="team-index-summary">
          <span class="public-hub-chip">${escapeHtml(departmentName)}</span>
          <span class="public-hub-chip">${visibleItems.length} documents</span>
          <span class="public-hub-chip">Public</span>
          <span class="public-hub-chip">
            ${publicIndexSort === 'updated' ? 'Recently updated' : 'A–Z'}
          </span>
        </div>

        ${renderPublicDocumentationIndex()}
      </div>
    `
    return
  }

  if (isTeamIndex) {
    const team = currentTeamRecord()
    const teamName = team?.teamNumber
      ? `${team.name} #${team.teamNumber}`
      : team?.name || 'Team Atlas'

    const visibleItems = teamDocumentationIndexNodes()

    publicHubPanel.innerHTML = `
      <div class="public-hub-inner">
        <p class="public-hub-kicker">
          Team Index · ${escapeHtml(teamName)} · ${escapeHtml(
            departmentName
          )}
        </p>

        <h1 class="public-hub-title">
          Găsește rapid documentația echipei fără să navighezi manual prin hartă.
        </h1>

        <p class="public-hub-description">
          Indexul este o vedere alternativă peste exact aceleași noduri Team Atlas.
          Search-ul și filtrele curente se aplică automat, iar fiecare rezultat
          deschide nodul original din hartă.
        </p>

        <div class="team-index-summary">
          <span class="public-hub-chip">${escapeHtml(teamName)}</span>
          <span class="public-hub-chip">${escapeHtml(departmentName)}</span>
          <span class="public-hub-chip">${visibleItems.length} documents</span>
          <span class="public-hub-chip">Private team scope</span>
        </div>

        ${renderTeamDocumentationIndex()}
      </div>
    `
    return
  }

  if (isTeamRoadmaps) {
    const team = currentTeamRecord()

    const teamName = team?.teamNumber
      ? `${team.name} #${team.teamNumber}`
      : team?.name || 'Team Atlas'

    publicHubPanel.innerHTML = `
      <div class="public-hub-inner">
        <p class="public-hub-kicker">
          Team Roadmaps · ${escapeHtml(teamName)} · ${escapeHtml(
            departmentName
          )}
        </p>

        <h1 class="public-hub-title">
          Parcursuri recomandate prin documentația internă.
        </h1>

        <p class="public-hub-description">
          Roadmap-urile organizează ordinea în care merită citite și înțelese
          nodurile Team Atlas. Nu sunt task-uri, nu au deadline-uri, nu blochează
          documentația și progresul este personal.
        </p>

        <div class="public-hub-meta">
          <span class="public-hub-chip">${escapeHtml(teamName)}</span>
          <span class="public-hub-chip">${escapeHtml(departmentName)}</span>
          <span class="public-hub-chip">
            ${visibleTeamRoadmaps().length} team roadmaps
          </span>
          <span class="public-hub-chip">Zero locks</span>
        </div>

        ${teamRoadmapManagerButton()}
        ${renderTeamRoadmapCards()}
      </div>
    `
    return
  }

  if (activePublicSection === 'roadmaps') {
    publicHubPanel.innerHTML = `
      <div class="public-hub-inner">
        <p class="public-hub-kicker">Roadmaps · ${escapeHtml(departmentName)}</p>
        <h1 class="public-hub-title">Învață în ordinea care are sens pentru tine.</h1>
        <p class="public-hub-description">
          Roadmap-urile oferă un traseu recomandat prin Atlas, dar nu blochează noduri.
          Toată documentația publică rămâne accesibilă oricând.
        </p>

        <div class="public-hub-meta">
          <span class="public-hub-chip">${escapeHtml(departmentName)}</span>
          <span class="public-hub-chip">Acces liber la toate nodurile</span>
          <span class="public-hub-chip">${visibleRoadmaps().length} roadmaps</span>
        </div>

        ${roadmapManagerButton()}
        ${renderRoadmapCards()}
      </div>
    `
    return
  }

  if (activePublicSection === 'resources') {
    publicHubPanel.innerHTML = `
      <div class="public-hub-inner">
        <p class="public-hub-kicker">Resources · ${escapeHtml(departmentName)}</p>
        <h1 class="public-hub-title">Documentație și resurse care merită păstrate aproape.</h1>
        <p class="public-hub-description">
          Aici sunt grupate resurse relevante pentru departamentul selectat:
          documentație oficială, ghiduri și materiale de referință.
        </p>

        <div class="public-hub-meta">
          <span class="public-hub-chip">${escapeHtml(departmentName)}</span>
          <span class="public-hub-chip">Surse externe + resurse Atlas</span>
          <span class="public-hub-chip">${visibleResources().length} resources</span>
        </div>

        ${publicManagerButton('resources')}
        ${renderResourceCards()}
      </div>
    `
    return
  }

  publicHubPanel.innerHTML = `
    <div class="public-hub-inner">
      <p class="public-hub-kicker">Universal · Announcements</p>
      <h1 class="public-hub-title">Announcements</h1>
      <p class="public-hub-description">
        Actualizări publice importante pentru comunitatea Atlas: Game Manual, sezon,
        events, resurse și schimbări relevante ale platformei.
      </p>

      <div class="public-hub-meta">
        <span class="public-hub-chip">Universal</span>
        <span class="public-hub-chip">Public</span>
        <span class="public-hub-chip">${publishedAnnouncements().length} announcements</span>
      </div>

      ${publicManagerButton('announcements')}
      ${renderAnnouncementCards()}
    </div>
  `
}


function maybeOpenPendingTeamInvite() {
  const token = pendingInviteToken()
  if (!token) return

  if (!currentUser) {
    setAccountPanel(true)
    return
  }

  const matchingInvite = teamInvites.some((invite) => invite.token === token)
  if (matchingInvite) {
    setAccountPanel(true)
  }
}

function setAccountPanel(open) {
  if (!accountPanel || !accountBtn) return

  const shouldOpen = Boolean(open)

  accountPanel.hidden = !shouldOpen
  accountBtn.classList.toggle('active', shouldOpen)
  accountBtn.setAttribute('aria-expanded', shouldOpen ? 'true' : 'false')

  if (shouldOpen && toolPanel?.classList.contains('collapsed')) {
    togglePanel(false)
  }
}

function getDepartmentById(id) {
  return departments.find((item) => Number(item.id) === Number(id)) || null
}

function getDepartmentBySlug(slug) {
  return departments.find((item) => item.slug === slug) || null
}

function nodeDepartmentIds(node) {
  if (Array.isArray(node?.departmentIds) && node.departmentIds.length > 0) {
    return node.departmentIds.map(Number)
  }

  // Backwards-compatible fallback while the editor is being reworked:
  // old or newly-created unmapped nodes remain visible in Programming.
  const programming = getDepartmentBySlug('programming')
  return programming ? [Number(programming.id)] : []
}

function nodeDepartmentNames(node) {
  return nodeDepartmentIds(node)
    .map((id) => getDepartmentById(id)?.name)
    .filter(Boolean)
}

function normalizeDepartmentState() {
  const activeDepartments = departments.filter((item) => item.is_active !== false)

  if (activeDepartments.length === 0) {
    activeDepartmentId = null
    return
  }

  const requestedSlug = localStorage.getItem(CACHE_KEYS.department)
  const requested = requestedSlug
    ? activeDepartments.find((item) => item.slug === requestedSlug)
    : null

  if (requested) {
    activeDepartmentId = Number(requested.id)
    return
  }

  const currentStillExists = activeDepartments.some(
    (item) => Number(item.id) === Number(activeDepartmentId)
  )

  if (currentStillExists) return

  // Programming remains the default landing department during the migration.
  // Universal becomes the broader entry point as its content is expanded.
  const programming = activeDepartments.find((item) => item.slug === 'programming')
  activeDepartmentId = Number((programming || activeDepartments[0]).id)
}

function matchesDepartment(node) {
  if (activeDepartmentId == null) return true

  return nodeDepartmentIds(node).some(
    (id) => Number(id) === Number(activeDepartmentId)
  )
}

function getDepartmentNodes() {
  return nodes.filter((node) => matchesDepartment(node))
}

function activateDepartmentForNode(node, { persist = false } = {}) {
  if (!node) return

  const ids = nodeDepartmentIds(node)
  if (ids.length === 0) return

  if (ids.some((id) => Number(id) === Number(activeDepartmentId))) return

  activeDepartmentId = Number(ids[0])

  if (persist) {
    const department = getDepartmentById(activeDepartmentId)
    if (department) {
      localStorage.setItem(CACHE_KEYS.department, department.slug)
    }
  }
}

function selectDepartment(id) {
  const department = getDepartmentById(id)
  if (!department || department.is_active === false) return

  activeDepartmentId = Number(department.id)
  localStorage.setItem(CACHE_KEYS.department, department.slug)

  normalizeSelectionAfterFilters()
  renderAll()

  if (activePublicSection === 'explore') {
    requestAnimationFrame(fitView)
  }
}

function renderDepartmentNavigation() {
  if (!departmentTabs) return

  const active = departments
    .filter((item) => item.is_active !== false)
    .sort((a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0))

  const current = getDepartmentById(activeDepartmentId)

  if (activeDepartmentTitle) {
    activeDepartmentTitle.textContent = current?.name || 'Atlas'
  }

  if (departmentContext) {
    departmentContext.textContent = current?.slug === 'universal' ? 'universal' : 'departament'
  }

  if (active.length === 0) {
    departmentTabs.innerHTML =
      '<span class="department-tabs-loading">Nu există departamente active.</span>'
    return
  }

  departmentTabs.innerHTML = active
    .map((department) => {
      const count = nodes.filter((node) =>
        nodeDepartmentIds(node).some((id) => Number(id) === Number(department.id))
      ).length

      const selected = Number(department.id) === Number(activeDepartmentId)

      return `
        <button
          class="department-tab ${selected ? 'active' : ''}"
          type="button"
          role="tab"
          aria-selected="${selected ? 'true' : 'false'}"
          data-department-id="${Number(department.id)}"
        >
          <span class="department-tab-name">${escapeHtml(
            department.short_name || department.name
          )}</span>
          <span class="department-tab-count">${count}</span>
        </button>
      `
    })
    .join('')

  departmentTabs.querySelectorAll('[data-department-id]').forEach((button) => {
    button.addEventListener('click', () => {
      selectDepartment(Number(button.dataset.departmentId))
    })
  })
}

function normalizeTaxonomyState() {
  const activeCategoryIds = new Set(
    categories.filter((item) => item.is_active !== false).map((item) => Number(item.id))
  )

  const activeDifficultyIds = new Set(
    difficulties.filter((item) => item.is_active !== false).map((item) => Number(item.id))
  )

  const activeTagIds = new Set(
    taxonomyTags.filter((item) => item.is_active !== false).map((item) => Number(item.id))
  )

  if (categoryFilterId != null && !activeCategoryIds.has(Number(categoryFilterId))) {
    categoryFilterId = null
  }

  if (difficultyFilterId != null && !activeDifficultyIds.has(Number(difficultyFilterId))) {
    difficultyFilterId = null
  }

  tagFilterIds = new Set([...tagFilterIds].map(Number).filter((id) => activeTagIds.has(id)))

  nodeTagDraft = new Set(
    [...nodeTagDraft]
      .map(Number)
      .filter((id) => taxonomyTags.some((item) => Number(item.id) === id))
  )
}

function nodeCategoryName(node) {
  return getCategoryById(node.categoryId)?.name || 'Fără categorie'
}

function nodeDifficultyName(node) {
  return getDifficultyById(node.difficultyId)?.name || 'Nespecificată'
}

function nodeTagNames(node) {
  return (node.tagIds || []).map((id) => getTagById(id)?.name).filter(Boolean)
}

function matchesSearch(node) {
  if (!searchQuery.trim()) return true

  const q = searchQuery.trim().toLowerCase()
  const haystack = [
    node.title,
    nodeContentPlainText(node),
    nodeCategoryName(node),
    nodeDifficultyName(node),
    ...nodeDepartmentNames(node),
    ...nodeTagNames(node),
    ...(node.media || []).flatMap((media) => [media.title || '', media.caption || '']),
    ...(node.files || []).flatMap((file) => [
      file.title || '',
      file.description || '',
      file.originalName || '',
      file.relativePath || '',
      file.mimeType || ''
    ]),
    ...(node.codeSnippets || []).flatMap((snippet) => [
      snippet.title || '',
      snippet.description || '',
      snippet.language || '',
      snippet.code || ''
    ]),
    ...(node.references || []).flatMap((reference) => [
      reference.title || '',
      reference.url || '',
      reference.sourceType || '',
      reference.note || ''
    ])
  ]
    .join(' ')
    .toLowerCase()

  return haystack.includes(q)
}

function matchesTaxonomyFilters(node) {
  if (categoryFilterId != null && Number(node.categoryId) !== Number(categoryFilterId)) {
    return false
  }

  if (difficultyFilterId != null && Number(node.difficultyId) !== Number(difficultyFilterId)) {
    return false
  }

  if (tagFilterIds.size > 0) {
    const nodeTags = new Set((node.tagIds || []).map(Number))

    for (const tagId of tagFilterIds) {
      if (!nodeTags.has(Number(tagId))) return false
    }
  }

  return true
}

function getVisibleNodes() {
  return nodes.filter(
    (node) =>
      matchesDepartment(node) &&
      matchesSearch(node) &&
      matchesTaxonomyFilters(node)
  )
}

function getVisibleNodeIdSet() {
  return new Set(getVisibleNodes().map((node) => Number(node.id)))
}

function hasActiveFilters() {
  return Boolean(
    searchQuery.trim() ||
    categoryFilterId != null ||
    difficultyFilterId != null ||
    tagFilterIds.size > 0
  )
}

function normalizeSelectionAfterFilters() {
  const visible = getVisibleNodes()
  const visibleIds = new Set(visible.map((node) => Number(node.id)))

  if (selectedId != null && !visibleIds.has(Number(selectedId))) {
    selectedId = visible[0]?.id ?? null
    selectedEdge = null
    selectedEdgePointIndex = null
    detailOpen = false
  }

  if (selectedEdge) {
    const valid =
      visibleIds.has(Number(selectedEdge.sourceId)) && visibleIds.has(Number(selectedEdge.targetId))

    if (!valid) {
      selectedEdge = null
      selectedEdgePointIndex = null
    }
  }
}

// Output sanitization and URL validation
function escapeHtml(str) {
  return String(str)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
    .replaceAll('\n', '<br>')
}

function escapeHtmlText(str) {
  return String(str)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}


const RICH_TEXT_ALLOWED_TAGS = new Set([
  'P',
  'DIV',
  'BR',
  'STRONG',
  'B',
  'EM',
  'I',
  'U',
  'H2',
  'H3',
  'H4',
  'UL',
  'OL',
  'LI',
  'BLOCKQUOTE',
  'A',
  'FONT'
])

const RICH_TEXT_REMOVE_WITH_CONTENT = new Set([
  'SCRIPT',
  'STYLE',
  'IFRAME',
  'OBJECT',
  'EMBED',
  'SVG',
  'MATH',
  'FORM',
  'INPUT',
  'BUTTON',
  'TEXTAREA',
  'SELECT',
  'OPTION'
])

function sanitizeRichHtml(rawHtml) {
  const template = document.createElement('template')
  template.innerHTML = String(rawHtml || '')

  const cleanNode = (node) => {
    if (node.nodeType === Node.TEXT_NODE) return

    if (node.nodeType !== Node.ELEMENT_NODE) {
      node.remove()
      return
    }

    const tag = node.tagName

    if (RICH_TEXT_REMOVE_WITH_CONTENT.has(tag)) {
      node.remove()
      return
    }

    if (!RICH_TEXT_ALLOWED_TAGS.has(tag)) {
      for (const child of [...node.childNodes]) {
        cleanNode(child)
      }

      const parent = node.parentNode
      if (!parent) return

      while (node.firstChild) {
        parent.insertBefore(node.firstChild, node)
      }

      node.remove()
      return
    }

    for (const attribute of [...node.attributes]) {
      const name = attribute.name.toLowerCase()

      if (tag === 'A' && name === 'href') continue
      if (tag === 'A' && (name === 'target' || name === 'rel')) continue
      if (tag === 'FONT' && name === 'size') continue

      node.removeAttribute(attribute.name)
    }

    if (tag === 'A') {
      const href = normalizeHttpUrl(node.getAttribute('href'))

      if (!href) {
        node.removeAttribute('href')
        node.removeAttribute('target')
        node.removeAttribute('rel')
      } else {
        node.setAttribute('href', href)
        node.setAttribute('target', '_blank')
        node.setAttribute('rel', 'noopener noreferrer')
      }
    }

    if (tag === 'FONT') {
      const size = Number(node.getAttribute('size'))
      const safeSize = Number.isFinite(size) ? Math.max(1, Math.min(5, Math.round(size))) : 3
      node.setAttribute('size', String(safeSize))
    }

    for (const child of [...node.childNodes]) {
      cleanNode(child)
    }
  }

  for (const child of [...template.content.childNodes]) {
    cleanNode(child)
  }

  return template.innerHTML.trim()
}

function plainTextToRichHtml(value) {
  const text = String(value || '').replace(/\r\n?/g, '\n').trim()
  if (!text) return ''

  return `<p>${escapeHtmlText(text).replaceAll('\n', '<br>')}</p>`
}

function richHtmlToPlainText(value) {
  const holder = document.createElement('div')
  holder.innerHTML = sanitizeRichHtml(value)

  const text = holder.innerText || holder.textContent || ''
  return text.replace(/\u00a0/g, ' ').replace(/[ \t]+\n/g, '\n').trim()
}

function nodeContentPlainText(node) {
  if (!node) return ''

  return node.contentFormat === 'html'
    ? richHtmlToPlainText(node.content)
    : String(node.content || '')
}

function renderNodeDocumentation(node) {
  if (!node) return '<div class="doc-text plain"></div>'

  if (node.contentFormat === 'html') {
    const safeHtml = sanitizeRichHtml(node.content)
    return `<div class="doc-text rich">${safeHtml || '<p>Fără documentație încă.</p>'}</div>`
  }

  return `<div class="doc-text plain">${escapeHtml(node.content || 'Fără documentație încă.')}</div>`
}

function setRichEditorHtml(value) {
  contentRichEditor.innerHTML = sanitizeRichHtml(value)
}

function getRichEditorHtml() {
  const safeHtml = sanitizeRichHtml(contentRichEditor.innerHTML)
  const plainText = richHtmlToPlainText(safeHtml)

  return plainText ? safeHtml : ''
}

let richSelectionRange = null

function rememberRichSelection() {
  const selection = window.getSelection()
  if (!selection || selection.rangeCount === 0) return

  const range = selection.getRangeAt(0)
  const common = range.commonAncestorContainer
  const element = common.nodeType === Node.ELEMENT_NODE ? common : common.parentElement

  if (element && contentRichEditor.contains(element)) {
    richSelectionRange = range.cloneRange()
  }
}

function restoreRichSelection() {
  if (!richSelectionRange) return false

  const selection = window.getSelection()
  if (!selection) return false

  selection.removeAllRanges()
  selection.addRange(richSelectionRange)
  return true
}

function updateRichToolbarState() {
  if (document.activeElement !== contentRichEditor && !contentRichEditor.contains(document.activeElement)) {
    return
  }

  richEditorToolbar.querySelectorAll('[data-rich-command]').forEach((button) => {
    const command = button.dataset.richCommand
    const stateful = ['bold', 'italic', 'underline', 'insertUnorderedList', 'insertOrderedList']
    button.classList.toggle('active', stateful.includes(command) && document.queryCommandState(command))
  })
}

function runRichCommand(command, value = null) {
  contentRichEditor.focus({ preventScroll: true })
  restoreRichSelection()
  document.execCommand(command, false, value)
  rememberRichSelection()
  updateRichToolbarState()
}

function setNodeContentEditorVisible(isNodeMode) {
  richEditorShell.style.display = isNodeMode ? 'block' : 'none'
  richEditorHint.style.display = isNodeMode ? 'block' : 'none'
  contentInput.style.display = isNodeMode ? 'none' : 'block'
  contentInputLabel.htmlFor = isNodeMode ? 'contentRichEditor' : 'contentInput'
}

function initRichTextEditor() {
  try {
    document.execCommand('defaultParagraphSeparator', false, 'p')
  } catch {}

  richEditorToolbar.querySelectorAll('button').forEach((button) => {
    button.addEventListener('mousedown', (event) => event.preventDefault())
  })

  richEditorToolbar.querySelectorAll('[data-rich-command]').forEach((button) => {
    button.addEventListener('click', () => {
      runRichCommand(button.dataset.richCommand)
    })
  })

  richBlockSelect.addEventListener('change', () => {
    runRichCommand('formatBlock', richBlockSelect.value)
    richBlockSelect.value = 'p'
  })

  richFontSizeSelect?.addEventListener('change', () => {
    runRichCommand('fontSize', richFontSizeSelect.value)
    richFontSizeSelect.value = '3'
  })

  richEditorToolbar.querySelectorAll('[data-rich-block]').forEach((button) => {
    button.addEventListener('click', () => {
      runRichCommand('formatBlock', button.dataset.richBlock)
      button.closest('.rich-editor-more')?.removeAttribute('open')
    })
  })

  richLinkBtn.addEventListener('mousedown', (event) => event.preventDefault())
  richLinkBtn.addEventListener('click', () => {
    contentRichEditor.focus({ preventScroll: true })
    restoreRichSelection()

    const selection = window.getSelection()
    if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
      alert('Selectează mai întâi textul pe care vrei să pui link-ul.')
      return
    }

    const input = window.prompt('Link HTTPS:')
    if (input == null) return

    const url = normalizeHttpUrl(input)
    if (!url) {
      alert('Link invalid. Folosește o adresă http:// sau https://.')
      return
    }

    runRichCommand('createLink', url)

    contentRichEditor.querySelectorAll('a[href]').forEach((anchor) => {
      anchor.target = '_blank'
      anchor.rel = 'noopener noreferrer'
    })
  })

  contentRichEditor.addEventListener('paste', (event) => {
    event.preventDefault()

    const html = event.clipboardData?.getData('text/html') || ''
    const text = event.clipboardData?.getData('text/plain') || ''

    if (html) {
      document.execCommand('insertHTML', false, sanitizeRichHtml(html))
    } else {
      document.execCommand('insertText', false, text)
    }

    rememberRichSelection()
  })

  contentRichEditor.addEventListener('input', () => {
    rememberRichSelection()
    updateRichToolbarState()
  })

  contentRichEditor.addEventListener('keyup', rememberRichSelection)
  contentRichEditor.addEventListener('mouseup', rememberRichSelection)

  document.addEventListener('selectionchange', () => {
    rememberRichSelection()
    updateRichToolbarState()
  })
}

function normalizeHttpUrl(value) {
  const raw = String(value || '').trim()
  if (!raw) return null

  try {
    const url = new URL(raw)
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      return null
    }
    return url.toString()
  } catch {
    return null
  }
}

function getYoutubeEmbedUrl(value) {
  const normalized = normalizeHttpUrl(value)
  if (!normalized) return null

  try {
    const url = new URL(normalized)
    let videoId = null

    if (url.hostname === 'youtu.be') {
      videoId = url.pathname.split('/').filter(Boolean)[0] || null
    } else if (
      url.hostname.endsWith('youtube.com') ||
      url.hostname.endsWith('youtube-nocookie.com')
    ) {
      videoId = url.searchParams.get('v')

      if (!videoId) {
        const parts = url.pathname.split('/').filter(Boolean)
        const markerIndex = parts.findIndex((part) => ['embed', 'shorts', 'live'].includes(part))
        if (markerIndex >= 0) videoId = parts[markerIndex + 1] || null
      }
    }

    if (!videoId || !/^[a-zA-Z0-9_-]{6,20}$/.test(videoId)) {
      return null
    }

    return `https://www.youtube-nocookie.com/embed/${videoId}`
  } catch {
    return null
  }
}

function mediaPublicUrl(media) {
  if (media?.signedUrl) {
    return media.signedUrl
  }

  if (media?.storagePath) {
    if (media.isTeamMedia) return null

    const { data } = supabase.storage
      .from(MEDIA_BUCKET)
      .getPublicUrl(media.storagePath)

    return data?.publicUrl || null
  }

  return normalizeHttpUrl(media?.externalUrl)
}

function sanitizeStorageFilename(filename) {
  const raw = String(filename || 'media')
  const dotIndex = raw.lastIndexOf('.')
  const extension =
    dotIndex >= 0
      ? raw
          .slice(dotIndex)
          .toLowerCase()
          .replace(/[^a-z0-9.]/g, '')
      : ''

  const base =
    (dotIndex >= 0 ? raw.slice(0, dotIndex) : raw)
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 70) || 'media'

  return `${base}${extension.slice(0, 10)}`
}

function humanFileSize(bytes) {
  const value = Number(bytes) || 0
  if (value < 1024) return `${value} B`
  if (value < 1024 ** 2) return `${(value / 1024).toFixed(1)} KB`
  return `${(value / 1024 ** 2).toFixed(1)} MB`
}

function mediaTypeLabel(media) {
  if (media.mediaType === 'image') return 'Imagine'
  if (media.mediaType === 'youtube') return 'YouTube'
  return 'Videoclip'
}

// Media presentation helpers
function renderMediaPreview(media, compact = false) {
  const url = mediaPublicUrl(media)
  if (!url) {
    return '<div class="media-preview-missing">Fișier indisponibil</div>'
  }

  if (media.mediaType === 'image') {
    return `
      <a class="media-image-link" href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">
        <img src="${escapeHtml(url)}" alt="${escapeHtml(media.title || media.caption || 'Screenshot FTC')}" loading="lazy">
      </a>
    `
  }

  if (media.mediaType === 'youtube') {
    const embedUrl = getYoutubeEmbedUrl(url)
    if (!embedUrl) {
      return `<a class="media-external-link" href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">Deschide videoclipul</a>`
    }

    return `
      <div class="media-video-frame">
        <iframe
          src="${escapeHtml(embedUrl)}"
          title="${escapeHtml(media.title || 'Videoclip YouTube')}"
          loading="lazy"
          referrerpolicy="strict-origin-when-cross-origin"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowfullscreen
        ></iframe>
      </div>
    `
  }

  return `
    <video
      class="media-video"
      controls
      preload="${compact ? 'metadata' : 'metadata'}"
      src="${escapeHtml(url)}"
    ></video>
  `
}

function renderNodeMediaGallery(node) {
  const mediaItems = Array.isArray(node.media) ? node.media : []
  const editable = canEditNode(node) && editorMode

  if (mediaItems.length === 0 && !editable) return ''

  return `
    <details class="document-disclosure" data-document-section="media">
      <summary>
        <span>Media</span>
        <span class="document-disclosure-count">${mediaItems.length}</span>
      </summary>
      <div class="document-disclosure-body">
        ${
          mediaItems.length
            ? `
              ${editable ? '<div class="node-media-heading"><span></span><button class="btn" type="button" data-open-node-media>Administrează</button></div>' : ''}
              <div class="media-gallery">
                ${mediaItems
                  .map((media) => `
                    <article class="media-card">
                      <div class="media-preview">${renderMediaPreview(media)}</div>
                      ${
                        media.title || media.caption
                          ? `<div class="media-card-copy">${media.title ? `<strong>${escapeHtml(media.title)}</strong>` : ''}${media.caption ? `<p>${escapeHtml(media.caption)}</p>` : ''}</div>`
                          : ''
                      }
                    </article>
                  `)
                  .join('')}
              </div>
            `
            : `<div class="document-disclosure-empty"><span>Nicio media.</span><button class="btn" type="button" data-open-node-media>Adaugă media</button></div>`
        }
      </div>
    </details>
  `
}

// General file presentation helpers
function filePublicUrl(file) {
  if (!file?.storagePath) return null
  if (file.signedUrl) return file.signedUrl
  if (file.isTeamFile) return null

  const { data } = supabase.storage
    .from(FILE_BUCKET)
    .getPublicUrl(file.storagePath)

  return data?.publicUrl || null
}

function fileDisplayPath(file) {
  const folder = String(file?.relativePath || '').replace(/^\/+|\/+$/g, '')
  return folder ? `${folder}/${file.originalName || 'fișier'}` : file.originalName || 'fișier'
}

function fileExtensionLabel(filename) {
  const name = String(filename || '')
  const dot = name.lastIndexOf('.')
  if (dot <= 0 || dot === name.length - 1) return 'FILE'
  return name.slice(dot + 1).toUpperCase().slice(0, 6)
}

function sanitizeStoragePathSegment(segment, fallback = 'folder') {
  return (
    String(segment || '')
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9._-]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 70) || fallback
  )
}

function folderPathFromBrowserFile(file) {
  const rawPath = String(file?.webkitRelativePath || '').replace(/\\/g, '/')
  const parts = rawPath.split('/').filter(Boolean)
  if (parts.length <= 1) return ''
  return parts.slice(0, -1).join('/')
}

function storagePathForNodeFile(nodeId, file, relativePath, batchId) {
  const safeFolder = String(relativePath || '')
    .replace(/\\/g, '/')
    .split('/')
    .filter(Boolean)
    .map((part) => sanitizeStoragePathSegment(part))
    .join('/')
  const safeName = sanitizeStorageFilename(file?.name || 'file')
  return [PROJECT_ID, Number(nodeId), batchId, safeFolder, safeName]
    .filter(Boolean)
    .join('/')
}

function storagePathForTeamNodeFile(node, file, relativePath, batchId) {
  const safeFolder = String(relativePath || '')
    .replace(/\\/g, '/')
    .split('/')
    .filter(Boolean)
    .map((part) => sanitizeStoragePathSegment(part))
    .join('/')
  const safeName = sanitizeStorageFilename(file?.name || 'file')

  return [
    PROJECT_ID,
    Number(node.teamId || activeTeamId),
    Number(node.id),
    batchId,
    safeFolder,
    safeName
  ]
    .filter(Boolean)
    .join('/')
}

async function createTeamSignedUrl(bucket, storagePath) {
  if (!storagePath) return null

  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(storagePath, TEAM_SIGNED_URL_TTL_SECONDS)

  if (error) {
    console.warn('Team attachment signed URL failed:', {
      bucket,
      storagePath,
      error
    })
    return null
  }

  return data?.signedUrl || null
}

function groupNodeFilesByFolder(files) {
  const groups = new Map()
  for (const file of files || []) {
    const folder = String(file.relativePath || '').replace(/^\/+|\/+$/g, '')
    if (!groups.has(folder)) groups.set(folder, [])
    groups.get(folder).push(file)
  }
  return groups
}

function renderNodeFiles(node) {
  const files = Array.isArray(node.files) ? node.files : []
  const editable = canEditNode(node) && editorMode

  if (files.length === 0 && !editable) return ''

  const groups = groupNodeFilesByFolder(files)
  const groupsHtml = [...groups.entries()]
    .map(([folder, items]) => `
      <div class="file-folder-group">
        <div class="file-folder-label">📁 <code>${escapeHtml(folder || 'Rădăcina nodului')}</code></div>
        <div class="node-file-list">
          ${items
            .map((file) => {
              const url = filePublicUrl(file)
              return `
                <article class="node-file-row">
                  <div class="node-file-icon">${escapeHtml(fileExtensionLabel(file.originalName))}</div>
                  <div class="node-file-copy">
                    <strong>${escapeHtml(file.title || file.originalName)}</strong>
                    <span>${escapeHtml(file.originalName)} · ${escapeHtml(humanFileSize(file.fileSize))}</span>
                    ${file.description ? `<p>${escapeHtml(file.description)}</p>` : ''}
                  </div>
                  ${url ? `<a class="btn file-download-btn" href="${escapeHtml(url)}" download="${escapeHtml(file.originalName)}" target="_blank" rel="noopener noreferrer">Descarcă</a>` : '<span class="file-download-btn">Indisponibil</span>'}
                </article>
              `
            })
            .join('')}
        </div>
      </div>
    `)
    .join('')

  return `
    <details class="document-disclosure" data-document-section="files">
      <summary><span>Fișiere</span><span class="document-disclosure-count">${files.length}</span></summary>
      <div class="document-disclosure-body">
        ${
          files.length
            ? `${editable ? '<div class="node-files-heading"><span></span><button class="btn" type="button" data-open-node-files>Administrează</button></div>' : ''}${groupsHtml}`
            : `<div class="document-disclosure-empty"><span>Niciun fișier.</span><button class="btn" type="button" data-open-node-files>Adaugă fișiere</button></div>`
        }
      </div>
    </details>
  `
}

// Code snippet presentation helpers
const CODE_LANGUAGES = [
  ['java', 'Java'],
  ['python', 'Python'],
  ['kotlin', 'Kotlin'],
  ['cpp', 'C++'],
  ['javascript', 'JavaScript'],
  ['json', 'JSON'],
  ['xml', 'XML'],
  ['bash', 'Bash / Terminal'],
  ['text', 'Text simplu']
]

function codeLanguageLabel(language) {
  const normalized = String(language || 'text').toLowerCase()
  return CODE_LANGUAGES.find(([value]) => value === normalized)?.[1] || normalized
}


function bookmarkKeyForNode(node) {
  if (!node) return ''

  return node.isTeamNode
    ? `team:${Number(node.teamId)}:${Number(node.id)}`
    : `public:${Number(node.id)}`
}

function bookmarkKeyForRow(row) {
  if (!row) return ''

  return row.nodeScope === 'team'
    ? `team:${Number(row.teamId)}:${Number(row.teamNodeId)}`
    : `public:${Number(row.publicNodeId)}`
}

function isNodeBookmarked(node) {
  return bookmarkKeys.has(bookmarkKeyForNode(node))
}

function readLocalBookmarkRows() {
  try {
    const parsed = JSON.parse(
      localStorage.getItem(CACHE_KEYS.localBookmarks) || '[]'
    )

    if (!Array.isArray(parsed)) return []

    return parsed
      .filter(
        (row) =>
          row &&
          row.nodeScope === 'public' &&
          Number.isFinite(Number(row.publicNodeId))
      )
      .slice(0, 80)
      .map((row) => ({
        id: null,
        nodeScope: 'public',
        publicNodeId: Number(row.publicNodeId),
        teamId: null,
        teamNodeId: null,
        titleSnapshot: String(row.titleSnapshot || 'Public document'),
        createdAt: row.createdAt || new Date().toISOString(),
        isLocal: true
      }))
  } catch {
    return []
  }
}

function writeLocalBookmarkRows(rows) {
  const serializable = (rows || [])
    .filter((row) => row.nodeScope === 'public')
    .slice(0, 80)
    .map((row) => ({
      nodeScope: 'public',
      publicNodeId: Number(row.publicNodeId),
      titleSnapshot: String(row.titleSnapshot || 'Public document'),
      createdAt: row.createdAt || new Date().toISOString()
    }))

  localStorage.setItem(
    CACHE_KEYS.localBookmarks,
    JSON.stringify(serializable)
  )
}

function normalizeBookmarkRow(row) {
  return {
    id: row.id == null ? null : Number(row.id),
    nodeScope: row.node_scope || row.nodeScope || 'public',
    publicNodeId:
      row.public_node_id == null && row.publicNodeId == null
        ? null
        : Number(row.public_node_id ?? row.publicNodeId),
    teamId:
      row.team_id == null && row.teamId == null
        ? null
        : Number(row.team_id ?? row.teamId),
    teamNodeId:
      row.team_node_id == null && row.teamNodeId == null
        ? null
        : Number(row.team_node_id ?? row.teamNodeId),
    titleSnapshot:
      row.title_snapshot || row.titleSnapshot || 'Document',
    createdAt:
      row.created_at || row.createdAt || new Date().toISOString(),
    isLocal: Boolean(row.isLocal)
  }
}

function rebuildBookmarkKeySet() {
  bookmarkKeys = new Set(
    bookmarkRows
      .map(bookmarkKeyForRow)
      .filter(Boolean)
  )

  if (savedDocsBtn) {
    savedDocsBtn.textContent =
      bookmarkRows.length > 0
        ? `★ Saved · ${bookmarkRows.length}`
        : '☆ Saved'
  }
}

async function syncLocalBookmarksToAccount(localRows) {
  if (!currentUser || !Array.isArray(localRows) || localRows.length === 0) {
    return
  }

  for (const row of localRows) {
    try {
      await supabase.rpc('atlas_bookmark_save', {
        p_project_id: PROJECT_ID,
        p_node_scope: 'public',
        p_public_node_id: Number(row.publicNodeId),
        p_team_id: null,
        p_team_node_id: null,
        p_title_snapshot: row.titleSnapshot || 'Public document'
      })
    } catch (error) {
      console.warn('Local bookmark sync skipped:', error)
    }
  }

  localStorage.removeItem(CACHE_KEYS.localBookmarks)
}

async function loadBookmarks() {
  const localRows = readLocalBookmarkRows()

  if (!currentUser) {
    bookmarkRows = localRows
    rebuildBookmarkKeySet()

    if (isDocumentationLibraryOpen()) {
      renderDocumentationLibrary()
    }

    return
  }

  if (localRows.length > 0) {
    await syncLocalBookmarksToAccount(localRows)
  }

  const { data, error } = await supabase
    .from('atlas_user_bookmarks')
    .select(
      'id, node_scope, public_node_id, team_id, team_node_id, title_snapshot, created_at'
    )
    .eq('project_id', PROJECT_ID)
    .eq('user_id', currentUser.id)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Bookmark load failed:', error)
    bookmarkRows = []
    rebuildBookmarkKeySet()
    return
  }

  bookmarkRows = (data || []).map(normalizeBookmarkRow)
  rebuildBookmarkKeySet()

  if (isDocumentationLibraryOpen()) {
    renderDocumentationLibrary()
  }
}

async function toggleNodeBookmark(node) {
  if (!node) return

  const key = bookmarkKeyForNode(node)
  const currentlySaved = bookmarkKeys.has(key)

  if (!currentUser) {
    if (node.isTeamNode) {
      alert('Loghează-te pentru a salva documente Team Atlas.')
      setAccountPanel(true)
      return
    }

    let localRows = readLocalBookmarkRows()

    if (currentlySaved) {
      localRows = localRows.filter(
        (row) => bookmarkKeyForRow(row) !== key
      )
    } else {
      localRows.unshift({
        id: null,
        nodeScope: 'public',
        publicNodeId: Number(node.id),
        teamId: null,
        teamNodeId: null,
        titleSnapshot: node.title,
        createdAt: new Date().toISOString(),
        isLocal: true
      })
    }

    writeLocalBookmarkRows(localRows)
    bookmarkRows = readLocalBookmarkRows()
    rebuildBookmarkKeySet()
    renderAll()

    if (isDocumentationLibraryOpen()) {
      renderDocumentationLibrary()
    }

    return
  }

  const params = {
    p_project_id: PROJECT_ID,
    p_node_scope: node.isTeamNode ? 'team' : 'public',
    p_public_node_id: node.isTeamNode ? null : Number(node.id),
    p_team_id: node.isTeamNode ? Number(node.teamId) : null,
    p_team_node_id: node.isTeamNode ? Number(node.id) : null,
    p_title_snapshot: node.title
  }

  const rpcName = currentlySaved
    ? 'atlas_bookmark_remove'
    : 'atlas_bookmark_save'

  const { error } = await supabase.rpc(rpcName, params)

  if (error) throw error

  await loadBookmarks()
  renderAll()
}

function recentDocs() {
  try {
    const parsed = JSON.parse(
      localStorage.getItem(CACHE_KEYS.recentDocs) || '[]'
    )

    if (!Array.isArray(parsed)) return []

    return parsed
      .filter((item) => {
        if (!item) return false

        if (item.nodeScope === 'team') {
          return (
            Number.isFinite(Number(item.teamId)) &&
            Number.isFinite(Number(item.nodeId))
          )
        }

        return Number.isFinite(Number(item.nodeId))
      })
      .slice(0, 30)
  } catch {
    return []
  }
}

function writeRecentDocs(items) {
  localStorage.setItem(
    CACHE_KEYS.recentDocs,
    JSON.stringify((items || []).slice(0, 30))
  )
}

function rememberRecentNode(node) {
  if (!node) return

  const item = {
    nodeScope: node.isTeamNode ? 'team' : 'public',
    teamId: node.isTeamNode ? Number(node.teamId) : null,
    nodeId: Number(node.id),
    title: node.title,
    departmentId:
      node.departmentId == null
        ? null
        : Number(node.departmentId),
    visitedAt: new Date().toISOString()
  }

  const key = node.isTeamNode
    ? `team:${item.teamId}:${item.nodeId}`
    : `public:${item.nodeId}`

  const next = [
    item,
    ...recentDocs().filter((existing) => {
      const existingKey =
        existing.nodeScope === 'team'
          ? `team:${Number(existing.teamId)}:${Number(existing.nodeId)}`
          : `public:${Number(existing.nodeId)}`

      return existingKey !== key
    })
  ].slice(0, 30)

  writeRecentDocs(next)

  if (isDocumentationLibraryOpen()) {
    renderDocumentationLibrary()
  }
}

function documentSearchText(node) {
  if (!node) return ''

  return [
    node.title,
    nodeContentPlainText(node),
    nodeCategoryName(node),
    nodeDifficultyName(node),
    ...nodeDepartmentNames(node),
    ...nodeTagNames(node),
    ...(node.media || []).flatMap((media) => [
      media.title || '',
      media.caption || ''
    ]),
    ...(node.files || []).flatMap((file) => [
      file.title || '',
      file.description || '',
      file.originalName || '',
      file.relativePath || '',
      file.mimeType || ''
    ]),
    ...(node.codeSnippets || []).flatMap((snippet) => [
      snippet.title || '',
      snippet.description || '',
      snippet.language || '',
      snippet.code || ''
    ]),
    ...(node.references || []).flatMap((reference) => [
      reference.title || '',
      reference.url || '',
      reference.sourceType || '',
      reference.note || ''
    ])
  ]
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function finderCandidateNodes() {
  const items = publicNodes.map((node) => ({
    node,
    scope: 'public',
    teamName: null
  }))

  if (currentUser && activeTeamId != null) {
    const teamName = currentTeamRecord()?.name || 'Team Atlas'

    items.push(
      ...teamNodes.map((node) => ({
        node,
        scope: 'team',
        teamName
      }))
    )
  }

  return items
}

function finderScore(candidate, query) {
  const node = candidate.node
  const q = String(query || '').trim().toLowerCase()

  if (!q) return 0

  const terms = q.split(/\s+/).filter(Boolean)
  const title = String(node.title || '').toLowerCase()
  const taxonomy = [
    nodeCategoryName(node),
    nodeDifficultyName(node),
    ...nodeDepartmentNames(node),
    ...nodeTagNames(node)
  ]
    .join(' ')
    .toLowerCase()

  const full = documentSearchText(node).toLowerCase()

  if (!terms.every((term) => full.includes(term))) {
    return -1
  }

  let score = 0

  if (title === q) score += 180
  if (title.startsWith(q)) score += 120
  if (title.includes(q)) score += 80

  for (const term of terms) {
    if (title.startsWith(term)) score += 35
    else if (title.includes(term)) score += 24

    if (taxonomy.includes(term)) score += 14
    if (full.includes(term)) score += 4
  }

  if (candidate.scope === 'public') score += 1

  return score
}

function finderExcerpt(node, query) {
  const text = documentSearchText(node)
  if (!text) return 'Documentație fără preview text.'

  const q = String(query || '').trim().toLowerCase()
  const lower = text.toLowerCase()
  const index = q ? lower.indexOf(q) : -1

  const start = index >= 0
    ? Math.max(0, index - 90)
    : 0

  const excerpt = text.slice(start, start + 240).trim()

  return `${start > 0 ? '…' : ''}${excerpt}${
    start + 240 < text.length ? '…' : ''
  }`
}

function renderDocumentationFinder() {
  if (!isDocumentationFinderOpen()) return

  const query = documentationFinderInput.value.trim()
  const scope = documentationFinderScope.value

  if (!query) {
    finderResultsCache = []
    finderSelectedIndex = 0
    documentationFinderSummary.textContent =
      'Scrie ceva pentru a căuta în titluri, conținut, tag-uri, fișiere și code snippets.'

    documentationFinderResults.innerHTML = `
      <div class="documentation-finder-empty">
        Quick Find caută mai adânc decât lista vizibilă de pe hartă și poate
        găsi text din documentație, code snippets, media și fișiere.
      </div>
    `
    return
  }

  finderResultsCache = finderCandidateNodes()
    .filter((candidate) => scope === 'all' || candidate.scope === scope)
    .map((candidate) => ({
      ...candidate,
      score: finderScore(candidate, query)
    }))
    .filter((candidate) => candidate.score >= 0)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score

      return String(a.node.title).localeCompare(
        String(b.node.title),
        'ro',
        { sensitivity: 'base' }
      )
    })
    .slice(0, 40)

  if (finderSelectedIndex >= finderResultsCache.length) {
    finderSelectedIndex = Math.max(0, finderResultsCache.length - 1)
  }

  documentationFinderSummary.textContent =
    finderResultsCache.length === 1
      ? '1 rezultat'
      : `${finderResultsCache.length} rezultate`

  if (finderResultsCache.length === 0) {
    documentationFinderResults.innerHTML = `
      <div class="documentation-finder-empty">
        N-am găsit nimic pentru „${escapeHtmlText(query)}”.
      </div>
    `
    return
  }

  documentationFinderResults.innerHTML = finderResultsCache
    .map((candidate, index) => {
      const node = candidate.node
      const scopeLabel =
        candidate.scope === 'team'
          ? candidate.teamName || 'Team Atlas'
          : 'Public Atlas'

      return `
        <button
          class="documentation-finder-result ${
            index === finderSelectedIndex ? 'active' : ''
          }"
          type="button"
          data-finder-result="${index}"
        >
          <div class="documentation-finder-result-head">
            <span class="documentation-finder-result-title">
              ${escapeHtmlText(node.title)}
            </span>

            <span class="documentation-finder-result-scope">
              ${escapeHtmlText(scopeLabel)}
            </span>
          </div>

          <div class="documentation-finder-result-meta">
            <span>${escapeHtmlText(nodeCategoryName(node))}</span>
            <span>·</span>
            <span>${escapeHtmlText(nodeDifficultyName(node))}</span>
            ${
              nodeDepartmentNames(node).length
                ? `<span>·</span><span>${escapeHtmlText(
                    nodeDepartmentNames(node)[0]
                  )}</span>`
                : ''
            }
          </div>

          <div class="documentation-finder-result-excerpt">
            ${escapeHtmlText(finderExcerpt(node, query))}
          </div>
        </button>
      `
    })
    .join('')

  documentationFinderResults
    .querySelector(`[data-finder-result="${finderSelectedIndex}"]`)
    ?.scrollIntoView({ block: 'nearest' })
}

function isDocumentationFinderOpen() {
  return Boolean(
    documentationFinderBackdrop?.classList.contains('open')
  )
}

function openDocumentationFinder() {
  if (isAnyModalOpen() && !isDocumentationFinderOpen()) return

  documentationFinderBackdrop.classList.add('open')
  finderSelectedIndex = 0

  if (
    documentationFinderScope.value === 'team' &&
    (!currentUser || activeTeamId == null)
  ) {
    documentationFinderScope.value = 'all'
  }

  renderDocumentationFinder()

  requestAnimationFrame(() => {
    documentationFinderInput.focus()
    documentationFinderInput.select()
  })
}

function closeDocumentationFinder() {
  documentationFinderBackdrop?.classList.remove('open')
  finderResultsCache = []
  finderSelectedIndex = 0
}

function isDocumentationLibraryOpen() {
  return Boolean(
    documentationLibraryBackdrop?.classList.contains('open')
  )
}

function bookmarkScopeLabel(row) {
  if (row.nodeScope === 'team') {
    const team = teamRecords.find(
      (item) => Number(item.id) === Number(row.teamId)
    )

    return team?.teamNumber
      ? `${team.name} #${team.teamNumber}`
      : team?.name || 'Team Atlas'
  }

  return row.isLocal
    ? 'Public Atlas · local'
    : 'Public Atlas'
}

function formatRecentTimestamp(value) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''

  return date.toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short'
  })
}

function renderDocumentationLibrary() {
  if (!isDocumentationLibraryOpen()) return

  const saved = [...bookmarkRows].sort(
    (a, b) =>
      new Date(b.createdAt).getTime() -
      new Date(a.createdAt).getTime()
  )

  const recent = recentDocs()

  const authNote = currentUser
    ? 'Saved se sincronizează prin contul tău. Recent rămâne local pe acest device.'
    : 'Fără login, bookmark-urile Public Atlas și istoricul Recent rămân doar în acest browser. După login, bookmark-urile publice locale se sincronizează automat.'

  const savedHtml = saved.length
    ? saved
        .map(
          (row, index) => `
            <div class="documentation-library-item">
              <button
                class="documentation-library-open"
                type="button"
                data-library-bookmark-open="${index}"
              >
                <strong>${escapeHtmlText(row.titleSnapshot)}</strong>
                <span>
                  ${escapeHtmlText(bookmarkScopeLabel(row))}
                  · saved ${escapeHtmlText(
                    formatRecentTimestamp(row.createdAt)
                  )}
                </span>
              </button>

              <div class="documentation-library-actions">
                <button
                  class="taxonomy-mini-btn danger"
                  type="button"
                  data-library-bookmark-remove="${index}"
                  aria-label="Remove bookmark"
                >
                  ✕
                </button>
              </div>
            </div>
          `
        )
        .join('')
    : `
        <div class="documentation-finder-empty">
          N-ai salvat încă documente. Folosește ☆ din pagina unui nod.
        </div>
      `

  const recentHtml = recent.length
    ? recent
        .map(
          (item, index) => `
            <div class="documentation-library-item">
              <button
                class="documentation-library-open"
                type="button"
                data-library-recent-open="${index}"
              >
                <strong>${escapeHtmlText(item.title || 'Document')}</strong>
                <span>
                  ${
                    item.nodeScope === 'team'
                      ? `Team Atlas · ${escapeHtmlText(
                          teamRecords.find(
                            (team) =>
                              Number(team.id) === Number(item.teamId)
                          )?.name || 'private'
                        )}`
                      : 'Public Atlas'
                  }
                  · ${escapeHtmlText(
                    formatRecentTimestamp(item.visitedAt)
                  )}
                </span>
              </button>
            </div>
          `
        )
        .join('')
    : `
        <div class="documentation-finder-empty">
          Recent se completează automat când deschizi documentație.
        </div>
      `

  documentationLibraryBody.innerHTML = `
    <div class="documentation-library-note">
      ${escapeHtmlText(authNote)}
    </div>

    <section class="documentation-library-section">
      <div class="documentation-library-head">
        <strong>Saved</strong>
        <span>${saved.length} documents</span>
      </div>

      <div class="documentation-library-list">
        ${savedHtml}
      </div>
    </section>

    <section class="documentation-library-section">
      <div class="documentation-library-head">
        <strong>Recent</strong>
        <span>${recent.length} documents</span>
      </div>

      <div class="documentation-library-list">
        ${recentHtml}
      </div>
    </section>
  `

  clearRecentDocsBtn.disabled = recent.length === 0
}

function openDocumentationLibrary() {
  documentationLibraryBackdrop.classList.add('open')
  renderDocumentationLibrary()
}

function closeDocumentationLibrary() {
  documentationLibraryBackdrop?.classList.remove('open')
}

async function removeBookmarkRow(row) {
  if (!row) return

  if (!currentUser || row.isLocal) {
    const key = bookmarkKeyForRow(row)
    const next = readLocalBookmarkRows().filter(
      (item) => bookmarkKeyForRow(item) !== key
    )

    writeLocalBookmarkRows(next)
    bookmarkRows = readLocalBookmarkRows()
    rebuildBookmarkKeySet()
    renderDocumentationLibrary()
    renderAll()
    return
  }

  const { error } = await supabase.rpc('atlas_bookmark_remove', {
    p_project_id: PROJECT_ID,
    p_node_scope: row.nodeScope,
    p_public_node_id:
      row.nodeScope === 'public'
        ? Number(row.publicNodeId)
        : null,
    p_team_id:
      row.nodeScope === 'team'
        ? Number(row.teamId)
        : null,
    p_team_node_id:
      row.nodeScope === 'team'
        ? Number(row.teamNodeId)
        : null,
    p_title_snapshot: row.titleSnapshot || ''
  })

  if (error) throw error

  await loadBookmarks()
  renderDocumentationLibrary()
  renderAll()
}

async function openDocumentationReference(reference) {
  if (!reference) return false

  if (reference.nodeScope === 'public') {
    const node = publicNodes.find(
      (candidate) =>
        Number(candidate.id) === Number(reference.nodeId)
    )

    if (!node) {
      alert('Documentul public nu mai este disponibil.')
      return false
    }

    activePublicSection = 'explore'
    localStorage.setItem(CACHE_KEYS.publicSection, activePublicSection)

    syncActiveNodeCollection({ forceReset: true })
    activateDepartmentForNode(node, { persist: true })
    clearFiltersForDeepLink()

    selectedId = node.id
    clearEdgeSelection()
    detailOpen = true

    renderAll()
    setNodeRoute(node, { push: true })

    requestAnimationFrame(() => centerOnNode(node))
    return true
  }

  if (!currentUser) {
    alert('Loghează-te pentru a deschide documentația Team Atlas.')
    setAccountPanel(true)
    return false
  }

  const teamId = Number(reference.teamId)

  const team = teamRecords.find(
    (candidate) => Number(candidate.id) === teamId
  )

  if (!team || (!membershipForTeam(teamId) && !canEdit)) {
    alert('Nu mai ai acces la Team Atlas-ul acestui document.')
    return false
  }

  activeTeamId = teamId
  localStorage.setItem(CACHE_KEYS.activeTeam, String(activeTeamId))

  activePublicSection = 'team'
  localStorage.setItem(CACHE_KEYS.publicSection, activePublicSection)

  await loadActiveTeamAtlasNodes({ forceReset: true })

  const node = teamNodes.find(
    (candidate) =>
      Number(candidate.id) === Number(reference.nodeId)
  )

  if (!node) {
    alert('Documentul Team Atlas nu mai este disponibil.')
    return false
  }

  activateDepartmentForNode(node, { persist: true })
  clearFiltersForDeepLink()

  selectedId = node.id
  clearEdgeSelection()
  detailOpen = true

  renderAll()
  setNodeRoute(node, { push: true })

  requestAnimationFrame(() => centerOnNode(node))
  return true
}

async function openFinderResult(index = finderSelectedIndex) {
  const result = finderResultsCache[Number(index)]
  if (!result) return

  closeDocumentationFinder()

  await openDocumentationReference({
    nodeScope: result.scope,
    teamId:
      result.scope === 'team'
        ? Number(result.node.teamId)
        : null,
    nodeId: Number(result.node.id)
  })
}

function codeLanguageOptions(selectedLanguage) {
  const selected = String(selectedLanguage || 'java').toLowerCase()

  return CODE_LANGUAGES.map(
    ([value, label]) => `
    <option value="${value}" ${value === selected ? 'selected' : ''}>${escapeHtml(label)}</option>
  `
  ).join('')
}

function teamNodeShareUrl(node) {
  if (!node?.isTeamNode) return null
  return `${SITE_ORIGIN}${nodeRoutePath(node)}`
}

async function copyTeamNodeLink(node, button = null) {
  const url = teamNodeShareUrl(node)
  if (!url) return

  try {
    await copyTextToClipboard(url)

    if (button) {
      const previousText = button.textContent
      const previousTitle = button.title

      button.textContent = '✓'
      button.title = 'Link privat copiat'

      window.setTimeout(() => {
        if (!button.isConnected) return
        button.textContent = previousText
        button.title = previousTitle
      }, 1400)
    }
  } catch {
    window.prompt('Copiază link-ul privat Team Atlas:', url)
  }
}

async function copyTextToClipboard(text) {
  const value = String(text || '')

  if (navigator.clipboard?.writeText && window.isSecureContext) {
    await navigator.clipboard.writeText(value)
    return
  }

  const textarea = document.createElement('textarea')
  textarea.value = value
  textarea.setAttribute('readonly', '')
  textarea.style.position = 'fixed'
  textarea.style.opacity = '0'
  document.body.appendChild(textarea)
  textarea.select()

  const copied = document.execCommand('copy')
  textarea.remove()

  if (!copied) {
    throw new Error('Browserul nu a permis copierea automată.')
  }
}

function renderNodeCodeSnippets(node) {
  const snippets = Array.isArray(node.codeSnippets) ? node.codeSnippets : []
  const editable = canEditNode(node) && editorMode

  if (snippets.length === 0 && !editable) return ''

  return `
    <details class="document-disclosure" data-document-section="code">
      <summary><span>Cod</span><span class="document-disclosure-count">${snippets.length}</span></summary>
      <div class="document-disclosure-body">
        ${
          snippets.length
            ? `
              ${editable ? '<div class="node-code-heading"><span></span><button class="btn" type="button" data-open-node-code>Administrează</button></div>' : ''}
              <div class="code-snippet-list">
                ${snippets
                  .map((snippet) => `
                    <article class="code-snippet-card">
                      <div class="code-snippet-header">
                        <div class="code-snippet-title-wrap">
                          <span class="code-language-badge">${escapeHtml(codeLanguageLabel(snippet.language))}</span>
                          ${snippet.title ? `<h4 class="code-snippet-title">${escapeHtml(snippet.title)}</h4>` : ''}
                        </div>
                        <button class="btn code-copy-btn" type="button" data-copy-code-id="${snippet.id}">Copiază</button>
                      </div>
                      ${snippet.description ? `<p class="code-snippet-description">${escapeHtml(snippet.description)}</p>` : ''}
                      <div class="code-block-shell"><pre tabindex="0"><code>${escapeHtmlText(snippet.code)}</code></pre></div>
                    </article>
                  `)
                  .join('')}
              </div>
            `
            : `<div class="document-disclosure-empty"><span>Niciun snippet.</span><button class="btn" type="button" data-open-node-code>Adaugă cod</button></div>`
        }
      </div>
    </details>
  `
}

// Taxonomy filters and node taxonomy fields
function fillSelect(select, items, placeholder, selectedValue = '') {
  const safeValue = selectedValue == null ? '' : String(selectedValue)

  select.innerHTML = [
    `<option value="">${escapeHtml(placeholder)}</option>`,
    ...items.map((item) => `<option value="${Number(item.id)}">${escapeHtml(item.name)}</option>`)
  ].join('')

  select.value = safeValue
}

function renderTaxonomyControls() {
  fillSelect(
    categoryFilter,
    categories.filter((item) => item.is_active !== false),
    'Toate categoriile',
    categoryFilterId
  )

  fillSelect(
    difficultyFilter,
    difficulties.filter((item) => item.is_active !== false),
    'Toate dificultățile',
    difficultyFilterId
  )

  const activeTags = taxonomyTags.filter((item) => item.is_active !== false)

  tagFilterChips.innerHTML = activeTags.length
    ? activeTags
        .map(
          (tag) => `
        <button
          type="button"
          class="taxonomy-chip ${tagFilterIds.has(Number(tag.id)) ? 'active' : ''}"
          data-filter-tag-id="${Number(tag.id)}"
        >
          ${escapeHtml(tag.name)}
        </button>
      `
        )
        .join('')
    : '<span class="chip-empty">Nu există etichete active.</span>'

  tagFilterChips.querySelectorAll('[data-filter-tag-id]').forEach((button) => {
    button.addEventListener('click', () => {
      const id = Number(button.dataset.filterTagId)

      if (tagFilterIds.has(id)) tagFilterIds.delete(id)
      else tagFilterIds.add(id)

      normalizeSelectionAfterFilters()
      renderAll()
      requestAnimationFrame(fitView)
    })
  })

  clearFiltersBtn.hidden = !hasActiveFilters()
}

function populateNodeTaxonomyFields(selectedCategoryId = null, selectedDifficultyId = null) {
  const availableCategories = categories.filter(
    (item) => item.is_active !== false || Number(item.id) === Number(selectedCategoryId)
  )

  const availableDifficulties = difficulties.filter(
    (item) => item.is_active !== false || Number(item.id) === Number(selectedDifficultyId)
  )

  fillSelect(categoryInput, availableCategories, 'Alege categoria', selectedCategoryId)

  fillSelect(difficultyInput, availableDifficulties, 'Alege dificultatea', selectedDifficultyId)
}

function renderNodeTagPicker() {
  const availableTags = taxonomyTags.filter(
    (item) => item.is_active !== false || nodeTagDraft.has(Number(item.id))
  )

  nodeTagPicker.innerHTML = availableTags.length
    ? availableTags
        .map(
          (tag) => `
        <button
          type="button"
          class="taxonomy-chip ${nodeTagDraft.has(Number(tag.id)) ? 'active' : ''}"
          data-node-tag-id="${Number(tag.id)}"
        >
          ${escapeHtml(tag.name)}
        </button>
      `
        )
        .join('')
    : '<span class="chip-empty">Nu există etichete. Le vom administra din Taxonomy Manager.</span>'

  nodeTagPicker.querySelectorAll('[data-node-tag-id]').forEach((button) => {
    button.addEventListener('click', () => {
      const id = Number(button.dataset.nodeTagId)

      if (nodeTagDraft.has(id)) nodeTagDraft.delete(id)
      else nodeTagDraft.add(id)

      renderNodeTagPicker()
    })
  })
}

// Taxonomy Manager
function taxonomyKindMeta(kind = taxonomyManagerKind) {
  const map = {
    category: {
      singular: 'categorie',
      singularTitle: 'Categorie',
      plural: 'categorii',
      pluralTitle: 'Categorii',
      orderLabel: 'Ordine'
    },
    difficulty: {
      singular: 'dificultate',
      singularTitle: 'Dificultate',
      plural: 'dificultăți',
      pluralTitle: 'Dificultăți',
      orderLabel: 'Rang'
    },
    tag: {
      singular: 'etichetă',
      singularTitle: 'Etichetă',
      plural: 'etichete',
      pluralTitle: 'Etichete',
      orderLabel: 'Ordine'
    }
  }

  return map[kind] || map.category
}

function taxonomyItems(kind = taxonomyManagerKind) {
  if (kind === 'difficulty') return difficulties
  if (kind === 'tag') return taxonomyTags
  return categories
}

function taxonomyItemOrder(item, kind = taxonomyManagerKind) {
  return Number(kind === 'difficulty' ? (item.rank ?? 0) : (item.sort_order ?? 0))
}

function taxonomyUsageCount(kind, itemId) {
  const id = Number(itemId)

  if (kind === 'category') {
    return nodes.filter((node) => Number(node.categoryId) === id).length
  }

  if (kind === 'difficulty') {
    return nodes.filter((node) => Number(node.difficultyId) === id).length
  }

  return nodes.filter((node) => (node.tagIds || []).some((tagId) => Number(tagId) === id)).length
}

function isTaxonomyManagerOpen() {
  return taxonomyManagerBackdrop.classList.contains('open')
}

function isAnyModalOpen() {
  return Boolean(
    modalBackdrop.classList.contains('open') ||
    mediaManagerBackdrop.classList.contains('open') ||
    fileManagerBackdrop.classList.contains('open') ||
    codeManagerBackdrop.classList.contains('open') ||
    taxonomyManagerBackdrop.classList.contains('open') ||
    taxonomyItemBackdrop.classList.contains('open') ||
    taxonomyReplaceBackdrop.classList.contains('open') ||
    publicContentManagerBackdrop?.classList.contains('open') ||
    roadmapManagerBackdrop?.classList.contains('open') ||
    teamSetupBackdrop?.classList.contains('open') ||
    teamMembersBackdrop?.classList.contains('open') ||
    teamOnboardingBackdrop?.classList.contains('open') ||
    teamImportBackdrop?.classList.contains('open') ||
    documentationFinderBackdrop?.classList.contains('open') ||
    documentationLibraryBackdrop?.classList.contains('open') ||
    documentationMetaBackdrop?.classList.contains('open') ||
    documentationHealthBackdrop?.classList.contains('open') ||
    revisionHistoryBackdrop?.classList.contains('open') ||
    sourceCompareBackdrop?.classList.contains('open')
  )
}

function setTaxonomyMutationBusy(nextValue) {
  taxonomyMutationBusy = Boolean(nextValue)

  taxonomyAddBtn.disabled = taxonomyMutationBusy
  saveTaxonomyItemBtn.disabled = taxonomyMutationBusy
  taxonomyDeleteBtn.disabled = taxonomyMutationBusy
  confirmTaxonomyReplaceBtn.disabled = taxonomyMutationBusy

  taxonomyManagerList.querySelectorAll('button').forEach((button) => {
    button.disabled = taxonomyMutationBusy || button.dataset.baseDisabled === 'true'
  })
}

function renderTaxonomyManager() {
  if (!isTaxonomyManagerOpen()) return

  const meta = taxonomyKindMeta()
  const items = [...taxonomyItems()].sort((a, b) => {
    const orderDifference = taxonomyItemOrder(a) - taxonomyItemOrder(b)

    if (orderDifference !== 0) return orderDifference

    return String(a.name).localeCompare(String(b.name), 'ro', { sensitivity: 'base' })
  })

  document.querySelectorAll('[data-taxonomy-kind]').forEach((button) => {
    button.classList.toggle('active', button.dataset.taxonomyKind === taxonomyManagerKind)
  })

  taxonomyAddBtn.textContent = `+ ${meta.singularTitle}`

  const activeCount = items.filter((item) => item.is_active !== false).length

  const totalUsage = items.reduce(
    (sum, item) => sum + taxonomyUsageCount(taxonomyManagerKind, item.id),
    0
  )

  taxonomyManagerSummary.innerHTML = `
    <strong>${items.length} ${escapeHtml(meta.plural)}</strong>
    · ${activeCount} active · ${totalUsage} utilizări
  `

  if (items.length === 0) {
    taxonomyManagerList.innerHTML = `
      <div class="taxonomy-manager-empty">
        Nu există încă ${escapeHtml(meta.plural)}.
      </div>
    `
    return
  }

  taxonomyManagerList.innerHTML = items
    .map((item, index) => {
      const usageCount = taxonomyUsageCount(taxonomyManagerKind, item.id)

      const isActive = item.is_active !== false
      const order = taxonomyItemOrder(item)

      return `
      <article class="taxonomy-item-card ${isActive ? '' : 'inactive'}">
        <div class="taxonomy-item-main">
          <div class="taxonomy-item-title-row">
            <span class="taxonomy-item-title">
              ${escapeHtml(item.name)}
            </span>

            <span class="taxonomy-meta-chip ${isActive ? 'active' : 'inactive'}">
              ${isActive ? 'Activ' : 'Inactiv'}
            </span>
          </div>

          <div class="taxonomy-item-description">
            ${escapeHtml(item.description || 'Fără descriere.')}
          </div>

          <div class="taxonomy-item-meta">
            <span class="taxonomy-meta-chip">
              ${usageCount} ${usageCount === 1 ? 'nod' : 'noduri'}
            </span>

            <span class="taxonomy-meta-chip">
              ${escapeHtml(meta.orderLabel)}: ${order}
            </span>

            <span class="taxonomy-meta-chip">
              slug: ${escapeHtml(item.slug || '—')}
            </span>
          </div>
        </div>

        <div class="taxonomy-item-actions">
          <button
            class="taxonomy-mini-btn"
            type="button"
            data-taxonomy-move="-1"
            data-taxonomy-id="${Number(item.id)}"
            data-base-disabled="${index === 0}"
            ${index === 0 ? 'disabled' : ''}
            aria-label="Mută în sus"
            title="Mută în sus"
          >
            ↑
          </button>

          <button
            class="taxonomy-mini-btn"
            type="button"
            data-taxonomy-move="1"
            data-taxonomy-id="${Number(item.id)}"
            data-base-disabled="${index === items.length - 1}"
            ${index === items.length - 1 ? 'disabled' : ''}
            aria-label="Mută în jos"
            title="Mută în jos"
          >
            ↓
          </button>

          <button
            class="taxonomy-mini-btn"
            type="button"
            data-taxonomy-toggle="${Number(item.id)}"
          >
            ${isActive ? 'Dezactivează' : 'Activează'}
          </button>

          <button
            class="taxonomy-mini-btn"
            type="button"
            data-taxonomy-edit="${Number(item.id)}"
          >
            Editează
          </button>
        </div>
      </article>
    `
    })
    .join('')

  taxonomyManagerList.querySelectorAll('[data-taxonomy-edit]').forEach((button) => {
    button.addEventListener('click', () => {
      openTaxonomyItemEditor(Number(button.dataset.taxonomyEdit))
    })
  })

  taxonomyManagerList.querySelectorAll('[data-taxonomy-toggle]').forEach((button) => {
    button.addEventListener('click', () => {
      toggleTaxonomyItemActive(Number(button.dataset.taxonomyToggle)).catch((error) => {
        console.error(error)
        alert(error.message || 'Eroare la actualizarea elementului.')
      })
    })
  })

  taxonomyManagerList.querySelectorAll('[data-taxonomy-move]').forEach((button) => {
    button.addEventListener('click', () => {
      moveTaxonomyItem(
        Number(button.dataset.taxonomyId),
        Number(button.dataset.taxonomyMove)
      ).catch((error) => {
        console.error(error)
        alert(error.message || 'Eroare la reordonare.')
      })
    })
  })

  setTaxonomyMutationBusy(taxonomyMutationBusy)
}

function openTaxonomyManager(kind = taxonomyManagerKind) {
  if (!requireTaxonomyAuth()) return

  taxonomyManagerKind = ['category', 'difficulty', 'tag'].includes(kind) ? kind : 'category'

  taxonomyManagerBackdrop.classList.add('open')
  renderTaxonomyManager()
}

function closeTaxonomyManager() {
  taxonomyManagerBackdrop.classList.remove('open')
  closeTaxonomyItemEditor()
  closeTaxonomyReplaceDialog()
}

function openTaxonomyItemEditor(itemId = null) {
  if (!requireTaxonomyAuth()) return

  const meta = taxonomyKindMeta()

  const item =
    itemId == null ? null : taxonomyItems().find((current) => Number(current.id) === Number(itemId))

  if (itemId != null && !item) {
    alert('Elementul nu mai există.')
    return
  }

  const defaultOrder =
    taxonomyItems().reduce(
      (maxOrder, current) => Math.max(maxOrder, taxonomyItemOrder(current)),
      0
    ) + 10

  taxonomyItemDraft = {
    kind: taxonomyManagerKind,
    id: item ? Number(item.id) : null
  }

  taxonomyItemTitle.textContent = item ? `Editează ${meta.singular}` : `Adaugă ${meta.singular}`

  taxonomyItemSubtitle.textContent = item
    ? 'Modificările apar imediat în filtre și în editorul nodurilor.'
    : `Creează o ${meta.singular} nouă fără să modifici codul.`

  taxonomyNameInput.value = item?.name || ''
  taxonomyDescriptionInput.value = item?.description || ''
  taxonomyOrderInput.value = item ? taxonomyItemOrder(item) : defaultOrder

  taxonomyActiveInput.checked = item?.is_active !== false

  taxonomyDeleteBtn.hidden = !item

  if (item) {
    const usageCount = taxonomyUsageCount(taxonomyManagerKind, item.id)

    taxonomyDeleteNote.textContent =
      taxonomyManagerKind === 'tag'
        ? `Folosită de ${usageCount} ${usageCount === 1 ? 'nod' : 'noduri'}. La ștergere, eticheta este eliminată din noduri, nodurile rămân intacte, iar istoricul Undo/Redo este resetat pentru siguranță.`
        : `Folosită de ${usageCount} ${usageCount === 1 ? 'nod' : 'noduri'}. Dacă este în uz, vei putea muta nodurile într-un element înlocuitor înainte de ștergere. Orice ștergere resetează istoricul Undo/Redo pentru siguranță.`
  } else {
    taxonomyDeleteNote.textContent = 'Numele și ordinea pot fi schimbate ulterior din acest panou.'
  }

  taxonomyItemBackdrop.classList.add('open')
  taxonomyNameInput.focus()
  taxonomyNameInput.select()
}

function closeTaxonomyItemEditor() {
  taxonomyItemBackdrop.classList.remove('open')
  taxonomyItemDraft = null
}

function closeTaxonomyReplaceDialog() {
  taxonomyReplaceBackdrop.classList.remove('open')
  taxonomyDeleteDraft = null
}

async function refreshAfterTaxonomyMutation() {
  if (isTeamAtlasMode()) {
    await loadActiveTeamAtlasNodes()
  } else {
    await fetchAllData()
  }

  renderAll()
  renderTaxonomyManager()
}

async function saveTaxonomyItem() {
  if (!requireTaxonomyAuth() || !taxonomyItemDraft) return
  if (taxonomyMutationBusy) return

  const name = taxonomyNameInput.value.trim()
  const description = taxonomyDescriptionInput.value.trim()
  const order = Number.parseInt(taxonomyOrderInput.value, 10)

  if (!name) {
    alert('Scrie un nume.')
    taxonomyNameInput.focus()
    return
  }

  const safeOrder = Number.isFinite(order) ? order : 0

  setTaxonomyMutationBusy(true)

  try {
    if (taxonomyItemDraft.id == null) {
      const created = await createTaxonomyItemRemote(taxonomyItemDraft.kind, {
        name,
        description,
        order: safeOrder
      })

      if (!taxonomyActiveInput.checked) {
        await updateTaxonomyItemRemote(taxonomyItemDraft.kind, created.id, {
          name: created.name,
          description: created.description || '',
          order:
            taxonomyItemDraft.kind === 'difficulty'
              ? Number(created.rank ?? safeOrder)
              : Number(created.sort_order ?? safeOrder),
          isActive: false
        })
      }
    } else {
      await updateTaxonomyItemRemote(taxonomyItemDraft.kind, taxonomyItemDraft.id, {
        name,
        description,
        order: safeOrder,
        isActive: taxonomyActiveInput.checked
      })
    }

    closeTaxonomyItemEditor()
    await refreshAfterTaxonomyMutation()
  } finally {
    setTaxonomyMutationBusy(false)
  }
}

async function toggleTaxonomyItemActive(itemId) {
  if (!requireTaxonomyAuth() || taxonomyMutationBusy) return

  const item = taxonomyItems().find((current) => Number(current.id) === Number(itemId))

  if (!item) {
    throw new Error('Elementul nu mai există.')
  }

  setTaxonomyMutationBusy(true)

  try {
    await updateTaxonomyItemRemote(taxonomyManagerKind, item.id, {
      name: item.name,
      description: item.description || '',
      order: taxonomyItemOrder(item),
      isActive: item.is_active === false
    })

    await refreshAfterTaxonomyMutation()
  } finally {
    setTaxonomyMutationBusy(false)
  }
}

async function moveTaxonomyItem(itemId, direction) {
  if (!requireTaxonomyAuth() || taxonomyMutationBusy) return

  const items = [...taxonomyItems()].sort((a, b) => {
    const difference = taxonomyItemOrder(a) - taxonomyItemOrder(b)

    if (difference !== 0) return difference

    return String(a.name).localeCompare(String(b.name), 'ro', { sensitivity: 'base' })
  })

  const index = items.findIndex((item) => Number(item.id) === Number(itemId))

  const targetIndex = index + direction

  if (index < 0 || targetIndex < 0 || targetIndex >= items.length) {
    return
  }

  ;[items[index], items[targetIndex]] = [items[targetIndex], items[index]]

  const payload = items.map((item, itemIndex) => ({
    id: Number(item.id),
    order: (itemIndex + 1) * 10
  }))

  setTaxonomyMutationBusy(true)

  try {
    await reorderTaxonomyItemsRemote(taxonomyManagerKind, payload)

    await refreshAfterTaxonomyMutation()
  } finally {
    setTaxonomyMutationBusy(false)
  }
}

async function requestTaxonomyDelete() {
  if (!requireTaxonomyAuth() || !taxonomyItemDraft) return
  if (taxonomyItemDraft.id == null || taxonomyMutationBusy) return

  const item = taxonomyItems(taxonomyItemDraft.kind).find(
    (current) => Number(current.id) === Number(taxonomyItemDraft.id)
  )

  if (!item) {
    alert('Elementul nu mai există.')
    return
  }

  const meta = taxonomyKindMeta(taxonomyItemDraft.kind)

  const usageCount = taxonomyUsageCount(taxonomyItemDraft.kind, item.id)

  const confirmed = confirm(`Sigur vrei să ștergi ${meta.singular} „${item.name}”?`)

  if (!confirmed) return

  setTaxonomyMutationBusy(true)

  try {
    const result = await deleteTaxonomyItemRemote(taxonomyItemDraft.kind, item.id)

    if (result?.ok === false && result?.reason === 'in_use') {
      openTaxonomyReplaceDialog({
        kind: taxonomyItemDraft.kind,
        id: Number(item.id),
        name: item.name,
        usageCount: Number(result.usage_count ?? usageCount)
      })

      return
    }

    closeTaxonomyItemEditor()
    await refreshAfterTaxonomyMutation()
  } finally {
    setTaxonomyMutationBusy(false)
  }
}

function openTaxonomyReplaceDialog(draft) {
  const replacements = taxonomyItems(draft.kind)
    .filter((item) => Number(item.id) !== Number(draft.id))
    .sort((a, b) => {
      const activeDifference = Number(b.is_active !== false) - Number(a.is_active !== false)

      if (activeDifference !== 0) {
        return activeDifference
      }

      return taxonomyItemOrder(a, draft.kind) - taxonomyItemOrder(b, draft.kind)
    })

  if (replacements.length === 0) {
    alert(
      'Nu poți șterge ultimul element de acest tip. Creează mai întâi un înlocuitor sau dezactivează-l.'
    )
    return
  }

  taxonomyDeleteDraft = draft

  const meta = taxonomyKindMeta(draft.kind)

  taxonomyReplaceTitle.textContent = `Înlocuiește ${meta.singular}`

  taxonomyReplaceMessage.textContent = `„${draft.name}” este folosită de ${draft.usageCount} ${draft.usageCount === 1 ? 'nod' : 'noduri'}. Nodurile vor fi mutate în elementul ales, apoi elementul vechi va fi șters.`

  taxonomyReplacementSelect.innerHTML = replacements
    .map(
      (item) => `
      <option value="${Number(item.id)}">
        ${escapeHtml(item.name)}${item.is_active === false ? ' — inactiv' : ''}
      </option>
    `
    )
    .join('')

  taxonomyReplaceBackdrop.classList.add('open')
}

async function confirmTaxonomyReplacementDelete() {
  if (!requireTaxonomyAuth() || !taxonomyDeleteDraft) return
  if (taxonomyMutationBusy) return

  const replacementId = Number(taxonomyReplacementSelect.value)

  if (!replacementId) {
    alert('Alege un înlocuitor.')
    return
  }

  setTaxonomyMutationBusy(true)

  try {
    await replaceAndDeleteTaxonomyItemRemote(
      taxonomyDeleteDraft.kind,
      taxonomyDeleteDraft.id,
      replacementId
    )

    closeTaxonomyReplaceDialog()
    closeTaxonomyItemEditor()
    await refreshAfterTaxonomyMutation()
  } finally {
    setTaxonomyMutationBusy(false)
  }
}

// v89 shared loading/error state UI
function inlineStateMarkup(message, kind = 'loading') {
  const safeMessage = escapeHtmlText(message || '')

  if (kind === 'error') {
    return `
      <div class="atlas-inline-state is-error" role="alert">
        <span>${safeMessage}</span>
      </div>
    `
  }

  return `
    <div class="atlas-inline-state is-loading" role="status" aria-live="polite">
      <span class="atlas-inline-spinner" aria-hidden="true"></span>
      <span>${safeMessage}</span>
    </div>
  `
}

let networkStatusHideTimer = null

function renderNetworkStatus(isOnline, { announceRecovery = true } = {}) {
  if (!networkStatusPill) return

  if (networkStatusHideTimer) {
    clearTimeout(networkStatusHideTimer)
    networkStatusHideTimer = null
  }

  if (!isOnline) {
    networkStatusPill.hidden = false
    networkStatusPill.classList.remove('online')
    networkStatusPill.textContent =
      'Ești offline. Poți consulta ce este deja încărcat, dar sincronizarea poate eșua.'
    return
  }

  if (!announceRecovery) {
    networkStatusPill.hidden = true
    networkStatusPill.classList.remove('online')
    return
  }

  networkStatusPill.hidden = false
  networkStatusPill.classList.add('online')
  networkStatusPill.textContent = 'Conexiune restabilită.'

  networkStatusHideTimer = window.setTimeout(() => {
    networkStatusPill.hidden = true
    networkStatusPill.classList.remove('online')
    networkStatusHideTimer = null
  }, 2200)
}

// Atlas loading and empty-state UI
function showAtlasLoading(
  message = 'Pregătim nodurile, documentația și relațiile dintre concepte.'
) {
  isAtlasLoading = true

  atlasStatusOverlay.classList.remove('hidden', 'error', 'empty')
  atlasStatusOverlay.setAttribute('role', 'status')
  atlasStatusOverlay.setAttribute('aria-busy', 'true')

  atlasLoader.hidden = false
  retryLoadBtn.hidden = true

  atlasStatusKicker.textContent = 'FTC Programming Atlas'

  atlasStatusTitle.textContent = 'Se încarcă harta...'

  atlasStatusMessage.textContent = message

  updateAuthUI()
}

function showAtlasLoadError(error) {
  isAtlasLoading = false

  atlasStatusOverlay.classList.remove('hidden', 'empty')

  atlasStatusOverlay.classList.add('error')
  atlasStatusOverlay.setAttribute('role', 'alert')
  atlasStatusOverlay.setAttribute('aria-busy', 'false')

  atlasLoader.hidden = true
  retryLoadBtn.hidden = false
  retryLoadBtn.textContent = 'Reîncearcă'

  atlasStatusKicker.textContent = 'Conexiune indisponibilă'

  atlasStatusTitle.textContent = 'Atlasul nu a putut fi încărcat'

  atlasStatusMessage.textContent = !navigator.onLine
    ? 'Dispozitivul pare offline. Reconectează-te la internet și încearcă din nou.'
    : error?.message
      ? `Nu am putut sincroniza datele. Detaliu: ${error.message}`
      : 'Verifică internetul și încearcă din nou.'

  updateAuthUI()
}

function showEmptyAtlasState() {
  isAtlasLoading = false

  atlasStatusOverlay.classList.remove('hidden', 'error')

  atlasStatusOverlay.classList.add('empty')
  atlasStatusOverlay.setAttribute('role', 'status')
  atlasStatusOverlay.setAttribute('aria-busy', 'false')

  atlasLoader.hidden = true
  retryLoadBtn.hidden = false
  retryLoadBtn.textContent = 'Verifică din nou'

  atlasStatusKicker.textContent = 'Atlas gol'

  atlasStatusTitle.textContent = 'Nu există încă noduri'

  atlasStatusMessage.textContent = canEdit
    ? 'Poți crea primul nod folosind butonul „Nod nou” din Editor Tools.'
    : 'Atlasul nu conține momentan documentație publicată.'

  updateAuthUI()
}

function hideAtlasStatus() {
  isAtlasLoading = false

  atlasStatusOverlay.classList.add('hidden')
  atlasStatusOverlay.classList.remove('error', 'empty')
  atlasStatusOverlay.setAttribute('role', 'status')
  atlasStatusOverlay.setAttribute('aria-busy', 'false')

  updateAuthUI()
}

async function loadAtlasWithUi() {
  if (atlasLoadPromise) {
    return atlasLoadPromise
  }

  atlasLoadPromise = (async () => {
    showAtlasLoading()

    try {
      await fetchAllData()
      await loadRoadmapProgress()

      if (nodes.length === 0) {
        showEmptyAtlasState()
        return true
      }

      const routedNode = await applyRouteFromLocation({ canonicalize: true })
      renderAll()
      hideAtlasStatus()

      requestAnimationFrame(() => {
        if (routedNode) centerOnNode(routedNode)
        else fitView()
      })

      return true
    } catch (error) {
      console.error('Atlas initial load failed:', error)

      showAtlasLoadError(error)

      return false
    }
  })()

  try {
    return await atlasLoadPromise
  } finally {
    atlasLoadPromise = null
  }
}

// Map viewport and node collision geometry
function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max)
}

function applyView() {
  world.style.transform = `translate(${view.x}px, ${view.y}px) scale(${view.scale})`
  saveView()
}

function setScale(nextScale, clientX = window.innerWidth / 2, clientY = window.innerHeight / 2) {
  const prevScale = view.scale
  const newScale = clamp(nextScale, 0.45, 1.8)
  const worldX = (clientX - view.x) / prevScale
  const worldY = (clientY - view.y) / prevScale
  view.scale = newScale
  view.x = clientX - worldX * newScale
  view.y = clientY - worldY * newScale
  applyView()
}

function centerOnNode(node) {
  if (!node) return
  const { width, height } = nodeSize(node)
  const targetX = node.x + width / 2
  const targetY = node.y + height / 2
  view.x = window.innerWidth / 2 - targetX * view.scale
  view.y = window.innerHeight / 2 - targetY * view.scale
  applyView()
}

function fitView() {
  const visibleNodes = getVisibleNodes()
  if (!visibleNodes.length) return

  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity

  visibleNodes.forEach((node) => {
    const { width, height } = nodeSize(node)
    minX = Math.min(minX, node.x)
    minY = Math.min(minY, node.y)
    maxX = Math.max(maxX, node.x + width)
    maxY = Math.max(maxY, node.y + height)
  })

  const pad = isTouchLayout() ? 90 : 120
  const totalWidth = maxX - minX + pad * 2
  const totalHeight = maxY - minY + pad * 2
  const scaleX = window.innerWidth / totalWidth
  const scaleY = window.innerHeight / totalHeight

  view.scale = clamp(Math.min(scaleX, scaleY), 0.45, 1.2)
  view.x = (window.innerWidth - totalWidth * view.scale) / 2 - (minX - pad) * view.scale
  view.y = (window.innerHeight - totalHeight * view.scale) / 2 - (minY - pad) * view.scale
  applyView()
}

function fitCurrentSelection() {
  if (selectedEdge) {
    const info = getEdgeInfo(selectedEdge.sourceId, selectedEdge.targetId)
    const target = info ? findNode(info.link.targetId) : null
    if (!info || !target) return

    const sourceSize = nodeSize(info.source)
    const targetSize = nodeSize(target)
    const geometry = getEdgeGeometry(info.source, target, info.link)
    const routePoints = geometry.routePoints || []

    const xValues = [
      info.source.x,
      info.source.x + sourceSize.width,
      target.x,
      target.x + targetSize.width,
      ...routePoints.map((point) => point.x)
    ]

    const yValues = [
      info.source.y,
      info.source.y + sourceSize.height,
      target.y,
      target.y + targetSize.height,
      ...routePoints.map((point) => point.y)
    ]

    const minX = Math.min(...xValues) - 120
    const minY = Math.min(...yValues) - 120
    const maxX = Math.max(...xValues) + 120
    const maxY = Math.max(...yValues) + 120
    const boxWidth = maxX - minX
    const boxHeight = maxY - minY
    const scaleX = window.innerWidth / boxWidth
    const scaleY = window.innerHeight / boxHeight

    view.scale = clamp(Math.min(scaleX, scaleY), 0.45, 1.35)
    view.x = (window.innerWidth - boxWidth * view.scale) / 2 - minX * view.scale
    view.y = (window.innerHeight - boxHeight * view.scale) / 2 - minY * view.scale
    applyView()
    return
  }

  const node = selectedNode()
  if (node) centerOnNode(node)
}

function nodeRect(
  node,
  x = node.x,
  y = node.y,
  width = nodeWidth(node),
  height = nodeHeight(node)
) {
  return {
    left: x,
    top: y,
    right: x + width,
    bottom: y + height
  }
}

function rectsOverlap(a, b, gap = NODE_GAP) {
  return !(
    a.right + gap <= b.left ||
    a.left >= b.right + gap ||
    a.bottom + gap <= b.top ||
    a.top >= b.bottom + gap
  )
}

function overlapsAny(nodeId, x, y, width = null, height = null) {
  const node = findNode(nodeId)
  const rect = nodeRect(
    node || { x, y },
    x,
    y,
    width ?? nodeWidth(node),
    height ?? nodeHeight(node)
  )

  return nodes.some(
    (other) => Number(other.id) !== Number(nodeId) && rectsOverlap(rect, nodeRect(other))
  )
}

// Searches outward until a non-overlapping position is found
function findNearestFreeSpot(nodeId, desiredX, desiredY) {
  const node = findNode(nodeId)
  const { width, height } = nodeSize(node)

  const maxX = WORLD_WIDTH - width - 20
  const maxY = WORLD_HEIGHT - height - 20
  const startX = clamp(desiredX, 20, maxX)
  const startY = clamp(desiredY, 20, maxY)

  if (!overlapsAny(nodeId, startX, startY, width, height)) {
    return { x: startX, y: startY }
  }

  const steps = [0, 1, -1, 2, -2, 3, -3, 4, -4, 5, -5, 6, -6]
  const radiusStep = 34

  for (let radius = 1; radius <= 28; radius++) {
    for (const dxStep of steps) {
      for (const dyStep of steps) {
        if (Math.abs(dxStep) !== radius && Math.abs(dyStep) !== radius) continue
        const x = clamp(startX + dxStep * radiusStep, 20, maxX)
        const y = clamp(startY + dyStep * radiusStep, 20, maxY)
        if (!overlapsAny(nodeId, x, y, width, height)) return { x, y }
      }
    }
  }

  return { x: startX, y: startY }
}

// Positions are loaded from Supabase; this hook remains for compatibility
function ensureNodePositions() {
  return
}

function updateUndoRedoButtons() {
  if (!canEdit || !editorMode) {
    undoBtn.disabled = true
    redoBtn.disabled = true
  }
}

// Supabase-backed Undo and Redo
async function undo() {
  if (!canEdit || !editorMode || isTeamAtlasMode()) return

  const { data, error } = await supabase.rpc('atlas_undo', {
    p_project_id: PROJECT_ID
  })

  if (error) {
    alert(error.message || 'Eroare la undo.')
    return
  }

  if (!data?.ok) {
    alert('Nu mai există nimic de făcut undo.')
    await refreshHistoryButtons()
    return
  }

  await fetchAllData()
  await refreshHistoryButtons()
}

async function redo() {
  if (!canEdit || !editorMode || isTeamAtlasMode()) return

  const { data, error } = await supabase.rpc('atlas_redo', {
    p_project_id: PROJECT_ID
  })

  if (error) {
    alert(error.message || 'Eroare la redo.')
    return
  }

  if (!data?.ok) {
    alert('Nu mai există nimic de făcut redo.')
    await refreshHistoryButtons()
    return
  }

  await fetchAllData()
  await refreshHistoryButtons()
}

// Loads the complete atlas state and rebuilds the client-side model
async function fetchAllData() {
  console.log('fetchAllData START')

  const [
    nodesResult,
    edgesResult,
    categoriesResult,
    difficultiesResult,
    tagsResult,
    departmentsResult,
    roadmapsResult,
    roadmapStepsResult,
    announcementsResult,
    resourcesResult,
    resourceDepartmentsResult,
    nodeDepartmentsResult,
    nodeTagsResult,
    mediaResult,
    filesResult,
    codeResult,
    referencesResult,
    reviewStateResult,
    tutorialResult
  ] = await Promise.all([
    supabase
      .from('atlas_nodes')
      .select('*')
      .eq('project_id', PROJECT_ID)
      .order('id', { ascending: true }),

    supabase
      .from('atlas_edges')
      .select('*')
      .eq('project_id', PROJECT_ID)
      .order('source_id', { ascending: true })
      .order('target_id', { ascending: true }),

    supabase
      .from('atlas_categories')
      .select('*')
      .eq('project_id', PROJECT_ID)
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true }),

    supabase
      .from('atlas_difficulties')
      .select('*')
      .eq('project_id', PROJECT_ID)
      .order('rank', { ascending: true })
      .order('name', { ascending: true }),

    supabase
      .from('atlas_tags')
      .select('*')
      .eq('project_id', PROJECT_ID)
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true }),

    supabase
      .from('atlas_departments')
      .select('*')
      .eq('project_id', PROJECT_ID)
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true }),

    supabase
      .from('atlas_roadmaps')
      .select('*')
      .eq('project_id', PROJECT_ID)
      .order('sort_order', { ascending: true })
      .order('title', { ascending: true }),

    supabase
      .from('atlas_roadmap_steps')
      .select('*')
      .eq('project_id', PROJECT_ID)
      .order('roadmap_id', { ascending: true })
      .order('position', { ascending: true }),

    supabase
      .from('atlas_announcements')
      .select('*')
      .eq('project_id', PROJECT_ID)
      .order('is_pinned', { ascending: false })
      .order('published_at', { ascending: false }),

    supabase
      .from('atlas_resources')
      .select('*')
      .eq('project_id', PROJECT_ID)
      .order('is_featured', { ascending: false })
      .order('sort_order', { ascending: true })
      .order('title', { ascending: true }),

    supabase
      .from('atlas_resource_departments')
      .select('resource_id, department_id')
      .eq('project_id', PROJECT_ID),

    supabase
      .from('atlas_node_departments')
      .select('node_id, department_id')
      .eq('project_id', PROJECT_ID),

    supabase.from('atlas_node_tags').select('node_id, tag_id').eq('project_id', PROJECT_ID),

    supabase
      .from('atlas_node_media')
      .select('*')
      .eq('project_id', PROJECT_ID)
      .order('node_id', { ascending: true })
      .order('sort_order', { ascending: true })
      .order('id', { ascending: true }),

    supabase
      .from('atlas_node_files')
      .select('*')
      .eq('project_id', PROJECT_ID)
      .order('node_id', { ascending: true })
      .order('sort_order', { ascending: true })
      .order('id', { ascending: true }),

    supabase
      .from('atlas_node_code_snippets')
      .select('*')
      .eq('project_id', PROJECT_ID)
      .order('node_id', { ascending: true })
      .order('sort_order', { ascending: true })
      .order('id', { ascending: true }),

    supabase
      .from('atlas_document_references')
      .select('*')
      .eq('project_id', PROJECT_ID)
      .eq('node_scope', 'public')
      .order('public_node_id', { ascending: true })
      .order('is_primary', { ascending: false })
      .order('sort_order', { ascending: true })
      .order('id', { ascending: true }),

    supabase
      .from('atlas_document_review_state')
      .select('*')
      .eq('project_id', PROJECT_ID)
      .eq('node_scope', 'public'),

    supabase
      .from('atlas_project_tutorials')
      .select('content')
      .eq('project_id', PROJECT_ID)
      .maybeSingle()
  ])

  // Core graph/taxonomy datasets must succeed; auxiliary modules fail soft so
  // a temporary issue in Roadmaps, Resources, media, etc. cannot blank the map.
  for (const result of [
    nodesResult,
    edgesResult,
    categoriesResult,
    difficultiesResult,
    tagsResult,
    departmentsResult,
    nodeDepartmentsResult,
    nodeTagsResult
  ]) {
    if (result.error) throw result.error
  }

  const optionalRows = (result, label) => {
    if (result?.error) {
      console.warn(`[Atlas] Optional dataset unavailable: ${label}`, result.error)
      return []
    }

    return result?.data || []
  }

  const roadmapRows = optionalRows(roadmapsResult, 'roadmaps')
  const roadmapStepRows = optionalRows(roadmapStepsResult, 'roadmap steps')
  const announcementRows = optionalRows(announcementsResult, 'announcements')
  const resourceRows = optionalRows(resourcesResult, 'resources')
  const resourceDepartmentRows = optionalRows(
    resourceDepartmentsResult,
    'resource departments'
  )
  const mediaRows = optionalRows(mediaResult, 'node media')
  const fileRows = optionalRows(filesResult, 'node files')
  const codeRows = optionalRows(codeResult, 'code snippets')
  const referenceRows = optionalRows(referencesResult, 'document references')
  const reviewRows = optionalRows(reviewStateResult, 'document review state')

  if (tutorialResult?.error) {
    console.warn('[Atlas] Tutorial unavailable; using bundled fallback.', tutorialResult.error)
  }

  publicCategories = categoriesResult.data || []
  publicDifficulties = difficultiesResult.data || []
  publicTaxonomyTags = tagsResult.data || []
  departments = departmentsResult.data || []

  syncActiveNodeCollection()
  tutorialContent = tutorialResult?.error
    ? DEFAULT_TUTORIAL_CONTENT
    : tutorialResult.data?.content || DEFAULT_TUTORIAL_CONTENT

  const roadmapStepsByRoadmap = new Map()
  for (const row of roadmapStepRows) {
    const roadmapId = Number(row.roadmap_id)
    if (!roadmapStepsByRoadmap.has(roadmapId)) {
      roadmapStepsByRoadmap.set(roadmapId, [])
    }

    roadmapStepsByRoadmap.get(roadmapId).push({
      id: Number(row.id),
      nodeId: Number(row.node_id),
      position: Number(row.position || 0),
      note: row.note || '',
      isOptional: row.is_optional === true
    })
  }

  roadmaps = roadmapRows.map((row) => ({
    id: Number(row.id),
    title: row.title || '',
    slug: row.slug || '',
    description: row.description || '',
    departmentId: Number(row.department_id),
    isActive: row.is_active !== false,
    sortOrder: Number(row.sort_order || 0),
    createdAt: row.created_at || null,
    updatedAt: row.updated_at || null,
    steps: roadmapStepsByRoadmap.get(Number(row.id)) || []
  }))

  const resourceDepartmentsByResource = new Map()
  for (const row of resourceDepartmentRows) {
    const resourceId = Number(row.resource_id)
    if (!resourceDepartmentsByResource.has(resourceId)) {
      resourceDepartmentsByResource.set(resourceId, [])
    }

    resourceDepartmentsByResource.get(resourceId).push(Number(row.department_id))
  }

  announcements = announcementRows.map((row) => ({
    id: Number(row.id),
    title: row.title || '',
    summary: row.summary || '',
    content: row.content || '',
    category: row.category || 'ftc',
    sourceUrl: row.source_url || null,
    isPinned: row.is_pinned === true,
    isImportant: row.is_important === true,
    isPublished: row.is_published !== false,
    publishedAt: row.published_at || null,
    relatedNodeId: row.related_node_id == null ? null : Number(row.related_node_id),
    createdAt: row.created_at || null,
    updatedAt: row.updated_at || null
  }))

  resources = resourceRows.map((row) => ({
    id: Number(row.id),
    title: row.title || '',
    description: row.description || '',
    url: row.url || '',
    sourceName: row.source_name || '',
    resourceType: row.resource_type || '',
    isFeatured: row.is_featured === true,
    isActive: row.is_active !== false,
    sortOrder: Number(row.sort_order || 0),
    relatedNodeId: row.related_node_id == null ? null : Number(row.related_node_id),
    departmentIds: resourceDepartmentsByResource.get(Number(row.id)) || [],
    createdAt: row.created_at || null,
    updatedAt: row.updated_at || null
  }))

  normalizeTaxonomyState()
  normalizeDepartmentState()

  const nodesData = nodesResult.data || []
  const edgesData = edgesResult.data || []
  const nodeDepartmentsData = nodeDepartmentsResult.data || []
  const nodeTagsData = nodeTagsResult.data || []
  const mediaData = mediaRows
  const filesData = fileRows
  const codeData = codeRows

  if (nodesData.length === 0) {
    publicNodes = []
    syncActiveNodeCollection()
    selectedId = nodes[0]?.id ?? null
    selectedEdge = null
    selectedEdgePointIndex = null
    detailOpen = false
    renderAll()
    await refreshHistoryButtons()
    console.log('fetchAllData END', { nodesCount: 0 })
    return
  }

  const edgesBySource = new Map()
  for (const edge of edgesData) {
    const sourceId = Number(edge.source_id)
    if (!edgesBySource.has(sourceId)) edgesBySource.set(sourceId, [])

    edgesBySource.get(sourceId).push({
      targetId: Number(edge.target_id),
      label: edge.label || 'relație',
      controlPoints: normalizeEdgeControlPoints(edge.control_points, edge.control_x, edge.control_y)
    })
  }

  const departmentsByNode = new Map()
  for (const row of nodeDepartmentsData) {
    const nodeId = Number(row.node_id)
    if (!departmentsByNode.has(nodeId)) departmentsByNode.set(nodeId, [])
    departmentsByNode.get(nodeId).push(Number(row.department_id))
  }

  const tagsByNode = new Map()
  for (const row of nodeTagsData) {
    const nodeId = Number(row.node_id)
    if (!tagsByNode.has(nodeId)) tagsByNode.set(nodeId, [])
    tagsByNode.get(nodeId).push(Number(row.tag_id))
  }

  const mediaByNode = new Map()
  for (const row of mediaData) {
    const nodeId = Number(row.node_id)
    if (!mediaByNode.has(nodeId)) mediaByNode.set(nodeId, [])

    mediaByNode.get(nodeId).push({
      id: Number(row.id),
      nodeId,
      mediaType: row.media_type,
      storagePath: row.storage_path || null,
      externalUrl: row.external_url || null,
      mimeType: row.mime_type || '',
      fileSize: Number(row.file_size || 0),
      title: row.title || '',
      caption: row.caption || '',
      sortOrder: Number(row.sort_order || 0),
      createdAt: row.created_at || null
    })
  }

  const filesByNode = new Map()
  for (const row of filesData) {
    const nodeId = Number(row.node_id)
    if (!filesByNode.has(nodeId)) filesByNode.set(nodeId, [])

    filesByNode.get(nodeId).push({
      id: Number(row.id),
      nodeId,
      storagePath: row.storage_path,
      originalName: row.original_name || 'fișier',
      relativePath: row.relative_path || '',
      mimeType: row.mime_type || '',
      fileSize: Number(row.file_size || 0),
      title: row.title || '',
      description: row.description || '',
      sortOrder: Number(row.sort_order || 0),
      createdAt: row.created_at || null,
      updatedAt: row.updated_at || null
    })
  }

  const codeByNode = new Map()
  for (const row of codeData) {
    const nodeId = Number(row.node_id)
    if (!codeByNode.has(nodeId)) codeByNode.set(nodeId, [])

    codeByNode.get(nodeId).push({
      id: Number(row.id),
      nodeId,
      language: row.language || 'text',
      title: row.title || '',
      description: row.description || '',
      code: row.code || '',
      sortOrder: Number(row.sort_order || 0),
      createdAt: row.created_at || null,
      updatedAt: row.updated_at || null
    })
  }

  const referencesByPublicNode = new Map()

  for (const row of referenceRows) {
    const nodeId = Number(row.public_node_id)

    if (!referencesByPublicNode.has(nodeId)) {
      referencesByPublicNode.set(nodeId, [])
    }

    referencesByPublicNode.get(nodeId).push({
      id: Number(row.id),
      nodeScope: 'public',
      publicNodeId: nodeId,
      teamId: null,
      teamNodeId: null,
      title: row.title || '',
      url: row.url || '',
      sourceType: row.source_type || 'other',
      note: row.note || '',
      isPrimary: row.is_primary === true,
      sortOrder: Number(row.sort_order || 0),
      createdAt: row.created_at || null,
      updatedAt: row.updated_at || null
    })
  }

  const reviewByPublicNode = new Map()

  for (const row of reviewRows) {
    reviewByPublicNode.set(Number(row.public_node_id), {
      id: Number(row.id),
      nodeScope: 'public',
      status: row.review_status || 'needs_review',
      lastReviewedAt: row.last_reviewed_at || null,
      reviewNote: row.review_note || '',
      updatedAt: row.updated_at || null
    })
  }

  publicNodes = nodesData.map((node) => ({
    id: Number(node.id),
    isTeamNode: false,
    teamId: null,
    title: node.title,
    legacyTag: node.tag,
    categoryId: node.category_id == null ? null : Number(node.category_id),
    difficultyId: node.difficulty_id == null ? null : Number(node.difficulty_id),
    departmentIds: departmentsByNode.get(Number(node.id)) || [],
    tagIds: tagsByNode.get(Number(node.id)) || [],
    x: Number(node.x),
    y: Number(node.y),
    width: node.width == null ? null : Number(node.width),
    height: node.height == null ? null : Number(node.height),
    content: node.content,
    contentFormat: node.content_format || 'plain',
    links: edgesBySource.get(Number(node.id)) || [],
    media: mediaByNode.get(Number(node.id)) || [],
    files: filesByNode.get(Number(node.id)) || [],
    codeSnippets: codeByNode.get(Number(node.id)) || [],
    references: referencesByPublicNode.get(Number(node.id)) || [],
    reviewState: reviewByPublicNode.get(Number(node.id)) || null,
    createdAt: node.created_at || null,
    updatedAt: node.updated_at || null
  }))

  syncActiveNodeCollection()
  ensureNodePositions()
  normalizeSelectionAfterFilters()

  if (selectedId == null) {
    selectedId = getVisibleNodes()[0]?.id ?? nodes[0]?.id ?? null
  }

  if (selectedEdge) {
    const stillExists = getEdgeInfo(selectedEdge.sourceId, selectedEdge.targetId)

    if (!stillExists) {
      selectedEdge = null
      selectedEdgePointIndex = null
    } else {
      const pointCount = normalizeEdgeControlPoints(stillExists.link.controlPoints).length

      if (
        !Number.isInteger(selectedEdgePointIndex) ||
        selectedEdgePointIndex < 0 ||
        selectedEdgePointIndex >= pointCount
      ) {
        selectedEdgePointIndex = null
      }
    }
  }

  saveCachedNodes()
  renderAll()
  await refreshHistoryButtons()

  console.log('fetchAllData END', {
    nodesCount: nodes.length,
    categoriesCount: categories.length,
    difficultiesCount: difficulties.length,
    tagsCount: taxonomyTags.length,
    mediaCount: mediaData.length,
    fileCount: filesData.length,
    codeSnippetCount: codeData.length
  })
}

// Supabase RPC wrappers
function normalizeRpcRow(data, entityName) {
  const row = Array.isArray(data) ? data[0] : data

  if (!row) {
    throw new Error(`${entityName} nu a fost returnat de Supabase.`)
  }

  return row
}

async function createNodeRemote(node) {
  if (isTeamAtlasMode()) {
    const { data, error } = await supabase.rpc('atlas_team_node_create', {
      p_project_id: PROJECT_ID,
      p_team_id: Number(activeTeamId),
      p_department_id: Number(node.departmentId),
      p_title: node.title,
      p_category_id: node.categoryId,
      p_difficulty_id: node.difficultyId,
      p_tag_ids: node.tagIds || [],
      p_x: Number(node.x),
      p_y: Number(node.y),
      p_content: node.content,
      p_content_format: node.contentFormat || 'html'
    })

    if (error) throw error
    return normalizeRpcRow(data, 'Nodul de echipă creat')
  }

  const { data, error } = await supabase.rpc('atlas_create_node_v3', {
    p_project_id: PROJECT_ID,
    p_title: node.title,
    p_category_id: node.categoryId,
    p_difficulty_id: node.difficultyId,
    p_tag_ids: node.tagIds || [],
    p_x: Number(node.x),
    p_y: Number(node.y),
    p_content: node.content,
    p_content_format: node.contentFormat || 'html'
  })

  if (error) throw error
  return normalizeRpcRow(data, 'Nodul creat')
}

async function updateNodeRemote(node) {
  if (node?.isTeamNode || isTeamAtlasMode()) {
    const { data, error } = await supabase.rpc('atlas_team_node_update', {
      p_project_id: PROJECT_ID,
      p_team_id: Number(node.teamId || activeTeamId),
      p_node_id: Number(node.id),
      p_department_id: Number(node.departmentId),
      p_title: node.title,
      p_category_id: node.categoryId,
      p_difficulty_id: node.difficultyId,
      p_tag_ids: node.tagIds || [],
      p_x: Number(node.x),
      p_y: Number(node.y),
      p_content: node.content,
      p_content_format: node.contentFormat || 'html'
    })

    if (error) throw error
    return normalizeRpcRow(data, `Nodul de echipă ${node.id}`)
  }

  const { data, error } = await supabase.rpc('atlas_update_node_v3', {
    p_project_id: PROJECT_ID,
    p_node_id: Number(node.id),
    p_title: node.title,
    p_category_id: node.categoryId,
    p_difficulty_id: node.difficultyId,
    p_tag_ids: node.tagIds || [],
    p_x: Number(node.x),
    p_y: Number(node.y),
    p_content: node.content,
    p_content_format: node.contentFormat || 'html'
  })

  if (error) throw error
  return normalizeRpcRow(data, `Nodul ${node.id}`)
}

async function deleteNodeRemote(nodeId) {
  const node = findNode(nodeId)

  if (node?.isTeamNode || isTeamAtlasMode()) {
    const { data, error } = await supabase.rpc('atlas_team_node_delete', {
      p_project_id: PROJECT_ID,
      p_team_id: Number(node?.teamId || activeTeamId),
      p_node_id: Number(nodeId)
    })

    if (error) throw error
    if (!data?.ok) {
      throw new Error(`Nodul de echipă ${nodeId} nu a fost șters.`)
    }

    return data
  }

  const { data, error } = await supabase.rpc('atlas_delete_node_v2', {
    p_project_id: PROJECT_ID,
    p_node_id: Number(nodeId)
  })

  if (error) throw error

  if (!data?.ok) {
    throw new Error(`Nodul ${nodeId} nu a fost șters.`)
  }

  return data
}

async function createMediaRemote(item) {
  const node = findNode(item.nodeId) || currentMediaNode()

  if (node?.isTeamNode) {
    const { data, error } = await supabase.rpc('atlas_team_media_create', {
      p_project_id: PROJECT_ID,
      p_team_id: Number(node.teamId || activeTeamId),
      p_node_id: Number(item.nodeId),
      p_media_type: item.mediaType,
      p_storage_path: item.storagePath || null,
      p_external_url: item.externalUrl || null,
      p_mime_type: item.mimeType || '',
      p_file_size: Number(item.fileSize || 0),
      p_title: item.title || '',
      p_caption: item.caption || '',
      p_sort_order: Number(item.sortOrder || 0)
    })

    if (error) throw error
    return normalizeRpcRow(data, 'Elementul media al echipei')
  }

  const { data, error } = await supabase.rpc('atlas_media_create', {
    p_project_id: PROJECT_ID,
    p_node_id: Number(item.nodeId),
    p_media_type: item.mediaType,
    p_storage_path: item.storagePath || null,
    p_external_url: item.externalUrl || null,
    p_mime_type: item.mimeType || '',
    p_file_size: Number(item.fileSize || 0),
    p_title: item.title || '',
    p_caption: item.caption || '',
    p_sort_order: Number(item.sortOrder || 0)
  })

  if (error) throw error
  return normalizeRpcRow(data, 'Elementul media')
}

async function updateMediaRemote(item) {
  const node = findNode(item.nodeId) || currentMediaNode()

  if (node?.isTeamNode) {
    const { data, error } = await supabase.rpc('atlas_team_media_update', {
      p_project_id: PROJECT_ID,
      p_team_id: Number(node.teamId || activeTeamId),
      p_media_id: Number(item.id),
      p_title: item.title || '',
      p_caption: item.caption || '',
      p_sort_order: Number(item.sortOrder || 0)
    })

    if (error) throw error
    return normalizeRpcRow(data, 'Elementul media al echipei')
  }

  const { data, error } = await supabase.rpc('atlas_media_update', {
    p_project_id: PROJECT_ID,
    p_media_id: Number(item.id),
    p_title: item.title || '',
    p_caption: item.caption || '',
    p_sort_order: Number(item.sortOrder || 0)
  })

  if (error) throw error
  return normalizeRpcRow(data, 'Elementul media')
}

async function deleteMediaRemote(mediaId) {
  const node = currentMediaNode()

  if (node?.isTeamNode) {
    const { data, error } = await supabase.rpc('atlas_team_media_delete', {
      p_project_id: PROJECT_ID,
      p_team_id: Number(node.teamId || activeTeamId),
      p_media_id: Number(mediaId)
    })

    if (error) throw error
    if (!data?.ok) {
      throw new Error('Elementul media al echipei nu a fost șters.')
    }

    return data
  }

  const { data, error } = await supabase.rpc('atlas_media_delete', {
    p_project_id: PROJECT_ID,
    p_media_id: Number(mediaId)
  })

  if (error) throw error
  if (!data?.ok) throw new Error('Elementul media nu a fost șters.')
  return data
}

async function reorderMediaRemote(nodeId, items) {
  const node = findNode(nodeId) || currentMediaNode()

  if (node?.isTeamNode) {
    const { data, error } = await supabase.rpc('atlas_team_media_reorder', {
      p_project_id: PROJECT_ID,
      p_team_id: Number(node.teamId || activeTeamId),
      p_node_id: Number(nodeId),
      p_items: items
    })

    if (error) throw error
    if (!data?.ok) {
      throw new Error('Ordinea media a echipei nu a fost salvată.')
    }

    return data
  }

  const { data, error } = await supabase.rpc('atlas_media_reorder', {
    p_project_id: PROJECT_ID,
    p_node_id: Number(nodeId),
    p_items: items
  })

  if (error) throw error
  if (!data?.ok) throw new Error('Ordinea media nu a fost salvată.')
  return data
}

async function createFileRemote(item) {
  const node = findNode(item.nodeId) || currentFileNode()

  if (node?.isTeamNode) {
    const { data, error } = await supabase.rpc('atlas_team_file_create', {
      p_project_id: PROJECT_ID,
      p_team_id: Number(node.teamId || activeTeamId),
      p_node_id: Number(item.nodeId),
      p_storage_path: item.storagePath,
      p_original_name: item.originalName,
      p_relative_path: item.relativePath || '',
      p_mime_type: item.mimeType || '',
      p_file_size: Number(item.fileSize || 0),
      p_title: item.title || '',
      p_description: item.description || '',
      p_sort_order: Number(item.sortOrder || 0)
    })

    if (error) throw error
    return normalizeRpcRow(data, 'Fișierul echipei')
  }

  const { data, error } = await supabase.rpc('atlas_file_create', {
    p_project_id: PROJECT_ID,
    p_node_id: Number(item.nodeId),
    p_storage_path: item.storagePath,
    p_original_name: item.originalName,
    p_relative_path: item.relativePath || '',
    p_mime_type: item.mimeType || '',
    p_file_size: Number(item.fileSize || 0),
    p_title: item.title || '',
    p_description: item.description || '',
    p_sort_order: Number(item.sortOrder || 0)
  })

  if (error) throw error
  return normalizeRpcRow(data, 'Fișierul')
}

async function updateFileRemote(item) {
  const node = findNode(item.nodeId) || currentFileNode()

  if (node?.isTeamNode) {
    const { data, error } = await supabase.rpc('atlas_team_file_update', {
      p_project_id: PROJECT_ID,
      p_team_id: Number(node.teamId || activeTeamId),
      p_file_id: Number(item.id),
      p_title: item.title || '',
      p_description: item.description || '',
      p_sort_order: Number(item.sortOrder || 0)
    })

    if (error) throw error
    return normalizeRpcRow(data, 'Fișierul echipei')
  }

  const { data, error } = await supabase.rpc('atlas_file_update', {
    p_project_id: PROJECT_ID,
    p_file_id: Number(item.id),
    p_title: item.title || '',
    p_description: item.description || '',
    p_sort_order: Number(item.sortOrder || 0)
  })

  if (error) throw error
  return normalizeRpcRow(data, 'Fișierul')
}

async function deleteFileRemote(fileId) {
  const node = currentFileNode()

  if (node?.isTeamNode) {
    const { data, error } = await supabase.rpc('atlas_team_file_delete', {
      p_project_id: PROJECT_ID,
      p_team_id: Number(node.teamId || activeTeamId),
      p_file_id: Number(fileId)
    })

    if (error) throw error
    if (!data?.ok) {
      throw new Error('Fișierul echipei nu a fost șters.')
    }

    return data
  }

  const { data, error } = await supabase.rpc('atlas_file_delete', {
    p_project_id: PROJECT_ID,
    p_file_id: Number(fileId)
  })

  if (error) throw error
  if (!data?.ok) throw new Error('Fișierul nu a fost șters.')
  return data
}

async function reorderFilesRemote(nodeId, items) {
  const node = findNode(nodeId) || currentFileNode()

  if (node?.isTeamNode) {
    const { data, error } = await supabase.rpc('atlas_team_file_reorder', {
      p_project_id: PROJECT_ID,
      p_team_id: Number(node.teamId || activeTeamId),
      p_node_id: Number(nodeId),
      p_items: items
    })

    if (error) throw error
    if (!data?.ok) {
      throw new Error('Ordinea fișierelor echipei nu a fost salvată.')
    }

    return data
  }

  const { data, error } = await supabase.rpc('atlas_file_reorder', {
    p_project_id: PROJECT_ID,
    p_node_id: Number(nodeId),
    p_items: items
  })

  if (error) throw error
  if (!data?.ok) throw new Error('Ordinea fișierelor nu a fost salvată.')
  return data
}

async function createCodeRemote(item) {
  const node = findNode(item.nodeId)

  if (node?.isTeamNode) {
    const { data, error } = await supabase.rpc('atlas_team_code_create', {
      p_project_id: PROJECT_ID,
      p_team_id: Number(node.teamId || activeTeamId),
      p_node_id: Number(item.nodeId),
      p_language: item.language || 'text',
      p_title: item.title || '',
      p_description: item.description || '',
      p_code: item.code || '',
      p_sort_order: Number(item.sortOrder || 0)
    })

    if (error) throw error
    return normalizeRpcRow(data, 'Snippet-ul de cod al echipei')
  }

  const { data, error } = await supabase.rpc('atlas_code_create', {
    p_project_id: PROJECT_ID,
    p_node_id: Number(item.nodeId),
    p_language: item.language || 'text',
    p_title: item.title || '',
    p_description: item.description || '',
    p_code: item.code || '',
    p_sort_order: Number(item.sortOrder || 0)
  })

  if (error) throw error
  return normalizeRpcRow(data, 'Snippet-ul de cod')
}

async function updateCodeRemote(item) {
  const node = findNode(item.nodeId) || currentCodeNode()

  if (node?.isTeamNode) {
    const { data, error } = await supabase.rpc('atlas_team_code_update', {
      p_project_id: PROJECT_ID,
      p_team_id: Number(node.teamId || activeTeamId),
      p_code_id: Number(item.id),
      p_language: item.language || 'text',
      p_title: item.title || '',
      p_description: item.description || '',
      p_code: item.code || '',
      p_sort_order: Number(item.sortOrder || 0)
    })

    if (error) throw error
    return normalizeRpcRow(data, 'Snippet-ul de cod al echipei')
  }

  const { data, error } = await supabase.rpc('atlas_code_update', {
    p_project_id: PROJECT_ID,
    p_code_id: Number(item.id),
    p_language: item.language || 'text',
    p_title: item.title || '',
    p_description: item.description || '',
    p_code: item.code || '',
    p_sort_order: Number(item.sortOrder || 0)
  })

  if (error) throw error
  return normalizeRpcRow(data, 'Snippet-ul de cod')
}

async function deleteCodeRemote(codeId) {
  const node = currentCodeNode()

  if (node?.isTeamNode) {
    const { data, error } = await supabase.rpc('atlas_team_code_delete', {
      p_project_id: PROJECT_ID,
      p_team_id: Number(node.teamId || activeTeamId),
      p_code_id: Number(codeId)
    })

    if (error) throw error
    if (!data?.ok) {
      throw new Error('Snippet-ul de cod al echipei nu a fost șters.')
    }

    return data
  }

  const { data, error } = await supabase.rpc('atlas_code_delete', {
    p_project_id: PROJECT_ID,
    p_code_id: Number(codeId)
  })

  if (error) throw error
  if (!data?.ok) throw new Error('Snippet-ul de cod nu a fost șters.')
  return data
}

async function reorderCodeRemote(nodeId, items) {
  const node = findNode(nodeId) || currentCodeNode()

  if (node?.isTeamNode) {
    const { data, error } = await supabase.rpc('atlas_team_code_reorder', {
      p_project_id: PROJECT_ID,
      p_team_id: Number(node.teamId || activeTeamId),
      p_node_id: Number(nodeId),
      p_items: items
    })

    if (error) throw error
    if (!data?.ok) {
      throw new Error('Ordinea snippet-urilor echipei nu a fost salvată.')
    }

    return data
  }

  const { data, error } = await supabase.rpc('atlas_code_reorder', {
    p_project_id: PROJECT_ID,
    p_node_id: Number(nodeId),
    p_items: items
  })

  if (error) throw error
  if (!data?.ok) throw new Error('Ordinea snippet-urilor nu a fost salvată.')
  return data
}

async function createTaxonomyItemRemote(kind, item) {
  if (isTeamAtlasMode()) {
    const { data, error } = await supabase.rpc('atlas_team_taxonomy_create', {
      p_project_id: PROJECT_ID,
      p_team_id: Number(activeTeamId),
      p_kind: kind,
      p_name: item.name,
      p_description: item.description || '',
      p_order: Number(item.order) || 0
    })

    if (error) throw error
    return normalizeRpcRow(data, 'Elementul taxonomiei Team Atlas')
  }

  const { data, error } = await supabase.rpc('atlas_taxonomy_create', {
    p_project_id: PROJECT_ID,
    p_kind: kind,
    p_name: item.name,
    p_description: item.description || '',
    p_order: Number(item.order) || 0
  })

  if (error) throw error

  return normalizeRpcRow(data, 'Elementul taxonomiei')
}

async function updateTaxonomyItemRemote(kind, itemId, item) {
  if (isTeamAtlasMode()) {
    const { data, error } = await supabase.rpc('atlas_team_taxonomy_update', {
      p_project_id: PROJECT_ID,
      p_team_id: Number(activeTeamId),
      p_kind: kind,
      p_id: Number(itemId),
      p_name: item.name,
      p_description: item.description || '',
      p_order: Number(item.order) || 0,
      p_is_active: item.isActive !== false
    })

    if (error) throw error
    return normalizeRpcRow(data, 'Elementul taxonomiei Team Atlas')
  }

  const { data, error } = await supabase.rpc('atlas_taxonomy_update', {
    p_project_id: PROJECT_ID,
    p_kind: kind,
    p_id: Number(itemId),
    p_name: item.name,
    p_description: item.description || '',
    p_order: Number(item.order) || 0,
    p_is_active: item.isActive !== false
  })

  if (error) throw error

  return normalizeRpcRow(data, 'Elementul taxonomiei')
}

async function deleteTaxonomyItemRemote(kind, itemId) {
  if (isTeamAtlasMode()) {
    const { data, error } = await supabase.rpc('atlas_team_taxonomy_delete', {
      p_project_id: PROJECT_ID,
      p_team_id: Number(activeTeamId),
      p_kind: kind,
      p_id: Number(itemId)
    })

    if (error) throw error
    return data
  }

  const { data, error } = await supabase.rpc('atlas_taxonomy_delete', {
    p_project_id: PROJECT_ID,
    p_kind: kind,
    p_id: Number(itemId)
  })

  if (error) throw error

  return data
}

async function reorderTaxonomyItemsRemote(kind, items) {
  const rpcName = isTeamAtlasMode()
    ? 'atlas_team_taxonomy_reorder'
    : 'atlas_taxonomy_reorder'

  const params = {
    p_project_id: PROJECT_ID,
    p_kind: kind,
    p_items: items
  }

  if (isTeamAtlasMode()) {
    params.p_team_id = Number(activeTeamId)
  }

  const { data, error } = await supabase.rpc(rpcName, params)

  if (error) throw error

  if (!data?.ok) {
    throw new Error('Ordinea nu a putut fi salvată.')
  }

  return data
}

async function replaceAndDeleteTaxonomyItemRemote(
  kind,
  itemId,
  replacementId
) {
  const rpcName = isTeamAtlasMode()
    ? 'atlas_team_taxonomy_replace_and_delete'
    : 'atlas_taxonomy_replace_and_delete'

  const params = {
    p_project_id: PROJECT_ID,
    p_kind: kind,
    p_id: Number(itemId),
    p_replacement_id: Number(replacementId)
  }

  if (isTeamAtlasMode()) {
    params.p_team_id = Number(activeTeamId)
  }

  const { data, error } = await supabase.rpc(rpcName, params)

  if (error) throw error

  if (!data?.ok) {
    throw new Error('Elementul nu a putut fi înlocuit și șters.')
  }

  return data
}

async function insertEdgeRemote(sourceId, targetId, label) {
  if (isTeamAtlasMode()) {
    const { data, error } = await supabase.rpc('atlas_team_edge_create', {
      p_project_id: PROJECT_ID,
      p_team_id: Number(activeTeamId),
      p_source_id: Number(sourceId),
      p_target_id: Number(targetId),
      p_label: label
    })

    if (error) throw error
    return normalizeRpcRow(data, 'Muchia de echipă creată')
  }

  const { data, error } = await supabase.rpc('atlas_create_edge', {
    p_project_id: PROJECT_ID,
    p_source_id: Number(sourceId),
    p_target_id: Number(targetId),
    p_label: label
  })

  if (error) throw error
  return normalizeRpcRow(data, 'Muchia creată')
}

async function updateEdgeRemote(sourceId, targetId, label) {
  if (isTeamAtlasMode()) {
    const { data, error } = await supabase.rpc('atlas_team_edge_update', {
      p_project_id: PROJECT_ID,
      p_team_id: Number(activeTeamId),
      p_source_id: Number(sourceId),
      p_target_id: Number(targetId),
      p_label: label
    })

    if (error) throw error
    return normalizeRpcRow(data, 'Muchia de echipă actualizată')
  }

  const { data, error } = await supabase.rpc('atlas_update_edge', {
    p_project_id: PROJECT_ID,
    p_source_id: Number(sourceId),
    p_target_id: Number(targetId),
    p_label: label
  })

  if (error) throw error
  return normalizeRpcRow(data, 'Muchia actualizată')
}

async function updateEdgeControlPointsRemote(sourceId, targetId, controlPoints) {
  const points = normalizeEdgeControlPoints(controlPoints)

  if (isTeamAtlasMode()) {
    const { data, error } = await supabase.rpc(
      'atlas_team_edge_update_control_points',
      {
        p_project_id: PROJECT_ID,
        p_team_id: Number(activeTeamId),
        p_source_id: Number(sourceId),
        p_target_id: Number(targetId),
        p_control_points: points
      }
    )

    if (error) throw error
    return normalizeRpcRow(data, 'Traseul muchiei de echipă')
  }

  const { data, error } = await supabase.rpc('atlas_update_edge_control_points', {
    p_project_id: PROJECT_ID,
    p_source_id: Number(sourceId),
    p_target_id: Number(targetId),
    p_control_points: points
  })

  if (error) throw error
  return normalizeRpcRow(data, 'Traseul muchiei')
}

async function deleteEdgeRemote(sourceId, targetId) {
  if (isTeamAtlasMode()) {
    const { data, error } = await supabase.rpc('atlas_team_edge_delete', {
      p_project_id: PROJECT_ID,
      p_team_id: Number(activeTeamId),
      p_source_id: Number(sourceId),
      p_target_id: Number(targetId)
    })

    if (error) throw error
    if (!data?.ok) throw new Error('Muchia de echipă nu a fost ștearsă.')
    return data
  }

  const { data, error } = await supabase.rpc('atlas_delete_edge', {
    p_project_id: PROJECT_ID,
    p_source_id: Number(sourceId),
    p_target_id: Number(targetId)
  })

  if (error) throw error

  if (!data?.ok) {
    throw new Error('Muchia nu a fost ștearsă.')
  }

  return data
}

async function updateNodeGeometryRemote(node) {
  if (node?.isTeamNode || isTeamAtlasMode()) {
    const { data, error } = await supabase.rpc('atlas_team_node_update_geometry', {
      p_project_id: PROJECT_ID,
      p_team_id: Number(node.teamId || activeTeamId),
      p_node_id: Number(node.id),
      p_x: Number(node.x),
      p_y: Number(node.y),
      p_width: node.width == null ? null : Number(node.width),
      p_height: node.height == null ? null : Number(node.height)
    })

    if (error) throw error
    return normalizeRpcRow(data, 'Geometria nodului de echipă')
  }

  const { data, error } = await supabase.rpc('atlas_update_node_geometry', {
    p_project_id: PROJECT_ID,
    p_node_id: Number(node.id),
    p_x: Number(node.x),
    p_y: Number(node.y),
    p_width: node.width == null ? null : Number(node.width),
    p_height: node.height == null ? null : Number(node.height)
  })

  if (error) throw error
  return normalizeRpcRow(data, 'Geometria nodului')
}

// Layout editing -------------------------------------------------------------

function layoutNodeGeometry(node) {
  return {
    x: Number(node?.x || 0),
    y: Number(node?.y || 0),
    width: node?.width == null ? null : Number(node.width),
    height: node?.height == null ? null : Number(node.height)
  }
}

function layoutGeometryEqual(a, b) {
  return (
    Number(a?.x) === Number(b?.x) &&
    Number(a?.y) === Number(b?.y) &&
    (a?.width == null ? null : Number(a.width)) ===
      (b?.width == null ? null : Number(b.width)) &&
    (a?.height == null ? null : Number(a.height)) ===
      (b?.height == null ? null : Number(b.height))
  )
}

function layoutEdgeKey(sourceId, targetId) {
  return `${Number(sourceId)}:${Number(targetId)}`
}

function layoutPointsEqual(a, b) {
  return JSON.stringify(normalizeEdgeControlPoints(a)) ===
    JSON.stringify(normalizeEdgeControlPoints(b))
}

function hasUnsavedLayoutChanges() {
  return layoutNodeDrafts.size > 0 || layoutEdgeDrafts.size > 0
}

function layoutChangeCount() {
  return layoutNodeDrafts.size + layoutEdgeDrafts.size
}

function queueLayoutNodeDraft(node, before) {
  if (!node) return
  const key = Number(node.id)

  if (!layoutNodeDrafts.has(key)) {
    layoutNodeDrafts.set(key, { original: { ...before } })
  }

  const entry = layoutNodeDrafts.get(key)

  if (layoutGeometryEqual(layoutNodeGeometry(node), entry.original)) {
    layoutNodeDrafts.delete(key)
  }

  renderLayoutEditorState()
}

function queueLayoutEdgeDraft(sourceId, targetId, beforePoints) {
  const key = layoutEdgeKey(sourceId, targetId)
  const info = getEdgeInfo(sourceId, targetId)
  if (!info) return

  if (!layoutEdgeDrafts.has(key)) {
    layoutEdgeDrafts.set(key, {
      sourceId: Number(sourceId),
      targetId: Number(targetId),
      originalPoints: normalizeEdgeControlPoints(beforePoints).map((point) => ({ ...point }))
    })
  }

  const entry = layoutEdgeDrafts.get(key)

  if (layoutPointsEqual(info.link.controlPoints, entry.originalPoints)) {
    layoutEdgeDrafts.delete(key)
  }

  renderLayoutEditorState()
}

function recordLayoutAction(action) {
  if (!action) return
  layoutUndoStack.push(action)
  if (layoutUndoStack.length > 160) layoutUndoStack.shift()
  layoutRedoStack = []
  refreshHistoryButtons()
}

function recomputeLayoutNodeDraft(nodeId) {
  const entry = layoutNodeDrafts.get(Number(nodeId))
  const node = findNode(nodeId)
  if (!entry || !node) return
  if (layoutGeometryEqual(layoutNodeGeometry(node), entry.original)) {
    layoutNodeDrafts.delete(Number(nodeId))
  }
}

function recomputeLayoutEdgeDraft(sourceId, targetId) {
  const key = layoutEdgeKey(sourceId, targetId)
  const entry = layoutEdgeDrafts.get(key)
  const info = getEdgeInfo(sourceId, targetId)
  if (!entry || !info) return
  if (layoutPointsEqual(info.link.controlPoints, entry.originalPoints)) {
    layoutEdgeDrafts.delete(key)
  }
}

function applyLayoutActionState(action, side) {
  if (!action) return

  if (action.type === 'node') {
    const node = findNode(action.nodeId)
    const state = action[side]
    if (!node || !state) return

    node.x = Number(state.x)
    node.y = Number(state.y)
    node.width = state.width == null ? null : Number(state.width)
    node.height = state.height == null ? null : Number(state.height)
    recomputeLayoutNodeDraft(node.id)
    renderLayoutEditorState()
    return
  }

  if (action.type === 'edge') {
    const info = getEdgeInfo(action.sourceId, action.targetId)
    const points = action[side]
    if (!info || !points) return

    info.link.controlPoints = normalizeEdgeControlPoints(points)
    recomputeLayoutEdgeDraft(action.sourceId, action.targetId)
    renderLayoutEditorState()
  }
}

function undoLayoutChange() {
  const action = layoutUndoStack.pop()
  if (!action) return
  layoutRedoStack.push(action)
  applyLayoutActionState(action, 'before')
  renderAll()
  refreshHistoryButtons()
}

function redoLayoutChange() {
  const action = layoutRedoStack.pop()
  if (!action) return
  layoutUndoStack.push(action)
  applyLayoutActionState(action, 'after')
  renderAll()
  refreshHistoryButtons()
}

function clearLayoutDraftState() {
  layoutNodeDrafts = new Map()
  layoutEdgeDrafts = new Map()
  layoutUndoStack = []
  layoutRedoStack = []
  layoutSaveBusy = false
  renderLayoutEditorState()
  refreshHistoryButtons()
}

function discardLayoutChanges() {
  for (const [nodeId, entry] of layoutNodeDrafts) {
    const node = findNode(nodeId)
    if (!node) continue
    node.x = Number(entry.original.x)
    node.y = Number(entry.original.y)
    node.width = entry.original.width == null ? null : Number(entry.original.width)
    node.height = entry.original.height == null ? null : Number(entry.original.height)
  }

  for (const entry of layoutEdgeDrafts.values()) {
    const info = getEdgeInfo(entry.sourceId, entry.targetId)
    if (!info) continue
    info.link.controlPoints = normalizeEdgeControlPoints(entry.originalPoints)
  }

  clearLayoutDraftState()
  renderAll()
}

async function saveLayoutChanges({ quiet = false } = {}) {
  if (layoutSaveBusy) return false

  if (!hasUnsavedLayoutChanges()) {
    renderLayoutEditorState()
    return true
  }

  layoutSaveBusy = true
  renderLayoutEditorState()

  try {
    const nodePayload = [...layoutNodeDrafts.keys()]
      .map((nodeId) => findNode(nodeId))
      .filter(Boolean)
      .map((node) => ({ id: Number(node.id), ...layoutNodeGeometry(node) }))

    const edgePayload = [...layoutEdgeDrafts.values()]
      .map((entry) => {
        const info = getEdgeInfo(entry.sourceId, entry.targetId)
        if (!info) return null
        return {
          source_id: Number(entry.sourceId),
          target_id: Number(entry.targetId),
          control_points: normalizeEdgeControlPoints(info.link.controlPoints)
        }
      })
      .filter(Boolean)

    const { error } = await supabase.rpc('atlas_layout_batch_save', {
      p_project_id: PROJECT_ID,
      p_node_scope: isTeamAtlasMode() ? 'team' : 'public',
      p_team_id: isTeamAtlasMode() ? Number(activeTeamId) : null,
      p_nodes: nodePayload,
      p_edges: edgePayload
    })

    if (error) throw error

    clearLayoutDraftState()
    saveCachedNodes()
    renderAll()
    return true
  } catch (error) {
    layoutSaveBusy = false
    renderLayoutEditorState()

    if (!quiet) {
      alert(error?.message || 'Layout-ul nu a putut fi salvat.')
    }
    return false
  }
}

function renderLayoutEditorState() {
  if (!layoutEditorBar) return

  const mapSection =
    activePublicSection === 'explore' ||
    activePublicSection === 'team'

  const available = Boolean(
    editorMode &&
    canEditCurrentAtlas() &&
    mapSection
  )

  layoutEditorBar.hidden = !available

  if (!available) layoutEditMode = false

  const count = layoutChangeCount()

  layoutEditorBar.classList.toggle('active', layoutEditMode)
  layoutEditorModeLabel.textContent = layoutEditMode ? 'EDIT LAYOUT MODE' : 'VIEW MODE'
  layoutEditorStatus.textContent = layoutEditMode
    ? 'Drag · resize · arrows'
    : 'Layout locked'

  layoutEditModeBtn.textContent = layoutEditMode ? 'Exit layout edit' : 'Edit layout'
  layoutEditModeBtn.classList.toggle('primary', layoutEditMode)
  layoutEditModeBtn.disabled = !available || layoutSaveBusy

  layoutUnsavedCount.textContent = `${count} changes`
  layoutUnsavedCount.classList.toggle('dirty', count > 0)

  discardLayoutBtn.disabled = layoutSaveBusy || count === 0
  saveLayoutBtn.disabled = layoutSaveBusy || count === 0
  saveLayoutBtn.textContent = layoutSaveBusy ? 'Saving...' : 'Save'
}

function setLayoutEditMode(nextValue) {
  const next = Boolean(nextValue)

  if (next && (!editorMode || !canEditCurrentAtlas())) return false

  if (!next && hasUnsavedLayoutChanges()) {
    alert('Salvează sau folosește Discard înainte să ieși din Layout Edit Mode.')
    return false
  }

  layoutEditMode = next

  if (!layoutEditMode) {
    selectedEdgePointIndex = null
    layoutUndoStack = []
    layoutRedoStack = []
  }

  renderAll()
  refreshHistoryButtons()
  return true
}

// Node movement and resizing
function keyboardMoveVector(keys = keyboardMoveState.keys) {
  let x = 0
  let y = 0

  if (keys.has('a')) x -= 1
  if (keys.has('d')) x += 1
  if (keys.has('w')) y -= 1
  if (keys.has('s')) y += 1

  const magnitude = Math.hypot(x, y)

  if (!magnitude) return { x: 0, y: 0 }

  return {
    x: x / magnitude,
    y: y / magnitude
  }
}

function applyKeyboardNodeDelta(node, dx, dy) {
  if (!node) return false

  const { width, height } = nodeSize(node)
  const currentX = Number(node.x)
  const currentY = Number(node.y)
  const nextX = clamp(currentX + dx, 20, WORLD_WIDTH - width - 20)
  const nextY = clamp(currentY + dy, 20, WORLD_HEIGHT - height - 20)

  let finalX = currentX
  let finalY = currentY

  if (!overlapsAny(node.id, nextX, nextY, width, height)) {
    finalX = nextX
    finalY = nextY
  } else {
    const canMoveX =
      Math.abs(nextX - currentX) > 0.001 &&
      !overlapsAny(node.id, nextX, currentY, width, height)

    const canMoveY =
      Math.abs(nextY - currentY) > 0.001 &&
      !overlapsAny(node.id, currentX, nextY, width, height)

    if (canMoveX) finalX = nextX
    if (canMoveY) finalY = nextY
  }

  const changed =
    Math.abs(finalX - currentX) > 0.001 ||
    Math.abs(finalY - currentY) > 0.001

  if (!changed) return false

  node.x = finalX
  node.y = finalY

  const nodeElement = nodeLayer.querySelector(`[data-node-id="${node.id}"]`)

  if (nodeElement) {
    nodeElement.style.left = `${node.x}px`
    nodeElement.style.top = `${node.y}px`
  }

  // Only links need to be redrawn every frame; rebuilding every node would be wasteful.
  renderLinks()
  return true
}

function hasUnsavedNodePosition(nodeId = null) {
  if (!unsavedNodePosition) return false
  if (nodeId == null) return true
  return Number(unsavedNodePosition.nodeId) === Number(nodeId)
}

function markNodePositionUnsaved(node, originalX, originalY) {
  if (!node) return

  if (!unsavedNodePosition) {
    unsavedNodePosition = {
      nodeId: Number(node.id),
      originalX: Number(originalX),
      originalY: Number(originalY)
    }
  }

  if (Number(unsavedNodePosition.nodeId) !== Number(node.id)) return

  updateAuthUI()
  renderSelectedStrip()
}

function clearUnsavedNodePosition() {
  unsavedNodePosition = null
  positionSaveBusy = false
  updateAuthUI()
  renderSelectedStrip()
}

async function saveUnsavedNodePosition({ quiet = false } = {}) {
  if (!unsavedNodePosition || positionSaveBusy) return true

  const node = nodes.find(
    (item) => Number(item.id) === Number(unsavedNodePosition.nodeId)
  )

  if (!node) {
    clearUnsavedNodePosition()
    return true
  }

  positionSaveBusy = true
  updateAuthUI()

  try {
    const updated = await updateNodeGeometryRemote(node)

    node.x = Number(updated.x)
    node.y = Number(updated.y)
    node.width = updated.width == null ? node.width : Number(updated.width)
    node.height = updated.height == null ? node.height : Number(updated.height)

    clearUnsavedNodePosition()
    saveCachedNodes()
    renderAll()
    await refreshHistoryButtons()
    return true
  } catch (error) {
    positionSaveBusy = false
    updateAuthUI()
    console.error('Manual position save failed:', error)

    if (!quiet) {
      alert(`Eroare la salvarea poziției nodului: ${error?.message || 'necunoscută'}`)
    }

    return false
  }
}

async function confirmUnsavedPositionBeforeLeaving(nextNodeId = null) {
  if (nextNodeId != null) return true

  if (hasUnsavedLayoutChanges()) {
    const shouldSave = window.confirm(
      `Ai ${layoutChangeCount()} modificări de layout nesalvate.\n\n` +
      'OK = Save layout și continuă.\n' +
      'Cancel = rămâi aici. Poți folosi și Discard din bara Layout.'
    )

    if (!shouldSave) return false
    return saveLayoutChanges()
  }

  if (!unsavedNodePosition) return true

  const shouldSave = window.confirm(
    'Există o poziție locală veche nesalvată.\n\n' +
    'OK = salvează și continuă.\n' +
    'Cancel = rămâi aici.'
  )

  if (!shouldSave) return false
  return saveUnsavedNodePosition()
}

function finishKeyboardNodeMovement() {
  if (keyboardMoveState.frameId != null) {
    cancelAnimationFrame(keyboardMoveState.frameId)
  }

  keyboardMoveState.frameId = null
  keyboardMoveState.keys.clear()

  const nodeId = keyboardMoveState.nodeId
  const dirty = keyboardMoveState.dirty
  const originalX = keyboardMoveState.startX
  const originalY = keyboardMoveState.startY

  keyboardMoveState.nodeId = null
  keyboardMoveState.startedAt = 0
  keyboardMoveState.lastFrameAt = 0
  keyboardMoveState.dirty = false

  if (!dirty || nodeId == null) return

  const node = nodes.find((item) => Number(item.id) === Number(nodeId))
  if (!node) return

  const { width, height } = nodeSize(node)
  const roundedX = clamp(Math.round(Number(node.x)), 20, WORLD_WIDTH - width - 20)
  const roundedY = clamp(Math.round(Number(node.y)), 20, WORLD_HEIGHT - height - 20)

  if (!overlapsAny(node.id, roundedX, roundedY, width, height)) {
    node.x = roundedX
    node.y = roundedY
  }

  markNodePositionUnsaved(node, originalX, originalY)
  renderAll()
}

function runKeyboardNodeMovementFrame(now) {
  keyboardMoveState.frameId = null

  if (!keyboardMoveState.keys.size || keyboardMoveState.nodeId == null) return

  if (
    !canEdit ||
    !editorMode ||
    isAnyModalOpen() ||
    selectedEdge ||
    Number(selectedId) !== Number(keyboardMoveState.nodeId)
  ) {
    finishKeyboardNodeMovement()
    return
  }

  const node = nodes.find(
    (item) => Number(item.id) === Number(keyboardMoveState.nodeId)
  )

  if (!node) {
    finishKeyboardNodeMovement()
    return
  }

  const dt = Math.min(
    Math.max((now - keyboardMoveState.lastFrameAt) / 1000, 0),
    0.05
  )

  keyboardMoveState.lastFrameAt = now

  const acceleratingFor = Math.max(
    0,
    (now - keyboardMoveState.startedAt - WASD_ACCELERATION_DELAY_MS) / 1000
  )

  const speed = Math.min(
    WASD_MAX_SPEED,
    WASD_INITIAL_SPEED + WASD_ACCELERATION * acceleratingFor
  )

  const direction = keyboardMoveVector()

  if (direction.x || direction.y) {
    const moved = applyKeyboardNodeDelta(
      node,
      direction.x * speed * dt,
      direction.y * speed * dt
    )

    keyboardMoveState.dirty = keyboardMoveState.dirty || moved
  }

  keyboardMoveState.frameId = requestAnimationFrame(runKeyboardNodeMovementFrame)
}

function startKeyboardNodeMovement(key) {
  if (!canEditCurrentAtlas() || !editorMode || isAnyModalOpen() || selectedEdge) return false

  const node = selectedNode()

  if (!node || !canEditNode(node)) return false

  const normalizedKey = String(key || '').toLowerCase()

  if (!['w', 'a', 's', 'd'].includes(normalizedKey)) return false

  const now = performance.now()

  if (keyboardMoveState.nodeId == null) {
    keyboardMoveState.nodeId = node.id
    keyboardMoveState.startedAt = now
    keyboardMoveState.lastFrameAt = now
    keyboardMoveState.dirty = false
    keyboardMoveState.startX = Number(node.x)
    keyboardMoveState.startY = Number(node.y)
  } else if (Number(keyboardMoveState.nodeId) !== Number(node.id)) {
    finishKeyboardNodeMovement()
    return startKeyboardNodeMovement(normalizedKey)
  }

  if (!keyboardMoveState.keys.has(normalizedKey)) {
    keyboardMoveState.keys.add(normalizedKey)

    // A quick tap should still feel like the old 12 px keyboard nudge.
    const direction = keyboardMoveVector(new Set([normalizedKey]))
    const moved = applyKeyboardNodeDelta(
      node,
      direction.x * WASD_TAP_STEP,
      direction.y * WASD_TAP_STEP
    )

    keyboardMoveState.dirty = keyboardMoveState.dirty || moved
  }

  if (keyboardMoveState.frameId == null) {
    keyboardMoveState.frameId = requestAnimationFrame(runKeyboardNodeMovementFrame)
  }

  return true
}

async function nudgeSelectedNode(dx, dy) {
  if (!canEditCurrentAtlas() || !editorMode || !layoutEditMode) return

  const node = selectedNode()
  if (!node || !canEditNode(node)) return

  const before = layoutNodeGeometry(node)
  const { width, height } = nodeSize(node)

  const desiredX = clamp(node.x + dx, 20, WORLD_WIDTH - width - 20)
  const desiredY = clamp(node.y + dy, 20, WORLD_HEIGHT - height - 20)
  const free = findNearestFreeSpot(node.id, desiredX, desiredY)

  if (Number(free.x) === Number(node.x) && Number(free.y) === Number(node.y)) return

  node.x = Number(free.x)
  node.y = Number(free.y)

  const after = layoutNodeGeometry(node)
  queueLayoutNodeDraft(node, before)
  recordLayoutAction({ type: 'node', nodeId: Number(node.id), before, after })
  renderAll()
}

async function resizeSelectedNode(deltaWidth, deltaHeight) {
  if (!canEditCurrentAtlas() || !editorMode || !layoutEditMode || selectedEdge) return

  const node = selectedNode()
  if (!node || !canEditNode(node)) return

  const before = layoutNodeGeometry(node)
  const current = nodeSize(node)

  const nextWidth = clamp(
    current.width + deltaWidth,
    NODE_MIN_WIDTH,
    Math.min(NODE_MAX_WIDTH, WORLD_WIDTH - node.x - 20)
  )

  const nextHeight = clamp(
    current.height + deltaHeight,
    NODE_MIN_HEIGHT,
    Math.min(NODE_MAX_HEIGHT, WORLD_HEIGHT - node.y - 20)
  )

  if (nextWidth === current.width && nextHeight === current.height) return

  if (overlapsAny(node.id, node.x, node.y, nextWidth, nextHeight)) {
    alert('Nodul s-ar suprapune peste alt nod.')
    return
  }

  node.width = nextWidth
  node.height = nextHeight

  const after = layoutNodeGeometry(node)
  queueLayoutNodeDraft(node, before)
  recordLayoutAction({ type: 'node', nodeId: Number(node.id), before, after })
  renderAll()
}

async function resetSelectedNodeSize() {
  if (!canEditCurrentAtlas() || !editorMode || !layoutEditMode || selectedEdge) return

  const node = selectedNode()
  if (!node || !canEditNode(node)) return

  const before = layoutNodeGeometry(node)
  node.width = null
  node.height = null

  const fallback = nodeSize(node)

  if (overlapsAny(node.id, node.x, node.y, fallback.width, fallback.height)) {
    node.width = before.width
    node.height = before.height
    alert('Dimensiunea automată s-ar suprapune peste alt nod.')
    return
  }

  const after = layoutNodeGeometry(node)
  queueLayoutNodeDraft(node, before)
  recordLayoutAction({ type: 'node', nodeId: Number(node.id), before, after })
  renderAll()
}


// Authentication, permissions and Editor Mode
function updateAuthUI() {
  renderTeamInvites()

  if (accountBtn) {
    accountBtn.textContent = currentUser ? 'Profil' : 'Cont'
    accountBtn.title = currentUser?.email || 'Login'
  }

  const currentAtlasEditable = canEditCurrentAtlas()
  const editorActive = currentAtlasEditable && editorMode
  const publicAdminEditorActive = canEdit && editorMode && !isTeamAtlasMode()

  if (!currentUser) {
    authStatusBox.innerHTML = 'Neautentificat. Atlasul este în Reader Mode.'
  } else if (isTeamAtlasMode()) {
    const membership = currentTeamMembership()
    const role = membership
      ? teamRoleLabel(membership.role)
      : canEdit
        ? 'Platform Admin'
        : 'Member'

    if (editorActive) {
      authStatusBox.innerHTML = `<strong>Team Atlas · Editor Mode</strong><br>${escapeHtml(
        currentTeamRecord()?.name || 'Team'
      )} · ${escapeHtml(role)}`
    } else {
      authStatusBox.innerHTML = `<strong>Team Atlas</strong><br>${escapeHtml(
        currentTeamRecord()?.name || 'Team'
      )} · ${escapeHtml(role)}`
    }
  } else if (canEdit && editorMode) {
    authStatusBox.innerHTML = `<strong>Editor Mode activ</strong><br>${escapeHtml(currentUser.email)}`
  } else if (canEdit) {
    authStatusBox.innerHTML = `<strong>Logat ca editor</strong><br>${escapeHtml(currentUser.email)}<br>Momentan ești în Reader Mode.`
  } else {
    authStatusBox.innerHTML = `<strong>Logat doar pentru view:</strong><br>${escapeHtml(currentUser.email)}`
  }

  if (!canUseEditorModeAnywhere() && editorMode) {
    editorMode = false
    localStorage.setItem(CACHE_KEYS.editorMode, '0')
  }

  const editorBlocked = isAtlasLoading || !editorActive
  const selected = selectedNode()
  const hasSelectedNode = Boolean(selected)
  const selectedNodeEditable = Boolean(selected && canEditNode(selected))
  const hasNodes = nodes.length > 0

  editorModeBtn.hidden = !currentAtlasEditable
  editorModeBtn.textContent = editorMode ? 'Exit editor' : 'Editor mode'
  editorModeBtn.classList.toggle('active', editorMode && currentAtlasEditable)

  editorToolsSection.hidden = !publicAdminEditorActive
  taxonomyManagerBtn.disabled = !publicAdminEditorActive || isAtlasLoading
  publicContentManagerBtn.disabled = !publicAdminEditorActive || isAtlasLoading
  roadmapManagerBtn.disabled = !publicAdminEditorActive || isAtlasLoading
  if (teamSetupBtn) {
    teamSetupBtn.disabled = !publicAdminEditorActive || isAtlasLoading
  }

  mediaManagerBtn.disabled =
    editorBlocked || !hasSelectedNode || !selectedNodeEditable
  fileManagerBtn.disabled =
    editorBlocked || !hasSelectedNode || !selectedNodeEditable
  codeManagerBtn.disabled =
    editorBlocked || !hasSelectedNode || !selectedNodeEditable

  if (savePositionBtn) {
    savePositionBtn.hidden = true
    savePositionBtn.disabled = true
  }

  renderLayoutEditorState()

  if (
    isTaxonomyManagerOpen() &&
    (!editorMode || !canManageCurrentTaxonomy())
  ) {
    closeTaxonomyManager()
  }

  if (isMediaManagerOpen()) {
    const mediaNode = currentMediaNode()

    if (!editorMode || !mediaNode || !canEditNode(mediaNode)) {
      closeMediaManager()
    }
  }

  if (isFileManagerOpen()) {
    const fileNode = currentFileNode()

    if (!editorMode || !fileNode || !canEditNode(fileNode)) {
      closeFileManager()
    }
  }

  if (isCodeManagerOpen()) {
    const codeNode = currentCodeNode()

    if (!editorMode || !codeNode || !canEditNode(codeNode)) {
      closeCodeManager()
    }
  }

  if (!publicAdminEditorActive && isPublicContentManagerOpen()) {
    closePublicContentManager()
  }

  if (
    isRoadmapManagerOpen() &&
    !canManageRoadmapScope(roadmapManagerScope)
  ) {
    closeRoadmapManager()
  }

  if (
    isDocumentationHealthOpen() &&
    !canOpenDocumentationHealth()
  ) {
    closeDocumentationHealth()
  }

  if (isRevisionHistoryOpen()) {
    const revisionNode =
      currentRevisionHistoryNode()

    if (!canOpenRevisionHistory(revisionNode)) {
      revisionHistoryBackdrop.classList.remove('open')
      revisionHistoryTarget = null
      revisionHistoryRows = []
      revisionHistorySelectedId = null
      revisionHistoryBusy = false
    }
  }

  if (isSourceCompareOpen()) {
    renderSourceCompare()
  }

  if (isDocumentationMetaOpen()) {
    const metadataNode =
      currentDocumentationMetaNode()

    if (
      !metadataNode ||
      !editorMode ||
      !canEditNode(metadataNode)
    ) {
      documentationMetaBackdrop.classList.remove(
        'open'
      )
      documentationMetaTarget = null
      documentationReferenceEditingId = null
      documentationMetaMutationBusy = false
    }
  }

  if (isTeamSetupOpen() && !canManageCurrentTeam() && !publicAdminEditorActive) {
    closeTeamSetup()
  }

  if (isTeamMembersManagerOpen() && !canManageTeamMembers()) {
    closeTeamMembersManager()
  }

  createBtn.disabled = editorBlocked
  editBtn.disabled = editorBlocked || !selectedNodeEditable
  deleteBtn.disabled = editorBlocked || !selectedNodeEditable
  relationBtn.disabled = editorBlocked || !hasNodes

  const edgeInfo = selectedEdgeInfo()
  const edgePointCount = edgeInfo?.link?.controlPoints?.length || 0

  addEdgePointBtn.disabled =
    editorBlocked ||
    !layoutEditMode ||
    !selectedEdge ||
    edgePointCount >= MAX_EDGE_CONTROL_POINTS

  removeEdgePointBtn.disabled =
    editorBlocked ||
    !layoutEditMode ||
    !selectedEdge ||
    edgePointCount === 0

  resetEdgePathBtn.disabled =
    editorBlocked ||
    !layoutEditMode ||
    !selectedEdge ||
    edgePointCount === 0

  editEdgeBtn.disabled = editorBlocked || !selectedEdge
  deleteEdgeBtn.disabled = editorBlocked || !selectedEdge

  logoutBtn.disabled = !currentUser
  searchInput.disabled = isAtlasLoading
  categoryFilter.disabled = isAtlasLoading
  difficultyFilter.disabled = isAtlasLoading
  clearFiltersBtn.disabled = isAtlasLoading

  tagFilterChips.querySelectorAll('button').forEach((button) => {
    button.disabled = isAtlasLoading
  })

  zoomInBtn.disabled = isAtlasLoading || !hasNodes
  zoomOutBtn.disabled = isAtlasLoading || !hasNodes
  fitBtn.disabled = isAtlasLoading || !hasNodes
  fitSelectionBtn.disabled =
    isAtlasLoading || (!selectedEdge && !hasSelectedNode)
  resetViewBtn.disabled = isAtlasLoading

  if (isAtlasLoading || !publicAdminEditorActive || isTeamAtlasMode()) {
    undoBtn.disabled = true
    redoBtn.disabled = true
  }

  if (modalMode === 'tutorial' && modalBackdrop.classList.contains('open')) {
    applyTutorialPermissions()
  }
}

function setEditorMode(nextValue) {
  if (nextValue && !canEditCurrentAtlas()) {
    alert(
      isTeamAtlasMode()
        ? 'Rolul tău nu permite editarea documentației acestei echipe.'
        : 'Trebuie să fii autentificat ca editor.'
    )
    return
  }

  editorMode = Boolean(nextValue)
  localStorage.setItem(CACHE_KEYS.editorMode, editorMode ? '1' : '0')

  if (editorMode) {
    openUICollapseSection('editor')
  }

  if (!editorMode) {
    layoutEditMode = false

    relationMode = {
      active: false,
      sourceId: null
    }

    if (modalBackdrop.classList.contains('open')) {
      closeModal()
    }

    closeTaxonomyManager()
    closeMediaManager()
    closeFileManager()
    closeCodeManager()
    closePublicContentManager()
    closeRoadmapManager()

    if (isTeamSetupOpen() && !canManageCurrentTeam()) {
      closeTeamSetup()
    }
  }

  renderAll()

  refreshHistoryButtons().catch((error) => {
    console.error('History refresh after editor mode change failed:', error)
  })
}

function requireAuth() {
  if (!canEditCurrentAtlas()) {
    alert(
      isTeamAtlasMode()
        ? 'Doar Team Leader, Department Coordinator, Mentor sau Platform Admin poate modifica Team Atlas.'
        : 'Doar editorii aprobați pot modifica atlasul public.'
    )
    return false
  }

  if (!editorMode) {
    alert('Activează mai întâi Editor Mode.')
    return false
  }

  return true
}

async function refreshSession() {
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession()

  if (sessionError) {
    console.error('Session load failed:', sessionError)
  }

  currentUser = sessionData?.session?.user || null

  if (!currentUser) {
    const { data, error } = await supabase.auth.getUser()

    currentUser = error ? null : data?.user || null
  }

  await refreshEditorAccess()
  await loadRoadmapProgress()
  await loadTeamContext()
  await loadBookmarks()

  updateAuthUI()
  maybeOpenPendingTeamInvite()
  await refreshHistoryButtons()
}

const CANONICAL_URL = 'https://ftcprogrammingatlas.com/'

async function sendMagicLink() {
  const email = authEmailInput.value.trim()
  if (!email) {
    alert('Scrie email-ul mai întâi.')
    return
  }

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: true,
      emailRedirectTo: CANONICAL_URL
    }
  })

  if (error) throw error

  if (nativeAtlasApp) {
    alert('Email trimis. Introdu în aplicație codul OTP primit pe email.')
    authOtpInput?.focus()
    return
  }

  alert('Magic link trimis.')
}

async function verifyEmailOtp() {
  const email = authEmailInput.value.trim()
  const token = authOtpInput?.value.trim() || ''

  if (!email || !/^\d{6,10}$/.test(token)) {
    alert('Introdu email-ul și codul OTP primit pe email.')
    return
  }

  const { data, error } = await supabase.auth.verifyOtp({
    email,
    token,
    type: 'email'
  })

  if (error) throw error

  if (!data?.session) {
    throw new Error('Supabase nu a returnat o sesiune validă.')
  }

  authOtpInput.value = ''
  await refreshSession()
  alert('Autentificare reușită.')
}

async function signOutUser() {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

async function refreshEditorAccess() {
  if (!currentUser) {
    canEdit = false
    return false
  }

  const { data, error } = await supabase.rpc('is_atlas_editor')

  if (error) {
    console.error('Editor access check failed:', error)

    canEdit = false
    return false
  }

  canEdit = data === true

  return canEdit
}

// Relationship routing and multi-point geometry
function handleEdgePick(sourceId, targetId) {
  if (relationMode.active) return

  const edgeKey = `${sourceId}-${targetId}`
  const now = Date.now()
  const isDouble = edgeClickState.key === edgeKey && now - edgeClickState.time < 320

  edgeClickState = { key: edgeKey, time: now }
  selectEdge(sourceId, targetId)

  if (isDouble && canEditCurrentAtlas() && editorMode) {
    openSelectedEdgeEdit()
  }
}

function automaticEdgeControl(source, target) {
  const sourceSize = nodeSize(source)
  const targetSize = nodeSize(target)
  const ax = source.x + sourceSize.width / 2
  const ay = source.y + sourceSize.height / 2
  const bx = target.x + targetSize.width / 2
  const by = target.y + targetSize.height / 2
  const dx = bx - ax
  const dy = by - ay
  const dist = Math.max(Math.hypot(dx, dy), 1)
  const mx = (ax + bx) / 2
  const my = (ay + by) / 2
  const nx = -dy / dist
  const ny = dx / dist
  const sign = source.id < target.id ? 1 : -1
  const bend = clamp(dist * 0.16, 34, 110) * sign

  return {
    ax,
    ay,
    bx,
    by,
    cx: mx + nx * bend,
    cy: my + ny * bend
  }
}

// Builds a smooth cubic Bézier route through every control point
function buildSmoothEdgePath(points) {
  if (!Array.isArray(points) || points.length < 2) {
    return ''
  }

  let path = `M ${points[0].x} ${points[0].y}`

  for (let index = 0; index < points.length - 1; index += 1) {
    const p0 = points[index - 1] || points[index]
    const p1 = points[index]
    const p2 = points[index + 1]
    const p3 = points[index + 2] || p2

    const cp1x = p1.x + (p2.x - p0.x) / 6
    const cp1y = p1.y + (p2.y - p0.y) / 6
    const cp2x = p2.x - (p3.x - p1.x) / 6
    const cp2y = p2.y - (p3.y - p1.y) / 6

    path += ` C ${cp1x} ${cp1y} ${cp2x} ${cp2y} ${p2.x} ${p2.y}`
  }

  return path
}

function pointAlongRoute(points, fraction = 0.5) {
  if (!Array.isArray(points) || points.length === 0) {
    return { x: 0, y: 0 }
  }

  if (points.length === 1) {
    return { ...points[0] }
  }

  const segments = []
  let totalLength = 0

  for (let index = 0; index < points.length - 1; index += 1) {
    const start = points[index]
    const end = points[index + 1]
    const length = Math.hypot(end.x - start.x, end.y - start.y)

    segments.push({ start, end, length })
    totalLength += length
  }

  if (totalLength <= 0) {
    return { ...points[0] }
  }

  const targetLength = totalLength * clamp(fraction, 0, 1)
  let travelled = 0

  for (const segment of segments) {
    if (travelled + segment.length >= targetLength) {
      const local = segment.length > 0 ? (targetLength - travelled) / segment.length : 0

      return {
        x: segment.start.x + (segment.end.x - segment.start.x) * local,
        y: segment.start.y + (segment.end.y - segment.start.y) * local
      }
    }

    travelled += segment.length
  }

  return { ...points.at(-1) }
}

function getEdgeGeometry(source, target, link) {
  const automatic = automaticEdgeControl(source, target)
  const controlPoints = normalizeEdgeControlPoints(link?.controlPoints)

  if (controlPoints.length === 0) {
    const labelX = 0.25 * automatic.ax + 0.5 * automatic.cx + 0.25 * automatic.bx

    const labelY = 0.25 * automatic.ay + 0.5 * automatic.cy + 0.25 * automatic.by - 3

    return {
      ...automatic,
      custom: false,
      controlPoints,
      routePoints: [
        { x: automatic.ax, y: automatic.ay },
        { x: automatic.cx, y: automatic.cy },
        { x: automatic.bx, y: automatic.by }
      ],
      guidePoints: [
        { x: automatic.ax, y: automatic.ay },
        { x: automatic.bx, y: automatic.by }
      ],
      pathD: `M ${automatic.ax} ${automatic.ay} Q ${automatic.cx} ${automatic.cy} ${automatic.bx} ${automatic.by}`,
      guideD: `M ${automatic.ax} ${automatic.ay} L ${automatic.bx} ${automatic.by}`,
      labelX,
      labelY
    }
  }

  const routePoints = [
    { x: automatic.ax, y: automatic.ay },
    ...controlPoints,
    { x: automatic.bx, y: automatic.by }
  ]

  const labelPoint = pointAlongRoute(routePoints, 0.5)

  return {
    ...automatic,
    custom: true,
    controlPoints,
    routePoints,
    guidePoints: routePoints,
    pathD: buildSmoothEdgePath(routePoints),
    guideD: routePoints
      .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`)
      .join(' '),
    labelX: labelPoint.x,
    labelY: labelPoint.y - 3
  }
}

function edgeWorldPoint(clientX, clientY) {
  return {
    x: clamp((clientX - view.x) / view.scale, 0, WORLD_WIDTH),
    y: clamp((clientY - view.y) / view.scale, 0, WORLD_HEIGHT)
  }
}

function startEdgeControlDrag(event, sourceId, targetId, pointIndex) {
  if (!canEditCurrentAtlas() || !editorMode || !layoutEditMode) return
  if (event.button !== 0 && event.pointerType !== 'touch') return

  const info = getEdgeInfo(sourceId, targetId)
  const points = normalizeEdgeControlPoints(info?.link?.controlPoints)

  if (!info || !points[pointIndex]) return

  event.preventDefault()
  event.stopPropagation()

  selectedEdge = {
    sourceId: Number(sourceId),
    targetId: Number(targetId)
  }

  selectedEdgePointIndex = Number(pointIndex)
  selectedId = Number(sourceId)
  detailOpen = false
  info.link.controlPoints = points

  edgeControlDragState = {
    pointerId: event.pointerId,
    sourceId: Number(sourceId),
    targetId: Number(targetId),
    pointIndex: Number(pointIndex),
    originalPoints: points.map((point) => ({ ...point })),
    moved: false
  }

  document.body.classList.add('edge-control-dragging')

  const onMove = (moveEvent) => {
    if (!edgeControlDragState || moveEvent.pointerId !== edgeControlDragState.pointerId) {
      return
    }

    moveEvent.preventDefault()

    const currentInfo = getEdgeInfo(edgeControlDragState.sourceId, edgeControlDragState.targetId)

    if (!currentInfo) return

    const point = edgeWorldPoint(moveEvent.clientX, moveEvent.clientY)

    const nextPoints = normalizeEdgeControlPoints(currentInfo.link.controlPoints)

    nextPoints[edgeControlDragState.pointIndex] = point
    currentInfo.link.controlPoints = nextPoints
    edgeControlDragState.moved = true
    renderLinks()
  }

  const finish = async (upEvent) => {
    if (!edgeControlDragState || upEvent.pointerId !== edgeControlDragState.pointerId) {
      return
    }

    document.removeEventListener('pointermove', onMove)
    document.removeEventListener('pointerup', finish)
    document.removeEventListener('pointercancel', finish)
    document.body.classList.remove('edge-control-dragging')

    const state = edgeControlDragState
    edgeControlDragState = null

    const currentInfo = getEdgeInfo(state.sourceId, state.targetId)

    if (!currentInfo || !state.moved) {
      renderAll()
      return
    }

    const before =
      state.originalPoints.map((point) => ({ ...point }))

    const after =
      normalizeEdgeControlPoints(
        currentInfo.link.controlPoints
      )

    queueLayoutEdgeDraft(
      state.sourceId,
      state.targetId,
      before
    )

    recordLayoutAction({
      type: 'edge',
      sourceId: Number(state.sourceId),
      targetId: Number(state.targetId),
      before,
      after
    })

    renderAll()
  }

  document.addEventListener('pointermove', onMove, { passive: false })
  document.addEventListener('pointerup', finish)
  document.addEventListener('pointercancel', finish)
  renderLinks()
}

function findEdgePointInsertion(source, target, controlPoints) {
  const sourceGeometry = automaticEdgeControl(source, target)
  const routePoints = [
    { x: sourceGeometry.ax, y: sourceGeometry.ay },
    ...controlPoints,
    { x: sourceGeometry.bx, y: sourceGeometry.by }
  ]

  let longestIndex = 0
  let longestLength = -1

  for (let index = 0; index < routePoints.length - 1; index += 1) {
    const start = routePoints[index]
    const end = routePoints[index + 1]
    const length = Math.hypot(end.x - start.x, end.y - start.y)

    if (length > longestLength) {
      longestLength = length
      longestIndex = index
    }
  }

  if (controlPoints.length === 0) {
    return {
      index: 0,
      point: {
        x: 0.25 * sourceGeometry.ax + 0.5 * sourceGeometry.cx + 0.25 * sourceGeometry.bx,
        y: 0.25 * sourceGeometry.ay + 0.5 * sourceGeometry.cy + 0.25 * sourceGeometry.by
      }
    }
  }

  const start = routePoints[longestIndex]
  const end = routePoints[longestIndex + 1]

  return {
    index: longestIndex,
    point: {
      x: (start.x + end.x) / 2,
      y: (start.y + end.y) / 2
    }
  }
}

async function addEdgeControlPoint() {
  if (!canEditCurrentAtlas() || !editorMode || !layoutEditMode) return

  const info = selectedEdgeInfo()
  if (!info) {
    alert('Selectează mai întâi o muchie.')
    return
  }

  const target = findNode(info.link.targetId)
  if (!target) return

  const before = normalizeEdgeControlPoints(info.link.controlPoints)

  if (before.length >= MAX_EDGE_CONTROL_POINTS) {
    alert(`Poți folosi maximum ${MAX_EDGE_CONTROL_POINTS} puncte pe o muchie.`)
    return
  }

  const insertion = findEdgePointInsertion(info.source, target, before)
  const after = before.map((point) => ({ ...point }))
  after.splice(insertion.index, 0, insertion.point)

  info.link.controlPoints = after
  selectedEdgePointIndex = insertion.index

  queueLayoutEdgeDraft(info.source.id, target.id, before)
  recordLayoutAction({
    type: 'edge',
    sourceId: Number(info.source.id),
    targetId: Number(target.id),
    before,
    after: after.map((point) => ({ ...point }))
  })

  renderAll()
}

async function removeSelectedEdgeControlPoint() {
  if (!canEditCurrentAtlas() || !editorMode || !layoutEditMode) return

  const info = selectedEdgeInfo()
  if (!info) {
    alert('Selectează mai întâi o muchie.')
    return
  }

  const before = normalizeEdgeControlPoints(info.link.controlPoints)
  if (before.length === 0) return

  const pointIndex =
    Number.isInteger(selectedEdgePointIndex) &&
    selectedEdgePointIndex >= 0 &&
    selectedEdgePointIndex < before.length
      ? selectedEdgePointIndex
      : before.length - 1

  const after = before.map((point) => ({ ...point }))
  after.splice(pointIndex, 1)
  info.link.controlPoints = after

  selectedEdgePointIndex = after.length
    ? Math.min(pointIndex, after.length - 1)
    : null

  queueLayoutEdgeDraft(info.source.id, info.link.targetId, before)
  recordLayoutAction({
    type: 'edge',
    sourceId: Number(info.source.id),
    targetId: Number(info.link.targetId),
    before,
    after: after.map((point) => ({ ...point }))
  })

  renderAll()
}

async function resetEdgeControl(sourceId, targetId) {
  if (!canEditCurrentAtlas() || !editorMode || !layoutEditMode) return

  const info = getEdgeInfo(sourceId, targetId)
  if (!info) return

  const before = normalizeEdgeControlPoints(info.link.controlPoints)
  if (before.length === 0) return

  const after = []
  info.link.controlPoints = after
  selectedEdgePointIndex = null

  queueLayoutEdgeDraft(sourceId, targetId, before)
  recordLayoutAction({
    type: 'edge',
    sourceId: Number(sourceId),
    targetId: Number(targetId),
    before,
    after
  })

  renderAll()
}


// Atlas rendering
function renderLinks() {
  linkLayer.setAttribute('viewBox', `0 0 ${WORLD_WIDTH} ${WORLD_HEIGHT}`)
  linkLayer.setAttribute('width', WORLD_WIDTH)
  linkLayer.setAttribute('height', WORLD_HEIGHT)

  const parts = []
  const lowMotion = prefersReducedMotion()
  const visibleIds = getVisibleNodeIdSet()
  const controlRadius = isTouchLayout() ? 14 : 10
  const controlCoreRadius = isTouchLayout() ? 5 : 4

  parts.push(`
    <defs>
      <marker id="edgeArrow" markerWidth="12" markerHeight="12" refX="10" refY="6" orient="auto" markerUnits="strokeWidth">
        <path d="M0,0 L0,12 L10,6 z" fill="rgba(216,180,255,0.96)"></path>
      </marker>
      <marker id="edgeArrowHot" markerWidth="12" markerHeight="12" refX="10" refY="6" orient="auto" markerUnits="strokeWidth">
        <path d="M0,0 L0,12 L10,6 z" fill="rgba(255,190,205,0.98)"></path>
      </marker>
    </defs>
  `)

  nodes.forEach((source) => {
    if (!visibleIds.has(Number(source.id))) return

    source.links.forEach((link) => {
      const target = findNode(link.targetId)
      if (!target || !visibleIds.has(Number(target.id))) return

      const edgeSelected = isEdgeSelected(source.id, target.id)
      const highlight = edgeSelected || source.id === selectedId || target.id === selectedId
      const geometry = getEdgeGeometry(source, target, link)
      const rawLabel = link.label || 'relație'
      const label = escapeHtml(rawLabel)
      const labelWidth = Math.max(76, rawLabel.length * 6.6)
      const labelX = -labelWidth / 2

      const baseColor = edgeSelected
        ? 'rgba(255, 77, 109, 0.52)'
        : highlight
          ? 'rgba(205, 112, 255, 0.34)'
          : 'rgba(177, 76, 255, 0.24)'

      const glowColor = edgeSelected ? 'rgba(255, 77, 109, 0.18)' : 'rgba(177, 76, 255, 0.10)'

      const flowColor = edgeSelected
        ? 'rgba(255, 190, 205, 0.98)'
        : highlight
          ? 'rgba(236, 200, 255, 0.96)'
          : 'rgba(216, 180, 255, 0.92)'

      const baseWidth = edgeSelected ? 2.5 : highlight ? 2.1 : 1.4
      const flowWidth = edgeSelected ? 2.6 : highlight ? 2.15 : 1.8
      const glowWidth = edgeSelected ? 8 : 6
      const duration = edgeSelected ? 1.05 : highlight ? 1.3 : 1.8

      const glowPath = lowMotion
        ? ''
        : `<path class="edge-glow" d="${geometry.pathD}" fill="none" stroke="${glowColor}" stroke-width="${glowWidth}" stroke-linecap="round" />`

      const flowStyle = lowMotion
        ? 'filter: none;'
        : `animation: circuitFlow ${duration}s linear infinite, circuitPulse 2s ease-in-out infinite; filter: drop-shadow(0 0 6px rgba(177,76,255,0.28));`

      const editorControl =
        edgeSelected && canEditCurrentAtlas() && editorMode && layoutEditMode
          ? `
          <path
            class="edge-control-guide"
            d="${geometry.guideD}"
          />
          ${geometry.controlPoints
            .map(
              (point, pointIndex) => `
            <circle
              class="edge-control-handle ${selectedEdgePointIndex === pointIndex ? 'selected' : ''}"
              data-edge-control-source="${source.id}"
              data-edge-control-target="${target.id}"
              data-edge-point-index="${pointIndex}"
              cx="${point.x}"
              cy="${point.y}"
              r="${controlRadius}"
            />
            <circle
              class="edge-control-core"
              cx="${point.x}"
              cy="${point.y}"
              r="${controlCoreRadius}"
            />
            <text
              class="edge-control-number"
              x="${point.x}"
              y="${point.y - controlRadius - 6}"
              text-anchor="middle"
            >${pointIndex + 1}</text>
          `
            )
            .join('')}
        `
          : ''

      parts.push(`
        <g class="edge-group ${edgeSelected ? 'selected' : ''}" data-edge-source="${source.id}" data-edge-target="${target.id}">
          ${glowPath}
          <path class="edge-base" d="${geometry.pathD}" fill="none" stroke="${baseColor}" stroke-width="${baseWidth}" stroke-linecap="round" />
          <path
            class="edge-flow"
            d="${geometry.pathD}"
            fill="none"
            stroke="${flowColor}"
            stroke-width="${flowWidth}"
            stroke-linecap="round"
            stroke-dasharray="4 24"
            marker-end="url(${edgeSelected ? '#edgeArrowHot' : '#edgeArrow'})"
            style="${flowStyle}"
          />
          <g class="edge-label" transform="translate(${geometry.labelX}, ${geometry.labelY})">
            <rect
              x="${labelX}"
              y="-12"
              rx="10"
              ry="10"
              width="${labelWidth}"
              height="24"
              fill="${edgeSelected ? 'rgba(16, 8, 12, 0.98)' : 'rgba(7, 7, 9, 0.94)'}"
              stroke="${edgeSelected ? 'rgba(255,77,109,0.42)' : 'rgba(177,76,255,0.16)'}"
            />
            <text
              x="0"
              y="4"
              fill="${edgeSelected ? '#ffe3ea' : highlight ? '#edd7ff' : '#d6b5ff'}"
              text-anchor="middle"
              font-size="${edgeSelected ? '11' : '10.5'}"
              font-family="Inter, system-ui"
              font-weight="${edgeSelected ? '700' : '600'}"
            >${label}</text>
          </g>
          <path class="edge-hit" data-source="${source.id}" data-target="${target.id}" d="${geometry.pathD}"></path>
          <g class="edge-label-hit" data-source="${source.id}" data-target="${target.id}" transform="translate(${geometry.labelX}, ${geometry.labelY})">
            <rect
              x="${labelX - 8}"
              y="-16"
              rx="12"
              ry="12"
              width="${labelWidth + 16}"
              height="32"
              fill="transparent"
              pointer-events="all"
            />
          </g>
          ${editorControl}
        </g>
      `)
    })
  })

  linkLayer.innerHTML = parts.join('')

  linkLayer.querySelectorAll('.edge-hit, .edge-label-hit').forEach((hit) => {
    hit.addEventListener('click', (event) => {
      event.stopPropagation()
      const sourceId = Number(hit.dataset.source)
      const targetId = Number(hit.dataset.target)
      handleEdgePick(sourceId, targetId)
    })
  })

  linkLayer.querySelectorAll('[data-edge-control-source]').forEach((handle) => {
    handle.addEventListener('pointerdown', (event) => {
      startEdgeControlDrag(
        event,
        Number(handle.dataset.edgeControlSource),
        Number(handle.dataset.edgeControlTarget),
        Number(handle.dataset.edgePointIndex)
      )
    })
  })
}

function renderNodes() {
  nodeLayer.innerHTML = ''
  const orderedNodes = getVisibleNodes().sort((a, b) =>
    a.id === selectedId ? 1 : b.id === selectedId ? -1 : 0
  )

  orderedNodes.forEach((node) => {
    const { width: nodeWidthValue, height: nodeHeightValue } = nodeSize(node)
    const el = document.createElement('a')
    el.href = nodeRoutePath(node)
    el.setAttribute('aria-label', `Deschide documentația: ${node.title}`)
    el.dataset.nodeId = String(node.id)

    const healthIssues = qualityLensIssues(node)

    el.className = [
      'node',
      node.id === selectedId ? 'active' : '',
      qualityLensEnabled && canOpenDocumentationHealth()
        ? healthIssues.length > 0
          ? 'quality-attention'
          : 'quality-clean'
        : '',
      layoutEditMode && canEditNode(node)
        ? 'layout-editable'
        : ''
    ]
      .filter(Boolean)
      .join(' ')
    el.style.left = `${node.x}px`
    el.style.top = `${node.y}px`
    el.style.width = `${nodeWidthValue}px`
    el.style.height = `${nodeHeightValue}px`
    el.style.minHeight = `${nodeHeightValue}px`

    const tagNames = nodeTagNames(node)
    const resizeHandles =
      canEditNode(node) && editorMode && layoutEditMode && node.id === selectedId
        ? `
        <span class="node-resize-handle east" data-node-resize="e" aria-hidden="true"></span>
        <span class="node-resize-handle south" data-node-resize="s" aria-hidden="true"></span>
        <span class="node-resize-handle southeast" data-node-resize="se" aria-hidden="true"></span>
      `
        : ''

    el.innerHTML = `
      <div class="node-head">
        <div class="node-badges">
          <span class="pill category-pill">${escapeHtml(nodeCategoryName(node))}</span>
          <span class="pill difficulty-pill">${escapeHtml(nodeDifficultyName(node))}</span>
        </div>
        ${
          qualityLensEnabled &&
          canOpenDocumentationHealth()
            ? healthIssues.length > 0
              ? `<span class="node-health-badge">⚠ ${healthIssues.length}</span>`
              : '<span class="node-health-badge clean">✓</span>'
            : ''
        }
        ${node.id === selectedId ? `<span class="open-mark">${canEditNode(node) && editorMode && layoutEditMode ? '2× open' : 'open'}</span>` : ''}
      </div>
      <h3 class="node-title">${escapeHtml(node.title)}</h3>
      <p class="node-preview">${escapeHtml(nodeContentPlainText(node))}</p>
      ${
        tagNames.length
          ? `
        <div class="node-tags-preview">
          ${tagNames
            .slice(0, 3)
            .map((name) => `<span class="mini-tag">${escapeHtml(name)}</span>`)
            .join('')}
        </div>
      `
          : ''
      }
      ${resizeHandles}
    `

    let startClientX = 0
    let startClientY = 0
    let startNodeX = node.x
    let startNodeY = node.y
    let startViewX = view.x
    let startViewY = view.y
    let moved = false
    let interactionMode = 'idle'
    let pointerId = null
    let touchLongPressTimer = null

    const cleanup = () => {
      document.removeEventListener('pointermove', onMove)
      document.removeEventListener('pointerup', onUp)
      document.removeEventListener('pointercancel', onUp)

      if (touchLongPressTimer) {
        clearTimeout(touchLongPressTimer)
        touchLongPressTimer = null
      }

      el.classList.remove('invalid-drop')
      mapSurface.classList.remove('panning')
    }

    const onMove = (event) => {
      if (event.pointerId !== pointerId) return

      const rawDx = event.clientX - startClientX
      const rawDy = event.clientY - startClientY
      const distance = Math.hypot(rawDx, rawDy)

      if (event.pointerType === 'touch') {
        if (interactionMode === 'pending' && distance > DRAG_THRESHOLD) {
          if (touchLongPressTimer) {
            clearTimeout(touchLongPressTimer)
            touchLongPressTimer = null
          }
          interactionMode = 'pan'
        }

        if (interactionMode === 'pan') {
          moved = true
          mapSurface.classList.add('panning')
          view.x = startViewX + rawDx
          view.y = startViewY + rawDy
          applyView()
          return
        }

        if (interactionMode !== 'drag') return
      } else {
        if (!canEditNode(node) || !editorMode || !layoutEditMode) return
        if (!moved && distance < DRAG_THRESHOLD) return
        interactionMode = 'drag'
      }

      moved = true

      const dx = rawDx / view.scale
      const dy = rawDy / view.scale
      const nextX = clamp(startNodeX + dx, 20, WORLD_WIDTH - nodeWidthValue - 20)
      const nextY = clamp(startNodeY + dy, 20, WORLD_HEIGHT - nodeHeightValue - 20)

      el.style.left = `${nextX}px`
      el.style.top = `${nextY}px`

      const invalid = overlapsAny(node.id, nextX, nextY, nodeWidthValue, nodeHeightValue)

      el.classList.toggle('invalid-drop', invalid)
    }

    const onUp = (event) => {
      if (event.pointerId !== pointerId) return
      cleanup()

      try {
        el.releasePointerCapture(pointerId)
      } catch {}

      if (event.pointerType === 'touch') {
        if (interactionMode === 'pending') {
          handleNodeTap(node.id)
          return
        }

        if (interactionMode === 'pan') return
      } else if (interactionMode !== 'drag') {
        handleNodeTap(node.id)
        return
      }

      if (!canEditNode(node) || !editorMode || !layoutEditMode || interactionMode !== 'drag') {
        renderAll()
        return
      }

      const dx = (event.clientX - startClientX) / view.scale
      const dy = (event.clientY - startClientY) / view.scale

      const desiredX = clamp(startNodeX + dx, 20, WORLD_WIDTH - nodeWidthValue - 20)

      const desiredY = clamp(startNodeY + dy, 20, WORLD_HEIGHT - nodeHeightValue - 20)

      const free = findNearestFreeSpot(node.id, desiredX, desiredY)
      const changed = Number(free.x) !== Number(node.x) || Number(free.y) !== Number(node.y)

      if (!changed) {
        selectedId = node.id
        clearEdgeSelection()
        renderAll()
        return
      }

      const before = layoutNodeGeometry(node)

      node.x = Number(free.x)
      node.y = Number(free.y)

      const after = layoutNodeGeometry(node)

      queueLayoutNodeDraft(node, before)
      recordLayoutAction({
        type: 'node',
        nodeId: Number(node.id),
        before,
        after
      })

      selectedId = node.id
      clearEdgeSelection()
      renderAll()
    }

    // Keep a real href for crawlers, new-tab actions and accessibility while
    // preserving the Atlas pointer/drag interaction for an ordinary click.
    el.addEventListener('click', (event) => {
      const modified = event.ctrlKey || event.metaKey || event.shiftKey || event.altKey
      if (modified) return

      event.preventDefault()

      if (event.detail === 0) {
        handleNodeTap(node.id)
      }
    })

    el.addEventListener('pointerdown', (event) => {
      if (event.button !== 0 && event.pointerType !== 'touch') return

      const modified = event.ctrlKey || event.metaKey || event.shiftKey || event.altKey
      if (modified && event.pointerType !== 'touch') return

      event.stopPropagation()

      pointerId = event.pointerId
      startClientX = event.clientX
      startClientY = event.clientY
      startNodeX = node.x
      startNodeY = node.y
      startViewX = view.x
      startViewY = view.y
      moved = false
      interactionMode = event.pointerType === 'touch' ? 'pending' : 'idle'

      if (event.pointerType === 'touch' && canEditNode(node) && editorMode && layoutEditMode) {
        touchLongPressTimer = window.setTimeout(() => {
          interactionMode = 'drag'
        }, MOBILE_LONG_PRESS_MS)
      }

      try {
        el.setPointerCapture(pointerId)
      } catch {}

      document.addEventListener('pointermove', onMove)
      document.addEventListener('pointerup', onUp)
      document.addEventListener('pointercancel', onUp)
    })

    el.querySelectorAll('[data-node-resize]').forEach((handle) => {
      handle.addEventListener('pointerdown', (event) => {
        if (!canEditNode(node) || !editorMode || !layoutEditMode) return
        if (event.button !== 0 && event.pointerType !== 'touch') return

        event.preventDefault()
        event.stopPropagation()

        const axis = handle.dataset.nodeResize
        const resizePointerId = event.pointerId
        const originalWidth = node.width
        const originalHeight = node.height
        const startWidth = nodeWidthValue
        const startHeight = nodeHeightValue
        let nextWidth = startWidth
        let nextHeight = startHeight
        let invalid = false
        let changed = false

        document.body.classList.add('node-resizing')

        const onResizeMove = (moveEvent) => {
          if (moveEvent.pointerId !== resizePointerId) return
          moveEvent.preventDefault()

          const dx = (moveEvent.clientX - event.clientX) / view.scale
          const dy = (moveEvent.clientY - event.clientY) / view.scale

          nextWidth = axis.includes('e')
            ? clamp(
                startWidth + dx,
                NODE_MIN_WIDTH,
                Math.min(NODE_MAX_WIDTH, WORLD_WIDTH - node.x - 20)
              )
            : startWidth

          nextHeight = axis.includes('s')
            ? clamp(
                startHeight + dy,
                NODE_MIN_HEIGHT,
                Math.min(NODE_MAX_HEIGHT, WORLD_HEIGHT - node.y - 20)
              )
            : startHeight

          invalid = overlapsAny(node.id, node.x, node.y, nextWidth, nextHeight)

          changed =
            Math.round(nextWidth) !== Math.round(startWidth) ||
            Math.round(nextHeight) !== Math.round(startHeight)

          node.width = nextWidth
          node.height = nextHeight
          el.style.width = `${nextWidth}px`
          el.style.height = `${nextHeight}px`
          el.classList.toggle('invalid-drop', invalid)
          renderLinks()
        }

        const finishResize = async (upEvent) => {
          if (upEvent.pointerId !== resizePointerId) return

          document.removeEventListener('pointermove', onResizeMove)
          document.removeEventListener('pointerup', finishResize)
          document.removeEventListener('pointercancel', finishResize)
          document.body.classList.remove('node-resizing')
          el.classList.remove('invalid-drop')

          if (!changed || invalid) {
            node.width = originalWidth
            node.height = originalHeight
            renderAll()
            return
          }

          const before = {
            x: Number(node.x),
            y: Number(node.y),
            width: originalWidth == null ? null : Number(originalWidth),
            height: originalHeight == null ? null : Number(originalHeight)
          }

          node.width = Math.round(nextWidth)
          node.height = Math.round(nextHeight)

          const after = layoutNodeGeometry(node)

          queueLayoutNodeDraft(node, before)
          recordLayoutAction({
            type: 'node',
            nodeId: Number(node.id),
            before,
            after
          })

          renderAll()
        }

        document.addEventListener('pointermove', onResizeMove, { passive: false })
        document.addEventListener('pointerup', finishResize)
        document.addEventListener('pointercancel', finishResize)
      })
    })

    nodeLayer.appendChild(el)
  })
}

function renderSelectedStrip() {
  if (selectedEdge) {
    const info = getEdgeInfo(selectedEdge.sourceId, selectedEdge.targetId)
    const target = info ? findNode(info.link.targetId) : null

    if (info && target) {
      const pointCount = normalizeEdgeControlPoints(info.link.controlPoints).length

      const selectedPointText =
        Number.isInteger(selectedEdgePointIndex) &&
        selectedEdgePointIndex >= 0 &&
        selectedEdgePointIndex < pointCount
          ? ` · punctul ${selectedEdgePointIndex + 1} selectat`
          : ''

      selectedStrip.innerHTML = `
        <strong>Muchie selectată</strong><br>
        ${escapeHtml(info.source.title)} → ${escapeHtml(target.title)} ·
        ${escapeHtml(info.link.label || 'relație')}<br>
        ${pointCount} ${pointCount === 1 ? 'punct de traseu' : 'puncte de traseu'}${selectedPointText}<br>
        ${
          canEditCurrentAtlas() && editorMode && layoutEditMode
            ? 'Layout Edit Mode · folosește „+ Punct muchie”, apoi trage fiecare punct numerotat.'
            : ''
        }
      `
      return
    }
  }

  const node = selectedNode()
  if (!node) {
    selectedStrip.innerHTML = hasActiveFilters()
      ? 'Niciun nod nu corespunde filtrelor.'
      : 'Niciun nod selectat.'
    return
  }

  const { width, height } = nodeSize(node)

  const unsavedPositionText = layoutNodeDrafts.has(Number(node.id))
    ? '<br><strong>Layout nesalvat</strong> · folosește Save layout sau Discard.'
    : ''

  selectedStrip.innerHTML = `
    <strong>${escapeHtml(node.title)}</strong><br>
    ${escapeHtml(nodeCategoryName(node))} ·
    ${escapeHtml(nodeDifficultyName(node))} ·
    ${node.links.length} relații ·
    ${Math.round(width)} × ${Math.round(height)} px
    ${unsavedPositionText}
  `
}

function renderModeStrip() {
  if (!relationMode.active) {
    relationBtn.classList.remove('active')
    relationBtn.textContent = 'Adaugă relație'

    if (isTeamAtlasMode()) {
      const membership = currentTeamMembership()
      modeStrip.classList.add('show')
      modeStrip.innerHTML = `
        <strong>Team Atlas</strong><br>
        ${escapeHtml(currentTeamRecord()?.name || 'Team')} ·
        ${escapeHtml(
          membership
            ? teamRoleLabel(membership.role)
            : canEdit
              ? 'Platform Admin'
              : 'Member'
        )} ·
        documentație privată
      `
      return
    }

    modeStrip.classList.remove('show')
    modeStrip.innerHTML = ''
    return
  }

  relationBtn.classList.add('active')
  relationBtn.textContent = 'Anulează'
  modeStrip.classList.add('show')
  openUICollapseSection('status')

  if (!relationMode.sourceId) {
    modeStrip.innerHTML =
      '<strong>Mod relație activ</strong><br>Alege mai întâi nodul sursă, apoi apasă pe nodul destinație.'
    return
  }

  const source = findNode(relationMode.sourceId)
  modeStrip.innerHTML = `<strong>Mod relație activ</strong><br>Sursa: ${escapeHtml(source?.title || '—')}. Acum apasă pe nodul destinație.`
}

// Media Manager
function currentMediaNode() {
  return findNode(mediaManagerNodeId)
}

function isMediaManagerOpen() {
  return mediaManagerBackdrop.classList.contains('open')
}

function setMediaMutationBusy(nextValue, status = '') {
  mediaMutationBusy = Boolean(nextValue)

  uploadMediaBtn.disabled = mediaMutationBusy
  addExternalMediaBtn.disabled = mediaMutationBusy
  closeMediaManagerBtn.disabled = mediaMutationBusy
  closeMediaManagerFooterBtn.disabled = mediaMutationBusy

  mediaManagerList.querySelectorAll('button, input, textarea').forEach((element) => {
    element.disabled = mediaMutationBusy
  })

  if (status) mediaUploadStatus.textContent = status
}

function resetMediaCreateForms() {
  mediaFileInput.value = ''
  mediaUploadTitleInput.value = ''
  mediaUploadCaptionInput.value = ''
  mediaExternalUrlInput.value = ''
  mediaExternalTitleInput.value = ''
  mediaExternalCaptionInput.value = ''
  mediaUploadStatus.textContent = ''
}

function openMediaManager(nodeId = selectedId) {
  if (!requireAuth()) return

  const node = findNode(nodeId)
  if (!node) {
    alert('Selectează mai întâi un nod.')
    return
  }

  if (!canEditNode(node)) {
    alert('Rolul tău nu permite editarea media din acest nod.')
    return
  }

  mediaManagerNodeId = Number(node.id)
  resetMediaCreateForms()
  mediaManagerBackdrop.classList.add('open')
  renderMediaManager()
}

function closeMediaManager() {
  if (mediaMutationBusy) return
  mediaManagerBackdrop.classList.remove('open')
  mediaManagerNodeId = null
  resetMediaCreateForms()
}

function renderMediaManager() {
  const node = currentMediaNode()

  if (!node) {
    mediaManagerTitle.textContent = 'Media nod'
    mediaManagerSummary.textContent = 'Nodul nu mai există.'
    mediaManagerList.innerHTML = ''
    return
  }

  const items = Array.isArray(node.media) ? node.media : []

  mediaManagerTitle.textContent = `Media · ${node.title}`
  mediaManagerSummary.innerHTML = `
    <strong>${items.length}</strong> ${items.length === 1 ? 'element' : 'elemente'}
  `

  if (items.length === 0) {
    mediaManagerList.innerHTML = `
      <div class="media-manager-empty">
        <strong>Nicio media.</strong>
      </div>
    `
    return
  }

  mediaManagerList.innerHTML = items
    .map(
      (media, index) => `
    <article class="media-manager-item" data-media-id="${media.id}">
      <div class="media-manager-preview">
        ${renderMediaPreview(media, true)}
      </div>

      <div class="media-manager-item-body">
        <div class="media-manager-item-meta">
          <span>${escapeHtml(mediaTypeLabel(media))}</span>
          ${media.fileSize ? `<span>${escapeHtml(humanFileSize(media.fileSize))}</span>` : ''}
        </div>

        <div class="field">
          <label>Titlu</label>
          <input data-media-title value="${escapeHtmlText(media.title)}" maxlength="160" placeholder="Ex: Dashboard după tuning">
        </div>

        <div class="field">
          <label>Descriere</label>
          <textarea data-media-caption rows="3" maxlength="1200" placeholder="Ce trebuie observat aici?">${escapeHtmlText(media.caption)}</textarea>
        </div>

        <div class="media-manager-actions">
          <button class="btn" type="button" data-media-move="-1" ${index === 0 ? 'disabled' : ''}>↑</button>
          <button class="btn" type="button" data-media-move="1" ${index === items.length - 1 ? 'disabled' : ''}>↓</button>
          <button class="btn primary" type="button" data-media-save>Salvează textul</button>
          <button class="btn danger" type="button" data-media-delete>Șterge</button>
        </div>
      </div>
    </article>
  `
    )
    .join('')

  mediaManagerList.querySelectorAll('[data-media-save]').forEach((button) => {
    button.addEventListener('click', () => {
      const card = button.closest('[data-media-id]')
      saveMediaCard(card).catch((error) => {
        console.error('Media metadata update failed:', error)
        alert(error.message || 'Eroare la salvarea media.')
      })
    })
  })

  mediaManagerList.querySelectorAll('[data-media-delete]').forEach((button) => {
    button.addEventListener('click', () => {
      const card = button.closest('[data-media-id]')
      deleteMediaItem(Number(card.dataset.mediaId)).catch((error) => {
        console.error('Media delete failed:', error)
        alert(error.message || 'Eroare la ștergerea media.')
      })
    })
  })

  mediaManagerList.querySelectorAll('[data-media-move]').forEach((button) => {
    button.addEventListener('click', () => {
      const card = button.closest('[data-media-id]')
      moveMediaItem(Number(card.dataset.mediaId), Number(button.dataset.mediaMove)).catch(
        (error) => {
          console.error('Media reorder failed:', error)
          alert(error.message || 'Eroare la reordonarea media.')
        }
      )
    })
  })

  setMediaMutationBusy(mediaMutationBusy)
}

async function refreshAfterMediaMutation() {
  const nodeId = mediaManagerNodeId
  const nodeWasTeamNode = Boolean(currentMediaNode()?.isTeamNode)
  const body = mediaManagerBackdrop.querySelector('.media-manager-body')
  const previousScrollTop = body?.scrollTop || 0

  if (nodeWasTeamNode) {
    await loadActiveTeamAtlasNodes()
  } else {
    await fetchAllData()
  }

  mediaManagerNodeId = nodeId

  if (isMediaManagerOpen()) {
    renderMediaManager()

    restoreModalScrollPosition(
      mediaManagerBackdrop.querySelector('.media-manager-body'),
      previousScrollTop
    )
  }
}

async function uploadSelectedMedia() {
  if (!requireAuth() || mediaMutationBusy) return

  const node = currentMediaNode()
  const file = mediaFileInput.files?.[0]

  if (!node) throw new Error('Nodul nu mai există.')
  if (!file) {
    mediaFileInput.focus()
    throw new Error('Alege mai întâi o imagine sau un videoclip.')
  }

  const isImage = file.type.startsWith('image/')
  const isVideo = file.type.startsWith('video/')

  if (!isImage && !isVideo) {
    throw new Error('Sunt acceptate numai imagini și videoclipuri.')
  }

  if (!ALLOWED_MEDIA_MIME_TYPES.has(file.type)) {
    throw new Error('Format neacceptat. Folosește JPG, PNG, WEBP, GIF, MP4, WebM sau MOV.')
  }

  if (file.size > MAX_MEDIA_FILE_SIZE) {
    throw new Error('Fișierul depășește limita de 50 MB.')
  }

  const safeName = sanitizeStorageFilename(file.name)
  const storageBucket = node.isTeamNode ? TEAM_MEDIA_BUCKET : MEDIA_BUCKET
  const storagePath = node.isTeamNode
    ? `${PROJECT_ID}/${Number(node.teamId || activeTeamId)}/${node.id}/${Date.now()}-${safeName}`
    : `${PROJECT_ID}/${node.id}/${Date.now()}-${safeName}`
  const nextOrder =
    (node.media || []).reduce((max, item) => Math.max(max, Number(item.sortOrder || 0)), 0) + 10

  setMediaMutationBusy(true, `Se încarcă ${file.name}...`)

  let uploaded = false

  try {
    const { error: uploadError } = await supabase.storage
      .from(storageBucket)
      .upload(storagePath, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type
      })

    if (uploadError) throw uploadError
    uploaded = true

    await createMediaRemote({
      nodeId: node.id,
      mediaType: isImage ? 'image' : 'video',
      storagePath,
      mimeType: file.type,
      fileSize: file.size,
      title: mediaUploadTitleInput.value.trim() || file.name,
      caption: mediaUploadCaptionInput.value.trim(),
      sortOrder: nextOrder
    })

    resetMediaCreateForms()
    mediaUploadStatus.textContent = 'Fișier încărcat cu succes.'
    await refreshAfterMediaMutation()
  } catch (error) {
    if (uploaded) {
      await supabase.storage
        .from(storageBucket)
        .remove([storagePath])
        .catch(() => {})
    }
    throw error
  } finally {
    setMediaMutationBusy(false)
  }
}

async function addExternalMedia() {
  if (!requireAuth() || mediaMutationBusy) return

  const node = currentMediaNode()
  if (!node) throw new Error('Nodul nu mai există.')

  const url = normalizeHttpUrl(mediaExternalUrlInput.value)
  if (!url) {
    mediaExternalUrlInput.focus()
    throw new Error('Introdu un link HTTPS valid.')
  }

  const youtubeEmbed = getYoutubeEmbedUrl(url)
  const nextOrder =
    (node.media || []).reduce((max, item) => Math.max(max, Number(item.sortOrder || 0)), 0) + 10

  setMediaMutationBusy(true, 'Se adaugă linkul...')

  try {
    await createMediaRemote({
      nodeId: node.id,
      mediaType: youtubeEmbed ? 'youtube' : 'video',
      externalUrl: url,
      title:
        mediaExternalTitleInput.value.trim() ||
        (youtubeEmbed ? 'Videoclip YouTube' : 'Videoclip extern'),
      caption: mediaExternalCaptionInput.value.trim(),
      sortOrder: nextOrder
    })

    mediaExternalUrlInput.value = ''
    mediaExternalTitleInput.value = ''
    mediaExternalCaptionInput.value = ''
    mediaUploadStatus.textContent = 'Link adăugat cu succes.'
    await refreshAfterMediaMutation()
  } finally {
    setMediaMutationBusy(false)
  }
}

async function saveMediaCard(card) {
  if (!requireAuth() || mediaMutationBusy || !card) return

  const node = currentMediaNode()
  const media = node?.media?.find((item) => Number(item.id) === Number(card.dataset.mediaId))

  if (!media) throw new Error('Elementul media nu mai există.')

  setMediaMutationBusy(true, 'Se salvează textul...')

  try {
    await updateMediaRemote({
      ...media,
      title: card.querySelector('[data-media-title]').value.trim(),
      caption: card.querySelector('[data-media-caption]').value.trim()
    })

    mediaUploadStatus.textContent = 'Titlul și descrierea au fost salvate.'
    await refreshAfterMediaMutation()
  } finally {
    setMediaMutationBusy(false)
  }
}

async function deleteMediaItem(mediaId) {
  if (!requireAuth() || mediaMutationBusy) return

  const node = currentMediaNode()
  const media = node?.media?.find((item) => Number(item.id) === Number(mediaId))
  if (!media) throw new Error('Elementul media nu mai există.')

  const confirmed = confirm(`Sigur vrei să ștergi „${media.title || mediaTypeLabel(media)}”?`)
  if (!confirmed) return

  setMediaMutationBusy(true, 'Se șterge elementul...')

  try {
    await deleteMediaRemote(media.id)

    if (media.storagePath) {
      const storageBucket = node.isTeamNode
        ? TEAM_MEDIA_BUCKET
        : MEDIA_BUCKET

      const { error: storageError } = await supabase.storage
        .from(storageBucket)
        .remove([media.storagePath])

      if (storageError) {
        console.warn('Media storage cleanup failed:', storageError)
      }
    }

    mediaUploadStatus.textContent = 'Element șters.'
    await refreshAfterMediaMutation()
  } finally {
    setMediaMutationBusy(false)
  }
}

async function moveMediaItem(mediaId, direction) {
  if (!requireAuth() || mediaMutationBusy) return

  const node = currentMediaNode()
  if (!node) throw new Error('Nodul nu mai există.')

  const ordered = [...(node.media || [])]
  const index = ordered.findIndex((item) => Number(item.id) === Number(mediaId))
  const targetIndex = index + Number(direction)

  if (index < 0 || targetIndex < 0 || targetIndex >= ordered.length) return

  ;[ordered[index], ordered[targetIndex]] = [ordered[targetIndex], ordered[index]]

  const payload = ordered.map((item, orderIndex) => ({
    id: Number(item.id),
    order: (orderIndex + 1) * 10
  }))

  setMediaMutationBusy(true, 'Se salvează ordinea...')

  try {
    await reorderMediaRemote(node.id, payload)
    mediaUploadStatus.textContent = 'Ordinea a fost salvată.'
    await refreshAfterMediaMutation()
  } finally {
    setMediaMutationBusy(false)
  }
}

// General File Manager
function currentFileNode() {
  return findNode(fileManagerNodeId)
}

function isFileManagerOpen() {
  return fileManagerBackdrop.classList.contains('open')
}

function setFileMutationBusy(nextValue, status = '') {
  fileMutationBusy = Boolean(nextValue)

  uploadNodeFilesBtn.disabled = fileMutationBusy
  uploadNodeFolderBtn.disabled = fileMutationBusy
  closeFileManagerBtn.disabled = fileMutationBusy
  closeFileManagerFooterBtn.disabled = fileMutationBusy
  nodeFilesInput.disabled = fileMutationBusy
  nodeFolderInput.disabled = fileMutationBusy

  fileManagerList.querySelectorAll('button, input, textarea, a').forEach((element) => {
    if ('disabled' in element) {
      element.disabled = fileMutationBusy || element.dataset.baseDisabled === 'true'
    }
    element.style.pointerEvents = fileMutationBusy ? 'none' : ''
  })

  if (status) fileManagerStatus.textContent = status
}

function resetFileUploadInputs() {
  nodeFilesInput.value = ''
  nodeFolderInput.value = ''
  fileManagerStatus.textContent = ''
}

function openFileManager(nodeId = selectedId) {
  if (!requireAuth()) return

  const node = findNode(nodeId)
  if (!node) {
    alert('Selectează mai întâi un nod.')
    return
  }

  if (!canEditNode(node)) {
    alert('Rolul tău nu permite editarea fișierelor din acest nod.')
    return
  }

  fileManagerNodeId = Number(node.id)
  resetFileUploadInputs()
  fileManagerBackdrop.classList.add('open')
  renderFileManager()
}

function closeFileManager() {
  if (fileMutationBusy) return
  fileManagerBackdrop.classList.remove('open')
  fileManagerNodeId = null
  resetFileUploadInputs()
}

function renderFileManager() {
  const node = currentFileNode()

  if (!node) {
    fileManagerTitle.textContent = 'Fișiere nod'
    fileManagerSummary.textContent = 'Nodul nu mai există.'
    fileManagerList.innerHTML = ''
    return
  }

  const items = Array.isArray(node.files) ? node.files : []
  const totalSize = items.reduce((sum, item) => sum + Number(item.fileSize || 0), 0)

  fileManagerTitle.textContent = `Fișiere · ${node.title}`
  fileManagerSummary.innerHTML = `
    <strong>${items.length}</strong> ${items.length === 1 ? 'fișier' : 'fișiere'} · ${escapeHtml(humanFileSize(totalSize))}
  `

  if (items.length === 0) {
    fileManagerList.innerHTML = `
      <div class="file-manager-empty">
        <strong>Niciun fișier.</strong>
      </div>
    `
    return
  }

  fileManagerList.innerHTML = items
    .map((file, index) => {
      const url = filePublicUrl(file)
      return `
        <article class="file-manager-item" data-file-id="${file.id}">
          <div class="file-manager-icon">${escapeHtml(fileExtensionLabel(file.originalName))}</div>
          <div class="file-manager-item-body">
            <div class="file-manager-item-head">
              <div class="file-manager-name">
                <strong>${escapeHtml(file.originalName)}</strong>
                <span>${escapeHtml(fileDisplayPath(file))}</span>
              </div>
              ${url ? `<a class="btn" href="${escapeHtml(url)}" download="${escapeHtml(file.originalName)}" target="_blank" rel="noopener noreferrer">Descarcă</a>` : ''}
            </div>

            <div class="file-manager-meta">
              <span>${escapeHtml(humanFileSize(file.fileSize))}</span>
              <span>${escapeHtml(file.mimeType || 'application/octet-stream')}</span>
            </div>

            <div class="field">
              <label>Titlu afișat</label>
              <input data-file-title maxlength="160" value="${escapeHtmlText(file.title)}" placeholder="Implicit: numele fișierului">
            </div>

            <div class="field">
              <label>Descriere</label>
              <textarea data-file-description rows="2" maxlength="1200" placeholder="Ce conține fișierul?">${escapeHtmlText(file.description)}</textarea>
            </div>

            <div class="file-manager-actions">
              <button class="btn" type="button" data-file-move="-1" data-base-disabled="${index === 0 ? 'true' : 'false'}" ${index === 0 ? 'disabled' : ''}>↑</button>
              <button class="btn" type="button" data-file-move="1" data-base-disabled="${index === items.length - 1 ? 'true' : 'false'}" ${index === items.length - 1 ? 'disabled' : ''}>↓</button>
              <button class="btn primary" type="button" data-file-save>Salvează textul</button>
              <button class="btn danger" type="button" data-file-delete>Șterge</button>
            </div>
          </div>
        </article>
      `
    })
    .join('')

  fileManagerList.querySelectorAll('[data-file-save]').forEach((button) => {
    button.addEventListener('click', () => {
      saveFileCard(button.closest('[data-file-id]')).catch((error) => {
        console.error('File metadata update failed:', error)
        alert(error.message || 'Eroare la salvarea fișierului.')
      })
    })
  })

  fileManagerList.querySelectorAll('[data-file-delete]').forEach((button) => {
    button.addEventListener('click', () => {
      deleteNodeFile(Number(button.closest('[data-file-id]').dataset.fileId)).catch((error) => {
        console.error('File delete failed:', error)
        alert(error.message || 'Eroare la ștergerea fișierului.')
      })
    })
  })

  fileManagerList.querySelectorAll('[data-file-move]').forEach((button) => {
    button.addEventListener('click', () => {
      moveNodeFile(
        Number(button.closest('[data-file-id]').dataset.fileId),
        Number(button.dataset.fileMove)
      ).catch((error) => {
        console.error('File reorder failed:', error)
        alert(error.message || 'Eroare la reordonarea fișierelor.')
      })
    })
  })

  setFileMutationBusy(fileMutationBusy)
}

async function refreshAfterFileMutation() {
  const nodeId = fileManagerNodeId
  const nodeWasTeamNode = Boolean(currentFileNode()?.isTeamNode)
  const body = fileManagerBackdrop.querySelector('.file-manager-body')
  const previousScrollTop = body?.scrollTop || 0

  if (nodeWasTeamNode) {
    await loadActiveTeamAtlasNodes()
  } else {
    await fetchAllData()
  }

  fileManagerNodeId = nodeId

  if (isFileManagerOpen()) {
    renderFileManager()
    restoreModalScrollPosition(fileManagerBackdrop.querySelector('.file-manager-body'), previousScrollTop)
  }
}

function validateNodeFileBatch(files) {
  const batch = [...(files || [])]
  if (batch.length === 0) throw new Error('Alege cel puțin un fișier.')
  if (batch.length > MAX_NODE_FILE_BATCH_COUNT) {
    throw new Error(`Poți încărca maximum ${MAX_NODE_FILE_BATCH_COUNT} de fișiere într-un singur batch.`)
  }

  let totalSize = 0
  for (const file of batch) {
    if (file.size > MAX_NODE_FILE_SIZE) {
      throw new Error(`„${file.name}” depășește limita de 100 MB.`)
    }
    totalSize += Number(file.size || 0)
  }

  if (totalSize > MAX_NODE_FILE_BATCH_SIZE) {
    throw new Error('Batch-ul depășește limita totală de 500 MB.')
  }

  return batch
}

async function uploadNodeFileBatch(fileList, preserveFolders) {
  if (!requireAuth() || fileMutationBusy) return

  const node = currentFileNode()
  if (!node) throw new Error('Nodul nu mai există.')

  const batch = validateNodeFileBatch(fileList)
  const batchId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  let nextOrder =
    (node.files || []).reduce((max, item) => Math.max(max, Number(item.sortOrder || 0)), 0) + 10
  const uploadedPaths = []
  const createdRows = []

  setFileMutationBusy(true, `Pregătim ${batch.length} ${batch.length === 1 ? 'fișier' : 'fișiere'}...`)

  try {
    for (let index = 0; index < batch.length; index += 1) {
      const file = batch[index]
      const relativePath = preserveFolders
        ? folderPathFromBrowserFile(file)
        : ''
      const storageBucket = node.isTeamNode ? TEAM_FILE_BUCKET : FILE_BUCKET
      const storagePath = node.isTeamNode
        ? storagePathForTeamNodeFile(node, file, relativePath, batchId)
        : storagePathForNodeFile(node.id, file, relativePath, batchId)
      const contentType = file.type || 'application/octet-stream'

      fileManagerStatus.textContent = `Se încarcă ${index + 1}/${batch.length}: ${file.name}`

      const { error: uploadError } = await supabase.storage
        .from(storageBucket)
        .upload(storagePath, file, {
        cacheControl: '3600',
        upsert: false,
        contentType
      })

      if (uploadError) throw uploadError
      uploadedPaths.push(storagePath)

      const created = await createFileRemote({
        nodeId: node.id,
        storagePath,
        originalName: file.name,
        relativePath,
        mimeType: contentType,
        fileSize: file.size,
        title: file.name,
        description: '',
        sortOrder: nextOrder
      })

      createdRows.push(created)
      nextOrder += 10
    }

    resetFileUploadInputs()
    fileManagerStatus.textContent = `${batch.length} ${batch.length === 1 ? 'fișier încărcat' : 'fișiere încărcate'} cu succes.`
    await refreshAfterFileMutation()
  } catch (error) {
    for (const row of createdRows.reverse()) {
      await deleteFileRemote(row.id).catch(() => {})
    }

    if (uploadedPaths.length > 0) {
      const cleanupBucket = node.isTeamNode ? TEAM_FILE_BUCKET : FILE_BUCKET

      await supabase.storage
        .from(cleanupBucket)
        .remove(uploadedPaths)
        .catch(() => {})
    }
    throw error
  } finally {
    setFileMutationBusy(false)
  }
}

async function saveFileCard(card) {
  if (!requireAuth() || fileMutationBusy || !card) return

  const node = currentFileNode()
  const file = node?.files?.find((item) => Number(item.id) === Number(card.dataset.fileId))
  if (!file) throw new Error('Fișierul nu mai există.')

  setFileMutationBusy(true, 'Se salvează textul...')
  try {
    await updateFileRemote({
      ...file,
      title: card.querySelector('[data-file-title]').value.trim(),
      description: card.querySelector('[data-file-description]').value.trim()
    })
    fileManagerStatus.textContent = 'Titlul și descrierea au fost salvate.'
    await refreshAfterFileMutation()
  } finally {
    setFileMutationBusy(false)
  }
}

async function deleteNodeFile(fileId) {
  if (!requireAuth() || fileMutationBusy) return

  const node = currentFileNode()
  const file = node?.files?.find((item) => Number(item.id) === Number(fileId))
  if (!file) throw new Error('Fișierul nu mai există.')

  const confirmed = confirm(`Sigur vrei să ștergi „${file.originalName}”?`)
  if (!confirmed) return

  setFileMutationBusy(true, 'Se șterge fișierul...')
  try {
    await deleteFileRemote(file.id)

    if (file.storagePath) {
      const storageBucket = node.isTeamNode
        ? TEAM_FILE_BUCKET
        : FILE_BUCKET

      const { error: storageError } = await supabase.storage
        .from(storageBucket)
        .remove([file.storagePath])

      if (storageError) {
        console.warn('File storage cleanup failed:', storageError)
      }
    }

    fileManagerStatus.textContent = 'Fișier șters.'
    await refreshAfterFileMutation()
  } finally {
    setFileMutationBusy(false)
  }
}

async function moveNodeFile(fileId, direction) {
  if (!requireAuth() || fileMutationBusy) return

  const node = currentFileNode()
  if (!node) throw new Error('Nodul nu mai există.')

  const ordered = [...(node.files || [])]
  const index = ordered.findIndex((item) => Number(item.id) === Number(fileId))
  const targetIndex = index + Number(direction)
  if (index < 0 || targetIndex < 0 || targetIndex >= ordered.length) return

  ;[ordered[index], ordered[targetIndex]] = [ordered[targetIndex], ordered[index]]
  const payload = ordered.map((item, orderIndex) => ({
    id: Number(item.id),
    order: (orderIndex + 1) * 10
  }))

  setFileMutationBusy(true, 'Se salvează ordinea...')
  try {
    await reorderFilesRemote(node.id, payload)
    fileManagerStatus.textContent = 'Ordinea a fost salvată.'
    await refreshAfterFileMutation()
  } finally {
    setFileMutationBusy(false)
  }
}

// Code Manager and local draft persistence
function currentCodeNode() {
  return findNode(codeManagerNodeId)
}

function isCodeManagerOpen() {
  return codeManagerBackdrop.classList.contains('open')
}

function setCodeMutationBusy(nextValue, status = '') {
  codeMutationBusy = Boolean(nextValue)

  addCodeSnippetBtn.disabled = codeMutationBusy
  closeCodeManagerBtn.disabled = codeMutationBusy
  closeCodeManagerFooterBtn.disabled = codeMutationBusy

  codeManagerList.querySelectorAll('button, input, textarea, select').forEach((element) => {
    element.disabled = codeMutationBusy
  })

  if (status) codeManagerStatus.textContent = status
}

function resetCodeCreateForm() {
  codeCreateTitleInput.value = ''
  codeCreateLanguageInput.value = 'java'
  codeCreateDescriptionInput.value = ''
  codeCreateCodeInput.value = ''
  codeManagerStatus.textContent = ''
}

function readCodeDraftStore() {
  try {
    const raw = localStorage.getItem(CACHE_KEYS.codeDrafts)
    if (!raw) return {}

    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch (error) {
    console.warn('Code draft store is invalid:', error)
    return {}
  }
}

function writeCodeDraftStore(store) {
  try {
    localStorage.setItem(CACHE_KEYS.codeDrafts, JSON.stringify(store))
  } catch (error) {
    console.warn('Code draft could not be saved:', error)
  }
}

function codeCreateDraftKey(nodeId = codeManagerNodeId) {
  return `create:${Number(nodeId)}`
}

function codeEditDraftKey(snippetId, nodeId = codeManagerNodeId) {
  return `edit:${Number(nodeId)}:${Number(snippetId)}`
}

function clearCodeDraft(key) {
  if (!key) return

  const store = readCodeDraftStore()
  if (!(key in store)) return

  delete store[key]
  writeCodeDraftStore(store)
}

function saveCodeCreateDraft({ showStatus = false } = {}) {
  if (!codeManagerNodeId) return

  const draft = {
    title: codeCreateTitleInput.value,
    language: codeCreateLanguageInput.value || 'java',
    description: codeCreateDescriptionInput.value,
    code: codeCreateCodeInput.value,
    updatedAt: new Date().toISOString()
  }

  const key = codeCreateDraftKey()
  const isEmpty =
    !draft.title.trim() &&
    !draft.description.trim() &&
    !draft.code.trim() &&
    draft.language === 'java'

  if (isEmpty) {
    clearCodeDraft(key)
    return
  }

  const store = readCodeDraftStore()
  store[key] = draft
  writeCodeDraftStore(store)

  if (showStatus && isCodeManagerOpen() && !codeMutationBusy) {
    codeManagerStatus.textContent = 'Ciornă salvată automat în acest browser.'
  }
}

function restoreCodeCreateDraft() {
  if (!codeManagerNodeId) return false

  const store = readCodeDraftStore()
  const draft = store[codeCreateDraftKey()]
  if (!draft) return false

  codeCreateTitleInput.value = draft.title || ''
  codeCreateLanguageInput.value = draft.language || 'java'
  codeCreateDescriptionInput.value = draft.description || ''
  codeCreateCodeInput.value = draft.code || ''

  codeManagerStatus.textContent = 'Am restaurat automat ciorna nesalvată.'

  return true
}

function saveCodeCardDraft(card) {
  if (!card || !codeManagerNodeId) return

  const snippetId = Number(card.dataset.codeId)
  if (!snippetId) return

  const store = readCodeDraftStore()
  store[codeEditDraftKey(snippetId)] = {
    title: card.querySelector('[data-code-title]')?.value || '',
    language: card.querySelector('[data-code-language]')?.value || 'text',
    description: card.querySelector('[data-code-description]')?.value || '',
    code: card.querySelector('[data-code-code]')?.value || '',
    updatedAt: new Date().toISOString()
  }

  writeCodeDraftStore(store)
}

function restoreCodeCardDrafts() {
  if (!codeManagerNodeId) return

  const store = readCodeDraftStore()
  let restored = false

  codeManagerList.querySelectorAll('[data-code-id]').forEach((card) => {
    const snippetId = Number(card.dataset.codeId)
    const draft = store[codeEditDraftKey(snippetId)]
    if (!draft) return

    const title = card.querySelector('[data-code-title]')
    const language = card.querySelector('[data-code-language]')
    const description = card.querySelector('[data-code-description]')
    const code = card.querySelector('[data-code-code]')

    if (title) title.value = draft.title || ''
    if (language) language.value = draft.language || 'text'
    if (description) description.value = draft.description || ''
    if (code) code.value = draft.code || ''

    restored = true
  })

  if (restored && !codeManagerStatus.textContent) {
    codeManagerStatus.textContent = 'Am restaurat modificările nesalvate.'
  }
}

function saveAllCodeDrafts({ showStatus = false } = {}) {
  if (!codeManagerNodeId) return

  saveCodeCreateDraft({ showStatus })

  codeManagerList.querySelectorAll('[data-code-id]').forEach(saveCodeCardDraft)
}

function scheduleCodeDraftSave() {
  if (codeDraftSaveTimer) {
    clearTimeout(codeDraftSaveTimer)
  }

  codeDraftSaveTimer = window.setTimeout(() => {
    codeDraftSaveTimer = null
    saveAllCodeDrafts({ showStatus: true })
  }, 250)
}

function restoreCodeManagerWindow() {
  const savedNodeId = Number(localStorage.getItem(CACHE_KEYS.codeManagerOpen))
  const node = findNode(savedNodeId)

  if (!savedNodeId || !node || !editorMode || !canEditNode(node)) {
    return
  }

  openCodeManager(savedNodeId)
}

function openCodeManager(nodeId = selectedId) {
  if (!requireAuth()) return

  const node = findNode(nodeId)
  if (!node) {
    alert('Selectează mai întâi un nod.')
    return
  }

  if (!canEditNode(node)) {
    alert('Rolul tău nu permite editarea codului din acest nod.')
    return
  }

  codeManagerNodeId = Number(node.id)
  resetCodeCreateForm()

  localStorage.setItem(CACHE_KEYS.codeManagerOpen, String(codeManagerNodeId))

  codeManagerBackdrop.classList.add('open')
  renderCodeManager()
  restoreCodeCreateDraft()
}

function closeCodeManager() {
  if (codeMutationBusy) return

  saveAllCodeDrafts()

  if (codeDraftSaveTimer) {
    clearTimeout(codeDraftSaveTimer)
    codeDraftSaveTimer = null
  }

  codeManagerBackdrop.classList.remove('open')
  localStorage.removeItem(CACHE_KEYS.codeManagerOpen)
  codeManagerNodeId = null
  resetCodeCreateForm()
}

function renderCodeManager() {
  const node = currentCodeNode()

  if (!node) {
    codeManagerTitle.textContent = 'Nod cod'
    codeManagerSummary.textContent = 'Nodul nu mai există.'
    codeManagerList.innerHTML = ''
    return
  }

  const items = Array.isArray(node.codeSnippets) ? node.codeSnippets : []

  codeManagerTitle.textContent = `Cod · ${node.title}`
  codeManagerSummary.innerHTML = `
    <strong>${items.length}</strong> ${items.length === 1 ? 'snippet' : 'snippet-uri'}
  `

  if (items.length === 0) {
    codeManagerList.innerHTML = `
      <div class="code-manager-empty">
        <strong>Niciun snippet.</strong>
      </div>
    `
    return
  }

  codeManagerList.innerHTML = items
    .map(
      (snippet, index) => `
    <article class="code-manager-item" data-code-id="${snippet.id}">
      <div class="code-manager-item-head">
        <strong>${escapeHtml(snippet.title || `Snippet ${index + 1}`)}</strong>
        <span class="code-language-badge">${escapeHtml(codeLanguageLabel(snippet.language))}</span>
      </div>

      <div class="field-grid">
        <div class="field">
          <label>Titlu</label>
          <input data-code-title value="${escapeHtmlText(snippet.title)}" maxlength="160" placeholder="Ex: TeleOp minimal">
        </div>

        <div class="field">
          <label>Limbaj</label>
          <select data-code-language>
            ${codeLanguageOptions(snippet.language)}
          </select>
        </div>
      </div>

      <div class="field">
        <label>Descriere</label>
        <textarea data-code-description rows="3" maxlength="1200" placeholder="Explică exemplul...">${escapeHtmlText(snippet.description)}</textarea>
      </div>

      <div class="field">
        <label>Cod</label>
        <textarea
          class="code-editor-input"
          data-code-code
          rows="12"
          maxlength="100000"
          spellcheck="false"
        >${escapeHtmlText(snippet.code)}</textarea>
      </div>

      <div class="code-manager-actions">
        <button class="btn" type="button" data-code-move="-1" ${index === 0 ? 'disabled' : ''}>↑</button>
        <button class="btn" type="button" data-code-move="1" ${index === items.length - 1 ? 'disabled' : ''}>↓</button>
        <button class="btn primary" type="button" data-code-save>Salvează snippet-ul</button>
        <button class="btn danger" type="button" data-code-delete>Șterge</button>
      </div>
    </article>
  `
    )
    .join('')

  codeManagerList.querySelectorAll('[data-code-save]').forEach((button) => {
    button.addEventListener('click', () => {
      const card = button.closest('[data-code-id]')
      saveCodeCard(card).catch((error) => {
        console.error('Code snippet update failed:', error)
        alert(error.message || 'Eroare la salvarea codului.')
      })
    })
  })

  codeManagerList.querySelectorAll('[data-code-delete]').forEach((button) => {
    button.addEventListener('click', () => {
      const card = button.closest('[data-code-id]')
      deleteCodeItem(Number(card.dataset.codeId)).catch((error) => {
        console.error('Code snippet delete failed:', error)
        alert(error.message || 'Eroare la ștergerea codului.')
      })
    })
  })

  codeManagerList.querySelectorAll('[data-code-move]').forEach((button) => {
    button.addEventListener('click', () => {
      const card = button.closest('[data-code-id]')
      moveCodeItem(Number(card.dataset.codeId), Number(button.dataset.codeMove)).catch((error) => {
        console.error('Code snippet reorder failed:', error)
        alert(error.message || 'Eroare la reordonarea codului.')
      })
    })
  })

  restoreCodeCardDrafts()

  codeManagerList.querySelectorAll('input, textarea, select').forEach((element) => {
    element.addEventListener('input', scheduleCodeDraftSave)
    element.addEventListener('change', scheduleCodeDraftSave)
  })

  setCodeMutationBusy(codeMutationBusy)
}

async function refreshAfterCodeMutation() {
  const nodeId = codeManagerNodeId
  const nodeWasTeamNode = Boolean(currentCodeNode()?.isTeamNode)
  const body = codeManagerBackdrop.querySelector('.code-manager-body')
  const previousScrollTop = body?.scrollTop || 0

  if (nodeWasTeamNode) {
    await loadActiveTeamAtlasNodes()
  } else {
    await fetchAllData()
  }

  codeManagerNodeId = nodeId

  if (isCodeManagerOpen()) {
    renderCodeManager()

    restoreModalScrollPosition(
      codeManagerBackdrop.querySelector('.code-manager-body'),
      previousScrollTop
    )
  }
}

async function createCodeSnippetFromForm() {
  if (!requireAuth() || codeMutationBusy) return

  const node = currentCodeNode()
  if (!node) throw new Error('Nodul nu mai există.')

  const code = codeCreateCodeInput.value
  if (!code.trim()) {
    codeCreateCodeInput.focus()
    throw new Error('Scrie sau lipește codul înainte de salvare.')
  }

  const nextOrder =
    (node.codeSnippets || []).reduce((max, item) => Math.max(max, Number(item.sortOrder || 0)), 0) +
    10

  setCodeMutationBusy(true, 'Se salvează snippet-ul...')

  try {
    await createCodeRemote({
      nodeId: node.id,
      language: codeCreateLanguageInput.value,
      title: codeCreateTitleInput.value.trim(),
      description: codeCreateDescriptionInput.value.trim(),
      code,
      sortOrder: nextOrder
    })

    clearCodeDraft(codeCreateDraftKey(node.id))
    resetCodeCreateForm()
    codeManagerStatus.textContent = 'Snippet-ul a fost adăugat.'
    await refreshAfterCodeMutation()
  } finally {
    setCodeMutationBusy(false)
  }
}

async function saveCodeCard(card) {
  if (!requireAuth() || codeMutationBusy || !card) return

  const node = currentCodeNode()
  const snippet = node?.codeSnippets?.find(
    (item) => Number(item.id) === Number(card.dataset.codeId)
  )

  if (!snippet) throw new Error('Snippet-ul nu mai există.')

  const code = card.querySelector('[data-code-code]').value
  if (!code.trim()) {
    card.querySelector('[data-code-code]').focus()
    throw new Error('Codul nu poate fi gol.')
  }

  setCodeMutationBusy(true, 'Se salvează snippet-ul...')

  try {
    await updateCodeRemote({
      ...snippet,
      title: card.querySelector('[data-code-title]').value.trim(),
      language: card.querySelector('[data-code-language]').value,
      description: card.querySelector('[data-code-description]').value.trim(),
      code
    })

    clearCodeDraft(codeEditDraftKey(snippet.id, node.id))
    codeManagerStatus.textContent = 'Snippet-ul a fost salvat.'
    await refreshAfterCodeMutation()
  } finally {
    setCodeMutationBusy(false)
  }
}

async function deleteCodeItem(codeId) {
  if (!requireAuth() || codeMutationBusy) return

  const node = currentCodeNode()
  const snippet = node?.codeSnippets?.find((item) => Number(item.id) === Number(codeId))
  if (!snippet) throw new Error('Snippet-ul nu mai există.')

  const confirmed = confirm(
    `Sigur vrei să ștergi „${snippet.title || codeLanguageLabel(snippet.language)}”?`
  )
  if (!confirmed) return

  setCodeMutationBusy(true, 'Se șterge snippet-ul...')

  try {
    await deleteCodeRemote(snippet.id)
    clearCodeDraft(codeEditDraftKey(snippet.id, node.id))
    codeManagerStatus.textContent = 'Snippet șters.'
    await refreshAfterCodeMutation()
  } finally {
    setCodeMutationBusy(false)
  }
}

async function moveCodeItem(codeId, direction) {
  if (!requireAuth() || codeMutationBusy) return

  const node = currentCodeNode()
  if (!node) throw new Error('Nodul nu mai există.')

  const ordered = [...(node.codeSnippets || [])]
  const index = ordered.findIndex((item) => Number(item.id) === Number(codeId))
  const targetIndex = index + Number(direction)

  if (index < 0 || targetIndex < 0 || targetIndex >= ordered.length) return

  ;[ordered[index], ordered[targetIndex]] = [ordered[targetIndex], ordered[index]]

  const payload = ordered.map((item, orderIndex) => ({
    id: Number(item.id),
    order: (orderIndex + 1) * 10
  }))

  setCodeMutationBusy(true, 'Se salvează ordinea...')

  try {
    await reorderCodeRemote(node.id, payload)
    codeManagerStatus.textContent = 'Ordinea a fost salvată.'
    await refreshAfterCodeMutation()
  } finally {
    setCodeMutationBusy(false)
  }
}

// Full-screen node documentation and editor modals




function isSourceCompareOpen() {
  return Boolean(sourceCompareBackdrop?.classList.contains('open'))
}

function currentSourceCompareNode() {
  if (sourceCompareNodeId == null) return null
  return teamNodes.find((node) => Number(node.id) === Number(sourceCompareNodeId)) || null
}

function currentSourceComparePublicNode() {
  const teamNode = currentSourceCompareNode()
  if (!teamNode?.sourcePublicNodeId) return null
  return publicNodes.find(
    (node) => Number(node.id) === Number(teamNode.sourcePublicNodeId)
  ) || null
}

function sourceCategorySlug(node, scope = 'public') {
  const collection = scope === 'team' ? teamCategories : publicCategories
  return collection.find(
    (item) => Number(item.id) === Number(node?.categoryId)
  )?.slug || ''
}

function sourceDifficultySlug(node, scope = 'public') {
  const collection = scope === 'team' ? teamDifficulties : publicDifficulties
  return collection.find(
    (item) => Number(item.id) === Number(node?.difficultyId)
  )?.slug || ''
}

function sourceTagSlugs(node, scope = 'public') {
  const collection = scope === 'team' ? teamTaxonomyTags : publicTaxonomyTags

  return (node?.tagIds || [])
    .map(
      (id) =>
        collection.find((item) => Number(item.id) === Number(id))?.slug || ''
    )
    .filter(Boolean)
    .sort()
}

function sourceCodeModel(items = []) {
  return [...items]
    .map((item) => ({
      language: String(item.language || 'text'),
      title: String(item.title || ''),
      description: String(item.description || ''),
      code: String(item.code || ''),
      sort_order: Number(item.sortOrder ?? item.sort_order ?? 0)
    }))
    .sort((a, b) => {
      const order = Number(a.sort_order) - Number(b.sort_order)
      if (order !== 0) return order
      return a.title.localeCompare(b.title, 'ro', { sensitivity: 'base' })
    })
}

function sourceSnapshotModel(snapshot = {}) {
  return {
    title: String(snapshot.title || ''),
    content: String(snapshot.content || ''),
    contentFormat: snapshot.content_format === 'plain' ? 'plain' : 'html',
    taxonomy: {
      category: String(snapshot.category_slug || ''),
      difficulty: String(snapshot.difficulty_slug || ''),
      tags: Array.isArray(snapshot.tag_slugs)
        ? snapshot.tag_slugs.map(String).sort()
        : []
    },
    code: sourceCodeModel(
      Array.isArray(snapshot.code_snippets)
        ? snapshot.code_snippets
        : []
    ),
    publicUpdatedAt: snapshot.public_updated_at || null
  }
}

function publicSourceCurrentModel(node) {
  return {
    title: String(node?.title || ''),
    content: String(node?.content || ''),
    contentFormat: node?.contentFormat === 'plain' ? 'plain' : 'html',
    taxonomy: {
      category: sourceCategorySlug(node, 'public'),
      difficulty: sourceDifficultySlug(node, 'public'),
      tags: sourceTagSlugs(node, 'public')
    },
    code: sourceCodeModel(node?.codeSnippets || []),
    publicUpdatedAt: node?.updatedAt || null
  }
}

function teamSourceCurrentModel(node) {
  return {
    title: String(node?.title || ''),
    content: String(node?.content || ''),
    contentFormat: node?.contentFormat === 'plain' ? 'plain' : 'html',
    taxonomy: {
      category: sourceCategorySlug(node, 'team'),
      difficulty: sourceDifficultySlug(node, 'team'),
      tags: sourceTagSlugs(node, 'team')
    },
    code: sourceCodeModel(node?.codeSnippets || [])
  }
}

function stableSourceValue(value) {
  if (value && typeof value === 'object') return JSON.stringify(value)
  return String(value ?? '')
}

function sourceFieldState(field, baseline, publicCurrent, teamCurrent) {
  let baselineValue
  let publicValue
  let teamValue

  if (field === 'content') {
    baselineValue = { format: baseline.contentFormat, content: baseline.content }
    publicValue = { format: publicCurrent.contentFormat, content: publicCurrent.content }
    teamValue = { format: teamCurrent.contentFormat, content: teamCurrent.content }
  } else {
    baselineValue = baseline[field]
    publicValue = publicCurrent[field]
    teamValue = teamCurrent[field]
  }

  const base = stableSourceValue(baselineValue)

  return {
    baselineValue,
    publicValue,
    teamValue,
    publicChanged: stableSourceValue(publicValue) !== base,
    teamChanged: stableSourceValue(teamValue) !== base
  }
}

function sourceComparisonState(teamNode) {
  const publicNode = publicNodes.find(
    (node) => Number(node.id) === Number(teamNode?.sourcePublicNodeId)
  )

  const baseline = sourceSnapshotModel(teamNode?.sourceSnapshot || {})
  const publicCurrent = publicSourceCurrentModel(publicNode)
  const teamCurrent = teamSourceCurrentModel(teamNode)

  const fields = {
    title: sourceFieldState('title', baseline, publicCurrent, teamCurrent),
    content: sourceFieldState('content', baseline, publicCurrent, teamCurrent),
    taxonomy: sourceFieldState('taxonomy', baseline, publicCurrent, teamCurrent),
    code: sourceFieldState('code', baseline, publicCurrent, teamCurrent)
  }

  return { teamNode, publicNode, baseline, publicCurrent, teamCurrent, fields }
}

function sourceContentExcerpt(value) {
  const raw =
    typeof value === 'object'
      ? String(value.content || '')
      : String(value || '')

  const plain = plainTextFromHtml(raw).replace(/\s+/g, ' ').trim()
  if (!plain) return 'Empty'
  return plain.length > 260 ? `${plain.slice(0, 260)}…` : plain
}

function sourceCompareDisplay(field, value) {
  if (field === 'content') {
    const content = typeof value === 'object' ? value.content : value
    const format = typeof value === 'object' ? value.format : 'html'
    return `${format} · ${String(content || '').length} chars\n${sourceContentExcerpt(value)}`
  }

  if (field === 'taxonomy') {
    const taxonomy = value || {}
    return [
      `category: ${taxonomy.category || '—'}`,
      `difficulty: ${taxonomy.difficulty || '—'}`,
      `tags: ${
        Array.isArray(taxonomy.tags) && taxonomy.tags.length
          ? taxonomy.tags.join(', ')
          : '—'
      }`
    ].join('\n')
  }

  if (field === 'code') {
    const items = Array.isArray(value) ? value : []
    if (!items.length) return '0 snippets'

    return [
      `${items.length} snippets`,
      ...items.slice(0, 5).map(
        (item) => `${item.language} · ${item.title || 'Untitled'}`
      ),
      items.length > 5 ? `+${items.length - 5} more` : ''
    ]
      .filter(Boolean)
      .join('\n')
  }

  return String(value || '—')
}

function sourceCompareFieldLabel(field) {
  const labels = {
    title: 'Title',
    content: 'Documentation',
    taxonomy: 'Taxonomy',
    code: 'Code snippets'
  }
  return labels[field] || field
}

function sourceCompareStatusLabel(state) {
  if (state.publicChanged && state.teamChanged) return 'Conflict / both changed'
  if (state.publicChanged) return 'Public changed'
  if (state.teamChanged) return 'Team customized'
  return 'In sync with baseline'
}

function sourceCompareTotals(comparison) {
  const values = Object.values(comparison.fields)
  return {
    publicChanged: values.filter((item) => item.publicChanged).length,
    teamChanged: values.filter((item) => item.teamChanged).length,
    conflicts: values.filter(
      (item) => item.publicChanged && item.teamChanged
    ).length
  }
}

function sourceSyncFact(node) {
  if (!node?.isTeamNode || !node.sourcePublicNodeId) return ''

  const comparison = sourceComparisonState(node)
  const totals = sourceCompareTotals(comparison)

  let copy = 'Source baseline current'

  if (!comparison.publicNode) copy = 'Public source unavailable'
  else if (totals.conflicts > 0) copy = `${totals.conflicts} source conflicts`
  else if (totals.publicChanged > 0) copy = `${totals.publicChanged} public changes available`
  else if (totals.teamChanged > 0) copy = 'Team copy customized'

  return `
    <div class="fact-box">
      <strong>Public source</strong>
      <span>${escapeHtmlText(copy)}</span>
      ${
        node.sourceSyncedAt
          ? `<span>Baseline ${escapeHtmlText(formatPublicDate(node.sourceSyncedAt))}</span>`
          : ''
      }
    </div>
  `
}

function setSourceCompareBusy(nextValue, status = '') {
  sourceCompareBusy = Boolean(nextValue)

  for (const element of [
    closeSourceCompareBtn,
    closeSourceCompareFooterBtn,
    sourceCompareOpenPublicBtn,
    sourceCompareMarkBtn,
    sourceCompareSyncBtn
  ]) {
    if (element) element.disabled = sourceCompareBusy
  }

  const editable = Boolean(
    editorMode && canEditNode(currentSourceCompareNode())
  )

  sourceCompareTable
    ?.querySelectorAll('input')
    .forEach((input) => {
      input.disabled = sourceCompareBusy || !editable
    })

  if (status) sourceCompareStatus.textContent = status
}

function renderSourceCompare() {
  if (!isSourceCompareOpen()) return

  const teamNode = currentSourceCompareNode()

  if (!teamNode) {
    sourceCompareTitle.textContent = 'Compare public source'
    sourceCompareSummary.innerHTML = ''
    sourceCompareTable.innerHTML = `
      <div class="revision-history-empty">
        Copia Team Atlas nu mai este disponibilă.
      </div>
    `
    return
  }

  const comparison = sourceComparisonState(teamNode)
  sourceCompareTitle.textContent = `Compare source · ${teamNode.title}`

  if (!comparison.publicNode) {
    sourceCompareSummary.innerHTML = `
      <span class="source-compare-chip conflict">
        Public source unavailable
      </span>
    `
    sourceCompareTable.innerHTML = `
      <div class="revision-history-empty">
        Nodul public original nu mai este disponibil.
      </div>
    `
    sourceCompareOpenPublicBtn.disabled = true
    sourceCompareMarkBtn.disabled = true
    sourceCompareSyncBtn.disabled = true
    return
  }

  const totals = sourceCompareTotals(comparison)

  sourceCompareSummary.innerHTML = `
    <span class="source-compare-chip ${totals.publicChanged ? 'changed' : ''}">
      ${totals.publicChanged} public changes
    </span>
    <span class="source-compare-chip ${totals.teamChanged ? 'changed' : ''}">
      ${totals.teamChanged} team customizations
    </span>
    <span class="source-compare-chip ${totals.conflicts ? 'conflict' : ''}">
      ${totals.conflicts} conflicts
    </span>
    <span class="source-compare-chip">
      ${
        teamNode.sourceSyncedAt
          ? `baseline ${escapeHtmlText(formatPublicDate(teamNode.sourceSyncedAt))}`
          : 'import baseline'
      }
    </span>
  `

  sourceCompareTable.innerHTML =
    Object.entries(comparison.fields)
      .map(([field, state]) => {
        const safeAutoApply = state.publicChanged && !state.teamChanged

        return `
          <div class="source-compare-row">
            <div class="source-compare-field">
              <strong>${escapeHtmlText(sourceCompareFieldLabel(field))}</strong>
              <span>${escapeHtmlText(sourceCompareStatusLabel(state))}</span>
            </div>

            <div class="source-compare-value">
              <strong>Public Atlas</strong>
              <p>${escapeHtmlText(sourceCompareDisplay(field, state.publicValue))}</p>
            </div>

            <div class="source-compare-value">
              <strong>Team Atlas</strong>
              <p>${escapeHtmlText(sourceCompareDisplay(field, state.teamValue))}</p>
            </div>

            <label class="source-compare-apply">
              <input
                type="checkbox"
                data-source-sync-field="${field}"
                ${safeAutoApply ? 'checked' : ''}
                ${!(editorMode && canEditNode(teamNode)) ? 'disabled' : ''}
              />
              Apply public
            </label>
          </div>
        `
      })
      .join('')

  const editable = Boolean(editorMode && canEditNode(teamNode))
  sourceCompareMarkBtn.hidden = !editable
  sourceCompareSyncBtn.hidden = !editable
  sourceCompareOpenPublicBtn.hidden = false

  setSourceCompareBusy(sourceCompareBusy)
}

function openSourceCompare(nodeId = selectedId) {
  const node = teamNodes.find(
    (candidate) => Number(candidate.id) === Number(nodeId)
  )

  if (!node || !node.sourcePublicNodeId) return

  sourceCompareNodeId = Number(node.id)
  sourceCompareBusy = false
  sourceCompareBackdrop.classList.add('open')
  sourceCompareStatus.textContent = 'Pregătit.'
  renderSourceCompare()
}

function closeSourceCompare() {
  if (sourceCompareBusy) return
  sourceCompareBackdrop?.classList.remove('open')
  sourceCompareNodeId = null
}

async function runSourceSync({ markOnly = false } = {}) {
  if (sourceCompareBusy) return

  const teamNode = currentSourceCompareNode()

  if (!teamNode || !editorMode || !canEditNode(teamNode)) {
    throw new Error('Nu ai drept de sync pentru acest document.')
  }

  const selectedFields = new Set(
    markOnly
      ? []
      : [
          ...sourceCompareTable.querySelectorAll(
            '[data-source-sync-field]:checked'
          )
        ].map((input) => input.dataset.sourceSyncField)
  )

  if (!markOnly && selectedFields.size === 0) {
    throw new Error(
      'Selectează cel puțin un câmp sau folosește Mark source reviewed.'
    )
  }

  setSourceCompareBusy(
    true,
    markOnly
      ? 'Se actualizează baseline-ul...'
      : 'Se sincronizează câmpurile selectate...'
  )

  try {
    const { error } = await supabase.rpc('atlas_team_sync_public_source', {
      p_project_id: PROJECT_ID,
      p_team_id: Number(teamNode.teamId),
      p_node_id: Number(teamNode.id),
      p_sync_title: selectedFields.has('title'),
      p_sync_content: selectedFields.has('content'),
      p_sync_taxonomy: selectedFields.has('taxonomy'),
      p_sync_code: selectedFields.has('code')
    })

    if (error) throw error

    await fetchAllData()
    await loadActiveTeamAtlasNodes({ forceReset: false })

    syncActiveNodeCollection({ forceReset: false })
    selectedId = Number(teamNode.id)
    detailOpen = true

    sourceCompareStatus.textContent =
      markOnly ? 'Baseline actualizat.' : 'Sync finalizat.'

    renderAll()
    renderSourceCompare()
  } finally {
    setSourceCompareBusy(false)
  }
}

function isRevisionHistoryOpen() {
  return Boolean(
    revisionHistoryBackdrop?.classList.contains('open')
  )
}

function currentRevisionHistoryNode() {
  if (!revisionHistoryTarget) return null

  if (revisionHistoryTarget.nodeScope === 'team') {
    return (
      teamNodes.find(
        (node) =>
          Number(node.teamId) ===
            Number(revisionHistoryTarget.teamId) &&
          Number(node.id) ===
            Number(revisionHistoryTarget.nodeId)
      ) || null
    )
  }

  return (
    publicNodes.find(
      (node) =>
        Number(node.id) ===
        Number(revisionHistoryTarget.nodeId)
    ) || null
  )
}

function canOpenRevisionHistory(node) {
  return Boolean(
    node &&
    editorMode &&
    canEditNode(node)
  )
}

function normalizeRevisionRow(row) {
  return {
    id: Number(row.id),
    revisionNumber: Number(row.revision_number || 0),
    nodeScope: row.node_scope || 'public',
    publicNodeId:
      row.public_node_id == null
        ? null
        : Number(row.public_node_id),
    teamId:
      row.team_id == null
        ? null
        : Number(row.team_id),
    teamNodeId:
      row.team_node_id == null
        ? null
        : Number(row.team_node_id),
    snapshot: row.snapshot || {},
    changeKind: row.change_kind || 'checkpoint',
    restoredFromRevisionId:
      row.restored_from_revision_id == null
        ? null
        : Number(row.restored_from_revision_id),
    actorEmail: row.actor_email || '',
    createdAt: row.created_at || null
  }
}

function revisionSnapshotModel(snapshot = {}) {
  return {
    title: String(snapshot.title || 'Untitled Node'),
    categoryId:
      snapshot.team_category_id ??
      snapshot.category_id ??
      null,
    difficultyId:
      snapshot.team_difficulty_id ??
      snapshot.difficulty_id ??
      null,
    tagIds: Array.isArray(snapshot.team_tag_ids)
      ? snapshot.team_tag_ids.map(Number)
      : Array.isArray(snapshot.tag_ids)
        ? snapshot.tag_ids.map(Number)
        : [],
    departmentId:
      snapshot.department_id == null
        ? null
        : Number(snapshot.department_id),
    departmentIds: Array.isArray(snapshot.department_ids)
      ? snapshot.department_ids.map(Number)
      : [],
    content: String(snapshot.content || ''),
    contentFormat:
      snapshot.content_format === 'plain'
        ? 'plain'
        : 'html'
  }
}

function currentNodeRevisionModel(node) {
  return {
    title: node?.title || 'Untitled Node',
    categoryId: node?.categoryId ?? null,
    difficultyId: node?.difficultyId ?? null,
    tagIds: (node?.tagIds || []).map(Number),
    departmentId:
      node?.departmentId == null
        ? null
        : Number(node.departmentId),
    departmentIds: nodeDepartmentIds(node).map(Number),
    content: node?.content || '',
    contentFormat:
      node?.contentFormat === 'plain'
        ? 'plain'
        : 'html'
  }
}

function canonicalRevisionArray(values) {
  return [...(values || [])]
    .map(Number)
    .filter(Number.isFinite)
    .sort((a, b) => a - b)
}

function revisionChangedFields(newerSnapshot, olderSnapshot) {
  if (!olderSnapshot) return ['baseline']

  const newer = revisionSnapshotModel(newerSnapshot)
  const older = revisionSnapshotModel(olderSnapshot)

  const fields = []

  if (newer.title !== older.title) {
    fields.push('title')
  }

  if (
    Number(newer.categoryId) !==
    Number(older.categoryId)
  ) {
    fields.push('category')
  }

  if (
    Number(newer.difficultyId) !==
    Number(older.difficultyId)
  ) {
    fields.push('difficulty')
  }

  if (
    JSON.stringify(canonicalRevisionArray(newer.tagIds)) !==
    JSON.stringify(canonicalRevisionArray(older.tagIds))
  ) {
    fields.push('tags')
  }

  if (
    Number(newer.departmentId) !==
      Number(older.departmentId) ||
    JSON.stringify(
      canonicalRevisionArray(newer.departmentIds)
    ) !==
      JSON.stringify(
        canonicalRevisionArray(older.departmentIds)
      )
  ) {
    fields.push('department')
  }

  if (
    newer.content !== older.content ||
    newer.contentFormat !== older.contentFormat
  ) {
    fields.push('content')
  }

  return fields.length > 0
    ? fields
    : ['checkpoint']
}

function revisionActorLabel(row) {
  if (row.actorEmail) return row.actorEmail

  if (row.changeKind === 'baseline') {
    return 'Migration baseline'
  }

  return 'Atlas editor'
}

function revisionKindLabel(row) {
  if (row.changeKind === 'restore') {
    return row.restoredFromRevisionId
      ? `Restore from #${row.restoredFromRevisionId}`
      : 'Restore'
  }

  if (row.changeKind === 'baseline') {
    return 'Baseline'
  }

  return 'Saved'
}

function revisionModelTaxonomy(model) {
  const category = getCategoryById(model.categoryId)
  const difficulty = getDifficultyById(model.difficultyId)

  const tags = model.tagIds
    .map((id) => getTagById(id)?.name || `Tag #${id}`)
    .filter(Boolean)

  return {
    category:
      category?.name ||
      (model.categoryId == null
        ? 'Fără categorie'
        : `Category #${model.categoryId}`),
    difficulty:
      difficulty?.name ||
      (model.difficultyId == null
        ? 'Nespecificată'
        : `Difficulty #${model.difficultyId}`),
    tags
  }
}

function revisionModelDepartments(model) {
  const ids =
    model.departmentIds.length > 0
      ? model.departmentIds
      : model.departmentId != null
        ? [model.departmentId]
        : []

  return ids
    .map((id) => getDepartmentById(id)?.name || `Department #${id}`)
    .filter(Boolean)
}

function renderRevisionContent(model) {
  if (model.contentFormat === 'html') {
    return `
      <div class="doc-text rich">
        ${sanitizeRichHtml(model.content)}
      </div>
    `
  }

  return `
    <div class="doc-text">
      ${escapeHtmlText(model.content).replace(/\n/g, '<br>')}
    </div>
  `
}

function revisionCompareCard(label, model) {
  const taxonomy = revisionModelTaxonomy(model)
  const departments = revisionModelDepartments(model)

  return `
    <div class="revision-compare-card">
      <strong>${escapeHtmlText(label)}</strong>

      <div class="revision-compare-title">
        ${escapeHtmlText(model.title)}
      </div>

      <div class="revision-compare-meta">
        ${escapeHtmlText(taxonomy.category)}
        · ${escapeHtmlText(taxonomy.difficulty)}
        ${
          taxonomy.tags.length
            ? ` · ${escapeHtmlText(taxonomy.tags.join(', '))}`
            : ''
        }
        ${
          departments.length
            ? ` · ${escapeHtmlText(departments.join(', '))}`
            : ''
        }
      </div>

      <div class="revision-content-preview">
        ${renderRevisionContent(model)}
      </div>
    </div>
  `
}

function renderRevisionHistory() {
  if (!isRevisionHistoryOpen()) return

  const node = currentRevisionHistoryNode()

  if (!node) {
    revisionHistoryTitle.textContent = 'Version history'
    revisionHistorySummary.textContent =
      'Documentul nu mai este disponibil.'
    revisionHistoryList.innerHTML = ''
    revisionHistoryPreview.innerHTML = `
      <div class="revision-history-empty">
        Documentul nu mai este disponibil.
      </div>
    `
    return
  }

  revisionHistoryTitle.textContent =
    `Version history · ${node.title}`

  revisionHistorySummary.innerHTML = `
    <strong>${revisionHistoryRows.length}</strong>
    ${
      revisionHistoryRows.length === 1
        ? 'saved version'
        : 'saved versions'
    }
    · newest first
  `

  if (revisionHistoryRows.length === 0) {
    revisionHistoryList.innerHTML = `
      <div class="revision-history-empty">
        Nu există încă versiuni salvate pentru acest document.
      </div>
    `

    revisionHistoryPreview.innerHTML = `
      <div class="revision-history-empty">
        Prima versiune va fi creată automat la următorul checkpoint.
      </div>
    `
    return
  }

  revisionHistoryList.innerHTML = revisionHistoryRows
    .map((row, index) => {
      const older =
        revisionHistoryRows[index + 1]?.snapshot || null

      const changed = revisionChangedFields(
        row.snapshot,
        older
      )

      return `
        <button
          class="revision-history-item ${
            Number(row.id) ===
            Number(revisionHistorySelectedId)
              ? 'active'
              : ''
          }"
          type="button"
          data-revision-select="${Number(row.id)}"
        >
          <div class="revision-history-item-head">
            <strong>v${Number(row.revisionNumber)}</strong>
            <span>
              ${escapeHtmlText(
                row.createdAt
                  ? formatPublicDate(row.createdAt)
                  : '—'
              )}
            </span>
          </div>

          <div class="revision-history-item-meta">
            ${escapeHtmlText(revisionKindLabel(row))}
            · ${escapeHtmlText(revisionActorLabel(row))}
          </div>

          <div class="revision-history-changes">
            ${changed
              .map(
                (field) => `
                  <span class="revision-history-change">
                    ${escapeHtmlText(field)}
                  </span>
                `
              )
              .join('')}
          </div>
        </button>
      `
    })
    .join('')

  const selected =
    revisionHistoryRows.find(
      (row) =>
        Number(row.id) ===
        Number(revisionHistorySelectedId)
    ) || revisionHistoryRows[0]

  revisionHistorySelectedId = Number(selected.id)

  const selectedModel =
    revisionSnapshotModel(selected.snapshot)

  const currentModel =
    currentNodeRevisionModel(node)

  const currentChanged = revisionChangedFields(
    {
      title: currentModel.title,
      category_id: node.isTeamNode
        ? null
        : currentModel.categoryId,
      difficulty_id: node.isTeamNode
        ? null
        : currentModel.difficultyId,
      tag_ids: node.isTeamNode
        ? []
        : currentModel.tagIds,
      department_ids: node.isTeamNode
        ? []
        : currentModel.departmentIds,
      department_id: node.isTeamNode
        ? currentModel.departmentId
        : null,
      team_category_id: node.isTeamNode
        ? currentModel.categoryId
        : null,
      team_difficulty_id: node.isTeamNode
        ? currentModel.difficultyId
        : null,
      team_tag_ids: node.isTeamNode
        ? currentModel.tagIds
        : [],
      content: currentModel.content,
      content_format: currentModel.contentFormat
    },
    selected.snapshot
  ).filter((field) => field !== 'checkpoint')

  revisionHistoryPreview.innerHTML = `
    <div class="revision-preview-head">
      <div>
        <h4>v${Number(selected.revisionNumber)} · ${escapeHtmlText(
          revisionKindLabel(selected)
        )}</h4>

        <p>
          ${escapeHtmlText(revisionActorLabel(selected))}
          ${
            selected.createdAt
              ? ` · ${escapeHtmlText(
                  new Date(selected.createdAt).toLocaleString()
                )}`
              : ''
          }
        </p>
      </div>

      <div class="revision-preview-actions">
        <button
          class="btn"
          type="button"
          data-revision-restore="${Number(selected.id)}"
          ${revisionHistoryBusy ? 'disabled' : ''}
        >
          Restore this version
        </button>
      </div>
    </div>

    <div class="count-strip" style="margin-bottom:10px;">
      ${
        currentChanged.length > 0
          ? `Current differs in: ${escapeHtmlText(
              currentChanged.join(', ')
            )}`
          : 'Current document matches this saved version.'
      }
    </div>

    <div class="revision-compare-grid">
      ${revisionCompareCard(
        `Saved v${selected.revisionNumber}`,
        selectedModel
      )}

      ${revisionCompareCard(
        'Current',
        currentModel
      )}
    </div>
  `
}

async function loadRevisionHistory() {
  const node = currentRevisionHistoryNode()

  if (!node) {
    revisionHistoryRows = []
    renderRevisionHistory()
    return
  }

  let query = supabase
    .from('atlas_document_revisions')
    .select(
      'id, revision_number, node_scope, public_node_id, team_id, team_node_id, snapshot, change_kind, restored_from_revision_id, actor_email, created_at'
    )
    .eq('project_id', PROJECT_ID)
    .eq(
      'node_scope',
      node.isTeamNode ? 'team' : 'public'
    )
    .order('revision_number', {
      ascending: false
    })
    .limit(120)

  if (node.isTeamNode) {
    query = query
      .eq('team_id', Number(node.teamId))
      .eq('team_node_id', Number(node.id))
  } else {
    query = query.eq(
      'public_node_id',
      Number(node.id)
    )
  }

  const { data, error } = await query

  if (error) throw error

  revisionHistoryRows =
    (data || []).map(normalizeRevisionRow)

  if (
    !revisionHistoryRows.some(
      (row) =>
        Number(row.id) ===
        Number(revisionHistorySelectedId)
    )
  ) {
    revisionHistorySelectedId =
      revisionHistoryRows[0]?.id ?? null
  }

  renderRevisionHistory()
}

async function openRevisionHistory(
  nodeId = selectedId
) {
  const node = findNode(nodeId)

  if (!canOpenRevisionHistory(node)) {
    alert(
      'Version history este disponibil în Editor Mode pentru documentele pe care le poți edita.'
    )
    return
  }

  revisionHistoryTarget = {
    nodeScope: node.isTeamNode
      ? 'team'
      : 'public',
    teamId: node.isTeamNode
      ? Number(node.teamId)
      : null,
    nodeId: Number(node.id)
  }

  revisionHistoryRows = []
  revisionHistorySelectedId = null
  revisionHistoryBusy = false

  revisionHistoryBackdrop.classList.add('open')

  revisionHistoryTitle.textContent =
    `Version history · ${node.title}`

  revisionHistorySummary.textContent =
    'Se încarcă versiunile...'

  revisionHistoryList.innerHTML = ''
  revisionHistoryPreview.innerHTML =
    inlineStateMarkup('Se încarcă versiunile...')

  try {
    await loadRevisionHistory()
  } catch (error) {
    console.error('Revision history load failed:', error)

    revisionHistorySummary.textContent =
      error?.message ||
      'Version history nu a putut fi încărcat.'

    revisionHistoryPreview.innerHTML = inlineStateMarkup(
      error?.message || 'Version history nu a putut fi încărcat.',
      'error'
    )
  }
}

function closeRevisionHistory() {
  if (revisionHistoryBusy) return

  revisionHistoryBackdrop?.classList.remove('open')
  revisionHistoryTarget = null
  revisionHistoryRows = []
  revisionHistorySelectedId = null
}

async function restoreRevision(revisionId) {
  if (revisionHistoryBusy) return

  const node = currentRevisionHistoryNode()

  if (!node) {
    throw new Error(
      'Documentul nu mai este disponibil.'
    )
  }

  const row = revisionHistoryRows.find(
    (item) =>
      Number(item.id) === Number(revisionId)
  )

  if (!row) {
    throw new Error(
      'Versiunea selectată nu mai este disponibilă.'
    )
  }

  if (
    !confirm(
      `Restaurezi ${node.title} la v${row.revisionNumber}? Versiunea curentă rămâne în history.`
    )
  ) {
    return
  }

  revisionHistoryBusy = true
  renderRevisionHistory()

  try {
    const { error } = await supabase.rpc(
      'atlas_document_revision_restore',
      {
        p_project_id: PROJECT_ID,
        p_revision_id: Number(revisionId)
      }
    )

    if (error) throw error

    if (node.isTeamNode) {
      await loadActiveTeamAtlasNodes()
    } else {
      await fetchAllData()
    }

    syncActiveNodeCollection({
      forceReset: false
    })

    selectedId = Number(node.id)
    detailOpen = true

    renderAll()

    revisionHistorySelectedId = null
    await loadRevisionHistory()
  } finally {
    revisionHistoryBusy = false
    renderRevisionHistory()
  }
}

const DOCUMENT_HEALTH_ISSUES = {
  not_reviewed: {
    label: 'Not reviewed',
    className: 'review',
    weight: 7
  },
  needs_review: {
    label: 'Needs review',
    className: 'review',
    weight: 10
  },
  missing_sources: {
    label: 'Missing sources',
    className: '',
    weight: 6
  },
  no_primary_source: {
    label: 'No primary source',
    className: '',
    weight: 3
  },
  stale: {
    label: 'Stale',
    className: '',
    weight: 5
  },
  thin_content: {
    label: 'Thin content',
    className: '',
    weight: 4
  },
  orphan: {
    label: 'Orphaned',
    className: '',
    weight: 4
  },
  no_tags: {
    label: 'No tags',
    className: '',
    weight: 2
  },
  source_newer: {
    label: 'Public source newer',
    className: 'source-newer',
    weight: 8
  }
}

function canOpenDocumentationHealth() {
  if (!editorMode) return false

  if (isTeamAtlasMode()) {
    return teamAtlasEditableDepartments().length > 0
  }

  return Boolean(canEdit)
}

function healthScopeLabel() {
  if (isTeamAtlasMode()) {
    const team = currentTeamRecord()

    return team?.teamNumber
      ? `${team.name} #${team.teamNumber}`
      : team?.name || 'Team Atlas'
  }

  return 'Public Atlas'
}

function healthEditableNodes() {
  if (isTeamAtlasMode()) {
    return teamNodes.filter((node) => canEditNode(node))
  }

  return publicNodes
}

function healthNodeDate(node) {
  const candidates = [
    node?.updatedAt,
    node?.reviewState?.lastReviewedAt,
    node?.reviewState?.updatedAt
  ]
    .map((value) => {
      const timestamp = new Date(value || 0).getTime()
      return Number.isFinite(timestamp) ? timestamp : 0
    })
    .filter((timestamp) => timestamp > 0)

  return candidates.length > 0
    ? Math.max(...candidates)
    : 0
}

function isHealthNodeStale(node) {
  const timestamp = healthNodeDate(node)

  if (!timestamp) return true

  return (
    Date.now() - timestamp >
    Number(healthStaleDays) * 24 * 60 * 60 * 1000
  )
}

function healthInboundCount(node) {
  if (!node) return 0

  return nodes.reduce((count, source) => {
    return (
      count +
      (source.links || []).filter(
        (link) =>
          Number(link.targetId) === Number(node.id)
      ).length
    )
  }, 0)
}

function publicSourceNewerThanTeamNode(node) {
  if (!node?.isTeamNode || !node.sourcePublicNodeId) return false

  const source = publicNodes.find(
    (candidate) => Number(candidate.id) === Number(node.sourcePublicNodeId)
  )

  if (!source?.updatedAt) return false

  const sourceTime = new Date(source.updatedAt).getTime()
  const baselineTime = new Date(
    node.sourceSnapshot?.public_updated_at ||
      node.sourceSyncedAt ||
      node.sourceImportedAt ||
      0
  ).getTime()

  if (!Number.isFinite(sourceTime) || !Number.isFinite(baselineTime)) return false

  return sourceTime > baselineTime + 60 * 1000
}

function documentHealthIssues(node) {
  if (!node) return []

  const issues = []
  const review = node.reviewState
  const references = node.references || []
  const contentLength =
    nodeContentPlainText(node).trim().length

  if (!review) {
    issues.push('not_reviewed')
  } else if (review.status === 'needs_review') {
    issues.push('needs_review')
  }

  if (references.length === 0) {
    issues.push('missing_sources')
  } else if (
    !references.some(
      (reference) => reference.isPrimary === true
    )
  ) {
    issues.push('no_primary_source')
  }

  if (isHealthNodeStale(node)) {
    issues.push('stale')
  }

  if (contentLength < 350) {
    issues.push('thin_content')
  }

  if (
    (node.links || []).length === 0 &&
    healthInboundCount(node) === 0
  ) {
    issues.push('orphan')
  }

  if ((node.tagIds || []).length === 0) {
    issues.push('no_tags')
  }

  if (publicSourceNewerThanTeamNode(node)) {
    issues.push('source_newer')
  }

  return issues
}

function documentHealthWeight(node) {
  return documentHealthIssues(node).reduce(
    (total, issue) =>
      total +
      Number(
        DOCUMENT_HEALTH_ISSUES[issue]?.weight || 0
      ),
    0
  )
}

function healthDepartmentsForScope() {
  if (isTeamAtlasMode()) {
    return teamAtlasEditableDepartments()
  }

  return departments
    .filter((department) => department.is_active !== false)
    .sort(
      (a, b) =>
        Number(a.sort_order || 0) -
        Number(b.sort_order || 0)
    )
}

function nodeMatchesHealthDepartment(node) {
  if (
    healthDepartmentFilter === 'all' ||
    !healthDepartmentFilter
  ) {
    return true
  }

  return nodeDepartmentIds(node).includes(
    Number(healthDepartmentFilter)
  )
}

function nodeMatchesHealthIssue(node) {
  const issues = documentHealthIssues(node)

  if (healthIssueFilter === 'all') return true

  if (healthIssueFilter === 'attention') {
    return issues.length > 0
  }

  return issues.includes(healthIssueFilter)
}

function filteredHealthNodes() {
  return healthEditableNodes()
    .filter(nodeMatchesHealthDepartment)
    .filter(nodeMatchesHealthIssue)
    .sort((a, b) => {
      const weightDifference =
        documentHealthWeight(b) -
        documentHealthWeight(a)

      if (weightDifference !== 0) {
        return weightDifference
      }

      const aTime = healthNodeDate(a)
      const bTime = healthNodeDate(b)

      if (aTime !== bTime) return aTime - bTime

      return String(a.title || '').localeCompare(
        String(b.title || ''),
        'ro',
        { sensitivity: 'base' }
      )
    })
}

function healthSummaryStats() {
  const items = healthEditableNodes()
    .filter(nodeMatchesHealthDepartment)

  const issueSets = items.map((node) =>
    new Set(documentHealthIssues(node))
  )

  return {
    total: items.length,
    attention: issueSets.filter(
      (set) => set.size > 0
    ).length,
    review: issueSets.filter(
      (set) =>
        set.has('not_reviewed') ||
        set.has('needs_review')
    ).length,
    sources: issueSets.filter(
      (set) => set.has('missing_sources')
    ).length,
    stale: issueSets.filter(
      (set) => set.has('stale')
    ).length,
    sourceNewer: issueSets.filter(
      (set) => set.has('source_newer')
    ).length
  }
}

function qualityLensIssues(node) {
  if (
    !qualityLensEnabled ||
    !canOpenDocumentationHealth()
  ) {
    return []
  }

  return documentHealthIssues(node)
}

function renderHealthToolState() {
  if (!documentationHealthBtn) return

  const visible = canOpenDocumentationHealth()

  documentationHealthBtn.hidden = !visible

  if (!visible) return

  const attentionCount = healthEditableNodes().filter(
    (node) => documentHealthIssues(node).length > 0
  ).length

  documentationHealthBtn.textContent =
    attentionCount > 0
      ? `◈ Health · ${attentionCount}`
      : '◇ Health'
}

function populateHealthDepartmentFilter() {
  const departmentsForScope =
    healthDepartmentsForScope()

  const requested = String(
    healthDepartmentFilter || 'all'
  )

  documentationHealthDepartmentInput.innerHTML = [
    '<option value="all">All editable departments</option>',
    ...departmentsForScope.map(
      (department) =>
        `<option value="${Number(
          department.id
        )}">${escapeHtmlText(
          department.name
        )}</option>`
    )
  ].join('')

  if (
    requested !== 'all' &&
    departmentsForScope.some(
      (department) =>
        String(department.id) === requested
    )
  ) {
    documentationHealthDepartmentInput.value =
      requested
  } else {
    healthDepartmentFilter = 'all'
    documentationHealthDepartmentInput.value =
      'all'
  }
}

function renderHealthIssueBadges(node) {
  const issues = documentHealthIssues(node)

  if (issues.length === 0) {
    return `
      <span class="documentation-health-clean">
        No current flags
      </span>
    `
  }

  return issues
    .map((issue) => {
      const definition =
        DOCUMENT_HEALTH_ISSUES[issue]

      return `
        <span
          class="documentation-health-issue ${
            definition?.className || ''
          }"
        >
          ${escapeHtmlText(
            definition?.label || issue
          )}
        </span>
      `
    })
    .join('')
}

function healthNodeMeta(node) {
  const references = node.references || []
  const primaryCount = references.filter(
    (reference) => reference.isPrimary
  ).length

  const lastTouch = healthNodeDate(node)

  const updatedCopy = lastTouch
    ? formatPublicDate(
        new Date(lastTouch).toISOString()
      )
    : 'unknown'

  return [
    nodeCategoryName(node),
    nodeDifficultyName(node),
    `${references.length} sources`,
    `${primaryCount} primary`,
    `last touch ${updatedCopy}`
  ].join(' · ')
}

function renderDocumentationHealth() {
  if (!isDocumentationHealthOpen()) return

  const scope = healthScopeLabel()

  documentationHealthTitle.textContent =
    `Documentation Health · ${scope}`

  populateHealthDepartmentFilter()

  documentationHealthIssueInput.value =
    healthIssueFilter

  documentationHealthStaleInput.value =
    String(healthStaleDays)

  documentationQualityLensInput.checked =
    qualityLensEnabled

  const stats = healthSummaryStats()

  documentationHealthSummary.innerHTML = [
    ['Docs', stats.total],
    ['Needs attention', stats.attention],
    ['Review queue', stats.review],
    ['Missing sources', stats.sources],
    [`Stale > ${healthStaleDays}d`, stats.stale],
    ['Source newer', stats.sourceNewer]
  ]
    .map(
      ([label, value]) => `
        <div class="documentation-health-stat">
          <strong>${Number(value)}</strong>
          <span>${escapeHtmlText(label)}</span>
        </div>
      `
    )
    .join('')

  const items = filteredHealthNodes()

  documentationHealthStatus.innerHTML = `
    <strong>${items.length}</strong>
    ${
      items.length === 1
        ? 'document'
        : 'documents'
    }
    · ${escapeHtmlText(scope)}
    · stale threshold ${Number(healthStaleDays)} days
  `

  if (items.length === 0) {
    documentationHealthResults.innerHTML = `
      <div class="documentation-health-empty">
        Niciun document nu corespunde filtrului curent.
      </div>
    `
    return
  }

  documentationHealthResults.innerHTML = items
    .map((node) => {
      const issues = documentHealthIssues(node)

      return `
        <article
          class="documentation-health-row ${
            issues.length ? 'has-issues' : ''
          }"
        >
          <div>
            <div class="documentation-health-row-title">
              <strong>${escapeHtmlText(node.title)}</strong>

              ${
                node.isTeamNode
                  ? '<span class="document-reference-badge">Team</span>'
                  : '<span class="document-reference-badge">Public</span>'
              }
            </div>

            <div class="documentation-health-row-meta">
              ${escapeHtmlText(healthNodeMeta(node))}
            </div>

            <div class="documentation-health-issues">
              ${renderHealthIssueBadges(node)}
            </div>
          </div>

          <div class="documentation-health-actions">
            ${
              issues.includes('source_newer')
                ? `
                  <button
                    class="taxonomy-mini-btn"
                    type="button"
                    data-health-public-source="${Number(
                      node.id
                    )}"
                  >
                    Public source
                  </button>
                `
                : ''
            }

            <button
              class="taxonomy-mini-btn"
              type="button"
              data-health-meta="${Number(node.id)}"
            >
              Sources / review
            </button>

            <button
              class="taxonomy-mini-btn"
              type="button"
              data-health-open="${Number(node.id)}"
            >
              Open
            </button>
          </div>
        </article>
      `
    })
    .join('')
}

function isDocumentationHealthOpen() {
  return Boolean(
    documentationHealthBackdrop?.classList.contains(
      'open'
    )
  )
}

function openDocumentationHealth() {
  if (!canOpenDocumentationHealth()) {
    alert(
      'Documentation Health este disponibil în Editor Mode pentru documentele pe care le poți edita.'
    )
    return
  }

  healthIssueFilter = 'attention'

  if (
    activeDepartmentId != null &&
    healthDepartmentsForScope().some(
      (department) =>
        Number(department.id) ===
        Number(activeDepartmentId)
    )
  ) {
    healthDepartmentFilter =
      String(activeDepartmentId)
  } else {
    healthDepartmentFilter = 'all'
  }

  documentationHealthBackdrop.classList.add(
    'open'
  )

  renderDocumentationHealth()
}

function closeDocumentationHealth() {
  documentationHealthBackdrop?.classList.remove(
    'open'
  )
}

function openHealthNode(nodeId) {
  const node = findNode(nodeId)
  if (!node) return

  closeDocumentationHealth()

  activateDepartmentForNode(node, {
    persist: true
  })

  clearFiltersForDeepLink()

  selectedId = node.id
  clearEdgeSelection()
  detailOpen = true

  renderAll()
  setNodeRoute(node, { push: true })

  requestAnimationFrame(() =>
    centerOnNode(node)
  )
}

function openHealthPublicSource(teamNodeId) {
  const teamNode = teamNodes.find(
    (node) =>
      Number(node.id) === Number(teamNodeId)
  )

  if (!teamNode?.sourcePublicNodeId) return

  closeDocumentationHealth()
  openPublicSourceFromTeamNode(teamNode)
}

function healthReportText() {
  const scope = healthScopeLabel()
  const stats = healthSummaryStats()
  const items = filteredHealthNodes()

  const lines = [
    `FTC Programming Atlas — Documentation Health`,
    `Scope: ${scope}`,
    `Stale threshold: ${healthStaleDays} days`,
    ``,
    `Docs: ${stats.total}`,
    `Needs attention: ${stats.attention}`,
    `Review queue: ${stats.review}`,
    `Missing sources: ${stats.sources}`,
    `Stale: ${stats.stale}`,
    `Public source newer: ${stats.sourceNewer}`,
    ``,
    `Current filter: ${healthIssueFilter}`,
    `Results: ${items.length}`,
    ``
  ]

  for (const node of items) {
    const labels = documentHealthIssues(node)
      .map(
        (issue) =>
          DOCUMENT_HEALTH_ISSUES[issue]?.label ||
          issue
      )
      .join(', ')

    lines.push(
      `- ${node.title}${labels ? ` — ${labels}` : ''}`
    )
  }

  return lines.join('\n')
}

function referenceTypeLabel(value) {
  const labels = {
    official: 'Official',
    docs: 'Documentation',
    repo: 'Repository',
    article: 'Article',
    video: 'Video',
    community: 'Community',
    other: 'Other'
  }

  return labels[value] || 'Other'
}

function documentReviewLabel(node) {
  const state = node?.reviewState
  if (!state) return 'Not reviewed'

  if (state.status === 'needs_review') {
    return state.lastReviewedAt
      ? `Needs review · last checked ${formatPublicDate(
          state.lastReviewedAt
        )}`
      : 'Needs review'
  }

  return state.lastReviewedAt
    ? `Reviewed ${formatPublicDate(state.lastReviewedAt)}`
    : 'Reviewed'
}

function renderDocumentReviewFact(node) {
  const state = node?.reviewState

  if (!state && !(editorMode && canEditNode(node))) {
    return ''
  }

  const statusClass =
    state?.status === 'reviewed'
      ? 'reviewed'
      : state?.status === 'needs_review'
        ? 'needs-review'
        : ''

  return `
    <div class="fact-box">
      <strong>Review</strong>
      <span class="document-review-chip ${statusClass}">
        ${escapeHtmlText(documentReviewLabel(node))}
      </span>
      ${
        state?.reviewNote
          ? `<span>${escapeHtmlText(state.reviewNote)}</span>`
          : ''
      }
    </div>
  `
}

function renderDocumentReferences(node) {
  const items = Array.isArray(node?.references)
    ? node.references
    : []

  const editable = Boolean(
    editorMode && canEditNode(node)
  )

  if (items.length === 0 && !editable) return ''

  return `
    <details class="document-disclosure" data-document-section="sources">
      <summary>
        <span>Surse și referințe</span>
        <span class="document-disclosure-count">${items.length}</span>
      </summary>
      <div class="document-disclosure-body">
        ${
          items.length
            ? `
              <div class="document-reference-reader-list">
                ${items
                  .map(
                    (reference) => `
                      <div class="document-reference-reader-item">
                        <div>
                          <a href="${escapeHtmlText(reference.url)}" target="_blank" rel="noopener noreferrer">
                            ${escapeHtmlText(reference.title)}
                          </a>
                          <div class="document-reference-reader-meta">
                            <span class="document-reference-badge">${escapeHtmlText(referenceTypeLabel(reference.sourceType))}</span>
                            ${reference.isPrimary ? '<span class="document-reference-badge primary">Primary</span>' : ''}
                          </div>
                          ${reference.note ? `<p>${escapeHtmlText(reference.note)}</p>` : ''}
                        </div>
                        <span class="document-reference-external">↗</span>
                      </div>
                    `
                  )
                  .join('')}
              </div>
            `
            : '<div class="document-disclosure-empty"><span>Nicio sursă.</span></div>'
        }
        ${
          editable
            ? `<div class="documentation-meta-inline-actions"><button class="btn" type="button" data-open-documentation-meta>Administrează</button></div>`
            : ''
        }
      </div>
    </details>
  `
}

function inboundDocumentRelations(node) {
  if (!node) return []

  return nodes
    .flatMap((source) =>
      (source.links || [])
        .filter(
          (link) =>
            Number(link.targetId) === Number(node.id)
        )
        .map((link) => ({
          source,
          label: link.label || 'relation'
        }))
    )
    .filter(
      (item) =>
        Number(item.source.id) !== Number(node.id)
    )
}

function relatedDocumentationNodes(node, limit = 6) {
  if (!node) return []

  const inboundIds = new Set(
    inboundDocumentRelations(node).map((item) =>
      Number(item.source.id)
    )
  )

  const outgoingIds = new Set(
    (node.links || []).map((link) =>
      Number(link.targetId)
    )
  )

  const nodeTags = new Set(
    (node.tagIds || []).map(Number)
  )

  const nodeDepartments = new Set(
    nodeDepartmentIds(node).map(Number)
  )

  return nodes
    .filter(
      (candidate) =>
        Number(candidate.id) !== Number(node.id)
    )
    .map((candidate) => {
      let score = 0

      if (
        outgoingIds.has(Number(candidate.id)) ||
        inboundIds.has(Number(candidate.id))
      ) {
        score += 24
      }

      if (
        node.categoryId != null &&
        Number(candidate.categoryId) ===
          Number(node.categoryId)
      ) {
        score += 8
      }

      for (const tagId of candidate.tagIds || []) {
        if (nodeTags.has(Number(tagId))) score += 4
      }

      if (
        nodeDepartmentIds(candidate).some(
          (departmentId) =>
            nodeDepartments.has(Number(departmentId))
        )
      ) {
        score += 2
      }

      return { node: candidate, score }
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score
      }

      return String(a.node.title).localeCompare(
        String(b.node.title),
        'ro',
        { sensitivity: 'base' }
      )
    })
    .slice(0, limit)
    .map((item) => item.node)
}

function renderDocumentConnections(node) {
  const inbound = inboundDocumentRelations(node).slice(0, 6)
  const related = relatedDocumentationNodes(node, 6)
  const count = inbound.length + related.length

  if (count === 0) return ''

  return `
    <details class="document-disclosure" data-document-section="connections">
      <summary>
        <span>Conexiuni</span>
        <span class="document-disclosure-count">${count}</span>
      </summary>
      <div class="document-disclosure-body">
        <div class="document-connections-grid">
          ${
            inbound.length
              ? `<div class="document-connection-group"><strong>Referenced by</strong><div class="document-connection-list">${inbound
                  .map(({ source, label }) => `<button class="document-connection-btn" type="button" data-open-connected-node="${Number(source.id)}">${escapeHtmlText(source.title)} · ${escapeHtmlText(label)}</button>`)
                  .join('')}</div></div>`
              : ''
          }
          ${
            related.length
              ? `<div class="document-connection-group"><strong>Related docs</strong><div class="document-connection-list">${related
                  .map((relatedNode) => `<button class="document-connection-btn" type="button" data-open-connected-node="${Number(relatedNode.id)}">${escapeHtmlText(relatedNode.title)}</button>`)
                  .join('')}</div></div>`
              : ''
          }
        </div>
      </div>
    </details>
  `
}

function openConnectedDocumentationNode(nodeId) {
  const node = findNode(nodeId)
  if (!node) return

  activateDepartmentForNode(node, { persist: true })
  clearFiltersForDeepLink()

  selectedId = node.id
  clearEdgeSelection()
  detailOpen = true

  renderAll()
  setNodeRoute(node, { push: true })

  requestAnimationFrame(() => centerOnNode(node))
}

function hydrateDetailDocumentationOutline() {
  const card = document.getElementById(
    'detailOutlineCard'
  )

  const list = document.getElementById(
    'detailOutlineList'
  )

  const content = detailPanel.querySelector(
    '.doc-text.rich'
  )

  if (!card || !list || !content) return

  const headings = [
    ...content.querySelectorAll('h2, h3, h4')
  ]

  if (headings.length < 2) {
    card.hidden = true
    list.innerHTML = ''
    return
  }

  headings.forEach((heading, index) => {
    heading.id = `atlas-doc-heading-${index + 1}`
  })

  list.innerHTML = headings
    .map(
      (heading, index) => `
        <button
          class="detail-outline-link level-${heading.tagName.slice(1)}"
          type="button"
          data-outline-target="atlas-doc-heading-${index + 1}"
        >
          ${escapeHtmlText(
            String(heading.textContent || '').trim() ||
              `Section ${index + 1}`
          )}
        </button>
      `
    )
    .join('')

  card.hidden = false

  list
    .querySelectorAll('[data-outline-target]')
    .forEach((button) => {
      button.addEventListener('click', () => {
        document
          .getElementById(
            button.dataset.outlineTarget
          )
          ?.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
          })
      })
    })
}

function isDocumentationMetaOpen() {
  return Boolean(
    documentationMetaBackdrop?.classList.contains(
      'open'
    )
  )
}

function currentDocumentationMetaNode() {
  if (!documentationMetaTarget) return null

  if (
    documentationMetaTarget.nodeScope === 'team'
  ) {
    return (
      teamNodes.find(
        (node) =>
          Number(node.teamId) ===
            Number(documentationMetaTarget.teamId) &&
          Number(node.id) ===
            Number(documentationMetaTarget.nodeId)
      ) || null
    )
  }

  return (
    publicNodes.find(
      (node) =>
        Number(node.id) ===
        Number(documentationMetaTarget.nodeId)
    ) || null
  )
}

function setDocumentationMetaBusy(
  nextValue,
  status = ''
) {
  documentationMetaMutationBusy =
    Boolean(nextValue)

  for (const element of [
    documentationReviewStatusInput,
    documentationReviewNoteInput,
    clearDocumentationReviewBtn,
    saveDocumentationReviewBtn,
    documentationReferenceTitleInput,
    documentationReferenceTypeInput,
    documentationReferenceUrlInput,
    documentationReferenceNoteInput,
    documentationReferenceOrderInput,
    documentationReferencePrimaryInput,
    resetDocumentationReferenceBtn,
    saveDocumentationReferenceBtn,
    closeDocumentationMetaBtn,
    closeDocumentationMetaFooterBtn
  ]) {
    if (element && 'disabled' in element) {
      element.disabled =
        documentationMetaMutationBusy
    }
  }

  documentationReferenceList
    ?.querySelectorAll('button')
    .forEach((button) => {
      button.disabled =
        documentationMetaMutationBusy
    })

  if (clearDocumentationReviewBtn) {
    clearDocumentationReviewBtn.disabled =
      documentationMetaMutationBusy ||
      !currentDocumentationMetaNode()?.reviewState
  }

  if (status) {
    documentationReferenceStatus.textContent =
      status
  }
}

function resetDocumentationReferenceEditor() {
  documentationReferenceEditingId = null
  documentationReferenceTitleInput.value = ''
  documentationReferenceTypeInput.value = 'official'
  documentationReferenceUrlInput.value = ''
  documentationReferenceNoteInput.value = ''
  documentationReferenceOrderInput.value = '0'
  documentationReferencePrimaryInput.checked = false

  documentationReferenceStatus.textContent =
    'Adaugă o sursă nouă sau editează una existentă.'
}

function editDocumentationReference(referenceId) {
  const node = currentDocumentationMetaNode()

  const reference = (node?.references || []).find(
    (item) =>
      Number(item.id) === Number(referenceId)
  )

  if (!reference) return

  documentationReferenceEditingId =
    Number(reference.id)

  documentationReferenceTitleInput.value =
    reference.title || ''

  documentationReferenceTypeInput.value =
    reference.sourceType || 'other'

  documentationReferenceUrlInput.value =
    reference.url || ''

  documentationReferenceNoteInput.value =
    reference.note || ''

  documentationReferenceOrderInput.value =
    String(Number(reference.sortOrder || 0))

  documentationReferencePrimaryInput.checked =
    reference.isPrimary === true

  documentationReferenceStatus.textContent =
    'Sursa este încărcată pentru editare.'
}

function renderDocumentationMetaManager() {
  if (!isDocumentationMetaOpen()) return

  const node = currentDocumentationMetaNode()

  if (!node) {
    documentationMetaTitle.textContent =
      'Sources & review'

    documentationReferenceList.innerHTML =
      '<div class="documentation-finder-empty">Documentul nu mai este disponibil.</div>'

    return
  }

  documentationMetaTitle.textContent =
    `Sources & review · ${node.title}`

  const review = node.reviewState

  documentationReviewStatusInput.value =
    review?.status === 'needs_review'
      ? 'needs_review'
      : 'reviewed'

  documentationReviewNoteInput.value =
    review?.reviewNote || ''

  documentationReviewSummary.innerHTML = review
    ? `
      <strong>${escapeHtmlText(
        documentReviewLabel(node)
      )}</strong>
      ${
        review.updatedAt
          ? ` · metadata updated ${escapeHtmlText(
              formatPublicDate(review.updatedAt)
            )}`
          : ''
      }
    `
    : '<strong>Not reviewed</strong> · nu există încă review metadata.'

  clearDocumentationReviewBtn.disabled =
    documentationMetaMutationBusy || !review

  const references = [
    ...(node.references || [])
  ].sort((a, b) => {
    if (a.isPrimary !== b.isPrimary) {
      return a.isPrimary ? -1 : 1
    }

    const orderDifference =
      Number(a.sortOrder || 0) -
      Number(b.sortOrder || 0)

    if (orderDifference !== 0) {
      return orderDifference
    }

    return Number(a.id) - Number(b.id)
  })

  documentationReferenceList.innerHTML =
    references.length
      ? references
          .map(
            (reference) => `
              <div class="documentation-reference-manager-item">
                <div>
                  <strong>${escapeHtmlText(
                    reference.title
                  )}</strong>
                  <span>
                    ${escapeHtmlText(
                      referenceTypeLabel(
                        reference.sourceType
                      )
                    )}
                    ${
                      reference.isPrimary
                        ? ' · Primary'
                        : ''
                    }
                    · order ${Number(
                      reference.sortOrder || 0
                    )}
                  </span>
                </div>

                <div class="documentation-reference-manager-actions">
                  <button
                    class="taxonomy-mini-btn"
                    type="button"
                    data-doc-ref-edit="${Number(
                      reference.id
                    )}"
                  >
                    Edit
                  </button>

                  <button
                    class="taxonomy-mini-btn danger"
                    type="button"
                    data-doc-ref-delete="${Number(
                      reference.id
                    )}"
                  >
                    ✕
                  </button>
                </div>
              </div>
            `
          )
          .join('')
      : `
          <div class="documentation-finder-empty">
            Nicio sursă adăugată încă.
          </div>
        `

  documentationReferenceList
    .querySelectorAll('[data-doc-ref-edit]')
    .forEach((button) => {
      button.addEventListener('click', () => {
        editDocumentationReference(
          Number(button.dataset.docRefEdit)
        )
      })
    })

  documentationReferenceList
    .querySelectorAll('[data-doc-ref-delete]')
    .forEach((button) => {
      button.addEventListener('click', () => {
        deleteDocumentationReference(
          Number(button.dataset.docRefDelete)
        ).catch((error) => {
          console.error(
            'Reference delete failed:',
            error
          )

          alert(
            error?.message ||
              'Sursa nu a putut fi ștearsă.'
          )
        })
      })
    })

  setDocumentationMetaBusy(
    documentationMetaMutationBusy
  )
}

async function refreshDocumentationMetaTarget() {
  const target = documentationMetaTarget
  if (!target) return

  if (target.nodeScope === 'team') {
    await loadActiveTeamAtlasNodes()
  } else {
    await fetchAllData()
  }

  renderDocumentationMetaManager()
  renderAll()
}

function openDocumentationMetaManager(
  nodeId = selectedId
) {
  const node = findNode(nodeId)

  if (
    !node ||
    !editorMode ||
    !canEditNode(node)
  ) {
    alert(
      'Nu ai drept de editare pentru metadata acestui document.'
    )
    return
  }

  documentationMetaTarget = {
    nodeScope: node.isTeamNode
      ? 'team'
      : 'public',
    teamId: node.isTeamNode
      ? Number(node.teamId)
      : null,
    nodeId: Number(node.id)
  }

  resetDocumentationReferenceEditor()
  documentationMetaBackdrop.classList.add('open')
  renderDocumentationMetaManager()
}

function closeDocumentationMetaManager() {
  if (documentationMetaMutationBusy) return

  documentationMetaBackdrop?.classList.remove(
    'open'
  )

  documentationMetaTarget = null
  documentationReferenceEditingId = null
}

function documentTargetRpcParams(node) {
  return {
    p_project_id: PROJECT_ID,
    p_node_scope: node.isTeamNode
      ? 'team'
      : 'public',
    p_public_node_id: node.isTeamNode
      ? null
      : Number(node.id),
    p_team_id: node.isTeamNode
      ? Number(node.teamId)
      : null,
    p_team_node_id: node.isTeamNode
      ? Number(node.id)
      : null
  }
}

async function saveDocumentationReview() {
  if (documentationMetaMutationBusy) return

  const node = currentDocumentationMetaNode()

  if (!node) {
    throw new Error(
      'Documentul nu mai este disponibil.'
    )
  }

  setDocumentationMetaBusy(
    true,
    'Se salvează review state...'
  )

  try {
    const { error } = await supabase.rpc(
      'atlas_document_review_set',
      {
        ...documentTargetRpcParams(node),
        p_review_status:
          documentationReviewStatusInput.value,
        p_review_note:
          documentationReviewNoteInput.value.trim()
      }
    )

    if (error) throw error

    await refreshDocumentationMetaTarget()

    documentationReferenceStatus.textContent =
      'Review state salvat.'
  } finally {
    setDocumentationMetaBusy(false)
  }
}

async function clearDocumentationReview() {
  if (documentationMetaMutationBusy) return

  const node = currentDocumentationMetaNode()

  if (!node) {
    throw new Error(
      'Documentul nu mai este disponibil.'
    )
  }

  setDocumentationMetaBusy(
    true,
    'Se șterge review state...'
  )

  try {
    const { error } = await supabase.rpc(
      'atlas_document_review_clear',
      documentTargetRpcParams(node)
    )

    if (error) throw error

    await refreshDocumentationMetaTarget()

    documentationReferenceStatus.textContent =
      'Review state șters.'
  } finally {
    setDocumentationMetaBusy(false)
  }
}

async function saveDocumentationReference() {
  if (documentationMetaMutationBusy) return

  const node = currentDocumentationMetaNode()

  if (!node) {
    throw new Error(
      'Documentul nu mai este disponibil.'
    )
  }

  const title =
    documentationReferenceTitleInput.value.trim()

  const url = normalizeHttpUrl(
    documentationReferenceUrlInput.value.trim()
  )

  if (title.length < 2) {
    throw new Error(
      'Titlul sursei trebuie să aibă cel puțin 2 caractere.'
    )
  }

  if (!url) {
    throw new Error(
      'URL-ul sursei trebuie să fie http:// sau https:// valid.'
    )
  }

  const params = {
    ...documentTargetRpcParams(node),
    p_title: title,
    p_url: url,
    p_source_type:
      documentationReferenceTypeInput.value,
    p_note:
      documentationReferenceNoteInput.value.trim(),
    p_is_primary:
      documentationReferencePrimaryInput.checked,
    p_sort_order: Number(
      documentationReferenceOrderInput.value || 0
    )
  }

  const rpcName =
    documentationReferenceEditingId == null
      ? 'atlas_document_reference_create'
      : 'atlas_document_reference_update'

  if (documentationReferenceEditingId != null) {
    params.p_reference_id =
      Number(documentationReferenceEditingId)
  }

  setDocumentationMetaBusy(
    true,
    'Se salvează sursa...'
  )

  try {
    const { error } = await supabase.rpc(
      rpcName,
      params
    )

    if (error) throw error

    resetDocumentationReferenceEditor()
    await refreshDocumentationMetaTarget()

    documentationReferenceStatus.textContent =
      'Sursa a fost salvată.'
  } finally {
    setDocumentationMetaBusy(false)
  }
}

async function deleteDocumentationReference(
  referenceId
) {
  if (documentationMetaMutationBusy) return

  const node = currentDocumentationMetaNode()

  if (!node) {
    throw new Error(
      'Documentul nu mai este disponibil.'
    )
  }

  const reference = (node.references || []).find(
    (item) =>
      Number(item.id) === Number(referenceId)
  )

  if (!reference) {
    throw new Error('Sursa nu mai există.')
  }

  if (
    !confirm(
      `Sigur vrei să ștergi sursa „${reference.title}”?`
    )
  ) {
    return
  }

  setDocumentationMetaBusy(
    true,
    'Se șterge sursa...'
  )

  try {
    const { error } = await supabase.rpc(
      'atlas_document_reference_delete',
      {
        p_project_id: PROJECT_ID,
        p_reference_id: Number(referenceId)
      }
    )

    if (error) throw error

    if (
      Number(documentationReferenceEditingId) ===
      Number(referenceId)
    ) {
      resetDocumentationReferenceEditor()
    }

    await refreshDocumentationMetaTarget()

    documentationReferenceStatus.textContent =
      'Sursa a fost ștearsă.'
  } finally {
    setDocumentationMetaBusy(false)
  }
}

function renderDetailPanel() {
  const node = selectedNode()

  if (!node || !detailOpen || !matchesTaxonomyFilters(node) || !matchesSearch(node)) {
    detailPanel.classList.remove('open')
    emptyPanel.style.display = 'none'
    editBtn.disabled = !node || !canEditNode(node) || !editorMode
    deleteBtn.disabled = !node || !canEditNode(node) || !editorMode
    return
  }

  const categoryName = nodeCategoryName(node)
  const difficultyName = nodeDifficultyName(node)
  const tagNames = nodeTagNames(node)
  const nodeEditorActions = canEditNode(node) && editorMode

  const validRelations = (node.links || [])
    .map((link, index) => ({
      link,
      index,
      target: findNode(link.targetId)
    }))
    .filter((item) => item.target)

  const relations =
    validRelations
      .map(({ link, index, target }) => `
        <div class="relation-item" data-relation-source="${node.id}" data-relation-target="${target.id}">
          <div>
            <strong>${escapeHtml(target.title)}</strong>
            <span>${escapeHtml(link.label || 'relație')}</span>
          </div>
          <div class="relation-actions">
            <button class="icon-btn" data-rel-edit="${index}" aria-label="Edit relation">✎</button>
            <button class="icon-btn" data-rel-remove="${index}" aria-label="Remove relation">✕</button>
          </div>
        </div>
      `)
      .join('') ||
    '<div class="relation-item"><div><strong>Nicio relație.</strong></div></div>'

  detailPanel.innerHTML = `
    <div class="detail-top">
      <div class="detail-meta">
        <div>
          <div class="node-badges">
            <span class="pill category-pill">${escapeHtml(categoryName)}</span>
            <span class="pill difficulty-pill">${escapeHtml(difficultyName)}</span>
          </div>
          <h2 class="detail-title">${escapeHtml(node.title)}</h2>
        </div>

        <div class="detail-toolbar">
          <button
            class="icon-btn"
            id="detailBookmarkBtn"
            aria-label="${isNodeBookmarked(node) ? 'Remove from saved' : 'Save document'}"
            title="${isNodeBookmarked(node) ? 'Remove from saved' : 'Save document'}"
          >${isNodeBookmarked(node) ? '★' : '☆'}</button>

          <button class="icon-btn" id="detailEditBtn" aria-label="Edit" title="Edit">✎</button>

          <details class="detail-action-menu" id="detailMoreMenu">
            <summary aria-label="Mai mult" title="Mai mult">•••</summary>
            <div class="detail-action-menu-list">
              <button class="btn" id="detailHistoryBtn" type="button">Istoric versiuni</button>
              <button class="btn" id="detailImportTeamBtn" type="button">Importă în Team Atlas</button>
              <button class="btn" id="detailCompareSourceBtn" type="button">Compară sursa publică</button>
              <button class="btn" id="detailPublicSourceBtn" type="button">Deschide sursa publică</button>
              <button class="btn" id="detailCopyTeamLinkBtn" type="button">Copiază link-ul privat</button>
              <button class="btn danger" id="detailDeleteBtn" type="button">Șterge nodul</button>
            </div>
          </details>

          <button class="icon-btn" id="detailCloseBtn" aria-label="Close">✕</button>
        </div>
      </div>
    </div>

    <div class="detail-content">
      <div class="detail-main-column">
        <div class="info-card detail-document-card">
          ${renderNodeDocumentation(node)}
        </div>

        <details class="document-disclosure" data-document-section="details">
          <summary>
            <span>Detalii</span>
            <span class="document-disclosure-count">${tagNames.length} etichete · ${validRelations.length} relații</span>
          </summary>
          <div class="document-disclosure-body">
            <div class="detail-overview-grid">
              ${
                tagNames.length
                  ? `<div class="fact-box"><strong>Etichete</strong><div class="detail-tags">${tagNames
                      .map((name) => `<span class="mini-tag">${escapeHtml(name)}</span>`)
                      .join('')}</div></div>`
                  : ''
              }

              ${sourceSyncFact(node)}
              ${renderDocumentReviewFact(node)}

              ${
                node.updatedAt
                  ? `<div class="fact-box"><strong>Last edit</strong><span>${escapeHtmlText(formatPublicDate(node.updatedAt))}</span></div>`
                  : ''
              }

              <div class="fact-box detail-outline-card" id="detailOutlineCard" hidden>
                <strong>Outline</strong>
                <div class="detail-outline-list" id="detailOutlineList"></div>
              </div>

              <div class="relation-card">
                <div class="detail-relations-head">
                  <div class="relation-card-label">Relații</div>
                  <button class="btn" id="detailAddRelationBtn" type="button">+ Relație</button>
                </div>
                <div class="relations-list">${relations}</div>
              </div>
            </div>
          </div>
        </details>

        ${renderDocumentReferences(node)}
        ${renderDocumentConnections(node)}
        ${renderNodeCodeSnippets(node)}
        ${renderNodeMediaGallery(node)}
        ${renderNodeFiles(node)}
      </div>
    </div>
  `

  detailPanel.classList.add('open')
  emptyPanel.style.display = 'none'

  editBtn.disabled = !nodeEditorActions
  deleteBtn.disabled = !nodeEditorActions

  const detailBookmarkBtn = document.getElementById('detailBookmarkBtn')
  const detailHistoryBtn = document.getElementById('detailHistoryBtn')
  const detailImportTeamBtn = document.getElementById('detailImportTeamBtn')
  const detailCompareSourceBtn = document.getElementById('detailCompareSourceBtn')
  const detailPublicSourceBtn = document.getElementById('detailPublicSourceBtn')
  const detailCopyTeamLinkBtn = document.getElementById('detailCopyTeamLinkBtn')
  const detailAddRelationBtn = document.getElementById('detailAddRelationBtn')
  const detailEditBtn = document.getElementById('detailEditBtn')
  const detailDeleteBtn = document.getElementById('detailDeleteBtn')
  const detailCloseBtn = document.getElementById('detailCloseBtn')
  const detailMoreMenu = document.getElementById('detailMoreMenu')

  detailHistoryBtn.hidden = !nodeEditorActions
  detailImportTeamBtn.hidden = !canImportPublicNodeToTeam(node)
  detailCompareSourceBtn.hidden = !(node.isTeamNode && node.sourcePublicNodeId)
  detailPublicSourceBtn.hidden = !(node.isTeamNode && node.sourcePublicNodeId)
  detailCopyTeamLinkBtn.hidden = !node.isTeamNode
  detailAddRelationBtn.hidden = !nodeEditorActions
  detailEditBtn.hidden = !nodeEditorActions
  detailDeleteBtn.hidden = !nodeEditorActions

  detailHistoryBtn.disabled = !nodeEditorActions
  detailImportTeamBtn.disabled = !canImportPublicNodeToTeam(node)
  detailCompareSourceBtn.disabled = !(node.isTeamNode && node.sourcePublicNodeId)
  detailPublicSourceBtn.disabled = !(node.isTeamNode && node.sourcePublicNodeId)
  detailCopyTeamLinkBtn.disabled = !node.isTeamNode
  detailAddRelationBtn.disabled = !nodeEditorActions
  detailEditBtn.disabled = !nodeEditorActions
  detailDeleteBtn.disabled = !nodeEditorActions

  const advancedActions = [
    detailHistoryBtn,
    detailImportTeamBtn,
    detailCompareSourceBtn,
    detailPublicSourceBtn,
    detailCopyTeamLinkBtn,
    detailDeleteBtn
  ]
  detailMoreMenu.hidden = !advancedActions.some((button) => !button.hidden)

  detailBookmarkBtn.addEventListener('click', () => {
    toggleNodeBookmark(node).catch((error) => {
      console.error('Bookmark update failed:', error)
      alert(error?.message || 'Bookmark-ul nu a putut fi actualizat.')
    })
  })

  detailHistoryBtn.addEventListener('click', () => {
    detailMoreMenu.removeAttribute('open')
    openRevisionHistory(node.id).catch((error) => {
      console.error('Open revision history failed:', error)
      alert(error?.message || 'Version history nu a putut fi deschis.')
    })
  })

  detailImportTeamBtn.addEventListener('click', () => {
    detailMoreMenu.removeAttribute('open')
    openTeamImport(node.id)
  })
  detailCompareSourceBtn.addEventListener('click', () => {
    detailMoreMenu.removeAttribute('open')
    openSourceCompare(node.id)
  })
  detailPublicSourceBtn.addEventListener('click', () => {
    detailMoreMenu.removeAttribute('open')
    openPublicSourceFromTeamNode(node)
  })
  detailCopyTeamLinkBtn.addEventListener('click', () =>
    copyTeamNodeLink(node, detailCopyTeamLinkBtn)
  )
  detailAddRelationBtn.addEventListener('click', () => activateRelationMode(node.id))
  detailEditBtn.addEventListener('click', () => openEdit(node.id))
  detailDeleteBtn.addEventListener('click', () => {
    detailMoreMenu.removeAttribute('open')
    deleteSelected().catch((error) => alert(error.message || 'Eroare la ștergere.'))
  })
  detailCloseBtn.addEventListener('click', () => {
    closeNodeDetail({ pushHistory: true })
  })

  detailPanel.querySelectorAll('[data-open-node-code]').forEach((button) => {
    button.addEventListener('click', () => openCodeManager(node.id))
  })

  detailPanel.querySelectorAll('[data-copy-code-id]').forEach((button) => {
    button.addEventListener('click', async () => {
      const snippet = (node.codeSnippets || []).find(
        (item) => Number(item.id) === Number(button.dataset.copyCodeId)
      )

      if (!snippet) return

      const previousText = button.textContent

      try {
        await copyTextToClipboard(snippet.code)
        button.textContent = 'Copiat ✓'
      } catch (error) {
        console.error('Code copy failed:', error)
        button.textContent = 'Selectează codul'
      }

      window.setTimeout(() => {
        if (button.isConnected) button.textContent = previousText
      }, 1600)
    })
  })

  detailPanel.querySelectorAll('[data-open-node-media]').forEach((button) => {
    button.addEventListener('click', () => openMediaManager(node.id))
  })

  detailPanel.querySelectorAll('[data-open-node-files]').forEach((button) => {
    button.addEventListener('click', () => openFileManager(node.id))
  })

  detailPanel
    .querySelectorAll('[data-open-documentation-meta]')
    .forEach((button) => {
      button.addEventListener('click', () => {
        openDocumentationMetaManager(node.id)
      })
    })

  detailPanel
    .querySelectorAll('[data-open-connected-node]')
    .forEach((button) => {
      button.addEventListener('click', () => {
        openConnectedDocumentationNode(
          Number(button.dataset.openConnectedNode)
        )
      })
    })

  hydrateDetailDocumentationOutline()

  const hideEditorActions = !nodeEditorActions

  detailPanel.querySelectorAll('[data-rel-edit]').forEach((button) => {
    button.disabled = hideEditorActions
    button.hidden = hideEditorActions
    button.addEventListener('click', () => {
      openRelationEdit(node.id, Number(button.dataset.relEdit))
    })
  })

  detailPanel.querySelectorAll('[data-rel-remove]').forEach((button) => {
    button.disabled = hideEditorActions
    button.hidden = hideEditorActions
    button.addEventListener('click', () => {
      removeRelation(node.id, Number(button.dataset.relRemove)).catch((error) =>
        alert(error.message || 'Eroare la ștergerea relației.')
      )
    })
  })
}

function renderAll() {
  syncActiveNodeCollection()
  normalizeSelectionAfterFilters()
  renderTaxonomyControls()
  renderDepartmentNavigation()
  renderTeamNavigation()
  renderPublicShell()

  const visibleCount = getVisibleNodes().length
  const departmentTotal = getDepartmentNodes().length

  nodeCount.textContent = hasActiveFilters()
    ? `${visibleCount} / ${departmentTotal}`
    : String(departmentTotal)

  renderSelectedStrip()
  renderModeStrip()
  renderHealthToolState()
  renderLayoutEditorState()
  renderLinks()
  renderNodes()
  renderDetailPanel()
  updateAuthUI()

  if (isDocumentationHealthOpen()) {
    renderDocumentationHealth()
  }

  if (isTaxonomyManagerOpen()) {
    renderTaxonomyManager()
  }

  if (isFileManagerOpen()) {
    renderFileManager()
  }
}

function canEditTutorial() {
  return Boolean(canEdit && editorMode)
}

function setModalModeUi(mode) {
  if (mode === 'node' || mode === 'relation') {
    saveBtn.textContent = 'Salvează'
  } else if (mode === 'tutorial' && canEditTutorial()) {
    saveBtn.textContent = 'Salvează tutorialul'
  } else {
    saveBtn.textContent = 'Închide'
  }
}

function applyTutorialPermissions() {
  if (modalMode !== 'tutorial') return

  const editable = canEditTutorial()

  contentInput.readOnly = !editable
  contentInput.setAttribute('aria-readonly', editable ? 'false' : 'true')

  contentInputLabel.textContent = editable ? 'Conținut tutorial' : 'Tutorial — doar citire'
  setNodeContentEditorVisible(false)

  setModalModeUi('tutorial')
}

async function updateTutorialRemote(content) {
  const { data, error } = await supabase.rpc('atlas_update_tutorial', {
    p_project_id: PROJECT_ID,
    p_content: content
  })

  if (error) throw error

  const row = Array.isArray(data) ? data[0] : data

  if (!row?.content) {
    throw new Error('Tutorialul actualizat nu a fost returnat de Supabase.')
  }

  return row
}

function openTutorial() {
  modalTitle.textContent = 'Tutorial complet de folosire'
  modalSubtitle.textContent = canEditTutorial()
    ? 'Editor Mode: poți modifica tutorialul și salva schimbările pentru toți utilizatorii.'
    : 'Reader Mode: poți citi și selecta textul, dar numai editorii îl pot modifica.'

  nodeFields.style.display = 'none'
  nodeTagsField.style.display = 'none'
  nodeContentField.style.display = 'block'
  relationTargetField.style.display = 'none'
  relationLabelField.style.display = 'none'

  modalMode = 'tutorial'
  contentInput.value = tutorialContent

  applyTutorialPermissions()

  modalBackdrop.classList.add('open')
  contentInput.focus()
  contentInput.setSelectionRange(0, 0)
}

function openModal(mode) {
  modalMode = mode

  if (mode !== 'tutorial') {
    contentInput.readOnly = false
    contentInput.setAttribute('aria-readonly', 'false')
    contentInputLabel.textContent = 'Documentație completă'
  }

  setNodeContentEditorVisible(mode === 'node')
  setModalModeUi(mode)
  modalBackdrop.classList.add('open')

  if (mode === 'node' || mode === 'tutorial') {
    nodeFields.style.display = mode === 'tutorial' ? 'none' : 'grid'
    teamNodeDepartmentField.hidden =
      mode !== 'node' || !isTeamAtlasMode()
    nodeTagsField.style.display = mode === 'tutorial' ? 'none' : 'block'
    nodeContentField.style.display = 'block'
    relationTargetField.style.display = 'none'
    relationLabelField.style.display = 'none'
  } else {
    nodeFields.style.display = 'none'
    teamNodeDepartmentField.hidden = true
    nodeTagsField.style.display = 'none'
    nodeContentField.style.display = 'none'
    relationTargetField.style.display = 'block'
    relationLabelField.style.display = 'block'
  }
}

function closeModal() {
  modalBackdrop.classList.remove('open')
  editingId = null
  contentInput.readOnly = false
  contentInput.setAttribute('aria-readonly', 'false')
  contentInputLabel.textContent = 'Documentație completă'
  setNodeContentEditorVisible(true)
  setModalModeUi('node')
}

function openCreate() {
  if (!requireAuth()) return

  editingId = null
  modalTitle.textContent = 'Creează nod'
  modalSubtitle.textContent = ''
  titleInput.value = 'New FTC Topic'

  const defaultCategoryId = categories.find((item) => item.is_active !== false)?.id || null
  const defaultDifficultyId = difficulties.find((item) => item.is_active !== false)?.id || null

  populateNodeTaxonomyFields(defaultCategoryId, defaultDifficultyId)

  if (isTeamAtlasMode()) {
    populateTeamNodeDepartmentSelect(activeDepartmentId)
  }

  nodeTagDraft = new Set()
  renderNodeTagPicker()

  setRichEditorHtml(
    plainTextToRichHtml(`Scrie aici documentația completă.

Poți explica simplu conceptul, de ce e important, cum îl folosiți pe robot și ce greșeli apar cel mai des.`)
  )

  openModal('node')
  titleInput.focus()
}

function openEdit(id) {
  if (!requireAuth()) return

  const node = findNode(id)
  if (!node) return

  if (!canEditNode(node)) {
    alert('Rolul tău nu permite editarea acestui nod.')
    return
  }

  editingId = id
  modalTitle.textContent = 'Editează nod'
  modalSubtitle.textContent = ''
  titleInput.value = node.title

  populateNodeTaxonomyFields(node.categoryId, node.difficultyId)

  if (node.isTeamNode) {
    populateTeamNodeDepartmentSelect(node.departmentId)
  }

  nodeTagDraft = new Set((node.tagIds || []).map(Number))
  renderNodeTagPicker()

  setRichEditorHtml(
    node.contentFormat === 'html'
      ? node.content
      : plainTextToRichHtml(node.content)
  )
  openModal('node')
  titleInput.focus()
}

function openRelationCreate(sourceId, targetId) {
  if (!requireAuth()) return
  const source = findNode(sourceId)
  const target = findNode(targetId)
  if (!source || !target) return

  if (!canEditEdge(sourceId, targetId)) {
    alert('Nu ai permisiunea de a conecta aceste două noduri.')
    return
  }

  editingId = null
  relationDraft = { sourceId, targetId, label: '' }
  modalTitle.textContent = 'Creează relație'
  modalSubtitle.textContent =
    'Conexiunea este reală și editabilă. Poți să-i dai o etichetă clară, ca să aibă sens vizual și logic.'
  relationSummary.innerHTML = `<strong>${escapeHtml(source.title)}</strong> → <strong>${escapeHtml(target.title)}</strong>`
  relationLabelInput.value = ''
  openModal('relation')
  relationLabelInput.focus()
}

function openRelationEdit(sourceId, relationIndex) {
  if (!requireAuth()) return

  const source = findNode(sourceId)
  const relation = source?.links?.[relationIndex]
  const target = relation ? findNode(relation.targetId) : null
  if (!source || !relation || !target) return

  if (!canEditEdge(sourceId, relation.targetId)) {
    alert('Nu ai permisiunea de a edita această relație.')
    return
  }

  editingId = relationIndex
  relationDraft = { sourceId, targetId: relation.targetId, label: relation.label || '' }
  modalTitle.textContent = 'Editează relație'
  modalSubtitle.textContent = 'Schimbi eticheta fără să pierzi conexiunea dintre noduri.'
  relationSummary.innerHTML = `<strong>${escapeHtml(source.title)}</strong> → <strong>${escapeHtml(target.title)}</strong>`
  relationLabelInput.value = relation.label || ''
  openModal('relation')
  relationLabelInput.focus()
}

async function saveModal() {
  if (modalMode === 'node') {
    await saveNode()
  } else if (modalMode === 'relation') {
    await saveRelation()
  } else if (modalMode === 'tutorial' && canEditTutorial()) {
    await saveTutorial()
  } else {
    closeModal()
  }
}

async function saveTutorial() {
  if (!requireAuth()) return

  const content = contentInput.value.trim()

  if (!content) {
    alert('Tutorialul nu poate fi gol.')
    return
  }

  const previousText = saveBtn.textContent
  saveBtn.disabled = true
  saveBtn.textContent = 'Se salvează...'

  try {
    const updated = await updateTutorialRemote(content)
    tutorialContent = updated.content
    closeModal()
  } catch (error) {
    console.error('Save tutorial failed:', error)
    alert(`Eroare la salvarea tutorialului: ${error?.message || 'necunoscută'}`)
  } finally {
    saveBtn.disabled = false

    if (modalBackdrop.classList.contains('open')) {
      saveBtn.textContent = previousText
    }
  }
}

// Node and relationship mutations
async function saveNode() {
  if (!requireAuth()) return

  const title = titleInput.value.trim() || 'Untitled Node'
  const categoryId = categoryInput.value ? Number(categoryInput.value) : null
  const difficultyId = difficultyInput.value ? Number(difficultyInput.value) : null
  const tagIds = Array.from(nodeTagDraft).map(Number)
  const departmentId = isTeamAtlasMode()
    ? Number(teamNodeDepartmentInput.value)
    : null
  const content = getRichEditorHtml() || '<p>Fără documentație încă.</p>'
  const contentFormat = 'html'

  if (content.length > 150000) {
    alert('Documentația este prea mare. Limita este 150.000 de caractere HTML.')
    return
  }

  if (!categoryId) {
    alert('Alege o categorie pentru nod.')
    return
  }

  if (!difficultyId) {
    alert('Alege o dificultate pentru nod.')
    return
  }

  if (isTeamAtlasMode()) {
    if (!departmentId || !canEditTeamDepartment(departmentId)) {
      alert('Alege un departament pe care ai voie să îl editezi.')
      return
    }
  }

  try {
    if (editingId == null) {
      const tempId = Date.now()
      const { width: nodeWidth, height: nodeHeight } = getNodeMetrics()

      const startPos = findNearestFreeSpot(
        tempId,
        WORLD_WIDTH * 0.5 - nodeWidth / 2,
        WORLD_HEIGHT * 0.5 - nodeHeight / 2
      )

      const inserted = await createNodeRemote({
        title,
        categoryId,
        difficultyId,
        departmentId,
        tagIds,
        content,
        contentFormat,
        x: startPos.x,
        y: startPos.y
      })

      const newNode = {
        id: Number(inserted.id),
        isTeamNode: isTeamAtlasMode(),
        teamId: isTeamAtlasMode() ? Number(activeTeamId) : null,
        title: inserted.title,
        legacyTag: inserted.tag,
        categoryId:
          isTeamAtlasMode()
            ? Number(inserted.team_category_id ?? categoryId)
            : inserted.category_id == null
              ? categoryId
              : Number(inserted.category_id),
        difficultyId:
          isTeamAtlasMode()
            ? Number(inserted.team_difficulty_id ?? difficultyId)
            : inserted.difficulty_id == null
              ? difficultyId
              : Number(inserted.difficulty_id),
        departmentId:
          isTeamAtlasMode()
            ? Number(inserted.department_id ?? departmentId)
            : null,
        departmentIds:
          isTeamAtlasMode()
            ? [Number(inserted.department_id ?? departmentId)]
            : [],
        tagIds,
        content: inserted.content,
        contentFormat: inserted.content_format || contentFormat,
        x: Number(inserted.x),
        y: Number(inserted.y),
        width: inserted.width == null ? null : Number(inserted.width),
        height: inserted.height == null ? null : Number(inserted.height),
        links: [],
        media: [],
        files: [],
        codeSnippets: []
      }

      nodes.push(newNode)

      if (newNode.isTeamNode) {
        teamNodes = nodes
      } else {
        publicNodes = nodes
      }
      selectedId = newNode.id
      clearEdgeSelection()
    } else {
      const node = findNode(editingId)

      if (!node) {
        throw new Error('Nodul selectat nu mai există.')
      }

      const updated = await updateNodeRemote({
        ...node,
        title,
        categoryId,
        difficultyId,
        departmentId: node.isTeamNode ? departmentId : node.departmentId,
        tagIds,
        content,
        contentFormat
      })

      node.title = updated.title
      node.legacyTag = updated.tag

      if (node.isTeamNode) {
        node.categoryId = Number(updated.team_category_id ?? categoryId)
        node.difficultyId = Number(
          updated.team_difficulty_id ?? difficultyId
        )
        node.tagIds = Array.isArray(updated.team_tag_ids)
          ? updated.team_tag_ids.map(Number)
          : tagIds
      } else {
        node.categoryId =
          updated.category_id == null
            ? categoryId
            : Number(updated.category_id)
        node.difficultyId =
          updated.difficulty_id == null
            ? difficultyId
            : Number(updated.difficulty_id)
        node.tagIds = tagIds
      }

      if (node.isTeamNode) {
        node.departmentId = Number(updated.department_id ?? departmentId)
        node.departmentIds = [node.departmentId]
      }

      node.content = updated.content
      node.contentFormat = updated.content_format || contentFormat
      node.x = Number(updated.x)
      node.y = Number(updated.y)

      if (hasUnsavedNodePosition(node.id)) {
        clearUnsavedNodePosition()
      }

      selectedId = node.id
      clearEdgeSelection()
    }

    detailOpen = true
    saveCachedNodes()
    closeModal()
    setNodeRoute(selectedNode(), { push: false })
    renderAll()
    await refreshHistoryButtons()
  } catch (error) {
    console.error('Save node failed FULL:', error)
    alert(`Eroare la salvare nod: ${error?.message || 'necunoscută'}`)

    // Do not overwrite a local WASD position that the editor has not saved yet.
    if (!hasUnsavedNodePosition()) {
      await fetchAllData()
    }
  }
}

async function saveRelation() {
  if (!requireAuth()) return

  const label = relationLabelInput.value.trim() || 'relație'
  const sourceId = Number(relationDraft.sourceId)
  const targetId = Number(relationDraft.targetId)

  const source = findNode(sourceId)

  if (!source) {
    alert('Nodul sursă nu mai există.')
    return
  }

  try {
    const existingIndex = source.links.findIndex((link) => Number(link.targetId) === targetId)

    if (editingId == null) {
      if (existingIndex >= 0) {
        const updated = await updateEdgeRemote(sourceId, targetId, label)

        source.links[existingIndex].label = updated.label || label
      } else {
        const inserted = await insertEdgeRemote(sourceId, targetId, label)

        source.links.push({
          targetId: Number(inserted.target_id),
          label: inserted.label || label
        })
      }
    } else {
      if (existingIndex < 0) {
        throw new Error('Muchia pe care încerci să o editezi nu mai există.')
      }

      const updated = await updateEdgeRemote(sourceId, targetId, label)

      source.links[existingIndex].label = updated.label || label
    }

    selectedId = sourceId

    selectedEdge = {
      sourceId,
      targetId
    }

    detailOpen = true

    saveCachedNodes()
    closeModal()
    setNodeRoute(findNode(sourceId), { push: false })
    renderAll()

    await refreshHistoryButtons()
  } catch (error) {
    console.error('Save relation failed:', error)

    alert(`Eroare la salvarea relației: ${error?.message || 'necunoscută'}`)

    await fetchAllData()
  }
}

async function deleteSelected() {
  console.log('deleteSelected start', {
    canEdit,
    selectedId,
    selectedNode: selectedNode()?.title ?? null,
    selectedEdge
  })

  if (!requireAuth()) return

  const node = selectedNode()

  if (!node) {
    alert('Nu este selectat niciun nod.')
    return
  }

  if (!canEditNode(node)) {
    alert('Rolul tău nu permite ștergerea acestui nod.')
    return
  }

  const ok = confirm(`Sigur vrei să ștergi nodul "${node.title}"?`)

  if (!ok) return

  try {
    await deleteNodeRemote(node.id)

    const storedPaths = (node.media || []).map((media) => media.storagePath).filter(Boolean)
    const storedFilePaths = (node.files || []).map((file) => file.storagePath).filter(Boolean)

    if (storedPaths.length > 0) {
      const mediaBucket = node.isTeamNode
        ? TEAM_MEDIA_BUCKET
        : MEDIA_BUCKET

      const { error: storageCleanupError } = await supabase.storage
        .from(mediaBucket)
        .remove(storedPaths)

      if (storageCleanupError) {
        console.warn('Node media storage cleanup failed:', storageCleanupError)
      }
    }

    if (storedFilePaths.length > 0) {
      const fileBucket = node.isTeamNode
        ? TEAM_FILE_BUCKET
        : FILE_BUCKET

      const { error: fileStorageCleanupError } = await supabase.storage
        .from(fileBucket)
        .remove(storedFilePaths)

      if (fileStorageCleanupError) {
        console.warn('Node file storage cleanup failed:', fileStorageCleanupError)
      }
    }

    nodes = nodes
      .filter((currentNode) => Number(currentNode.id) !== Number(node.id))
      .map((currentNode) => ({
        ...currentNode,
        links: (currentNode.links || []).filter(
          (link) => Number(link.targetId) !== Number(node.id)
        )
      }))

    if (node.isTeamNode) {
      teamNodes = nodes
    } else {
      publicNodes = nodes
    }

    if (
      selectedEdge &&
      (Number(selectedEdge.sourceId) === Number(node.id) ||
        Number(selectedEdge.targetId) === Number(node.id))
    ) {
      selectedEdge = null
      selectedEdgePointIndex = null
    }

    selectedId = nodes[0]?.id ?? null
    detailOpen = false
    setHomeRoute({ push: false })

    relationMode = {
      active: false,
      sourceId: null
    }

    saveCachedNodes()
    renderAll()

    await refreshHistoryButtons()
  } catch (error) {
    console.error('Delete node failed FULL:', error)

    alert(`Eroare la ștergere: ${error?.message || 'necunoscută'}`)

    await fetchAllData()
  }
}

async function removeRelation(sourceId, relationIndex) {
  const source = findNode(sourceId)

  if (!source || !source.links[relationIndex]) {
    alert('Relația nu mai există.')
    return
  }

  if (!requireAuth()) return

  const targetId = Number(source.links[relationIndex].targetId)

  try {
    await deleteEdgeRemote(Number(sourceId), targetId)

    source.links.splice(relationIndex, 1)

    if (
      selectedEdge &&
      Number(selectedEdge.sourceId) === Number(sourceId) &&
      Number(selectedEdge.targetId) === targetId
    ) {
      selectedEdge = null
      selectedEdgePointIndex = null
    }

    saveCachedNodes()
    renderAll()

    await refreshHistoryButtons()
  } catch (error) {
    console.error('Remove relation failed:', error)

    alert(`Eroare la ștergerea relației: ${error?.message || 'necunoscută'}`)

    await fetchAllData()
  }
}

function activateRelationMode(sourceId = selectedId || null) {
  if (!requireAuth()) return
  relationMode = { active: true, sourceId: sourceId || null }
  detailOpen = false
  renderAll()
}

function deactivateRelationMode(renderNow = true) {
  relationMode = { active: false, sourceId: null }
  if (renderNow) renderAll()
}

function handleRelationNodeClick(targetId) {
  if (!relationMode.active) return

  const sourceId = relationMode.sourceId

  if (!sourceId) {
    relationMode.sourceId = targetId
    selectedId = targetId
    clearEdgeSelection()
    renderAll()
    return
  }

  if (Number(sourceId) === Number(targetId)) {
    selectedId = sourceId
    clearEdgeSelection()
    renderAll()
    return
  }

  const source = findNode(sourceId)
  if (!source) {
    deactivateRelationMode()
    return
  }

  const relationIndex = source.links.findIndex((link) => Number(link.targetId) === Number(targetId))
  selectedId = sourceId
  clearEdgeSelection()
  deactivateRelationMode(false)

  if (relationIndex === -1) {
    detailOpen = false
    renderAll()
    openRelationCreate(sourceId, targetId)
    return
  }

  detailOpen = true
  setNodeRoute(source, { push: false })
  renderAll()
  openRelationEdit(sourceId, relationIndex)
}

// Mouse, touch, pan and pinch navigation
function shouldIgnoreSurfaceGesture(event) {
  return !!(
    event.target.closest('.node') ||
    event.target.closest('.edge-hit') ||
    event.target.closest('.edge-label-hit') ||
    event.target.closest('.floating-tools') ||
    event.target.closest('.detail-panel') ||
    event.target.closest('.modal')
  )
}

function beginPinchGesture() {
  const points = Array.from(activeTouchPoints.values())
  if (points.length < 2) return

  const center = getTouchCenter(points[0], points[1])
  const distance = Math.max(getTouchDistance(points[0], points[1]), 1)

  pinchState = {
    startDistance: distance,
    startScale: view.scale,
    worldX: (center.x - view.x) / view.scale,
    worldY: (center.y - view.y) / view.scale
  }

  panState = null
  mapSurface.classList.add('panning')
}

mapSurface.addEventListener('pointerdown', (event) => {
  if (shouldIgnoreSurfaceGesture(event)) return

  if (event.pointerType === 'touch') {
    activeTouchPoints.set(event.pointerId, {
      x: event.clientX,
      y: event.clientY
    })

    try {
      mapSurface.setPointerCapture(event.pointerId)
    } catch {}

    if (activeTouchPoints.size === 1) {
      panState = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        x: view.x,
        y: view.y
      }
      mapSurface.classList.add('panning')
    } else if (activeTouchPoints.size === 2) {
      beginPinchGesture()
    }

    return
  }

  panState = {
    pointerId: event.pointerId,
    startX: event.clientX,
    startY: event.clientY,
    x: view.x,
    y: view.y
  }

  mapSurface.classList.add('panning')
})

window.addEventListener('pointermove', (event) => {
  if (event.pointerType === 'touch' && activeTouchPoints.has(event.pointerId)) {
    activeTouchPoints.set(event.pointerId, {
      x: event.clientX,
      y: event.clientY
    })

    const points = Array.from(activeTouchPoints.values())

    if (points.length >= 2 && pinchState) {
      const center = getTouchCenter(points[0], points[1])
      const distance = Math.max(getTouchDistance(points[0], points[1]), 1)
      const nextScale = clamp(
        pinchState.startScale * (distance / pinchState.startDistance),
        0.45,
        1.8
      )

      view.scale = nextScale
      view.x = center.x - pinchState.worldX * nextScale
      view.y = center.y - pinchState.worldY * nextScale
      applyView()
      return
    }

    if (panState && panState.pointerId === event.pointerId) {
      view.x = panState.x + (event.clientX - panState.startX)
      view.y = panState.y + (event.clientY - panState.startY)
      applyView()
    }

    return
  }

  if (!panState || panState.pointerId !== event.pointerId) return

  view.x = panState.x + (event.clientX - panState.startX)
  view.y = panState.y + (event.clientY - panState.startY)
  applyView()
})

function finishSurfacePointer(event) {
  if (event.pointerType === 'touch') {
    activeTouchPoints.delete(event.pointerId)

    try {
      mapSurface.releasePointerCapture(event.pointerId)
    } catch {}

    if (panState?.pointerId === event.pointerId) {
      panState = null
    }

    if (activeTouchPoints.size < 2) {
      pinchState = null
    }

    if (activeTouchPoints.size === 1 && !pinchState) {
      const [remainingId, point] = Array.from(activeTouchPoints.entries())[0]
      panState = {
        pointerId: remainingId,
        startX: point.x,
        startY: point.y,
        x: view.x,
        y: view.y
      }
    }

    if (activeTouchPoints.size === 0) {
      mapSurface.classList.remove('panning')
    }

    return
  }

  if (!panState || panState.pointerId !== event.pointerId) return
  panState = null
  mapSurface.classList.remove('panning')
}

window.addEventListener('pointerup', finishSurfacePointer)
window.addEventListener('pointercancel', finishSurfacePointer)

mapSurface.addEventListener(
  'wheel',
  (event) => {
    event.preventDefault()
    const delta = event.deltaY > 0 ? 0.92 : 1.08
    setScale(view.scale * delta, event.clientX, event.clientY)
  },
  { passive: false }
)

// Interface event bindings
createBtn.addEventListener('click', () => {
  ;(async () => {
    if (!(await confirmUnsavedPositionBeforeLeaving())) return
    openCreate()
  })().catch((error) => alert(error.message || 'Nodul nou nu a putut fi deschis.'))
})
editBtn.addEventListener('click', () => {
  const node = selectedNode()
  if (node) openEdit(node.id)
})
deleteBtn.addEventListener('click', () => {
  deleteSelected().catch((error) => alert(error.message || 'Eroare la ștergere.'))
})
relationBtn.addEventListener('click', () => {
  ;(async () => {
    if (!relationMode.active && !(await confirmUnsavedPositionBeforeLeaving())) return

    if (relationMode.active) {
      deactivateRelationMode()
    } else {
      layoutEditMode = false
      layoutUndoStack = []
      layoutRedoStack = []
      activateRelationMode()
    }
  })().catch((error) => alert(error.message || 'Modul relație nu a putut fi schimbat.'))
})
editEdgeBtn.addEventListener('click', () => {
  openSelectedEdgeEdit()
})
deleteEdgeBtn.addEventListener('click', () => {
  deleteSelectedEdge().catch((error) => alert(error.message || 'Eroare la ștergerea muchiei.'))
})
undoBtn.addEventListener('click', () => {
  runHistoryActionWithUnsavedGuard(undo).catch((error) =>
    alert(error.message || 'Eroare la undo.')
  )
})

redoBtn.addEventListener('click', () => {
  runHistoryActionWithUnsavedGuard(redo).catch((error) =>
    alert(error.message || 'Eroare la redo.')
  )
})

zoomInBtn.addEventListener('click', () => setScale(view.scale * 1.12))
zoomOutBtn.addEventListener('click', () => setScale(view.scale * 0.88))
fitBtn.addEventListener('click', fitView)
addEdgePointBtn.addEventListener('click', () => {
  addEdgeControlPoint().catch((error) => {
    alert(error.message || 'Punctul nu a putut fi adăugat.')
  })
})
removeEdgePointBtn.addEventListener('click', () => {
  removeSelectedEdgeControlPoint().catch((error) => {
    alert(error.message || 'Punctul nu a putut fi șters.')
  })
})
resetEdgePathBtn.addEventListener('click', () => {
  if (!selectedEdge) return

  resetEdgeControl(selectedEdge.sourceId, selectedEdge.targetId).catch((error) => {
    alert(error.message || 'Traseul automat nu a putut fi restaurat.')
  })
})
resetViewBtn.addEventListener('click', () => {
  view = { ...DEFAULT_VIEW }
  applyView()
  fitView()
})
tutorialBtn.addEventListener('click', openTutorial)
editorModeBtn.addEventListener('click', () => {
  ;(async () => {
    if (editorMode && !(await confirmUnsavedPositionBeforeLeaving())) return
    setEditorMode(!editorMode)
  })().catch((error) => {
    console.error('Editor mode toggle failed:', error)
    alert(error.message || 'Editor Mode nu a putut fi schimbat.')
  })
})

layoutEditModeBtn?.addEventListener(
  'click',
  () => {
    setLayoutEditMode(!layoutEditMode)
  }
)

discardLayoutBtn?.addEventListener(
  'click',
  () => {
    if (!hasUnsavedLayoutChanges()) return

    if (confirm(`Discard ${layoutChangeCount()} modificări de layout?`)) {
      discardLayoutChanges()
    }
  }
)

saveLayoutBtn?.addEventListener(
  'click',
  () => {
    saveLayoutChanges().catch((error) => {
      console.error('Layout save failed:', error)
    })
  }
)

savePositionBtn?.addEventListener('click', () => {
  saveUnsavedNodePosition().catch((error) => {
    console.error('Legacy position save failed:', error)
  })
})

taxonomyManagerBtn.addEventListener('click', () => {
  openTaxonomyManager()
})

mediaManagerBtn.addEventListener('click', () => {
  openMediaManager()
})

fileManagerBtn.addEventListener('click', () => {
  openFileManager()
})

codeManagerBtn.addEventListener('click', () => {
  openCodeManager()
})

closeCodeManagerBtn.addEventListener('click', closeCodeManager)
closeCodeManagerFooterBtn.addEventListener('click', closeCodeManager)

addCodeSnippetBtn.addEventListener('click', () => {
  createCodeSnippetFromForm().catch((error) => {
    console.error('Code snippet create failed:', error)
    codeManagerStatus.textContent = error.message || 'Eroare la adăugarea codului.'
    alert(error.message || 'Eroare la adăugarea codului.')
  })
})

;[
  codeCreateTitleInput,
  codeCreateLanguageInput,
  codeCreateDescriptionInput,
  codeCreateCodeInput
].forEach((element) => {
  element.addEventListener('input', scheduleCodeDraftSave)
  element.addEventListener('change', scheduleCodeDraftSave)
})

codeManagerBackdrop.addEventListener('click', (event) => {
  if (event.target !== codeManagerBackdrop) return
  saveAllCodeDrafts({ showStatus: true })
})

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') {
    saveAllCodeDrafts()
  }
})

window.addEventListener('pagehide', () => {
  saveAllCodeDrafts()
})

closeFileManagerBtn.addEventListener('click', closeFileManager)
closeFileManagerFooterBtn.addEventListener('click', closeFileManager)

uploadNodeFilesBtn.addEventListener('click', () => {
  uploadNodeFileBatch(nodeFilesInput.files, false).catch((error) => {
    console.error('Node file upload failed:', error)
    fileManagerStatus.textContent = error.message || 'Eroare la upload.'
    alert(error.message || 'Eroare la upload.')
  })
})

uploadNodeFolderBtn.addEventListener('click', () => {
  uploadNodeFileBatch(nodeFolderInput.files, true).catch((error) => {
    console.error('Node folder upload failed:', error)
    fileManagerStatus.textContent = error.message || 'Eroare la upload-ul folderului.'
    alert(error.message || 'Eroare la upload-ul folderului.')
  })
})

fileManagerBackdrop.addEventListener('click', (event) => {
  if (event.target === fileManagerBackdrop) closeFileManager()
})

closeMediaManagerBtn.addEventListener('click', closeMediaManager)
closeMediaManagerFooterBtn.addEventListener('click', closeMediaManager)

uploadMediaBtn.addEventListener('click', () => {
  uploadSelectedMedia().catch((error) => {
    console.error('Media upload failed:', error)
    mediaUploadStatus.textContent = error.message || 'Eroare la upload.'
    alert(error.message || 'Eroare la upload.')
  })
})

addExternalMediaBtn.addEventListener('click', () => {
  addExternalMedia().catch((error) => {
    console.error('External media add failed:', error)
    mediaUploadStatus.textContent = error.message || 'Eroare la adăugarea linkului.'
    alert(error.message || 'Eroare la adăugarea linkului.')
  })
})

mediaManagerBackdrop.addEventListener('click', (event) => {
  if (event.target === mediaManagerBackdrop) closeMediaManager()
})

document.querySelectorAll('[data-taxonomy-kind]').forEach((button) => {
  button.addEventListener('click', () => {
    taxonomyManagerKind = button.dataset.taxonomyKind
    renderTaxonomyManager()
  })
})

taxonomyAddBtn.addEventListener('click', () => {
  openTaxonomyItemEditor()
})

closeTaxonomyManagerBtn.addEventListener('click', closeTaxonomyManager)

closeTaxonomyItemBtn.addEventListener('click', closeTaxonomyItemEditor)

cancelTaxonomyItemBtn.addEventListener('click', closeTaxonomyItemEditor)

saveTaxonomyItemBtn.addEventListener('click', () => {
  saveTaxonomyItem().catch((error) => {
    console.error('Save taxonomy item failed:', error)
    alert(error.message || 'Eroare la salvarea elementului.')
  })
})

taxonomyDeleteBtn.addEventListener('click', () => {
  requestTaxonomyDelete().catch((error) => {
    console.error('Delete taxonomy item failed:', error)
    alert(error.message || 'Eroare la ștergerea elementului.')
  })
})

closeTaxonomyReplaceBtn.addEventListener('click', closeTaxonomyReplaceDialog)

cancelTaxonomyReplaceBtn.addEventListener('click', closeTaxonomyReplaceDialog)

confirmTaxonomyReplaceBtn.addEventListener('click', () => {
  confirmTaxonomyReplacementDelete().catch((error) => {
    console.error('Replace taxonomy item failed:', error)
    alert(error.message || 'Eroare la mutarea nodurilor.')
  })
})

taxonomyManagerBackdrop.addEventListener('click', (event) => {
  if (event.target === taxonomyManagerBackdrop) {
    closeTaxonomyManager()
  }
})

taxonomyItemBackdrop.addEventListener('click', (event) => {
  if (event.target === taxonomyItemBackdrop) {
    closeTaxonomyItemEditor()
  }
})

taxonomyReplaceBackdrop.addEventListener('click', (event) => {
  if (event.target === taxonomyReplaceBackdrop) {
    closeTaxonomyReplaceDialog()
  }
})

fitSelectionBtn.addEventListener('click', fitCurrentSelection)

teamSpaceEntry?.addEventListener('click', () => {
  if (!currentTeamRecord()) return
  if (!currentTeamMembership() && !canEdit) return
  selectPublicSection('team')
})

teamAtlasSelect?.addEventListener('change', () => {
  selectActiveTeam(Number(teamAtlasSelect.value)).catch((error) => {
    console.error('Switch Team Atlas failed:', error)
  })
})

closeSourceCompareBtn?.addEventListener(
  'click',
  closeSourceCompare
)

closeSourceCompareFooterBtn?.addEventListener(
  'click',
  closeSourceCompare
)

sourceCompareBackdrop?.addEventListener(
  'click',
  (event) => {
    if (event.target === sourceCompareBackdrop) {
      closeSourceCompare()
    }
  }
)

sourceCompareOpenPublicBtn?.addEventListener(
  'click',
  () => {
    const node = currentSourceCompareNode()
    if (!node) return
    closeSourceCompare()
    openPublicSourceFromTeamNode(node)
  }
)

sourceCompareMarkBtn?.addEventListener(
  'click',
  () => {
    runSourceSync({ markOnly: true }).catch((error) => {
      console.error('Mark source reviewed failed:', error)
      sourceCompareStatus.textContent =
        error?.message || 'Baseline-ul nu a putut fi actualizat.'
      alert(error?.message || 'Baseline-ul nu a putut fi actualizat.')
    })
  }
)

sourceCompareSyncBtn?.addEventListener(
  'click',
  () => {
    runSourceSync().catch((error) => {
      console.error('Source sync failed:', error)
      sourceCompareStatus.textContent =
        error?.message || 'Sync-ul nu a putut fi finalizat.'
      alert(error?.message || 'Sync-ul nu a putut fi finalizat.')
    })
  }
)

closeRevisionHistoryBtn?.addEventListener(
  'click',
  closeRevisionHistory
)

closeRevisionHistoryFooterBtn?.addEventListener(
  'click',
  closeRevisionHistory
)

revisionHistoryBackdrop?.addEventListener(
  'click',
  (event) => {
    if (event.target === revisionHistoryBackdrop) {
      closeRevisionHistory()
    }
  }
)

revisionHistoryList?.addEventListener(
  'click',
  (event) => {
    const button = event.target.closest?.(
      '[data-revision-select]'
    )

    if (!button) return

    revisionHistorySelectedId =
      Number(button.dataset.revisionSelect)

    renderRevisionHistory()
  }
)

revisionHistoryPreview?.addEventListener(
  'click',
  (event) => {
    const button = event.target.closest?.(
      '[data-revision-restore]'
    )

    if (!button) return

    restoreRevision(
      Number(button.dataset.revisionRestore)
    ).catch((error) => {
      console.error('Revision restore failed:', error)
      alert(
        error?.message ||
          'Versiunea nu a putut fi restaurată.'
      )
    })
  }
)

documentationHealthBtn?.addEventListener(
  'click',
  openDocumentationHealth
)

closeDocumentationHealthBtn?.addEventListener(
  'click',
  closeDocumentationHealth
)

closeDocumentationHealthFooterBtn?.addEventListener(
  'click',
  closeDocumentationHealth
)

documentationHealthBackdrop?.addEventListener(
  'click',
  (event) => {
    if (event.target === documentationHealthBackdrop) {
      closeDocumentationHealth()
    }
  }
)

documentationHealthIssueInput?.addEventListener(
  'change',
  () => {
    healthIssueFilter =
      documentationHealthIssueInput.value

    renderDocumentationHealth()
  }
)

documentationHealthDepartmentInput?.addEventListener(
  'change',
  () => {
    healthDepartmentFilter =
      documentationHealthDepartmentInput.value

    renderDocumentationHealth()
  }
)

documentationHealthStaleInput?.addEventListener(
  'change',
  () => {
    const next = Number(
      documentationHealthStaleInput.value
    )

    healthStaleDays = [90, 180, 365].includes(next)
      ? next
      : 180

    localStorage.setItem(
      CACHE_KEYS.healthStaleDays,
      String(healthStaleDays)
    )

    renderAll()
  }
)

documentationQualityLensInput?.addEventListener(
  'change',
  () => {
    qualityLensEnabled =
      documentationQualityLensInput.checked

    localStorage.setItem(
      CACHE_KEYS.qualityLens,
      qualityLensEnabled ? '1' : '0'
    )

    renderAll()
  }
)

documentationHealthResults?.addEventListener(
  'click',
  (event) => {
    const openButton = event.target.closest?.(
      '[data-health-open]'
    )

    if (openButton) {
      openHealthNode(
        Number(openButton.dataset.healthOpen)
      )
      return
    }

    const metaButton = event.target.closest?.(
      '[data-health-meta]'
    )

    if (metaButton) {
      const nodeId =
        Number(metaButton.dataset.healthMeta)

      closeDocumentationHealth()
      openDocumentationMetaManager(nodeId)
      return
    }

    const sourceButton = event.target.closest?.(
      '[data-health-public-source]'
    )

    if (sourceButton) {
      openHealthPublicSource(
        Number(
          sourceButton.dataset.healthPublicSource
        )
      )
    }
  }
)

copyDocumentationHealthReportBtn?.addEventListener(
  'click',
  () => {
    copyTextToClipboard(
      healthReportText(),
      copyDocumentationHealthReportBtn,
      'Copied'
    )
  }
)

closeDocumentationMetaBtn?.addEventListener(
  'click',
  closeDocumentationMetaManager
)

closeDocumentationMetaFooterBtn?.addEventListener(
  'click',
  closeDocumentationMetaManager
)

documentationMetaBackdrop?.addEventListener(
  'click',
  (event) => {
    if (event.target === documentationMetaBackdrop) {
      closeDocumentationMetaManager()
    }
  }
)

resetDocumentationReferenceBtn?.addEventListener(
  'click',
  () => {
    if (documentationMetaMutationBusy) return
    resetDocumentationReferenceEditor()
  }
)

saveDocumentationReferenceBtn?.addEventListener(
  'click',
  () => {
    saveDocumentationReference().catch((error) => {
      console.error(
        'Reference save failed:',
        error
      )

      documentationReferenceStatus.textContent =
        error?.message ||
        'Sursa nu a putut fi salvată.'

      alert(
        error?.message ||
          'Sursa nu a putut fi salvată.'
      )
    })
  }
)

saveDocumentationReviewBtn?.addEventListener(
  'click',
  () => {
    saveDocumentationReview().catch((error) => {
      console.error(
        'Review save failed:',
        error
      )

      alert(
        error?.message ||
          'Review state nu a putut fi salvat.'
      )
    })
  }
)

clearDocumentationReviewBtn?.addEventListener(
  'click',
  () => {
    clearDocumentationReview().catch((error) => {
      console.error(
        'Review clear failed:',
        error
      )

      alert(
        error?.message ||
          'Review state nu a putut fi șters.'
      )
    })
  }
)

quickFinderBtn?.addEventListener('click', openDocumentationFinder)
savedDocsBtn?.addEventListener('click', openDocumentationLibrary)

closeDocumentationFinderBtn?.addEventListener(
  'click',
  closeDocumentationFinder
)

documentationFinderBackdrop?.addEventListener('click', (event) => {
  if (event.target === documentationFinderBackdrop) {
    closeDocumentationFinder()
  }
})

documentationFinderInput?.addEventListener('input', () => {
  finderSelectedIndex = 0
  renderDocumentationFinder()
})

documentationFinderScope?.addEventListener('change', () => {
  finderSelectedIndex = 0
  renderDocumentationFinder()
})

documentationFinderInput?.addEventListener('keydown', (event) => {
  if (event.key === 'ArrowDown') {
    event.preventDefault()

    if (finderResultsCache.length > 0) {
      finderSelectedIndex =
        (finderSelectedIndex + 1) %
        finderResultsCache.length

      renderDocumentationFinder()
    }

    return
  }

  if (event.key === 'ArrowUp') {
    event.preventDefault()

    if (finderResultsCache.length > 0) {
      finderSelectedIndex =
        (finderSelectedIndex - 1 + finderResultsCache.length) %
        finderResultsCache.length

      renderDocumentationFinder()
    }

    return
  }

  if (event.key === 'Enter') {
    event.preventDefault()

    openFinderResult().catch((error) => {
      console.error('Quick Find open failed:', error)
      alert(error?.message || 'Documentul nu a putut fi deschis.')
    })
  }
})

documentationFinderResults?.addEventListener('click', (event) => {
  const button = event.target.closest?.('[data-finder-result]')
  if (!button) return

  openFinderResult(Number(button.dataset.finderResult)).catch((error) => {
    console.error('Quick Find open failed:', error)
    alert(error?.message || 'Documentul nu a putut fi deschis.')
  })
})

closeDocumentationLibraryBtn?.addEventListener(
  'click',
  closeDocumentationLibrary
)

closeDocumentationLibraryFooterBtn?.addEventListener(
  'click',
  closeDocumentationLibrary
)

documentationLibraryBackdrop?.addEventListener('click', (event) => {
  if (event.target === documentationLibraryBackdrop) {
    closeDocumentationLibrary()
  }
})

clearRecentDocsBtn?.addEventListener('click', () => {
  localStorage.removeItem(CACHE_KEYS.recentDocs)
  renderDocumentationLibrary()
})

documentationLibraryBody?.addEventListener('click', (event) => {
  const bookmarkOpen = event.target.closest?.(
    '[data-library-bookmark-open]'
  )

  if (bookmarkOpen) {
    const row =
      [...bookmarkRows].sort(
        (a, b) =>
          new Date(b.createdAt).getTime() -
          new Date(a.createdAt).getTime()
      )[Number(bookmarkOpen.dataset.libraryBookmarkOpen)]

    if (!row) return

    closeDocumentationLibrary()

    openDocumentationReference({
      nodeScope: row.nodeScope,
      teamId: row.teamId,
      nodeId:
        row.nodeScope === 'team'
          ? row.teamNodeId
          : row.publicNodeId
    }).catch((error) => {
      console.error('Saved document open failed:', error)
      alert(error?.message || 'Documentul nu a putut fi deschis.')
    })

    return
  }

  const bookmarkRemove = event.target.closest?.(
    '[data-library-bookmark-remove]'
  )

  if (bookmarkRemove) {
    const row =
      [...bookmarkRows].sort(
        (a, b) =>
          new Date(b.createdAt).getTime() -
          new Date(a.createdAt).getTime()
      )[Number(bookmarkRemove.dataset.libraryBookmarkRemove)]

    removeBookmarkRow(row).catch((error) => {
      console.error('Bookmark remove failed:', error)
      alert(error?.message || 'Bookmark-ul nu a putut fi șters.')
    })

    return
  }

  const recentOpen = event.target.closest?.(
    '[data-library-recent-open]'
  )

  if (recentOpen) {
    const row = recentDocs()[
      Number(recentOpen.dataset.libraryRecentOpen)
    ]

    if (!row) return

    closeDocumentationLibrary()

    openDocumentationReference({
      nodeScope: row.nodeScope,
      teamId: row.teamId,
      nodeId: row.nodeId
    }).catch((error) => {
      console.error('Recent document open failed:', error)
      alert(error?.message || 'Documentul nu a putut fi deschis.')
    })
  }
})

teamImportTeamInput?.addEventListener('change', () => {
  const sourceNode = publicNodes.find(
    (node) => Number(node.id) === Number(teamImportSourceNodeId)
  )
  const allowed = editableDepartmentIdsForTeam(
    Number(teamImportTeamInput.value)
  )
  const preferredDepartment = (sourceNode?.departmentIds || []).find((id) =>
    allowed.includes(Number(id))
  )
  renderTeamImportDepartmentOptions(preferredDepartment)
})

closeTeamImportBtn?.addEventListener('click', closeTeamImport)
cancelTeamImportBtn?.addEventListener('click', closeTeamImport)

teamImportBackdrop?.addEventListener('click', (event) => {
  if (event.target === teamImportBackdrop) closeTeamImport()
})

confirmTeamImportBtn?.addEventListener('click', () => {
  importPublicNodeToTeam().catch((error) => {
    console.error('Public -> Team Atlas import failed:', error)
    alert(error?.message || 'Importul în Team Atlas a eșuat.')
  })
})

teamAtlasIndexBtn?.addEventListener('click', () => {
  selectPublicSection(
    activePublicSection === 'team-index'
      ? 'team'
      : 'team-index'
  )
})

teamAtlasRoadmapsBtn?.addEventListener('click', () => {
  selectPublicSection(
    activePublicSection === 'team-roadmaps'
      ? 'team'
      : 'team-roadmaps'
  )
})

teamAtlasTaxonomyBtn?.addEventListener('click', () => {
  openTaxonomyManager('category')
})

teamAtlasSettingsBtn?.addEventListener('click', () => {
  openTeamSetup().catch((error) => {
    console.error('Open Team Setup failed:', error)
  })
})

teamAtlasMembersBtn?.addEventListener('click', () => {
  openTeamMembersManager().catch((error) => {
    console.error('Open Members & Invites failed:', error)
  })
})

teamInvitesList?.addEventListener('click', (event) => {
  const acceptButton = event.target.closest?.('[data-accept-team-invite]')
  if (acceptButton) {
    respondToTeamInvite(acceptButton.dataset.acceptTeamInvite, 'accept')
    return
  }

  const declineButton = event.target.closest?.('[data-decline-team-invite]')
  if (declineButton) {
    respondToTeamInvite(declineButton.dataset.declineTeamInvite, 'decline')
  }
})

closeTeamMembersBtn?.addEventListener('click', closeTeamMembersManager)
closeTeamMembersFooterBtn?.addEventListener('click', closeTeamMembersManager)

teamMembersBackdrop?.addEventListener('click', (event) => {
  if (event.target === teamMembersBackdrop) {
    closeTeamMembersManager()
  }
})

resetTeamMemberEditorBtn?.addEventListener('click', () => {
  if (teamMembersMutationBusy) return
  resetTeamMemberEditor()
})

saveTeamMemberBtn?.addEventListener('click', () => {
  saveTeamMemberOrInvite()
})

closeTeamOnboardingBtn?.addEventListener('click', closeTeamOnboarding)
closeTeamOnboardingFooterBtn?.addEventListener('click', closeTeamOnboarding)

teamOnboardingBackdrop?.addEventListener('click', (event) => {
  if (event.target === teamOnboardingBackdrop) {
    closeTeamOnboarding()
  }
})

completeTeamOnboardingBtn?.addEventListener('click', () => {
  completeTeamOnboarding()
})

closeTeamSetupBtn?.addEventListener('click', closeTeamSetup)
closeTeamSetupFooterBtn?.addEventListener('click', closeTeamSetup)

teamSetupBackdrop?.addEventListener('click', (event) => {
  if (event.target === teamSetupBackdrop) {
    closeTeamSetup()
  }
})

newTeamSetupBtn?.addEventListener('click', () => {
  if (teamSetupMutationBusy) return
  resetTeamSetupForm({ createMode: true })
})

saveTeamSetupBtn?.addEventListener('click', () => {
  saveTeamSetup()
})

roadmapManagerBtn?.addEventListener('click', () => {
  openRoadmapManager('public').catch((error) => {
    console.error('Open roadmap manager failed:', error)
  })
})

closeRoadmapManagerBtn?.addEventListener('click', closeRoadmapManager)
closeRoadmapManagerFooterBtn?.addEventListener('click', closeRoadmapManager)

roadmapManagerBackdrop?.addEventListener('click', (event) => {
  if (event.target === roadmapManagerBackdrop) {
    closeRoadmapManager()
  }
})

newRoadmapBtn?.addEventListener('click', () => {
  if (roadmapManagerMutationBusy) return
  resetRoadmapEditor()
  renderRoadmapManager()
})

roadmapDepartmentInput?.addEventListener('change', () => {
  if (
    roadmapManagerMutationBusy ||
    roadmapManagerScope !== 'team'
  ) {
    return
  }

  populateRoadmapEditorSelects()
})

resetRoadmapEditorBtn?.addEventListener('click', () => {
  if (roadmapManagerMutationBusy) return
  resetRoadmapEditor()
})

addRoadmapStepBtn?.addEventListener('click', () => {
  if (roadmapManagerMutationBusy) return
  addRoadmapDraftStep()
})

saveRoadmapBtn?.addEventListener('click', () => {
  saveRoadmap()
})

deleteRoadmapBtn?.addEventListener('click', () => {
  deleteRoadmap()
})

publicContentManagerBtn?.addEventListener('click', () => {
  openPublicContentManager().catch((error) => {
    console.error('Open public content manager failed:', error)
  })
})

closePublicContentManagerBtn?.addEventListener('click', closePublicContentManager)
closePublicContentManagerFooterBtn?.addEventListener('click', closePublicContentManager)

publicContentManagerBackdrop?.addEventListener('click', (event) => {
  if (event.target === publicContentManagerBackdrop) {
    closePublicContentManager()
  }
})

document.querySelectorAll('[data-public-content-kind]').forEach((button) => {
  button.addEventListener('click', () => {
    if (publicContentMutationBusy) return

    publicContentManagerKind = button.dataset.publicContentKind
    resetPublicContentEditor()
    renderPublicContentManager()
  })
})

newPublicContentBtn?.addEventListener('click', () => {
  if (publicContentMutationBusy) return
  resetPublicContentEditor()
  renderPublicContentManager()
})

resetPublicContentEditorBtn?.addEventListener('click', () => {
  if (publicContentMutationBusy) return
  resetPublicContentEditor()
})

savePublicContentBtn?.addEventListener('click', () => {
  savePublicContentItem()
})

deletePublicContentBtn?.addEventListener('click', () => {
  deletePublicContentItem()
})

publicHubPanel?.addEventListener('click', (event) => {
  const publicIndexNodeTrigger = event.target.closest?.(
    '[data-public-index-node]'
  )

  if (publicIndexNodeTrigger) {
    openNodeFromPublicContent(
      Number(publicIndexNodeTrigger.dataset.publicIndexNode)
    )
    return
  }

  const publicIndexSaveTrigger = event.target.closest?.(
    '[data-public-index-save]'
  )

  if (publicIndexSaveTrigger) {
    const node = publicNodes.find(
      (candidate) =>
        Number(candidate.id) ===
        Number(publicIndexSaveTrigger.dataset.publicIndexSave)
    )

    if (node) {
      toggleNodeBookmark(node).catch((error) => {
        console.error('Index bookmark update failed:', error)
        alert(
          error?.message ||
            'Bookmark-ul nu a putut fi actualizat.'
        )
      })
    }

    return
  }

  const teamIndexNodeTrigger = event.target.closest?.(
    '[data-team-index-node]'
  )

  if (teamIndexNodeTrigger) {
    openTeamIndexNode(
      Number(teamIndexNodeTrigger.dataset.teamIndexNode)
    )
    return
  }

  const teamIndexCopyTrigger = event.target.closest?.(
    '[data-team-index-copy]'
  )

  if (teamIndexCopyTrigger) {
    const node = teamNodes.find(
      (candidate) =>
        Number(candidate.id) ===
        Number(teamIndexCopyTrigger.dataset.teamIndexCopy)
    )

    if (node) {
      copyTeamNodeLink(node, teamIndexCopyTrigger)
    }

    return
  }

  const teamMembersTrigger = event.target.closest?.('[data-open-team-members]')
  if (teamMembersTrigger) {
    openTeamMembersManager().catch((error) => {
      console.error('Open Members & Invites failed:', error)
    })
    return
  }

  const onboardingTrigger = event.target.closest?.('[data-team-onboarding]')
  if (onboardingTrigger) {
    openTeamOnboarding()
    return
  }

  const teamSetupTrigger = event.target.closest?.('[data-open-team-setup]')
  if (teamSetupTrigger) {
    openTeamSetup().catch((error) => {
      console.error('Open Team Setup failed:', error)
    })
    return
  }

  const teamSwitch = event.target.closest?.('[data-team-select]')
  if (teamSwitch) {
    selectActiveTeam(Number(teamSwitch.dataset.teamSelect))
    return
  }

  const teamRoadmapManagerTrigger =
    event.target.closest?.('[data-open-team-roadmap-manager]')

  if (teamRoadmapManagerTrigger) {
    openRoadmapManager('team').catch((error) => {
      console.error('Open Team Roadmap manager failed:', error)
    })
    return
  }

  const teamProgressButton = event.target.closest?.(
    '[data-team-roadmap-progress-roadmap]'
  )

  if (teamProgressButton) {
    toggleTeamRoadmapProgress(
      Number(teamProgressButton.dataset.teamRoadmapProgressRoadmap),
      Number(teamProgressButton.dataset.teamRoadmapProgressNode)
    )
    return
  }

  const teamRoadmapNodeButton = event.target.closest?.(
    '[data-team-roadmap-node-id]'
  )

  if (teamRoadmapNodeButton) {
    openTeamRoadmapNode(
      Number(teamRoadmapNodeButton.dataset.teamRoadmapNodeId)
    )
    return
  }

  const roadmapManagerTrigger = event.target.closest?.('[data-open-roadmap-manager]')
  if (roadmapManagerTrigger) {
    openRoadmapManager('public').catch((error) => {
      console.error('Open roadmap manager failed:', error)
    })
    return
  }

  const progressButton = event.target.closest?.('[data-roadmap-progress-roadmap]')
  if (progressButton) {
    toggleRoadmapProgress(
      Number(progressButton.dataset.roadmapProgressRoadmap),
      Number(progressButton.dataset.roadmapProgressNode)
    )
    return
  }

  const roadmapNodeButton = event.target.closest?.('[data-roadmap-node-id]')
  if (roadmapNodeButton) {
    openNodeFromPublicContent(Number(roadmapNodeButton.dataset.roadmapNodeId))
    return
  }

  const roadmapLoginButton = event.target.closest?.('[data-roadmap-login]')
  if (roadmapLoginButton) {
    setAccountPanel(true)
    return
  }

  const managerButton = event.target.closest?.('[data-open-public-content-manager]')
  if (managerButton) {
    openPublicContentManager(managerButton.dataset.openPublicContentManager).catch((error) => {
      console.error('Open public content manager failed:', error)
    })
    return
  }

  const nodeButton = event.target.closest?.('[data-public-node-id]')
  if (nodeButton) {
    openNodeFromPublicContent(Number(nodeButton.dataset.publicNodeId))
  }
})

publicHubPanel?.addEventListener('change', (event) => {
  const groupSelect = event.target.closest?.(
    '[data-public-index-group]'
  )

  if (groupSelect) {
    publicIndexGroup =
      groupSelect.value === 'flat'
        ? 'flat'
        : 'category'

    localStorage.setItem(
      CACHE_KEYS.publicIndexGroup,
      publicIndexGroup
    )

    renderPublicShell()
    return
  }

  const sortSelect = event.target.closest?.(
    '[data-public-index-sort]'
  )

  if (sortSelect) {
    publicIndexSort =
      sortSelect.value === 'updated'
        ? 'updated'
        : 'az'

    localStorage.setItem(
      CACHE_KEYS.publicIndexSort,
      publicIndexSort
    )

    renderPublicShell()
  }
})

publicSectionTabs?.querySelectorAll('[data-public-section]').forEach((button) => {
  button.addEventListener('click', () => {
    selectPublicSection(button.dataset.publicSection)
  })
})

accountBtn?.addEventListener('click', (event) => {
  event.stopPropagation()
  setAccountPanel(accountPanel?.hidden !== false)
})

document.addEventListener('click', (event) => {
  if (!accountPanel || accountPanel.hidden) return

  const target = event.target
  if (!(target instanceof Node)) return
  if (accountPanel.contains(target) || accountBtn?.contains(target)) return

  setAccountPanel(false)
})

loginBtn.addEventListener('click', () => {
  sendMagicLink().catch((error) => alert(error.message || 'Eroare la login.'))
})

verifyOtpBtn?.addEventListener('click', () => {
  verifyEmailOtp().catch((error) =>
    alert(error.message || 'Eroare la verificarea codului.')
  )
})

authOtpInput?.addEventListener('keydown', (event) => {
  if (event.key !== 'Enter') return

  verifyEmailOtp().catch((error) =>
    alert(error.message || 'Eroare la verificarea codului.')
  )
})

logoutBtn.addEventListener('click', () => {
  signOutUser().catch((error) => alert(error.message || 'Eroare la logout.'))
})

searchInput.addEventListener('input', (event) => {
  searchQuery = event.target.value
  normalizeSelectionAfterFilters()
  renderAll()
})

categoryFilter.addEventListener('change', (event) => {
  categoryFilterId = event.target.value ? Number(event.target.value) : null
  normalizeSelectionAfterFilters()
  renderAll()
  requestAnimationFrame(fitView)
})

difficultyFilter.addEventListener('change', (event) => {
  difficultyFilterId = event.target.value ? Number(event.target.value) : null
  normalizeSelectionAfterFilters()
  renderAll()
  requestAnimationFrame(fitView)
})

clearFiltersBtn.addEventListener('click', () => {
  searchQuery = ''
  searchInput.value = ''
  categoryFilterId = null
  difficultyFilterId = null
  tagFilterIds = new Set()
  normalizeSelectionAfterFilters()
  renderAll()
  requestAnimationFrame(fitView)
})

collapseBtn.addEventListener('click', (event) => {
  event.stopPropagation()
  togglePanel()
})

function togglePanel(force) {
  const collapsed = typeof force === 'boolean' ? force : !toolPanel.classList.contains('collapsed')

  toolPanel.classList.toggle('collapsed', collapsed)
  collapseBtn.textContent = collapsed ? '+' : '–'
  collapseBtn.setAttribute(
    'aria-label',
    collapsed ? 'Arată Quick Panel' : 'Ascunde Quick Panel'
  )

  if (collapsed && accountPanel) {
    accountPanel.hidden = true
    accountBtn?.classList.remove('active')
    accountBtn?.setAttribute('aria-expanded', 'false')
  }

  localStorage.setItem(CACHE_KEYS.panel, collapsed ? '1' : '0')
}

closeModalBtn.addEventListener('click', closeModal)
cancelBtn.addEventListener('click', closeModal)
saveBtn.addEventListener('click', () => {
  saveModal().catch((error) => alert(error.message || 'Eroare la salvare.'))
})
modalBackdrop.addEventListener('click', (event) => {
  if (event.target === modalBackdrop) closeModal()
})

function dismissIntro() {
  introScreen.classList.add('hidden')
  localStorage.setItem(CACHE_KEYS.intro, '1')
  introDismissed = true
}

introScreen.addEventListener('click', dismissIntro)
enterBtn.addEventListener('click', (event) => {
  event.stopPropagation()
  dismissIntro()
})
retryLoadBtn.addEventListener('click', () => {
  loadAtlasWithUi().catch((error) => {
    console.error('Retry load failed:', error)
  })
})

window.addEventListener('offline', () => {
  renderNetworkStatus(false)
})

window.addEventListener('online', () => {
  renderNetworkStatus(true)
})

renderNetworkStatus(navigator.onLine, { announceRecovery: false })

// Keyboard shortcuts and global lifecycle events
async function runHistoryActionWithUnsavedGuard(action) {
  if (layoutEditMode) {
    if (action === undo) {
      undoLayoutChange()
      return
    }

    if (action === redo) {
      redoLayoutChange()
      return
    }
  }

  if (!(await confirmUnsavedPositionBeforeLeaving())) return
  await action()
}

async function refreshHistoryButtons() {
  if (layoutEditMode && editorMode && canEditCurrentAtlas()) {
    undoBtn.disabled = layoutUndoStack.length === 0
    redoBtn.disabled = layoutRedoStack.length === 0
    return
  }

  if (!canEdit || !editorMode || isTeamAtlasMode()) {
    undoBtn.disabled = true
    redoBtn.disabled = true
    return
  }

  const { data, error } = await supabase.rpc('atlas_history_status', {
    p_project_id: PROJECT_ID
  })

  if (error) {
    console.error('History status failed:', error)
    undoBtn.disabled = false
    redoBtn.disabled = false
    return
  }

  undoBtn.disabled = !canEdit || Number(data?.undo_count || 0) === 0
  redoBtn.disabled = !canEdit || Number(data?.redo_count || 0) === 0
}

window.addEventListener('keyup', (event) => {
  const key = event.key.toLowerCase()

  if (!['w', 'a', 's', 'd'].includes(key)) return
  if (!keyboardMoveState.keys.has(key)) return

  event.preventDefault()
  keyboardMoveState.keys.delete(key)

  if (!keyboardMoveState.keys.size) {
    finishKeyboardNodeMovement()
  }
})

window.addEventListener('blur', () => {
  if (keyboardMoveState.nodeId != null) {
    finishKeyboardNodeMovement()
  }
})

document.addEventListener('visibilitychange', () => {
  if (document.hidden && keyboardMoveState.nodeId != null) {
    finishKeyboardNodeMovement()
  }
})

window.addEventListener('keydown', (event) => {
  const tag = document.activeElement?.tagName
  const isTyping =
    tag === 'INPUT' || tag === 'TEXTAREA' || document.activeElement?.isContentEditable

  if (
    !isTyping &&
    !isAnyModalOpen() &&
    (event.ctrlKey || event.metaKey) &&
    event.key.toLowerCase() === 'k'
  ) {
    event.preventDefault()
    openDocumentationFinder()
    return
  }

  if (
    !isTyping &&
    !isAnyModalOpen() &&
    (event.ctrlKey || event.metaKey) &&
    event.key.toLowerCase() === 'z' &&
    !event.shiftKey
  ) {
    event.preventDefault()
    runHistoryActionWithUnsavedGuard(undo).catch((error) => alert(error.message || 'Eroare la undo.'))
    return
  }

  if (
    !isTyping &&
    !isAnyModalOpen() &&
    (((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'y') ||
      ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key.toLowerCase() === 'z'))
  ) {
    event.preventDefault()
    runHistoryActionWithUnsavedGuard(redo).catch((error) => alert(error.message || 'Eroare la redo.'))
    return
  }

  if (!isTyping && canEditCurrentAtlas() && editorMode && !isAnyModalOpen() && event.key === 'Delete') {
    event.preventDefault()
    if (selectedEdge) {
      deleteSelectedEdge().catch((error) => {
        console.error(error)
        alert(error.message || 'Eroare la ștergerea muchiei.')
      })
    } else {
      deleteSelected().catch((error) => {
        console.error(error)
        alert(error.message || 'Eroare la ștergere.')
      })
    }
    return
  }

  if (
    !isTyping &&
    canEditCurrentAtlas() &&
    editorMode &&
    layoutEditMode &&
    !isAnyModalOpen() &&
    event.altKey &&
    event.key === '0'
  ) {
    event.preventDefault()
    resetSelectedNodeSize().catch((error) => {
      alert(error.message || 'Eroare la resetarea dimensiunii.')
    })
    return
  }



  if (!isTyping && canEditCurrentAtlas() && editorMode && layoutEditMode && !isAnyModalOpen()) {
    const step = event.shiftKey ? 36 : 12
    let dx = 0
    let dy = 0

    if (event.key === 'ArrowLeft') dx = -step
    else if (event.key === 'ArrowRight') dx = step
    else if (event.key === 'ArrowUp') dy = -step
    else if (event.key === 'ArrowDown') dy = step

    if (dx !== 0 || dy !== 0) {
      event.preventDefault()

      if (event.altKey) {
        resizeSelectedNode(dx, dy).catch((error) => {
          alert(error.message || 'Eroare la redimensionare.')
        })
      } else {
        nudgeSelectedNode(dx, dy).catch((error) => {
          alert(error.message || 'Eroare la mutare.')
        })
      }

      return
    }
  }

  if (event.key === 'Escape') {
    if (!introDismissed) dismissIntro()
    else if (sourceCompareBackdrop?.classList.contains('open')) {
      closeSourceCompare()
    } else if (revisionHistoryBackdrop?.classList.contains('open')) {
      closeRevisionHistory()
    } else if (documentationHealthBackdrop?.classList.contains('open')) {
      closeDocumentationHealth()
    } else if (documentationMetaBackdrop?.classList.contains('open')) {
      closeDocumentationMetaManager()
    } else if (documentationFinderBackdrop?.classList.contains('open')) {
      closeDocumentationFinder()
    } else if (documentationLibraryBackdrop?.classList.contains('open')) {
      closeDocumentationLibrary()
    } else if (teamImportBackdrop?.classList.contains('open')) {
      closeTeamImport()
    } else if (teamOnboardingBackdrop?.classList.contains('open')) {
      closeTeamOnboarding()
    } else if (teamMembersBackdrop?.classList.contains('open')) {
      closeTeamMembersManager()
    } else if (teamSetupBackdrop?.classList.contains('open')) {
      closeTeamSetup()
    } else if (roadmapManagerBackdrop?.classList.contains('open')) {
      closeRoadmapManager()
    } else if (publicContentManagerBackdrop?.classList.contains('open')) {
      closePublicContentManager()
    } else if (codeManagerBackdrop.classList.contains('open')) {
      closeCodeManager()
    } else if (fileManagerBackdrop.classList.contains('open')) {
      closeFileManager()
    } else if (mediaManagerBackdrop.classList.contains('open')) {
      closeMediaManager()
    } else if (taxonomyReplaceBackdrop.classList.contains('open')) {
      closeTaxonomyReplaceDialog()
    } else if (taxonomyItemBackdrop.classList.contains('open')) {
      closeTaxonomyItemEditor()
    } else if (taxonomyManagerBackdrop.classList.contains('open')) {
      closeTaxonomyManager()
    } else if (modalBackdrop.classList.contains('open')) {
      closeModal()
    } else if (detailOpen) {
      closeNodeDetail({ pushHistory: true })
    } else if (relationMode.active) {
      deactivateRelationMode()
    }

    return
  }

  if (!introDismissed) dismissIntro()
})

window.addEventListener('popstate', async () => {
  if (isAtlasLoading) return

  const routedNode = await applyRouteFromLocation({ canonicalize: true })
  renderAll()

  if (routedNode) {
    requestAnimationFrame(() => centerOnNode(routedNode))
  }
})

window.addEventListener('beforeunload', (event) => {
  if (!hasUnsavedLayoutChanges() && !hasUnsavedNodePosition()) return
  event.preventDefault()
  event.returnValue = ''
})

const savedPanelState = localStorage.getItem(CACHE_KEYS.panel)

if (savedPanelState === '1' || (savedPanelState == null && isTouchLayout())) {
  togglePanel(true)
}

if (introDismissed) introScreen.classList.add('hidden')

updateAtlasViewportHeight()

document.addEventListener('focusin', (event) => {
  keepFocusedEditorFieldVisible(event.target)
})

window.addEventListener('resize', () => {
  updateAtlasViewportHeight()
  renderAll()
  applyView()
})

if (window.visualViewport) {
  window.visualViewport.addEventListener('resize', () => {
    updateAtlasViewportHeight()

    const activeElement = document.activeElement
    if (activeElement instanceof HTMLElement) {
      keepFocusedEditorFieldVisible(activeElement)
    }
  })

  window.visualViewport.addEventListener('scroll', updateAtlasViewportHeight)
}

// Session synchronization
supabase.auth.onAuthStateChange((event, session) => {
  const previousUserId = currentUser?.id || null

  const nextUser = session?.user || null

  const sameUser = Boolean(previousUserId && nextUser?.id === previousUserId)

  currentUser = nextUser

  if (sameUser) {
    updateAuthUI()
    Promise.all([
      loadRoadmapProgress(),
      loadTeamContext(),
      loadBookmarks()
    ])
      .then(() => renderAll())
      .catch((error) => {
        console.error('Account context refresh failed:', error)
      })
    return
  }

  if (!currentUser) {
    canEdit = false

    if (editorMode) {
      editorMode = false
      localStorage.setItem(CACHE_KEYS.editorMode, '0')
    }

    roadmapProgress = new Set()
    bookmarkRows = readLocalBookmarkRows()
    rebuildBookmarkKeySet()
    teamMemberships = []
    teamRecords = []
    teamMembers = []
    teamMemberDepartments = []
    teamEnabledDepartments = []
    teamInvites = []
    teamManagerInvites = []
    teamNodes = []
    activeTeamId = null
    teamImportSourceNodeId = null

    if (teamImportBackdrop?.classList.contains('open')) {
      teamImportBackdrop.classList.remove('open')
    }

    if (
      activePublicSection === 'team' ||
      activePublicSection === 'team-index' ||
      activePublicSection === 'team-roadmaps'
    ) {
      activePublicSection = 'explore'
      localStorage.setItem(CACHE_KEYS.publicSection, activePublicSection)
    }

    if (teamNodeRouteFromLocation()) {
      rememberPendingTeamRoute(window.location.hash)
      setAccountPanel(true)
    }

    updateAuthUI()
    renderAll()
    return
  }

  canEdit = false
  updateAuthUI()

  setTimeout(async () => {
    try {
      await refreshEditorAccess()
      await loadRoadmapProgress()
      await loadTeamContext()
      await loadBookmarks()

      const routedNode = await applyRouteFromLocation({
        canonicalize: true
      })

      updateAuthUI()
      renderAll()

      if (routedNode) {
        requestAnimationFrame(() => centerOnNode(routedNode))
      }

      await refreshHistoryButtons()

      if (nodes.length === 0 && !isAtlasLoading) {
        showEmptyAtlasState()
      }
    } catch (error) {
      console.error(`Supabase auth refresh failed (${event}):`, error)

      canEdit = false
      updateAuthUI()
    }
  }, 0)
})

// Development diagnostics exposed in the browser console
window.atlasDebug = {
  getState: () => ({
    canEdit,
    email: currentUser?.email ?? null,
    selectedId,
    selectedEdge,
    selectedNode: selectedNode()?.title ?? null,
    detailOpen,
    editorMode,
    relationMode,
    activeTeamId,
    team: currentTeamRecord()?.name ?? null,
    teamRole: currentTeamMembership()?.role ?? null
  }),
  deleteSelected,
  deleteSelectedEdge,
  openSelectedEdgeEdit,
  openMediaManager,
  openCodeManager,
  openPublicContentManager,
  openRoadmapManager,
  openTeamSetup,
  openTeamMembersManager,
  openTeamOnboarding,
  openTeamIndex: () => selectPublicSection('team-index'),
  openQuickFind: openDocumentationFinder,
  openSavedDocs: openDocumentationLibrary,
  openDocumentationMeta: () =>
    openDocumentationMetaManager(selectedId),
  openDocumentationHealth,
  openRevisionHistory: () =>
    openRevisionHistory(selectedId),
  openSourceCompare: () =>
    openSourceCompare(selectedId),
  openPublicIndex: () =>
    selectPublicSection('index'),
  refreshSession,
  deleteNodeRemote,
  deleteEdgeRemote,
  updateEdgeRemote
}

// Application bootstrap
initRichTextEditor()
setNodeContentEditorVisible(true)
ensureNodePositions()
applyView()
renderAll()

showAtlasLoading()

await refreshSession()
await loadAtlasWithUi()
restoreCodeManagerWindow()

const { data: bootSession } = await supabase.auth.getSession()
console.log('BOOT SESSION =', bootSession?.session)

const { data: bootUser, error: bootUserError } = await supabase.auth.getUser()
console.log('BOOT USER =', bootUser?.user, 'ERR =', bootUserError)
