import * as apiLogger from './api-logger.js';

export function createSseHandler() {
  return (req, res) => {
    const orderId = req.query.order_id || '*';

    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    });

    const callback = (msg) => {
      const eventType = msg.event || 'message';
      const data = JSON.stringify(msg.data || {});
      res.write(`event: ${eventType}\ndata: ${data}\n\n`);
    };

    apiLogger.subscribe(orderId, callback);

    const keepalive = setInterval(() => {
      res.write(`event: ping\ndata: {}\n\n`);
    }, 30000);

    req.on('close', () => {
      clearInterval(keepalive);
      apiLogger.unsubscribe(orderId, callback);
    });
  };
}
