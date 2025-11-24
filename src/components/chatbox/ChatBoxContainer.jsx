import React, { useContext, useState, useCallback, useRef } from 'react';
import { GlobalContext } from '../../contexts/GlobalContext';
import ChatHeader from './chatboxElements/ChatHeader';
import ChatMessages from './chatboxElements/ChatMessages';
import ChatInput from './chatboxElements/ChatInput';
import ConnectionDebugPanel from './chatboxElements/ConnectionDebugPanel';
import ChatSidebar from './chatboxElements/ChatSidebar';

const ChatBoxContainer = () => {
	const { messages } = useContext(GlobalContext);
	const [isSidebarOpen, setIsSidebarOpen] = useState(false);
	const [classifierCode, setClassifierCode] = useState(''); // Manage classifier code state
	const replyHandlerRef = useRef(null);
	const fileInputRef = useRef(null);

	const toggleSidebar = () => {
		setIsSidebarOpen(prev => !prev);
	};

	const handleReply = useCallback((messageId, content) => {
		if (replyHandlerRef.current) {
			replyHandlerRef.current(messageId, content);
		}
	}, []);

	const handleSetReply = useCallback((replyFunc) => {
		replyHandlerRef.current = replyFunc;
	}, []);

	// Handle file drop in chat area
	const handleFileDrop = useCallback((files) => {
		// Trigger file input in ChatInput
		if (fileInputRef.current) {
			fileInputRef.current(files);
		}
	}, []);

	const handleSetFileInput = useCallback((fileInputFunc) => {
		fileInputRef.current = fileInputFunc;
	}, []);

	return (
		<div className="w-full h-full bg-gray-50 flex overflow-hidden">
			{/* Sidebar */}
			<ChatSidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
			
			{/* Main Chat Container */}
			<div className="flex-1 bg-white flex flex-col overflow-hidden">
				{/* Header with Sidebar Toggle */}
				<ChatHeader 
					onToggleSidebar={toggleSidebar} 
					classifierCode={classifierCode}
					onClassifierCodeChange={setClassifierCode}
				/>
				
				{/* Connection Debug Panel */}
				<ConnectionDebugPanel />
				
				{/* Messages Area */}
				<div className="flex-1 overflow-hidden">
					<ChatMessages messages={messages} onReply={handleReply} onFileDrop={handleFileDrop} />
				</div>
				
				{/* Input Area */}
				<div className="border-t bg-white">
					<ChatInput 
						onSetReply={handleSetReply} 
						classifierCode={classifierCode}
						onClassifierCodeChange={setClassifierCode}
						onSetFileInput={handleSetFileInput}
					/>
				</div>
			</div>
		</div>
	);
};

export default ChatBoxContainer;