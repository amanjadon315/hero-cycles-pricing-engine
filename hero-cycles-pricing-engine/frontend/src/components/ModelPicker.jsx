// components/ModelPicker.jsx
// Horizontal card selector for choosing which cycle model to configure.

export function ModelPicker({ models, loading, selectedModelId, onSelect }) {
  if (loading) {
    return (
      <div className="card">
        <div className="card-label">Cycle model</div>
        <div className="skeleton-row">
          <div className="skeleton-chip" />
          <div className="skeleton-chip" />
          <div className="skeleton-chip" />
        </div>
      </div>
    );
  }

  if (models.length === 0) {
    return (
      <div className="card">
        <div className="card-label">Cycle model</div>
        <p className="empty-text">
          No models found. Run <code className="mono">npm run seed</code> in the backend to load sample data.
        </p>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="card-label">Cycle model</div>
      <div className="model-grid">
        {models.map((model) => (
          <button
            key={model.id}
            className={model.id === selectedModelId ? 'model-card active' : 'model-card'}
            onClick={() => onSelect(model.id)}
            aria-pressed={model.id === selectedModelId}
          >
            <span className="model-code mono">{model.code}</span>
            <span className="model-name">{model.name}</span>
            <span className="model-desc">{model.description}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
