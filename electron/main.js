const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs').promises;
const { spawn } = require('child_process');

let mainWindow;
let shellSession = null;
let currentWorkingDirectory = process.cwd();

const createWindow = () => {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
    titleBarStyle: 'hiddenInset',
    titleBarOverlay: {
      color: '#1e1e1e',
      symbolColor: '#ffffff',
      height: 30
    },
    show: false,
  });

  const isDev = process.env.NODE_ENV === 'development';
  
  if (isDev) {
    mainWindow.loadURL('http://localhost:3000');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });
};

// Terminal session management
const createShellSession = () => {
  if (shellSession) {
    shellSession.kill();
  }

  const shell = process.platform === 'win32' ? 'cmd' : '/bin/bash';
  const shellArgs = process.platform === 'win32' ? [] : ['--login'];
  
  shellSession = spawn(shell, shellArgs, {
    cwd: currentWorkingDirectory,
    env: {
      ...process.env,
      TERM: 'xterm-color',
      COLORTERM: 'truecolor',
      CLICOLOR: '1',
      CLICOLOR_FORCE: '1',
      COLUMNS: '80', // Set terminal width for proper column formatting
      LINES: '24',
      // Enable colors for common commands
      GREP_OPTIONS: '--color=always',
      LS_COLORS: 'di=1;34:ln=1;35:so=32:pi=33:ex=1;32:bd=46;34:cd=43;34:su=41;30:sg=46;30:tw=42;30:ow=43;30'
    },
    stdio: ['pipe', 'pipe', 'pipe']
  });

  shellSession.stdout.on('data', (data) => {
    if (mainWindow) {
      mainWindow.webContents.send('shell-output', {
        type: 'stdout',
        data: data.toString()
      });
    }
  });

  shellSession.stderr.on('data', (data) => {
    if (mainWindow) {
      mainWindow.webContents.send('shell-output', {
        type: 'stderr',
        data: data.toString()
      });
    }
  });

  shellSession.on('close', (code) => {
    if (mainWindow) {
      mainWindow.webContents.send('shell-output', {
        type: 'close',
        code: code
      });
    }
    shellSession = null;
  });

  return shellSession;
};

