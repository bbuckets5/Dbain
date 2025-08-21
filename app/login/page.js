'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useUser } from '@/components/UserContext';

export default function LoginPage() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const { login } = useUser();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        const result = await login(email, password);

        if (result.success) {
            if (result.user.role === 'admin') {
                router.push('/admin-dashboard');
            } else {
                router.push('/my-profile');
            }
        } else {
            setError(result.message || 'Login failed.');
        }

        setIsLoading(false);
    };

    return (
        <div className="form-container glass">
            <h1 className="page-title">Log In</h1>
            <form onSubmit={handleSubmit}>
                <div className="form-group">
                    <label htmlFor="email">Email Address</label>
                    <input
                        type="email"
                        id="email"
                        name="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                    />
                </div>
                <div className="form-group">
                    <label htmlFor="password">Password</label>
                    <input
                        type="password"
                        id="password"
                        name="password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                    />
                </div>
                
                {error && <p className="error-msg">{error}</p>}
                
                <div className="form-group">
                    <button type="submit" className="cta-button form-submit-btn" disabled={isLoading}>
                        {isLoading ? 'Logging In...' : 'Log In'}
                    </button>
                </div>

                <div className="form-links">
                    <Link href="/forgot-password">Forgot your password?</Link>
                    <Link href="/signup">Don't have an account? Sign up here.</Link>
                </div>
            </form>
        </div>
    );
}
