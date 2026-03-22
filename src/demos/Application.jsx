import { useState, useRef, useEffect } from 'preact/hooks';
import { Layout, OrderResults, WaitingScreen, usePanel, API_BASE } from '@shared/ui/index.js';
import { navigate } from '../App.jsx';

const STEPS = [
  {
    title: 'Collect applicant info',
    guide: '<p>The form collects applicant PII and employer. Companies are searched via:</p>'
      + '<pre>GET /v1/company-mappings-search/?query=...</pre>'
      + '<p>Then an order is created:</p><pre>POST /v1/orders/</pre>'
      + '<p><a href="https://docs.truv.com/reference/company_autocomplete_search" target="_blank">Company Search →</a> • <a href="https://docs.truv.com/reference/create-an-order" target="_blank">Orders →</a></p>',
  },
  { title: 'Bridge verification', guide: '<p>Sandbox credentials: <code>goodlogin</code> / <code>goodpassword</code></p><p><a href="https://docs.truv.com/docs/bridge-overview" target="_blank">Bridge Docs →</a></p>' },
  { title: 'Webhook processing', guide: '<p>Truv sends webhooks as the verification progresses.</p><p><a href="https://docs.truv.com/docs/webhooks" target="_blank">Webhooks Docs →</a></p>' },
  { title: 'Retrieve results', guide: '<p>Fetch reports:</p><pre>POST /v1/users/{user_id}/reports/</pre><p><a href="https://docs.truv.com/reference/users_reports" target="_blank">Reports API →</a></p>' },
];

const WAITING_MIN_MS = 10000;

