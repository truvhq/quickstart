import { useState, useRef, useEffect } from 'preact/hooks';
import { Layout, OrderResults, WaitingScreen, usePanel, API_BASE } from '@shared/ui/index.js';
import { navigate } from '../App.jsx';

const STEPS = [
  {
    title: 'Initialize orders',
    guide: '<p>Enter an Application ID and create verification orders for each product type:</p>'
      + '<pre>POST /v1/orders/\n{\n  "products": ["income"],\n  "external_user_id": "...",\n  "employers": [{"company_name": "..."}]\n}</pre>'
      + '<p>All orders share the same <code>external_user_id</code> so Truv links them to one applicant.</p>'
      + '<p><a href="https://docs.truv.com/reference/create-an-order" target="_blank">API Reference →</a></p>',
  },
  {
    title: 'Bridge verification',
    guide: '<p>The Bridge widget is initialized with:</p>'
      + '<pre>TruvBridge.init({\n  bridgeToken: "...",\n  isOrder: true,\n  position: { type: "inline", container: el }\n})</pre>'
      + '<p>Sandbox credentials: <code>goodlogin</code> / <code>goodpassword</code></p>'
      + '<p><a href="https://docs.truv.com/docs/bridge-overview" target="_blank">Bridge Docs →</a></p>',
  },
  {
    title: 'Webhook processing',
    guide: '<p>Truv sends webhooks as the verification progresses.</p>'
      + '<p><a href="https://docs.truv.com/docs/webhooks" target="_blank">Webhooks Docs →</a></p>',
  },
  {
    title: 'Retrieve reports',
    guide: '<p>Fetch reports based on product type:</p>'
      + '<pre>POST /v1/users/{user_id}/reports/\n{ "is_voe": false }  // income\n{ "is_voe": true }   // employment</pre>'
      + '<pre>POST /v1/users/{user_id}/assets/reports/\nPOST /v1/users/{user_id}/income_insights/reports/</pre>'
      + '<p><a href="https://docs.truv.com/reference/users_reports" target="_blank">Reports API →</a></p>',
  },
];

const TASKS = [
  { id: 'income', name: 'Verify Income', desc: 'Home Depot', products: ['income'], employer: 'Home Depot', icon: '💰', iconBg: 'bg-green-100' },
  { id: 'employment', name: 'Verify Employment', desc: 'Home Depot', products: ['employment'], employer: 'Home Depot', icon: '📋', iconBg: 'bg-blue-100' },
  { id: 'assets', name: 'Verify Assets', desc: 'Bank accounts & transactions', products: ['assets'], employer: null, icon: '🏦', iconBg: 'bg-amber-100' },
  { id: 'assets-income', name: 'Assets + Income', desc: 'Combined order', products: ['income', 'assets'], employer: 'Home Depot', icon: '📊', iconBg: 'bg-purple-100' },
];

const WAITING_MIN_MS = 10000;

