import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiRequest } from '../api';
// Keeps track of the logged-in user (OTP login, logout)
const AuthContext = createContext(undefined);
export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(localStorage.getItem('anmol_token'));
    const [isLoading, setIsLoading] = useState(true);
    useEffect(() => {
        const fetchMe = async () => {
            if (!token) {
                setIsLoading(false);
                return;
            }
            try {
                const data = await apiRequest('/auth/me');
                setUser(data.user);
            }
            catch (err) {
                console.warn('Session expired or invalid token');
                localStorage.removeItem('anmol_token');
                setToken(null);
                setUser(null);
            }
            finally {
                setIsLoading(false);
            }
        };
        fetchMe();
    }, [token]);
    // Called after a successful OTP check. Saves the token and the user.
    const saveLogin = (data) => {
        localStorage.setItem('anmol_token', data.token);
        setToken(data.token);
        setUser(data.user);
        return data.user;
    };    const logout = () => {
        localStorage.removeItem('anmol_token');
        setToken(null);
        setUser(null);
    };
    return (<AuthContext.Provider value={{ user, token, saveLogin, logout, isLoading }}>
      {children}
    </AuthContext.Provider>);
};
export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context)
        throw new Error('useAuth must be used within AuthProvider');
    return context;
};
