import { useState, useRef, useEffect } from 'preact/hooks';
import { Layout, usePanel, API_BASE } from '@shared/ui/index.js';

const STEPS = [
  { title: 'Upload', guide: '<p>Upload employment documents (pay stubs, W-2s, tax returns). Supported formats: PDF, JPEG, PNG, TIFF.</p><pre>POST /v1/documents/collections/\n{\n  "documents": [{ "filename": "...", "content": "base64..." }]\n}</pre>' },
  { title: 'Processing', guide: '<p>Truv validates each document:</p><ul><li><code>is_valid</code> — recognized document type</li><li><code>is_readable</code> — text is extractable</li><li><code>document_type</code> — paystub, w2, etc.</li></ul><p>Poll the collection status until all documents are processed.</p>' },
  { title: 'Finalize', guide: '<p>Once validated, finalize the collection to extract structured data:</p><pre>POST /v1/documents/collections/{id}/finalize/</pre>' },
  { title: 'Review', guide: '<p>Fetch the extracted data:</p><pre>GET /v1/documents/collections/{id}/finalize/</pre><p>Returns parsed fields: employer name, pay period, gross/net pay, tax withholdings, etc.</p>' },
];

function formatSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / 1048576).toFixed(1) + ' MB';
}

export function UploadDocumentsDemo() {
  const [screen, setScreen] = useState('upload');
  const [files, setFiles] = useState([]);
  const [collectionId, setCollectionId] = useState(null);
  const [collectionData, setCollectionData] = useState(null);
  const [resultsData, setResultsData] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [finalizing, setFinalizing] = useState(false);

  const pollRef = useRef(null);
  const { panel, setCurrentStep } = usePanel();

  // Poll collection status
  useEffect(() => {
    if (screen !== 'processing' || !collectionId) return;
    const poll = async () => {
      try {
        const resp = await fetch(`${API_BASE}/api/collections/${collectionId}`);
        const data = await resp.json();
        setCollectionData(data);
        if (data.status === 'completed') { clearInterval(pollRef.current); pollRef.current = null; }
      } catch {}
    };
    poll();
    pollRef.current = setInterval(poll, 3000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [screen, collectionId]);

  function addFiles(newFiles) {
    const fileList = Array.from(newFiles);
    fileList.forEach(file => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result.split(',')[1];
        setFiles(prev => [...prev, { name: file.name, size: file.size, type: file.type, base64 }]);
      };
      reader.readAsDataURL(file);
    });
  }

  function removeFile(idx) { setFiles(prev => prev.filter((_, i) => i !== idx)); }

  async function uploadFiles() {
    setUploading(true);
    try {
      const documents = files.map(f => ({ filename: f.name, content: f.base64 }));
      const resp = await fetch(`${API_BASE}/api/collections`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documents }),
      });
      const data = await resp.json();
      if (!resp.ok) { alert('Error: ' + (data.error || 'Unknown')); setUploading(false); return; }

      setCollectionId(data.collection_id);
      setCurrentStep(1);
      setScreen('processing');
    } catch (e) { console.error(e); }
    setUploading(false);
  }

  async function finalize() {
    setFinalizing(true);
    try {
      await fetch(`${API_BASE}/api/collections/${collectionId}/finalize`, { method: 'POST' });
      setCurrentStep(3);
      setScreen('review');

      // Poll for results
      const pollResults = async () => {
        const resp = await fetch(`${API_BASE}/api/collections/${collectionId}/results`);
        const data = await resp.json();
        setResultsData(data);
        if (data.status !== 'completed') setTimeout(pollResults, 3000);
      };
      setTimeout(pollResults, 2000);
    } catch (e) { console.error(e); }
    setFinalizing(false);
  }

  function resetDemo() {
    if (pollRef.current) clearInterval(pollRef.current);
    setScreen('upload');
    setFiles([]);
    setCollectionId(null);
    setCollectionData(null);
    setResultsData(null);
    setCurrentStep(0);
  }

  return (
    <Layout title="Truv Quickstart" badge="Upload Documents" steps={STEPS} panel={panel}>
      <div class="max-w-xl mx-auto">
        {screen === 'upload' && (
          <UploadScreen files={files} onAdd={addFiles} onRemove={removeFile} onUpload={uploadFiles} uploading={uploading} />
        )}
        {screen === 'processing' && (
          <ProcessingScreen data={collectionData} onContinue={() => { setCurrentStep(2); setScreen('finalize'); }} />
        )}
        {screen === 'finalize' && (
          <FinalizeScreen onFinalize={finalize} finalizing={finalizing} />
        )}
        {screen === 'review' && (
          <ReviewScreen data={resultsData} onReset={resetDemo} />
        )}
      </div>
    </Layout>
  );
}

