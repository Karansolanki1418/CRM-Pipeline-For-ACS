import React, { useEffect, useMemo, useState } from 'react';
import acsLogo from './assets/acs-logo.png';

const API_BASE = process.env.REACT_APP_API_BASE || 'https://server-lake-mu.vercel.app';

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
    method,
    headers,
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
    leadType: 'CHS',
    name: '',
    phone: '',
    email: '',
    area: '',
    locality: '',
    propertySizeFlats: '',
    parkingType: 'basement',
    currentEvCount: '',
    chargerInterest: [],
    notes: '',
    consent: true,
    decisionMakerKnown: false,
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [lastLeadId, setLastLeadId] = useState('');

  const toggleCharger = (value) => {
    setForm((prev) => {
      const exists = prev.chargerInterest.includes(value);
      return {
        ...prev,
        chargerInterest: exists
          ? prev.chargerInterest.filter((v) => v !== value)
          : [...prev.chargerInterest, value],
      };
    });
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.phone || !form.area) {
      setError('Please fill contact name, mobile and area before saving.');
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      const payload = {
        ...form,
        propertySizeFlats: form.propertySizeFlats ? Number(form.propertySizeFlats) : undefined,
        currentEvCount: form.currentEvCount ? Number(form.currentEvCount) : undefined,
      };
      const res = await apiFetch('/leads/public', {
        method: 'POST',
        body: payload,
        publicRoute: true,
      });
      onSubmitted?.(res.leadId);
      setLastLeadId(res.leadId || '');
      setForm((prev) => ({
        ...prev,
        name: '',
        phone: '',
        email: '',
        locality: '',
        propertySizeFlats: '',
        currentEvCount: '',
        notes: '',
        decisionMakerKnown: false,
      }));
    } catch (err) {
      console.error(err);
      onSubmitted?.(null, err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="ev-panel">
      <div className="ev-panel-header">
        <div>
          <div className="ev-panel-title">Capture new EV lead</div>
          <div className="ev-panel-subtitle">
            For CHS, hotels, corporate parks and developers across MMR.
          </div>
        </div>
        <button
          type="button"
          className="ev-tag ev-tag-button"
          onClick={() => {
            const el = document.getElementById('lead-name');
            if (el) el.focus();
          }}
        >
          Public / Phone intake
        </button>
      </div>
      <form onSubmit={handleSubmit}>
        <div className="ev-input-grid">
          <div className="ev-field">
            <div className="ev-label-row">
              <span className="ev-label">
                Lead type <span>*</span>
              </span>
            </div>
            <select
              name="leadType"
              value={form.leadType}
              onChange={handleChange}
              className="ev-select"
            >
              <option value="CHS">CHS</option>
              <option value="Hotel">Hotel</option>
              <option value="Corporate">Corporate Park</option>
              <option value="Developer">Developer</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div className="ev-field">
            <div className="ev-label-row">
              <span className="ev-label">
                Decision maker known? <span>&nbsp;</span>
              </span>
            </div>
            <div className="ev-checkbox-row">
              <input
                type="checkbox"
                name="decisionMakerKnown"
                checked={form.decisionMakerKnown}
                onChange={handleChange}
              />
              <span>Committee member / Facility head identified</span>
            </div>
          </div>

          <div className="ev-field">
            <div className="ev-label-row">
              <span className="ev-label">
                Contact name <span>*</span>
              </span>
            </div>
            <input
              name="name"
              value={form.name}
              onChange={handleChange}
              className="ev-input"
              id="lead-name"
              placeholder="e.g. Rohan Mehta"
              required
            />
          </div>

          <div className="ev-field">
            <div className="ev-label-row">
              <span className="ev-label">
                Mobile <span>*</span>
              </span>
              <span className="ev-hint">WhatsApp preferred</span>
            </div>
            <input
              name="phone"
              value={form.phone}
              onChange={handleChange}
              className="ev-input"
              placeholder="+91…"
              required
            />
          </div>

          <div className="ev-field">
            <div className="ev-label-row">
              <span className="ev-label">Email</span>
            </div>
            <input
              name="email"
              value={form.email}
              onChange={handleChange}
              className="ev-input"
              placeholder="name@company.com"
            />
          </div>

          <div className="ev-field">
            <div className="ev-label-row">
              <span className="ev-label">
                Area / locality <span>*</span>
              </span>
            </div>
            <input
              name="area"
              value={form.area}
              onChange={handleChange}
              className="ev-input"
              placeholder="e.g. Powai, Andheri East"
              required
            />
          </div>

          <div className="ev-field">
            <div className="ev-label-row">
              <span className="ev-label">Property name</span>
            </div>
            <input
              name="locality"
              value={form.locality}
              onChange={handleChange}
              className="ev-input"
              placeholder="Society / campus name"
            />
          </div>

          <div className="ev-field">
            <div className="ev-label-row">
              <span className="ev-label">Approx flats / parking slots</span>
            </div>
            <input
              name="propertySizeFlats"
              value={form.propertySizeFlats}
              onChange={handleChange}
              className="ev-input"
              type="number"
              min="0"
              placeholder="e.g. 150"
            />
          </div>

          <div className="ev-field">
            <div className="ev-label-row">
              <span className="ev-label">Parking type</span>
            </div>
            <select
              name="parkingType"
              value={form.parkingType}
              onChange={handleChange}
              className="ev-select"
            >
              <option value="basement">Basement</option>
              <option value="open">Open</option>
              <option value="mixed">Mixed</option>
            </select>
          </div>

          <div className="ev-field">
            <div className="ev-label-row">
              <span className="ev-label">Current EVs on site</span>
            </div>
            <input
              name="currentEvCount"
              value={form.currentEvCount}
              onChange={handleChange}
              className="ev-input"
              type="number"
              min="0"
              placeholder="Optional"
            />
          </div>

          <div className="ev-field">
            <div className="ev-label-row">
              <span className="ev-label">Charger interest (kW)</span>
            </div>
            <div className="ev-card-meta" style={{ marginTop: 4 }}>
              {['3.3', '7.4', '11', '22'].map((kw) => (
                <button
                  key={kw}
                  type="button"
                  onClick={() => toggleCharger(kw)}
                  className="ev-ghost-chip"
                  style={
                    form.chargerInterest.includes(kw)
                      ? {
                        borderStyle: 'solid',
                        borderColor: 'rgba(56,189,248,0.9)',
                        color: '#e0f2fe',
                        background:
                          'radial-gradient(circle at top left, rgba(56,189,248,0.25), rgba(15,23,42,0.95))',
                      }
                      : undefined
                  }
                >
                  {kw} kW
                </button>
              ))}
            </div>
          </div>
        </div>

        <div style={{ marginTop: 10 }}>
          <div className="ev-field">
            <div className="ev-label-row">
              <span className="ev-label">Notes</span>
              <span className="ev-hint">Decision flow, objections, timing</span>
            </div>
            <textarea
              name="notes"
              value={form.notes}
              onChange={handleChange}
              className="ev-textarea"
              placeholder="Capture context for ACS sales team…"
            />
          </div>

          <div className="ev-checkbox-row">
            <input
              type="checkbox"
              name="consent"
              checked={form.consent}
              onChange={handleChange}
            />
            <span>
              I have consent to be contacted by ACS on phone/WhatsApp/email regarding EV charging.
            </span>
          </div>
        </div>

        <div style={{ marginTop: 14, display: 'flex', justifyContent: 'space-between' }}>
          <span className="ev-pill-small">Lead score auto-calculates once saved</span>
          <button className="ev-primary-btn" type="submit" disabled={submitting}>
            <span>{submitting ? 'Saving lead…' : 'Create Lead'}</span>
          </button>
        </div>
        {error && (
          <div style={{ marginTop: 8, fontSize: 12, color: '#fecaca' }}>
            {error}
          </div>
        )}
        {!error && lastLeadId && (
          <div style={{ marginTop: 8, fontSize: 12, color: '#bbf7d0' }}>
            Thank you, the lead has been captured. Lead ID: <strong>{lastLeadId}</strong>
          </div>
        )}
      </form>
    </div>
  );
}

