import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Documents from '../components/Documents';
import Stats from '../components/Stats';
import TestQuestion from '../components/TestQuestion';

const TABS = [
  { id: 'Documents', icon: '📄', label: 'Documents' },
  { id: 'Test',      icon: '🧪', label: 'Test Question' },
  { id: 'Stats',     icon: '📊', label: 'Stats' },
];

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState('Documents');
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('sutradhar_token');
    navigate('/login');
  };

  const activeTabObj = TABS.find(t => t.id === activeTab);

  return (
    <div style={styles.layout}>
      <aside style={styles.sidebar}>
        <div style={styles.sidebarTop}>
          <div style={styles.logoMark}>सू</div>
          <div style={styles.logoText}>
            <span style={styles.logoName}>Sutradhar</span>
            <span style={styles.logoRole}>Admin Portal</span>
          </div>
        </div>
        <hr className="divider" style={{ margin: '16px 0' }} />
        <nav style={styles.nav}>
          {TABS.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              style={{ ...styles.navItem, ...(activeTab === tab.id ? styles.navItemActive : {}) }}>
              <span style={styles.navIcon}>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </nav>
        <div style={styles.sidebarBottom}>
          <button className="btn btn-ghost" onClick={handleLogout} style={{ width: '100%', justifyContent: 'center' }}>
            Sign Out
          </button>
        </div>
      </aside>

      <main style={styles.main}>
        <header style={styles.header}>
          <div>
            <h2 style={styles.pageTitle}>{activeTabObj?.icon} {activeTab}</h2>
            <p style={styles.pageSubtitle}>
              {activeTab === 'Documents'  && 'Manage knowledge base documents and ingestion'}
              {activeTab === 'Test'       && 'Test questions directly against the API'}
              {activeTab === 'Stats'      && 'Monitor Pinecone index and API health'}
            </p>
          </div>
        </header>
        <div style={styles.content} className="fade-in">
          {activeTab === 'Documents' && <Documents />}
          {activeTab === 'Test'      && <TestQuestion />}
          {activeTab === 'Stats'     && <Stats />}
        </div>
      </main>
    </div>
  );
}

const styles = {
  layout:        { display: 'flex', minHeight: '100vh', background: 'var(--bg-primary)' },
  sidebar:       { width: 220, minHeight: '100vh', background: 'var(--bg-secondary)', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', padding: '24px 16px', position: 'fixed', top: 0, left: 0, bottom: 0 },
  sidebarTop:    { display: 'flex', alignItems: 'center', gap: 10, padding: '0 4px' },
  logoMark:      { fontFamily: 'Cormorant Garant, serif', fontSize: 28, color: 'var(--gold)', lineHeight: 1 },
  logoText:      { display: 'flex', flexDirection: 'column' },
  logoName:      { fontFamily: 'Cormorant Garant, serif', fontSize: 18, color: 'var(--text-primary)', letterSpacing: '0.04em', lineHeight: 1.2 },
  logoRole:      { fontFamily: 'DM Mono, monospace', fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' },
  nav:           { display: 'flex', flexDirection: 'column', gap: 4, flex: 1 },
  navItem:       { display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 'var(--radius)', background: 'transparent', border: 'none', color: 'var(--text-secondary)', fontSize: 13, fontFamily: 'DM Sans, sans-serif', cursor: 'pointer', textAlign: 'left', transition: 'var(--transition)', width: '100%' },
  navItemActive: { background: 'rgba(201,168,76,0.1)', color: 'var(--gold)', borderLeft: '2px solid var(--gold)' },
  navIcon:       { fontSize: 14 },
  sidebarBottom: { marginTop: 'auto', paddingTop: 16 },
  main:          { marginLeft: 220, flex: 1, display: 'flex', flexDirection: 'column' },
  header:        { padding: '28px 36px 20px', borderBottom: '1px solid var(--border)', background: 'var(--bg-secondary)' },
  pageTitle:     { fontSize: 26, fontFamily: 'Cormorant Garant, serif' },
  pageSubtitle:  { color: 'var(--text-secondary)', fontSize: 13, marginTop: 2 },
  content:       { padding: '32px 36px', flex: 1 },
};