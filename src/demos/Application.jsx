import { useState, useRef, useEffect } from 'preact/hooks';
import { Layout, OrderResults, WaitingScreen, usePanel, API_BASE } from '@shared/ui/index.js';

const STEPS = [
  {
    title: 'Collect applicant info',
    guide: '<p>The form collects applicant PII and sends it to your backend. The server calls:</p>'
      + '<pre>POST /v1/orders/\n{\n  "first_name": "...",\n  "last_name": "...",\n  "products": ["income"],\n  "employers": [{ "company_name": "Home Depot" }]\n}</pre>'
      + '<p>The response contains a <code>bridge_token</code> used to initialize the Bridge widget, and an order <code>id</code> for polling results.</p>'
      + '<h5>Key fields</h5><ul>'
      + '<li><code>bridge_token</code> — single-use token to open Bridge</li>'
      + '<li><code>user_id</code> — identifies the user across webhooks</li>'
      + '<li><code>share_url</code> — shareable link for the applicant</li></ul>'
      + '<p><a href="https://docs.truv.com/reference/create-an-order" target="_blank">API Reference →</a></p>',
  },
  {
    title: 'Bridge verification',
    guide: '<p>The Bridge widget is initialized with:</p>'
      + '<pre>TruvBridge.init({\n  bridgeToken: "...",\n  isOrder: true,\n  position: { type: "inline", container: el }\n})</pre>'
      + '<p>Bridge fires events as the user progresses:</p><ul>'
      + '<li><code>onLoad</code> — widget ready</li>'
      + '<li><code>onSuccess</code> — verification task completed</li>'
      + '<li><code>onClose</code> — user dismissed the widget</li></ul>'
      + '<p>Sandbox credentials: <code>goodlogin</code> / <code>goodpassword</code></p>'
      + '<p><a href="https://docs.truv.com/docs/bridge-overview" target="_blank">Bridge Docs →</a></p>',
  },
  {
    title: 'Webhook processing',
    guide: '<p>Truv sends webhooks as the verification progresses:</p><ol>'
      + '<li><code>order-created</code> — order is pending</li>'
      + '<li><code>task-status-updated</code> — login → parse → done</li>'
      + '<li><code>link-connected</code> — payroll link established</li>'
      + '<li><code>order-status-updated</code> (completed) — all done</li></ol>'
      + '<p><a href="https://docs.truv.com/docs/webhooks" target="_blank">Webhooks Docs →</a></p>',
  },
  {
    title: 'Retrieve results',
    guide: '<p>Once completed, fetch the full results:</p>'
      + '<pre>GET /v1/orders/{order_id}/</pre>'
      + '<p>The response includes <code>employers[]</code> with profile, employment, pay statements, W-2s, and bank accounts.</p>'
      + '<p><a href="https://docs.truv.com/reference/get-an-order" target="_blank">API Reference →</a></p>',
  },
];

const WAITING_MIN_MS = 10000;

export function ApplicationDemo() {
  const [screen, setScreen] = useState('form');
  const [orderId, setOrderId] = useState(null);
  const [userId, setUserId] = useState(null);
  const [bridgeToken, setBridgeToken] = useState(null);
  const [orderData, setOrderData] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const waitingStartRef = useRef(null);
  const advancePendingRef = useRef(false);

  const { panel, setCurrentStep, startPolling, addBridgeEvent, reset } = usePanel();

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

  // Init Bridge when container mounts
  const bridgeRef = useRef(null);
  function bridgeContainerRef(el) {
    if (!el || !bridgeToken || !window.TruvBridge || bridgeRef.current) return;
    bridgeRef.current = window.TruvBridge.init({
      bridgeToken, isOrder: true,
      position: { type: 'inline', container: el },
      onLoad: () => addBridgeEvent('onLoad', null),
      onEvent: (type, _, source) => {
        addBridgeEvent('onEvent', { eventType: type, source });
        if (type === 'COMPLETED' && source === 'order') {
          waitingStartRef.current = Date.now();
          advancePendingRef.current = false;
          setCurrentStep(2);
          setScreen('waiting');
        }
      },
      onSuccess: () => addBridgeEvent('onSuccess', null),
      onClose: () => addBridgeEvent('onClose', null),
    });
    bridgeRef.current.open();
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
      setUserId(data.user_id);
      setBridgeToken(data.bridge_token);
      startPolling(data.user_id);
      setCurrentStep(1);
      setScreen('bridge');
    } catch (e) { console.error(e); }
    setSubmitting(false);
  }

  async function goResults() {
    advancePendingRef.current = false;
    setCurrentStep(3);
    setScreen('results');
    if (!orderId) return;
    try {
      const resp = await fetch(`${API_BASE}/api/orders/${encodeURIComponent(orderId)}`);
      setOrderData(await resp.json());
    } catch (e) { console.error(e); }
  }

  function resetApp() {
    bridgeRef.current = null;
    advancePendingRef.current = false;
    reset();
    setScreen('form');
    setOrderId(null);
    setUserId(null);
    setBridgeToken(null);
    setOrderData(null);
    setSubmitting(false);
  }

  const isBridge = screen === 'bridge';

  return (
    <Layout title="Truv Quickstart" badge="Application" steps={STEPS} panel={panel} flush={isBridge}>
      {isBridge ? (
        <div ref={bridgeContainerRef} class="w-full h-full overflow-hidden bg-white [&_iframe]:w-full [&_iframe]:!h-full [&_iframe]:border-none" style="zoom: 0.85;" />
      ) : (
        <div class="max-w-lg mx-auto">
          {screen === 'form' && <ApplicationForm onSubmit={handleSubmit} submitting={submitting} />}
          {screen === 'waiting' && <WaitingScreen webhooks={panel.webhooks} />}
          {screen === 'results' && <ResultsView orderData={orderData} onReset={resetApp} />}
        </div>
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


function ResultsView({ orderData, onReset }) {
  if (!orderData) return <div class="text-center py-15"><div class="w-10 h-10 border-3 border-gray-200 border-t-primary rounded-full animate-spin mx-auto" /></div>;

  const raw = orderData.raw_response || {};
  return (
    <div>
      <h2 class="text-2xl font-bold tracking-tight mb-1.5">Verification Results</h2>
      <p class="text-sm text-gray-500 mb-7">Order {orderData.truv_order_id || ''} • {raw.verification_type || ''} • {orderData.status || ''}</p>
      <OrderResults data={orderData} />
      <div class="flex gap-3 mt-6 pt-5 border-t border-gray-200">
        <button class="px-5 py-2.5 text-sm font-semibold border border-gray-200 rounded-lg hover:border-primary hover:text-primary" onClick={onReset}>New Application</button>
      </div>
    </div>
  );
}
