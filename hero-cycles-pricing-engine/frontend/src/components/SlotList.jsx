// components/SlotList.jsx
// The main configuration interface: one row per slot (Frame, Tyres, etc),
// each with a dropdown of compatible parts and its current unit price
// shown inline so the salesperson sees the cost impact before picking.

export function SlotList({ modelDetail, selections, onSelect, loading }) {
  if (loading) {
    return (
      <div className="card">
        <div className="card-label">Parts</div>
        <div className="skeleton-list">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="skeleton-line" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="card-label">
        Parts for {modelDetail.name}
        <span className="card-label-hint">choose one option per slot</span>
      </div>

      <div className="slot-list">
        {modelDetail.slots.map((slot) => {
          const selectedPartId = selections[slot.id];
          const selectedPart = slot.compatibleParts.find((p) => p.id === selectedPartId);

          return (
            <div className="slot-row" key={slot.id}>
              <div className="slot-meta">
                <span className="slot-label">{slot.label}</span>
                {slot.quantity > 1 && <span className="slot-qty">× {slot.quantity}</span>}
                {!slot.is_required && <span className="slot-optional">optional</span>}
              </div>

              <div className="slot-control">
                <select
                  value={selectedPartId || ''}
                  onChange={(e) => onSelect(slot.id, e.target.value ? Number(e.target.value) : null)}
                  className="slot-select"
                >
                  {!slot.is_required && <option value="">— none —</option>}
                  {slot.compatibleParts.map((part) => (
                    <option key={part.id} value={part.id}>
                      {part.name} — ₹{part.current_price.toLocaleString('en-IN')}
                    </option>
                  ))}
                </select>

                {selectedPart && (
                  <span className="slot-sku mono">{selectedPart.sku}</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
