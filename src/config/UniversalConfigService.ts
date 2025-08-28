/**
 * UniversalConfigService - Works in both Browser and Electron environments
 */

import { DtuiConfig, DEFAULT_CONFIG } from './types';

export class UniversalConfigService {
  private static instance: UniversalConfigService;
  private config: DtuiConfig = DEFAULT_CONFIG;
  private initialized: boolean = false;

  private constructor() {}

  static getInstance(): UniversalConfigService {
    if (!UniversalConfigService.instance) {
      UniversalConfigService.instance = new UniversalConfigService();
    }
    return UniversalConfigService.instance;
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    if (this.isElectron()) {
      await this.loadElectronConfig();
    } else {
      await this.loadBrowserConfig();
    }

    this.initialized = true;
    console.log('UniversalConfigService initialized for:', this.isElectron() ? 'Electron' : 'Browser');
    console.log('Current config:', this.config);
  }

  private isElectron(): boolean {
    return typeof window !== 'undefined' && 
           typeof (window as any).electronAPI !== 'undefined';
  }

  private async loadElectronConfig(): Promise<void> {
    try {
      // In Electron, we can use full ConfigService via IPC
      if ((window as any).electronAPI && (window as any).electronAPI.getConfig) {
        this.config = await (window as any).electronAPI.getConfig();
        return;
      }
    } catch (error) {
      console.warn('Failed to load Electron config, using defaults:', error);
    }
    
    // Fallback to default config
    this.config = { ...DEFAULT_CONFIG };
  }

  private async loadBrowserConfig(): Promise<void> {
    try {
      // 1. Try localStorage first
      const saved = localStorage.getItem('dtui-config');
      if (saved) {
        const savedConfig = JSON.parse(saved);
        this.config = this.mergeConfig(DEFAULT_CONFIG, savedConfig);
        console.log('Loaded config from localStorage');
        return;
      }

      // 2. Try to fetch from public folder
      const response = await fetch('/dtui.json');
      if (response.ok) {
        const fileConfig = await response.json();
        this.config = this.mergeConfig(DEFAULT_CONFIG, fileConfig);
        
        // Cache in localStorage
        localStorage.setItem('dtui-config', JSON.stringify(this.config));
        console.log('Loaded config from public/dtui.json');
        return;
      }
    } catch (error) {
      console.warn('Failed to load browser config:', error);
    }

    // 3. Use enhanced default config for browser testing
    this.config = this.getBrowserDefaultConfig();
    console.log('Using enhanced browser default config');
  }

  private getBrowserDefaultConfig(): DtuiConfig {
    // Enhanced default config that enables shell agent testing in browser
    return {
      ...DEFAULT_CONFIG,
      ai: {
        provider: 'shell',  // Enable shell provider
        shell: {
          command: 'echo',
          args: ['[Mock Shell Response]:'],
          template: '{command} {args} "{prompt}"',
          timeout: 10000,
          streaming: false,
          workingDirectory: '/browser/simulation',
          env: {
            BROWSER_MODE: 'true'
          }
        },
        api: {
          provider: 'openai',
          apiKey: '',
          model: 'gpt-3.5-turbo',
          temperature: 0.7,
          maxTokens: 2000
        },
        mock: {
          delay: 500
        }
      }
    };
  }

  private mergeConfig(base: any, override: any): any {
    const result = { ...base };
    
    for (const key in override) {
      if (override[key] && typeof override[key] === 'object' && !Array.isArray(override[key])) {
        result[key] = this.mergeConfig(base[key] || {}, override[key]);
      } else {
        result[key] = override[key];
      }
    }
    
    return result;
  }

  // Configuration getters
  getAIProvider(): string {
    const provider = this.config.ai?.provider || 'mock';
    
    // In browser, we can simulate shell behavior
    if (!this.isElectron() && provider === 'shell') {
      return 'shell'; // Allow shell simulation in browser
    }
    
    return provider;
  }

  get<T>(path: string): T | undefined {
    return this.getNestedValue(this.config, path);
  }

  set(path: string, value: any): void {
    this.setNestedValue(this.config, path, value);
    
    // Save to localStorage in browser
    if (!this.isElectron()) {
      localStorage.setItem('dtui-config', JSON.stringify(this.config));
    }
  }

  getConfig(): DtuiConfig {
    return { ...this.config };
  }

  // Watch config changes (placeholder for browser)
  watchConfigFile(callback: () => void): void {
    if (this.isElectron()) {
      // In Electron, delegate to main process
      if ((window as any).electronAPI && (window as any).electronAPI.watchConfig) {
        (window as any).electronAPI.watchConfig(callback);
      }
    } else {
      // In browser, watch localStorage changes
      window.addEventListener('storage', (e) => {
        if (e.key === 'dtui-config') {
          callback();
        }
      });
    }
  }

  unwatchConfigFile(): void {
    if (this.isElectron()) {
      if ((window as any).electronAPI && (window as any).electronAPI.unwatchConfig) {
        (window as any).electronAPI.unwatchConfig();
      }
    }
    // Browser: removeEventListener would be needed but we don't track the listener
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split(':').reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : undefined;
    }, obj);
  }

  private setNestedValue(obj: any, path: string, value: any): void {
    const keys = path.split(':');
    const lastKey = keys.pop()!;
    
    const target = keys.reduce((current, key) => {
      if (!current[key] || typeof current[key] !== 'object') {
        current[key] = {};
      }
      return current[key];
    }, obj);
    
    target[lastKey] = value;
  }
}

// Export singleton instance
export const universalConfigService = UniversalConfigService.getInstance();