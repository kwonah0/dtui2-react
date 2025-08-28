// Mock implementation of Electron API for web browser testing
export class MockElectronAPI {
  private mockFileSystem: Record<string, string> = {
    '/package.json': JSON.stringify({
      name: 'dtui2-react',
      version: '1.0.0',
      scripts: { dev: 'vite', build: 'tsc && vite build' }
    }, null, 2),
    '/src/App.tsx': 'import React from "react";\n\nfunction App() {\n  return <div>Hello World</div>;\n}\n\nexport default App;',
    '/README.md': '# DTUI2 React\n\nClaude Code Style AI Terminal Desktop App\n\n## Features\n- Terminal integration\n- AI Agent capabilities'
  };

  private currentDir = '/';
  private outputListeners: Array<(data: any) => void> = [];

  // File operations
  async readFile(filePath: string) {
    await this.delay(100);
    
    if (this.mockFileSystem[filePath]) {
      return {
        success: true,
        content: this.mockFileSystem[filePath]
      };
    } else {
      return {
        success: false,
        error: `File not found: ${filePath}`
      };
    }
  }

  async writeFile(filePath: string, content: string) {
    await this.delay(100);
    this.mockFileSystem[filePath] = content;
    return { success: true };
  }

  async listDirectory(dirPath: string) {
    await this.delay(100);
    
    const basePath = dirPath === '.' ? this.currentDir : dirPath;
    const files = Object.keys(this.mockFileSystem)
      .filter(path => path.startsWith(basePath) && path !== basePath)
      .map(path => {
        const relativePath = path.slice(basePath.length).split('/').filter(Boolean)[0];
        return relativePath;
      })
      .filter((item, index, arr) => arr.indexOf(item) === index)
      .map(name => ({
        name,
        isDirectory: !name.includes('.'),
        isFile: name.includes('.')
      }));

    return {
      success: true,
      files: [
        { name: 'src', isDirectory: true, isFile: false },
        { name: 'package.json', isDirectory: false, isFile: true },
        { name: 'README.md', isDirectory: false, isFile: true },
        { name: 'node_modules', isDirectory: true, isFile: false },
        ...files
      ]
    };
  }

  // Shell operations
  async executeCommand(command: string) {
    return this.executeShellCommand(command);
  }

  async executeShellCommand(command: string) {
    await this.delay(200);

    // Simulate command output
    setTimeout(() => {
      this.emitOutput('stdout', this.simulateCommandOutput(command));
    }, 100);

    return {
      success: true,
      message: 'Command sent to mock terminal'
    };
  }

  async changeDirectory(dirPath: string) {
    await this.delay(50);
    
    // Simple directory validation
    if (dirPath === '..' || dirPath === '../') {
      this.currentDir = '/';
    } else if (dirPath.startsWith('/')) {
      this.currentDir = dirPath;
    } else {
      this.currentDir = this.currentDir === '/' ? `/${dirPath}` : `${this.currentDir}/${dirPath}`;
    }

    return {
      success: true,
      cwd: this.currentDir
    };
  }

  async getCurrentDirectory() {
    return {
      success: true,
      cwd: this.currentDir
    };
  }

  // Output handling
  onShellOutput(callback: (data: any) => void) {
    this.outputListeners.push(callback);
  }

  removeShellOutputListener() {
    this.outputListeners = [];
  }

  // Dialog operations
  async showOpenDialog() {
    return {
      canceled: false,
      filePaths: ['/mock/selected/file.txt']
    };
  }

  async showSaveDialog() {
    return {
      canceled: false,
      filePath: '/mock/save/location.txt'
    };
  }

  // Helper methods
  private async delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private emitOutput(type: 'stdout' | 'stderr', data: string) {
    this.outputListeners.forEach(listener => {
      listener({ type, data });
    });
  }

