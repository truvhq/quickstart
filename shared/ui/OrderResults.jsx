import { useState } from 'preact/hooks';

const $ = (n) => '$' + Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const freq = (f) => ({ BW: 'Biweekly', W: 'Weekly', M: 'Monthly', SM: 'Semi-Monthly', A: 'Annual' }[f] || f);
const fmtDate = (d) => d ? new Date(d).toLocaleDateString() : '-';

function Section({ title, children }) {
  return <div class="mb-6"><h3 class="text-sm font-semibold text-gray-900 mb-3">{title}</h3>{children}</div>;
}

function Row({ label, value }) {
  return (
    <div class="grid grid-cols-[180px_1fr] border-b border-border-light">
      <div class="py-3 text-sm text-gray-500 font-medium">{label}</div>
      <div class="py-3 text-sm font-semibold">{value}</div>
    </div>
  );
}

function StatusBadge({ status }) {
  const cls = status === 'completed' ? 'bg-success-bg text-success border border-green-200' : 'bg-warning-bg text-warning';
  return <span class={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${cls}`}>{status}</span>;
}

function ProviderHeader({ name, logoUrl, meta, status }) {
  return (
    <div class="flex items-center gap-3 mb-5 py-4 border-b-2 border-border">
      {logoUrl && <img src={logoUrl} class="w-10 h-10 rounded-lg object-contain border border-border" />}
      <div>
        <div class="text-lg font-bold">{name}</div>
        {meta && <div class="text-sm text-gray-500 mt-0.5">{meta}</div>}
      </div>
      {status && <div class="ml-auto"><StatusBadge status={status} /></div>}
    </div>
  );
}

// --- VOIE / VOE Report ---

function PayStatement({ st }) {
  const [open, setOpen] = useState(false);
  return (
    <div class="border border-border rounded-lg mb-3 overflow-hidden">
      <div class="flex items-center justify-between px-4 py-3 bg-border-light cursor-pointer" onClick={() => setOpen(!open)}>
        <div class="font-semibold text-sm">Pay Date: {st.pay_date}</div>
        <div class="text-sm">Gross: {$(st.gross_pay)}  Net: {$(st.net_pay)}</div>
      </div>
      {open && (
        <div class="px-4 py-3">
          <Row label="Period" value={`${st.period_start || ''} to ${st.period_end || ''}`} />
          <Row label="Hours" value={st.hours || '-'} />
          <Row label="Regular" value={st.regular ? $(st.regular) : '-'} />
          <Row label="Overtime" value={st.overtime ? $(st.overtime) : '-'} />
          {st.earnings?.length > 0 && (
            <>
              <div class="text-xs font-semibold text-gray-500 uppercase tracking-wide my-2">Earnings</div>
              <table class="w-full text-xs"><tbody>
                {st.earnings.map((e, i) => <tr key={i} class="border-b border-border-light"><td class="py-1 px-2">{e.name}</td><td class="py-1 px-2 text-right font-medium">{$(e.amount)}</td></tr>)}
              </tbody></table>
            </>
          )}
          {st.deductions?.length > 0 && (
            <>
              <div class="text-xs font-semibold text-gray-500 uppercase tracking-wide my-2">Deductions</div>
              <table class="w-full text-xs"><tbody>
                {st.deductions.map((d, i) => <tr key={i} class="border-b border-border-light"><td class="py-1 px-2">{d.name}</td><td class="py-1 px-2 text-right font-medium text-error">-{$(d.amount)}</td></tr>)}
              </tbody></table>
            </>
          )}
          {st.file && <a href={st.file} target="_blank" class="inline-block mt-2.5 text-xs text-primary font-medium">Download PDF</a>}
        </div>
      )}
    </div>
  );
}

function VoieReport({ report }) {
  if (!report?.links?.length) return null;

  return report.links.map((link, li) => {
    const meta = [link.provider_name, link.data_source].filter(Boolean).join(' • ');
    return (link.employments || []).map((emp, ei) => {
      const profile = emp.profile || {};
      const company = emp.company || {};
      const stmts = emp.statements || [];
      const annualSummary = emp.annual_income_summary || [];
      const bankAccounts = emp.bank_accounts || [];
      const w2s = emp.w2s || [];

      return (
        <div key={`${li}-${ei}`}>
          <ProviderHeader name={company.name || link.provider_name || 'Employer'} logoUrl={link.provider?.logo_url} meta={meta} status="completed" />

          {profile.first_name && (
            <Section title="Profile">
              <Row label="Full Name" value={profile.full_name || `${profile.first_name} ${profile.last_name}`} />
              {profile.email && <Row label="Email" value={profile.email} />}
              {profile.date_of_birth && <Row label="Date of Birth" value={profile.date_of_birth} />}
              {profile.ssn && <Row label="SSN" value={profile.ssn.replace(/^(\d{3})(\d{2})(\d{4})$/, '$1-$2-$3')} />}
              {profile.home_address && <Row label="Address" value={[profile.home_address.street, profile.home_address.city, profile.home_address.state, profile.home_address.zip].filter(Boolean).join(', ')} />}
            </Section>
          )}

          {emp.job_title && (
            <Section title="Employment">
              <Row label="Job Title" value={emp.job_title} />
              <Row label="Job Type" value={emp.job_type === 'F' ? 'Full-time' : emp.job_type === 'P' ? 'Part-time' : emp.job_type || '-'} />
              <Row label="Status" value={emp.is_active ? 'Active' : 'Inactive'} />
              <Row label="Start Date" value={emp.start_date || '-'} />
              {emp.end_date && <Row label="End Date" value={emp.end_date} />}
              {emp.original_hire_date && <Row label="Original Hire Date" value={emp.original_hire_date} />}
              {emp.manager_name && <Row label="Manager" value={emp.manager_name} />}
              {emp.income && <Row label="Annual Income" value={$(emp.income)} />}
              {emp.pay_rate && <Row label="Pay Rate" value={`${$(emp.pay_rate)} ${freq(emp.pay_frequency)}`} />}
              {company.phone && <Row label="Company Phone" value={company.phone} />}
              {company.address && <Row label="Company Address" value={[company.address.street, company.address.city, company.address.state, company.address.zip].filter(Boolean).join(', ')} />}
            </Section>
          )}

          {annualSummary.length > 0 && (
            <Section title="Annual Income Summary">
              <table class="w-full text-sm border-collapse">
                <thead><tr class="border-b-2 border-border">
                  {['Year', 'Gross Pay', 'Net Pay', 'Regular', 'Overtime', 'Other'].map(h => <th key={h} class="text-left px-3 py-2 font-semibold text-gray-500">{h}</th>)}
                </tr></thead>
                <tbody>
                  {annualSummary.map((yr, i) => (
                    <tr key={i} class="border-b border-border-light">
                      <td class="px-3 py-2 font-semibold">{yr.year}</td>
                      <td class="px-3 py-2">{$(yr.gross_pay)}</td>
                      <td class="px-3 py-2">{$(yr.net_pay)}</td>
                      <td class="px-3 py-2">{yr.regular ? $(yr.regular) : '-'}</td>
                      <td class="px-3 py-2">{yr.overtime ? $(yr.overtime) : '-'}</td>
                      <td class="px-3 py-2">{yr.other_pay ? $(yr.other_pay) : '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Section>
          )}

          {stmts.length > 0 && (
            <Section title={`Pay Statements (${stmts.length})`}>
              {stmts.slice(0, 3).map((st, i) => <PayStatement key={i} st={st} />)}
              {stmts.length > 3 && <p class="text-xs text-gray-400">+ {stmts.length - 3} more</p>}
            </Section>
          )}

          {w2s.length > 0 && (
            <Section title="W-2 Forms">
              <table class="w-full text-sm border-collapse">
                <thead><tr class="border-b-2 border-border">
                  {['Year', 'Wages', 'Federal Tax', 'SS Tax', 'Medicare Tax', ''].map(h => <th key={h} class="text-left px-3 py-2 font-semibold text-gray-500">{h}</th>)}
                </tr></thead>
                <tbody>
                  {w2s.map((w, i) => (
                    <tr key={i} class="border-b border-border-light">
                      <td class="px-3 py-2 font-semibold">{w.year}</td>
                      <td class="px-3 py-2">{w.wages ? $(w.wages) : '-'}</td>
                      <td class="px-3 py-2">{w.federal_tax ? $(w.federal_tax) : '-'}</td>
                      <td class="px-3 py-2">{w.social_security_tax ? $(w.social_security_tax) : '-'}</td>
                      <td class="px-3 py-2">{w.medicare_tax ? $(w.medicare_tax) : '-'}</td>
                      <td class="px-3 py-2">{w.file && <a href={w.file} target="_blank" class="text-primary font-medium text-xs">PDF</a>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Section>
          )}

          {bankAccounts.length > 0 && (
            <Section title="Bank Accounts">
              {bankAccounts.map((ba, i) => (
                <div key={i}>
                  <Row label={`Account ${i + 1}`} value={`${ba.bank_name || ''} • ${ba.account_type === 'C' ? 'Checking' : 'Savings'} • ...${(ba.account_number || '').slice(-4)}`} />
                  <Row label="Deposit" value={`${ba.deposit_type === 'A' ? 'Amount: ' : 'Percent: '}${$(ba.deposit_value)}`} />
                </div>
              ))}
            </Section>
          )}
        </div>
      );
    });
  });
}

// --- Assets Report ---

function TransactionRow({ txn }) {
  const isCredit = txn.type === 'CREDIT';
  return (
    <tr class="border-b border-border-light text-xs">
      <td class="py-2 px-2 text-gray-500">{fmtDate(txn.posted_at)}</td>
      <td class="py-2 px-2">{txn.description}</td>
      <td class="py-2 px-2 text-gray-400">{(txn.categories || []).join(', ')}</td>
      <td class={`py-2 px-2 text-right font-medium ${isCredit ? 'text-green-600' : ''}`}>{isCredit ? '+' : '-'}{$(txn.amount)}</td>
    </tr>
  );
}

function AccountCard({ acct }) {
  const [showTxns, setShowTxns] = useState(false);
  const bal = acct.balances || {};
  const txns = acct.transactions || [];
  const acctType = (acct.type || '').charAt(0) + (acct.type || '').slice(1).toLowerCase();

  return (
    <div class="border border-border rounded-lg mb-4 overflow-hidden">
      <div class="flex items-center justify-between px-4 py-3 bg-border-light">
        <div class="font-semibold text-sm">{acctType} {acct.mask}</div>
        {bal.balance != null && <div class="text-sm font-semibold">{$(bal.balance)}</div>}
      </div>
      <div class="px-4 py-3">
        {bal.available_balance != null && <Row label="Available" value={$(bal.available_balance)} />}
        {acct.routing_number && <Row label="Routing" value={acct.routing_number} />}
        {acct.days_available && <Row label="Days of Data" value={String(acct.days_available)} />}
        {acct.owners?.length > 0 && <Row label="Owner" value={acct.owners.map(o => o.full_name || '').join(', ')} />}
        {acct.nsf != null && <Row label="NSF Count" value={String(acct.nsf)} />}
        {acct.summary && (
          <>
            {acct.summary.avg_30 && <Row label="30-Day Avg" value={$(acct.summary.avg_30)} />}
            {acct.summary.avg_60 && <Row label="60-Day Avg" value={$(acct.summary.avg_60)} />}
          </>
        )}

        {txns.length > 0 && (
          <div class="mt-3">
            <button class="text-xs text-primary font-medium" onClick={() => setShowTxns(!showTxns)}>
              {showTxns ? 'Hide' : 'Show'} {txns.length} transactions
            </button>
            {showTxns && (
              <table class="w-full mt-2 border-collapse">
                <thead><tr class="border-b-2 border-border text-xs text-gray-500">
                  <th class="text-left px-2 py-1">Date</th>
                  <th class="text-left px-2 py-1">Description</th>
                  <th class="text-left px-2 py-1">Category</th>
                  <th class="text-right px-2 py-1">Amount</th>
                </tr></thead>
                <tbody>
                  {txns.slice(0, 20).map((t, ti) => <TransactionRow key={ti} txn={t} />)}
                  {txns.length > 20 && <tr><td colSpan="4" class="text-xs text-gray-400 px-2 py-2">+ {txns.length - 20} more</td></tr>}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function AssetsReport({ report }) {
  if (!report?.links?.length) return null;
  const summary = report.summary;

  return (
    <div>
      {report.borrower && (
        <Section title="Borrower">
          <Row label="Name" value={`${report.borrower.first_name} ${report.borrower.last_name}`} />
          {report.borrower.email && <Row label="Email" value={report.borrower.email} />}
          {report.borrower.external_user_id && <Row label="External ID" value={report.borrower.external_user_id} />}
        </Section>
      )}

      {summary && (
        <Section title="Balance Summary">
          {summary.balance && <Row label="Total Balance" value={$(summary.balance)} />}
          {summary.avg_30 && <Row label="30-Day Avg" value={$(summary.avg_30)} />}
          {summary.avg_60 && <Row label="60-Day Avg" value={$(summary.avg_60)} />}
          {summary.avg_90 && <Row label="90-Day Avg" value={$(summary.avg_90)} />}
        </Section>
      )}

      {report.links.map((link, li) => (
        <div key={li}>
          <ProviderHeader name={link.provider_name || link.provider || 'Bank'} />
          {link.accounts?.map((acct, ai) => <AccountCard key={ai} acct={acct} />)}
        </div>
      ))}

      <Row label="Report Period" value={`${report.days_requested} days as of ${report.as_of_date}`} />
      <Row label="Large Deposit Threshold" value={$(report.large_deposit_threshold)} />
    </div>
  );
}

// --- Income Insights Report ---

function IncomeInsightsReport({ report }) {
  if (!report) return null;
  const summary = report.bank_income_summary;

  return (
    <div>
      {summary && (
        <Section title="Income Summary">
          {summary.start_date && <Row label="Period" value={`${summary.start_date} to ${summary.end_date}`} />}
          <Row label="Income Sources" value={String(summary.income_sources_count || 0)} />
          <Row label="Income Categories" value={String(summary.income_categories_count || 0)} />
          <Row label="Total Transactions" value={String(summary.income_transactions_count || 0)} />
          {summary.total_amounts?.length > 0 && <Row label="Total Income" value={summary.total_amounts.map(a => `${$(a.amount)} ${a.iso_currency_code}`).join(', ')} />}
          {summary.historical_average_monthly_income?.length > 0 && <Row label="Avg Monthly Income" value={summary.historical_average_monthly_income.map(a => `${$(a.amount)} ${a.iso_currency_code}`).join(', ')} />}
          {summary.forecasted_average_monthly_income?.length > 0 && <Row label="Forecasted Monthly" value={summary.forecasted_average_monthly_income.map(a => `${$(a.amount)} ${a.iso_currency_code}`).join(', ')} />}
          {summary.historical_annual_income?.length > 0 && <Row label="Annual Income" value={summary.historical_annual_income.map(a => `${$(a.amount)} ${a.iso_currency_code}`).join(', ')} />}
        </Section>
      )}

      {report.links?.map((link, li) => (
        <div key={li}>
          <Section title={link.provider_name || 'Source'}>
            {(link.bank_income_sources || []).map((src, si) => (
              <div key={si} class="border border-border rounded-lg mb-3 p-4">
                <Row label="Description" value={src.income_description || '-'} />
                <Row label="Category" value={(src.income_category || '').replace(/_/g, ' ')} />
                <Row label="Frequency" value={freq(src.pay_frequency)} />
                <Row label="Total" value={$(src.total_amount)} />
                <Row label="Avg Deposit" value={$(src.avg_deposit_amount)} />
                <Row label="Transactions" value={String(src.transaction_count || 0)} />
                {src.next_payment_date && <Row label="Next Payment" value={src.next_payment_date} />}
              </div>
            ))}
          </Section>
        </div>
      ))}
    </div>
  );
}

// --- Main Entry ---

export function OrderResults({ data }) {
  const hasVoie = data?.voie_report?.links?.length > 0;
  const hasAssets = data?.voa_report?.links?.length > 0;
  const hasInsights = !!data?.income_insights_report;
  const hasAny = hasVoie || hasAssets || hasInsights;

  if (!hasAny) {
    return (
      <Section title="Order Details">
        <Row label="Order ID" value={data?.truv_order_id || '-'} />
        <Row label="Status" value={data?.status || '-'} />
        <Row label="Product" value={data?.product_type || '-'} />
      </Section>
    );
  }

  return (
    <div>
      {hasVoie && <VoieReport report={data.voie_report} />}
      {hasAssets && <AssetsReport report={data.voa_report} />}
      {hasInsights && <IncomeInsightsReport report={data.income_insights_report} />}
    </div>
  );
}
