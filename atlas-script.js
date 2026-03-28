import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

console.log('ATLAS SCRIPT LOADED v7')

const SUPABASE_URL = 'https://sznohntrlyynbhdigdgb.supabase.co'
const SUPABASE_KEY = 'sb_publishable_Qv7L9k8PD2zN1LKuXXHzMQ_FfGDR_e4'
const PROJECT_ID = 'ftc-main'

const ALLOWED_EDITORS = [
  'suiramgabor@gmail.com',
].map(email => email.trim().toLowerCase())

const CACHE_KEYS = {
  nodes: 'ftc_atlas_nodes_cache_v1',
  view: 'ftc_atlas_view_v1',
  history: 'ftc_atlas_history_v1',
  future: 'ftc_atlas_future_v1',
  panel: 'ftc_atlas_panel_v1',
  intro: 'ftc_atlas_intro_v1',
}

const HISTORY_LIMIT = 80
const DEFAULT_VIEW = { x: -120, y: -80, scale: 1 }

const WORLD_WIDTH = 2600
const WORLD_HEIGHT = 1800
const NODE_WIDTH = 230
const NODE_HEIGHT = 118
const NODE_GAP = 28
const DRAG_THRESHOLD = 5

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  }
})

function isAllowedEditor(email) {
  if (!email) return false
  return ALLOWED_EDITORS.includes(String(email).trim().toLowerCase())
}

const initialNodes = [
  {
    id: 1,
    title: 'TeleOp Basics',
    tag: 'Beginner',
    x: 140,
    y: 170,
    content: `TeleOp este modul în care controlezi robotul live, de pe gamepad.

Aici explici simplu ce este un OpMode, cum citești input-ul din gamepad, cum dai putere la motoare și de ce nu trebuie să pui toată logica într-o singură clasă uriașă.

În manual poți avea:
- schemă minimală de TeleOp
- input handling pe butoane și stick-uri
- toggle vs hold
- update loop și telemetry
- ce greșeli apar când amesteci tot în același fișier.`,
    links: [{ targetId: 3, label: 'bază pentru' }]
  },
  {
    id: 2,
    title: 'PID for Lift',
    tag: 'Control',
    x: 470,
    y: 270,
    content: `PID-ul te ajută să duci un mecanism la o poziție țintă într-un mod stabil.

Aici poți explica:
- ce înseamnă error
- de ce P reacționează imediat
- de ce D poate liniști oscilațiile
- ce rol are feedforward la glisieră
- cum arată un tuning prost vs unul bun

Foarte util: o secțiune clară cu probleme reale, de exemplu encoder invers, semn greșit, target uitat sau update care nu rulează constant.`,
    links: [{ targetId: 5, label: 'se leagă de' }]
  },
  {
    id: 3,
    title: 'Autonomous Flow',
    tag: 'Intermediate',
    x: 900,
    y: 180,
    content: `Aici explici pe înțelesul tuturor cum funcționează Autonomous: init, detectare, alegere rutină, state machine, path following și sincronizarea subsistemelor.

Capitol bun pentru:
- structura de start
- rolul detectării înainte de start
- state machine vs logică haotică
- cum legi pathing-ul de intake, lift sau scoring
- cum testezi o rutină fără să te pierzi în 500 de linii.`,
    links: [{ targetId: 4, label: 'folosește' }, { targetId: 6, label: 'depinde de' }]
  },
  {
    id: 4,
    title: 'PedroPathing',
    tag: 'Advanced',
    x: 640,
    y: 620,
    content: `Capitol dedicat pentru pathing.

Explici ce este pose, heading, follower, path chain, cum pornești de la un start pose corect și de ce localization-ul contează enorm.

Merită să pui:
- exemplu minim de follower
- diferența între traiectorie și poziție estimată
- probleme tipice când robotul merge bine pe translație dar prost pe rotație
- ce înseamnă să pornești din pose greșit
- exemple reale de la robotul vostru.`,
    links: [{ targetId: 6, label: 'are nevoie de' }]
  },
  {
    id: 5,
    title: 'Debugging Hub Issues',
    tag: 'Troubleshooting',
    x: 1150,
    y: 620,
    content: `Secțiune foarte practică pentru probleme reale: Expansion Hub care nu apare, Control Hub resetat, configurații ciudate, motoare care nu răspund, tensiune care cade sub load.

Asta poate deveni una dintre cele mai valoroase pagini pentru generațiile viitoare pentru că nu e teorie generică, ci experiență reală de echipă.`,
    links: []
  },
  {
    id: 6,
    title: 'Localization Basics',
    tag: 'Intermediate',
    x: 1430,
    y: 340,
    content: `Localization înseamnă estimarea poziției robotului pe teren.

Aici poți explica odometry, IMU, pose estimate, drift și de ce un robot aparent corect poate totuși să rateze pozițiile dacă localizarea nu este stabilă.

Ideal ar fi să ai și o comparație între ce crede robotul și unde este el de fapt.`,
    links: []
  }
]

function deepCopy(obj) {
  return JSON.parse(JSON.stringify(obj))
}

function loadCachedNodes() {
  return []
}

function saveCachedNodes() {
}

function loadView() {
  const saved = localStorage.getItem(CACHE_KEYS.view)
  if (!saved) return { ...DEFAULT_VIEW }

  try {
    const parsed = JSON.parse(saved)
    return {
      x: Number.isFinite(parsed.x) ? parsed.x : DEFAULT_VIEW.x,
      y: Number.isFinite(parsed.y) ? parsed.y : DEFAULT_VIEW.y,
      scale: Number.isFinite(parsed.scale) ? parsed.scale : DEFAULT_VIEW.scale,
    }
  } catch {
    return { ...DEFAULT_VIEW }
  }
}

function saveView() {
  localStorage.setItem(CACHE_KEYS.view, JSON.stringify(view))
}

