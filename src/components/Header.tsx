import { useEffect, useState } from 'react';
import styled from '@emotion/styled';

const HeaderContainer = styled.header`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 16px;
  background: var(--bg-secondary);
  border-bottom: 1px solid var(--border-primary);
  min-height: 48px;
  -webkit-app-region: drag;
`;

const Title = styled.h1`
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
  font-family: var(--font-mono);
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 8px;
  -webkit-app-region: no-drag;
`;

const HeaderButton = styled.button`
  background: var(--bg-tertiary);
  border: 1px solid var(--border-primary);
  color: var(--text-primary);
  padding: 4px 8px;
  border-radius: 3px;
  font-size: 11px;
  cursor: pointer;
  font-family: var(--font-mono);
  
  &:hover {
    background: var(--border-primary);
  }
  
  &:active {
    background: var(--border-secondary);
  }
`;

const Clock = styled.div`
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--text-secondary);
`;

interface HeaderProps {
  onNewChat: () => void;
  onClearChat: () => void;
}

function Header({ onNewChat, onClearChat }: HeaderProps) {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <HeaderContainer>
      <Title>DTUI2 - Claude Code Style AI Terminal</Title>
      <Clock>{time.toLocaleTimeString()}</Clock>
      <ButtonGroup>
        <HeaderButton onClick={onNewChat} title="New Chat (Ctrl+N)">
          New
        </HeaderButton>
        <HeaderButton onClick={onClearChat} title="Clear Chat (Ctrl+Shift+C)">
          Clear
        </HeaderButton>
      </ButtonGroup>
    </HeaderContainer>
  );
}

export default Header;