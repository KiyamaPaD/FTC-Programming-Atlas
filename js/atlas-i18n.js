// FTC Programming Atlas
// v53 · Full English UI + global bilingual content
//
// Source language: Romanian
// Secondary language: English
//
// This module is deliberately isolated from atlas-script.js:
// - static interface text is translated client-side;
// - English node title/documentation and relationship-label translations
//   are stored in public.atlas_translations;
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


// v53 · Full English UI coverage
const UI_EN_V53 = new Map(Object.entries({
  "Fără etichete": "No tags",
  "relații": "relationships",
  "documentație": "documentation",
  "nod cod": "node code",
  "Snippet-uri de cod": "Code snippets",
  "Adaugă cod": "Add code",
  "Acest nod nu are încă exemple de cod.": "This node does not have any code examples yet.",
  "Screenshoturi și videoclipuri": "Screenshots and videos",
  "Administrează": "Manage",
  "fișiere": "files",
  "Fișiere": "Files",
  "Fișiere și foldere": "Files and folders",
  "Adaugă fișiere": "Add files",
  "Poți atașa arhive, PDF-uri, proiecte, configurații, surse și foldere întregi.": "You can attach archives, PDFs, projects, configuration files, source files, and complete folders.",
  "Nicio relație încă": "No relationships yet",
  "Poți adăuga una din Editor Mode.": "You can add one from Editor Mode.",
  "Niciun snippet încă": "No snippets yet",
  "Scrie sau lipește primul exemplu folosind formularul de mai sus.": "Write or paste the first example using the form above.",
  "Fiecare exemplu apare în documentație cu buton de copiere.": "Each example appears in the documentation with a copy button.",
  "Imaginile și videoclipurile apar sub documentația nodului.": "Images and videos appear below the node documentation.",
  "Nicio imagine sau filmare": "No images or videos yet",
  "Încarcă un screenshot/video ori adaugă un link YouTube.": "Upload a screenshot/video or add a YouTube link.",
  "Niciun fișier atașat": "No attached files",
  "Poți încărca fișiere individuale sau un folder întreg.": "You can upload individual files or a complete folder.",
  "Creează relație": "Create relationship",
  "Editează relație": "Edit relationship",
  "Conexiunea este reală și editabilă. Poți să-i dai o etichetă clară, ca să aibă sens vizual și logic.": "The connection is real and editable. Give it a clear label so the relationship makes sense visually and logically.",
  "Schimbi eticheta fără să pierzi conexiunea dintre noduri.": "Change the label without losing the connection between the nodes.",
  "Fără categorie": "No category",
  "Nespecificată": "Unspecified",
  "Nu există etichete active.": "There are no active tags.",
  "Nu există etichete. Le vom administra din Taxonomy Manager.": "There are no tags yet. Manage them from the Taxonomy Manager.",
  "Alege categoria": "Choose category",
  "Alege dificultatea": "Choose difficulty",
  "Fără descriere.": "No description.",
  "Mută în sus": "Move up",
  "Mută în jos": "Move down",
  "Dezactivează": "Deactivate",
  "Activează": "Activate",
  "Poți edita, dezactiva, reordona sau șterge în siguranță.": "You can edit, deactivate, reorder, or safely delete items.",
  "Modificările apar imediat în filtre și în editorul nodurilor.": "Changes appear immediately in filters and in the node editor.",
  "Numele și ordinea pot fi schimbate ulterior din acest panou.": "The name and order can be changed later from this panel.",
  "Elementul nu mai există.": "The item no longer exists.",
  "Nu poți șterge ultimul element de acest tip. Creează mai întâi un înlocuitor sau dezactivează-l.": "You cannot delete the last item of this type. Create a replacement first or deactivate it.",
  "Alege un înlocuitor.": "Choose a replacement.",
  "Nodul nu mai există.": "The node no longer exists.",
  "Titlu afișat": "Display title",
  "Implicit: numele fișierului": "Default: file name",
  "Ce conține fișierul?": "What does the file contain?",
  "Imagine": "Image",
  "Videoclip": "Video",
  "Fișier indisponibil": "File unavailable",
  "Deschide videoclipul": "Open video",
  "Rădăcina nodului": "Node root",
  "Indisponibil": "Unavailable",
  "Explică exemplul...": "Explain the example...",
  "Copiază": "Copy",
  "Descarcă": "Download",
  "Ciornă salvată automat în acest browser.": "Draft automatically saved in this browser.",
  "Am restaurat automat ciorna nesalvată.": "The unsaved draft was restored automatically.",
  "Am restaurat modificările nesalvate.": "Unsaved changes were restored automatically.",
  "Selectează mai întâi o muchie.": "Select an edge first.",
  "Muchia selectată nu mai există.": "The selected edge no longer exists.",
  "Selectează mai întâi un nod.": "Select a node first.",
  "Adaugă relație": "Add relationship",
  "Anulează": "Cancel",
  "Mod relație activ": "Relationship mode active",
  "Folosește „+ Punct muchie”, apoi trage fiecare punct numerotat.": "Use “+ Edge point”, then drag each numbered point.",
  "Poziție nesalvată": "Unsaved position",
  "Ieși din Editor": "Exit Editor",
  "Se salvează poziția...": "Saving position...",
  "Trebuie să fii autentificat ca editor.": "You must be signed in as an editor.",
  "Doar editorii aprobați pot modifica atlasul.": "Only approved editors can modify the Atlas.",
  "Activează mai întâi Editor Mode.": "Enable Editor Mode first.",
  "Scrie email-ul mai întâi.": "Enter your email first.",
  "Magic link trimis.": "Magic link sent.",
  "Se încarcă harta...": "Loading the Atlas...",
  "Nu există încă noduri": "There are no nodes yet",
  "Nu mai există nimic de făcut undo.": "There is nothing left to undo.",
  "Nu mai există nimic de făcut redo.": "There is nothing left to redo.",
  "Muchia nu a putut fi selectată.": "The edge could not be selected.",
  "Traseul relației nu a putut fi salvat.": "The relationship path could not be saved.",
  "Punctul nu a putut fi adăugat.": "The point could not be added.",
  "Punctul nu a putut fi șters.": "The point could not be removed.",
  "Dimensiunea nodului nu a putut fi salvată.": "The node size could not be saved.",
  "Dimensiunea automată s-ar suprapune peste alt nod.": "The automatic size would overlap another node.",
  "Browserul nu a permis copierea automată.": "The browser did not allow automatic copying.",
  "Elementul media nu a fost șters.": "The media item was not deleted.",
  "Ordinea media nu a fost salvată.": "The media order was not saved.",
  "Fișierul nu a fost șters.": "The file was not deleted.",
  "Ordinea fișierelor nu a fost salvată.": "The file order was not saved.",
  "Snippet-ul de cod nu a fost șters.": "The code snippet was not deleted.",
  "Ordinea snippet-urilor nu a fost salvată.": "The code snippet order was not saved.",
  "Ordinea nu a putut fi salvată.": "The order could not be saved.",
  "Elementul nu a putut fi înlocuit și șters.": "The item could not be replaced and deleted.",
  "Muchia nu a fost ștearsă.": "The edge was not deleted.",
  "Eroare la ștergerea media.": "Error deleting media.",
  "Eroare la salvarea fișierului.": "Error saving the file.",
  "Eroare la ștergerea fișierului.": "Error deleting the file.",
  "Eroare la reordonarea fișierelor.": "Error reordering files.",
  "Eroare la ștergerea codului.": "Error deleting code.",
  "Eroare la ștergere.": "Delete error.",
  "Eroare la ștergerea relației.": "Error deleting the relationship.",
  "Eroare la ștergerea muchiei.": "Error deleting the edge.",
  "Eroare la adăugarea codului.": "Error adding code.",
  "Eroare la adăugarea linkului.": "Error adding the link.",
  "Eroare la ștergerea elementului.": "Error deleting the item.",
  "Alege mai întâi o imagine sau un videoclip.": "Choose an image or video first.",
  "Sunt acceptate numai imagini și videoclipuri.": "Only images and videos are accepted.",
  "Format neacceptat. Folosește JPG, PNG, WEBP, GIF, MP4, WebM sau MOV.": "Unsupported format. Use JPG, PNG, WEBP, GIF, MP4, WebM, or MOV.",
  "Fișierul depășește limita de 50 MB.": "The file exceeds the 50 MB limit.",
  "Fișier încărcat cu succes.": "File uploaded successfully.",
  "Se adaugă linkul...": "Adding link...",
  "Link adăugat cu succes.": "Link added successfully.",
  "Elementul media nu mai există.": "The media item no longer exists.",
  "Se salvează textul...": "Saving text...",
  "Titlul și descrierea au fost salvate.": "Title and description saved.",
  "Se șterge elementul...": "Deleting item...",
  "Element șters.": "Item deleted.",
  "Se salvează ordinea...": "Saving order...",
  "Ordinea a fost salvată.": "Order saved.",
  "Alege cel puțin un fișier.": "Choose at least one file.",
  "Batch-ul depășește limita totală de 500 MB.": "The batch exceeds the 500 MB total limit.",
  "Fișierul nu mai există.": "The file no longer exists.",
  "Se șterge fișierul...": "Deleting file...",
  "Fișier șters.": "File deleted.",
  "Scrie sau lipește codul înainte de salvare.": "Write or paste code before saving.",
  "Se salvează snippet-ul...": "Saving snippet...",
  "Snippet-ul a fost adăugat.": "Snippet added.",
  "Snippet-ul nu mai există.": "The snippet no longer exists.",
  "Se șterge snippet-ul...": "Deleting snippet...",
  "Snippet șters.": "Snippet deleted.",
  "Se salvează...": "Saving...",
  "Selectează codul": "Select code",
  "Salvează tutorialul": "Save tutorial",
  "Conținut tutorial": "Tutorial content",
  "Alegi separat categoria, dificultatea și etichetele. Nodul este poziționat automat într-un loc liber.": "Choose the category, difficulty, and tags separately. The node is automatically positioned in a free location.",
  "Modifici categoria, dificultatea, etichetele și documentația într-un singur loc.": "Edit the category, difficulty, tags, and documentation in one place.",
  "Documentația este prea mare. Limita este 150.000 de caractere HTML.": "The documentation is too large. The limit is 150,000 HTML characters.",
  "Nodul selectat nu mai există.": "The selected node no longer exists.",
  "Nodul sursă nu mai există.": "The source node no longer exists.",
  "Muchia pe care încerci să o editezi nu mai există.": "The edge you are trying to edit no longer exists.",
  "Relația nu mai există.": "The relationship no longer exists.",
  "Modul relație nu a putut fi schimbat.": "Relationship mode could not be changed."
}))

