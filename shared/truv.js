import fetch from 'node-fetch';
import { v4 as uuidv4 } from 'uuid';

export class TruvClient {
  constructor({ clientId, secret, apiUrl = 'https://prod.truv.com/v1/' }) {
    this.clientId = clientId;
    this.secret = secret;
    this.apiUrl = apiUrl;
    this.headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'X-Access-Client-Id': clientId,
      'X-Access-Secret': secret,
    };
  }

  async _request(method, endpoint, { json } = {}) {
    const url = this.apiUrl + endpoint;
    const start = performance.now();

    const opts = { method, headers: this.headers };
    if (json) opts.body = JSON.stringify(json);

    const response = await fetch(url, opts);
    const durationMs = Math.round((performance.now() - start) * 10) / 10;

    let data;
    const text = await response.text();
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      data = { raw: text };
    }

    console.log(`TRUV: ${method.toUpperCase()} ${url} — ${response.status} (${durationMs}ms)`);
    return { statusCode: response.status, data, durationMs };
  }

  // --- Users API ---

  async createUser(overrides = {}) {
    const payload = {
      external_user_id: `qs-${uuidv4()}`,
      first_name: 'John',
      last_name: 'Johnson',
      email: 'j.johnson@example.com',
      ...overrides,
    };
    return this._request('POST', 'users/', { json: payload });
  }

  async createUserBridgeToken(userId, productType) {
    const payload = {
      product_type: productType,
      client_name: 'Truv Quickstart',
      tracking_info: '1338-0111-A',
    };

    if (productType === 'deposit_switch' || productType === 'pll') {
      payload.account = {
        account_number: '16002600',
        account_type: 'checking',
        routing_number: '12345678',
        bank_name: 'Truv Bank',
      };
      if (productType === 'pll') {
        payload.account.deposit_type = 'amount';
        payload.account.deposit_value = '100';
      }
    }

    return this._request('POST', `users/${userId}/tokens/`, { json: payload });
  }

  // --- Orders API ---

  async createOrder(params = {}) {
    const productType = params.product_type || 'income';
    const payload = {
      order_number: `qs-${uuidv4()}`,
      first_name: params.first_name || 'John',
      last_name: params.last_name || 'Johnson',
      email: params.email || 'j.johnson@example.com',
      products: [productType],
    };

    if (params.phone) payload.phone = params.phone;
    if (params.ssn) payload.social_security_number = params.ssn;

    if (['deposit_switch', 'pll', 'employment', 'income', 'assets'].includes(productType)) {
      payload.employers = [{ company_name: 'Home Depot' }];
    }

    if (['deposit_switch', 'pll'].includes(productType)) {
      payload.employers[0].account = {
        account_number: '16002600',
        account_type: 'checking',
        routing_number: '12345678',
        bank_name: 'Truv Bank',
      };
      if (productType === 'pll') {
        payload.employers[0].account.deposit_type = 'amount';
        payload.employers[0].account.deposit_value = '100';
      }
    }

    return this._request('POST', 'orders/', { json: payload });
  }

  async getOrder(truvOrderId) {
    return this._request('GET', `orders/${truvOrderId}/`);
  }

  async refreshOrder(truvOrderId) {
    return this._request('POST', `orders/${truvOrderId}/refresh/`);
  }

  async getOrderCertifications(truvOrderId) {
    return this._request('GET', `orders/${truvOrderId}/certifications/`);
  }

  // --- Token Exchange & Reports ---

  async getAccessToken(publicToken) {
    return this._request('POST', 'link-access-tokens/', { json: { public_token: publicToken } });
  }

  async getLinkReport(linkId, productType) {
    return this._request('GET', `links/${linkId}/${productType}/report`);
  }

  // --- Document Collections API ---

  async createDocumentCollection(documents, users) {
    return this._request('POST', 'documents/collections/', {
      json: { documents, ...(users ? { users } : {}) },
    });
  }

  async getDocumentCollection(collectionId) {
    return this._request('GET', `documents/collections/${collectionId}/`);
  }

  async uploadToCollection(collectionId, documents) {
    return this._request('POST', `documents/collections/${collectionId}/upload/`, {
      json: { documents },
    });
  }

  async finalizeCollection(collectionId) {
    return this._request('POST', `documents/collections/${collectionId}/finalize/`);
  }

  async getFinalizationResults(collectionId) {
    return this._request('GET', `documents/collections/${collectionId}/finalize/`);
  }
}
