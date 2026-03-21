import { useState } from 'preact/hooks';

const $ = (n) => '$' + Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const freq = (f) => ({ BW: 'Biweekly', W: 'Weekly', M: 'Monthly', SM: 'Semi-Monthly', A: 'Annual' }[f] || f);

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
      <div class="ml-auto"><StatusBadge status={status} /></div>
    </div>
  );
}

// --- Employment / Income ---

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
          <div class="mb-3">
            <Row label="Period" value={`${st.period_start || ''} to ${st.period_end || ''}`} />
            <Row label="Hours" value={st.hours || '-'} />
            <Row label="Regular" value={st.regular ? $(st.regular) : '-'} />
            <Row label="Overtime" value={st.overtime ? $(st.overtime) : '-'} />
          </div>
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

function EmployerResults({ emp }) {
  const employment = emp.employments?.[0] || {};
  const profile = employment.profile || {};
  const company = employment.company || {};
  const stmts = employment.statements || [];
  const annualSummary = employment.annual_income_summary || [];
  const bankAccounts = employment.bank_accounts || [];
  const w2s = employment.w2s || [];
  const logoUrl = emp.company_logo || emp.provider?.logo_url || '';
  const meta = [emp.provider ? `via ${emp.provider.name}` : '', emp.data_source].filter(Boolean).join(' • ');

  return (
    <div>
      <ProviderHeader name={emp.company_name || company.name || 'Employer'} logoUrl={logoUrl} meta={meta} status={emp.status || '-'} />

      {profile.first_name && (
        <Section title="Profile">
          <Row label="Full Name" value={profile.full_name || `${profile.first_name} ${profile.last_name}`} />
          {profile.email && <Row label="Email" value={profile.email} />}
          {profile.date_of_birth && <Row label="Date of Birth" value={profile.date_of_birth} />}
          {profile.ssn && <Row label="SSN" value={profile.ssn.replace(/^(\d{3})(\d{2})(\d{4})$/, '$1-$2-$3')} />}
          {profile.home_address && <Row label="Address" value={[profile.home_address.street, profile.home_address.city, profile.home_address.state, profile.home_address.zip].filter(Boolean).join(', ')} />}
        </Section>
      )}

      {employment.job_title && (
        <Section title="Employment">
          <Row label="Job Title" value={employment.job_title} />
          <Row label="Job Type" value={employment.job_type === 'F' ? 'Full-time' : employment.job_type === 'P' ? 'Part-time' : employment.job_type || '-'} />
          <Row label="Status" value={employment.is_active ? 'Active' : 'Inactive'} />
          <Row label="Start Date" value={employment.start_date || '-'} />
          {employment.end_date && <Row label="End Date" value={employment.end_date} />}
          {employment.original_hire_date && <Row label="Original Hire Date" value={employment.original_hire_date} />}
          {employment.employed_in_role && <Row label="Tenure" value={employment.employed_in_role} />}
          {employment.manager_name && <Row label="Manager" value={employment.manager_name} />}
          {employment.income && <Row label="Annual Income" value={$(employment.income)} />}
          {employment.pay_rate && <Row label="Pay Rate" value={`${$(employment.pay_rate)} ${freq(employment.pay_frequency)}`} />}
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
        <Section title={`Pay Statements (${stmts.length} total)`}>
          {stmts.slice(0, 3).map((st, i) => <PayStatement key={i} st={st} />)}
          {stmts.length > 3 && <p class="text-xs text-gray-400">+ {stmts.length - 3} more statements available in API response</p>}
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
}

// --- Assets / VOA ---

function VoaAccountCard({ acct }) {
  const bal = acct.balances || {};
  const acctType = (acct.type || '').charAt(0) + (acct.type || '').slice(1).toLowerCase();
  const txns = acct.transactions || [];

  return (
    <div class="border border-border rounded-lg mb-3 overflow-hidden">
      <div class="flex items-center justify-between px-4 py-3 bg-border-light">
        <div class="font-semibold text-sm">{acctType} •••• {acct.mask || ''}</div>
        {bal.balance != null && <div class="text-sm font-semibold">{$(bal.balance)}</div>}
      </div>
      <div class="px-4 py-3">
        {bal.available_balance != null && <Row label="Available Balance" value={$(bal.available_balance)} />}
        {bal.balance != null && <Row label="Current Balance" value={$(bal.balance)} />}
        {bal.credit_limit != null && <Row label="Credit Limit" value={$(bal.credit_limit)} />}
        {acct.owners?.length > 0 && <Row label="Owner" value={acct.owners.map(o => `${o.full_name || ''}${o.relation_type ? ` (${o.relation_type.toLowerCase()})` : ''}`).join(', ')} />}
        {acct.nsf != null && <Row label="NSF Count" value={String(acct.nsf)} />}
        {txns.length > 0 && <Row label="Transactions" value={`${txns.length} total`} />}
      </div>
    </div>
  );
}

function FinancialAccountResults({ fa, voaReport }) {
  const provider = fa.provider || {};
  const voaAccounts = (voaReport?.links || []).flatMap(l => l.accounts || []);

  return (
    <div>
      <ProviderHeader
        name={provider.name || 'Financial Institution'}
        logoUrl={provider.logo_url}
        meta={fa.data_source?.replace(/_/g, ' ')}
        status={fa.status || '-'}
      />

      {voaAccounts.length > 0 ? (
        <>
          {voaReport.summary && (
            <Section title="Balance Summary">
              {voaReport.summary.balance != null && <Row label="Total Balance" value={$(voaReport.summary.balance)} />}
              {voaReport.summary.avg_30 != null && <Row label="30-Day Avg Balance" value={$(voaReport.summary.avg_30)} />}
              {voaReport.summary.avg_60 != null && <Row label="60-Day Avg Balance" value={$(voaReport.summary.avg_60)} />}
              {voaReport.summary.avg_90 != null && <Row label="90-Day Avg Balance" value={$(voaReport.summary.avg_90)} />}
            </Section>
          )}
          <Section title={`Accounts (${voaAccounts.length})`}>
            {voaAccounts.map((acct, i) => <VoaAccountCard key={i} acct={acct} />)}
          </Section>
        </>
      ) : (
        fa.accounts?.length > 0 && (
          <Section title={`Accounts (${fa.accounts.length})`}>
            {fa.accounts.map((acct, i) => {
              const t = (acct.type || '').charAt(0) + (acct.type || '').slice(1).toLowerCase();
              return <Row key={i} label={`${t}${acct.subtype ? ` (${acct.subtype})` : ''}`} value={`•••• ${acct.mask || ''}`} />;
            })}
          </Section>
        )
      )}
    </div>
  );
}

// --- Main Entry ---

export function OrderResults({ data }) {
  const raw = data?.raw_response || {};
  const employers = raw.employers || [];
  const financialAccounts = raw.financial_accounts || (raw.bank ? [raw.bank] : []);
  const hasEmployers = employers.length > 0;
  const hasFinancial = financialAccounts.length > 0;

  // VOIE report overrides employers if available
  if (data?.voie_report?.links?.length > 0) {
    const voieEmployers = data.voie_report.links.flatMap(link =>
      (link.employments || []).map(emp => ({
        company_name: link.provider_name || link.provider?.name || 'Employer',
        company_logo: link.provider?.logo_url,
        provider: link.provider,
        data_source: link.data_source,
        status: 'completed',
        employments: [emp],
      }))
    );
    return (
      <div>
        {voieEmployers.map((emp, i) => <EmployerResults key={i} emp={emp} />)}
        {hasFinancial && financialAccounts.map((fa, i) => <FinancialAccountResults key={i} fa={fa} voaReport={data.voa_report} />)}
      </div>
    );
  }

  if (!hasEmployers && !hasFinancial) {
    return (
      <Section title="Order Details">
        <Row label="Order ID" value={data?.truv_order_id || '-'} />
        <Row label="Status" value={data?.status || '-'} />
        <Row label="Product" value={raw.verification_type || '-'} />
      </Section>
    );
  }

  return (
    <div>
      {employers.map((emp, i) => <EmployerResults key={i} emp={emp} />)}
      {financialAccounts.map((fa, i) => <FinancialAccountResults key={i} fa={fa} voaReport={data?.voa_report} />)}
    </div>
  );
}
