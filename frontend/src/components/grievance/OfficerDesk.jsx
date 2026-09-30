import React, { useEffect, useMemo, useState } from 'react';
import {
  ShieldCheck, LogOut, Building2, RefreshCw, Eye, Send, CheckCircle2,
  Clock, Flame, Filter, FileCheck, HandHelping,
} from 'lucide-react';
import {
  loginAuthority, listGrievances, escalateGrievance, updateGrievanceStatus,
  requestApproval, decideApproval, fetchDepartments, fetchEmailStatus,
} from '../../api/client';
import TicketDossier, { StatusPill, LevelPill } from './TicketDossier';
import AuthorityLogin from './AuthorityLogin';

const STATUS_OPTIONS = [
  { id: 'all', en: 'All states', hi: 'सभी स्थितियां' },
  { id: 'open', en: 'Open', hi: 'खुला' },
  { id: 'in_review', en: 'In Review', hi: 'समीक्षाधीन' },
  { id: 'in_progress', en: 'In Progress', hi: 'कार्रवाई जारी' },
  { id: 'resolved', en: 'Resolved', hi: 'निराकृत' },
];

export default function OfficerDesk({ language = 'en' }) {
  const [departments, setDepartments] = useState([]);
  const [email, setEmail] = useState('kumardp2707@gmail.com');
  const [password, setPassword] = useState('nodal123');
  const [user, setUser] = useState(null);
  const [token, setToken] = useState('');
  const [desk, setDesk] = useState(''); // selected dept for L1
  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [deptFilter, setDeptFilter] = useState('all');
  const [levelFilter, setLevelFilter] = useState('all');
  const [selected, setSelected] = useState(null);
  const [actionNote, setActionNote] = useState('');
  const [approvalNote, setApprovalNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [queueError, setQueueError] = useState('');
  const [emailStatus, setEmailStatus] = useState(null);

  useEffect(() => {
    fetchDepartments().then(setDepartments).catch(() => setDepartments([]));
    fetchEmailStatus().then(setEmailStatus).catch(() => setEmailStatus({ configured: false }));
  }, []);

  const deptName = (id) => {
    const d = departments.find((x) => x.id === id);
    if (!d) return id;
    return language === 'hi' ? d.name_hi : d.name_en;
  };

  const doLogin = async (e, preset) => {
    if (e) e.preventDefault();
    setLoginError('');
    const em = preset?.email || email;
    const pw = preset?.password || password;
    setLoading(true);
    try {
      const res = await loginAuthority(em, pw);
      setUser(res);
      setToken(res.token);
      setEmail(res.email);
      if (res.level === 1) {
        const first = res.departments?.[0] || 'pwd';
        setDesk(first);
        setDeptFilter(first);
      } else {
        setDeptFilter('all');
      }
      setSelected(null);
    } catch (err) {
      setLoginError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const refreshQueue = async () => {
    if (!user) return;
    setLoading(true);
    setQueueError('');
    try {
      const filters = { token };
      if (user.level === 1) {
        filters.dept_id = desk;
        if (statusFilter !== 'all') filters.workflow_status = statusFilter;
      } else {
        if (deptFilter !== 'all') filters.dept_id = deptFilter;
        if (statusFilter !== 'all') filters.workflow_status = statusFilter;
        if (levelFilter !== 'all') filters.level = Number(levelFilter);
      }
      const res = await listGrievances(filters);
      setQueue(res.grievances || []);
      if (selected) {
        const upd = (res.grievances || []).find((g) => g.ticket_id === selected.ticket_id);
        if (upd) setSelected(upd);
      }
    } catch (err) {
      setQueueError(err.message);
      setQueue([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) refreshQueue();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, desk, statusFilter, deptFilter, levelFilter]);

  const counts = useMemo(() => {
    const c = { open: 0, in_review: 0, in_progress: 0, resolved: 0 };
    queue.forEach((g) => { const k = (g.workflow_status || 'open'); if (c[k] !== undefined) c[k] += 1; });
    return c;
  }, [queue]);

  const officerTag = () => ({ name: user?.name || '', designation: user?.designation_en || '' });

  const runAction = async (ticketId, workflow) => {
    if (!actionNote && workflow !== 'resolved') {
      alert(language === 'hi' ? 'कृपया कार्रवाई टिप्पणी लिखें।' : 'Please write an action remark.');
      return;
    }
    if (workflow === 'resolved' && !actionNote) {
      alert(language === 'hi' ? 'समाधान टिप्पणी आवश्यक है।' : 'Resolution note is required.');
      return;
    }
    setBusy(true);
    try {
      const upd = await updateGrievanceStatus(ticketId, workflow, user.name, user.designation_en, actionNote);
      setSelected(upd);
      setActionNote('');
      await refreshQueue();
    } catch (err) {
      alert(err.message);
    } finally {
      setBusy(false);
    }
  };

  const runForward = async (ticket) => {
    const next = (ticket.escalation_level || 1) + 1;
    if (next > 3) return;
    const reason = actionNote || (next === 2 ? 'Forwarded to District Collector for higher intervention.' : 'Forwarded to CM Office apex desk.');
    if (!window.confirm(language === 'hi' ? `क्या इसे स्तर ${next} को भेजें?` : `Forward to Level ${next}?`)) return;
    setBusy(true);
    try {
      const upd = await escalateGrievance(ticket.ticket_id, next, reason, officerTag());
      setSelected(upd);
      setActionNote('');
      await refreshQueue();
    } catch (err) {
      alert(err.message);
    } finally {
      setBusy(false);
    }
  };

  const runApprovalRequest = async (ticket) => {
    const target = Math.min(3, (ticket.escalation_level || 1) + 1);
    if (!approvalNote) {
      alert(language === 'hi' ? 'अनुमोदन हेतु नोट लिखें।' : 'Please write the approval note.');
      return;
    }
    setBusy(true);
    try {
      const upd = await requestApproval(ticket.ticket_id, user.name, user.designation_en, target, approvalNote);
      setSelected(upd);
      setApprovalNote('');
      await refreshQueue();
    } catch (err) {
      alert(err.message);
    } finally {
      setBusy(false);
    }
  };

  const runApprovalDecision = async (ticket, idx, decision) => {
    setBusy(true);
    try {
      const upd = await decideApproval(ticket.ticket_id, idx, decision, user.name, user.designation_en, decision === 'approved' ? 'Sanction granted. Proceed with field action.' : 'Returned with observations.');
      setSelected(upd);
      await refreshQueue();
    } catch (err) {
      alert(err.message);
    } finally {
      setBusy(false);
    }
  };

  if (!user) {
    return (
      <AuthorityLogin
        language={language}
        email={email}
        setEmail={setEmail}
        password={password}
        setPassword={setPassword}
        onLogin={doLogin}
        loading={loading}
        loginError={loginError}
        emailStatus={emailStatus}
      />
    );
  }

  return (
    <div className="space-y-5">
      <div className="bg-slate-900 text-white rounded-3xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-white/10 flex items-center justify-center border border-white/15">
            <ShieldCheck className="w-6 h-6 text-amber-300" />
          </div>
          <div>
            <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">
              {user.level === 1 ? 'Department nodal desk' : user.level === 2 ? 'District collector desk' : 'CM Office apex desk'}
            </p>
            <p className="font-bold">{user.name} • {user.designation_en}</p>
            <p className="text-xs font-mono text-slate-400">{user.email} • Level {user.level} • mail {emailStatus?.configured ? `ON (${emailStatus.provider})` : 'OFF'}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={refreshQueue} className="px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/15 rounded-xl text-xs font-bold flex items-center gap-1.5">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
          <button onClick={() => { setUser(null); setToken(''); setQueue([]); setSelected(null); }} className="px-4 py-2 bg-rose-600 hover:bg-rose-500 rounded-xl text-xs font-bold flex items-center gap-1.5">
            <LogOut className="w-3.5 h-3.5" /> Sign out
          </button>
        </div>
      </div>

      {user.level === 1 && (
        <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm">
          <p className="text-xs font-bold text-slate-700 mb-2 flex items-center gap-1.5"><Building2 className="w-4 h-4 text-indigo-600" /> Select your department desk <span className="font-normal text-slate-400">(all 5 desks share {user.email})</span></p>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {departments.map((d) => (
              <button
                key={d.id}
                onClick={() => { setDesk(d.id); setSelected(null); }}
                className={`p-2.5 rounded-xl border text-xs font-bold transition-all ${desk === d.id ? 'bg-indigo-600 text-white border-indigo-600 shadow' : 'bg-slate-50 text-slate-700 border-slate-200 hover:border-indigo-300'}`}
              >
                {language === 'hi' ? d.name_hi : d.name_en.split('(')[0]}
              </button>
            ))}
          </div>
          <p className="text-[11px] text-slate-500 mt-2">Now viewing only <strong className="text-slate-800">{deptName(desk)}</strong> queue — other departments are hidden from this desk.</p>
        </div>
      )}

      {user.level === 3 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { k: 'open', icon: Clock, ring: 'border-sky-200 bg-sky-50' },
            { k: 'in_review', icon: Eye, ring: 'border-amber-200 bg-amber-50' },
            { k: 'in_progress', icon: Flame, ring: 'border-indigo-200 bg-indigo-50' },
            { k: 'resolved', icon: CheckCircle2, ring: 'border-emerald-200 bg-emerald-50' },
          ].map((s) => (
            <button key={s.k} onClick={() => setStatusFilter(s.k)} className={`rounded-2xl border p-4 text-left ${s.ring} ${statusFilter === s.k ? 'ring-2 ring-slate-900/20' : ''}`}>
              <s.icon className="w-5 h-5 text-slate-700" />
              <p className="text-2xl font-extrabold text-slate-900 mt-1">{counts[s.k] || 0}</p>
              <p className="text-xs font-bold text-slate-600 capitalize">{s.k.replace('_', ' ')}</p>
            </button>
          ))}
        </div>
      )}

      <div className="bg-white rounded-3xl border border-slate-200 p-4 shadow-sm flex flex-wrap items-center gap-2 text-xs">
        <span className="font-bold text-slate-500 flex items-center gap-1"><Filter className="w-3.5 h-3.5" /> Filters:</span>
        {user.level !== 1 && (
          <select value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)} className="px-3 py-2 rounded-xl border border-slate-200 bg-white font-semibold">
            <option value="all">All 5 departments</option>
            {departments.map((d) => <option key={d.id} value={d.id}>{language === 'hi' ? d.name_hi : d.name_en}</option>)}
          </select>
        )}
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-3 py-2 rounded-xl border border-slate-200 bg-white font-semibold">
          {STATUS_OPTIONS.map((s) => <option key={s.id} value={s.id}>{language === 'hi' ? s.hi : s.en}</option>)}
        </select>
        {user.level > 1 && (
          <select value={levelFilter} onChange={(e) => setLevelFilter(e.target.value)} className="px-3 py-2 rounded-xl border border-slate-200 bg-white font-semibold">
            <option value="all">All tiers</option>
            <option value="1">Tier 1</option>
            <option value="2">Tier 2</option>
            <option value="3">Tier 3</option>
          </select>
        )}
        <span className="ml-auto text-slate-400 font-semibold">{queue.length} case(s) in view</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="space-y-3 max-h-[900px] overflow-y-auto pr-1">
          {queueError && (
            <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 text-xs text-rose-700 font-semibold">
              Live queue failed: {queueError}. Check that the backend is running.
            </div>
          )}
          {queue.map((g) => (
            <button
              key={g.ticket_id}
              onClick={() => setSelected(g)}
              className={`w-full text-left bg-white rounded-2xl p-4 border shadow-sm transition-all hover:border-indigo-300 ${selected?.ticket_id === g.ticket_id ? 'border-indigo-500 ring-2 ring-indigo-500/20' : 'border-slate-200'}`}
            >
              <div className="flex flex-wrap items-center gap-2 mb-1.5">
                <span className="font-mono text-xs font-bold text-indigo-700">{g.ticket_id}</span>
                <LevelPill level={g.escalation_level} language={language} />
                <StatusPill value={g.workflow_status} language={language} />
              </div>
              <p className="text-sm font-bold text-slate-900 line-clamp-1">{g.title}</p>
              <p className="text-[11px] text-slate-500">{deptName(g.dept_id)} • {g.district} • {g.citizen_name}</p>
            </button>
          ))}
          {queue.length === 0 && (
            <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-10 text-center text-slate-400 text-sm">
              No cases in this view. {user.level === 1 ? 'This desk sees only its own department queue.' : 'Try clearing filters.'}
            </div>
          )}
        </div>

        <div className="space-y-4">
          {!selected && (
            <div className="bg-white rounded-3xl border border-slate-200 p-10 text-center text-slate-400 text-sm">
              Select a case to take action, forward it upward, or request approval.
            </div>
          )}
          {selected && (
            <>
              <TicketDossier ticket={selected} language={language} />
              <div className="bg-white rounded-3xl border border-slate-200 p-5 space-y-4 shadow-sm">
                <h4 className="text-sm font-bold text-slate-900 flex items-center gap-1.5"><HandHelping className="w-4 h-4 text-indigo-600" /> Desk actions</h4>
                <textarea
                  value={actionNote}
                  onChange={(e) => setActionNote(e.target.value)}
                  rows={2}
                  placeholder="Write field remark / resolution note…"
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
                <div className="flex flex-wrap gap-2">
                  <button disabled={busy} onClick={() => runAction(selected.ticket_id, 'in_review')} className="px-3.5 py-2 bg-amber-100 hover:bg-amber-200 text-amber-900 rounded-xl text-xs font-bold disabled:opacity-50">Mark In Review</button>
                  <button disabled={busy} onClick={() => runAction(selected.ticket_id, 'in_progress')} className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold disabled:opacity-50">Mark In Progress</button>
                  {selected.escalation_level < 3 && selected.workflow_status !== 'resolved' && (
                    <button disabled={busy} onClick={() => runForward(selected)} className="px-3.5 py-2 bg-slate-900 hover:bg-slate-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 disabled:opacity-50">
                      <Send className="w-3.5 h-3.5" /> Forward to L{(selected.escalation_level || 1) + 1}
                    </button>
                  )}
                  {selected.workflow_status !== 'resolved' && (
                    <button disabled={busy} onClick={() => runAction(selected.ticket_id, 'resolved')} className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 disabled:opacity-50">
                      <FileCheck className="w-3.5 h-3.5" /> Resolve
                    </button>
                  )}
                </div>

                {selected.workflow_status !== 'resolved' && user.level < 3 && (
                  <div className="pt-3 border-t border-slate-100 space-y-2">
                    <p className="text-xs font-bold text-slate-700">Request approval from higher authority</p>
                    <div className="flex gap-2">
                      <input value={approvalNote} onChange={(e) => setApprovalNote(e.target.value)} placeholder={`Note for Level ${Math.min(3, (selected.escalation_level || 1) + 1)}…`} className="flex-1 px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-purple-500 focus:outline-none" />
                      <button disabled={busy} onClick={() => runApprovalRequest(selected)} className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold disabled:opacity-50">Request</button>
                    </div>
                  </div>
                )}

                {(selected.approval_requests || []).some((a) => a.decision === 'pending' && a.target_level <= user.level) && (
                  <div className="pt-3 border-t border-slate-100 space-y-2">
                    <p className="text-xs font-bold text-purple-900">Pending approvals for your tier</p>
                    {(selected.approval_requests || []).map((a, idx) => (
                      a.decision === 'pending' && a.target_level <= user.level ? (
                        <div key={idx} className="p-2.5 bg-purple-50 border border-purple-200 rounded-xl text-xs flex items-center justify-between gap-2">
                          <span className="text-purple-900">L{a.from_level} → L{a.target_level} • {a.requested_by}: {a.note}</span>
                          <span className="flex gap-1.5 flex-shrink-0">
                            <button disabled={busy} onClick={() => runApprovalDecision(selected, idx, 'approved')} className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg font-bold">Approve</button>
                            <button disabled={busy} onClick={() => runApprovalDecision(selected, idx, 'rejected')} className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg font-bold">Return</button>
                          </span>
                        </div>
                      ) : null
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
