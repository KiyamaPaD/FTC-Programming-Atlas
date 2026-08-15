// FTC Programming Atlas
// v51 · Bilingual foundation
//
// Source language: Romanian
// Secondary language: English
//
// This module is deliberately isolated from atlas-script.js:
// - static interface text is translated client-side;
// - English node title/documentation translations are stored in
//   public.atlas_translations;
// - missing translations fall back to Romanian;
// - language preference is persisted in localStorage.

const SUPABASE_URL = 'https://sznohntrlyynbhdigdgb.supabase.co'
const SUPABASE_KEY = 'sb_publishable_Qv7L9k8PD2zN1LKuXXHzMQ_FfGDR_e4'
const PROJECT_ID = 'ftc-main'
const AUTH_STORAGE_KEY = 'sb-sznohntrlyynbhdigdgb-auth-token'
const LANGUAGE_STORAGE_KEY = 'ftc_atlas_language_v1'
const SECONDARY_LANGUAGE = 'en'

const SUPPORTED_LANGUAGES = new Set(['ro', 'en'])

const UI_EN = new Map(Object.entries({
  'manual interactiv pentru generațiile următoare':
    'interactive manual for future generations',
  'Creat de':
    'Created by',
  'navigare, editare și relații':
    'navigation, editing and relationships',
  'Neautentificat. Poți citi atlasul, dar pentru editare trebuie login.':
    'Not signed in. You can read the Atlas, but editing requires login.',
  'Neautentificat. Atlasul este în Reader Mode.':
    'Not signed in. The Atlas is in Reader Mode.',
  'Editor Mode activ':
    'Editor Mode active',
  'Logat ca editor':
    'Signed in as editor',
  'Momentan ești în Reader Mode.':
    'You are currently in Reader Mode.',
  'Logat doar pentru view:':
    'Signed in with read-only access:',
  'Trimite magic link':
    'Send magic link',
  'Adresa de email este folosită pentru autentificare și controlul accesului de editor.':
    'Your email address is used for authentication and editor access control.',
  'Politica de confidențialitate':
    'Privacy Policy',
  'Toate categoriile':
    'All categories',
  'Toate dificultățile':
    'All difficulty levels',
  'Etichete':
    'Tags',
  'Se încarcă etichetele...':
    'Loading tags...',
  'Arată toate nodurile':
    'Show all nodes',
  'Fit selecția':
    'Fit selection',
  'Editor mode':
    'Editor mode',
  'Editor tools':
    'Editor tools',
  'WASD mută local · F salvează poziția':
    'WASD moves locally · F saves position',
  '+ Nod nou':
    '+ New node',
  'Editează':
    'Edit',
  'Șterge':
    'Delete',
  'Adaugă relație':
    'Add relation',
  'Editează muchie':
    'Edit edge',
  'Șterge muchie':
    'Delete edge',
  'Salvează poziția · F':
    'Save position · F',
  '+ Punct muchie':
    '+ Edge point',
  '− Punct muchie':
    '− Edge point',
  'Traseu automat':
    'Automatic path',
  'Media nod':
    'Node media',
  'Fișiere nod':
    'Node files',
  'Nod cod':
    'Node code',
  'Niciun nod selectat.':
    'No node selected.',
  'Niciun nod deschis':
    'No node open',
  'Apasă pe un nod din hartă ca să vezi documentația completă. Poți muta nodurile, crea relații între ele și folosi harta ca un atlas viu.':
    'Select a node on the map to open its full documentation. You can move nodes, create relationships between them, and use the map as a living Atlas.',
  'Click sau tap pe un nod pentru documentație. Zoom cu scroll și pan cu drag pe fundal. În Editor Mode poți redimensiona nodurile, selecta o muchie, adăuga mai multe puncte și trage fiecare punct numerotat. WASD mută rapid nodul selectat doar local; apasă F sau „Salvează poziția” ca să trimiți o singură actualizare în Supabase. Săgețile păstrează mutarea fină cu salvare directă.':
    'Click or tap a node to open its documentation. Scroll to zoom and drag the background to pan. In Editor Mode you can resize nodes, select an edge, add multiple points, and drag each numbered control point. WASD moves the selected node quickly and locally; press F or “Save position” to send a single update to Supabase. Arrow keys keep precise movement with direct saving.',
  'Creează nod':
    'Create node',
  'Editează nod':
    'Edit node',
  'Adaugi un titlu, o categorie și explicația completă. Poți folosi asta pentru capitole mari, tutoriale, debugging sau concepte de bază.':
    'Add a title, category, and full explanation. Use nodes for major chapters, tutorials, debugging, or fundamental concepts.',
  'Titlu':
    'Title',
  'Categorie':
    'Category',
  'Dificultate':
    'Difficulty',
  'Poți selecta oricâte etichete. Administrarea lor completă va fi în panoul Taxonomy Manager.':
    'You can select any number of tags. Full management is available in the Taxonomy Manager.',
  'Documentație completă':
    'Full documentation',
  'Normal':
    'Normal',
  'Titlu mare':
    'Large heading',
  'Subtitlu':
    'Subheading',
  'Titlu mic':
    'Small heading',
  'Citat / notă':
    'Quote / note',
  'Mărime normală':
    'Normal size',
  'Mic':
    'Small',
  'Mare':
    'Large',
  'Foarte mare':
    'Very large',
  '• Listă':
    '• List',
  '1. Listă':
    '1. List',
  'Poți folosi Bold, Italic, Underline, titluri, dimensiuni de text, liste și linkuri. Paste-ul este sanitizat automat.':
    'You can use bold, italic, underline, headings, text sizes, lists, and links. Pasted content is sanitized automatically.',
  'Relație între':
    'Relation between',
  'Eticheta relației':
    'Relation label',
  'Renunță':
    'Cancel',
  'Salvează':
    'Save',
  'Închide':
    'Close',
  'Upload fișier':
    'Upload file',
  'Imagini și videoclipuri de maximum 50 MB. Sunt salvate în Supabase Storage.':
    'Images and videos up to 50 MB. Files are stored in Supabase Storage.',
  'Fișier':
    'File',
  'Descriere':
    'Description',
  'Încarcă fișierul':
    'Upload file',
  'Link video':
    'Video link',
  'Acceptă YouTube sau un URL HTTPS direct către un fișier video.':
    'Accepts YouTube or a direct HTTPS URL to a video file.',
  'Adaugă linkul':
    'Add link',
  'Încarcă screenshoturi și videoclipuri sau adaugă un link YouTube/direct. Media apare în documentația completă.':
    'Upload screenshots and videos or add a YouTube/direct link. Media appears inside the full documentation.',
  'Încarcă fișiere individuale sau un folder întreg. Structura folderelor este păstrată în documentația nodului.':
    'Upload individual files or an entire folder. Folder structure is preserved in the node documentation.',
  'Fișiere':
    'Files',
  'Selectează unul sau mai multe fișiere: ZIP, PDF, TXT, Java, Python, JSON, XML și alte formate. Maximum 100 MB per fișier.':
    'Select one or more files: ZIP, PDF, TXT, Java, Python, JSON, XML, and other formats. Maximum 100 MB per file.',
  'Încarcă fișierele':
    'Upload files',
  'Folder complet':
    'Complete folder',
  'Alege un folder din PC. Atlas păstrează numele folderului și subfolderele pentru fiecare fișier.':
    'Choose a folder from your computer. The Atlas preserves the folder name and subfolders for every file.',
  'Folder':
    'Folder',
  'Încarcă folderul':
    'Upload folder',
  'Adaugă snippet-uri selectabile și ușor de copiat. Ciornele sunt salvate automat, inclusiv dacă schimbi tab-ul sau browserul reîncarcă pagina.':
    'Add selectable, easy-to-copy snippets. Drafts are saved automatically, even when switching tabs or reloading the browser.',
  'snippet nou':
    'new snippet',
  'Adaugă cod în documentația nodului':
    'Add code to the node documentation',
  'Limbaj':
    'Language',
  'Text simplu':
    'Plain text',
  'Cod':
    'Code',
  'Adaugă snippet-ul':
    'Add snippet',
  'Ciornă salvată automat în browser. Fereastra se închide doar din X, Închide sau Escape.':
    'Draft automatically saved in the browser. The window closes only with X, Close, or Escape.',
  'Administrează categoriile, dificultățile și etichetele.':
    'Manage categories, difficulty levels, and tags.',
  'Categorii':
    'Categories',
  'Dificultăți':
    'Difficulty levels',
  '+ Categorie':
    '+ Category',
  '+ Dificultate':
    '+ Difficulty',
  '+ Etichetă':
    '+ Tag',
  'Adaugă element':
    'Add item',
  'Configurează numele, descrierea, ordinea și vizibilitatea.':
    'Configure the name, description, order, and visibility.',
  'Nume':
    'Name',
  'Ordine':
    'Order',
  'Activ':
    'Active',
  'Inactiv':
    'Inactive',
  'Mută nodurile în':
    'Move nodes to',
  'Anulează':
    'Cancel',
  'Mută și șterge':
    'Move and delete',
  'Tutorial complet de folosire':
    'Complete usage tutorial',
  'Editor Mode: poți modifica tutorialul și salva schimbările pentru toți utilizatorii.':
    'Editor Mode: you can edit the tutorial and save changes for all users.',
  'Reader Mode: poți citi și selecta textul, dar numai editorii îl pot modifica.':
    'Reader Mode: you can read and select the text, but only editors can modify it.',
  'Se încarcă harta.':
    'Loading the Atlas.',
  'Pregătim nodurile, documentația și relațiile dintre concepte.':
    'Preparing nodes, documentation, and relationships between concepts.',
  'Reîncearcă':
    'Retry',
  'Conexiune indisponibilă':
    'Connection unavailable',
  'Atlasul nu a putut fi încărcat':
    'The Atlas could not be loaded',
  'Verifică internetul și încearcă din nou.':
    'Check your internet connection and try again.',
  'Verifică din nou':
    'Check again',
  'Atlas gol':
    'Empty Atlas',
  'Nu există încă noduri':
    'There are no nodes yet',
  'Poți crea primul nod folosind butonul „Nod nou” din Editor Tools.':
    'You can create the first node using the “New node” button in Editor Tools.',
  'Atlasul nu conține momentan documentație publicată.':
    'The Atlas does not currently contain published documentation.',
  'Documentația ocupă tot ecranul. Închide cu X pentru a reveni la hartă.':
    'Documentation uses the full screen. Close with X to return to the map.',
  'Fără documentație încă.':
    'No documentation yet.',
  'Copiat':
    'Copied',
  'Copiază':
    'Copy',
  'Descarcă':
    'Download'
}))

