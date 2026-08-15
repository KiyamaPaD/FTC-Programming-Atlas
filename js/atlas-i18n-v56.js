// FTC Programming Atlas
// v56 · Dynamic count English cleanup
//
// Runs after atlas-i18n.js v53. This layer fixes remaining viewer-facing
// Romanian strings in English mode and keeps public UI clean.

const LANGUAGE_STORAGE_KEY = 'ftc_atlas_language_v1'

const EXTRA_EN = new Map(Object.entries({
  'Element activ': 'Active item',
  'Elementele inactive rămân salvate, dar nu apar în filtrele publice sau la nodurile noi.':
    'Inactive items remain saved, but they do not appear in public filters or when creating new nodes.',
  'Salvează textul': 'Save text',
  'Salvează descrierea': 'Save description',
  'Text salvat.': 'Text saved.',
  'Descriere salvată.': 'Description saved.',
  'Ce fel de text intră aici?': 'What kind of text belongs here?',
  'Ce fel de text intra aici?': 'What kind of text belongs here?',
  'Ce fel de subiecte intră aici?': 'What kind of topics belong here?',
  'Ce fel de subiecte intra aici?': 'What kind of topics belong here?',
  'Tutorial — doar citire': 'Tutorial — read only',
  'Tutorial – doar citire': 'Tutorial — read only',
  'Poți adăuga una din Editor Mode.': '',
  'You can add one from Editor Mode.': '',
  'Reader Mode: poți citi și selecta textul, dar numai editorii îl pot modifica.':
    'Read the guide below to learn how to use the Atlas.',
  'Reader Mode: you can read and select the text, but only editors can modify it.':
    'Read the guide below to learn how to use the Atlas.'
}))

const EXTRA_ATTRIBUTE_EN = new Map(Object.entries({
  'Ce fel de text intră aici?': 'What kind of text belongs here?',
  'Ce fel de text intra aici?': 'What kind of text belongs here?',
  'Ce fel de subiecte intră aici?': 'What kind of topics belong here?',
  'Ce fel de subiecte intra aici?': 'What kind of topics belong here?'
}))

const VIEWER_TUTORIAL_RO = `1. Ce este FTC Programming Atlas

FTC Programming Atlas este o hartă interactivă de documentație pentru programarea FTC. Fiecare nod reprezintă un concept, un framework, un subsistem sau un subiect tehnic.

2. Navigare pe hartă

- click sau tap pe un nod pentru a deschide documentația
- scroll sau pinch pentru zoom
- drag pe fundal pentru pan
- Fit pentru a vedea toate nodurile vizibile
- Reset view pentru a reveni la vederea inițială

3. Căutare și filtre

Poți căuta după titlu, text, categorie, dificultate sau etichetă. Filtrele te ajută să restrângi harta la subiectele care te interesează.

4. Cum citești un nod

Documentația unui nod poate conține text formatat, exemple de cod, imagini, videoclipuri și fișiere. Închide documentația cu X pentru a reveni la hartă.

5. Relații între concepte

Liniile dintre noduri arată legături între subiecte. Eticheta unei relații explică pe scurt cum sunt conectate cele două concepte.

6. Cod, media și fișiere

Exemplele de cod pot fi selectate sau copiate. Imaginile și videoclipurile oferă context vizual, iar fișierele atașate pot conține exemple, configurații sau alte resurse utile.

7. Română / English

Folosește selectorul RO / EN din panoul de control pentru a schimba limba. Dacă o traducere de conținut nu există încă, Atlasul poate afișa temporar varianta disponibilă.`

const VIEWER_TUTORIAL_EN = `1. What is FTC Programming Atlas?

FTC Programming Atlas is an interactive documentation map for FTC programming. Each node represents a concept, framework, subsystem, or technical topic.

2. Navigating the map

- click or tap a node to open its documentation
- scroll or pinch to zoom
- drag the background to pan
- use Fit to show all visible nodes
- use Reset view to return to the initial view

3. Search and filters

You can search by title, text, category, difficulty, or tag. Filters help narrow the map to the topics that matter to you.

4. Reading a node

A node can contain formatted documentation, code examples, images, videos, and downloadable files. Close the documentation with X to return to the map.

5. Relationships between concepts

Lines between nodes represent connections between topics. A relationship label briefly explains how the two concepts are connected.

6. Code, media, and files

Code examples can be selected or copied. Images and videos provide visual context, while attached files can contain examples, configuration files, or other useful resources.

7. Romanian / English

Use the RO / EN selector in the control panel to change language. If a content translation is not available yet, the Atlas may temporarily show the available source version.`

