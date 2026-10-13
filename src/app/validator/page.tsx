'use client';

import { useState } from 'react';
import { Mail, CheckCircle, XCircle, Copy, Loader2, AlertCircle, Download } from 'lucide-react';

export default function ValidatorPage() {
  const [inputEmails, setInputEmails] = useState('');
  const [validEmails, setValidEmails] = useState<string[]>([]);
  const [invalidEmails, setInvalidEmails] = useState<{email: string, reason: string}[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasValidated, setHasValidated] = useState(false);
  const [progress, setProgress] = useState(0);

  async function handleValidate() {
    if (!inputEmails.trim()) return;
    setLoading(true);
    setHasValidated(false);
    setProgress(0);

    // Extract all potential emails using regex
    const rawList = inputEmails.split(/[\s,;]+/).map(e => e.trim()).filter(e => e);
    
    // Remove duplicates
    const uniqueList = [...new Set(rawList)];

    const valid: string[] = [];
    const invalid: {email: string, reason: string}[] = [];

    // Basic regex for format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    const BATCH_SIZE = 100;

    for (let i = 0; i < uniqueList.length; i += BATCH_SIZE) {
      const batch = uniqueList.slice(i, i + BATCH_SIZE);
      
      const toCheck: string[] = [];
      batch.forEach((email) => {
        if (!emailRegex.test(email)) {
          invalid.push({ email, reason: 'Invalid format' });
        } else {
          toCheck.push(email);
        }
      });

      if (toCheck.length > 0) {
        try {
          const res = await fetch('/api/validate-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ emails: toCheck })
          });
          const data = await res.json();
          
          if (data.results) {
            data.results.forEach((r: any) => {
              if (r.valid) {
                valid.push(r.email);
              } else {
                invalid.push({ email: r.email, reason: r.reason || 'Domain has no mail server' });
              }
            });
          }
        } catch (err) {
          // Fallback if API fails
          toCheck.forEach(e => valid.push(e));
        }
      }

      setProgress(Math.min(100, Math.round(((i + batch.length) / uniqueList.length) * 100)));
      // Update intermediate state to show live progress
      setValidEmails([...valid]);
      setInvalidEmails([...invalid]);
    }

    setValidEmails(valid);
    setInvalidEmails(invalid);
    setLoading(false);
    setHasValidated(true);
    setProgress(100);
  }

  function copyValidEmails() {
    navigator.clipboard.writeText(validEmails.join(', '));
    alert('Copied valid emails to clipboard!');
  }

  function downloadValidEmails() {
    const element = document.createElement("a");
    const file = new Blob([validEmails.join('\n')], {type: 'text/plain'});
    element.href = URL.createObjectURL(file);
    element.download = "validated_emails.txt";
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  }

  return (
    <div className="max-w-5xl mx-auto pb-12">
      <div className="mb-8">
        <h2 className="text-3xl font-bold tracking-tight text-gray-900">Email Validator</h2>
        <p className="text-gray-500 mt-2">Clean your mailing lists. Removes duplicates, bad formats, and checks if the domain can receive emails.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm flex flex-col h-[600px]">
          <h3 className="text-lg font-bold mb-4 flex items-center">
            <Mail size={18} className="mr-2 text-blue-500" />
            Paste your emails
          </h3>
          <p className="text-sm text-gray-500 mb-4">You can paste raw text containing emails separated by spaces, commas, or new lines.</p>
          
          <textarea 
            value={inputEmails}
            onChange={e => setInputEmails(e.target.value)}
            className="flex-1 w-full border border-gray-200 rounded-xl p-4 text-sm focus:outline-none focus:border-black resize-none mb-4"
            placeholder="producer1@gmail.com, producer2@yahoo.com&#10;producer3@domain.com"
          />
          
          <button 
            onClick={handleValidate}
            disabled={loading || !inputEmails.trim()}
            className="w-full bg-black text-white rounded-xl py-3.5 text-sm font-semibold hover:bg-gray-800 transition-colors flex items-center justify-center disabled:opacity-70 shadow-md mb-2"
          >
            {loading ? <Loader2 size={18} className="animate-spin mr-2" /> : <CheckCircle size={18} className="mr-2" />}
            {loading ? `Validating... ${progress}%` : 'Validate List'}
          </button>
          
          {loading && (
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div className="bg-blue-600 h-2 rounded-full transition-all duration-300" style={{ width: `${progress}%` }}></div>
            </div>
          )}
        </div>

        <div className="bg-gray-50 border border-gray-200 rounded-2xl p-6 shadow-sm flex flex-col h-[600px] overflow-hidden">
          <h3 className="text-lg font-bold mb-4">Results</h3>
          
          {!hasValidated ? (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
              <Mail size={48} className="mb-4 opacity-20" />
              <p>Paste emails and run validation to see results here.</p>
            </div>
          ) : (
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="flex space-x-4 mb-4">
                <div className="flex-1 bg-green-50 border border-green-200 rounded-xl p-4 text-center">
                  <p className="text-green-800 text-sm font-semibold mb-1">Valid Emails</p>
                  <p className="text-3xl font-bold text-green-600">{validEmails.length}</p>
                </div>
                <div className="flex-1 bg-red-50 border border-red-200 rounded-xl p-4 text-center">
                  <p className="text-red-800 text-sm font-semibold mb-1">Invalid Emails</p>
                  <p className="text-3xl font-bold text-red-600">{invalidEmails.length}</p>
                </div>
              </div>

              {validEmails.length > 0 && (
                <div className="flex space-x-2 mb-4">
                  <button 
                    onClick={copyValidEmails}
                    className="flex-1 bg-white border border-gray-300 text-gray-700 rounded-xl py-2.5 text-sm font-semibold hover:bg-gray-50 transition-colors flex items-center justify-center shadow-sm"
                  >
                    <Copy size={16} className="mr-2" />
                    Copy Valid
                  </button>
                  <button 
                    onClick={downloadValidEmails}
                    className="flex-1 bg-white border border-gray-300 text-gray-700 rounded-xl py-2.5 text-sm font-semibold hover:bg-gray-50 transition-colors flex items-center justify-center shadow-sm"
                  >
                    <Download size={16} className="mr-2" />
                    Download .txt
                  </button>
                </div>
              )}

              <div className="flex-1 overflow-y-auto pr-2 space-y-4">
                {invalidEmails.length > 0 && (
                  <div>
                    <h4 className="text-xs font-bold text-red-500 uppercase tracking-wider mb-2 flex items-center">
                      <AlertCircle size={14} className="mr-1" /> Removed ({invalidEmails.length})
                    </h4>
                    <ul className="space-y-1">
                      {invalidEmails.map((item, idx) => (
                        <li key={idx} className="text-sm bg-white border border-red-100 rounded-lg p-2.5 flex justify-between items-center">
                          <span className="text-gray-700 truncate mr-2">{item.email}</span>
                          <span className="text-xs font-medium text-red-500 bg-red-50 px-2 py-0.5 rounded-md whitespace-nowrap">{item.reason}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {validEmails.length > 0 && (
                  <div>
                    <h4 className="text-xs font-bold text-green-600 uppercase tracking-wider mb-2 flex items-center">
                      <CheckCircle size={14} className="mr-1" /> Clean List ({validEmails.length})
                    </h4>
                    <ul className="space-y-1">
                      {validEmails.map((email, idx) => (
                        <li key={idx} className="text-sm bg-white border border-green-100 rounded-lg p-2.5 text-gray-700">
                          {email}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