export function FollowUpDemo({ screen, param }) {
  const [applicationId, setApplicationId] = useState(() => `qs-${Date.now()}`);
  const [taskOrders, setTaskOrders] = useState(null);
  const [initializing, setInitializing] = useState(false);
  const [taskStatus, setTaskStatus] = useState({});
  const activeTaskRef = useRef(null);
  const { panel, setCurrentStep, startPolling, addBridgeEvent, reset } = usePanel();

  useEffect(() => {
    const stepMap = { '': 0, 'bridge': 1, 'waiting': 2, 'results': 3 };
    setCurrentStep(stepMap[screen] ?? 0);
  }, [screen]);

  async function handleInitialize() {
    if (!applicationId.trim()) return;
    setInitializing(true);
    const results = {};
    for (const task of TASKS) {
      try {
        const body = { products: task.products, demo_id: 'follow-up', external_user_id: applicationId.trim() };
        if (task.employer) body.employer = task.employer;
        const resp = await fetch(`${API_BASE}/api/orders`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        const data = await resp.json();
        if (resp.ok) results[task.id] = data;
      } catch (e) { console.error(`Failed to create order for ${task.id}:`, e); }
    }
    setTaskOrders(results);
    setInitializing(false);
  }

  function handleStartTask(task) {
    const order = taskOrders?.[task.id];
    if (!order) return;
    activeTaskRef.current = task.id;
    navigate(`follow-up/bridge/${order.order_id}`);
  }

  const isBridge = screen === 'bridge';

  return (
    <Layout title="Truv Quickstart" badge="Follow-up" steps={STEPS} panel={panel} flush={isBridge}>
      {screen === 'bridge' && (
        <BridgeScreen
          orderId={param}
          addBridgeEvent={addBridgeEvent}
          startPolling={startPolling}
          onCompleted={() => {
            if (activeTaskRef.current) setTaskStatus(prev => ({ ...prev, [activeTaskRef.current]: 'completed' }));
          }}
        />
      )}
      {screen === 'waiting' && (
        <WaitingScreenWrapper
          orderId={param}
          webhooks={panel.webhooks}
          startPolling={startPolling}
        />
      )}
      {screen === 'results' && (
        <ResultsScreen
          orderId={param}
          onBack={() => { reset(); navigate('follow-up'); }}
        />
      )}
      {!screen && (
        <div class="max-w-2xl mx-auto">
          {!taskOrders ? (
            <InitScreen
              applicationId={applicationId}
              onApplicationIdChange={setApplicationId}
              onInitialize={handleInitialize}
              initializing={initializing}
            />
          ) : (
            <div>
              <h2 class="text-2xl font-bold tracking-tight mb-1.5">Complete Your Verifications</h2>
              <p class="text-sm text-gray-500 leading-relaxed mb-2">Application: <code class="text-xs bg-gray-100 px-1.5 py-0.5 rounded">{applicationId}</code></p>
              <p class="text-sm text-gray-500 leading-relaxed mb-7">Complete each verification by connecting through Bridge.</p>
              <TaskList tasks={TASKS} taskOrders={taskOrders} taskStatus={taskStatus} onStart={handleStartTask} />
            </div>
          )}
        </div>
      )}
    </Layout>
  );
}

function InitScreen({ applicationId, onApplicationIdChange, onInitialize, initializing }) {
  return (
    <div>
      <h2 class="text-2xl font-bold tracking-tight mb-1.5">Follow-up Verification</h2>
      <p class="text-sm text-gray-500 leading-relaxed mb-7">
        This demo creates multiple verification orders for the same applicant — income, employment, and assets.
        Each order opens a Bridge widget where the applicant connects their accounts. Once completed,
        reports are generated using the Truv Reports API.
      </p>

      <div class="border border-border rounded-xl p-5 bg-white mb-6">
        <h3 class="text-sm font-semibold mb-3">How it works</h3>
        <ol class="text-sm text-gray-600 space-y-2 list-decimal list-inside">
          <li>Create orders for each product type with a shared <code class="text-xs bg-gray-100 px-1 py-0.5 rounded">external_user_id</code></li>
          <li>Open Bridge for each order — use sandbox credentials <code class="text-xs bg-gray-100 px-1 py-0.5 rounded">goodlogin</code> / <code class="text-xs bg-gray-100 px-1 py-0.5 rounded">goodpassword</code></li>
          <li>Webhooks stream in as verification progresses</li>
          <li>Fetch reports: VOIE for income, VOE for employment, assets + income insights for assets</li>
        </ol>
      </div>

      <div class="mb-4">
        <label class="text-sm font-medium mb-1.5 block">Application ID</label>
        <input
          value={applicationId}
          onInput={e => onApplicationIdChange(e.target.value)}
          placeholder="Enter an application ID"
          class="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm font-mono focus:border-primary focus:outline-none"
        />
        <p class="text-xs text-gray-400 mt-1">Sent as <code>external_user_id</code> — all orders share the same Truv user.</p>
      </div>

      <button
        onClick={onInitialize}
        disabled={initializing || !applicationId.trim()}
        class="w-full py-3 bg-primary text-white font-semibold rounded-lg hover:bg-primary-hover disabled:opacity-40"
      >
        {initializing ? (
          <span class="inline-flex items-center gap-2">
            <span class="inline-block w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            Creating orders...
          </span>
        ) : 'Create Orders'}
      </button>
    </div>
  );
}

function BridgeScreen({ orderId, addBridgeEvent, startPolling, onCompleted }) {
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
        if (type === 'COMPLETED' && source === 'order') {
          onCompleted();
          navigate(`follow-up/waiting/${orderId}`);
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

function WaitingScreenWrapper({ orderId, webhooks, startPolling }) {
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
      const elapsed = Date.now() - waitingStartRef.current;
      const delay = Math.max(1000, WAITING_MIN_MS - elapsed + 1000);
      setTimeout(() => navigate(`follow-up/results/${orderId}`), delay);
    }
  }, [webhooks, orderId]);

  return <div class="max-w-2xl mx-auto"><WaitingScreen webhooks={webhooks} /></div>;
}

function ResultsScreen({ orderId, onBack }) {
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

  if (error) return <div class="max-w-2xl mx-auto text-center py-15 text-red-600">{error}</div>;
  if (!orderData) return <div class="max-w-2xl mx-auto text-center py-15"><div class="w-10 h-10 border-3 border-gray-200 border-t-primary rounded-full animate-spin mx-auto" /></div>;

  return (
    <div class="max-w-2xl mx-auto">
      <h2 class="text-2xl font-bold tracking-tight mb-1.5">Verification Results</h2>
      <p class="text-sm text-gray-500 mb-7">Order {orderData.truv_order_id || ''} • {orderData.status || ''}</p>
      <OrderResults data={orderData} />
      <div class="flex gap-3 mt-6 pt-5 border-t border-gray-200">
        <button class="px-5 py-2.5 text-sm font-semibold bg-primary text-white rounded-lg hover:bg-primary-hover" onClick={onBack}>Back to Tasks</button>
      </div>
    </div>
  );
}

function TaskList({ tasks, taskOrders, taskStatus, onStart }) {
  return (
    <div class="space-y-3">
      {tasks.map(task => {
        const completed = taskStatus[task.id] === 'completed';
        const order = taskOrders[task.id];
        return (
          <div key={task.id} class="flex items-center gap-4 border border-border rounded-xl px-5 py-4 bg-white">
            <div class={`w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0 ${task.iconBg}`}>{task.icon}</div>
            <div class="flex-1">
              <div class="text-sm font-semibold mb-0.5">{task.name}</div>
              <div class="text-xs text-gray-500">{task.desc}</div>
            </div>
            {completed ? (
              <span class="text-xs font-semibold text-success bg-success-bg px-2 py-1 rounded uppercase">Completed</span>
            ) : order ? (
              <button class="px-3 py-1.5 text-xs font-medium bg-primary text-white rounded-lg hover:bg-primary-hover" onClick={() => onStart(task)}>Start</button>
            ) : (
              <span class="text-xs text-gray-400">Failed</span>
            )}
          </div>
        );
      })}
    </div>
  );
}
