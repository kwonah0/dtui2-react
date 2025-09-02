import * as nconf from 'nconf';
import * as fs from 'fs';
import * as path from 'path';
import { DtuiConfig, DEFAULT_CONFIG } from './types';

/**
 * Configuration Service using nconf
 * 
 * Priority order (highest to lowest):
 * 1. Command-line arguments
 * 2. Environment variables (DTUI_CFG__* prefix with __ separator)
 * 3. Config file (DTUI_USER_CONFIGFILE env var or built-in dtui.json)
 * 4. Default values
 */
export class ConfigService {
  private static instance: ConfigService;
  private initialized: boolean = false;
  private configFilePath: string;
  
  private constructor() {
    this.configFilePath = this.getConfigFilePath();
    this.initialize();
  }
  
  static getInstance(): ConfigService {
    if (!ConfigService.instance) {
      ConfigService.instance = new ConfigService();
    }
    return ConfigService.instance;
  }
  
  private getConfigFilePath(): string {
    // Check for config file path in env var - correct variable name
    const envPath = process.env.DTUI_USER_CONFIGFILE;
    if (envPath && fs.existsSync(envPath)) {
      console.log(`Using config file from DTUI_USER_CONFIGFILE: ${envPath}`);
      return envPath;
    }
    
    // Check for dtui.json in current directory
    const localPath = path.join(process.cwd(), 'dtui.json');
    if (fs.existsSync(localPath)) {
      console.log(`Using config file: ${localPath}`);
      return localPath;
    }
    
    // Check for built-in dtui.json in the app directory
    const appPath = path.join(__dirname, '../../dtui.json');
    if (fs.existsSync(appPath)) {
      console.log(`Using built-in config file: ${appPath}`);
      return appPath;
    }
    
    // For AppImage - check if bundled config exists
    if (process.env.APPIMAGE) {
      const bundledPath = path.join(path.dirname(process.execPath), 'dtui.json');
      if (fs.existsSync(bundledPath)) {
        console.log(`Using bundled AppImage config: ${bundledPath}`);
        return bundledPath;
      }
    }
    
    console.log('No config file found, using defaults only');
    return '';
  }
  
  private initialize(): void {
    if (this.initialized) return;
    
    // 1. Command-line arguments (highest priority)
    nconf.argv({
      parseValues: true
    });
    
    // 2. Environment variables with DTUI_CFG__ prefix
    nconf.env({
      separator: '__',
      match: /^DTUI_CFG__/,  // Only match DTUI_CFG__ prefixed vars
      lowerCase: false,
      parseValues: true,
      transform: (obj: any) => {
        // Remove DTUI_CFG__ prefix and convert to lowercase nested path
        obj.key = obj.key.replace('DTUI_CFG__', '').toLowerCase();
        
        // Parse JSON strings for complex values
        if (typeof obj.value === 'string') {
          try {
            // Try to parse as JSON if it looks like JSON
            if (obj.value.startsWith('{') || obj.value.startsWith('[')) {
              obj.value = JSON.parse(obj.value);
            }
          } catch (e) {
            // Keep as string if not valid JSON
          }
        }
        
        return obj;
      }
    });
    
    // 3. Config file
    if (this.configFilePath && fs.existsSync(this.configFilePath)) {
      try {
        nconf.file('user', this.configFilePath);
      } catch (error) {
        console.error(`Error loading config file ${this.configFilePath}:`, error);
      }
    }
    
    // 4. Default values (lowest priority)
    nconf.defaults(DEFAULT_CONFIG);
    
    this.initialized = true;
  }
  
  get<T>(key: string): T | undefined {
    return nconf.get(key);
  }
  
  getAll(): DtuiConfig {
    return nconf.get() as DtuiConfig;
  }
  
  set(key: string, value: any): void {
    nconf.set(key, value);
  }
  
  save(callback?: (err?: Error) => void): void {
    if (!this.configFilePath) {
      // Create dtui.json in current directory if no config exists
      this.configFilePath = path.join(process.cwd(), 'dtui.json');
    }
    
    nconf.save(this.configFilePath, callback);
  }
  
  reload(): void {
    nconf.reset();
    this.initialized = false;
    this.configFilePath = this.getConfigFilePath();
    this.initialize();
  }
  
  // Helper methods for common config access
  getAIProvider(): string {
    return this.get<string>('ai:provider') || 'mock';
  }
  
  getShellCommand(): string {
    return this.get<string>('ai:shell:command') || 'echo';
  }
  
  getShellArgs(): string[] {
    return this.get<string[]>('ai:shell:args') || [];
  }
  
  getShellTemplate(): string {
    return this.get<string>('ai:shell:template') || '{command} {args} "{prompt}"';
  }
  
  getShellTimeout(): number {
    return this.get<number>('ai:shell:timeout') || 30000;
  }
  
  // Watch config file for changes
  watchConfigFile(callback: () => void): void {
    if (!this.configFilePath || !fs.existsSync(this.configFilePath)) return;
    
    fs.watchFile(this.configFilePath, () => {
      console.log('Config file changed, reloading...');
      this.reload();
      callback();
    });
  }
  
  unwatchConfigFile(): void {
    if (!this.configFilePath) return;
    fs.unwatchFile(this.configFilePath);
  }
}

// Export singleton instance
export const configService = ConfigService.getInstance();