const EDITOR_TUTORIAL_EN = `1. What is the site?

This site is an interactive Atlas for FTC programming documentation. Each node represents a topic or chapter.

2. Moving around the map

- drag the background to pan
- scroll to zoom
- use the Fit, Reset view, and Fit selection controls

3. How nodes work

- in normal Reader Mode, one click or tap opens full-screen documentation
- in Editor Mode, one click selects a node for movement and relationships
- in Editor Mode, double-click opens node documentation
- in Editor Mode, nodes can be moved by dragging
- red indicates the selected item
- purple indicates an unselected item

4. Reading full documentation

Node documentation uses the full screen and can be closed with X.

5. Creating and editing nodes

You must be signed in as an approved editor and enable Editor Mode. The editor tools then provide node creation, editing, deletion, relationship management, and history controls.

6. Relationships

- enable relationship mode
- select the source node
- select the destination node
- complete the relationship form
- after saving, the edge appears in the Atlas

7. Undo and Redo

Undo and Redo are available in Editor Mode and are synchronized with the Atlas backend.

8. Authentication

Enter the approved editor email and send a magic link. Open the link on the same site origin to authenticate.

9. Taxonomy Manager

Editor Mode allows categories, difficulty levels, and tags to be created, renamed, deactivated, reordered, or deleted.

10. Node code

Editor Mode allows Java, Python, and other code examples to be attached to nodes. Readers can select or copy published snippets.

11. Persisted Atlas data

Nodes, relationships, taxonomy, media, files, folders, code snippets, and the project tutorial are stored in the Atlas backend.`

const ADMIN_HINTS = new Set([
  'Poți adăuga una din Editor Mode.',
  'You can add one from Editor Mode.'
])

let applyQueued = false

function currentLanguage() {
  const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY)
  return stored === 'ro' ? 'ro' : 'en'
}

function isEnglish() {
  return currentLanguage() === 'en'
}

function normalize(value) {
  return String(value || '').replace(/\s+/g, ' ').trim()
}

function editorModeActive() {
  const tools = document.getElementById('editorToolsSection')
  if (!tools) return false
  return !tools.hidden && getComputedStyle(tools).display !== 'none'
}

function isTutorialOpen() {
  const backdrop = document.getElementById('modalBackdrop')
  const title = normalize(document.getElementById('modalTitle')?.textContent)
  return Boolean(backdrop?.classList.contains('open') && /tutorial/i.test(title))
}

function translateDynamicEnglishText(value) {
  let text = String(value || '')

  // Selected-node / relationship counters.
  text = text.replace(
    /\b(\d+)\s+relație\b/gi,
    (_, count) => `${count} relationship`
  )

  text = text.replace(
    /\b(\d+)\s+relații\b/gi,
    (_, count) => `${count} relationships`
  )

  // Selected-edge routing counters.
  text = text.replace(
    /\b(\d+)\s+punct de traseu\b/gi,
    (_, count) => `${count} route point`
  )

  text = text.replace(
    /\b(\d+)\s+puncte de traseu\b/gi,
    (_, count) => `${count} route points`
  )

  text = text.replace(
    /\bpunctul\s+(\d+)\s+selectat\b/gi,
    (_, count) => `point ${count} selected`
  )

  text = text.replace(
    /\bMuchie selectată\b/g,
    'Selected edge'
  )

  return text
}

function translateExtraTextNode(node) {
  if (!isEnglish() || !(node instanceof Text)) return
  const parent = node.parentElement
  if (!parent) return
  if (parent.closest('script, style, pre, code, .doc-text, .atlas-i18n-modal')) return

  const raw = node.nodeValue || ''
  const key = normalize(raw)
  if (!key) return

  const leading = raw.match(/^\s*/)?.[0] || ''
  const trailing = raw.match(/\s*$/)?.[0] || ''

  if (EXTRA_EN.has(key)) {
    const translated = EXTRA_EN.get(key)

    if (translated !== '') {
      const nextValue = `${leading}${translated}${trailing}`

      if (node.nodeValue !== nextValue) {
        node.nodeValue = nextValue
      }
    }

    return
  }

  const dynamic = translateDynamicEnglishText(key)

  if (dynamic !== key) {
    const nextValue = `${leading}${dynamic}${trailing}`

    if (node.nodeValue !== nextValue) {
      node.nodeValue = nextValue
    }
  }
}

function translateExtraAttributes(element) {
  if (!isEnglish() || !(element instanceof Element)) return
  for (const attribute of ['placeholder', 'aria-label', 'title']) {
    if (!element.hasAttribute(attribute)) continue
    const value = normalize(element.getAttribute(attribute))
    const translated = EXTRA_ATTRIBUTE_EN.get(value)
    if (translated) {
      element.setAttribute(attribute, translated)
    }
  }
}

function translateExtraTree() {
  if (!isEnglish()) return
  const walker = document.createTreeWalker(
    document.body,
    NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT
  )

  let current
  while ((current = walker.nextNode())) {
    if (current instanceof Text) {
      translateExtraTextNode(current)
    } else if (current instanceof Element) {
      translateExtraAttributes(current)
    }
  }
}

function toggleViewerHidden(element, hidden) {
  if (!(element instanceof Element)) return
  element.classList.toggle('atlas-viewer-hidden', hidden)
}