for (const [source, target] of UI_EN_V53) {
  UI_EN.set(source, target)
}

const ATTRIBUTE_EN_V53 = new Map(Object.entries({
  "Mută în sus": "Move up",
  "Mută în jos": "Move down",
  "Fișiere": "Files",
  "Nod cod": "Node code",
  "Deschide documentația": "Open documentation",
  "Închide": "Close"
}))

for (const [source, target] of ATTRIBUTE_EN_V53) {
  ATTRIBUTE_EN.set(source, target)
}

const TAXONOMY_WORDS_EN = {
  categorie: 'category',
  categorii: 'categories',
  dificultate: 'difficulty level',
  dificultăți: 'difficulty levels',
  etichetă: 'tag',
  etichete: 'tags'
}

function pluralizeEnglish(count, singular, plural = `${singular}s`) {
  return Number(count) === 1 ? singular : plural
}

function translateRuntimeText(value) {
  const text = normalizeUiText(value)
  if (!text) return text

  const exact = UI_EN.get(text)
  if (exact) return exact

  let match

  match = text.match(/^(\d+)\s+(categorie|categorii|dificultate|dificultăți|etichetă|etichete)$/i)
  if (match) {
    const count = Number(match[1])
    const word = match[2].toLowerCase()

    if (word === 'categorie' || word === 'categorii') {
      return `${count} ${pluralizeEnglish(count, 'category', 'categories')}`
    }

    if (word === 'dificultate' || word === 'dificultăți') {
      return `${count} ${pluralizeEnglish(count, 'difficulty level', 'difficulty levels')}`
    }

    return `${count} ${pluralizeEnglish(count, 'tag', 'tags')}`
  }

  match = text.match(/^(\d+)\s+(nod|noduri)$/i)
  if (match) {
    const count = Number(match[1])
    return `${count} ${pluralizeEnglish(count, 'node')}`
  }

  match = text.match(/^(\d+)\s+(fișier|fișiere)$/i)
  if (match) {
    const count = Number(match[1])
    return `${count} ${pluralizeEnglish(count, 'file')}`
  }

  match = text.match(/^(\d+)\s+(cale de folder|căi de folder)$/i)
  if (match) {
    const count = Number(match[1])
    return `${count} ${pluralizeEnglish(count, 'folder path')}`
  }

  match = text.match(/^(\d+)\s+(snippet de cod|snippet-uri de cod)$/i)
  if (match) {
    const count = Number(match[1])
    return `${count} ${pluralizeEnglish(count, 'code snippet')}`
  }

  match = text.match(/^(\d+)\s+(element media|elemente media)$/i)
  if (match) {
    const count = Number(match[1])
    return `${count} media ${pluralizeEnglish(count, 'item')}`
  }

  match = text.match(/^·?\s*(\d+)\s+active\s*·\s*(\d+)\s+utilizări în noduri\.\s*Poți edita, dezactiva, reordona sau șterge în siguranță\.$/i)
  if (match) {
    const active = Number(match[1])
    const usage = Number(match[2])
    return `· ${active} active · ${usage} ${pluralizeEnglish(usage, 'node use')}. You can edit, deactivate, reorder, or safely delete items.`
  }

  match = text.match(/^(\d+)\s+utilizări în noduri\.$/i)
  if (match) {
    const count = Number(match[1])
    return `${count} ${pluralizeEnglish(count, 'node use')}.`
  }

  match = text.match(/^Media\s*·\s*(.+)$/i)
  if (match) return `Media · ${match[1]}`

  match = text.match(/^Fișiere\s*·\s*(.+)$/i)
  if (match) return `Files · ${match[1]}`

  match = text.match(/^Nod cod\s*·\s*(.+)$/i)
  if (match) return `Node code · ${match[1]}`

  match = text.match(/^Ordine:\s*(.+)$/i)
  if (match) return `Order: ${match[1]}`

  match = text.match(/^Rang:\s*(.+)$/i)
  if (match) return `Rank: ${match[1]}`

  match = text.match(/^Nu există încă\s+(categorii|dificultăți|etichete)\.$/i)
  if (match) {
    const word = TAXONOMY_WORDS_EN[match[1].toLowerCase()] || match[1]
    return `There are no ${word} yet.`
  }

  match = text.match(/^Editează\s+(categorie|dificultate|etichetă)$/i)
  if (match) {
    return `Edit ${TAXONOMY_WORDS_EN[match[1].toLowerCase()] || match[1]}`
  }

  match = text.match(/^Adaugă\s+(categorie|dificultate|etichetă)$/i)
  if (match) {
    return `Add ${TAXONOMY_WORDS_EN[match[1].toLowerCase()] || match[1]}`
  }

  match = text.match(/^\+\s*(Categorie|Dificultate|Etichetă)$/i)
  if (match) {
    const source = match[1].toLowerCase()
    return `+ ${TAXONOMY_WORDS_EN[source] || match[1]}`
  }

  match = text.match(/^Creează o\s+(categorie|dificultate|etichetă)\s+nouă fără să modifici codul\.$/i)
  if (match) {
    return `Create a new ${TAXONOMY_WORDS_EN[match[1].toLowerCase()] || match[1]} without changing the source code.`
  }

  match = text.match(/^Înlocuiește\s+(categorie|dificultate|etichetă)$/i)
  if (match) {
    return `Replace ${TAXONOMY_WORDS_EN[match[1].toLowerCase()] || match[1]}`
  }

  match = text.match(/^Folosită de\s+(\d+)\s+(nod|noduri)\. La ștergere, eticheta este eliminată din noduri, nodurile rămân intacte, iar istoricul Undo\/Redo este resetat pentru siguranță\.$/i)
  if (match) {
    const count = Number(match[1])
    return `Used by ${count} ${pluralizeEnglish(count, 'node')}. When deleted, the tag is removed from the nodes, the nodes remain intact, and Undo/Redo history is reset for safety.`
  }

  match = text.match(/^Folosită de\s+(\d+)\s+(nod|noduri)\. Dacă este în uz, vei putea muta nodurile într-un element înlocuitor înainte de ștergere\. Orice ștergere resetează istoricul Undo\/Redo pentru siguranță\.$/i)
  if (match) {
    const count = Number(match[1])
    return `Used by ${count} ${pluralizeEnglish(count, 'node')}. If it is in use, you can move the nodes to a replacement item before deletion. Any deletion resets Undo/Redo history for safety.`
  }

  match = text.match(/^„(.+)” este folosită de\s+(\d+)\s+(nod|noduri)\. Nodurile vor fi mutate în elementul ales, apoi elementul vechi va fi șters\.$/i)
  if (match) {
    const count = Number(match[2])
    return `“${match[1]}” is used by ${count} ${pluralizeEnglish(count, 'node')}. The nodes will be moved to the selected item, then the old item will be deleted.`
  }

  match = text.match(/^Documentație FTC despre\s+(.+)\s+în FTC Programming Atlas\.$/i)
  if (match) return `FTC documentation about ${match[1]} in FTC Programming Atlas.`

  match = text.match(/^Supabase a răspuns cu eroarea:\s*(.+)$/i)
  if (match) return `Supabase returned an error: ${match[1]}`

  match = text.match(/^Nodul\s+(\d+)\s+nu a fost șters\.$/i)
  if (match) return `Node ${match[1]} was not deleted.`

  match = text.match(/^Poți folosi maximum\s+(\d+)\s+puncte pe o muchie\.$/i)
  if (match) return `You can use a maximum of ${match[1]} points on an edge.`

  match = text.match(/^Deschide documentația:\s*(.+)$/i)
  if (match) return `Open documentation: ${match[1]}`

  match = text.match(/^Sursa:\s*(.+)\. Acum apasă pe nodul destinație\.$/i)
  if (match) return `Source: ${match[1]}. Now select the destination node.`

  match = text.match(/^Se încarcă\s+(.+)\.\.\.$/i)
  if (match) return `Uploading ${match[1]}...`

  match = text.match(/^Pregătim\s+(\d+)\s+(fișier|fișiere)\.\.\.$/i)
  if (match) {
    const count = Number(match[1])
    return `Preparing ${count} ${pluralizeEnglish(count, 'file')}...`
  }

  match = text.match(/^Se încarcă\s+(\d+)\/(\d+):\s*(.+)$/i)
  if (match) return `Uploading ${match[1]}/${match[2]}: ${match[3]}`

  match = text.match(/^(\d+)\s+(fișier încărcat|fișiere încărcate) cu succes\.$/i)
  if (match) {
    const count = Number(match[1])
    return `${count} ${pluralizeEnglish(count, 'file')} uploaded successfully.`
  }

  match = text.match(/^Poți încărca maximum\s+(\d+)\s+de fișiere într-un singur batch\.$/i)
  if (match) return `You can upload at most ${match[1]} files in a single batch.`

  match = text.match(/^„(.+)” depășește limita de 100 MB\.$/i)
  if (match) return `“${match[1]}” exceeds the 100 MB limit.`

  match = text.match(/^Sigur vrei să ștergi muchia\s+"(.+)"\?$/i)
  if (match) return `Are you sure you want to delete the edge "${match[1]}"?`

  match = text.match(/^Sigur vrei să ștergi nodul\s+"(.+)"\?$/i)
  if (match) return `Are you sure you want to delete the node "${match[1]}"?`

  match = text.match(/^Sigur vrei să ștergi\s+„(.+)”\?$/i)
  if (match) return `Are you sure you want to delete “${match[1]}”?`

  match = text.match(/^Eroare la salvarea poziției nodului:\s*(.+)$/i)
  if (match) return `Error saving the node position: ${match[1]}`

  match = text.match(/^Eroare la mutarea nodului:\s*(.+)$/i)
  if (match) return `Error moving the node: ${match[1]}`

  match = text.match(/^Eroare la salvarea tutorialului:\s*(.+)$/i)
  if (match) return `Error saving the tutorial: ${match[1]}`

  match = text.match(/^Eroare la salvare nod:\s*(.+)$/i)
  if (match) return `Error saving the node: ${match[1]}`

  match = text.match(/^Eroare la salvarea relației:\s*(.+)$/i)
  if (match) return `Error saving the relationship: ${match[1]}`

  match = text.match(/^Eroare la ștergere:\s*(.+)$/i)
  if (match) return `Delete error: ${match[1]}`

  match = text.match(/^Eroare la ștergerea relației:\s*(.+)$/i)
  if (match) return `Error deleting the relationship: ${match[1]}`

  match = text.match(/^Ai modificat poziția nodului „(.+)”, dar nu ai salvat-o\. OK = salvează poziția în Supabase și continuă\. Cancel = rămâi aici fără să pierzi modificarea\.$/i)
  if (match) {
    return `You changed the position of “${match[1]}” but have not saved it. OK = save the position to Supabase and continue. Cancel = stay here without losing the change.`
  }



  match = text.match(/^snippet de cod\. Fiecare exemplu apare în documentație cu buton de copiere\.$/i)
  if (match) {
    return 'code snippet. Each example appears in the documentation with a copy button.'
  }

  match = text.match(/^snippet-uri de cod\. Fiecare exemplu apare în documentație cu buton de copiere\.$/i)
  if (match) {
    return 'code snippets. Each example appears in the documentation with a copy button.'
  }

  match = text.match(/^element media\. Imaginile și videoclipurile apar sub documentația nodului\.$/i)
  if (match) {
    return 'media item. Images and videos appear below the node documentation.'
  }

  match = text.match(/^elemente media\. Imaginile și videoclipurile apar sub documentația nodului\.$/i)
  if (match) {
    return 'media items. Images and videos appear below the node documentation.'
  }

  match = text.match(/^fișier\s*·$/i)
  if (match) return 'file ·'

  match = text.match(/^fișiere\s*·$/i)
  if (match) return 'files ·'

  match = text.match(/^cale de folder\s*·\s*(.+)\s+total\.$/i)
  if (match) return `folder path · ${match[1]} total.`

  match = text.match(/^căi de folder\s*·\s*(.+)\s+total\.$/i)
  if (match) return `folder paths · ${match[1]} total.`

  match = text.match(/^(\d+)\s+relații$/i)
  if (match) {
    const count = Number(match[1])
    return `${count} ${pluralizeEnglish(count, 'relationship')}`
  }

  match = text.match(/^(\d+)\s+topicuri încărcate din atlas\.$/i)
  if (match) {
    const count = Number(match[1])
    return `${count} ${pluralizeEnglish(count, 'topic')} loaded from the Atlas.`
  }

  match = text.match(/^punctul\s+(\d+)\s+selectat$/i)
  if (match) return `point ${match[1]} selected`

  match = text.match(/^(\d+)\s+(punct de traseu|puncte de traseu)$/i)
  if (match) {
    const count = Number(match[1])
    return `${count} ${pluralizeEnglish(count, 'route point')}`
  }

  match = text.match(/^Media\s*·\s*(.+)$/i)
  if (match) return `Media · ${match[1]}`

  match = text.match(/^Fișiere\s*·\s*(.+)$/i)
  if (match) return `Files · ${match[1]}`

  match = text.match(/^Nod cod\s*·\s*(.+)$/i)
  if (match) return `Node code · ${match[1]}`

  return text
}

