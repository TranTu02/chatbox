// Environment Configuration
class Config {
  static get backendUrl() {
    return import.meta.env.VITE_BACKEND_URL || 'https://black.irdop.org';
  }

  static get appId() {
    return import.meta.env.VITE_APP_ID || 'LIMS-IRDOP-DEV';
  }

  static get websocketUrl() {
    return import.meta.env.VITE_WEBSOCKET_URL || 'wss://black.irdop.org/ws/v1/gen_ai/chat';
  }

  static get websocketEnabled() {
    return import.meta.env.VITE_WEBSOCKET_ENABLED === 'true';
  }

  static get isDevelopment() {
    return import.meta.env.DEV;
  }

  static get isProduction() {
    return import.meta.env.PROD;
  }
}

export default Config;