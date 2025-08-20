'use client';

import { useState, useEffect } from 'react';

// Helper for authenticated API calls
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
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
        throw new Error(data.message || 'An API error occurred.');
    }
    return data;
};

export default function ManageUsersTab() {
    const [users, setUsers] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // --- FIX #1: Add state for pagination ---
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    // --- FIX #2: Update fetchUsers to handle pages ---
    const fetchUsers = async (searchQuery = '', page = 1) => {
        setLoading(true);
        setError(null);
        try {
            const url = `/api/users?search=${encodeURIComponent(searchQuery)}&page=${page}`;
            const data = await authedFetch(url);
            setUsers(data.users || []);
            setCurrentPage(data.currentPage || 1);
            setTotalPages(data.totalPages || 1);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };
    
    // Effect for handling search input with debounce
    useEffect(() => {
        const handler = setTimeout(() => {
            // --- FIX #3: Reset to page 1 on new search ---
            fetchUsers(searchTerm, 1);
        }, 500);

        return () => clearTimeout(handler);
    }, [searchTerm]);
    
    // Effect for initial load
    useEffect(() => {
        fetchUsers('', 1);
    }, []);

    const handleRoleChange = async (userId, newRole) => {
        if (!confirm(`Are you sure you want to change this user's role to '${newRole}'?`)) return;
        try {
            await authedFetch(`/api/users/${userId}/role`, {
                method: 'PATCH',
                body: { role: newRole },
            });
            fetchUsers(searchTerm, currentPage); // Refetch the current page
            alert('User role updated successfully!');
        } catch (err) {
            alert(`Error: ${err.message}`);
        }
    };
    
    // --- FIX #4: Add page change handler ---
    const handlePageChange = (newPage) => {
        if (newPage >= 1 && newPage <= totalPages) {
            fetchUsers(searchTerm, newPage);
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
                {/* User list rendering... (no changes needed here) */}
                {!loading && !error && users.length > 0 && (
                    users.map(user => (
                        <div key={user._id} className="user-card glass">
                            {/* ... user details ... */}
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
                {!loading && !error && users.length === 0 && (
                    <p className="empty-msg">{searchTerm ? 'No users found for this search.' : 'No users found.'}</p>
                )}
            </div>

            {/* --- FIX #5: Add pagination buttons to the UI --- */}
            {!loading && !error && totalPages > 1 && (
                <div className="pagination-controls">
                    <button 
                        onClick={() => handlePageChange(currentPage - 1)} 
                        disabled={currentPage <= 1}
                        className="cta-button"
                    >
                        &larr; Previous
                    </button>
                    <span>
                        Page {currentPage} of {totalPages}
                    </span>
                    <button 
                        onClick={() => handlePageChange(currentPage + 1)} 
                        disabled={currentPage >= totalPages}
                        className="cta-button"
                    >
                        Next &rarr;
                    </button>
                </div>
            )}
        </div>
    );
}