function installEnglishDialogTranslation() {
  if (language !== 'en') return
  if (window.__atlasEnglishDialogsInstalled) return

  window.__atlasEnglishDialogsInstalled = true

  const nativeAlert = window.alert.bind(window)
  const nativeConfirm = window.confirm.bind(window)
  const nativePrompt = window.prompt.bind(window)

  window.alert = (message) =>
    nativeAlert(translateRuntimeText(String(message ?? '')))

  window.confirm = (message) =>
    nativeConfirm(translateRuntimeText(String(message ?? '')))

  window.prompt = (message, defaultValue) =>
    nativePrompt(
      translateRuntimeText(String(message ?? '')),
      defaultValue
    )
}


// Additional v53 flow/status strings that are generated by atlas-script.js.
;[
  ['Selectează mai întâi textul pe care vrei să pui link-ul.', 'Select the text you want to link first.'],
  ['Link invalid. Folosește o adresă http:// sau https://.', 'Invalid link. Use an http:// or https:// address.'],
  ['Muchia creată', 'Edge created'],
  ['Muchia actualizată', 'Edge updated'],
  ['Muchie selectată', 'Selected edge'],
  ['relație', 'relationship'],
  ['punct de traseu', 'route point'],
  ['puncte de traseu', 'route points'],
  ['Niciun nod nu corespunde filtrelor.', 'No nodes match the current filters.'],
  ['topicuri încărcate din atlas.', 'topics loaded from the Atlas.'],
  ['Alege mai întâi nodul sursă, apoi apasă pe nodul destinație.', 'Select the source node first, then select the destination node.'],
  ['apasă F sau „Salvează poziția”.', 'press F or “Save position”.'],
  ['Adaugă media', 'Add media'],
  ['Acest nod nu are încă imagini sau videoclipuri.', 'This node does not have images or videos yet.'],
  ['Adaugă fișiere', 'Add files'],
  ['Poți atașa arhive, PDF-uri, proiecte, configurații, surse și foldere întregi.', 'You can attach archives, PDFs, projects, configuration files, source files, and complete folders.'],
  ['Rădăcina nodului', 'Node root'],
  ['Fără documentație încă.', 'No documentation yet.'],
  ['Fără etichete', 'No tags']
].forEach(([source, target]) => UI_EN.set(source, target))


