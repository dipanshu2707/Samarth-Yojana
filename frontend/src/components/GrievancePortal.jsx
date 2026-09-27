import React, { useState, useEffect, useRef } from 'react';
import { 
  Building2, 
  MapPin, 
  AlertTriangle, 
  Clock, 
  CheckCircle2, 
  ArrowRight, 
  ShieldCheck, 
  Camera, 
  Mic, 
  MicOff, 
  FileText, 
  Layers, 
  Search, 
  Flame, 
  Sparkles, 
  UserCheck, 
  Radio, 
  RefreshCw, 
  Send, 
  ChevronRight, 
  Lock, 
  Eye, 
  Filter, 
  BarChart3, 
  Check, 
  Play, 
  Square, 
  ExternalLink,
  HelpCircle,
  TrendingUp,
  FileCheck
} from 'lucide-react';
import { 
  submitGrievance, 
  listGrievances, 
  trackGrievance, 
  escalateGrievance, 
  resolveGrievance, 
  fetchHotspots 
} from '../api/client';

const MP_DISTRICTS = [
  "Bhopal", "Indore", "Ujjain", "Gwalior", "Jabalpur", "Sagar", "Rewa", "Sehore",
  "Satna", "Chhindwara", "Dewas", "Dhar", "Hoshangabad (Narmadapuram)", "Khandwa",
  "Khargone", "Ratlam", "Shivpuri", "Vidisha", "Betul", "Morena", "Bhind", "Damoh"
];

const DEMO_PERSONAS = [
  {
    id: "kisan_sehore",
    name: "Ramesh Patel (किसान - सीहोर)",
    tag: "Rural PWD Road",
    data: {
      citizen_name: "Ramesh Chandra Patel",
      auth_type: "aadhaar",
      auth_id: "4920-5821-9921",
      mobile: "9826011223",
      district: "Sehore",
      block_or_ward: "Ashta Tehsil, Gram Siddiqganj",
      region_type: "rural",
      address: "Mandi Link Road, Near Mandi Gate",
      title: "Severe 2-foot craters & broken culvert on Mandi approach road",
      description: "Heavy rain has caused massive potholes on the main soybean mandi road. Multiple tractor trolleys have overturned. PWD division has not conducted inspection for 3 weeks.",
      multimodal_type: "photo",
      photo_preview: "https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600&auto=format&fit=crop&q=60"
    }
  },
  {
    id: "sunita_bhopal",
    name: "Sunita Verma (नागरिक - भोपाल)",
    tag: "Urban Contaminated Water",
    data: {
      citizen_name: "Sunita Verma",
      auth_type: "aadhaar",
      auth_id: "8812-3490-5120",
      mobile: "9425098765",
      district: "Bhopal",
      block_or_ward: "Kolar Zone 18, Ward 82",
      region_type: "urban",
      address: "Bairagarh Chichali, Kolar Road, Bhopal",
      title: "Sewage pipeline burst mixing with municipal drinking water",
      description: "Black foul-smelling sewage is flowing into drinking water taps for 6 days. Over 150 families affected, children diagnosed with dysentery. Municipal water desk unresponsive.",
      multimodal_type: "photo",
      photo_preview: "https://images.unsplash.com/photo-1584824486509-112e4181ff6b?w=600&auto=format&fit=crop&q=60"
    }
  },
  {
    id: "vikram_ujjain",
    name: "Vikram Joshi (युवा - उज्जैन)",
    tag: "Rural DISCOM Power Outage",
    data: {
      citizen_name: "Vikram Joshi",
      auth_type: "pan",
      auth_id: "BNRPJ8912K",
      mobile: "9179043210",
      district: "Ujjain",
      block_or_ward: "Tarana Block, Nanakheda",
      region_type: "rural",
      address: "Gram Nanakheda Krishi Feeder",
      title: "100 KVA agricultural transformer burnt with dangerous sparking wires",
      description: "Transformer exploded during high voltage surge. 4 villages plunged into complete darkness. Wheat crop irrigation pump motors are halted. Live hanging wire poses danger to school children.",
      multimodal_type: "voice",
      audio_transcript: "हमारे तराना ब्लॉक में 100 केवी का ट्रांसफार्मर फट गया है। 4 गांवों में 10 दिन से बिजली नहीं है और तार लटक रहे हैं।"
    }
  },
  {
    id: "vague_review",
    name: "Test Human Review Fallback (अस्पष्ट शिकायत)",
    tag: "Low Confidence Fallback",
    data: {
      citizen_name: "Dinesh Sahu",
      auth_type: "aadhaar",
      auth_id: "1234-5678-9012",
      mobile: "9898012345",
      district: "Gwalior",
      block_or_ward: "Ward 5",
      region_type: "urban",
      address: "Near Old Clock Tower",
      title: "Paperwork application issue",
      description: "Need help with file.",
      multimodal_type: "text"
    }
  }
];

const SAMPLE_PHOTOS = [
  {
    label: "Road Potholes (सड़क गड्ढे)",
    url: "https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600&auto=format&fit=crop&q=60",
    dept: "PWD Roads",
    aiTag: "CV: 89% Asphalt Fracture Detected"
  },
  {
    label: "Dirty Water Supply (दूषित जल)",
    url: "https://images.unsplash.com/photo-1584824486509-112e4181ff6b?w=600&auto=format&fit=crop&q=60",
    dept: "PHE / Jal Nigam",
    aiTag: "CV: 94% Turbid Fluid Contamination"
  },
  {
    label: "Electrical Spark / Transformer (ट्रांसफार्मर)",
    url: "https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?w=600&auto=format&fit=crop&q=60",
    dept: "MP DISCOM",
    aiTag: "CV: 96% Grid Equipment Anomaly"
  },
  {
    label: "Garbage Dump (कचरा ढेर)",
    url: "https://images.unsplash.com/photo-1605600659908-0ef719419d41?w=600&auto=format&fit=crop&q=60",
    dept: "Urban Swachhata",
    aiTag: "CV: 91% Solid Waste Biohazard"
  }
];