function UploadScreen({ files, onAdd, onRemove, onUpload, uploading }) {
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef(null);

  return (
    <div>
      <h2 class="text-2xl font-bold tracking-tight mb-1.5">Upload Documents</h2>
      <p class="text-sm text-gray-500 mb-7">Upload pay stubs, W-2s, or tax returns for verification.</p>

      <div
        class={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all mb-4 ${dragOver ? 'border-primary bg-primary-light' : 'border-gray-200 hover:border-primary'}`}
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={e => { e.preventDefault(); setDragOver(false); onAdd(e.dataTransfer.files); }}
        onClick={() => inputRef.current?.click()}
      >
        <div class="text-4xl mb-3">📁</div>
        <div class="text-sm font-semibold mb-1">Drop files here or click to browse</div>
        <div class="text-xs text-gray-400">PDF, JPEG, PNG, TIFF — up to 100MB</div>
        <input ref={inputRef} type="file" multiple accept=".pdf,.jpg,.jpeg,.png,.tiff,.tif" class="hidden" onChange={e => onAdd(e.target.files)} />
      </div>

      {files.length > 0 && (
        <div class="mb-6">
          {files.map((f, i) => (
            <div key={i} class="flex items-center gap-3 px-4 py-2.5 border border-gray-200 rounded-lg mb-2">
              <span class="text-lg">📄</span>
              <div class="flex-1 min-w-0">
                <div class="text-sm font-medium truncate">{f.name}</div>
                <div class="text-xs text-gray-400">{formatSize(f.size)}</div>
              </div>
              <button onClick={() => onRemove(i)} class="text-gray-400 hover:text-error text-lg">×</button>
            </div>
          ))}
        </div>
      )}

      <button onClick={onUpload} disabled={files.length === 0 || uploading} class="w-full py-3 bg-primary text-white font-semibold rounded-lg hover:bg-primary-hover disabled:opacity-40">
        {uploading ? 'Uploading...' : `Upload & Process (${files.length})`}
      </button>
    </div>
  );
}

function ProcessingScreen({ data, onContinue }) {
  const raw = data?.raw_response || {};
  const docs = raw.documents || [];
  const isComplete = data?.status === 'completed';

  return (
    <div>
      <h2 class="text-2xl font-bold tracking-tight mb-1.5">Processing</h2>
      <p class="text-sm text-gray-500 mb-7">Validating uploaded documents...</p>

      <div class="border border-gray-200 rounded-xl p-4 mb-6">
        <div class="flex items-center justify-between mb-3">
          <span class="text-sm font-medium">Collection</span>
          <span class={`text-xs font-semibold px-2 py-0.5 rounded ${isComplete ? 'text-success bg-success-bg' : 'text-warning bg-warning-bg'}`}>
            {data?.status || 'processing'}
          </span>
        </div>
        {docs.map((doc, i) => (
          <div key={i} class="flex items-center gap-3 py-2 border-t border-gray-100 text-sm">
            <span class={doc.is_valid ? 'text-success' : 'text-error'}>{doc.is_valid ? '✓' : '✗'}</span>
            <span class="flex-1 truncate">{doc.filename || `Document ${i + 1}`}</span>
            <span class="text-xs text-gray-400">{doc.document_type || '-'}</span>
          </div>
        ))}
      </div>

      {!isComplete && (
        <div class="flex items-center justify-center gap-2 text-sm text-gray-400 mb-4">
          <div class="w-4 h-4 border-2 border-gray-200 border-t-primary rounded-full animate-spin" />
          Polling every 3 seconds...
        </div>
      )}

      <button onClick={onContinue} disabled={!isComplete} class="w-full py-3 bg-primary text-white font-semibold rounded-lg hover:bg-primary-hover disabled:opacity-40">
        Continue to Finalize
      </button>
    </div>
  );
}

function FinalizeScreen({ onFinalize, finalizing }) {
  return (
    <div class="text-center py-12">
      <h2 class="text-2xl font-bold tracking-tight mb-2">Finalize & Extract</h2>
      <p class="text-sm text-gray-500 mb-8">Documents validated. Click below to extract structured data.</p>
      <button onClick={onFinalize} disabled={finalizing} class="px-8 py-3 bg-primary text-white font-semibold rounded-lg hover:bg-primary-hover disabled:opacity-40">
        {finalizing ? 'Finalizing...' : 'Finalize & Extract Data'}
      </button>
    </div>
  );
}

function ReviewScreen({ data, onReset }) {
  if (!data || data.status !== 'completed') {
    return (
      <div class="text-center py-12">
        <div class="w-10 h-10 border-3 border-gray-200 border-t-primary rounded-full animate-spin mx-auto mb-4" />
        <p class="text-sm text-gray-500">Extracting data...</p>
      </div>
    );
  }

  const docs = data.documents || [];
  return (
    <div>
      <h2 class="text-2xl font-bold tracking-tight mb-1.5">Extracted Data</h2>
      <p class="text-sm text-gray-500 mb-7">{docs.length} document{docs.length !== 1 ? 's' : ''} processed</p>

      {docs.map((doc, i) => (
        <div key={i} class="border border-gray-200 rounded-xl mb-4 overflow-hidden">
          <div class="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
            <span class="text-sm font-semibold">{doc.document_type || `Document ${i + 1}`}</span>
            <span class={`text-xs font-semibold px-2 py-0.5 rounded ${doc.is_valid ? 'text-success bg-success-bg' : 'text-error bg-red-50'}`}>
              {doc.is_valid ? 'Valid' : 'Invalid'}
            </span>
          </div>
          <div class="p-4">
            {doc.parsed_data ? (
              Object.entries(doc.parsed_data).map(([key, val]) => (
                <div key={key} class="grid grid-cols-[180px_1fr] border-b border-gray-100 last:border-0">
                  <div class="py-2 text-sm text-gray-500 font-medium">{key.replace(/_/g, ' ')}</div>
                  <div class="py-2 text-sm font-semibold">{typeof val === 'object' ? JSON.stringify(val) : String(val)}</div>
                </div>
              ))
            ) : (
              <pre class="text-xs font-mono text-gray-500 whitespace-pre-wrap">{JSON.stringify(doc, null, 2)}</pre>
            )}
          </div>
        </div>
      ))}

      <div class="flex gap-3 mt-6 pt-5 border-t border-gray-200">
        <button class="px-5 py-2.5 text-sm font-semibold border border-gray-200 rounded-lg hover:border-primary hover:text-primary" onClick={onReset}>Upload More</button>
      </div>
    </div>
  );
}
