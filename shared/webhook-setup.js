import { spawn } from 'child_process';

let tunnelProcess = null;
let webhookId = null;
let config = null;

function startCloudflared(port) {
  return new Promise((resolve, reject) => {
    const proc = spawn('cloudflared', ['tunnel', '--url', `http://localhost:${port}`], {
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let resolved = false;
    const timeout = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        reject(new Error('cloudflared timed out waiting for tunnel URL'));
      }
    }, 15000);

    // cloudflared prints the tunnel URL to stderr
    proc.stderr.on('data', (chunk) => {
      const text = chunk.toString();
      const match = text.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/);
      if (match && !resolved) {
        resolved = true;
        clearTimeout(timeout);
        resolve({ url: match[0], process: proc });
      }
    });

    proc.on('error', (err) => {
      if (!resolved) {
        resolved = true;
        clearTimeout(timeout);
        reject(err);
      }
    });

    proc.on('exit', (code) => {
      if (!resolved) {
        resolved = true;
        clearTimeout(timeout);
        reject(new Error(`cloudflared exited with code ${code}`));
      }
    });
  });
}

async function registerWebhook(truvClient, webhookUrl) {
  // Clean up old quickstart tunnels (localtunnel and cloudflare)
  const listResult = await truvClient._request('GET', 'webhooks/');
  if (listResult.statusCode === 200 && listResult.data.results) {
    for (const wh of listResult.data.results) {
      if (wh.name === 'quickstart' && wh.env_type === 'sandbox' && wh.webhook_url &&
          (wh.webhook_url.includes('loca.lt') || wh.webhook_url.includes('trycloudflare.com'))) {
        await truvClient._request('DELETE', `webhooks/${wh.id}/`);
        console.log(`Deleted old quickstart webhook ${wh.id}`);
      }
    }
  }

  const createResult = await truvClient._request('POST', 'webhooks/', {
    json: {
      name: 'quickstart',
      webhook_url: webhookUrl,
      env_type: 'sandbox',
      events: [
        'task-status-updated',
        'order-status-updated',
        'order-created',
        'order-refresh-failed',
        'link-connected',
        'link-disconnected',
        'link-deleted',
        'employment-created',
        'employment-updated',
        'profile-created',
        'profile-updated',
        'statements-created',
        'statements-updated',
        'shifts-created',
        'shifts-updated',
        'bank-accounts-created',
        'bank-accounts-updated',
      ],
    },
  });

  if (createResult.statusCode === 201) {
    webhookId = createResult.data.id;
    console.log(`Webhook registered: ${webhookUrl} (id: ${webhookId})`);
  } else {
    console.error('Failed to register webhook:', createResult.data);
  }
}

export async function setupWebhook({ port, path, truvClient }) {
  config = { port, path, truvClient };

  const { url, process: proc } = await startCloudflared(port);
  tunnelProcess = proc;
  const webhookUrl = url + path;
  console.log(`Cloudflare tunnel open: ${url} -> localhost:${port}`);

  await registerWebhook(truvClient, webhookUrl);
  return url;
}

export async function teardownWebhook(truvClient) {
  config = null;
  if (webhookId) {
    try {
      await truvClient._request('DELETE', `webhooks/${webhookId}/`);
      console.log(`Webhook ${webhookId} deleted`);
    } catch { /* ignore */ }
  }
  if (tunnelProcess) {
    tunnelProcess.kill();
    tunnelProcess = null;
  }
}
