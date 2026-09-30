import React from 'react';
import { MapPin, Clock, Mic, Camera, CheckCircle2, Flame, Layers, UserCheck } from 'lucide-react';
import { workflowLabel, levelLabel, WORKFLOW_META } from './workflow';
import { resolveUploadUrl } from '../../api/client';

export function StatusPill({ value, language = 'en' }) {
  const key = (value || 'open').toLowerCase();
  const meta = WORKFLOW_META[key] || WORKFLOW_META.open;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border ${meta.bg}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />
      {workflowLabel(value, language)}
    </span>
  );
}

export function LevelPill({ level, language = 'en' }) {
  const color = level === 3 ? 'bg-rose-100 text-rose-800 border-rose-200'
    : level === 2 ? 'bg-amber-100 text-amber-800 border-amber-200'
    : 'bg-blue-100 text-blue-800 border-blue-200';
  return (
    <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold border ${color}`}>
      {levelLabel(level, language)}
    </span>
  );
}

export default function TicketDossier({ ticket, language = 'en', compact = false }) {
  if (!ticket) return null;
  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="p-5 sm:p-6 space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-sm font-extrabold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md">
            {ticket.ticket_id}
          </span>
          <LevelPill level={ticket.escalation_level} language={language} />
          <StatusPill value={ticket.workflow_status} language={language} />
          {ticket.priority === 'Critical' && (
            <span className="text-[10px] font-bold bg-rose-600 text-white px-2 py-0.5 rounded-full flex items-center gap-1">
              <Flame className="w-3 h-3" /> CRITICAL
            </span>
          )}
          <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
            {(ticket.region_type || '').toUpperCase()} • {ticket.district}
          </span>
        </div>

        <div>
          <h3 className="text-base sm:text-lg font-bold text-slate-900 leading-snug">{ticket.title}</h3>
          <p className="text-xs text-slate-600 mt-1">
            {ticket.department} • {ticket.block_or_ward} • {ticket.created_at}
          </p>
        </div>

        <p className="text-xs sm:text-sm text-slate-700 leading-relaxed bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
          {ticket.description}
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
          <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
            <span className="text-[10px] text-slate-500 block">Citizen</span>
            <span className="font-semibold text-slate-800">{ticket.citizen_name}</span>
          </div>
          <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
            <span className="text-[10px] text-slate-500 block">Contact (masked)</span>
            <span className="font-semibold text-slate-800 font-mono">{ticket.mobile_masked}</span>
          </div>
          <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
            <span className="text-[10px] text-slate-500 block flex items-center gap-1"><Clock className="w-3 h-3" /> SLA</span>
            <span className="font-bold text-slate-800">
              {ticket.workflow_status === 'resolved' ? (language === 'hi' ? 'पूर्ण' : 'Done') : `${ticket.sla_days_remaining} days left`}
            </span>
          </div>
          <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
            <span className="text-[10px] text-slate-500 block">Desk mail</span>
            <span className="font-semibold text-indigo-700 text-[11px] break-all">{ticket.dept_contact_email || '—'}</span>
          </div>
        </div>

        {(ticket.photo_evidence_url || ticket.audio_transcript) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {ticket.photo_evidence_url ? (
              <div className="rounded-2xl overflow-hidden border border-slate-200">
                <img src={resolveUploadUrl(ticket.photo_evidence_url)} alt="Issue proof" className="w-full h-44 object-cover" />
                <div className="p-2 bg-slate-900 text-white text-[11px] flex items-center justify-between">
                  <span className="flex items-center gap-1"><Camera className="w-3.5 h-3.5" /> {language === 'hi' ? 'फोटो साक्ष्य' : 'Photo proof'}</span>
                  <span className="text-emerald-400 font-mono">verified</span>
                </div>
              </div>
            ) : (
              <div className="h-24 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-400 text-xs">
                {language === 'hi' ? 'केवल पाठ्य शिकायत' : 'Text-only complaint'}
              </div>
            )}
            {ticket.audio_transcript ? (
              <div className="p-3 bg-indigo-50/70 rounded-2xl border border-indigo-200 text-xs text-indigo-900">
                <p className="font-bold flex items-center gap-1 mb-1"><Mic className="w-3.5 h-3.5 text-indigo-600" /> {language === 'hi' ? 'ऑडियो प्रतिलेख' : 'Voice transcript'}</p>
                <p className="italic text-[11px]">“{ticket.audio_transcript}”</p>
              </div>
            ) : null}
          </div>
        )}

        {ticket.is_duplicate && (
          <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200 text-xs text-amber-900 flex items-start gap-2">
            <Layers className="w-4 h-4 flex-shrink-0 text-amber-600" />
            <span>{ticket.duplicate_summary} (#{ticket.duplicate_of_ticket_id})</span>
          </div>
        )}

        {!compact && (
          <div className="space-y-3 pt-3 border-t border-slate-100">
            <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <UserCheck className="w-3.5 h-3.5" /> {language === 'hi' ? 'कार्रवाई समयरेखा' : 'Action timeline'}
            </h4>
            <div className="space-y-3 relative pl-6 before:content-[''] before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
              {(ticket.timeline || []).map((step, idx) => (
                <div key={idx} className="relative">
                  <div className={`w-2.5 h-2.5 rounded-full absolute -left-[21px] top-1.5 ring-4 ring-white ${step.stage === 'RESOLVED' ? 'bg-emerald-500' : step.stage?.startsWith('L3') ? 'bg-rose-500' : step.stage?.startsWith('L2') ? 'bg-amber-500' : 'bg-indigo-600'}`} />
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-bold text-slate-800">{step.actor}</span>
                    <span className="text-[10px] text-slate-400">{step.timestamp}</span>
                    <span className="text-[9px] font-bold bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">{step.stage}</span>
                  </div>
                  <p className="text-xs text-slate-600 mt-0.5">{step.message}</p>
                </div>
              ))}
            </div>
            {(ticket.approval_requests || []).length > 0 && (
              <div className="p-3 bg-purple-50 rounded-2xl border border-purple-200 space-y-2">
                <p className="text-[11px] font-bold text-purple-900">Approval trail</p>
                {ticket.approval_requests.map((a, i) => (
                  <div key={i} className="text-[11px] text-purple-900 bg-white rounded-xl p-2 border border-purple-100">
                    <span className="font-bold">L{a.from_level} → L{a.target_level}</span> • {a.requested_by} • {a.decision}
                    <div className="text-purple-700">{a.note}</div>
                    {a.response_comment && <div className="text-slate-600">Reply: {a.response_comment}</div>}
                  </div>
                ))}
              </div>
            )}
            {(ticket.email_log || []).length > 0 && (
              <div className="p-3 bg-sky-50 rounded-2xl border border-sky-200 space-y-1.5">
                <p className="text-[11px] font-bold text-sky-900">Email delivery log (live)</p>
                {(ticket.email_log || []).map((m, i) => (
                  <div key={i} className="text-[11px] bg-white rounded-xl p-2 border border-sky-100 flex items-center justify-between gap-2">
                    <span className="text-slate-700">{m.timestamp} → <span className="font-mono">{m.to}</span></span>
                    <span className={`font-bold ${m.ok ? 'text-emerald-700' : 'text-rose-600'}`}>
                      {m.ok ? `sent via ${m.provider}` : `failed: ${m.error || m.provider}`}
                    </span>
                  </div>
                ))}
              </div>
            )}
            {ticket.resolution_note && (
              <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-200 text-xs text-emerald-900 flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-600" />
                <span><strong>Resolution:</strong> {ticket.resolution_note}</span>
              </div>
            )}
            <p className="text-[10px] text-slate-400 flex items-center gap-1">
              <MapPin className="w-3 h-3" /> {ticket.address} • {ticket.district} ({ticket.block_or_ward})
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
