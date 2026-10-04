import React, { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import {
  Building2, ShieldCheck, Search, RefreshCw, FilePlus2,
  MapPin, Flame, PhoneCall, Smartphone, TicketCheck, MapPinned,
} from 'lucide-react';
import FileGrievanceForm from './grievance/FileGrievanceForm';
import FindByMobile from './grievance/FindByMobile';
import OfficerDesk from './grievance/OfficerDesk';
import TicketDossier from './grievance/TicketDossier';
import ServerWakeButton from './grievance/ServerWakeButton';
import { trackGrievance, fetchHotspots, listGrievances } from '../api/client';

const MpHeatmap = dynamic(() => import('./grievance/MpHeatmap'), {
  ssr: false,
  loading: () => <div className="h-[520px] animate-pulse bg-[#e8eeea]" aria-label="Loading complaint map" />,
});

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
      : 'MP CM Online grievance service',
    subtitle: language === 'hi'
      ? 'विभाग चुनें • फोटो/आवाज़ साक्ष्य जोड़ें • मोबाइल से ट्रैक करें • प्राधिकारी कार्रवाई सहित'
      : 'Submit a complaint with evidence, then follow every officer action.',
    tabFile: language === 'hi' ? 'शिकायत दर्ज करें' : 'File complaint',
    tabMobile: language === 'hi' ? 'मोबाइल से खोजें' : 'Find by mobile',
    tabTrack: language === 'hi' ? 'टिकट से ट्रैक' : 'Track a ticket',
    tabHotspots: language === 'hi' ? 'हॉटस्पॉट' : 'District hotspots',
    tabOfficer: language === 'hi' ? 'प्राधिकारी डेस्क' : 'Authority desk',
    openCases: language === 'hi' ? 'कुल शिकायतें' : 'Cases on record',
    serviceStandard: language === 'hi' ? 'तीन-स्तरीय शिकायत निवारण' : 'Three-level resolution process',
    fileAction: language === 'hi' ? 'शिकायत भेजें' : 'Start a complaint',
  };

  const serviceTabs = [
    { id: 'file', label: t.tabFile, icon: FilePlus2 },
    { id: 'mobile', label: t.tabMobile, icon: Smartphone },
    { id: 'track', label: t.tabTrack, icon: TicketCheck },
    { id: 'hotspots', label: t.tabHotspots, icon: MapPinned },
    { id: 'officer', label: t.tabOfficer, icon: ShieldCheck },
  ];

  return (
    <div className="space-y-5">
      <section className="overflow-hidden rounded-[28px] bg-[var(--color-ink)] p-5 text-white shadow-xl shadow-[#17243a]/10 sm:p-7 lg:p-8">
        <div className="grid gap-7 lg:grid-cols-[minmax(0,1fr)_270px] lg:items-center">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
              <span className="inline-flex items-center gap-1.5 font-bold text-[var(--color-sun)]">
                <Building2 className="h-3.5 w-3.5" /> MP CM Online / जन सेवा
              </span>
              <span className="inline-flex items-center gap-1.5 font-medium text-white/70">
                <ShieldCheck className="h-3.5 w-3.5 text-[var(--color-sea)]" /> {t.serviceStandard}
              </span>
              <ServerWakeButton language={language} compact />
            </div>
            <h1 className="mt-5 max-w-3xl text-[30px] font-bold leading-[1.1] sm:text-[38px]">{t.title}</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-white/65 sm:text-base">{t.subtitle}</p>
            <div className="mt-5 flex flex-wrap gap-2">
              <a href="tel:181" className="inline-flex min-h-10 items-center gap-2 rounded-full bg-[var(--color-sun)] px-4 text-xs font-bold text-[var(--color-ink)] transition-colors hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">
                <PhoneCall className="h-3.5 w-3.5" /> Helpline 181
              </a>
              <button onClick={onSwitchToYojana} className="inline-flex min-h-10 items-center gap-2 rounded-full border border-white/20 px-4 text-xs font-semibold text-white transition-colors hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">
                {language === 'hi' ? 'योजना साथी' : 'Explore welfare schemes'}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-[1fr_auto] items-end gap-3 rounded-3xl border border-white/10 bg-white/[0.07] p-5 lg:grid-cols-1 lg:items-start">
            <div>
              <p className="text-xs font-semibold text-white/55">{t.openCases}</p>
              <p className="mt-1 text-5xl font-bold tracking-normal text-white">{recentCount.toLocaleString('en-IN')}</p>
            </div>
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--color-sea)] text-white lg:mt-1">
              <TicketCheck className="h-5 w-5" aria-hidden="true" />
            </span>
            <div className="col-span-2 border-t border-white/10 pt-3 text-xs text-white/60 lg:col-span-1">
              {language === 'hi' ? 'अपनी शिकायत या हालिया कार्रवाई देखें।' : 'File a concern or check the latest action on a case.'}
              <button onClick={() => setActiveTab('file')} className="mt-3 inline-flex min-h-10 w-full items-center justify-center rounded-xl bg-white px-4 text-xs font-bold text-[var(--color-ink)] transition-colors hover:bg-[var(--color-sun)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">
                {t.fileAction}
              </button>
            </div>
          </div>
        </div>
        {loadError && (
          <p className="mt-4 rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-[11px] font-semibold text-[#f5cd78]">
            Live data failed: {loadError}. Check that the backend API is running.
          </p>
        )}
      </section>

      <nav aria-label={language === 'hi' ? 'शिकायत सेवाएं' : 'Grievance tasks'} className="flex gap-2 overflow-x-auto rounded-2xl border border-[#e1e7ef] bg-white p-2 shadow-sm shadow-[#17243a]/[0.03]">
        {serviceTabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            aria-current={activeTab === tab.id ? 'page' : undefined}
            className={`flex min-h-12 min-w-[128px] flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-xs font-bold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-blue)] sm:text-sm ${activeTab === tab.id ? 'bg-[var(--color-blue)] text-white shadow-md shadow-[var(--color-blue)]/20' : 'text-[#67778d] hover:bg-[var(--color-cloud)] hover:text-[var(--color-ink)]'}`}
          >
            <tab.icon className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span className="whitespace-nowrap">{tab.label}</span>
          </button>
        ))}
      </nav>

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
          <div className="rounded-[24px] border border-[#dce4ed] bg-white p-5 shadow-sm shadow-[#17243a]/[0.04] sm:p-6">
            <form onSubmit={(e) => runTrack(e)} className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1 relative">
                <Search className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                <input
                  value={ticketInput}
                  onChange={(e) => setTicketInput(e.target.value)}
                  placeholder="Ticket ID (e.g. MP-CMO-2026-XXXXX)"
                  className="w-full rounded-xl border border-[#cbd6e4] py-3 pl-12 pr-4 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-blue)]"
                />
              </div>
              <button type="submit" disabled={trackLoading} className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[var(--color-blue)] px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-[#3155b8] disabled:opacity-50">
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
            key="mp-district-hotspot-map"
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
