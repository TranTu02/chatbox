import React from 'react';
import { HiMenu } from 'react-icons/hi';
import { useWebSocket } from '../../../contexts/WebSocketContext';
import { useModel } from '../../../contexts/ModelContext';
import Config from '../../../config/config';
import ModelSelector from './ModelSelector';

const ChatHeader = ({ onToggleSidebar, classifierCode, onClassifierCodeChange }) => {
	const { connectionStatus, isConnected, error, getConnectionInfo } = useWebSocket();
	const { selectedModel, getModelById } = useModel();

	const getStatusColor = () => {
		switch (connectionStatus) {
			case 'connected': return 'text-green-500';
			case 'connecting': return 'text-yellow-500';
			case 'disconnected': return 'text-red-500';
			case 'disabled': return 'text-blue-500';
			case 'error': 
			case 'reconnect_failed': return 'text-red-600';
			default: return 'text-gray-500';
		}
	};

	const getStatusText = () => {
		switch (connectionStatus) {
			case 'connected': return 'Connected';
			case 'connecting': return 'Connecting...';
			case 'disconnected': return 'Disconnected';
			case 'disabled': return 'HTTP Only';
			case 'error': return 'Connection Error';
			case 'reconnect_failed': return 'Reconnect Failed';
			default: return 'Unknown Status';
		}
	};

	const getStatusIcon = () => {
		switch (connectionStatus) {
			case 'connected': return '🟢';
			case 'connecting': return '🟡';
			case 'disconnected': return '🔴';
			case 'disabled': return '🔵';
			case 'error': 
			case 'reconnect_failed': return '❌';
			default: return '⚪';
		}
	};

	const handleConnectionInfo = () => {
		const info = getConnectionInfo();
		console.log('🔍 Connection Debug Info:', info);
		alert(`WebSocket Debug Info:
Status: ${info.status}
WebSocket URL: ${info.websocketUrl}
Backend URL: ${info.backendUrl}
App ID: ${info.appId}
Connection Attempts: ${info.attempts}
Error: ${info.error ? JSON.stringify(info.error) : 'None'}`);
	};

	return (
		<div className="bg-white border-b border-gray-200 shadow-sm overflow-x-auto scrollbar-hide">
			<div className="px-4 py-2 min-w-max">
				<div className="flex justify-between items-center space-x-1">
					<div className="flex items-center space-x-1">
						{/* Sidebar Toggle Button */}
						{onToggleSidebar && (
							<button
								onClick={onToggleSidebar}
								className="p-2 hover:bg-gray-200 rounded-lg transition-colors lg:hidden bg-white"
								aria-label="Toggle sidebar"
							>
								<HiMenu className="w-6 h-6 text-gray-600" />
							</button>
						)}
						
						<div className="flex items-center space-x-1">
							<div className="min-w-10 w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
								<span className="text-white font-bold text-xs">CHAT</span>
							</div>
							<div>
								<h1 className="text-lg font-semibold text-gray-800 m-0 p-0">ChatBox</h1>
								<p className="text-xs text-gray-500 line-clamp-1">Intelligent Assistant</p>
							</div>
						</div>
						
						{/* Model Selector */}
						<div className="hidden lg:block">
							<ModelSelector />
						</div>
						
						{/* Classifier Code Selector - Desktop */}
						<div className="hidden lg:flex items-center space-x-2 px-3 py-0">
							<label className="flex items-center space-x-2 text-sm">
								<span className="font-medium text-gray-800 whitespace-nowrap">
									Tùy chọn đoạn chat:
								</span>
								<select
									value={classifierCode}
									onChange={(e) => onClassifierCodeChange(e.target.value)}
									className="px-3 py-1.5 text-sm text-gray-800 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white shadow-sm hover:border-blue-400 transition-colors cursor-pointer"
								>
									<option value="">💬 Tra cứu thông tin</option>
									<option value="PROTOCOL_DOCUMENT">📋 Trích xuất phương pháp</option>
								</select>
							</label>
						</div>
					</div>
					
					<div className="flex items-center space-x-4">
						{/* Mobile Model Selector */}
						<div className="block lg:hidden">
							<ModelSelector />
						</div>
						
						{/* Mobile Classifier Code Selector */}
						<div className="block lg:hidden">
							<select
								value={classifierCode}
								onChange={(e) => onClassifierCodeChange(e.target.value)}
								className="px-2 py-1.5 text-sm font-semibold text-gray-800 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
							>
								<option value="">💬 Tra cứu</option>
								<option value="PROTOCOL_DOCUMENT">📋 Trích xuất</option>
							</select>
						</div>
						
						<div 
							className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 px-2 py-1 rounded-lg transition-colors"
							onClick={handleConnectionInfo}
							title="Click để xem thông tin debug kết nối"
						>
							<span className="text-sm">{getStatusIcon()}</span>
							<span className={`text-sm font-medium ${getStatusColor()}`}>
								{getStatusText()}
							</span>
							{error && (
								<span className="text-xs text-red-500 ml-1">!</span>
							)}
						</div>
						
						<div className="text-xs text-gray-500 hidden md:block px-2 py-1 bg-gray-100 rounded-lg">
							{Config.appId}
						</div>
					</div>
				</div>
			</div>
		</div>
	);
};

export default ChatHeader;