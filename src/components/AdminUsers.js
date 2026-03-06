import React, { useState, useEffect } from 'react';
import { adminAPI } from '../api';

export default function AdminUsers() {
  const [users,       setUsers]       = useState([]);
  const [envAdmin,    setEnvAdmin]    = useState('');
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState('');
  const [success,     setSuccess]     = useState('');
  const [showForm,    setShowForm]    = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [confirmDel,  setConfirmDel]  = useState(null);
  const [form,        setForm]        = useState({ username: '', password: '', display_name: '' });
  const [editForm,    setEditForm]    = useState({ display_name: '', password: '', active: true });
  const [saving,      setSaving]      = useState(false);

  useEffect(() => { fetchUsers(); }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await adminAPI.users();
      setUsers(res.data.users);
      setEnvAdmin(res.data.env_admin);
    } catch (e) {
      setError('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const showSuccess = (msg) => { setSuccess(msg); setTimeout(() => setSuccess(''), 4000); };

  const handleCreate = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await adminAPI.createUser(form);
      showSuccess(`✓ Created user '${form.username}'`);
      setForm({ username: '', password: '', display_name: '' });
      setShowForm(false);
      fetchUsers();
    } catch (e) {
      setError(e.response?.data?.detail || 'Failed to create user');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async (user) => {
    setSaving(true);
    try {
      const updates = {};
      if (editForm.display_name !== user.display_name) updates.display_name = editForm.display_name;
      if (editForm.password)                            updates.password     = editForm.password;
      if (editForm.active     !== user.active)          updates.active       = editForm.active;
      await adminAPI.updateUser(user.id, updates);
      showSuccess(`✓ Updated '${user.username}'`);
      setEditingUser(null);
      fetchUsers();
    } catch (e) {
      setError('Update failed');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmDel) return;
    try {
      await adminAPI.deleteUser(confirmDel.id);
      showSuccess(`✓ Deleted '${confirmDel.username}'`);
      setConfirmDel(null);
      fetchUsers();
    } catch (e) {
      setError('Delete failed');
    }
  };

  return (
    <div>
      {error   && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      {/* Confirm delete */}
      {confirmDel && (
        <div style={styles.overlay}>
          <div style={styles.modal} className="fade-in">
            <h3 style={{ marginBottom: 8 }}>Delete User</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginBottom: 20 }}>
              Delete admin user <strong style={{ color: 'var(--text-primary)' }}>'{confirmDel.username}'</strong>? This cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button className="btn btn-ghost" onClick={() => setConfirmDel(null)}>Cancel</button>
              <button className="btn btn-danger" style={{ border: '1px solid var(--error)' }} onClick={handleDelete}>Delete</button>
            </div>
          </div>
        </div>
      )}

      <div style={styles.toolbar}>
        <div style={styles.envAdminBadge}>
          <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>Primary admin (env var):</span>
          <span className="mono" style={{ color: 'var(--gold)', fontSize: 13 }}>{envAdmin}</span>
        </div>
        <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>+ Add Admin User</button>
      </div>

      {showForm && (
        <div className="card fade-in" style={{ marginBottom: 24 }}>
          <h3 style={{ fontSize: 16, marginBottom: 16 }}>New Admin User</h3>
          <form onSubmit={handleCreate}>
            <div style={styles.formGrid}>
              <div>
                <label style={styles.label}>Username</label>
                <input className="input" required value={form.username} onChange={e => setForm({...form, username: e.target.value})} placeholder="e.g. editor1" />
              </div>
              <div>
                <label style={styles.label}>Display Name</label>
                <input className="input" value={form.display_name} onChange={e => setForm({...form, display_name: e.target.value})} placeholder="e.g. Content Editor" />
              </div>
              <div style={{ gridColumn: '1/-1' }}>
                <label style={styles.label}>Password</label>
                <input className="input" type="password" required value={form.password} onChange={e => setForm({...form, password: e.target.value})} placeholder="Minimum 8 characters" />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
              <button className="btn btn-primary" type="submit" disabled={saving}>{saving ? 'Creating...' : 'Create User'}</button>
              <button className="btn btn-ghost" type="button" onClick={() => setShowForm(false)}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={styles.empty}><span className="spinner" /></div>
        ) : users.length === 0 ? (
          <div style={styles.empty}>
            <p style={{ color: 'var(--text-muted)' }}>No additional admin users.</p>
            <p style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 4 }}>The primary admin from env vars is always active.</p>
          </div>
        ) : (
          <table style={styles.table}>
            <thead>
              <tr style={styles.thead}>
                <th style={styles.th}>Username</th>
                <th style={styles.th}>Display Name</th>
                <th style={styles.th}>Status</th>
                <th style={styles.th}>Created</th>
                <th style={styles.th}></th>
              </tr>
            </thead>
            <tbody>
              {users.map((user, i) => (
                <React.Fragment key={user.id}>
                  <tr style={{ ...styles.tr, ...(i % 2 === 0 ? {} : { background: 'rgba(255,255,255,0.01)' }) }}>
                    <td style={styles.td}><span className="mono" style={{ color: 'var(--text-primary)' }}>{user.username}</span></td>
                    <td style={styles.td}><span style={{ color: 'var(--text-secondary)' }}>{user.display_name || '—'}</span></td>
                    <td style={styles.td}><span className={`tag ${user.active ? 'tag-green' : 'tag-gray'}`}>{user.active ? 'Active' : 'Disabled'}</span></td>
                    <td style={styles.td}><span style={{ color: 'var(--text-muted)', fontSize: 12 }}>{new Date(user.created_at).toLocaleDateString()}</span></td>
                    <td style={styles.td}>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button className="btn btn-ghost" style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => { setEditingUser(editingUser === user.id ? null : user.id); setEditForm({ display_name: user.display_name || '', password: '', active: user.active }); }}>
                          {editingUser === user.id ? 'Cancel' : 'Edit'}
                        </button>
                        <button className="btn btn-danger" style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => setConfirmDel(user)}>Delete</button>
                      </div>
                    </td>
                  </tr>
                  {editingUser === user.id && (
                    <tr style={{ background: 'rgba(201,168,76,0.04)', borderBottom: '1px solid var(--border-accent)' }}>
                      <td colSpan={5} style={{ padding: '16px' }}>
                        <div style={styles.formGrid}>
                          <div>
                            <label style={styles.label}>Display Name</label>
                            <input className="input" value={editForm.display_name} onChange={e => setEditForm({...editForm, display_name: e.target.value})} />
                          </div>
                          <div>
                            <label style={styles.label}>New Password <span style={{ color: 'var(--text-muted)' }}>(leave blank to keep)</span></label>
                            <input className="input" type="password" placeholder="New password..." value={editForm.password} onChange={e => setEditForm({...editForm, password: e.target.value})} />
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <input type="checkbox" id={`active-${user.id}`} checked={editForm.active} onChange={e => setEditForm({...editForm, active: e.target.checked})} />
                            <label htmlFor={`active-${user.id}`} style={{ color: 'var(--text-secondary)', fontSize: 13 }}>Account active</label>
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                          <button className="btn btn-primary" onClick={() => handleUpdate(user)} disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
                          <button className="btn btn-ghost" onClick={() => setEditingUser(null)}>Cancel</button>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

const styles = {
  toolbar:       { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  envAdminBadge: { display: 'flex', alignItems: 'center', gap: 8, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '8px 14px' },
  formGrid:      { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 },
  label:         { display: 'block', color: 'var(--text-secondary)', fontSize: 11, fontFamily: 'DM Mono, monospace', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 5 },
  table:         { width: '100%', borderCollapse: 'collapse' },
  thead:         { borderBottom: '1px solid var(--border)', background: 'var(--bg-secondary)' },
  th:            { padding: '10px 16px', textAlign: 'left', color: 'var(--text-muted)', fontSize: 11, fontFamily: 'DM Mono, monospace', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 500 },
  tr:            { borderBottom: '1px solid var(--border)' },
  td:            { padding: '12px 16px', verticalAlign: 'middle' },
  empty:         { padding: '48px 24px', textAlign: 'center' },
  overlay:       { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  modal:         { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '28px 32px', width: '100%', maxWidth: 400 },
};