function loadStack(key) {
  const saved = localStorage.getItem(key)
  if (!saved) return []
  try {
    const parsed = JSON.parse(saved)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function saveStacks() {
  localStorage.setItem(CACHE_KEYS.history, JSON.stringify(undoStack))
  localStorage.setItem(CACHE_KEYS.future, JSON.stringify(redoStack))
  updateUndoRedoButtons()
}

let nodes = [];
let selectedId = nodes[0]?.id ?? null
let selectedEdge = null
let detailOpen = false
let editingId = null
let searchQuery = ''
let introDismissed = localStorage.getItem(CACHE_KEYS.intro) === '1'
let relationMode = { active: false, sourceId: null }
let modalMode = 'node'
let relationDraft = { sourceId: null, targetId: null, label: '' }
let view = loadView()
let undoStack = loadStack(CACHE_KEYS.history)
let redoStack = loadStack(CACHE_KEYS.future)
let currentUser = null
let canEdit = false
let clickState = { id: null, time: 0 }
let edgeClickState = { key: null, time: 0 }
let panState = null

const mapSurface = document.getElementById('mapSurface')
const world = document.getElementById('world')
const nodeLayer = document.getElementById('nodeLayer')
const linkLayer = document.getElementById('linkLayer')
const detailPanel = document.getElementById('detailPanel')
const emptyPanel = document.getElementById('emptyPanel')
const searchInput = document.getElementById('searchInput')
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
const arrangeBtn = document.getElementById('arrangeBtn')
const tutorialBtn = document.getElementById('tutorialBtn')
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
const tagInput = document.getElementById('tagInput')
const contentInput = document.getElementById('contentInput')
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

function selectedNode() {
  return nodes.find(node => String(node.id) === String(selectedId)) || null
}

function findNode(id) {
  return nodes.find(node => String(node.id) === String(id)) || null
}

function getEdgeInfo(sourceId, targetId) {
  const source = findNode(sourceId)
  if (!source) return null
  const index = source.links.findIndex(link => Number(link.targetId) === Number(targetId))
  if (index === -1) return null
  return {
    source,
    index,
    link: source.links[index]
  }
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
}

function selectEdge(sourceId, targetId) {
  console.log('selectEdge', { sourceId, targetId })
  selectedEdge = { sourceId: Number(sourceId), targetId: Number(targetId) }
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
  const ok = confirm(`Sigur vrei să ștergi muchia "${info.source.title} → ${target?.title || 'nod'}"?`)
  if (!ok) return

  await removeRelation(info.source.id, info.index)
  selectedEdge = null
  renderAll()
}

function slugTag(tag) {
  return String(tag).toLowerCase().replace(/\s+/g, '-')
}

function matchesSearch(node) {
  if (!searchQuery.trim()) return true
  const q = searchQuery.trim().toLowerCase()
  return (
    node.title.toLowerCase().includes(q) ||
    node.tag.toLowerCase().includes(q) ||
    node.content.toLowerCase().includes(q)
  )
}

function escapeHtml(str) {
  return String(str)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
    .replaceAll('\n', '<br>')
}

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
  const targetX = node.x + NODE_WIDTH / 2
  const targetY = node.y + NODE_HEIGHT / 2
  view.x = window.innerWidth / 2 - targetX * view.scale
  view.y = window.innerHeight / 2 - targetY * view.scale
  applyView()
}

function fitView() {
  if (!nodes.length) return
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity

  nodes.forEach(node => {
    minX = Math.min(minX, node.x)
    minY = Math.min(minY, node.y)
    maxX = Math.max(maxX, node.x + NODE_WIDTH)
    maxY = Math.max(maxY, node.y + NODE_HEIGHT)
  })

  const pad = 120
  const width = maxX - minX + pad * 2
  const height = maxY - minY + pad * 2
  const scaleX = window.innerWidth / width
  const scaleY = window.innerHeight / height

  view.scale = clamp(Math.min(scaleX, scaleY), 0.45, 1.2)
  view.x = (window.innerWidth - width * view.scale) / 2 - (minX - pad) * view.scale
  view.y = (window.innerHeight - height * view.scale) / 2 - (minY - pad) * view.scale
  applyView()
}

function fitCurrentSelection() {
  if (selectedEdge) {
    const info = getEdgeInfo(selectedEdge.sourceId, selectedEdge.targetId)
    const target = info ? findNode(info.link.targetId) : null
    if (!info || !target) return

    const minX = Math.min(info.source.x, target.x) - 120
    const minY = Math.min(info.source.y, target.y) - 120
    const maxX = Math.max(info.source.x + NODE_WIDTH, target.x + NODE_WIDTH) + 120
    const maxY = Math.max(info.source.y + NODE_HEIGHT, target.y + NODE_HEIGHT) + 120

    const width = maxX - minX
    const height = maxY - minY
    const scaleX = window.innerWidth / width
    const scaleY = window.innerHeight / height

    view.scale = clamp(Math.min(scaleX, scaleY), 0.45, 1.35)
    view.x = (window.innerWidth - width * view.scale) / 2 - minX * view.scale
    view.y = (window.innerHeight - height * view.scale) / 2 - minY * view.scale
    applyView()
    return
  }

  const node = selectedNode()
  if (node) centerOnNode(node)
}

function getNodeMeta(tag) {
  const map = {
    Beginner: ['Nivel', 'Bază / onboarding', 'Bun pentru', 'primele lecții și setup'],
    Intermediate: ['Nivel', 'următorul pas logic', 'Bun pentru', 'structură și practică'],
    Advanced: ['Nivel', 'concepte serioase', 'Bun pentru', 'pathing, architecture, edge cases'],
    Control: ['Nivel', 'mecanică + logică', 'Bun pentru', 'PID, encodere, targeting'],
    Troubleshooting: ['Nivel', 'salvează timp la concurs', 'Bun pentru', 'diagnostic și checklist-uri'],
  }
  return map[tag] || ['Nivel', 'general', 'Bun pentru', 'documentație internă']
}

function nodeRect(node, x = node.x, y = node.y) {
  return { left: x, top: y, right: x + NODE_WIDTH, bottom: y + NODE_HEIGHT }
}

function rectsOverlap(a, b, gap = NODE_GAP) {
  return !(
    a.right + gap <= b.left ||
    a.left >= b.right + gap ||
    a.bottom + gap <= b.top ||
    a.top >= b.bottom + gap
  )
}

function overlapsAny(nodeId, x, y) {
  const rect = nodeRect({ x, y })
  return nodes.some(other => other.id !== nodeId && rectsOverlap(rect, nodeRect(other)))
}

function findNearestFreeSpot(nodeId, desiredX, desiredY) {
  const maxX = WORLD_WIDTH - NODE_WIDTH - 20
  const maxY = WORLD_HEIGHT - NODE_HEIGHT - 20
  const startX = clamp(desiredX, 20, maxX)
  const startY = clamp(desiredY, 20, maxY)

  if (!overlapsAny(nodeId, startX, startY)) return { x: startX, y: startY }

  const steps = [0, 1, -1, 2, -2, 3, -3, 4, -4, 5, -5, 6, -6]
  const radiusStep = 34

  for (let radius = 1; radius <= 28; radius++) {
    for (const dxStep of steps) {
      for (const dyStep of steps) {
        if (Math.abs(dxStep) !== radius && Math.abs(dyStep) !== radius) continue
        const x = clamp(startX + dxStep * radiusStep, 20, maxX)
        const y = clamp(startY + dyStep * radiusStep, 20, maxY)
        if (!overlapsAny(nodeId, x, y)) return { x, y }
      }
    }
  }

  return { x: startX, y: startY }
}

function ensureNodePositions() {
  
}

function generateNodeId() {
  return Date.now()
}

function flattenEdges(nodesArray) {
  const allEdges = []
  for (const node of nodesArray) {
    for (const link of (node.links || [])) {
      allEdges.push({
        project_id: PROJECT_ID,
        source_id: Number(node.id),
        target_id: Number(link.targetId),
        label: link.label || 'relație'
      })
    }
  }
  return allEdges
}

function updateUndoRedoButtons() {
  undoBtn.disabled = true
  redoBtn.disabled = true
}

function snapshotState() {
  return {
    nodes: deepCopy(nodes),
    selectedId,
    selectedEdge: selectedEdge ? { ...selectedEdge } : null,
    detailOpen,
    relationMode: deepCopy(relationMode),
    modalMode,
    relationDraft: deepCopy(relationDraft),
    view: { ...view },
  }
}

function restoreSnapshot(snapshot) {
  nodes = deepCopy(snapshot.nodes || [])
  selectedId = snapshot.selectedId ?? (nodes[0]?.id ?? null)
  selectedEdge = snapshot.selectedEdge ? { ...snapshot.selectedEdge } : null
  detailOpen = !!snapshot.detailOpen
  relationMode = snapshot.relationMode ? deepCopy(snapshot.relationMode) : { active: false, sourceId: null }
  modalMode = snapshot.modalMode || 'node'
  relationDraft = snapshot.relationDraft ? deepCopy(snapshot.relationDraft) : { sourceId: null, targetId: null, label: '' }
  view = snapshot.view ? { ...snapshot.view } : loadView()

  closeModal()
  saveCachedNodes()
  applyView()
  renderAll()
}

function pushHistory() {
  return
}

async function syncRemoteState() {
  return
}

async function undo() {
  alert('Undo este dezactivat temporar. Varianta veche îți poate goli atlasul din Supabase.')
}

async function redo() {
  alert('Redo este dezactivat temporar. Varianta veche îți poate goli atlasul din Supabase.')
}

async function seedInitialAtlas() {
  const seedNodes = deepCopy(initialNodes)
  const seedEdges = flattenEdges(seedNodes)

  const { error: insertNodesError } = await supabase
    .from('atlas_nodes')
    .insert(seedNodes.map(node => ({
      id: Number(node.id),
      project_id: PROJECT_ID,
      title: node.title,
      tag: node.tag,
      x: Number(node.x),
      y: Number(node.y),
      content: node.content
    })))
  if (insertNodesError) throw insertNodesError

  if (seedEdges.length) {
    const { error: insertEdgesError } = await supabase
      .from('atlas_edges')
      .insert(seedEdges)
    if (insertEdgesError) throw insertEdgesError
  }
}

async function fetchAllData({ allowSeed = true } = {}) {
  const { data: nodesData, error: nodesError } = await supabase
    .from('atlas_nodes')
    .select('*')
    .eq('project_id', PROJECT_ID)
    .order('id', { ascending: true })

  if (nodesError) throw nodesError

  const { data: edgesData, error: edgesError } = await supabase
    .from('atlas_edges')
    .select('*')
    .eq('project_id', PROJECT_ID)
    .order('source_id', { ascending: true })
    .order('target_id', { ascending: true })

  if (edgesError) throw edgesError

  if (!nodesData || nodesData.length === 0) {
    if (allowSeed && canEdit) {
        await seedInitialAtlas()
        return fetchAllData({ allowSeed: false })
    }

    nodes = []
    selectedId = null
    selectedEdge = null
    detailOpen = false
    renderAll()
     return
  }

  const edgesBySource = new Map()
  for (const edge of edgesData || []) {
    const sourceId = Number(edge.source_id)
    if (!edgesBySource.has(sourceId)) edgesBySource.set(sourceId, [])
    edgesBySource.get(sourceId).push({
      targetId: Number(edge.target_id),
      label: edge.label || 'relație'
    })
  }

  nodes = nodesData.map(node => ({
    id: Number(node.id),
    title: node.title,
    tag: node.tag,
    x: Number(node.x),
    y: Number(node.y),
    content: node.content,
    links: edgesBySource.get(Number(node.id)) || []
  }))

  ensureNodePositions()
  selectedId = nodes.find(n => String(n.id) === String(selectedId))?.id ?? nodes[0]?.id ?? null

  if (selectedEdge) {
    const stillExists = getEdgeInfo(selectedEdge.sourceId, selectedEdge.targetId)
    if (!stillExists) selectedEdge = null
  }

  saveCachedNodes()
  renderAll()
}

async function createNodeRemote(node) {
  const { data, error } = await supabase
    .from('atlas_nodes')
    .insert({
      project_id: PROJECT_ID,
      title: node.title,
      tag: node.tag,
      x: Number(node.x),
      y: Number(node.y),
      content: node.content
    })
    .select('*')
    .single()

  if (error) throw error
  return data
}

async function updateNodeRemote(node) {
  const { error } = await supabase
    .from('atlas_nodes')
    .update({
      title: node.title,
      tag: node.tag,
      x: Number(node.x),
      y: Number(node.y),
      content: node.content
    })
    .eq('project_id', PROJECT_ID)
    .eq('id', Number(node.id))

  if (error) throw error
}

async function deleteNodeRemote(nodeId) {
  const { error } = await supabase
    .from('atlas_nodes')
    .delete()
    .eq('project_id', PROJECT_ID)
    .eq('id', Number(nodeId))

  if (error) throw error
}

async function insertEdgeRemote(sourceId, targetId, label) {
  const { data, error } = await supabase
    .from('atlas_edges')
    .insert({
      project_id: PROJECT_ID,
      source_id: Number(sourceId),
      target_id: Number(targetId),
      label
    })
    .select('id, source_id, target_id, label')

  if (error) throw error

  if (!data || data.length === 0) {
    throw new Error('Insert edge failed. Muchia nu a fost creată.')
  }

  return data[0]
}

async function updateEdgeRemote(sourceId, targetId, label) {
  const { error } = await supabase
    .from('atlas_edges')
    .update({ label })
    .eq('project_id', PROJECT_ID)
    .eq('source_id', Number(sourceId))
    .eq('target_id', Number(targetId))

  if (error) throw error
}

async function deleteEdgeRemote(sourceId, targetId) {
  const { error } = await supabase
    .from('atlas_edges')
    .delete()
    .eq('project_id', PROJECT_ID)
    .eq('source_id', Number(sourceId))
    .eq('target_id', Number(targetId))

  if (error) throw error
}

async function nudgeSelectedNode(dx, dy) {
  if (!canEdit) return

  const node = selectedNode()
  if (!node) return

  pushHistory()

  const desiredX = clamp(node.x + dx, 20, WORLD_WIDTH - NODE_WIDTH - 20)
  const desiredY = clamp(node.y + dy, 20, WORLD_HEIGHT - NODE_HEIGHT - 20)
  const free = findNearestFreeSpot(node.id, desiredX, desiredY)

  node.x = free.x
  node.y = free.y

  saveCachedNodes()
  renderAll()

  try {
    await updateNodeRemote(node)
  } catch (error) {
    console.error('Move node failed:', error)
    alert(error.message || 'Eroare la mutarea nodului.')
    await fetchAllData()
  }
}

function updateAuthUI() {
  if (!currentUser) {
    authStatusBox.innerHTML = 'Neautentificat. Poți vedea atlasul, dar editarea este permisă doar colaboratorilor aprobați.'
  } else if (canEdit) {
    authStatusBox.innerHTML = `<strong>Logat ca editor:</strong><br>${escapeHtml(currentUser.email)}`
  } else {
    authStatusBox.innerHTML = `<strong>Logat doar pentru view:</strong><br>${escapeHtml(currentUser.email)}<br>Emailul nu este în ALLOWED_EDITORS.`
  }

  createBtn.disabled = !canEdit
  editBtn.disabled = !selectedNode() || !canEdit
  deleteBtn.disabled = !selectedNode() || !canEdit
  relationBtn.disabled = !canEdit
  arrangeBtn.disabled = !canEdit
  logoutBtn.disabled = !currentUser
  editEdgeBtn.disabled = !selectedEdge || !canEdit
  deleteEdgeBtn.disabled = !selectedEdge || !canEdit

  updateUndoRedoButtons()
}

function requireAuth() {
  if (canEdit) return true
  alert('Doar emailurile din ALLOWED_EDITORS pot edita atlasul.')
  return false
}

async function refreshSession() {
  const { data: sessionData } = await supabase.auth.getSession()
  currentUser = sessionData?.session?.user || null

  if (!currentUser) {
    const { data, error } = await supabase.auth.getUser()
    currentUser = error ? null : (data.user || null)
  }

  canEdit = isAllowedEditor(currentUser?.email)
  updateAuthUI()
}

async function sendMagicLink() {
  const email = authEmailInput.value.trim()
  if (!email) {
    alert('Scrie email-ul mai întâi.')
    return
  }

  const redirectTo = `${window.location.origin}${window.location.pathname}`

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: true,
      emailRedirectTo: redirectTo
    }
  })

  if (error) throw error
  alert('Magic link trimis. Verifică email-ul și deschide link-ul pe aceeași adresă a site-ului.')
}

