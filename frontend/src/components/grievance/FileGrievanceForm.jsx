import React, { useEffect, useState } from 'react';
import { Send, Camera, UserCheck, FileText, RefreshCw, AlertTriangle, CheckCircle2, ArrowRight, Building2, X } from 'lucide-react';
import { fetchDepartments, submitGrievance, uploadGrievancePhoto } from '../../api/client';
import VoiceComplaintInput from './VoiceComplaintInput';
import TicketDossier from './TicketDossier';
import { MP_DISTRICTS } from './workflow';

const SAMPLE_PERSONAS = [
  {
    id: 'kisan_sehore',
    name: 'Ramesh Patel (किसान - सीहोर)',
    tag: 'Rural PWD Road',
    data: {
      citizen_name: 'Ramesh Chandra Patel', auth_type: 'aadhaar', auth_id: '4920-5821-9921', mobile: '9826011223',
      citizen_email: '', district: 'Sehore', block_or_ward: 'Ashta Tehsil, Gram Siddiqganj', region_type: 'rural',
      address: 'Mandi Link Road, Near Mandi Gate', dept_id: 'pwd',
      title: 'Severe 2-foot craters & broken culvert on Mandi approach road',
      description: 'Heavy rain has caused massive potholes on the main soybean mandi road. Multiple tractor trolleys have overturned. PWD division has not conducted inspection for 3 weeks.',
      multimodal_type: 'text',
    },
  },
  {
    id: 'sunita_bhopal',
    name: 'Sunita Verma (नागरिक - भोपाल)',
    tag: 'Urban Water',
    data: {
      citizen_name: 'Sunita Verma', auth_type: 'aadhaar', auth_id: '8812-3490-5120', mobile: '9425098765',
      citizen_email: '', district: 'Bhopal', block_or_ward: 'Kolar Zone 18, Ward 82', region_type: 'urban',
      address: 'Bairagarh Chichali, Kolar Road, Bhopal', dept_id: 'phe',
      title: 'Sewage pipeline burst mixing with municipal drinking water',
      description: 'Black foul-smelling sewage is flowing into drinking water taps for 6 days. Over 150 families affected, children diagnosed with dysentery. Municipal water desk unresponsive.',
      multimodal_type: 'text',
    },
  },
  {
    id: 'vikram_ujjain',
    name: 'Vikram Joshi (युवा - उज्जैन)',
    tag: 'Rural Power',
    data: {
      citizen_name: 'Vikram Joshi', auth_type: 'pan', auth_id: 'BNRPJ8912K', mobile: '9179043210',
      citizen_email: '', district: 'Ujjain', block_or_ward: 'Tarana Block, Nanakheda', region_type: 'rural',
      address: 'Gram Nanakheda Krishi Feeder', dept_id: 'discom',
      title: '100 KVA agricultural transformer burnt with sparking wires',
      description: 'Transformer exploded during high voltage surge. 4 villages in darkness. Wheat crop irrigation pumps halted. Live hanging wire poses danger to school children.',
      multimodal_type: 'voice', audio_transcript: 'हमारे तराना ब्लॉक में 100 केवी का ट्रांसफार्मर फट गया है। 4 गांवों में 10 दिन से बिजली नहीं है और तार लटक रहे हैं।',
    },
  },
];

