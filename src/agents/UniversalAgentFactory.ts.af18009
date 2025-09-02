/**
 * UniversalAgentFactory - Creates AI agents for both Browser and Electron environments
 */

import { AIAgent } from '../services/MockAIAgent';
import { MockAIAgent } from '../services/MockAIAgent';
import { BrowserShellAIAgent } from './BrowserShellAIAgent';
import { ElectronShellAIAgent } from './ElectronShellAIAgent';
import { universalConfigService } from '../config/UniversalConfigService';

// ShellAIAgent will be imported conditionally at runtime to avoid build issues

export class UniversalAgentFactory {
  private static currentAgent: AIAgent | null = null;
  private static initialized: boolean = false;
  
  /**
   * Initialize the factory (must be called before getAgent)
   */
  static async initialize(): Promise<void> {
    if (this.initialized) return;
    
    await universalConfigService.initialize();
    this.initialized = true;
  }
  
  /**
   * Get the AI agent based on current configuration and environment
   */
  static async getAgent(): Promise<AIAgent> {
    if (!this.initialized) {
      await this.initialize();
    }
    
    const provider = universalConfigService.getAIProvider();
    
    // Check if we need to create a new agent
    if (this.currentAgent && this.currentAgent.name.toLowerCase().includes(provider)) {
      return this.currentAgent;
    }
    
    // Create new agent based on provider and environment
    switch (provider) {
      case 'shell':
        this.currentAgent = await this.createShellAgent();
        break;
        
      case 'api':
        // TODO: Implement APIAIAgent for OpenAI/Anthropic
        console.log('API provider not yet implemented, falling back to Mock');
        this.currentAgent = new MockAIAgent();
        break;
        
      case 'mock':
      default:
        console.log('Using Mock AI Agent');
        this.currentAgent = new MockAIAgent();
        break;
    }
    
    return this.currentAgent;
  }
  
  /**
   * Create shell agent based on environment
   */
  private static async createShellAgent(): Promise<AIAgent> {
    // More robust Electron detection
    const hasElectronAPI = typeof window !== 'undefined' && 
                          typeof (window as any).electronAPI !== 'undefined';
    const hasElectronProcess = typeof window !== 'undefined' && 
                              typeof (window as any).process !== 'undefined' &&
                              (window as any).process.type === 'renderer';
    const isElectron = hasElectronAPI || hasElectronProcess;
    
    console.log('Environment detection:');
    console.log('- hasElectronAPI:', hasElectronAPI);
    console.log('- hasElectronProcess:', hasElectronProcess);
    console.log('- isElectron:', isElectron);
    
    if (isElectron) {
      console.log('✅ Using Electron IPC Shell AI Agent');
      return new ElectronShellAIAgent();
    } else {
      console.log('🌐 Using Browser Shell AI Agent (Browser simulation)');
      return new BrowserShellAIAgent();
    }
  }
  
  /**
   * Force reload the agent (useful when config changes)
   */
  static reload(): void {
    this.currentAgent = null;
  }
  
  /**
   * Set up config file watcher to auto-reload agent
   */
  static watchConfig(): void {
    universalConfigService.watchConfigFile(() => {
      console.log('Config changed, reloading AI agent...');
      this.reload();
      
      // If current agent supports reload, call it
      if (this.currentAgent && typeof (this.currentAgent as any).reload === 'function') {
        (this.currentAgent as any).reload();
      }
    });
  }
  
  /**
   * Stop watching config file
   */
  static unwatchConfig(): void {
    universalConfigService.unwatchConfigFile();
  }
  
  /**
   * Get current environment info
   */
  static getEnvironmentInfo(): { environment: string; agent: string; config: any } {
    const isElectron = typeof window !== 'undefined' && 
                      typeof (window as any).electronAPI !== 'undefined';
    
    return {
      environment: isElectron ? 'electron' : 'browser',
      agent: this.currentAgent?.name || 'none',
      config: universalConfigService.getConfig()
    };
  }
}