import React, { useEffect, useMemo, useState } from 'react';
import acsLogo from './assets/acs-logo.png';

const API_BASE = process.env.REACT_APP_API_BASE || 'https://server-nine-olive-75.vercel.app';
const STAGES = ['New', 'Qualified', 'Meeting Booked', 'Proposal Sent', 'Won', 'Lost'];

function useAuth() {
  const [token, setToken] = useState(() => localStorage.getItem('acs_token') || '');
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem('acs_user');
    return raw ? JSON.parse(raw) : null;
  });
  const login = (payload) => {
    setToken(payload.token);
    setUser(payload.user);
    localStorage.setItem('acs_token', payload.token);
    localStorage.setItem('acs_user', JSON.stringify(payload.user));
  };
  const logout = () => {
    setToken('');
    setUser(null);
    localStorage.removeItem('acs_token');
    localStorage.removeItem('acs_user');
  };
  return { token, user, login, logout };
}

async function apiFetch(path, { method = 'GET', body, token, publicRoute = false } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (!publicRoute && token) headers.Authorization = `Bearer ${token}`;
  const apiPath = path.startsWith('/api') ? path : `/api${path}`;
  const res = await fetch(`${API_BASE}${apiPath}`, {
    method, headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || 'Request failed');
  }
  return res.json().catch(() => ({}));
}

function Toast({ message, meta }) {
  if (!message) return null;
  return (
    <div className="ev-toast">
      <div className="ev-toast-dot" />
      <div>
        <div>{message}</div>
        {meta && <div className="ev-toast-meta">{meta}</div>}
      </div>
    </div>
  );
}

function PublicLeadForm({ onSubmitted }) {
  const [form, setForm] = useState({
    leadType: 'CHS', name: '', phone: '', email: '', area: '', locality: '',
    propertySizeFlats: '', parkingType: 'basement', currentEvCount: '',
    chargerInterest: [], notes: '', consent: true, decisionMakerKnown: false,
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [lastResult, setLastResult] = useState(null);

  const toggleCharger = (value) => {
    setForm((prev) => {
      const exists = prev.chargerInterest.includes(value);
      return { ...prev, chargerInterest: exists ? prev.chargerInterest.filter((v) => v !== value) : [...prev.chargerInterest, value] };
    });
  };
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.phone || !form.area) { setError('Please fill contact name, mobile and area.'); return; }
    setError(''); setSubmitting(true);
    try {
      const payload = { ...form, propertySizeFlats: form.propertySizeFlats ? Number(form.propertySizeFlats) : undefined, currentEvCount: form.currentEvCount ? Number(form.currentEvCount) : undefined };
      const res = await apiFetch('/leads/public', { method: 'POST', body: payload, publicRoute: true });
      onSubmitted?.(res.leadId);
      setLastResult(res);
      setForm((prev) => ({ ...prev, name: '', phone: '', email: '', locality: '', propertySizeFlats: '', currentEvCount: '', notes: '', decisionMakerKnown: false }));
    } catch (err) { console.error(err); onSubmitted?.(null, err); } finally { setSubmitting(false); }
  };
  return (
    <div className="ev-panel">
      <div className="ev-panel-header">
        <div><div className="ev-panel-title">Capture new EV lead</div><div className="ev-panel-subtitle">For CHS, hotels, corporate parks and developers across MMR.</div></div>
        <button type="button" className="ev-tag ev-tag-button" onClick={() => { const el = document.getElementById('lead-name'); if (el) el.focus(); }}>Public / Phone intake</button>
      </div>
      <form onSubmit={handleSubmit}>
        <div className="ev-input-grid">
          <div className="ev-field"><div className="ev-label-row"><span className="ev-label">Lead type <span>*</span></span></div>
            <select name="leadType" value={form.leadType} onChange={handleChange} className="ev-select">
              <option value="CHS">CHS</option><option value="Hotel">Hotel</option><option value="Corporate">Corporate Park</option><option value="Developer">Developer</option><option value="Other">Other</option>
            </select></div>
          <div className="ev-field"><div className="ev-label-row"><span className="ev-label">Decision maker known?</span></div>
            <div className="ev-checkbox-row"><input type="checkbox" name="decisionMakerKnown" checked={form.decisionMakerKnown} onChange={handleChange} /><span>Committee member / Facility head identified</span></div></div>
          <div className="ev-field"><div className="ev-label-row"><span className="ev-label">Contact name <span>*</span></span></div>
            <input name="name" value={form.name} onChange={handleChange} className="ev-input" id="lead-name" placeholder="e.g. Rohan Mehta" required /></div>
          <div className="ev-field"><div className="ev-label-row"><span className="ev-label">Mobile <span>*</span></span><span className="ev-hint">WhatsApp preferred</span></div>
            <input name="phone" value={form.phone} onChange={handleChange} className="ev-input" placeholder="+91…" required /></div>
          <div className="ev-field"><div className="ev-label-row"><span className="ev-label">Email</span></div>
            <input name="email" value={form.email} onChange={handleChange} className="ev-input" placeholder="name@company.com" /></div>
          <div className="ev-field"><div className="ev-label-row"><span className="ev-label">Area / locality <span>*</span></span></div>
            <input name="area" value={form.area} onChange={handleChange} className="ev-input" placeholder="e.g. Powai, Andheri East" required /></div>
          <div className="ev-field"><div className="ev-label-row"><span className="ev-label">Property name</span></div>
            <input name="locality" value={form.locality} onChange={handleChange} className="ev-input" placeholder="Society / campus name" /></div>
          <div className="ev-field"><div className="ev-label-row"><span className="ev-label">Approx flats / parking slots</span></div>
            <input name="propertySizeFlats" value={form.propertySizeFlats} onChange={handleChange} className="ev-input" type="number" min="0" placeholder="e.g. 150" /></div>
          <div className="ev-field"><div className="ev-label-row"><span className="ev-label">Parking type</span></div>
            <select name="parkingType" value={form.parkingType} onChange={handleChange} className="ev-select"><option value="basement">Basement</option><option value="open">Open</option><option value="mixed">Mixed</option></select></div>
          <div className="ev-field"><div className="ev-label-row"><span className="ev-label">Current EVs on site</span></div>
            <input name="currentEvCount" value={form.currentEvCount} onChange={handleChange} className="ev-input" type="number" min="0" placeholder="Optional" /></div>
          <div className="ev-field"><div className="ev-label-row"><span className="ev-label">Charger interest (kW)</span></div>
            <div className="ev-card-meta" style={{ marginTop: 4 }}>{['3.3', '7.4', '11', '22'].map((kw) => (
              <button key={kw} type="button" onClick={() => toggleCharger(kw)} className="ev-ghost-chip"
                style={form.chargerInterest.includes(kw) ? { borderStyle: 'solid', borderColor: 'rgba(56,189,248,0.9)', color: '#e0f2fe', background: 'radial-gradient(circle at top left, rgba(56,189,248,0.25), rgba(15,23,42,0.95))' } : undefined}>{kw} kW</button>
            ))}</div></div>
        </div>
        <div style={{ marginTop: 10 }}>
          <div className="ev-field"><div className="ev-label-row"><span className="ev-label">Notes</span><span className="ev-hint">Decision flow, objections, timing</span></div>
            <textarea name="notes" value={form.notes} onChange={handleChange} className="ev-textarea" placeholder="Capture context for ACS sales team…" /></div>
          <div className="ev-checkbox-row"><input type="checkbox" name="consent" checked={form.consent} onChange={handleChange} /><span>I have consent to be contacted by ACS on phone/WhatsApp/email regarding EV charging.</span></div>
        </div>
        <div style={{ marginTop: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span className="ev-pill-small">Auto-assigned to available salesperson</span>
          <button className="ev-primary-btn" type="submit" disabled={submitting}><span>{submitting ? 'Saving lead…' : 'Create Lead'}</span></button>
        </div>
        {error && <div style={{ marginTop: 8, fontSize: 12, color: '#fecaca' }}>{error}</div>}
        {!error && lastResult && <div style={{ marginTop: 8, fontSize: 12, color: '#bbf7d0' }}>Lead captured. ID: <strong>{lastResult.leadId}</strong>{lastResult.assignedTo && <> · Assigned to <strong>{lastResult.assignedTo}</strong></>}</div>}
      </form>
    </div>
  );
}

function LoginScreen({ onLoggedIn }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const res = await apiFetch('/auth/login', { method: 'POST', body: { email, password } });
      onLoggedIn(res);
    } catch (err) { console.error(err); setError('Login failed. Check your credentials or backend.'); } finally { setLoading(false); }
  };
  return (
    <div className="ev-login-screen">
      <div className="ev-login-card"><div className="ev-login-inner">
        <div className="ev-logo" style={{ marginBottom: 14 }}><div className="ev-logo-mark"><div className="ev-logo-icon" /></div><div><div className="ev-logo-text-main">ACS Energy</div><div className="ev-logo-text-sub">Lead cockpit for EV rollouts</div></div></div>
        <div className="ev-login-title">Sign in to ACS pipeline</div>
        <div className="ev-login-sub">One place to see every CHS, hotel, corporate park and developer in motion.</div>
        <form onSubmit={handleSubmit} autoComplete="off">
          <div className="ev-field"><div className="ev-label-row"><span className="ev-label">Work email</span></div><input className="ev-input" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@acs.in" autoComplete="off" /></div>
          <div className="ev-field" style={{ marginTop: 8 }}><div className="ev-label-row"><span className="ev-label">Password</span></div><input className="ev-input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" autoComplete="new-password" /></div>
          {error && <div style={{ color: '#fecaca', fontSize: 12, marginTop: 6 }}>{error}</div>}
          <button type="submit" className="ev-primary-btn" style={{ width: '100%', marginTop: 14 }} disabled={loading}>{loading ? 'Connecting…' : 'Login to dashboard'}</button>
        </form>
        <div className="ev-login-footer"><span className="ev-badge-ev">⚡ EV Charging CRM</span><span className="ev-pill-small" style={{ color: '#334155', fontSize: '0.62rem' }}>v1.0 · ACS Energy</span></div>
      </div></div>
    </div>
  );
}

