const API_BASE = (process.env.REACT_APP_BACKEND_URL || '').replace(/\/+$/, '');

if (!API_BASE) {
  console.warn('REACT_APP_BACKEND_URL is not configured');
}

export default API_BASE;
export const apiUrl = (path) => `${API_BASE}${path}`;
