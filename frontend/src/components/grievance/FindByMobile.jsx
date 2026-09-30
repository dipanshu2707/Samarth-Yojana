import React, { useState } from 'react';
import { Search, Smartphone, RefreshCw, Inbox } from 'lucide-react';
import { fetchGrievancesByMobile } from '../../api/client';
import TicketDossier from './TicketDossier';

export default function FindByMobile({ language = 'en' }) {
  const [mobile, setMobile] = useState('');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searched, setSearched] = useState(false);

  const runSearch = async (e) => {
    if (e) e.preventDefault();
    setError('');
    setSearched(false);
    if (!mobile.replace(/\D/g, '')) {
      setError(language === 'hi' ? 'कृपया 10 अंकों का मोबाइल नंबर लिखें।' : 'Please enter your 10-digit mobile number.');
      return;
    }
    setLoading(true);
    try {
      const res = await fetchGrievancesByMobile(mobile);
      setItems(res.grievances || []);
      setSearched(true);
    } catch (err) {
      setError(err.message);
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm">
        <div className="flex items-center gap-2 mb-1">
          <Smartphone className="w-5 h-5 text-indigo-600" />
          <h3 className="font-bold text-slate-900">{language === 'hi' ? 'मोबाइल से अपनी शिकायतें खोजें' : 'Find my complaints by mobile number'}</h3>
        </div>
        <p className="text-xs text-slate-500 mb-4">
          {language === 'hi'
            ? 'जिस नंबर से शिकायत दर्ज की थी, वही नंबर लिखें — सभी शिकायतें स्थिति व कार्रवाई सहित दिखेंगी।'
            : 'Enter the same number used while filing — every complaint with live status and officer actions will appear.'}
        </p>
        <form onSubmit={runSearch} className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              value={mobile}
              onChange={(e) => setMobile(e.target.value)}
              placeholder={language === 'hi' ? '10 अंकों का मोबाइल नंबर' : '10-digit mobile number'}
              inputMode="numeric"
              className="w-full pl-12 pr-4 py-3 rounded-2xl border border-slate-200 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={() => setMobile('9826011223')} className="px-3 py-3 bg-slate-100 hover:bg-slate-200 rounded-2xl text-xs font-mono font-bold text-slate-600">
              98260 11223
            </button>
            <button type="button" onClick={() => setMobile('9425098765')} className="px-3 py-3 bg-slate-100 hover:bg-slate-200 rounded-2xl text-xs font-mono font-bold text-slate-600">
              94250 98765
            </button>
            <button type="submit" disabled={loading} className="py-3 px-6 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-sm font-bold flex items-center gap-2 disabled:opacity-50">
              {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              {language === 'hi' ? 'खोजें' : 'Search'}
            </button>
          </div>
        </form>
        {error && <p className="mt-3 text-xs text-rose-600 font-semibold">{error}</p>}
      </div>

      {searched && (
        <div className="flex items-center justify-between text-xs text-slate-500 px-1">
          <span><strong className="text-slate-800">{items.length}</strong> {language === 'hi' ? 'शिकायतें मिलीं' : 'complaint(s) found'}</span>
          <span className="font-mono">+91-XXXXX-{mobile.replace(/\D/g, '').slice(-4)}</span>
        </div>
      )}

      {items.length === 0 && searched && !error && (
        <div className="bg-white rounded-3xl border border-dashed border-slate-300 p-10 text-center text-slate-400">
          <Inbox className="w-10 h-10 mx-auto mb-2" />
          <p className="text-sm font-semibold">No records for this number yet.</p>
        </div>
      )}

      <div className="space-y-5">
        {items.map((t) => <TicketDossier key={t.ticket_id} ticket={t} language={language} />)}
      </div>
    </div>
  );
}
