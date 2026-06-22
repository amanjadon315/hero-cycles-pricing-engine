// components/SavedQuotes.jsx
// List of previously saved configurations. Clicking one shows the full
// breakdown using the PRICE-AT-TIME-OF-SAVE snapshot, so a quote given to
// a customer in January doesn't silently change if part prices move later.

import { useEffect, useState } from 'react';
import { api } from '../api';

export function SavedQuotes() {
  const [quotes, setQuotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.getConfigurations()
      .then(setQuotes)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  function viewQuote(id) {
    setSelectedId(id);
    setDetail(null);
    api.getConfiguration(id).then(setDetail).catch((err) => setError(err.message));
  }

  if (loading) return <div className="card"><p className="empty-text">Loading saved quotes…</p></div>;

  if (quotes.length === 0) {
    return (
      <div className="card">
        <div className="card-label">Saved quotes</div>
        <p className="empty-text">No quotes saved yet. Build a configuration and click "Save this quote".</p>
      </div>
    );
  }

  return (
    <div className="quotes-layout">
      <div className="card">
        <div className="card-label">Saved quotes</div>
        {error && <div className="error-banner">{error}</div>}
        <table className="parts-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Model</th>
              <th>Customer</th>
              <th>Salesperson</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {quotes.map((q) => (
              <tr key={q.id} className={selectedId === q.id ? 'row-active' : ''}>
                <td className="mono muted-cell">
                  {new Date(q.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                </td>
                <td>{q.model_name}</td>
                <td>{q.customer_name || <span className="muted-cell">—</span>}</td>
                <td>{q.salesperson_name || <span className="muted-cell">—</span>}</td>
                <td>
                  <button className="btn-small" onClick={() => viewQuote(q.id)}>View</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {detail && (
        <div className="tag" style={{ position: 'sticky', top: 28 }}>
          <div className="tag-perforation" aria-hidden="true">
            {Array.from({ length: 22 }).map((_, i) => <span key={i} />)}
          </div>
          <div className="tag-body">
            <div className="tag-header">
              <span className="tag-eyebrow">Saved quote #{detail.id}</span>
              <span className="tag-date mono">
                {new Date(detail.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
              </span>
            </div>

            <h2 className="tag-model">{detail.modelName}</h2>
            <span className="tag-model-code mono">{detail.modelCode}</span>

            <div className="tag-divider" />

            <div className="tag-line">
              <span>Base / assembly</span>
              <span className="mono">₹{detail.baseCost.toLocaleString('en-IN')}</span>
            </div>
            {detail.lineItems.map((item, i) => (
              <div className="tag-line" key={i}>
                <span>{item.partName}{item.quantity > 1 && <span className="tag-line-qty"> ×{item.quantity}</span>}</span>
                <span className="mono">₹{item.lineTotal.toLocaleString('en-IN')}</span>
              </div>
            ))}

            <div className="tag-divider dashed" />
            <div className="tag-line subtotal">
              <span>Parts subtotal</span>
              <span className="mono">₹{detail.partsTotal.toLocaleString('en-IN')}</span>
            </div>
            <div className="tag-total">
              <span>Total</span>
              <span className="mono">₹{detail.grandTotal.toLocaleString('en-IN')}</span>
            </div>

            {(detail.customerName || detail.salespersonName) && (
              <>
                <div className="tag-divider" />
                <div className="tag-fields-static">
                  {detail.customerName && <div><span>Customer</span><strong>{detail.customerName}</strong></div>}
                  {detail.salespersonName && <div><span>Salesperson</span><strong>{detail.salespersonName}</strong></div>}
                </div>
              </>
            )}

            <p className="tag-footnote">
              Prices shown are locked to the day this quote was saved, even if part costs have changed since.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