const ATTRIBUTE_EN = new Map(Object.entries({
  'Email pentru magic link...': 'Email for magic link...',
  'Caută topic, categorie, dificultate, etichetă sau text...':
    'Search topic, category, difficulty, tag, or text...',
  'Filtrează după categorie': 'Filter by category',
  'Filtrează după dificultate': 'Filter by difficulty',
  'Formatare documentație': 'Documentation formatting',
  'Tip paragraf': 'Paragraph type',
  'Mărime text': 'Text size',
  'Listă cu buline': 'Bulleted list',
  'Listă numerotată': 'Numbered list',
  'Adaugă link': 'Add link',
  'Șterge formatarea': 'Clear formatting',
  'Scrie aici explicația completă...': 'Write the full explanation here...',
  'Ex: folosește aceleași concepte / depinde de / continuă în':
    'Example: uses the same concepts / depends on / continues in',
  'Închide Media Manager': 'Close Media Manager',
  'Ex: Poziția odometriei': 'Example: Odometry position',
  'Ce trebuie observat în imagine sau video?':
    'What should be noticed in the image or video?',
  'Ex: Test autonom complet': 'Example: Complete autonomous test',
  'Contextul videoclipului...': 'Video context...',
  'Închide managerul de fișiere': 'Close file manager',
  'Închide Nod cod': 'Close Node code',
  'Ex: Configurare motor cu encoder': 'Example: Motor configuration with encoder',
  'Explică unde se folosește și ce trebuie observat.':
    'Explain where it is used and what should be noticed.',
  'Lipește sau scrie codul aici...': 'Paste or write code here...',
  'Închide Taxonomy Manager': 'Close Taxonomy Manager',
  'Tipul taxonomiei': 'Taxonomy type',
  'Închide editorul': 'Close editor',
  'Toggle controls': 'Toggle controls'
}))

