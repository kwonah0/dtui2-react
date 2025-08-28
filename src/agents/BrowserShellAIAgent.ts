/**
 * BrowserShellAIAgent - Shell AI Agent that works in browser environment
 * Simulates shell execution using the same pattern as real ShellAIAgent
 */

import { AIAgent, AIAgentResult } from '../services/MockAIAgent';
import { universalConfigService } from '../config/UniversalConfigService';
import { ShellAIConfig } from '../config/types';

export class BrowserShellAIAgent implements AIAgent {
  name = 'Browser Shell AI Agent';
  private config: ShellAIConfig;
  
  constructor() {
    this.config = universalConfigService.get<ShellAIConfig>('ai:shell') || {
      command: 'echo',
      args: ['[Browser Shell Response]:'],
      template: '{command} {args} "{prompt}"',
      timeout: 10000
    };
  }
  
  async executeCommand(_command: string): Promise<AIAgentResult> {
    // Browser environment: simulate shell execution
    return {
      success: false,
      content: 'Terminal commands should be handled by the terminal service, not the AI agent in browser mode.'
    };
  }
  
  async analyzeCode(filePath: string): Promise<AIAgentResult> {
    const prompt = `Analyze this code file: ${filePath}`;
    return this.query(prompt);
  }
  
  async analyzeProject(projectPath?: string): Promise<AIAgentResult> {
    const prompt = `Analyze this project: ${projectPath || 'current directory'}`;
    return this.query(prompt);
  }
  
  async suggestFix(error: string): Promise<AIAgentResult> {
    const prompt = `Suggest a fix for this error: ${error}`;
    return this.query(prompt);
  }
  
  async generateCode(prompt: string): Promise<AIAgentResult> {
    return this.query(`Generate code: ${prompt}`);
  }
  
  async generateResponse(messages: any[]): Promise<string> {
    // Convert message history to a single prompt
    const lastMessage = messages[messages.length - 1];
    const prompt = lastMessage?.content || '';
    
    const result = await this.query(prompt);
    return result.content;
  }
  
  /**
   * Execute the AI command with the given prompt using browser-compatible method
   */
  private async query(prompt: string): Promise<AIAgentResult> {
    const command = this.config.command || 'echo';
    const args = this.config.args || ['[Response]:'];
    const template = this.config.template || '{command} {args} "{prompt}"';
    const timeout = this.config.timeout || 10000;
    
    // Build the command string (same as real ShellAIAgent)
    const fullCommand = this.buildCommand(command, args, prompt, template);
    
    console.log(`Browser Shell AI executing: ${fullCommand}`);
    
    // Simulate command execution in browser
    return new Promise((resolve) => {
      const startTime = Date.now();
      
      // Simulate async execution with timeout
      const timeoutHandle = setTimeout(() => {
        resolve({
          success: false,
          content: `Command timed out after ${timeout}ms in browser simulation`,
          metadata: {
            command: fullCommand,
            timeout,
            environment: 'browser'
          }
        });
      }, timeout);
      
      // Simulate shell command execution
      setTimeout(() => {
        clearTimeout(timeoutHandle);
        
        const output = this.simulateShellCommand(fullCommand, prompt);
        const duration = Date.now() - startTime;
        
        resolve({
          success: true,
          content: output,
          metadata: {
            command: fullCommand,
            duration,
            environment: 'browser',
            config: {
              command,
              args,
              template
            }
          }
        });
      }, Math.min(100, timeout)); // Quick simulation
    });
  }
  
  /**
   * Simulate shell command execution based on the configured command
   */
  private simulateShellCommand(fullCommand: string, prompt: string): string {
    const command = this.config.command || 'echo';
    
    // Simulate different shell commands
    switch (command.toLowerCase()) {
      case 'echo':
        return `${this.config.args?.join(' ') || ''} ${prompt}`;
        
      case 'llm':
        return this.simulateLLMResponse(prompt);
        
      case 'ollama':
        return this.simulateOllamaResponse(prompt);
        
      case 'claude':
        return this.simulateClaudeResponse(prompt);
        
      default:
        return `Simulated response from ${command}: ${prompt}\n\n[Browser simulation - command executed: ${fullCommand}]`;
    }
  }
  
  private simulateLLMResponse(prompt: string): string {
    return `LLM Response (simulated):\n\n${this.generateContextualResponse(prompt)}\n\n[Simulated using 'llm' command in browser]`;
  }
  
  private simulateOllamaResponse(prompt: string): string {
    return `Ollama Response (simulated):\n\n${this.generateContextualResponse(prompt)}\n\n[Simulated using 'ollama run llama2' in browser]`;
  }
  
  private simulateClaudeResponse(prompt: string): string {
    return `Claude CLI Response (simulated):\n\n${this.generateContextualResponse(prompt)}\n\n[Simulated using 'claude --print' in browser]`;
  }
  
  private generateContextualResponse(prompt: string): string {
    const lowerPrompt = prompt.toLowerCase();
    
    if (lowerPrompt.includes('hello') || lowerPrompt.includes('hi')) {
      return "Hello! I'm a simulated AI assistant running through the shell agent configuration system.";
    }
    
    if (lowerPrompt.includes('help')) {
      return "This is a browser simulation of a shell-based AI agent. The configuration system is working correctly!";
    }
    
    if (lowerPrompt.includes('test') || lowerPrompt.includes('config')) {
      return `Configuration test successful! Current setup:\n- Command: ${this.config.command}\n- Args: ${this.config.args?.join(' ')}\n- Template: ${this.config.template}\n- Environment: Browser simulation`;
    }
    
    if (lowerPrompt.includes('code') || lowerPrompt.includes('programming')) {
      return "I can help with code analysis and generation. This response is generated using the configured shell AI agent pattern.";
    }
    
    return `I understand you're asking about: "${prompt}"\n\nThis response demonstrates that the configuration system is working correctly. The shell AI agent is using the configured command (${this.config.command}) with template: ${this.config.template}`;
  }
  
  /**
   * Build the command string from template (same logic as real ShellAIAgent)
   */
  private buildCommand(command: string, args: string[], prompt: string, template: string): string {
    // Escape prompt for shell (same as real implementation)
    const escapedPrompt = prompt.replace(/"/g, '\\"').replace(/\$/g, '\\$');
    
    // Join args
    const argsString = args.join(' ');
    
    // Replace template variables
    let result = template
      .replace('{command}', command)
      .replace('{args}', argsString)
      .replace('{prompt}', escapedPrompt);
    
    return result;
  }
  
  /**
   * Reload configuration
   */
  reload(): void {
    this.config = universalConfigService.get<ShellAIConfig>('ai:shell') || {
      command: 'echo',
      args: ['[Response]:'],
      template: '{command} {args} "{prompt}"'
    };
    console.log('BrowserShellAIAgent reloaded config:', this.config);
  }
}