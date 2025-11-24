import axios from 'axios';
import Config from '../config/config';

/**
 * Chat API Service
 * Handles all API calls for chat contexts and messages
 */
class ChatAPIService {
  constructor() {
    // Create axios instance with default config
    this.api = axios.create({
      baseURL: Config.backendUrl,
      headers: {
        'X-App-ID': Config.appId,
      },
    });

    // Add response interceptor for logging
    this.api.interceptors.response.use(
      (response) => {
        console.log('✅ API Response:', response.config.url, response.data);
        return response;
      },
      (error) => {
        console.error('❌ API Error:', error.config?.url, error.message);
        return Promise.reject(error);
      }
    );
  }

  /**
   * Get list of chat contexts (no body = get all)
   * @returns {Promise<Array>} Array of context objects
   */
  async getContextList() {
    try {
      const { data } = await this.api.post('/v1/chat_context/get');
      console.log('📋 Context list loaded:', data);
      
      // Expected format: [{contextId, title, model, messages, convSummary, messageId, repByMessIds}]
      return data || [];
    } catch (error) {
      console.error('❌ Error loading context list:', error);
      throw error;
    }
  }

  /**
   * Get specific context by contextId and messageId
   * @param {string} contextId - Context ID
   * @param {string} messageId - Message ID to load specific branch
   * @returns {Promise<Object>} Context object with messages
   */
  async getContext(contextId, messageId) {
    try {
      const { data } = await this.api.post('/v1/chat_context/get', {
        contextId,
        messageId
      });
      console.log('📋 Context loaded:', data);
      
      // Expected format: {contextId, title, model, messages, convSummary, messageId, repByMessIds}
      return data;
    } catch (error) {
      console.error('❌ Error loading context:', error);
      throw error;
    }
  }

  /**
   * Get messages by IDs
   * @param {Array<string>} messageIds - Array of message IDs
   * @returns {Promise<Array>} Array of message objects
   */
  async getMessages(messageIds) {
    if (!messageIds || messageIds.length === 0) {
      return [];
    }

    try {
      const { data } = await this.api.post('/v1/message/get', {
        messageIds: messageIds
      });
      console.log('💬 Messages loaded:', data);
      
      // Expected format: [{messageId, contextId, message: {role, content}, ...}]
      return data || [];
    } catch (error) {
      console.error('❌ Error loading messages:', error);
      throw error;
    }
  }

  /**
   * Send a chat message
   * @param {Object} payload - {contextId, model, messageId, message, fileIds}
   * @returns {Promise<Object>} Response from server
   */
  async sendMessage(payload) {
    try {
      const { data } = await this.api.post('/ws/v1/gen_ai/chat', payload);
      console.log('✅ Message sent, response:', data);
      
      return data;
    } catch (error) {
      console.error('❌ Error sending message:', error);
      throw error;
    }
  }

  /**
   * Upload multiple files to server
   * @param {FormData} formData - FormData with files already appended
   * @param {Function} onProgress - Optional callback for upload progress (percent)
   * @returns {Promise<Object>} Response with fileIds: {fileIds: [string]}
   */
  async uploadFiles(formData, onProgress = null) {
    if (!formData) {
      return { fileIds: [] };
    }

    try {
      // Upload to red.irdop.org endpoint
      const uploadUrl = 'https://red.irdop.org/v1/file/upload/opai';

      const response = await axios.post(uploadUrl, formData, {
        headers: {
          'X-App-ID': Config.appId,
          // Không set Content-Type, để browser tự động set với boundary
        },
        // Track upload progress
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          console.log(`📤 Upload progress: ${percentCompleted}%`);
          
          // Call callback if provided
          if (onProgress && typeof onProgress === 'function') {
            onProgress(percentCompleted);
          }
        }
      });

      if (response.status === 200 || response.status === 201) {
        console.log('📁 Files uploaded successfully, response:', response.data);
        // Expected format: {fileIds: ["file_id_1", "file_id_2"]}
        return response.data;
      } else {
        throw new Error(`Upload failed with status ${response.status}`);
      }
    } catch (error) {
      console.error('❌ Error uploading files:', error);
      
      // Handle different error responses
      if (error.response) {
        const status = error.response.status;
        const message = error.response.data?.message || 'Lỗi không xác định';
        
        if (status === 403) {
          throw new Error(`Forbidden: ${message}`);
        } else if (status === 401) {
          throw new Error(`Unauthorized: ${message}`);
        } else {
          throw new Error(`HTTP ${status}: ${message}`);
        }
      }
      
      // Network error or other issues
      throw new Error(error.message || 'Lỗi kết nối đến máy chủ');
    }
  }
}

// Create singleton instance
const chatAPIService = new ChatAPIService();

// Expose to window for use in context
if (typeof window !== 'undefined') {
  window.chatAPI = chatAPIService;
}

export default chatAPIService;