async function signOutUser() {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

function handleEdgePick(sourceId, targetId) {
  if (relationMode.active) return

  const edgeKey = `${sourceId}-${targetId}`
  const now = Date.now()
  const isDouble = edgeClickState.key === edgeKey && now - edgeClickState.time < 320

  edgeClickState = { key: edgeKey, time: now }
  selectEdge(sourceId, targetId)

  if (isDouble && canEdit) {
    openSelectedEdgeEdit()
  }
}

function renderLinks() {
  linkLayer.setAttribute('viewBox', `0 0 ${WORLD_WIDTH} ${WORLD_HEIGHT}`)
  linkLayer.setAttribute('width', WORLD_WIDTH)
  linkLayer.setAttribute('height', WORLD_HEIGHT)

  const parts = []

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

  nodes.forEach(source => {
    source.links.forEach(link => {
      const target = findNode(link.targetId)
      if (!target) return

      const edgeSelected = isEdgeSelected(source.id, target.id)
      const highlight = edgeSelected || source.id === selectedId || target.id === selectedId

      const ax = source.x + NODE_WIDTH / 2
      const ay = source.y + NODE_HEIGHT / 2
      const bx = target.x + NODE_WIDTH / 2
      const by = target.y + NODE_HEIGHT / 2

      const dx = bx - ax
      const dy = by - ay
      const dist = Math.max(Math.hypot(dx, dy), 1)

      const mx = (ax + bx) / 2
      const my = (ay + by) / 2

      const nx = -dy / dist
      const ny = dx / dist

      const sign = source.id < target.id ? 1 : -1
      const bend = clamp(dist * 0.16, 34, 110) * sign

      const cx = mx + nx * bend
      const cy = my + ny * bend

      const pathD = `M ${ax} ${ay} Q ${cx} ${cy} ${bx} ${by}`

      const lx = 0.25 * ax + 0.5 * cx + 0.25 * bx
      const ly = 0.25 * ay + 0.5 * cy + 0.25 * by - 3

      const rawLabel = link.label || 'relație'
      const label = escapeHtml(rawLabel)
      const labelWidth = Math.max(76, rawLabel.length * 6.6)
      const labelX = -labelWidth / 2

      const baseColor = edgeSelected
        ? 'rgba(255, 77, 109, 0.52)'
        : highlight
          ? 'rgba(205, 112, 255, 0.34)'
          : 'rgba(177, 76, 255, 0.24)'

      const glowColor = edgeSelected
        ? 'rgba(255, 77, 109, 0.18)'
        : 'rgba(177, 76, 255, 0.10)'

      const flowColor = edgeSelected
        ? 'rgba(255, 190, 205, 0.98)'
        : highlight
          ? 'rgba(236, 200, 255, 0.96)'
          : 'rgba(216, 180, 255, 0.92)'

      const baseWidth = edgeSelected ? 2.5 : highlight ? 2.1 : 1.4
      const flowWidth = edgeSelected ? 2.6 : highlight ? 2.15 : 1.8
      const glowWidth = edgeSelected ? 8 : 6
      const duration = edgeSelected ? 1.05 : highlight ? 1.3 : 1.8

      parts.push(`
        <g class="edge-group ${edgeSelected ? 'selected' : ''}">
          <path class="edge-glow" d="${pathD}" fill="none" stroke="${glowColor}" stroke-width="${glowWidth}" stroke-linecap="round" />
          <path class="edge-base" d="${pathD}" fill="none" stroke="${baseColor}" stroke-width="${baseWidth}" stroke-linecap="round" />
          <path
            class="edge-flow"
            d="${pathD}"
            fill="none"
            stroke="${flowColor}"
            stroke-width="${flowWidth}"
            stroke-linecap="round"
            stroke-dasharray="4 24"
            marker-end="url(${edgeSelected ? '#edgeArrowHot' : '#edgeArrow'})"
            style="animation: circuitFlow ${duration}s linear infinite, circuitPulse 2s ease-in-out infinite; filter: drop-shadow(0 0 6px rgba(177,76,255,0.28));"
          />
          <g class="edge-label" transform="translate(${lx}, ${ly})">
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
          <path class="edge-hit" data-source="${source.id}" data-target="${target.id}" d="${pathD}"></path>
          <g class="edge-label-hit" data-source="${source.id}" data-target="${target.id}" transform="translate(${lx}, ${ly})">
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
        </g>
      `)
    })
  })

  linkLayer.innerHTML = parts.join('')

  linkLayer.querySelectorAll('.edge-hit, .edge-label-hit').forEach(hit => {
    hit.addEventListener('click', event => {
      event.stopPropagation()
      const sourceId = Number(hit.dataset.source)
      const targetId = Number(hit.dataset.target)
      handleEdgePick(sourceId, targetId)
    })
  })
}

function renderNodes() {
  nodeLayer.innerHTML = ''
  const orderedNodes = [...nodes].sort((a, b) => (a.id === selectedId ? 1 : b.id === selectedId ? -1 : 0))

  orderedNodes.forEach(node => {
    const el = document.createElement('button')
    el.type = 'button'
    el.className = `node ${node.id === selectedId ? 'active' : ''} ${matchesSearch(node) ? '' : 'search-hidden'}`
    el.style.left = `${node.x}px`
    el.style.top = `${node.y}px`

    el.innerHTML = `
      <div class="node-head">
        <span class="pill ${slugTag(node.tag)}">${escapeHtml(node.tag)}</span>
        ${node.id === selectedId ? '<span class="open-mark">open</span>' : ''}
      </div>
      <h3 class="node-title">${escapeHtml(node.title)}</h3>
      <p class="node-preview">${escapeHtml(node.content)}</p>
    `

    let startClientX = 0
    let startClientY = 0
    let startNodeX = node.x
    let startNodeY = node.y
    let moved = false

    const onMove = event => {
      if (!canEdit) return

      const rawDx = event.clientX - startClientX
      const rawDy = event.clientY - startClientY

      if (!moved && Math.hypot(rawDx, rawDy) < DRAG_THRESHOLD) {
        return
      }

      moved = true

      const dx = rawDx / view.scale
      const dy = rawDy / view.scale
      const nextX = clamp(startNodeX + dx, 20, WORLD_WIDTH - NODE_WIDTH - 20)
      const nextY = clamp(startNodeY + dy, 20, WORLD_HEIGHT - NODE_HEIGHT - 20)
      el.style.left = `${nextX}px`
      el.style.top = `${nextY}px`
      const invalid = overlapsAny(node.id, nextX, nextY)
      el.classList.toggle('invalid-drop', invalid)
    }

    const onUp = event => {
      document.removeEventListener('pointermove', onMove)
      document.removeEventListener('pointerup', onUp)

      if (!moved || !canEdit) {
        const now = Date.now()
        const isDouble = clickState.id === node.id && now - clickState.time < 320
        clickState = { id: node.id, time: now }

        selectedId = node.id
        clearEdgeSelection()

        if (relationMode.active) {
          handleRelationNodeClick(node.id)
        } else {
          detailOpen = isDouble
          renderAll()
        }
        return
      }

      const dx = (event.clientX - startClientX) / view.scale
      const dy = (event.clientY - startClientY) / view.scale
      const desiredX = clamp(startNodeX + dx, 20, WORLD_WIDTH - NODE_WIDTH - 20)
      const desiredY = clamp(startNodeY + dy, 20, WORLD_HEIGHT - NODE_HEIGHT - 20)
      const free = findNearestFreeSpot(node.id, desiredX, desiredY)
      const changed = free.x !== node.x || free.y !== node.y

      if (changed) pushHistory()

      node.x = free.x
      node.y = free.y
      selectedId = node.id
      clearEdgeSelection()
      saveCachedNodes()

      if (changed && canEdit) {
        updateNodeRemote(node).catch(async error => {
          console.error('Move node failed:', error)
          alert(error.message || 'Eroare la mutarea nodului.')
          await fetchAllData()
        })
      }

      renderAll()
    }

    el.addEventListener('pointerdown', event => {
      if (event.button !== 0) return
      event.stopPropagation()
      startClientX = event.clientX
      startClientY = event.clientY
      startNodeX = node.x
      startNodeY = node.y
      moved = false
      document.addEventListener('pointermove', onMove)
      document.addEventListener('pointerup', onUp, { once: true })
    })

    nodeLayer.appendChild(el)
  })
}

function renderSelectedStrip() {
  if (selectedEdge) {
    const info = getEdgeInfo(selectedEdge.sourceId, selectedEdge.targetId)
    const target = info ? findNode(info.link.targetId) : null

    if (info && target) {
      selectedStrip.innerHTML = `
        <strong>Muchie selectată</strong><br>
        ${escapeHtml(info.source.title)} → ${escapeHtml(target.title)} ·
        ${escapeHtml(info.link.label || 'relație')}
      `
      return
    }
  }

  const node = selectedNode()
  if (!node) {
    selectedStrip.innerHTML = 'Niciun nod selectat.'
    return
  }

  selectedStrip.innerHTML = `<strong>${escapeHtml(node.title)}</strong><br>${escapeHtml(node.tag)} · ${node.links.length} relații pleacă din acest nod.`
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
    modeStrip.innerHTML = '<strong>Mod relație activ</strong><br>Alege mai întâi nodul sursă, apoi apasă pe nodul destinație.'
    return
  }

  const source = findNode(relationMode.sourceId)
  modeStrip.innerHTML = `<strong>Mod relație activ</strong><br>Sursa: ${escapeHtml(source?.title || '—')}. Acum apasă pe nodul destinație.`
}