export default function FileGrievanceForm({ language = 'en', onFiled }) {
  const [departments, setDepartments] = useState([]);
  const [deptError, setDeptError] = useState('');
  const [form, setForm] = useState({
    citizen_name: '', auth_type: 'aadhaar', auth_id: '', mobile: '', citizen_email: '',
    district: 'Bhopal', block_or_ward: '', region_type: 'urban', address: '',
    dept_id: 'pwd', title: '', description: '', multimodal_type: 'text',
    photo_evidence_url: '', audio_transcript: '', evidence_verified: true,
  });
  const [photoPreview, setPhotoPreview] = useState('');
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [receipt, setReceipt] = useState(null);

  useEffect(() => {
    fetchDepartments()
      .then((d) => {
        setDepartments(d || []);
        setDeptError('');
        if (d && d.length > 0) setForm((f) => ({ ...f, dept_id: f.dept_id || d[0].id }));
      })
      .catch((err) => setDeptError(err.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectedDept = departments.find((d) => d.id === form.dept_id);

  const applyPersona = (p) => {
    setForm({
      citizen_name: p.data.citizen_name, auth_type: p.data.auth_type, auth_id: p.data.auth_id, mobile: p.data.mobile,
      citizen_email: p.data.citizen_email || '',
      district: p.data.district, block_or_ward: p.data.block_or_ward, region_type: p.data.region_type,
      address: p.data.address, dept_id: p.data.dept_id, title: p.data.title, description: p.data.description,
      multimodal_type: p.data.multimodal_type, photo_evidence_url: '',
      audio_transcript: p.data.audio_transcript || '', evidence_verified: true,
    });
    setPhotoPreview('');
    setReceipt(null);
    setError('');
  };

  const handlePhotoFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { setError('Please choose an image file (JPG/PNG).'); return; }
    if (file.size > 4 * 1024 * 1024) { setError('Image must be under 4 MB.'); return; }
    // Instant local preview; the file is stored on the backend disk at submit time.
    setPhotoPreview(URL.createObjectURL(file));
    setUploadingPhoto(true);
    setError('');
    try {
      const { url } = await uploadGrievancePhoto(file);
      setForm((f) => ({ ...f, photo_evidence_url: url, multimodal_type: f.audio_transcript ? 'multimodal' : 'photo' }));
    } catch (err) {
      setPhotoPreview('');
      setError(`Photo upload failed: ${err.message}. Check that the backend is running.`);
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.citizen_name.trim() || !form.title.trim() || !form.description.trim()) {
      setError(language === 'hi' ? 'कृपया नाम, शीर्षक और विस्तृत विवरण भरें।' : 'Please fill name, title and detailed description.');
      return;
    }
    if (!form.mobile.replace(/\D/g, '')) {
      setError(language === 'hi' ? 'ट्रैकिंग हेतु मोबाइल नंबर आवश्यक है।' : 'Mobile number is required for tracking.');
      return;
    }
    if (form.citizen_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.citizen_email.trim())) {
      setError('Please enter a valid email address or leave it blank.');
      return;
    }
    if (!form.photo_evidence_url && !form.audio_transcript) {
      setError(language === 'hi' ? 'कृपया फोटो साक्ष्य अपलोड करें या वॉइस नोट दर्ज करें।' : 'Please attach a photo proof or add a voice note.');
      return;
    }
    setSubmitting(true);
    try {
      const payload = { ...form, multimodal_type: form.photo_evidence_url && form.audio_transcript ? 'multimodal' : form.photo_evidence_url ? 'photo' : form.audio_transcript ? 'voice' : 'text' };
      const res = await submitGrievance(payload);
      setReceipt(res);
      onFiled?.(res);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-5">
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-4">
          <p className="text-xs font-bold text-amber-900 mb-2">
            {language === 'hi' ? '⚡ त्वरित परीक्षण हेतु नागरिक चुनें:' : '⚡ Quick-fill citizen profiles:'}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {SAMPLE_PERSONAS.map((p) => (
              <button key={p.id} type="button" onClick={() => applyPersona(p)} className="text-left p-2.5 bg-white/90 hover:bg-white border border-amber-200 rounded-xl transition-all">
                <span className="text-xs font-bold text-slate-800 block">{p.name}</span>
                <span className="text-[10px] bg-amber-100 text-amber-800 font-semibold px-2 py-0.5 rounded-full">{p.tag}</span>
              </button>
            ))}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-6">
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
              <Building2 className="w-5 h-5 text-indigo-600" />
              <h2 className="text-sm font-bold text-slate-900">
                {language === 'hi' ? 'संबंधित विभाग चुनें (5 विभाग)' : 'Select concerned department (5 desks)'}
              </h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {departments.map((d) => (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => setForm({ ...form, dept_id: d.id })}
                  className={`text-left p-3 rounded-2xl border transition-all ${form.dept_id === d.id ? 'border-indigo-500 bg-indigo-50/70 ring-2 ring-indigo-500/20' : 'border-slate-200 bg-white hover:border-indigo-300'}`}
                >
                  <p className="text-xs font-bold text-slate-900">{language === 'hi' ? d.name_hi : d.name_en}</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">{language === 'hi' ? d.description_hi : d.description_en}</p>
                  <p className="text-[10px] text-indigo-600 font-mono mt-1">{d.contact_email}</p>
                </button>
              ))}
            </div>
            {deptError && (
              <p className="text-[11px] text-rose-600 font-semibold bg-rose-50 border border-rose-200 rounded-xl p-2.5">
                Department list failed: {deptError}. Check that the backend is running.
              </p>
            )}
            {selectedDept && (
              <p className="text-[11px] text-slate-500 bg-slate-50 border border-slate-200 rounded-xl p-2.5">
                {language === 'hi' ? 'चयनित डेस्क पर वास्तविक ईमेल सूचना भेजी जाएगी: ' : 'A real email notification goes to the selected desk: '}
                <strong className="text-slate-800">{language === 'hi' ? selectedDept.authority_l1_hi : selectedDept.authority_l1_en}</strong>
                {' '}({selectedDept.contact_email})
              </p>
            )}
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
              <UserCheck className="w-5 h-5 text-indigo-600" />
              <h2 className="text-sm font-bold text-slate-900">{language === 'hi' ? 'नागरिक पहचान एवं स्थान' : 'Citizen identity & location'}</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Citizen name *</label>
                <input value={form.citizen_name} onChange={(e) => setForm({ ...form, citizen_name: e.target.value })} placeholder="e.g. Ramesh Patel" className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Mobile (tracking) *</label>
                <input value={form.mobile} onChange={(e) => setForm({ ...form, mobile: e.target.value })} placeholder="10-digit mobile" inputMode="numeric" className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Email for receipt + status updates (optional, real delivery)</label>
              <input type="email" value={form.citizen_email} onChange={(e) => setForm({ ...form, citizen_email: e.target.value })} placeholder="you@example.com" className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Aadhaar / PAN *</label>
                <div className="flex gap-2">
                  <select value={form.auth_type} onChange={(e) => setForm({ ...form, auth_type: e.target.value })} className="px-2 py-2.5 rounded-xl border border-slate-200 text-xs font-bold bg-slate-50">
                    <option value="aadhaar">Aadhaar</option>
                    <option value="pan">PAN</option>
                  </select>
                  <input value={form.auth_id} onChange={(e) => setForm({ ...form, auth_id: e.target.value })} placeholder="ID" className="flex-1 px-3 py-2.5 rounded-xl border border-slate-200 text-sm font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">District *</label>
                <select value={form.district} onChange={(e) => setForm({ ...form, district: e.target.value })} className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm bg-white">
                  {MP_DISTRICTS.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Area *</label>
                <div className="grid grid-cols-2 gap-1 p-1 bg-slate-100 rounded-xl">
                  {['rural', 'urban'].map((r) => (
                    <button key={r} type="button" onClick={() => setForm({ ...form, region_type: r })} className={`py-1.5 rounded-lg text-xs font-bold ${form.region_type === r ? 'bg-indigo-600 text-white' : 'text-slate-600'}`}>
                      {r === 'rural' ? 'Rural' : 'Urban'}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <input value={form.block_or_ward} onChange={(e) => setForm({ ...form, block_or_ward: e.target.value })} placeholder="Ward / Gram Panchayat" className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
              <input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Landmark / address" className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
              <FileText className="w-5 h-5 text-indigo-600" />
              <h2 className="text-sm font-bold text-slate-900">{language === 'hi' ? 'समस्या का विवरण (पाठ + आवाज़)' : 'Problem details (text + voice)'}</h2>
            </div>
            <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Short title of the issue *" className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
            <textarea rows={4} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Describe the issue, since when, who is affected… *" className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm resize-none focus:ring-2 focus:ring-indigo-500 focus:outline-none" />

            <VoiceComplaintInput
              language={language}
              initialTranscript={form.audio_transcript}
              onTranscript={(t) => {
                setForm((f) => ({ ...f, audio_transcript: t, description: f.description || t }));
              }}
            />
            <button
              type="button"
              onClick={() => form.audio_transcript && setForm((f) => ({ ...f, description: f.audio_transcript + (f.description && f.description !== f.audio_transcript ? `\n\n${f.description}` : '') }))}
              className="text-[11px] font-bold text-indigo-700 hover:underline"
            >
              {language === 'hi' ? '⬇ वॉइस पाठ को विवरण में जोड़ें' : '⬇ Insert voice text into description'}
            </button>

            <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/60 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5"><Camera className="w-4 h-4 text-indigo-600" /> {language === 'hi' ? 'फोटो साक्ष्य (अनिवार्य)' : 'Photo proof (required)'}</span>
                {photoPreview && <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">Attached</span>}
              </div>
              {photoPreview ? (
                <div className="relative rounded-xl overflow-hidden border border-slate-200">
                  <img src={photoPreview} alt="proof" className="w-full h-40 object-cover" />
                  <button type="button" onClick={() => { setPhotoPreview(''); setForm((f) => ({ ...f, photo_evidence_url: '' })); }} className="absolute top-2 right-2 w-7 h-7 bg-rose-600 text-white rounded-full flex items-center justify-center shadow">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <label className="block cursor-pointer border-2 border-dashed border-slate-300 hover:border-indigo-400 rounded-2xl p-5 text-center bg-white transition-all">
                  <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handlePhotoFile} />
                  <Camera className="w-7 h-7 mx-auto text-slate-400" />
                  <p className="text-xs font-bold text-slate-700 mt-1">{language === 'hi' ? 'फोटो खींचें या अपलोड करें' : 'Capture or upload issue photo'}</p>
                  <p className="text-[11px] text-slate-400">JPG / PNG • max 4 MB • {language === 'hi' ? 'सीधे संबंधित डेस्क को भेजी जाएगी' : 'sent to the selected desk'}</p>
                </label>
              )}
            </div>
          </div>

          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-medium flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" /> {error}
            </div>
          )}

          <button type="submit" disabled={submitting || uploadingPhoto} className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-indigo-600 to-blue-600 text-white font-bold text-sm shadow-lg flex items-center justify-center gap-2 disabled:opacity-50">
            {submitting ? <><RefreshCw className="w-4 h-4 animate-spin" /> Filing…</> : uploadingPhoto ? <><RefreshCw className="w-4 h-4 animate-spin" /> Uploading photo…</> : <><Send className="w-4 h-4" /> {language === 'hi' ? 'शिकायत दर्ज करें' : 'Submit complaint'}</>}
          </button>
        </form>
      </div>

      <div className="space-y-5">
        <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm text-xs space-y-2">
          <h3 className="font-bold text-slate-900 text-sm">How routing works</h3>
          <p className="text-slate-600">① Citizen picks one of 5 departments + photo/voice proof.</p>
          <p className="text-slate-600">② Case lands on the L1 nodal desk of that department only.</p>
          <p className="text-slate-600">③ If unresolved, the desk forwards it to Collector (L2) → CM Office (L3).</p>
          <p className="text-slate-600">④ Track anytime with your mobile number.</p>
        </div>
        {receipt && (
          <div className="bg-emerald-50 rounded-3xl p-5 border-2 border-emerald-300 space-y-3">
            <p className="font-bold text-emerald-900 flex items-center gap-2"><CheckCircle2 className="w-5 h-5" /> Registered</p>
            <p className="font-mono font-extrabold text-indigo-700">{receipt.ticket_id}</p>
            <p className="text-xs text-slate-600">{receipt.department} • {Math.round((receipt.ai_confidence || 0) * 100)}% routing confidence</p>
            <TicketDossier ticket={receipt} language={language} compact />
            <button type="button" onClick={() => onFiled?.(receipt)} className="w-full py-2.5 bg-emerald-600 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5">
              Open live tracking <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