export default function GrievancePortal({ language = 'en', onSwitchToYojana }) {
  const [activeTab, setActiveTab] = useState('file'); // 'file' | 'track' | 'hotspots' | 'officer'
  
  // File Grievance Form State
  const [formData, setFormData] = useState({
    citizen_name: '',
    auth_type: 'aadhaar',
    auth_id: '',
    mobile: '',
    district: 'Bhopal',
    block_or_ward: '',
    region_type: 'urban',
    address: '',
    title: '',
    description: '',
    multimodal_type: 'text',
    photo_evidence_url: '',
    audio_transcript: '',
    evidence_verified: true
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedTicket, setSubmittedTicket] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  // Voice recording simulation state
  const [isRecording, setIsRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [hasVoiceMemo, setHasVoiceMemo] = useState(false);
  const timerRef = useRef(null);

  // Track Ticket State
  const [searchTicketId, setSearchTicketId] = useState('MP-CMO-2026-49201');
  const [trackedTicket, setTrackedTicket] = useState(null);
  const [isTrackLoading, setIsTrackLoading] = useState(false);
  const [trackError, setTrackError] = useState('');

  // Hotspots State
  const [hotspots, setHotspots] = useState([]);
  const [hotspotFilter, setHotspotFilter] = useState('all'); // 'all' | 'rural' | 'urban' | 'critical'

  // Officer Desk State
  const [officerGrievances, setOfficerGrievances] = useState([]);
  const [officerFilterLevel, setOfficerFilterLevel] = useState('all'); // 'all' | '1' | '2' | '3' | 'human'
  const [isSimulatingSLA, setIsSimulatingSLA] = useState(false);
  const [resolutionInput, setResolutionInput] = useState({ ticketId: '', note: '', officerName: 'Er. R. K. Saxena, EE' });

  // Translations
  const t = {
    title: language === 'hi' 
      ? 'म.प्र. मुख्यमंत्री ऑनलाइन जन-शिकायत निवारण एवं स्वचालित त्रि-स्तरीय एस्केलेशन पोर्टल' 
      : 'MP CM Online — AI Civic Grievance & 3-Tier SLA Escalation Portal',
    subtitle: language === 'hi'
      ? 'बहुमाध्यमी (फोटो/आवाज/चैट) शिकायत दर्ज करें • एआई रूटिंग • 7 दिवसीय गारंटीड एस्केलेशन (विभाग ➔ कलेक्टर ➔ मुख्यमंत्री कार्यालय)'
      : 'Multimodal Grievance Redressal (Photo/Voice/Text) • AI Auto-Triage • Guaranteed SLA Escalation: Department ➔ Collector ➔ CM Office',
    tabFile: language === 'hi' ? '📝 शिकायत दर्ज करें' : '📝 File Grievance',
    tabTrack: language === 'hi' ? '🔍 शिकायत स्थिति एवं एस्केलेशन' : '🔍 Track & Escalation Matrix',
    tabHotspots: language === 'hi' ? '📊 जिला हॉटस्पॉट डैशबोर्ड' : '📊 Hotspot & Heatmap Analytics',
    tabOfficer: language === 'hi' ? '🛡️ प्रशासनिक कमांड डेस्क' : '🛡️ Officer Command Desk',
    helplineBadge: language === 'hi' ? '📞 सीएम हेल्पलाइन 181 (टोल फ्री)' : '📞 CM Helpline 181 (Toll-Free)',
    immutableNotice: language === 'hi'
      ? '🔒 डेटा अपरिवर्तनीयता (Immutability Guarantee): म.प्र. लोक सेवा गारंटी अधिनियम के तहत शिकायत दर्ज होने के बाद इसे संशोधित या हटाया नहीं जा सकता है।'
      : '🔒 Data Immutability Policy: Pursuant to MP Public Service Guarantee Act, submitted grievances cannot be edited or deleted to preserve judicial audit integrity.',
    presetHint: language === 'hi' ? '⚡ त्वरित परीक्षण हेतु डेमो नागरिक चुनें:' : '⚡ Quick Test Personas (1-Click Fill):'
  };

  // Load initial data
  useEffect(() => {
    loadHotspotsData();
    loadOfficerList();
  }, []);

  const loadHotspotsData = async () => {
    const data = await fetchHotspots();
    setHotspots(data || []);
  };

  const loadOfficerList = async () => {
    const res = await listGrievances();
    if (res && res.grievances) {
      setOfficerGrievances(res.grievances);
      // Auto-populate tracked ticket if available
      if (!trackedTicket && res.grievances.length > 0) {
        setTrackedTicket(res.grievances[0]);
        setSearchTicketId(res.grievances[0].ticket_id);
      }
    }
  };

  // Voice recording simulation
  const toggleRecording = () => {
    if (isRecording) {
      // Stop recording
      setIsRecording(false);
      clearInterval(timerRef.current);
      setHasVoiceMemo(true);
      setFormData(prev => ({
        ...prev,
        multimodal_type: prev.photo_evidence_url ? 'multimodal' : 'voice',
        audio_transcript: language === 'hi' 
          ? 'हमारे क्षेत्र में पिछले कई दिनों से बुनियादी नागरिक समस्या बनी हुई है। प्रशासन से तुरंत समाधान की अपील है।' 
          : 'Continuous civic failure reported in our local area for the past week. Requesting urgent intervention under MP CM Helpline SLA.'
      }));
    } else {
      // Start recording
      setIsRecording(true);
      setRecordSeconds(0);
      timerRef.current = setInterval(() => {
        setRecordSeconds(s => s + 1);
      }, 1000);
    }
  };

  const handleApplyPersona = (persona) => {
    setFormData({
      citizen_name: persona.data.citizen_name,
      auth_type: persona.data.auth_type,
      auth_id: persona.data.auth_id,
      mobile: persona.data.mobile,
      district: persona.data.district,
      block_or_ward: persona.data.block_or_ward,
      region_type: persona.data.region_type,
      address: persona.data.address,
      title: persona.data.title,
      description: persona.data.description,
      multimodal_type: persona.data.multimodal_type,
      photo_evidence_url: persona.data.photo_preview || '',
      audio_transcript: persona.data.audio_transcript || '',
      evidence_verified: true
    });
    setHasVoiceMemo(!!persona.data.audio_transcript);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title || !formData.description) {
      setErrorMsg('Please provide a title and detailed description of the problem.');
      return;
    }
    setErrorMsg('');
    setIsSubmitting(true);

    try {
      const response = await submitGrievance(formData);
      setSubmittedTicket(response);
      setTrackedTicket(response);
      setSearchTicketId(response.ticket_id);
      await loadOfficerList();
      await loadHotspotsData();
    } catch (err) {
      setErrorMsg(err.message || 'Failed to submit grievance. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTrackSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!searchTicketId.trim()) return;
    setIsTrackLoading(true);
    setTrackError('');
    try {
      const res = await trackGrievance(searchTicketId.trim());
      setTrackedTicket(res);
    } catch (err) {
      setTrackError(err.message || `No ticket found matching ${searchTicketId}`);
    } finally {
      setIsTrackLoading(false);
    }
  };

  // SLA Time-Travel / Escalation Simulator
  const handleSimulateEscalation = async (ticketId, targetLevel, reason) => {
    setIsSimulatingSLA(true);
    try {
      const updated = await escalateGrievance(ticketId, targetLevel, reason);
      setTrackedTicket(updated);
      await loadOfficerList();
      await loadHotspotsData();
    } catch (err) {
      alert(`Simulation failed: ${err.message}`);
    } finally {
      setIsSimulatingSLA(false);
    }
  };

  const handleResolveGrievance = async (ticketId) => {
    if (!resolutionInput.note) {
      alert('Please enter an official resolution note.');
      return;
    }
    try {
      const resolved = await resolveGrievance(ticketId, {
        officer_name: resolutionInput.officerName || 'Executive Officer',
        officer_designation: 'Nodal Officer MPOnline',
        resolution_note: resolutionInput.note,
        evidence_url: 'https://images.unsplash.com/photo-1590674899484-d5640e854abe?w=600&auto=format&fit=crop&q=60'
      });
      setTrackedTicket(resolved);
      setResolutionInput({ ticketId: '', note: '', officerName: '' });
      await loadOfficerList();
    } catch (err) {
      alert(`Resolution failed: ${err.message}`);
    }
  };

  // Filtered lists
  const filteredHotspots = hotspots.filter(h => {
    if (hotspotFilter === 'rural') return h.rural_count > h.urban_count;
    if (hotspotFilter === 'urban') return h.urban_count >= h.rural_count;
    if (hotspotFilter === 'critical') return h.critical_count > 0;
    return true;
  });

  const filteredOfficerGrievances = officerGrievances.filter(g => {
    if (officerFilterLevel === '1') return g.escalation_level === 1 && !g.needs_human_review;
    if (officerFilterLevel === '2') return g.escalation_level === 2;
    if (officerFilterLevel === '3') return g.escalation_level === 3;
    if (officerFilterLevel === 'human') return g.needs_human_review;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Top Banner / Executive Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 sm:p-8 shadow-xl border border-slate-800">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-amber-500/10 via-transparent to-transparent opacity-60"></div>
        
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-3xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-400/20 text-amber-300 border border-amber-400/30">
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                MP CM Online Form • जन सेवा
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                <ShieldCheck className="w-3.5 h-3.5" />
                3-Tier SLA Escalation (L1 ➔ L2 ➔ L3)
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-sky-500/20 text-sky-300 border border-sky-500/30">
                {t.helplineBadge}
              </span>
            </div>
            
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight font-heading text-white">
              {t.title}
            </h1>
            <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
              {t.subtitle}
            </p>
          </div>

          {/* Quick Switch to Yojana Sathi pill */}
          <div className="flex-shrink-0 bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/10 text-center space-y-2">
            <p className="text-xs text-slate-300">Need Scheme Assistance?</p>
            <button
              onClick={onSwitchToYojana}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-bold shadow-md transition-all"
            >
              <span>योजना साथी (Yojana Sathi)</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Live System Pillars bar */}
        <div className="relative z-10 grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-slate-800/80 text-xs">
          <div className="flex items-center gap-2 text-slate-300">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></div>
            <span><strong>Level 1:</strong> 7-Day Dept SLA</span>
          </div>
          <div className="flex items-center gap-2 text-slate-300">
            <div className="w-2 h-2 rounded-full bg-amber-400"></div>
            <span><strong>Level 2:</strong> District Collector</span>
          </div>
          <div className="flex items-center gap-2 text-slate-300">
            <div className="w-2 h-2 rounded-full bg-rose-400"></div>
            <span><strong>Level 3:</strong> CM Office Apex</span>
          </div>
          <div className="flex items-center gap-2 text-slate-300">
            <Lock className="w-3.5 h-3.5 text-cyan-400" />
            <span>Immutable & Anti-Tamper</span>
          </div>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center gap-2 p-1.5 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-x-auto">
        <button
          onClick={() => setActiveTab('file')}
          className={`flex-1 min-w-[150px] py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 ${
            activeTab === 'file'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          {t.tabFile}
        </button>

        <button
          onClick={() => setActiveTab('track')}
          className={`flex-1 min-w-[160px] py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 ${
            activeTab === 'track'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          {t.tabTrack}
          {trackedTicket && (
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('hotspots')}
          className={`flex-1 min-w-[150px] py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 ${
            activeTab === 'hotspots'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          {t.tabHotspots}
          <span className="text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded-full font-bold">
            Live
          </span>
        </button>

        <button
          onClick={() => setActiveTab('officer')}
          className={`flex-1 min-w-[150px] py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 ${
            activeTab === 'officer'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          {t.tabOfficer}
          <span className="text-[10px] bg-indigo-100 text-indigo-800 px-1.5 py-0.5 rounded-full font-bold">
            {officerGrievances.length}
          </span>
        </button>
      </div>

      {/* =========================================================================
          TAB 1: FILE GRIEVANCE (MULTIMODAL SUBMISSION)
      ========================================================================= */}
      {activeTab === 'file' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Form Column (Left 2 cols) */}
          <div className="lg:col-span-2 space-y-6">
            {/* Quick Demo Persona Presets */}
            <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="w-4 h-4 text-amber-600" />
                <span className="text-xs font-bold text-amber-900">{t.presetHint}</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {DEMO_PERSONAS.map(p => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handleApplyPersona(p)}
                    className="text-left p-2.5 bg-white/80 hover:bg-white border border-amber-200/80 hover:border-amber-400 rounded-xl transition-all shadow-xs group"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800 group-hover:text-indigo-600">
                        {p.name}
                      </span>
                      <span className="text-[10px] bg-amber-100 text-amber-800 font-semibold px-2 py-0.5 rounded-full">
                        {p.tag}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 truncate mt-1">
                      {p.data.title}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            {/* Immutability Banner */}
            <div className="bg-slate-900 text-slate-200 rounded-2xl p-3.5 text-xs flex items-start gap-3 border border-slate-800">
              <Lock className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-white">{t.immutableNotice}</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Audit logs, GPS geo-tag, and multimodal proofs are digitally timestamped upon submission.
                </p>
              </div>
            </div>

            {/* The Form */}
            <form onSubmit={handleSubmit} className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
              {/* Section 1: Citizen Identity & Location */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                  <UserCheck className="w-5 h-5 text-indigo-600" />
                  <h2 className="text-base font-bold text-slate-900">
                    1. Citizen Authentication & Geolocation (नागरिक पहचान एवं स्थान)
                  </h2>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Citizen Full Name (नागरिक का नाम) *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.citizen_name}
                      onChange={e => setFormData({ ...formData, citizen_name: e.target.value })}
                      placeholder="e.g. Ramesh Chandra Patel"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Authentication ID (Aadhaar / PAN) *
                    </label>
                    <div className="flex gap-2">
                      <select
                        value={formData.auth_type}
                        onChange={e => setFormData({ ...formData, auth_type: e.target.value })}
                        className="px-2.5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold bg-slate-50 text-slate-700"
                      >
                        <option value="aadhaar">Aadhaar (आधार)</option>
                        <option value="pan">PAN Card (पैन)</option>
                      </select>
                      <input
                        type="text"
                        required
                        value={formData.auth_id}
                        onChange={e => setFormData({ ...formData, auth_id: e.target.value })}
                        placeholder={formData.auth_type === 'aadhaar' ? "4920-5821-9921" : "ABCDE1234F"}
                        className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Mobile Number (मोबाइल नं.)
                    </label>
                    <input
                      type="tel"
                      value={formData.mobile}
                      onChange={e => setFormData({ ...formData, mobile: e.target.value })}
                      placeholder="9826012345"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      District (जिला) *
                    </label>
                    <select
                      value={formData.district}
                      onChange={e => setFormData({ ...formData, district: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                    >
                      {MP_DISTRICTS.map(d => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Regional Classification (क्षेत्रीय वर्गीकरण) *
                    </label>
                    <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 rounded-xl">
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, region_type: 'rural' })}
                        className={`py-1.5 rounded-lg text-xs font-bold transition-all ${
                          formData.region_type === 'rural' 
                            ? 'bg-emerald-600 text-white shadow-xs' 
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        Rural (ग्रामीण)
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, region_type: 'urban' })}
                        className={`py-1.5 rounded-lg text-xs font-bold transition-all ${
                          formData.region_type === 'urban' 
                            ? 'bg-indigo-600 text-white shadow-xs' 
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        Urban (शहरी)
                      </button>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Tehsil / Ward / Gram Panchayat
                    </label>
                    <input
                      type="text"
                      value={formData.block_or_ward}
                      onChange={e => setFormData({ ...formData, block_or_ward: e.target.value })}
                      placeholder="e.g. Ashta Tehsil / Kolar Ward 82"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Exact Location / Landmark (स्थान / लैंडमार्क)
                    </label>
                    <input
                      type="text"
                      value={formData.address}
                      onChange={e => setFormData({ ...formData, address: e.target.value })}
                      placeholder="e.g. Near Siddiqganj Mandi Gate"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>
              </div>

              {/* Section 2: Multimodal Problem Description */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                  <FileText className="w-5 h-5 text-indigo-600" />
                  <h2 className="text-base font-bold text-slate-900">
                    2. Multimodal Problem Details (समस्या का विवरण: चैट, फोटो, आवाज)
                  </h2>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Grievance Subject / Title (समस्या का शीर्षक) *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                    placeholder="e.g. Severe 2-foot craters on Mandi approach road"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Detailed Description (विस्तृत विवरण) *
                  </label>
                  <textarea
                    rows={3}
                    required
                    value={formData.description}
                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Describe the problem, hazard, duration, and impacted families..."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                  />
                </div>

                {/* Multimodal Inputs Grid: Photo + Voice */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                  {/* Photo Evidence Box */}
                  <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Camera className="w-4 h-4 text-indigo-600" />
                        <span className="text-xs font-bold text-slate-800">
                          Photo Evidence (फोटो साक्ष्य)
                        </span>
                      </div>
                      {formData.photo_evidence_url && (
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                          ✓ Photo Attached
                        </span>
                      )}
                    </div>

                    {formData.photo_evidence_url ? (
                      <div className="relative rounded-xl overflow-hidden border border-slate-200 group">
                        <img 
                          src={formData.photo_evidence_url} 
                          alt="Evidence preview" 
                          className="w-full h-32 object-cover"
                        />
                        <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => setFormData({ ...formData, photo_evidence_url: '' })}
                            className="px-3 py-1 bg-rose-600 text-white rounded-lg text-xs font-bold"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <p className="text-[11px] text-slate-500">
                          Select a realistic civic photo preset or upload your camera proof:
                        </p>
                        <div className="grid grid-cols-2 gap-1.5">
                          {SAMPLE_PHOTOS.map((sp, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => setFormData({
                                ...formData,
                                photo_evidence_url: sp.url,
                                multimodal_type: hasVoiceMemo ? 'multimodal' : 'photo'
                              })}
                              className="text-left p-1.5 rounded-lg border border-slate-200 bg-white hover:border-indigo-400 transition-all text-[11px]"
                            >
                              <p className="font-semibold text-slate-800 truncate">{sp.label}</p>
                              <p className="text-[9px] text-indigo-600">{sp.aiTag}</p>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Voice Recording Box */}
                  <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Mic className="w-4 h-4 text-indigo-600" />
                        <span className="text-xs font-bold text-slate-800">
                          Voice Memo (आवाज संदेश रिकॉर्डिंग)
                        </span>
                      </div>
                      {hasVoiceMemo && (
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                          ✓ Transcribed
                        </span>
                      )}
                    </div>

                    <div className="flex flex-col items-center justify-center p-3 bg-white rounded-xl border border-slate-200 text-center space-y-2">
                      <button
                        type="button"
                        onClick={toggleRecording}
                        className={`w-12 h-12 rounded-full flex items-center justify-center shadow-md transition-all ${
                          isRecording 
                            ? 'bg-rose-600 text-white animate-pulse' 
                            : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                        }`}
                      >
                        {isRecording ? <Square className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                      </button>

                      <p className="text-xs font-semibold text-slate-700">
                        {isRecording 
                          ? `Recording audio... 00:0${recordSeconds}` 
                          : hasVoiceMemo 
                            ? 'Voice memo attached & transcribed' 
                            : 'Click to record complaint audio'
                        }
                      </p>

                      {hasVoiceMemo && (
                        <div className="text-[11px] text-slate-600 italic bg-slate-50 p-2 rounded-lg border border-slate-200 w-full text-left">
                          "{formData.audio_transcript}"
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Evidence Verification Checkbox */}
                <div className="flex items-start gap-2 pt-2">
                  <input
                    type="checkbox"
                    id="evidenceConfirm"
                    checked={formData.evidence_verified}
                    onChange={e => setFormData({ ...formData, evidence_verified: e.target.checked })}
                    className="mt-1 w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                  />
                  <label htmlFor="evidenceConfirm" className="text-xs text-slate-600 cursor-pointer">
                    I confirm that valid proof of concept / visual or audio evidence has been attached to prevent false alarms, adhering to the <strong>MP Public Services Guarantee SLA</strong>.
                  </label>
                </div>
              </div>

              {errorMsg && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-medium flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Submit Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white font-bold text-sm shadow-lg shadow-indigo-600/25 flex items-center justify-center gap-2 disabled:opacity-50 transition-all cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>AI Triage & Deduplication in Progress...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>शिकायत दर्ज करें (Submit to AI Escalation Engine)</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Right Column: AI Triage Live Preview & Submission Receipt */}
          <div className="space-y-6">
            {/* Live Triage Preview Box */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                <Sparkles className="w-5 h-5 text-indigo-600" />
                <h3 className="text-sm font-bold text-slate-900">
                  AI Real-Time Triage Engine
                </h3>
              </div>

              <div className="space-y-3 text-xs">
                <div className="p-3 bg-slate-50 rounded-xl space-y-1.5 border border-slate-200">
                  <div className="flex justify-between text-slate-500">
                    <span>Target Authority:</span>
                    <span className="font-bold text-indigo-700">
                      {formData.region_type === 'rural' ? 'Gram Panchayat / PWD Rural' : 'Nagar Nigam / Urban Body'}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-500">
                    <span>Resolution SLA:</span>
                    <span className="font-bold text-emerald-700">7-Day Window (Guaranteed)</span>
                  </div>
                  <div className="flex justify-between text-slate-500">
                    <span>Input Mode:</span>
                    <span className="font-semibold text-slate-800 uppercase">
                      {formData.photo_evidence_url ? 'Multimodal (Photo + Text)' : hasVoiceMemo ? 'Voice Memo' : 'Text'}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-500">
                    <span>Deduplication Radar:</span>
                    <span className="font-semibold text-indigo-600">Active (Geo-Clustered)</span>
                  </div>
                </div>

                <div className="p-3 bg-amber-50 rounded-xl border border-amber-200/80 space-y-1">
                  <p className="font-bold text-amber-900 text-xs flex items-center gap-1.5">
                    <Flame className="w-3.5 h-3.5 text-amber-600" />
                    Hotspot & Severity Matrix
                  </p>
                  <p className="text-[11px] text-amber-800">
                    Complaints are scored on safety hazard, population density, and recurring cluster patterns.
                  </p>
                </div>
              </div>
            </div>

            {/* If Ticket Submitted, Show Immediate Receipt Card */}
            {submittedTicket && (
              <div className="bg-gradient-to-b from-emerald-50 to-white rounded-3xl p-6 border-2 border-emerald-300 shadow-md space-y-4 animate-in fade-in zoom-in-95 duration-300">
                <div className="flex items-center gap-2 text-emerald-800 font-bold">
                  <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                  <span className="text-base">Grievance Successfully Registered!</span>
                </div>

                <div className="p-3 bg-white rounded-2xl border border-emerald-200 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-slate-500">Ticket ID:</span>
                    <span className="text-sm font-mono font-extrabold text-indigo-700">
                      {submittedTicket.ticket_id}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-slate-500">Assigned Department:</span>
                    <span className="text-xs font-bold text-slate-800 text-right">
                      {submittedTicket.department}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-slate-500">AI Confidence:</span>
                    <span className="text-xs font-bold text-emerald-700">
                      {Math.round(submittedTicket.ai_confidence * 100)}% Match
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-slate-500">Escalation Tier:</span>
                    <span className="text-xs font-bold text-indigo-600">
                      Level 1 (7 Days Left)
                    </span>
                  </div>
                </div>

                {submittedTicket.is_duplicate && (
                  <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-800">
                    <p className="font-bold flex items-center gap-1">
                      <Layers className="w-3.5 h-3.5 text-amber-600" />
                      Community Deduplication Merge
                    </p>
                    <p className="text-[11px] mt-0.5">{submittedTicket.duplicate_summary}</p>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('track');
                    setTrackedTicket(submittedTicket);
                    setSearchTicketId(submittedTicket.ticket_id);
                  }}
                  className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition-all"
                >
                  <span>Track Live in Escalation Matrix</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 2: TRACK & 3-TIER ESCALATION MATRIX
      ========================================================================= */}
      {activeTab === 'track' && (
        <div className="space-y-6">
          {/* Ticket Search Bar */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm">
            <form onSubmit={handleTrackSubmit} className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1 relative">
                <Search className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchTicketId}
                  onChange={e => setSearchTicketId(e.target.value)}
                  placeholder="Enter Ticket ID (e.g. MP-CMO-2026-49201)"
                  className="w-full pl-12 pr-4 py-3 rounded-2xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                />
              </div>
              <button
                type="submit"
                disabled={isTrackLoading}
                className="py-3 px-6 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs sm:text-sm font-bold shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                {isTrackLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                <span>Track Grievance (ट्रैक करें)</span>
              </button>
            </form>

            {/* Quick Sample Ticket Buttons */}
            <div className="flex flex-wrap items-center gap-2 mt-4 pt-3 border-t border-slate-100 text-xs">
              <span className="text-slate-500 font-medium">Quick Demo Tickets:</span>
              <button
                type="button"
                onClick={() => { setSearchTicketId('MP-CMO-2026-49201'); handleTrackSubmit(); }}
                className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-mono text-[11px]"
              >
                Level 1: PWD Road (#49201)
              </button>
              <button
                type="button"
                onClick={() => { setSearchTicketId('MP-CMO-2026-88120'); handleTrackSubmit(); }}
                className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-lg font-mono text-[11px]"
              >
                Level 2: Collector Water (#88120)
              </button>
              <button
                type="button"
                onClick={() => { setSearchTicketId('MP-CMO-2026-91790'); handleTrackSubmit(); }}
                className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-800 rounded-lg font-mono text-[11px]"
              >
                Level 3: CM Office Power (#91790)
              </button>
            </div>

            {trackError && (
              <p className="mt-3 text-xs text-rose-600 font-semibold">{trackError}</p>
            )}
          </div>

          {/* Tracked Ticket Dossier */}
          {trackedTicket && (
            <div className="space-y-6">
              {/* Top Dossier Header Card */}
              <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-100">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xl font-extrabold text-indigo-700">
                        {trackedTicket.ticket_id}
                      </span>
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                        trackedTicket.escalation_level === 3 ? 'bg-rose-100 text-rose-800 border border-rose-200' :
                        trackedTicket.escalation_level === 2 ? 'bg-amber-100 text-amber-800 border border-amber-200' :
                        trackedTicket.status === 'Resolved' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' :
                        'bg-blue-100 text-blue-800 border border-blue-200'
                      }`}>
                        {trackedTicket.status}
                      </span>
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                        {trackedTicket.region_type?.toUpperCase()}
                      </span>
                    </div>
                    <h3 className="text-lg font-bold text-slate-900">
                      {trackedTicket.title}
                    </h3>
                  </div>

                  {/* SLA Countdown pill */}
                  <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-200">
                    <Clock className="w-5 h-5 text-indigo-600" />
                    <div>
                      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                        SLA Window Status
                      </p>
                      <p className="text-xs font-extrabold text-slate-900">
                        {trackedTicket.status === 'Resolved' 
                          ? 'Resolved Successfully' 
                          : `${trackedTicket.sla_days_remaining} Days Remaining (SLA: 7 Days)`}
                      </p>
                    </div>
                  </div>
                </div>

                {/* 3-Tier Interactive Escalation Stepper */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                      Multi-Level Escalation Workflow (त्रि-स्तरीय स्वचालित एस्केलेशन प्रगति)
                    </h4>
                    <span className="text-xs text-indigo-600 font-bold">
                      Current Stage: Tier {trackedTicket.escalation_level} of 3
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Level 1 Card */}
                    <div className={`p-4 rounded-2xl border transition-all ${
                      trackedTicket.escalation_level === 1
                        ? 'bg-blue-50/70 border-blue-300 ring-2 ring-blue-500/20 shadow-sm'
                        : trackedTicket.escalation_level > 1
                          ? 'bg-slate-50 border-slate-200 opacity-80'
                          : 'bg-slate-50 border-slate-200'
                    }`}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                          Tier 1 (Day 1 - 7)
                        </span>
                        {trackedTicket.escalation_level > 1 ? (
                          <Check className="w-4 h-4 text-emerald-600" />
                        ) : (
                          <span className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-pulse"></span>
                        )}
                      </div>
                      <p className="font-bold text-xs text-slate-900">Respective Department</p>
                      <p className="text-[11px] text-slate-600 mt-1 line-clamp-2">
                        {trackedTicket.department}
                      </p>
                      <p className="text-[10px] text-slate-500 mt-2">
                        Authority: {trackedTicket.target_authority?.split(',')[0]}
                      </p>
                    </div>

                    {/* Level 2 Card */}
                    <div className={`p-4 rounded-2xl border transition-all ${
                      trackedTicket.escalation_level === 2
                        ? 'bg-amber-50/70 border-amber-300 ring-2 ring-amber-500/20 shadow-sm'
                        : trackedTicket.escalation_level > 2
                          ? 'bg-slate-50 border-slate-200 opacity-80'
                          : 'bg-slate-50 border-slate-200 opacity-60'
                    }`}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                          Tier 2 (Day 8 - 14)
                        </span>
                        {trackedTicket.escalation_level > 2 ? (
                          <Check className="w-4 h-4 text-emerald-600" />
                        ) : trackedTicket.escalation_level === 2 ? (
                          <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse"></span>
                        ) : (
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                        )}
                      </div>
                      <p className="font-bold text-xs text-slate-900">District Collector (DM Desk)</p>
                      <p className="text-[11px] text-slate-600 mt-1">
                        Collector & District Magistrate, {trackedTicket.district}
                      </p>
                      <p className="text-[10px] text-slate-500 mt-2">
                        Triggers automatically if Level 1 SLA breaches 7 days.
                      </p>
                    </div>

                    {/* Level 3 Card */}
                    <div className={`p-4 rounded-2xl border transition-all ${
                      trackedTicket.escalation_level === 3
                        ? 'bg-rose-50/70 border-rose-300 ring-2 ring-rose-500/20 shadow-sm'
                        : 'bg-slate-50 border-slate-200 opacity-60'
                    }`}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-rose-100 text-rose-800">
                          Tier 3 (Apex Escalation)
                        </span>
                        {trackedTicket.escalation_level === 3 ? (
                          <span className="w-2.5 h-2.5 rounded-full bg-rose-600 animate-pulse"></span>
                        ) : (
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                        )}
                      </div>
                      <p className="font-bold text-xs text-slate-900">Chief Minister Office (CMO)</p>
                      <p className="text-[11px] text-slate-600 mt-1">
                        CM Helpline Apex Redressal & Task Force
                      </p>
                      <p className="text-[10px] text-slate-500 mt-2">
                        Direct executive sanction under MP Citizen Charter.
                      </p>
                    </div>
                  </div>

                  {/* Interactive SLA Time-Machine Simulator Bar */}
                  <div className="p-4 bg-gradient-to-r from-indigo-50 via-purple-50 to-blue-50 rounded-2xl border border-indigo-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-indigo-900 flex items-center gap-1.5">
                        <Sparkles className="w-4 h-4 text-indigo-600" />
                        Interactive SLA Escalation Simulator (फास्ट-फॉरवर्ड परीक्षण)
                      </span>
                      <span className="text-[11px] text-slate-500">
                        Test the automated multi-level workflow live:
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {trackedTicket.escalation_level === 1 && (
                        <button
                          type="button"
                          disabled={isSimulatingSLA}
                          onClick={() => handleSimulateEscalation(trackedTicket.ticket_id, 2, "7-Day SLA expired at departmental desk without resolution.")}
                          className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                        >
                          <Clock className="w-3.5 h-3.5" />
                          <span>Simulate 7 Days Passed ➔ Escalate to Level 2 (Collector)</span>
                        </button>
                      )}

                      {trackedTicket.escalation_level === 2 && (
                        <button
                          type="button"
                          disabled={isSimulatingSLA}
                          onClick={() => handleSimulateEscalation(trackedTicket.ticket_id, 3, "Collector 7-day directives breached. Critical public escalation.")}
                          className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                        >
                          <Flame className="w-3.5 h-3.5" />
                          <span>Simulate 14 Days Passed ➔ Escalate to Level 3 (CM Office)</span>
                        </button>
                      )}

                      {trackedTicket.status !== 'Resolved' && (
                        <button
                          type="button"
                          onClick={() => setResolutionInput({ ...resolutionInput, ticketId: trackedTicket.ticket_id, note: 'Field inspection completed. Road resurfaced & culvert repaired with bitumen overlay.' })}
                          className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Mark Resolved with Officer Report</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Resolution Input Box if clicked */}
                  {resolutionInput.ticketId === trackedTicket.ticket_id && (
                    <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200 space-y-3">
                      <p className="text-xs font-bold text-emerald-900">
                        Officer Resolution Action
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <input
                          type="text"
                          value={resolutionInput.officerName}
                          onChange={e => setResolutionInput({ ...resolutionInput, officerName: e.target.value })}
                          placeholder="Officer Name & Designation"
                          className="px-3 py-2 rounded-xl border border-emerald-300 text-xs bg-white"
                        />
                        <input
                          type="text"
                          value={resolutionInput.note}
                          onChange={e => setResolutionInput({ ...resolutionInput, note: e.target.value })}
                          placeholder="Resolution action & inspection findings"
                          className="px-3 py-2 rounded-xl border border-emerald-300 text-xs bg-white"
                        />
                      </div>
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setResolutionInput({ ticketId: '', note: '', officerName: '' })}
                          className="px-3 py-1.5 bg-white border border-slate-200 text-slate-700 rounded-lg text-xs font-bold"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => handleResolveGrievance(trackedTicket.ticket_id)}
                          className="px-4 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-bold shadow-xs"
                        >
                          Submit Official Resolution
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Evidence & Details Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-100">
                  {/* Left: Description & Complainant Details */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                      Grievance Details
                    </h4>
                    <p className="text-xs text-slate-700 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-200">
                      {trackedTicket.description}
                    </p>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                        <span className="text-[10px] text-slate-500 block">Citizen Name:</span>
                        <span className="font-semibold text-slate-800">{trackedTicket.citizen_name}</span>
                      </div>
                      <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                        <span className="text-[10px] text-slate-500 block">Authentication:</span>
                        <span className="font-semibold text-slate-800 font-mono">{trackedTicket.auth_id_masked}</span>
                      </div>
                      <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                        <span className="text-[10px] text-slate-500 block">Location:</span>
                        <span className="font-semibold text-slate-800">{trackedTicket.district} ({trackedTicket.block_or_ward})</span>
                      </div>
                      <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                        <span className="text-[10px] text-slate-500 block">Co-Complainants:</span>
                        <span className="font-semibold text-indigo-700">{trackedTicket.co_complainant_count || 1} Citizen(s) Merged</span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Attached Evidence */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                      Multimodal Proof & AI Verification
                    </h4>
                    {trackedTicket.photo_evidence_url ? (
                      <div className="rounded-2xl overflow-hidden border border-slate-200">
                        <img
                          src={trackedTicket.photo_evidence_url}
                          alt="Grievance evidence"
                          className="w-full h-44 object-cover"
                        />
                        <div className="p-2 bg-slate-900 text-white text-[11px] flex justify-between">
                          <span>Verified Photographic Proof</span>
                          <span className="text-emerald-400 font-mono">CV Conf: 96%</span>
                        </div>
                      </div>
                    ) : (
                      <div className="h-44 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col items-center justify-center text-slate-400 p-4 text-center">
                        <FileText className="w-8 h-8 mb-2" />
                        <span className="text-xs">Text & Document Report</span>
                      </div>
                    )}

                    {trackedTicket.audio_transcript && (
                      <div className="p-3 bg-indigo-50/60 rounded-xl border border-indigo-200 text-xs text-indigo-900 space-y-1">
                        <p className="font-bold flex items-center gap-1">
                          <Mic className="w-3.5 h-3.5 text-indigo-600" />
                          Audio Memo Transcript (आवाज रिकॉर्डिंग सारांश)
                        </p>
                        <p className="text-[11px] italic">"{trackedTicket.audio_transcript}"</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Audit Trail Timeline */}
                <div className="space-y-3 pt-4 border-t border-slate-100">
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Immutable Audit Trail & Timeline (अपरिवर्तनीय प्रशासनिक समयरेखा)
                  </h4>

                  <div className="space-y-3 relative pl-6 before:content-[''] before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                    {trackedTicket.timeline?.map((step, idx) => (
                      <div key={idx} className="relative space-y-0.5">
                        <div className="w-2.5 h-2.5 rounded-full bg-indigo-600 absolute -left-[21px] top-1.5 ring-4 ring-white"></div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-800">{step.actor}</span>
                          <span className="text-[10px] text-slate-400">{step.timestamp}</span>
                        </div>
                        <p className="text-xs text-slate-600">{step.message}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          TAB 3: HOTSPOT & HEATMAP ANALYTICS
      ========================================================================= */}
      {activeTab === 'hotspots' && (
        <div className="space-y-6">
          {/* Header Summary */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <Flame className="w-5 h-5 text-amber-500" />
                <h3 className="text-lg font-bold text-slate-900">
                  MP District Grievance Hotspots & Heatmap Analytics
                </h3>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                AI detects geographical problem clusters, elevated recurring failures, and active SLA escalation alerts.
              </p>
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl text-xs">
              <button
                onClick={() => setHotspotFilter('all')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                  hotspotFilter === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                }`}
              >
                All Districts
              </button>
              <button
                onClick={() => setHotspotFilter('critical')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                  hotspotFilter === 'critical' ? 'bg-rose-600 text-white shadow-xs' : 'text-slate-600'
                }`}
              >
                Critical Hazards
              </button>
              <button
                onClick={() => setHotspotFilter('rural')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                  hotspotFilter === 'rural' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600'
                }`}
              >
                Rural Clusters
              </button>
              <button
                onClick={() => setHotspotFilter('urban')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                  hotspotFilter === 'urban' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600'
                }`}
              >
                Urban Municipal
              </button>
            </div>
          </div>

          {/* District Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredHotspots.map(h => (
              <div 
                key={h.district}
                className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm hover:shadow-md transition-all space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-indigo-600" />
                    <span className="font-bold text-slate-900 text-sm">{h.district}</span>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    h.hotspot_intensity === 'Severe' ? 'bg-rose-100 text-rose-800 border border-rose-200' :
                    h.hotspot_intensity === 'Elevated' ? 'bg-amber-100 text-amber-800 border border-amber-200' :
                    'bg-slate-100 text-slate-700'
                  }`}>
                    {h.hotspot_intensity} Hotspot
                  </span>
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs text-slate-500">
                    <span>Primary Burden:</span>
                    <span className="font-semibold text-slate-800 text-right">{h.primary_category}</span>
                  </div>
                  <div className="flex justify-between text-xs text-slate-500">
                    <span>Total Active Complaints:</span>
                    <span className="font-bold text-indigo-700">{h.total_complaints}</span>
                  </div>
                  <div className="flex justify-between text-xs text-slate-500">
                    <span>Rural vs Urban Split:</span>
                    <span className="font-medium text-slate-700">{h.rural_count} Rural / {h.urban_count} Urban</span>
                  </div>
                  <div className="flex justify-between text-xs text-slate-500">
                    <span>Escalated to Collector (L2):</span>
                    <span className="font-bold text-amber-700">{h.active_escalated_l2} tickets</span>
                  </div>
                  <div className="flex justify-between text-xs text-slate-500">
                    <span>Escalated to CM Office (L3):</span>
                    <span className="font-bold text-rose-700">{h.active_escalated_l3} tickets</span>
                  </div>
                </div>

                {/* Progress bar visual */}
                <div className="pt-2 border-t border-slate-100">
                  <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                    <div 
                      className={`h-full ${
                        h.hotspot_intensity === 'Severe' ? 'bg-rose-500' :
                        h.hotspot_intensity === 'Elevated' ? 'bg-amber-500' : 'bg-indigo-500'
                      }`}
                      style={{ width: `${Math.min(100, h.total_complaints * 10)}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 4: OFFICER COMMAND DESK
      ========================================================================= */}
      {activeTab === 'officer' && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-indigo-600" />
                <h3 className="text-lg font-bold text-slate-900">
                  Departmental, Collector & CM Office Monitoring Queues
                </h3>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Filter and manage incoming tickets, review low-confidence human fallback cases, and verify field resolutions.
              </p>
            </div>

            {/* Filter by Tier */}
            <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 p-1 rounded-xl text-xs">
              <button
                onClick={() => setOfficerFilterLevel('all')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                  officerFilterLevel === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                }`}
              >
                All ({officerGrievances.length})
              </button>
              <button
                onClick={() => setOfficerFilterLevel('1')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                  officerFilterLevel === '1' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600'
                }`}
              >
                Level 1: Dept
              </button>
              <button
                onClick={() => setOfficerFilterLevel('2')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                  officerFilterLevel === '2' ? 'bg-amber-600 text-white shadow-xs' : 'text-slate-600'
                }`}
              >
                Level 2: Collector
              </button>
              <button
                onClick={() => setOfficerFilterLevel('3')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                  officerFilterLevel === '3' ? 'bg-rose-600 text-white shadow-xs' : 'text-slate-600'
                }`}
              >
                Level 3: CM Office
              </button>
              <button
                onClick={() => setOfficerFilterLevel('human')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                  officerFilterLevel === 'human' ? 'bg-purple-600 text-white shadow-xs' : 'text-slate-600'
                }`}
              >
                Human Review
              </button>
            </div>
          </div>

          {/* List of Grievance Tickets */}
          <div className="space-y-3">
            {filteredOfficerGrievances.map(g => (
              <div
                key={g.ticket_id}
                className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm hover:border-indigo-300 transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
              >
                <div className="space-y-1.5 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md">
                      {g.ticket_id}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      g.escalation_level === 3 ? 'bg-rose-100 text-rose-800' :
                      g.escalation_level === 2 ? 'bg-amber-100 text-amber-800' :
                      g.needs_human_review ? 'bg-purple-100 text-purple-800' :
                      'bg-blue-100 text-blue-800'
                    }`}>
                      {g.status}
                    </span>
                    <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                      {g.district} • {g.region_type?.toUpperCase()}
                    </span>
                    {g.priority === 'Critical' && (
                      <span className="text-[10px] font-bold bg-rose-100 text-rose-700 px-2 py-0.5 rounded-full">
                        CRITICAL
                      </span>
                    )}
                  </div>

                  <h4 className="text-sm font-bold text-slate-900">
                    {g.title}
                  </h4>
                  <p className="text-xs text-slate-600 line-clamp-1">
                    {g.description}
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Filed by {g.citizen_name} ({g.auth_id_masked}) • {g.department}
                  </p>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('track');
                      setTrackedTicket(g);
                      setSearchTicketId(g.ticket_id);
                    }}
                    className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>View Dossier</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