export function ApplicationDemo({ screen, param }) {
  const [productType, setProductType] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const { panel, setCurrentStep, startPolling, addBridgeEvent, reset } = usePanel();

  useEffect(() => {
    const stepMap = { '': 0, 'bridge': 1, 'waiting': 2, 'results': 3 };
    setCurrentStep(stepMap[screen] ?? 0);
  }, [screen]);

  async function handleSubmit(formData) {
    setSubmitting(true);
    try {
      const resp = await fetch(`${API_BASE}/api/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, demo_id: 'application' }),
      });
      const data = await resp.json();
      if (!resp.ok) { alert('Error: ' + (data.error || 'Unknown')); setSubmitting(false); return; }
      navigate(`application/bridge/${data.order_id}`);
    } catch (e) { console.error(e); }
    setSubmitting(false);
  }

  const isBridge = screen === 'bridge';

  return (
    <Layout title="Truv Quickstart" badge="Application" steps={STEPS} panel={panel} flush={isBridge}>
      {screen === 'bridge' && (
        <AppBridgeScreen orderId={param} addBridgeEvent={addBridgeEvent} startPolling={startPolling} />
      )}
      {screen === 'waiting' && (
        <AppWaitingScreen orderId={param} webhooks={panel.webhooks} startPolling={startPolling} />
      )}
      {screen === 'results' && (
        <AppResultsScreen orderId={param} onBack={() => { reset(); navigate('application'); }} />
      )}
      {!screen && (
        <div class="max-w-lg mx-auto">
          {!productType ? (
            <IntroScreen onStart={setProductType} />
          ) : (
            <ApplicationForm onSubmit={handleSubmit} submitting={submitting} productType={productType} />
          )}
        </div>
      )}
    </Layout>
  );
}

function IntroScreen({ onStart }) {
  const [selected, setSelected] = useState('income');
  return (
    <div>
      <h2 class="text-2xl font-bold tracking-tight mb-1.5">Application</h2>
      <p class="text-sm text-gray-500 leading-relaxed mb-7">
        Collect applicant details, search for their employer, and verify through Bridge.
      </p>

      <div class="border border-border rounded-xl p-5 bg-white mb-6">
        <h3 class="text-sm font-semibold mb-3">How it works</h3>
        <ol class="text-sm text-gray-600 space-y-2 list-decimal list-inside">
          <li>Select a product type and enter applicant info</li>
          <li>An order is created via <code class="text-xs bg-gray-100 px-1 py-0.5 rounded">POST /v1/orders/</code></li>
          <li>Bridge opens inline — use <code class="text-xs bg-gray-100 px-1 py-0.5 rounded">goodlogin</code> / <code class="text-xs bg-gray-100 px-1 py-0.5 rounded">goodpassword</code></li>
          <li>Webhooks stream in, then reports are fetched</li>
        </ol>
      </div>

      <div class="mb-6">
        <label class="text-sm font-medium mb-1.5 block">Product</label>
        <select value={selected} onChange={e => setSelected(e.target.value)} class="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm bg-white focus:border-primary focus:outline-none">
          <option value="income">Income</option>
          <option value="employment">Employment</option>
        </select>
      </div>

      <button onClick={() => onStart(selected)} class="w-full py-3 bg-primary text-white font-semibold rounded-lg hover:bg-primary-hover">
        Start Application
      </button>
    </div>
  );
}

function CompanySearch({ value, onChange }) {
  const [query, setQuery] = useState(value || '');
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const timerRef = useRef(null);
  const wrapperRef = useRef(null);

  useEffect(() => {
    const handleClick = (e) => { if (wrapperRef.current && !wrapperRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  function handleInput(e) {
    const q = e.target.value;
    setQuery(q);
    onChange({ name: q, id: null });
    if (timerRef.current) clearTimeout(timerRef.current);
    if (q.length < 2) { setResults([]); setOpen(false); return; }
    setLoading(true);
    timerRef.current = setTimeout(async () => {
      try {
        const resp = await fetch(`${API_BASE}/api/companies?q=${encodeURIComponent(q)}&product_type=income`);
        const data = await resp.json();
        setResults(data.slice(0, 8));
        setOpen(data.length > 0);
      } catch { setResults([]); }
      setLoading(false);
    }, 300);
  }

  function select(company) {
    setQuery(company.name);
    onChange({ name: company.name, id: company.company_mapping_id });
    setOpen(false);
  }

  return (
    <div ref={wrapperRef} class="relative">
      <input
        value={query}
        onInput={handleInput}
        onFocus={() => results.length > 0 && setOpen(true)}
        placeholder="Search for employer..."
        class="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm focus:border-primary focus:outline-none"
      />
      {loading && <div class="absolute right-3 top-3"><div class="w-4 h-4 border-2 border-gray-200 border-t-primary rounded-full animate-spin" /></div>}
      {open && results.length > 0 && (
        <div class="absolute z-10 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-auto">
          {results.map(c => (
            <div key={c.company_mapping_id} class="flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 cursor-pointer" onClick={() => select(c)}>
              {c.logo_url && <img src={c.logo_url} class="w-6 h-6 rounded object-contain" />}
              <div class="flex-1 min-w-0">
                <div class="text-sm font-medium truncate">{c.name}</div>
                {c.domain && <div class="text-xs text-gray-400">{c.domain}</div>}
              </div>
              {c.success_rate && <span class={`text-xs px-1.5 py-0.5 rounded ${c.success_rate === 'high' ? 'bg-green-50 text-green-600' : c.success_rate === 'low' ? 'bg-yellow-50 text-yellow-600' : 'bg-gray-50 text-gray-400'}`}>{c.success_rate}</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ApplicationForm({ onSubmit, submitting, productType }) {
  const [agree, setAgree] = useState(true);
  const [employer, setEmployer] = useState({ name: '', id: null });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!agree || !employer.name) return;
    const fd = new FormData(e.target);
    onSubmit({
      first_name: fd.get('first_name') || undefined,
      last_name: fd.get('last_name') || undefined,
      email: fd.get('email') || undefined,
      phone: fd.get('phone') || undefined,
      ssn: fd.get('ssn') || undefined,
      product_type: productType,
      employer: employer.name,
      company_mapping_id: employer.id,
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      <h2 class="text-2xl font-bold tracking-tight mb-1.5">Tell us about yourself</h2>
      <p class="text-sm text-gray-500 leading-relaxed mb-7">Enter applicant details to create a verification order.</p>
      <div class="grid grid-cols-2 gap-4 mb-4">
        <div><label class="text-sm font-medium mb-1.5 block">First name</label><input name="first_name" placeholder="Joe" class="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm focus:border-primary focus:outline-none" /></div>
        <div><label class="text-sm font-medium mb-1.5 block">Last name</label><input name="last_name" placeholder="Doe" class="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm focus:border-primary focus:outline-none" /></div>
      </div>
      <div class="mb-4">
        <label class="text-sm font-medium mb-1.5 block">Employer</label>
        <CompanySearch value={employer.name} onChange={setEmployer} />
        <p class="text-xs text-gray-400 mt-1">Search uses <code>GET /v1/company-mappings-search/</code></p>
      </div>
      <div class="mb-4"><label class="text-sm font-medium mb-1.5 block">Email</label><input name="email" type="email" placeholder="joe@example.com" class="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm focus:border-primary focus:outline-none" /></div>
      <div class="grid grid-cols-2 gap-4 mb-4">
        <div><label class="text-sm font-medium mb-1.5 block">Phone</label><input name="phone" type="tel" placeholder="123456789" class="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm focus:border-primary focus:outline-none" /></div>
        <div><label class="text-sm font-medium mb-1.5 block">SSN (last 4)</label><input name="ssn" placeholder="6789" class="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm focus:border-primary focus:outline-none" /></div>
      </div>
      <label class="flex items-center gap-2.5 my-6 cursor-pointer text-sm text-gray-500">
        <input type="checkbox" checked={agree} onChange={e => setAgree(e.target.checked)} class="w-4.5 h-4.5 accent-primary" />
        I agree to the Terms of Service
      </label>
      <button type="submit" disabled={!agree || !employer.name || submitting} class="w-full py-3 bg-primary text-white font-semibold rounded-lg hover:bg-primary-hover disabled:opacity-40">
        {submitting ? <span class="inline-block w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Continue'}
      </button>
    </form>
  );
}

function AppBridgeScreen({ orderId, addBridgeEvent, startPolling }) {
  const [bridgeToken, setBridgeToken] = useState(null);
  const [error, setError] = useState(null);
  const containerRef = useRef(null);
  const bridgeInitRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const resp = await fetch(`${API_BASE}/api/orders/${encodeURIComponent(orderId)}/info`);
        const data = await resp.json();
        if (cancelled) return;
        if (!resp.ok) { setError(data.error || 'Unknown error'); return; }
        setBridgeToken(data.bridge_token);
        startPolling(data.user_id);
      } catch (e) { if (!cancelled) setError(e.message); }
    })();
    return () => { cancelled = true; };
  }, [orderId]);

  useEffect(() => {
    if (!bridgeToken || !containerRef.current || !window.TruvBridge || bridgeInitRef.current) return;
    bridgeInitRef.current = true;
    const b = window.TruvBridge.init({
      bridgeToken, isOrder: true,
      position: { type: 'inline', container: containerRef.current },
      onLoad: () => addBridgeEvent('onLoad', null),
      onEvent: (type, _, source) => {
        addBridgeEvent('onEvent', { eventType: type, source });
        if (type === 'COMPLETED' && source === 'order') navigate(`application/waiting/${orderId}`);
      },
      onSuccess: () => addBridgeEvent('onSuccess', null),
      onClose: () => addBridgeEvent('onClose', null),
    });
    b.open();
    return () => { try { b.close(); } catch {} };
  }, [bridgeToken]);

  if (error) return <div class="text-center py-15 text-red-600">{error}</div>;
  if (!bridgeToken) return <div class="text-center py-15"><div class="w-10 h-10 border-3 border-gray-200 border-t-primary rounded-full animate-spin mx-auto" /></div>;

  return <div ref={containerRef} class="w-full h-full overflow-hidden bg-white [&_iframe]:w-full [&_iframe]:!h-full [&_iframe]:border-none" style="zoom: 0.85;" />;
}

function AppWaitingScreen({ orderId, webhooks, startPolling }) {
  const waitingStartRef = useRef(Date.now());
  const advancePendingRef = useRef(false);

  useEffect(() => {
    (async () => {
      try {
        const resp = await fetch(`${API_BASE}/api/orders/${encodeURIComponent(orderId)}/info`);
        const data = await resp.json();
        if (resp.ok && data.user_id) startPolling(data.user_id);
      } catch {}
    })();
  }, [orderId]);

  useEffect(() => {
    if (advancePendingRef.current) return;
    const isCompleted = webhooks.some(w => {
      const p = typeof w.payload === 'string' ? JSON.parse(w.payload) : (w.payload || {});
      return (p.event_type === 'order-status-updated' && p.status === 'completed')
        || (w.event_type === 'order-status-updated' && w.status === 'completed');
    });
    if (isCompleted) {
      advancePendingRef.current = true;
      const delay = Math.max(1000, WAITING_MIN_MS - (Date.now() - waitingStartRef.current) + 1000);
      setTimeout(() => navigate(`application/results/${orderId}`), delay);
    }
  }, [webhooks, orderId]);

  return <div class="max-w-lg mx-auto"><WaitingScreen webhooks={webhooks} /></div>;
}

function AppResultsScreen({ orderId, onBack }) {
  const [orderData, setOrderData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const resp = await fetch(`${API_BASE}/api/orders/${encodeURIComponent(orderId)}/report`);
        if (resp.ok) setOrderData(await resp.json());
        else setError('Failed to load results');
      } catch (e) { console.error(e); setError(e.message); }
    })();
  }, [orderId]);

  if (error) return <div class="max-w-lg mx-auto text-center py-15 text-red-600">{error}</div>;
  if (!orderData) return <div class="max-w-lg mx-auto text-center py-15"><div class="w-10 h-10 border-3 border-gray-200 border-t-primary rounded-full animate-spin mx-auto" /></div>;

  return (
    <div class="max-w-lg mx-auto">
      <h2 class="text-2xl font-bold tracking-tight mb-1.5">Verification Results</h2>
      <p class="text-sm text-gray-500 mb-7">Order {orderData.truv_order_id || ''} • {orderData.status || ''}</p>
      <OrderResults data={orderData} />
      <div class="flex gap-3 mt-6 pt-5 border-t border-gray-200">
        <button class="px-5 py-2.5 text-sm font-semibold border border-gray-200 rounded-lg hover:border-primary hover:text-primary" onClick={onBack}>New Application</button>
      </div>
    </div>
  );
}
