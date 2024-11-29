const { contextBridge, ipcRenderer } = require('electron')
const fs = require('fs').promises

contextBridge.exposeInMainWorld(
  'electron',
  {
    // File operations
    readFile: async (filePath) => {
      try {
        return await fs.readFile(filePath, 'utf8')
      } catch (error) {
        console.error('Failed to read file:', error)
        throw error
      }
    },
    writeFile: async (filePath, content) => {
      try {
        await fs.writeFile(filePath, content, 'utf8')
      } catch (error) {
        console.error('Failed to write file:', error)
        throw error
      }
    },
    saveFile: async (content) => {
      return await ipcRenderer.invoke('save-file', content)
    },
    // IPC listeners
    onFileOpened: (callback) => {
      ipcRenderer.on('file-opened', (event, filePath) => callback(filePath))
    },
    onSaveRequested: (callback) => {
      ipcRenderer.on('save-requested', () => callback())
    }
  }
)
