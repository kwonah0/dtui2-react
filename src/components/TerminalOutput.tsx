import { useState, useEffect, useRef } from 'react';
import styled from '@emotion/styled';

// ANSI color codes for terminal styling
const ANSI_COLORS = {
  reset: '#ffffff',
  black: '#2e3436',
  red: '#cc0000',
  green: '#4e9a06',
  yellow: '#c4a000',
  blue: '#3465a4',
  magenta: '#75507b',
  cyan: '#06989a',
  white: '#d3d7cf',
  bright_black: '#555753',
  bright_red: '#ef2929',
  bright_green: '#8ae234',
  bright_yellow: '#fce94f',
  bright_blue: '#729fcf',
  bright_magenta: '#ad7fa8',
  bright_cyan: '#34e2e2',
  bright_white: '#eeeeec',
};

const TerminalContainer = styled.div`
  background: #1e1e1e;
  border: 1px solid #333;
  border-radius: 4px;
  margin: 8px 0;
  max-height: 300px;
  overflow-y: auto;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 13px;
`;

const TerminalHeader = styled.div`
  background: #333;
  padding: 8px 12px;
  font-weight: bold;
  color: #fff;
  border-bottom: 1px solid #444;
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const TerminalContent = styled.div`
  padding: 12px;
  color: #fff;
  white-space: pre-wrap;
  word-break: break-all;
`;

const OutputLine = styled.div<{ type: 'stdout' | 'stderr' }>`
  color: ${props => props.type === 'stderr' ? '#ff6b6b' : '#fff'};
  margin: 2px 0;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  line-height: 1.2;
  
  .ansi-color {
    display: inline;
  }
  
  .command-prompt {
    color: #8ae234;
    font-weight: bold;
  }
  
  .directory-path {
    color: #729fcf;
  }
  
  .file-executable {
    color: #8ae234;
    font-weight: bold;
  }
  
  .file-directory {
    color: #729fcf;
    font-weight: bold;
  }
  
  .file-regular {
    color: #d3d7cf;
  }
`;

const ClearButton = styled.button`
  background: #444;
  border: 1px solid #666;
  color: #fff;
  padding: 4px 8px;
  border-radius: 3px;
  cursor: pointer;
  font-size: 11px;

  &:hover {
    background: #555;
  }
