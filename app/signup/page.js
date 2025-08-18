'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

// Use a single state object for all form fields for better organization
const initialFormState = {
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: ''
};

export default function SignupPage() {
    const router = useRouter();
    const [formState, setFormState] = useState(initialFormState);
    const [passwordStrength, setPasswordStrength] = useState({ strength: 0, message: '' });
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    const handleInputChange = (e) => {
        const { id, value } = e.target;
        setFormState(prev => ({ ...prev, [id]: value }));
    };

    // This logic for checking password strength is a great feature
    useEffect(() => {
        const { password } = formState;
        if (!password) {
            setPasswordStrength({ strength: 0, message: '' });
            return;
        }
        let strength = 0;
        let message = '';
        if (password.length < 8) {
            message = 'Too short (min 8 characters)';
        } else {
            strength = 1;
            if (/[a-z]/.test(password)) strength++;
            if (/[A-Z]/.test(password)) strength++;
            if (/\d/.test(password)) strength++;
            if (/[@$!%*?&]/.test(password)) strength++;
            
            if (strength < 3) message = 'Weak password';
            else if (strength < 5) message = 'Medium password';
            else message = 'Strong password!';
        }
        setPasswordStrength({ strength, message });
    }, [formState.password]);

    const passwordsMatch = formState.password && formState.password === formState.confirmPassword;

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!passwordsMatch) {
            setError('Passwords do not match.');
            return;
        }
        setIsLoading(true);
        setError(null);

        try {
            const { confirmPassword, ...payload } = formState; // Exclude confirmPassword from payload
            const response = await fetch('/api/users/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            const result = await response.json();
            if (!response.ok) {
                throw new Error(result.message || 'Registration failed.');
            }
            alert('Account created successfully! Please log in.');
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
                    <input type="text" id="firstName" required value={formState.firstName} onChange={handleInputChange} />
                </div>
                <div className="form-group">
                    <label htmlFor="lastName">Last Name</label>
                    <input type="text" id="lastName" required value={formState.lastName} onChange={handleInputChange} />
                </div>
                <div className="form-group">
                    <label htmlFor="email">Email Address</label>
                    <input type="email" id="email" required value={formState.email} onChange={handleInputChange} />
                </div>
                <div className="form-group">
                    <label htmlFor="password">Password</label>
                    <input type="password" id="password" required value={formState.password} onChange={handleInputChange} />
                    {formState.password && <p>{passwordStrength.message}</p>}
                </div>
                <div className="form-group">
                    <label htmlFor="confirmPassword">Confirm Password</label>
                    <input type="password" id="confirmPassword" required value={formState.confirmPassword} onChange={handleInputChange} />
                    {formState.confirmPassword && !passwordsMatch && <p className="error-msg">Passwords do not match.</p>}
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
