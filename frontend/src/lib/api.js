import axios from 'axios';
import { API } from '../config';

// One axios instance: it adds the login token automatically, so pages no longer
// build their own Authorization headers.
const api = axios.create({ baseURL: API });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Turns a failed request into a sentence a person can act on.
export function getErrorMessage(error, fallback = 'Something went wrong. Please try again.') {
  if (error?.code === 'ERR_NETWORK') {
    return "Can't reach the server. Check your connection and try again.";
  }
  const detail = error?.response?.data?.detail;
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail) && detail.length > 0) {
    // FastAPI validation errors look like [{ loc: [...], msg: '...' }]
    return detail
      .map((d) => {
        const field = Array.isArray(d.loc) ? d.loc[d.loc.length - 1] : '';
        return field && field !== 'body' ? `${field}: ${d.msg}` : d.msg;
      })
      .join('. ');
  }
  return fallback;
}

export default api;