function LoginScreen({ onLoggedIn }) {
  const [email, setEmail] = useState('admin@acs.local');
  const [password, setPassword] = useState('admin123');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const seedAndLogin = async () => {
    setLoading(true);
    setError('');
    try {
      await apiFetch('/auth/seed-admin', { method: 'POST', body: { password } });
      const res = await apiFetch('/auth/login', {
        method: 'POST',
        body: { email, password },
      });
      onLoggedIn(res);
    } catch (err) {
      console.error(err);
      setError('Login failed. Is the backend running?');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    await seedAndLogin();
  };

  return (
    <div className="ev-login-screen">
      <div className="ev-login-card">
        <div className="ev-login-inner">
          <div className="ev-logo" style={{ marginBottom: 14 }}>
            <div className="ev-logo-mark">
              <div className="ev-logo-icon" />
            </div>
            <div>
              <div className="ev-logo-text-main">ACS Energy</div>
              <div className="ev-logo-text-sub">Lead cockpit for EV rollouts</div>
            </div>
          </div>
          <div className="ev-login-title">Sign in to ACS pipeline</div>
          <div className="ev-login-sub">
            One place to see every CHS, hotel, corporate park and developer in motion.
          </div>
          <form onSubmit={handleSubmit}>
            <div className="ev-field">
              <div className="ev-label-row">
                <span className="ev-label">Work email</span>
              </div>
              <input
                className="ev-input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@acs.in"
              />
            </div>
            <div className="ev-field" style={{ marginTop: 8 }}>
              <div className="ev-label-row">
                <span className="ev-label">Password</span>
              </div>
              <input
                className="ev-input"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>
            {error && (
              <div style={{ color: '#fecaca', fontSize: 12, marginTop: 6 }}>
                {error}
              </div>
            )}
            <button
              type="submit"
              className="ev-primary-btn"
              style={{ width: '100%', marginTop: 14 }}
              disabled={loading}
            >
              {loading ? 'Connecting…' : 'Login to dashboard'}
            </button>
          </form>
          <div className="ev-login-footer">
            <span className="ev-badge-ev">⚡ EV Charging CRM</span>
            <span className="ev-pill-small" style={{ color: '#334155', fontSize: '0.62rem' }}>v1.0 · ACS Energy</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function KanbanBoard({ leads, onSelect }) {
  const byStage = useMemo(() => {
    const grouped = {};
    STAGES.forEach((s) => (grouped[s] = []));
    leads.forEach((l) => {
      const stage = l.stage || 'New';
      if (!grouped[stage]) grouped[stage] = [];
      grouped[stage].push(l);
    });
    return grouped;
  }, [leads]);

  return (
    <div className="ev-kanban">
      {STAGES.map((stage) => (
        <div key={stage} className="ev-kanban-column" data-stage={stage}>
          <div className="ev-kanban-header">
            <span>{stage}</span>
            <span className="ev-kanban-badge">
              {byStage[stage]?.length || 0}
            </span>
          </div>
          <div className="ev-kanban-scroll">
            {byStage[stage]?.map((lead) => (
              <button
                type="button"
                key={lead._id}
                className="ev-card"
                data-type={lead.leadType}
                onClick={() => onSelect(lead)}
              >
                <div className="ev-card-title">{lead.locality || lead.name}</div>
                <div className="ev-card-meta">
                  <span className="ev-card-pill">{lead.leadType}</span>
                  {lead.area && <span>{lead.area}</span>}
                  {lead.leadScore != null && (
                    <span style={{
                      color: lead.leadScore >= 7 ? '#4ade80' : lead.leadScore >= 4 ? '#fcd34d' : '#fca5a5',
                      fontWeight: 600,
                    }}>⚡{lead.leadScore}</span>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function LeadList({ leads, onSelect }) {
  const [search, setSearch] = useState('');
  const [stageFilter, setStageFilter] = useState('');
  const [sortField, setSortField] = useState('createdAt');
  const [sortDir, setSortDir] = useState('desc');

  const viewLeads = useMemo(() => {
    let rows = [...leads];
    if (search) {
      const q = search.toLowerCase();
      rows = rows.filter(
        (l) =>
          (l.locality || '').toLowerCase().includes(q) ||
          (l.name || '').toLowerCase().includes(q) ||
          (l.phone || '').toLowerCase().includes(q) ||
          (l.area || '').toLowerCase().includes(q)
      );
    }
    if (stageFilter) {
      rows = rows.filter((l) => (l.stage || 'New') === stageFilter);
    }
    rows.sort((a, b) => {
      const dir = sortDir === 'asc' ? 1 : -1;
      if (sortField === 'score') {
        return ((a.leadScore || 0) - (b.leadScore || 0)) * dir;
      }
      if (sortField === 'area') {
        return ((a.area || '').localeCompare(b.area || '')) * dir;
      }
      if (sortField === 'name') {
        return ((a.locality || a.name || '').localeCompare(
          b.locality || b.name || ''
        )) * dir;
      }

      const ad = new Date(a.createdAt || 0).getTime();
      const bd = new Date(b.createdAt || 0).getTime();
      return (ad - bd) * dir;
    });
    return rows;
  }, [leads, search, stageFilter, sortField, sortDir]);

  const toggleSort = (field) => {
    setSortField((prevField) => {
      if (prevField === field) {
        setSortDir((prevDir) => (prevDir === 'asc' ? 'desc' : 'asc'));
        return prevField;
      }
      setSortDir('asc');
      return field;
    });
  };

  const handleExportCsv = () => {

    const columns = [
      { key: 'leadId', label: 'Lead ID' },
      { key: 'leadType', label: 'Type' },
      { key: 'name', label: 'Lead' },
      { key: 'area', label: 'Area' },
      { key: 'currentEvCount', label: 'EVs' },
      { key: 'leadScore', label: 'Score' },
      { key: 'stage', label: 'Stage' },
    ];

    const rows = viewLeads.map((l) => ({
      leadId: l.leadId || '',
      leadType: l.leadType || '',
      name: l.locality || l.name || '',
      area: l.area || '',
      currentEvCount: l.currentEvCount != null ? String(l.currentEvCount) : '',
      leadScore: l.leadScore != null ? String(l.leadScore) : '',
      stage: l.stage || 'New',
    }));

    // Calculate column widths
    const widths = columns.map((col) => {
      const headerWidth = col.label.length;
      const maxDataWidth = rows.reduce(
        (max, r) => Math.max(max, (r[col.key] || '').length),
        0
      );
      return Math.max(headerWidth, maxDataWidth, 4) + 2; // padding
    });

    const pad = (text, width) => {
      const s = String(text || '');
      if (s.length >= width) return s.slice(0, width);
      return s + ' '.repeat(width - s.length);
    };

    const headerLine = columns
      .map((col, i) => pad(col.label, widths[i]))
      .join(' | ');
    const separatorLine = widths
      .map((w) => '-'.repeat(w))
      .join('-+-');
    const dataLines = rows.map((r) =>
      columns.map((col, i) => pad(r[col.key], widths[i])).join(' | ')
    );

    const tableText = [headerLine, separatorLine, ...dataLines].join('\n');

    const blob = new Blob([tableText], {
      type: 'text/plain;charset=utf-8;',
    });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'acs-leads-table.txt';
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="ev-panel" style={{ marginTop: 12 }}>
      <div className="ev-panel-header">
        <div>
          <div className="ev-panel-title">Leads list</div>
          <div className="ev-panel-subtitle">Search and filter for ACS sales ops.</div>
        </div>
        <button
          type="button"
          className="ev-tag ev-tag-button"
          onClick={handleExportCsv}
        >
          CSV &amp; filters
        </button>
      </div>
      <div
        style={{
          display: 'flex',
          gap: 8,
          marginBottom: 8,
          fontSize: 12,
        }}
      >
        <input
          className="ev-input"
          style={{ maxWidth: 260 }}
          placeholder="Search by name, area, phone…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className="ev-select"
          style={{ maxWidth: 160 }}
          value={stageFilter}
          onChange={(e) => setStageFilter(e.target.value)}
        >
          <option value="">All stages</option>
          {STAGES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table className="ev-table">
          <thead>
            <tr>
              <th onClick={() => toggleSort('leadId')}>Lead ID</th>
              <th onClick={() => toggleSort('name')}>Lead</th>
              <th>Type</th>
              <th onClick={() => toggleSort('area')}>Area</th>
              <th>EVs</th>
              <th onClick={() => toggleSort('score')}>Score</th>
              <th onClick={() => toggleSort('stage')}>Stage</th>
            </tr>
          </thead>
          <tbody>
            {viewLeads.map((lead) => (
              <tr key={lead._id} onClick={() => onSelect(lead)} style={{ cursor: 'pointer' }}>
                <td>{lead.leadId || ''}</td>
                <td>{lead.locality || lead.name}</td>
                <td>{lead.leadType}</td>
                <td>{lead.area}</td>
                <td>{lead.currentEvCount || '-'}</td>
                <td>{lead.leadScore ?? '-'}</td>
                <td>
                  <span className={`ev-pill-stage ${lead.stage || 'New'}`}>
                    {lead.stage || 'New'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function LeadDetail({ lead, details, onAddActivity, onCancel }) {
  const [updatingStage, setUpdatingStage] = useState(false);
  const [stage, setStage] = useState(lead?.stage || 'New');

  useEffect(() => {
    setStage(lead?.stage || 'New');
  }, [lead]);

  if (!lead) {
    return (
      <div className="ev-panel" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 200, textAlign: 'center', gap: '0.5rem' }}>
        <div style={{ fontSize: '2rem' }}>📂</div>
        <div className="ev-panel-title">Select a lead to open detail view</div>
        <div className="ev-panel-subtitle">
          Click any card on the Kanban board or a row in the leads list.
        </div>
      </div>
    );
  }

  const whatsappHref = lead.phone
    ? `https://wa.me/${lead.phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(
      `Hi ${lead.name || ''}, following up from ACS about EV charging at ${lead.locality ||
      'your premises'}.`
    )}`
    : null;

  const scoreClass = lead.leadScore == null ? '' : lead.leadScore >= 7 ? 'high' : lead.leadScore >= 4 ? 'mid' : 'low';

  return (
    <div className="ev-panel">
      <div className="ev-panel-header">
        <div>
          <div className="ev-panel-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            {lead.locality || lead.name}
            <span className="ev-card-pill" style={{ fontSize: '0.65rem' }}>{lead.leadType}</span>
            {lead.leadScore != null && (
              <span className={`ev-score-badge ${scoreClass}`}>⚡ {lead.leadScore}/10</span>
            )}
          </div>
          <div className="ev-panel-subtitle">
            {lead.area}
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
          {whatsappHref && (
            <a href={whatsappHref} target="_blank" rel="noreferrer" className="ev-whatsapp-link">
              <span className="ev-whatsapp-bubble">WA</span>
              <span>Click-to-chat</span>
            </a>
          )}
          <span className="ev-tag">Next step: {lead.stage || 'New'}</span>
        </div>
      </div>

      <div className="ev-lead-detail-layout">
        <div>
          <div className="ev-field" style={{ marginBottom: '0.6rem' }}>
            <div className="ev-label-row">
              <span className="ev-label">Contact snapshot</span>
            </div>
          </div>
          <div className="ev-detail-snapshot">
            <div className="ev-detail-row">
              <span className="ev-detail-row-label">Contact</span>
              <span style={{ color: '#e2e8f0', fontWeight: 500 }}>{lead.name || '—'}</span>
            </div>
            {lead.phone && (
              <div className="ev-detail-row">
                <span className="ev-detail-row-label">Phone</span>
                <a
                  href={`tel:${lead.phone}`}
                  style={{ color: '#7dd3fc', textDecoration: 'none' }}
                  onClick={async (e) => {
                    e.preventDefault();
                    await onAddActivity(lead._id, {
                      type: 'call',
                      description: 'Call initiated via click-to-call',
                    });
                    window.location.href = `tel:${lead.phone}`;
                  }}
                >
                  {lead.phone}
                </a>
              </div>
            )}
            {lead.email && (
              <div className="ev-detail-row">
                <span className="ev-detail-row-label">Email</span>
                <a
                  href={`mailto:${lead.email}?subject=ACS EV charging follow-up`}
                  style={{ color: '#7dd3fc', textDecoration: 'none' }}
                  onClick={async (e) => {
                    e.preventDefault();
                    await onAddActivity(lead._id, {
                      type: 'email',
                      description: 'Email composed via click-to-email link',
                    });
                    window.location.href = `mailto:${lead.email}?subject=ACS EV charging follow-up`;
                  }}
                >
                  {lead.email}
                </a>
              </div>
            )}
            <div className="ev-detail-row">
              <span className="ev-detail-row-label">EVs on site</span>
              <span>{lead.currentEvCount ?? '—'}</span>
            </div>
            <div className="ev-detail-row">
              <span className="ev-detail-row-label">Parking</span>
              <span style={{ textTransform: 'capitalize' }}>{lead.parkingType || '—'}</span>
            </div>
            <div className="ev-detail-row">
              <span className="ev-detail-row-label">Next follow-up</span>
              <span style={{ color: lead.nextFollowUpDate ? '#fcd34d' : '#475569' }}>
                {lead.nextFollowUpDate
                  ? new Date(lead.nextFollowUpDate).toLocaleDateString()
                  : 'Not scheduled'}
              </span>
            </div>
            <div className="ev-detail-row">
              <span className="ev-detail-row-label">Chargers</span>
              <span>
                {lead.chargerInterest && lead.chargerInterest.length
                  ? lead.chargerInterest.join(', ') + ' kW'
                  : <span style={{ color: '#475569' }}>Not captured</span>}
              </span>
            </div>
            {lead.notes && (
              <div style={{ borderTop: '1px solid rgba(51,65,85,0.5)', paddingTop: '0.5rem', marginTop: '0.25rem', color: '#94a3b8', whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>
                {lead.notes}
              </div>
            )}
            {!lead.notes && (
              <div style={{ color: '#334155', fontStyle: 'italic', fontSize: '0.72rem' }}>
                No notes yet. Log your first activity below.
              </div>
            )}
          </div>
        </div>

        <div>
          <div className="ev-field">
            <div className="ev-label-row">
              <span className="ev-label">Activity log</span>
              <span className="ev-hint">Calls, WhatsApp, meetings, email</span>
            </div>
          </div>
          <div className="ev-field" style={{ marginTop: 4, marginBottom: 4 }}>
            <div className="ev-label-row">
              <span className="ev-label">Stage</span>
              <span className="ev-hint">Move this deal forward</span>
            </div>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <select
                className="ev-select"
                value={stage}
                onChange={(e) => setStage(e.target.value)}
              >
                {STAGES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="ev-primary-btn"
                disabled={updatingStage}
                onClick={async () => {
                  setUpdatingStage(true);
                  try {
                    await onAddActivity(
                      lead._id,
                      {
                        type: 'note',
                        description: `Stage updated to ${stage}`,
                      },
                      { updateStage: stage }
                    );
                  } finally {
                    setUpdatingStage(false);
                  }
                }}
              >
                {updatingStage ? 'Updating…' : 'Update stage'}
              </button>
              <button
                type="button"
                className="ev-primary-btn"
                disabled={updatingStage}
                onClick={async () => {
                  setStage('Won');
                  setUpdatingStage(true);
                  try {
                    await onAddActivity(
                      lead._id,
                      {
                        type: 'note',
                        description: 'Order marked as success (Won)',
                      },
                      { updateStage: 'Won' }
                    );
                  } finally {
                    setUpdatingStage(false);
                  }
                }}
              >
                Mark success
              </button>
              <button
                type="button"
                className="ev-danger-btn"
                onClick={() => {
                  if (!onCancel) return;
                  if (window.confirm('Cancel this order and remove it permanently?')) {
                    onCancel(lead._id);
                  }
                }}
              >
                Cancel order
              </button>
            </div>
          </div>
          <div className="ev-activity-list">
            {(details?.activities || []).map((a) => (
              <div key={a._id} className="ev-activity-item">
                <div className={`ev-activity-dot ${a.type || ''}`} />
                <div>
                  <div className="ev-activity-meta">
                    <span className="ev-activity-type">{a.type}</span>
                    <span>
                      {new Date(a.createdAt).toLocaleDateString()}{' '}
                      {new Date(a.createdAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                  <div className="ev-activity-body">{a.description}</div>
                </div>
              </div>
            ))}
            {(!details || !details.activities || details.activities.length === 0) && (
              <div style={{ fontSize: '0.75rem', color: '#334155', textAlign: 'center', padding: '1.5rem 0', fontStyle: 'italic' }}>
                📋 No activities yet — log your first touchpoint below.
              </div>
            )}
          </div>
          <AddActivityForm onAdd={(payload) => onAddActivity(lead._id, payload)} />
        </div>
      </div>
    </div>
  );
}

function AddActivityForm({ onAdd }) {
  const [type, setType] = useState('call');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!description) return;
    setSaving(true);
    try {
      await onAdd({ type, description });
      setDescription('');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ marginTop: 8 }}>
      <div style={{ display: 'flex', gap: 6, alignItems: 'flex-end' }}>
        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
          className="ev-select"
          style={{ maxWidth: 120 }}
        >
          <option value="call">Call</option>
          <option value="whatsapp">WhatsApp</option>
          <option value="email">Email</option>
          <option value="meeting">Meeting</option>
          <option value="note">Note</option>
        </select>
        <textarea
          className="ev-textarea"
          style={{ minHeight: 40, flex: 1 }}
          placeholder="Quick note of what happened and next step…"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        <button type="submit" className="ev-primary-btn" disabled={saving}>
          {saving ? 'Logging…' : 'Log'}
        </button>
      </div>
    </form>
  );
}

function MetricsPanel({ metrics, onGoToReports }) {
  return (
    <div className="ev-panel">
      <div className="ev-panel-header">
        <div>
          <div className="ev-panel-title">Pipeline health</div>
          <div className="ev-panel-subtitle">
            Weekly new leads, conversion to meetings, and locality hotspots.
          </div>
        </div>
        <button
          type="button"
          className="ev-tag ev-tag-button"
          onClick={onGoToReports}
        >
          View Reports
        </button>
      </div>
      <div className="ev-metric-grid">
        <div className="ev-metric-card">
          <div className="ev-metric-label">
            <span>New leads this week</span>
          </div>
          <div className="ev-metric-value" style={{ color: '#67e8f9' }}>{metrics?.newLeadsThisWeek ?? '—'}</div>
        </div>
        <div className="ev-metric-card">
          <div className="ev-metric-label">
            <span>New → Meeting rate</span>
            <span className="ev-metric-chip">Booked</span>
          </div>
          <div className="ev-metric-value" style={{ color: '#fcd34d' }}>
            {metrics?.conversionNewToMeeting != null
              ? `${metrics.conversionNewToMeeting}%`
              : '—'}
          </div>
        </div>
        <div className="ev-metric-card">
          <div className="ev-metric-label">
            <span>Won deals</span>
            <span className="ev-metric-chip" style={{ background: 'rgba(34,197,94,0.12)', color: '#4ade80', borderColor: 'rgba(34,197,94,0.25)' }}>🏆</span>
          </div>
          <div className="ev-metric-value" style={{ color: '#4ade80' }}>
            {metrics?.stageCounts?.Won != null ? metrics.stageCounts.Won : '—'}
          </div>
        </div>
        <div className="ev-metric-card">
          <div className="ev-metric-label">
            <span>Open opportunities</span>
            <span className="ev-metric-chip">New + Qualified</span>
          </div>
          <div className="ev-metric-value" style={{ color: '#c4b5fd' }}>
            {(metrics?.stageCounts?.New || 0) + (metrics?.stageCounts?.Qualified || 0)}
          </div>
        </div>
      </div>
      <div style={{ marginTop: 14 }}>
        <div className="ev-label-row">
          <span className="ev-label">Top localities by volume</span>
        </div>
        <div style={{ marginTop: 6 }}>
          <table className="ev-table">
            <thead>
              <tr>
                <th>Area</th>
                <th>Locality</th>
                <th>Leads</th>
              </tr>
            </thead>
            <tbody>
              {(metrics?.topLocalities || []).map((loc) => (
                <tr key={`${loc.area}-${loc.locality}`}>
                  <td>{loc.area}</td>
                  <td>{loc.locality}</td>
                  <td>{loc.count}</td>
                </tr>
              ))}
              {(!metrics || !metrics.topLocalities || metrics.topLocalities.length === 0) && (
                <tr>
                  <td colSpan="3" style={{ color: '#9ca3af', fontSize: 12 }}>
                    No locality data yet. Add a few leads and check back.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function AppShell({ user, onLogout, view, setView }) {
  const initials = user?.name
    ? user.name
      .split(' ')
      .map((p) => p[0])
      .join('')
      .slice(0, 2)
      .toUpperCase()
    : 'AC';

  return (
    <header className="ev-header">
      <a
        href="https://www.aykacontrolsystems.in/"
        target="_blank"
        rel="noreferrer"
        className="ev-logo"
      >
        <img src={acsLogo} alt="Ayka Control Systems" className="ev-logo-image" />
        <div>
          <div className="ev-logo-text-main">ACS Energy</div>
          <div className="ev-logo-text-sub">Lead intake + mini CRM</div>
        </div>
      </a>
      <nav className="ev-nav">
        {setView &&
          [
            { id: 'capture', label: 'Capture', icon: '📥' },
            { id: 'pipeline', label: 'Pipeline', icon: '⚡' },
            { id: 'reports', label: 'Reports', icon: '📊' },
            { id: 'history', label: 'History', icon: '🏆' },
            user?.role === 'admin' && { id: 'team', label: 'Team', icon: '👥' },
          ]
            .filter(Boolean)
            .map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setView(item.id)}
                className={`ev-nav-link ${view === item.id ? 'active' : ''}`}
              >
                {view === item.id && <span className="dot" />}
                {item.icon && <span style={{ fontSize: '0.8rem', lineHeight: 1 }}>{item.icon}</span>}
                <span>{item.label}</span>
              </button>
            ))}
      </nav>
      <div className="ev-user-pill">
        <div className="ev-user-initials">{initials}</div>
        <div>
          <div style={{ fontSize: 11 }}>{user?.name || 'ACS User'}</div>
          <div style={{ fontSize: 10, color: '#9ca3af' }}>{user?.role}</div>
        </div>
        <button
          type="button"
          onClick={onLogout}
          style={{
            marginLeft: 8,
            border: 'none',
            background: 'transparent',
            color: '#9ca3af',
            fontSize: 11,
            cursor: 'pointer',
          }}
        >
          Log out
        </button>
      </div>
    </header>
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

  const refreshLeads = async () => {
    const all = await apiFetch('/leads', { token: auth.token });
    setLeads(all);
  };

  const refreshMetrics = async () => {
    const m = await apiFetch('/reports/summary', { token: auth.token });
    setMetrics(m);
  };

  const openLead = async (lead) => {
    setSelectedLead(lead);
    const details = await apiFetch(`/leads/${lead._id}`, { token: auth.token });
    setSelectedDetails(details);
  };

  const handleAddActivity = async (leadId, payload, opts = {}) => {
    if (opts.updateStage) {
      await apiFetch(`/leads/${leadId}`, {
        method: 'PUT',
        token: auth.token,
        body: { stage: opts.updateStage },
      });
    }
    await apiFetch(`/leads/${leadId}/activities`, {
      method: 'POST',
      token: auth.token,
      body: payload,
    });
    setToast({
      message: opts.updateStage ? `Stage moved to ${opts.updateStage}` : 'Activity logged',
      meta: 'Timeline updated for this lead',
    });
    if (selectedLead && selectedLead._id === leadId) {
      const fresh = await apiFetch(`/leads/${leadId}`, { token: auth.token });
      setSelectedDetails(fresh);
      setSelectedLead(fresh.lead || selectedLead);
    }
    refreshLeads();
    refreshMetrics();
  };

  const handleCancelLead = async (leadId) => {
    try {
      await apiFetch(`/leads/${leadId}`, {
        method: 'DELETE',
        token: auth.token,
      });
      setToast({
        message: 'Order cancelled',
        meta: 'Lead and related history removed',
      });
      if (selectedLead && selectedLead._id === leadId) {
        setSelectedLead(null);
        setSelectedDetails(null);
      }
      refreshLeads();
      refreshMetrics();
    } catch (err) {
      console.error(err);
      setToast({
        message: 'Could not cancel order',
        meta: 'Check backend connection and try again',
      });
    }
  };

  const refreshUsers = async () => {
    if (auth.user?.role !== 'admin') return;
    const all = await apiFetch('/users', { token: auth.token });
    setUsers(all);
  };

  /* eslint-disable react-hooks/exhaustive-deps */
  useEffect(() => {
    const handler = async (e) => {
      const id = e.detail?.id;
      if (!id) return;
      try {
        await apiFetch(`/users/${id}`, { method: 'DELETE', token: auth.token });
        setToast({
          message: 'User removed',
          meta: 'This person no longer has access',
        });
        refreshUsers();
      } catch (err) {
        console.error(err);
        setToast({
          message: 'Could not remove user',
          meta: 'Check backend connection and try again',
        });
      }
    };
    window.addEventListener('acs-remove-user', handler);
    return () => window.removeEventListener('acs-remove-user', handler);
  }, [auth.token]);

  useEffect(() => {
    if (!auth.token) return;
    refreshLeads();
    refreshMetrics();
    refreshUsers();
  }, [auth.token]);
  /* eslint-enable react-hooks/exhaustive-deps */

  useEffect(() => {
    if (!toast.message) return;
    const t = setTimeout(() => setToast({ message: '', meta: '' }), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  const handleLeadSubmitted = (leadId, error) => {
    if (error) {
      setToast({
        message: 'Could not create lead',
        meta: 'Check backend connection and try again',
      });
      return;
    }
    setToast({
      message: 'Lead captured',
      meta: leadId ? `Lead ID: ${leadId}` : '',
    });
    refreshLeads();
    refreshMetrics();
  };

  return (
    <div className="ev-layout">
      <AppShell user={auth.user} onLogout={auth.logout} view={view} setView={setView} />
      <main className="ev-main">
        {view === 'capture' && (
          <div style={{ width: '100%' }}>
            <PublicLeadForm onSubmitted={handleLeadSubmitted} />
          </div>
        )}

        {view === 'pipeline' && (
          <div style={{ width: '100%' }}>
            <div className="ev-grid ev-grid-pipeline">
              <div>
                <KanbanBoard leads={leads} onSelect={openLead} />
              </div>
              <MetricsPanel metrics={metrics} onGoToReports={() => setView('reports')} />
            </div>
            <LeadList leads={leads} onSelect={openLead} />
          </div>
        )}

        {view === 'reports' && (
          <div style={{ width: '100%', display: 'grid', gridTemplateColumns: '2fr 3fr', gap: 16 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <MetricsPanel metrics={metrics} onGoToReports={() => { }} />
              <LeadList leads={leads} onSelect={openLead} />
            </div>
            <LeadDetail
              lead={selectedLead}
              details={selectedDetails}
              onAddActivity={handleAddActivity}
              onCancel={handleCancelLead}
            />
          </div>
        )}

        {view === 'history' && (
          <div style={{ width: '100%' }}>
            <div className="ev-panel-header">
              <div>
                <div className="ev-panel-title">Success history</div>
                <div className="ev-panel-subtitle">
                  All orders marked as success (Won stage).
                </div>
              </div>
            </div>
            <LeadList leads={leads.filter((l) => l.stage === 'Won')} onSelect={openLead} />
          </div>
        )}

        {view === 'team' && auth.user?.role === 'admin' && (
          <div style={{ width: '100%', display: 'grid', gridTemplateColumns: '3fr 2fr', gap: 16 }}>
            <TeamPanel users={users} />
            <InviteUserPanel onCreated={refreshUsers} />
          </div>
        )}
      </main>
      <Toast message={toast.message} meta={toast.meta} />
    </div>
  );
}

function TeamPanel({ users }) {
  return (
    <div className="ev-panel">
      <div className="ev-panel-header">
        <div>
          <div className="ev-panel-title">Team</div>
          <div className="ev-panel-subtitle">Who has access to ACS Energy.</div>
        </div>
        <span className="ev-tag">Admin only</span>
      </div>
      <table className="ev-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Role</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id || u._id}>
              <td>{u.name}</td>
              <td>{u.email}</td>
              <td>{u.role}</td>
              <td>
                <button
                  type="button"
                  className="ev-danger-btn"
                  onClick={() => {
                    if (
                      window.confirm(
                        `Remove ${u.name} (${u.role}) from access? This will delete their account.`
                      )
                    ) {

                      const event = new CustomEvent('acs-remove-user', {
                        detail: { id: u.id || u._id },
                      });
                      window.dispatchEvent(event);
                    }
                  }}
                >
                  Remove
                </button>
              </td>
            </tr>
          ))}
          {users.length === 0 && (
            <tr>
              <td colSpan="3" style={{ fontSize: 12, color: '#9ca3af' }}>
                No additional team members yet. Use the form on the right to invite sales users or
                co-admins.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function InviteUserPanel({ onCreated }) {
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    role: 'sales',
    password: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const auth = useAuth();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.password) {
      setError('Name, email and password are required.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await apiFetch('/users', {
        method: 'POST',
        token: auth.token,
        body: form,
      });
      setForm({ name: '', email: '', phone: '', role: 'sales', password: '' });
      onCreated?.();
    } catch (err) {
      console.error(err);
      setError('Could not create user. Make sure you are logged in as admin.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="ev-panel">
      <div className="ev-panel-header">
        <div>
          <div className="ev-panel-title">Invite teammate</div>
          <div className="ev-panel-subtitle">Add sales users or another admin.</div>
        </div>
      </div>
      <form onSubmit={handleSubmit} className="ev-input-grid">
        <div className="ev-field">
          <div className="ev-label-row">
            <span className="ev-label">Name</span>
          </div>
          <input
            className="ev-input"
            name="name"
            value={form.name}
            onChange={handleChange}
            placeholder="Full name"
          />
        </div>
        <div className="ev-field">
          <div className="ev-label-row">
            <span className="ev-label">Email</span>
          </div>
          <input
            className="ev-input"
            name="email"
            value={form.email}
            onChange={handleChange}
            placeholder="user@acs.in"
          />
        </div>
        <div className="ev-field">
          <div className="ev-label-row">
            <span className="ev-label">Phone</span>
          </div>
          <input
            className="ev-input"
            name="phone"
            value={form.phone}
            onChange={handleChange}
            placeholder="+91…"
          />
        </div>
        <div className="ev-field">
          <div className="ev-label-row">
            <span className="ev-label">Role</span>
          </div>
          <select
            className="ev-select"
            name="role"
            value={form.role}
            onChange={handleChange}
          >
            <option value="sales">Sales</option>
            <option value="admin">Admin</option>
          </select>
        </div>
        <div className="ev-field">
          <div className="ev-label-row">
            <span className="ev-label">Temporary password</span>
          </div>
          <input
            className="ev-input"
            name="password"
            type="password"
            value={form.password}
            onChange={handleChange}
            placeholder="Set an initial password"
          />
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-end', marginTop: 4 }}>
          <button type="submit" className="ev-primary-btn" disabled={saving}>
            {saving ? 'Inviting…' : 'Create user'}
          </button>
        </div>
      </form>
      {error && (
        <div style={{ marginTop: 8, fontSize: 12, color: '#fecaca' }}>
          {error}
        </div>
      )}
    </div>
  );
}

function App() {
  const auth = useAuth();

  if (!auth.user || !auth.token) {
    return <LoginScreen onLoggedIn={auth.login} />;
  }

  return <AdminDashboard auth={auth} />;
}

export default App;
