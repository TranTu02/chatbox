import React, { useState, useMemo } from 'react';
import { BiReply, BiCopy, BiCheck, BiChevronDown, BiChevronUp } from 'react-icons/bi';
import { AiOutlineDatabase } from 'react-icons/ai';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import remarkGfm from 'remark-gfm';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import { JsonView, allExpanded, darkStyles, defaultStyles } from 'react-json-view-lite';
import 'react-json-view-lite/dist/index.css';
import { processResponse } from '../utils/textFormatter';
import UpdateDatabaseModal from './UpdateDatabaseModal';

const MessageRenderer = ({ content, isUser, messageId, onReply, attachments, isError, onRetry, classifierCode }) => {
  const [copied, setCopied] = useState(false);
  const [copiedMetadata, setCopiedMetadata] = useState(false);
  const [showMetadata, setShowMetadata] = useState(false);
  const [showUpdateModal, setShowUpdateModal] = useState(false);

  // Copy with HTML formatting using ClipboardItem API
  const handleCopy = async () => {
    try {
      // Get the rendered content element
      const messageElement = document.querySelector(`[data-message-id="${messageId}"]`);
      
      if (messageElement && typeof ClipboardItem !== 'undefined') {
        // Create a temporary container with the HTML content
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = messageElement.innerHTML;
        
        // Convert to blob for rich text copying
        const htmlBlob = new Blob([tempDiv.innerHTML], { type: 'text/html' });
        const textBlob = new Blob([content], { type: 'text/plain' });
        
        // Use ClipboardItem to copy both HTML and plain text
        await navigator.clipboard.write([
          new ClipboardItem({
            'text/html': htmlBlob,
            'text/plain': textBlob
          })
        ]);
      } else {
        // Fallback to plain text if ClipboardItem is not supported
        await navigator.clipboard.writeText(content);
      }
      
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
      // Fallback to plain text
      try {
        await navigator.clipboard.writeText(content);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (fallbackErr) {
        console.error('Fallback copy failed:', fallbackErr);
      }
    }
  };

  // Copy metadata as JSON
  const handleCopyMetadata = async () => {
    try {
      const metadataJson = JSON.stringify(processedData.metadata, null, 2);
      await navigator.clipboard.writeText(metadataJson);
      setCopiedMetadata(true);
      setTimeout(() => setCopiedMetadata(false), 2000);
    } catch (err) {
      console.error('Failed to copy metadata:', err);
    }
  };

  // Handle update database
  const handleUpdateDatabase = async (data) => {
    try {
      console.log('📊 Updating database with data:', data);
      // TODO: Call API to update database
      // await chatAPIService.updateDatabase(data);
      alert('Cập nhật cơ sở dữ liệu thành công!');
    } catch (error) {
      console.error('❌ Error updating database:', error);
      alert('Có lỗi xảy ra khi cập nhật cơ sở dữ liệu!');
    }
  };

  // Helper to format file size
  const formatFileSize = (bytes) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
  };

  // Process content: check if JSON and format accordingly
  const processedData = useMemo(() => {
    if (typeof content === 'string') {
      return processResponse(content);
    }
    if (content === null || content === undefined) {
      return { content: "", metadata: null, hasMetadata: false };
    }
    return { content: JSON.stringify(content, null, 2), metadata: null, hasMetadata: false };
  }, [content]);

  // Helper function to ensure content is a string for ReactMarkdown
  const renderMarkdown = (content) => {
    if (typeof content === 'string') {
      return content;
    }
    if (content === null || content === undefined) {
      return '';
    }
    return JSON.stringify(content, null, 2);
  };

  return (
    <div className="group relative">
      <div
        className={`p-3 rounded-lg mb-3 text-sm ${
          isError
            ? 'bg-red-50 text-red-800 self-start mr-auto border border-red-300 max-w-full'
            : isUser 
            ? 'bg-blue-600 text-white self-end ml-auto max-w-xs sm:max-w-md md:max-w-lg lg:max-w-xl' 
            : 'bg-gray-100 text-black self-start mr-auto border max-w-full'
        }`}
      >
        {isError ? (
          <>
            <div className="flex items-start gap-2">
              <span className="text-xl flex-shrink-0">⚠️</span>
              <div className="flex-1">
                <p className="font-semibold text-red-700 mb-1">Có lỗi xảy ra</p>
                <p className="text-sm text-red-600 whitespace-pre-wrap break-words">{content}</p>
                {onRetry && (
                  <button
                    onClick={onRetry}
                    className="mt-3 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
                  >
                    🔄 Thử lại
                  </button>
                )}
              </div>
            </div>
          </>
        ) : isUser ? (
          <>
            <p className="whitespace-pre-wrap break-words">{content}</p>
            {/* Display attachments for user messages */}
            {attachments && attachments.length > 0 && (
              <div className="mt-2 pt-2 border-t border-blue-500 space-y-1">
                {attachments.map((attachment, index) => (
                  <div 
                    key={index} 
                    className="flex items-center text-xs bg-blue-700 bg-opacity-50 rounded px-2 py-1"
                  >
                    <span className="mr-2">📎</span>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">
                        {attachment.originInfo?.fileName || attachment.fileName || 'Unknown file'}
                      </div>
                      {attachment.originInfo?.fileSize && (
                        <div className="text-blue-200 text-[10px]">
                          {formatFileSize(attachment.originInfo.fileSize)}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          <>
            <div className="prose prose-sm max-w-none" data-message-id={messageId}>
              <ReactMarkdown 
                remarkPlugins={[remarkGfm, remarkMath]} 
                rehypePlugins={[rehypeKatex]}
              >
                {renderMarkdown(processedData.content)}
              </ReactMarkdown>
            </div>
            
            {/* Metadata section - show if exists */}
            {processedData.hasMetadata && processedData.metadata && (
              <div className="mt-4 pt-3 border-t border-gray-300">
                <div className="flex items-center justify-between mb-2">
                  <button
                    onClick={() => setShowMetadata(!showMetadata)}
                    className="flex items-center space-x-2 text-sm font-semibold text-blue-600 hover:text-blue-800 transition-colors"
                  >
                    {showMetadata ? (
                      <>
                        <BiChevronUp className="w-4 h-4" />
                        <span>Ẩn Metadata</span>
                      </>
                    ) : (
                      <>
                        <BiChevronDown className="w-4 h-4" />
                        <span>Xem Metadata</span>
                      </>
                    )}
                  </button>
                  
                  <div className="flex items-center space-x-2">
                    {/* Update database button - only show if has metadata */}
                    {processedData.hasMetadata && (
                      <button
                        onClick={() => setShowUpdateModal(true)}
                        className="flex items-center space-x-1 text-xs text-white bg-green-600 hover:bg-green-700 px-3 py-1.5 rounded transition-colors"
                        title="Cập nhật cơ sở dữ liệu"
                      >
                        <AiOutlineDatabase className="w-3 h-3" />
                        <span>Cập nhật CSDL</span>
                      </button>
                    )}
                    
                    {/* Copy metadata button */}
                    {showMetadata && (
                      <button
                        onClick={handleCopyMetadata}
                        className="flex items-center space-x-1 text-xs text-gray-600 hover:text-gray-800 bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded transition-colors"
                        title={copiedMetadata ? "Đã sao chép!" : "Sao chép metadata JSON"}
                      >
                        {copiedMetadata ? (
                          <>
                            <BiCheck className="w-3 h-3 text-green-600" />
                            <span className="text-green-600">Đã copy</span>
                          </>
                        ) : (
                          <>
                            <BiCopy className="w-3 h-3" />
                            <span>Copy JSON</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
                
                {showMetadata && (
                  <div className="bg-gray-50 rounded-lg p-3 overflow-auto max-h-96">
                    <JsonView 
                      data={processedData.metadata} 
                      shouldExpandNode={allExpanded}
                      style={defaultStyles}
                    />
                  </div>
                )}
              </div>
            )}
        
            {/* Display attachments for bot messages if any */}
            {attachments && attachments.length > 0 && (
              <div className="mt-3 pt-2 border-t border-gray-300 space-y-1">
                {attachments.map((attachment, index) => (
                  <div 
                    key={index} 
                    className="flex items-center text-xs bg-gray-200 rounded px-2 py-1"
                  >
                    <span className="mr-2">📎</span>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate text-gray-700">
                        {attachment.originInfo?.fileName || attachment.fileName || 'Unknown file'}
                      </div>
                      {attachment.originInfo?.fileSize && (
                        <div className="text-gray-500 text-[10px]">
                          {formatFileSize(attachment.originInfo.fileSize)}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
      
      {/* Action buttons - only show for bot messages */}
      {!isUser && messageId && (
        <div className="absolute -bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex space-x-1">
          {/* Copy button */}
          <button
            onClick={handleCopy}
            className="bg-white border border-gray-300 rounded-full p-1.5 shadow-md hover:bg-gray-50"
            title={copied ? "Đã sao chép!" : "Sao chép nội dung"}
          >
            {copied ? (
              <BiCheck className="w-4 h-4 text-green-600" />
            ) : (
              <BiCopy className="w-4 h-4 text-gray-600" />
            )}
          </button>
          
          {/* Reply button */}
          {onReply && (
            <button
              onClick={() => onReply(messageId, content)}
              className="bg-white border border-gray-300 rounded-full p-1.5 shadow-md hover:bg-gray-50"
              title="Trả lời tin nhắn này"
            >
              <BiReply className="w-4 h-4 text-gray-600" />
            </button>
          )}
        </div>
      )}
      
      {/* Update Database Modal */}
      <UpdateDatabaseModal
        isOpen={showUpdateModal}
        onClose={() => setShowUpdateModal(false)}
        data={processedData.hasMetadata ? { content: processedData.content, metadata: processedData.metadata } : { content: processedData.content }}
        onUpdate={handleUpdateDatabase}
      />
    </div>
  );
};

export default MessageRenderer;