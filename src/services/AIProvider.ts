import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { Message, MessageRole } from '../types';
import { createAIAgent, AIAgent } from './MockAIAgent';

export interface AIConfig {
  provider: 'openai' | 'anthropic';
  model: string;
  apiKey: string;
  temperature?: number;
  maxTokens?: number;
}

export class AIProvider {
  private openai: OpenAI | null = null;
  private anthropic: Anthropic | null = null;
  private config: AIConfig;
  private aiAgent: AIAgent;

  constructor(config?: Partial<AIConfig>) {
    // Default configuration - handle browser environment
    const getEnvVar = (key: string): string => {
      if (typeof process !== 'undefined' && process.env) {
        return process.env[key] || '';
      }
      return '';
    };

    this.config = {
      provider: 'openai',
      model: 'gpt-3.5-turbo',
      apiKey: getEnvVar('REACT_APP_OPENAI_API_KEY'),
      temperature: 0.7,
      maxTokens: 4000,
      ...config,
    };

    // Initialize AI Agent
    this.aiAgent = createAIAgent('mock');

    // Initialize the appropriate client
    if (this.config.provider === 'openai' && this.config.apiKey) {
      this.openai = new OpenAI({
        apiKey: this.config.apiKey,
        dangerouslyAllowBrowser: true, // Required for browser usage
      });
    } else if (this.config.provider === 'anthropic') {
      const anthropicKey = getEnvVar('REACT_APP_ANTHROPIC_API_KEY') || config?.apiKey || '';
      if (anthropicKey) {
        this.anthropic = new Anthropic({
          apiKey: anthropicKey,
          dangerouslyAllowBrowser: true,
        });
        this.config.model = this.config.model || 'claude-3-haiku-20240307';
      }
    }
  }

  async generateResponse(messages: Message[]): Promise<string> {
    // Check for special commands first
    const lastMessage = messages[messages.length - 1];
    if (lastMessage.role === MessageRole.USER) {
      const specialResponse = await this.handleSpecialCommands(lastMessage.content);
      if (specialResponse) {
        return specialResponse;
      }
    }

    // If no API key is configured, use Mock AI Agent for general responses
    if (!this.config.apiKey) {
      return this.generateMockResponse(messages);
    }

    if (this.config.provider === 'openai' && this.openai) {
      return this.generateOpenAIResponse(messages);
    } else if (this.config.provider === 'anthropic' && this.anthropic) {
      return this.generateAnthropicResponse(messages);
    } else {
      // Fallback to mock response if real AI providers fail
      return this.generateMockResponse(messages);
    }
  }

  private async generateOpenAIResponse(messages: Message[]): Promise<string> {
    if (!this.openai) {
      throw new Error('OpenAI client not initialized');
    }

    const openAIMessages = messages.map(msg => ({
      role: msg.role as 'user' | 'assistant' | 'system',
      content: msg.content,
    }));

    const completion = await this.openai.chat.completions.create({
      model: this.config.model,
      messages: openAIMessages,
      temperature: this.config.temperature,
      max_tokens: this.config.maxTokens,
    });

    return completion.choices[0]?.message?.content || 'No response received';
  }

  private async generateAnthropicResponse(messages: Message[]): Promise<string> {
    if (!this.anthropic) {
      throw new Error('Anthropic client not initialized');
    }

    // Convert messages to Anthropic format
    const systemMessages = messages.filter(m => m.role === MessageRole.SYSTEM);
    const conversationMessages = messages.filter(m => m.role !== MessageRole.SYSTEM);

    const anthropicMessages = conversationMessages.map(msg => ({
      role: msg.role === MessageRole.USER ? 'user' as const : 'assistant' as const,
      content: msg.content,
    }));

    const systemMessage = systemMessages.map(m => m.content).join('\n') || 
      'You are Claude, a helpful AI assistant created by Anthropic.';

    const response = await this.anthropic.messages.create({
      model: this.config.model,
      max_tokens: this.config.maxTokens || 4000,
      temperature: this.config.temperature,
      system: systemMessage,
      messages: anthropicMessages,
    });

    const content = response.content[0];
    if (content.type === 'text') {
      return content.text;
    }

    return 'No response received';
  }

