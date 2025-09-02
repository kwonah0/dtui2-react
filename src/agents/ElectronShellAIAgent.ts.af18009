import { AIAgent, AIAgentResult } from '../services/MockAIAgent';
import { universalConfigService } from '../config/UniversalConfigService';

/**
 * Electron Shell AI Agent that uses IPC to execute shell commands in main process
 * This avoids Node.js module compatibility issues with Vite build
 */
export class ElectronShellAIAgent implements AIAgent {
  name = 'Electron IPC Shell AI Agent';
  private outputConfig: { useCodeBlock: boolean; codeBlockSyntax: string } = {
    useCodeBlock: true,
    codeBlockSyntax: 'shell'
  };
  
  async executeCommand(_command: string): Promise<AIAgentResult> {
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
    console.log('🎯 ElectronShellAIAgent.generateResponse called with messages:', messages);
    
    // Load output format config
    const shellConfig = universalConfigService.get<any>('ai:shell');
    if (shellConfig?.outputFormat) {
      this.outputConfig = {
        useCodeBlock: shellConfig.outputFormat.useCodeBlock ?? true,
        codeBlockSyntax: shellConfig.outputFormat.codeBlockSyntax || 'shell'
      };
    }
    console.log('Using output config:', this.outputConfig);
    
    // Convert message history to a single prompt
    const lastMessage = messages[messages.length - 1];
    const prompt = lastMessage?.content || '';
    
    console.log('Extracted prompt:', prompt);
    
    const result = await this.query(prompt);
    console.log('ElectronShellAIAgent query result:', result);
    
    // Format output based on config
    let output = '';
    const wrapInCodeBlock = (text: string) => {
      if (this.outputConfig.useCodeBlock) {
        return `\`\`\`${this.outputConfig.codeBlockSyntax}\n${text}\n\`\`\``;
      }
      return text;
    };
    
    if (result.success) {
      const stdout = result.metadata?.stdout || result.content || 'Command completed successfully';
      output = wrapInCodeBlock(stdout);
      
      // Include stderr if present
      if (result.metadata?.stderr && result.metadata.stderr.trim()) {
        const stderrFormatted = wrapInCodeBlock(result.metadata.stderr.trim());
        output += `\n\n**stderr:**\n${stderrFormatted}`;
      }
    } else {
      // For failures, show comprehensive error info in markdown format
      output = '**Command failed**\n\n';
      
      if (result.metadata?.stderr && result.metadata.stderr.trim()) {
        const stderrFormatted = wrapInCodeBlock(result.metadata.stderr.trim());
        output += `**stderr:**\n${stderrFormatted}\n\n`;
      }
      
      if (result.metadata?.stdout && result.metadata.stdout.trim()) {
        const stdoutFormatted = wrapInCodeBlock(result.metadata.stdout.trim());
        output += `**stdout:**\n${stdoutFormatted}\n\n`;
      }
      
      if (result.metadata?.exitCode !== undefined) {
        output += `**Exit code:** ${result.metadata.exitCode}`;
      }
      
      if (!result.metadata?.stderr && !result.metadata?.stdout) {
        output += result.content || 'Unknown error occurred';
      }
    }
    
    console.log('🔥 Formatted shell agent markdown output:', output);
    
    // Return plain markdown content (not terminal output)
    return output;
  }
  
  /**
   * Execute shell command via IPC to main process
   */
  private async query(prompt: string): Promise<AIAgentResult> {
    console.log('🔧 ElectronShellAIAgent.query called with prompt:', prompt);
    
    try {
      // Check if we're in Electron environment
      if (typeof window === 'undefined' || !((window as any).electronAPI?.executeShellAICommand)) {
        throw new Error('electronAPI.executeShellAICommand not available');
      }
      
      console.log('🚀 Calling electronAPI.executeShellAICommand...');
      
      // Execute shell command via IPC
      const result = await (window as any).electronAPI.executeShellAICommand(prompt);
      
      console.log('✅ IPC result received:', result);
      
      return {
        success: result.success,
        content: result.content,
        metadata: {
          exitCode: result.exitCode,
          stderr: result.stderr,
          stdout: result.stdout
        }
      };
      
    } catch (error) {
      console.error('❌ ElectronShellAIAgent error:', error);
      
      return {
        success: false,
        content: `Failed to execute shell command: ${error instanceof Error ? error.message : 'Unknown error'}`,
        metadata: {
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      };
    }
  }
  
  /**
   * Reload configuration (no-op for IPC agent)
   */
  reload(): void {
    console.log('ElectronShellAIAgent.reload() called (no-op for IPC agent)');
  }
}