import { useState, useRef, useCallback, useEffect } from 'preact/hooks';
import { Layout, OrderResults, WaitingScreen, usePanel, API_BASE } from '@shared/ui/index.js';

const STEPS = [
  {
    title: 'Select a task',
    guide: '<p>Choose a verification task from the list. Each task creates a separate order via your backend:</p>'
      + '<pre>POST /v1/orders/\n{\n  "products": ["income"],\n  "template_id": "..."\n}</pre>'
      + '<p>The response contains a <code>bridge_token</code> to open Bridge and an order <code>id</code> for tracking.</p>'
      + '<h5>Follow-up flow</h5><ul>'
      + '<li>Each task maps to a different <code>product_type</code> (employment, income, assets)</li>'
      + '<li>Tasks are independent — complete them in any order</li>'
      + '<li>The Bridge widget handles the full verification inline</li></ul>'
      + '<p><a href="https://docs.truv.com/reference/create-an-order" target="_blank">API Reference →</a></p>',
  },
  {
    title: 'Bridge verification',
    guide: '<p>The Bridge widget is initialized with:</p>'
      + '<pre>TruvBridge.init({\n  bridgeToken: "...",\n  isOrder: true,\n  position: { type: "inline", container: el }\n})</pre>'
      + '<p>Bridge fires events as the user progresses:</p><ul>'
      + '<li><code>onLoad</code> — widget ready</li>'
      + '<li><code>onEvent(LOAD, OPEN, LINK_CREATED, ...)</code> — user actions</li>'
      + '<li><code>onSuccess</code> — single task completed, advance to webhooks</li>'
      + '<li><code>onClose</code> — user dismissed the widget</li></ul>'
      + '<p>Sandbox credentials: <code>goodlogin</code> / <code>goodpassword</code></p>'
      + '<p><a href="https://docs.truv.com/docs/bridge-overview" target="_blank">Bridge Docs →</a></p>',
  },
  {
    title: 'Webhook processing',
    guide: '<p>Truv sends webhooks to your registered URL as the verification progresses. Events arrive in this order:</p><ol>'
      + '<li><code>task-status-updated</code> — login → parse → done</li>'
      + '<li><code>link-connected</code> — payroll link established</li>'
      + '<li><code>profile-created</code>, <code>employment-created</code>, <code>income-created</code></li>'
      + '<li><code>order-status-updated</code> (status: completed) — all done</li></ol>'
      + '<p>All webhooks include <code>user_id</code> for matching. Verify the <code>X-Webhook-Sign</code> header with HMAC-SHA256.</p>'
      + '<pre>const sig = crypto\n  .createHmac(\'sha256\', API_SECRET)\n  .update(rawBody)\n  .digest(\'hex\');</pre>'
      + '<p><a href="https://docs.truv.com/docs/webhooks" target="_blank">Webhooks Docs →</a></p>',
  },
  {
    title: 'Retrieve results',
    guide: '<p>Once the task completes, fetch the full results:</p>'
      + '<pre>GET /v1/orders/{order_id}/</pre>'
      + '<p>The response includes nested <code>employers[]</code> with:</p><ul>'
      + '<li><strong>Profile</strong> — name, SSN, DOB, address</li>'
      + '<li><strong>Employment</strong> — title, start date, income</li>'
      + '<li><strong>Pay Statements</strong> — gross/net pay, earnings, deductions</li>'
      + '<li><strong>Bank Accounts</strong> — direct deposit routing info</li></ul>'
      + '<p>After reviewing results, return to the task list to complete remaining verifications.</p>'
      + '<p><a href="https://docs.truv.com/reference/get-an-order" target="_blank">API Reference →</a></p>',
  },
];

