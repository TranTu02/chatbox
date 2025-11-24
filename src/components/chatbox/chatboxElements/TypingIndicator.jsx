import React from 'react';

const TypingIndicator = ({ isVisible = false }) => {
	if (!isVisible) return null;

	return (
		<div className="flex items-center space-x-2 px-4 py-2 mb-2">
			<div className="flex items-center space-x-1">
				<div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
					<span className="text-white font-bold text-xs">AI</span>
				</div>
				<div className="bg-gray-100 rounded-lg px-4 py-2">
					<div className="flex space-x-1">
						<div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
						<div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
						<div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
					</div>
				</div>
			</div>
		</div>
	);
};

export default TypingIndicator;