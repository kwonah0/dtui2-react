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
    
    console.log('🔍 App component initialized');
    console.log('Environment:', typeof (window as any).electronAPI !== 'undefined' ? 'Electron' : 'Browser');
    
    // Test shell agent in Electron
    if ((window as any).electronAPI?.testShellAgent) {
      console.log('🧪 Testing shell agent from renderer process...');
      (window as any).electronAPI.testShellAgent().then((result: any) => {
        console.log('Shell agent test result:', result);
      }).catch((error: any) => {
        console.error('Shell agent test error:', error);
      });
    }
    
    // Expose a global test function for main process to call
    (window as any).testAIProvider = async () => {
      try {
        console.log('=== GLOBAL TEST FUNCTION CALLED ===');
        const aiProvider = new AIProvider();
        const testMessages = [{
          id: '1',
          role: 'user' as any,
          content: 'Hello from global test',
          timestamp: new Date()
        }];
        
        console.log('🧪 Testing AIProvider.generateResponse...');
        const response = await aiProvider.generateResponse(testMessages);
        console.log('✅ AIProvider response:', response);
        return response;
      } catch (error) {
        console.error('❌ AIProvider test error:', error);
        return 'Error: ' + (error as any).message;
      }
    };
    
    // Disable auto-test - only run on user input
    // setTimeout(() => {
    //   console.log('🚀 Auto-running AIProvider test...');
    //   (window as any).testAIProvider().then((result: any) => {
    //     console.log('🎯 Auto-test result:', result);
    //   });
    // }, 1000);
    
  }, []);

  const handleSendMessage = useCallback(async (content: string) => {
    console.log('🚀 handleSendMessage called with content:', content);
    
    const userMessage: Message = {
      id: Date.now().toString(),
      role: MessageRole.USER,
      content,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);
    console.log('Loading set to true');

    try {
      console.log('Creating AIProvider...');
      const aiProvider = new AIProvider();
      console.log('AIProvider created, calling generateResponse...');
      
      const allMessages = [...messages, userMessage];
      console.log('Messages to send:', allMessages);
      
      const response = await aiProvider.generateResponse(allMessages);
      console.log('✅ Response received from AIProvider:', response);
      console.log('Response type:', typeof response);
      console.log('Response length:', response?.length);
      
      let assistantMessage: Message;
      
      // Check if response is PTY output
      if (response.startsWith('__PTY_OUTPUT__')) {
        const ptyData = JSON.parse(response.slice('__PTY_OUTPUT__'.length));
        assistantMessage = {
          id: (Date.now() + 1).toString(),
          role: MessageRole.ASSISTANT,
          content: ptyData.content,
          timestamp: new Date(),
          isPty: true,
        };
      } else if (response.startsWith('__TERMINAL_OUTPUT__')) {
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

      console.log('Adding assistant message to messages');
      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Error in handleSendMessage:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: MessageRole.ASSISTANT,
        content: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date(),
      };
      
      console.log('Adding error message to messages');
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      console.log('Setting loading to false');
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