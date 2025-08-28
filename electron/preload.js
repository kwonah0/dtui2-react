const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // File operations
  readFile: (filePath) => ipcRenderer.invoke('read-file', filePath),
  writeFile: (filePath, content) => ipcRenderer.invoke('write-file', filePath, content),
  listDirectory: (dirPath) => ipcRenderer.invoke('list-directory', dirPath),
  
  // Shell operations
  executeCommand: (command, options) => ipcRenderer.invoke('execute-command', command, options),
  executeShellCommand: (command) => ipcRenderer.invoke('execute-shell-command', command),
  executeCommandWithOutput: (command) => ipcRenderer.invoke('execute-command-with-output', command),
  changeDirectory: (dirPath) => ipcRenderer.invoke('change-directory', dirPath),
  getCurrentDirectory: () => ipcRenderer.invoke('get-current-directory'),
  
  // Real-time shell output listening
  onShellOutput: (callback) => {
    ipcRenderer.on('shell-output', (_, data) => callback(data));
  },
  removeShellOutputListener: () => {
    ipcRenderer.removeAllListeners('shell-output');
  },
  
  // Dialog operations
  showOpenDialog: () => ipcRenderer.invoke('show-open-dialog'),
  showSaveDialog: () => ipcRenderer.invoke('show-save-dialog'),
  
  // Configuration operations
  getConfig: () => ipcRenderer.invoke('get-config'),
  setConfig: (config) => ipcRenderer.invoke('set-config', config),
  watchConfig: (callback) => {
    ipcRenderer.on('config-changed', callback);
  },
  unwatchConfig: () => {
    ipcRenderer.removeAllListeners('config-changed');
  },
  
  // Test shell agent
  testShellAgent: () => ipcRenderer.invoke('test-shell-agent'),
  
  // Execute shell command for AI responses
  executeShellAICommand: (prompt) => ipcRenderer.invoke('execute-shell-ai-command', prompt),
});