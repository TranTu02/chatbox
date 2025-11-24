import React, { useEffect, useState } from 'react';
import { HiPlus, HiChatAlt2, HiX } from 'react-icons/hi';
import { useChatContext } from '../../../contexts/ChatContext';

const ChatSidebar = ({ isOpen, onClose }) => {
  const {
    contexts,
    currentContextId,
    isLoadingContexts,
    loadContexts,
    switchContext,
  } = useChatContext();

  const [searchQuery, setSearchQuery] = useState('');

  // Load contexts on mount
  useEffect(() => {
    loadContexts();
  }, [loadContexts]);

  // Filter contexts based on search query
  const filteredContexts = contexts.filter(context => 
    !searchQuery || 
    context.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    context.convSummary?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleNewConversation = () => {
    switchContext(null);
    if (window.innerWidth < 768) {
      onClose();
    }
  };

  const handleSelectContext = (context) => {
    switchContext(context);
    if (window.innerWidth < 768) {
      onClose();
    }
  };

  return (
    <>
      {/* Overlay for mobile */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <div
        className={`fixed md:relative top-0 left-0 h-full bg-gray-900 text-white z-50 transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        } w-64 flex flex-col`}
      >
        {/* Header */}
        <div className="p-4 border-b border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Hội thoại</h2>
            <button
              onClick={onClose}
              className="md:hidden p-1 hover:bg-gray-800 rounded"
            >
              <HiX className="w-5 h-5" />
            </button>
          </div>

          {/* New Conversation Button */}
          <button
            onClick={handleNewConversation}
            className={`w-full flex items-center space-x-2 p-3 rounded-lg transition-colors ${
              currentContextId === null
                ? 'bg-blue-600 text-white'
                : 'bg-gray-800 hover:bg-gray-700 text-gray-300'
            }`}
          >
            <HiPlus className="w-5 h-5" />
            <span className="font-medium">Đoạn hội thoại mới</span>
          </button>

          {/* Search */}
          <input
            type="text"
            placeholder="Tìm kiếm..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full mt-3 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm focus:outline-none focus:border-blue-500"
          />
        </div>

        {/* Context List */}
        <div className="flex-1 overflow-y-auto">
          {isLoadingContexts ? (
            <div className="p-4 text-center text-gray-400">
              <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full mx-auto"></div>
              <p className="mt-2 text-sm">Đang tải...</p>
            </div>
          ) : filteredContexts.length === 0 ? (
            <div className="p-4 text-center text-gray-400">
              <HiChatAlt2 className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p className="text-sm">
                {searchQuery ? 'Không tìm thấy hội thoại' : 'Chưa có hội thoại nào'}
              </p>
            </div>
          ) : (
            <div className="p-2 space-y-1">
              {filteredContexts.map((context) => (
                <button
                  key={context.contextId}
                  onClick={() => handleSelectContext(context)}
                  className={`w-full text-left p-3 rounded-lg transition-colors ${
                    currentContextId === context.contextId
                      ? 'bg-blue-600 text-white'
                      : 'hover:bg-gray-800 text-gray-300'
                  }`}
                >
                  <div className="flex items-start space-x-2">
                    <HiChatAlt2 className="w-5 h-5 flex-shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">
                        {context.title || 'Hội thoại không có tiêu đề'}
                      </p>
                      {context.convSummary && (
                        <p className="text-xs text-gray-400 truncate mt-1">
                          {context.convSummary}
                        </p>
                      )}
                      <div className="flex items-center space-x-2 mt-2 text-xs text-gray-500">
                        {context.model && (
                          <span className="bg-gray-800 px-2 py-0.5 rounded">
                            {context.model}
                          </span>
                        )}
                        {context.messages && (
                          <span>
                            {context.messages.length} tin nhắn
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-700 text-xs text-gray-500">
          <p>ChatBox AI</p>
          <p className="mt-1">{contexts.length} hội thoại</p>
        </div>
      </div>
    </>
  );
};

export default ChatSidebar;
