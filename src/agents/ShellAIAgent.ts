import { spawn } from 'child_process';
import { AIAgent, AIAgentResult } from '../services/MockAIAgent';
import { configService } from '../config/ConfigService';
import { ShellAIConfig } from '../config/types';

/**
 * Shell-based AI Agent that executes CLI commands
 * Supports any AI tool that accepts prompts via command line
 */
export class ShellAIAgent implements AIAgent {
  name = 'Shell AI Agent';
  private config: ShellAIConfig;
  
  constructor() {
    // Built-in safe defaults compatible with both regular and HPC environments
    const builtInDefaults: ShellAIConfig = {
      command: 'bash',
      args: ['-c', 'echo "[DTUI-SHELL]:"; cat'],
      template: '{command} {args} <<< "{prompt}"',
      timeout: 10000,
      streaming: false,
      outputFormat: {
        useCodeBlock: true,
        codeBlockSyntax: 'shell'
      }
    };
    
    // Try to load from config service, fallback to built-in defaults
    const configFromService = configService.get<ShellAIConfig>('ai:shell');
    this.config = configFromService ? { ...builtInDefaults, ...configFromService } : builtInDefaults;
    
    console.log('🔧 ShellAIAgent initialized with config:', this.config);
  }
  
  async executeCommand(_command: string): Promise<AIAgentResult> {
    // Terminal commands are passed through directly
    return {
      success: false,
      content: 'Terminal commands should be handled by the terminal service, not the AI agent.'
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
    console.log('🎯 ShellAIAgent.generateResponse called with messages:', messages);
    
    // Convert message history to a single prompt
    const lastMessage = messages[messages.length - 1];
    const prompt = lastMessage?.content || '';
    
    console.log('Extracted prompt:', prompt);
    
    const result = await this.query(prompt);
    console.log('ShellAIAgent query result:', result);
    
    // Always return the content, which now includes error information for failed commands
    return result.content;
  }
  
  /**
   * Execute the AI command with the given prompt
   */
  private async query(prompt: string): Promise<AIAgentResult> {
    console.log('🔧 ShellAIAgent.query called with prompt:', prompt);
    
    const command = this.config.command || 'echo';
    const args = this.config.args || [];
    const template = this.config.template || '{command} {args} "{prompt}"';
    const timeout = this.config.timeout || 30000;
    const env = this.config.env || {};
    const cwd = this.config.workingDirectory || process.cwd();
    
    console.log('Shell config:', { command, args, template, timeout });
    
    // Build the full command
    const fullCommand = this.buildCommand(command, args, prompt, template);
    
    console.log(`🚀 Executing AI command: ${fullCommand}`);
    
    return new Promise((resolve) => {
      let output = '';
      let error = '';
      let timedOut = false;
      
      // Use shell: true to execute the full command as a string
      // This avoids parsing issues with complex commands
      const childProcess = spawn(fullCommand, [], {
        cwd,
        env: { ...process.env, ...env },
        shell: true
      });
      
      // Collect stdout
      childProcess.stdout?.on('data', (data) => {
        output += data.toString();
        
        // If streaming is enabled, we could emit events here
        if (this.config.streaming) {
          // TODO: Implement streaming support
        }
      });
      
      // Collect stderr
      childProcess.stderr?.on('data', (data) => {
        error += data.toString();
      });
      
      // Handle process completion
      childProcess.on('close', (code) => {
        if (timedOut) return;
        
        console.log(`✅ Command finished with exit code: ${code}`);
        console.log(`Output: "${output.trim()}"`);
        console.log(`Error: "${error.trim()}"`);
        
        if (code === 0) {
          let finalContent = output.trim() || 'Command completed successfully';
          
          // Include stderr in success response if present (some commands output info to stderr)
          if (error.trim()) {
            finalContent += `\n[stderr]: ${error.trim()}`;
          }
          
          const result = {
            success: true,
            content: finalContent,
            metadata: {
              command: fullCommand,
              exitCode: code,
              duration: Date.now(),
              stderr: error.trim()
            }
          };
          console.log('✅ Resolving with success result:', result);
          resolve(result);
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
          
          const result = {
            success: false,
            content: errorContent,
            metadata: {
              command: fullCommand,
              exitCode: code,
              stderr: error.trim(),
              stdout: output.trim()
            }
          };
          console.log('❌ Resolving with error result:', result);
          resolve(result);
        }
      });
      
      // Handle process errors
      childProcess.on('error', (err) => {
        console.error('❌ Process error:', err);
        resolve({
          success: false,
          content: `Failed to execute command: ${err.message}`,
          metadata: {
            command: fullCommand,
            error: err.message
          }
        });
      });
      
      // Set timeout
      const timeoutHandle = setTimeout(() => {
        timedOut = true;
        childProcess.kill();
        resolve({
          success: false,
          content: `Command timed out after ${timeout}ms`,
          metadata: {
            command: fullCommand,
            timeout
          }
        });
      }, timeout);
      
      // Clear timeout on completion
      childProcess.on('exit', () => {
        clearTimeout(timeoutHandle);
      });
    });
  }
  
  /**
   * Build the command string from template
   */
  private buildCommand(command: string, args: string[], prompt: string, template: string): string {
    // Escape prompt for shell
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
    // Built-in safe defaults compatible with both regular and HPC environments
    const builtInDefaults: ShellAIConfig = {
      command: 'bash',
      args: ['-c', 'echo "[DTUI-SHELL]:"; cat'],
      template: '{command} {args} <<< "{prompt}"',
      timeout: 10000,
      streaming: false,
      outputFormat: {
        useCodeBlock: true,
        codeBlockSyntax: 'shell'
      }
    };
    
    // Try to load from config service, fallback to built-in defaults
    const configFromService = configService.get<ShellAIConfig>('ai:shell');
    this.config = configFromService ? { ...builtInDefaults, ...configFromService } : builtInDefaults;
    
    console.log('🔄 ShellAIAgent config reloaded:', this.config);
  }
}