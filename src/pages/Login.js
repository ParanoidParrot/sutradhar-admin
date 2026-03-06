import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '../api';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await authAPI.login(username, password);
      localStorage.setItem('sutradhar_token', res.data.access_token);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.detail || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card} className="fade-in">

        {/* Logo */}
        <div style={styles.logoArea}>
          <div style={styles.logoMark}>सू</div>
          <h1 style={styles.title}>Sutradhar</h1>
          <p style={styles.subtitle}>Admin Portal</p>
        </div>

        <hr className="divider" />

        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handleLogin}>
          <div style={styles.field}>
            <label style={styles.label}>Username</label>
            <input
              className="input"
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="admin"
              autoComplete="username"
              required
            />
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Password</label>
            <input
              className="input"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••••••"
              autoComplete="current-password"
              required
            />
          </div>

          <button
            className="btn btn-primary"
            type="submit"
            disabled={loading}
            style={{ width: '100%', justifyContent: 'center', marginTop: 8 }}
          >
            {loading ? <span className="spinner" /> : 'Sign In'}
          </button>
        </form>

        <p style={styles.footer}>
          Sutradhar — Multilingual AI Storyteller
        </p>
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'var(--bg-primary)',
    padding: 24,
  },
  card: {
    background: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-lg)',
    padding: '40px 36px',
    width: '100%',
    maxWidth: 400,
  },
  logoArea: {
    textAlign: 'center',
    marginBottom: 24,
  },
  logoMark: {
    fontFamily: 'Cormorant Garant, serif',
    fontSize: 40,
    color: 'var(--gold)',
    lineHeight: 1,
    marginBottom: 8,
  },
  title: {
    fontSize: 28,
    fontFamily: 'Cormorant Garant, serif',
    color: 'var(--text-primary)',
    letterSpacing: '0.04em',
  },
  subtitle: {
    color: 'var(--text-secondary)',
    fontSize: 12,
    fontFamily: 'DM Mono, monospace',
    textTransform: 'uppercase',
    letterSpacing: '0.1em',
    marginTop: 4,
  },
  field: {
    marginBottom: 16,
  },
  label: {
    display: 'block',
    color: 'var(--text-secondary)',
    fontSize: 12,
    fontFamily: 'DM Mono, monospace',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    marginBottom: 6,
  },
  footer: {
    textAlign: 'center',
    color: 'var(--text-muted)',
    fontSize: 11,
    fontFamily: 'DM Mono, monospace',
    marginTop: 24,
  },
};