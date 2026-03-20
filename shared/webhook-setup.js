let webhookId = null;

const envType = process.env.TRUV_ENV_TYPE || 'sandbox';

async function registerWebhook(truvClient, webhookUrl) {
  // Clean up old quickstart webhooks
  const listResult = await truvClient._request('GET', 'webhooks/');
  if (listResult.statusCode === 200 && listResult.data.results) {
    for (const wh of listResult.data.results) {
      if (wh.name === 'quickstart' && wh.env_type === envType) {
        await truvClient._request('DELETE', `webhooks/${wh.id}/`);
        console.log(`Deleted old quickstart webhook ${wh.id}`);
      }
    }
  }

  const createResult = await truvClient._request('POST', 'webhooks/', {
    json: {
      name: 'quickstart',
      webhook_url: webhookUrl,
      env_type: envType,
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

export async function setupWebhook({ path, truvClient }) {
  const ngrokUrl = process.env.NGROK_URL;
  if (!ngrokUrl) {
    console.log('NGROK_URL not set — skipping webhook registration. Set it in .env to receive webhooks.');
    return null;
  }

  const webhookUrl = ngrokUrl + path;
  await registerWebhook(truvClient, webhookUrl);
  return ngrokUrl;
}

export async function teardownWebhook(truvClient) {
  if (webhookId) {
    try {
      await truvClient._request('DELETE', `webhooks/${webhookId}/`);
      console.log(`Webhook ${webhookId} deleted`);
    } catch { /* ignore */ }
  }
}
