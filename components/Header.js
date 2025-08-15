// In components/Header.js
"use client";

import Link from 'next/link';
import Image from 'next/image'; // Added this import
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from './UserContext';

export default function Header() {
    const { user, loading, logout, cart, cartCount, removeFromCart } = useUser();

    const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
    const [isCartOpen, setIsCartOpen] = useState(false);

    const headerRef = useRef(null);
    const router = useRouter();

    // Totals for dropdown summary
    const subtotal = cart.reduce((acc, item) => acc + (Number(item.price) * item.quantity), 0);
    const serviceFee = subtotal * 0.05;
    const total = subtotal + serviceFee;

    const toggleUserMenu = (e) => {
        e?.preventDefault?.();
        setIsUserMenuOpen(!isUserMenuOpen);
        setIsCartOpen(false);
    };

    const toggleCart = (e) => {
        e?.preventDefault?.();
        setIsCartOpen(!isCartOpen);
        setIsUserMenuOpen(false);
    };

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (headerRef.current && !headerRef.current.contains(event.target)) {
                setIsUserMenuOpen(false);
                setIsCartOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    if (loading) return <header className="main-header"></header>;

    return (
        <header className="main-header" ref={headerRef}>
            <Link href="/" className="logo-link">
                <div className="logo-area">
                    {/* FIXED: Replaced <img> with <Image /> for optimization */}
                    <Image 
                        className="logo-img" 
                        src="/images/Clicketicketslogo.png" 
                        alt="Click eTickets Logo" 
                        width={200} // Adjust these values as needed for your design
                        height={50} // Adjust these values as needed for your design
                    />
                    {/* FIXED: Replaced unescaped quotes with &quot; */}
                    <p className="tagline">Click eTickets: &quot;Click It For Ticket!&quot;</p>
                </div>
            </Link>

            <nav className="main-nav">
                {/* USER MENU */}
                <div className="user-dropdown-wrapper">
                    <a href="#" className="nav-icon-link" aria-label="User Account" onClick={toggleUserMenu}>
                        <i className="fas fa-user-circle"></i>
                    </a>
                    <div className={`user-dropdown-menu glass ${isUserMenuOpen ? 'active' : ''}`}>
                        {user ? (
                            <>
                                <Link href="/my-profile" onClick={() => setIsUserMenuOpen(false)}>Profile</Link>
                                <Link href="/my-tickets" onClick={() => setIsUserMenuOpen(false)}>My Tickets</Link>
                                <a href="#" onClick={logout}>Log Out</a>
                            </>
                        ) : (
                            <>
                                <Link href="/login" onClick={() => setIsUserMenuOpen(false)}>Log In</Link>
                                <Link href="/signup" onClick={() => setIsUserMenuOpen(false)}>Sign Up</Link>
                            </>
                        )}
                    </div>
                </div>

                {/* CART DROPDOWN */}
                <div className="cart-dropdown-wrapper">
                    <a href="#" className="nav-icon-link" aria-label="Shopping Cart" onClick={toggleCart}>
                        <i className="fas fa-shopping-cart"></i>
                        {cartCount > 0 && <span className="cart-count">{cartCount}</span>}
                    </a>

                    <div className={`cart-dropdown-menu glass ${isCartOpen ? 'active' : ''}`}>
                        <div id="cart-items-list">
                            {cart && cart.length > 0 ? (
                                cart.map(item => (
                                    <div key={item.id} className="cart-item">
                                        <div className="cart-item-info">
                                            {/* Old look: event bold, rest normal */}
                                            <h4>{item.eventName}</h4>
                                            <p>{item.name} - ${Number(item.price).toFixed(2)}</p>
                                            <p>Quantity: {item.quantity}</p>
                                        </div>

                                        <button
                                            className="remove-from-cart-btn"
                                            aria-label="Remove from cart"
                                            onClick={() => removeFromCart(item.id)}
                                        >
                                            &times;
                                        </button>
                                    </div>
                                ))
                            ) : (
                                <p className="cart-empty-msg">Your cart is empty.</p>
                            )}
                        </div>

                        {/* Price breakdown */}
                        {cart && cart.length > 0 && (
                            <div className="cart-summary-totals">
                                <div className="summary-line">
                                    <span>Subtotal</span>
                                    <span>${subtotal.toFixed(2)}</span>
                                </div>
                                <div className="summary-line">
                                    <span>Service Fee (5%)</span>
                                    <span>${serviceFee.toFixed(2)}</span>
                                </div>
                                <div className="summary-total">
                                    <span>Total</span>
                                    <span>${total.toFixed(2)}</span>
                                </div>
                            </div>
                        )}

                        {cart && cart.length > 0 && (
                            <div className="cart-footer">
                                <Link href="/checkout" className="cta-button checkout-btn">Continue to Checkout</Link>
                            </div>
                        )}
                    </div>
                </div>
            </nav>
        </header>
    );
}
