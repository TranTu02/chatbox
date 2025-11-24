import React, { createContext, useState, useRef } from 'react';

// Create the context
export const GlobalContext = createContext();

// Create the provider component
export const GlobalProvider = ({ children }) => {
	const [messages, setMessages] = useState([]);
	const [sessionHistory, setSessionHistory] = useState([]);
	const chatContextRef = useRef(null);

	// Function to register ChatContext for syncing
	const registerChatContext = (chatContext) => {
		chatContextRef.current = chatContext;
	};

	const addMessage = (message) => {
		setMessages((prevMessages) => [...prevMessages, message]);
	};

	const addSession = (session) => {
		setSessionHistory((prevHistory) => [...prevHistory, session]);
	};

	const handleBotResponse = (response) => {
		console.log('🤖 Bot response received:', response);
		
		// Check for error in response
		if (response.error || (response.payload && response.payload.error)) {
			const errorMessage = response.error || response.payload.error;
			console.error('❌ Error in response:', errorMessage);
			
			const errorBotMessage = {
				messageId: `error-${Date.now()}`,
				contextId: response.contextId || null,
				message: {
					role: 'assistant',
					content: typeof errorMessage === 'string' ? errorMessage : JSON.stringify(errorMessage)
				},
				isError: true,
				createdAt: new Date().toISOString()
			};
			
			// Add error message
			setMessages(prev => [...prev, errorBotMessage]);
			
			// Sync with ChatContext if available
			if (chatContextRef.current?.addMessage) {
				chatContextRef.current.addMessage(errorBotMessage);
			}
			
			// Also add in old format for compatibility
			addMessage({ 
				bot: { 
					content: errorBotMessage.message.content,
					isError: true
				} 
			});
			return;
		}
		
		// Helper function to normalize content (handle both string and object formats)
		const normalizeContent = (content) => {
			if (typeof content === 'string') {
				return content;
			}
			if (typeof content === 'object' && content !== null) {
				// Handle OpenAI format: {text, type, cache_control}
				if (content.text) {
					return content.text;
				}
				// Handle other object formats
				if (content.content) {
					return content.content;
				}
				// Fallback to JSON string
				return JSON.stringify(content);
			}
			return String(content);
		};
		
		// Handle new format: {payload: {messageId, contextId, message: {role, content}, model, createdAt, prevMessId}}
		if (response.payload) {
			const payload = response.payload;
			
			// Check if payload contains the full message structure
			if (payload.message && payload.message.role && payload.message.content) {
				const normalizedContent = normalizeContent(payload.message.content);
				
				const botMessage = {
					messageId: payload.messageId || `temp-bot-${Date.now()}`,
					contextId: payload.contextId || null,
					message: {
						role: payload.message.role,
						content: normalizedContent
					},
					model: payload.model,
					classifierCode: payload.classifierCode || response.data?.classifierCode, // Store classifierCode from response
					createdAt: payload.createdAt || new Date().toISOString(),
					prevMessId: payload.prevMessId
				};
				
				// Add to messages in new format
				setMessages(prev => [...prev, botMessage]);
				
				// Sync with ChatContext if available and auto-set contextId
				if (chatContextRef.current?.addMessage) {
					chatContextRef.current.addMessage(botMessage);
					
					// Auto-set contextId if this is a new conversation
					if (payload.contextId && chatContextRef.current.setContextId) {
						chatContextRef.current.setContextId(payload.contextId);
					}
				}
				
				// Also add in old format for compatibility
				addMessage({ 
					bot: { 
						content: normalizedContent,
						role: payload.message.role,
						timestamp: payload.createdAt || new Date().toISOString(),
						model: payload.model,
						msgId: payload.messageId
					} 
				});
				return;
			}
			
			// Old payload format: {payload: {role, content}}
			if (payload.role && payload.content) {
				const normalizedContent = normalizeContent(payload.content);
				
				const botMessage = {
					messageId: response._msgid || `temp-bot-${Date.now()}`,
					contextId: response.contextId || null,
					message: {
						role: payload.role,
						content: normalizedContent
					},
					model: response.data?.model,
					createdAt: response.timestamp || new Date().toISOString()
				};
				
				// Add to messages in new format
				setMessages(prev => [...prev, botMessage]);
				
				// Sync with ChatContext if available
				if (chatContextRef.current?.addMessage) {
					chatContextRef.current.addMessage(botMessage);
				}
				
				// Also add in old format for compatibility
				addMessage({ 
					bot: { 
						content: normalizedContent,
						role: payload.role,
						timestamp: response.timestamp || new Date().toISOString(),
						model: response.data?.model,
						msgId: response._msgid
					} 
				});
				return;
			}
		}
		
		// Handle direct format: {role: 'system', content: '<Nội dung response>'}
		if (response.role && response.content) {
			const normalizedContent = normalizeContent(response.content);
			
			const botMessage = {
				messageId: response.messageId || `temp-bot-${Date.now()}`,
				contextId: response.contextId || null,
				message: {
					role: response.role,
					content: normalizedContent
				},
				createdAt: new Date().toISOString()
			};
			
			// Add to messages in new format
			setMessages(prev => [...prev, botMessage]);
			
			// Sync with ChatContext if available
			if (chatContextRef.current?.addMessage) {
				chatContextRef.current.addMessage(botMessage);
			}
			
			// Also add in old format for compatibility
			addMessage({ 
				bot: { 
					content: normalizedContent,
					role: response.role,
					timestamp: new Date().toISOString()
				} 
			});
			return;
		}

		// Legacy handling for old format
		const { type, analyte_results, analyte_matches, content } = response;
		let sessionData = {};

		// If it's just a content response (for backward compatibility)
		if (content && !type) {
			const botMessage = { 
				bot: { 
					content: content,
					timestamp: new Date().toISOString()
				} 
			};
			addMessage(botMessage);
			return;
		}

		// Legacy session handling
		if (type === 'request_analytes_of_sample') {
			sessionData = { type, data: analyte_results };
		} else if (type === 'asking_for_confirmation' || type === 'commit_this_result') {
			sessionData = { type, data: analyte_matches };
		}

		if (Object.keys(sessionData).length > 0) {
			addSession(sessionData);
		}
	};

	const clearMessages = () => {
		setMessages([]);
	};

	const clearHistory = () => {
		setSessionHistory([]);
	};

	return (
		<GlobalContext.Provider
			value={{
				messages,
				addMessage,
				sessionHistory,
				addSession,
				handleBotResponse,
				clearMessages,
				clearHistory,
				registerChatContext,
			}}
		>
			{children}
		</GlobalContext.Provider>
	);
};
