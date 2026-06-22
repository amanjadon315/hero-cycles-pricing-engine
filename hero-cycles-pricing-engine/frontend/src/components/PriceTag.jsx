// components/PriceTag.jsx
// Signature element of the app: the live price breakdown rendered as a
// printed parts tag / receipt, since that's the literal artifact a
// salesperson is producing -- an itemized price tied to a specific build.

export function PriceTag({
  breakdown,
  loading,
  customerName,
  salespersonName,
  onCustomerNameChange,
  onSalespersonNameChange,
  onSave,
  saveStatus,
}) {
  const today = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

  return (
    <div className="tag">
      <div className="tag-perforation" aria-hidden="true">
        {Array.from({ length: 22 }).map((_, i) => <span key={i} />)}
      </div>

      <div className="tag-body">
        <div className="tag-header">
          <span className="tag-eyebrow">Quote estimate</span>
          <span className="tag-date mono">{today}</span>
        </div>

        {!breakdown && !loading && (
          <p className="tag-empty">Select parts to see the price breakdown.</p>
        )}

        {loading && <p className="tag-empty">Loading model…</p>}

        {breakdown && (
          <>
            <h2 className="tag-model">{breakdown.modelName}</h2>
            <span className="tag-model-code mono">{breakdown.modelCode}</span>

            <div className="tag-divider" />

            <div className="tag-line">
              <span>Base / assembly</span>
              <span className="mono">₹{breakdown.baseCost.toLocaleString('en-IN')}</span>
            </div>

            {breakdown.lineItems.map((item, i) => (
              <div className="tag-line" key={i}>
                <span>
                  {item.partName}
                  {item.quantity > 1 && <span className="tag-line-qty"> ×{item.quantity}</span>}
                </span>
                <span className="mono">₹{item.lineTotal.toLocaleString('en-IN')}</span>
              </div>
            ))}

            <div className="tag-divider dashed" />

            <div className="tag-line subtotal">
              <span>Parts subtotal</span>
              <span className="mono">₹{breakdown.partsTotal.toLocaleString('en-IN')}</span>
            </div>

            <div className="tag-total">
              <span>Total</span>
              <span className="mono">₹{breakdown.grandTotal.toLocaleString('en-IN')}</span>
            </div>

            <div className="tag-divider" />

            <div className="tag-fields">
              <label className="tag-field">
                <span>Customer name</span>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => onCustomerNameChange(e.target.value)}
                  placeholder="Optional"
                />
              </label>
              <label className="tag-field">
                <span>Salesperson</span>
                <input
                  type="text"
                  value={salespersonName}
                  onChange={(e) => onSalespersonNameChange(e.target.value)}
                  placeholder="Optional"
                />
              </label>
            </div>

            <button className="tag-save" onClick={onSave} disabled={saveStatus === 'saving'}>
              {saveStatus === 'saving' && 'Saving quote…'}
              {saveStatus === 'saved' && 'Saved ✓'}
              {saveStatus === 'error' && 'Failed — try again'}
              {!saveStatus && 'Save this quote'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
