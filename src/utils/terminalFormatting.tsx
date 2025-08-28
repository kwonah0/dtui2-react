import React from 'react';

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

interface TextStyle {
  color?: string;
  fontWeight?: string;
  backgroundColor?: string;
}

// Convert ANSI escape sequences to React components
export const parseAnsiToReact = (text: string): React.ReactElement => {
  const ansiRegex = /\u001b\[(\d+(;\d+)*)m/g;
  const parts = text.split(ansiRegex);
  
  const elements: React.ReactElement[] = [];
  let currentStyle: TextStyle = {};
  
  for (let i = 0; i < parts.length; i++) {
    if (i % 3 === 0) {
      // Text content
      if (parts[i]) {
        elements.push(
          <span key={i} style={currentStyle}>
            {parts[i]}
          </span>
        );
      }
    } else if (i % 3 === 1) {
      // ANSI color codes (can be multiple, separated by ;)
      const codes = parts[i].split(';').map(c => parseInt(c));
      
      codes.forEach(code => {
        switch (code) {
          case 0: currentStyle = {}; break; // reset
          case 1: currentStyle.fontWeight = 'bold'; break; // bold
          case 22: delete currentStyle.fontWeight; break; // normal weight
          case 30: currentStyle.color = ANSI_COLORS.black; break;
          case 31: currentStyle.color = ANSI_COLORS.red; break;
          case 32: currentStyle.color = ANSI_COLORS.green; break;
          case 33: currentStyle.color = ANSI_COLORS.yellow; break;
          case 34: currentStyle.color = ANSI_COLORS.blue; break;
          case 35: currentStyle.color = ANSI_COLORS.magenta; break;
          case 36: currentStyle.color = ANSI_COLORS.cyan; break;
          case 37: currentStyle.color = ANSI_COLORS.white; break;
          case 39: delete currentStyle.color; break; // default color
          case 90: currentStyle.color = ANSI_COLORS.bright_black; break;
          case 91: currentStyle.color = ANSI_COLORS.bright_red; break;
          case 92: currentStyle.color = ANSI_COLORS.bright_green; break;
          case 93: currentStyle.color = ANSI_COLORS.bright_yellow; break;
          case 94: currentStyle.color = ANSI_COLORS.bright_blue; break;
          case 95: currentStyle.color = ANSI_COLORS.bright_magenta; break;
          case 96: currentStyle.color = ANSI_COLORS.bright_cyan; break;
          case 97: currentStyle.color = ANSI_COLORS.bright_white; break;
          // Background colors
          case 40: currentStyle.backgroundColor = ANSI_COLORS.black; break;
          case 41: currentStyle.backgroundColor = ANSI_COLORS.red; break;
          case 42: currentStyle.backgroundColor = ANSI_COLORS.green; break;
          case 43: currentStyle.backgroundColor = ANSI_COLORS.yellow; break;
          case 44: currentStyle.backgroundColor = ANSI_COLORS.blue; break;
          case 45: currentStyle.backgroundColor = ANSI_COLORS.magenta; break;
          case 46: currentStyle.backgroundColor = ANSI_COLORS.cyan; break;
          case 47: currentStyle.backgroundColor = ANSI_COLORS.white; break;
          case 49: delete currentStyle.backgroundColor; break; // default background
        }
      });
    }
    // Skip i % 3 === 2 (captured groups from semicolon matches)
  }
  
  return <>{elements}</>;
};

// Terminal output component for chat messages
export const TerminalOutput: React.FC<{ command: string; output: string }> = ({ command, output }) => {
  return (
    <div>
      <div style={{ marginBottom: '8px' }}>
        <strong>Command:</strong> <code>{command}</code>
      </div>
      <div
        style={{
          background: '#1e1e1e',
          border: '1px solid #333',
          borderRadius: '4px',
          padding: '12px',
          fontFamily: '"Monaco", "Menlo", "Ubuntu Mono", monospace',
          fontSize: '13px',
          color: '#fff',
          whiteSpace: 'pre-wrap',
          margin: '8px 0',
          overflowX: 'auto'
        }}
      >
        {parseAnsiToReact(output)}
      </div>
    </div>
  );
};