;[
  ['Ex: Dashboard după tuning', 'Example: Dashboard after tuning'],
  ['Implicit: numele fișierului', 'Default: file name'],
  ['Ce conține fișierul?', 'What does the file contain?']
].forEach(([source, target]) => ATTRIBUTE_EN.set(source, target))

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

  const raw = node.nodeValue || ''
  const normalized = normalizeUiText(raw)

  const insideProtectedContent = Boolean(
    parent.closest(CONTENT_SKIP_SELECTOR)
  )

  const protectedSystemText = new Set([
    'Fără documentație încă.',
    'No documentation yet.'
  ])

  if (
    insideProtectedContent &&
    !protectedSystemText.has(normalized)
  ) {
    return
  }
  if (!normalized) return

  const translated = translateRuntimeText(normalized)
  if (!translated || translated === normalized) return

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


const EDGE_TRANSLATION_FACTOR = 1000000

function edgeTranslationId(sourceId, targetId) {
  const source = Number(sourceId)
  const target = Number(targetId)

  if (
    !Number.isSafeInteger(source) ||
    !Number.isSafeInteger(target) ||
    source <= 0 ||
    target <= 0
  ) {
    return null
  }

  // atlas_edges currently uses a composite source/target identity.
  // Encode that pair into the bigint entity_id used by atlas_translations.
  return source * EDGE_TRANSLATION_FACTOR + target
}