const CONTENT_SKIP_SELECTOR = [
  'script',
  'style',
  'pre',
  'code',
  '.node-title',
  '.node-preview',
  '.doc-text',
  '.media-card-copy',
  '.file-card-copy',
  '.code-snippet-description',
  '.atlas-i18n-modal'
].join(',')

let language = detectLanguage()
let translationRows = []
let translationMap = new Map()
let scanQueued = false
let translationLoadFinished = false

function detectLanguage() {
  const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY)

  if (SUPPORTED_LANGUAGES.has(stored)) {
    return stored
  }

  const browserLanguages = Array.isArray(navigator.languages)
    ? navigator.languages
    : [navigator.language]

  const isRomanian = browserLanguages.some((value) =>
    String(value || '').toLowerCase().startsWith('ro')
  )

  return isRomanian ? 'ro' : 'en'
}

function normalizeUiText(value) {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .trim()
}

function translationKey(entityType, entityId, fieldName, targetLanguage = 'en') {
  return `${entityType}:${Number(entityId)}:${fieldName}:${targetLanguage}`
}

function getTranslation(entityType, entityId, fieldName) {
  return translationMap.get(
    translationKey(entityType, entityId, fieldName, SECONDARY_LANGUAGE)
  ) || null
}

function rebuildTranslationMap() {
  translationMap = new Map()

  translationRows.forEach((row) => {
    translationMap.set(
      translationKey(
        row.entity_type,
        row.entity_id,
        row.field_name,
        row.language
      ),
      row
    )
  })
}

function setLanguage(nextLanguage) {
  if (!SUPPORTED_LANGUAGES.has(nextLanguage)) return
  if (nextLanguage === language) return

  localStorage.setItem(LANGUAGE_STORAGE_KEY, nextLanguage)
  window.location.reload()
}

function translateTextNode(node) {
  if (language !== 'en') return
  if (!(node instanceof Text)) return

  const parent = node.parentElement
  if (!parent) return
  if (parent.closest(CONTENT_SKIP_SELECTOR)) return

  const raw = node.nodeValue || ''
  const normalized = normalizeUiText(raw)
  if (!normalized) return

  const translated = UI_EN.get(normalized)
  if (!translated) return

  const leading = raw.match(/^\s*/)?.[0] || ''
  const trailing = raw.match(/\s*$/)?.[0] || ''

  const nextValue = `${leading}${translated}${trailing}`

  if (node.nodeValue !== nextValue) {
    node.nodeValue = nextValue
  }
}

function translateAttributes(element) {
  if (language !== 'en') return
  if (!(element instanceof Element)) return
  if (element.closest('.atlas-i18n-modal')) return

  ;['placeholder', 'aria-label', 'data-placeholder', 'title'].forEach((attribute) => {
    if (!element.hasAttribute(attribute)) return

    const current = element.getAttribute(attribute)
    const translated = ATTRIBUTE_EN.get(normalizeUiText(current))

    if (translated && current !== translated) {
      element.setAttribute(attribute, translated)
    }
  })
}

