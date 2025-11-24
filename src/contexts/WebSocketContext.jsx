import React, { createContext, useContext, useEffect, useState } from 'react';
import webSocketService from '../services/WebSocketService';
import Config from '../config/config';

const WebSocketContext = createContext(null);

export const useWebSocket = () => {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocket must be used within a WebSocketProvider');
  }
  return context;
};

export const WebSocketProvider = ({ children, onMessage }) => {
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [lastMessage, setLastMessage] = useState(null);
  const [error, setError] = useState(null);
  const [connectionAttempts, setConnectionAttempts] = useState(0);

  useEffect(() => {
    console.log('🔌 WebSocket Provider initialized');
    console.log('📡 WebSocket URL:', Config.websocketUrl);
    console.log('🔌 WebSocket Enabled:', Config.websocketEnabled);
    console.log('🌐 Backend URL:', Config.backendUrl);
    console.log('🏷️ App ID:', Config.appId);

    // Only attempt WebSocket connection if enabled
    if (!Config.websocketEnabled) {
      console.log('⚠️ WebSocket is disabled in configuration. Using HTTP-only mode.');
      setConnectionStatus('disabled');
      return () => {
        console.log('🧹 WebSocket Provider cleanup (disabled mode)');
      };
    }

    // Set up event listeners
    const handleConnected = () => {
      console.log('✅ WebSocket connected successfully');
      setConnectionStatus('connected');
      setError(null);
      setConnectionAttempts(0);
    };

    const handleDisconnected = (event) => {
      console.log('❌ WebSocket disconnected:', event);
      // If reconnection attempts are in progress, show reconnecting status
      if (connectionAttempts > 0 && connectionAttempts < 5) {
        setConnectionStatus('reconnecting');
      } else {
        setConnectionStatus('disconnected');
      }
      
      // Update error if there's a close reason
      if (event.closeReason) {
        setError(prev => ({ 
          ...prev, 
          closeReason: event.closeReason,
          closeCode: event.code 
        }));
      }
    };

    const handleMessage = (message) => {
      console.log('📨 WebSocket message received:', message);
      setLastMessage(message);
      
      // Call the onMessage callback if provided to handle bot responses
      if (onMessage && typeof onMessage === 'function') {
        onMessage(message);
      }
    };

    const handleError = (errorData) => {
      console.error('🚨 WebSocket error:', errorData);
      setError(errorData);
      setConnectionStatus('error');
      setConnectionAttempts(prev => prev + 1);
    };

    const handleReconnectFailed = () => {
      console.error('💔 WebSocket reconnection failed after maximum attempts');
      setConnectionStatus('reconnect_failed');
    };

    // Register listeners
    webSocketService.on('connected', handleConnected);
    webSocketService.on('disconnected', handleDisconnected);
    webSocketService.on('message', handleMessage);
    webSocketService.on('error', handleError);
    webSocketService.on('reconnect_failed', handleReconnectFailed);

    // Connect when component mounts
    console.log('🔄 Attempting WebSocket connection...');
    webSocketService.connect();

    // Cleanup on unmount
    return () => {
      console.log('🧹 WebSocket Provider cleanup');
      webSocketService.off('connected', handleConnected);
      webSocketService.off('disconnected', handleDisconnected);
      webSocketService.off('message', handleMessage);
      webSocketService.off('error', handleError);
      webSocketService.off('reconnect_failed', handleReconnectFailed);
      webSocketService.disconnect();
    };
  }, []);

  const sendMessage = (message) => {
    console.log('📤 Sending WebSocket message:', message);
    const success = webSocketService.send(message);
    if (!success) {
      console.warn('⚠️ Failed to send WebSocket message - connection not available');
    }
    return success;
  };

  const connect = () => {
    console.log('🔄 Manual WebSocket connection attempt');
    webSocketService.connect();
  };

  const disconnect = () => {
    console.log('🔌 Manual WebSocket disconnect');
    webSocketService.disconnect();
    setConnectionStatus('disconnected');
  };

  // Function to get connection info for debugging
  const getConnectionInfo = () => {
    return {
      status: connectionStatus,
      websocketUrl: Config.websocketUrl,
      backendUrl: Config.backendUrl,
      appId: Config.appId,
      attempts: connectionAttempts,
      error: error,
      lastMessage: lastMessage
    };
  };

  const value = {
    connectionStatus,
    lastMessage,
    error,
    connectionAttempts,
    sendMessage,
    connect,
    disconnect,
    getConnectionInfo,
    isConnected: connectionStatus === 'connected'
  };

  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  );
};

export default WebSocketContext;