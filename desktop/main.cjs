const {
  app,
  BrowserWindow,
  net,
  protocol,
  shell
} = require('electron')

const path = require('node:path')
const { pathToFileURL } = require('node:url')

protocol.registerSchemesAsPrivileged([
  {
    scheme: 'atlas',
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      corsEnabled: true,
      stream: true
    }
  }
])

const APP_ORIGIN = 'atlas://app'
let mainWindow = null

function isSafeRelativePath(value) {
  const normalized = path.normalize(value)

  return (
    normalized !== '..' &&
    !normalized.startsWith(`..${path.sep}`) &&
    !path.isAbsolute(normalized)
  )
}

function registerAtlasProtocol() {
  const webRoot = path.join(app.getAppPath(), 'www')

  protocol.handle('atlas', async (request) => {
    const requestUrl = new URL(request.url)

    let relativePath = decodeURIComponent(requestUrl.pathname)
      .replace(/^\/+/, '')

    if (!relativePath) {
      relativePath = 'index.html'
    }

    // SPA deep links such as /node/12/pedropathing must still boot index.html.
    if (relativePath.startsWith('node/')) {
      relativePath = 'index.html'
    }

    if (!isSafeRelativePath(relativePath)) {
      return new Response('Not found', { status: 404 })
    }

    const filePath = path.join(webRoot, relativePath)

    return net.fetch(
      pathToFileURL(filePath).toString()
    )
  })
}

function isInternalUrl(value) {
  try {
    const url = new URL(value)
    return url.protocol === 'atlas:' && url.host === 'app'
  } catch {
    return false
  }
}

function openExternal(value) {
  if (!/^https?:\/\//i.test(value)) return
  shell.openExternal(value).catch(() => {})
}

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 960,
    minHeight: 640,
    backgroundColor: '#000000',
    autoHideMenuBar: true,
    show: false,
    icon: path.join(app.getAppPath(), 'build', 'icon.ico'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true
    }
  })

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (isInternalUrl(url)) {
      return { action: 'allow' }
    }

    openExternal(url)
    return { action: 'deny' }
  })

  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (isInternalUrl(url)) return

    event.preventDefault()
    openExternal(url)
  })

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show()
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })

  mainWindow.loadURL(`${APP_ORIGIN}/index.html`)
}

const gotSingleInstanceLock = app.requestSingleInstanceLock()

if (!gotSingleInstanceLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    if (!mainWindow) return

    if (mainWindow.isMinimized()) {
      mainWindow.restore()
    }

    mainWindow.show()
    mainWindow.focus()
  })

  app.whenReady().then(() => {
    registerAtlasProtocol()
    createMainWindow()

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createMainWindow()
      }
    })
  })
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
