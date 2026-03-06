import React, { useState, useEffect, useRef } from 'react';
import { documentsAPI, metaAPI } from '../api';

export default function Documents() {
  const [docs,       setDocs]       = useState([]);
  const [scriptures, setScriptures] = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState('');
  const [success,    setSuccess]    = useState('');
  const [activeForm, setActiveForm] = useState(null); // 'file' | 'url' | null
  const [filterScripture, setFilterScripture] = useState('');
  const [deleting,   setDeleting]   = useState(null);

  // Upload form state
  const [file,      setFile]      = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadForm, setUploadForm] = useState({ scripture: 'ramayana', source: '', kanda: '', topic: '' });

  // URL ingest form state
  const [urlForm,    setUrlForm]    = useState({ url: '', scripture: 'ramayana', source: '', kanda: '', topic: '' });
  const [ingesting,  setIngesting]  = useState(false);

  const fileRef = useRef();

  useEffect(() => {
    fetchDocs();
    fetchScriptures();
  }, []);

  const fetchDocs = async (scripture = '') => {
    setLoading(true);
    try {
      const res = await documentsAPI.list(scripture || null);
      setDocs(res.data.documents);
    } catch (e) {
      setError('Failed to load documents');
    } finally {
      setLoading(false);
    }
  };

  const fetchScriptures = async () => {
    try {
      const res = await metaAPI.scriptures();
      setScriptures(res.data.scriptures);
    } catch (e) {}
  };

  const handleFilter = (val) => {
    setFilterScripture(val);
    fetchDocs(val);
  };

  const showSuccess = (msg) => {
    setSuccess(msg);
    setTimeout(() => setSuccess(''), 4000);
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) return;
    setUploading(true);
    setError('');
    try {
      const fd = new FormData();
      fd.append('file',      file);
      fd.append('scripture', uploadForm.scripture);
      fd.append('source',    uploadForm.source || file.name);
      fd.append('kanda',     uploadForm.kanda);
      fd.append('topic',     uploadForm.topic);
      const res = await documentsAPI.upload(fd);
      showSuccess(`✓ Ingested "${res.data.filename}" — ${res.data.chunk_count} chunks`);
      setFile(null);
      setActiveForm(null);
      setUploadForm({ scripture: 'ramayana', source: '', kanda: '', topic: '' });
      fetchDocs(filterScripture);
    } catch (e) {
      setError(e.response?.data?.detail || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleIngestURL = async (e) => {
    e.preventDefault();
    setIngesting(true);
    setError('');
    try {
      const res = await documentsAPI.ingestURL(urlForm);
      showSuccess(`✓ Ingested URL — ${res.data.chunk_count} chunks`);
      setUrlForm({ url: '', scripture: 'ramayana', source: '', kanda: '', topic: '' });
      setActiveForm(null);
      fetchDocs(filterScripture);
    } catch (e) {
      setError(e.response?.data?.detail || 'URL ingestion failed');
    } finally {
      setIngesting(false);
    }
  };

  const handleDelete = async (doc) => {
    if (!window.confirm(`Remove "${doc.source}" from records?`)) return;
    setDeleting(doc.id);
    try {
      await documentsAPI.delete(doc.id);
      showSuccess(`✓ Removed "${doc.source}"`);
      fetchDocs(filterScripture);
    } catch (e) {
      setError('Delete failed');
    } finally {
      setDeleting(null);
    }
  };

  const formFields = (form, setForm) => (
    <div style={styles.formGrid}>
      <div style={styles.field}>
        <label style={styles.label}>Scripture</label>
        <select className="input" value={form.scripture} onChange={e => setForm({...form, scripture: e.target.value})}>
          {scriptures.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </div>
      <div style={styles.field}>
        <label style={styles.label}>Source Name</label>
        <input className="input" placeholder="e.g. Valmiki Ramayana Vol 1" value={form.source} onChange={e => setForm({...form, source: e.target.value})} />
      </div>
      <div style={styles.field}>
        <label style={styles.label}>Kanda / Section</label>
        <input className="input" placeholder="e.g. Bala Kanda" value={form.kanda} onChange={e => setForm({...form, kanda: e.target.value})} />
      </div>
      <div style={styles.field}>
        <label style={styles.label}>Topic Tag</label>
        <input className="input" placeholder="e.g. Rama's exile" value={form.topic} onChange={e => setForm({...form, topic: e.target.value})} />
      </div>
    </div>
  );

  return (
    <div>
      {error   && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      {/* Action bar */}
      <div style={styles.actionBar}>
        <div style={styles.filterRow}>
          <select className="input" style={{ width: 180 }} value={filterScripture} onChange={e => handleFilter(e.target.value)}>
            <option value="">All Scriptures</option>
            {scriptures.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <span style={styles.docCount}>{docs.length} document{docs.length !== 1 ? 's' : ''}</span>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-ghost" onClick={() => setActiveForm(activeForm === 'url' ? null : 'url')}>
            🔗 Ingest URL
          </button>
          <button className="btn btn-primary" onClick={() => setActiveForm(activeForm === 'file' ? null : 'file')}>
            ↑ Upload File
          </button>
        </div>
      </div>

      {/* Upload file form */}
      {activeForm === 'file' && (
        <div className="card fade-in" style={{ marginBottom: 24 }}>
          <h3 style={styles.formTitle}>Upload Document</h3>
          <p style={styles.formHint}>Supports PDF, DOCX, TXT — max recommended 10MB</p>
          <form onSubmit={handleUpload}>
            <div
              style={{ ...styles.dropZone, ...(file ? styles.dropZoneActive : {}) }}
              onClick={() => fileRef.current.click()}
            >
              {file
                ? <span style={{ color: 'var(--gold)' }}>📄 {file.name}</span>
                : <span>Click to select file <span style={{ color: 'var(--text-muted)' }}>(PDF, DOCX, TXT)</span></span>
              }
              <input ref={fileRef} type="file" accept=".pdf,.docx,.txt" style={{ display: 'none' }}
                onChange={e => setFile(e.target.files[0])} />
            </div>
            {formFields(uploadForm, setUploadForm)}
            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
              <button className="btn btn-primary" type="submit" disabled={!file || uploading}>
                {uploading ? <><span className="spinner" /> Ingesting...</> : 'Ingest Document'}
              </button>
              <button className="btn btn-ghost" type="button" onClick={() => { setActiveForm(null); setFile(null); }}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Ingest URL form */}
      {activeForm === 'url' && (
        <div className="card fade-in" style={{ marginBottom: 24 }}>
          <h3 style={styles.formTitle}>Ingest from URL</h3>
          <p style={styles.formHint}>Paste any web page URL — content will be extracted and chunked</p>
          <form onSubmit={handleIngestURL}>
            <div style={styles.field}>
              <label style={styles.label}>URL</label>
              <input className="input" type="url" required placeholder="https://sacred-texts.com/hin/rama/..."
                value={urlForm.url} onChange={e => setUrlForm({...urlForm, url: e.target.value})} />
            </div>
            {formFields(urlForm, setUrlForm)}
            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
              <button className="btn btn-primary" type="submit" disabled={ingesting}>
                {ingesting ? <><span className="spinner" /> Ingesting...</> : 'Ingest URL'}
              </button>
              <button className="btn btn-ghost" type="button" onClick={() => setActiveForm(null)}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* Documents table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={styles.emptyState}><span className="spinner" /></div>
        ) : docs.length === 0 ? (
          <div style={styles.emptyState}>
            <p style={{ color: 'var(--text-muted)' }}>No documents ingested yet.</p>
            <p style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 4 }}>Upload a file or ingest a URL to get started.</p>
          </div>
        ) : (
          <table style={styles.table}>
            <thead>
              <tr style={styles.tableHead}>
                <th style={styles.th}>Source</th>
                <th style={styles.th}>Scripture</th>
                <th style={styles.th}>Kanda</th>
                <th style={styles.th}>Type</th>
                <th style={styles.th}>Chunks</th>
                <th style={styles.th}>Added</th>
                <th style={styles.th}></th>
              </tr>
            </thead>
            <tbody>
              {docs.map((doc, i) => (
                <tr key={doc.id} style={{ ...styles.tableRow, ...(i % 2 === 0 ? {} : { background: 'rgba(255,255,255,0.01)' }) }}>
                  <td style={styles.td}>
                    <span style={styles.sourceText}>{doc.source}</span>
                  </td>
                  <td style={styles.td}>
                    <span className="tag tag-gold">{doc.scripture}</span>
                  </td>
                  <td style={styles.td}>
                    <span style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{doc.kanda || '—'}</span>
                  </td>
                  <td style={styles.td}>
                    <span className={`tag ${doc.doc_type === 'url' ? 'tag-gray' : 'tag-green'}`}>
                      {doc.doc_type === 'url' ? '🔗 url' : '📄 file'}
                    </span>
                  </td>
                  <td style={styles.td}>
                    <span className="mono" style={{ color: 'var(--text-secondary)' }}>{doc.chunk_count}</span>
                  </td>
                  <td style={styles.td}>
                    <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>
                      {new Date(doc.added_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                  </td>
                  <td style={styles.td}>
                    <button className="btn btn-danger" style={{ padding: '4px 10px', fontSize: 12 }}
                      onClick={() => handleDelete(doc)} disabled={deleting === doc.id}>
                      {deleting === doc.id ? <span className="spinner" style={{ width: 12, height: 12 }} /> : 'Remove'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

const styles = {
  actionBar: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  filterRow: { display: 'flex', alignItems: 'center', gap: 12 },
  docCount: { color: 'var(--text-muted)', fontSize: 12, fontFamily: 'DM Mono, monospace' },
  formTitle: { fontSize: 18, marginBottom: 4 },
  formHint: { color: 'var(--text-secondary)', fontSize: 12, marginBottom: 16 },
  formGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 },
  field: { marginBottom: 4 },
  label: { display: 'block', color: 'var(--text-secondary)', fontSize: 11, fontFamily: 'DM Mono, monospace', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 5 },
  dropZone: { border: '1px dashed var(--border)', borderRadius: 'var(--radius)', padding: '24px', textAlign: 'center', cursor: 'pointer', color: 'var(--text-secondary)', fontSize: 13, marginBottom: 16, transition: 'var(--transition)' },
  dropZoneActive: { borderColor: 'var(--gold-dim)', background: 'rgba(201,168,76,0.05)' },
  table: { width: '100%', borderCollapse: 'collapse' },
  tableHead: { borderBottom: '1px solid var(--border)', background: 'var(--bg-secondary)' },
  th: { padding: '10px 16px', textAlign: 'left', color: 'var(--text-muted)', fontSize: 11, fontFamily: 'DM Mono, monospace', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 500 },
  tableRow: { borderBottom: '1px solid var(--border)', transition: 'var(--transition)' },
  td: { padding: '12px 16px', verticalAlign: 'middle' },
  sourceText: { color: 'var(--text-primary)', fontSize: 13, fontWeight: 500 },
  emptyState: { padding: '48px 24px', textAlign: 'center' },
};