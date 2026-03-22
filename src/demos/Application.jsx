import { useState, useRef, useEffect } from 'preact/hooks';
import { Layout, OrderResults, WaitingScreen, usePanel, API_BASE } from '@shared/ui/index.js';
import { navigate } from '../App.jsx';

const STEPS = [
  { title: 'Collect applicant info', guide: '<p>The form collects applicant PII and sends it to your backend.</p><pre>POST /v1/orders/</pre><p><a href="https://docs.truv.com/reference/create-an-order" target="_blank">API Reference →</a></p>' },
  { title: 'Bridge verification', guide: '<p>Sandbox credentials: <code>goodlogin</code> / <code>goodpassword</code></p><p><a href="https://docs.truv.com/docs/bridge-overview" target="_blank">Bridge Docs →</a></p>' },
  { title: 'Webhook processing', guide: '<p>Truv sends webhooks as the verification progresses.</p><p><a href="https://docs.truv.com/docs/webhooks" target="_blank">Webhooks Docs →</a></p>' },
  { title: 'Retrieve results', guide: '<p>Fetch the full results:</p><pre>GET /v1/orders/{order_id}/</pre><p><a href="https://docs.truv.com/reference/get-an-order" target="_blank">API Reference →</a></p>' },
];

const WAITING_MIN_MS = 10000;

export function ApplicationDemo({ screen, param }) {
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
        <AppBridgeScreen
          orderId={param}
          addBridgeEvent={addBridgeEvent}
          startPolling={startPolling}
        />
      )}
      {screen === 'waiting' && (
        <AppWaitingScreen
          orderId={param}
          webhooks={panel.webhooks}
          startPolling={startPolling}
        />
      )}
      {screen === 'results' && (
        <AppResultsScreen
          orderId={param}
          onBack={() => { reset(); navigate('application'); }}
        />
      )}
      {!screen && (
        <div class="max-w-lg mx-auto"><ApplicationForm onSubmit={handleSubmit} submitting={submitting} /></div>
      )}
    </Layout>
  );
}

function AppBridgeScreen({ orderId, addBridgeEvent, startPolling }) {
  const [bridgeToken, setBridgeToken] = useState(null);
  const [error, setError] = useState(null);
  const userIdRef = useRef(null);
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
        userIdRef.current = data.user_id;
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
        if (type === 'COMPLETED' && source === 'order') {
          navigate(`application/waiting/${orderId}`);
        }
      },
      onSuccess: () => addBridgeEvent('onSuccess', null),
      onClose: () => addBridgeEvent('onClose', null),
    });
    b.open();
    return () => { try { b.close(); } catch {} };
  }, [bridgeToken]);

  if (error) return <div class="text-center py-15 text-red-600">{error}</div>;
  if (!bridgeToken) return <div class="text-center py-15"><div class="w-10 h-10 border-3 border-gray-200 border-t-primary rounded-full animate-spin mx-auto" /></div>;

  return (
    <div ref={containerRef} class="w-full h-full overflow-hidden bg-white [&_iframe]:w-full [&_iframe]:!h-full [&_iframe]:border-none" style="zoom: 0.85;" />
  );
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

function ApplicationForm({ onSubmit, submitting }) {
  const [agree, setAgree] = useState(true);
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!agree) return;
    const fd = new FormData(e.target);
    onSubmit({
      first_name: fd.get('first_name') || undefined,
      last_name: fd.get('last_name') || undefined,
      email: fd.get('email') || undefined,
      phone: fd.get('phone') || undefined,
      ssn: fd.get('ssn') || undefined,
      product_type: 'income',
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
      <div class="mb-4"><label class="text-sm font-medium mb-1.5 block">Email</label><input name="email" type="email" placeholder="joe@example.com" class="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm focus:border-primary focus:outline-none" /></div>
      <div class="grid grid-cols-2 gap-4 mb-4">
        <div><label class="text-sm font-medium mb-1.5 block">Phone</label><input name="phone" type="tel" placeholder="123456789" class="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm focus:border-primary focus:outline-none" /></div>
        <div><label class="text-sm font-medium mb-1.5 block">SSN (last 4)</label><input name="ssn" placeholder="6789" class="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm focus:border-primary focus:outline-none" /></div>
      </div>
      <label class="flex items-center gap-2.5 my-6 cursor-pointer text-sm text-gray-500">
        <input type="checkbox" checked={agree} onChange={e => setAgree(e.target.checked)} class="w-4.5 h-4.5 accent-primary" />
        I agree to the Terms of Service
      </label>
      <button type="submit" disabled={!agree || submitting} class="w-full py-3 bg-primary text-white font-semibold rounded-lg hover:bg-primary-hover disabled:opacity-40">
        {submitting ? <span class="inline-block w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Continue'}
      </button>
    </form>
  );
}