function renderDetailPanel() {
  const node = selectedNode()

  if (!node || !detailOpen) {
    detailPanel.classList.remove('open')
    emptyPanel.style.display = 'none'
    editBtn.disabled = !node || !canEdit
    deleteBtn.disabled = !node || !canEdit
    return
  }

  const [k1, v1, k2, v2] = getNodeMeta(node.tag)

  const relations = node.links.map((link, index) => {
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
  }).join('') || '<div class="relation-item"><div><strong>Nicio relație încă</strong><span>Poți adăuga una din quick controls sau din butonul de sus.</span></div></div>'

  detailPanel.innerHTML = `
    <div class="detail-top">
      <div class="detail-meta">
        <div>
          <span class="pill ${slugTag(node.tag)}">${escapeHtml(node.tag)}</span>
          <h2 class="detail-title">${escapeHtml(node.title)}</h2>
          <div class="detail-sub">Documentația ocupă tot ecranul cât timp este deschisă. O poți închide normal și revii instant la hartă.</div>
        </div>
        <div class="icon-actions">
          <button class="icon-btn" id="detailAddRelationBtn" aria-label="Add relation">＋</button>
          <button class="icon-btn" id="detailEditBtn" aria-label="Edit">✎</button>
          <button class="icon-btn" id="detailDeleteBtn" aria-label="Delete">🗑</button>
          <button class="icon-btn" id="detailCloseBtn" aria-label="Close">✕</button>
        </div>
      </div>
    </div>
    <div class="detail-content">
      <div class="quick-facts">
        <div class="fact-box"><strong>${escapeHtml(k1)}</strong><span>${escapeHtml(v1)}</span></div>
        <div class="fact-box"><strong>${escapeHtml(k2)}</strong><span>${escapeHtml(v2)}</span></div>
        <div class="relation-card">
          <div class="relation-card-label">relații editabile</div>
          <div class="relations-list">${relations}</div>
        </div>
      </div>
      <div class="info-card">
        <div class="info-card-label">documentație</div>
        <div class="doc-text">${escapeHtml(node.content)}</div>
      </div>
    </div>
  `

  detailPanel.classList.add('open')
  emptyPanel.style.display = 'none'
  editBtn.disabled = !canEdit
  deleteBtn.disabled = !canEdit

  const detailAddRelationBtn = document.getElementById('detailAddRelationBtn')
  const detailEditBtn = document.getElementById('detailEditBtn')
  const detailDeleteBtn = document.getElementById('detailDeleteBtn')
  const detailCloseBtn = document.getElementById('detailCloseBtn')

  detailAddRelationBtn.disabled = !canEdit
  detailEditBtn.disabled = !canEdit
  detailDeleteBtn.disabled = !canEdit

  detailAddRelationBtn.addEventListener('click', () => activateRelationMode(node.id))
  detailEditBtn.addEventListener('click', () => openEdit(node.id))
  detailDeleteBtn.addEventListener('click', () => {
    deleteSelected().catch(error => alert(error.message || 'Eroare la ștergere.'))
  })
  detailCloseBtn.addEventListener('click', () => {
    detailOpen = false
    renderAll()
  })

  detailPanel.querySelectorAll('[data-rel-edit]').forEach(button => {
    button.disabled = !canEdit
    button.addEventListener('click', () => {
      openRelationEdit(node.id, Number(button.dataset.relEdit))
    })
  })

  detailPanel.querySelectorAll('[data-rel-remove]').forEach(button => {
    button.disabled = !canEdit
    button.addEventListener('click', () => {
      removeRelation(node.id, Number(button.dataset.relRemove)).catch(error => alert(error.message || 'Eroare la ștergerea relației.'))
    })
  })
}

