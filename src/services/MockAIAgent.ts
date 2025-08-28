import { ElectronAPI } from '../types';

export interface AIAgent {
  name: string;
  executeCommand(command: string): Promise<AIAgentResult>;
  analyzeCode(filePath: string): Promise<AIAgentResult>;
  suggestFix(error: string, context?: string): Promise<AIAgentResult>;
  analyzeProject(projectPath: string): Promise<AIAgentResult>;
  generateCode(prompt: string, language?: string): Promise<AIAgentResult>;
  generateResponse(messages: any[]): Promise<string>;
}

export interface AIAgentResult {
  success: boolean;
  content: string;
  suggestions?: string[];
  metadata?: Record<string, any>;
}

export class MockAIAgent implements AIAgent {
  name = 'Mock AI Agent';
  
  private electronAPI: ElectronAPI;
  private currentDirectory: string = '/mnt/c/Users/user/github/dtui2-react';
  
  constructor() {
    this.electronAPI = window.electronAPI;
  }

  async executeCommand(command: string): Promise<AIAgentResult> {
    // Always provide mock terminal output for browser testing
    return {
      success: true,
      content: this.mockTerminalOutput(command),
      suggestions: [
        'Use `pwd` to see current directory',
        'Use `ls` to list files',
        'Use `cd <directory>` to change directory'
      ]
    };
  }

  private mockTerminalOutput(command: string): string {
    const cmd = command.trim().toLowerCase();
    
    // Mock ls command with TTY-style column output
    if (cmd === 'ls' || cmd.startsWith('ls ')) {
      const mockFiles = [
        '\x1b[1;34mnode_modules\x1b[0m',     // blue directory
        '\x1b[1;34msrc\x1b[0m',             // blue directory  
        '\x1b[1;34melectron\x1b[0m',        // blue directory
        '\x1b[1;34mdist\x1b[0m',            // blue directory
        '\x1b[1;34mdocs\x1b[0m',            // blue directory
        'package.json',                      // regular file
        'package-lock.json',                 // regular file
        'README.md',                         // regular file
        'ARCHITECTURE.md',                   // regular file
        'tsconfig.json',                     // regular file
        'vite.config.ts',                    // regular file
        'index.html'                         // regular file
      ];
      
      // Format in columns like real terminal (4 columns, 20 chars wide each)
      const columns = 4;
      const columnWidth = 20;
      let output = '';
      
      for (let i = 0; i < mockFiles.length; i += columns) {
        const row = mockFiles.slice(i, i + columns);
        const formattedRow = row.map(file => file.padEnd(columnWidth)).join('');
        output += formattedRow.trimEnd() + '\n';
      }
      
      return output.trim();
    }
    
    // Mock pwd command
    if (cmd === 'pwd') {
      return this.currentDirectory;
    }
    
    // Mock cd command
    if (cmd.startsWith('cd ')) {
      const path = cmd.slice(3).trim();
      if (path === 'src' || path === './src') {
        this.currentDirectory = '/mnt/c/Users/user/github/dtui2-react/src';
        return '';
      } else if (path === '..' || path === '../') {
        this.currentDirectory = '/mnt/c/Users/user/github';
        return '';
      } else if (path === '~' || path === '') {
        this.currentDirectory = '/home/user';
        return '';
      } else {
        return `cd: ${path}: No such file or directory`;
      }
    }
    
    // Mock grep with colors
    if (cmd.includes('grep')) {
      return 'This is a \x1b[1;31mmatch\x1b[0m in the text\nAnother line with \x1b[1;31mmatch\x1b[0m here';
    }
    
    // Mock git commands
    if (cmd.startsWith('git status')) {
      return `On branch main\nYour branch is up to date with 'origin/main'.\n\nChanges not staged for commit:\n  (use "git add <file>..." to update what will be committed)\n\n\t\x1b[31mmodified:   src/App.tsx\x1b[0m\n\t\x1b[31mmodified:   electron/main.js\x1b[0m\n\nno changes added to commit (use "git add" or "git commit -a")`;
    }
    
    // Mock other commands
    if (cmd === 'whoami') {
      return 'user';
    }
    
    if (cmd === 'date') {
      return new Date().toString();
    }
    
    if (cmd.startsWith('echo ')) {
      return cmd.slice(5);
    }
    
    // Default response for unknown commands
    return `Mock terminal output for: ${command}\n\n\x1b[1;32m✓\x1b[0m Command executed successfully in browser simulation mode.`;
  }

