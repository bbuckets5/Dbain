// components/UserContext.js
'use client';

import { createContext, useState, useEffect, useContext } from 'react';
import { useRouter } from 'next/navigation';

const UserContext = createContext();

export const UserProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [cart, setCart] = useState([]);
    const router = useRouter();

    useEffect(() => {
        const loadInitialData = async () => {
            // Load cart from localStorage
            if (typeof window !== 'undefined') {
                const storedCart = localStorage.getItem('cartItems');
                if (storedCart) {
                    setCart(JSON.parse(storedCart));
                }
            }

            // Fetch user profile. The browser automatically sends the cookie.
            try {
                const response = await fetch('/api/users/profile');
                if (response.ok) {
                    const userData = await response.json();
                    setUser(userData);
                } else {
                    setUser(null);
                }
            } catch (error) {
                console.error("Failed to fetch initial user profile:", error);
                setUser(null);
            }
            setLoading(false);
        };
        loadInitialData();
    }, []);
    
    const login = async (email, password) => {
        try {
            const response = await fetch('/api/users/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            });

            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.message || 'Login failed.');
            }
            
            // The API now returns the full user object, so we set it here.
            setUser(data);
            return { success: true, user: data };

        } catch (error) {
            console.error("Login process error:", error);
            return { success: false, message: error.message };
        }
    };

    const logout = async () => {
        try {
            await fetch('/api/users/logout', { method: 'POST' });
        } catch (error) {
            console.error("Logout API call failed:", error);
        }
        setUser(null);
        setCart([]);
        if (typeof window !== 'undefined') {
            localStorage.removeItem('cartItems');
        }
        router.push('/login');
    };

    const addToCart = (newItem) => {
        let updatedCart;
        const existingItemIndex = cart.findIndex(item => item.id === newItem.id);

        if (existingItemIndex > -1) {
            updatedCart = cart.map((item, index) => 
                index === existingItemIndex 
                ? { ...item, quantity: item.quantity + newItem.quantity } 
                : item
            );
        } else {
            updatedCart = [...cart, newItem];
        }
        setCart(updatedCart);
        localStorage.setItem('cartItems', JSON.stringify(updatedCart));
    };
 
    const removeFromCart = (itemId) => {
        const updatedCart = cart.filter(item => item.id !== itemId);
        setCart(updatedCart);
        localStorage.setItem('cartItems', JSON.stringify(updatedCart));
    };
 
    const clearCart = () => {
        setCart([]);
        localStorage.removeItem('cartItems');
    };

    const cartCount = cart.reduce((count, item) => count + item.quantity, 0);

    return (
        <UserContext.Provider value={{ 
            user, 
            loading, 
            login,
            logout,
            cart,
            addToCart,
            removeFromCart,
            clearCart,
            cartCount 
        }}>
            {children}
        </UserContext.Provider>
    );
};

export const useUser = () => useContext(UserContext);