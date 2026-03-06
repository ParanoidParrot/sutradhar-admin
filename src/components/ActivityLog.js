import React, { useState, useEffect } from 'react';
import { adminAPI } from '../api';

const ACTION_ICONS = {
  login:              '🔐',
  ingest_file:        '📄',
  ingest_url:         '🔗',
  delete_doc:         '🗑️',
  edit_doc:           '✏️',
  clear_namespace:    '⚠️',
  create_user:        '👤',
  update_user:        '👤',
  delete_user:        '👤',
  create_scripture:   '📖',
  update_scripture:   '📖',
  create_storyteller: '🧘',
  update_storyteller: '🧘',
  delete_storyteller: '🧘',
};

const ACTION_COLORS = {
  login:           'var(--text-muted)',
  ingest_file:     'var(--success)',
  ingest_url:      'var(--success)',
  delete_doc:      'var(--error)',
  clear_namespace: 'var(--error)',
  delete_user:     'var(--error)',
  edit_doc:        'var(--gold-dim)',
  create_user:     'var(--gold)',
  create_scripture:'var(--gold)',
};

export default function ActivityLog() {
  const [activity, setActivity] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [filter,   setFilter]   = useState('');

  useEffect(() => { fetchActivity(); }, []);

  const fetchActivity = async () => {
    setLoading(true);
    try {
      const res = await adminAPI.activity(100);
      setActivity(res.data.activity);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const filtered = filter
    ? activity.filter(a => a.action.includes(filter) || a.detail.toLowerCase().includes(filter.toLowerCase()))
    : activity;

  const formatTime = (iso) => {
    const d = new Date(iso);
    return d.toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div>
      <div style={styles.toolbar}>
        <input className="input" style={{ width: 260 }} placeholder="Filter by action or detail..." value={filter} onChange={e => setFilter(e.target.value)} />
        <button className="btn btn-ghost" onClick={fetchActivity}>↺ Refresh</button>
        <span style={{ color: 'var(--text-muted)', fontSize: 12, fontFamily: 'DM Mono, monospace' }}>
          {filtered.length} entries
        </span>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={styles.empty}><span className="spinner" /></div>
        ) : filtered.length === 0 ? (
          <div style={styles.empty}><p style={{ color: 'var(--text-muted)' }}>No activity yet.</p></div>
        ) : (
          <div style={styles.logList}>
            {filtered.map((entry, i) => (
              <div key={i} style={{ ...styles.logEntry, ...(i % 2 === 0 ? {} : { background: 'rgba(255,255,255,0.01)' }) }}>
                <span style={styles.icon}>{ACTION_ICONS[entry.action] || '•'}</span>
                <div style={styles.logBody}>
                  <span style={{ ...styles.logDetail, color: ACTION_COLORS[entry.action] || 'var(--text-primary)' }}>
                    {entry.detail}
                  </span>
                  <div style={styles.logMeta}>
                    <span className="tag tag-gray">{entry.action}</span>
                    <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>by {entry.actor}</span>
                    <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>{formatTime(entry.timestamp)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  toolbar:   { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20, flexWrap: 'wrap' },
  empty:     { padding: '48px 24px', textAlign: 'center' },
  logList:   { display: 'flex', flexDirection: 'column' },
  logEntry:  { display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 16px', borderBottom: '1px solid var(--border)' },
  icon:      { fontSize: 16, marginTop: 1, flexShrink: 0 },
  logBody:   { flex: 1, minWidth: 0 },
  logDetail: { fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 4 },
  logMeta:   { display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
};