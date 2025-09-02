import { AIAgent, AIAgentResult } from '../services/MockAIAgent';
import { universalConfigService } from '../config/UniversalConfigService';

/**
 * Electron Shell AI Agent that uses IPC to execute shell commands in main process
 * This avoids Node.js module compatibility issues with Vite build
 */
export class ElectronShellAIAgent implements AIAgent {
  name = 'Electron IPC Shell AI Agent';
  private outputConfig: { 
    useCodeBlock: boolean; 
    codeBlockSyntax: string;
    extraction: {
      enabled: boolean;
      startMarker: string;
      endMarker: string;
    };
  };
  
  constructor() {
    // Built-in safe defaults compatible with both regular and HPC environments
    this.outputConfig = {
      useCodeBlock: true,
      codeBlockSyntax: 'shell',
      extraction: {
        enabled: true,
        startMarker: '<RESPONSE>',
        endMarker: '</RESPONSE>'
      }
    };
    
    console.log('🔧 ElectronShellAIAgent initialized with built-in defaults');
  }
  
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
    
    // Load output format config with built-in fallbacks
    const shellConfig = universalConfigService.get<any>('ai:shell');
    if (shellConfig?.outputFormat) {
      this.outputConfig = {
        useCodeBlock: shellConfig.outputFormat.useCodeBlock ?? this.outputConfig.useCodeBlock,
        codeBlockSyntax: shellConfig.outputFormat.codeBlockSyntax || this.outputConfig.codeBlockSyntax,
        extraction: {
          enabled: shellConfig.outputFormat.extraction?.enabled ?? this.outputConfig.extraction.enabled,
          startMarker: shellConfig.outputFormat.extraction?.startMarker || this.outputConfig.extraction.startMarker,
          endMarker: shellConfig.outputFormat.extraction?.endMarker || this.outputConfig.extraction.endMarker
        }
      };
      console.log('✅ Using config-based output format:', this.outputConfig);
    } else {
      console.log('⚠️ No config found, using built-in defaults:', this.outputConfig);
    }
    
    // Convert message history to a single prompt
    const lastMessage = messages[messages.length - 1];
    const prompt = lastMessage?.content || '';
    
    console.log('Extracted prompt:', prompt);
    
    const result = await this.query(prompt);
    console.log('ElectronShellAIAgent query result:', result);
    
    // Format output based on config
    let output = '';
    
    // If PTY is used, return raw output with metadata
    if (result.metadata?.isPty) {
      // Return special format that App.tsx can detect
      return `__PTY_OUTPUT__${JSON.stringify({
        content: result.content,
        isPty: true
      })}`;
    }
    
    const wrapInCodeBlock = (text: string) => {
      if (this.outputConfig.useCodeBlock) {
        return `\`\`\`${this.outputConfig.codeBlockSyntax}\n${text}\n\`\`\``;
      }
      return text;
    };
    
    const extractResponse = (text: string) => {
      if (!this.outputConfig.extraction.enabled) {
        return text;
      }
      
      const { startMarker, endMarker } = this.outputConfig.extraction;
      const startIndex = text.indexOf(startMarker);
      const endIndex = text.indexOf(endMarker);
      
      if (startIndex !== -1 && endIndex !== -1 && endIndex > startIndex) {
        const extracted = text.substring(startIndex + startMarker.length, endIndex).trim();
        console.log('✅ Extracted response between markers:', { startIndex, endIndex, extracted: extracted.slice(0, 100) + '...' });
        return extracted;
      }
      
      console.log('⚠️ Markers not found, using fallback (full output)');
      return text;
    };
    
    if (result.success) {
      const stdout = result.metadata?.stdout || result.content || 'Command completed successfully';
      const extractedOutput = extractResponse(stdout);
      output = wrapInCodeBlock(extractedOutput);
      
      // Include stderr if present (only if extraction didn't reduce the output)
      if (result.metadata?.stderr && result.metadata.stderr.trim() && extractedOutput === stdout) {
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
          stdout: result.stdout,
          isPty: result.isPty
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