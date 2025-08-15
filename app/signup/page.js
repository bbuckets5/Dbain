'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function SignupPage() {
    const router = useRouter();
    // State for form inputs
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    // State for validation and UI feedback
    const [passwordMatch, setPasswordMatch] = useState({ match: false, message: '' });
    const [passwordStrength, setPasswordStrength] = useState({ strength: 0, message: '' });
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    // useEffect to check for password match whenever password or confirmPassword changes
    useEffect(() => {
        if (password && confirmPassword) {
            if (password === confirmPassword) {
                setPasswordMatch({ match: true, message: 'Passwords match!' });
            } else {
                setPasswordMatch({ match: false, message: 'Passwords do not match.' });
            }
        } else {
            setPasswordMatch({ match: false, message: '' });
        }
    }, [password, confirmPassword]);

    // useEffect to check password strength whenever the password changes
    useEffect(() => {
        let strength = 0;
        let message = '';
        if (password.length < 8) {
            message = 'Too short (min 8 characters)';
        } else {
            strength = 1;
            if (password.match(/[a-z]/)) strength++;
            if (password.match(/[A-Z]/)) strength++;
            if (password.match(/[0-9]/)) strength++;
            if (password.match(/[^a-zA-Z0-9]/)) strength++;
            if (strength < 3) message = 'Weak password.';
            else if (strength < 5) message = 'Medium password.';
            else message = 'Strong password!';
        }
        setPasswordStrength({ strength, message });
    }, [password]);


    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!passwordMatch.match) {
            setError('Passwords do not match.');
            return;
        }
        setIsLoading(true);
        setError(null);

        try {
            const response = await fetch('/api/users/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ firstName, lastName, email, password }),
            });
            const result = await response.json();
            if (!response.ok) {
                throw new Error(result.message || 'Registration failed.');
            }
            // On success, redirect to login page
            router.push('/login');
        } catch (error) {
            setError(error.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="form-container glass">
            <h1 className="page-title">Create an Account</h1>
            <form onSubmit={handleSubmit}>
                <div className="form-group">
                    <label htmlFor="firstName">First Name</label>
                    <input type="text" id="firstName" required value={firstName} onChange={(e) => setFirstName(e.target.value)} />
                </div>
                <div className="form-group">
                    <label htmlFor="lastName">Last Name</label>
                    <input type="text" id="lastName" required value={lastName} onChange={(e) => setLastName(e.target.value)} />
                </div>
                <div className="form-group">
                    <label htmlFor="email">Email Address</label>
                    <input type="email" id="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
                <div className="form-group">
                    <label htmlFor="password">Password</label>
                    <input type="password" id="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
                    {password && <p className={`password-strength-indicator strength-${passwordStrength.strength}`}>{passwordStrength.message}</p>}
                </div>
                <div className="form-group">
                    <label htmlFor="confirmPassword">Confirm Password</label>
                    <input type="password" id="confirmPassword" required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
                    {confirmPassword && <p className={`password-match-message ${passwordMatch.match ? 'match' : 'no-match'}`}>{passwordMatch.message}</p>}
                </div>

                {error && <p className="error-msg">{error}</p>}
                
                <div className="form-group">
                    <button type="submit" className="cta-button form-submit-btn" disabled={isLoading}>
                        {isLoading ? 'Creating Account...' : 'Create Account'}
                    </button>
                </div>
            </form>
            <p style={{ textAlign: 'center', marginTop: '20px' }}>
                Already have an account? <Link href="/login">Log in here</Link>
            </p>
        </div>
    );
}