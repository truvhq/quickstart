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

export function ApplicationDemo({ screen }) {
  const [orderId, setOrderId] = useState(null);
  const [bridgeToken, setBridgeToken] = useState(null);
  const [orderData, setOrderData] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const waitingStartRef = useRef(null);
  const advancePendingRef = useRef(false);

  const { panel, setCurrentStep, startPolling, addBridgeEvent, reset } = usePanel();

  useEffect(() => {
    const stepMap = { '': 0, 'bridge': 1, 'waiting': 2, 'results': 3 };
    setCurrentStep(stepMap[screen] ?? 0);
  }, [screen]);

  // Auto-advance from waiting
  useEffect(() => {
    if (screen !== 'waiting' || advancePendingRef.current) return;
    const isCompleted = panel.webhooks.some(w => {
      const p = typeof w.payload === 'string' ? JSON.parse(w.payload) : (w.payload || {});
      return (p.event_type === 'order-status-updated' && p.status === 'completed')
        || (w.event_type === 'order-status-updated' && w.status === 'completed');
    });
    if (isCompleted) {
      advancePendingRef.current = true;
      const delay = Math.max(1000, WAITING_MIN_MS - (Date.now() - waitingStartRef.current) + 1000);
      setTimeout(() => goResults(), delay);
    }
  }, [panel.webhooks, screen]);

  // Init Bridge when bridge container mounts
  function bridgeContainer(el) {
    if (!el || !bridgeToken || !window.TruvBridge) return;
    const b = window.TruvBridge.init({
      bridgeToken, isOrder: true,
      position: { type: 'inline', container: el },
      onLoad: () => addBridgeEvent('onLoad', null),
      onEvent: (type, _, source) => {
        addBridgeEvent('onEvent', { eventType: type, source });
        if (type === 'COMPLETED' && source === 'order') {
          waitingStartRef.current = Date.now();
          advancePendingRef.current = false;
          navigate('application/waiting');
        }
      },
      onSuccess: () => addBridgeEvent('onSuccess', null),
      onClose: () => addBridgeEvent('onClose', null),
    });
    b.open();
  }

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
      setOrderId(data.order_id);
      setBridgeToken(data.bridge_token);
      startPolling(data.user_id);
      navigate('application/bridge');
    } catch (e) { console.error(e); }
    setSubmitting(false);
  }

  async function goResults() {
    advancePendingRef.current = false;
    navigate('application/results');
    if (!orderId) return;
    try {
      const resp = await fetch(`${API_BASE}/api/orders/${encodeURIComponent(orderId)}`);
      setOrderData(await resp.json());
    } catch (e) { console.error(e); }
  }

  function resetApp() {
    reset();
    setOrderId(null);
    setBridgeToken(null);
    setOrderData(null);
    setSubmitting(false);
    navigate('application');
  }

  const isBridge = screen === 'bridge';

  return (
    <Layout title="Truv Quickstart" badge="Application" steps={STEPS} panel={panel} flush={isBridge}>
      {screen === 'bridge' && (
        <div ref={bridgeContainer} key={bridgeToken} class="w-full h-full overflow-hidden bg-white [&_iframe]:w-full [&_iframe]:!h-full [&_iframe]:border-none" style="zoom: 0.85;" />
      )}
      {screen === 'waiting' && (
        <div class="max-w-lg mx-auto"><WaitingScreen webhooks={panel.webhooks} /></div>
      )}
      {screen === 'results' && (
        <div class="max-w-lg mx-auto">
          {orderData ? (
            <div>
              <h2 class="text-2xl font-bold tracking-tight mb-1.5">Verification Results</h2>
              <p class="text-sm text-gray-500 mb-7">Order {orderData.truv_order_id || ''} • {orderData.status || ''}</p>
              <OrderResults data={orderData} />
              <div class="flex gap-3 mt-6 pt-5 border-t border-gray-200">
                <button class="px-5 py-2.5 text-sm font-semibold border border-gray-200 rounded-lg hover:border-primary hover:text-primary" onClick={resetApp}>New Application</button>
              </div>
            </div>
          ) : (
            <div class="text-center py-15"><div class="w-10 h-10 border-3 border-gray-200 border-t-primary rounded-full animate-spin mx-auto" /></div>
          )}
        </div>
      )}
      {!screen && (
        <div class="max-w-lg mx-auto"><ApplicationForm onSubmit={handleSubmit} submitting={submitting} /></div>
      )}
    </Layout>
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
