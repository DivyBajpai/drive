// API configuration that works in both development and production
export const API_BASE = import.meta.env.DEV 
  ? '/api' 
  : `${import.meta.env.BASE_URL}api`;

export const getApiUrl = (endpoint: string) => {
  // Remove leading slash from endpoint if present
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
  return `${API_BASE}/${cleanEndpoint}`;
};
