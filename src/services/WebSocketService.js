import Config from '../config/config';

class WebSocketService {
  constructor() {
    this.ws = null;
    this.listeners = new Map();
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000; // 1 second
    this.isConnecting = false;
  }

  // Connect to WebSocket server
  connect() {
    if (this.isConnecting || (this.ws && this.ws.readyState === WebSocket.OPEN)) {
      return;
    }

    this.isConnecting = true;
    console.log(`🔄 Attempting WebSocket connection to: ${Config.websocketUrl}`);
    
    try {
      this.ws = new WebSocket(Config.websocketUrl);
      
      // Set a timeout for connection attempt
      const connectionTimeout = setTimeout(() => {
        if (this.ws && this.ws.readyState === WebSocket.CONNECTING) {
          console.warn('⏰ WebSocket connection timeout after 10 seconds');
          this.ws.close();
          this.isConnecting = false;
          this.emit('error', { 
            type: 'timeout_error', 
            message: 'Connection timeout after 10 seconds',
            url: Config.websocketUrl
          });
        }
      }, 10000);
      
      this.ws.onopen = (event) => {
        clearTimeout(connectionTimeout);
        console.log('✅ WebSocket connected successfully:', event);
        this.reconnectAttempts = 0;
        this.isConnecting = false;
        this.emit('connected', event);
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('📨 WebSocket message received:', data);
          this.emit('message', data);
        } catch (error) {
          console.error('❌ Error parsing WebSocket message:', error);
          this.emit('error', { type: 'parse_error', error });
        }
      };

      this.ws.onclose = (event) => {
        clearTimeout(connectionTimeout);
        const closeReason = this.getCloseReason(event.code);
        console.log(`❌ WebSocket disconnected - Code: ${event.code} (${closeReason}) Reason:`, event.reason);
        this.isConnecting = false;
        this.emit('disconnected', { ...event, closeReason });
        
        // Only attempt reconnect if it wasn't a normal closure
        if (event.code !== 1000) {
          this.attemptReconnect();
        }
      };

      this.ws.onerror = (error) => {
        clearTimeout(connectionTimeout);
        console.error('🚨 WebSocket error:', error);
        this.isConnecting = false;
        this.emit('error', { 
          type: 'connection_error', 
          error,
          url: Config.websocketUrl,
          message: 'Failed to connect to WebSocket server'
        });
      };
    } catch (error) {
      console.error('💥 Error creating WebSocket connection:', error);
      this.isConnecting = false;
      this.emit('error', { 
        type: 'creation_error', 
        error,
        url: Config.websocketUrl,
        message: 'Failed to create WebSocket instance'
      });
    }
  }

  // Disconnect from WebSocket server
  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.listeners.clear();
  }

  // Send message to WebSocket server
  send(message) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      const jsonMessage = JSON.stringify(message);
      console.log('📤 Sending WebSocket message:', jsonMessage);
      this.ws.send(jsonMessage);
      console.log('✅ Message sent successfully');
      return true;
    } else {
      console.warn('⚠️ WebSocket is not connected. ReadyState:', this.ws?.readyState);
      console.warn('❌ Cannot send message:', message);
      return false;
    }
  }

  // Add event listener
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
  }

  // Remove event listener
  off(event, callback) {
    if (this.listeners.has(event)) {
      const callbacks = this.listeners.get(event);
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  // Emit event to all listeners
  emit(event, data) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in WebSocket event listener for ${event}:`, error);
        }
      });
    }
  }

  // Attempt to reconnect
  attemptReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = this.reconnectDelay * this.reconnectAttempts; // Exponential backoff
      console.log(`🔄 Attempting to reconnect... (${this.reconnectAttempts}/${this.maxReconnectAttempts}) in ${delay}ms`);
      
      setTimeout(() => {
        if (this.reconnectAttempts <= this.maxReconnectAttempts) {
          this.connect();
        }
      }, delay);
    } else {
      console.error('💔 Max reconnection attempts reached. Switching to HTTP-only mode.');
      this.emit('reconnect_failed');
    }
  }

  // Get connection status
  getStatus() {
    if (!this.ws) return 'disconnected';
    
    switch (this.ws.readyState) {
      case WebSocket.CONNECTING: return 'connecting';
      case WebSocket.OPEN: return 'connected';
      case WebSocket.CLOSING: return 'disconnecting';
      case WebSocket.CLOSED: return 'disconnected';
      default: return 'unknown';
    }
  }

  // Check if connected
  isConnected() {
    return this.ws && this.ws.readyState === WebSocket.OPEN;
  }

  // Get human-readable close reason
  getCloseReason(code) {
    const closeReasons = {
      1000: 'Normal Closure',
      1001: 'Going Away',
      1002: 'Protocol Error',
      1003: 'Unsupported Data',
      1005: 'No Status Received',
      1006: 'Abnormal Closure',
      1007: 'Invalid frame payload data',
      1008: 'Policy Violation',
      1009: 'Message Too Big',
      1010: 'Mandatory Extension',
      1011: 'Internal Server Error',
      1015: 'TLS handshake'
    };
    return closeReasons[code] || `Unknown (${code})`;
  }
}

// Create singleton instance
const webSocketService = new WebSocketService();

export default webSocketService;