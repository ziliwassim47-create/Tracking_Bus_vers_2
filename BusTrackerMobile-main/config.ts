// Server Configuration
// Backend server URL - same for both development and production
const SERVER_URL = 'http://localhost:4321';
export const API_BASE_URL = `${SERVER_URL}/api`;
export const GOMAPS_API_KEY = process.env.EXPO_PUBLIC_GOMAPS_API_KEY || '';

// Export SERVER_URL for Socket.io connections
export { SERVER_URL };

// Debug logging
console.log('═══════════════════════════════════════');
console.log('🔧 CONFIG LOADED');
console.log('🔧 SERVER_URL:', SERVER_URL);
console.log('🔧 API_BASE_URL:', API_BASE_URL);
console.log('═══════════════════════════════════════');
