# DTUI2 Test Scenarios

## 1. Basic Chat Functionality
- [x] Type a message and press Enter
- [x] Verify message appears in chat
- [x] Verify AI response appears
- [x] Test message timestamps display correctly

## 2. Shell Commands (prefix with !)
- [x] Test `!ls` - list files
- [x] Test `!pwd` - show current directory  
- [x] Test `!echo hello` - echo command
- [x] Test `!git status` - git command

## 3. File Operations
- [x] Test `read file package.json` - read file contents
- [x] Test `list files` or `ls .` - list directory
- [x] Test `cd src` - change directory
- [x] Test `pwd` - print working directory

## 4. AI Agent Commands
- [x] Test `analyze code src/App.tsx` - code analysis
- [x] Test `analyze project` - project structure analysis
- [x] Test `suggest fix TypeError` - error suggestions
- [x] Test `generate code React component` - code generation
- [x] Test `help` - show available commands

## 5. Terminal Output
- [x] Verify terminal output has proper formatting
- [x] Check ANSI color codes are rendered
- [x] Test command echo in terminal output
- [x] Verify TTY-style column layout for ls

## 6. UI Functionality
- [x] Test auto-focus on input after message send
- [x] Test scroll to bottom on new messages
- [x] Test markdown rendering in messages
- [x] Test code syntax highlighting

## 7. Error Handling
- [x] Test invalid commands
- [x] Test file not found errors
- [x] Test command timeout handling
- [x] Test API errors (when no API key)

## Test Results

### MockAIAgent Tests
✅ Basic chat responses working
✅ Help command displays command list
✅ Shell command simulation working
✅ File operation mocks working

### UI Tests
✅ Messages display correctly
✅ Markdown rendering working
✅ Code blocks with syntax highlighting
✅ Terminal output formatting

### Known Issues
- ConfigService cannot be used in browser (Node.js only)
- Shell AI Agent requires Electron main process integration
- Real shell commands only work in Electron app, not browser