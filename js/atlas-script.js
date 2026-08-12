import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

console.log('ATLAS SCRIPT LOADED v30 · MULTI-POINT EDGES')

// Project configuration and application limits
const SUPABASE_URL = 'https://sznohntrlyynbhdigdgb.supabase.co'
const SUPABASE_KEY = 'sb_publishable_Qv7L9k8PD2zN1LKuXXHzMQ_FfGDR_e4'
const PROJECT_ID = 'ftc-main'
const MEDIA_BUCKET = 'atlas-media'
const MAX_MEDIA_FILE_SIZE = 50 * 1024 * 1024
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
  codeManagerOpen: 'ftc_atlas_code_manager_open_v1'
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

- un click sau tap = deschide documentația full-screen
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

Nodurile, relațiile, categoriile, dificultățile, etichetele, media, snippet-urile de cod și tutorialul sunt în Supabase.`

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
let tutorialContent = DEFAULT_TUTORIAL_CONTENT
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

let codeManagerNodeId = null
let codeMutationBusy = false
let codeDraftSaveTimer = null

let edgeClickState = { key: null, time: 0 }
let panState = null

// Frequently used DOM references
const mapSurface = document.getElementById('mapSurface')
const world = document.getElementById('world')
const nodeLayer = document.getElementById('nodeLayer')
const linkLayer = document.getElementById('linkLayer')
const detailPanel = document.getElementById('detailPanel')
const emptyPanel = document.getElementById('emptyPanel')
const searchInput = document.getElementById('searchInput')
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

const editorToolsSection = document.getElementById('editorToolsSection')

const taxonomyManagerBtn = document.getElementById('taxonomyManagerBtn')

const mediaManagerBtn = document.getElementById('mediaManagerBtn')

const codeManagerBtn = document.getElementById('codeManagerBtn')

const resetViewBtn = document.getElementById('resetViewBtn')
const fitSelectionBtn = document.getElementById('fitSelectionBtn')
const nodeCount = document.getElementById('nodeCount')
const selectedStrip = document.getElementById('selectedStrip')
const modeStrip = document.getElementById('modeStrip')
const toolPanel = document.getElementById('toolPanel')
const toolsHeader = document.getElementById('toolsHeader')
const collapseBtn = document.getElementById('collapseBtn')
const authStatusBox = document.getElementById('authStatusBox')
const authEmailInput = document.getElementById('authEmailInput')
const loginBtn = document.getElementById('loginBtn')
const logoutBtn = document.getElementById('logoutBtn')

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

// Node and relationship selection helpers
function selectedNode() {
  return nodes.find((node) => String(node.id) === String(selectedId)) || null
}

function findNode(id) {
  return nodes.find((node) => String(node.id) === String(id)) || null
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
  selectedId = Number(nodeId)
  clearEdgeSelection()

  if (relationMode.active) {
    handleRelationNodeClick(Number(nodeId))
    return
  }

  detailOpen = true
  renderAll()
}

function selectEdge(sourceId, targetId) {
  console.log('selectEdge', { sourceId, targetId })
  selectedEdge = { sourceId: Number(sourceId), targetId: Number(targetId) }
  selectedEdgePointIndex = null
  selectedId = Number(sourceId)
  detailOpen = false
  renderAll()
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
    node.content,
    nodeCategoryName(node),
    nodeDifficultyName(node),
    ...nodeTagNames(node),
    ...(node.media || []).flatMap((media) => [media.title || '', media.caption || '']),
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
  return nodes.filter((node) => matchesSearch(node) && matchesTaxonomyFilters(node))
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
    codeManagerBackdrop.classList.contains('open') ||
    taxonomyManagerBackdrop.classList.contains('open') ||
    taxonomyItemBackdrop.classList.contains('open') ||
    taxonomyReplaceBackdrop.classList.contains('open')
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

      if (nodes.length === 0) {
        showEmptyAtlasState()
        return true
      }

      hideAtlasStatus()

      requestAnimationFrame(() => {
        fitView()
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
    nodeTagsResult,
    mediaResult,
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

    supabase.from('atlas_node_tags').select('node_id, tag_id').eq('project_id', PROJECT_ID),

    supabase
      .from('atlas_node_media')
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
    nodeTagsResult,
    mediaResult,
    codeResult,
    tutorialResult
  ]) {
    if (result.error) throw result.error
  }

  categories = categoriesResult.data || []
  difficulties = difficultiesResult.data || []
  taxonomyTags = tagsResult.data || []
  tutorialContent = tutorialResult.data?.content || DEFAULT_TUTORIAL_CONTENT

  normalizeTaxonomyState()

  const nodesData = nodesResult.data || []
  const edgesData = edgesResult.data || []
  const nodeTagsData = nodeTagsResult.data || []
  const mediaData = mediaResult.data || []
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
    tagIds: tagsByNode.get(Number(node.id)) || [],
    x: Number(node.x),
    y: Number(node.y),
    width: node.width == null ? null : Number(node.width),
    height: node.height == null ? null : Number(node.height),
    content: node.content,
    links: edgesBySource.get(Number(node.id)) || [],
    media: mediaByNode.get(Number(node.id)) || [],
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
  const { data, error } = await supabase.rpc('atlas_create_node_v2', {
    p_project_id: PROJECT_ID,
    p_title: node.title,
    p_category_id: node.categoryId,
    p_difficulty_id: node.difficultyId,
    p_tag_ids: node.tagIds || [],
    p_x: Number(node.x),
    p_y: Number(node.y),
    p_content: node.content
  })

  if (error) throw error
  return normalizeRpcRow(data, 'Nodul creat')
}

async function updateNodeRemote(node) {
  const { data, error } = await supabase.rpc('atlas_update_node_v2', {
    p_project_id: PROJECT_ID,
    p_node_id: Number(node.id),
    p_title: node.title,
    p_category_id: node.categoryId,
    p_difficulty_id: node.difficultyId,
    p_tag_ids: node.tagIds || [],
    p_x: Number(node.x),
    p_y: Number(node.y),
    p_content: node.content
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
  mediaManagerBtn.disabled = editorBlocked || !hasSelectedNode
  codeManagerBtn.disabled = editorBlocked || !hasSelectedNode

  if (!editorActive && isTaxonomyManagerOpen()) {
    closeTaxonomyManager()
  }

  if (!editorActive && isMediaManagerOpen()) {
    closeMediaManager()
  }

  if (!editorActive && isCodeManagerOpen()) {
    closeCodeManager()
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
    closeCodeManager()
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

  updateAuthUI()
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
  alert('Magic link trimis.')
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
        <g class="edge-group ${edgeSelected ? 'selected' : ''}">
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
    const el = document.createElement('button')
    el.type = 'button'
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
        ${node.id === selectedId ? '<span class="open-mark">open</span>' : ''}
      </div>
      <h3 class="node-title">${escapeHtml(node.title)}</h3>
      <p class="node-preview">${escapeHtml(node.content)}</p>
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

    el.addEventListener('pointerdown', (event) => {
      if (event.button !== 0 && event.pointerType !== 'touch') return
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

  selectedStrip.innerHTML = `
    <strong>${escapeHtml(node.title)}</strong><br>
    ${escapeHtml(nodeCategoryName(node))} ·
    ${escapeHtml(nodeDifficultyName(node))} ·
    ${node.links.length} relații ·
    ${Math.round(width)} × ${Math.round(height)} px
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
      <div class="relation-item">
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
          <div class="doc-text">${escapeHtml(node.content)}</div>
        </div>

        ${renderNodeCodeSnippets(node)}

        ${renderNodeMediaGallery(node)}
      </div>
    </div>
  `

  detailPanel.classList.add('open')
  emptyPanel.style.display = 'none'
  editBtn.disabled = !canEdit || !editorMode
  deleteBtn.disabled = !canEdit || !editorMode

  const detailCodeBtn = document.getElementById('detailCodeBtn')
  const detailMediaBtn = document.getElementById('detailMediaBtn')
  const detailAddRelationBtn = document.getElementById('detailAddRelationBtn')
  const detailEditBtn = document.getElementById('detailEditBtn')
  const detailDeleteBtn = document.getElementById('detailDeleteBtn')
  const detailCloseBtn = document.getElementById('detailCloseBtn')

  const hideEditorActions = !canEdit || !editorMode

  detailCodeBtn.hidden = hideEditorActions
  detailMediaBtn.hidden = hideEditorActions
  detailAddRelationBtn.hidden = hideEditorActions
  detailEditBtn.hidden = hideEditorActions
  detailDeleteBtn.hidden = hideEditorActions

  detailCodeBtn.disabled = hideEditorActions
  detailMediaBtn.disabled = hideEditorActions
  detailAddRelationBtn.disabled = hideEditorActions
  detailEditBtn.disabled = hideEditorActions
  detailDeleteBtn.disabled = hideEditorActions

  detailCodeBtn.addEventListener('click', () => openCodeManager(node.id))
  detailMediaBtn.addEventListener('click', () => openMediaManager(node.id))
  detailAddRelationBtn.addEventListener('click', () => activateRelationMode(node.id))
  detailEditBtn.addEventListener('click', () => openEdit(node.id))
  detailDeleteBtn.addEventListener('click', () => {
    deleteSelected().catch((error) => alert(error.message || 'Eroare la ștergere.'))
  })
  detailCloseBtn.addEventListener('click', () => {
    detailOpen = false
    renderAll()
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

  const visibleCount = getVisibleNodes().length
  nodeCount.textContent = hasActiveFilters()
    ? `${visibleCount} / ${nodes.length}`
    : String(nodes.length)

  renderSelectedStrip()
  renderModeStrip()
  renderLinks()
  renderNodes()
  renderDetailPanel()
  updateAuthUI()

  if (isTaxonomyManagerOpen()) {
    renderTaxonomyManager()
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

  contentInput.value = `Scrie aici documentația completă.

