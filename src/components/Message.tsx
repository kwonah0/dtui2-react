import styled from '@emotion/styled';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Message, MessageRole } from '../types';
import { TerminalOutput } from '../utils/terminalFormatting';
import AnsiToHtml from 'ansi-to-html';

const ansiConverter = new AnsiToHtml({
  fg: '#ffffff',
  bg: '#000000',
  newline: true,
  escapeXML: true,
  colors: {
    0: '#000000',
    1: '#ff5555',
    2: '#50fa7b',
    3: '#f1fa8c',
    4: '#bd93f9',
    5: '#ff79c6',
    6: '#8be9fd',
    7: '#bfbfbf',
    8: '#4d4d4d',
    9: '#ff6e67',
    10: '#5af78e',
    11: '#f4f99d',
    12: '#caa9fa',
    13: '#ff92d0',
    14: '#9aedfe',
    15: '#e6e6e6'
  }
});

const MessageContainer = styled.div<{ role: MessageRole }>`
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 12px 16px;
  border-radius: 6px;
  border: 1px solid ${props => 
    props.role === MessageRole.USER 
      ? 'var(--text-accent)' 
      : 'var(--border-primary)'
  };
  background: ${props => 
    props.role === MessageRole.USER 
      ? 'rgba(88, 166, 255, 0.1)' 
      : 'var(--bg-secondary)'
  };
  max-width: 100%;
`;

const MessageHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
`;

const MessageRoleSpan = styled.span<{ role: MessageRole }>`
  font-family: var(--font-mono);
  font-size: 11px;
  font-weight: 600;
  padding: 2px 6px;
  border-radius: 3px;
  text-transform: uppercase;
  background: ${props => 
    props.role === 'user' 
      ? 'var(--text-accent)' 
      : 'var(--text-success)'
  };
  color: var(--bg-primary);
`;

const MessageTimestamp = styled.span`
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--text-muted);
`;

const MessageContent = styled.div`
  color: var(--text-primary);
  font-size: 14px;
  line-height: 1.6;
  
  /* Markdown styling */
  h1, h2, h3, h4, h5, h6 {
    margin: 16px 0 8px 0;
    color: var(--text-primary);
    
    &:first-of-type {
      margin-top: 0;
    }
  }
  
  p {
    margin: 8px 0;
    
    &:first-of-type {
      margin-top: 0;
    }
    
    &:last-child {
      margin-bottom: 0;
    }
  }
  
  ul, ol {
    margin: 8px 0;
    padding-left: 24px;
  }
  
  li {
    margin: 4px 0;
  }
  
  blockquote {
    margin: 16px 0;
    padding: 8px 16px;
    border-left: 4px solid var(--text-accent);
    background: var(--bg-tertiary);
    color: var(--text-secondary);
  }
  
  table {
    border-collapse: collapse;
    margin: 16px 0;
    width: 100%;
  }
  
  th, td {
    border: 1px solid var(--border-primary);
    padding: 8px 12px;
    text-align: left;
  }
  
  th {
    background: var(--bg-tertiary);
    font-weight: 600;
  }
  
  a {
    color: var(--text-accent);
    text-decoration: none;
    
    &:hover {
      text-decoration: underline;
    }
  }
  
  strong {
    color: var(--text-primary);
    font-weight: 600;
  }
  
  em {
    color: var(--text-secondary);
  }
  
  /* Inline code */
  code:not(pre code) {
    background: var(--bg-tertiary);
    color: var(--text-accent);
    padding: 2px 4px;
    border-radius: 3px;
    font-family: var(--font-mono);
    font-size: 0.9em;
  }
  
  /* Code blocks */
  pre {
    margin: 16px 0;
    border-radius: 6px;
    overflow: hidden;
    
    code {
      background: none !important;
      padding: 0 !important;
    }
  }
`;

interface MessageComponentProps {
  message: Message;
}

function MessageComponent({ message }: MessageComponentProps) {
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit'
    });
  };

  return (
    <MessageContainer role={message.role} data-testid="message">
      <MessageHeader>
        <MessageRoleSpan role={message.role}>{message.role}</MessageRoleSpan>
        <MessageTimestamp>{formatTime(message.timestamp)}</MessageTimestamp>
      </MessageHeader>
      <MessageContent>
        {message.isPty ? (
          // Render PTY output with ANSI codes
          <div 
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '13px',
              lineHeight: '1.5',
              whiteSpace: 'pre-wrap',
              background: 'var(--terminal-bg)',
              padding: '12px',
              borderRadius: '6px',
              border: '1px solid var(--terminal-border)',
              overflow: 'auto'
            }}
            dangerouslySetInnerHTML={{
              __html: ansiConverter.toHtml(message.content)
            }}
          />
        ) : message.isTerminalOutput && message.terminalCommand ? (
          <TerminalOutput command={message.terminalCommand} output={message.content} />
        ) : (
          <ReactMarkdown
            remarkPlugins={[remarkGfm, remarkBreaks]}
            components={{
              code({ node, className, children, ...props }: any) {
                const match = /language-(\w+)/.exec(className || '');
                const isInline = !match;
                return !isInline ? (
                  <SyntaxHighlighter
                    style={oneDark as any}
                    language={match[1]}
                    PreTag="div"
                    customStyle={{
                      background: 'var(--terminal-bg)',
                      border: '1px solid var(--terminal-border)',
                      borderRadius: '6px',
                      fontSize: '13px',
                      fontFamily: 'var(--font-mono)',
                    } as any}
                    {...props}
                  >
                    {String(children).replace(/\n$/, '')}
                  </SyntaxHighlighter>
                ) : (
                  <code className={className} {...props}>
                    {children}
                  </code>
                );
              },
            }}
          >
            {message.content}
          </ReactMarkdown>
        )}
      </MessageContent>
    </MessageContainer>
  );
}

export default MessageComponent;