function renderAll() {
  nodeCount.textContent = String(nodes.length)
  renderSelectedStrip()
  renderModeStrip()
  renderLinks()
  renderNodes()
  renderDetailPanel()
  updateAuthUI()
}

function setModalModeUi(mode) {
  if (mode === 'node') {
    saveBtn.textContent = 'Salvează'
  } else if (mode === 'relation') {
    saveBtn.textContent = 'Salvează'
  } else {
    saveBtn.textContent = 'Închide'
  }
}

function openTutorial() {
  modalTitle.textContent = 'Tutorial complet de folosire'
  modalSubtitle.textContent = 'Tot ce trebuie să știi despre atlas: navigare, noduri, relații, editare, undo/redo, organizare și login.'
  nodeFields.style.display = 'none'
  nodeContentField.style.display = 'block'
  relationTargetField.style.display = 'none'
  relationLabelField.style.display = 'none'
  modalMode = 'tutorial'
  setModalModeUi('tutorial')
  contentInput.value = `1. Ce este site-ul

Acest site este un atlas interactiv pentru documentația de programare FTC. Fiecare nod reprezintă un subiect sau un capitol.

2. Cum te miști pe hartă

- drag pe background pentru pan
- scroll pentru zoom
- butoane pentru fit, reset view și centrează selecția

3. Cum funcționează nodurile

- un click = selectezi nodul
- două click-uri rapide = se deschide documentația full-screen
- roșu = selectat
- mov = neselectat

4. Cum citești documentația completă

Documentația ocupă tot ecranul și o poți închide cu X.

5. Cum creezi și editezi noduri

Trebuie să fii logat. Din Quick Controls ai butoane pentru nod nou, editare și ștergere.

6. Cum funcționează relațiile

- activezi modul relație
- alegi nodul sursă
- alegi nodul destinație
- se deschide direct formularul relației
- după salvare apare muchia în atlas

7. Undo și Redo

Undo și redo sunt sincronizate în Supabase pentru sesiunea curentă cât timp ești logat.

8. Login

Introduci email-ul și apeși pe Trimite magic link. După ce deschizi link-ul din email pe aceeași adresă a site-ului, devii autentificat și poți edita atlasul.

9. Ce este salvat online

Nodurile și relațiile sunt în Supabase, deci nu mai depind de browserul local.

10. Scopul final

Atlasul trebuie să devină un manual viu pentru programarea FTC, ușor de înțeles și de extins.`
  modalBackdrop.classList.add('open')
  contentInput.focus()
  contentInput.setSelectionRange(0, 0)
}

