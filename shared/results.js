/* shared/results.js — Shared result rendering for all quickstart demos.
   Renders order results (employers, assets/VOA, VOIE) into a container element.
   Written in plain ES5 for broadest browser compatibility without a bundler. */

(function () {
  'use strict';

  // --- Helpers ---
  function $(amount) { return '$' + Number(amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
  function freq(f) { return { BW: 'Biweekly', W: 'Weekly', M: 'Monthly', SM: 'Semi-Monthly', A: 'Annual' }[f] || f; }

  function makeSection(title) {
    var sec = document.createElement('div'); sec.className = 'result-section';
    var h3 = document.createElement('h3'); h3.textContent = title;
    sec.appendChild(h3); return sec;
  }

  function addRow(grid, label, value) {
    var row = document.createElement('div'); row.className = 'result-row';
    var l = document.createElement('div'); l.className = 'result-label'; l.textContent = label;
    var v = document.createElement('div'); v.className = 'result-value'; v.textContent = String(value);
    row.appendChild(l); row.appendChild(v); grid.appendChild(row);
  }

  function makeSubheading(text) {
    var node = document.createElement('div');
    node.style.cssText = 'font-size:12px;font-weight:600;color:var(--text-secondary);margin:8px 0 4px;text-transform:uppercase;letter-spacing:0.5px;';
    node.textContent = text;
    return node;
  }

  // --- Employer rendering (income / employment products) ---
  function renderEmployer(container, emp) {
    var employment = (emp.employments && emp.employments[0]) || {};
    var profile = employment.profile || {};
    var company = employment.company || {};
    var stmts = employment.statements || [];
    var annualSummary = employment.annual_income_summary || [];
    var bankAccounts = employment.bank_accounts || [];
    var w2s = employment.w2s || [];

    // Employer header
    var empHeader = document.createElement('div');
    empHeader.style.cssText = 'display:flex;align-items:center;gap:12px;margin-bottom:20px;padding:16px 0;border-bottom:2px solid var(--border);';
    var logoUrl = emp.company_logo || (emp.provider && emp.provider.logo_url) || '';
    if (logoUrl) {
      var logo = document.createElement('img');
      logo.style.cssText = 'width:40px;height:40px;border-radius:8px;object-fit:contain;border:1px solid var(--border);';
      logo.src = logoUrl;
      empHeader.appendChild(logo);
    }
    var empInfo = document.createElement('div');
    var empName = document.createElement('div');
    empName.style.cssText = 'font-size:18px;font-weight:700;';
    empName.textContent = emp.company_name || company.name || 'Employer';
    empInfo.appendChild(empName);
    var meta = [emp.provider ? 'via ' + emp.provider.name : '', emp.data_source || ''].filter(Boolean).join(' \u2022 ');
    if (meta) {
      var metaEl = document.createElement('div');
      metaEl.style.cssText = 'font-size:13px;color:var(--text-secondary);margin-top:2px;';
      metaEl.textContent = meta;
      empInfo.appendChild(metaEl);
    }
    empHeader.appendChild(empInfo);
    var empStatus = document.createElement('span');
    empStatus.className = 'status-badge ' + (emp.status === 'completed' ? 'status-completed' : 'status-pending');
    empStatus.style.marginLeft = 'auto';
    empStatus.textContent = emp.status || '-';
    empHeader.appendChild(empStatus);
    container.appendChild(empHeader);

    // Profile
    if (profile.first_name) {
      var sec = makeSection('Profile');
      var g = document.createElement('div'); g.className = 'results-grid';
      addRow(g, 'Full Name', profile.full_name || (profile.first_name + ' ' + profile.last_name));
      if (profile.email) addRow(g, 'Email', profile.email);
      if (profile.date_of_birth) addRow(g, 'Date of Birth', profile.date_of_birth);
      if (profile.ssn) addRow(g, 'SSN', profile.ssn.replace(/^(\d{3})(\d{2})(\d{4})$/, '$1-$2-$3'));
      if (profile.home_address) {
        var a = profile.home_address;
        addRow(g, 'Address', [a.street, a.city, a.state, a.zip].filter(Boolean).join(', '));
      }
      sec.appendChild(g); container.appendChild(sec);
    }

    // Employment
    if (employment.job_title) {
      var sec2 = makeSection('Employment');
      var g2 = document.createElement('div'); g2.className = 'results-grid';
      addRow(g2, 'Job Title', employment.job_title);
      addRow(g2, 'Job Type', employment.job_type === 'F' ? 'Full-time' : employment.job_type === 'P' ? 'Part-time' : employment.job_type || '-');
      addRow(g2, 'Status', employment.is_active ? 'Active' : 'Inactive');
      addRow(g2, 'Start Date', employment.start_date || '-');
      if (employment.end_date) addRow(g2, 'End Date', employment.end_date);
      if (employment.original_hire_date) addRow(g2, 'Original Hire Date', employment.original_hire_date);
      if (employment.employed_in_role) addRow(g2, 'Tenure', employment.employed_in_role);
      if (employment.manager_name) addRow(g2, 'Manager', employment.manager_name);
      if (employment.income) addRow(g2, 'Annual Income', $(employment.income));
      if (employment.pay_rate) addRow(g2, 'Pay Rate', $(employment.pay_rate) + ' ' + freq(employment.pay_frequency));
      if (company.phone) addRow(g2, 'Company Phone', company.phone);
      if (company.address) {
        var ca = company.address;
        addRow(g2, 'Company Address', [ca.street, ca.city, ca.state, ca.zip].filter(Boolean).join(', '));
      }
      sec2.appendChild(g2); container.appendChild(sec2);
    }

    // Annual Income Summary
    if (annualSummary.length > 0) {
      var sec3 = makeSection('Annual Income Summary');
      var table = document.createElement('table');
      table.style.cssText = 'width:100%;border-collapse:collapse;font-size:13px;';
      var thead = document.createElement('tr');
      thead.style.cssText = 'border-bottom:2px solid var(--border);';
      ['Year', 'Gross Pay', 'Net Pay', 'Regular', 'Overtime', 'Other'].forEach(function(h) {
        var th = document.createElement('th');
        th.style.cssText = 'text-align:left;padding:8px 12px;font-weight:600;color:var(--text-secondary);';
        th.textContent = h;
        thead.appendChild(th);
      });
      table.appendChild(thead);
      annualSummary.forEach(function(yr) {
        var tr = document.createElement('tr');
        tr.style.cssText = 'border-bottom:1px solid var(--border-light);';
        [String(yr.year), $(yr.gross_pay), $(yr.net_pay), yr.regular ? $(yr.regular) : '-', yr.overtime ? $(yr.overtime) : '-', yr.other_pay ? $(yr.other_pay) : '-'].forEach(function(v, i) {
          var td = document.createElement('td');
          td.style.cssText = 'padding:8px 12px;' + (i === 0 ? 'font-weight:600;' : '');
          td.textContent = v;
          tr.appendChild(td);
        });
        table.appendChild(tr);
      });
      sec3.appendChild(table); container.appendChild(sec3);
    }

    // Pay Statements
    if (stmts.length > 0) {
      var sec4 = makeSection('Pay Statements (' + stmts.length + ' total)');
      var recent = stmts.slice(0, 3);
      recent.forEach(function(st) {
        var stCard = document.createElement('div');
        stCard.style.cssText = 'border:1px solid var(--border);border-radius:var(--radius-sm);margin-bottom:12px;overflow:hidden;';

        var stHeader = document.createElement('div');
        stHeader.style.cssText = 'display:flex;align-items:center;justify-content:space-between;padding:12px 16px;background:var(--border-light);cursor:pointer;';
        stHeader.onclick = function() { var b = this.nextElementSibling; b.style.display = b.style.display === 'none' ? 'block' : 'none'; };
        var hL = document.createElement('div');
        hL.style.cssText = 'font-weight:600;font-size:13px;';
        hL.textContent = 'Pay Date: ' + st.pay_date;
        stHeader.appendChild(hL);
        var hR = document.createElement('div');
        hR.style.cssText = 'display:flex;gap:16px;font-size:13px;';
        hR.textContent = 'Gross: ' + $(st.gross_pay) + '  Net: ' + $(st.net_pay);
        stHeader.appendChild(hR);
        stCard.appendChild(stHeader);

        var stBody = document.createElement('div');
        stBody.style.cssText = 'display:none;padding:12px 16px;';
        var sg = document.createElement('div'); sg.className = 'results-grid'; sg.style.marginBottom = '12px';
        addRow(sg, 'Period', (st.period_start || '') + ' to ' + (st.period_end || ''));
        addRow(sg, 'Hours', String(st.hours || '-'));
        addRow(sg, 'Regular', st.regular ? $(st.regular) : '-');
        addRow(sg, 'Overtime', st.overtime ? $(st.overtime) : '-');
        stBody.appendChild(sg);

        if (st.earnings && st.earnings.length) {
          stBody.appendChild(makeSubheading('Earnings'));
          var et = document.createElement('table'); et.style.cssText = 'width:100%;font-size:12px;border-collapse:collapse;';
          st.earnings.forEach(function(e) {
            var tr = document.createElement('tr'); tr.style.cssText = 'border-bottom:1px solid var(--border-light);';
            var td1 = document.createElement('td'); td1.style.cssText = 'padding:4px 8px;'; td1.textContent = e.name; tr.appendChild(td1);
            var td2 = document.createElement('td'); td2.style.cssText = 'padding:4px 8px;text-align:right;font-weight:500;'; td2.textContent = $(e.amount); tr.appendChild(td2);
            et.appendChild(tr);
          });
          stBody.appendChild(et);
        }
        if (st.deductions && st.deductions.length) {
          stBody.appendChild(makeSubheading('Deductions'));
          var dt = document.createElement('table'); dt.style.cssText = 'width:100%;font-size:12px;border-collapse:collapse;';
          st.deductions.forEach(function(d) {
            var tr = document.createElement('tr'); tr.style.cssText = 'border-bottom:1px solid var(--border-light);';
            var td1 = document.createElement('td'); td1.style.cssText = 'padding:4px 8px;'; td1.textContent = d.name; tr.appendChild(td1);
            var td2 = document.createElement('td'); td2.style.cssText = 'padding:4px 8px;text-align:right;font-weight:500;color:var(--error);'; td2.textContent = '-' + $(d.amount); tr.appendChild(td2);
            dt.appendChild(tr);
          });
          stBody.appendChild(dt);
        }
        if (st.file) {
          var dl = document.createElement('a');
          dl.href = st.file; dl.target = '_blank';
          dl.style.cssText = 'display:inline-block;margin-top:10px;font-size:12px;color:var(--primary);font-weight:500;';
          dl.textContent = 'Download PDF';
          stBody.appendChild(dl);
        }
        stCard.appendChild(stBody);
        sec4.appendChild(stCard);
      });
      if (stmts.length > 3) {
        var more = document.createElement('p');
        more.style.cssText = 'font-size:12px;color:var(--text-muted);';
        more.textContent = '+ ' + (stmts.length - 3) + ' more statements available in API response';
        sec4.appendChild(more);
      }
      container.appendChild(sec4);
    }

    // W-2s
    if (w2s.length > 0) {
      var sec5 = makeSection('W-2 Forms');
      var t2 = document.createElement('table');
      t2.style.cssText = 'width:100%;border-collapse:collapse;font-size:13px;';
      var th2 = document.createElement('tr');
      th2.style.cssText = 'border-bottom:2px solid var(--border);';
      ['Year', 'Wages', 'Federal Tax', 'SS Tax', 'Medicare Tax', ''].forEach(function(h) {
        var th = document.createElement('th');
        th.style.cssText = 'text-align:left;padding:8px 12px;font-weight:600;color:var(--text-secondary);';
        th.textContent = h;
        th2.appendChild(th);
      });
      t2.appendChild(th2);
      w2s.forEach(function(w) {
        var tr = document.createElement('tr');
        tr.style.cssText = 'border-bottom:1px solid var(--border-light);';
        [String(w.year), w.wages ? $(w.wages) : '-', w.federal_tax ? $(w.federal_tax) : '-', w.social_security_tax ? $(w.social_security_tax) : '-', w.medicare_tax ? $(w.medicare_tax) : '-'].forEach(function(v, i) {
          var td = document.createElement('td');
          td.style.cssText = 'padding:8px 12px;' + (i === 0 ? 'font-weight:600;' : '');
          td.textContent = v;
          tr.appendChild(td);
        });
        var dlTd = document.createElement('td');
        dlTd.style.cssText = 'padding:8px 12px;';
        if (w.file) {
          var pdfLink = document.createElement('a');
          pdfLink.href = w.file; pdfLink.target = '_blank';
          pdfLink.style.cssText = 'color:var(--primary);font-weight:500;font-size:12px;';
          pdfLink.textContent = 'PDF';
          dlTd.appendChild(pdfLink);
        }
        tr.appendChild(dlTd);
        t2.appendChild(tr);
      });
      sec5.appendChild(t2); container.appendChild(sec5);
    }

    // Bank Accounts (direct deposit)
    if (bankAccounts.length > 0) {
      var sec6 = makeSection('Bank Accounts');
      var g6 = document.createElement('div'); g6.className = 'results-grid';
      bankAccounts.forEach(function(ba, i) {
        addRow(g6, 'Account ' + (i + 1), (ba.bank_name || '') + ' \u2022 ' + (ba.account_type === 'C' ? 'Checking' : 'Savings') + ' \u2022 ...' + (ba.account_number || '').slice(-4));
        addRow(g6, 'Deposit', (ba.deposit_type === 'A' ? 'Amount: ' : 'Percent: ') + $(ba.deposit_value));
      });
      sec6.appendChild(g6); container.appendChild(sec6);
    }
  }

  // --- VOA account card ---
  function renderVoaAccountCard(container, acct) {
    var acctType = (acct.type || '').charAt(0) + (acct.type || '').slice(1).toLowerCase();
    var bal = acct.balances || {};
    var card = document.createElement('div');
    card.style.cssText = 'border:1px solid var(--border);border-radius:var(--radius-sm);margin-bottom:12px;overflow:hidden;';

    var header = document.createElement('div');
    header.style.cssText = 'display:flex;align-items:center;justify-content:space-between;padding:12px 16px;background:var(--border-light);';
    var hL = document.createElement('div');
    hL.style.cssText = 'font-weight:600;font-size:13px;';
    hL.textContent = acctType + ' \u2022\u2022\u2022\u2022 ' + (acct.mask || '');
    header.appendChild(hL);
    var hR = document.createElement('div');
    hR.style.cssText = 'font-size:13px;font-weight:600;';
    if (bal.balance != null) hR.textContent = $(bal.balance);
    header.appendChild(hR);
    card.appendChild(header);

    var body = document.createElement('div');
    body.style.cssText = 'padding:12px 16px;';
    var g = document.createElement('div'); g.className = 'results-grid'; g.style.marginBottom = '0';
    if (bal.available_balance != null) addRow(g, 'Available Balance', $(bal.available_balance));
    if (bal.balance != null) addRow(g, 'Current Balance', $(bal.balance));
    if (bal.credit_limit != null) addRow(g, 'Credit Limit', $(bal.credit_limit));
    if (acct.owners && acct.owners.length) addRow(g, 'Owner', acct.owners.map(function(o) { return (o.full_name || '') + (o.relation_type ? ' (' + o.relation_type.toLowerCase() + ')' : ''); }).join(', '));
    if (acct.nsf != null) addRow(g, 'NSF Count', String(acct.nsf));
    var txns = acct.transactions || [];
    if (txns.length > 0) addRow(g, 'Transactions', txns.length + ' total');
    body.appendChild(g);
    card.appendChild(body);
    container.appendChild(card);
  }

  // --- Financial accounts / VOA rendering (assets product) ---
  function renderFinancialAccounts(container, raw, voaReport) {
    var financialAccounts = raw.financial_accounts || [];
    if (raw.bank && financialAccounts.length === 0) financialAccounts = [raw.bank];
    if (financialAccounts.length === 0) return false;

    for (var fi = 0; fi < financialAccounts.length; fi++) {
      var fa = financialAccounts[fi];
      var provider = fa.provider || {};

      // Provider header
      var faHeader = document.createElement('div');
      faHeader.style.cssText = 'display:flex;align-items:center;gap:12px;margin-bottom:20px;padding:16px 0;border-bottom:2px solid var(--border);';
      if (provider.logo_url) {
        var logo = document.createElement('img');
        logo.style.cssText = 'width:40px;height:40px;border-radius:8px;object-fit:contain;border:1px solid var(--border);';
        logo.src = provider.logo_url;
        faHeader.appendChild(logo);
      }
      var faInfo = document.createElement('div');
      var faName = document.createElement('div');
      faName.style.cssText = 'font-size:18px;font-weight:700;';
      faName.textContent = provider.name || 'Financial Institution';
      faInfo.appendChild(faName);
      if (fa.data_source) {
        var faMeta = document.createElement('div');
        faMeta.style.cssText = 'font-size:13px;color:var(--text-secondary);margin-top:2px;';
        faMeta.textContent = fa.data_source.replace(/_/g, ' ');
        faInfo.appendChild(faMeta);
      }
      faHeader.appendChild(faInfo);
      var faStatus = document.createElement('span');
      faStatus.className = 'status-badge ' + (fa.status === 'completed' ? 'status-completed' : 'status-pending');
      faStatus.style.marginLeft = 'auto';
      faStatus.textContent = fa.status || '-';
      faHeader.appendChild(faStatus);
      container.appendChild(faHeader);

      // VOA report data
      var voaAccounts = [];
      if (voaReport) {
        var voaLinks = voaReport.links || [];
        for (var vli = 0; vli < voaLinks.length; vli++) {
          var linkAccts = voaLinks[vli].accounts || [];
          for (var vai = 0; vai < linkAccts.length; vai++) voaAccounts.push(linkAccts[vai]);
        }
      }

      if (voaAccounts.length > 0) {
        // Balance summary
        if (voaReport.summary) {
          var secSum = makeSection('Balance Summary');
          var gSum = document.createElement('div'); gSum.className = 'results-grid';
          if (voaReport.summary.balance != null) addRow(gSum, 'Total Balance', $(voaReport.summary.balance));
          if (voaReport.summary.avg_30 != null) addRow(gSum, '30-Day Avg Balance', $(voaReport.summary.avg_30));
          if (voaReport.summary.avg_60 != null) addRow(gSum, '60-Day Avg Balance', $(voaReport.summary.avg_60));
          if (voaReport.summary.avg_90 != null) addRow(gSum, '90-Day Avg Balance', $(voaReport.summary.avg_90));
          secSum.appendChild(gSum); container.appendChild(secSum);
        }

        var secAcct = makeSection('Accounts (' + voaAccounts.length + ')');
        for (var ai = 0; ai < voaAccounts.length; ai++) {
          renderVoaAccountCard(secAcct, voaAccounts[ai]);
        }
        container.appendChild(secAcct);
      } else {
        // Fallback: basic account list from order
        var accounts = fa.accounts || [];
        if (accounts.length > 0) {
          var secAcct2 = makeSection('Accounts (' + accounts.length + ')');
          var gAcct2 = document.createElement('div'); gAcct2.className = 'results-grid';
          for (var ai2 = 0; ai2 < accounts.length; ai2++) {
            var acct2 = accounts[ai2];
            var acctType2 = (acct2.type || '').charAt(0) + (acct2.type || '').slice(1).toLowerCase();
            addRow(gAcct2, acctType2 + (acct2.subtype ? ' (' + acct2.subtype + ')' : ''), '\u2022\u2022\u2022\u2022 ' + (acct2.mask || ''));
          }
          secAcct2.appendChild(gAcct2); container.appendChild(secAcct2);
        }
      }
    }
    return true;
  }

  // --- VOIE report rendering ---
  function renderVoieReport(container, voieReport) {
    if (!voieReport || !voieReport.links) return false;
    var links = voieReport.links;
    if (links.length === 0) return false;

    for (var li = 0; li < links.length; li++) {
      var link = links[li];
      var employments = link.employments || [];
      for (var ei = 0; ei < employments.length; ei++) {
        renderEmployer(container, {
          company_name: link.provider_name || (link.provider && link.provider.name) || 'Employer',
          company_logo: link.provider && link.provider.logo_url,
          provider: link.provider,
          data_source: link.data_source,
          status: 'completed',
          employments: [employments[ei]],
        });
      }
    }
    return true;
  }

  // --- Main entry point ---
  // data = { raw_response, voa_report, voie_report, truv_order_id, status }
  function renderOrderResults(container, data) {
    var raw = data.raw_response || {};
    var hasContent = false;

    // VOIE report (income/employment with enriched data)
    if (data.voie_report) {
      hasContent = renderVoieReport(container, data.voie_report) || hasContent;
    }

    // Employers from order (fallback if no VOIE report)
    if (!hasContent) {
      var employers = raw.employers || [];
      for (var ei = 0; ei < employers.length; ei++) {
        renderEmployer(container, employers[ei]);
        hasContent = true;
      }
    }

    // Financial accounts / VOA (assets product)
    hasContent = renderFinancialAccounts(container, raw, data.voa_report || null) || hasContent;

    // Fallback
    if (!hasContent) {
      var sec = makeSection('Order Details');
      var g = document.createElement('div'); g.className = 'results-grid';
      addRow(g, 'Order ID', data.truv_order_id || '-');
      addRow(g, 'Status', data.status || '-');
      addRow(g, 'Product', raw.verification_type || '-');
      sec.appendChild(g); container.appendChild(sec);
    }
  }

  // --- Exports ---
  window.renderOrderResults = renderOrderResults;
})();
