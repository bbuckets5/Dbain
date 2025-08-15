// app/reset-password/[token]/page.js
'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';

function strengthLabel(pw) {
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[a-z]/.test(pw)) score++;
  if (/\d/.test(pw)) score++;
  if (/[@$!%*?&]/.test(pw)) score++;
  if (score >= 5) return 'Strong';
  if (score >= 3) return 'Medium';
  return 'Weak';
}

export default function ResetPasswordPage() {
  const { token } = useParams();
  const router = useRouter();

  const [pw1, setPw1] = useState('');
  const [pw2, setPw2] = useState('');
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [done, setDone] = useState(false);

  const matches = pw1.length > 0 && pw1 === pw2;
  const label = strengthLabel(pw1);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    // enforce same policy as signup
    const policy = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).{8,}$/;
    if (!policy.test(pw1)) {
      setError('Password must be 8+ chars and include upper, lower, number, and special char.');
      return;
    }
    if (!matches) {
      setError('Passwords do not match.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch('/api/users/password/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword: pw1 }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Reset failed.');

      setDone(true);
      setTimeout(() => router.push('/login'), 1600);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="container">
      <div className="form-container glass">
        <h1 className="page-title">Reset Password</h1>

        {!done ? (
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="pw1">New Password</label>
              <input
                id="pw1"
                type="password"
                required
                value={pw1}
                onChange={(e) => setPw1(e.target.value)}
              />
              <small>Password strength: <strong>{label}</strong></small>
            </div>

            <div className="form-group">
              <label htmlFor="pw2">Confirm New Password</label>
              <input
                id="pw2"
                type="password"
                required
                value={pw2}
                onChange={(e) => setPw2(e.target.value)}
              />
              <small>{matches ? 'Passwords match' : 'Passwords do not match'}</small>
            </div>

            {error && <p className="error-msg">{error}</p>}

            <button className="cta-button form-submit-btn" disabled={isLoading}>
              {isLoading ? 'Updating…' : 'Update Password'}
            </button>
          </form>
        ) : (
          <div className="policy-container" style={{ textAlign: 'center' }}>
            <h2>Password updated</h2>
            <p>Redirecting to login…</p>
          </div>
        )}
      </div>
    </main>
  );
}
// app/forgot-password/page.js