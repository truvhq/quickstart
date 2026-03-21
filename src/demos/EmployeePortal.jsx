import { useState, useEffect } from 'preact/hooks';
import { Layout, OrderResults, usePanel, API_BASE } from '@shared/ui/index.js';

const STEPS = [
  { title: 'Dashboard', guide: '<p>View all verification orders across demos. Click any order to inspect details.</p><p><code>GET /api/orders</code> returns all orders from the shared database.</p>' },
  { title: 'Create order', guide: '<p>Create a new verification order with applicant details:</p><pre>POST /v1/orders/\n{\n  "first_name": "...",\n  "products": ["income"]\n}</pre>' },
  { title: 'Order details', guide: '<p>Fetch order results and reports:</p><pre>GET /v1/orders/{order_id}/</pre><p>Share the order URL with applicants for self-service verification.</p>' },
];

export function EmployeePortalDemo() {
  const [screen, setScreen] = useState('dashboard');
  const [orders, setOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [orderData, setOrderData] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const { panel, setCurrentStep, startPolling, reset } = usePanel();

  useEffect(() => { fetchOrders(); }, []);

  async function fetchOrders() {
    try {
      const resp = await fetch(`${API_BASE}/api/orders`);
      setOrders(await resp.json());
    } catch (e) { console.error(e); }
  }

  async function createOrder(formData) {
    setSubmitting(true);
    try {
      const resp = await fetch(`${API_BASE}/api/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, demo_id: 'employee-portal' }),
      });
      const data = await resp.json();
      if (!resp.ok) { alert('Error: ' + (data.error || 'Unknown')); setSubmitting(false); return; }

      if (data.user_id) startPolling(data.user_id);
      await fetchOrders();
      setSubmitting(false);
      viewOrder(data.order_id);
    } catch (e) { console.error(e); setSubmitting(false); }
  }

  async function viewOrder(orderId) {
    setCurrentStep(2);
    setScreen('detail');
    try {
      const resp = await fetch(`${API_BASE}/api/orders/${encodeURIComponent(orderId)}`);
      const data = await resp.json();
      setSelectedOrder(orderId);
      setOrderData(data);
      if (data.raw_response?.user_id) startPolling(data.raw_response.user_id);
    } catch (e) { console.error(e); }
  }

  function goBack() {
    reset();
    setScreen('dashboard');
    setSelectedOrder(null);
    setOrderData(null);
    setCurrentStep(0);
    fetchOrders();
  }

  return (
    <Layout title="Truv Quickstart" badge="Employee Portal" steps={STEPS} panel={panel}>
      <div class="max-w-3xl mx-auto">
        {screen === 'dashboard' && (
          <div>
            <div class="flex items-center justify-between mb-6">
              <h2 class="text-2xl font-bold tracking-tight">Orders</h2>
              <button onClick={() => { setCurrentStep(1); setScreen('create'); }} class="px-4 py-2 text-sm font-semibold bg-primary text-white rounded-lg hover:bg-primary-hover">Create Order</button>
            </div>
            {orders.length === 0 ? (
              <p class="text-sm text-gray-400 text-center py-12">No orders yet. Create one to get started.</p>
            ) : (
              <table class="w-full">
                <thead>
                  <tr class="border-b border-gray-200">
                    {['Order ID', 'Source', 'Status', 'Created'].map(h => <th key={h} class="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide px-3 py-2">{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {orders.map(o => (
                    <tr key={o.order_id} class="border-b border-gray-100 hover:bg-gray-50 cursor-pointer" onClick={() => viewOrder(o.order_id)}>
                      <td class="px-3 py-2.5 text-sm font-mono">{o.order_id}</td>
                      <td class="px-3 py-2.5 text-sm text-gray-500">{o.demo_id || '-'}</td>
                      <td class="px-3 py-2.5"><span class={`text-xs font-semibold px-2 py-0.5 rounded ${o.status === 'completed' ? 'text-success bg-success-bg' : 'text-warning bg-warning-bg'}`}>{o.status}</span></td>
                      <td class="px-3 py-2.5 text-sm text-gray-400">{o.created_at ? new Date(o.created_at).toLocaleString() : ''}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {screen === 'create' && (
          <div>
            <div class="text-sm cursor-pointer text-gray-500 hover:text-primary mb-4" onClick={goBack}>← Back to orders</div>
            <h2 class="text-2xl font-bold tracking-tight mb-1.5">Create Order</h2>
            <p class="text-sm text-gray-500 mb-7">Enter applicant details to create a verification order.</p>
            <CreateForm onSubmit={createOrder} submitting={submitting} />
          </div>
        )}

        {screen === 'detail' && (
          <div>
            <div class="text-sm cursor-pointer text-gray-500 hover:text-primary mb-4" onClick={goBack}>← Back to orders</div>
            {orderData ? (
              <div>
                <h2 class="text-2xl font-bold tracking-tight mb-1.5">Order Details</h2>
                <p class="text-sm text-gray-500 mb-7">Order {orderData.truv_order_id || selectedOrder} • {orderData.status || ''}</p>
                {orderData.share_url && (
                  <div class="flex items-center gap-2 mb-6 p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <span class="text-xs text-gray-500 shrink-0">Share URL:</span>
                    <input readOnly value={orderData.share_url} class="flex-1 text-xs font-mono bg-transparent border-none outline-none text-gray-700" />
                    <button onClick={() => navigator.clipboard.writeText(orderData.share_url)} class="text-xs text-primary font-medium shrink-0">Copy</button>
                  </div>
                )}
                <OrderResults data={orderData} />
              </div>
            ) : (
              <div class="text-center py-15"><div class="w-10 h-10 border-3 border-gray-200 border-t-primary rounded-full animate-spin mx-auto" /></div>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}

function CreateForm({ onSubmit, submitting }) {
  const handleSubmit = (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    onSubmit({
      first_name: fd.get('first_name') || undefined,
      last_name: fd.get('last_name') || undefined,
      email: fd.get('email') || undefined,
      phone: fd.get('phone') || undefined,
      ssn: fd.get('ssn') || undefined,
      product_type: fd.get('product_type'),
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      <div class="grid grid-cols-2 gap-4 mb-4">
        <div><label class="text-sm font-medium mb-1.5 block">First name</label><input name="first_name" placeholder="John" class="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm focus:border-primary focus:outline-none" /></div>
        <div><label class="text-sm font-medium mb-1.5 block">Last name</label><input name="last_name" placeholder="Doe" class="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm focus:border-primary focus:outline-none" /></div>
      </div>
      <div class="mb-4"><label class="text-sm font-medium mb-1.5 block">Email</label><input name="email" type="email" placeholder="john@example.com" class="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm focus:border-primary focus:outline-none" /></div>
      <div class="grid grid-cols-2 gap-4 mb-4">
        <div><label class="text-sm font-medium mb-1.5 block">Phone</label><input name="phone" type="tel" placeholder="123456789" class="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm focus:border-primary focus:outline-none" /></div>
        <div><label class="text-sm font-medium mb-1.5 block">SSN (last 4)</label><input name="ssn" placeholder="6789" class="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm focus:border-primary focus:outline-none" /></div>
      </div>
      <div class="mb-6">
        <label class="text-sm font-medium mb-1.5 block">Product</label>
        <select name="product_type" class="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm bg-white focus:border-primary focus:outline-none">
          <option value="income">Income</option>
          <option value="employment">Employment</option>
          <option value="assets">Assets</option>
        </select>
      </div>
      <button type="submit" disabled={submitting} class="w-full py-3 bg-primary text-white font-semibold rounded-lg hover:bg-primary-hover disabled:opacity-40">
        {submitting ? 'Creating...' : 'Create Order'}
      </button>
    </form>
  );
}