function translateStaticTree(root = document.body) {
  if (language !== 'en' || !root) return

  if (root instanceof Element) {
    translateAttributes(root)
  }

  const walker = document.createTreeWalker(
    root,
    NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT
  )

  let current

  while ((current = walker.nextNode())) {
    if (current instanceof Text) {
      translateTextNode(current)
    } else if (current instanceof Element) {
      translateAttributes(current)
    }
  }
}

function plainTextFromHtml(value) {
  const template = document.createElement('template')
  template.innerHTML = String(value || '')

  return (template.content.textContent || '')
    .replace(/\s+/g, ' ')
    .trim()
}

function sanitizeTranslatedHtml(value) {
  const template = document.createElement('template')
  template.innerHTML = String(value || '')

  const allowedTags = new Set([
    'P',
    'BR',
    'STRONG',
    'B',
    'EM',
    'I',
    'U',
    'H2',
    'H3',
    'H4',
    'BLOCKQUOTE',
    'UL',
    'OL',
    'LI',
    'A'
  ])

  const elements = [...template.content.querySelectorAll('*')]

  elements.forEach((element) => {
    if (!allowedTags.has(element.tagName)) {
      element.replaceWith(...element.childNodes)
      return
    }

    ;[...element.attributes].forEach((attribute) => {
      const name = attribute.name.toLowerCase()

      if (element.tagName === 'A' && name === 'href') {
        const href = attribute.value.trim()

        if (!/^https?:\/\//i.test(href)) {
          element.removeAttribute(attribute.name)
        }

        return
      }

      if (
        element.tagName === 'A' &&
        (name === 'target' || name === 'rel')
      ) {
        return
      }

      element.removeAttribute(attribute.name)
    })

    if (element.tagName === 'A' && element.hasAttribute('href')) {
      element.setAttribute('target', '_blank')
      element.setAttribute('rel', 'noopener noreferrer')
    }
  })

  return template.innerHTML
}

function getCurrentNodeId() {
  const routeMatch = window.location.pathname.match(
    /^\/node\/(\d+)(?:\/|$)/
  )

  if (routeMatch) {
    return Number(routeMatch[1])
  }

  const selected = document.querySelector(
    '.node.active[data-node-id]'
  )

  const id = Number(selected?.dataset.nodeId)

  return Number.isSafeInteger(id) && id > 0 ? id : null
}

function applyNodeTranslations() {
  if (language !== 'en') return
  if (!translationLoadFinished) return

  document
    .querySelectorAll('.node[data-node-id]')
    .forEach((nodeElement) => {
      const nodeId = Number(nodeElement.dataset.nodeId)
      if (!Number.isSafeInteger(nodeId)) return

      const titleTranslation = getTranslation(
        'node',
        nodeId,
        'title'
      )

      const contentTranslation = getTranslation(
        'node',
        nodeId,
        'content'
      )

      if (titleTranslation?.value) {
        const title = nodeElement.querySelector('.node-title')

        if (
          title &&
          title.textContent !== titleTranslation.value
        ) {
          title.textContent = titleTranslation.value
        }

        nodeElement.setAttribute(
          'aria-label',
          `Open documentation: ${titleTranslation.value}`
        )
      }

      if (contentTranslation?.value) {
        const preview = nodeElement.querySelector('.node-preview')
        const plain = contentTranslation.content_format === 'html'
          ? plainTextFromHtml(contentTranslation.value)
          : String(contentTranslation.value)

        if (preview && preview.textContent !== plain) {
          preview.textContent = plain
        }
      }
    })

  const detailNodeId = getCurrentNodeId()

  if (!detailNodeId) return

  const detailTitleTranslation = getTranslation(
    'node',
    detailNodeId,
    'title'
  )

  const detailContentTranslation = getTranslation(
    'node',
    detailNodeId,
    'content'
  )

  const detailTitle = document.querySelector(
    '#detailPanel .detail-title'
  )

  if (
    detailTitle &&
    detailTitleTranslation?.value &&
    detailTitle.textContent !== detailTitleTranslation.value
  ) {
    detailTitle.textContent = detailTitleTranslation.value
  }

  const documentation = document.querySelector(
    '#detailPanel .doc-text'
  )

  if (documentation && detailContentTranslation?.value) {
    if (detailContentTranslation.content_format === 'html') {
      const safeHtml = sanitizeTranslatedHtml(
        detailContentTranslation.value
      )

      if (documentation.innerHTML !== safeHtml) {
        documentation.innerHTML = safeHtml
        documentation.classList.add('rich')
        documentation.classList.remove('plain')
      }
    } else {
      const text = String(detailContentTranslation.value)

      if (documentation.textContent !== text) {
        documentation.textContent = text
        documentation.classList.add('plain')
        documentation.classList.remove('rich')
      }
    }
  }
}

function updateLanguageLinks() {
  if (language !== 'en') return

  document
    .querySelectorAll('a[href="/privacy.html"], a[href="./privacy.html"]')
    .forEach((link) => {
      link.setAttribute('href', '/privacy-en.html')
    })
}

