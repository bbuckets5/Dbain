'use client';

import { useState, useEffect } from 'react';

export default function ManageUsersTab() {
    const [users, setUsers] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const fetchUsers = async (searchQuery) => {
        setLoading(true);
        setError(null);
        try {
            const url = searchQuery ? `/api/users?search=${encodeURIComponent(searchQuery)}` : '';
            
            if (!url) {
                setUsers([]);
                setLoading(false);
                return;
            }

            const response = await fetch(url);
            if (!response.ok) {
                throw new Error('Failed to fetch users.');
            }
            const data = await response.json();
            setUsers(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const handler = setTimeout(() => {
            fetchUsers(searchTerm);
        }, 500);

        return () => {
            clearTimeout(handler);
        };
    }, [searchTerm]);

    const handleRoleChange = async (userId, newRole) => {
        if (!confirm(`Are you sure you want to change this user's role to '${newRole}'?`)) return;

        try {
            const response = await fetch(`/api/users/${userId}/role`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ role: newRole }),
            });

            if (!response.ok) {
                const result = await response.json();
                throw new Error(result.message || 'Failed to update role');
            }
            
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
                    <p className="empty-msg">To view users, please search by Name or Email in the bar above.</p>
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