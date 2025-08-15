// app/forgot-password/page.js
'use client';

import { useState } from 'react';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [confirmEmail, setConfirmEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    if (email.trim().toLowerCase() !== confirmEmail.trim().toLowerCase()) {
      setError('Emails do not match.');
      return;
    }
    setIsLoading(true);
    try {
      const res = await fetch('/api/users/password/forgot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Request failed.');
      setDone(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="container">
      <div className="form-container glass">
        <h1 className="page-title">Forgot Password</h1>

        {!done ? (
          <form onSubmit={submit}>
            <div className="form-group">
              <label htmlFor="email">Email used to create your account</label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label htmlFor="confirmEmail">Confirm Email</label>
              <input
                id="confirmEmail"
                type="email"
                required
                value={confirmEmail}
                onChange={(e) => setConfirmEmail(e.target.value)}
              />
            </div>

            {error && <p className="error-msg">{error}</p>}

            <button className="cta-button form-submit-btn" disabled={isLoading}>
              {isLoading ? 'Sending…' : 'Send Reset Link'}
            </button>
          </form>
        ) : (
          <div className="policy-container" style={{ textAlign: 'center' }}>
            <h2>Check your email</h2>
            <p>
              We sent a password reset link to <strong>{email}</strong>.
            </p>
            <p>Please check your inbox, junk, and spam folders.</p>
          </div>
        )}
      </div>
    </main>
  );
}
