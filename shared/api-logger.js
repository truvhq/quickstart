import * as db from './db.js';

const REDACTED_KEYS = new Set(['ssn', 'email', 'phone', 'date_of_birth', 'social_security_number']);

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

export function logApiCall({ userId, method, endpoint, requestBody, responseBody, statusCode, durationMs }) {
  const redactedRequest = requestBody ? JSON.stringify(redactSensitive(requestBody)) : null;
  const responseStr = responseBody ? JSON.stringify(responseBody) : null;

  return db.insertApiLog({
    userId,
    method,
    endpoint,
    requestBody: redactedRequest,
    responseBody: responseStr,
    statusCode,
    durationMs,
  });
}

export function pushWebhookEvent({ userId, webhookId, eventType, status, payload }) {
  return db.insertWebhookEvent({ userId, webhookId, eventType, status, payload });
}
