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
            const token = localStorage.getItem('authToken');
            
            if (token) {
                try {
                    const response = await fetch('/api/users/profile', {
                        headers: {
                            'Authorization': `Bearer ${token}`
                        }
                    });
                    if (response.ok) {
                        const data = await response.json();
                        // Look for the user object inside the 'user' key
                        setUser(data.user); 
                    } else {
                        localStorage.removeItem('authToken');
                        setUser(null);
                    }
                } catch (error) {
                    console.error("Failed to fetch initial user profile:", error);
                    setUser(null);
                }
            }
            
            const storedCart = localStorage.getItem('cartItems');
            if (storedCart) {
                setCart(JSON.parse(storedCart));
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
            
            if (data.token && data.user) {
                localStorage.setItem('authToken', data.token);
                // Look for the user object inside the 'user' key
                setUser(data.user);
                return { success: true, user: data.user };
            } else {
                throw new Error('Login response was invalid.');
            }

        } catch (error) {
            console.error("Login process error:", error);
            return { success: false, message: error.message };
        }
    };

    const logout = async () => {
        localStorage.removeItem('authToken');
        setUser(null);
        setCart([]);
        localStorage.removeItem('cartItems');
        
        try {
            await fetch('/api/users/logout', { method: 'POST' });
        } catch (error) {
            console.error("Logout API call failed:", error);
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