function getCurrentEdgeSelection() {
  const selected =
    document.querySelector(
      '.edge-group.selected[data-edge-source][data-edge-target]'
    ) ||
    document.querySelector(
      '.edge-group.selected .edge-label-hit[data-source][data-target]'
    )

  if (!selected) return null

  const sourceId = Number(
    selected.dataset.edgeSource ?? selected.dataset.source
  )
  const targetId = Number(
    selected.dataset.edgeTarget ?? selected.dataset.target
  )

  if (
    !Number.isSafeInteger(sourceId) ||
    !Number.isSafeInteger(targetId) ||
    sourceId <= 0 ||
    targetId <= 0
  ) {
    return null
  }

  return { sourceId, targetId }
}

function applyEdgeTranslations() {
  if (language !== 'en') return
  if (!translationLoadFinished) return

  document
    .querySelectorAll(
      '.edge-group[data-edge-source][data-edge-target]'
    )
    .forEach((group) => {
      const sourceId = Number(group.dataset.edgeSource)
      const targetId = Number(group.dataset.edgeTarget)
      const entityId = edgeTranslationId(sourceId, targetId)

      if (!entityId) return

      const labelTranslation = getTranslation(
        'edge',
        entityId,
        'label'
      )

      if (!labelTranslation?.value) return

      const labelGroup = group.querySelector('.edge-label')
      const label = labelGroup?.querySelector('text')

      if (label && label.textContent !== labelTranslation.value) {
        label.textContent = labelTranslation.value
      }

      // Relationship label geometry is initially sized from the Romanian
      // source label. Re-size it after applying the English translation so
      // longer English labels never overflow the badge.
      const labelWidth = Math.max(
        76,
        String(labelTranslation.value).length * 6.6
      )

      const labelRect = labelGroup?.querySelector('rect')
      const hitRect = group.querySelector(
        '.edge-label-hit rect'
      )

      if (labelRect) {
        labelRect.setAttribute('x', String(-labelWidth / 2))
        labelRect.setAttribute('width', String(labelWidth))
      }

      if (hitRect) {
        hitRect.setAttribute(
          'x',
          String(-labelWidth / 2 - 8)
        )
        hitRect.setAttribute(
          'width',
          String(labelWidth + 16)
        )
      }
    })

  document
    .querySelectorAll(
      '.relation-item[data-relation-source][data-relation-target]'
    )
    .forEach((item) => {
      const sourceId = Number(item.dataset.relationSource)
      const targetId = Number(item.dataset.relationTarget)
      const entityId = edgeTranslationId(sourceId, targetId)

      if (!entityId) return

      const labelTranslation = getTranslation(
        'edge',
        entityId,
        'label'
      )

      const targetTranslation = getTranslation(
        'node',
        targetId,
        'title'
      )

      const title = item.querySelector('strong')
      const label = item.querySelector('span')

      if (
        title &&
        targetTranslation?.value &&
        title.textContent !== targetTranslation.value
      ) {
        title.textContent = targetTranslation.value
      }

      if (
        label &&
        labelTranslation?.value &&
        label.textContent !== labelTranslation.value
      ) {
        label.textContent = labelTranslation.value
      }
    })
}