function scheduleApply() {
  if (scanQueued) return
  scanQueued = true

  requestAnimationFrame(() => {
    scanQueued = false

    if (language === 'en') {
      translateStaticTree(document.body)
      updateLanguageLinks()
      applyNodeTranslations()
    }

    updateLanguageSwitcher()
    injectTranslationManagerButton()
  })
}

function injectLanguageSwitcher() {
  if (document.getElementById('atlasLanguageSwitcher')) return

  const host =
    document.querySelector('.tools-header-right') ||
    document.querySelector('.tools-header')

  if (!host) return

  const switcher = document.createElement('div')
  switcher.id = 'atlasLanguageSwitcher'
  switcher.className = 'atlas-language-switcher'
  switcher.setAttribute('role', 'group')
  switcher.setAttribute(
    'aria-label',
    language === 'en' ? 'Language' : 'Limbă'
  )

  switcher.innerHTML = `
    <button type="button" data-atlas-language="ro">RO</button>
    <button type="button" data-atlas-language="en">EN</button>
  `

  const collapseButton = document.getElementById('collapseBtn')

  if (collapseButton?.parentElement === host) {
    host.insertBefore(switcher, collapseButton)
  } else {
    host.appendChild(switcher)
  }

  switcher.addEventListener('click', (event) => {
    const button = event.target.closest(
      '[data-atlas-language]'
    )

    if (!button) return

    setLanguage(button.dataset.atlasLanguage)
  })

  updateLanguageSwitcher()
}

function updateLanguageSwitcher() {
  document
    .querySelectorAll('[data-atlas-language]')
    .forEach((button) => {
      const active =
        button.dataset.atlasLanguage === language

      button.classList.toggle('active', active)
      button.setAttribute(
        'aria-pressed',
        active ? 'true' : 'false'
      )
    })
}

function injectStyles() {
  if (document.getElementById('atlasI18nStyles')) return

  const style = document.createElement('style')
  style.id = 'atlasI18nStyles'

  style.textContent = `
    .atlas-language-switcher {
      display: inline-flex;
      align-items: center;
      gap: 3px;
      padding: 3px;
      border: 1px solid rgba(177, 76, 255, 0.18);
      border-radius: 10px;
      background: rgba(255,255,255,0.025);
      flex-shrink: 0;
    }

    .atlas-language-switcher button {
      min-width: 34px;
      height: 28px;
      padding: 0 7px;
      border: 0;
      border-radius: 7px;
      background: transparent;
      color: #9d9da8;
      font: inherit;
      font-size: 0.69rem;
      font-weight: 800;
      cursor: pointer;
    }

    .atlas-language-switcher button.active {
      color: #fff;
      background:
        linear-gradient(
          135deg,
          rgba(177,76,255,0.26),
          rgba(255,77,109,0.18)
        );
      box-shadow: inset 0 0 0 1px rgba(255,77,109,0.18);
    }

    .atlas-i18n-manager-button {
      width: 100%;
    }

    .atlas-i18n-backdrop {
      z-index: 150 !important;
    }

    .atlas-i18n-modal {
      width: min(900px, 100%);
      max-height: min(92vh, 900px);
      display: flex;
      flex-direction: column;
    }

    .atlas-i18n-body {
      min-height: 0;
      overflow: auto;
      padding: 18px;
      display: grid;
      gap: 16px;
    }

    .atlas-i18n-source {
      padding: 14px;
      border-radius: 14px;
      border: 1px solid rgba(255,255,255,0.06);
      background: rgba(255,255,255,0.025);
    }

    .atlas-i18n-source strong {
      display: block;
      margin-bottom: 7px;
      color: #f3f3f5;
    }

    .atlas-i18n-source p {
      margin: 0;
      color: #9d9da8;
      line-height: 1.55;
      white-space: pre-wrap;
      max-height: 130px;
      overflow: auto;
    }

    .atlas-i18n-editor {
      min-height: 280px;
      padding: 14px;
      border-radius: 12px;
      border: 1px solid rgba(177,76,255,0.18);
      background: rgba(255,255,255,0.03);
      color: #f3f3f5;
      line-height: 1.7;
      outline: none;
      overflow: auto;
    }

    .atlas-i18n-editor:focus {
      border-color: rgba(255,77,109,0.44);
      background: rgba(255,255,255,0.045);
    }

    .atlas-i18n-toolbar {
      display: flex;
      flex-wrap: wrap;
      gap: 7px;
      margin-bottom: 8px;
    }

    .atlas-i18n-toolbar button {
      min-width: 38px;
      min-height: 34px;
      padding: 6px 9px;
      border-radius: 9px;
      border: 1px solid rgba(177,76,255,0.17);
      background: rgba(255,255,255,0.025);
      color: #e8e8ed;
      cursor: pointer;
      font-weight: 700;
    }

    .atlas-i18n-status {
      min-height: 22px;
      color: #d5a9ff;
      font-size: 0.82rem;
    }

    .atlas-i18n-danger {
      color: #ffc2cd !important;
      border-color: rgba(255,77,109,0.25) !important;
      background: rgba(255,77,109,0.07) !important;
    }

    @media (max-width: 920px), (pointer: coarse) {
      .atlas-language-switcher button {
        min-width: 32px;
      }

      .atlas-i18n-backdrop {
        padding: 0 !important;
      }

      .atlas-i18n-modal {
        width: 100%;
        height: var(--atlas-viewport-height, 100dvh);
        max-height: var(--atlas-viewport-height, 100dvh);
        border-radius: 0 !important;
      }

      .atlas-i18n-body {
        flex: 1 1 auto;
        padding: 14px;
      }

      .atlas-i18n-editor {
        min-height: 42dvh;
      }
    }
  `

  document.head.appendChild(style)
}

