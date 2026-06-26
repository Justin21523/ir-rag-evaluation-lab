import axios from 'axios';

declare global {
  interface Window {
    __IR_RAG_EVAL_CONFIG__?: {
      apiBaseUrl?: string;
    };
  }
}

const apiBaseUrl =
  window.__IR_RAG_EVAL_CONFIG__?.apiBaseUrl ||
  import.meta.env.VITE_API_BASE_URL ||
  '/api/v1';

export const apiClient = axios.create({
  baseURL: apiBaseUrl,
  timeout: 10000,
});