function KanbanBoard({ leads, onSelect }) {
  const byStage = useMemo(() => {
    const grouped = {};
    STAGES.forEach((s) => (grouped[s] = []));
    leads.forEach((l) => { const stage = l.stage || 'New'; if (!grouped[stage]) grouped[stage] = []; grouped[stage].push(l); });
    return grouped;
  }, [leads]);
  return (
    <div className="ev-kanban">{STAGES.map((stage) => (
      <div key={stage} className="ev-kanban-column" data-stage={stage}>
        <div className="ev-kanban-header"><span>{stage}</span><span className="ev-kanban-badge">{byStage[stage]?.length || 0}</span></div>
        <div className="ev-kanban-scroll">{byStage[stage]?.map((lead) => (
          <button type="button" key={lead._id} className="ev-card" data-type={lead.leadType} onClick={() => onSelect(lead)}>
            <div className="ev-card-title">{lead.locality || lead.name}</div>
            <div className="ev-card-meta"><span className="ev-card-pill">{lead.leadType}</span>{lead.area && <span>{lead.area}</span>}
              {lead.leadScore != null && <span style={{ color: lead.leadScore >= 7 ? '#4ade80' : lead.leadScore >= 4 ? '#fcd34d' : '#fca5a5', fontWeight: 600 }}>⚡{lead.leadScore}</span>}
            </div>
          </button>
        ))}</div>
      </div>
    ))}</div>
  );
}

