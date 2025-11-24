import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { GlobalContext } from './GlobalContext';

const ChatContext = createContext(null);

export const useChatContext = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChatContext must be used within a ChatProvider');
  }
  return context;
};

export const ChatProvider = ({ children }) => {
  const globalContext = useContext(GlobalContext);
  
  // Current conversation state
  const [currentContextId, setCurrentContextId] = useState(null); // null for new conversation
  const [currentMessages, setCurrentMessages] = useState([]); // Array of message objects
  const [loadedMessageIds, setLoadedMessageIds] = useState(new Set()); // Track loaded messages
  const [lastMessageId, setLastMessageId] = useState(null); // Track last bot message ID for chain
  
  // Context list state
  const [contexts, setContexts] = useState([]); // List of all contexts
  const [isLoadingContexts, setIsLoadingContexts] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isWaitingForResponse, setIsWaitingForResponse] = useState(false); // Track if waiting for bot response
  const [shouldReloadContexts, setShouldReloadContexts] = useState(false); // Trigger context list reload
  
  // Pagination state for infinite scroll
  const [hasMoreMessages, setHasMoreMessages] = useState(false);
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0); // Index in reversed message array
  
  // Sync contextId with URL query params
  useEffect(() => {
    if (currentContextId) {
      const url = new URL(window.location.href);
      url.searchParams.set('contextId', currentContextId);
      window.history.pushState({}, '', url);
      console.log('🔗 Updated URL with contextId:', currentContextId);
    } else {
      // Remove contextId from URL when starting new conversation
      const url = new URL(window.location.href);
      url.searchParams.delete('contextId');
      window.history.pushState({}, '', url);
      console.log('🔗 Removed contextId from URL');
    }
  }, [currentContextId]);
  
  // Load contextId from URL on mount
  useEffect(() => {
    const url = new URL(window.location.href);
    const urlContextId = url.searchParams.get('contextId');
    if (urlContextId && !currentContextId) {
      console.log('🔗 Loading contextId from URL:', urlContextId);
      setCurrentContextId(urlContextId);
      // TODO: Load messages for this context
    }
  }, []);
  
  // Register this context with GlobalContext for syncing bot responses
  useEffect(() => {
    if (globalContext?.registerChatContext) {
      globalContext.registerChatContext({
        addMessage: (msg) => {
          addMessage(msg);
          // When bot message arrives, stop waiting
          if (msg.message?.role === 'system' || msg.message?.role === 'assistant') {
            setIsWaitingForResponse(false);
            
            // Update lastMessageId to the latest bot message
            if (msg.messageId && !msg.messageId.startsWith('temp-')) {
              console.log('💾 Updated lastMessageId:', msg.messageId);
              setLastMessageId(msg.messageId);
            }
            
            // Trigger reload context list to update with new conversation
            if (msg.contextId) {
              console.log('🔄 Triggering context list reload after new message');
              setShouldReloadContexts(true);
            }
          }
        },
        setContextId: (contextId) => {
          // Auto-set contextId if current is null (new conversation)
          if (!currentContextId && contextId) {
            console.log('🆔 Auto-setting contextId from server:', contextId);
            setCurrentContextId(contextId);
            
            // Trigger reload context list for new conversation
            setShouldReloadContexts(true);
          }
        },
        currentContextId,
        currentMessages
      });
    }
  }, [globalContext, currentContextId, currentMessages]);
  
  /**
   * Add a new message to current conversation
   * @param {Object} message - {messageId, contextId, message: {role, content}}
   */
  const addMessage = useCallback((message) => {
    setCurrentMessages(prev => [...prev, message]);
    if (message.messageId) {
      setLoadedMessageIds(prev => new Set([...prev, message.messageId]));
    }
    
    // Update contextId if this is first message or new conversation
    if (!currentContextId && message.contextId) {
      console.log('🆔 Setting contextId from message:', message.contextId);
      setCurrentContextId(message.contextId);
    }
    
    // If this is a user message, set waiting for response
    if (message.message?.role === 'user') {
      setIsWaitingForResponse(true);
    }
  }, [currentContextId]);
  
  /**
   * Remove messages after a specific messageId (for reply branching)
   * @param {string} messageId - The messageId to keep (messages after this will be removed)
   */
  const removeMessagesAfter = useCallback((messageId) => {
    setCurrentMessages(prev => {
      const messageIndex = prev.findIndex(msg => msg.messageId === messageId);
      if (messageIndex === -1) {
        console.warn('⚠️ Message not found for branching:', messageId);
        return prev;
      }
      
      // Keep messages up to and including the replied message
      const newMessages = prev.slice(0, messageIndex + 1);
      console.log(`✂️ Removed ${prev.length - newMessages.length} messages after reply point`);
      return newMessages;
    });
  }, []);
  
  /**
   * Load messages for a specific context
   * @param {Array} messageIds - Array of message IDs to load
   */
  const loadMessages = useCallback(async (messageIds, prepend = false) => {
    if (messageIds.length === 0) return [];
    
    setIsLoadingMessages(true);
    try {
      // Filter out already loaded messages
      const newMessageIds = messageIds.filter(id => !loadedMessageIds.has(id));
      if (newMessageIds.length === 0) {
        setIsLoadingMessages(false);
        return [];
      }
      
      // This will be implemented in API service
      const messages = await window.chatAPI?.getMessages(newMessageIds) || [];
      
      // Update loaded IDs
      setLoadedMessageIds(prev => {
        const newSet = new Set(prev);
        newMessageIds.forEach(id => newSet.add(id));
        return newSet;
      });
      
      // Add messages to current conversation
      if (prepend) {
        setCurrentMessages(prev => [...messages, ...prev]);
      } else {
        setCurrentMessages(prev => [...prev, ...messages]);
        
        // Update lastMessageId to the last bot message in loaded messages
        const lastBotMessage = [...messages].reverse().find(
          msg => (msg.message?.role === 'system' || msg.message?.role === 'assistant') 
            && msg.messageId 
            && !msg.messageId.startsWith('temp-')
        );
        if (lastBotMessage) {
          console.log('💾 Set lastMessageId from loaded messages:', lastBotMessage.messageId);
          setLastMessageId(lastBotMessage.messageId);
        }
      }
      
      return messages;
    } catch (error) {
      console.error('Error loading messages:', error);
      return [];
    } finally {
      setIsLoadingMessages(false);
    }
  }, [loadedMessageIds]);
  
  /**
   * Load contexts list from API
   */
  const loadContexts = useCallback(async () => {
    setIsLoadingContexts(true);
    try {
      // This will be implemented in API service
      const contextList = await window.chatAPI?.getContextList() || [];
      setContexts(contextList);
      return contextList;
    } catch (error) {
      console.error('Error loading contexts:', error);
      return [];
    } finally {
      setIsLoadingContexts(false);
      setShouldReloadContexts(false); // Reset reload trigger
    }
  }, []);
  
  // Effect to reload contexts when triggered
  useEffect(() => {
    if (shouldReloadContexts) {
      console.log('🔄 Auto-reloading context list after delay');
      const timer = setTimeout(() => {
        loadContexts();
      }, 1000); // Delay 1s to ensure server updated
      
      return () => clearTimeout(timer);
    }
  }, [shouldReloadContexts, loadContexts]);
  
  /**
   * Switch to a different context
   * @param {Object} context - Context object or null for new conversation
   */
  const switchContext = useCallback(async (context) => {
    // Clear current state
    setCurrentMessages([]);
    setLoadedMessageIds(new Set());
    setCurrentMessageIndex(0);
    setIsWaitingForResponse(false);
    setLastMessageId(null); // Reset message chain
    
    // Clear GlobalContext messages if available
    if (globalContext?.clearMessages) {
      globalContext.clearMessages();
    }
    
    if (!context) {
      // New conversation
      console.log('🆕 Starting new conversation');
      setCurrentContextId(null);
      setHasMoreMessages(false);
      return;
    }
    
    // Load context
    console.log('🔄 Switching to context:', context.contextId);
    setCurrentContextId(context.contextId);
    
    // Always use messageIds to load messages via API
    const messageIds = context.messageIds || context.messages || [];
    console.log('📋 Loading messages from IDs:', messageIds.length, 'messages');
    
    const reversedMessageIds = [...messageIds].reverse();
    const firstBatch = reversedMessageIds.slice(0, 10);
    
    setHasMoreMessages(reversedMessageIds.length > 10);
    setCurrentMessageIndex(10);
    
    await loadMessages(firstBatch);
  }, [loadMessages, globalContext]);
  
  /**
   * Load more messages (for infinite scroll)
   */
  const loadMoreMessages = useCallback(async () => {
    if (isLoadingMessages || !hasMoreMessages || !currentContextId) {
      return;
    }
    
    // Find current context
    const context = contexts.find(c => c.contextId === currentContextId);
    if (!context) return;
    
    // Get next batch of messages
    const reversedMessages = [...(context.messages || [])].reverse();
    const nextBatch = reversedMessages.slice(currentMessageIndex, currentMessageIndex + 10);
    
    if (nextBatch.length === 0) {
      setHasMoreMessages(false);
      return;
    }
    
    await loadMessages(nextBatch, true); // Prepend to beginning
    
    setCurrentMessageIndex(prev => prev + nextBatch.length);
    setHasMoreMessages(currentMessageIndex + nextBatch.length < reversedMessages.length);
  }, [isLoadingMessages, hasMoreMessages, currentContextId, contexts, currentMessageIndex, loadMessages]);
  
  /**
   * Clear current conversation
   */
  const clearConversation = useCallback(() => {
    setCurrentContextId(null);
    setCurrentMessages([]);
    setLoadedMessageIds(new Set());
    setCurrentMessageIndex(0);
    setHasMoreMessages(false);
    setLastMessageId(null); // Reset lastMessageId
  }, []);
  
  /**
   * Reset lastMessageId (used when replying to break the chain)
   */
  const resetLastMessageId = useCallback(() => {
    console.log('🔗 Breaking message chain - resetting lastMessageId');
    setLastMessageId(null);
  }, []);
  
  /**
   * Get current context object
   */
  const getCurrentContext = useCallback(() => {
    if (!currentContextId) return null;
    return contexts.find(c => c.contextId === currentContextId);
  }, [currentContextId, contexts]);
  
  /**
   * Navigate to a specific message in a context (for repByMessIds navigation)
   * @param {string} contextId - Context ID
   * @param {string} messageId - Message ID to navigate to
   */
  const navigateToMessage = useCallback(async (contextId, messageId) => {
    try {
      console.log('🔄 Navigating to message:', { contextId, messageId });
      
      // Update URL with messageId
      const url = new URL(window.location.href);
      url.searchParams.set('contextId', contextId);
      url.searchParams.set('messageId', messageId);
      window.history.pushState({}, '', url);
      
      // Import chatAPIService
      const chatAPIService = (await import('../services/ChatAPIService')).default;
      
      // Get context with specific messageId - API returns context record with messageIds
      const contextData = await chatAPIService.getContext(contextId, messageId);
      console.log('📋 Context loaded for navigation:', contextData);
      
      // Extract messageIds from context
      const messageIds = contextData.messageIds || contextData.messages || [];
      console.log('📋 MessageIds to load:', messageIds);
      
      if (messageIds.length > 0) {
        // Load messages using getMessages API
        const messages = await chatAPIService.getMessages(messageIds);
        console.log('💬 Messages loaded:', messages);
        console.log('💬 Number of messages:', messages.length);
        
        // Update current context and messages
        setCurrentContextId(contextId);
        setCurrentMessages(messages);
        console.log('✅ Set currentMessages with', messages.length, 'messages');
        setLoadedMessageIds(new Set(messageIds));
        
        // Update lastMessageId to the last bot message
        const lastMsg = messages[messages.length - 1];
        if (lastMsg?.messageId && (lastMsg.message?.role === 'assistant' || lastMsg.message?.role === 'system')) {
          setLastMessageId(lastMsg.messageId);
          console.log('💾 Updated lastMessageId:', lastMsg.messageId);
        }
      } else {
        console.warn('⚠️ No messageIds in contextData:', contextData);
      }
    } catch (error) {
      console.error('❌ Error navigating to message:', error);
    }
  }, []);

  // Retry last message (for error recovery)
  const retryLastMessage = useCallback(() => {
    // Find last user message to resend
    const userMessages = currentMessages.filter(m => m.message?.role === 'user');
    if (userMessages.length > 0) {
      const lastUserMessage = userMessages[userMessages.length - 1];
      console.log('🔄 Retrying last message:', lastUserMessage);
      
      // Remove error message(s) after last user message
      const lastUserIndex = currentMessages.findIndex(m => m.messageId === lastUserMessage.messageId);
      setCurrentMessages(prev => prev.slice(0, lastUserIndex + 1));
      
      // Trigger resend via GlobalContext
      if (globalContext?.resendMessage) {
        globalContext.resendMessage(lastUserMessage);
      }
    }
  }, [currentMessages, globalContext]);

  const value = {
    // Current conversation
    currentContextId,
    currentMessages,
    lastMessageId,
    
    // Context list
    contexts,
    isLoadingContexts,
    isLoadingMessages,
    isWaitingForResponse,
    
    // Pagination
    hasMoreMessages,
    
    // Actions
    addMessage,
    removeMessagesAfter,
    loadMessages,
    loadContexts,
    switchContext,
    loadMoreMessages,
    clearConversation,
    getCurrentContext,
    resetLastMessageId,
    navigateToMessage,
    retryLastMessage,
    setContextId: setCurrentContextId,
  };
  
  return (
    <ChatContext.Provider value={value}>
      {children}
    </ChatContext.Provider>
  );
};

export default ChatContext;
