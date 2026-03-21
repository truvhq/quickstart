import { Panel } from './Panel.jsx';

export function Layout({ title, badge, steps, panel, flush, children }) {
  return (
    <div class="h-screen flex flex-col">
      <header class="flex items-center justify-between h-14 px-5 bg-white border-b border-border">
        <div class="flex items-center gap-3">
          <div class="w-5 h-5 bg-primary rounded-full" />
          <div class="text-base font-semibold">{title || 'Truv Quickstart'}</div>
          {badge && <div class="text-xs text-gray-500 bg-gray-100 px-2.5 py-1 rounded-xl">{badge}</div>}
        </div>
      </header>
      <div class="flex flex-1 min-h-0">
        <main class={`flex-1 min-w-0 ${flush ? 'flex flex-col' : 'overflow-y-auto px-8 py-10'}`}>
          {children}
        </main>
        <Panel steps={steps} panel={panel} />
      </div>
    </div>
  );
}
