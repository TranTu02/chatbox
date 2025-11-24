import React, { useEffect, useRef, useState, useCallback } from 'react';
import MessageRenderer from '../../MessageRenderer';
import TypingIndicator from './TypingIndicator';
import { useChatContext } from '../../../contexts/ChatContext';
import { BiChevronLeft, BiChevronRight } from 'react-icons/bi';

const ChatMessages = ({ messages, onReply, onFileDrop }) => {
	const messagesEndRef = useRef(null);
	const messagesStartRef = useRef(null);
	const scrollContainerRef = useRef(null);
	const [isLoadingMore, setIsLoadingMore] = useState(false);
	const [prevScrollHeight, setPrevScrollHeight] = useState(0);
	const [isDragging, setIsDragging] = useState(false);
	
	const { 
		currentMessages, 
		hasMoreMessages, 
		loadMoreMessages, 
		isLoadingMessages,
		isWaitingForResponse,
		currentContextId,
		navigateToMessage,
		retryLastMessage
	} = useChatContext();

	// Use currentMessages from ChatContext if available, otherwise fallback to props
	const displayMessages = currentMessages.length > 0 ? currentMessages : messages;
	
	// Handle retry for error messages
	const handleRetry = useCallback(() => {
		if (retryLastMessage) {
			retryLastMessage();
		}
	}, [retryLastMessage]);
	
	// Debug logs
	useEffect(() => {
		console.log('🔍 ChatMessages - currentMessages:', currentMessages);
		console.log('🔍 ChatMessages - currentMessages.length:', currentMessages.length);
		console.log('🔍 ChatMessages - displayMessages:', displayMessages);
		console.log('🔍 ChatMessages - displayMessages.length:', displayMessages.length);
	}, [currentMessages, displayMessages]);

	// Handle navigation between repByMessIds
	const handleNavigate = async (contextId, targetMessageId) => {
		try {
			await navigateToMessage(contextId, targetMessageId);
		} catch (error) {
			console.error('❌ Error navigating:', error);
		}
	};

	// Helper function to ensure content is always a string
	const getContentAsString = (content) => {
		if (typeof content === 'string') {
			// Remove [Ngữ cảnh hội thoại: ...] pattern
			const cleanContent = content.replace(/\[Ngữ cảnh hội thoại:.*?\]\s*/g, '');
			return cleanContent;
		}
		if (typeof content === 'object' && content !== null) {
			// Handle OpenAI cache format: {text, type, cache_control}
			if (content.text) {
				const cleanText = content.text.replace(/\[Ngữ cảnh hội thoại:.*?\]\s*/g, '');
				return cleanText;
			}
			// Handle other object formats
			if (content.content) {
				return content.content;
			}
			// Fallback to JSON string
			return JSON.stringify(content);
		}
		return String(content || '');
	};

	const scrollToBottom = () => {
		messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
	};

	// Handle infinite scroll - load more messages when scrolling to top
	const handleScroll = useCallback(async () => {
		const container = scrollContainerRef.current;
		if (!container) return;

		// Check if scrolled to top (with 50px threshold)
		if (container.scrollTop < 50 && hasMoreMessages && !isLoadingMessages) {
			setIsLoadingMore(true);
			setPrevScrollHeight(container.scrollHeight);
			
			await loadMoreMessages();
			
			setIsLoadingMore(false);
		}
	}, [hasMoreMessages, isLoadingMessages, loadMoreMessages]);

	// Maintain scroll position after loading more messages
	useEffect(() => {
		const container = scrollContainerRef.current;
		if (container && prevScrollHeight > 0) {
			const newScrollHeight = container.scrollHeight;
			const scrollDiff = newScrollHeight - prevScrollHeight;
			container.scrollTop = scrollDiff;
			setPrevScrollHeight(0);
		}
	}, [prevScrollHeight, displayMessages]);

	useEffect(() => {
		scrollToBottom();
	}, [displayMessages, isWaitingForResponse]);

	// Handle drag and drop
	const handleDragOver = useCallback((e) => {
		e.preventDefault();
		setIsDragging(true);
	}, []);

	const handleDragLeave = useCallback((e) => {
		e.preventDefault();
		setIsDragging(false);
	}, []);

	const handleDrop = useCallback((e) => {
		e.preventDefault();
		setIsDragging(false);
		
		const files = Array.from(e.dataTransfer.files);
		if (files.length > 0 && onFileDrop) {
			onFileDrop(files);
		}
	}, [onFileDrop]);

	// Remove old typing indicator logic - now controlled by isWaitingForResponse from ChatContext

	return (
		<div 
			ref={scrollContainerRef}
			onScroll={handleScroll}
			onDragOver={handleDragOver}
			onDragLeave={handleDragLeave}
			onDrop={handleDrop}
			className={`h-full w-full p-4 overflow-y-auto bg-gradient-to-b from-gray-50 to-white relative ${
				isDragging ? 'border-4 border-dashed border-blue-500 bg-blue-50' : ''
			}`}
		>
			{/* Drag overlay */}
			{isDragging && (
				<div className="absolute inset-0 bg-blue-100 bg-opacity-50 flex items-center justify-center z-50 pointer-events-none">
					<div className="text-center">
						<div className="text-6xl mb-4">📁</div>
						<p className="text-xl font-semibold text-blue-600">Thả file vào đây để tải lên</p>
					</div>
				</div>
			)}
			{/* Loading indicator at top */}
			{isLoadingMore && (
				<div className="text-center py-2">
					<div className="inline-block animate-spin w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full"></div>
					<p className="text-xs text-gray-500 mt-1">Đang tải thêm tin nhắn...</p>
				</div>
			)}
			
			<div ref={messagesStartRef} />
			
			<div className="flex flex-col w-full mx-auto space-y-4">
				{displayMessages.length === 0 ? (
					<div className="text-center text-gray-500 mt-20">
						<div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full mx-auto mb-4 flex items-center justify-center">
							<span className="text-white font-bold text-lg">CHAT</span>
						</div>
						<p className="text-lg font-medium">Chào mừng đến với ChatBox</p>
						<p className="text-sm mt-2 text-gray-400">Hãy bắt đầu cuộc trò chuyện của bạn!</p>
						<div className="mt-6 flex flex-wrap justify-center gap-2">
							<span className="px-3 py-1 bg-blue-100 text-blue-600 rounded-full text-sm">Markdown Support</span>
							<span className="px-3 py-1 bg-green-100 text-green-600 rounded-full text-sm">LaTeX Math</span>
							<span className="px-3 py-1 bg-purple-100 text-purple-600 rounded-full text-sm">File Upload</span>
						</div>
					</div>
				) : (
					displayMessages.map((msg, index) => {
						// Handle new format: {messageId, contextId, message: {role, content}}
						if (msg.message) {
							const isUser = msg.message.role === 'user';
							const isBot = msg.message.role === 'system' || msg.message.role === 'assistant';
							const contentString = getContentAsString(msg.message.content);
							
							// Check if current messageId exists in previous message's repByMessIds
							const prevMsg = index > 0 ? displayMessages[index - 1] : null;
							const shouldShowNavigation = prevMsg?.repByMessIds && 
								prevMsg.repByMessIds.length > 1 && 
								prevMsg.repByMessIds.includes(msg.messageId);
							
							if (isUser) {
								return (
									<div key={msg.messageId || `msg-${index}`} className="mb-4 group">
										<MessageRenderer
											content={contentString}
											isUser={true}
											messageId={msg.messageId}
											onReply={onReply}
											attachments={msg.attachments || msg.files}
											isError={msg.isError}
											classifierCode={msg.classifierCode}
										/>
										
										{/* User message navigation - show if previous message's repByMessIds contains this messageId */}
										{shouldShowNavigation && prevMsg && (
											<div className="text-xs mt-1 mr-2 flex justify-end opacity-0 group-hover:opacity-100 transition-opacity">
												<div className="flex items-center space-x-2 border border-blue-300 rounded-full px-3 py-1 bg-white">
													<button
														onClick={() => {
															const currentIndex = prevMsg.repByMessIds.indexOf(msg.messageId);
															const prevIndex = currentIndex - 1;
															if (prevIndex >= 0) {
																handleNavigate(msg.contextId, prevMsg.repByMessIds[prevIndex]);
															}
														}}
														disabled={prevMsg.repByMessIds.indexOf(msg.messageId) === 0}
														className="p-1 hover:bg-blue-50 rounded disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
														title="Xem tin nhắn trước"
													>
														<BiChevronLeft className="w-4 h-4 text-blue-600" />
													</button>
													<span className="text-blue-700 font-medium">
														{prevMsg.repByMessIds.indexOf(msg.messageId) + 1}/{prevMsg.repByMessIds.length}
													</span>
													<button
														onClick={() => {
															const currentIndex = prevMsg.repByMessIds.indexOf(msg.messageId);
															const nextIndex = currentIndex + 1;
															if (nextIndex < prevMsg.repByMessIds.length) {
																handleNavigate(msg.contextId, prevMsg.repByMessIds[nextIndex]);
															}
														}}
														disabled={prevMsg.repByMessIds.indexOf(msg.messageId) === prevMsg.repByMessIds.length - 1}
														className="p-1 hover:bg-blue-50 rounded disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
														title="Xem tin nhắn tiếp theo"
													>
														<BiChevronRight className="w-4 h-4 text-blue-600" />
													</button>
												</div>
											</div>
										)}
									</div>
								);
							} else if (isBot) {
								// Get classifierCode from previous user message
								const prevUserMsg = index > 0 ? displayMessages[index - 1] : null;
								const userClassifierCode = prevUserMsg?.classifierCode || msg.classifierCode;
								
								return (
									<div key={msg.messageId || `msg-${index}`} className="mb-4 group">
										<MessageRenderer
											content={contentString}
											isUser={false}
											messageId={msg.messageId}
											onReply={onReply}
											attachments={msg.attachments || msg.files}
											isError={msg.isError}
											onRetry={msg.isError ? handleRetry : undefined}
											classifierCode={userClassifierCode}
										/>
										{/* Bot message metadata - only show on hover */}
										<div className="text-xs text-gray-400 mt-1 ml-2 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity">
											<div className="flex items-center space-x-2">
												{msg.model && (
													<span className="bg-gray-200 px-2 py-1 rounded-full">
														🤖 {msg.model}
													</span>
												)}
												{msg.messageId && !msg.messageId.startsWith('temp-') && (
													<span className="bg-gray-200 px-2 py-1 rounded-full">
														ID: {msg.messageId.slice(0, 8)}...
													</span>
												)}
												{msg.createdAt && (
													<span>
														{new Date(msg.createdAt).toLocaleTimeString()}
													</span>
												)}
											</div>
											
											{/* Navigation for repByMessIds - show if previous message has repByMessIds */}
											{shouldShowNavigation && prevMsg && (
												<div className="flex items-center space-x-2 border border-gray-300 rounded-full px-3 py-1">
													<button
														onClick={() => {
															const currentIndex = prevMsg.repByMessIds.indexOf(msg.messageId);
															const prevIndex = currentIndex - 1;
															if (prevIndex >= 0) {
																handleNavigate(msg.contextId, prevMsg.repByMessIds[prevIndex]);
															}
														}}
														disabled={prevMsg.repByMessIds.indexOf(msg.messageId) === 0}
														className="p-1 hover:bg-gray-100 rounded disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
														title="Xem phản hồi trước"
													>
														<BiChevronLeft className="w-4 h-4 text-gray-600" />
													</button>
													<span className="text-gray-700 font-medium">
														{prevMsg.repByMessIds.indexOf(msg.messageId) + 1}/{prevMsg.repByMessIds.length}
													</span>
													<button
														onClick={() => {
															const currentIndex = prevMsg.repByMessIds.indexOf(msg.messageId);
															const nextIndex = currentIndex + 1;
															if (nextIndex < prevMsg.repByMessIds.length) {
																handleNavigate(msg.contextId, prevMsg.repByMessIds[nextIndex]);
															}
														}}
														disabled={prevMsg.repByMessIds.indexOf(msg.messageId) === prevMsg.repByMessIds.length - 1}
														className="p-1 hover:bg-gray-100 rounded disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
														title="Xem phản hồi tiếp theo"
													>
														<BiChevronRight className="w-4 h-4 text-gray-600" />
													</button>
												</div>
											)}
										</div>
									</div>
								);
							}
						}
						
						// Handle old format for backward compatibility
						if (msg.user) {
							const contentString = getContentAsString(msg.user.content);
							return (
								<MessageRenderer
									key={`user-${index}`}
									content={contentString}
									isUser={true}
									onReply={onReply}
								/>
							);
						} else if (msg.bot) {
							const contentString = getContentAsString(msg.bot.content);
							return (
								<div key={`bot-${index}`} className="mb-4 group">
									<MessageRenderer
										content={contentString}
										isUser={false}
										messageId={msg.bot.msgId}
										onReply={onReply}
									/>
									{/* Bot message metadata - only show on hover */}
									{(msg.bot.model || msg.bot.timestamp || msg.bot.msgId) && (
										<div className="text-xs text-gray-400 mt-1 ml-2 flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
											{msg.bot.model && (
												<span className="bg-gray-200 px-2 py-1 rounded-full">
													🤖 {msg.bot.model}
												</span>
											)}
											{msg.bot.msgId && (
												<span className="bg-gray-200 px-2 py-1 rounded-full">
													ID: {msg.bot.msgId.slice(0, 8)}...
												</span>
											)}
											{msg.bot.timestamp && (
												<span>
													{new Date(msg.bot.timestamp).toLocaleTimeString()}
												</span>
											)}
										</div>
									)}
								</div>
							);
						}
						return null;
					})
				)}
				
				{/* Typing Indicator - only show when actually waiting for response */}
				<TypingIndicator isVisible={isWaitingForResponse} />
				
				<div ref={messagesEndRef} />
			</div>
		</div>
	);
};

export default ChatMessages;