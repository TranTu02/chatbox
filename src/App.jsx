import React from 'react';
import { GlobalProvider, GlobalContext } from './contexts/GlobalContext';
import { WebSocketProvider } from './contexts/WebSocketContext';
import { ModelProvider } from './contexts/ModelContext';
import { ChatProvider } from './contexts/ChatContext';
import ChatBoxContainer from './components/chatbox/ChatBoxContainer';

const AppContent = () => {
	const { handleBotResponse } = React.useContext(GlobalContext);
	
	return (
		<WebSocketProvider onMessage={handleBotResponse}>
			<ModelProvider>
				<ChatProvider>
					<ChatBoxContainer />
				</ChatProvider>
			</ModelProvider>
		</WebSocketProvider>
	);
};

const App = () => {
	return (
		<div className="w-screen h-screen">
			<GlobalProvider>
				<AppContent />
			</GlobalProvider>
		</div>
	);
};

export default App;
