import React, { useState } from 'react';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8080';

export default function TestQuestion() {
  const [question,  setQuestion]  = useState('');
  const [scripture]               = useState('ramayana');
  const [language,  setLanguage]  = useState('English');
  const [loading,   setLoading]   = useState(false);
  const [result,    setResult]    = useState(null);
  const [error,     setError]     = useState('');

  const LANGUAGES = ['English','Hindi','Tamil','Telugu','Kannada','Malayalam','Bengali','Marathi','Gujarati','Punjabi','Odia'];

  const handleTest = async (e) => {
    e.preventDefault();
    if (!question.trim()) return;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const res = await axios.post(`${API_URL}/ask`, { question, scripture, storyteller: 'valmiki', language });
      setResult(res.data);
    } catch (e) {
      setError(e.response?.data?.detail || 'Request failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <form onSubmit={handleTest}>
        <div style={styles.formRow}>
          <div style={{ flex: 2 }}>
            <label style={styles.label}>Question</label>
            <input className="input" placeholder="e.g. Who is Hanuman?" value={question} onChange={e => setQuestion(e.target.value)} required />
          </div>
          <div style={{ flex: 1 }}>
            <label style={styles.label}>Language</label>
            <select className="input" value={language} onChange={e => setLanguage(e.target.value)}>
              {LANGUAGES.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>
          <div style={{ alignSelf: 'flex-end' }}>
            <button className="btn btn-primary" type="submit" disabled={loading || !question.trim()}>
              {loading ? <><span className="spinner" /> Testing...</> : 'Ask'}
            </button>
          </div>
        </div>
      </form>

      {error && <div className="alert alert-error" style={{ marginTop: 16 }}>{error}</div>}

      {result && (
        <div style={styles.result} className="fade-in">
          <div style={styles.answerBox}>
            <div style={styles.answerLabel}>
              <span>🧘 Valmiki's Answer</span>
              {language !== 'English' && <span className="tag tag-gray">{language}</span>}
            </div>
            <p style={styles.answerText}>{result.answer}</p>
            {result.answer_en && language !== 'English' && (
              <details style={{ marginTop: 12 }}>
                <summary style={{ color: 'var(--text-muted)', fontSize: 12, cursor: 'pointer' }}>View in English</summary>
                <p style={{ ...styles.answerText, marginTop: 8, color: 'var(--text-secondary)' }}>{result.answer_en}</p>
              </details>
            )}
          </div>
          {result.passages?.length > 0 && (
            <div style={styles.passagesBox}>
              <p style={styles.passagesTitle}>📜 {result.passages.length} Source Passages Used</p>
              {result.passages.map((p, i) => (
                <div key={i} style={styles.passage}>
                  <div style={styles.passageMeta}>
                    <span className="tag tag-gold">{p.kanda || p.source || 'Ramayana'}</span>
                    <span className="mono" style={{ color: 'var(--text-muted)', fontSize: 11 }}>score: {p.score}</span>
                  </div>
                  <p style={styles.passageText}>{p.text}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const styles = {
  formRow:      { display: 'flex', gap: 12, alignItems: 'flex-end' },
  label:        { display: 'block', color: 'var(--text-secondary)', fontSize: 11, fontFamily: 'DM Mono, monospace', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 5 },
  result:       { marginTop: 24 },
  answerBox:    { background: 'var(--bg-secondary)', border: '1px solid var(--border-accent)', borderRadius: 'var(--radius-lg)', padding: 20, marginBottom: 16 },
  answerLabel:  { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, color: 'var(--gold)', fontSize: 13, fontWeight: 500 },
  answerText:   { color: 'var(--text-primary)', fontSize: 14, lineHeight: 1.7 },
  passagesBox:  { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 20 },
  passagesTitle:{ color: 'var(--text-secondary)', fontSize: 12, fontFamily: 'DM Mono, monospace', marginBottom: 16 },
  passage:      { borderBottom: '1px solid var(--border)', paddingBottom: 12, marginBottom: 12 },
  passageMeta:  { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  passageText:  { color: 'var(--text-secondary)', fontSize: 13, lineHeight: 1.6 },
};