import { createContext, useContext, useState, useEffect } from 'react';
import api from '../lib/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Check if token exists
        const token = localStorage.getItem('token');
        if (token) {
            // Decode token to get user info (optional, or just trust token presence for layout)
            // For now, we just set a dummy user object if token exists, 
            // or we could fetch user profile if backend had /me endpoint.
            // We'll trust the token.
            setUser({ token });
        }
        setLoading(false);
    }, []);

    const login = async (email, password) => {
        try {
            const { data } = await api.post('/auth/login', { email, password });
            localStorage.setItem('token', data.token);
            setUser({ token: data.token, email });
            return { success: true };
        } catch (error) {
            console.error('Login failed', error);
            return {
                success: false,
                error: error.response?.data?.error || 'Login failed'
            };
        }
    };

    const logout = () => {
        localStorage.removeItem('token');
        setUser(null);
    };

    const registerAdmin = async (email, password) => {
        try {
            await api.post('/auth/register', { email, password });
            return { success: true };
        } catch (error) {
            return {
                success: false,
                error: error.response?.data?.error || 'Registration failed'
            };
        }
    }

    return (
        <AuthContext.Provider value={{ user, login, logout, registerAdmin, loading }}>
            {!loading && children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