app.whenReady().then(() => {
  createWindow();
  createShellSession();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// IPC handlers for file operations
ipcMain.handle('read-file', async (_, filePath) => {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    return { success: true, content };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('write-file', async (_, filePath, content) => {
  try {
    await fs.writeFile(filePath, content, 'utf-8');
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('list-directory', async (_, dirPath) => {
  try {
    const files = await fs.readdir(dirPath, { withFileTypes: true });
    const result = files.map(file => ({
      name: file.name,
      isDirectory: file.isDirectory(),
      isFile: file.isFile(),
    }));
    return { success: true, files: result };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('execute-command', async (_, command, options = {}) => {
  if (!shellSession) {
    createShellSession();
  }

  return new Promise((resolve) => {
    if (!shellSession) {
      resolve({
        success: false,
        error: 'Shell session not available',
        stdout: '',
        stderr: ''
      });
      return;
    }

    // Send command to persistent shell session
    shellSession.stdin.write(command + '\n');

    // For immediate response, we'll use a timeout approach
    // In a real implementation, you'd want a more sophisticated way to detect command completion
    setTimeout(() => {
      resolve({
        success: true,
        stdout: 'Command sent to shell session. Check output stream for results.',
        stderr: '',
        exitCode: 0
      });
    }, 100);
  });
});

// New handler for persistent shell commands
ipcMain.handle('execute-shell-command', async (_, command) => {
  if (!shellSession) {
    createShellSession();
    await new Promise(resolve => setTimeout(resolve, 500)); // Wait for shell to initialize
  }

  if (!shellSession) {
    return {
      success: false,
      error: 'Failed to create shell session'
    };
  }

  try {
    shellSession.stdin.write(command + '\n');
    return {
      success: true,
      message: 'Command sent to persistent shell'
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
});

// Execute command with collected output using persistent session
ipcMain.handle('execute-command-with-output', async (_, command) => {
  return new Promise((resolve) => {
    if (!shellSession) {
      createShellSession();
      // Wait for shell to initialize
      setTimeout(() => executeCommand(), 500);
    } else {
      executeCommand();
    }

    function executeCommand() {
      if (!shellSession) {
        resolve({
          success: false,
          stdout: '',
          stderr: 'Failed to create shell session',
          exitCode: -1
        });
        return;
      }

      let outputBuffer = '';
      let errorBuffer = '';
      const commandId = Date.now() + Math.random();
      const startMarker = `__DTUI2_START_${commandId}__`;
      const endMarker = `__DTUI2_END_${commandId}__`;
      let commandStarted = false;
      let commandCompleted = false;

      // Data listeners
      const stdoutListener = (data) => {
        const output = data.toString();
        outputBuffer += output;

        // Check for start marker
        if (!commandStarted && output.includes(startMarker)) {
          commandStarted = true;
          outputBuffer = outputBuffer.split(startMarker)[1] || '';
        }

        // Check for end marker
        if (commandStarted && output.includes(endMarker)) {
          commandCompleted = true;
          outputBuffer = outputBuffer.split(endMarker)[0] || '';
          cleanup();
        }
      };

      const stderrListener = (data) => {
        errorBuffer += data.toString();
      };

      const cleanup = () => {
        shellSession.stdout.removeListener('data', stdoutListener);
        shellSession.stderr.removeListener('data', stderrListener);
        
        const cleanOutput = outputBuffer
          .replace(/\r\n/g, '\n')
          .replace(/\r/g, '\n')
          .replace(/\x1b\[[0-9;]*[JKH]/g, '') // Remove cursor control sequences
          .trim();

        resolve({
          success: true,
          stdout: cleanOutput,
          stderr: errorBuffer,
          exitCode: 0
        });
      };

      // Set up listeners
      shellSession.stdout.on('data', stdoutListener);
      shellSession.stderr.on('data', stderrListener);

      // Send command with markers
      const wrappedCommand = `echo "${startMarker}"; ${command}; echo "${endMarker}"`;
      shellSession.stdin.write(wrappedCommand + '\n');

      // Timeout handling
      setTimeout(() => {
        if (!commandCompleted) {
          cleanup();
          resolve({
            success: false,
            stdout: outputBuffer,
            stderr: 'Command timed out',
            exitCode: -1
          });
        }
      }, 10000);
    }
  });
});

// Handle working directory changes
ipcMain.handle('change-directory', async (_, dirPath) => {
  try {
    const absolutePath = path.isAbsolute(dirPath) ? dirPath : path.resolve(currentWorkingDirectory, dirPath);
    await fs.access(absolutePath);
    
    currentWorkingDirectory = absolutePath;
    
    if (shellSession) {
      const cdCommand = process.platform === 'win32' ? `cd /d "${absolutePath}"` : `cd "${absolutePath}"`;
      shellSession.stdin.write(cdCommand + '\n');
    }
    
    return {
      success: true,
      cwd: currentWorkingDirectory
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
});

// Get current working directory
ipcMain.handle('get-current-directory', async () => {
  return {
    success: true,
    cwd: currentWorkingDirectory
  };
});

ipcMain.handle('show-open-dialog', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [
      { name: 'All Files', extensions: ['*'] },
      { name: 'Text Files', extensions: ['txt', 'md', 'js', 'ts', 'py', 'json'] }
    ]
  });
  return result;
});

ipcMain.handle('show-save-dialog', async () => {
  const result = await dialog.showSaveDialog(mainWindow, {
    filters: [
      { name: 'All Files', extensions: ['*'] },
      { name: 'Text Files', extensions: ['txt', 'md', 'js', 'ts', 'py', 'json'] }
    ]
  });
  return result;
});