function openModal(mode) {
  modalMode = mode
  setModalModeUi(mode)
  modalBackdrop.classList.add('open')

  if (mode === 'node' || mode === 'tutorial') {
    nodeFields.style.display = mode === 'tutorial' ? 'none' : 'grid'
    nodeContentField.style.display = 'block'
    relationTargetField.style.display = 'none'
    relationLabelField.style.display = 'none'
  } else {
    nodeFields.style.display = 'none'
    nodeContentField.style.display = 'none'
    relationTargetField.style.display = 'block'
    relationLabelField.style.display = 'block'
  }
}

function closeModal() {
  modalBackdrop.classList.remove('open')
  editingId = null
  setModalModeUi('node')
}

function openCreate() {
  if (!requireAuth()) return
  editingId = null
  modalTitle.textContent = 'Creează nod'
  modalSubtitle.textContent = 'Adaugi un titlu, o categorie și explicația completă. Nodul nou este pus automat într-un loc liber, fără suprapunere.'
  titleInput.value = 'New FTC Topic'
  tagInput.value = 'Beginner'
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
  modalSubtitle.textContent = 'Modifici titlul, categoria și documentația, iar schimbările se văd imediat în hartă și în panoul de detalii.'
  titleInput.value = node.title
  tagInput.value = node.tag
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
  modalSubtitle.textContent = 'Conexiunea este reală și editabilă. Poți să-i dai o etichetă clară, ca să aibă sens vizual și logic.'
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
  } else {
    closeModal()
  }
}

