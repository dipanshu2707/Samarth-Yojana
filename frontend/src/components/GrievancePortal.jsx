import React, { useEffect, useRef, useState } from 'react';
import {
  Building2, Sparkles, ShieldCheck, ArrowRight, Search, RefreshCw,
  MapPin, Flame, PhoneCall,
} from 'lucide-react';
import FileGrievanceForm from './grievance/FileGrievanceForm';
import FindByMobile from './grievance/FindByMobile';
import OfficerDesk from './grievance/OfficerDesk';
import TicketDossier from './grievance/TicketDossier';
import MpHeatmap from './grievance/MpHeatmap';
import ServerWakeButton from './grievance/ServerWakeButton';
import { trackGrievance, fetchHotspots, listGrievances } from '../api/client';

export default function GrievancePortal({ language = 'en', onSwitchToYojana, officerSignal = 0 }) {
  const [activeTab, setActiveTab] = useState('file');
  const lastSignal = useRef(0);
  const [lastFiled, setLastFiled] = useState(null);

  const [ticketInput, setTicketInput] = useState('');
  const [tracked, setTracked] = useState(null);
  const [trackLoading, setTrackLoading] = useState(false);
  const [trackError, setTrackError] = useState('');

  const [hotspots, setHotspots] = useState([]);
  const [hotspotFilter, setHotspotFilter] = useState('all');
  const [recentCount, setRecentCount] = useState(0);
  const [loadError, setLoadError] = useState('');
  const [hotspotCases, setHotspotCases] = useState([]);
  const [hotspotsRefreshing, setHotspotsRefreshing] = useState(false);
  const [hotspotsUpdatedAt, setHotspotsUpdatedAt] = useState('');

  const loadHotspotData = async (silent = false) => {
    if (!silent) setHotspotsRefreshing(true);
    try {
      const [hot, list] = await Promise.all([fetchHotspots(), listGrievances()]);
      setHotspots(hot || []);
      setHotspotCases((list && list.grievances) || []);
      setRecentCount((list && list.total) || 0);
      setLoadError('');
      setHotspotsUpdatedAt(new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    } catch (err) {
      if (!silent) setLoadError(err.message);
    } finally {
      setHotspotsRefreshing(false);
    }
  };

  useEffect(() => {
    loadHotspotData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // While the heatmap tab is open, re-pull live data every 15s so a newly
  // filed complaint appears on the map without a page reload.
  useEffect(() => {
    if (activeTab !== 'hotspots') return undefined;
    loadHotspotData(true);
    const timer = setInterval(() => loadHotspotData(true), 15000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  // Deep-link from the header "Authority Sign In" button.
  useEffect(() => {
    if (officerSignal > lastSignal.current) {
      lastSignal.current = officerSignal;
      setActiveTab('officer');
      setTimeout(() => document.getElementById('authority-login')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
    }
  }, [officerSignal]);

  const runTrack = async (e, preset) => {
    if (e) e.preventDefault();
    const id = (preset || ticketInput).trim();
    if (!id) return;
    setTrackLoading(true);
    setTrackError('');
    try {
      const res = await trackGrievance(id);
      setTracked(res);
      setTicketInput(res.ticket_id);
    } catch (err) {
      setTrackError(err.message);
      setTracked(null);
    } finally {
      setTrackLoading(false);
    }
  };

  const filteredHotspots = hotspots.filter((h) => {
    if (hotspotFilter === 'rural') return h.rural_count > h.urban_count;
    if (hotspotFilter === 'urban') return h.urban_count >= h.rural_count;
    if (hotspotFilter === 'critical') return h.critical_count > 0;
    return true;
  });

  const t = {
    title: language === 'hi'
      ? 'म.प्र. मुख्यमंत्री ऑनलाइन जन-शिकायत निवारण पोर्टल'
      : 'MP CM Online — Civic Grievance Redressal Portal',
    subtitle: language === 'hi'
      ? 'विभाग चुनें • फोटो/आवाज़ साक्ष्य जोड़ें • मोबाइल से ट्रैक करें • प्राधिकारी कार्रवाई सहित'
      : 'Pick a department • attach photo/voice proof • track by mobile • follow officer actions live',
    tabFile: language === 'hi' ? '📝 शिकायत दर्ज करें' : '📝 File Complaint',
    tabMobile: language === 'hi' ? '📱 मोबाइल से खोजें' : '📱 Find by Mobile',
    tabTrack: language === 'hi' ? '🔍 टिकट से ट्रैक' : '🔍 Track by Ticket',
    tabHotspots: language === 'hi' ? '📊 हॉटस्पॉट' : '📊 Hotspots',
    tabOfficer: language === 'hi' ? '🛡️ प्राधिकारी डेस्क' : '🛡️ Authority Desk',
  };

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 sm:p-8 shadow-xl border border-slate-800">
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-3xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-400/20 text-amber-300 border border-amber-400/30">
                <Sparkles className="w-3.5 h-3.5 text-amber-300" /> MP CM Online • जन सेवा
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                <ShieldCheck className="w-3.5 h-3.5" /> 3-Tier Redressal (L1 ➔ L2 ➔ L3)
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-sky-500/20 text-sky-300 border border-sky-500/30">
                <PhoneCall className="w-3.5 h-3.5" /> Helpline 181
              </span>
              <ServerWakeButton language={language} compact />
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">{t.title}</h1>
            <p className="text-sm sm:text-base text-slate-300">{t.subtitle}</p>
          </div>
          <div className="flex-shrink-0 bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/10 text-center space-y-2">
            <p className="text-xs text-slate-300">Need Scheme Assistance?</p>
            <button onClick={onSwitchToYojana} className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl text-xs font-bold">
              <span>योजना साथी</span> <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
        <div className="relative z-10 grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-slate-800/80 text-xs text-slate-300">
          <span><strong>① File:</strong> dept + photo/voice</span>
          <span><strong>② Track:</strong> mobile number</span>
          <span><strong>③ Action:</strong> desk remarks</span>
          <span><strong>④ Apex:</strong> {recentCount} cases live</span>
        </div>
        {loadError && (
          <p className="relative z-10 mt-3 text-[11px] font-semibold text-amber-300 bg-white/10 border border-white/15 rounded-xl px-3 py-2">
            Live data failed: {loadError}. Check that the backend API is running.
          </p>
        )}
      </div>

      <div className="flex items-center gap-2 p-1.5 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-x-auto">
        {[
          { id: 'file', label: t.tabFile },
          { id: 'mobile', label: t.tabMobile },
          { id: 'track', label: t.tabTrack },
          { id: 'hotspots', label: t.tabHotspots },
          { id: 'officer', label: t.tabOfficer },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 min-w-[140px] py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold transition-all ${activeTab === tab.id ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-50'}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'file' && (
        <FileGrievanceForm
          language={language}
          onFiled={(ticket) => {
            setLastFiled(ticket);
            setTracked(ticket);
            setTicketInput(ticket.ticket_id);
            loadHotspotData(true);
          }}
        />
      )}

      {activeTab === 'mobile' && <FindByMobile language={language} />}

      {activeTab === 'track' && (
        <div className="space-y-5">
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm">
            <form onSubmit={(e) => runTrack(e)} className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1 relative">
                <Search className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                <input
                  value={ticketInput}
                  onChange={(e) => setTicketInput(e.target.value)}
                  placeholder="Ticket ID (e.g. MP-CMO-2026-XXXXX)"
                  className="w-full pl-12 pr-4 py-3 rounded-2xl border border-slate-200 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <button type="submit" disabled={trackLoading} className="py-3 px-6 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50">
                {trackLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                {language === 'hi' ? 'ट्रैक करें' : 'Track'}
              </button>
            </form>
            {lastFiled && (
              <button onClick={() => runTrack(null, lastFiled.ticket_id)} className="mt-3 text-xs font-mono text-indigo-700 hover:underline">
                Recently filed: {lastFiled.ticket_id} — open
              </button>
            )}
            {trackError && <p className="mt-3 text-xs text-rose-600 font-semibold">{trackError}</p>}
          </div>
          {tracked && <TicketDossier ticket={tracked} language={language} />}
          {!tracked && !trackError && (
            <div className="bg-white rounded-3xl border border-dashed border-slate-300 p-10 text-center text-slate-400 text-sm">
              <Building2 className="w-8 h-8 mx-auto mb-2" />
              Enter a ticket ID to view department, officer remarks, escalation tier and full timeline.
            </div>
          )}
        </div>
      )}

      {activeTab === 'hotspots' && (
        <div className="space-y-5">
          <MpHeatmap
            language={language}
            cases={hotspotCases}
            hotspots={hotspots}
            districtFilter={hotspotFilter}
            updatedAt={hotspotsUpdatedAt}
            refreshing={hotspotsRefreshing}
            onRefresh={() => loadHotspotData()}
          />
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2"><Flame className="w-5 h-5 text-amber-500" /> District complaint heatmap</h3>
              <p className="text-xs text-slate-500">Volume, critical hazards and L2/L3 escalation load per district.</p>
            </div>
            <div className="flex gap-1.5 bg-slate-100 p-1 rounded-xl text-xs">
              {['all', 'critical', 'rural', 'urban'].map((f) => (
                <button key={f} onClick={() => setHotspotFilter(f)} className={`px-3 py-1.5 rounded-lg font-bold capitalize ${hotspotFilter === f ? 'bg-white shadow' : 'text-slate-600'}`}>{f}</button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredHotspots.map((h) => (
              <div key={h.district} className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm flex items-center gap-1.5"><MapPin className="w-4 h-4 text-indigo-600" />{h.district}</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${h.hotspot_intensity === 'Severe' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'}`}>{h.hotspot_intensity}</span>
                </div>
                <div className="text-xs text-slate-500 space-y-1">
                  <div className="flex justify-between"><span>Primary burden:</span><strong className="text-slate-800">{h.primary_category}</strong></div>
                  <div className="flex justify-between"><span>Total:</span><strong className="text-indigo-700">{h.total_complaints}</strong></div>
                  <div className="flex justify-between"><span>Rural / Urban:</span><span>{h.rural_count} / {h.urban_count}</span></div>
                  <div className="flex justify-between"><span>L2 / L3 active:</span><span>{h.active_escalated_l2} / {h.active_escalated_l3}</span></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'officer' && <OfficerDesk language={language} />}
    </div>
  );
}
