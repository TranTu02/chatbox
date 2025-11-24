// tailwind.config.js
module.exports = {
	content: [
		'./src/**/*.{html,js,jsx,ts,tsx}', // Đảm bảo Tailwind tìm đúng các tệp của bạn
	],
	theme: {
		extend: {
			colors: {
				'side-bar': {
					light: '#f3f4f6',
					dark: '#1b1b1b',
				},
				'chat-box': {
					light: '#f9f9f9',
					dark: '#2b2b2b',
				},
				preview: {
					light: '#f3f4f6',
					dark: '#1b1b1b',
				},
				dark: '#1b1b1b',
			},
		},
	},
	plugins: [],
};