const TASKS = [
  { id: 'documents', name: 'Upload Documents', desc: 'Verify employment documents', product: 'employment', icon: '📄', iconBg: 'bg-blue-100' },
  { id: 'income', name: 'Verify Income', desc: 'Confirm income and pay history', product: 'income', icon: '💰', iconBg: 'bg-green-100' },
  { id: 'assets', name: 'Verify Assets', desc: 'Confirm asset accounts', product: 'assets', icon: '🏦', iconBg: 'bg-amber-100' },
  { id: 'identity', name: 'Verify Identity', desc: 'Confirm identity via employer records', product: 'employment', icon: '🔐', iconBg: 'bg-blue-100' },
];

const WAITING_MIN_MS = 10000;

export function App() {
  const [screen, setScreen] = useState('tasks');
  const [activeTask, setActiveTask] = useState(null);
  const [taskStatus, setTaskStatus] = useState({});
  const [orderId, setOrderId] = useState(null);
  const [userId, setUserId] = useState(null);
  const [bridgeToken, setBridgeToken] = useState(null);
  const [orderData, setOrderData] = useState(null);

  const bridgeRef = useRef(null);
  const waitingStartRef = useRef(null);
  const advancePendingRef = useRef(false);
  const bridgeContainerRef = useRef(null);

  const { panel, setCurrentStep, startPolling, addBridgeEvent, reset } = usePanel();

  // Auto-advance from waiting when order completes
  useEffect(() => {
    if (screen !== 'waiting') return;
    if (advancePendingRef.current) return;

    const isCompleted = panel.webhooks.some(w => {
      const p = typeof w.payload === 'string' ? JSON.parse(w.payload) : (w.payload || {});
      return (p.event_type === 'order-status-updated' && p.status === 'completed')
        || (w.event_type === 'order-status-updated' && w.status === 'completed');
    });

    if (isCompleted) {
      advancePendingRef.current = true;
      const elapsed = Date.now() - (waitingStartRef.current || 0);
      const delay = Math.max(1000, WAITING_MIN_MS - elapsed + 1000);
      setTimeout(() => goResults(), delay);
    }
  }, [panel.webhooks, screen]);

  // Init bridge when entering bridge screen
  useEffect(() => {
    if (screen !== 'bridge' || !bridgeToken || !bridgeContainerRef.current) return;

    const timer = setTimeout(() => {
      if (!window.TruvBridge) return;
      bridgeRef.current = window.TruvBridge.init({
        bridgeToken,
        isOrder: true,
        position: { type: 'inline', container: bridgeContainerRef.current },
        onLoad: () => addBridgeEvent('onLoad', null),
        onEvent: (eventType, payload, source) => addBridgeEvent('onEvent', { eventType, source }),
        onSuccess: () => {
          addBridgeEvent('onSuccess', null);
          setTaskStatus(prev => ({ ...prev, [activeTask.id]: 'completed' }));
          setTimeout(() => goWaiting(), 1500);
        },
        onClose: () => addBridgeEvent('onClose', null),
      });
      if (bridgeRef.current) bridgeRef.current.open();
    }, 100);

    return () => clearTimeout(timer);
  }, [screen, bridgeToken]);

  async function startTask(task) {
    setActiveTask(task);
    try {
      const resp = await fetch(`${API_BASE}/api/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product_type: task.product }),
      });
      const data = await resp.json();
      if (!resp.ok) { alert('Error: ' + (data.error || 'Unknown')); return; }

      setOrderId(data.order_id);
      setUserId(data.user_id);
      setBridgeToken(data.bridge_token);
      setOrderData(null);
      startPolling(data.user_id);
      setCurrentStep(1);
      setScreen('bridge');
    } catch (e) { console.error(e); }
  }

  function goWaiting() {
    bridgeRef.current = null;
    waitingStartRef.current = Date.now();
    advancePendingRef.current = false;
    setCurrentStep(2);
    setScreen('waiting');
  }

  async function goResults() {
    waitingStartRef.current = null;
    advancePendingRef.current = false;
    setCurrentStep(3);
    setScreen('results');

    if (!orderId) return;
    try {
      const resp = await fetch(`${API_BASE}/api/orders/${encodeURIComponent(orderId)}`);
      const data = await resp.json();
      setOrderData(data);
      await fetchLogs(orderId);
    } catch (e) { console.error(e); }
  }

  function returnToTasks() {
    bridgeRef.current = null;
    advancePendingRef.current = false;
    waitingStartRef.current = null;
    setScreen('tasks');
    setActiveTask(null);
    setOrderId(null);
    setUserId(null);
    setBridgeToken(null);
    setOrderData(null);
    reset();
  }

  const isBridge = screen === 'bridge';

  return (
    <Layout title="Truv Quickstart" badge="Follow-up" steps={STEPS} panel={panel} flush={isBridge}>
      {isBridge ? (
        <BridgeScreen task={activeTask} containerRef={bridgeContainerRef} onBack={returnToTasks} />
      ) : (
        <div class="max-w-2xl mx-auto">
          {screen === 'tasks' && <TaskList tasks={TASKS} taskStatus={taskStatus} onStart={startTask} />}
          {screen === 'waiting' && <WaitingScreen webhooks={panel.webhooks} />}
          {screen === 'results' && <ResultsScreen task={activeTask} orderData={orderData} onBack={returnToTasks} />}
        </div>
      )}
    </Layout>
  );
}

function TaskList({ tasks, taskStatus, onStart }) {
  return (
    <div>
      <h2 class="text-2xl font-bold tracking-tight mb-1.5">Complete Your Application</h2>
      <p class="text-sm text-gray-500 leading-relaxed mb-7">
        You have pending tasks to finish your application. Complete each verification step below.
      </p>
      {tasks.map(task => {
        const completed = taskStatus[task.id] === 'completed';
        return (
          <div key={task.id} class="flex items-center gap-4 border border-border rounded-xl px-5 py-4 mb-3 bg-white">
            <div class={`w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0 ${task.iconBg}`}>{task.icon}</div>
            <div class="flex-1">
              <div class="text-sm font-semibold mb-0.5">{task.name}</div>
              <div class="text-xs text-gray-500">{task.desc}</div>
            </div>
            {completed ? (
              <span class="text-xs font-semibold text-success bg-success-bg px-2 py-1 rounded uppercase">Completed</span>
            ) : (
              <button class="px-3 py-1.5 text-xs font-medium bg-primary text-white rounded-lg hover:bg-primary-hover" onClick={() => onStart(task)}>Start</button>
            )}
          </div>
        );
      })}
    </div>
  );
}

function BridgeScreen({ task, containerRef, onBack }) {
  return (
    <div class="w-full h-full flex flex-col">
      <div class="px-6 py-3.5 bg-white border-b border-border flex items-center gap-3">
        <div class="text-sm cursor-pointer text-gray-500 hover:text-primary" onClick={onBack}>← Back to tasks</div>
      </div>
      <div ref={containerRef} class="flex-1 overflow-hidden bg-white [&_iframe]:w-full [&_iframe]:!h-full [&_iframe]:border-none" style="zoom: 0.85;" />
    </div>
  );
}

function ResultsScreen({ task, orderData, onBack }) {
  if (!orderData) {
    return (
      <div class="text-center py-15">
        <div class="w-10 h-10 border-3 border-border border-t-primary rounded-full animate-spin mx-auto mb-3" />
      </div>
    );
  }

  const raw = orderData.raw_response || {};
  return (
    <div>
      <h2 class="text-2xl font-bold tracking-tight mb-1.5">Verification Results</h2>
      <p class="text-sm text-gray-500 leading-relaxed mb-7">
        {task?.name || 'Task'} • Order {orderData.truv_order_id || ''} • {orderData.status || ''}
      </p>

      <OrderResults data={orderData} />

      <div class="flex gap-3 mt-6 pt-5 border-t border-border">
        <button class="px-5 py-2.5 text-sm font-semibold bg-primary text-white rounded-lg hover:bg-primary-hover" onClick={onBack}>
          Back to Tasks
        </button>
      </div>
    </div>
  );
}
