# DTUI2 React - Claude Code Style AI Terminal Desktop App

A powerful desktop application that replicates the Claude Code CLI experience using React, TypeScript, and Electron. Features real-time AI chat, file operations, shell command execution, and professional terminal styling.

## ✨ Features

### 🎯 **AI Integration**
- Support for OpenAI (GPT models) and Anthropic (Claude models)
- Real-time streaming responses
- Configurable temperature and token limits
- Multiple AI provider switching

### 🎨 **Professional UI**
- Claude Code inspired dark theme
- Full markdown support with syntax highlighting
- Code blocks with language detection
- Responsive design with proper scaling

### 📁 **File System Operations**
- Read files: `read file path/to/file.txt`
- List directories: `list files` or `ls /path/to/dir`
- File dialogs for opening and saving
- Safe file operations with error handling

### 💻 **Shell Integration**
- Execute commands: `!ls -la`, `!git status`, `!npm install`
- Persistent terminal sessions with `cd` support
- Real-time command output streaming
- Working directory management (`pwd`, `cd`)
- Cross-platform shell support

### 🤖 **AI Agent Capabilities**
- Code analysis: `analyze code src/App.tsx`
- Project structure analysis: `analyze project`
- Error fix suggestions: `suggest fix <error message>`
- Code generation: `generate code React hook for counter`
- Mock AI agent with swappable architecture

### ⌨️ **Keyboard Shortcuts**
- `Ctrl+N` - New chat
- `Ctrl+Shift+C` - Clear chat
- `Enter` - Send message
- `Shift+Enter` - New line
- `Escape` - Focus input field

### 🖥️ **Desktop Features**
- Native desktop application
- System tray integration
- Auto-updater support
- Cross-platform builds (Windows, macOS, Linux)

## 📦 Installation

### Prerequisites

- Node.js 16+ and npm
- An OpenAI API key or Anthropic API key

### Setup

1. **Clone and install dependencies:**
```bash
git clone <repository-url>
cd dtui2-react
npm install
```

2. **Configure environment:**
```bash
cp .env.example .env
# Edit .env and add your API keys
```

3. **Development mode:**
```bash
npm run electron:dev
```

4. **Build for production:**
```bash
npm run dist
```

## ⚙️ Configuration

### Environment Variables

Create a `.env` file with your configuration:

```env
# Required: At least one API key
REACT_APP_OPENAI_API_KEY=your_openai_api_key_here
REACT_APP_ANTHROPIC_API_KEY=your_anthropic_api_key_here

# Optional: Provider settings
REACT_APP_DEFAULT_PROVIDER=openai
REACT_APP_DEFAULT_MODEL=gpt-3.5-turbo
REACT_APP_TEMPERATURE=0.7
REACT_APP_MAX_TOKENS=4000
```

### Supported Models

**OpenAI:**
- `gpt-3.5-turbo` (recommended for speed)
- `gpt-4`
- `gpt-4-turbo-preview`

**Anthropic:**
- `claude-3-haiku-20240307` (fastest)
- `claude-3-sonnet-20240229` (balanced)
- `claude-3-opus-20240229` (most capable)

## 🎮 Usage Examples

### Basic Chat
```
Hello! How can I help you today?
```

### File Operations
```
read file package.json
list files
ls src/components
```

### Shell Commands
```
!pwd
!ls -la
!git status
!npm run build
```

### AI Agent Commands
```
analyze code src/App.tsx              # Analyze code structure and patterns
analyze project                       # Analyze entire project structure
suggest fix TypeError: map undefined  # Get error fix suggestions  
generate code React hook for counter  # Generate code from prompt
help                                 # Show all available commands
```

### Mixed Operations
```
read file src/App.tsx and explain the component structure
!git status                          # Check git status
cd src && !ls -la                   # Change directory and list files
```

## 📋 Available Scripts

### Development
- `npm run dev` - Start Vite development server (browser testing)
- `npm run test:browser` - Same as above (alias)
- `npm run electron:dev` - Start Electron in development mode
- `npm run build` - Build for production
- `npm run preview` - Preview production build

### Setup & Utilities
- `npm run setup:wsl` - Setup WSL development environment
- `scripts/dev-server.sh` - Clean start development server  
- `scripts/kill-port.sh 3000` - Kill processes on specific port
- `scripts/check-status.sh` - Check system and service status

### Distribution
- `npm run dist` - Build and package for current platform
- `npm run dist:win` - Build for Windows
- `npm run dist:mac` - Build for macOS
- `npm run dist:linux` - Build for Linux

## 🏗️ Project Structure

