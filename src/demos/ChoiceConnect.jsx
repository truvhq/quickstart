import { useState } from 'preact/hooks';
import { Layout, OrderResults, usePanel, API_BASE } from '@shared/ui/index.js';

const STEPS = [
  { title: 'Select product', guide: '<p>Choose the verification product type. The backend creates a user and generates a Bridge token:</p><pre>POST /v1/users/\nPOST /v1/users/{id}/tokens/</pre><p>Each product type unlocks different data (employment, income, deposit routing, etc.).</p>' },
  { title: 'Connect', guide: '<p>Bridge opens as a popup. The user selects their employer and logs in.</p><p>Sandbox credentials: <code>goodlogin</code> / <code>goodpassword</code></p><p>On success, Bridge returns a <code>public_token</code> that gets exchanged for an access token.</p>' },
  { title: 'Review', guide: '<p>The public token is exchanged for a link report:</p><pre>POST /v1/link-access-tokens/\nGET /v1/links/{link_id}/{product}/report</pre><p>The report contains the full verification data.</p>' },
];

const PRODUCTS = [
  { id: 'employment', name: 'Employment', desc: 'Verify job title, dates, status', icon: '💼' },
  { id: 'income', name: 'Income', desc: 'Verify income and pay history', icon: '💰' },
  { id: 'deposit_switch', name: 'Direct Deposit', desc: 'Switch direct deposit routing', icon: '🏦' },
  { id: 'pll', name: 'Paycheck-Linked Lending', desc: 'Payroll deduction setup', icon: '📊' },
];

export function ChoiceConnectDemo() {
  const [screen, setScreen] = useState('select');
  const [productType, setProductType] = useState('employment');
  const [bridgeToken, setBridgeToken] = useState(null);
  const [userId, setUserId] = useState(null);
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);

  const { panel, setCurrentStep, startPolling, addBridgeEvent, reset } = usePanel();

  async function getBridgeToken() {
    setLoading(true);
    try {
      const resp = await fetch(`${API_BASE}/api/bridge-token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product_type: productType }),
      });
      const data = await resp.json();
      if (!resp.ok) { alert('Error: ' + (data.error || 'Unknown')); setLoading(false); return; }

      setBridgeToken(data.bridge_token);
      setUserId(data.user_id);
      startPolling(data.user_id);
      setCurrentStep(1);
      setScreen('connect');
    } catch (e) { console.error(e); }
    setLoading(false);
  }

  async function onBridgeSuccess(publicToken) {
    setCurrentStep(2);
    setScreen('review');
    try {
      const resp = await fetch(`${API_BASE}/api/link-report/${encodeURIComponent(publicToken)}/${productType}?user_id=${userId}`);
      setReportData(await resp.json());
    } catch (e) { console.error(e); }
  }

  function resetDemo() {
    reset();
    setScreen('select');
    setProductType('employment');
    setBridgeToken(null);
    setUserId(null);
    setReportData(null);
  }

  return (
    <Layout title="Truv Quickstart" badge="Choice Connect" steps={STEPS} panel={panel}>
      <div class="max-w-lg mx-auto">
        {screen === 'select' && (
          <div>
            <h2 class="text-2xl font-bold tracking-tight mb-1.5">Select Product</h2>
            <p class="text-sm text-gray-500 mb-7">Choose the verification type to create a Bridge token.</p>
            <div class="grid grid-cols-2 gap-3 mb-6">
              {PRODUCTS.map(p => (
                <div
                  key={p.id}
                  onClick={() => setProductType(p.id)}
                  class={`border rounded-xl p-4 cursor-pointer text-center transition-all ${productType === p.id ? 'border-primary bg-primary-light' : 'border-gray-200 hover:border-primary'}`}
                >
                  <div class="text-2xl mb-2">{p.icon}</div>
                  <div class="text-sm font-semibold mb-0.5">{p.name}</div>
                  <div class="text-xs text-gray-500">{p.desc}</div>
                </div>
              ))}
            </div>
            <button onClick={getBridgeToken} disabled={loading} class="w-full py-3 bg-primary text-white font-semibold rounded-lg hover:bg-primary-hover disabled:opacity-40">
              {loading ? 'Creating...' : 'Get Bridge Token'}
            </button>
          </div>
        )}

        {screen === 'connect' && (
          <div class="text-center py-12">
            <h2 class="text-2xl font-bold tracking-tight mb-2">Connect Payroll</h2>
            <p class="text-sm text-gray-500 mb-8">Click below to open Bridge and connect your payroll account.</p>
            <button onClick={() => {
              if (!bridgeToken || !window.TruvBridge) return;
              window.TruvBridge.init({ bridgeToken, onSuccess: (token) => onBridgeSuccess(token) }).open();
            }} class="px-8 py-3 bg-primary text-white font-semibold rounded-lg hover:bg-primary-hover text-lg">
              Connect Payroll
            </button>
          </div>
        )}

        {screen === 'review' && (
          <div>
            <h2 class="text-2xl font-bold tracking-tight mb-1.5">Verification Report</h2>
            <p class="text-sm text-gray-500 mb-7">{productType} verification</p>
            {reportData ? (
              <div>
                <pre class="bg-gray-50 border border-gray-200 rounded-lg p-4 text-xs font-mono overflow-auto max-h-96 whitespace-pre-wrap">{JSON.stringify(reportData, null, 2)}</pre>
                <div class="flex gap-3 mt-6 pt-5 border-t border-gray-200">
                  <button class="px-5 py-2.5 text-sm font-semibold border border-gray-200 rounded-lg hover:border-primary hover:text-primary" onClick={resetDemo}>Start Over</button>
                </div>
              </div>
            ) : (
              <div class="text-center py-10"><div class="w-10 h-10 border-3 border-gray-200 border-t-primary rounded-full animate-spin mx-auto" /></div>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}
