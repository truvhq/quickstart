import * as db from './db.js';

const REDACTED_KEYS = new Set(['ssn', 'email', 'phone', 'date_of_birth', 'social_security_number']);

// SSE subscribers: Map<orderId, Set<callback>>
const subscribers = new Map();

export function redactSensitive(body) {
  if (Array.isArray(body)) return body.map(redactSensitive);
  if (body && typeof body === 'object') {
    const out = {};
    for (const [key, val] of Object.entries(body)) {
      if (REDACTED_KEYS.has(key) && typeof val === 'string') {
        out[key] = val.length > 4 ? '***' + val.slice(-4) : '***';
      } else {
        out[key] = redactSensitive(val);
      }
    }
    return out;
  }
  return body;
}

export function logApiCall({ orderId, method, endpoint, requestBody, responseBody, statusCode, durationMs }) {
  const redactedRequest = requestBody ? JSON.stringify(redactSensitive(requestBody)) : null;
  const responseStr = responseBody ? JSON.stringify(responseBody) : null;

  const logEntry = db.insertApiLog({
    orderId,
    method,
    endpoint,
    requestBody: redactedRequest,
    responseBody: responseStr,
    statusCode,
    durationMs,
  });

  publish(orderId, 'api_call', {
    id: logEntry.id,
    method,
    endpoint,
    request_body: redactedRequest,
    response_body: responseStr,
    status_code: statusCode,
    duration_ms: durationMs,
    timestamp: logEntry.timestamp,
  });

  return logEntry;
}

export function pushWebhookEvent({ orderId, webhookId, eventType, status, payload }) {
  const event = db.insertWebhookEvent({ orderId, webhookId, eventType, status, payload });

  publish(orderId, 'webhook', {
    id: event.id,
    webhook_id: webhookId,
    event_type: eventType,
    status,
    payload,
    received_at: event.received_at,
  });

  return event;
}

export function subscribe(orderId, callback) {
  if (!subscribers.has(orderId)) subscribers.set(orderId, new Set());
  subscribers.get(orderId).add(callback);
}

export function unsubscribe(orderId, callback) {
  const subs = subscribers.get(orderId);
  if (subs) {
    subs.delete(callback);
    if (subs.size === 0) subscribers.delete(orderId);
  }
}

function publish(orderId, eventType, data) {
  // Publish to order-specific subscribers
  if (orderId) {
    const subs = subscribers.get(orderId);
    if (subs) for (const cb of subs) { try { cb({ event: eventType, data }); } catch { /* ignore */ } }
  }
  // Publish to global subscribers (for unfiltered webhook feeds)
  const globalSubs = subscribers.get('*');
  if (globalSubs) for (const cb of globalSubs) { try { cb({ event: eventType, data }); } catch { /* ignore */ } }
}
