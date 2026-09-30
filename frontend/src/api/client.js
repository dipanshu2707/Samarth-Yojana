/**
 * api/client.js - live API client. Every call hits the unified backend;
 * failures surface as real errors (no local mock data).
 */

const API_BASE = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');

async function parseError(res, fallback) {
  const errData = await res.json().catch(() => ({}));
  throw new Error(errData.detail || `${fallback} (${res.status})`);
}

export async function checkSystemHealth() {
  const res = await fetch(`${API_BASE}/health/all`, { signal: AbortSignal.timeout(4000) });
  if (!res.ok) await parseError(res, 'Health check failed');
  return await res.json();
}

export async function submitEligibilityMatch(profile) {
  const res = await fetch(`${API_BASE}/api/match`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(profile),
  });
  if (!res.ok) await parseError(res, 'Server error');
  return await res.json();
}

export async function verifyDocument(file, documentType, schemeId = '') {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('document_type', documentType);
  formData.append('scheme_id', schemeId);
  const res = await fetch(`${API_BASE}/api/check-document`, { method: 'POST', body: formData });
  if (!res.ok) await parseError(res, 'Document inspection failed');
  return await res.json();
}

export async function fetchDepartments() {
  const res = await fetch(`${API_BASE}/api/departments`);
  if (!res.ok) await parseError(res, 'Department list unavailable');
  return await res.json();
}

export async function submitGrievance(grievanceData) {
  const res = await fetch(`${API_BASE}/api/grievance/submit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(grievanceData),
  });
  if (!res.ok) await parseError(res, 'Failed to submit grievance');
  return await res.json();
}

export function resolveUploadUrl(url) {
  if (!url) return '';
  if (/^(data:|https?:|blob:)/i.test(url)) return url;
  return `${API_BASE}${url.startsWith('/') ? '' : '/'}${url}`;
}

export async function uploadGrievancePhoto(file, ticketId = 'tmp') {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('ticket_id', ticketId);
  const res = await fetch(`${API_BASE}/api/grievance/upload-photo`, {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) await parseError(res, 'Photo upload failed');
  return await res.json();
}

export async function fetchDbStatus() {
  const res = await fetch(`${API_BASE}/api/db/status`);
  if (!res.ok) await parseError(res, 'Storage status unavailable');
  return await res.json();
}

export async function listGrievances(filters = {}) {
  const params = new URLSearchParams();
  if (filters.level !== undefined && filters.level !== '' && filters.level !== 'all') params.append('level', filters.level);
  if (filters.district) params.append('district', filters.district);
  if (filters.status_filter) params.append('status_filter', filters.status_filter);
  if (filters.dept_id) params.append('dept_id', filters.dept_id);
  if (filters.workflow_status) params.append('workflow_status', filters.workflow_status);
  if (filters.token) params.append('token', filters.token);
  const res = await fetch(`${API_BASE}/api/grievance/list?${params.toString()}`);
  if (!res.ok) await parseError(res, 'Grievance list unavailable');
  return await res.json();
}

export async function trackGrievance(ticketId) {
  const res = await fetch(`${API_BASE}/api/grievance/track/${ticketId.trim()}`);
  if (!res.ok) await parseError(res, 'Ticket not found');
  return await res.json();
}

export async function fetchGrievancesByMobile(mobile) {
  const digits = String(mobile || '').replace(/\D/g, '').slice(-10);
  if (digits.length !== 10) throw new Error('Please enter a valid 10-digit mobile number.');
  const res = await fetch(`${API_BASE}/api/grievance/by-mobile/${digits}`);
  if (!res.ok) await parseError(res, 'Lookup failed');
  const data = await res.json();
  if (!data.grievances || data.grievances.length === 0) {
    throw new Error('No complaints found for this mobile number. Please check the number.');
  }
  return data;
}

export async function escalateGrievance(ticketId, targetLevel, reason, officer = {}) {
  const res = await fetch(`${API_BASE}/api/grievance/${ticketId.trim()}/escalate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      target_level: targetLevel,
      reason,
      escalated_by: officer.name || '',
      designation: officer.designation || '',
    }),
  });
  if (!res.ok) await parseError(res, 'Failed to forward ticket');
  return await res.json();
}

export async function updateGrievanceStatus(ticketId, workflowStatus, officerName, officerDesignation, remark) {
  const res = await fetch(`${API_BASE}/api/grievance/${ticketId.trim()}/status`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      workflow_status: workflowStatus,
      officer_name: officerName,
      officer_designation: officerDesignation,
      remark: remark || '',
    }),
  });
  if (!res.ok) await parseError(res, 'Failed to update status');
  return await res.json();
}

export async function requestApproval(ticketId, requestedBy, designation, targetLevel, note) {
  const res = await fetch(`${API_BASE}/api/grievance/${ticketId.trim()}/request-approval`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ requested_by: requestedBy, designation, target_level: targetLevel, note }),
  });
  if (!res.ok) await parseError(res, 'Approval request failed');
  return await res.json();
}

export async function decideApproval(ticketId, index, decision, responder, responderDesignation, comment) {
  const res = await fetch(`${API_BASE}/api/grievance/${ticketId.trim()}/approval-decision`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ index, decision, responder, responder_designation: responderDesignation, comment: comment || '' }),
  });
  if (!res.ok) await parseError(res, 'Approval decision failed');
  return await res.json();
}

export async function resolveGrievance(ticketId, resolveData) {
  const res = await fetch(`${API_BASE}/api/grievance/${ticketId.trim()}/resolve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(resolveData),
  });
  if (!res.ok) await parseError(res, 'Failed to resolve ticket');
  return await res.json();
}

export async function fetchHotspots() {
  const res = await fetch(`${API_BASE}/api/grievance/hotspots`);
  if (!res.ok) await parseError(res, 'Hotspot data unavailable');
  return await res.json();
}

export async function fetchEmailStatus() {
  const res = await fetch(`${API_BASE}/api/email/status`);
  if (!res.ok) await parseError(res, 'Email status unavailable');
  return await res.json();
}

export async function sendTestEmail(to) {
  const res = await fetch(`${API_BASE}/api/email/test`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ to }),
  });
  if (!res.ok) await parseError(res, 'Test delivery failed');
  return await res.json();
}

export const SEEDED_AUTHORITIES = [
  { email: 'kumardp2707@gmail.com', password: 'nodal123', level: 1, title: 'Department Nodal Officer (L1)', title_hi: 'विभागीय नोडल अधिकारी' },
  { email: 'manilal2357@gmail.com', password: 'collector123', level: 2, title: 'District Collector (L2)', title_hi: 'जिला कलेक्टर' },
  { email: '0585mt241001@pimrbhopal.ac.in', password: 'cmo123', level: 3, title: 'CM Office Apex (L3)', title_hi: 'मुख्यमंत्री कार्यालय' },
];

export async function loginAuthority(email, password, deptId = '') {
  const res = await fetch(`${API_BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, dept_id: deptId || undefined }),
  });
  if (!res.ok) await parseError(res, 'Login failed');
  return await res.json();
}
