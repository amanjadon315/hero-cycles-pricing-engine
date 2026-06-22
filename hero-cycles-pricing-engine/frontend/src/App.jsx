// App.jsx
import { useEffect, useState } from 'react';
import { api } from './api';
import { ModelPicker } from './components/ModelPicker';
import { SlotList } from './components/SlotList';
import { PriceTag } from './components/PriceTag';
import { PartsManager } from './components/PartsManager';
import { SavedQuotes } from './components/SavedQuotes';
import './App.css';

const VIEWS = {
  CONFIGURE: 'configure',
  PARTS: 'parts',
  QUOTES: 'quotes',
};

export default function App() {
  const [view, setView] = useState(VIEWS.CONFIGURE);
  const [models, setModels] = useState([]);
  const [selectedModelId, setSelectedModelId] = useState(null);
  const [modelDetail, setModelDetail] = useState(null);
  const [selections, setSelections] = useState({});
  const [breakdown, setBreakdown] = useState(null);
  const [loadingModels, setLoadingModels] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [pricingError, setPricingError] = useState(null);
  const [customerName, setCustomerName] = useState('');
  const [salespersonName, setSalespersonName] = useState('');
  const [saveStatus, setSaveStatus] = useState(null);

  // Load model list once on mount
  useEffect(() => {
    api.getModels()
      .then((data) => {
        setModels(data);
        if (data.length > 0) setSelectedModelId(data[0].id);
      })
      .catch((err) => setPricingError(err.message))
      .finally(() => setLoadingModels(false));
  }, []);

  // Load full model detail (slots + compatible parts) whenever selection changes
  useEffect(() => {
    if (!selectedModelId) return;

    let cancelled = false;

    async function loadDetail() {
      setLoadingDetail(true);
      setBreakdown(null);
      setSelections({});
      setSaveStatus(null);

      try {
        const data = await api.getModel(selectedModelId);
        if (cancelled) return;
        setModelDetail(data);
        // Auto-select the cheapest compatible part for each required slot,
        // so the salesperson sees a price instantly rather than a blank state.
        const initial = {};
        for (const slot of data.slots) {
          if (slot.is_required && slot.compatibleParts.length > 0) {
            initial[slot.id] = slot.compatibleParts[0].id;
          }
        }
        setSelections(initial);
      } catch (err) {
        if (!cancelled) setPricingError(err.message);
      } finally {
        if (!cancelled) setLoadingDetail(false);
      }
    }

    loadDetail();
    return () => { cancelled = true; };
  }, [selectedModelId]);

  // Recompute price whenever selections change
  useEffect(() => {
    if (!selectedModelId || Object.keys(selections).length === 0) {
      const timeout = setTimeout(() => setBreakdown(null), 0);
      return () => clearTimeout(timeout);
    }

    const timeout = setTimeout(() => {
      setPricingError(null);
      api.priceConfiguration(selectedModelId, selections)
        .then(setBreakdown)
        .catch((err) => {
          setPricingError(err.details ? err.details.join(' ') : err.message);
          setBreakdown(null);
        });
    }, 150); // small debounce so rapid slot changes don't spam the API

    return () => clearTimeout(timeout);
  }, [selectedModelId, selections]);

  function handleSelect(slotId, partId) {
    setSelections((prev) => ({ ...prev, [slotId]: partId }));
    setSaveStatus(null);
  }

  async function handleSaveQuote() {
    setSaveStatus('saving');
    try {
      await api.saveConfiguration({
        modelId: selectedModelId,
        customerName: customerName.trim() || null,
        salespersonName: salespersonName.trim() || null,
        selections,
      });
      setSaveStatus('saved');
    } catch (err) {
      setSaveStatus('error');
      setPricingError(err.message);
    }
  }

  return (
    <div className="shell">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark">HC</span>
          <div className="brand-text">
            <strong>Hero Cycles</strong>
            <span>Pricing Configurator</span>
          </div>
        </div>
        <nav className="tabs">
          <button
            className={view === VIEWS.CONFIGURE ? 'tab active' : 'tab'}
            onClick={() => setView(VIEWS.CONFIGURE)}
          >
            Build a Quote
          </button>
          <button
            className={view === VIEWS.PARTS ? 'tab active' : 'tab'}
            onClick={() => setView(VIEWS.PARTS)}
          >
            Manage Parts &amp; Prices
          </button>
          <button
            className={view === VIEWS.QUOTES ? 'tab active' : 'tab'}
            onClick={() => setView(VIEWS.QUOTES)}
          >
            Saved Quotes
          </button>
        </nav>
      </header>

      <main className="main">
        {view === VIEWS.CONFIGURE && (
          <div className="configure-layout">
            <section className="config-panel">
              <ModelPicker
                models={models}
                loading={loadingModels}
                selectedModelId={selectedModelId}
                onSelect={setSelectedModelId}
              />

              {modelDetail && (
                <SlotList
                  modelDetail={modelDetail}
                  selections={selections}
                  onSelect={handleSelect}
                  loading={loadingDetail}
                />
              )}

              {pricingError && (
                <div className="error-banner" role="alert">
                  {pricingError}
                </div>
              )}
            </section>

            <aside className="price-panel">
              <PriceTag
                breakdown={breakdown}
                loading={loadingDetail}
                customerName={customerName}
                salespersonName={salespersonName}
                onCustomerNameChange={setCustomerName}
                onSalespersonNameChange={setSalespersonName}
                onSave={handleSaveQuote}
                saveStatus={saveStatus}
              />
            </aside>
          </div>
        )}

        {view === VIEWS.PARTS && <PartsManager />}
        {view === VIEWS.QUOTES && <SavedQuotes />}
      </main>
    </div>
  );
}