async function loadTranslations() {
  try {
    const url = new URL(
      `${SUPABASE_URL}/rest/v1/atlas_translations`
    )

    url.searchParams.set(
      'select',
      'entity_type,entity_id,field_name,language,value,content_format'
    )
    url.searchParams.set(
      'project_id',
      `eq.${PROJECT_ID}`
    )
    url.searchParams.set(
      'language',
      `eq.${SECONDARY_LANGUAGE}`
    )

    const response = await fetch(url, {
      headers: {
        apikey: SUPABASE_KEY,
        accept: 'application/json'
      }
    })

    if (!response.ok) {
      throw new Error(
        `Translation lookup failed with HTTP ${response.status}`
      )
    }

    const rows = await response.json()
    translationRows = Array.isArray(rows) ? rows : []
    rebuildTranslationMap()
  } catch (error) {
    console.warn(
      '[Atlas i18n] Translations are unavailable. ' +
      'Run local-sql/15_bilingual_translations.sql first.',
      error
    )
  } finally {
    translationLoadFinished = true
    scheduleApply()
  }
}

function getAccessToken() {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY)
    if (!raw) return null

    let parsed = JSON.parse(raw)

    if (typeof parsed === 'string') {
      parsed = JSON.parse(parsed)
    }

    return (
      parsed?.access_token ||
      parsed?.session?.access_token ||
      parsed?.currentSession?.access_token ||
      null
    )
  } catch {
    return null
  }
}

async function fetchBaseNode(nodeId) {
  const url = new URL(`${SUPABASE_URL}/rest/v1/atlas_nodes`)
  url.searchParams.set(
    'select',
    'id,title,content,content_format'
  )
  url.searchParams.set(
    'project_id',
    `eq.${PROJECT_ID}`
  )
  url.searchParams.set('id', `eq.${nodeId}`)
  url.searchParams.set('limit', '1')

  const response = await fetch(url, {
    headers: {
      apikey: SUPABASE_KEY,
      accept: 'application/json'
    }
  })

  if (!response.ok) {
    throw new Error(
      `Node lookup failed with HTTP ${response.status}`
    )
  }

  const rows = await response.json()
  return Array.isArray(rows) ? rows[0] || null : null
}

async function saveNodeTranslation(
  nodeId,
  titleValue,
  contentValue
) {
  const accessToken = getAccessToken()

  if (!accessToken) {
    throw new Error(
      language === 'en'
        ? 'Editor authentication is required.'
        : 'Este necesară autentificarea de editor.'
    )
  }

  const now = new Date().toISOString()

  const rows = [
    {
      project_id: PROJECT_ID,
      entity_type: 'node',
      entity_id: nodeId,
      field_name: 'title',
      language: SECONDARY_LANGUAGE,
      value: titleValue.trim(),
      content_format: 'plain',
      updated_at: now
    },
    {
      project_id: PROJECT_ID,
      entity_type: 'node',
      entity_id: nodeId,
      field_name: 'content',
      language: SECONDARY_LANGUAGE,
      value: sanitizeTranslatedHtml(contentValue),
      content_format: 'html',
      updated_at: now
    }
  ]

  const url = new URL(
    `${SUPABASE_URL}/rest/v1/atlas_translations`
  )

  url.searchParams.set(
    'on_conflict',
    'project_id,entity_type,entity_id,field_name,language'
  )

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_KEY,
      authorization: `Bearer ${accessToken}`,
      'content-type': 'application/json',
      prefer: 'resolution=merge-duplicates,return=representation'
    },
    body: JSON.stringify(rows)
  })

  if (!response.ok) {
    const body = await response.text()
    throw new Error(
      `Translation save failed with HTTP ${response.status}: ${body}`
    )
  }

  const savedRows = await response.json()

  ;(Array.isArray(savedRows) ? savedRows : rows).forEach(
    (saved) => {
      const key = translationKey(
        saved.entity_type,
        saved.entity_id,
        saved.field_name,
        saved.language
      )

      translationMap.set(key, saved)
    }
  )
}

