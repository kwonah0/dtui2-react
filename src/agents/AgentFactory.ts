import { AIAgent } from '../services/MockAIAgent';
import { MockAIAgent } from '../services/MockAIAgent';
import { ShellAIAgent } from './ShellAIAgent';
import { configService } from '../config/ConfigService';

/**
 * Factory for creating AI agents based on configuration
 */
export class AgentFactory {
  private static currentAgent: AIAgent | null = null;
  
  /**
   * Get the AI agent based on current configuration
   */
  static getAgent(): AIAgent {
    const provider = configService.getAIProvider();
    
    // Check if we need to create a new agent
    if (this.currentAgent && this.currentAgent.name.toLowerCase().includes(provider)) {
      return this.currentAgent;
    }
    
    // Create new agent based on provider
    switch (provider) {
      case 'shell':
        console.log('Using Shell AI Agent');
        this.currentAgent = new ShellAIAgent();
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
   * Force reload the agent (useful when config changes)
   */
  static reload(): void {
    this.currentAgent = null;
  }
  
  /**
   * Set up config file watcher to auto-reload agent
   */
  static watchConfig(): void {
    configService.watchConfigFile(() => {
      console.log('Config changed, reloading AI agent...');
      this.reload();
      
      // If current agent is ShellAIAgent, reload its config
      if (this.currentAgent && this.currentAgent instanceof ShellAIAgent) {
        (this.currentAgent as ShellAIAgent).reload();
      }
    });
  }
  
  /**
   * Stop watching config file
   */
  static unwatchConfig(): void {
    configService.unwatchConfigFile();
  }
}