function LeadList({ leads, onSelect, users, token, showFilters }) {
  const [search, setSearch] = useState('');
  const [stageFilter, setStageFilter] = useState('');
  const [ownerFilter, setOwnerFilter] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [sortField, setSortField] = useState('createdAt');
  const [sortDir, setSortDir] = useState('desc');
  const viewLeads = useMemo(() => {
    let rows = [...leads];
    if (search) { const q = search.toLowerCase(); rows = rows.filter((l) => (l.locality || '').toLowerCase().includes(q) || (l.name || '').toLowerCase().includes(q) || (l.phone || '').toLowerCase().includes(q) || (l.area || '').toLowerCase().includes(q)); }
    if (stageFilter) rows = rows.filter((l) => (l.stage || 'New') === stageFilter);
    if (ownerFilter) rows = rows.filter((l) => l.owner && (l.owner._id === ownerFilter || l.owner === ownerFilter));
    if (fromDate) rows = rows.filter((l) => new Date(l.createdAt) >= new Date(fromDate));
    if (toDate) rows = rows.filter((l) => new Date(l.createdAt) <= new Date(toDate + 'T23:59:59'));
    rows.sort((a, b) => {
      const dir = sortDir === 'asc' ? 1 : -1;
      if (sortField === 'score') return ((a.leadScore || 0) - (b.leadScore || 0)) * dir;
      if (sortField === 'area') return ((a.area || '').localeCompare(b.area || '')) * dir;
      if (sortField === 'name') return ((a.locality || a.name || '').localeCompare(b.locality || b.name || '')) * dir;
      const ad = new Date(a.createdAt || 0).getTime(); const bd = new Date(b.createdAt || 0).getTime(); return (ad - bd) * dir;
    });
    return rows;
  }, [leads, search, stageFilter, ownerFilter, fromDate, toDate, sortField, sortDir]);
  const toggleSort = (field) => { setSortField((pf) => { if (pf === field) { setSortDir((pd) => (pd === 'asc' ? 'desc' : 'asc')); return pf; } setSortDir('asc'); return field; }); };
  const handleExportCSV = async () => {
    const params = new URLSearchParams();
    if (ownerFilter) params.set('owner', ownerFilter);
    if (stageFilter) params.set('stage', stageFilter);
    if (fromDate) params.set('fromDate', fromDate);
    if (toDate) params.set('toDate', toDate);
    const url = `${API_BASE}/api/leads/export/csv/all?${params.toString()}`;
    const headers = {};
    if (token) headers.Authorization = `Bearer ${token}`;
    const res = await fetch(url, { headers });
    const blob = await res.blob();
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'acs-leads.csv';
    a.click();
    URL.revokeObjectURL(a.href);
  };
  return (
    <div className="ev-panel" style={{ marginTop: showFilters ? 0 : 12 }}>
      <div className="ev-panel-header"><div><div className="ev-panel-title">Leads list</div><div className="ev-panel-subtitle">Search, filter and export lead data.</div></div>
        {showFilters && token && <button type="button" className="ev-primary-btn" onClick={handleExportCSV}>📥 Export CSV</button>}
      </div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 8, fontSize: 12, flexWrap: 'wrap' }}>
        <input className="ev-input" style={{ maxWidth: 220 }} placeholder="Search by name, area, phone…" value={search} onChange={(e) => setSearch(e.target.value)} />
        <select className="ev-select" style={{ maxWidth: 140 }} value={stageFilter} onChange={(e) => setStageFilter(e.target.value)}><option value="">All stages</option>{STAGES.map((s) => (<option key={s} value={s}>{s}</option>))}</select>
        {showFilters && users && users.length > 0 && (
          <select className="ev-select" style={{ maxWidth: 160 }} value={ownerFilter} onChange={(e) => setOwnerFilter(e.target.value)}>
            <option value="">All salespeople</option>{users.filter(u => u.role === 'sales').map(u => (<option key={u._id || u.id} value={u._id || u.id}>{u.name}</option>))}
          </select>
        )}
        {showFilters && <>
          <input className="ev-input" style={{ maxWidth: 140 }} type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} title="From date" />
          <input className="ev-input" style={{ maxWidth: 140 }} type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} title="To date" />
        </>}
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table className="ev-table"><thead><tr>
          <th onClick={() => toggleSort('leadId')}>Lead ID</th><th onClick={() => toggleSort('name')}>Lead</th><th>Type</th><th onClick={() => toggleSort('area')}>Area</th><th>EVs</th><th onClick={() => toggleSort('score')}>Score</th><th onClick={() => toggleSort('stage')}>Stage</th><th>Owner</th>
        </tr></thead><tbody>
            {viewLeads.map((lead) => (
              <tr key={lead._id} onClick={() => onSelect(lead)} style={{ cursor: 'pointer' }}>
                <td>{lead.leadId || ''}</td><td>{lead.locality || lead.name}</td><td>{lead.leadType}</td><td>{lead.area}</td><td>{lead.currentEvCount || '-'}</td><td>{lead.leadScore ?? '-'}</td>
                <td><span className={`ev-pill-stage ${lead.stage || 'New'}`}>{lead.stage || 'New'}</span></td>
                <td>{lead.owner?.name || '—'}</td>
              </tr>
            ))}
          </tbody></table>
      </div>
    </div>
  );
}

