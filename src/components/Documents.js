import React, { useState, useEffect, useRef } from 'react';
import { documentsAPI, metaAPI } from '../api';

const PAGE_SIZE = 10;

export default function Documents() {
  const [docs,        setDocs]        = useState([]);
  const [scriptures,  setScriptures]  = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState('');
  const [success,     setSuccess]     = useState('');
  const [activeForm,  setActiveForm]  = useState(null); // 'file' | 'url' | null
  const [search,      setSearch]      = useState('');
  const [filterScripture, setFilterScripture] = useState('');
  const [page,        setPage]        = useState(1);
  const [totalPages,  setTotalPages]  = useState(1);
  const [total,       setTotal]       = useState(0);
  const [deleting,    setDeleting]    = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [editingDoc,  setEditingDoc]  = useState(null);
  const [editForm,    setEditForm]    = useState({});
  const [savingEdit,  setSavingEdit]  = useState(false);

  // Upload form
  const [file,       setFile]       = useState(null);
  const [uploading,  setUploading]  = useState(false);
  const [uploadForm, setUploadForm] = useState({ scripture: 'ramayana', source: '', kanda: '', topic: '' });
  const [, setJobId]                = useState(null);
  const [jobStatus,  setJobStatus]  = useState(null);
  const jobPollRef = useRef(null);

  // URL form
  const [urlForm,   setUrlForm]   = useState({ url: '', scripture: 'ramayana', source: '', kanda: '', topic: '' });
  const [ingesting, setIngesting] = useState(false);

  const fileRef = useRef();

  useEffect(() => {
    fetchDocs();
    fetchScriptures();
    return () => { if (jobPollRef.current) clearInterval(jobPollRef.current); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { fetchDocs(); }, [page, filterScripture]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchDocs = async () => {
    setLoading(true);
    try {
      const res = await documentsAPI.list(filterScripture || null, search || null, page, PAGE_SIZE);
      setDocs(res.data.documents);
      setTotal(res.data.total);
      setTotalPages(res.data.pages || 1);
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

  const showSuccess = (msg) => {
    setSuccess(msg);
    setTimeout(() => setSuccess(''), 4000);
  };

  // ── Search ──────────────────────────────────────────────────────────────────
  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    fetchDocs();
  };

  // ── Upload with progress polling ───────────────────────────────────────────
  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) return;
    setUploading(true);
    setError('');
    setJobStatus({ status: 'pending', progress: 0, message: 'Starting...' });

    const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB per chunk
    const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
    const useChunked = file.size > CHUNK_SIZE;

    const startPolling = (jobId, filename) => {
      jobPollRef.current = setInterval(async () => {
        try {
          const jobRes = await documentsAPI.getJob(jobId);
          setJobStatus(jobRes.data);
          if (jobRes.data.status === 'done') {
            clearInterval(jobPollRef.current);
            setUploading(false);
            setFile(null);
            setActiveForm(null);
            setUploadForm({ scripture: 'ramayana', source: '', kanda: '', topic: '' });
            setJobStatus(null);
            setJobId(null);
            showSuccess(`✓ Ingested "${filename}" — ${jobRes.data.chunk_count} chunks`);
            fetchDocs();
          } else if (jobRes.data.status === 'error') {
            clearInterval(jobPollRef.current);
            setUploading(false);
            setJobStatus(null);
            setError(`Ingestion failed: ${jobRes.data.message}`);
          }
        } catch (err) { clearInterval(jobPollRef.current); setUploading(false); }
      }, 1500);
    };

    try {
      if (!useChunked) {
        // ── Small file: single-shot upload ──────────────────────────────────
        const fd = new FormData();
        fd.append('file',      file);
        fd.append('scripture', uploadForm.scripture);
        fd.append('source',    uploadForm.source || file.name);
        fd.append('kanda',     uploadForm.kanda);
        fd.append('topic',     uploadForm.topic);
        const res = await documentsAPI.upload(fd);
        setJobId(res.data.job_id);
        startPolling(res.data.job_id, res.data.filename);
      } else {
        // ── Large file: chunked upload ───────────────────────────────────────
        // Step 1: initialise session
        const initFd = new FormData();
        initFd.append('filename',     file.name);
        initFd.append('total_chunks', totalChunks);
        initFd.append('scripture',    uploadForm.scripture);
        initFd.append('source',       uploadForm.source || file.name);
        initFd.append('kanda',        uploadForm.kanda);
        initFd.append('topic',        uploadForm.topic);
        const initRes = await documentsAPI.uploadInit(initFd);
        const { upload_id, job_id } = initRes.data;
        setJobId(job_id);

        // Step 2: send chunks sequentially
        for (let i = 0; i < totalChunks; i++) {
          const start = i * CHUNK_SIZE;
          const blob  = file.slice(start, start + CHUNK_SIZE);
          const chunkFd = new FormData();
          chunkFd.append('upload_id',   upload_id);
          chunkFd.append('chunk_index', i);
          chunkFd.append('chunk',       blob, file.name);
          await documentsAPI.uploadChunk(chunkFd);
        }

        // Step 3: finalise — kicks off ingestion
        const finFd = new FormData();
        finFd.append('upload_id', upload_id);
        await documentsAPI.uploadFinalise(finFd);
        startPolling(job_id, file.name);
      }
    } catch (e) {
      setUploading(false);
      setJobStatus(null);
      setError(e.response?.data?.detail || 'Upload failed');
    }
  };

  // ── Ingest URL ─────────────────────────────────────────────────────────────
  const handleIngestURL = async (e) => {
    e.preventDefault();
    setIngesting(true);
    setError('');
    try {
      const res = await documentsAPI.ingestURL(urlForm);
      showSuccess(`✓ Ingested URL — ${res.data.chunk_count} chunks`);
      setUrlForm({ url: '', scripture: 'ramayana', source: '', kanda: '', topic: '' });
      setActiveForm(null);
      fetchDocs();
    } catch (e) {
      setError(e.response?.data?.detail || 'URL ingestion failed');
    } finally {
      setIngesting(false);
    }
  };

  // ── Delete with confirmation ───────────────────────────────────────────────
  const handleDeleteConfirm = async () => {
    if (!confirmDelete) return;
    setDeleting(confirmDelete.id);
    setConfirmDelete(null);
    try {
      await documentsAPI.delete(confirmDelete.id);
      showSuccess(`✓ Removed "${confirmDelete.source}"`);
      fetchDocs();
    } catch (e) {
      setError('Delete failed');
    } finally {
      setDeleting(null);
    }
  };

  // ── Edit metadata ──────────────────────────────────────────────────────────
  const startEdit = (doc) => {
    setEditingDoc(doc.id);
    setEditForm({ source: doc.source, kanda: doc.kanda || '', topic: doc.topic || '', scripture: doc.scripture });
  };

  const handleSaveEdit = async (doc) => {
    setSavingEdit(true);
    try {
      await documentsAPI.update(doc.id, editForm);
      showSuccess('✓ Document updated');
      setEditingDoc(null);
      fetchDocs();
    } catch (e) {
      setError('Update failed');
    } finally {
      setSavingEdit(false);
    }
  };

  // ── Shared form fields ─────────────────────────────────────────────────────
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

      {/* Confirm delete modal */}
      {confirmDelete && (
        <div style={styles.modalOverlay}>
          <div style={styles.modal} className="fade-in">
            <h3 style={{ fontSize: 18, marginBottom: 8 }}>Remove Document</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginBottom: 20 }}>
              Are you sure you want to remove <strong style={{ color: 'var(--text-primary)' }}>"{confirmDelete.source}"</strong>?
              This removes the tracking record. Pinecone vectors remain until the namespace is cleared.
            </p>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button className="btn btn-ghost" onClick={() => setConfirmDelete(null)}>Cancel</button>
              <button className="btn btn-danger" style={{ border: '1px solid var(--error)' }} onClick={handleDeleteConfirm}>
                Remove
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Action bar */}
      <div style={styles.actionBar}>
        <form onSubmit={handleSearch} style={styles.searchRow}>
          <input
            className="input"
            style={{ width: 220 }}
            placeholder="Search documents..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <select className="input" style={{ width: 160 }} value={filterScripture} onChange={e => { setFilterScripture(e.target.value); setPage(1); }}>
            <option value="">All Scriptures</option>
            {scriptures.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <button className="btn btn-ghost" type="submit">Search</button>
          {(search || filterScripture) && (
            <button className="btn btn-ghost" type="button" onClick={() => { setSearch(''); setFilterScripture(''); setPage(1); setTimeout(fetchDocs, 50); }}>
              Clear
            </button>
          )}
          <span style={styles.docCount}>{total} document{total !== 1 ? 's' : ''}</span>
        </form>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-ghost" onClick={() => setActiveForm(activeForm === 'url' ? null : 'url')}>🔗 Ingest URL</button>
          <button className="btn btn-primary" onClick={() => setActiveForm(activeForm === 'file' ? null : 'file')}>↑ Upload File</button>
          <button className="btn btn-ghost" onClick={() => { const base = process.env.REACT_APP_API_URL || 'http://localhost:8080'; const token = localStorage.getItem('sutradhar_token'); const url = `${base}/documents/export${filterScripture ? '?scripture=' + filterScripture : ''}`; fetch(url, { headers: { Authorization: 'Bearer ' + token } }).then(r => r.blob()).then(b => { const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = 'sutradhar_documents.csv'; a.click(); }); }}>⬇ Export CSV</button>
        </div>
      </div>

      {/* Upload form */}
      {activeForm === 'file' && (
        <div className="card fade-in" style={{ marginBottom: 24 }}>
          <h3 style={styles.formTitle}>Upload Document</h3>
          <p style={styles.formHint}>Supports PDF, DOCX, TXT</p>
          <form onSubmit={handleUpload}>
            <div style={{ ...styles.dropZone, ...(file ? styles.dropZoneActive : {}) }} onClick={() => !uploading && fileRef.current.click()}>
              {file ? <span style={{ color: 'var(--gold)' }}>📄 {file.name}</span>
                    : <span>Click to select file <span style={{ color: 'var(--text-muted)' }}>(PDF, DOCX, TXT)</span></span>}
              <input ref={fileRef} type="file" accept=".pdf,.docx,.txt" style={{ display: 'none' }} onChange={e => setFile(e.target.files[0])} />
            </div>

            {/* Progress bar */}
            {jobStatus && (
              <div style={styles.progressContainer}>
                <div style={styles.progressHeader}>
                  <span style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{jobStatus.message}</span>
                  <span className="mono" style={{ color: 'var(--gold)', fontSize: 12 }}>{jobStatus.progress}%</span>
                </div>
                <div style={styles.progressBar}>
                  <div style={{ ...styles.progressFill, width: `${jobStatus.progress}%` }} />
                </div>
              </div>
            )}

            {formFields(uploadForm, setUploadForm)}
            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
              <button className="btn btn-primary" type="submit" disabled={!file || uploading}>
                {uploading ? <><span className="spinner" /> Ingesting...</> : 'Ingest Document'}
              </button>
              <button className="btn btn-ghost" type="button" onClick={() => { setActiveForm(null); setFile(null); setJobStatus(null); }}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* URL form */}
      {activeForm === 'url' && (
        <div className="card fade-in" style={{ marginBottom: 24 }}>
          <h3 style={styles.formTitle}>Ingest from URL</h3>
          <p style={styles.formHint}>Paste any web page URL — content will be extracted and chunked</p>
          <form onSubmit={handleIngestURL}>
            <div style={styles.field}>
              <label style={styles.label}>URL</label>
              <input className="input" type="url" required placeholder="https://sacred-texts.com/hin/rama/..." value={urlForm.url} onChange={e => setUrlForm({...urlForm, url: e.target.value})} />
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
            <p style={{ color: 'var(--text-muted)' }}>No documents found.</p>
            <p style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 4 }}>Upload a file or ingest a URL to get started.</p>
          </div>
        ) : (
          <>
            <table style={styles.table}>
              <thead>
                <tr style={styles.tableHead}>
                  <th style={styles.th}>Source</th>
                  <th style={styles.th}>Scripture</th>
                  <th style={styles.th}>Kanda</th>
                  <th style={styles.th}>Topic</th>
                  <th style={styles.th}>Type</th>
                  <th style={styles.th}>Chunks</th>
                  <th style={styles.th}>Added</th>
                  <th style={styles.th}></th>
                </tr>
              </thead>
              <tbody>
                {docs.map((doc, i) => (
                  <React.Fragment key={doc.id}>
                    <tr style={{ ...styles.tableRow, ...(i % 2 === 0 ? {} : { background: 'rgba(255,255,255,0.01)' }) }}>
                      <td style={styles.td}><span style={styles.sourceText}>{doc.source}</span></td>
                      <td style={styles.td}><span className="tag tag-gold">{doc.scripture}</span></td>
                      <td style={styles.td}><span style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{doc.kanda || '—'}</span></td>
                      <td style={styles.td}><span style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{doc.topic || '—'}</span></td>
                      <td style={styles.td}><span className={`tag ${doc.doc_type === 'url' ? 'tag-gray' : 'tag-green'}`}>{doc.doc_type === 'url' ? '🔗 url' : '📄 file'}</span></td>
                      <td style={styles.td}><span className="mono" style={{ color: 'var(--text-secondary)' }}>{doc.chunk_count}</span></td>
                      <td style={styles.td}><span style={{ color: 'var(--text-muted)', fontSize: 12 }}>{new Date(doc.added_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span></td>
                      <td style={styles.td}>
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button className="btn btn-ghost" style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => editingDoc === doc.id ? setEditingDoc(null) : startEdit(doc)}>
                            {editingDoc === doc.id ? 'Cancel' : 'Edit'}
                          </button>
                          <button className="btn btn-danger" style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => setConfirmDelete(doc)} disabled={deleting === doc.id}>
                            {deleting === doc.id ? <span className="spinner" style={{ width: 12, height: 12 }} /> : 'Remove'}
                          </button>
                        </div>
                      </td>
                    </tr>

                    {/* Inline edit row */}
                    {editingDoc === doc.id && (
                      <tr style={{ background: 'rgba(201,168,76,0.04)', borderBottom: '1px solid var(--border-accent)' }}>
                        <td colSpan={8} style={{ padding: '16px 16px' }}>
                          <div style={styles.formGrid}>
                            <div style={styles.field}>
                              <label style={styles.label}>Source</label>
                              <input className="input" value={editForm.source} onChange={e => setEditForm({...editForm, source: e.target.value})} />
                            </div>
                            <div style={styles.field}>
                              <label style={styles.label}>Scripture</label>
                              <select className="input" value={editForm.scripture} onChange={e => setEditForm({...editForm, scripture: e.target.value})}>
                                {scriptures.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                              </select>
                            </div>
                            <div style={styles.field}>
                              <label style={styles.label}>Kanda</label>
                              <input className="input" placeholder="e.g. Bala Kanda" value={editForm.kanda} onChange={e => setEditForm({...editForm, kanda: e.target.value})} />
                            </div>
                            <div style={styles.field}>
                              <label style={styles.label}>Topic</label>
                              <input className="input" placeholder="e.g. Rama's exile" value={editForm.topic} onChange={e => setEditForm({...editForm, topic: e.target.value})} />
                            </div>
                          </div>
                          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                            <button className="btn btn-primary" onClick={() => handleSaveEdit(doc)} disabled={savingEdit}>
                              {savingEdit ? <><span className="spinner" /> Saving...</> : 'Save Changes'}
                            </button>
                            <button className="btn btn-ghost" onClick={() => setEditingDoc(null)}>Cancel</button>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>

            {/* Pagination */}
            {totalPages > 1 && (
              <div style={styles.pagination}>
                <button className="btn btn-ghost" style={{ padding: '4px 12px' }} disabled={page === 1} onClick={() => setPage(p => p - 1)}>← Prev</button>
                <span style={{ color: 'var(--text-muted)', fontSize: 12, fontFamily: 'DM Mono, monospace' }}>
                  Page {page} of {totalPages}
                </span>
                <button className="btn btn-ghost" style={{ padding: '4px 12px' }} disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>Next →</button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

const styles = {
  actionBar:         { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 },
  searchRow:         { display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  docCount:          { color: 'var(--text-muted)', fontSize: 12, fontFamily: 'DM Mono, monospace' },
  formTitle:         { fontSize: 18, marginBottom: 4 },
  formHint:          { color: 'var(--text-secondary)', fontSize: 12, marginBottom: 16 },
  formGrid:          { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 },
  field:             { marginBottom: 4 },
  label:             { display: 'block', color: 'var(--text-secondary)', fontSize: 11, fontFamily: 'DM Mono, monospace', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 5 },
  dropZone:          { border: '1px dashed var(--border)', borderRadius: 'var(--radius)', padding: '24px', textAlign: 'center', cursor: 'pointer', color: 'var(--text-secondary)', fontSize: 13, marginBottom: 16, transition: 'var(--transition)' },
  dropZoneActive:    { borderColor: 'var(--gold-dim)', background: 'rgba(201,168,76,0.05)' },
  progressContainer: { marginBottom: 16 },
  progressHeader:    { display: 'flex', justifyContent: 'space-between', marginBottom: 6 },
  progressBar:       { height: 4, background: 'var(--border)', borderRadius: 2, overflow: 'hidden' },
  progressFill:      { height: '100%', background: 'var(--gold)', borderRadius: 2, transition: 'width 0.4s ease' },
  table:             { width: '100%', borderCollapse: 'collapse' },
  tableHead:         { borderBottom: '1px solid var(--border)', background: 'var(--bg-secondary)' },
  th:                { padding: '10px 16px', textAlign: 'left', color: 'var(--text-muted)', fontSize: 11, fontFamily: 'DM Mono, monospace', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 500 },
  tableRow:          { borderBottom: '1px solid var(--border)', transition: 'var(--transition)' },
  td:                { padding: '12px 16px', verticalAlign: 'middle' },
  sourceText:        { color: 'var(--text-primary)', fontSize: 13, fontWeight: 500 },
  emptyState:        { padding: '48px 24px', textAlign: 'center' },
  pagination:        { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, padding: '16px', borderTop: '1px solid var(--border)' },
  modalOverlay:      { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  modal:             { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '28px 32px', width: '100%', maxWidth: 420 },
};