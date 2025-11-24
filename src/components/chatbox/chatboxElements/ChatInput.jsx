import React, { useState, useContext, useRef, useEffect } from 'react';
import { AiOutlinePaperClip, AiOutlineSend, AiOutlineClose, AiOutlineLoading3Quarters } from 'react-icons/ai';
import { GlobalContext } from '../../../contexts/GlobalContext';
import { useWebSocket } from '../../../contexts/WebSocketContext';
import { useModel } from '../../../contexts/ModelContext';
import { useChatContext } from '../../../contexts/ChatContext';
import chatAPIService from '../../../services/ChatAPIService';
import Config from '../../../config/config';

const ChatInput = ({ onSetReply, classifierCode, onClassifierCodeChange, onSetFileInput }) => {
	const [message, setMessage] = useState('');
	const [selectedFiles, setSelectedFiles] = useState([]); // Raw File objects
	const [uploadedFiles, setUploadedFiles] = useState([]); // Files with upload status and fileIds
	const [replyToMessageId, setReplyToMessageId] = useState(null); // For replying to specific message
	const [replyToContent, setReplyToContent] = useState(''); // Content of message being replied to
	const [isDragging , setIsDragging] = useState(false);
	
	// Debug: Log when replyToMessageId changes
	useEffect(() => {
		console.log('🔄 replyToMessageId changed:', replyToMessageId, 'content:', replyToContent?.slice(0, 30));
	}, [replyToMessageId, replyToContent]);
	
	const { addMessage, handleBotResponse } = useContext(GlobalContext);
	const { sendMessage, isConnected } = useWebSocket();
	const { selectedModel } = useModel();
	const { currentContextId, addMessage: addChatMessage, lastMessageId, resetLastMessageId } = useChatContext();
	const textareaRef = useRef(null);

	// Expose setReply function to parent
	useEffect(() => {
		if (onSetReply) {
			console.log('🔧 Registering reply handler in ChatInput');
			onSetReply((messageId, content) => {
				console.log('📝 Setting reply:', messageId, content?.slice(0, 50));
				setReplyToMessageId(messageId);
				setReplyToContent(content);
				// Focus on input
				textareaRef.current?.focus();
			});
		}
	}, [onSetReply]);

	// Expose file input function to parent (for drag and drop from ChatMessages)
	useEffect(() => {
		if (onSetFileInput) {
			onSetFileInput((files) => {
				setSelectedFiles(prev => [...prev, ...files]);
			});
		}
	}, [onSetFileInput]);

	// Auto-resize textarea function
	const adjustTextareaHeight = () => {
		if (textareaRef.current) {
			textareaRef.current.style.height = 'auto';
			const scrollHeight = textareaRef.current.scrollHeight;
			const lineHeight = 24; // approximate line height in pixels
			const maxLines = 3;
			const minHeight = lineHeight * 1; // 1 line minimum
			const maxHeight = lineHeight * maxLines; // 3 lines maximum
			
			const newHeight = Math.min(Math.max(scrollHeight, minHeight), maxHeight);
			textareaRef.current.style.height = newHeight + 'px';
		}
	};

	const handleInputChange = (e) => {
		setMessage(e.target.value);
	};

	useEffect(() => {
		adjustTextareaHeight();
	}, [message]);

	const handleKeyPress = (e) => {
		if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault();
			handleSendMessage();
		}
	};

	const handleSendMessage = async () => {
		if (!message.trim() && uploadedFiles.length === 0) return;
		
		try {
			// Collect all uploaded file data from successfully uploaded files
			const filesData = uploadedFiles
				.filter(file => file.status === 'success' && file.fileData) // Only successfully uploaded files
				.map(file => file.fileData); // Return the entire object from API
			
			if (filesData.length > 0) {
				console.log(`📎 Collected ${filesData.length} file(s) to send:`, filesData);
			}
			
			// Step 1: Generate temporary messageId for user message
			const userMessageId = `temp-user-${Date.now()}`;
			
			// Step 2: Create user message in new format with attachments
			const userMessage = {
				messageId: userMessageId,
				contextId: currentContextId,
				message: {
					role: 'user',
					content: message
				},
				attachments: uploadedFiles
					.filter(f => f.status === 'success' && f.fileData)
					.map(f => f.fileData), // Use entire file data object
				classifierCode: classifierCode, // Store classifierCode in message
				createdAt: new Date().toISOString()
			};
			
			// Add to chat context
			addChatMessage(userMessage);
			
			// Also add to global context for compatibility
			addMessage({ user: { content: message, attachments: uploadedFiles.map(f => f.file) } });

			// Step 3: Prepare payload with files array
			const payload = {
				model: selectedModel,
				message: message
			};
			
			// Add classifierCode if selected
			if (classifierCode) {
				payload.classifierCode = classifierCode;
				console.log('🏷️ Including classifierCode:', classifierCode);
			}
			
			// Add files array if files were uploaded
			if (filesData.length > 0) {
				payload.files = filesData;
				console.log('📎 Including files in message:', filesData);
			}
			
			// Add contextId if exists (for continuing conversation)
			if (currentContextId) {
				payload.contextId = currentContextId;
				console.log('📎 Continuing conversation with contextId:', currentContextId);
			} else {
				console.log('🆕 Starting new conversation (no contextId)');
			}
			
			// Handle messageId logic:
			// 1. If replying to a message: use replyToMessageId and break the chain
			// 2. Otherwise: use lastMessageId to continue the chain
			if (replyToMessageId) {
				payload.messageId = replyToMessageId;
				console.log('↩️ Replying to messageId:', replyToMessageId);
				console.log('📝 Reply content preview:', replyToContent.slice(0, 50) + '...');
				console.log('🔗 Breaking message chain after reply');
				// Reset lastMessageId after sending (will be updated when bot responds)
				resetLastMessageId();
			} else if (lastMessageId) {
				payload.messageId = lastMessageId;
				console.log('🔗 Continuing message chain with lastMessageId:', lastMessageId);
			} else {
				console.log('🆕 Starting new message chain (no previous messageId)');
			}

			console.log('📤 Sending payload:', JSON.stringify(payload, null, 2));

			// Step 4: Send message via WebSocket or HTTP
			let result;
			
			if (isConnected) {
				// Try WebSocket first
				const wsMessage = {
					type: 'chat_message',
					endpoint: '/ws/v1/gen_ai/chat',
					data: payload,
					timestamp: new Date().toISOString(),
					appId: Config.appId,
				};

				const sent = sendMessage(wsMessage);
				if (!sent) {
					// Fallback to HTTP API
					result = await chatAPIService.sendMessage(payload);
				}
			} else {
				// Use HTTP API directly
				result = await chatAPIService.sendMessage(payload);
			}
			
			// Handle HTTP response (WebSocket responses are handled via WebSocketContext)
			if (result && !isConnected) {
				if (result.payload && result.payload.role && result.payload.content) {
					handleBotResponse(result);
				} else if (result.role && result.content) {
					handleBotResponse(result);
				}
			}
			
			// Step 5: Reset input
			setMessage('');
			setSelectedFiles([]);
			setUploadedFiles([]);
			setReplyToMessageId(null);
			setReplyToContent('');
			if (textareaRef.current) {
				textareaRef.current.style.height = 'auto';
			}
			
			// Step 6: Reset classifierCode to default "tra cứu thông tin" after sending
			if (onClassifierCodeChange) {
				onClassifierCodeChange('tra_cuu_thong_tin');
				console.log('🔄 Reset classifierCode to "tra_cuu_thong_tin"');
			}
			
		} catch (error) {
			console.error('Error sending message:', error);
			const errorResponse = {
				role: 'system',
				content: `❌ **Lỗi gửi tin nhắn**\n\n${error.message}\n\nVui lòng thử lại sau.`
			};
			handleBotResponse(errorResponse);
		}
	};

	const handleCancelReply = () => {
		setReplyToMessageId(null);
		setReplyToContent('');
	};

	// Auto-upload files when selectedFiles changes
	useEffect(() => {
		const uploadNewFiles = async () => {
			// Get files that haven't been uploaded yet
			const newFiles = selectedFiles.filter(
				selectedFile => !uploadedFiles.some(uploaded => uploaded.file === selectedFile)
			);
			
			if (newFiles.length === 0) return;
			
			// Upload each new file individually
			for (const file of newFiles) {
				const tempId = `file-${Date.now()}-${Math.random()}`;
				
				// Add to uploadedFiles with 'uploading' status
				setUploadedFiles(prev => [...prev, {
					id: tempId,
					file: file,
					status: 'uploading',
					progress: 0,
					fileData: null, // Will store entire response object
					error: null
				}]);
				
				try {
					// Create FormData with single file
					const formData = new FormData();
					formData.append('file', file);
					
					// Upload and track progress
					const response = await chatAPIService.uploadFiles(
						formData,
						(progressEvent) => {
							const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
							setUploadedFiles(prev => prev.map(f =>
								f.id === tempId ? { ...f, progress: percentCompleted } : f
							));
						}
					);
					
					// API returns { opaiFileId, originInfo: {fileName, fileSize, mimeType }, localPath }
					if (response && response.opaiFileId) {
						setUploadedFiles(prev => prev.map(f =>
							f.id === tempId ? {
								...f,
								status: 'success',
								fileData: response, // Store entire response object
								progress: 100
							} : f
						));
						console.log(`✅ File uploaded successfully: ${file.name} -> ${response.opaiFileId}`);
					} else {
						throw new Error('No opaiFileId returned from server');
					}
				} catch (error) {
					console.error(`❌ Error uploading file ${file.name}:`, error);
					setUploadedFiles(prev => prev.map(f =>
						f.id === tempId ? {
							...f,
							status: 'error',
							error: error.message || 'Upload failed'
						} : f
					));
				}
			}
		};
		
		uploadNewFiles();
	}, [selectedFiles]); // Watch selectedFiles for changes

	const handleAttachFile = (e) => {
		// Convert FileList to Array and add to selectedFiles
		const files = Array.from(e.target.files);
		if (files.length === 0) return;
		
		setSelectedFiles(prev => [...prev, ...files]);
		
		// Reset input value to allow uploading same file again
		e.target.value = '';
	};

	const handleDragOver = (e) => {
		e.preventDefault();
		setIsDragging(true);
	};

	const handleDragLeave = (e) => {
		e.preventDefault();
		setIsDragging(false);
	};

	const handleDrop = (e) => {
		e.preventDefault();
		setIsDragging(false);
		
		// Convert FileList to Array and add to selectedFiles
		const files = Array.from(e.dataTransfer.files);
		if (files.length === 0) return;
		
		setSelectedFiles(prev => [...prev, ...files]);
	};

	const handleRemoveFile = (index) => {
		// Remove from uploadedFiles
		const removedFile = uploadedFiles[index];
		setUploadedFiles((prev) => prev.filter((_, i) => i !== index));
		
		// Also remove from selectedFiles if it's still there
		setSelectedFiles((prev) => prev.filter(f => f !== removedFile.file));
	};

	const formatFileSize = (bytes) => {
		if (bytes === 0) return '0 Bytes';
		const k = 1024;
		const sizes = ['Bytes', 'KB', 'MB', 'GB'];
		const i = Math.floor(Math.log(bytes) / Math.log(k));
		return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
	};

	return (
		<div className="flex flex-col w-full">
			{/* Reply Preview */}
			{replyToMessageId && (
				<div className="px-4 pt-3 pb-2 border-b border-gray-200 bg-blue-50">
					<div className="flex items-center justify-between gap-2">
						<div className="flex-1 min-w-0">
							<p className="text-xs text-blue-600 font-medium mb-1">↩️ Phản hồi cho:</p>
							<p className="text-sm text-gray-700 truncate">
								{replyToContent || 'Tin nhắn đã chọn'}
							</p>
						</div>
						<button
							onClick={handleCancelReply}
							className="flex-shrink-0 p-1.5 text-gray-500 hover:text-gray-700 hover:bg-blue-200 rounded-full transition-colors"
						>
							<AiOutlineClose className="w-4 h-4" />
						</button>
					</div>
				</div>
			)}
			
			{/* Attached Files */}
			{uploadedFiles.length > 0 && (
				<div className="px-4 pt-4 border-b border-gray-100">
					<div className="flex flex-wrap gap-2 mb-3">
						{uploadedFiles.map((fileObj, index) => (
							<div key={fileObj.id} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm ${
								fileObj.status === 'uploading' ? 'bg-yellow-50 border border-yellow-200' :
								fileObj.status === 'success' ? 'bg-blue-50 border border-blue-200' :
								'bg-red-50 border border-red-200'
							}`}>
								{/* Loading icon for uploading files */}
								{fileObj.status === 'uploading' && (
									<AiOutlineLoading3Quarters className="text-yellow-600 animate-spin flex-shrink-0" />
								)}
								
								<div className="flex-1 min-w-0">
									<div className={`font-medium truncate max-w-[200px] ${
										fileObj.status === 'success' ? 'text-blue-700' :
										fileObj.status === 'uploading' ? 'text-yellow-700' :
										'text-red-700'
									}`}>
										{fileObj.file.name}
									</div>
									<div className={`text-xs ${
										fileObj.status === 'success' ? 'text-blue-500' :
										fileObj.status === 'uploading' ? 'text-yellow-500' :
										'text-red-500'
									}`}>
										{fileObj.status === 'uploading' ? 'Đang tải...' :
										fileObj.status === 'success' ? formatFileSize(fileObj.file.size) :
										'Lỗi tải file'}
									</div>
								</div>
								
								<AiOutlineClose 
									className={`cursor-pointer transition-colors flex-shrink-0 ${
										fileObj.status === 'success' ? 'text-blue-500 hover:text-blue-700' :
										fileObj.status === 'uploading' ? 'text-yellow-500 hover:text-yellow-700' :
										'text-red-500 hover:text-red-700'
									}`}
									onClick={() => handleRemoveFile(index)} 
								/>
							</div>
						))}
					</div>
				</div>
			)}
			
			{/* Input Area */}
			<div 
				className="p-4"
				onDragOver={handleDragOver}
				onDragLeave={handleDragLeave}
				onDrop={handleDrop}
			>
				<div className={`flex items-start gap-3 bg-gray-50 rounded-xl p-3 transition-all ${
					isDragging ? 'border-2 border-blue-500 border-dashed bg-blue-50' : ''
				}`}>
					{/* File Attachment Button */}
					<label className="flex-shrink-0 p-2 text-gray-500 hover:text-gray-700 cursor-pointer rounded-lg hover:bg-white transition-colors">
						<AiOutlinePaperClip className="text-xl" />
						<input 
							type="file" 
							className="hidden" 
							onChange={handleAttachFile} 
							multiple 
							accept="image/*,.pdf,.doc,.docx,.txt"
						/>
					</label>
					
					{/* Text Input */}
					<div className="flex-1 relative">
						<textarea
							ref={textareaRef}
							rows={1}
							value={message}
							onChange={handleInputChange}
							onKeyPress={handleKeyPress}
							placeholder="Nhập tin nhắn của bạn... (Enter để gửi, Shift+Enter để xuống dòng)"
							className="w-full p-3 border-0 bg-white rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800 placeholder-gray-500"
							style={{ 
								minHeight: '24px',
								maxHeight: '72px', // 3 lines
								overflowY: 'auto',
								lineHeight: '24px'
							}}
							disabled={!isConnected && !Config.isDevelopment}
						/>
					</div>
					
					{/* Send Button */}
					<button 
						onClick={handleSendMessage} 
						disabled={
							(!message.trim() && uploadedFiles.length === 0) || 
							(!isConnected && !Config.isDevelopment) ||
							uploadedFiles.some(f => f.status === 'uploading') // Disable if any file is still uploading
						}
						className={`flex-shrink-0 p-2.5 rounded-lg transition-all duration-200 ${
							(!message.trim() && uploadedFiles.length === 0) || 
							(!isConnected && !Config.isDevelopment) ||
							uploadedFiles.some(f => f.status === 'uploading')
								? 'bg-gray-300 text-gray-500 cursor-not-allowed'
								: 'bg-blue-500 hover:bg-blue-600 text-white shadow-md hover:shadow-lg transform hover:scale-105'
						}`}
					>
						<AiOutlineSend className="text-xl" />
					</button>
				</div>
				
				{/* Helper Text */}
				<div className="flex justify-between items-center mt-2 px-1">
					<span className="text-xs text-gray-400">
						{uploadedFiles.some(f => f.status === 'uploading')
							? `📤 Đang tải ${uploadedFiles.filter(f => f.status === 'uploading').length} file...`
							: isConnected || Config.isDevelopment 
								? 'Enter để gửi • Shift+Enter để xuống dòng' 
								: 'WebSocket đang ngắt kết nối'
						}
					</span>
					<span className="text-xs text-gray-400">
						{message.length}/1000
					</span>
				</div>
			</div>
		</div>
	);
};

export default ChatInput;