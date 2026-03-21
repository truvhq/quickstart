/* shared/panel.js — Reusable API panel for all quickstart demos.
   Exports: window.el, window.tryFormat, window.QuickstartPanel, window.API_BASE
   Written in plain ES5 for broadest browser compatibility without a bundler. */

(function () {
  'use strict';

  var API_BASE = window.location.origin;

  // --- DOM helper ---
  function el(tag, attrs, children) {
    var node = document.createElement(tag);
    if (attrs) {
      if (attrs.className) node.className = attrs.className;
      if (attrs.onclick) node.onclick = attrs.onclick;
      if (attrs.onchange) node.onchange = attrs.onchange;
      if (attrs.style) node.style.cssText = attrs.style;
      if (attrs.disabled) node.disabled = true;
      if (attrs.readOnly) node.readOnly = true;
      if (attrs.type) node.type = attrs.type;
      if (attrs.value !== undefined) node.value = attrs.value;
      if (attrs.placeholder) node.placeholder = attrs.placeholder;
      if (attrs.id) node.id = attrs.id;
      if (attrs.selected) node.selected = true;
      if (attrs.href) node.href = attrs.href;
      if (attrs.target) node.target = attrs.target;
      if (attrs.for) node.htmlFor = attrs.for;
    }
    if (children != null) {
      if (Array.isArray(children)) {
        children.forEach(function (c) {
          if (c == null) return;
          node.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
        });
      } else if (typeof children === 'string') {
        node.appendChild(document.createTextNode(children));
      } else {
        node.appendChild(children);
      }
    }
    return node;
  }

  // --- JSON formatter ---
  function tryFormat(s) {
    try {
      return JSON.stringify(JSON.parse(s), null, 2);
    } catch (_) {
      return String(s);
    }
  }

  // --- Time formatter ---
  function fmtTime(ts) {
    var d = new Date(ts);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }

  // --- Toggle helper ---
  function toggleBody(e) {
    var header = e.currentTarget;
    var body = header.nextElementSibling;
    if (body) body.classList.toggle('open');
  }

  // --- QuickstartPanel ---
  function QuickstartPanel(config) {
    this.tabs = config.tabs || [];
    this.steps = config.steps || [];
    this.onWebhook = config.onWebhook || null;
    this.onApiCall = config.onApiCall || null;

    this.activeTab = this.tabs[0] || 'guide';
    this.apiLogs = [];
    this.bridgeEvents = [];
    this.webhooks = [];
    this.tunnelUrl = null;
    this.currentStep = 0;
    this._sseSource = null;
    this._globalSseSource = null;
    this._seenWebhookIds = {};

    this._container = document.getElementById('apiPanel');
    this._fetchTunnelUrl();
    this.render();
  }

  QuickstartPanel.prototype.render = function () {
    var self = this;
    var container = this._container;
    if (!container) return;
    container.innerHTML = '';

    // Tabs bar
    var tabsBar = el('div', { className: 'api-panel-tabs' });
    this.tabs.forEach(function (tab) {
      var labels = { guide: 'Guide', api: 'API', bridge: 'Bridge', webhooks: 'Webhooks' };
      var label = labels[tab] || tab;
      var count = '';
      if (tab === 'api') count = self.apiLogs.length ? ' (' + self.apiLogs.length + ')' : '';
      if (tab === 'bridge') count = self.bridgeEvents.length ? ' (' + self.bridgeEvents.length + ')' : '';
      if (tab === 'webhooks') count = self.webhooks.length ? ' (' + self.webhooks.length + ')' : '';

      var btn = el('button', {
        className: self.activeTab === tab ? 'active' : '',
        onclick: function () {
          self.activeTab = tab;
          self.render();
        }
      }, label + count);
      tabsBar.appendChild(btn);
    });
    container.appendChild(tabsBar);

    // Content area
    var content = el('div', { className: 'api-tab-content' });

    if (this.activeTab === 'guide') {
      this._renderGuide(content);
    } else if (this.activeTab === 'api') {
      this._renderApi(content);
    } else if (this.activeTab === 'bridge') {
      this._renderBridge(content);
    } else if (this.activeTab === 'webhooks') {
      this._renderWebhooks(content);
    }

    container.appendChild(content);
  };

  QuickstartPanel.prototype._renderGuide = function (content) {
    var self = this;
    if (!this.steps.length) {
      content.appendChild(el('div', { className: 'empty-state' }, 'No steps defined.'));
      return;
    }
    this.steps.forEach(function (step, i) {
      var isDone = i < self.currentStep;
      var isActive = i === self.currentStep;

      if (isActive) {
        var block = el('div', { className: 'guide-block' });
        var h4 = el('div', { style: 'font-size:13px;font-weight:600;color:var(--primary);margin-bottom:8px;' }, (i + 1) + '. ' + step.title);
        block.appendChild(h4);
        if (step.guide) {
          var guideEl = el('div', { className: 'guide-detail' });
          // Developer-authored static guide content — safe to use innerHTML
          guideEl.innerHTML = step.guide;
          block.appendChild(guideEl);
        }
        content.appendChild(block);
      } else {
        var marker = isDone ? '\u2713 ' : (i + 1) + '. ';
        var style = 'padding:10px 16px;font-size:13px;border-bottom:1px solid var(--border-light);';
        if (isDone) style += 'color:var(--success);';
        else style += 'color:var(--text-muted);';
        content.appendChild(el('div', { style: style }, marker + step.title));
      }
    });
  };

  QuickstartPanel.prototype._renderApi = function (content) {
    if (!this.apiLogs.length) {
      content.appendChild(el('div', { className: 'empty-state' }, 'No API calls yet.'));
      return;
    }
    this.apiLogs.forEach(function (log) {
      var entry = el('div', { className: 'api-log-entry' });

      var method = (log.method || 'GET').toUpperCase();
      var badgeClass = method === 'POST' ? 'badge badge-post' : 'badge badge-get';

      var header = el('div', { className: 'api-log-header', onclick: toggleBody }, [
        el('span', { className: badgeClass }, method),
        el('span', { className: 'api-log-endpoint' }, log.endpoint || log.url || ''),
        el('span', { className: 'api-log-meta' }, log.status ? String(log.status) : '')
      ]);
      entry.appendChild(header);

      var body = el('div', { className: 'api-log-body' });
      if (log.request_body) {
        body.appendChild(el('h5', null, 'Request'));
        var reqPre = el('pre');
        reqPre.textContent = typeof log.request_body === 'string' ? tryFormat(log.request_body) : JSON.stringify(log.request_body, null, 2);
        body.appendChild(reqPre);
      }
      if (log.response_body) {
        body.appendChild(el('h5', null, 'Response'));
        var resPre = el('pre');
        resPre.textContent = typeof log.response_body === 'string' ? tryFormat(log.response_body) : JSON.stringify(log.response_body, null, 2);
        body.appendChild(resPre);
      }
      entry.appendChild(body);
      content.appendChild(entry);
    });
  };

  QuickstartPanel.prototype._renderBridge = function (content) {
    if (!this.bridgeEvents.length) {
      content.appendChild(el('div', { className: 'empty-state' }, 'No Bridge events yet.'));
      return;
    }
    var reversed = this.bridgeEvents.slice().reverse();
    reversed.forEach(function (evt) {
      var entry = el('div', { className: 'bridge-event' });

      var header = el('div', {
        className: 'api-log-header',
        onclick: toggleBody
      }, [
        el('span', { className: 'be-type' }, evt.type || ''),
        el('span', { className: 'be-time' }, evt.timestamp ? fmtTime(evt.timestamp) : '')
      ]);
      entry.appendChild(header);

      var body = el('div', { className: 'be-data' });
      var pre = el('pre');
      pre.textContent = evt.data != null ? (typeof evt.data === 'string' ? tryFormat(evt.data) : JSON.stringify(evt.data, null, 2)) : '';
      body.appendChild(pre);
      entry.appendChild(body);

      content.appendChild(entry);
    });
  };

  QuickstartPanel.prototype._renderWebhooks = function (content) {
    var self = this;

    if (this.tunnelUrl) {
      var info = el('div', { className: 'tunnel-info' }, [
        el('span', null, 'Tunnel: '),
        el('a', { href: this.tunnelUrl, target: '_blank' }, this.tunnelUrl)
      ]);
      content.appendChild(info);
    }

    content.appendChild(el('div', { style: 'margin-bottom:12px;font-size:12px;' }, [
      el('a', { href: 'https://dashboard.truv.com/app/development/webhooks', target: '_blank', style: 'color:var(--primary);font-weight:500;' }, 'See webhook config')
    ]));

    if (!this.webhooks.length) {
      content.appendChild(el('div', { className: 'empty-state' }, 'No webhooks received yet.'));
      return;
    }

    var reversed = this.webhooks.slice().reverse();
    reversed.forEach(function (wh) {
      var entry = el('div', { className: 'wh-entry' });

      var status = wh.status || '';
      var statusColor = '#999';
      var statusBg = 'var(--bg)';
      if (status === 'pending') { statusColor = '#f59e0b'; statusBg = 'var(--warning-bg)'; }
      else if (status === 'sent') { statusColor = '#3b82f6'; statusBg = '#eff6ff'; }
      else if (status === 'completed' || status === 'done') { statusColor = '#10b981'; statusBg = 'var(--success-bg)'; }
      else if (status === 'failed') { statusColor = '#ef4444'; statusBg = 'var(--error-bg)'; }

      var statusEl = el('span', {
        className: 'wh-status',
        style: 'color:' + statusColor + ';background:' + statusBg + ';'
      }, status);

      var header = el('div', { className: 'wh-header', onclick: toggleBody }, [
        el('span', { className: 'wh-type' }, wh.event_type || wh.eventType || ''),
        statusEl,
        el('span', { className: 'wh-time' }, wh.created_at || wh.timestamp ? fmtTime(wh.created_at || wh.timestamp) : '')
      ]);
      entry.appendChild(header);

      var body = el('div', { className: 'wh-body' });
      var pre = el('pre');
      var payload = wh.payload || wh;
      pre.textContent = typeof payload === 'string' ? tryFormat(payload) : JSON.stringify(payload, null, 2);
      body.appendChild(pre);
      entry.appendChild(body);

      content.appendChild(entry);
    });
  };

  QuickstartPanel.prototype.setStep = function (n) {
    this.currentStep = n;
    if (this.activeTab === 'guide') this.render();
  };

  QuickstartPanel.prototype.addBridgeEvent = function (type, data) {
    this.bridgeEvents.push({ type: type, data: data, timestamp: Date.now() });
    this.render();
  };

  QuickstartPanel.prototype.addApiLog = function (log) {
    this.apiLogs.push(log);
    this.render();
  };

  QuickstartPanel.prototype.connectSSE = function (orderId) {
    var self = this;
    if (this._sseSource) this._sseSource.close();
    var url = API_BASE + '/api/events/stream';
    if (orderId) url += '?order_id=' + encodeURIComponent(orderId);
    this._sseSource = new EventSource(url);
    this._sseSource.addEventListener('api_call', function (e) {
      try {
        var log = JSON.parse(e.data);
        self.apiLogs.push(log);
        if (self.onApiCall) self.onApiCall(log);
        self.render();
      } catch (_) {}
    });
    this._sseSource.addEventListener('webhook', function (e) {
      try {
        var wh = JSON.parse(e.data);
        var whId = wh.webhook_id || wh.id || JSON.stringify(wh);
        if (self._seenWebhookIds[whId]) return;
        self._seenWebhookIds[whId] = true;
        self.webhooks.push(wh);
        if (self.onWebhook) self.onWebhook(wh);
        self.render();
      } catch (_) {}
    });
  };

  QuickstartPanel.prototype.connectGlobalSSE = function (filterFn) {
    var self = this;
    if (this._globalSseSource) this._globalSseSource.close();
    var url = API_BASE + '/api/events/stream';
    this._globalSseSource = new EventSource(url);
    this._globalSseSource.addEventListener('webhook', function (e) {
      try {
        var wh = JSON.parse(e.data);
        var whId = wh.webhook_id || wh.id || JSON.stringify(wh);
        if (self._seenWebhookIds[whId]) return;
        self._seenWebhookIds[whId] = true;
        if (filterFn && !filterFn(wh)) return;
        self.webhooks.push(wh);
        if (self.onWebhook) self.onWebhook(wh);
        self.render();
      } catch (_) {}
    });
  };

  QuickstartPanel.prototype.fetchLogs = function (orderId) {
    var self = this;
    return Promise.all([
      fetch(API_BASE + '/api/orders/' + orderId + '/logs').then(function (r) { return r.json(); }),
      fetch(API_BASE + '/api/orders/' + orderId + '/webhooks').then(function (r) { return r.json(); })
    ]).then(function (results) {
      self.apiLogs = results[0] || [];
      self.webhooks = results[1] || [];
      // Rebuild seen set from fetched data so SSE dedup stays in sync
      self._seenWebhookIds = {};
      for (var i = 0; i < self.webhooks.length; i++) {
        var wh = self.webhooks[i];
        var whId = wh.webhook_id || wh.id || JSON.stringify(wh);
        self._seenWebhookIds[whId] = true;
      }
      self.render();
      return { logs: self.apiLogs, webhooks: self.webhooks };
    });
  };

  QuickstartPanel.prototype.fetchAllWebhooks = function () {
    var self = this;
    return fetch(API_BASE + '/api/webhooks')
      .then(function (r) { return r.json(); })
      .then(function (data) {
        self.webhooks = data || [];
        self.render();
        return self.webhooks;
      });
  };

  QuickstartPanel.prototype._fetchTunnelUrl = function () {
    var self = this;
    fetch(API_BASE + '/api/tunnel-url')
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (data && data.url) {
          self.tunnelUrl = data.url;
          self.render();
        }
      })
      .catch(function () {});
  };

  // --- Exports ---
  window.el = el;
  window.tryFormat = tryFormat;
  window.QuickstartPanel = QuickstartPanel;
  window.API_BASE = API_BASE;
})();