async function removeNodeTranslation(nodeId) {
  const accessToken = getAccessToken()

  if (!accessToken) {
    throw new Error(
      language === 'en'
        ? 'Editor authentication is required.'
        : 'Este necesară autentificarea de editor.'
    )
  }

  const url = new URL(
    `${SUPABASE_URL}/rest/v1/atlas_translations`
  )

  url.searchParams.set('project_id', `eq.${PROJECT_ID}`)
  url.searchParams.set('entity_type', 'eq.node')
  url.searchParams.set('entity_id', `eq.${nodeId}`)
  url.searchParams.set(
    'language',
    `eq.${SECONDARY_LANGUAGE}`
  )
  url.searchParams.set(
    'field_name',
    'in.(title,content)'
  )

  const response = await fetch(url, {
    method: 'DELETE',
    headers: {
      apikey: SUPABASE_KEY,
      authorization: `Bearer ${accessToken}`,
      prefer: 'return=minimal'
    }
  })

  if (!response.ok) {
    const body = await response.text()
    throw new Error(
      `Translation delete failed with HTTP ${response.status}: ${body}`
    )
  }

  translationMap.delete(
    translationKey('node', nodeId, 'title')
  )
  translationMap.delete(
    translationKey('node', nodeId, 'content')
  )
}

function injectTranslationManagerButton() {
  if (
    document.getElementById(
      'atlasTranslationManagerBtn'
    )
  ) {
    return
  }

  const editorToolsGrid = document.querySelector(
    '#editorToolsSection .tools-grid'
  )

  if (!editorToolsGrid) return

  const button = document.createElement('button')
  button.id = 'atlasTranslationManagerBtn'
  button.type = 'button'
  button.className =
    'btn atlas-i18n-manager-button'
  button.textContent =
    language === 'en'
      ? 'RO / EN translations'
      : 'Traduceri RO / EN'

  button.addEventListener('click', () => {
    openTranslationManager()
  })

  editorToolsGrid.appendChild(button)
}

function closeTranslationManager() {
  document
    .getElementById('atlasI18nBackdrop')
    ?.remove()
}

function execEditorCommand(command, value = null) {
  const editor = document.getElementById(
    'atlasI18nContentEditor'
  )

  if (!editor) return

  editor.focus()

  if (command === 'createLink') {
    const url = window.prompt(
      language === 'en'
        ? 'HTTPS link:'
        : 'Link HTTPS:'
    )

    if (!url || !/^https?:\/\//i.test(url.trim())) {
      return
    }

    document.execCommand(
      'createLink',
      false,
      url.trim()
    )

    return
  }

  document.execCommand(command, false, value)
}

