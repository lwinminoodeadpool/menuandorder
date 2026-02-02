import { createContext, useState, useContext, useEffect } from 'react';
import api from '../lib/api';
import toast from 'react-hot-toast';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    // Try to load user from localStorage on boot
    const [user, setUser] = useState(() => {
        try {
            const saved = localStorage.getItem('customer_user');
            return saved ? JSON.parse(saved) : null;
        } catch (e) { return null; }
    });

    const [loading, setLoading] = useState(false);

    // Login
    const login = async (email, password) => {
        setLoading(true);
        try {
            const { data } = await api.post('/auth/user/login', { email, password });

            // Save data
            localStorage.setItem('customer_token', data.token);
            localStorage.setItem('customer_user', JSON.stringify(data.user));

            setUser(data.user);
            toast.success('Welcome back!');
            return { success: true };
        } catch (error) {
            const msg = error.response?.data?.error || 'Login failed';
            // toast.error(msg); // Let the component handle UI error if needed, or keeping it global here
            return { success: false, error: msg };
        } finally {
            setLoading(false);
        }
    };

    // Register
    const register = async (formData) => {
        setLoading(true);
        try {
            const { data } = await api.post('/auth/user/register', formData);

            // Save data
            localStorage.setItem('customer_token', data.token);
            localStorage.setItem('customer_user', JSON.stringify(data.user));

            setUser(data.user);
            toast.success('Account created!');
            return { success: true };
        } catch (error) {
            const msg = error.response?.data?.error || 'Registration failed';
            return { success: false, error: msg };
        } finally {
            setLoading(false);
        }
    };

    // Logout
    const logout = () => {
        localStorage.removeItem('customer_token');
        localStorage.removeItem('customer_user');
        setUser(null);
        toast.success('Logged out');
    };

    return (
        <AuthContext.Provider value={{ user, login, register, logout, loading }}>
            {children}
        </AuthContext.Provider>
    );
};
