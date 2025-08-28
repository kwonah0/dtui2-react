import { AIAgent, AIAgentResult } from '../services/MockAIAgent';

/**
 * Electron Shell AI Agent that uses IPC to execute shell commands in main process
 * This avoids Node.js module compatibility issues with Vite build
 */
export class ElectronShellAIAgent implements AIAgent {
  name = 'Electron IPC Shell AI Agent';
  
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
    
    // Convert message history to a single prompt
    const lastMessage = messages[messages.length - 1];
    const prompt = lastMessage?.content || '';
    
    console.log('Extracted prompt:', prompt);
    
    const result = await this.query(prompt);
    console.log('ElectronShellAIAgent query result:', result);
    
    // Format output like !shell commands for proper UI display
    let output = '';
    if (result.success) {
      output = result.metadata?.stdout || result.content || 'Command completed successfully';
      // Include stderr if present
      if (result.metadata?.stderr && result.metadata.stderr.trim()) {
        output += `\n[stderr]: ${result.metadata.stderr.trim()}`;
      }
    } else {
      // For failures, show comprehensive error info
      const parts = [];
      if (result.metadata?.stderr && result.metadata.stderr.trim()) {
        parts.push(`[stderr]: ${result.metadata.stderr.trim()}`);
      }
      if (result.metadata?.stdout && result.metadata.stdout.trim()) {
        parts.push(`[stdout]: ${result.metadata.stdout.trim()}`);
      }
      if (result.metadata?.exitCode !== undefined) {
        parts.push(`[exit code: ${result.metadata.exitCode}]`);
      }
      output = parts.length > 0 ? parts.join('\n') : (result.content || 'Command failed');
    }
    
    console.log('🔥 Formatted shell agent output:', output);
    
    // Return special marker for terminal output (like !shell commands)
    return `__TERMINAL_OUTPUT__${JSON.stringify({ command: `shell-agent: ${prompt}`, output })}`;
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