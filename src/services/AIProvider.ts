import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { Message, MessageRole } from '../types';
import { UniversalAgentFactory } from '../agents/UniversalAgentFactory';
import { universalConfigService } from '../config/UniversalConfigService';
import { APIAIConfig } from '../config/types';
import { AIAgent } from './MockAIAgent';

// Legacy interface for backward compatibility
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
  private legacyConfig: AIConfig;
  private aiAgent: AIAgent | null = null;

  constructor(config?: Partial<AIConfig>) {
    console.log('AIProvider constructor called');
    // Initialize UniversalAgentFactory
    this.initializeAgent();
    
    // Legacy config for backward compatibility (API providers)
    const getEnvVar = (key: string): string => {
      if (typeof process !== 'undefined' && process.env) {
        return process.env[key] || '';
      }
      return '';
    };

    this.legacyConfig = {
      provider: 'openai',
      model: 'gpt-3.5-turbo',
      apiKey: getEnvVar('REACT_APP_OPENAI_API_KEY'),
      temperature: 0.7,
      maxTokens: 4000,
      ...config,
    };

    // Initialize API clients if needed for legacy API mode
    if (this.legacyConfig.provider === 'openai' && this.legacyConfig.apiKey) {
      this.openai = new OpenAI({
        apiKey: this.legacyConfig.apiKey,
        dangerouslyAllowBrowser: true,
      });
    } else if (this.legacyConfig.provider === 'anthropic' && this.legacyConfig.apiKey) {
      this.anthropic = new Anthropic({
        apiKey: this.legacyConfig.apiKey,
        dangerouslyAllowBrowser: true,
      });
    }
  }

  private async initializeAgent(): Promise<void> {
    console.log('AIProvider.initializeAgent() called');
    try {
      // Initialize UniversalAgentFactory and get the appropriate agent
      console.log('Initializing UniversalAgentFactory...');
      await UniversalAgentFactory.initialize();
      console.log('Getting agent from UniversalAgentFactory...');
      this.aiAgent = await UniversalAgentFactory.getAgent();
      
      // Set up config watcher
      UniversalAgentFactory.watchConfig();
      
      console.log('AIProvider initialized with agent:', this.aiAgent?.name);
      console.log('Environment info:', UniversalAgentFactory.getEnvironmentInfo());
    } catch (error) {
      console.error('Failed to initialize agent:', error);
      // Fallback to MockAIAgent
      const { MockAIAgent } = await import('./MockAIAgent');
      this.aiAgent = new MockAIAgent();
    }
  }

  async generateResponse(messages: Message[]): Promise<string> {
    console.log('🚀 AIProvider.generateResponse called with messages:', messages);
    
    // Ensure agent is initialized
    if (!this.aiAgent) {
      console.log('Agent not initialized, initializing now...');
      await this.initializeAgent();
    }
    
    console.log('Current agent:', this.aiAgent?.name);
    
    // Check for special commands first
    const lastMessage = messages[messages.length - 1];
    if (lastMessage.role === MessageRole.USER) {
      const specialResponse = await this.handleSpecialCommands(lastMessage.content);
      if (specialResponse) {
        console.log('Special command response:', specialResponse);
        return specialResponse;
      }
    }

    // Check if we're using the new agent-based system
    const aiProvider = universalConfigService.getAIProvider();
    console.log('AI Provider type:', aiProvider);
    
    if (aiProvider === 'shell' || aiProvider === 'mock') {
      if (this.aiAgent) {
        console.log('Calling agent.generateResponse...');
        try {
          const response = await this.aiAgent.generateResponse(messages);
          console.log('Agent response:', response);
          return response;
        } catch (error) {
          console.error('Agent generateResponse error:', error);
          return `Agent Error: ${error instanceof Error ? error.message : 'Unknown error'}`;
        }
      } else {
        console.error('Agent is null despite initialization!');
        return 'Error: AI agent not available';
      }
    }

    // Legacy API-based providers
    const apiConfig = universalConfigService.get<APIAIConfig>('ai:api');
    if (apiConfig && apiConfig.apiKey) {
      if (apiConfig.provider === 'openai' && this.openai) {
        return this.generateOpenAIResponse(messages, apiConfig);
      } else if (apiConfig.provider === 'anthropic' && this.anthropic) {
        return this.generateAnthropicResponse(messages, apiConfig);
      }
    }

    // Fallback to current agent
    return this.aiAgent!.generateResponse(messages);
  }

  private async generateOpenAIResponse(messages: Message[], config: APIAIConfig): Promise<string> {
    if (!this.openai) {
      throw new Error('OpenAI client not initialized');
    }

    const openAIMessages = messages.map(msg => ({
      role: msg.role as 'user' | 'assistant' | 'system',
      content: msg.content,
    }));

    const completion = await this.openai.chat.completions.create({
      model: config.model || 'gpt-3.5-turbo',
      messages: openAIMessages,
      temperature: config.temperature || 0.7,
      max_tokens: config.maxTokens || 4000,
    });

    return completion.choices[0]?.message?.content || 'No response received';
  }

  private async generateAnthropicResponse(messages: Message[], config: APIAIConfig): Promise<string> {
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
      model: config.model || 'claude-3-haiku-20240307',
      max_tokens: config.maxTokens || 4000,
      temperature: config.temperature || 0.7,
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
          console.log('🔥 Executing shell command:', command);
          // Execute command and get output for chat integration
          const result = await window.electronAPI.executeCommandWithOutput(command);
          console.log('🔥 Shell command result:', result);
          
          let output = '';
          if (result.success) {
            output = result.stdout || 'Command completed successfully';
            // Include stderr if present (some commands output info to stderr even on success)
            if (result.stderr && result.stderr.trim()) {
              output += `\n[stderr]: ${result.stderr.trim()}`;
            }
          } else {
            // For failures, show both stdout and stderr
            const parts = [];
            if (result.stderr && result.stderr.trim()) {
              parts.push(`[stderr]: ${result.stderr.trim()}`);
            }
            if (result.stdout && result.stdout.trim()) {
              parts.push(`[stdout]: ${result.stdout.trim()}`);
            }
            if (result.exitCode !== undefined) {
              parts.push(`[exit code: ${result.exitCode}]`);
            }
            output = parts.length > 0 ? parts.join('\n') : 'Command failed';
          }
          
          console.log('🔥 Final output to show:', output);
          
          // Return special marker for terminal output
          return `__TERMINAL_OUTPUT__${JSON.stringify({ command, output })}`;
        } catch (error) {
          console.error('🔥 Shell command error:', error);
          return `**Command:** \`${command}\`\n\n**Error:** ${error instanceof Error ? error.message : 'Unknown error'}`;
        }
      } else {
        // Browser environment: use current AI Agent for shell simulation
        try {
          const result = await this.aiAgent!.executeCommand(command);
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
          const result = await this.aiAgent!.executeCommand(`cd ${dirPath}`);
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
          const result = await this.aiAgent!.executeCommand('pwd');
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
          const result = await this.aiAgent!.analyzeCode(filePath);
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
          const result = await this.aiAgent!.analyzeProject(dirPath);
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
        const result = await this.aiAgent!.analyzeCode(filePath);
        return result.content;
      } catch (error) {
        return `**Error analyzing code:** ${error instanceof Error ? error.message : 'Unknown error'}`;
      }
    }

    if (message.toLowerCase().startsWith('analyze project') || message.toLowerCase().startsWith('analyze project ')) {
      const projectPath = message.slice('analyze project'.length).trim() || '.';
      try {
        const result = await this.aiAgent!.analyzeProject(projectPath);
        return result.content;
      } catch (error) {
        return `**Error analyzing project:** ${error instanceof Error ? error.message : 'Unknown error'}`;
      }
    }

    if (message.toLowerCase().startsWith('suggest fix ')) {
      const errorDescription = message.slice('suggest fix '.length).trim();
      try {
        const result = await this.aiAgent!.suggestFix(errorDescription);
        return result.content;
      } catch (error) {
        return `**Error generating suggestions:** ${error instanceof Error ? error.message : 'Unknown error'}`;
      }
    }

    if (message.toLowerCase().startsWith('generate code ')) {
      const prompt = message.slice('generate code '.length).trim();
      try {
        const result = await this.aiAgent!.generateCode(prompt);
        return result.content;
      } catch (error) {
        return `**Error generating code:** ${error instanceof Error ? error.message : 'Unknown error'}`;
      }
    }

    if (message.toLowerCase().startsWith('help') || message.toLowerCase() === 'commands') {
      if (this.aiAgent) {
        const result = await this.aiAgent.generateResponse([{ role: MessageRole.USER, content: 'help' }]);
        return result;
      }
      return '**Help:** Commands available - type commands like "analyze code", "generate code", or prefix shell commands with "!"';
    }

    return null; // Not a special command
  }

  setConfig(config: Partial<AIConfig>) {
    this.legacyConfig = { ...this.legacyConfig, ...config };
    
    // Reinitialize clients if needed
    if (config.provider === 'openai' && config.apiKey) {
      this.openai = new OpenAI({
        apiKey: config.apiKey,
        dangerouslyAllowBrowser: true,
      });
    } else if (config.provider === 'anthropic' && config.apiKey) {
      this.anthropic = new Anthropic({
        apiKey: config.apiKey,
        dangerouslyAllowBrowser: true,
      });
    }
  }

  getConfig(): AIConfig {
    return { ...this.legacyConfig };
  }

}