`;

interface TerminalOutputProps {
  visible: boolean;
  onClose: () => void;
}

interface ShellOutput {
  type: 'stdout' | 'stderr' | 'close';
  data?: string;
  code?: number;
}

// Function to parse ANSI escape sequences and apply colors
const parseAnsiColors = (text: string): React.ReactElement => {
  // Simple ANSI color regex (basic implementation)
  const ansiRegex = /\u001b\[(\d+)m/g;
  const parts = text.split(ansiRegex);
  
  const elements: React.ReactElement[] = [];
  let currentStyle = {};
  
  for (let i = 0; i < parts.length; i++) {
    if (i % 2 === 0) {
      // Text content
      if (parts[i]) {
        elements.push(
          <span key={i} style={currentStyle}>
            {parts[i]}
          </span>
        );
      }
    } else {
      // ANSI color code
      const code = parseInt(parts[i]);
      switch (code) {
        case 0: currentStyle = {}; break; // reset
        case 1: currentStyle = { ...currentStyle, fontWeight: 'bold' }; break; // bold
        case 31: currentStyle = { ...currentStyle, color: ANSI_COLORS.red }; break; // red
        case 32: currentStyle = { ...currentStyle, color: ANSI_COLORS.green }; break; // green
        case 33: currentStyle = { ...currentStyle, color: ANSI_COLORS.yellow }; break; // yellow
        case 34: currentStyle = { ...currentStyle, color: ANSI_COLORS.blue }; break; // blue
        case 35: currentStyle = { ...currentStyle, color: ANSI_COLORS.magenta }; break; // magenta
        case 36: currentStyle = { ...currentStyle, color: ANSI_COLORS.cyan }; break; // cyan
        case 37: currentStyle = { ...currentStyle, color: ANSI_COLORS.white }; break; // white
        case 91: currentStyle = { ...currentStyle, color: ANSI_COLORS.bright_red }; break; // bright red
        case 92: currentStyle = { ...currentStyle, color: ANSI_COLORS.bright_green }; break; // bright green
        case 93: currentStyle = { ...currentStyle, color: ANSI_COLORS.bright_yellow }; break; // bright yellow
        case 94: currentStyle = { ...currentStyle, color: ANSI_COLORS.bright_blue }; break; // bright blue
        case 95: currentStyle = { ...currentStyle, color: ANSI_COLORS.bright_magenta }; break; // bright magenta
        case 96: currentStyle = { ...currentStyle, color: ANSI_COLORS.bright_cyan }; break; // bright cyan
      }
    }
  }
  
  return <span>{elements}</span>;
};

// Function to add TTY-style formatting to common command outputs
const formatTTYOutput = (text: string): React.ReactElement => {
  // Handle ls output with colors
  if (text.includes('.') || text.includes('/')) {
    const lines = text.split('\n').map((line, lineIndex) => {
      const words = line.split(/\s+/).map((word, wordIndex) => {
        if (word.endsWith('/')) {
          // Directory
          return <span key={wordIndex} className="file-directory">{word}</span>;
        } else if (word.includes('.') && !word.startsWith('.')) {
          // Regular file
          return <span key={wordIndex} className="file-regular">{word}</span>;
        } else if (word.startsWith('./') || word.startsWith('../')) {
          // Path
          return <span key={wordIndex} className="directory-path">{word}</span>;
        } else if (line.includes('$') || line.includes('#')) {
          // Command prompt
          return <span key={wordIndex} className="command-prompt">{word}</span>;
        }
        return <span key={wordIndex}>{word}</span>;
      });
      
      return (
        <div key={lineIndex}>
          {words.map((word, index) => (
            <span key={index}>
              {word}
              {index < words.length - 1 ? ' ' : ''}
            </span>
          ))}
        </div>
      );
    });
    
    return <div>{lines}</div>;
  }
  
  // Default: parse ANSI colors
  return parseAnsiColors(text);
};

export default function TerminalOutput({ visible, onClose }: TerminalOutputProps) {
  const [outputs, setOutputs] = useState<ShellOutput[]>([]);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!window.electronAPI) return;

    const handleShellOutput = (output: ShellOutput) => {
      setOutputs(prev => [...prev, output]);
      
      // Auto-scroll to bottom
      setTimeout(() => {
        if (contentRef.current) {
          contentRef.current.scrollTop = contentRef.current.scrollHeight;
        }
      }, 10);
    };

    window.electronAPI.onShellOutput(handleShellOutput);

    return () => {
      window.electronAPI.removeShellOutputListener();
    };
  }, []);

  const clearOutput = () => {
    setOutputs([]);
  };

  if (!visible) return null;

  return (
    <TerminalContainer>
      <TerminalHeader>
        <span>Terminal Output</span>
        <div>
          <ClearButton onClick={clearOutput}>Clear</ClearButton>
          <ClearButton onClick={onClose} style={{ marginLeft: 8 }}>Hide</ClearButton>
        </div>
      </TerminalHeader>
      <TerminalContent ref={contentRef}>
        {outputs.length === 0 ? (
          <div style={{ color: '#888', fontStyle: 'italic' }}>
            Terminal output will appear here...
          </div>
        ) : (
          outputs.map((output, index) => (
            <div key={index}>
              {output.type === 'close' ? (
                <OutputLine type="stdout" style={{ color: '#888', fontStyle: 'italic' }}>
                  Process exited with code {output.code}
                </OutputLine>
              ) : (
                <OutputLine type={output.type}>
                  {formatTTYOutput(output.data || '')}
                </OutputLine>
              )}
            </div>
          ))
        )}
      </TerminalContent>
    </TerminalContainer>
  );
}