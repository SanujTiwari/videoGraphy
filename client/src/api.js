export const SERVER_URL = 'http://localhost:5000';
const API_BASE_URL = SERVER_URL + '/api';
export async function apiRequest(endpoint, options = {}) {
    const token = localStorage.getItem('anmol_token');
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers,
    };
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers,
    });
    const data = await response.json();
    if (!response.ok) {
        throw new Error(data.error || 'API Request failed');
    }
    return data;
}