Poți explica simplu conceptul, de ce e important, cum îl folosiți pe robot și ce greșeli apar cel mai des.`

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

  contentInput.value = node.content
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
  const content = contentInput.value.trim() || 'Fără documentație încă.'

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
        content
      })

      node.title = updated.title
      node.legacyTag = updated.tag
      node.categoryId = updated.category_id == null ? categoryId : Number(updated.category_id)
      node.difficultyId =
        updated.difficulty_id == null ? difficultyId : Number(updated.difficulty_id)
      node.tagIds = tagIds
      node.content = updated.content
      node.x = Number(updated.x)
      node.y = Number(updated.y)

      selectedId = node.id
      clearEdgeSelection()
    }

    detailOpen = true
    saveCachedNodes()
    closeModal()
    renderAll()
    await refreshHistoryButtons()
  } catch (error) {
    console.error('Save node failed FULL:', error)
    alert(`Eroare la salvare nod: ${error?.message || 'necunoscută'}`)
    await fetchAllData()
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

    if (storedPaths.length > 0) {
      const { error: storageCleanupError } = await supabase.storage
        .from(MEDIA_BUCKET)
        .remove(storedPaths)

      if (storageCleanupError) {
        console.warn('Node media storage cleanup failed:', storageCleanupError)
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
createBtn.addEventListener('click', openCreate)
editBtn.addEventListener('click', () => {
  const node = selectedNode()
  if (node) openEdit(node.id)
})
deleteBtn.addEventListener('click', () => {
  deleteSelected().catch((error) => alert(error.message || 'Eroare la ștergere.'))
})
relationBtn.addEventListener('click', () => {
  if (relationMode.active) deactivateRelationMode()
  else activateRelationMode()
})
editEdgeBtn.addEventListener('click', () => {
  openSelectedEdgeEdit()
})
deleteEdgeBtn.addEventListener('click', () => {
  deleteSelectedEdge().catch((error) => alert(error.message || 'Eroare la ștergerea muchiei.'))
})
undoBtn.addEventListener('click', () => {
  undo().catch((error) => alert(error.message || 'Eroare la undo.'))
})
redoBtn.addEventListener('click', () => {
  redo().catch((error) => alert(error.message || 'Eroare la redo.'))
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
  setEditorMode(!editorMode)
})

taxonomyManagerBtn.addEventListener('click', () => {
  openTaxonomyManager()
})

mediaManagerBtn.addEventListener('click', () => {
  openMediaManager()
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

loginBtn.addEventListener('click', () => {
  sendMagicLink().catch((error) => alert(error.message || 'Eroare la login.'))
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
    undo().catch((error) => alert(error.message || 'Eroare la undo.'))
    return
  }

  if (
    !isTyping &&
    !isAnyModalOpen() &&
    (((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'y') ||
      ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key.toLowerCase() === 'z'))
  ) {
    event.preventDefault()
    redo().catch((error) => alert(error.message || 'Eroare la redo.'))
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
    else if (codeManagerBackdrop.classList.contains('open')) {
      closeCodeManager()
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
    } else if (relationMode.active) {
      deactivateRelationMode()
    }

    return
  }

  if (!introDismissed) dismissIntro()
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
    return
  }

  if (!currentUser) {
    canEdit = false

    if (editorMode) {
      editorMode = false
      localStorage.setItem(CACHE_KEYS.editorMode, '0')
    }

    updateAuthUI()
    return
  }

  canEdit = false
  updateAuthUI()

  setTimeout(async () => {
    try {
      await refreshEditorAccess()

      updateAuthUI()
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
    relationMode
  }),
  deleteSelected,
  deleteSelectedEdge,
  openSelectedEdgeEdit,
  openMediaManager,
  openCodeManager,
  refreshSession,
  deleteNodeRemote,
  deleteEdgeRemote,
  updateEdgeRemote
}

// Application bootstrap
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
