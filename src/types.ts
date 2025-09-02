export enum MessageRole {
  USER = 'user',
  ASSISTANT = 'assistant',
  SYSTEM = 'system',
}

export interface Message {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: Date;
  isTerminalOutput?: boolean;
  terminalCommand?: string;
  isPty?: boolean;
}

export interface ElectronAPI {
  // File operations
  readFile: (filePath: string) => Promise<{ success: boolean; content?: string; error?: string }>;
  writeFile: (filePath: string, content: string) => Promise<{ success: boolean; error?: string }>;
  listDirectory: (dirPath: string) => Promise<{ success: boolean; files?: Array<{ name: string; isDirectory: boolean; isFile: boolean }>; error?: string }>;
  
  // Shell operations
  executeCommand: (command: string, options?: { cwd?: string; env?: Record<string, string> }) => Promise<{ success: boolean; stdout?: string; stderr?: string; exitCode?: number; error?: string }>;
  executeShellCommand: (command: string) => Promise<{ success: boolean; message?: string; error?: string }>;
  executeCommandWithOutput: (command: string) => Promise<{ success: boolean; stdout: string; stderr: string; exitCode: number }>;
  changeDirectory: (dirPath: string) => Promise<{ success: boolean; cwd?: string; error?: string }>;
  getCurrentDirectory: () => Promise<{ success: boolean; cwd?: string; error?: string }>;
  
  // Real-time shell output
  onShellOutput: (callback: (data: { type: 'stdout' | 'stderr' | 'close'; data?: string; code?: number }) => void) => void;
  removeShellOutputListener: () => void;
  
  // Dialog operations
  showOpenDialog: () => Promise<{ canceled: boolean; filePaths: string[] }>;
  showSaveDialog: () => Promise<{ canceled: boolean; filePath?: string }>;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}