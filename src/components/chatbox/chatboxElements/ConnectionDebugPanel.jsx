import React from 'react';
import { useWebSocket } from '../../../contexts/WebSocketContext';
import Config from '../../../config/config';

const ConnectionDebugPanel = () => {
	const { connectionStatus, error, connectionAttempts, getConnectionInfo } = useWebSocket();
	
	if (connectionStatus === 'disabled') {
		return (
			<div className="bg-blue-50 border-l-4 border-blue-400 px-6 py-2">
				<div className="flex items-center justify-between">
					<span className="text-sm font-medium text-blue-800">📡 HTTP-Only Mode - WebSocket đã tắt</span>
					<code className="text-xs bg-blue-100 px-2 py-1 rounded text-blue-700">{Config.backendUrl}</code>
				</div>
			</div>
		);
	}

	// Show reconnecting status
	if (connectionStatus === 'reconnecting' || (connectionStatus === 'disconnected' && connectionAttempts > 0 && connectionAttempts <= 5)) {
		return (
			<div className="bg-yellow-50 border-l-4 border-yellow-400 px-6 py-2">
				<div className="flex items-center justify-between">
					<span className="text-sm font-medium text-yellow-800">⚡ Đang kết nối lại WebSocket...</span>
					<div className="flex items-center space-x-3">
						<span className="text-sm text-yellow-700 font-medium">{connectionAttempts}/5</span>
						<div className="flex space-x-1">
							<div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
							<div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse" style={{animationDelay: '0.2s'}}></div>
							<div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse" style={{animationDelay: '0.4s'}}></div>
						</div>
					</div>
				</div>
			</div>
		);
	}

	if (connectionStatus === 'error' || connectionStatus === 'reconnect_failed') {
		return (
			<div className="bg-red-50 border-l-4 border-red-400 px-6 py-2">
				<div className="flex items-center justify-between">
					<span className="text-sm font-medium text-red-800">
						{connectionStatus === 'reconnect_failed' ? '❌ Kết nối thất bại - Sử dụng HTTP API' : '⚠️ Lỗi WebSocket - Fallback HTTP'}
					</span>
					<div className="flex items-center space-x-3">
						<span className="text-sm text-red-700 font-medium">{connectionAttempts}/5</span>
						<button
							onClick={() => window.location.reload()}
							className="text-xs bg-red-100 hover:bg-red-200 text-red-800 px-3 py-1 rounded transition-colors"
						>
							Retry
						</button>
					</div>
				</div>
			</div>
		);
	}

	return null; // Don't show anything for connected or connecting states
};

export default ConnectionDebugPanel;