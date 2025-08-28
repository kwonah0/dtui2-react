/**
 * FakeShellAIAgent - Shell-like AI Agent for Browser Environment
 * Simulates shell command execution and AI responses without Node.js dependencies
 */

import { AIAgent, AIAgentResult } from './MockAIAgent';

export class FakeShellAIAgent implements AIAgent {
  name = 'Fake Shell AI Agent';
  private commandPrefix = '[AI Shell Response]';
  
  async executeCommand(command: string): Promise<AIAgentResult> {
    // Simulate shell command execution
    return {
      success: true,
      content: `${this.commandPrefix} Executed: ${command}\n\n` + this.simulateCommandOutput(command),
      metadata: {
        command,
        executedAt: new Date().toISOString()
      }
    };
  }

  async analyzeCode(filePath: string): Promise<AIAgentResult> {
    return {
      success: true,
      content: `${this.commandPrefix} Code Analysis for ${filePath}:\n\n` +
               `📁 File: ${filePath}\n` +
               `📊 Analysis:\n` +
               `  - Structure: Well organized\n` +
               `  - Complexity: Moderate\n` +
               `  - Suggestions: Consider adding more comments\n` +
               `  - Best Practices: Follow React conventions\n\n` +
               `💡 Tip: Use TypeScript for better type safety`,
      suggestions: [
        'Add JSDoc comments',
        'Consider splitting large components',
        'Add unit tests'
      ]
    };
  }

  async analyzeProject(projectPath?: string): Promise<AIAgentResult> {
    const path = projectPath || 'current directory';
    return {
      success: true,
      content: `${this.commandPrefix} Project Analysis for ${path}:\n\n` +
               `📂 Project Structure:\n` +
               `  ├── src/          (Source code)\n` +
               `  ├── electron/     (Electron main process)\n` +
               `  ├── dist/         (Build output)\n` +
               `  ├── node_modules/ (Dependencies)\n` +
               `  └── package.json  (Project config)\n\n` +
               `📈 Statistics:\n` +
               `  - Files: 42\n` +
               `  - Lines of Code: ~3,500\n` +
               `  - Dependencies: 15\n` +
               `  - Dev Dependencies: 12`,
      metadata: {
        projectPath: path,
        analyzedAt: new Date().toISOString()
      }
    };
  }

  async suggestFix(error: string): Promise<AIAgentResult> {
    const suggestions = this.generateErrorSuggestions(error);
    
    return {
      success: true,
      content: `${this.commandPrefix} Error Analysis:\n\n` +
               `🔍 Error: ${error}\n\n` +
               `🛠️ Suggested Fixes:\n` +
               suggestions.map((s, i) => `  ${i + 1}. ${s}`).join('\n') +
               `\n\n💡 Additional Tips:\n` +
               `  - Check the browser console for more details\n` +
               `  - Verify all imports are correct\n` +
               `  - Ensure dependencies are installed`,
      suggestions
    };
  }

  async generateCode(prompt: string, language?: string): Promise<AIAgentResult> {
    const lang = language || 'typescript';
    const code = this.generateSampleCode(prompt, lang);
    
    return {
      success: true,
      content: `${this.commandPrefix} Generated ${lang} code:\n\n\`\`\`${lang}\n${code}\n\`\`\`\n\n` +
               `📝 Notes:\n` +
               `  - This is a template based on: "${prompt}"\n` +
               `  - Customize as needed for your use case\n` +
               `  - Remember to handle errors appropriately`,
      metadata: {
        prompt,
        language: lang,
        generatedAt: new Date().toISOString()
      }
    };
  }

  async generateResponse(messages: any[]): Promise<string> {
    const lastMessage = messages[messages.length - 1];
    const userInput = lastMessage?.content || '';
    
    // Handle special commands
    if (userInput.startsWith('!')) {
      const command = userInput.slice(1);
      const result = await this.executeCommand(command);
      return result.content;
    }
    
    // Handle help
    if (userInput.toLowerCase().includes('help')) {
      return this.getHelpMessage();
    }
    
    // Handle code-related queries
    if (userInput.toLowerCase().includes('code') || userInput.toLowerCase().includes('analyze')) {
      if (userInput.includes('analyze code')) {
        const match = userInput.match(/analyze code\s+(.+)/i);
        const filePath = match ? match[1] : 'example.ts';
        const result = await this.analyzeCode(filePath);
        return result.content;
      }
      
      if (userInput.includes('generate code')) {
        const match = userInput.match(/generate code\s+(.+)/i);
        const prompt = match ? match[1] : 'React component';
        const result = await this.generateCode(prompt);
        return result.content;
      }
    }
    
    // Handle error/fix queries
    if (userInput.toLowerCase().includes('error') || userInput.toLowerCase().includes('fix')) {
      const result = await this.suggestFix(userInput);
      return result.content;
    }
    
    // Default AI response
    return `${this.commandPrefix} Processing: "${userInput}"\n\n` +
           `I understand you're asking about: ${this.extractTopic(userInput)}\n\n` +
           `Here's my response:\n` +
           `${this.generateContextualResponse(userInput)}\n\n` +
           `💡 Type 'help' for available commands or prefix with '!' for shell commands.`;
  }

