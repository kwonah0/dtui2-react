import { useEffect, useRef } from 'react';
import styled from '@emotion/styled';
import { Message } from '../types';
import MessageComponent from './Message';

const ChatContainer = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  background: var(--bg-primary);
`;

const LoadingIndicator = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  color: var(--text-secondary);
  font-family: var(--font-mono);
  font-size: 13px;
`;

const LoadingDots = styled.div`
  display: flex;
  gap: 4px;
  
  span {
    width: 4px;
    height: 4px;
    background: var(--text-secondary);
    border-radius: 50%;
    animation: loading 1.4s infinite ease-in-out;
    
    &:nth-child(1) { animation-delay: -0.32s; }
    &:nth-child(2) { animation-delay: -0.16s; }
  }
  
  @keyframes loading {
    0%, 80%, 100% {
      opacity: 0.3;
    }
    40% {
      opacity: 1;
    }
  }
`;

const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex: 1;
  color: var(--text-secondary);
  text-align: center;
  gap: 8px;
`;

const EmptyTitle = styled.h3`
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
`;

const EmptyDescription = styled.p`
  margin: 0;
  font-size: 14px;
  max-width: 400px;
`;

const ShortcutHint = styled.div`
  font-family: var(--font-mono);
  font-size: 12px;
  margin-top: 16px;
  padding: 8px 12px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-primary);
  border-radius: 4px;
`;

interface ChatAreaProps {
  messages: Message[];
  isLoading: boolean;
}

function ChatArea({ messages, isLoading }: ChatAreaProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  if (messages.length === 0 && !isLoading) {
    return (
      <ChatContainer ref={scrollRef}>
        <EmptyState>
          <EmptyTitle>Welcome to DTUI2</EmptyTitle>
          <EmptyDescription>
            A Claude Code style AI terminal interface. Start by typing a message below,
            or try commands like "!ls" for shell operations or "read file README.md" for file operations.
          </EmptyDescription>
          <ShortcutHint>
            <div>Shortcuts: Ctrl+N (New) • Ctrl+Shift+C (Clear) • Escape (Focus Input)</div>
          </ShortcutHint>
        </EmptyState>
      </ChatContainer>
    );
  }

  return (
    <ChatContainer ref={scrollRef}>
      {messages.map((message) => (
        <MessageComponent key={message.id} message={message} />
      ))}
      {isLoading && (
        <LoadingIndicator>
          <span>Assistant is typing</span>
          <LoadingDots>
            <span />
            <span />
            <span />
          </LoadingDots>
        </LoadingIndicator>
      )}
    </ChatContainer>
  );
}

export default ChatArea;