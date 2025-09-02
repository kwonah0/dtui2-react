import { useState, useRef, useEffect } from 'react';
import styled from '@emotion/styled';

const InputContainer = styled.div`
  display: flex;
  flex-direction: column;
  background: var(--bg-secondary);
  border-top: 1px solid var(--border-primary);
  min-height: 80px;
`;

const InputWrapper = styled.div`
  display: flex;
  align-items: end;
  gap: 8px;
  padding: 12px 16px;
  flex: 1;
`;

const TextArea = styled.textarea`
  flex: 1;
  min-height: 40px;
  max-height: 200px;
  padding: 8px 12px;
  background: var(--bg-primary);
  border: 1px solid var(--border-primary);
  border-radius: 6px;
  color: var(--text-primary);
  font-family: var(--font-sans);
  font-size: 14px;
  line-height: 1.5;
  resize: none;
  outline: none;
  
  &:focus {
    border-color: var(--text-accent);
    box-shadow: 0 0 0 1px var(--text-accent);
  }
  
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
  
  &::placeholder {
    color: var(--text-muted);
  }
`;

const SendButton = styled.button`
  padding: 8px 16px;
  background: var(--text-accent);
  border: none;
  border-radius: 6px;
  color: var(--bg-primary);
  font-weight: 600;
  cursor: pointer;
  font-size: 14px;
  min-width: 70px;
  height: 40px;
  
  &:hover:not(:disabled) {
    background: rgba(88, 166, 255, 0.8);
  }
  
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const HintBar = styled.div<{ isShellMode?: boolean }>`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 4px 16px;
  background: ${props => props.isShellMode ? 'rgba(138, 226, 52, 0.1)' : 'var(--bg-tertiary)'};
  border-top: 1px solid ${props => props.isShellMode ? 'rgba(138, 226, 52, 0.3)' : 'var(--border-secondary)'};
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--text-muted);
  transition: all 0.2s ease;
`;

const ShellModeIndicator = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  color: #8ae234;
  font-weight: bold;
  
  .shell-icon {
    font-size: 12px;
  }
`;

const CommandPreview = styled.div`
  background: rgba(0, 0, 0, 0.3);
  padding: 2px 6px;
  border-radius: 3px;
  font-family: var(--font-mono);
  font-size: 10px;
  color: #8ae234;
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const ShortcutHints = styled.div`
  display: flex;
  gap: 16px;
`;

const CharCount = styled.div`
  color: var(--text-muted);
`;

interface InputAreaProps {
  onSendMessage: (message: string) => void;
  disabled: boolean;
}

function InputArea({ onSendMessage, disabled }: InputAreaProps) {
  const [message, setMessage] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  // Detect different command modes
  const isShellMode = message.startsWith('!');
  const isFileReadMode = message.toLowerCase().startsWith('read file ');
  const isAnalyzeMode = message.toLowerCase().startsWith('analyze ');
  const isGenerateMode = message.toLowerCase().startsWith('generate ');
  
  // Command type detection (for future use)
  // const getCommandType = () => {
  //   if (isShellMode) return 'shell';
  //   if (isFileReadMode) return 'file';
  //   if (isAnalyzeMode) return 'analyze';
  //   if (isGenerateMode) return 'generate';
  //   return 'chat';
  // };
  
  const getCommandPreview = () => {
    if (isShellMode) {
      return message.slice(1) || 'command';
    }
    if (isFileReadMode) {
      const path = message.slice('read file '.length);
      return path || 'path/to/file';
    }
    if (isAnalyzeMode) {
      return message.slice('analyze '.length) || 'target';
    }
    if (isGenerateMode) {
      return message.slice('generate '.length) || 'prompt';
    }
    return '';
  };

  const handleSubmit = () => {
    const trimmedMessage = message.trim();
    if (trimmedMessage && !disabled) {
      onSendMessage(trimmedMessage);
      setMessage('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const adjustTextareaHeight = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
    }
  };

  useEffect(() => {
    adjustTextareaHeight();
  }, [message]);

  // Focus input on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        textareaRef.current?.focus();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, []);

  // Auto-focus input after message is sent (when disabled becomes false)
  useEffect(() => {
    if (!disabled && textareaRef.current) {
      // Small delay to ensure DOM is ready
      const timer = setTimeout(() => {
        textareaRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [disabled]);

  return (
    <InputContainer>
      <InputWrapper>
        <TextArea
          ref={textareaRef}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type your message... (Enter to send, Shift+Enter for new line)"
          disabled={disabled}
          rows={1}
          data-testid="message-input"
        />
        <SendButton
          onClick={handleSubmit}
          disabled={disabled || !message.trim()}
          data-testid="send-button"
        >
          Send
        </SendButton>
      </InputWrapper>
      <HintBar isShellMode={isShellMode || isFileReadMode || isAnalyzeMode || isGenerateMode}>
        <ShortcutHints>
          {isShellMode && (
            <ShellModeIndicator>
              <span className="shell-icon">$</span>
              <span>SHELL MODE</span>
              <CommandPreview>{getCommandPreview()}</CommandPreview>
            </ShellModeIndicator>
          )}
          {isFileReadMode && (
            <ShellModeIndicator>
              <span className="shell-icon">📁</span>
              <span>FILE READ</span>
              <CommandPreview>{getCommandPreview()}</CommandPreview>
            </ShellModeIndicator>
          )}
          {isAnalyzeMode && (
            <ShellModeIndicator>
              <span className="shell-icon">🔍</span>
              <span>AI ANALYZE</span>
              <CommandPreview>{getCommandPreview()}</CommandPreview>
            </ShellModeIndicator>
          )}
          {isGenerateMode && (
            <ShellModeIndicator>
              <span className="shell-icon">⚡</span>
              <span>AI GENERATE</span>
              <CommandPreview>{getCommandPreview()}</CommandPreview>
            </ShellModeIndicator>
          )}
          {!isShellMode && !isFileReadMode && !isAnalyzeMode && !isGenerateMode && (
            <>
              <span>Enter: Send</span>
              <span>Shift+Enter: New Line</span>
              <span>Escape: Focus Input</span>
              <span>!command: Shell</span>
              <span>"analyze code": AI Analysis</span>
            </>
          )}
        </ShortcutHints>
        <CharCount>{message.length}/4000</CharCount>
      </HintBar>
    </InputContainer>
  );
}

export default InputArea;