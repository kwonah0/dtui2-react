import { useState, useCallback, useEffect } from 'react';
import styled from '@emotion/styled';
import Header from './components/Header';
import ChatArea from './components/ChatArea';
import InputArea from './components/InputArea';
import { Message, MessageRole } from './types';
import { AIProvider } from './services/AIProvider';
import { initializeMockAPI } from './services/MockElectronAPI';

const AppContainer = styled.div`
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: var(--bg-primary);
  color: var(--text-primary);
`;

const MainContent = styled.div`
  display: flex;
  flex-direction: column;
  flex: 1;
  overflow: hidden;
`;

function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Initialize Mock API for browser testing
  useEffect(() => {
    initializeMockAPI();
  }, []);

  const handleSendMessage = useCallback(async (content: string) => {
    const userMessage: Message = {
      id: Date.now().toString(),
      role: MessageRole.USER,
      content,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);


    try {
      const aiProvider = new AIProvider();
      const response = await aiProvider.generateResponse([...messages, userMessage]);
      
      let assistantMessage: Message;
      
      // Check if response is terminal output
      if (response.startsWith('__TERMINAL_OUTPUT__')) {
        const terminalData = JSON.parse(response.slice('__TERMINAL_OUTPUT__'.length));
        assistantMessage = {
          id: (Date.now() + 1).toString(),
          role: MessageRole.ASSISTANT,
          content: terminalData.output,
          timestamp: new Date(),
          isTerminalOutput: true,
          terminalCommand: terminalData.command,
        };
      } else {
        assistantMessage = {
          id: (Date.now() + 1).toString(),
          role: MessageRole.ASSISTANT,
          content: response,
          timestamp: new Date(),
        };
      }

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: MessageRole.ASSISTANT,
        content: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date(),
      };
      
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  }, [messages]);

  const handleClearChat = useCallback(() => {
    setMessages([]);
  }, []);

  const handleNewChat = useCallback(() => {
    setMessages([]);
  }, []);

  return (
    <AppContainer>
      <Header onNewChat={handleNewChat} onClearChat={handleClearChat} />
      <MainContent>
        <ChatArea messages={messages} isLoading={isLoading} />
        <InputArea onSendMessage={handleSendMessage} disabled={isLoading} />
      </MainContent>
    </AppContainer>
  );
}

export default App;