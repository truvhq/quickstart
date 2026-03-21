const DEMOS = [
  { id: 'application', name: 'Application', desc: 'Full order flow: collect PII, open Bridge, wait for webhooks, view results.', icon: '📋' },
  { id: 'follow-up', name: 'Follow-up', desc: 'Multi-task verification: income, employment, assets, identity.', icon: '✅' },
  { id: 'choice-connect', name: 'Choice Connect', desc: 'Select a product, connect via Bridge popup, view report.', icon: '🔗' },
  { id: 'employee-portal', name: 'Employee Portal', desc: 'Admin dashboard: create orders, view statuses, inspect results.', icon: '🏢' },
  { id: 'upload-documents', name: 'Upload Documents', desc: 'Drag-and-drop documents, validate, extract structured data.', icon: '📄' },
];

export function Home() {
  return (
    <div class="min-h-screen bg-gray-50 flex flex-col">
      <header class="flex items-center h-14 px-5 bg-white border-b border-gray-200">
        <div class="flex items-center gap-3">
          <div class="w-5 h-5 bg-primary rounded-full" />
          <div class="text-base font-semibold">Truv Quickstart</div>
        </div>
      </header>
      <main class="flex-1 flex items-start justify-center pt-16 px-6">
        <div class="max-w-2xl w-full">
          <h1 class="text-3xl font-bold tracking-tight mb-2">Choose a Demo</h1>
          <p class="text-sm text-gray-500 mb-8">Each demo shows a different Truv API integration pattern. Pick one to explore.</p>
          <div class="grid gap-3">
            {DEMOS.map(d => (
              <a key={d.id} href={`#${d.id}`} class="flex items-center gap-4 border border-gray-200 rounded-xl px-5 py-4 bg-white hover:border-primary hover:shadow-sm transition-all">
                <div class="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center text-lg shrink-0">{d.icon}</div>
                <div class="flex-1">
                  <div class="text-sm font-semibold mb-0.5">{d.name}</div>
                  <div class="text-xs text-gray-500">{d.desc}</div>
                </div>
                <div class="text-gray-300 text-lg">→</div>
              </a>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
