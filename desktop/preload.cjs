const { contextBridge } = require('electron')

contextBridge.exposeInMainWorld('atlasDesktop', {
  isDesktop: true,
  platform: process.platform
})
