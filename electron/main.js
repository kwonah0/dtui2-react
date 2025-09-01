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
    mainWindow.loadURL('http://localhost:3002');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
    // Open DevTools in production for debugging
    mainWindow.webContents.openDevTools();
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    
    // Test renderer process AIProvider after a delay
    setTimeout(() => {
      console.log('🧪 Testing renderer AIProvider from main process...');
      mainWindow.webContents.executeJavaScript(`
        try {
          console.log('=== RENDERER SCRIPT EXECUTION START ===');
          console.log('Window object keys:', Object.keys(window).filter(k => k.includes('test')));
          console.log('testAIProvider type:', typeof window.testAIProvider);
          
          if (typeof window.testAIProvider === 'function') {
            console.log('=== CALLING GLOBAL TEST FUNCTION ===');
            return window.testAIProvider().catch(err => {
              console.error('testAIProvider function error:', err);
              return 'Function execution error: ' + err.message;
            });
          } else {
            console.error('Global testAIProvider function not available');
            return 'Error: Global function not found';
          }
        } catch (error) {
          console.error('=== RENDERER SCRIPT ERROR ===', error);
          return 'Script error: ' + error.message + ' | Stack: ' + error.stack;
        }
      `).then(result => {
        console.log('📊 Renderer test completed:', result);
      }).catch(error => {
        console.error('❌ Renderer test failed:');
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
        console.error('Full error object:', JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
      });
    }, 3000);
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
        
        // Extract exit code from output
        let actualExitCode = 0;
        let cleanOutput = outputBuffer
          .replace(/\r\n/g, '\n')
          .replace(/\r/g, '\n')
          .replace(/\x1b\[[0-9;]*[JKH]/g, ''); // Remove cursor control sequences
        
        // Look for exit code marker
        const exitCodeMatch = cleanOutput.match(/__EXIT_CODE__(\d+)/);
        if (exitCodeMatch) {
          actualExitCode = parseInt(exitCodeMatch[1]);
          // Remove exit code line from output
          cleanOutput = cleanOutput.replace(/__EXIT_CODE__\d+\n?/, '');
        }
        
        cleanOutput = cleanOutput.trim();

        resolve({
          success: actualExitCode === 0,
          stdout: cleanOutput,
          stderr: errorBuffer,
          exitCode: actualExitCode
        });
      };

      // Set up listeners
      shellSession.stdout.on('data', stdoutListener);
      shellSession.stderr.on('data', stderrListener);

      // Send command with markers and capture exit code
      const wrappedCommand = `echo "${startMarker}"; ${command}; echo "__EXIT_CODE__$?"; echo "${endMarker}"`;
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

// Configuration operations - Using ConfigService with 3-stage priority system
ipcMain.handle('get-config', async () => {
  try {
    // Import ConfigService dynamically to avoid module resolution issues
    const { configService } = await import('../src/config/ConfigService.js');
    
    // ConfigService already implements the 3-stage priority system:
    // 1. Environment variables (DTUI_CFG__)
    // 2. User config file (DTUI_USER_CONFIGFILE)
    // 3. Built-in dtui.json or defaults
    const config = configService.getAll();
    console.log('✅ Loaded config with 3-stage priority system:', config);
    return config;
  } catch (error) {
    console.error('Failed to load config via ConfigService:', error);
    
    // Fallback to safe built-in defaults (compatible with both regular and HPC environments)
    const fallbackConfig = {
      ai: {
        provider: 'shell',
        shell: {
          command: 'bash',
          args: ['-c', 'echo "[DTUI-SHELL]:"; cat'],
          template: '{command} {args} <<< "{prompt}"',
          timeout: 10000,
          streaming: false,
          outputFormat: {
            useCodeBlock: true,
            codeBlockSyntax: 'shell'
          }
        }
      },
      terminal: {
        shell: '/bin/bash',
        columns: 80,
        lines: 24
      },
      ui: {
        theme: 'dark',
        fontSize: 14
      }
    };
    
    console.log('⚠️ Using built-in fallback config:', fallbackConfig);
    return fallbackConfig;
  }
});

ipcMain.handle('set-config', async (_, config) => {
  try {
    const configPath = path.join(__dirname, '../dtui.json');
    await fs.writeFile(configPath, JSON.stringify(config, null, 2), 'utf-8');
    
    // Notify renderer process of config change
    if (mainWindow) {
      mainWindow.webContents.send('config-changed', config);
    }
    
    return { success: true };
  } catch (error) {
    console.error('Failed to save config:', error);
    return { success: false, error: error.message };
  }
});

// Test shell agent functionality
ipcMain.handle('test-shell-agent', async () => {
  try {
    console.log('🧪 Testing shell agent from main process...');
    
    // Load config
    const configPath = path.join(__dirname, '../dtui.json');
    const configContent = await fs.readFile(configPath, 'utf-8');
    const config = JSON.parse(configContent);
    
    console.log('Shell config:', config.ai.shell);
    
    // Build command
    const template = config.ai.shell.template;
    const command = config.ai.shell.command;
    const args = config.ai.shell.args;
    const testPrompt = "Hello from Electron main process";
    
    const fullCommand = template
      .replace('{command}', command)
      .replace('{args}', args.join(' '))
      .replace('{prompt}', testPrompt);
    
    console.log('Executing:', fullCommand);
    
    // Execute command
    const { spawn } = require('child_process');
    const [cmd, ...cmdArgs] = fullCommand.split(' ').map(arg => {
      if (arg.startsWith('"') && arg.endsWith('"')) {
        return arg.slice(1, -1);
      }
      return arg;
    });
    
    return new Promise((resolve) => {
      const testProcess = spawn(cmd, cmdArgs, { shell: true });
      let output = '';
      let error = '';
      
      testProcess.stdout.on('data', (data) => {
        output += data.toString();
      });
      
      testProcess.stderr.on('data', (data) => {
        error += data.toString();
      });
      
      testProcess.on('close', (code) => {
        console.log('✅ Shell agent test result:', output.trim());
        if (error.trim()) {
          console.log('❌ Shell agent stderr:', error.trim());
        }
        console.log('Exit code:', code);
        
        resolve({
          success: code === 0,
          command: fullCommand,
          output: output.trim(),
          error: error.trim(),
          exitCode: code
        });
      });
      
      testProcess.on('error', (err) => {
        console.log('❌ Shell agent process error:', err.message);
        resolve({
          success: false,
          command: fullCommand,
          output: '',
          error: err.message,
          exitCode: -1
        });
      });
    });
  } catch (error) {
    console.error('❌ Shell agent test failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
});

// Execute shell AI command (for renderer process)
ipcMain.handle('execute-shell-ai-command', async (_, prompt) => {
  try {
    console.log('🧪 Executing shell AI command for prompt:', prompt);
    
    // Load config
    const configPath = path.join(__dirname, '../dtui.json');
    const configContent = await fs.readFile(configPath, 'utf-8');
    const config = JSON.parse(configContent);
    
    const shellConfig = config.ai.shell;
    console.log('Using shell config:', shellConfig);
    
    // Build command using template
    const command = shellConfig.command;
    const args = shellConfig.args || [];
    const template = shellConfig.template || '{command} {args} "{prompt}"';
    
    const fullCommand = template
      .replace('{command}', command)
      .replace('{args}', args.join(' '))
      .replace('{prompt}', prompt.replace(/"/g, '\\"').replace(/\$/g, '\\$'));
    
    console.log('Full command:', fullCommand);
    
    // Execute command
    return new Promise((resolve) => {
      const testProcess = spawn(fullCommand, [], { shell: true });
      let output = '';
      let error = '';
      
      testProcess.stdout.on('data', (data) => {
        output += data.toString();
      });
      
      testProcess.stderr.on('data', (data) => {
        error += data.toString();
      });
      
      testProcess.on('close', (code) => {
        console.log('Command output:', output.trim());
        console.log('Command stderr:', error.trim());
        console.log('Command exit code:', code);
        
        if (code === 0) {
          let finalContent = output.trim() || 'Command completed successfully';
          
          // Include stderr in success response if present
          if (error.trim()) {
            finalContent += `\n[stderr]: ${error.trim()}`;
          }
          
          resolve({
            success: true,
            content: finalContent,
            exitCode: code,
            stderr: error.trim(),
            stdout: output.trim()
          });
        } else {
          // For failures, combine stdout and stderr for comprehensive error info
          let errorContent = '';
          
          if (error.trim()) {
            errorContent = error.trim();
          }
          
          if (output.trim()) {
            errorContent += errorContent ? `\n[stdout]: ${output.trim()}` : output.trim();
          }
          
          if (!errorContent) {
            errorContent = `Command failed with exit code ${code}`;
          } else {
            errorContent += `\n[exit code: ${code}]`;
          }
          
          resolve({
            success: false,
            content: errorContent,
            exitCode: code,
            stderr: error.trim(),
            stdout: output.trim()
          });
        }
      });
      
      testProcess.on('error', (err) => {
        console.log('❌ Command execution error:', err.message);
        resolve({
          success: false,
          content: `Failed to execute command: ${err.message}`,
          exitCode: -1,
          error: err.message
        });
      });
    });
  } catch (error) {
    console.error('❌ Shell AI command failed:', error);
    return {
      success: false,
      content: `Error: ${error.message}`,
      error: error.message
    };
  }
});