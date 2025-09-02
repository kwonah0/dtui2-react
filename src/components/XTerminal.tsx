import { useEffect, useRef } from 'react';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { WebLinksAddon } from 'xterm-addon-web-links';
import 'xterm/css/xterm.css';
import styled from '@emotion/styled';

const TerminalContainer = styled.div`
  background: #000;
  padding: 8px;
  border-radius: 8px;
  border: 1px solid var(--border-primary);
  height: 400px;
  width: 100%;
  overflow: hidden;
  
  .xterm {
    height: 100%;
  }
  
  .xterm-viewport {
    border-radius: 4px;
  }
`;

interface XTerminalProps {
  onData?: (data: string) => void;
  onResize?: (cols: number, rows: number) => void;
}

export default function XTerminal({ onData, onResize }: XTerminalProps) {
  const terminalRef = useRef<HTMLDivElement>(null);
  const terminalInstance = useRef<Terminal | null>(null);
  const fitAddon = useRef<FitAddon | null>(null);
  
  useEffect(() => {
    if (!terminalRef.current) return;
    
    // Create terminal instance
    const terminal = new Terminal({
      cursorBlink: true,
      fontSize: 14,
      fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace',
      theme: {
        foreground: '#ffffff',
        background: '#1e1e1e',
        cursor: '#ffffff',
        black: '#000000',
        red: '#ff5555',
        green: '#50fa7b',
        yellow: '#f1fa8c',
        blue: '#bd93f9',
        magenta: '#ff79c6',
        cyan: '#8be9fd',
        white: '#bfbfbf',
        brightBlack: '#4d4d4d',
        brightRed: '#ff6e67',
        brightGreen: '#5af78e',
        brightYellow: '#f4f99d',
        brightBlue: '#caa9fa',
        brightMagenta: '#ff92d0',
        brightCyan: '#9aedfe',
        brightWhite: '#e6e6e6'
      }
    });
    
    // Load addons
    const fit = new FitAddon();
    const webLinks = new WebLinksAddon();
    
    terminal.loadAddon(fit);
    terminal.loadAddon(webLinks);
    
    // Open terminal in container
    terminal.open(terminalRef.current);
    
    // Fit terminal to container
    fit.fit();
    
    // Store references
    terminalInstance.current = terminal;
    fitAddon.current = fit;
    
    // Set up event handlers
    if (onData) {
      terminal.onData(onData);
    }
    
    if (onResize) {
      terminal.onResize(({ cols, rows }) => {
        onResize(cols, rows);
      });
    }
    
    // Handle window resize
    const handleResize = () => {
      if (fitAddon.current) {
        fitAddon.current.fit();
      }
    };
    
    window.addEventListener('resize', handleResize);
    
    // Listen for shell output from main process
    if (window.electronAPI) {
      const handleShellOutput = (output: any) => {
        if (output.type === 'stdout' && output.data) {
          terminal.write(output.data);
        } else if (output.type === 'stderr' && output.data) {
          terminal.write(`\x1b[31m${output.data}\x1b[0m`); // Red for errors
        } else if (output.type === 'close') {
          terminal.write(`\n\x1b[33mProcess exited with code ${output.code}\x1b[0m\n`);
        }
      };
      
      window.electronAPI.onShellOutput(handleShellOutput);
      
      // Clean up listener on unmount
      return () => {
        window.electronAPI.removeShellOutputListener();
        window.removeEventListener('resize', handleResize);
        terminal.dispose();
      };
    }
    
    return () => {
      window.removeEventListener('resize', handleResize);
      terminal.dispose();
    };
  }, [onData, onResize]);
  
  return <TerminalContainer ref={terminalRef} />;
}