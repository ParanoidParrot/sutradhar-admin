import React, { useState, useEffect } from 'react';
import { adminAPI } from '../api';

export default function ScripturesManager() {
  const [scriptures,   setScriptures]   = useState([]);
  const [storytellers, setStorytellers] = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState('');
  const [success,      setSuccess]      = useState('');
  const [activeTab,    setActiveTab]    = useState('scriptures');
  const [showForm,     setShowForm]     = useState(null); // 'scripture' | 'storyteller' | null
  const [editing,      setEditing]      = useState(null);
  const [editForm,     setEditForm]     = useState({});
  const [saving,       setSaving]       = useState(false);
  const [confirmNS,    setConfirmNS]    = useState(null);

  const emptyScripture   = { id: '', name: '', description: '', pinecone_namespace: '', default_storyteller: '', available_storytellers: '' };
  const emptyStoryteller = { id: '', name: '', scripture: '', system_prompt: '', greeting: '', tone: '' };
  const [newForm, setNewForm] = useState(emptyScripture);

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [sRes, stRes] = await Promise.all([adminAPI.adminScriptures(), adminAPI.adminStorytellers()]);
      setScriptures(sRes.data.scriptures);
      setStorytellers(stRes.data.storytellers);
    } catch (e) {
      setError('Failed to load configuration');
    } finally {
      setLoading(false);
    }
  };

  const showSuccess = (msg) => { setSuccess(msg); setTimeout(() => setSuccess(''), 4000); };

  const handleCreateScripture = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { ...newForm, available_storytellers: newForm.available_storytellers ? newForm.available_storytellers.split(',').map(s=>s.trim()) : [] };
      await adminAPI.createScripture(payload);
      showSuccess(`✓ Added scripture '${newForm.name}'`);
      setNewForm(emptyScripture);
      setShowForm(null);
      fetchAll();
    } catch (e) {
      setError(e.response?.data?.detail || 'Failed to create scripture');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateStoryteller = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await adminAPI.createStoryteller(newForm);
      showSuccess(`✓ Added storyteller '${newForm.name}'`);
      setNewForm(emptyStoryteller);
      setShowForm(null);
      fetchAll();
    } catch (e) {
      setError(e.response?.data?.detail || 'Failed to create storyteller');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateScripture = async (id) => {
    setSaving(true);
    try {
      const payload = { ...editForm };
      if (typeof payload.available_storytellers === 'string')
        payload.available_storytellers = payload.available_storytellers.split(',').map(s=>s.trim());
      await adminAPI.updateScripture(id, payload);
      showSuccess('✓ Scripture updated');
      setEditing(null);
      fetchAll();
    } catch (e) { setError('Update failed'); } finally { setSaving(false); }
  };

  const handleUpdateStoryteller = async (id) => {
    setSaving(true);
    try {
      await adminAPI.updateStoryteller(id, editForm);
      showSuccess('✓ Storyteller updated');
      setEditing(null);
      fetchAll();
    } catch (e) { setError('Update failed'); } finally { setSaving(false); }
  };

  const handleClearNamespace = async () => {
    if (!confirmNS) return;
    try {
      await adminAPI.clearNamespace(confirmNS);
      showSuccess(`✓ Namespace '${confirmNS}' cleared`);
      setConfirmNS(null);
    } catch (e) { setError('Failed to clear namespace'); }
  };

  if (loading) return <div style={{ textAlign: 'center', padding: 48 }}><span className="spinner" /></div>;

  return (
    <div>
      {error   && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      {/* Clear namespace confirm */}
      {confirmNS && (
        <div style={styles.overlay}>
          <div style={styles.modal} className="fade-in">
            <h3 style={{ marginBottom: 8 }}>⚠️ Clear Namespace</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginBottom: 8 }}>
              This will permanently delete <strong>all vectors</strong> in the Pinecone namespace:
            </p>
            <p className="mono" style={{ color: 'var(--error)', fontSize: 14, marginBottom: 20, padding: '8px 12px', background: 'rgba(192,64,48,0.1)', borderRadius: 6 }}>{confirmNS}</p>
            <p style={{ color: 'var(--text-muted)', fontSize: 12, marginBottom: 20 }}>This action is irreversible. All ingested documents for this scripture will need to be re-ingested.</p>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button className="btn btn-ghost" onClick={() => setConfirmNS(null)}>Cancel</button>
              <button className="btn btn-danger" style={{ border: '1px solid var(--error)' }} onClick={handleClearNamespace}>Clear Namespace</button>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div style={styles.tabs}>
        {['scriptures', 'storytellers'].map(tab => (
          <button key={tab} className="btn btn-ghost" style={{ ...styles.tab, ...(activeTab === tab ? styles.tabActive : {}) }} onClick={() => setActiveTab(tab)}>
            {tab === 'scriptures' ? '📖 Scriptures' : '🧘 Storytellers'}
          </button>
        ))}
      </div>

      {/* Scriptures panel */}
      {activeTab === 'scriptures' && (
        <>
          <div style={styles.toolbar}>
            <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>{scriptures.length} scripture{scriptures.length !== 1 ? 's' : ''}</span>
            <button className="btn btn-primary" onClick={() => { setShowForm('scripture'); setNewForm(emptyScripture); }}>+ Add Scripture</button>
          </div>

          {showForm === 'scripture' && (
            <div className="card fade-in" style={{ marginBottom: 24 }}>
              <h3 style={{ fontSize: 16, marginBottom: 16 }}>New Scripture</h3>
              <form onSubmit={handleCreateScripture}>
                <div style={styles.formGrid}>
                  {[['id','ID (lowercase, no spaces)','ramayana'],['name','Display Name','Ramayana'],['pinecone_namespace','Pinecone Namespace','ramayana'],['default_storyteller','Default Storyteller ID','valmiki'],['available_storytellers','Available Storyteller IDs (comma-separated)','valmiki']].map(([field, label, ph]) => (
                    <div key={field}>
                      <label style={styles.label}>{label}</label>
                      <input className="input" required={['id','name','pinecone_namespace','default_storyteller'].includes(field)} placeholder={ph} value={newForm[field]} onChange={e => setNewForm({...newForm, [field]: e.target.value})} />
                    </div>
                  ))}
                  <div style={{ gridColumn: '1/-1' }}>
                    <label style={styles.label}>Description</label>
                    <input className="input" placeholder="Brief description..." value={newForm.description} onChange={e => setNewForm({...newForm, description: e.target.value})} />
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                  <button className="btn btn-primary" type="submit" disabled={saving}>{saving ? 'Creating...' : 'Create Scripture'}</button>
                  <button className="btn btn-ghost" type="button" onClick={() => setShowForm(null)}>Cancel</button>
                </div>
              </form>
            </div>
          )}

          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            {scriptures.map((s, i) => (
              <React.Fragment key={s.id}>
                <div style={{ ...styles.row, ...(i % 2 === 0 ? {} : { background: 'rgba(255,255,255,0.01)' }) }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{s.name}</span>
                      <span className={`tag ${s.active ? 'tag-green' : 'tag-gray'}`}>{s.active ? 'Active' : 'Inactive'}</span>
                      <span className="mono" style={{ color: 'var(--text-muted)', fontSize: 11 }}>ns: {s.pinecone_namespace}</span>
                    </div>
                    <span style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{s.description}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button className="btn btn-ghost" style={{ fontSize: 12, padding: '4px 10px' }} onClick={() => { setEditing(editing === s.id ? null : s.id); setEditForm({ ...s, available_storytellers: s.available_storytellers?.join(', ') || '' }); }}>
                      {editing === s.id ? 'Cancel' : 'Edit'}
                    </button>
                    <button className="btn btn-danger" style={{ fontSize: 12, padding: '4px 10px' }} onClick={() => setConfirmNS(s.pinecone_namespace)}>
                      Clear Vectors
                    </button>
                  </div>
                </div>
                {editing === s.id && (
                  <div style={{ background: 'rgba(201,168,76,0.04)', borderBottom: '1px solid var(--border-accent)', padding: 16 }}>
                    <div style={styles.formGrid}>
                      {[['name','Display Name'],['description','Description'],['pinecone_namespace','Pinecone Namespace'],['default_storyteller','Default Storyteller ID'],['available_storytellers','Available Storyteller IDs (comma-separated)']].map(([field, label]) => (
                        <div key={field}>
                          <label style={styles.label}>{label}</label>
                          <input className="input" value={editForm[field] || ''} onChange={e => setEditForm({...editForm, [field]: e.target.value})} />
                        </div>
                      ))}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <input type="checkbox" id={`active-${s.id}`} checked={editForm.active} onChange={e => setEditForm({...editForm, active: e.target.checked})} />
                        <label htmlFor={`active-${s.id}`} style={{ color: 'var(--text-secondary)', fontSize: 13 }}>Active</label>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                      <button className="btn btn-primary" onClick={() => handleUpdateScripture(s.id)} disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
                      <button className="btn btn-ghost" onClick={() => setEditing(null)}>Cancel</button>
                    </div>
                  </div>
                )}
              </React.Fragment>
            ))}
          </div>
        </>
      )}

      {/* Storytellers panel */}
      {activeTab === 'storytellers' && (
        <>
          <div style={styles.toolbar}>
            <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>{storytellers.length} storyteller{storytellers.length !== 1 ? 's' : ''}</span>
            <button className="btn btn-primary" onClick={() => { setShowForm('storyteller'); setNewForm(emptyStoryteller); }}>+ Add Storyteller</button>
          </div>

          {showForm === 'storyteller' && (
            <div className="card fade-in" style={{ marginBottom: 24 }}>
              <h3 style={{ fontSize: 16, marginBottom: 16 }}>New Storyteller</h3>
              <form onSubmit={handleCreateStoryteller}>
                <div style={styles.formGrid}>
                  {[['id','ID','vyasa'],['name','Display Name','Vyasa'],['scripture','Scripture ID','mahabharata'],['tone','Tone','Formal, epic, authoritative']].map(([field, label, ph]) => (
                    <div key={field}>
                      <label style={styles.label}>{label}</label>
                      <input className="input" required={field !== 'tone'} placeholder={ph} value={newForm[field] || ''} onChange={e => setNewForm({...newForm, [field]: e.target.value})} />
                    </div>
                  ))}
                  <div style={{ gridColumn: '1/-1' }}>
                    <label style={styles.label}>Greeting</label>
                    <input className="input" required placeholder="I am Vyasa, composer of the Mahabharata..." value={newForm.greeting || ''} onChange={e => setNewForm({...newForm, greeting: e.target.value})} />
                  </div>
                  <div style={{ gridColumn: '1/-1' }}>
                    <label style={styles.label}>System Prompt</label>
                    <textarea className="input" required rows={5} placeholder="You are Vyasa..." value={newForm.system_prompt || ''} onChange={e => setNewForm({...newForm, system_prompt: e.target.value})} style={{ resize: 'vertical' }} />
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                  <button className="btn btn-primary" type="submit" disabled={saving}>{saving ? 'Creating...' : 'Create Storyteller'}</button>
                  <button className="btn btn-ghost" type="button" onClick={() => setShowForm(null)}>Cancel</button>
                </div>
              </form>
            </div>
          )}

          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            {storytellers.map((st, i) => (
              <React.Fragment key={st.id}>
                <div style={{ ...styles.row, ...(i % 2 === 0 ? {} : { background: 'rgba(255,255,255,0.01)' }) }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>🧘 {st.name}</span>
                      <span className="tag tag-gold">{st.scripture}</span>
                      {st.tone && <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>{st.tone}</span>}
                    </div>
                    <span style={{ color: 'var(--text-secondary)', fontSize: 12, fontStyle: 'italic' }}>"{st.greeting}"</span>
                  </div>
                  <button className="btn btn-ghost" style={{ fontSize: 12, padding: '4px 10px' }} onClick={() => { setEditing(editing === st.id ? null : st.id); setEditForm({ ...st }); }}>
                    {editing === st.id ? 'Cancel' : 'Edit'}
                  </button>
                </div>
                {editing === st.id && (
                  <div style={{ background: 'rgba(201,168,76,0.04)', borderBottom: '1px solid var(--border-accent)', padding: 16 }}>
                    <div style={styles.formGrid}>
                      {[['name','Name'],['scripture','Scripture ID'],['tone','Tone']].map(([field, label]) => (
                        <div key={field}>
                          <label style={styles.label}>{label}</label>
                          <input className="input" value={editForm[field] || ''} onChange={e => setEditForm({...editForm, [field]: e.target.value})} />
                        </div>
                      ))}
                      <div style={{ gridColumn: '1/-1' }}>
                        <label style={styles.label}>Greeting</label>
                        <input className="input" value={editForm.greeting || ''} onChange={e => setEditForm({...editForm, greeting: e.target.value})} />
                      </div>
                      <div style={{ gridColumn: '1/-1' }}>
                        <label style={styles.label}>System Prompt</label>
                        <textarea className="input" rows={6} value={editForm.system_prompt || ''} onChange={e => setEditForm({...editForm, system_prompt: e.target.value})} style={{ resize: 'vertical' }} />
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                      <button className="btn btn-primary" onClick={() => handleUpdateStoryteller(st.id)} disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
                      <button className="btn btn-ghost" onClick={() => setEditing(null)}>Cancel</button>
                    </div>
                  </div>
                )}
              </React.Fragment>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

const styles = {
  tabs:    { display: 'flex', gap: 4, marginBottom: 20, borderBottom: '1px solid var(--border)', paddingBottom: 12 },
  tab:     { fontSize: 13 },
  tabActive:{ color: 'var(--gold)', borderBottom: '2px solid var(--gold)', borderRadius: 0 },
  toolbar: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  formGrid:{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 },
  label:   { display: 'block', color: 'var(--text-secondary)', fontSize: 11, fontFamily: 'DM Mono, monospace', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 5 },
  row:     { display: 'flex', alignItems: 'center', gap: 16, padding: '14px 16px', borderBottom: '1px solid var(--border)' },
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  modal:   { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '28px 32px', width: '100%', maxWidth: 440 },
};