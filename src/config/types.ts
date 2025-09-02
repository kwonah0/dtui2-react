/**
 * DTUI2 Configuration Types
 * 
 * Configuration can be set via (in order of priority):
 * 1. CLI arguments
 * 2. Environment variables (DTUI_CFG__* with __ for nesting)
 * 3. Config file (DTUI_CONFIG_FILE or dtui.json)
 * 4. Default values
 */

export interface DtuiConfig {
  ai: AIConfig;
  terminal?: TerminalConfig;
  ui?: UIConfig;
}

export interface AIConfig {
  provider: 'shell' | 'api' | 'mock';
  shell?: ShellAIConfig;
  api?: APIAIConfig;
  mock?: MockAIConfig;
}

export interface ShellAIConfig {
  command: string;           // e.g., "llm", "ollama", "claude"
  args?: string[];           // e.g., ["--model", "gpt-4"]
  template?: string;         // e.g., "{command} {args} \"{prompt}\""
  timeout?: number;          // milliseconds, default 30000
  env?: Record<string, string>; // additional environment variables
  workingDirectory?: string; // cwd for command execution
  streaming?: boolean;       // whether to stream output
  outputFormat?: {           // output formatting options
    useCodeBlock?: boolean;
    codeBlockSyntax?: string;
  };
  usePty?: boolean;          // use pseudo-terminal for proper formatting
}

export interface APIAIConfig {
  provider: 'openai' | 'anthropic' | 'custom';
  apiKey?: string;
  model?: string;
  endpoint?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface MockAIConfig {
  responses?: Record<string, string>;
  delay?: number;
}

export interface TerminalConfig {
  shell?: string;            // e.g., "/bin/bash", "cmd.exe"
  columns?: number;          // terminal width
  lines?: number;            // terminal height
  env?: Record<string, string>; // terminal environment variables
}

export interface UIConfig {
  theme?: 'light' | 'dark';
  fontSize?: number;
  fontFamily?: string;
  shortcuts?: Record<string, string>;
}

// Default configuration
export const DEFAULT_CONFIG: DtuiConfig = {
  ai: {
    provider: 'mock',
    shell: {
      command: 'echo',
      args: ['No AI command configured. Please set up dtui.json or use environment variables.'],
      template: '{command} {args} "{prompt}"',
      timeout: 30000,
      streaming: false
    },
    mock: {
      delay: 500
    }
  },
  terminal: {
    shell: typeof process !== 'undefined' && process.platform === 'win32' ? 'cmd.exe' : '/bin/bash',
    columns: 80,
    lines: 24
  },
  ui: {
    theme: 'dark',
    fontSize: 14
  }
};