async function saveNode() {
  if (!requireAuth()) return

  const title = titleInput.value.trim() || 'Untitled Node'
  const tag = tagInput.value
  const content = contentInput.value.trim() || 'Fără documentație încă.'

  pushHistory()

  try {
    if (editingId == null) {
        const tempId = Date.now()
        const startPos = findNearestFreeSpot(
            tempId,
            WORLD_WIDTH * 0.5 - NODE_WIDTH / 2,
            WORLD_HEIGHT * 0.5 - NODE_HEIGHT / 2
        )

        const inserted = await createNodeRemote({
            title,
            tag,
            content,
            x: startPos.x,
            y: startPos.y
        })

        const newNode = {
            id: Number(inserted.id),
            title: inserted.title,
            tag: inserted.tag,
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
      if (!node) return

      const nextNode = {
        ...node,
        title,
        tag,
        content
      }

      await updateNodeRemote(nextNode)

      node.title = nextNode.title
      node.tag = nextNode.tag
      node.content = nextNode.content

      selectedId = node.id
      clearEdgeSelection()
    }

    detailOpen = true
    saveCachedNodes()
    closeModal()
    renderAll()
  } catch (error) {
    console.error('Save node failed FULL:', error)
    alert(`Eroare la salvare nod: ${error?.message || 'necunoscută'}`)
    await fetchAllData()
  }
}

async function saveRelation() {
  if (!requireAuth()) return

  const label = relationLabelInput.value.trim() || 'relație'
  pushHistory()

  const source = findNode(relationDraft.sourceId)
  if (!source) return

  try {
    const existingIndex = source.links.findIndex(
      link => Number(link.targetId) === Number(relationDraft.targetId)
    )

    if (editingId == null) {
      if (existingIndex >= 0) {
        source.links[existingIndex].label = label
        await updateEdgeRemote(relationDraft.sourceId, relationDraft.targetId, label)
      } else {
        source.links.push({ targetId: Number(relationDraft.targetId), label })
        await insertEdgeRemote(relationDraft.sourceId, relationDraft.targetId, label)
      }
    } else {
      source.links[editingId].label = label
      await updateEdgeRemote(relationDraft.sourceId, relationDraft.targetId, label)
    }

    selectedId = source.id
    selectedEdge = {
      sourceId: Number(relationDraft.sourceId),
      targetId: Number(relationDraft.targetId)
    }
    detailOpen = true

    saveCachedNodes()
    closeModal()
    renderAll()
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

  pushHistory()

  try {
    const deleted = await deleteNodeRemote(node.id)
    console.log('Deleted node from DB:', deleted)

    nodes = nodes
      .filter(n => Number(n.id) !== Number(node.id))
      .map(n => ({
        ...n,
        links: (n.links || []).filter(link => Number(link.targetId) !== Number(node.id))
      }))

    if (
      selectedEdge &&
      (
        Number(selectedEdge.sourceId) === Number(node.id) ||
        Number(selectedEdge.targetId) === Number(node.id)
      )
    ) {
      selectedEdge = null
    }

    selectedId = nodes[0]?.id ?? null
    detailOpen = false
    relationMode = { active: false, sourceId: null }

    saveCachedNodes()
    renderAll()
  } catch (error) {
    console.error('Delete node failed FULL:', error)
    alert(`Eroare la ștergere: ${error?.message || 'necunoscută'}`)
    await fetchAllData()
  }
}

async function removeRelation(sourceId, relationIndex) {
  const source = findNode(sourceId)
  if (!source || !source.links[relationIndex]) return
  if (!requireAuth()) return

  pushHistory()

  const targetId = source.links[relationIndex].targetId

  try {
    await deleteEdgeRemote(sourceId, targetId)
    source.links.splice(relationIndex, 1)

    if (
      selectedEdge &&
      Number(selectedEdge.sourceId) === Number(sourceId) &&
      Number(selectedEdge.targetId) === Number(targetId)
    ) {
      selectedEdge = null
    }

    saveCachedNodes()
    renderAll()
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

  const relationIndex = source.links.findIndex(link => Number(link.targetId) === Number(targetId))
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

async function autoArrange() {
  if (!requireAuth()) return
  pushHistory()

  const initialMap = new Map(initialNodes.map(node => [Number(node.id), { x: node.x, y: node.y }]))

  nodes.forEach(node => {
    const initialPos = initialMap.get(Number(node.id))
    if (initialPos) {
      node.x = initialPos.x
      node.y = initialPos.y
    }
  })

  ensureNodePositions()
  saveCachedNodes()

  try {
    await Promise.all(nodes.map(node => updateNodeRemote(node)))
  } catch (error) {
    console.error('Auto arrange failed:', error)
    alert(error.message || 'Eroare la resetarea pozițiilor.')
    await fetchAllData()
    return
  }

  fitView()
  renderAll()
}

mapSurface.addEventListener('pointerdown', event => {
  if (
    event.target.closest('.node') ||
    event.target.closest('.edge-hit') ||
    event.target.closest('.edge-label-hit') ||
    event.target.closest('.floating-tools') ||
    event.target.closest('.detail-panel') ||
    event.target.closest('.modal')
  ) return

  panState = { startX: event.clientX, startY: event.clientY, x: view.x, y: view.y }
  mapSurface.classList.add('panning')
})

window.addEventListener('pointermove', event => {
  if (!panState) return
  view.x = panState.x + (event.clientX - panState.startX)
  view.y = panState.y + (event.clientY - panState.startY)
  applyView()
})

window.addEventListener('pointerup', () => {
  if (!panState) return
  panState = null
  mapSurface.classList.remove('panning')
})

mapSurface.addEventListener('wheel', event => {
  event.preventDefault()
  const delta = event.deltaY > 0 ? 0.92 : 1.08
  setScale(view.scale * delta, event.clientX, event.clientY)
}, { passive: false })

createBtn.addEventListener('click', openCreate)
editBtn.addEventListener('click', () => {
  const node = selectedNode()
  if (node) openEdit(node.id)
})
deleteBtn.addEventListener('click', () => {
  deleteSelected().catch(error => alert(error.message || 'Eroare la ștergere.'))
})
relationBtn.addEventListener('click', () => {
  if (relationMode.active) deactivateRelationMode()
  else activateRelationMode()
})
editEdgeBtn.addEventListener('click', () => {
  openSelectedEdgeEdit()
})
deleteEdgeBtn.addEventListener('click', () => {
  deleteSelectedEdge().catch(error => alert(error.message || 'Eroare la ștergerea muchiei.'))
})
undoBtn.addEventListener('click', () => {
  undo().catch(error => alert(error.message || 'Eroare la undo.'))
})
redoBtn.addEventListener('click', () => {
  redo().catch(error => alert(error.message || 'Eroare la redo.'))
})

zoomInBtn.addEventListener('click', () => setScale(view.scale * 1.12))
zoomOutBtn.addEventListener('click', () => setScale(view.scale * 0.88))
fitBtn.addEventListener('click', fitView)
arrangeBtn.addEventListener('click', () => {
  autoArrange().catch(error => alert(error.message || 'Eroare la resetarea pozițiilor.'))
})
resetViewBtn.addEventListener('click', () => {
  view = { ...DEFAULT_VIEW }
  applyView()
  fitView()
})
tutorialBtn.addEventListener('click', openTutorial)
fitSelectionBtn.addEventListener('click', fitCurrentSelection)

loginBtn.addEventListener('click', () => {
  sendMagicLink().catch(error => alert(error.message || 'Eroare la login.'))
})

logoutBtn.addEventListener('click', () => {
  signOutUser().catch(error => alert(error.message || 'Eroare la logout.'))
})

searchInput.addEventListener('input', event => {
  searchQuery = event.target.value
  renderAll()
})

toolsHeader.addEventListener('click', event => {
  if (event.target === collapseBtn) return
  togglePanel()
})

collapseBtn.addEventListener('click', event => {
  event.stopPropagation()
  togglePanel()
})

function togglePanel(force) {
  const collapsed = typeof force === 'boolean'
    ? force
    : !toolPanel.classList.contains('collapsed')

  toolPanel.classList.toggle('collapsed', collapsed)
  collapseBtn.textContent = collapsed ? '+' : '–'
  localStorage.setItem(CACHE_KEYS.panel, collapsed ? '1' : '0')
}

closeModalBtn.addEventListener('click', closeModal)
cancelBtn.addEventListener('click', closeModal)
saveBtn.addEventListener('click', () => {
  saveModal().catch(error => alert(error.message || 'Eroare la salvare.'))
})
modalBackdrop.addEventListener('click', event => {
  if (event.target === modalBackdrop) closeModal()
})

function dismissIntro() {
  introScreen.classList.add('hidden')
  localStorage.setItem(CACHE_KEYS.intro, '1')
  introDismissed = true
}

introScreen.addEventListener('click', dismissIntro)
enterBtn.addEventListener('click', event => {
  event.stopPropagation()
  dismissIntro()
})

window.addEventListener('keydown', event => {
  const tag = document.activeElement?.tagName
  const isTyping = tag === 'INPUT' || tag === 'TEXTAREA' || document.activeElement?.isContentEditable

  if (!isTyping && (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z' && !event.shiftKey) {
    event.preventDefault()
    undo().catch(error => alert(error.message || 'Eroare la undo.'))
    return
  }

  if (
    !isTyping &&
    (
      ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'y') ||
      ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key.toLowerCase() === 'z')
    )
  ) {
    event.preventDefault()
    redo().catch(error => alert(error.message || 'Eroare la redo.'))
    return
  }

  if (!isTyping && canEdit && !modalBackdrop.classList.contains('open') && event.key === 'Delete') {
    event.preventDefault()
    if (selectedEdge) {
      deleteSelectedEdge().catch(error => {
        console.error(error)
        alert(error.message || 'Eroare la ștergerea muchiei.')
      })
    } else {
      deleteSelected().catch(error => {
        console.error(error)
        alert(error.message || 'Eroare la ștergere.')
      })
    }
    return
  }

  if (!isTyping && canEdit && !modalBackdrop.classList.contains('open')) {
    const step = event.shiftKey ? 36 : 12
    let dx = 0
    let dy = 0

    if (event.key === 'ArrowLeft') dx = -step
    else if (event.key === 'ArrowRight') dx = step
    else if (event.key === 'ArrowUp') dy = -step
    else if (event.key === 'ArrowDown') dy = step

    if (dx !== 0 || dy !== 0) {
      event.preventDefault()
      nudgeSelectedNode(dx, dy).catch(error => alert(error.message || 'Eroare la mutare.'))
      return
    }
  }

  if (event.key === 'Escape') {
    if (!introDismissed) dismissIntro()
    else if (modalBackdrop.classList.contains('open')) closeModal()
    else if (relationMode.active) deactivateRelationMode()
    return
  }

  if (!introDismissed) dismissIntro()
})

if (localStorage.getItem(CACHE_KEYS.panel) === '1') togglePanel(true)
if (introDismissed) introScreen.classList.add('hidden')

window.addEventListener('resize', () => {
  renderAll()
  applyView()
})

supabase.auth.onAuthStateChange(async (_event, session) => {
  currentUser = session?.user || null
  canEdit = isAllowedEditor(currentUser?.email)
  updateAuthUI()

  try {
    await fetchAllData()
  } catch (err) {
    console.error('Supabase reload failed:', err)
  }
})

window.atlasDebug = {
  getState: () => ({
    canEdit,
    email: currentUser?.email ?? null,
    selectedId,
    selectedEdge,
    selectedNode: selectedNode()?.title ?? null,
    detailOpen,
    relationMode
  }),
  deleteSelected,
  deleteSelectedEdge,
  openSelectedEdgeEdit,
  refreshSession,
  deleteNodeRemote,
  deleteEdgeRemote,
  updateEdgeRemote,
}

ensureNodePositions()
applyView()
fitView()
renderAll()
saveStacks()

await refreshSession()

try {
  await fetchAllData()
} catch (err) {
  console.error('Supabase load failed:', err)
  renderAll()
}
