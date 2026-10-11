import React, { createContext, useContext, useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { apiRequest } from '../api';
const NotificationContext = createContext(undefined);
export const NotificationProvider = ({ children }) => {
    const { user } = useAuth();
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [activeToast, setActiveToast] = useState(null);
    const isManagerOrOwner = user && (user.role === 'owner' || user.role === 'manager');
    const fetchNotifications = async () => {
        if (!isManagerOrOwner)
            return;
        try {
            const data = await apiRequest('/admin/notifications/admin');
            setNotifications(data.notifications || []);
            setUnreadCount(data.unread_count || 0);
        }
        catch (err) {
            // Ignore unauthorized or network errors
        }
    };
    useEffect(() => {
        if (isManagerOrOwner) {
            fetchNotifications();
            // Connect WebSockets
            const socket = io('http://localhost:5000');
            socket.emit('join_manager_room');
            socket.on('manager_notification', (data) => {
                console.log('⚡ INSTANT WEBSOCKET BOOKING NOTIFICATION RECEIVED:', data);
                // Show floating Gold Toast Popup
                setActiveToast(data);
                // Prepend to notification list
                setNotifications((prev) => [data, ...prev]);
                setUnreadCount((prev) => prev + 1);
                // Play subtle luxury notification sound chime
                try {
                    const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
                    audio.volume = 0.5;
                    audio.play().catch(() => { });
                }
                catch (e) { }
            });
            return () => {
                socket.disconnect();
            };
        }
    }, [user]);
    const markAsRead = async (id) => {
        try {
            await apiRequest(`/admin/notifications/admin/${id}/read`, { method: 'PATCH' });
            setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
            setUnreadCount((prev) => Math.max(0, prev - 1));
        }
        catch (err) { }
    };
    const markAllAsRead = async () => {
        try {
            await apiRequest('/admin/notifications/admin/read-all', { method: 'PATCH' });
            setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
            setUnreadCount(0);
        }
        catch (err) { }
    };
    const dismissToast = () => setActiveToast(null);
    return (<NotificationContext.Provider value={{
            notifications,
            unreadCount,
            activeToast,
            dismissToast,
            markAsRead,
            markAllAsRead,
            refreshNotifications: fetchNotifications,
        }}>
      {children}
    </NotificationContext.Provider>);
};
export const useNotifications = () => {
    const context = useContext(NotificationContext);
    if (!context)
        throw new Error('useNotifications must be used within NotificationProvider');
    return context;
};