function setMetaContent(selector, value) {
  const element = document.querySelector(selector)
  if (element) element.setAttribute('content', value)
}

function englishSeoDescription(title, content) {
  const plain = plainTextFromHtml(content || '')
    .replace(/\s+/g, ' ')
    .trim()

  if (!plain) {
    return `FTC programming documentation for ${title || 'this topic'} in FTC Programming Atlas.`
  }

  const prefix = `${title || 'FTC Programming'} — `
  const maxLength = 158
  const available = Math.max(40, maxLength - prefix.length)

  const excerpt =
    plain.length > available
      ? `${plain.slice(0, available - 1).trimEnd()}…`
      : plain

  return `${prefix}${excerpt}`
}

function applyEnglishClientSeo() {
  if (language !== 'en') return
  if (!translationLoadFinished) return

  const nodeId = getCurrentNodeId()

  if (!nodeId) {
    const title =
      'FTC Programming Atlas | FTC Robotics Programming Guide'
    const description =
      'Interactive FTC programming guide for FTC SDK, Pedro Pathing, Road Runner, FTCLib, control loops, vision, autonomous programming, and debugging.'

    document.title = title
    setMetaContent('meta[name="description"]', description)
    setMetaContent('meta[property="og:locale"]', 'en_US')
    setMetaContent('meta[property="og:title"]', title)
    setMetaContent('meta[property="og:description"]', description)
    setMetaContent('meta[name="twitter:title"]', title)
    setMetaContent('meta[name="twitter:description"]', description)
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

  if (!titleTranslation?.value) return

  const title = `${titleTranslation.value} | FTC Programming Atlas`
  const description = englishSeoDescription(
    titleTranslation.value,
    contentTranslation?.value || ''
  )

  document.title = title
  setMetaContent('meta[name="description"]', description)
  setMetaContent('meta[property="og:locale"]', 'en_US')
  setMetaContent('meta[property="og:title"]', title)
  setMetaContent('meta[property="og:description"]', description)
  setMetaContent('meta[name="twitter:title"]', title)
  setMetaContent('meta[name="twitter:description"]', description)
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


function applyContextNodeTitleTranslations() {
  if (language !== 'en') return
  if (!translationLoadFinished) return

  const nodeId = getCurrentNodeId()
  if (!nodeId) return

  const titleTranslation = getTranslation(
    'node',
    nodeId,
    'title'
  )

  if (!titleTranslation?.value) return

  const translatedTitle = titleTranslation.value

  const managerPrefixes = [
    ['#mediaManagerTitle', 'Media'],
    ['#fileManagerTitle', 'Files'],
    ['#codeManagerTitle', 'Node code']
  ]

  managerPrefixes.forEach(([selector, prefix]) => {
    const element = document.querySelector(selector)
    if (!element || !element.textContent.includes('·')) return

    const nextText = `${prefix} · ${translatedTitle}`
    if (element.textContent !== nextText) {
      element.textContent = nextText
    }
  })

  const selectedTitle = document.querySelector(
    '#selectedStrip > strong'
  )

  if (
    selectedTitle &&
    !document.querySelector(
      '#selectedStrip strong + br + .edge-label'
    ) &&
    selectedTitle.textContent &&
    selectedTitle.textContent !== translatedTitle &&
    !/edge|muchie/i.test(selectedTitle.textContent)
  ) {
    const selectedNodeElement = document.querySelector(
      `.node.active[data-node-id="${nodeId}"]`
    )

    if (selectedNodeElement) {
      selectedTitle.textContent = translatedTitle
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
      applyEdgeTranslations()
      applyContextNodeTitleTranslations()
      applyEnglishClientSeo()
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


async function fetchBaseEdge(sourceId, targetId) {
  const url = new URL(`${SUPABASE_URL}/rest/v1/atlas_edges`)
  url.searchParams.set(
    'select',
    'source_id,target_id,label'
  )
  url.searchParams.set(
    'project_id',
    `eq.${PROJECT_ID}`
  )
  url.searchParams.set('source_id', `eq.${Number(sourceId)}`)
  url.searchParams.set('target_id', `eq.${Number(targetId)}`)
  url.searchParams.set('limit', '1')

  const response = await fetch(url, {
    headers: {
      apikey: SUPABASE_KEY,
      accept: 'application/json'
    }
  })

  if (!response.ok) {
    throw new Error(
      `Relation lookup failed with HTTP ${response.status}`
    )
  }

  const rows = await response.json()
  return Array.isArray(rows) ? rows[0] || null : null
}

async function saveEdgeTranslation(sourceId, targetId, labelValue) {
  const accessToken = getAccessToken()

  if (!accessToken) {
    throw new Error(
      language === 'en'
        ? 'Editor authentication is required.'
        : 'Este necesară autentificarea de editor.'
    )
  }

  const entityId = edgeTranslationId(sourceId, targetId)

  if (!entityId) {
    throw new Error(
      language === 'en'
        ? 'Invalid relation identity.'
        : 'Identitatea relației nu este validă.'
    )
  }

  const row = {
    project_id: PROJECT_ID,
    entity_type: 'edge',
    entity_id: entityId,
    field_name: 'label',
    language: SECONDARY_LANGUAGE,
    value: labelValue.trim(),
    content_format: 'plain',
    updated_at: new Date().toISOString()
  }

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
    body: JSON.stringify(row)
  })

  if (!response.ok) {
    const body = await response.text()
    throw new Error(
      `Relation translation save failed with HTTP ${response.status}: ${body}`
    )
  }

  const saved = await response.json()
  const savedRow = Array.isArray(saved) ? saved[0] || row : row

  translationMap.set(
    translationKey('edge', entityId, 'label'),
    savedRow
  )
}

async function removeEdgeTranslation(sourceId, targetId) {
  const accessToken = getAccessToken()

  if (!accessToken) {
    throw new Error(
      language === 'en'
        ? 'Editor authentication is required.'
        : 'Este necesară autentificarea de editor.'
    )
  }

  const entityId = edgeTranslationId(sourceId, targetId)

  if (!entityId) return

  const url = new URL(
    `${SUPABASE_URL}/rest/v1/atlas_translations`
  )

  url.searchParams.set('project_id', `eq.${PROJECT_ID}`)
  url.searchParams.set('entity_type', 'eq.edge')
  url.searchParams.set('entity_id', `eq.${entityId}`)
  url.searchParams.set('language', `eq.${SECONDARY_LANGUAGE}`)
  url.searchParams.set('field_name', 'eq.label')

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
      `Relation translation delete failed with HTTP ${response.status}: ${body}`
    )
  }

  translationMap.delete(
    translationKey('edge', entityId, 'label')
  )
}

async function openEdgeTranslationManager(selection) {
  const { sourceId, targetId } = selection
  const entityId = edgeTranslationId(sourceId, targetId)

  closeTranslationManager()

  let edge

  try {
    edge = await fetchBaseEdge(sourceId, targetId)
  } catch (error) {
    window.alert(error.message)
    return
  }

  if (!edge) {
    window.alert(
      language === 'en'
        ? 'The selected relation no longer exists.'
        : 'Relația selectată nu mai există.'
    )
    return
  }

  const labelTranslation = getTranslation(
    'edge',
    entityId,
    'label'
  )

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
              ? 'Relation translation · Romanian → English'
              : 'Traducere relație · Română → Engleză'
          }</h3>
          <p>${
            language === 'en'
              ? 'Translate the relation label shown on the Atlas map and inside node documentation.'
              : 'Tradu eticheta relației afișată pe hartă și în documentația nodurilor.'
          }</p>
        </div>

        <button
          class="icon-btn"
          type="button"
          data-atlas-i18n-close
          aria-label="${language === 'en' ? 'Close' : 'Închide'}"
        >✕</button>
      </div>

      <div class="atlas-i18n-body">
        <section class="atlas-i18n-source">
          <strong>RO · ${
            escapeHtml(edge.label || 'relație')
          }</strong>
          <p>${
            language === 'en'
              ? 'Original relation label'
              : 'Eticheta originală a relației'
          }</p>
        </section>

        <div class="field">
          <label for="atlasI18nEdgeLabelInput">EN · ${
            language === 'en'
              ? 'Relation label'
              : 'Eticheta relației'
          }</label>

          <input
            id="atlasI18nEdgeLabelInput"
            maxlength="240"
            value="${escapeHtmlAttribute(
              labelTranslation?.value || ''
            )}"
            placeholder="${
              language === 'en'
                ? 'Example: depends on / uses / continues to'
                : 'Ex: depends on / uses / continues to'
            }"
          />
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
        >${language === 'en' ? 'Cancel' : 'Renunță'}</button>

        <button
          class="btn primary"
          id="atlasI18nSaveBtn"
          type="button"
        >${language === 'en' ? 'Save English' : 'Salvează EN'}</button>
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

  document
    .getElementById('atlasI18nSaveBtn')
    ?.addEventListener('click', async () => {
      const status = document.getElementById(
        'atlasI18nStatus'
      )
      const saveButton = document.getElementById(
        'atlasI18nSaveBtn'
      )
      const labelValue =
        document.getElementById(
          'atlasI18nEdgeLabelInput'
        )?.value || ''

      if (!labelValue.trim()) {
        status.textContent =
          language === 'en'
            ? 'Add the English relation label first.'
            : 'Adaugă mai întâi eticheta relației în engleză.'
        return
      }

      saveButton.disabled = true
      status.textContent =
        language === 'en'
          ? 'Saving relation translation...'
          : 'Se salvează traducerea relației...'

      try {
        await saveEdgeTranslation(
          sourceId,
          targetId,
          labelValue
        )

        status.textContent =
          language === 'en'
            ? 'English relation translation saved.'
            : 'Traducerea EN a relației a fost salvată.'

        translationLoadFinished = true
        applyEdgeTranslations()

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
          ? 'Remove the English translation for this relation?'
          : 'Ștergi traducerea EN pentru această relație?'
      )

      if (!confirmed) return

      const status = document.getElementById(
        'atlasI18nStatus'
      )

      try {
        status.textContent =
          language === 'en'
            ? 'Removing relation translation...'
            : 'Se șterge traducerea relației...'

        await removeEdgeTranslation(
          sourceId,
          targetId
        )

        status.textContent =
          language === 'en'
            ? 'English relation translation removed.'
            : 'Traducerea EN a relației a fost ștearsă.'

        window.setTimeout(() => {
          closeTranslationManager()
          window.location.reload()
        }, 450)
      } catch (error) {
        status.textContent = error.message
      }
    })
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
  const edgeSelection = getCurrentEdgeSelection()

  if (edgeSelection) {
    await openEdgeTranslationManager(edgeSelection)
    return
  }

  const nodeId = getCurrentNodeId()

  if (!nodeId) {
    window.alert(
      language === 'en'
        ? 'Select a node or relation first.'
        : 'Selectează mai întâi un nod sau o relație.'
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

  installEnglishDialogTranslation()
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