  async analyzeCode(filePath: string): Promise<AIAgentResult> {
    if (!this.electronAPI) {
      return {
        success: false,
        content: 'File operations require the desktop app.'
      };
    }

    try {
      const result = await this.electronAPI.readFile(filePath);
      
      if (result.success && result.content) {
        const analysis = this.performCodeAnalysis(result.content, filePath);
        
        return {
          success: true,
          content: analysis.summary,
          suggestions: analysis.suggestions,
          metadata: {
            fileSize: result.content.length,
            lineCount: result.content.split('\n').length,
            language: this.detectLanguage(filePath)
          }
        };
      } else {
        return {
          success: false,
          content: `Failed to read file: ${result.error}`
        };
      }
    } catch (error) {
      return {
        success: false,
        content: `Error analyzing code: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  async suggestFix(error: string, _context?: string): Promise<AIAgentResult> {
    // Mock error analysis and suggestions
    const suggestions = this.generateErrorSuggestions(error);
    
    return {
      success: true,
      content: `**Error Analysis:**\n${error}\n\n**Suggested Solutions:**\n${suggestions.map((s, i) => `${i + 1}. ${s}`).join('\n')}`,
      suggestions: suggestions,
      metadata: {
        errorType: this.classifyError(error),
        confidence: 0.75
      }
    };
  }

  async analyzeProject(projectPath: string): Promise<AIAgentResult> {
    if (!this.electronAPI) {
      return {
        success: false,
        content: 'Directory operations require the desktop app.'
      };
    }

    try {
      const result = await this.electronAPI.listDirectory(projectPath);
      
      if (result.success && result.files) {
        const analysis = this.performProjectAnalysis(result.files);
        
        return {
          success: true,
          content: analysis.summary,
          suggestions: analysis.suggestions,
          metadata: {
            fileCount: result.files.length,
            directories: result.files.filter(f => f.isDirectory).length,
            files: result.files.filter(f => f.isFile).length
          }
        };
      } else {
        return {
          success: false,
          content: `Failed to analyze project: ${result.error}`
        };
      }
    } catch (error) {
      return {
        success: false,
        content: `Error analyzing project: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  async generateCode(prompt: string, language = 'javascript'): Promise<AIAgentResult> {
    // Mock code generation based on prompt
    const generatedCode = this.mockCodeGeneration(prompt, language);
    
    return {
      success: true,
      content: `**Generated ${language} code:**\n\n\`\`\`${language}\n${generatedCode}\n\`\`\``,
      suggestions: [
        'Review the generated code before using',
        'Test the code in your environment',
        'Modify as needed for your specific use case'
      ],
      metadata: {
        language: language,
        promptLength: prompt.length
      }
    };
  }

  async generateResponse(messages: any[]): Promise<string> {
    // Convert message history to a simple prompt for mock response
    const lastMessage = messages[messages.length - 1];
    const prompt = lastMessage?.content || '';
    
    // Use existing mock response logic
    const result = await this.generateMockResponse(prompt);
    return result;
  }

  private async generateMockResponse(prompt: string): Promise<string> {
    const userMessage = prompt.toLowerCase();
    
    // Greeting responses
    if (userMessage.includes('hello') || userMessage.includes('hi')) {
      return "Hello! I'm a Mock AI Assistant. I can help you with:\n\n- Shell commands (prefix with `!`)\n- File operations (`read file <path>`)\n- Code analysis (`analyze code <file>`)\n- Project analysis (`analyze project`)\n- Error suggestions (`suggest fix <error>`)\n- Code generation (`generate code <prompt>`)\n\nWhat would you like to do?";
    }
    
    // Programming related
    if (userMessage.includes('code') || userMessage.includes('programming') || userMessage.includes('javascript') || userMessage.includes('react')) {
      return "I can help you with coding! Here are some things I can do:\n\n1. **Analyze your code**: Use `analyze code src/App.tsx`\n2. **Generate code**: Use `generate code React component for user profile`\n3. **Debug errors**: Use `suggest fix TypeError: Cannot read property`\n4. **Explore project**: Use `analyze project`\n\nTry one of these commands!";
    }
    
    // Help requests
    if (userMessage.includes('help') || userMessage.includes('what can you do')) {
      return this.getHelpMessage();
    }
    
    // File/terminal related
    if (userMessage.includes('file') || userMessage.includes('terminal') || userMessage.includes('command')) {
      return "I can help with file and terminal operations!\n\n**File Operations:**\n- `read file package.json` - Read any file\n- `list files` or `ls .` - List directory contents\n\n**Terminal Commands:**\n- `!ls -la` - List files with details\n- `!pwd` - Show current directory\n- `!git status` - Check git status\n- `!npm run build` - Run npm commands\n\nTry any command starting with `!`";
    }
    
    // Default response
    const responses = [
      "I'm a Mock AI Assistant running in your browser! I can analyze code, execute shell commands, and help with development tasks. Try typing `!ls` or `help` to see what I can do.",
      "Hello! I'm here to help with your development workflow. I can run terminal commands, analyze code, and provide coding assistance. What would you like to work on?",
      "I'm your AI coding assistant! I can help with file operations, shell commands, code analysis, and more. Try some commands like:\n\n- `!git status`\n- `analyze project`\n- `read file package.json`",
      "Welcome to DTUI2! I'm a Mock AI that can simulate Claude Code functionality. I can help you with terminal operations, file management, and code development tasks."
    ];
    
    return responses[Math.floor(Math.random() * responses.length)];
  }

  private getHelpMessage(): string {
    return `# Available Commands

## Terminal Operations
- \`!<command>\` - Execute shell command (e.g., \`!ls\`, \`!npm install\`)
- \`cd <directory>\` - Change current directory
- \`pwd\` - Show current working directory

## File Operations
- \`read file <path>\` - Read and display file contents
- \`list files\` or \`ls <path>\` - List directory contents

## AI Agent Commands
- \`analyze code <file-path>\` - Analyze code file with AI insights
- \`analyze project [path]\` - Analyze project structure (defaults to current directory)
- \`suggest fix <error-description>\` - Get suggestions for fixing errors
- \`generate code <prompt>\` - Generate code based on prompt

## General
- \`help\` or \`commands\` - Show this help message

**Examples:**
- \`!npm run build\` - Run npm build command
- \`analyze code src/App.tsx\` - Analyze React component
- \`suggest fix TypeError: Cannot read property 'map' of undefined\`
- \`generate code React component for user profile\`

*Note: Terminal and file operations require the desktop app.*`;
  }

  private performCodeAnalysis(code: string, filePath: string) {
    const language = this.detectLanguage(filePath);
    const lines = code.split('\n');
    const functions = this.extractFunctions(code, language);
    const imports = this.extractImports(code, language);
    
    return {
      summary: `**Code Analysis for ${filePath}**\n\n` +
               `- **Language:** ${language}\n` +
               `- **Lines of code:** ${lines.length}\n` +
               `- **Functions:** ${functions.length}\n` +
               `- **Imports:** ${imports.length}\n\n` +
               `**Functions found:** ${functions.join(', ')}\n` +
               `**Key imports:** ${imports.slice(0, 5).join(', ')}`,
      suggestions: [
        'Consider adding JSDoc comments for better documentation',
        'Review error handling in async functions',
        'Check for potential performance optimizations',
        'Ensure proper TypeScript types are used'
      ]
    };
  }

  private performProjectAnalysis(files: Array<{ name: string; isDirectory: boolean; isFile: boolean }>) {
    const directories = files.filter(f => f.isDirectory);
    const codeFiles = files.filter(f => f.isFile && this.isCodeFile(f.name));
    const configFiles = files.filter(f => f.isFile && this.isConfigFile(f.name));
    
    return {
      summary: `**Project Analysis**\n\n` +
               `- **Total items:** ${files.length}\n` +
               `- **Directories:** ${directories.length}\n` +
               `- **Code files:** ${codeFiles.length}\n` +
               `- **Config files:** ${configFiles.length}\n\n` +
               `**Structure:** ${directories.map(d => d.name).join(', ')}\n` +
               `**Code files:** ${codeFiles.map(f => f.name).slice(0, 10).join(', ')}`,
      suggestions: [
        'Consider adding a README.md if missing',
        'Ensure proper .gitignore is in place',
        'Review project structure for scalability',
        'Add unit tests if not present'
      ]
    };
  }

  private generateErrorSuggestions(error: string): string[] {
    const lowerError = error.toLowerCase();
    
    if (lowerError.includes('module not found') || lowerError.includes('cannot find module')) {
      return [
        'Run `npm install` to install dependencies',
        'Check if the module name is spelled correctly',
        'Verify the module is listed in package.json',
        'Try `npm cache clean --force` if issues persist'
      ];
    }
    
    if (lowerError.includes('typescript') || lowerError.includes('type')) {
      return [
        'Check TypeScript configuration in tsconfig.json',
        'Add missing type definitions',
        'Install @types packages for third-party libraries',
        'Review type annotations'
      ];
    }
    
    if (lowerError.includes('permission') || lowerError.includes('access')) {
      return [
        'Check file/directory permissions',
        'Run with appropriate privileges if needed',
        'Verify file paths are correct',
        'Ensure file is not locked by another process'
      ];
    }
    
    return [
      'Review the error message for specific clues',
      'Check recent code changes',
      'Look for similar issues online',
      'Try restarting the development server'
    ];
  }

  private classifyError(error: string): string {
    const lowerError = error.toLowerCase();
    
    if (lowerError.includes('syntax')) return 'syntax';
    if (lowerError.includes('type')) return 'type';
    if (lowerError.includes('module') || lowerError.includes('import')) return 'dependency';
    if (lowerError.includes('permission') || lowerError.includes('access')) return 'permission';
    if (lowerError.includes('network') || lowerError.includes('connection')) return 'network';
    
    return 'unknown';
  }

  private mockCodeGeneration(prompt: string, language: string): string {
    const lowerPrompt = prompt.toLowerCase();
    
    if (lowerPrompt.includes('function') && language === 'javascript') {
      return `// Generated function based on prompt: "${prompt}"\nfunction generatedFunction() {\n  // TODO: Implement functionality\n  console.log('Function called');\n  return true;\n}`;
    }
    
    if (lowerPrompt.includes('component') && language === 'typescript') {
      return `// Generated React component\nimport React from 'react';\n\ninterface Props {\n  // Add props here\n}\n\nexport default function GeneratedComponent(props: Props) {\n  return (\n    <div>\n      <h1>Generated Component</h1>\n    </div>\n  );\n}`;
    }
    
    return `// Generated ${language} code for: "${prompt}"\n// TODO: Implement the requested functionality\nconsole.log('Generated code placeholder');`;
  }

  private detectLanguage(filePath: string): string {
    const extension = filePath.split('.').pop()?.toLowerCase() || '';
    
    const languageMap: Record<string, string> = {
      'js': 'javascript',
      'jsx': 'javascript',
      'ts': 'typescript',
      'tsx': 'typescript',
      'py': 'python',
      'rb': 'ruby',
      'java': 'java',
      'cpp': 'cpp',
      'c': 'c',
      'cs': 'csharp',
      'go': 'go',
      'rs': 'rust',
      'php': 'php',
      'swift': 'swift'
    };
    
    return languageMap[extension] || 'text';
  }

  private extractFunctions(code: string, language: string): string[] {
    // Simple regex-based function extraction (mock implementation)
    const patterns: Record<string, RegExp> = {
      'javascript': /function\s+(\w+)/g,
      'typescript': /(?:function\s+(\w+)|(\w+)\s*\([^)]*\)\s*(?::\s*[^{]+)?\s*\{)/g,
      'python': /def\s+(\w+)/g,
      'java': /(?:public|private|protected)?\s*(?:static)?\s*\w+\s+(\w+)\s*\(/g
    };
    
    const pattern = patterns[language];
    if (!pattern) return [];
    
    const matches = code.match(pattern) || [];
    return matches.slice(0, 10); // Limit to first 10 matches
  }

  private extractImports(code: string, language: string): string[] {
    // Simple regex-based import extraction (mock implementation)
    const patterns: Record<string, RegExp> = {
      'javascript': /import\s+.*?\s+from\s+['"]([^'"]+)['"]/g,
      'typescript': /import\s+.*?\s+from\s+['"]([^'"]+)['"]/g,
      'python': /(?:import\s+(\w+)|from\s+(\w+)\s+import)/g,
      'java': /import\s+([\w.]+);/g
    };
    
    const pattern = patterns[language];
    if (!pattern) return [];
    
    const matches: string[] = [];
    let match;
    while ((match = pattern.exec(code)) !== null && matches.length < 10) {
      matches.push(match[1] || match[2] || match[0]);
    }
    
    return matches;
  }

  private isCodeFile(fileName: string): boolean {
    const codeExtensions = [
      'js', 'jsx', 'ts', 'tsx', 'py', 'rb', 'java', 'cpp', 'c', 'cs', 
      'go', 'rs', 'php', 'swift', 'kt', 'scala', 'html', 'css', 'scss'
    ];
    const extension = fileName.split('.').pop()?.toLowerCase() || '';
    return codeExtensions.includes(extension);
  }

  private isConfigFile(fileName: string): boolean {
    const configFiles = [
      'package.json', 'tsconfig.json', 'webpack.config.js', 'vite.config.ts',
      '.gitignore', '.env', 'dockerfile', 'docker-compose.yml', '.eslintrc'
    ];
    return configFiles.some(config => fileName.toLowerCase().includes(config.toLowerCase()));
  }
}

// Factory function to create AI agents (for future swapping)
export function createAIAgent(type: 'mock' | 'openai' | 'anthropic' = 'mock'): AIAgent {
  switch (type) {
    case 'mock':
      return new MockAIAgent();
    // Future implementations:
    // case 'openai':
    //   return new OpenAIAgent();
    // case 'anthropic':
    //   return new AnthropicAgent();
    default:
      return new MockAIAgent();
  }
}