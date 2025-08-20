'use client';

import { useState, useEffect } from 'react';

// --- FIX #1: Add the same authenticated fetch helper from your other admin tabs ---
const authedFetch = async (url, options = {}) => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
    const headers = {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
    const body =
        options.body && typeof options.body !== 'string'
            ? JSON.stringify(options.body)
            : options.body;
    const res = await fetch(url, { ...options, headers, body });
    // Try to parse JSON, but default to an empty object if it fails
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
        // Use the message from the JSON body if available, otherwise use a default
        throw new Error(data.message || 'An API error occurred.');
    }
    return data;
};


export default function ManageUsersTab() {
    const [users, setUsers] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true); // Set to true to load initially
    const [error, setError] = useState(null);
    
    // --- FIX #2: Update fetchUsers to use authedFetch and handle initial load ---
    const fetchUsers = async (searchQuery = '') => {
        setLoading(true);
        setError(null);
        try {
            // Always fetch, but add search query if it exists
            const url = `/api/users?search=${encodeURIComponent(searchQuery)}`;
            const data = await authedFetch(url); // Use the authenticated fetch
            setUsers(data.users || []); // The API returns an object with a 'users' array
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        // Use a debounce effect for searching
        const handler = setTimeout(() => {
            fetchUsers(searchTerm);
        }, 500);

        return () => {
            clearTimeout(handler);
        };
    }, [searchTerm]);
    
    // Fetch users when the component first loads
    useEffect(() => {
        fetchUsers();
    }, []);

    // --- FIX #3: Update handleRoleChange to use authedFetch ---
    const handleRoleChange = async (userId, newRole) => {
        if (!confirm(`Are you sure you want to change this user's role to '${newRole}'?`)) return;

        try {
            await authedFetch(`/api/users/${userId}/role`, {
                method: 'PATCH',
                body: { role: newRole },
            });
            
            fetchUsers(searchTerm);
            alert('User role updated successfully!');

        } catch (err) {
            alert(`Error: ${err.message}`);
        }
    };

    const handleClearSearch = () => {
        setSearchTerm('');
    };

    return (
        <div id="manage-users" className="admin-section glass">
            <h2>User Management</h2>
            <p>View and manage user accounts and roles.</p>
            <div className="search-controls">
                <input 
                    type="search" 
                    id="user-search-input" 
                    placeholder="Search by Name or Email..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
                <button 
                    id="clear-search-btn" 
                    className="cta-button" 
                    onClick={handleClearSearch}
                >
                    Clear
                </button>
            </div>
            <div id="registered-users-list">
                {loading && <p className="loading-message">Loading users...</p>}
                {error && <p className="error-msg">{error}</p>}
                {!loading && !error && users.length === 0 && (
                    <p className="empty-msg">{searchTerm ? 'No users found for this search.' : 'No users found.'}</p>
                )}
                {!loading && !error && users.length > 0 && (
                    users.map(user => (
                        <div key={user._id} className="user-card glass">
                            <div className="user-details">
                                <p><strong>Name:</strong> {user.firstName} {user.lastName}</p>
                                <p><strong>Email:</strong> {user.email}</p>
                                <p><strong>Role:</strong> <span className={`role-indicator role-${user.role}`}>{user.role}</span></p>
                            </div>
                            <div className="user-actions">
                                {user.role === 'admin' ? (
                                    <button className="cta-button remove-admin-btn" onClick={() => handleRoleChange(user._id, 'user')}>
                                        Remove Admin
                                    </button>
                                ) : (
                                    <button className="cta-button make-admin-btn" onClick={() => handleRoleChange(user._id, 'admin')}>
                                        Make Admin
                                    </button>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}