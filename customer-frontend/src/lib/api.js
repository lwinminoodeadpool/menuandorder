import axios from 'axios';

// Use the deployed backend URL
const API_URL = 'https://21nq09ct1g.execute-api.eu-north-1.amazonaws.com/default';

const api = axios.create({
    baseURL: API_URL,
});

// Add a request interceptor to attach the Token
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('customer_token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

export default api;
