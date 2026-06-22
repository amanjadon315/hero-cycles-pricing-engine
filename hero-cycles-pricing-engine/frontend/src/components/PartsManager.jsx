// components/PartsManager.jsx
// Lets the team see every part, its current price, and update prices when
// costs change -- the exact workflow described in the brief ("a tyre
// priced at ₹200 in January may be ₹230 by December"). Every price change
// here is logged to history, never just overwritten silently.

import { Fragment, useEffect, useState } from 'react';
import { api } from '../api';

export function PartsManager() {
  const [parts, setParts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [draftPrice, setDraftPrice] = useState('');
  const [draftNote, setDraftNote] = useState('');
  const [expandedHistoryId, setExpandedHistoryId] = useState(null);
  const [history, setHistory] = useState(null);
  const [error, setError] = useState(null);

  function loadParts() {
    setLoading(true);
    api.getParts()
      .then(setParts)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    const timeout = setTimeout(loadParts, 0);
    return () => clearTimeout(timeout);
  }, []);

  function startEdit(part) {
    setEditingId(part.id);
    setDraftPrice(String(part.current_price));
    setDraftNote('');
    setError(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setDraftPrice('');
    setDraftNote('');
  }

  async function saveEdit(partId) {
    const price = Number(draftPrice);
    if (Number.isNaN(price) || price < 0) {
      setError('Price must be a non-negative number.');
      return;
    }
    try {
      await api.updatePartPrice(partId, price, draftNote.trim() || undefined);
      cancelEdit();
      loadParts();
    } catch (err) {
      setError(err.message);
    }
  }

  async function toggleHistory(partId) {
    if (expandedHistoryId === partId) {
      setExpandedHistoryId(null);
      setHistory(null);
      return;
    }
    setExpandedHistoryId(partId);
    try {
      const data = await api.getPartHistory(partId);
      setHistory(data.history);
    } catch (err) {
      setError(err.message);
    }
  }

  const grouped = parts.reduce((acc, part) => {
    acc[part.category] = acc[part.category] || [];
    acc[part.category].push(part);
    return acc;
  }, {});

  return (
    <div className="parts-view">
      <div className="card">
        <div className="card-label">
          Parts catalog
          <span className="card-label-hint">update a price and it applies to every future quote instantly</span>
        </div>

        {error && <div className="error-banner">{error}</div>}
        {loading && <p className="empty-text">Loading parts…</p>}

        {!loading && Object.entries(grouped).map(([category, items]) => (
          <div className="parts-group" key={category}>
            <h3 className="parts-group-title">{formatCategory(category)}</h3>
            <table className="parts-table">
              <thead>
                <tr>
                  <th>SKU</th>
                  <th>Name</th>
                  <th>Current price</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {items.map((part) => (
                  <Fragment key={part.id}>
                    <tr>
                      <td className="mono muted-cell">{part.sku}</td>
                      <td>{part.name}</td>
                      <td className="mono">
                        {editingId === part.id ? (
                          <input
                            className="price-input"
                            type="number"
                            min="0"
                            step="0.01"
                            value={draftPrice}
                            onChange={(e) => setDraftPrice(e.target.value)}
                            autoFocus
                          />
                        ) : (
                          `₹${part.current_price.toLocaleString('en-IN')}`
                        )}
                      </td>
                      <td className="parts-actions">
                        {editingId === part.id ? (
                          <>
                            <input
                              className="note-input"
                              type="text"
                              placeholder="Reason (optional)"
                              value={draftNote}
                              onChange={(e) => setDraftNote(e.target.value)}
                            />
                            <button className="btn-small btn-primary" onClick={() => saveEdit(part.id)}>Save</button>
                            <button className="btn-small" onClick={cancelEdit}>Cancel</button>
                          </>
                        ) : (
                          <>
                            <button className="btn-small" onClick={() => startEdit(part)}>Update price</button>
                            <button className="btn-small" onClick={() => toggleHistory(part.id)}>
                              {expandedHistoryId === part.id ? 'Hide history' : 'History'}
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                    {expandedHistoryId === part.id && history && (
                      <tr className="history-row">
                        <td colSpan={4}>
                          <PriceHistoryTimeline history={history} />
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>
    </div>
  );
}

function PriceHistoryTimeline({ history }) {
  if (history.length === 0) return <p className="empty-text">No history yet.</p>;

  return (
    <div className="history-timeline">
      {history.map((entry) => (
        <div className="history-entry" key={entry.id}>
          <span className="history-dot" />
          <div className="history-entry-body">
            <div className="history-entry-top">
              <span className="mono history-price">₹{entry.price.toLocaleString('en-IN')}</span>
              <span className="history-date mono">
                {new Date(entry.effective_from).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
              </span>
            </div>
            {entry.note && <span className="history-note">{entry.note}</span>}
          </div>
        </div>
      ))}
    </div>
  );
}

function formatCategory(category) {
  return category.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}