  private simulateCommandOutput(command: string): string {
    const cmd = command.toLowerCase().trim();
    
    if (cmd === 'ls' || cmd.startsWith('ls ')) {
      return 'src/  electron/  node_modules/  dist/\n' +
             'package.json  tsconfig.json  vite.config.ts  README.md';
    }
    
    if (cmd === 'pwd') {
      return '/mnt/c/Users/user/github/dtui2-react';
    }
    
    if (cmd.startsWith('echo ')) {
      return command.slice(5);
    }
    
    if (cmd === 'git status') {
      return 'On branch main\n' +
             'Your branch is up to date with \'origin/main\'.\n\n' +
             'Changes not staged for commit:\n' +
             '  modified:   src/services/AIProvider.ts\n' +
             '  modified:   src/services/FakeShellAIAgent.ts\n\n' +
             'no changes added to commit';
    }
    
    if (cmd.startsWith('npm ')) {
      return `> dtui2-react@1.0.0 ${cmd.slice(4)}\n> Command executed successfully`;
    }
    
    return `Command '${command}' executed successfully\n[Simulated output]`;
  }

  private generateErrorSuggestions(error: string): string[] {
    const lowerError = error.toLowerCase();
    
    if (lowerError.includes('initializeapiclients') || lowerError.includes('is not a function')) {
      return [
        'Check if the function is properly defined in the class',
        'Verify the function name spelling is correct',
        'Ensure the function is not accidentally removed',
        'Clear browser cache and reload (Ctrl+Shift+R)',
        'Rebuild the application with npm run build'
      ];
    }
    
    if (lowerError.includes('module') || lowerError.includes('import')) {
      return [
        'Verify the module is installed: npm install',
        'Check the import path is correct',
        'Ensure the module exports what you\'re importing',
        'Try deleting node_modules and reinstalling'
      ];
    }
    
    if (lowerError.includes('undefined') || lowerError.includes('null')) {
      return [
        'Add null/undefined checks before accessing properties',
        'Initialize variables with default values',
        'Use optional chaining (?.) for safe property access',
        'Check if async operations have completed'
      ];
    }
    
    return [
      'Check the browser console for detailed error stack',
      'Review recent code changes',
      'Verify all dependencies are properly installed',
      'Try restarting the development server'
    ];
  }

  private generateSampleCode(prompt: string, language: string): string {
    const lowerPrompt = prompt.toLowerCase();
    
    if (lowerPrompt.includes('component') && language === 'typescript') {
      return `import React from 'react';

interface ComponentProps {
  title: string;
  onAction?: () => void;
}

export const GeneratedComponent: React.FC<ComponentProps> = ({ title, onAction }) => {
  return (
    <div className="generated-component">
      <h2>{title}</h2>
      <button onClick={onAction}>Click me</button>
    </div>
  );
};

export default GeneratedComponent;`;
    }
    
    if (lowerPrompt.includes('function')) {
      return `export function generatedFunction(input: string): string {
  // Process the input
  const processed = input.trim().toLowerCase();
  
  // Add your logic here
  console.log('Processing:', processed);
  
  // Return result
  return \`Processed: \${processed}\`;
}`;
    }
    
    if (lowerPrompt.includes('class')) {
      return `export class GeneratedClass {
  private data: any[];
  
  constructor() {
    this.data = [];
  }
  
  add(item: any): void {
    this.data.push(item);
  }
  
  getAll(): any[] {
    return [...this.data];
  }
}`;
    }
    
    return `// Generated code for: ${prompt}\n` +
           `export const generated = () => {\n` +
           `  // TODO: Implement your logic here\n` +
           `  console.log('Generated code executed');\n` +
           `  return true;\n` +
           `};`;
  }

  private extractTopic(input: string): string {
    const topics = ['React', 'TypeScript', 'JavaScript', 'Node.js', 'Electron', 'API', 'component', 'function', 'error', 'build'];
    
    for (const topic of topics) {
      if (input.toLowerCase().includes(topic.toLowerCase())) {
        return topic;
      }
    }
    
    return 'your query';
  }

  private generateContextualResponse(_input: string): string {
    const responses = [
      'Based on the context, I recommend checking the documentation for more details.',
      'This is a common scenario. The solution typically involves verifying your configuration.',
      'I suggest starting with the basic implementation and iterating from there.',
      'Consider breaking down the problem into smaller, manageable parts.',
      'The key is to ensure all dependencies and configurations are properly set up.'
    ];
    
    return responses[Math.floor(Math.random() * responses.length)];
  }

  private getHelpMessage(): string {
    return `${this.commandPrefix} Available Commands:

🖥️ **Shell Commands** (prefix with !):
  !ls              - List files and directories
  !pwd             - Show current directory
  !echo <text>     - Echo text back
  !git status      - Show git status
  !npm <command>   - Run npm commands

📝 **AI Commands**:
  analyze code <file>     - Analyze a code file
  analyze project         - Analyze project structure
  suggest fix <error>     - Get error fix suggestions
  generate code <prompt>  - Generate code from prompt
  help                    - Show this help message

💡 **Examples**:
  !ls
  analyze code src/App.tsx
  suggest fix TypeError: Cannot read property
  generate code React hook for API calls

🚀 **Tips**:
  - This is a simulated shell environment
  - All commands return mock data for testing
  - Use for development and testing purposes`;
  }
}

// Export a singleton instance
export const fakeShellAgent = new FakeShellAIAgent();