const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs').promises;
const { spawn } = require('child_process');

// Try to use real PTY if available, fallback to script command
let pty;
let usePtyEmulation = false;
let useNodePty = false;

try {
  pty = require('@homebridge/node-pty-prebuilt-multiarch');
  useNodePty = true;
  console.log('✅ node-pty loaded successfully');
} catch (err) {
  console.log('⚠️ node-pty not available, falling back to script command:', err.message);
  usePtyEmulation = process.platform !== 'win32' && require('fs').existsSync('/usr/bin/script');
  console.log('PTY emulation available:', usePtyEmulation);
}

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
  const isTest = process.env.NODE_ENV === 'test';
  
  if (isDev) {
    mainWindow.loadURL('http://localhost:3002');
    if (!isTest) {
      mainWindow.webContents.openDevTools();
    }
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
    // DevTools only open in development mode for production builds
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
    if (useNodePty && shellSession.kill) {
      shellSession.kill();
    } else if (shellSession.kill) {
      shellSession.kill();
    }
  }

  const shell = process.platform === 'win32' ? 'cmd.exe' : '/bin/bash';
  const shellArgs = process.platform === 'win32' ? [] : ['--login'];
  
  if (useNodePty) {
    // Use real PTY with node-pty
    shellSession = pty.spawn(shell, shellArgs, {
      name: 'xterm-256color',
      cols: 80,
      rows: 30,
      cwd: currentWorkingDirectory,
      env: {
        ...process.env,
        TERM: 'xterm-256color',
        COLORTERM: 'truecolor'
      }
    });

    shellSession.onData((data) => {
      if (mainWindow) {
        mainWindow.webContents.send('shell-output', {
          type: 'stdout',
          data: data,
          isPty: true
        });
      }
    });

    shellSession.onExit(({ exitCode }) => {
      if (mainWindow) {
        mainWindow.webContents.send('shell-output', {
          type: 'close',
          code: exitCode
        });
      }
      shellSession = null;
    });
  } else {
    // Fallback to regular spawn
    shellSession = spawn(shell, shellArgs, {
      cwd: currentWorkingDirectory,
      env: {
        ...process.env,
        TERM: 'xterm-color',
        COLORTERM: 'truecolor',
        CLICOLOR: '1',
        CLICOLOR_FORCE: '1',
        COLUMNS: '80',
        LINES: '24',
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
  }

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

// Add PTY resize handler
ipcMain.handle('resize-pty', async (_, cols, rows) => {
  if (useNodePty && shellSession && shellSession.resize) {
    shellSession.resize(cols, rows);
    console.log(`PTY resized to ${cols}x${rows}`);
    return { success: true };
  }
  return { success: false, message: 'PTY resize not supported' };
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
  console.log('🚀🚀🚀 EXECUTE-SHELL-COMMAND CALLED WITH:', command);
  console.log('🚀🚀🚀 NODE-PTY AVAILABLE:', useNodePty);
  console.log('🚀🚀🚀 PTY EMULATION AVAILABLE:', usePtyEmulation);
  
  return new Promise((resolve) => {
    // Use node-pty if available
    if (useNodePty) {
      console.log('Using node-pty for real PTY');
      const shell = process.platform === 'win32' ? 'cmd.exe' : '/bin/bash';
      const ptyProcess = pty.spawn(shell, ['-c', command], {
        name: 'xterm-256color',
        cols: 80,
        rows: 30,
        cwd: currentWorkingDirectory,
        env: {
          ...process.env,
          TERM: 'xterm-256color',
          COLORTERM: 'truecolor'
        }
      });
      
      let output = '';
      
      ptyProcess.onData((data) => {
        output += data;
        
        // Send real-time output to frontend
        if (mainWindow) {
          mainWindow.webContents.send('shell-output', {
            type: 'stdout',
            data: data,
            isPty: true
          });
        }
      });
      
      ptyProcess.onExit(({ exitCode }) => {
        console.log('node-pty command completed with code:', exitCode);
        
        if (mainWindow) {
          mainWindow.webContents.send('shell-output', {
            type: 'close',
            code: exitCode,
            isPty: true
          });
        }
        
        resolve({
          success: exitCode === 0,
          message: 'PTY command executed',
          exitCode: exitCode,
          output: output.trim()
        });
      });
    }
    // Use script command for PTY emulation if available
    else if (usePtyEmulation) {
      console.log('Using script command for PTY emulation');
      const scriptCommand = `script -qc "${command.replace(/"/g, '\\"')}" /dev/null`;
      const testProcess = spawn(scriptCommand, [], { 
        shell: true,
        env: {
          ...process.env,
          TERM: 'xterm-256color',
          COLORTERM: 'truecolor',
          COLUMNS: '80',
          LINES: '24'
        },
        cwd: currentWorkingDirectory
      });
      
      let output = '';
      
      testProcess.stdout.on('data', (data) => {
        const dataStr = data.toString();
        output += dataStr;
        
        // Send real-time output to frontend
        if (mainWindow) {
          mainWindow.webContents.send('shell-output', {
            type: 'stdout',
            data: dataStr,
            isPty: true
          });
        }
      });
      
      testProcess.stderr.on('data', (data) => {
        const dataStr = data.toString();
        output += dataStr;
        
        if (mainWindow) {
          mainWindow.webContents.send('shell-output', {
            type: 'stderr', 
            data: dataStr,
            isPty: true
          });
        }
      });
      
      testProcess.on('close', (code) => {
        console.log('PTY shell command completed with code:', code);
        
        // Clean up script command artifacts
        output = output.replace(/Script started.*\r?\n/, '');
        output = output.replace(/Script done.*\r?\n/, '');
        
        if (mainWindow) {
          mainWindow.webContents.send('shell-output', {
            type: 'close',
            code: code,
            isPty: true
          });
        }
        
        resolve({
          success: code === 0,
          message: 'PTY shell command executed',
          exitCode: code,
          output: output.trim()
        });
      });
      
      testProcess.on('error', (err) => {
        console.error('PTY shell command error:', err);
        resolve({
          success: false,
          error: err.message
        });
      });
      
    } else {
      // Fallback to regular execution for non-Unix systems
      if (!shellSession) {
        createShellSession();
      }
      
      if (!shellSession) {
        resolve({
          success: false,
          error: 'Failed to create shell session'
        });
        return;
      }
      
      try {
        shellSession.stdin.write(command + '\n');
        resolve({
          success: true,
          message: 'Command sent to persistent shell'
        });
      } catch (error) {
        resolve({
          success: false,
          error: error.message
        });
      }
    }
  });
});

// Execute command with collected output - simplified approach for node-pty
ipcMain.handle('execute-command-with-output', async (_, command) => {
  console.log('🔥 execute-command-with-output called with:', command);
  
  return new Promise((resolve) => {
    if (useNodePty) {
      // Use one-time PTY process for clean output capture
      console.log('Using node-pty for command execution');
      
      const shell = process.platform === 'win32' ? 'cmd.exe' : '/bin/bash';
      const cmdProcess = pty.spawn(shell, ['-c', command], {
        name: 'xterm-256color',
        cols: 80,
        rows: 30,
        cwd: currentWorkingDirectory,
        env: {
          ...process.env,
          TERM: 'xterm-256color',
          COLORTERM: 'truecolor'
        }
      });

      let output = '';
      let hasOutput = false;

      cmdProcess.onData((data) => {
        output += data;
        hasOutput = true;
        console.log('PTY output chunk:', JSON.stringify(data.substring(0, 100)));
      });

      cmdProcess.onExit(({ exitCode }) => {
        console.log('PTY command completed with exit code:', exitCode);
        console.log('Total output length:', output.length);
        console.log('Has output:', hasOutput);
        
        // Clean up common terminal escape sequences while preserving colors
        let cleanOutput = output
          .replace(/\r\n/g, '\n')
          .replace(/\r/g, '\n')
          .replace(/\x1b\[?2004[hl]/g, '') // Remove bracketed paste mode
          .replace(/\x1b\]0;[^\x07]*\x07/g, '') // Remove window title sequences
          .trim();
        
        console.log('Clean output preview:', JSON.stringify(cleanOutput.substring(0, 200)));
        
        resolve({
          success: exitCode === 0,
          stdout: cleanOutput,
          stderr: '',
          exitCode: exitCode,
          isPty: true
        });
      });

      // Timeout handling
      setTimeout(() => {
        console.log('Command timed out');
        cmdProcess.kill();
        resolve({
          success: false,
          stdout: output || '',
          stderr: 'Command timed out after 10 seconds',
          exitCode: -1
        });
      }, 10000);
      
    } else {
      // Fallback to regular child_process approach
      console.log('Using child_process for command execution');
      
      const childProcess = spawn(command, [], {
        shell: true,
        cwd: currentWorkingDirectory,
        env: {
          ...process.env,
          TERM: 'xterm-256color',
          COLORTERM: 'truecolor'
        }
      });

      let stdout = '';
      let stderr = '';

      childProcess.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      childProcess.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      childProcess.on('close', (exitCode) => {
        resolve({
          success: exitCode === 0,
          stdout: stdout.trim(),
          stderr: stderr.trim(),
          exitCode: exitCode
        });
      });

      // Timeout handling
      setTimeout(() => {
        childProcess.kill();
        resolve({
          success: false,
          stdout: stdout || '',
          stderr: stderr || 'Command timed out',
          exitCode: -1
        });
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

// Helper function to parse DTUI_CFG__ environment variables
function parseEnvironmentConfig() {
  const envConfig = {};
  
  // Parse all DTUI_CFG__ prefixed environment variables
  Object.keys(process.env).forEach(key => {
    if (key.startsWith('DTUI_CFG__')) {
      const configPath = key.replace('DTUI_CFG__', '').toLowerCase();
      const keys = configPath.split('__');
      let value = process.env[key];
      
      // Try to parse JSON strings
      if (typeof value === 'string') {
        try {
          if (value.startsWith('[') || value.startsWith('{')) {
            value = JSON.parse(value);
          } else if (value === 'true') {
            value = true;
          } else if (value === 'false') {
            value = false;
          } else if (!isNaN(value) && !isNaN(parseFloat(value))) {
            value = parseFloat(value);
          }
        } catch (e) {
          // Keep as string if not valid JSON
        }
      }
      
      // Set nested value
      let current = envConfig;
      for (let i = 0; i < keys.length - 1; i++) {
        if (!current[keys[i]]) current[keys[i]] = {};
        current = current[keys[i]];
      }
      current[keys[keys.length - 1]] = value;
      
      console.log(`🔧 Environment config: ${key} = ${JSON.stringify(value)}`);
    }
  });
  
  return envConfig;
}

// Helper function to merge configuration objects deeply
function mergeConfig(base, override) {
  const result = { ...base };
  
  for (const key in override) {
    if (override[key] && typeof override[key] === 'object' && !Array.isArray(override[key])) {
      result[key] = mergeConfig(base[key] || {}, override[key]);
    } else {
      result[key] = override[key];
    }
  }
  
  return result;
}

// Configuration operations - 3-stage priority system implemented directly
ipcMain.handle('get-config', async () => {
  try {
    // Stage 3: Built-in defaults (compatible with both regular and HPC environments)
    let config = {
      ai: {
        provider: 'shell',
        shell: {
          command: 'echo',
          args: [],
          template: '{command} "{args} {prompt}"',
          timeout: 10000,
          streaming: false,
          usePty: true,
          outputFormat: {
            useCodeBlock: false,
            codeBlockSyntax: 'shell',
            extraction: {
              enabled: true,
              startMarker: '<RESPONSE>',
              endMarker: '</RESPONSE>'
            }
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
    
    // Stage 2: User config file (only if DTUI_USER_CONFIGFILE is specified)
    if (process.env.DTUI_USER_CONFIGFILE) {
      const configPath = process.env.DTUI_USER_CONFIGFILE;
      try {
        if (require('fs').existsSync(configPath)) {
          const fileContent = await fs.readFile(configPath, 'utf-8');
          const fileConfig = JSON.parse(fileContent);
          config = mergeConfig(config, fileConfig);
          console.log(`✅ Loaded user config file: ${configPath}`);
        } else {
          console.warn(`⚠️ User config file specified but not found: ${configPath}`);
        }
      } catch (fileError) {
        console.error(`❌ Failed to load user config file ${configPath}:`, fileError.message);
      }
    } else {
      console.log('ℹ️ No DTUI_USER_CONFIGFILE specified, skipping user config file stage');
    }
    
    // Stage 1: Environment variables (highest priority)
    const envConfig = parseEnvironmentConfig();
    if (Object.keys(envConfig).length > 0) {
      config = mergeConfig(config, envConfig);
      console.log('✅ Applied environment variable overrides');
    }
    
    console.log('🎯 Final merged configuration:', JSON.stringify(config, null, 2));
    return config;
    
  } catch (error) {
    console.error('❌ Failed to load configuration:', error);
    
    // Ultimate fallback
    const fallbackConfig = {
      ai: {
        provider: 'shell',
        shell: {
          command: 'echo',
          args: ['[FALLBACK]:'],
          template: '{command} "{args} {prompt}"',
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
    
    console.log('🚨 Using ultimate fallback config:', fallbackConfig);
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
    
    // Load config using our 3-stage priority system - call the function directly
    const config = await (async () => {
      // Stage 3: Built-in defaults (compatible with both regular and HPC environments)
      let config = {
        ai: {
          provider: 'shell',
          shell: {
            command: 'echo',
            args: [],
            template: '{command} "{args} {prompt}"',
            timeout: 10000,
            streaming: false,
            usePty: true,
            outputFormat: {
              useCodeBlock: false,
              codeBlockSyntax: 'shell'
            }
          }
        }
      };
      
      // Stage 2: User config file (only if DTUI_USER_CONFIGFILE is specified)
      if (process.env.DTUI_USER_CONFIGFILE) {
        const configPath = process.env.DTUI_USER_CONFIGFILE;
        try {
          if (require('fs').existsSync(configPath)) {
            const fileContent = await fs.readFile(configPath, 'utf-8');
            const fileConfig = JSON.parse(fileContent);
            config = mergeConfig(config, fileConfig);
          }
        } catch (fileError) {
          console.warn(`⚠️ Could not load user config file ${configPath}:`, fileError.message);
        }
      }
      
      // Stage 1: Environment variables (highest priority)
      const envConfig = parseEnvironmentConfig();
      if (Object.keys(envConfig).length > 0) {
        config = mergeConfig(config, envConfig);
        console.log('✅ Applied environment variable overrides');
      }
      
      return config;
    })();
    
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
    
    // Load config using our 3-stage priority system - call the function directly
    const config = await (async () => {
      // Stage 3: Built-in defaults (compatible with both regular and HPC environments)
      let config = {
        ai: {
          provider: 'shell',
          shell: {
            command: 'echo',
            args: [],
            template: '{command} "{args} {prompt}"',
            timeout: 10000,
            streaming: false,
            usePty: true,
            outputFormat: {
              useCodeBlock: false,
              codeBlockSyntax: 'shell'
            }
          }
        }
      };
      
      // Stage 2: User config file (only if DTUI_USER_CONFIGFILE is specified)
      if (process.env.DTUI_USER_CONFIGFILE) {
        const configPath = process.env.DTUI_USER_CONFIGFILE;
        try {
          if (require('fs').existsSync(configPath)) {
            const fileContent = await fs.readFile(configPath, 'utf-8');
            const fileConfig = JSON.parse(fileContent);
            config = mergeConfig(config, fileConfig);
          }
        } catch (fileError) {
          console.warn(`⚠️ Could not load user config file ${configPath}:`, fileError.message);
        }
      }
      
      // Stage 1: Environment variables (highest priority)
      const envConfig = parseEnvironmentConfig();
      if (Object.keys(envConfig).length > 0) {
        config = mergeConfig(config, envConfig);
      }
      
      return config;
    })();
    
    const shellConfig = config.ai.shell;
    console.log('Using shell config:', shellConfig);
    
    // Build command using template
    const command = shellConfig.command;
    const args = shellConfig.args || [];
    const template = shellConfig.template || '{command} {args} "{prompt}"';
    
    const fullCommand = template
      .replace('{command}', command)
      .replace('{args}', args.join(' '))
      .replace('{prompt}', prompt
        .replace(/\\/g, '\\\\')
        .replace(/"/g, '\\"')
        .replace(/\$/g, '\\$')
        .replace(/\n/g, '\\n')
        .replace(/\r/g, '\\r')
      );
    
    console.log('Full command:', fullCommand);
    
    // Execute command with PTY for proper terminal emulation
    return new Promise((resolve) => {
      // Check if PTY emulation should be used
      const tryPtyEmulation = shellConfig.usePty !== false && usePtyEmulation;
      
      let output = '';
      let exitCode = null;
      
      if (tryPtyEmulation) {
        // Use script command for PTY emulation on Unix
        console.log('Using script command for PTY emulation');
        const scriptCommand = `script -qc "${fullCommand.replace(/"/g, '\\"')}" /dev/null`;
        const testProcess = spawn(scriptCommand, [], { 
          shell: true,
          env: {
            ...process.env,
            TERM: 'xterm-256color',
            COLORTERM: 'truecolor',
            COLUMNS: '80',
            LINES: '30'
          }
        });
        
        testProcess.stdout.on('data', (data) => {
          output += data.toString();
        });
        
        testProcess.stderr.on('data', (data) => {
          output += data.toString();
        });
        
        testProcess.on('close', (code) => {
          console.log('Script command output:', output.trim());
          console.log('Script command exit code:', code);
          
          // Clean up script command artifacts
          output = output.replace(/Script started.*\r?\n/, '');
          output = output.replace(/Script done.*\r?\n/, '');
          
          if (code === 0) {
            resolve({
              success: true,
              content: output.trim() || 'Command completed successfully',
              exitCode: code,
              stdout: output.trim(),
              isPty: true
            });
          } else {
            const errorContent = output.trim() || `Command failed with exit code ${code}`;
            resolve({
              success: false,
              content: errorContent,
              exitCode: code,
              stdout: output.trim(),
              isPty: true
            });
          }
        });
        
        testProcess.on('error', (err) => {
          console.log('❌ Script command execution error:', err.message);
          resolve({
            success: false,
            content: `Failed to execute command: ${err.message}`,
            exitCode: -1,
            error: err.message
          });
        });
      } else {
        // Fallback to regular spawn if PTY is disabled
        const testProcess = spawn(fullCommand, [], { shell: true });
        let stdout = '';
        let stderr = '';
        
        testProcess.stdout.on('data', (data) => {
          stdout += data.toString();
        });
        
        testProcess.stderr.on('data', (data) => {
          stderr += data.toString();
        });
        
        testProcess.on('close', (code) => {
          console.log('Command output:', stdout.trim());
          console.log('Command stderr:', stderr.trim());
          console.log('Command exit code:', code);
          
          if (code === 0) {
            let finalContent = stdout.trim() || 'Command completed successfully';
            if (stderr.trim()) {
              finalContent += `\n[stderr]: ${stderr.trim()}`;
            }
            
            resolve({
              success: true,
              content: finalContent,
              exitCode: code,
              stderr: stderr.trim(),
              stdout: stdout.trim()
            });
          } else {
            let errorContent = '';
            if (stderr.trim()) {
              errorContent = stderr.trim();
            }
            if (stdout.trim()) {
              errorContent += errorContent ? `\n[stdout]: ${stdout.trim()}` : stdout.trim();
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
              stderr: stderr.trim(),
              stdout: stdout.trim()
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
      }
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