function LeadDetail({ lead, details, onAddActivity, onCancel }) {
  const [updatingStage, setUpdatingStage] = useState(false);
  const [stage, setStage] = useState(lead?.stage || 'New');
  const [meetingDate, setMeetingDate] = useState('');
  const [proposalName, setProposalName] = useState('');
  useEffect(() => { setStage(lead?.stage || 'New'); }, [lead]);
  if (!lead) {
    return (<div className="ev-panel" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 200, textAlign: 'center', gap: '0.5rem' }}><div style={{ fontSize: '2rem' }}>📂</div><div className="ev-panel-title">Select a lead to open detail view</div><div className="ev-panel-subtitle">Click any card on the Kanban board or a row in the leads list.</div></div>);
  }
  const whatsappHref = lead.phone ? `https://wa.me/${lead.phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`Hi ${lead.name || ''}, following up from ACS about EV charging at ${lead.locality || 'your premises'}.`)}` : null;
  const scoreClass = lead.leadScore == null ? '' : lead.leadScore >= 7 ? 'high' : lead.leadScore >= 4 ? 'mid' : 'low';
  const commActivities = (details?.activities || []).filter(a => ['call', 'email', 'whatsapp', 'meeting'].includes(a.type));
  const journeyEvents = (details?.activities || []).filter(a => a.subject && a.subject.startsWith('Stage:')).reverse();
  const buildStageNote = () => {
    if (stage === 'Meeting Booked' && meetingDate) return `Meeting scheduled for ${new Date(meetingDate).toLocaleString()}`;
    if (stage === 'Proposal Sent' && proposalName) return `Proposal: ${proposalName}`;
    return `Lead moved to ${stage}`;
  };
  const handleUpdateStage = async (targetStage) => {
    const stg = targetStage || stage;
    setUpdatingStage(true);
    const note = targetStage === 'Won' ? 'Order marked as success (Won)' : buildStageNote();
    try {
      await onAddActivity(lead._id, { type: 'note', description: note }, { updateStage: stg, stageNote: note });
      setMeetingDate(''); setProposalName('');
    } finally { setUpdatingStage(false); }
  };
  return (
    <div className="ev-panel">
      <div className="ev-panel-header">
        <div>
          <div className="ev-panel-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            {lead.locality || lead.name}<span className="ev-card-pill" style={{ fontSize: '0.65rem' }}>{lead.leadType}</span>
            {lead.leadScore != null && <span className={`ev-score-badge ${scoreClass}`}>⚡ {lead.leadScore}/10</span>}
          </div>
          <div className="ev-panel-subtitle">{lead.area}{lead.owner?.name ? ` · Assigned to ${lead.owner.name}` : ''}</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
          {whatsappHref && <a href={whatsappHref} target="_blank" rel="noreferrer" className="ev-whatsapp-link"><span className="ev-whatsapp-bubble">WA</span><span>Click-to-chat</span></a>}
          <span className="ev-tag">Current: {lead.stage || 'New'}</span>
        </div>
      </div>
      <div className="ev-lead-detail-layout">
        <div>
          <div className="ev-field" style={{ marginBottom: '0.6rem' }}><div className="ev-label-row"><span className="ev-label">Contact snapshot</span></div></div>
          <div className="ev-detail-snapshot">
            <div className="ev-detail-row"><span className="ev-detail-row-label">Contact</span><span style={{ color: '#e2e8f0', fontWeight: 500 }}>{lead.name || '—'}</span></div>
            {lead.phone && <div className="ev-detail-row"><span className="ev-detail-row-label">Phone</span><a href={`tel:${lead.phone}`} style={{ color: '#7dd3fc', textDecoration: 'none' }}>{lead.phone}</a></div>}
            {lead.email && <div className="ev-detail-row"><span className="ev-detail-row-label">Email</span><a href={`mailto:${lead.email}`} style={{ color: '#7dd3fc', textDecoration: 'none' }}>{lead.email}</a></div>}
            <div className="ev-detail-row"><span className="ev-detail-row-label">EVs on site</span><span>{lead.currentEvCount ?? '—'}</span></div>
            <div className="ev-detail-row"><span className="ev-detail-row-label">Parking</span><span style={{ textTransform: 'capitalize' }}>{lead.parkingType || '—'}</span></div>
            <div className="ev-detail-row"><span className="ev-detail-row-label">Next follow-up</span><span style={{ color: lead.nextFollowUpDate ? '#fcd34d' : '#475569' }}>{lead.nextFollowUpDate ? new Date(lead.nextFollowUpDate).toLocaleDateString() : 'Not scheduled'}</span></div>
            <div className="ev-detail-row"><span className="ev-detail-row-label">Chargers</span><span>{lead.chargerInterest && lead.chargerInterest.length ? lead.chargerInterest.join(', ') + ' kW' : <span style={{ color: '#475569' }}>Not captured</span>}</span></div>
            {lead.notes && <div style={{ borderTop: '1px solid rgba(51,65,85,0.5)', paddingTop: '0.5rem', marginTop: '0.25rem', color: '#94a3b8', whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>{lead.notes}</div>}
          </div>
          <div className="ev-field" style={{ marginTop: '1rem' }}><div className="ev-label-row"><span className="ev-label">🗺️ Lead Journey</span><span className="ev-hint">Stage transitions</span></div></div>
          <div className="ev-comm-history">
            {journeyEvents.length > 0 ? journeyEvents.map((a) => (
              <div key={a._id} className="ev-comm-item">
                <div className={`ev-activity-dot ${a.type || ''}`} />
                <div>
                  <div className="ev-activity-meta"><span className="ev-activity-type" style={{ color: '#38bdf8' }}>{a.subject}</span><span>{new Date(a.createdAt).toLocaleDateString()} {new Date(a.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span></div>
                  <div className="ev-activity-body">{a.description}</div>
                  {a.user && <div className="ev-comm-by">by {a.user.name || 'System'}</div>}
                </div>
              </div>
            )) : <div style={{ fontSize: '0.75rem', color: '#334155', textAlign: 'center', padding: '0.75rem 0', fontStyle: 'italic' }}>No stage transitions yet.</div>}
          </div>
          <div className="ev-field" style={{ marginTop: '1rem' }}><div className="ev-label-row"><span className="ev-label">📧 Communication history</span><span className="ev-hint">Calls, emails, meetings</span></div></div>
          <div className="ev-comm-history">
            {commActivities.length > 0 ? commActivities.map((a) => (
              <div key={a._id} className="ev-comm-item">
                <div className={`ev-activity-dot ${a.type || ''}`} />
                <div>
                  <div className="ev-activity-meta"><span className="ev-activity-type">{a.type}</span><span>{new Date(a.createdAt).toLocaleDateString()} {new Date(a.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span></div>
                  {a.subject && <div className="ev-comm-subject">{a.subject}</div>}
                  <div className="ev-activity-body">{a.description}</div>
                  {a.user && <div className="ev-comm-by">by {a.user.name || 'Unknown'} ({a.user.role})</div>}
                </div>
              </div>
            )) : <div style={{ fontSize: '0.75rem', color: '#334155', textAlign: 'center', padding: '0.75rem 0', fontStyle: 'italic' }}>No communication history yet.</div>}
          </div>
        </div>
        <div>
          <div className="ev-field"><div className="ev-label-row"><span className="ev-label">Stage</span><span className="ev-hint">Move this deal forward</span></div>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap', marginTop: 4 }}>
              <select className="ev-select" value={stage} onChange={(e) => setStage(e.target.value)}>{STAGES.map((s) => (<option key={s} value={s}>{s}</option>))}</select>
              <button type="button" className="ev-primary-btn" disabled={updatingStage} onClick={() => handleUpdateStage()}>{updatingStage ? 'Updating…' : 'Update stage'}</button>
              <button type="button" className="ev-primary-btn" disabled={updatingStage} onClick={() => { setStage('Won'); handleUpdateStage('Won'); }}>Mark success</button>
              <button type="button" className="ev-danger-btn" onClick={() => { if (!onCancel) return; if (window.confirm('Cancel this order and remove it permanently?')) { onCancel(lead._id); } }}>Cancel order</button>
            </div>
          </div>
          {stage === 'Meeting Booked' && (
            <div className="ev-field" style={{ marginTop: 6 }}><div className="ev-label-row"><span className="ev-label">📅 Meeting date & time</span></div>
              <input className="ev-input" type="datetime-local" value={meetingDate} onChange={(e) => setMeetingDate(e.target.value)} /></div>
          )}
          {stage === 'Proposal Sent' && (
            <div className="ev-field" style={{ marginTop: 6 }}><div className="ev-label-row"><span className="ev-label">📄 Proposal name / details</span></div>
              <input className="ev-input" placeholder="e.g. ACS-Q1-2026 EV Charger Package" value={proposalName} onChange={(e) => setProposalName(e.target.value)} /></div>
          )}
          <div className="ev-field" style={{ marginTop: 8 }}><div className="ev-label-row"><span className="ev-label">Activity log</span><span className="ev-hint">All touchpoints</span></div></div>
          <div className="ev-activity-list">
            {(details?.activities || []).map((a) => (
              <div key={a._id} className="ev-activity-item"><div className={`ev-activity-dot ${a.type || ''}`} /><div>
                <div className="ev-activity-meta"><span className="ev-activity-type">{a.type}</span><span>{new Date(a.createdAt).toLocaleDateString()} {new Date(a.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span></div>
                {a.subject && <div className="ev-comm-subject">{a.subject}</div>}
                <div className="ev-activity-body">{a.description}</div>
                {a.user && <div className="ev-comm-by">by {a.user.name}</div>}
              </div></div>
            ))}
            {(!details || !details.activities || details.activities.length === 0) && <div style={{ fontSize: '0.75rem', color: '#334155', textAlign: 'center', padding: '1.5rem 0', fontStyle: 'italic' }}>📋 No activities yet — log your first touchpoint below.</div>}
          </div>
          <AddActivityForm onAdd={(payload) => onAddActivity(lead._id, payload)} />
        </div>
      </div>
    </div>
  );
}

function AddActivityForm({ onAdd }) {
  const [type, setType] = useState('call');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const handleSubmit = async (e) => {
    e.preventDefault(); if (!description) return; setSaving(true);
    try { await onAdd({ type, subject, description }); setDescription(''); setSubject(''); } finally { setSaving(false); }
  };
  return (
    <form onSubmit={handleSubmit} style={{ marginTop: 8 }}>
      <div style={{ display: 'flex', gap: 6, alignItems: 'flex-end', flexWrap: 'wrap' }}>
        <select value={type} onChange={(e) => setType(e.target.value)} className="ev-select" style={{ maxWidth: 120 }}>
          <option value="call">Call</option><option value="whatsapp">WhatsApp</option><option value="email">Email</option><option value="meeting">Meeting</option><option value="note">Note</option>
        </select>
        <input className="ev-input" style={{ maxWidth: 180 }} placeholder="Subject (optional)" value={subject} onChange={(e) => setSubject(e.target.value)} />
        <textarea className="ev-textarea" style={{ minHeight: 40, flex: 1 }} placeholder="Quick note…" value={description} onChange={(e) => setDescription(e.target.value)} />
        <button type="submit" className="ev-primary-btn" disabled={saving}>{saving ? 'Logging…' : 'Log'}</button>
      </div>
    </form>
  );
}

function MetricsPanel({ metrics }) {
  return (
    <div className="ev-panel">
      <div className="ev-panel-header"><div><div className="ev-panel-title">Pipeline health</div><div className="ev-panel-subtitle">Weekly new leads, conversion to meetings, and locality hotspots.</div></div></div>
      <div className="ev-metric-grid">
        <div className="ev-metric-card"><div className="ev-metric-label"><span>New leads this week</span></div><div className="ev-metric-value" style={{ color: '#67e8f9' }}>{metrics?.newLeadsThisWeek ?? '—'}</div></div>
        <div className="ev-metric-card"><div className="ev-metric-label"><span>New → Meeting rate</span><span className="ev-metric-chip">Booked</span></div><div className="ev-metric-value" style={{ color: '#fcd34d' }}>{metrics?.conversionNewToMeeting != null ? `${metrics.conversionNewToMeeting}%` : '—'}</div></div>
        <div className="ev-metric-card"><div className="ev-metric-label"><span>Won deals</span><span className="ev-metric-chip" style={{ background: 'rgba(34,197,94,0.12)', color: '#4ade80', borderColor: 'rgba(34,197,94,0.25)' }}>🏆</span></div><div className="ev-metric-value" style={{ color: '#4ade80' }}>{metrics?.stageCounts?.Won != null ? metrics.stageCounts.Won : '—'}</div></div>
        <div className="ev-metric-card"><div className="ev-metric-label"><span>Open opportunities</span><span className="ev-metric-chip">New + Qualified</span></div><div className="ev-metric-value" style={{ color: '#c4b5fd' }}>{(metrics?.stageCounts?.New || 0) + (metrics?.stageCounts?.Qualified || 0)}</div></div>
      </div>
      <div style={{ marginTop: 14 }}><div className="ev-label-row"><span className="ev-label">Top localities by volume</span></div>
        <div style={{ marginTop: 6 }}><table className="ev-table"><thead><tr><th>Area</th><th>Locality</th><th>Leads</th></tr></thead><tbody>
          {(metrics?.topLocalities || []).map((loc) => (<tr key={`${loc.area}-${loc.locality}`}><td>{loc.area}</td><td>{loc.locality}</td><td>{loc.count}</td></tr>))}
          {(!metrics || !metrics.topLocalities || metrics.topLocalities.length === 0) && <tr><td colSpan="3" style={{ color: '#9ca3af', fontSize: 12 }}>No locality data yet.</td></tr>}
        </tbody></table></div>
      </div>
    </div>
  );
}

function AppShell({ user, onLogout, view, setView }) {
  const [leadsOpen, setLeadsOpen] = useState(true);
  const initials = user?.name ? user.name.split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase() : 'AC';
  const isAdmin = user?.role === 'admin';
  const navItems = isAdmin ? [
    { id: 'leadList', label: 'Lead List', icon: '📋' },
    { id: 'pipelineHealth', label: 'Pipeline Health', icon: '💹' },
    { id: 'reports', label: 'Reports', icon: '📊' },
    { id: 'history', label: 'History', icon: '🏆' },
    { id: 'salesTeam', label: 'Sales Team', icon: '📈' },
    { id: 'team', label: 'Manage Team', icon: '👥' },
  ] : [
    { id: 'leadList', label: 'Lead List', icon: '📋' },
    { id: 'pipelineHealth', label: 'Pipeline Health', icon: '💹' },
    { id: 'myTarget', label: 'My Target', icon: '🎯' },
    { id: 'reports', label: 'Reports', icon: '📊' },
    { id: 'history', label: 'History', icon: '🏆' },
  ];
  return (
    <aside className="ev-sidebar">
      <a href="https://www.aykacontrolsystems.in/" target="_blank" rel="noreferrer" className="ev-sidebar-logo">
        <img src={acsLogo} alt="Ayka Control Systems" className="ev-logo-image" />
        <div><div className="ev-logo-text-main">ACS Energy</div><div className="ev-logo-text-sub">Lead intake + mini CRM</div></div>
      </a>
      <div className="ev-sidebar-nav">
        <div className="ev-sidebar-section-label">Navigation</div>
        <button type="button" className="ev-sidebar-toggle" onClick={() => setLeadsOpen(!leadsOpen)}>
          <span className="ev-toggle-left"><span className="ev-icon">📥</span><span>Leads</span></span>
          <span className={`ev-chevron ${leadsOpen ? 'open' : ''}`}>▶</span>
        </button>
        <div className={`ev-sidebar-sub ${leadsOpen ? 'open' : ''}`}>
          <button type="button" className={`ev-sidebar-item ${view === 'capture' ? 'active' : ''}`} onClick={() => setView('capture')}><span>Create Lead</span>{view === 'capture' && <span className="ev-dot" />}</button>
          <button type="button" className={`ev-sidebar-item ${view === 'pipeline' ? 'active' : ''}`} onClick={() => setView('pipeline')}><span>Pipeline</span>{view === 'pipeline' && <span className="ev-dot" />}</button>
        </div>
        {navItems.map((item) => (
          <button key={item.id} type="button" className={`ev-sidebar-item ${view === item.id ? 'active' : ''}`} onClick={() => setView(item.id)}>
            <span className="ev-icon">{item.icon}</span><span>{item.label}</span>{view === item.id && <span className="ev-dot" />}
          </button>
        ))}
      </div>
      <div className="ev-sidebar-user">
        <div className="ev-user-initials">{initials}</div>
        <div className="ev-sidebar-user-info"><div className="ev-user-name">{user?.name || 'ACS User'}</div><div className="ev-user-role">{user?.role}</div></div>
        <button type="button" className="ev-sidebar-logout" onClick={onLogout}>Log out</button>
      </div>
    </aside>
  );
}

function SalesTeamPanel({ salesPerformance, onUpdateTarget, onSelectLead }) {
  const [editingId, setEditingId] = useState(null);
  const [targetVal, setTargetVal] = useState('');
  const [expandedId, setExpandedId] = useState(null);
  const startEdit = (u) => { setEditingId(u._id); setTargetVal(String(u.salesTarget || 0)); };
  const saveTarget = async (userId) => { await onUpdateTarget(userId, Number(targetVal)); setEditingId(null); };
  return (
    <div className="ev-panel">
      <div className="ev-panel-header"><div><div className="ev-panel-title">📈 Sales Team Performance</div><div className="ev-panel-subtitle">Click a row to see their leads. Set targets and track incentives.</div></div><span className="ev-tag">Admin only</span></div>
      <table className="ev-table"><thead><tr><th>Name</th><th>Assigned</th><th>Pending</th><th>Won</th><th>Target</th><th>Progress</th><th>Incentive</th><th>Actions</th></tr></thead>
        <tbody>
          {(salesPerformance || []).map((u) => {
            const pct = u.salesTarget > 0 ? Math.min(100, Math.round((u.salesAchieved / u.salesTarget) * 100)) : 0;
            const isExpanded = expandedId === u._id;
            return (<React.Fragment key={u._id}>
              <tr style={{ cursor: 'pointer' }} onClick={() => setExpandedId(isExpanded ? null : u._id)}>
                <td style={{ fontWeight: 600, color: '#e2e8f0' }}>{isExpanded ? '▾' : '▸'} {u.name}</td>
                <td>{u.assignedLeads}</td><td>{u.pendingLeads}</td><td style={{ color: '#4ade80', fontWeight: 600 }}>{u.salesAchieved}</td>
                <td onClick={(e) => e.stopPropagation()}>{editingId === u._id ? <div style={{ display: 'flex', gap: 4 }}><input className="ev-input" style={{ width: 60, padding: '0.25rem 0.4rem' }} type="number" min="0" value={targetVal} onChange={(e) => setTargetVal(e.target.value)} /><button className="ev-primary-btn" style={{ padding: '0.2rem 0.5rem', fontSize: '0.7rem' }} onClick={() => saveTarget(u._id)}>✓</button></div> : u.salesTarget || 0}</td>
                <td style={{ minWidth: 100 }}><div className="ev-progress-bar"><div className={`ev-progress-fill ${u.incentiveEligible ? 'achieved' : ''}`} style={{ width: `${pct}%` }} /></div><div style={{ fontSize: '0.6rem', color: '#64748b', marginTop: 2 }}>{pct}%</div></td>
                <td>{u.incentiveEligible ? <span className="ev-incentive-badge achieved">🏆 Target Achieved</span> : u.salesTarget > 0 ? <span className="ev-incentive-badge pending">⏳ In Progress</span> : <span style={{ fontSize: '0.65rem', color: '#475569' }}>No target</span>}</td>
                <td onClick={(e) => e.stopPropagation()}><button className="ev-tag ev-tag-button" onClick={() => startEdit(u)}>Set Target</button></td>
              </tr>
              {isExpanded && (
                <tr><td colSpan="8" style={{ padding: 0, background: 'rgba(15,23,42,0.5)' }}>
                  <div style={{ padding: '0.5rem 1rem' }}>
                    <div style={{ fontSize: '0.7rem', fontWeight: 600, color: '#64748b', marginBottom: 4 }}>Leads assigned to {u.name}:</div>
                    {u.leads && u.leads.length > 0 ? (
                      <table className="ev-table" style={{ fontSize: '0.72rem' }}><thead><tr><th>Lead ID</th><th>Name</th><th>Area</th><th>Stage</th><th>Created</th></tr></thead><tbody>
                        {u.leads.map(l => (
                          <tr key={l._id} style={{ cursor: 'pointer' }} onClick={() => onSelectLead && onSelectLead(l)}>
                            <td>{l.leadId || '—'}</td><td>{l.locality || l.name}</td><td>{l.area}</td>
                            <td><span className={`ev-pill-stage ${l.stage || 'New'}`}>{l.stage || 'New'}</span></td>
                            <td>{new Date(l.createdAt).toLocaleDateString()}</td>
                          </tr>
                        ))}
                      </tbody></table>
                    ) : <div style={{ color: '#475569', fontSize: '0.72rem', fontStyle: 'italic' }}>No leads assigned yet.</div>}
                  </div>
                </td></tr>
              )}
            </React.Fragment>);
          })}
          {(!salesPerformance || salesPerformance.length === 0) && <tr><td colSpan="8" style={{ color: '#9ca3af', fontSize: 12 }}>No sales team members yet.</td></tr>}
        </tbody>
      </table>
    </div>
  );
}

function TeamPanel({ users }) {
  return (
    <div className="ev-panel">
      <div className="ev-panel-header"><div><div className="ev-panel-title">Team</div><div className="ev-panel-subtitle">Who has access to ACS Energy.</div></div><span className="ev-tag">Admin only</span></div>
      <table className="ev-table"><thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Actions</th></tr></thead>
        <tbody>
          {users.map((u) => (<tr key={u.id || u._id}><td>{u.name}</td><td>{u.email}</td><td>{u.role}</td><td><button type="button" className="ev-danger-btn" onClick={() => { if (window.confirm(`Remove ${u.name}?`)) { window.dispatchEvent(new CustomEvent('acs-remove-user', { detail: { id: u.id || u._id } })); } }}>Remove</button></td></tr>))}
          {users.length === 0 && <tr><td colSpan="4" style={{ fontSize: 12, color: '#9ca3af' }}>No team members yet.</td></tr>}
        </tbody>
      </table>
    </div>
  );
}

function InviteUserPanel({ onCreated }) {
  const [form, setForm] = useState({ name: '', email: '', phone: '', role: 'sales', password: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const auth = useAuth();
  const handleChange = (e) => { const { name, value } = e.target; setForm((prev) => ({ ...prev, [name]: value })); };
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.password) { setError('Name, email and password are required.'); return; }
    setSaving(true); setError('');
    try { await apiFetch('/users', { method: 'POST', token: auth.token, body: form }); setForm({ name: '', email: '', phone: '', role: 'sales', password: '' }); onCreated?.(); } catch (err) { console.error(err); setError('Could not create user.'); } finally { setSaving(false); }
  };
  return (
    <div className="ev-panel"><div className="ev-panel-header"><div><div className="ev-panel-title">Invite teammate</div><div className="ev-panel-subtitle">Add sales users or another admin.</div></div></div>
      <form onSubmit={handleSubmit} className="ev-input-grid">
        <div className="ev-field"><div className="ev-label-row"><span className="ev-label">Name</span></div><input className="ev-input" name="name" value={form.name} onChange={handleChange} placeholder="Full name" /></div>
        <div className="ev-field"><div className="ev-label-row"><span className="ev-label">Email</span></div><input className="ev-input" name="email" value={form.email} onChange={handleChange} placeholder="user@acs.in" /></div>
        <div className="ev-field"><div className="ev-label-row"><span className="ev-label">Phone</span></div><input className="ev-input" name="phone" value={form.phone} onChange={handleChange} placeholder="+91…" /></div>
        <div className="ev-field"><div className="ev-label-row"><span className="ev-label">Role</span></div><select className="ev-select" name="role" value={form.role} onChange={handleChange}><option value="sales">Sales</option><option value="admin">Admin</option></select></div>
        <div className="ev-field"><div className="ev-label-row"><span className="ev-label">Temporary password</span></div><input className="ev-input" name="password" type="password" value={form.password} onChange={handleChange} placeholder="Set an initial password" /></div>
        <div style={{ display: 'flex', alignItems: 'flex-end', marginTop: 4 }}><button type="submit" className="ev-primary-btn" disabled={saving}>{saving ? 'Inviting…' : 'Create user'}</button></div>
      </form>
      {error && <div style={{ marginTop: 8, fontSize: 12, color: '#fecaca' }}>{error}</div>}
    </div>
  );
}

function AdminDashboard({ auth }) {
  const [view, setView] = useState('pipeline');
  const [leads, setLeads] = useState([]);
  const [selectedLead, setSelectedLead] = useState(null);
  const [selectedDetails, setSelectedDetails] = useState(null);
  const [metrics, setMetrics] = useState(null);
  const [toast, setToast] = useState({ message: '', meta: '' });
  const [users, setUsers] = useState([]);
  const [salesPerformance, setSalesPerformance] = useState([]);

  const refreshLeads = async () => { const all = await apiFetch('/leads', { token: auth.token }); setLeads(all); };
  const refreshMetrics = async () => { const m = await apiFetch('/reports/summary', { token: auth.token }); setMetrics(m); };
  const openLead = async (lead) => { setSelectedLead(lead); try { const details = await apiFetch(`/leads/${lead._id}`, { token: auth.token }); setSelectedDetails(details); } catch (e) { console.error(e); } };
  const handleAddActivity = async (leadId, payload, opts = {}) => {
    if (opts.updateStage) { await apiFetch(`/leads/${leadId}`, { method: 'PUT', token: auth.token, body: { stage: opts.updateStage, stageNote: opts.stageNote } }); }
    await apiFetch(`/leads/${leadId}/activities`, { method: 'POST', token: auth.token, body: payload });
    setToast({ message: opts.updateStage ? `Stage moved to ${opts.updateStage}` : 'Activity logged', meta: '' });
    if (selectedLead && selectedLead._id === leadId) { const fresh = await apiFetch(`/leads/${leadId}`, { token: auth.token }); setSelectedDetails(fresh); setSelectedLead(fresh.lead || selectedLead); }
    refreshLeads(); refreshMetrics(); refreshSalesPerf();
  };
  const handleCancelLead = async (leadId) => {
    try { await apiFetch(`/leads/${leadId}`, { method: 'DELETE', token: auth.token }); setToast({ message: 'Order cancelled', meta: '' }); if (selectedLead && selectedLead._id === leadId) { setSelectedLead(null); setSelectedDetails(null); } refreshLeads(); refreshMetrics(); refreshSalesPerf(); } catch (err) { console.error(err); setToast({ message: 'Could not cancel order', meta: '' }); }
  };
  const refreshUsers = async () => { const all = await apiFetch('/users', { token: auth.token }); setUsers(all); };
  const refreshSalesPerf = async () => { try { const perf = await apiFetch('/users/performance', { token: auth.token }); setSalesPerformance(perf); } catch (e) { console.error(e); } };
  const handleUpdateTarget = async (userId, target) => {
    await apiFetch(`/users/${userId}`, { method: 'PUT', token: auth.token, body: { salesTarget: target } });
    setToast({ message: 'Sales target updated', meta: '' }); refreshSalesPerf();
  };

  /* eslint-disable react-hooks/exhaustive-deps */
  useEffect(() => {
    const handler = async (e) => {
      const id = e.detail?.id; if (!id) return;
      try { await apiFetch(`/users/${id}`, { method: 'DELETE', token: auth.token }); setToast({ message: 'User removed', meta: '' }); refreshUsers(); refreshSalesPerf(); } catch (err) { console.error(err); }
    };
    window.addEventListener('acs-remove-user', handler);
    return () => window.removeEventListener('acs-remove-user', handler);
  }, [auth.token]);
  useEffect(() => { if (!auth.token) return; refreshLeads(); refreshMetrics(); refreshUsers(); refreshSalesPerf(); }, [auth.token]);
  /* eslint-enable react-hooks/exhaustive-deps */
  useEffect(() => { if (!toast.message) return; const t = setTimeout(() => setToast({ message: '', meta: '' }), 3000); return () => clearTimeout(t); }, [toast]);
  const handleLeadSubmitted = (leadId, error) => { if (error) { setToast({ message: 'Could not create lead', meta: '' }); return; } setToast({ message: 'Lead captured & auto-assigned', meta: leadId ? `Lead ID: ${leadId}` : '' }); refreshLeads(); refreshMetrics(); refreshSalesPerf(); };

  return (
    <div className="ev-layout">
      <AppShell user={auth.user} onLogout={auth.logout} view={view} setView={setView} />
      <main className="ev-main">
        {view === 'capture' && <div style={{ width: '100%' }}><PublicLeadForm onSubmitted={handleLeadSubmitted} /></div>}
        {view === 'pipeline' && <div style={{ width: '100%', display: 'grid', gridTemplateColumns: '3fr 2fr', gap: 16 }}><KanbanBoard leads={leads} onSelect={openLead} /><LeadDetail lead={selectedLead} details={selectedDetails} onAddActivity={handleAddActivity} onCancel={handleCancelLead} /></div>}
        {view === 'leadList' && <div style={{ width: '100%' }}><LeadList leads={leads} onSelect={openLead} users={users} token={auth.token} showFilters /></div>}
        {view === 'pipelineHealth' && <div style={{ width: '100%' }}><MetricsPanel metrics={metrics} /></div>}
        {view === 'reports' && <div style={{ width: '100%' }}><LeadDetail lead={selectedLead} details={selectedDetails} onAddActivity={handleAddActivity} onCancel={handleCancelLead} /></div>}
        {view === 'history' && <div style={{ width: '100%' }}><div className="ev-panel-header"><div><div className="ev-panel-title">Success history</div><div className="ev-panel-subtitle">All orders marked Won.</div></div></div><LeadList leads={leads.filter((l) => l.stage === 'Won')} onSelect={openLead} /></div>}
        {view === 'salesTeam' && <div style={{ width: '100%' }}><SalesTeamPanel salesPerformance={salesPerformance} onUpdateTarget={handleUpdateTarget} onSelectLead={(l) => { openLead(l); setView('pipeline'); }} /></div>}
        {view === 'team' && <div style={{ width: '100%', display: 'grid', gridTemplateColumns: '3fr 2fr', gap: 16 }}><TeamPanel users={users} /><InviteUserPanel onCreated={() => { refreshUsers(); refreshSalesPerf(); }} /></div>}
      </main>
      <Toast message={toast.message} meta={toast.meta} />
    </div>
  );
}

function SalesDashboard({ auth }) {
  const [view, setView] = useState('pipeline');
  const [leads, setLeads] = useState([]);
  const [selectedLead, setSelectedLead] = useState(null);
  const [selectedDetails, setSelectedDetails] = useState(null);
  const [metrics, setMetrics] = useState(null);
  const [toast, setToast] = useState({ message: '', meta: '' });
  const [myInfo, setMyInfo] = useState(null);

  const refreshLeads = async () => { const all = await apiFetch('/leads', { token: auth.token }); setLeads(all); };
  const refreshMetrics = async () => { const m = await apiFetch('/reports/summary', { token: auth.token }); setMetrics(m); };
  const refreshMyInfo = async () => { try { const info = await apiFetch('/users/me', { token: auth.token }); setMyInfo(info); } catch (e) { console.error(e); } };
  const openLead = async (lead) => { setSelectedLead(lead); try { const details = await apiFetch(`/leads/${lead._id}`, { token: auth.token }); setSelectedDetails(details); } catch (e) { console.error(e); setToast({ message: 'Access denied to this lead', meta: '' }); } };
  const handleAddActivity = async (leadId, payload, opts = {}) => {
    if (opts.updateStage) { await apiFetch(`/leads/${leadId}`, { method: 'PUT', token: auth.token, body: { stage: opts.updateStage, stageNote: opts.stageNote } }); }
    await apiFetch(`/leads/${leadId}/activities`, { method: 'POST', token: auth.token, body: payload });
    setToast({ message: opts.updateStage ? `Stage moved to ${opts.updateStage}` : 'Activity logged', meta: '' });
    if (selectedLead && selectedLead._id === leadId) { const fresh = await apiFetch(`/leads/${leadId}`, { token: auth.token }); setSelectedDetails(fresh); setSelectedLead(fresh.lead || selectedLead); }
    refreshLeads(); refreshMetrics(); refreshMyInfo();
  };
  const handleCancelLead = async (leadId) => {
    try { await apiFetch(`/leads/${leadId}`, { method: 'DELETE', token: auth.token }); setToast({ message: 'Order cancelled', meta: '' }); if (selectedLead && selectedLead._id === leadId) { setSelectedLead(null); setSelectedDetails(null); } refreshLeads(); refreshMyInfo(); } catch (err) { console.error(err); setToast({ message: 'Could not cancel order', meta: '' }); }
  };

  /* eslint-disable react-hooks/exhaustive-deps */
  useEffect(() => { if (!auth.token) return; refreshLeads(); refreshMetrics(); refreshMyInfo(); }, [auth.token]);
  /* eslint-enable react-hooks/exhaustive-deps */
  useEffect(() => { if (!toast.message) return; const t = setTimeout(() => setToast({ message: '', meta: '' }), 3000); return () => clearTimeout(t); }, [toast]);

  const pct = myInfo && myInfo.salesTarget > 0 ? Math.min(100, Math.round(((myInfo.wonLeads || 0) / myInfo.salesTarget) * 100)) : 0;

  return (
    <div className="ev-layout">
      <AppShell user={auth.user} onLogout={auth.logout} view={view} setView={setView} />
      <main className="ev-main">
        {view === 'pipeline' && <div style={{ width: '100%', display: 'grid', gridTemplateColumns: '3fr 2fr', gap: 16 }}><KanbanBoard leads={leads} onSelect={openLead} /><LeadDetail lead={selectedLead} details={selectedDetails} onAddActivity={handleAddActivity} onCancel={handleCancelLead} /></div>}
        {view === 'capture' && <div style={{ width: '100%' }}><PublicLeadForm onSubmitted={(id, err) => { if (err) { setToast({ message: 'Could not create lead', meta: '' }); return; } setToast({ message: 'Lead captured & auto-assigned', meta: id ? `Lead ID: ${id}` : '' }); refreshLeads(); }} /></div>}
        {view === 'leadList' && <div style={{ width: '100%' }}><LeadList leads={leads} onSelect={openLead} token={auth.token} showFilters /></div>}
        {view === 'pipelineHealth' && <div style={{ width: '100%' }}><MetricsPanel metrics={metrics} /></div>}
        {view === 'myTarget' && (
          <div style={{ width: '100%' }}>
            <div className="ev-panel">
              <div className="ev-panel-header"><div><div className="ev-panel-title">🎯 My Sales Target</div><div className="ev-panel-subtitle">Track your progress.</div></div></div>
              <div className="ev-metric-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
                <div className="ev-metric-card"><div className="ev-metric-label"><span>My Leads</span></div><div className="ev-metric-value" style={{ color: '#67e8f9' }}>{myInfo?.assignedLeads ?? '—'}</div></div>
                <div className="ev-metric-card"><div className="ev-metric-label"><span>Won Deals</span></div><div className="ev-metric-value" style={{ color: '#4ade80' }}>{myInfo?.wonLeads ?? '—'}</div></div>
                <div className="ev-metric-card"><div className="ev-metric-label"><span>Pending</span></div><div className="ev-metric-value" style={{ color: '#fcd34d' }}>{myInfo?.pendingLeads ?? '—'}</div></div>
              </div>
              <div style={{ marginTop: 16 }}>
                <div className="ev-label-row"><span className="ev-label">Target: {myInfo?.salesTarget || 0} deals</span><span className="ev-hint">{pct}% complete</span></div>
                <div className="ev-progress-bar" style={{ marginTop: 6, height: 12 }}><div className={`ev-progress-fill ${myInfo?.incentiveEligible ? 'achieved' : ''}`} style={{ width: `${pct}%` }} /></div>
              </div>
              <div style={{ marginTop: 12, textAlign: 'center' }}>
                {myInfo?.incentiveEligible ? <span className="ev-incentive-badge achieved" style={{ fontSize: '0.85rem', padding: '0.4rem 1rem' }}>🏆 Congratulations! Target Achieved — Bonus Eligible!</span> : myInfo?.salesTarget > 0 ? <span className="ev-incentive-badge pending" style={{ fontSize: '0.8rem', padding: '0.35rem 0.9rem' }}>⏳ {(myInfo?.salesTarget || 0) - (myInfo?.wonLeads || 0)} more to target</span> : <span style={{ color: '#64748b', fontSize: '0.8rem' }}>No sales target assigned yet.</span>}
              </div>
            </div>
            <LeadList leads={leads} onSelect={openLead} token={auth.token} />
          </div>
        )}
        {view === 'reports' && <div style={{ width: '100%' }}><LeadDetail lead={selectedLead} details={selectedDetails} onAddActivity={handleAddActivity} onCancel={handleCancelLead} /></div>}
        {view === 'history' && <div style={{ width: '100%' }}><div className="ev-panel-header"><div><div className="ev-panel-title">My Success History</div><div className="ev-panel-subtitle">Won deals assigned to you.</div></div></div><LeadList leads={leads.filter(l => l.stage === 'Won')} onSelect={openLead} /></div>}
      </main>
      <Toast message={toast.message} meta={toast.meta} />
    </div>
  );
}

function App() {
  const auth = useAuth();
  if (!auth.user || !auth.token) return <LoginScreen onLoggedIn={auth.login} />;
  if (auth.user.role === 'sales') return <SalesDashboard auth={auth} />;
  return <AdminDashboard auth={auth} />;
}

export default App;