  private simulateCommandOutput(command: string): string {
    const cmd = command.toLowerCase().trim();
    
    if (cmd === 'ls' || cmd === 'dir') {
      // TTY-style ls output with colors (using ANSI escape codes)
      return `\x1b[34mdocs/\x1b[0m       \x1b[34melectron/\x1b[0m    package.json   \x1b[32mREADME.md\x1b[0m
\x1b[34mnode_modules/\x1b[0m  \x1b[34mscripts/\x1b[0m    \x1b[34msrc/\x1b[0m          tsconfig.json
\x1b[33mDEVELOPMENT.md\x1b[0m \x1b[34mdist/\x1b[0m       vite.config.ts
`;
    }
    
    if (cmd === 'ls -la' || cmd === 'ls -l') {
      return `total 42
drwxr-xr-x  8 user user  4096 ${new Date().toDateString().slice(4)} .
drwxr-xr-x  3 user user  4096 ${new Date().toDateString().slice(4)} ..
\x1b[34mdrwxr-xr-x  2 user user  4096 ${new Date().toDateString().slice(4)} docs/\x1b[0m
\x1b[34mdrwxr-xr-x  3 user user  4096 ${new Date().toDateString().slice(4)} electron/\x1b[0m
\x1b[34mdrwxr-xr-x 80 user user  4096 ${new Date().toDateString().slice(4)} node_modules/\x1b[0m
-rw-r--r--  1 user user  2156 ${new Date().toDateString().slice(4)} package.json
\x1b[32m-rw-r--r--  1 user user  8421 ${new Date().toDateString().slice(4)} README.md\x1b[0m
\x1b[34mdrwxr-xr-x  4 user user  4096 ${new Date().toDateString().slice(4)} src/\x1b[0m
-rw-r--r--  1 user user   789 ${new Date().toDateString().slice(4)} tsconfig.json
`;
    }
    
    if (cmd === 'pwd') {
      return `\x1b[36m${this.currentDir}\x1b[0m\n`;
    }
    
    if (cmd.startsWith('echo ')) {
      const text = command.slice(5);
      return `\x1b[37m${text}\x1b[0m\n`;
    }
    
    if (cmd === 'whoami') {
      return '\x1b[33mmock-user\x1b[0m\n';
    }
    
    if (cmd === 'date') {
      return `\x1b[36m${new Date().toString()}\x1b[0m\n`;
    }
    
    if (cmd.includes('npm')) {
      const npmCommands = ['install', 'run', 'build', 'start', 'test'];
      const isKnownCommand = npmCommands.some(c => cmd.includes(c));
      
      if (isKnownCommand) {
        return `\x1b[32m✓\x1b[0m Mock npm output for: \x1b[1m${command}\x1b[0m
\x1b[36mLoading...\x1b[0m
\x1b[32m✓ Completed successfully\x1b[0m
\x1b[33mExecuted in mock environment\x1b[0m
`;
      }
      return `\x1b[33m⚠\x1b[0m Unknown npm command: ${command}\n`;
    }
    
    if (cmd.includes('git')) {
      if (cmd.includes('status')) {
        return `On branch \x1b[32mmain\x1b[0m
Your branch is up to date with 'origin/main'.

\x1b[32mnothing to commit, working tree clean\x1b[0m
`;
      }
      if (cmd.includes('log')) {
        return `\x1b[33mcommit abc123def456\x1b[0m
Author: Mock User <mock@example.com>
Date:   ${new Date().toString()}

    Add terminal integration and AI agent features
    
    * Implement persistent shell sessions
    * Add Mock AI agent with swappable architecture
    * Improve terminal output formatting
`;
      }
      return `\x1b[32m✓\x1b[0m Mock git output for: \x1b[1m${command}\x1b[0m\n`;
    }
    
    if (cmd.includes('cat ') || cmd.includes('type ')) {
      const file = cmd.split(' ').pop();
      if (file === 'package.json') {
        return `\x1b[36m{\x1b[0m
  \x1b[33m"name"\x1b[0m: \x1b[32m"dtui2-react"\x1b[0m,
  \x1b[33m"version"\x1b[0m: \x1b[32m"1.0.0"\x1b[0m,
  \x1b[33m"main"\x1b[0m: \x1b[32m"electron/main.js"\x1b[0m
\x1b[36m}\x1b[0m
`;
      }
      return `\x1b[31mcat: ${file}: No such file or directory\x1b[0m\n`;
    }
    
    return `\x1b[37m$\x1b[0m ${command}
\x1b[32m✓\x1b[0m Mock output for command: \x1b[1m${command}\x1b[0m
\x1b[33m[Executed in mock environment]\x1b[0m
`;
  }
}

// Initialize mock API for browser environment
export function initializeMockAPI() {
  if (typeof window !== 'undefined' && !window.electronAPI) {
    console.log('🔧 Initializing Mock Electron API for browser testing');
    (window as any).electronAPI = new MockElectronAPI();
  }
}