  private async handleSpecialCommands(message: string): Promise<string | null> {
    // Handle shell commands
    if (message.startsWith('!')) {
      const command = message.slice(1).trim();
      if (window.electronAPI) {
        try {
          // Execute command and get output for chat integration
          const result = await window.electronAPI.executeCommandWithOutput(command);
          const output = result.success ? result.stdout : (result.stderr || 'Command failed');
          
          // Return special marker for terminal output
          return `__TERMINAL_OUTPUT__${JSON.stringify({ command, output })}`;
        } catch (error) {
          return `**Command:** \`${command}\`\n\n**Error:** ${error instanceof Error ? error.message : 'Unknown error'}`;
        }
      } else {
        // Browser environment: use Mock AI Agent for shell simulation
        try {
          const result = await this.aiAgent.executeCommand(command);
          return result.content;
        } catch (error) {
          return `**Command:** \`${command}\`\n\n**Error:** ${error instanceof Error ? error.message : 'Unknown error'}`;
        }
      }
    }

    // Handle change directory
    if (message.toLowerCase().startsWith('cd ')) {
      const dirPath = message.slice(3).trim();
      if (window.electronAPI) {
        try {
          const result = await window.electronAPI.changeDirectory(dirPath);
          if (result.success) {
            return `**Directory changed to:** \`${result.cwd}\``;
          } else {
            return `**Error changing directory:** ${result.error}`;
          }
        } catch (error) {
          return `**Error:** ${error instanceof Error ? error.message : 'Unknown error'}`;
        }
      } else {
        // Browser environment: use Mock API
        try {
          const result = await this.aiAgent.executeCommand(`cd ${dirPath}`);
          return result.content;
        } catch (error) {
          return `**Error:** ${error instanceof Error ? error.message : 'Unknown error'}`;
        }
      }
    }

    // Handle pwd (print working directory)
    if (message.toLowerCase() === 'pwd') {
      if (window.electronAPI) {
        try {
          const result = await window.electronAPI.getCurrentDirectory();
          if (result.success) {
            return `**Current directory:** \`${result.cwd}\``;
          } else {
            return `**Error getting current directory:** ${result.error}`;
          }
        } catch (error) {
          return `**Error:** ${error instanceof Error ? error.message : 'Unknown error'}`;
        }
      } else {
        // Browser environment: use Mock API
        try {
          const result = await this.aiAgent.executeCommand('pwd');
          return result.content;
        } catch (error) {
          return `**Error:** ${error instanceof Error ? error.message : 'Unknown error'}`;
        }
      }
    }

    // Handle file operations
    if (message.toLowerCase().startsWith('read file ')) {
      const filePath = message.slice('read file '.length).trim();
      if (window.electronAPI) {
        try {
          const result = await window.electronAPI.readFile(filePath);
          if (result.success && result.content !== undefined) {
            return `**File:** \`${filePath}\`\n\n\`\`\`\n${result.content}\n\`\`\``;
          } else {
            return `**File:** \`${filePath}\`\n\n**Error:** ${result.error}`;
          }
        } catch (error) {
          return `**File:** \`${filePath}\`\n\n**Error:** ${error instanceof Error ? error.message : 'Unknown error'}`;
        }
      } else {
        // Browser environment: use Mock AI Agent
        try {
          const result = await this.aiAgent.analyzeCode(filePath);
          return result.content;
        } catch (error) {
          return `**File:** \`${filePath}\`\n\n**Error:** ${error instanceof Error ? error.message : 'Unknown error'}`;
        }
      }
    }

    // Handle list directory
    if (message.toLowerCase().startsWith('list files') || message.toLowerCase().startsWith('ls ')) {
      const dirPath = message.toLowerCase().startsWith('ls ') 
        ? message.slice(3).trim() || '.' 
        : '.';
      
      if (window.electronAPI) {
        try {
          const result = await window.electronAPI.listDirectory(dirPath);
          if (result.success && result.files) {
            const fileList = result.files
              .map(file => `${file.isDirectory ? '📁' : '📄'} ${file.name}`)
              .join('\n');
            return `**Directory:** \`${dirPath}\`\n\n\`\`\`\n${fileList}\n\`\`\``;
          } else {
            return `**Directory:** \`${dirPath}\`\n\n**Error:** ${result.error}`;
          }
        } catch (error) {
          return `**Directory:** \`${dirPath}\`\n\n**Error:** ${error instanceof Error ? error.message : 'Unknown error'}`;
        }
      } else {
        // Browser environment: use Mock AI Agent
        try {
          const result = await this.aiAgent.analyzeProject(dirPath);
          return result.content;
        } catch (error) {
          return `**Directory:** \`${dirPath}\`\n\n**Error:** ${error instanceof Error ? error.message : 'Unknown error'}`;
        }
      }
    }

    // Handle AI Agent commands
    if (message.toLowerCase().startsWith('analyze code ')) {
      const filePath = message.slice('analyze code '.length).trim();
      try {
        const result = await this.aiAgent.analyzeCode(filePath);
        return result.content;
      } catch (error) {
        return `**Error analyzing code:** ${error instanceof Error ? error.message : 'Unknown error'}`;
      }
    }

    if (message.toLowerCase().startsWith('analyze project') || message.toLowerCase().startsWith('analyze project ')) {
      const projectPath = message.slice('analyze project'.length).trim() || '.';
      try {
        const result = await this.aiAgent.analyzeProject(projectPath);
        return result.content;
      } catch (error) {
        return `**Error analyzing project:** ${error instanceof Error ? error.message : 'Unknown error'}`;
      }
    }

    if (message.toLowerCase().startsWith('suggest fix ')) {
      const errorDescription = message.slice('suggest fix '.length).trim();
      try {
        const result = await this.aiAgent.suggestFix(errorDescription);
        return result.content;
      } catch (error) {
        return `**Error generating suggestions:** ${error instanceof Error ? error.message : 'Unknown error'}`;
      }
    }

    if (message.toLowerCase().startsWith('generate code ')) {
      const prompt = message.slice('generate code '.length).trim();
      try {
        const result = await this.aiAgent.generateCode(prompt);
        return result.content;
      } catch (error) {
        return `**Error generating code:** ${error instanceof Error ? error.message : 'Unknown error'}`;
      }
    }

    if (message.toLowerCase().startsWith('help') || message.toLowerCase() === 'commands') {
      return this.getHelpMessage();
    }

    return null; // Not a special command
  }

  setConfig(config: Partial<AIConfig>) {
    this.config = { ...this.config, ...config };
    
    // Reinitialize clients if needed
    if (config.provider === 'openai' || (config.apiKey && this.config.provider === 'openai')) {
      this.openai = new OpenAI({
        apiKey: this.config.apiKey,
        dangerouslyAllowBrowser: true,
      });
    } else if (config.provider === 'anthropic' || (config.apiKey && this.config.provider === 'anthropic')) {
      this.anthropic = new Anthropic({
        apiKey: this.config.apiKey,
        dangerouslyAllowBrowser: true,
      });
    }
  }

  getConfig(): AIConfig {
    return { ...this.config };
  }

  private async generateMockResponse(messages: Message[]): Promise<string> {
    // Simple mock AI responses for general chat
    const lastMessage = messages[messages.length - 1];
    const userMessage = lastMessage.content.toLowerCase();
    
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
}