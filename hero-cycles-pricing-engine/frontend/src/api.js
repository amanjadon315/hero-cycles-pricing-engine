// api.js
// Thin fetch wrapper around the backend API. Centralizing this means the
// base URL only needs to change in one place, and error handling is consistent.

const BASE_URL = import.meta.env.VITE_API_URL || '/api';

async function request(path, options = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });

  const isJson = res.headers.get('content-type')?.includes('application/json');
  const body = isJson ? await res.json() : null;

  if (!res.ok) {
    const message = body?.error || `Request failed with status ${res.status}`;
    const error = new Error(message);
    error.status = res.status;
    error.details = body?.details;
    throw error;
  }

  return body;
}

export const api = {
  getModels: () => request('/models'),
  getModel: (id) => request(`/models/${id}`),

  getParts: (category) => request(`/parts${category ? `?category=${category}` : ''}`),
  getPartHistory: (id) => request(`/parts/${id}/history`),
  createPart: (data) => request('/parts', { method: 'POST', body: JSON.stringify(data) }),
  updatePartPrice: (id, price, note) =>
    request(`/parts/${id}/price`, { method: 'PATCH', body: JSON.stringify({ price, note }) }),

  priceConfiguration: (modelId, selections) =>
    request('/configurations/price', { method: 'POST', body: JSON.stringify({ modelId, selections }) }),
  saveConfiguration: (data) => request('/configurations', { method: 'POST', body: JSON.stringify(data) }),
  getConfigurations: () => request('/configurations'),
  getConfiguration: (id) => request(`/configurations/${id}`),
};
