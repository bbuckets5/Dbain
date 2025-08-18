'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/components/UserContext';
import Link from 'next/link';

export default function MyProfilePage() {
    const router = useRouter();
    const { user, loading } = useUser();
    
    const [openAccordion, setOpenAccordion] = useState(null);
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmNewPassword, setConfirmNewPassword] = useState('');
    const [passwordMessage, setPasswordMessage] = useState(null);
    const [isPasswordLoading, setIsPasswordLoading] = useState(false);

    // This useEffect correctly protects the route. No changes needed here.
    useEffect(() => {
        if (!loading && !user) {
            router.push('/login');
        }
    }, [user, loading, router]);

    const toggleAccordion = (section) => {
        setOpenAccordion(openAccordion === section ? null : section);
    };

    const handleChangePassword = async (e) => {
        e.preventDefault();
        if (newPassword !== confirmNewPassword) {
            setPasswordMessage({ type: 'error', text: 'New passwords do not match.' });
            return;
        }
        setIsPasswordLoading(true);
        setPasswordMessage(null);

        try {
            // --- THIS IS THE FIX ---
            // 1. Get the token from the browser's storage.
            const token = localStorage.getItem('authToken');
            if (!token) {
                throw new Error("You are not logged in.");
            }

            const response = await fetch('/api/users/profile/password', {
                method: 'PATCH',
                // 2. Include the token in the headers for authentication.
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}` 
                },
                body: JSON.stringify({ currentPassword, newPassword }),
            });
            const result = await response.json();
            if (!response.ok) {
                throw new Error(result.message || 'Failed to change password.');
            }
            setPasswordMessage({ type: 'success', text: result.message });
            setCurrentPassword('');
            setNewPassword('');
            setConfirmNewPassword('');
        } catch (error) {
            setPasswordMessage({ type: 'error', text: error.message });
        } finally {
            setIsPasswordLoading(false);
        }
    };

    if (loading || !user) {
        return <p>Loading your profile...</p>;
    }

    return (
        <div>
            <h1>My Profile</h1>

            {user.role === 'admin' && (
                <div style={{ textAlign: 'center', marginBottom: '30px' }}>
                    <Link href="/admin-dashboard" className="cta-button">
                        Admin Dashboard
                    </Link>
                </div>
            )}

            <div className="profile-section glass">
                <h2>Account Information</h2>
                <div className="user-info">
                    <p><strong>First Name:</strong> {user.firstName}</p>
                    <p><strong>Last Name:</strong> {user.lastName}</p>
                    <p><strong>Email:</strong> {user.email}</p>
                </div>
            </div>

            <div className="profile-accordion">
                <div className="accordion-item">
                    <button className={`accordion-trigger ${openAccordion === 'password' ? 'active' : ''}`} onClick={() => toggleAccordion('password')}>
                        Change Password
                    </button>
                    {openAccordion === 'password' && (
                        <div className="accordion-content">
                            <form className="accordion-form" onSubmit={handleChangePassword}>
                                {/* Your form inputs are structured well */}
                                <div className="form-group">
                                    <label htmlFor="currentPassword">Current Password</label>
                                    <input type="password" id="currentPassword" required value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
                                </div>
                                <div className="form-group">
                                    <label htmlFor="newPassword">New Password</label>
                                    <input type="password" id="newPassword" required value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
                                </div>
                                <div className="form-group">
                                    <label htmlFor="confirmNewPassword">Confirm New Password</label>
                                    <input type="password" id="confirmNewPassword" required value={confirmNewPassword} onChange={(e) => setConfirmNewPassword(e.target.value)} />
                                </div>
                                {passwordMessage && (
                                    <p className={passwordMessage.type === 'error' ? 'error-msg' : 'info-msg'}>
                                        {passwordMessage.text}
                                    </p>
                                )}
                                <div className="form-group">
                                    <button type="submit" className="cta-button form-submit-btn" disabled={isPasswordLoading}>
                                        {isPasswordLoading ? 'Updating...' : 'Update Password'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
