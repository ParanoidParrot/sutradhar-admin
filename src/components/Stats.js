import React, { useState, useEffect } from 'react';
import { adminAPI } from '../api';

export default function Stats() {
  const [stats,   setStats]   = useState(null);
  const [health,  setHealth]  = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    setLoading(true);
    setError('');
    try {
      const [statsRes, healthRes] = await Promise.all([
        adminAPI.stats(),
        adminAPI.health()
      ]);
      setStats(statsRes.data);
      setHealth(healthRes.data);
    } catch (e) {
      setError(e.response?.data?.detail || 'Failed to load stats');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div style={{ textAlign: 'center', padding: 48 }}><span className="spinner" /></div>;
  if (error)   return <div className="alert alert-error">{error}</div>;

  const namespaces = stats?.pinecone?.namespaces || {};

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 20 }}>
        <button className="btn btn-ghost" onClick={fetchAll}>↻ Refresh</button>
      </div>

      {/* Top stat cards */}
      <div style={styles.statGrid}>
        <StatCard
          label="API Status"
          value={health?.status === 'ok' ? 'Healthy' : 'Degraded'}
          sub={health?.service}
          accent={health?.status === 'ok' ? 'var(--success)' : 'var(--error)'}
          dot
        />
        <StatCard
          label="Total Vectors"
          value={stats?.pinecone?.total_vectors?.toLocaleString() || '0'}
          sub="Across all namespaces"
        />
        <StatCard
          label="Total Documents"
          value={stats?.documents?.total || '0'}
          sub="Ingested sources"
        />
        <StatCard
          label="Namespaces"
          value={Object.keys(namespaces).length}
          sub="Active scripture collections"
        />
      </div>

      {/* Pinecone namespaces */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginTop: 24 }}>
        <div className="card">
          <h3 style={styles.cardTitle}>Pinecone Namespaces</h3>
          <p style={styles.cardSubtitle}>Vector counts by scripture</p>
          <hr className="divider" />
          {Object.keys(namespaces).length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>No namespaces found</p>
          ) : (
            Object.entries(namespaces).map(([ns, count]) => (
              <div key={ns} style={styles.nsRow}>
                <div style={styles.nsLeft}>
                  <span className="tag tag-gold">{ns}</span>
                </div>
                <div style={styles.nsRight}>
                  <div style={styles.nsBar}>
                    <div style={{
                      ...styles.nsBarFill,
                      width: `${Math.min(100, (count / (stats?.pinecone?.total_vectors || 1)) * 100)}%`
                    }} />
                  </div>
                  <span className="mono" style={{ color: 'var(--text-secondary)', fontSize: 12, minWidth: 50, textAlign: 'right' }}>
                    {count.toLocaleString()}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Documents by scripture */}
        <div className="card">
          <h3 style={styles.cardTitle}>Documents by Scripture</h3>
          <p style={styles.cardSubtitle}>Ingested source counts</p>
          <hr className="divider" />
          {Object.keys(stats?.documents?.by_scripture || {}).length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>No documents yet</p>
          ) : (
            Object.entries(stats?.documents?.by_scripture || {}).map(([scripture, count]) => (
              <div key={scripture} style={styles.nsRow}>
                <span className="tag tag-gold">{scripture}</span>
                <span className="mono" style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
                  {count} doc{count !== 1 ? 's' : ''}
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* API info */}
      <div className="card" style={{ marginTop: 20 }}>
        <h3 style={styles.cardTitle}>API Information</h3>
        <hr className="divider" />
        <div style={styles.infoGrid}>
          {[
            ['Service',    health?.service || '—'],
            ['Status',     health?.status  || '—'],
            ['Model',      'sarvam-m'],
            ['Embeddings', 'multilingual-e5-large'],
            ['STT Model',  'saarika:v2.5'],
            ['TTS Model',  'bulbul:v3'],
          ].map(([k, v]) => (
            <div key={k} style={styles.infoRow}>
              <span style={styles.infoKey}>{k}</span>
              <span className="mono" style={styles.infoVal}>{v}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, sub, accent, dot }) {
  return (
    <div className="card" style={{ position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: accent || 'var(--gold)', opacity: 0.6 }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
        {dot && <span style={{ width: 7, height: 7, borderRadius: '50%', background: accent || 'var(--gold)', display: 'inline-block' }} />}
        <span style={{ color: 'var(--text-muted)', fontSize: 11, fontFamily: 'DM Mono, monospace', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</span>
      </div>
      <div style={{ fontFamily: 'Cormorant Garant, serif', fontSize: 32, color: accent || 'var(--text-primary)', lineHeight: 1, marginBottom: 4 }}>
        {value}
      </div>
      <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>{sub}</div>
    </div>
  );
}

const styles = {
  statGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 },
  cardTitle: { fontSize: 18, marginBottom: 2 },
  cardSubtitle: { color: 'var(--text-secondary)', fontSize: 12 },
  nsRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, gap: 12 },
  nsLeft: { minWidth: 90 },
  nsRight: { display: 'flex', alignItems: 'center', gap: 8, flex: 1 },
  nsBar: { flex: 1, height: 4, background: 'var(--border)', borderRadius: 2, overflow: 'hidden' },
  nsBarFill: { height: '100%', background: 'var(--gold)', borderRadius: 2, transition: 'width 0.5s ease' },
  infoGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 40px' },
  infoRow: { display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)' },
  infoKey: { color: 'var(--text-secondary)', fontSize: 12 },
  infoVal: { color: 'var(--text-primary)', fontSize: 12 },
};