function setViewerToolsNote(viewerMode) {
  const note = document.querySelector('.tools-note')
  if (!note) return

  if (!note.dataset.atlasV55EditorCopy) {
    note.dataset.atlasV55EditorCopy = note.textContent || ''
  }

  if (!viewerMode) {
    note.textContent = note.dataset.atlasV55EditorCopy
    return
  }

  note.textContent = isEnglish()
    ? 'Click or tap a node to open its documentation. Use scroll or pinch to zoom and drag the background to pan. Search and filter the Atlas by category, difficulty, or tags.'
    : 'Click sau tap pe un nod pentru documentație. Folosește scroll sau pinch pentru zoom și drag pe fundal pentru pan. Caută și filtrează Atlasul după categorie, dificultate sau etichete.'
}

function cleanupViewerUi() {
  const viewerMode = !editorModeActive()

  document
    .querySelectorAll([
      '#detailPanel .detail-top .icon-actions',
      '#detailPanel .relation-actions',
      '#detailPanel [data-open-node-media]',
      '#detailPanel [data-open-node-files]',
      '#detailPanel [data-open-node-code]',
      '#detailPanel .node-media-heading > .btn',
      '#detailPanel .node-files-heading > .btn',
      '#detailPanel .node-code-heading > .btn',
      '#detailPanel .node-media-section.empty .btn',
      '#detailPanel .node-files-section.empty .btn',
      '#detailPanel .node-code-section.empty .btn'
    ].join(','))
    .forEach((element) => toggleViewerHidden(element, viewerMode))

  document
    .querySelectorAll('#detailPanel span, #detailPanel p, #detailPanel div')
    .forEach((element) => {
      const text = normalize(element.textContent)
      if (ADMIN_HINTS.has(text)) {
        toggleViewerHidden(element, viewerMode)
      }
    })

  setViewerToolsNote(viewerMode)
}

function applyTutorialView() {
  if (!isTutorialOpen()) return

  const textarea = document.getElementById('contentInput')
  const subtitle = document.getElementById('modalSubtitle')
  const modal = document.querySelector('#modalBackdrop > .modal')
  const footer = modal?.querySelector('.modal-foot')
  const saveButton = document.getElementById('saveBtn')
  const titleNode = document.getElementById('modalTitle')

  if (!textarea) return

  if (!textarea.dataset.atlasV55SourceTutorial) {
    textarea.dataset.atlasV55SourceTutorial = textarea.value || ''
  }

  const editorActive = editorModeActive()

  if (!editorActive) {
    textarea.value = isEnglish() ? VIEWER_TUTORIAL_EN : VIEWER_TUTORIAL_RO
    textarea.readOnly = true
    textarea.setAttribute('aria-readonly', 'true')
    toggleViewerHidden(footer, true)

    if (titleNode) {
      titleNode.textContent = isEnglish() ? 'Tutorial — read only' : 'Tutorial — doar citire'
    }

    if (subtitle) {
      subtitle.textContent = isEnglish()
        ? 'A short guide for exploring the public Atlas.'
        : 'Un ghid scurt pentru explorarea Atlasului public.'
    }
    return
  }

  toggleViewerHidden(footer, false)

  if (titleNode) {
    titleNode.textContent = isEnglish() ? 'Complete usage tutorial' : 'Tutorial complet de folosire'
  }

  if (isEnglish()) {
    textarea.value = EDITOR_TUTORIAL_EN
    textarea.readOnly = true
    textarea.setAttribute('aria-readonly', 'true')

    if (saveButton) {
      saveButton.disabled = true
      saveButton.title = 'Switch to RO to edit and save the source tutorial.'
    }

    if (subtitle) {
      subtitle.textContent = 'Editor guide in English. Switch to RO to modify and save the source tutorial.'
    }
  } else {
    textarea.value = textarea.dataset.atlasV55SourceTutorial || textarea.value
    textarea.readOnly = false
    textarea.setAttribute('aria-readonly', 'false')

    if (saveButton) {
      saveButton.disabled = false
      saveButton.removeAttribute('title')
    }
  }
}

function injectStyles() {
  if (document.getElementById('atlasV55Styles')) return
  const style = document.createElement('style')
  style.id = 'atlasV55Styles'
  style.textContent = `.atlas-viewer-hidden{display:none!important;}`
  document.head.appendChild(style)
}

function applyAll() {
  translateExtraTree()
  cleanupViewerUi()
  applyTutorialView()
}

function scheduleApply() {
  if (applyQueued) return
  applyQueued = true
  requestAnimationFrame(() => {
    applyQueued = false
    applyAll()
  })
}

function startObserver() {
  const observer = new MutationObserver(scheduleApply)
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
    characterData: true,
    attributes: true,
    attributeFilter: ['class', 'hidden', 'placeholder', 'aria-label', 'title']
  })
}

function init() {
  injectStyles()
  startObserver()
  scheduleApply()
  window.addEventListener('popstate', scheduleApply)
  window.addEventListener('hashchange', scheduleApply)
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init, { once: true })
} else {
  init()
}
