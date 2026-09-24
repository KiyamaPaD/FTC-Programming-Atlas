import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.112.3'

console.log('ATLAS SCRIPT LOADED v75 · NOTIFICATION CENTER')

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
  teamWorkspaceTab: 'ftc_atlas_team_workspace_tab_v1'
}

const initialTeamInviteToken = new URLSearchParams(window.location.search).get('teamInvite')
if (initialTeamInviteToken) {
  localStorage.setItem(CACHE_KEYS.pendingTeamInvite, initialTeamInviteToken)
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

// Accelerated keyboard movement for the selected node.
// Movement stays local while keys are held and is persisted once on release.
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
let selectedId = nodes[0]?.id ?? null
let selectedEdge = null
let selectedEdgePointIndex = null
let detailOpen = false
let editingId = null
let searchQuery = ''
let categories = []
let difficulties = []
let taxonomyTags = []
let departments = []
let activeDepartmentId = null
let announcements = []
let resources = []
let roadmaps = []
let roadmapProgress = new Set()

let teamMemberships = []
let teamRecords = []
let teamMembers = []
let teamMemberDepartments = []
let teamEnabledDepartments = []
let teamInvites = []
let teamManagerInvites = []
let teamPrivateContent = []
let notifications = []
let notificationFilter = 'all'
let notificationMutationBusy = false
let activeTeamId = null

const TEAM_WORKSPACE_TABS = new Set([
  'overview',
  'announcements',
  'resources',
  'notes'
])

let activeTeamWorkspaceTab = TEAM_WORKSPACE_TABS.has(
  localStorage.getItem(CACHE_KEYS.teamWorkspaceTab)
)
  ? localStorage.getItem(CACHE_KEYS.teamWorkspaceTab)
  : 'overview'

const PUBLIC_SECTIONS = new Set([
  'explore',
  'roadmaps',
  'resources',
  'announcements',
  'team'
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
let roadmapProgressMutationKeys = new Set()
let teamSetupMutationBusy = false
let teamSetupCreateMode = false
let teamMembersMutationBusy = false
let teamMemberEditingId = null
let teamOnboardingMutationBusy = false
let teamContentManagerKind = 'announcement'
let teamContentEditingId = null
let teamContentMutationBusy = false
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
const teamSpaceEntry = document.getElementById('teamSpaceEntry')
const teamSpaceEntryName = document.getElementById('teamSpaceEntryName')
const teamSpaceEntryRole = document.getElementById('teamSpaceEntryRole')
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
const notificationBtn = document.getElementById('notificationBtn')
const notificationBadge = document.getElementById('notificationBadge')
const notificationPanel = document.getElementById('notificationPanel')
const notificationPanelMeta = document.getElementById('notificationPanelMeta')
const notificationMarkAllBtn = document.getElementById('notificationMarkAllBtn')
const notificationFilters = document.getElementById('notificationFilters')
const notificationList = document.getElementById('notificationList')

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

const teamContentManagerBackdrop = document.getElementById('teamContentManagerBackdrop')
const closeTeamContentManagerBtn = document.getElementById('closeTeamContentManagerBtn')
const closeTeamContentManagerFooterBtn = document.getElementById('closeTeamContentManagerFooterBtn')
const teamContentManagerSummary = document.getElementById('teamContentManagerSummary')
const teamContentManagerList = document.getElementById('teamContentManagerList')
const newTeamContentBtn = document.getElementById('newTeamContentBtn')
const teamContentEditorTitle = document.getElementById('teamContentEditorTitle')
const teamContentEditorHint = document.getElementById('teamContentEditorHint')
const teamContentTitleInput = document.getElementById('teamContentTitleInput')
const teamContentDepartmentInput = document.getElementById('teamContentDepartmentInput')
const teamContentSummaryInput = document.getElementById('teamContentSummaryInput')
const teamContentBodyInput = document.getElementById('teamContentBodyInput')
const teamContentUrlField = document.getElementById('teamContentUrlField')
const teamContentUrlInput = document.getElementById('teamContentUrlInput')
const teamContentPinnedInput = document.getElementById('teamContentPinnedInput')
const teamContentActiveInput = document.getElementById('teamContentActiveInput')
const teamContentNotifyLabel = document.getElementById('teamContentNotifyLabel')
const teamContentNotifyInput = document.getElementById('teamContentNotifyInput')
const teamContentEditorStatus = document.getElementById('teamContentEditorStatus')
const deleteTeamContentBtn = document.getElementById('deleteTeamContentBtn')
const resetTeamContentEditorBtn = document.getElementById('resetTeamContentEditorBtn')
const saveTeamContentBtn = document.getElementById('saveTeamContentBtn')

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
  return `/node/${Number(node.id)}/${slugifyNodeTitle(node.title)}`
}

function nodeCanonicalUrl(node) {
  return `${SITE_ORIGIN}${nodeRoutePath(node)}`
}

function routeNodeIdFromLocation() {
  const match = window.location.pathname.match(/^\/node\/(\d+)(?:\/[^/?#]*)?\/?$/)
  return match ? Number(match[1]) : null
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
  if (window.location.pathname === path) {
    replaceRouteState(path, state)
    return
  }

  window.history.pushState(state, '', path)
}

function setNodeRoute(node, { push = true } = {}) {
  if (!node) return
  const path = nodeRoutePath(node)
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

function applyRouteFromLocation({ canonicalize = true } = {}) {
  const nodeId = routeNodeIdFromLocation()

  if (nodeId == null) {
    detailOpen = false
    updateDocumentSeo(null)
    return null
  }

  const node = findNode(nodeId)

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
    if (canEdit && editorMode) {
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

                  <h2 class="public-content-card-title">${escapeHtmlText(item.title)}</h2>
                </div>

                <time class="public-content-card-date">${escapeHtmlText(
                  formatPublicDate(item.publishedAt || item.createdAt)
                )}</time>
              </div>

              ${
                item.summary
                  ? `<p class="public-content-card-summary">${escapeHtml(item.summary)}</p>`
                  : ''
              }

              ${
                item.content
                  ? `<p class="public-content-card-body">${escapeHtml(item.content)}</p>`
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

                  <h2 class="public-content-card-title">${escapeHtmlText(item.title)}</h2>
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
                  ? `<p class="public-content-card-body">${escapeHtml(item.description)}</p>`
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
    ...[...nodes]
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

  publicContentEditorStatus.textContent = 'Pregătit pentru editare.'
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
  publicContentEditorStatus.textContent = 'Element încărcat pentru editare.'
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
        Nu există încă ${publicContentManagerKind === 'announcements' ? 'announcements' : 'resources'}.
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

            <button
              class="taxonomy-mini-btn"
              type="button"
              data-edit-public-content="${Number(item.id)}"
            >
              Editează
            </button>
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
  publicContentManagerList.innerHTML =
    '<div class="public-content-manager-empty">Se încarcă...</div>'

  try {
    // Refresh here so an editor who just logged in via OTP also sees drafts
    // and inactive resources without needing to reload the whole app.
    await fetchAllData()
    resetPublicContentEditor()
    renderPublicContentManager()
  } catch (error) {
    console.error('Public content manager refresh failed:', error)
    publicContentManagerSummary.textContent =
      error?.message || 'Conținutul public nu a putut fi încărcat.'
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
                              ? `<p class="roadmap-step-note">${escapeHtml(step.note)}</p>`
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
      <button class="public-hub-manage" type="button" data-open-roadmap-manager>
        Manage roadmaps
      </button>
    </div>
  `
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
  roadmapDepartmentInput.innerHTML = departments
    .filter((item) => item.is_active !== false)
    .sort((a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0))
    .map(
      (department) =>
        `<option value="${Number(department.id)}">${escapeHtmlText(
          department.name
        )}</option>`
    )
    .join('')

  if (
    departmentValue &&
    departments.some((item) => String(item.id) === String(departmentValue))
  ) {
    roadmapDepartmentInput.value = departmentValue
  } else if (activeDepartmentId != null) {
    roadmapDepartmentInput.value = String(activeDepartmentId)
  }

  const selectedNodeValue = roadmapStepNodeInput.value
  roadmapStepNodeInput.innerHTML = [
    '<option value="">— Alege un nod —</option>',
    ...[...nodes]
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

  if (
    selectedNodeValue &&
    nodes.some((node) => String(node.id) === String(selectedNodeValue))
  ) {
    roadmapStepNodeInput.value = selectedNodeValue
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

  roadmapEditorSteps.querySelectorAll('[data-roadmap-step-up]').forEach((button) => {
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

  roadmapEditorSteps.querySelectorAll('[data-roadmap-step-down]').forEach((button) => {
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

  roadmapEditorSteps.querySelectorAll('[data-roadmap-step-remove]').forEach((button) => {
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

  if (activeDepartmentId != null) {
    roadmapDepartmentInput.value = String(activeDepartmentId)
  }

  roadmapStepNodeInput.value = ''
  roadmapStepNoteInput.value = ''
  roadmapStepOptionalInput.checked = false

  deleteRoadmapBtn.hidden = true
  roadmapEditorStatus.textContent = 'Pregătit pentru editare.'

  renderRoadmapDraftSteps()
}

function editRoadmap(id) {
  const roadmap = roadmaps.find((item) => Number(item.id) === Number(id))
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
  roadmapSortOrderInput.value = String(Number(roadmap.sortOrder || 0))
  roadmapActiveInput.checked = roadmap.isActive !== false

  roadmapStepNodeInput.value = ''
  roadmapStepNoteInput.value = ''
  roadmapStepOptionalInput.checked = false

  deleteRoadmapBtn.hidden = false
  roadmapEditorStatus.textContent = 'Roadmap încărcat pentru editare.'

  renderRoadmapDraftSteps()
}

function renderRoadmapManager() {
  if (!isRoadmapManagerOpen()) return

  const items = [...roadmaps].sort((a, b) => {
    const departmentOrder =
      Number(getDepartmentById(a.departmentId)?.sort_order || 0) -
      Number(getDepartmentById(b.departmentId)?.sort_order || 0)

    if (departmentOrder !== 0) return departmentOrder

    const orderDifference = Number(a.sortOrder || 0) - Number(b.sortOrder || 0)
    if (orderDifference !== 0) return orderDifference

    return String(a.title || '').localeCompare(String(b.title || ''), 'ro', {
      sensitivity: 'base'
    })
  })

  roadmapManagerSummary.innerHTML = `<strong>${items.length} roadmaps</strong> · ${
    items.filter((item) => item.isActive !== false).length
  } active.`

  if (items.length === 0) {
    roadmapManagerList.innerHTML = `
      <div class="public-content-manager-empty">
        Nu există încă roadmaps.
      </div>
    `
  } else {
    roadmapManagerList.innerHTML = items
      .map((roadmap) => {
        const department = getDepartmentById(roadmap.departmentId)

        return `
          <article class="roadmap-manager-item ${
            roadmap.isActive !== false ? '' : 'inactive'
          }">
            <div>
              <strong>${escapeHtmlText(roadmap.title)}</strong>
              <span>
                ${escapeHtmlText(
                  department?.short_name || department?.name || '—'
                )} · ${(roadmap.steps || []).length} steps · ${
                  roadmap.isActive !== false ? 'Public' : 'Draft'
                }
              </span>
            </div>

            <button
              class="taxonomy-mini-btn"
              type="button"
              data-edit-roadmap="${Number(roadmap.id)}"
            >
              Editează
            </button>
          </article>
        `
      })
      .join('')
  }

  roadmapManagerList.querySelectorAll('[data-edit-roadmap]').forEach((button) => {
    button.addEventListener('click', () => {
      editRoadmap(Number(button.dataset.editRoadmap))
    })
  })

  setRoadmapManagerBusy(roadmapManagerMutationBusy)
}

async function openRoadmapManager() {
  if (!requireAuth()) return

  roadmapManagerBackdrop.classList.add('open')
  roadmapManagerSummary.textContent = 'Se încarcă roadmaps...'
  roadmapManagerList.innerHTML =
    '<div class="public-content-manager-empty">Se încarcă...</div>'

  try {
    await fetchAllData()
    await loadRoadmapProgress()
    resetRoadmapEditor()
    renderRoadmapManager()
  } catch (error) {
    console.error('Roadmap manager refresh failed:', error)
    roadmapManagerSummary.textContent =
      error?.message || 'Roadmap-urile nu au putut fi încărcate.'
  }
}

function closeRoadmapManager() {
  roadmapManagerBackdrop.classList.remove('open')
  roadmapManagerEditingId = null
  roadmapManagerDraftSteps = []
  roadmapManagerMutationBusy = false
}

function addRoadmapDraftStep() {
  const nodeId = Number(roadmapStepNodeInput.value)
  if (!Number.isFinite(nodeId) || !findNode(nodeId)) {
    alert('Alege un nod pentru pasul nou.')
    return
  }

  if (roadmapManagerDraftSteps.some((step) => Number(step.nodeId) === nodeId)) {
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
  if (!requireAuth() || roadmapManagerMutationBusy) return

  const title = roadmapTitleInput.value.trim()
  const departmentId = Number(roadmapDepartmentInput.value)

  if (title.length < 3) {
    alert('Titlul trebuie să aibă cel puțin 3 caractere.')
    return
  }

  if (!Number.isFinite(departmentId) || !getDepartmentById(departmentId)) {
    alert('Alege un departament valid.')
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

    const rpcName =
      roadmapManagerEditingId == null
        ? 'atlas_roadmap_create'
        : 'atlas_roadmap_update'

    if (roadmapManagerEditingId != null) {
      params.p_roadmap_id = Number(roadmapManagerEditingId)
    }

    const { error } = await supabase.rpc(rpcName, params)
    if (error) throw error

    await fetchAllData()
    await loadRoadmapProgress()

    resetRoadmapEditor()
    renderRoadmapManager()
    renderAll()

    roadmapEditorStatus.textContent = 'Salvat.'
  } catch (error) {
    console.error('Roadmap save failed:', error)
    roadmapEditorStatus.textContent = error?.message || 'Eroare la salvare.'
    alert(error?.message || 'Roadmap-ul nu a putut fi salvat.')
  } finally {
    setRoadmapManagerBusy(false)
  }
}

async function deleteRoadmap() {
  if (
    !requireAuth() ||
    roadmapManagerMutationBusy ||
    roadmapManagerEditingId == null
  ) {
    return
  }

  const roadmap = roadmaps.find(
    (item) => Number(item.id) === Number(roadmapManagerEditingId)
  )
  if (!roadmap) return

  if (!confirm(`Sigur vrei să ștergi roadmap-ul „${roadmap.title}”?`)) return

  setRoadmapManagerBusy(true)
  roadmapEditorStatus.textContent = 'Se șterge...'

  try {
    const { error } = await supabase.rpc('atlas_roadmap_delete', {
      p_project_id: PROJECT_ID,
      p_roadmap_id: Number(roadmapManagerEditingId)
    })

    if (error) throw error

    await fetchAllData()
    await loadRoadmapProgress()

    resetRoadmapEditor()
    renderRoadmapManager()
    renderAll()

    roadmapEditorStatus.textContent = 'Șters.'
  } catch (error) {
    console.error('Roadmap delete failed:', error)
    roadmapEditorStatus.textContent = error?.message || 'Eroare la ștergere.'
    alert(error?.message || 'Roadmap-ul nu a putut fi șters.')
  } finally {
    setRoadmapManagerBusy(false)
  }
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

function currentTeamDepartmentIds() {
  return teamEnabledDepartments
    .filter((row) => Number(row.teamId) === Number(activeTeamId))
    .map((row) => Number(row.departmentId))
}

function normalizeActiveTeam() {
  const ownMemberships = ownActiveTeamMemberships()

  if (ownMemberships.length === 0) {
    activeTeamId = null

    if (activePublicSection === 'team') {
      activePublicSection = 'explore'
      localStorage.setItem(CACHE_KEYS.publicSection, activePublicSection)
    }

    return
  }

  const cachedTeamId = Number(localStorage.getItem(CACHE_KEYS.activeTeam))
  const cachedIsAvailable = ownMemberships.some(
    (membership) => Number(membership.teamId) === cachedTeamId
  )

  if (cachedIsAvailable) {
    activeTeamId = cachedTeamId
    return
  }

  activeTeamId = Number(ownMemberships[0].teamId)
  localStorage.setItem(CACHE_KEYS.activeTeam, String(activeTeamId))
}

function selectActiveTeam(teamId) {
  const membership = ownActiveTeamMemberships().find(
    (item) => Number(item.teamId) === Number(teamId)
  )

  if (!membership) return

  activeTeamId = Number(teamId)
  localStorage.setItem(CACHE_KEYS.activeTeam, String(activeTeamId))

  if (isTeamMembersManagerOpen()) {
    closeTeamMembersManager()
  }

  if (isTeamContentManagerOpen()) {
    closeTeamContentManager()
  }

  renderAll()
}

async function loadTeamContext({ rerender = false } = {}) {
  teamMemberships = []
  teamRecords = []
  teamMembers = []
  teamMemberDepartments = []
  teamEnabledDepartments = []
  teamInvites = []
  teamPrivateContent = []

  if (!currentUser) {
    activeTeamId = null

    if (rerender) renderAll()
    return
  }

  const normalizedEmail = String(currentUser.email || '').trim().toLowerCase()

  const [ownMembershipResult, ownInvitesResult] = await Promise.all([
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
      : Promise.resolve({ data: [], error: null })
  ])

  if (ownMembershipResult.error) {
    console.error('Team membership load failed:', ownMembershipResult.error)
  }

  if (ownInvitesResult.error) {
    console.error('Team invites load failed:', ownInvitesResult.error)
  }

  const ownRows = ownMembershipResult.data || []
  const inviteRows = ownInvitesResult.data || []

  const membershipTeamIds = ownRows.map((row) => Number(row.team_id))
  const inviteTeamIds = inviteRows.map((row) => Number(row.team_id))

  const teamIds = [
    ...new Set([...membershipTeamIds, ...inviteTeamIds])
  ].filter(Number.isFinite)

  if (teamIds.length === 0) {
    normalizeActiveTeam()
    renderTeamInvites()
    maybeOpenPendingTeamInvite()

    if (rerender) renderAll()
    return
  }

  const membershipTeamIdsUnique = [...new Set(membershipTeamIds)].filter(Number.isFinite)

  const [
    teamsResult,
    membershipsResult,
    memberDepartmentsResult,
    enabledDepartmentsResult,
    privateContentResult
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
        : Promise.resolve({ data: [], error: null }),

      membershipTeamIdsUnique.length > 0
        ? supabase
            .from('atlas_team_content')
            .select('*')
            .eq('project_id', PROJECT_ID)
            .in('team_id', membershipTeamIdsUnique)
            .order('is_pinned', { ascending: false })
            .order('created_at', { ascending: false })
        : Promise.resolve({ data: [], error: null })
    ])

  const firstError = [
    teamsResult.error,
    membershipsResult.error,
    memberDepartmentsResult.error,
    enabledDepartmentsResult.error,
    privateContentResult.error
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

  teamPrivateContent = (privateContentResult.data || []).map((row) => ({
    id: Number(row.id),
    teamId: Number(row.team_id),
    departmentId:
      row.department_id == null ? null : Number(row.department_id),
    contentType: row.content_type || 'note',
    title: row.title || '',
    summary: row.summary || '',
    body: row.body || '',
    url: row.url || '',
    isPinned: row.is_pinned === true,
    isActive: row.is_active !== false,
    createdBy: row.created_by || null,
    createdAt: row.created_at || null,
    updatedAt: row.updated_at || null
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
  renderTeamInvites()
  maybeOpenPendingTeamInvite()

  if (rerender) renderAll()
}
function renderTeamNavigation() {
  if (!teamSpaceEntry) return

  const membership = currentTeamMembership()
  const team = currentTeamRecord()

  const visible = Boolean(currentUser && membership && team)

  teamSpaceEntry.hidden = !visible
  teamSpaceEntry.classList.toggle(
    'active',
    visible && activePublicSection === 'team'
  )

  if (!visible) return

  teamSpaceEntryName.textContent = team.teamNumber
    ? `${team.name} #${team.teamNumber}`
    : team.name

  teamSpaceEntryRole.textContent = teamRoleLabel(membership.role)
}



function notificationCategoryLabel(category) {
  const labels = {
    team: 'Team',
    department: 'Department',
    system: 'System'
  }

  return labels[category] || 'System'
}

function notificationUnreadCount() {
  return notifications.filter((item) => item.isRead !== true).length
}

function visibleNotifications() {
  return notifications.filter((item) => {
    if (notificationFilter === 'all') return true
    if (notificationFilter === 'unread') return item.isRead !== true
    return item.category === notificationFilter
  })
}

function notificationTeamLabel(item) {
  if (item.teamId == null) return ''

  const team = teamRecords.find(
    (entry) => Number(entry.id) === Number(item.teamId)
  )

  if (!team) return ''

  return team.teamNumber
    ? `${team.name} #${team.teamNumber}`
    : team.name
}

function renderNotificationCenter() {
  if (!notificationBtn || !notificationPanel) return

  const loggedIn = Boolean(currentUser)
  const unread = loggedIn ? notificationUnreadCount() : 0

  notificationBtn.hidden = !loggedIn
  notificationBadge.hidden = !loggedIn || unread === 0
  notificationBadge.textContent = unread > 99 ? '99+' : String(unread)

  notificationPanelMeta.textContent = `${unread} unread`
  notificationMarkAllBtn.disabled =
    notificationMutationBusy || unread === 0

  notificationFilters?.querySelectorAll('[data-notification-filter]').forEach(
    (button) => {
      button.classList.toggle(
        'active',
        button.dataset.notificationFilter === notificationFilter
      )
    }
  )

  if (!loggedIn) {
    notificationPanel.hidden = true
    notificationList.innerHTML = ''
    return
  }

  const items = visibleNotifications()

  if (items.length === 0) {
    notificationList.innerHTML = `
      <div class="notification-empty">
        Nu există notificări în filtrul selectat.
      </div>
    `
    return
  }

  notificationList.innerHTML = items
    .map((item) => {
      const teamLabel = notificationTeamLabel(item)
      const department =
        item.departmentId == null
          ? null
          : getDepartmentById(item.departmentId)

      return `
        <button
          class="notification-item ${item.isRead ? '' : 'unread'}"
          type="button"
          data-notification-id="${Number(item.id)}"
        >
          <span class="notification-dot" aria-hidden="true"></span>

          <span class="notification-item-main">
            <span class="notification-item-badges">
              <span class="notification-item-badge accent">${escapeHtmlText(
                notificationCategoryLabel(item.category)
              )}</span>
              ${
                teamLabel
                  ? `<span class="notification-item-badge">${escapeHtmlText(
                      teamLabel
                    )}</span>`
                  : ''
              }
              ${
                department
                  ? `<span class="notification-item-badge">${escapeHtmlText(
                      department.short_name || department.name
                    )}</span>`
                  : ''
              }
            </span>

            <span class="notification-item-title">${escapeHtmlText(
              item.title
            )}</span>

            ${
              item.body
                ? `<span class="notification-item-body">${escapeHtml(
                    item.body
                  )}</span>`
                : ''
            }
          </span>

          <time class="notification-item-date">${escapeHtmlText(
            formatPublicDate(item.createdAt)
          )}</time>
        </button>
      `
    })
    .join('')
}

async function loadNotifications({ render = true } = {}) {
  notifications = []

  if (!currentUser) {
    if (render) renderNotificationCenter()
    return
  }

  const { data, error } = await supabase
    .from('atlas_notifications')
    .select('*')
    .eq('project_id', PROJECT_ID)
    .order('created_at', { ascending: false })
    .limit(100)

  if (error) {
    console.error('Notifications load failed:', error)
    if (render) renderNotificationCenter()
    return
  }

  notifications = (data || []).map((row) => ({
    id: Number(row.id),
    teamId: row.team_id == null ? null : Number(row.team_id),
    departmentId:
      row.department_id == null ? null : Number(row.department_id),
    category: row.category || 'system',
    title: row.title || '',
    body: row.body || '',
    sourceType: row.source_type || '',
    sourceId: row.source_id == null ? null : Number(row.source_id),
    isRead: row.is_read === true,
    readAt: row.read_at || null,
    createdAt: row.created_at || null
  }))

  if (render) renderNotificationCenter()
}

function setNotificationPanel(open) {
  if (!notificationPanel || !notificationBtn) return

  const shouldOpen = Boolean(open)

  notificationPanel.hidden = !shouldOpen
  notificationBtn.classList.toggle('active', shouldOpen)
  notificationBtn.setAttribute(
    'aria-expanded',
    shouldOpen ? 'true' : 'false'
  )

  if (shouldOpen) {
    if (accountPanel && !accountPanel.hidden) {
      accountPanel.hidden = true
      accountBtn?.classList.remove('active')
      accountBtn?.setAttribute('aria-expanded', 'false')
    }

    if (toolPanel?.classList.contains('collapsed')) {
      togglePanel(false)
    }
  }
}

async function openNotificationPanel() {
  if (!currentUser) return

  setNotificationPanel(true)
  await loadNotifications()
}

async function markNotificationRead(notificationId) {
  const item = notifications.find(
    (notification) => Number(notification.id) === Number(notificationId)
  )

  if (!item || item.isRead || notificationMutationBusy) return

  notificationMutationBusy = true
  renderNotificationCenter()

  try {
    const { error } = await supabase.rpc('atlas_notification_mark_read', {
      p_project_id: PROJECT_ID,
      p_notification_id: Number(notificationId)
    })

    if (error) throw error

    item.isRead = true
    item.readAt = new Date().toISOString()
  } catch (error) {
    console.error('Mark notification read failed:', error)
  } finally {
    notificationMutationBusy = false
    renderNotificationCenter()
  }
}

async function markAllNotificationsRead() {
  if (!currentUser || notificationMutationBusy) return

  notificationMutationBusy = true
  renderNotificationCenter()

  try {
    const { error } = await supabase.rpc('atlas_notification_mark_all_read', {
      p_project_id: PROJECT_ID
    })

    if (error) throw error

    const now = new Date().toISOString()

    notifications.forEach((item) => {
      if (!item.isRead) {
        item.isRead = true
        item.readAt = now
      }
    })
  } catch (error) {
    console.error('Mark all notifications read failed:', error)
  } finally {
    notificationMutationBusy = false
    renderNotificationCenter()
  }
}

async function openNotification(notificationId) {
  const item = notifications.find(
    (notification) => Number(notification.id) === Number(notificationId)
  )

  if (!item) return

  await markNotificationRead(item.id)
  setNotificationPanel(false)

  if (
    item.sourceType === 'team_content' &&
    item.teamId != null
  ) {
    const membership = ownActiveTeamMemberships().find(
      (entry) => Number(entry.teamId) === Number(item.teamId)
    )

    if (!membership) return

    activeTeamId = Number(item.teamId)
    localStorage.setItem(CACHE_KEYS.activeTeam, String(activeTeamId))

    activePublicSection = 'team'
    localStorage.setItem(CACHE_KEYS.publicSection, activePublicSection)

    activeTeamWorkspaceTab = 'announcements'
    localStorage.setItem(
      CACHE_KEYS.teamWorkspaceTab,
      activeTeamWorkspaceTab
    )

    renderAll()
  }
}

function currentTeamPrivateContent() {
  return teamPrivateContent.filter(
    (item) => Number(item.teamId) === Number(activeTeamId)
  )
}

function teamContentKindLabel(kind) {
  const labels = {
    announcement: 'Announcement',
    resource: 'Resource',
    note: 'Note'
  }

  return labels[kind] || 'Content'
}

function teamContentDepartmentLabel(item) {
  if (item.departmentId == null) return 'Team-wide'

  const department = getDepartmentById(item.departmentId)
  return department?.short_name || department?.name || 'Department'
}

function memberCanSeeAllDepartmentContent() {
  const membership = currentTeamMembership()
  return Boolean(
    membership &&
      (membership.role === 'team_leader' || membership.role === 'mentor')
  )
}

function canManageTeamContentScope(departmentId) {
  const membership = currentTeamMembership()

  if (canEdit) return true
  if (!membership || membership.status !== 'active') return false

  if (membership.role === 'team_leader') return true

  if (
    membership.role === 'department_coordinator' &&
    departmentId != null
  ) {
    return membershipDepartmentIds(membership.id).includes(Number(departmentId))
  }

  return false
}

function canManageAnyTeamContent() {
  const membership = currentTeamMembership()

  return Boolean(
    canEdit ||
      membership?.role === 'team_leader' ||
      membership?.role === 'department_coordinator'
  )
}

function canManageTeamContentItem(item) {
  if (!item) return false
  return canManageTeamContentScope(item.departmentId)
}

function selectTeamWorkspaceTab(tab) {
  if (!TEAM_WORKSPACE_TABS.has(tab)) return

  activeTeamWorkspaceTab = tab
  localStorage.setItem(CACHE_KEYS.teamWorkspaceTab, tab)
  renderAll()
}

function teamContentForKind(kind) {
  const typeMap = {
    announcements: 'announcement',
    resources: 'resource',
    notes: 'note'
  }

  const contentType = typeMap[kind] || kind

  return currentTeamPrivateContent()
    .filter(
      (item) =>
        item.contentType === contentType &&
        item.isActive !== false
    )
    .sort((a, b) => {
      if (Boolean(a.isPinned) !== Boolean(b.isPinned)) {
        return a.isPinned ? -1 : 1
      }

      return (
        new Date(b.updatedAt || b.createdAt || 0).getTime() -
        new Date(a.updatedAt || a.createdAt || 0).getTime()
      )
    })
}

function teamContentAuthorLabel(item) {
  if (!item?.createdBy) return 'Team'

  const member = teamMembers.find(
    (membership) =>
      Number(membership.teamId) === Number(item.teamId) &&
      membership.userId === item.createdBy
  )

  if (member?.displayName) return member.displayName

  if (item.createdBy === currentUser?.id) {
    return currentUser?.email || 'You'
  }

  return 'Team'
}

function renderTeamPrivateContent(kind) {
  const items = teamContentForKind(kind)

  const labels = {
    announcements: {
      title: 'Private announcements',
      empty: 'Nu există încă announcements private vizibile pentru acest scope.'
    },
    resources: {
      title: 'Private resources',
      empty: 'Nu există încă resources private vizibile pentru acest scope.'
    },
    notes: {
      title: 'Private notes',
      empty: 'Nu există încă notes private vizibile pentru acest scope.'
    }
  }

  const copy = labels[kind] || labels.notes

  return `
    <div class="team-workspace-toolbar">
      <div class="team-workspace-toolbar-copy">
        <strong>${escapeHtmlText(copy.title)}</strong><br>
        Team-wide + departamentele la care ai acces.
      </div>

      ${
        canManageAnyTeamContent()
          ? `
            <button
              class="public-hub-manage"
              type="button"
              data-open-team-content-manager="${escapeHtmlText(
                kind === 'announcements'
                  ? 'announcement'
                  : kind === 'resources'
                    ? 'resource'
                    : 'note'
              )}"
            >
              Manage
            </button>
          `
          : ''
      }
    </div>

    <div class="team-private-list">
      ${
        items.length === 0
          ? `<div class="team-private-empty">${escapeHtmlText(copy.empty)}</div>`
          : items
              .map((item) => {
                const url =
                  item.url && normalizeHttpUrl(item.url)
                    ? normalizeHttpUrl(item.url)
                    : null

                return `
                  <article class="team-private-card ${item.isPinned ? 'pinned' : ''}">
                    <div class="team-private-card-top">
                      <div class="team-private-card-main">
                        <div class="team-private-card-badges">
                          <span class="team-private-badge accent">${escapeHtmlText(
                            teamContentKindLabel(item.contentType)
                          )}</span>
                          <span class="team-private-badge">${escapeHtmlText(
                            teamContentDepartmentLabel(item)
                          )}</span>
                          ${
                            item.isPinned
                              ? '<span class="team-private-badge">Pinned</span>'
                              : ''
                          }
                        </div>

                        <h3>${escapeHtmlText(item.title)}</h3>
                      </div>

                      <span class="team-private-card-date">${escapeHtmlText(
                        formatPublicDate(item.updatedAt || item.createdAt)
                      )}</span>
                    </div>

                    ${
                      item.summary
                        ? `<p class="team-private-summary">${escapeHtml(item.summary)}</p>`
                        : ''
                    }

                    ${
                      item.body
                        ? `<p class="team-private-body">${escapeHtml(item.body)}</p>`
                        : ''
                    }

                    <div class="team-private-card-foot">
                      <span class="team-private-badge">
                        ${escapeHtmlText(teamContentAuthorLabel(item))}
                      </span>

                      ${
                        url
                          ? `<a class="public-content-link" href="${escapeHtmlText(
                              url
                            )}" target="_blank" rel="noopener noreferrer">Deschide link-ul</a>`
                          : ''
                      }

                      ${
                        canManageTeamContentItem(item)
                          ? `
                            <button
                              class="public-content-node-link"
                              type="button"
                              data-edit-team-content="${Number(item.id)}"
                            >
                              Editează
                            </button>
                          `
                          : ''
                      }
                    </div>
                  </article>
                `
              })
              .join('')
      }
    </div>
  `
}

function renderTeamOverview(membership, ownDepartments, enabledDepartments, members) {
  const announcements = teamContentForKind('announcements')
  const resources = teamContentForKind('resources')
  const notes = teamContentForKind('notes')
  const latestAnnouncement = announcements[0] || null

  return `
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
        <span class="team-space-card-label">Private workspace</span>
        <h3>${announcements.length + resources.length + notes.length} items</h3>
        <p>
          Conținut privat vizibil pentru rolul și departamentele tale.
        </p>

        <div class="team-space-chips">
          <span class="team-space-chip">${announcements.length} announcements</span>
          <span class="team-space-chip">${resources.length} resources</span>
          <span class="team-space-chip">${notes.length} notes</span>
        </div>
      </article>

      ${
        latestAnnouncement
          ? `
            <article class="team-space-card wide">
              <span class="team-space-card-label">Latest announcement</span>
              <h3>${escapeHtmlText(latestAnnouncement.title)}</h3>
              <p>${escapeHtml(
                latestAnnouncement.summary ||
                  latestAnnouncement.body ||
                  'Deschide Announcements pentru detalii.'
              )}</p>

              <div class="public-hub-actions">
                <button
                  class="public-hub-manage"
                  type="button"
                  data-team-workspace-tab="announcements"
                >
                  Vezi announcements
                </button>
              </div>
            </article>
          `
          : ''
      }

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

      <article class="team-space-card">
        <span class="team-space-card-label">Members</span>
        <h3>${members.filter((member) => member.status === 'active').length} membri activi</h3>
        <p>
          Vezi lista completă de membri și roluri mai jos în Team Space.
        </p>
      </article>

      <article class="team-space-card wide">
        <span class="team-space-card-label">Members</span>
        <h3>${members.filter((member) => member.status === 'active').length} membri activi</h3>

        <div class="team-member-list">
          ${members
            .filter((member) => member.status === 'active')
            .map((member) => {
              const departmentNames = membershipDepartmentIds(member.id)
                .map(
                  (id) =>
                    getDepartmentById(id)?.short_name ||
                    getDepartmentById(id)?.name
                )
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
    </div>
  `
}

function isTeamContentManagerOpen() {
  return Boolean(teamContentManagerBackdrop?.classList.contains('open'))
}

function teamContentManagerItems() {
  return currentTeamPrivateContent()
    .filter(
      (item) =>
        item.contentType === teamContentManagerKind &&
        canManageTeamContentItem(item)
    )
    .sort((a, b) => {
      if (Boolean(a.isActive) !== Boolean(b.isActive)) {
        return a.isActive ? -1 : 1
      }

      if (Boolean(a.isPinned) !== Boolean(b.isPinned)) {
        return a.isPinned ? -1 : 1
      }

      return (
        new Date(b.updatedAt || b.createdAt || 0).getTime() -
        new Date(a.updatedAt || a.createdAt || 0).getTime()
      )
    })
}

function managerDepartmentOptions() {
  const membership = currentTeamMembership()
  if (!membership) return []

  const enabled = enabledTeamDepartments()

  if (canEdit || membership.role === 'team_leader') {
    return [
      { id: null, label: 'Team-wide' },
      ...enabled.map((department) => ({
        id: Number(department.id),
        label: department.short_name || department.name
      }))
    ]
  }

  if (membership.role === 'department_coordinator') {
    const allowed = new Set(membershipDepartmentIds(membership.id))

    return enabled
      .filter((department) => allowed.has(Number(department.id)))
      .map((department) => ({
        id: Number(department.id),
        label: department.short_name || department.name
      }))
  }

  return []
}

function populateTeamContentDepartmentSelect(selectedId = null) {
  const options = managerDepartmentOptions()

  teamContentDepartmentInput.innerHTML = options
    .map(
      (item) => `
        <option value="${item.id == null ? '' : Number(item.id)}">
          ${escapeHtmlText(item.label)}
        </option>
      `
    )
    .join('')

  if (
    selectedId != null &&
    options.some((item) => Number(item.id) === Number(selectedId))
  ) {
    teamContentDepartmentInput.value = String(selectedId)
  } else if (options.some((item) => item.id == null)) {
    teamContentDepartmentInput.value = ''
  }
}

function setTeamContentBusy(nextValue) {
  teamContentMutationBusy = Boolean(nextValue)

  newTeamContentBtn.disabled = teamContentMutationBusy
  saveTeamContentBtn.disabled = teamContentMutationBusy
  resetTeamContentEditorBtn.disabled = teamContentMutationBusy
  deleteTeamContentBtn.disabled = teamContentMutationBusy

  teamContentManagerList?.querySelectorAll('button').forEach((button) => {
    button.disabled = teamContentMutationBusy
  })

  document.querySelectorAll('[data-team-content-kind]').forEach((button) => {
    button.disabled = teamContentMutationBusy
  })
}

function resetTeamContentEditor() {
  teamContentEditingId = null

  populateTeamContentDepartmentSelect(null)

  teamContentEditorTitle.textContent = `${teamContentKindLabel(
    teamContentManagerKind
  )} nou`
  teamContentEditorHint.textContent =
    'Conținutul este vizibil numai membrilor care au acces la scope-ul ales.'

  teamContentTitleInput.value = ''
  teamContentSummaryInput.value = ''
  teamContentBodyInput.value = ''
  teamContentUrlInput.value = ''
  teamContentPinnedInput.checked = false
  teamContentActiveInput.checked = true
  teamContentNotifyInput.checked =
    teamContentManagerKind === 'announcement'

  teamContentNotifyLabel.hidden =
    teamContentManagerKind !== 'announcement'
  teamContentUrlField.hidden = teamContentManagerKind === 'note'
  deleteTeamContentBtn.hidden = true
  teamContentEditorStatus.textContent = 'Pregătit pentru editare.'
}

function editTeamContent(id) {
  const item = currentTeamPrivateContent().find(
    (entry) => Number(entry.id) === Number(id)
  )
  if (!item || !canManageTeamContentItem(item)) return

  teamContentManagerKind = item.contentType
  teamContentEditingId = Number(item.id)

  document.querySelectorAll('[data-team-content-kind]').forEach((button) => {
    button.classList.toggle(
      'active',
      button.dataset.teamContentKind === teamContentManagerKind
    )
  })

  populateTeamContentDepartmentSelect(item.departmentId)

  teamContentEditorTitle.textContent = `Editează ${teamContentKindLabel(
    item.contentType
  ).toLowerCase()}`
  teamContentEditorHint.textContent =
    'Schimbările sunt vizibile imediat membrilor care au acces.'

  teamContentTitleInput.value = item.title || ''
  teamContentSummaryInput.value = item.summary || ''
  teamContentBodyInput.value = item.body || ''
  teamContentUrlInput.value = item.url || ''
  teamContentPinnedInput.checked = Boolean(item.isPinned)
  teamContentActiveInput.checked = item.isActive !== false
  teamContentNotifyInput.checked = false

  teamContentNotifyLabel.hidden =
    teamContentManagerKind !== 'announcement'
  teamContentUrlField.hidden = teamContentManagerKind === 'note'
  deleteTeamContentBtn.hidden = false
  teamContentEditorStatus.textContent = 'Element încărcat pentru editare.'

  renderTeamContentManager()
}

function renderTeamContentManager() {
  if (!isTeamContentManagerOpen()) return

  document.querySelectorAll('[data-team-content-kind]').forEach((button) => {
    button.classList.toggle(
      'active',
      button.dataset.teamContentKind === teamContentManagerKind
    )
  })

  const items = teamContentManagerItems()

  teamContentManagerSummary.innerHTML = `
    <strong>${items.length} ${escapeHtmlText(
      teamContentKindLabel(teamContentManagerKind).toLowerCase()
    )}${items.length === 1 ? '' : 's'}</strong>
    · doar scope-uri pe care le poți administra
  `

  teamContentManagerList.innerHTML =
    items.length === 0
      ? '<div class="public-content-manager-empty">Nu există conținut administrabil în acest scope.</div>'
      : items
          .map(
            (item) => `
              <article class="team-content-manager-item ${
                item.isActive !== false ? '' : 'inactive'
              }">
                <div>
                  <strong>${escapeHtmlText(item.title)}</strong>
                  <span>
                    ${escapeHtmlText(teamContentDepartmentLabel(item))}
                    · ${item.isActive !== false ? 'Activ' : 'Draft'}
                    ${item.isPinned ? ' · Pinned' : ''}
                  </span>
                </div>

                <button
                  class="taxonomy-mini-btn"
                  type="button"
                  data-manage-team-content="${Number(item.id)}"
                >
                  Editează
                </button>
              </article>
            `
          )
          .join('')

  teamContentManagerList
    .querySelectorAll('[data-manage-team-content]')
    .forEach((button) => {
      button.addEventListener('click', () => {
        editTeamContent(Number(button.dataset.manageTeamContent))
      })
    })

  setTeamContentBusy(teamContentMutationBusy)
}

async function openTeamContentManager(kind = 'announcement', editId = null) {
  if (!currentUser || !canManageAnyTeamContent()) return

  teamContentManagerKind = ['announcement', 'resource', 'note'].includes(kind)
    ? kind
    : 'announcement'

  teamContentManagerBackdrop.classList.add('open')
  teamContentManagerSummary.textContent = 'Se încarcă...'

  try {
    await loadTeamContext()

    if (!canManageAnyTeamContent()) {
      closeTeamContentManager()
      return
    }

    resetTeamContentEditor()
    renderTeamContentManager()

    if (editId != null) {
      editTeamContent(Number(editId))
    }
  } catch (error) {
    console.error('Private team content manager load failed:', error)
    teamContentEditorStatus.textContent =
      error?.message || 'Conținutul privat nu a putut fi încărcat.'
  }
}

function closeTeamContentManager() {
  teamContentManagerBackdrop.classList.remove('open')
  teamContentEditingId = null
  teamContentMutationBusy = false
}

async function saveTeamContent() {
  if (!currentUser || !canManageAnyTeamContent() || teamContentMutationBusy) {
    return
  }

  const title = teamContentTitleInput.value.trim()
  const departmentId = teamContentDepartmentInput.value
    ? Number(teamContentDepartmentInput.value)
    : null
  const urlRaw = teamContentUrlInput.value.trim()
  const normalizedUrl = urlRaw ? normalizeHttpUrl(urlRaw) : null

  if (title.length < 2) {
    alert('Titlul trebuie să aibă cel puțin 2 caractere.')
    return
  }

  if (!canManageTeamContentScope(departmentId)) {
    alert('Nu ai permisiunea pentru acest scope.')
    return
  }

  if (teamContentManagerKind === 'resource' && !normalizedUrl) {
    alert('Un resource trebuie să aibă un URL valid.')
    return
  }

  if (urlRaw && !normalizedUrl) {
    alert('URL-ul trebuie să fie http:// sau https://.')
    return
  }

  setTeamContentBusy(true)
  teamContentEditorStatus.textContent = 'Se salvează...'

  try {
    const params = {
      p_project_id: PROJECT_ID,
      p_team_id: Number(activeTeamId),
      p_content_type: teamContentManagerKind,
      p_title: title,
      p_summary: teamContentSummaryInput.value.trim(),
      p_body: teamContentBodyInput.value.trim(),
      p_url: normalizedUrl,
      p_department_id: departmentId,
      p_is_pinned: teamContentPinnedInput.checked,
      p_is_active: teamContentActiveInput.checked,
      p_notify_members:
        teamContentManagerKind === 'announcement' &&
        teamContentNotifyInput.checked
    }

    const rpcName =
      teamContentEditingId == null
        ? 'atlas_team_content_create'
        : 'atlas_team_content_update'

    if (teamContentEditingId != null) {
      params.p_content_id = Number(teamContentEditingId)
    }

    const { error } = await supabase.rpc(rpcName, params)
    if (error) throw error

    await loadTeamContext()

    resetTeamContentEditor()
    renderTeamContentManager()
    renderAll()

    teamContentEditorStatus.textContent = 'Salvat.'
  } catch (error) {
    console.error('Private team content save failed:', error)
    teamContentEditorStatus.textContent =
      error?.message || 'Conținutul nu a putut fi salvat.'
    alert(error?.message || 'Conținutul nu a putut fi salvat.')
  } finally {
    setTeamContentBusy(false)
  }
}

async function deleteTeamContent() {
  if (
    !currentUser ||
    teamContentEditingId == null ||
    teamContentMutationBusy
  ) {
    return
  }

  const item = currentTeamPrivateContent().find(
    (entry) => Number(entry.id) === Number(teamContentEditingId)
  )

  if (!item || !canManageTeamContentItem(item)) return

  if (!confirm(`Ștergi „${item.title}”?`)) return

  setTeamContentBusy(true)
  teamContentEditorStatus.textContent = 'Se șterge...'

  try {
    const { error } = await supabase.rpc('atlas_team_content_delete', {
      p_project_id: PROJECT_ID,
      p_team_id: Number(activeTeamId),
      p_content_id: Number(item.id)
    })

    if (error) throw error

    await loadTeamContext()

    resetTeamContentEditor()
    renderTeamContentManager()
    renderAll()

    teamContentEditorStatus.textContent = 'Șters.'
  } catch (error) {
    console.error('Private team content delete failed:', error)
    teamContentEditorStatus.textContent =
      error?.message || 'Conținutul nu a putut fi șters.'
  } finally {
    setTeamContentBusy(false)
  }
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

  const workspaceBody =
    activeTeamWorkspaceTab === 'overview'
      ? renderTeamOverview(
          membership,
          ownDepartments,
          enabledDepartments,
          members
        )
      : renderTeamPrivateContent(activeTeamWorkspaceTab)

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
        <span class="public-hub-chip">${
          members.filter((member) => member.status === 'active').length
        } members</span>
        <span class="public-hub-chip">${enabledDepartments.length} departments</span>
        ${
          memberCanSeeAllDepartmentContent()
            ? '<span class="public-hub-chip">All department content</span>'
            : ''
        }
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

      <div class="team-workspace-tabs">
        ${[
          ['overview', 'Overview'],
          ['announcements', 'Announcements'],
          ['resources', 'Resources'],
          ['notes', 'Notes']
        ]
          .map(
            ([tab, label]) => `
              <button
                class="team-workspace-tab ${
                  activeTeamWorkspaceTab === tab ? 'active' : ''
                }"
                type="button"
                data-team-workspace-tab="${tab}"
              >
                ${label}
              </button>
            `
          )
          .join('')}
      </div>

      ${workspaceBody}

      <div class="team-privacy-note">
        Team Space este privat. Team Leader și Mentor pot vedea toate departamentele; Coordinator și Member văd team-wide + departamentele asignate. Editarea este limitată separat prin rol.
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
        'Tu configurezi structura Team Space și stabilești cine are acces la ce departamente.',
      steps: [
        [
          'Configurează echipa',
          'Verifică numele, FTC Team Number și departamentele active din Team Setup.'
        ],
        [
          'Invită membrii',
          'Creează invitații pe email și distribuie linkurile persoanelor potrivite.'
        ],
        [
          'Atribuie rolurile',
          'Poți promova membri la Coordinator, Mentor sau Team Leader și poți actualiza departamentele.'
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
        'Coordonezi unul sau mai multe departamente din Team Space fără să blochezi accesul la Atlasul public.',
      steps: [
        [
          'Verifică departamentele tale',
          'Team Space îți arată departamentele la care ești asignat.'
        ],
        [
          'Folosește roadmaps ca recomandări',
          'Roadmap-urile sunt trasee orientative; orice nod public rămâne accesibil.'
        ],
        [
          'Folosește workspace-ul privat',
          'Poți publica announcements, resources și notes în departamentele pe care le coordonezi.'
        ]
      ]
    },
    mentor: {
      title: 'Mentor',
      intro:
        'Ai vizibilitate în Team Space pentru ghidaj, context și resurse, fără să fii obligat să administrezi echipa.',
      steps: [
        [
          'Urmărește structura',
          'Poți vedea membrii, rolurile și departamentele active ale echipei.'
        ],
        [
          'Folosește resursele și Atlasul',
          'Public Atlas rămâne sursa comună de documentație și roadmaps.'
        ],
        [
          'Contribuie prin ghidaj',
          'Poți consulta announcements, resources și notes din toate departamentele echipei.'
        ]
      ]
    },
    team_member: {
      title: 'Team Member',
      intro:
        'Team Space îți oferă contextul echipei, departamentele tale și accesul la viitoarele resurse private.',
      steps: [
        [
          'Vezi departamentul tău',
          'Rolul și departamentele asignate apar direct în Team Space.'
        ],
        [
          'Explorează Atlasul public',
          'Poți deschide orice nod și urma roadmaps fără sistem de unlock.'
        ],
        [
          'Folosește Team Space',
          'Poți consulta conținutul team-wide și materialele private din departamentele tale.'
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
  teamMembersManagerStatus.textContent = 'Pregătit.'
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
  teamMembersManagerStatus.textContent = 'Membru încărcat pentru editare.'
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

  if (!teamSetupCreateMode && team && membership) {
    teamSetupCurrent.innerHTML = `
      <strong>${escapeHtmlText(
        team.teamNumber ? `${team.name} #${team.teamNumber}` : team.name
      )}</strong><br>
      ${escapeHtmlText(teamRoleLabel(membership.role))}
    `

    teamNameInput.value = team.name || ''
    teamNumberInput.value = team.teamNumber || ''
    teamDescriptionInput.value = team.description || ''
    teamDisplayNameInput.value =
      membership.displayName ||
      (currentUser?.email ? currentUser.email.split('@')[0] : '')

    renderTeamSetupDepartmentPicker(currentTeamDepartmentIds())
    teamSetupStatus.textContent = 'Editezi Team Space-ul selectat.'
  } else {
    teamSetupCurrent.textContent =
      'Creezi un Team Space nou. Vei deveni Team Leader pentru această echipă.'

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

    teamSetupStatus.textContent = 'Completează datele noii echipe.'
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
    alert('Scrie un nume de afișat în Team Space.')
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

      if (!team || !membership) {
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

function publicSectionLabel(section) {
  const labels = {
    explore: 'Explore',
    roadmaps: 'Roadmaps',
    resources: 'Resources',
    announcements: 'Announcements',
    team: 'Team Space'
  }

  return labels[section] || 'Explore'
}

function publicSectionEyebrow(section) {
  const labels = {
    explore: 'Explorează Atlasul',
    roadmaps: 'Parcursuri recomandate',
    resources: 'Resurse utile',
    announcements: 'Anunțuri universale',
    team: 'Spațiul echipei'
  }

  return labels[section] || labels.explore
}

function selectPublicSection(section) {
  if (!PUBLIC_SECTIONS.has(section)) return

  activePublicSection = section
  localStorage.setItem(CACHE_KEYS.publicSection, section)

  renderAll()

  if (section === 'explore') {
    requestAnimationFrame(fitView)
  }
}

function renderPublicShell() {
  if (!appRoot || !publicSectionTabs || !publicHubPanel) return

  const isExplore = activePublicSection === 'explore'
  const isGlobal =
    activePublicSection === 'announcements' || activePublicSection === 'team'
  const department = getDepartmentById(activeDepartmentId)
  const departmentName = department?.name || 'Atlas'

  appRoot.classList.toggle('public-section-open', !isExplore)
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

  if (isExplore) {
    publicHubPanel.classList.remove('open')
    publicHubPanel.innerHTML = ''
    return
  }

  publicHubPanel.classList.add('open')

  if (activePublicSection === 'team') {
    publicHubPanel.innerHTML = renderTeamSpace()
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

  if (shouldOpen) {
    if (notificationPanel && !notificationPanel.hidden) {
      notificationPanel.hidden = true
      notificationBtn?.classList.remove('active')
      notificationBtn?.setAttribute('aria-expanded', 'false')
    }

    if (toolPanel?.classList.contains('collapsed')) {
      togglePanel(false)
    }
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

  richFontSizeSelect.addEventListener('change', () => {
    runRichCommand('fontSize', richFontSizeSelect.value)
    richFontSizeSelect.value = '3'
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
  if (media?.storagePath) {
    const { data } = supabase.storage.from(MEDIA_BUCKET).getPublicUrl(media.storagePath)

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

  if (mediaItems.length === 0) {
    if (!canEdit || !editorMode) return ''

    return `
      <section class="node-media-section empty">
        <div class="node-media-heading">
          <div>
            <span>media</span>
            <h3>Screenshoturi și videoclipuri</h3>
          </div>
          <button class="btn" type="button" data-open-node-media>Adaugă media</button>
        </div>
        <p>Acest nod nu are încă imagini sau videoclipuri.</p>
      </section>
    `
  }

  return `
    <section class="node-media-section">
      <div class="node-media-heading">
        <div>
          <span>media</span>
          <h3>Screenshoturi și videoclipuri</h3>
        </div>
        ${
          canEdit && editorMode
            ? '<button class="btn" type="button" data-open-node-media>Administrează</button>'
            : ''
        }
      </div>

      <div class="media-gallery">
        ${mediaItems
          .map(
            (media) => `
          <article class="media-card">
            <div class="media-preview">
              ${renderMediaPreview(media)}
            </div>
            ${
              media.title || media.caption
                ? `
              <div class="media-card-copy">
                ${media.title ? `<strong>${escapeHtml(media.title)}</strong>` : ''}
                ${media.caption ? `<p>${escapeHtml(media.caption)}</p>` : ''}
              </div>
            `
                : ''
            }
          </article>
        `
          )
          .join('')}
      </div>
    </section>
  `
}

// General file presentation helpers
function filePublicUrl(file) {
  if (!file?.storagePath) return null
  const { data } = supabase.storage.from(FILE_BUCKET).getPublicUrl(file.storagePath)
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
  return [PROJECT_ID, Number(nodeId), batchId, safeFolder, safeName].filter(Boolean).join('/')
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

  if (files.length === 0) {
    if (!canEdit || !editorMode) return ''

    return `
      <section class="node-files-section empty">
        <div class="node-files-heading">
          <div>
            <span>fișiere</span>
            <h3>Fișiere și foldere</h3>
          </div>
          <button class="btn" type="button" data-open-node-files>Adaugă fișiere</button>
        </div>
        <p>Poți atașa arhive, PDF-uri, proiecte, configurații, surse și foldere întregi.</p>
      </section>
    `
  }

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
                  ${
                    url
                      ? `<a class="btn file-download-btn" href="${escapeHtml(url)}" download="${escapeHtml(file.originalName)}" target="_blank" rel="noopener noreferrer">Descarcă</a>`
                      : '<span class="file-download-btn">Indisponibil</span>'
                  }
                </article>
              `
            })
            .join('')}
        </div>
      </div>
    `)
    .join('')

  return `
    <section class="node-files-section">
      <div class="node-files-heading">
        <div>
          <span>fișiere</span>
          <h3>Fișiere și foldere · ${files.length}</h3>
        </div>
        ${canEdit && editorMode ? '<button class="btn" type="button" data-open-node-files>Administrează</button>' : ''}
      </div>
      ${groupsHtml}
    </section>
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

function codeLanguageOptions(selectedLanguage) {
  const selected = String(selectedLanguage || 'java').toLowerCase()

  return CODE_LANGUAGES.map(
    ([value, label]) => `
    <option value="${value}" ${value === selected ? 'selected' : ''}>${escapeHtml(label)}</option>
  `
  ).join('')
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

  if (snippets.length === 0) {
    if (!canEdit || !editorMode) return ''

    return `
      <section class="node-code-section empty">
        <div class="node-code-heading">
          <div>
            <span>nod cod</span>
            <h3>Snippet-uri de cod</h3>
          </div>
          <button class="btn" type="button" data-open-node-code>Adaugă cod</button>
        </div>
        <p>Acest nod nu are încă exemple de cod.</p>
      </section>
    `
  }

  return `
    <section class="node-code-section">
      <div class="node-code-heading">
        <div>
          <span>nod cod</span>
          <h3>Snippet-uri de cod</h3>
        </div>
        ${
          canEdit && editorMode
            ? '<button class="btn" type="button" data-open-node-code>Administrează</button>'
            : ''
        }
      </div>

      <div class="code-snippet-list">
        ${snippets
          .map(
            (snippet) => `
          <article class="code-snippet-card">
            <div class="code-snippet-header">
              <div class="code-snippet-title-wrap">
                <span class="code-language-badge">${escapeHtml(codeLanguageLabel(snippet.language))}</span>
                ${
                  snippet.title
                    ? `<h4 class="code-snippet-title">${escapeHtml(snippet.title)}</h4>`
                    : ''
                }
              </div>
              <button
                class="btn code-copy-btn"
                type="button"
                data-copy-code-id="${snippet.id}"
              >Copiază</button>
            </div>

            ${
              snippet.description
                ? `<p class="code-snippet-description">${escapeHtml(snippet.description)}</p>`
                : ''
            }

            <div class="code-block-shell">
              <pre tabindex="0"><code>${escapeHtmlText(snippet.code)}</code></pre>
            </div>
          </article>
        `
          )
          .join('')}
      </div>
    </section>
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
    teamContentManagerBackdrop?.classList.contains('open')
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
    · ${activeCount} active
    · ${totalUsage} utilizări în noduri.
    Poți edita, dezactiva, reordona sau șterge în siguranță.
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
  if (!requireAuth()) return

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
  if (!requireAuth()) return

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

async function saveTaxonomyItem() {
  if (!requireAuth() || !taxonomyItemDraft) return
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
    await fetchAllData()
    renderTaxonomyManager()
  } finally {
    setTaxonomyMutationBusy(false)
  }
}

async function toggleTaxonomyItemActive(itemId) {
  if (!requireAuth() || taxonomyMutationBusy) return

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

    await fetchAllData()
    renderTaxonomyManager()
  } finally {
    setTaxonomyMutationBusy(false)
  }
}

async function moveTaxonomyItem(itemId, direction) {
  if (!requireAuth() || taxonomyMutationBusy) return

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

    await fetchAllData()
    renderTaxonomyManager()
  } finally {
    setTaxonomyMutationBusy(false)
  }
}

async function requestTaxonomyDelete() {
  if (!requireAuth() || !taxonomyItemDraft) return
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
    await fetchAllData()
    renderTaxonomyManager()
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
  if (!requireAuth() || !taxonomyDeleteDraft) return
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
    await fetchAllData()
    renderTaxonomyManager()
  } finally {
    setTaxonomyMutationBusy(false)
  }
}

// Atlas loading and empty-state UI
function showAtlasLoading(
  message = 'Pregătim nodurile, documentația și relațiile dintre concepte.'
) {
  isAtlasLoading = true

  atlasStatusOverlay.classList.remove('hidden', 'error', 'empty')

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

  atlasLoader.hidden = true
  retryLoadBtn.hidden = false
  retryLoadBtn.textContent = 'Reîncearcă'

  atlasStatusKicker.textContent = 'Conexiune indisponibilă'

  atlasStatusTitle.textContent = 'Atlasul nu a putut fi încărcat'

  atlasStatusMessage.textContent = error?.message
    ? `Supabase a răspuns cu eroarea: ${error.message}`
    : 'Verifică internetul și încearcă din nou.'

  updateAuthUI()
}

function showEmptyAtlasState() {
  isAtlasLoading = false

  atlasStatusOverlay.classList.remove('hidden', 'error')

  atlasStatusOverlay.classList.add('empty')

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

      const routedNode = applyRouteFromLocation({ canonicalize: true })
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
  if (!canEdit || !editorMode) return

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
  if (!canEdit || !editorMode) return

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
      .from('atlas_project_tutorials')
      .select('content')
      .eq('project_id', PROJECT_ID)
      .maybeSingle()
  ])

  for (const result of [
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
    tutorialResult
  ]) {
    if (result.error) throw result.error
  }

  categories = categoriesResult.data || []
  difficulties = difficultiesResult.data || []
  taxonomyTags = tagsResult.data || []
  departments = departmentsResult.data || []
  tutorialContent = tutorialResult.data?.content || DEFAULT_TUTORIAL_CONTENT

  const roadmapStepsByRoadmap = new Map()
  for (const row of roadmapStepsResult.data || []) {
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

  roadmaps = (roadmapsResult.data || []).map((row) => ({
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
  for (const row of resourceDepartmentsResult.data || []) {
    const resourceId = Number(row.resource_id)
    if (!resourceDepartmentsByResource.has(resourceId)) {
      resourceDepartmentsByResource.set(resourceId, [])
    }

    resourceDepartmentsByResource.get(resourceId).push(Number(row.department_id))
  }

  announcements = (announcementsResult.data || []).map((row) => ({
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

  resources = (resourcesResult.data || []).map((row) => ({
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
  const mediaData = mediaResult.data || []
  const filesData = filesResult.data || []
  const codeData = codeResult.data || []

  if (nodesData.length === 0) {
    nodes = []
    selectedId = null
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

  nodes = nodesData.map((node) => ({
    id: Number(node.id),
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
    codeSnippets: codeByNode.get(Number(node.id)) || []
  }))

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
  const { data, error } = await supabase.rpc('atlas_media_delete', {
    p_project_id: PROJECT_ID,
    p_media_id: Number(mediaId)
  })

  if (error) throw error
  if (!data?.ok) throw new Error('Elementul media nu a fost șters.')
  return data
}

async function reorderMediaRemote(nodeId, items) {
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
  const { data, error } = await supabase.rpc('atlas_file_delete', {
    p_project_id: PROJECT_ID,
    p_file_id: Number(fileId)
  })

  if (error) throw error
  if (!data?.ok) throw new Error('Fișierul nu a fost șters.')
  return data
}

async function reorderFilesRemote(nodeId, items) {
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
  const { data, error } = await supabase.rpc('atlas_code_delete', {
    p_project_id: PROJECT_ID,
    p_code_id: Number(codeId)
  })

  if (error) throw error
  if (!data?.ok) throw new Error('Snippet-ul de cod nu a fost șters.')
  return data
}

async function reorderCodeRemote(nodeId, items) {
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
  const { data, error } = await supabase.rpc('atlas_taxonomy_delete', {
    p_project_id: PROJECT_ID,
    p_kind: kind,
    p_id: Number(itemId)
  })

  if (error) throw error

  return data
}

async function reorderTaxonomyItemsRemote(kind, items) {
  const { data, error } = await supabase.rpc('atlas_taxonomy_reorder', {
    p_project_id: PROJECT_ID,
    p_kind: kind,
    p_items: items
  })

  if (error) throw error

  if (!data?.ok) {
    throw new Error('Ordinea nu a putut fi salvată.')
  }

  return data
}

async function replaceAndDeleteTaxonomyItemRemote(kind, itemId, replacementId) {
  const { data, error } = await supabase.rpc('atlas_taxonomy_replace_and_delete', {
    p_project_id: PROJECT_ID,
    p_kind: kind,
    p_id: Number(itemId),
    p_replacement_id: Number(replacementId)
  })

  if (error) throw error

  if (!data?.ok) {
    throw new Error('Elementul nu a putut fi înlocuit și șters.')
  }

  return data
}

async function insertEdgeRemote(sourceId, targetId, label) {
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
  if (!unsavedNodePosition) return true

  if (
    nextNodeId != null &&
    Number(nextNodeId) === Number(unsavedNodePosition.nodeId)
  ) {
    return true
  }

  const node = nodes.find(
    (item) => Number(item.id) === Number(unsavedNodePosition.nodeId)
  )
  const nodeName = node?.title || `#${unsavedNodePosition.nodeId}`

  const shouldSave = window.confirm(
    `Ai modificat poziția nodului „${nodeName}”, dar nu ai salvat-o.\n\n` +
    'OK = salvează poziția în Supabase și continuă.\n' +
    'Cancel = rămâi aici fără să pierzi modificarea.'
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
  if (!canEdit || !editorMode || isAnyModalOpen() || selectedEdge) return false

  const node = selectedNode()

  if (!node) return false

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
  if (!canEdit || !editorMode) return

  const node = selectedNode()

  if (!node) return

  const { width, height } = nodeSize(node)

  const desiredX = clamp(node.x + dx, 20, WORLD_WIDTH - width - 20)

  const desiredY = clamp(node.y + dy, 20, WORLD_HEIGHT - height - 20)

  const free = findNearestFreeSpot(node.id, desiredX, desiredY)

  const changed = Number(free.x) !== Number(node.x) || Number(free.y) !== Number(node.y)

  if (!changed) return

  try {
    const updated = await updateNodeRemote({
      ...node,
      x: free.x,
      y: free.y
    })

    node.x = Number(updated.x)
    node.y = Number(updated.y)

    if (hasUnsavedNodePosition(node.id)) {
      clearUnsavedNodePosition()
    }

    saveCachedNodes()
    renderAll()

    await refreshHistoryButtons()
  } catch (error) {
    console.error('Move node with keyboard failed:', error)

    alert(`Eroare la mutarea nodului: ${error?.message || 'necunoscută'}`)

    await fetchAllData()
  }
}

async function resizeSelectedNode(deltaWidth, deltaHeight) {
  if (!canEdit || !editorMode || selectedEdge) return

  const node = selectedNode()
  if (!node) return

  const originalWidth = node.width
  const originalHeight = node.height
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

  if (nextWidth === current.width && nextHeight === current.height) {
    return
  }

  if (overlapsAny(node.id, node.x, node.y, nextWidth, nextHeight)) {
    alert('Nodul s-ar suprapune peste alt nod.')
    return
  }

  node.width = nextWidth
  node.height = nextHeight
  renderAll()

  try {
    const updated = await updateNodeGeometryRemote(node)
    node.width = updated.width == null ? null : Number(updated.width)
    node.height = updated.height == null ? null : Number(updated.height)
    await refreshHistoryButtons()
  } catch (error) {
    node.width = originalWidth
    node.height = originalHeight
    renderAll()
    throw error
  }
}

async function resetSelectedNodeSize() {
  if (!canEdit || !editorMode || selectedEdge) return

  const node = selectedNode()
  if (!node) return

  const originalWidth = node.width
  const originalHeight = node.height

  node.width = null
  node.height = null

  const fallback = nodeSize(node)
  if (overlapsAny(node.id, node.x, node.y, fallback.width, fallback.height)) {
    node.width = originalWidth
    node.height = originalHeight
    alert('Dimensiunea automată s-ar suprapune peste alt nod.')
    return
  }

  renderAll()

  try {
    await updateNodeGeometryRemote(node)
    if (hasUnsavedNodePosition(node.id)) {
      clearUnsavedNodePosition()
    }
    await refreshHistoryButtons()
  } catch (error) {
    node.width = originalWidth
    node.height = originalHeight
    renderAll()
    throw error
  }
}

// Authentication, permissions and Editor Mode
function updateAuthUI() {
  renderTeamInvites()
  renderNotificationCenter()

  if (accountBtn) {
    accountBtn.textContent = currentUser ? 'Profil' : 'Cont'
    accountBtn.title = currentUser?.email || 'Login'
  }

  if (!currentUser) {
    authStatusBox.innerHTML = 'Neautentificat. Atlasul este în Reader Mode.'
  } else if (canEdit && editorMode) {
    authStatusBox.innerHTML = `<strong>Editor Mode activ</strong><br>${escapeHtml(currentUser.email)}`
  } else if (canEdit) {
    authStatusBox.innerHTML = `<strong>Logat ca editor</strong><br>${escapeHtml(currentUser.email)}<br>Momentan ești în Reader Mode.`
  } else {
    authStatusBox.innerHTML = `<strong>Logat doar pentru view:</strong><br>${escapeHtml(currentUser.email)}`
  }

  if (!canEdit && editorMode) {
    editorMode = false

    localStorage.setItem(CACHE_KEYS.editorMode, '0')
  }

  const editorActive = canEdit && editorMode

  const editorBlocked = isAtlasLoading || !editorActive

  const hasSelectedNode = Boolean(selectedNode())

  const hasNodes = nodes.length > 0

  editorModeBtn.hidden = !canEdit

  editorModeBtn.textContent = editorMode ? 'Ieși din Editor' : 'Editor mode'

  editorModeBtn.classList.toggle('active', editorMode)

  editorToolsSection.hidden = !editorActive
  taxonomyManagerBtn.disabled = editorBlocked
  publicContentManagerBtn.disabled = editorBlocked
  roadmapManagerBtn.disabled = editorBlocked
  teamSetupBtn.disabled = editorBlocked
  mediaManagerBtn.disabled = editorBlocked || !hasSelectedNode
  fileManagerBtn.disabled = editorBlocked || !hasSelectedNode
  codeManagerBtn.disabled = editorBlocked || !hasSelectedNode

  const selectedHasUnsavedPosition =
    editorActive &&
    hasSelectedNode &&
    hasUnsavedNodePosition(selectedNode()?.id)

  savePositionBtn.hidden = !selectedHasUnsavedPosition
  savePositionBtn.disabled = !selectedHasUnsavedPosition || positionSaveBusy
  savePositionBtn.textContent = positionSaveBusy
    ? 'Se salvează poziția...'
    : 'Salvează poziția · F'

  if (!editorActive && isTaxonomyManagerOpen()) {
    closeTaxonomyManager()
  }

  if (!editorActive && isMediaManagerOpen()) {
    closeMediaManager()
  }

  if (!editorActive && isFileManagerOpen()) {
    closeFileManager()
  }

  if (!editorActive && isCodeManagerOpen()) {
    closeCodeManager()
  }

  if (!editorActive && isPublicContentManagerOpen()) {
    closePublicContentManager()
  }

  if (!editorActive && isRoadmapManagerOpen()) {
    closeRoadmapManager()
  }

  if (isTeamSetupOpen() && !canManageCurrentTeam() && !editorActive) {
    closeTeamSetup()
  }

  if (isTeamMembersManagerOpen() && !canManageTeamMembers()) {
    closeTeamMembersManager()
  }

  if (isTeamContentManagerOpen() && !canManageAnyTeamContent()) {
    closeTeamContentManager()
  }

  createBtn.disabled = editorBlocked

  editBtn.disabled = editorBlocked || !hasSelectedNode

  deleteBtn.disabled = editorBlocked || !hasSelectedNode

  relationBtn.disabled = editorBlocked || !hasNodes

  const edgeInfo = selectedEdgeInfo()
  const edgePointCount = edgeInfo?.link?.controlPoints?.length || 0

  addEdgePointBtn.disabled =
    editorBlocked || !selectedEdge || edgePointCount >= MAX_EDGE_CONTROL_POINTS

  removeEdgePointBtn.disabled = editorBlocked || !selectedEdge || edgePointCount === 0

  resetEdgePathBtn.disabled = editorBlocked || !selectedEdge || edgePointCount === 0

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

  fitSelectionBtn.disabled = isAtlasLoading || (!selectedEdge && !hasSelectedNode)

  resetViewBtn.disabled = isAtlasLoading

  if (isAtlasLoading || !editorActive) {
    undoBtn.disabled = true
    redoBtn.disabled = true
  }

  if (modalMode === 'tutorial' && modalBackdrop.classList.contains('open')) {
    applyTutorialPermissions()
  }
}

function setEditorMode(nextValue) {
  if (nextValue && !canEdit) {
    alert('Trebuie să fii autentificat ca editor.')
    return
  }

  editorMode = Boolean(nextValue)

  localStorage.setItem(CACHE_KEYS.editorMode, editorMode ? '1' : '0')

  if (!editorMode) {
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
  if (!canEdit) {
    alert('Doar editorii aprobați pot modifica atlasul.')
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
  await loadNotifications({ render: false })

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

  if (isDouble && canEdit && editorMode) {
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
  if (!canEdit || !editorMode) return
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

    try {
      const updated = await updateEdgeControlPointsRemote(
        state.sourceId,
        state.targetId,
        currentInfo.link.controlPoints
      )

      currentInfo.link.controlPoints = normalizeEdgeControlPoints(updated.control_points)

      await refreshHistoryButtons()
      renderAll()
    } catch (error) {
      currentInfo.link.controlPoints = state.originalPoints.map((point) => ({ ...point }))

      renderAll()
      alert(error.message || 'Traseul relației nu a putut fi salvat.')
    }
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
  if (!canEdit || !editorMode) return

  const info = selectedEdgeInfo()
  if (!info) {
    alert('Selectează mai întâi o muchie.')
    return
  }

  const target = findNode(info.link.targetId)
  if (!target) return

  const originalPoints = normalizeEdgeControlPoints(info.link.controlPoints)

  if (originalPoints.length >= MAX_EDGE_CONTROL_POINTS) {
    alert(`Poți folosi maximum ${MAX_EDGE_CONTROL_POINTS} puncte pe o muchie.`)
    return
  }

  const insertion = findEdgePointInsertion(info.source, target, originalPoints)

  const nextPoints = originalPoints.map((point) => ({ ...point }))
  nextPoints.splice(insertion.index, 0, insertion.point)

  info.link.controlPoints = nextPoints
  selectedEdgePointIndex = insertion.index
  renderAll()

  try {
    const updated = await updateEdgeControlPointsRemote(info.source.id, target.id, nextPoints)

    info.link.controlPoints = normalizeEdgeControlPoints(updated.control_points)

    await refreshHistoryButtons()
    renderAll()
  } catch (error) {
    info.link.controlPoints = originalPoints
    selectedEdgePointIndex = null
    renderAll()
    alert(error.message || 'Punctul nu a putut fi adăugat.')
  }
}

async function removeSelectedEdgeControlPoint() {
  if (!canEdit || !editorMode) return

  const info = selectedEdgeInfo()
  if (!info) {
    alert('Selectează mai întâi o muchie.')
    return
  }

  const originalPoints = normalizeEdgeControlPoints(info.link.controlPoints)

  if (originalPoints.length === 0) return

  const pointIndex =
    Number.isInteger(selectedEdgePointIndex) &&
    selectedEdgePointIndex >= 0 &&
    selectedEdgePointIndex < originalPoints.length
      ? selectedEdgePointIndex
      : originalPoints.length - 1

  const nextPoints = originalPoints.map((point) => ({ ...point }))
  nextPoints.splice(pointIndex, 1)

  info.link.controlPoints = nextPoints
  selectedEdgePointIndex = nextPoints.length ? Math.min(pointIndex, nextPoints.length - 1) : null

  renderAll()

  try {
    const updated = await updateEdgeControlPointsRemote(
      info.source.id,
      info.link.targetId,
      nextPoints
    )

    info.link.controlPoints = normalizeEdgeControlPoints(updated.control_points)

    await refreshHistoryButtons()
    renderAll()
  } catch (error) {
    info.link.controlPoints = originalPoints
    selectedEdgePointIndex = pointIndex
    renderAll()
    alert(error.message || 'Punctul nu a putut fi șters.')
  }
}

async function resetEdgeControl(sourceId, targetId) {
  if (!canEdit || !editorMode) return

  const info = getEdgeInfo(sourceId, targetId)
  if (!info) return

  const originalPoints = normalizeEdgeControlPoints(info.link.controlPoints)

  info.link.controlPoints = []
  selectedEdgePointIndex = null
  renderAll()

  try {
    const updated = await updateEdgeControlPointsRemote(sourceId, targetId, [])

    info.link.controlPoints = normalizeEdgeControlPoints(updated.control_points)

    await refreshHistoryButtons()
    renderAll()
  } catch (error) {
    info.link.controlPoints = originalPoints
    renderAll()
    alert(error.message || 'Traseul automat nu a putut fi restaurat.')
  }
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
        edgeSelected && canEdit && editorMode
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
    el.className = `node ${node.id === selectedId ? 'active' : ''}`
    el.style.left = `${node.x}px`
    el.style.top = `${node.y}px`
    el.style.width = `${nodeWidthValue}px`
    el.style.height = `${nodeHeightValue}px`
    el.style.minHeight = `${nodeHeightValue}px`

    const tagNames = nodeTagNames(node)
    const resizeHandles =
      canEdit && editorMode && node.id === selectedId
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
        ${node.id === selectedId ? `<span class="open-mark">${canEdit && editorMode ? '2× open' : 'open'}</span>` : ''}
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
        if (!canEdit || !editorMode) return
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

      if (!canEdit || !editorMode || interactionMode !== 'drag') {
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

      ;(async () => {
        try {
          const updated = await updateNodeRemote({
            ...node,
            x: free.x,
            y: free.y
          })

          node.x = Number(updated.x)
          node.y = Number(updated.y)
          if (hasUnsavedNodePosition(node.id)) {
            clearUnsavedNodePosition()
          }
          selectedId = node.id
          clearEdgeSelection()
          saveCachedNodes()
          renderAll()
          await refreshHistoryButtons()
        } catch (error) {
          console.error('Move node failed:', error)
          alert(`Eroare la mutarea nodului: ${error?.message || 'necunoscută'}`)
          await fetchAllData()
        }
      })()
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

      if (event.pointerType === 'touch' && canEdit && editorMode) {
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
        if (!canEdit || !editorMode) return
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

          node.width = Math.round(nextWidth)
          node.height = Math.round(nextHeight)
          renderAll()

          try {
            const updated = await updateNodeGeometryRemote(node)
            node.width = updated.width == null ? null : Number(updated.width)
            node.height = updated.height == null ? null : Number(updated.height)
            await refreshHistoryButtons()
            renderAll()
          } catch (error) {
            node.width = originalWidth
            node.height = originalHeight
            renderAll()
            alert(error.message || 'Dimensiunea nodului nu a putut fi salvată.')
          }
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
          canEdit && editorMode
            ? 'Folosește „+ Punct muchie”, apoi trage fiecare punct numerotat.'
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

  const unsavedPositionText = hasUnsavedNodePosition(node.id)
    ? '<br><strong>Poziție nesalvată</strong> · apasă F sau „Salvează poziția”.'
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
    modeStrip.classList.remove('show')
    modeStrip.innerHTML = ''
    relationBtn.classList.remove('active')
    relationBtn.textContent = 'Adaugă relație'
    return
  }

  relationBtn.classList.add('active')
  relationBtn.textContent = 'Anulează'
  modeStrip.classList.add('show')

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
    <strong>${items.length}</strong>
    ${items.length === 1 ? 'element media' : 'elemente media'}.
    Imaginile și videoclipurile apar sub documentația nodului.
  `

  if (items.length === 0) {
    mediaManagerList.innerHTML = `
      <div class="media-manager-empty">
        <strong>Nicio imagine sau filmare</strong>
        <span>Încarcă un screenshot/video ori adaugă un link YouTube.</span>
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
  const body = mediaManagerBackdrop.querySelector('.media-manager-body')
  const previousScrollTop = body?.scrollTop || 0

  await fetchAllData()
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
  const storagePath = `${PROJECT_ID}/${node.id}/${Date.now()}-${safeName}`
  const nextOrder =
    (node.media || []).reduce((max, item) => Math.max(max, Number(item.sortOrder || 0)), 0) + 10

  setMediaMutationBusy(true, `Se încarcă ${file.name}...`)

  let uploaded = false

  try {
    const { error: uploadError } = await supabase.storage
      .from(MEDIA_BUCKET)
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
        .from(MEDIA_BUCKET)
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
      const { error: storageError } = await supabase.storage
        .from(MEDIA_BUCKET)
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
  const folderCount = new Set(items.map((item) => item.relativePath || '').filter(Boolean)).size
  const totalSize = items.reduce((sum, item) => sum + Number(item.fileSize || 0), 0)

  fileManagerTitle.textContent = `Fișiere · ${node.title}`
  fileManagerSummary.innerHTML = `
    <strong>${items.length}</strong> ${items.length === 1 ? 'fișier' : 'fișiere'} ·
    <strong>${folderCount}</strong> ${folderCount === 1 ? 'cale de folder' : 'căi de folder'} ·
    ${escapeHtml(humanFileSize(totalSize))} total.
  `

  if (items.length === 0) {
    fileManagerList.innerHTML = `
      <div class="file-manager-empty">
        <strong>Niciun fișier atașat</strong>
        <span>Poți încărca fișiere individuale sau un folder întreg.</span>
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
  const body = fileManagerBackdrop.querySelector('.file-manager-body')
  const previousScrollTop = body?.scrollTop || 0

  await fetchAllData()
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
      const relativePath = preserveFolders ? folderPathFromBrowserFile(file) : ''
      const storagePath = storagePathForNodeFile(node.id, file, relativePath, batchId)
      const contentType = file.type || 'application/octet-stream'

      fileManagerStatus.textContent = `Se încarcă ${index + 1}/${batch.length}: ${file.name}`

      const { error: uploadError } = await supabase.storage.from(FILE_BUCKET).upload(storagePath, file, {
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
      await supabase.storage.from(FILE_BUCKET).remove(uploadedPaths).catch(() => {})
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
      const { error: storageError } = await supabase.storage.from(FILE_BUCKET).remove([file.storagePath])
      if (storageError) console.warn('File storage cleanup failed:', storageError)
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

  if (!savedNodeId || !canEdit || !editorMode || !findNode(savedNodeId)) {
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

  codeManagerTitle.textContent = `Nod cod · ${node.title}`
  codeManagerSummary.innerHTML = `
    <strong>${items.length}</strong>
    ${items.length === 1 ? 'snippet de cod' : 'snippet-uri de cod'}.
    Fiecare exemplu apare în documentație cu buton de copiere.
  `

  if (items.length === 0) {
    codeManagerList.innerHTML = `
      <div class="code-manager-empty">
        <strong>Niciun snippet încă</strong>
        <span>Scrie sau lipește primul exemplu folosind formularul de mai sus.</span>
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
  const body = codeManagerBackdrop.querySelector('.code-manager-body')
  const previousScrollTop = body?.scrollTop || 0

  await fetchAllData()
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
function renderDetailPanel() {
  const node = selectedNode()

  if (!node || !detailOpen || !matchesTaxonomyFilters(node) || !matchesSearch(node)) {
    detailPanel.classList.remove('open')
    emptyPanel.style.display = 'none'
    editBtn.disabled = !node || !canEdit || !editorMode
    deleteBtn.disabled = !node || !canEdit || !editorMode
    return
  }

  const categoryName = nodeCategoryName(node)
  const difficultyName = nodeDifficultyName(node)
  const tagNames = nodeTagNames(node)

  const relations =
    node.links
      .map((link, index) => {
        const target = findNode(link.targetId)
        if (!target) return ''

        return `
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
    `
      })
      .join('') ||
    '<div class="relation-item"><div><strong>Nicio relație încă</strong><span>Poți adăuga una din Editor Mode.</span></div></div>'

  detailPanel.innerHTML = `
    <div class="detail-top">
      <div class="detail-meta">
        <div>
          <div class="node-badges">
            <span class="pill category-pill">${escapeHtml(categoryName)}</span>
            <span class="pill difficulty-pill">${escapeHtml(difficultyName)}</span>
          </div>
          <h2 class="detail-title">${escapeHtml(node.title)}</h2>
          <div class="detail-sub">Documentația ocupă tot ecranul. Închide cu X pentru a reveni la hartă.</div>
        </div>
        <div class="icon-actions">
          <button class="icon-btn" id="detailCodeBtn" aria-label="Nod cod">&lt;/&gt;</button>
          <button class="icon-btn" id="detailMediaBtn" aria-label="Media">▣</button>
          <button class="icon-btn" id="detailFilesBtn" aria-label="Fișiere">📎</button>
          <button class="icon-btn" id="detailAddRelationBtn" aria-label="Add relation">＋</button>
          <button class="icon-btn" id="detailEditBtn" aria-label="Edit">✎</button>
          <button class="icon-btn" id="detailDeleteBtn" aria-label="Delete">🗑</button>
        </div>
        <button class="icon-btn" id="detailCloseBtn" aria-label="Close">✕</button>
      </div>
    </div>
    <div class="detail-content">
      <div class="quick-facts">
        <div class="fact-box"><strong>Categorie</strong><span>${escapeHtml(categoryName)}</span></div>
        <div class="fact-box"><strong>Dificultate</strong><span>${escapeHtml(difficultyName)}</span></div>
        <div class="fact-box">
          <strong>Etichete</strong>
          <div class="detail-tags">
            ${
              tagNames.length
                ? tagNames
                    .map((name) => `<span class="mini-tag">${escapeHtml(name)}</span>`)
                    .join('')
                : '<span>Fără etichete</span>'
            }
          </div>
        </div>
        <div class="relation-card">
          <div class="relation-card-label">relații</div>
          <div class="relations-list">${relations}</div>
        </div>
      </div>

      <div class="detail-main-column">
        <div class="info-card">
          <div class="info-card-label">documentație</div>
          ${renderNodeDocumentation(node)}
        </div>

        ${renderNodeCodeSnippets(node)}

        ${renderNodeMediaGallery(node)}

        ${renderNodeFiles(node)}
      </div>
    </div>
  `

  detailPanel.classList.add('open')
  emptyPanel.style.display = 'none'
  editBtn.disabled = !canEdit || !editorMode
  deleteBtn.disabled = !canEdit || !editorMode

  const detailCodeBtn = document.getElementById('detailCodeBtn')
  const detailMediaBtn = document.getElementById('detailMediaBtn')
  const detailFilesBtn = document.getElementById('detailFilesBtn')
  const detailAddRelationBtn = document.getElementById('detailAddRelationBtn')
  const detailEditBtn = document.getElementById('detailEditBtn')
  const detailDeleteBtn = document.getElementById('detailDeleteBtn')
  const detailCloseBtn = document.getElementById('detailCloseBtn')

  const hideEditorActions = !canEdit || !editorMode

  detailCodeBtn.hidden = hideEditorActions
  detailMediaBtn.hidden = hideEditorActions
  detailFilesBtn.hidden = hideEditorActions
  detailAddRelationBtn.hidden = hideEditorActions
  detailEditBtn.hidden = hideEditorActions
  detailDeleteBtn.hidden = hideEditorActions

  detailCodeBtn.disabled = hideEditorActions
  detailMediaBtn.disabled = hideEditorActions
  detailFilesBtn.disabled = hideEditorActions
  detailAddRelationBtn.disabled = hideEditorActions
  detailEditBtn.disabled = hideEditorActions
  detailDeleteBtn.disabled = hideEditorActions

  detailCodeBtn.addEventListener('click', () => openCodeManager(node.id))
  detailMediaBtn.addEventListener('click', () => openMediaManager(node.id))
  detailFilesBtn.addEventListener('click', () => openFileManager(node.id))
  detailAddRelationBtn.addEventListener('click', () => activateRelationMode(node.id))
  detailEditBtn.addEventListener('click', () => openEdit(node.id))
  detailDeleteBtn.addEventListener('click', () => {
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
  renderLinks()
  renderNodes()
  renderDetailPanel()
  updateAuthUI()

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
    nodeTagsField.style.display = mode === 'tutorial' ? 'none' : 'block'
    nodeContentField.style.display = 'block'
    relationTargetField.style.display = 'none'
    relationLabelField.style.display = 'none'
  } else {
    nodeFields.style.display = 'none'
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
  modalSubtitle.textContent =
    'Alegi separat categoria, dificultatea și etichetele. Nodul este poziționat automat într-un loc liber.'
  titleInput.value = 'New FTC Topic'

  const defaultCategoryId = categories.find((item) => item.is_active !== false)?.id || null
  const defaultDifficultyId = difficulties.find((item) => item.is_active !== false)?.id || null

  populateNodeTaxonomyFields(defaultCategoryId, defaultDifficultyId)
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

  editingId = id
  modalTitle.textContent = 'Editează nod'
  modalSubtitle.textContent =
    'Modifici categoria, dificultatea, etichetele și documentația într-un singur loc.'
  titleInput.value = node.title

  populateNodeTaxonomyFields(node.categoryId, node.difficultyId)
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
        tagIds,
        content,
        contentFormat,
        x: startPos.x,
        y: startPos.y
      })

      const newNode = {
        id: Number(inserted.id),
        title: inserted.title,
        legacyTag: inserted.tag,
        categoryId: inserted.category_id == null ? categoryId : Number(inserted.category_id),
        difficultyId:
          inserted.difficulty_id == null ? difficultyId : Number(inserted.difficulty_id),
        tagIds,
        content: inserted.content,
        contentFormat: inserted.content_format || contentFormat,
        x: Number(inserted.x),
        y: Number(inserted.y),
        links: []
      }

      nodes.push(newNode)
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
        tagIds,
        content,
        contentFormat
      })

      node.title = updated.title
      node.legacyTag = updated.tag
      node.categoryId = updated.category_id == null ? categoryId : Number(updated.category_id)
      node.difficultyId =
        updated.difficulty_id == null ? difficultyId : Number(updated.difficulty_id)
      node.tagIds = tagIds
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

  const ok = confirm(`Sigur vrei să ștergi nodul "${node.title}"?`)

  if (!ok) return

  try {
    await deleteNodeRemote(node.id)

    const storedPaths = (node.media || []).map((media) => media.storagePath).filter(Boolean)
    const storedFilePaths = (node.files || []).map((file) => file.storagePath).filter(Boolean)

    if (storedPaths.length > 0) {
      const { error: storageCleanupError } = await supabase.storage
        .from(MEDIA_BUCKET)
        .remove(storedPaths)

      if (storageCleanupError) {
        console.warn('Node media storage cleanup failed:', storageCleanupError)
      }
    }

    if (storedFilePaths.length > 0) {
      const { error: fileStorageCleanupError } = await supabase.storage
        .from(FILE_BUCKET)
        .remove(storedFilePaths)

      if (fileStorageCleanupError) {
        console.warn('Node file storage cleanup failed:', fileStorageCleanupError)
      }
    }

    nodes = nodes
      .filter((currentNode) => Number(currentNode.id) !== Number(node.id))
      .map((currentNode) => ({
        ...currentNode,
        links: (currentNode.links || []).filter((link) => Number(link.targetId) !== Number(node.id))
      }))

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
    if (relationMode.active) deactivateRelationMode()
    else activateRelationMode()
  })().catch((error) => alert(error.message || 'Modul relație nu a putut fi schimbat.'))
})
editEdgeBtn.addEventListener('click', () => {
  openSelectedEdgeEdit()
})
deleteEdgeBtn.addEventListener('click', () => {
  deleteSelectedEdge().catch((error) => alert(error.message || 'Eroare la ștergerea muchiei.'))
})
undoBtn.addEventListener('click', () => {
  ;(async () => {
    if (!(await confirmUnsavedPositionBeforeLeaving())) return
    await undo()
  })().catch((error) => alert(error.message || 'Eroare la undo.'))
})
redoBtn.addEventListener('click', () => {
  ;(async () => {
    if (!(await confirmUnsavedPositionBeforeLeaving())) return
    await redo()
  })().catch((error) => alert(error.message || 'Eroare la redo.'))
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

savePositionBtn.addEventListener('click', () => {
  saveUnsavedNodePosition().catch((error) => {
    console.error('Position save button failed:', error)
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
  if (!currentTeamMembership()) return
  selectPublicSection('team')
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

closeTeamContentManagerBtn?.addEventListener('click', closeTeamContentManager)
closeTeamContentManagerFooterBtn?.addEventListener('click', closeTeamContentManager)

teamContentManagerBackdrop?.addEventListener('click', (event) => {
  if (event.target === teamContentManagerBackdrop) {
    closeTeamContentManager()
  }
})

document.querySelectorAll('[data-team-content-kind]').forEach((button) => {
  button.addEventListener('click', () => {
    if (teamContentMutationBusy) return

    teamContentManagerKind = button.dataset.teamContentKind
    resetTeamContentEditor()
    renderTeamContentManager()
  })
})

newTeamContentBtn?.addEventListener('click', () => {
  if (teamContentMutationBusy) return
  resetTeamContentEditor()
  renderTeamContentManager()
})

resetTeamContentEditorBtn?.addEventListener('click', () => {
  if (teamContentMutationBusy) return
  resetTeamContentEditor()
})

saveTeamContentBtn?.addEventListener('click', () => {
  saveTeamContent()
})

deleteTeamContentBtn?.addEventListener('click', () => {
  deleteTeamContent()
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

teamSetupBtn?.addEventListener('click', () => {
  openTeamSetup().catch((error) => {
    console.error('Open Team Setup failed:', error)
  })
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
  openRoadmapManager().catch((error) => {
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
  const workspaceTabButton = event.target.closest?.('[data-team-workspace-tab]')
  if (workspaceTabButton) {
    selectTeamWorkspaceTab(workspaceTabButton.dataset.teamWorkspaceTab)
    return
  }

  const teamContentManagerTrigger = event.target.closest?.(
    '[data-open-team-content-manager]'
  )
  if (teamContentManagerTrigger) {
    openTeamContentManager(
      teamContentManagerTrigger.dataset.openTeamContentManager
    ).catch((error) => {
      console.error('Open private team content manager failed:', error)
    })
    return
  }

  const teamContentEditButton = event.target.closest?.('[data-edit-team-content]')
  if (teamContentEditButton) {
    const item = currentTeamPrivateContent().find(
      (entry) =>
        Number(entry.id) === Number(teamContentEditButton.dataset.editTeamContent)
    )

    if (item) {
      openTeamContentManager(item.contentType, item.id).catch((error) => {
        console.error('Open private team content editor failed:', error)
      })
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

  const roadmapManagerTrigger = event.target.closest?.('[data-open-roadmap-manager]')
  if (roadmapManagerTrigger) {
    openRoadmapManager().catch((error) => {
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

publicSectionTabs?.querySelectorAll('[data-public-section]').forEach((button) => {
  button.addEventListener('click', () => {
    selectPublicSection(button.dataset.publicSection)
  })
})

notificationBtn?.addEventListener('click', (event) => {
  event.stopPropagation()

  if (notificationPanel?.hidden === false) {
    setNotificationPanel(false)
    return
  }

  openNotificationPanel().catch((error) => {
    console.error('Open Notification Center failed:', error)
  })
})

notificationFilters?.addEventListener('click', (event) => {
  const button = event.target.closest?.('[data-notification-filter]')
  if (!button) return

  notificationFilter = button.dataset.notificationFilter || 'all'
  renderNotificationCenter()
})

notificationList?.addEventListener('click', (event) => {
  const item = event.target.closest?.('[data-notification-id]')
  if (!item) return

  openNotification(Number(item.dataset.notificationId)).catch((error) => {
    console.error('Open notification failed:', error)
  })
})

notificationMarkAllBtn?.addEventListener('click', () => {
  markAllNotificationsRead()
})

accountBtn?.addEventListener('click', (event) => {
  event.stopPropagation()
  setAccountPanel(accountPanel?.hidden !== false)
})

document.addEventListener('click', (event) => {
  const target = event.target
  if (!(target instanceof Node)) return

  if (
    accountPanel &&
    !accountPanel.hidden &&
    !accountPanel.contains(target) &&
    !accountBtn?.contains(target)
  ) {
    setAccountPanel(false)
  }

  if (
    notificationPanel &&
    !notificationPanel.hidden &&
    !notificationPanel.contains(target) &&
    !notificationBtn?.contains(target)
  ) {
    setNotificationPanel(false)
  }
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

toolsHeader.addEventListener('click', (event) => {
  if (event.target === collapseBtn) return
  if (accountBtn && (event.target === accountBtn || accountBtn.contains(event.target))) return
  if (
    notificationBtn &&
    (event.target === notificationBtn || notificationBtn.contains(event.target))
  ) {
    return
  }
  togglePanel()
})

collapseBtn.addEventListener('click', (event) => {
  event.stopPropagation()
  togglePanel()
})

function togglePanel(force) {
  const collapsed = typeof force === 'boolean' ? force : !toolPanel.classList.contains('collapsed')

  toolPanel.classList.toggle('collapsed', collapsed)
  collapseBtn.textContent = collapsed ? '+' : '–'

  if (collapsed && accountPanel) {
    accountPanel.hidden = true
    accountBtn?.classList.remove('active')
    accountBtn?.setAttribute('aria-expanded', 'false')
  }

  if (collapsed && notificationPanel) {
    notificationPanel.hidden = true
    notificationBtn?.classList.remove('active')
    notificationBtn?.setAttribute('aria-expanded', 'false')
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

// Keyboard shortcuts and global lifecycle events
async function runHistoryActionWithUnsavedGuard(action) {
  if (!(await confirmUnsavedPositionBeforeLeaving())) return
  await action()
}

async function refreshHistoryButtons() {
  if (!canEdit || !editorMode) {
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

  if (!isTyping && canEdit && editorMode && !isAnyModalOpen() && event.key === 'Delete') {
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
    canEdit &&
    editorMode &&
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

  if (
    !isTyping &&
    canEdit &&
    editorMode &&
    !isAnyModalOpen() &&
    !event.ctrlKey &&
    !event.metaKey &&
    !event.altKey &&
    event.key.toLowerCase() === 'f' &&
    hasUnsavedNodePosition(selectedId)
  ) {
    event.preventDefault()
    saveUnsavedNodePosition().catch((error) => {
      console.error('F position save failed:', error)
    })
    return
  }

  if (
    !isTyping &&
    canEdit &&
    editorMode &&
    !isAnyModalOpen() &&
    !selectedEdge &&
    !event.ctrlKey &&
    !event.metaKey &&
    !event.altKey &&
    ['w', 'a', 's', 'd'].includes(event.key.toLowerCase())
  ) {
    event.preventDefault()
    startKeyboardNodeMovement(event.key)
    return
  }

  if (!isTyping && canEdit && editorMode && !isAnyModalOpen()) {
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
    else if (teamContentManagerBackdrop?.classList.contains('open')) {
      closeTeamContentManager()
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

window.addEventListener('popstate', () => {
  if (nodes.length === 0 || isAtlasLoading) return

  const routedNode = applyRouteFromLocation({ canonicalize: true })
  renderAll()

  if (routedNode) {
    requestAnimationFrame(() => centerOnNode(routedNode))
  }
})

window.addEventListener('beforeunload', (event) => {
  if (!hasUnsavedNodePosition()) return
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

window.addEventListener('focus', () => {
  if (!currentUser) return

  loadNotifications().catch((error) => {
    console.error('Notification refresh on focus failed:', error)
  })
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
      loadNotifications({ render: false })
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
    teamMemberships = []
    teamRecords = []
    teamMembers = []
    teamMemberDepartments = []
    teamEnabledDepartments = []
    teamInvites = []
    teamManagerInvites = []
    teamPrivateContent = []
    notifications = []
    notificationFilter = 'all'
    activeTeamId = null

    if (activePublicSection === 'team') {
      activePublicSection = 'explore'
      localStorage.setItem(CACHE_KEYS.publicSection, activePublicSection)
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
      await loadNotifications({ render: false })

      updateAuthUI()
      renderAll()
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
  openTeamContentManager,
  openNotificationPanel,
  loadNotifications,
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