async function openTranslationManager() {
  const nodeId = getCurrentNodeId()

  if (!nodeId) {
    window.alert(
      language === 'en'
        ? 'Select a node first.'
        : 'Selectează mai întâi un nod.'
    )
    return
  }

  closeTranslationManager()

  let node

  try {
    node = await fetchBaseNode(nodeId)
  } catch (error) {
    window.alert(error.message)
    return
  }

  if (!node) {
    window.alert(
      language === 'en'
        ? 'The selected node no longer exists.'
        : 'Nodul selectat nu mai există.'
    )
    return
  }

  const titleTranslation = getTranslation(
    'node',
    nodeId,
    'title'
  )

  const contentTranslation = getTranslation(
    'node',
    nodeId,
    'content'
  )

  const sourcePlain = node.content_format === 'html'
    ? plainTextFromHtml(node.content)
    : String(node.content || '')

  const backdrop = document.createElement('div')
  backdrop.id = 'atlasI18nBackdrop'
  backdrop.className =
    'modal-backdrop atlas-i18n-backdrop open'

  backdrop.innerHTML = `
    <div
      class="modal atlas-i18n-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="atlasI18nTitle"
    >
      <div class="modal-head">
        <div>
          <h3 id="atlasI18nTitle">${
            language === 'en'
              ? 'Node translation · Romanian → English'
              : 'Traducere nod · Română → Engleză'
          }</h3>
          <p>${
            language === 'en'
              ? 'Romanian remains the source language. If an English field is empty, readers automatically see the Romanian version.'
              : 'Româna rămâne limba-sursă. Dacă un câmp EN lipsește, cititorii văd automat varianta în română.'
          }</p>
        </div>

        <button
          class="icon-btn"
          type="button"
          data-atlas-i18n-close
          aria-label="${
            language === 'en' ? 'Close' : 'Închide'
          }"
        >✕</button>
      </div>

      <div class="atlas-i18n-body">
        <section class="atlas-i18n-source">
          <strong>RO · ${escapeHtml(node.title || '')}</strong>
          <p>${escapeHtml(sourcePlain || '')}</p>
        </section>

        <div class="field">
          <label for="atlasI18nTitleInput">EN · ${
            language === 'en' ? 'Title' : 'Titlu'
          }</label>
          <input
            id="atlasI18nTitleInput"
            maxlength="240"
            value="${escapeHtmlAttribute(
              titleTranslation?.value || ''
            )}"
            placeholder="${
              language === 'en'
                ? 'English node title'
                : 'Titlul nodului în engleză'
            }"
          />
        </div>

        <div class="field">
          <label>EN · ${
            language === 'en'
              ? 'Full documentation'
              : 'Documentație completă'
          }</label>

          <div
            class="atlas-i18n-toolbar"
            role="toolbar"
            aria-label="${
              language === 'en'
                ? 'English translation formatting'
                : 'Formatarea traducerii EN'
            }"
          >
            <button type="button" data-i18n-command="bold"><strong>B</strong></button>
            <button type="button" data-i18n-command="italic"><em>I</em></button>
            <button type="button" data-i18n-command="underline"><u>U</u></button>
            <button type="button" data-i18n-command="formatBlock" data-i18n-value="h2">H2</button>
            <button type="button" data-i18n-command="formatBlock" data-i18n-value="h3">H3</button>
            <button type="button" data-i18n-command="insertUnorderedList">• ${
              language === 'en' ? 'List' : 'Listă'
            }</button>
            <button type="button" data-i18n-command="insertOrderedList">1. ${
              language === 'en' ? 'List' : 'Listă'
            }</button>
            <button type="button" data-i18n-command="createLink">Link</button>
            <button type="button" data-i18n-command="removeFormat">Tx</button>
          </div>

          <div
            id="atlasI18nContentEditor"
            class="atlas-i18n-editor"
            contenteditable="true"
            role="textbox"
            aria-multiline="true"
          >${sanitizeTranslatedHtml(
            contentTranslation?.value || ''
          )}</div>
        </div>

        <div
          class="atlas-i18n-status"
          id="atlasI18nStatus"
          aria-live="polite"
        ></div>
      </div>

      <div class="modal-foot">
        <button
          class="btn atlas-i18n-danger"
          id="atlasI18nRemoveBtn"
          type="button"
        >${
          language === 'en'
            ? 'Remove English translation'
            : 'Șterge traducerea EN'
        }</button>

        <button
          class="btn"
          type="button"
          data-atlas-i18n-close
        >${
          language === 'en' ? 'Cancel' : 'Renunță'
        }</button>

        <button
          class="btn primary"
          id="atlasI18nSaveBtn"
          type="button"
        >${
          language === 'en'
            ? 'Save English'
            : 'Salvează EN'
        }</button>
      </div>
    </div>
  `

  document.body.appendChild(backdrop)

  backdrop
    .querySelectorAll('[data-atlas-i18n-close]')
    .forEach((button) => {
      button.addEventListener(
        'click',
        closeTranslationManager
      )
    })

  backdrop
    .querySelector('.atlas-i18n-toolbar')
    ?.addEventListener('click', (event) => {
      const button = event.target.closest(
        '[data-i18n-command]'
      )

      if (!button) return

      execEditorCommand(
        button.dataset.i18nCommand,
        button.dataset.i18nValue || null
      )
    })

  document
    .getElementById('atlasI18nSaveBtn')
    ?.addEventListener('click', async () => {
      const status = document.getElementById(
        'atlasI18nStatus'
      )
      const saveButton = document.getElementById(
        'atlasI18nSaveBtn'
      )

      const titleValue =
        document.getElementById(
          'atlasI18nTitleInput'
        )?.value || ''

      const contentValue =
        document.getElementById(
          'atlasI18nContentEditor'
        )?.innerHTML || ''

      if (!titleValue.trim()) {
        status.textContent =
          language === 'en'
            ? 'Add an English title first.'
            : 'Adaugă mai întâi titlul în engleză.'
        return
      }

      saveButton.disabled = true
      status.textContent =
        language === 'en'
          ? 'Saving translation...'
          : 'Se salvează traducerea...'

      try {
        await saveNodeTranslation(
          nodeId,
          titleValue,
          contentValue
        )

        status.textContent =
          language === 'en'
            ? 'English translation saved.'
            : 'Traducerea EN a fost salvată.'

        translationLoadFinished = true
        applyNodeTranslations()

        window.setTimeout(
          closeTranslationManager,
          450
        )
      } catch (error) {
        status.textContent = error.message
      } finally {
        saveButton.disabled = false
      }
    })

  document
    .getElementById('atlasI18nRemoveBtn')
    ?.addEventListener('click', async () => {
      const confirmed = window.confirm(
        language === 'en'
          ? 'Remove the English title and documentation for this node?'
          : 'Ștergi titlul și documentația EN pentru acest nod?'
      )

      if (!confirmed) return

      const status = document.getElementById(
        'atlasI18nStatus'
      )

      try {
        status.textContent =
          language === 'en'
            ? 'Removing translation...'
            : 'Se șterge traducerea...'

        await removeNodeTranslation(nodeId)

        status.textContent =
          language === 'en'
            ? 'English translation removed.'
            : 'Traducerea EN a fost ștearsă.'

        window.setTimeout(() => {
          closeTranslationManager()
          window.location.reload()
        }, 450)
      } catch (error) {
        status.textContent = error.message
      }
    })
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

function escapeHtmlAttribute(value) {
  return escapeHtml(value)
}

function startObserver() {
  const observer = new MutationObserver(() => {
    scheduleApply()
  })

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
    characterData: true,
    attributes: true,
    attributeFilter: [
      'placeholder',
      'aria-label',
      'data-placeholder'
    ]
  })
}

function init() {
  document.documentElement.lang = language
  document.documentElement.dataset.atlasLanguage = language

  injectStyles()
  injectLanguageSwitcher()
  injectTranslationManagerButton()

  if (language === 'en') {
    translateStaticTree(document.body)
    updateLanguageLinks()
  }

  startObserver()
  loadTranslations()
  scheduleApply()

  window.addEventListener('popstate', scheduleApply)
}

if (document.readyState === 'loading') {
  document.addEventListener(
    'DOMContentLoaded',
    init,
    { once: true }
  )
} else {
  init()
}
