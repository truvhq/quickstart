import { useState, useEffect, useRef, useCallback } from 'preact/hooks';

const API_BASE = window.location.origin;
export { API_BASE };

export function usePanel() {
  const [apiLogs, setApiLogs] = useState([]);
  const [bridgeEvents, setBridgeEvents] = useState([]);
  const [webhooks, setWebhooks] = useState([]);
  const [tunnelUrl, setTunnelUrl] = useState(null);
  const [currentStep, setCurrentStep] = useState(0);

  const userIdRef = useRef(null);
  const pollingRef = useRef(null);

  // Fetch tunnel URL on mount
  useEffect(() => {
    fetch(`${API_BASE}/api/tunnel-url`).then(r => r.json()).then(d => { if (d?.url) setTunnelUrl(d.url); }).catch(() => {});
  }, []);

  // Start polling logs and webhooks by user_id every 3s
  const startPolling = useCallback((userId) => {
    userIdRef.current = userId;
    if (pollingRef.current) clearInterval(pollingRef.current);

    const poll = async () => {
      const uid = userIdRef.current;
      if (!uid) return;
      try {
        const [logs, whs] = await Promise.all([
          fetch(`${API_BASE}/api/users/${uid}/logs`).then(r => r.json()),
          fetch(`${API_BASE}/api/users/${uid}/webhooks`).then(r => r.json()),
        ]);
        setApiLogs(logs || []);
        setWebhooks(whs || []);
      } catch {}
    };

    poll();
    pollingRef.current = setInterval(poll, 3000);
  }, []);

  const stopPolling = useCallback(() => {
    userIdRef.current = null;
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }, []);

  const addBridgeEvent = useCallback((type, data) => {
    setBridgeEvents(prev => [...prev, { type, data, timestamp: Date.now() }]);
  }, []);

  const reset = useCallback(() => {
    stopPolling();
    setApiLogs([]);
    setBridgeEvents([]);
    setWebhooks([]);
    setCurrentStep(0);
  }, []);

  useEffect(() => () => stopPolling(), []);

  return {
    panel: { apiLogs, bridgeEvents, webhooks, tunnelUrl, currentStep },
    setCurrentStep,
    startPolling,
    stopPolling,
    addBridgeEvent,
    reset,
  };
}
