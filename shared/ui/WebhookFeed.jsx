export function WebhookFeed({ webhooks }) {
  if (!webhooks.length) {
    return <div class="text-center text-sm text-gray-400">No webhooks received yet...</div>;
  }

  const reversed = [...webhooks].reverse();

  return (
    <div class="text-left w-full max-w-md">
      {reversed.map((w, i) => {
        const payload = typeof w.payload === 'string' ? JSON.parse(w.payload) : (w.payload || {});
        const eventType = payload.event_type || w.event_type || 'unknown';
        const status = payload.status || w.status || '';
        const ts = payload.event_created_at || payload.updated_at || w.received_at || '';
        const timeStr = ts ? new Date(ts).toLocaleTimeString() : '';
        const dotColor = status === 'completed' || status === 'done' ? 'bg-success'
          : status === 'pending' ? 'bg-warning'
          : 'bg-blue-500';

        return (
          <div key={i} class="flex items-center gap-2.5 px-3.5 py-2.5 bg-gray-100 rounded-lg mb-2 text-sm animate-fadeIn">
            <div class={`w-1.5 h-1.5 rounded-full shrink-0 ${dotColor}`} />
            <span class="flex-1 font-medium">{eventType.replace(/-/g, ' ')}</span>
            <span class="text-xs text-gray-400">{timeStr}</span>
          </div>
        );
      })}
    </div>
  );
}

export function WaitingScreen({ webhooks }) {
  return (
    <div class="flex flex-col items-center justify-center min-h-[60vh] text-center">
      <div class="w-18 h-18 mb-7">
        <div class="w-18 h-18 border-3 border-border border-t-primary rounded-full animate-spin" />
      </div>
      <h2 class="text-2xl font-bold tracking-tight mb-2">Waiting for webhooks</h2>
      <p class="text-sm text-gray-500 leading-relaxed max-w-sm mb-9">
        Truv sends webhook events as the verification progresses. Watch them arrive in real time.
      </p>
      <WebhookFeed webhooks={webhooks} />
    </div>
  );
}