```
dtui2-react/
├── electron/              # Electron main process
│   ├── main.js            # Main process entry point
│   └── preload.js         # Preload script for IPC
├── src/
│   ├── components/        # React components
│   │   ├── Header.tsx     # App header with controls
│   │   ├── ChatArea.tsx   # Message display area
│   │   ├── Message.tsx    # Individual message component
│   │   ├── InputArea.tsx  # Message input component
│   │   └── TerminalOutput.tsx # Real-time terminal output
│   ├── services/          # Business logic
│   │   ├── AIProvider.ts  # AI integration service
│   │   ├── MockAIAgent.ts # Mock AI agent with swappable interface
│   │   └── MockElectronAPI.ts # Mock Electron API for browser testing
│   ├── types.ts           # TypeScript type definitions
│   ├── App.tsx            # Main React component
│   ├── main.tsx           # React entry point
│   └── index.css          # Global styles
├── docs/                  # Documentation
│   ├── DEVELOPMENT.md     # Development guide
│   ├── TROUBLESHOOTING.md # Troubleshooting guide
│   └── PROCESS_MANAGEMENT.md # Process management tips
├── scripts/               # Development scripts
│   ├── setup-wsl.sh      # WSL setup script
│   ├── dev-server.sh     # Clean development start
│   ├── kill-port.sh      # Port management
│   └── check-status.sh   # System status check
├── package.json           # Dependencies and scripts
├── tsconfig.json          # TypeScript configuration
├── vite.config.ts         # Vite build configuration
└── README.md             # This file
```

## 🛠️ Development

### Adding New Features

1. **New UI Components:** Add to `src/components/`
2. **Business Logic:** Add to `src/services/`
3. **Electron APIs:** Extend `electron/main.js` and `electron/preload.js`
4. **Styling:** Use emotion/styled or extend `src/index.css`

### Building Custom Themes

The app uses CSS custom properties for theming. Extend `src/index.css`:

```css
:root {
  --bg-primary: #your-color;
  --text-primary: #your-color;
  /* ... other theme variables ... */
}
```

### IPC Communication

Add new Electron IPC handlers in `electron/main.js`:

```javascript
ipcMain.handle('your-new-api', async (_, ...args) => {
  // Your implementation
  return result;
});
```

Expose in `electron/preload.js`:

```javascript
contextBridge.exposeInMainWorld('electronAPI', {
  yourNewAPI: (...args) => ipcRenderer.invoke('your-new-api', ...args),
});
```

## 🚀 Deployment

### Building Executables

The app uses electron-builder for packaging:

```bash
# Build for current platform
npm run dist

# Build for specific platforms
npm run dist:win    # Windows
npm run dist:mac    # macOS  
npm run dist:linux  # Linux
```

Executables will be created in the `release/` directory.

### Auto-Updates

To enable auto-updates, configure electron-builder with your release server:

```json
{
  "build": {
    "publish": {
      "provider": "github",
      "owner": "your-username",
      "repo": "dtui2-react"
    }
  }
}
```

## 🔧 Troubleshooting

### Quick Start for WSL Users

**Recommended approach - Browser testing:**
```bash
npm run dev  # Start Vite server
# Open http://localhost:3000 in browser
```

**If port 3000 is in use:**
```bash
scripts/kill-port.sh 3000  # Kill processes on port
scripts/dev-server.sh      # Clean start
```

### Common Issues

**"No API key configured" error:**
- Make sure you've created a `.env` file with valid API keys  
- Check that the environment variable names match exactly
- For testing, Mock AI Agent works without API keys

**Electron app won't start in WSL:**
- Use browser testing instead: `npm run test:browser`
- Install GUI libraries: `npm run setup:wsl` (requires sudo)
- Alternative: Run on Windows directly

**Port already in use:**
- Check: `scripts/check-status.sh`
- Kill: `scripts/kill-port.sh 3000`
- Or: `lsof -ti:3000 | xargs kill -9`

**Commands not working:**
- In browser: Mock API simulates all functionality
- In Electron: Real file/shell operations available
- Make sure you're testing the right environment

### For Detailed Help

📚 **Read the documentation:**
- `docs/DEVELOPMENT.md` - Complete development guide
- `docs/TROUBLESHOOTING.md` - Detailed troubleshooting
- `docs/PROCESS_MANAGEMENT.md` - Process and port management

### Performance Optimization

- Use `gpt-3.5-turbo` instead of `gpt-4` for faster responses
- Limit `MAX_TOKENS` to reduce response time  
- Consider using `claude-3-haiku` for Anthropic (fastest model)
- For development: Mock AI Agent provides instant responses

## 📄 License

MIT License - see LICENSE file for details.

## 🙏 Acknowledgments

- Inspired by the original [DTUI2](https://github.com/yourusername/dtui2) Python terminal app
- Built with [Electron](https://electronjs.org/), [React](https://reactjs.org/), and [Vite](https://vitejs.dev/)
- UI styling inspired by [Claude Code](https://claude.ai/code) interface

---

**Happy Coding!** 🎉