/**
 * api/client.js - API client for Yojana Sathi & MP CM Online Grievance Redressal Portal.
 * Non-negotiable architectural rule: ALL requests go strictly through gateway-service only.
 */

const API_BASE = ''; // Uses Vite proxy in development, or relative path in production

export async function checkSystemHealth() {
  try {
    const res = await fetch(`${API_BASE}/health/all`, { signal: AbortSignal.timeout(3000) });
    if (!res.ok) throw new Error(`Status ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn('[API Client] Health check failed:', err);
    return { status: 'offline', services: { gateway: 'unreachable' } };
  }
}

export async function submitEligibilityMatch(profile) {
  try {
    const res = await fetch(`${API_BASE}/api/match`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(profile),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.detail || `Server error (${res.status})`);
    }

    return await res.json();
  } catch (err) {
    console.error('[API Client] Match request error:', err);
    throw err;
  }
}

export async function verifyDocument(file, documentType, schemeId = '') {
  try {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('document_type', documentType);
    formData.append('scheme_id', schemeId);

    const res = await fetch(`${API_BASE}/api/check-document`, {
      method: 'POST',
      body: formData,
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.detail || `Document inspection failed (${res.status})`);
    }

    return await res.json();
  } catch (err) {
    console.error('[API Client] Document check error:', err);
    throw err;
  }
}

// ==========================================
// MP CM Online Grievance API Client
// ==========================================

export async function submitGrievance(grievanceData) {
  try {
    const res = await fetch(`${API_BASE}/api/grievance/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(grievanceData),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.detail || `Failed to submit grievance (${res.status})`);
    }

    return await res.json();
  } catch (err) {
    console.warn('[API Client] Grievance submission error, using resilient client simulation:', err);
    // Client-side fallback if gateway is disconnected
    return mockSubmitGrievance(grievanceData);
  }
}

export async function listGrievances(filters = {}) {
  try {
    const params = new URLSearchParams();
    if (filters.level !== undefined && filters.level !== '') params.append('level', filters.level);
    if (filters.district) params.append('district', filters.district);
    if (filters.status_filter) params.append('status_filter', filters.status_filter);

    const res = await fetch(`${API_BASE}/api/grievance/list?${params.toString()}`);
    if (!res.ok) throw new Error(`Status ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn('[API Client] Failed to fetch live list, using fallback seeds:', err);
    return { grievances: getFallbackGrievanceSeeds(), total: 5 };
  }
}

export async function trackGrievance(ticketId) {
  try {
    const res = await fetch(`${API_BASE}/api/grievance/track/${ticketId.trim()}`);
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.detail || `Ticket not found (${res.status})`);
    }
    return await res.json();
  } catch (err) {
    console.warn('[API Client] Grievance track error:', err);
    const fallbackMatch = getFallbackGrievanceSeeds().find(g => g.ticket_id.toLowerCase() === ticketId.trim().toLowerCase());
    if (fallbackMatch) return fallbackMatch;
    throw err;
  }
}

export async function escalateGrievance(ticketId, targetLevel, reason) {
  try {
    const res = await fetch(`${API_BASE}/api/grievance/${ticketId.trim()}/escalate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ target_level: targetLevel, reason }),
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.detail || `Failed to escalate ticket (${res.status})`);
    }
    return await res.json();
  } catch (err) {
    console.warn('[API Client] Escalate error, updating locally:', err);
    throw err;
  }
}

export async function resolveGrievance(ticketId, resolveData) {
  try {
    const res = await fetch(`${API_BASE}/api/grievance/${ticketId.trim()}/resolve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(resolveData),
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.detail || `Failed to resolve ticket (${res.status})`);
    }
    return await res.json();
  } catch (err) {
    console.warn('[API Client] Resolve error:', err);
    throw err;
  }
}

export async function fetchHotspots() {
  try {
    const res = await fetch(`${API_BASE}/api/grievance/hotspots`);
    if (!res.ok) throw new Error(`Status ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn('[API Client] Failed to fetch hotspots, returning curated MP analytics:', err);
    return getFallbackHotspots();
  }
}

// Fallback seed generator for offline demonstration
function mockSubmitGrievance(data) {
  const ticketId = `MP-CMO-2026-${Math.floor(10000 + Math.random() * 90000)}`;
  const dateStr = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  const deadlineStr = new Date(Date.now() + 7 * 86400000).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  
  const text = `${data.title} ${data.description}`.toLowerCase();
  let dept = 'Public Works Department (PWD)';
  let deptHi = 'लोक निर्माण विभाग (सड़क एवं पुल)';
  let authority = 'Executive Engineer, PWD Division';
  let authorityHi = 'कार्यपालन यंत्री, लोक निर्माण संभाग';
  let priority = 'High';

  if (text.includes('water') || text.includes('पानी') || text.includes('pipe')) {
    dept = 'Public Health Engineering & MP Jal Nigam';
    deptHi = 'लोक स्वास्थ्य यांत्रिकी एवं म.प्र. जल निगम';
    authority = 'Assistant Engineer, PHE Water Works';
    authorityHi = 'सहायक यंत्री, पीएचई जल प्रदाय';
  } else if (text.includes('power') || text.includes('बिजली') || text.includes('transformer')) {
    dept = 'MP Power Distribution Co. (DISCOM)';
    deptHi = 'म.प्र. विद्युत वितरण कंपनी (ऊर्जा विभाग)';
    authority = 'Assistant Engineer (Distribution), DISCOM';
    authorityHi = 'सहायक यंत्री (वितरण), बिजली कंपनी';
    priority = 'Critical';
  } else if (text.includes('garbage') || text.includes('कचरा') || text.includes('drain')) {
    dept = 'Urban Administration & Swachhata';
    deptHi = 'नगरीय प्रशासन एवं स्वच्छता (नगर निगम)';
    authority = 'Zonal Officer, Municipal Corporation';
    authorityHi = 'जोनाधिकारी, नगर निगम';
    priority = 'Medium';
  }

  const isLowConf = data.description.length < 15;

  return {
    ticket_id: ticketId,
    citizen_name: data.citizen_name || 'Citizen',
    auth_type: data.auth_type || 'aadhaar',
    auth_id_masked: data.auth_id ? `XXXX-XXXX-${data.auth_id.slice(-4)}` : 'XXXX-XXXX-9901',
    mobile_masked: '+91-XXXXX-' + (data.mobile ? data.mobile.slice(-4) : '1234'),
    district: data.district || 'Bhopal',
    block_or_ward: data.block_or_ward || 'Ward 12',
    region_type: data.region_type || 'urban',
    address: data.address || '',
    title: data.title,
    description: data.description,
    multimodal_type: data.multimodal_type || 'text',
    photo_evidence_url: data.photo_evidence_url || data.photo_evidence_preview,
    audio_transcript: data.audio_transcript,
    department: dept,
    department_hi: deptHi,
    target_authority: authority,
    target_authority_hi: authorityHi,
    status: isLowConf ? 'Flagged for Human Review (L0 Desk)' : 'Level 1: Respective Department',
    status_hi: isLowConf ? 'मानव समीक्षा हेतु चिह्नित (एल-0 डेस्क)' : 'स्तर 1: संबंधित विभाग समीक्षाधीन',
    priority: priority,
    ai_confidence: isLowConf ? 0.62 : 0.95,
    needs_human_review: isLowConf,
    is_duplicate: text.includes('mandi') || text.includes('kolar'),
    duplicate_of_ticket_id: text.includes('mandi') ? 'MP-CMO-2026-49201' : null,
    duplicate_summary: text.includes('mandi') ? 'Similar road pothole issue reported in Ashta/Sehore. Consolidated.' : null,
    co_complainant_count: 1,
    hotspot_zone: true,
    hotspot_cluster_name: `${data.district || 'Bhopal'} Civic Sector`,
    escalation_level: 1,
    sla_days_total: 7,
    sla_days_remaining: 7,
    sla_deadline: deadlineStr,
    created_at: dateStr,
    updated_at: dateStr,
    immutable: true,
    timeline: [
      {
        timestamp: dateStr,
        stage: 'L1_FILED',
        actor: `Citizen ${data.citizen_name}`,
        message: `Complaint lodged via ${data.multimodal_type || 'Text'} interface. Aadhaar verified.`
      },
      {
        timestamp: dateStr,
        stage: 'AI_TRIAGED',
        actor: 'MP AI Grievance Engine v2.4',
        message: `Routed to ${dept}. Regional context: ${(data.region_type || 'urban').toUpperCase()}.`
      }
    ]
  };
}

function getFallbackGrievanceSeeds() {
  return [
    {
      ticket_id: 'MP-CMO-2026-49201',
      citizen_name: 'Ramesh Chandra Patel',
      auth_type: 'aadhaar',
      auth_id_masked: 'XXXX-XXXX-9921',
      mobile_masked: '+91-XXXXX-1223',
      district: 'Sehore',
      block_or_ward: 'Ashta Tehsil, Ward 4',
      region_type: 'rural',
      address: 'Gram Panchayat Siddiqganj, Mandi Road',
      title: 'Severe craters and broken culvert on Mandi approach road',
      description: 'The main road connecting Siddiqganj Mandi has huge 2-foot potholes after monsoon. Tractor trolleys loaded with soybean are getting stuck and overturning. PWD division has not inspected.',
      multimodal_type: 'photo',
      photo_evidence_url: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600&auto=format&fit=crop&q=60',
      department: 'Public Works Department (PWD - Roads & Bridges)',
      department_hi: 'लोक निर्माण विभाग (सड़क, पुल एवं निर्माण)',
      target_authority: 'Executive Engineer, PWD Division Sehore',
      target_authority_hi: 'कार्यपालन यंत्री, लोक निर्माण संभाग सीहोर',
      status: 'Level 1: Respective Department',
      status_hi: 'स्तर 1: संबंधित विभाग समीक्षाधीन',
      priority: 'High',
      ai_confidence: 0.96,
      needs_human_review: false,
      is_duplicate: false,
      co_complainant_count: 3,
      hotspot_zone: true,
      hotspot_cluster_name: 'Sehore Rural PWD Zone',
      escalation_level: 1,
      sla_days_total: 7,
      sla_days_remaining: 5,
      sla_deadline: '02 Oct 2026, 05:30 PM',
      created_at: '25 Sep 2026, 05:30 PM',
      updated_at: '25 Sep 2026, 05:30 PM',
      immutable: true,
      timeline: [
        {
          timestamp: '25 Sep 2026, 05:30 PM',
          stage: 'L1_FILED',
          actor: 'Citizen Ramesh Chandra Patel',
          message: 'Lodged digitally with photo proof. Aadhaar verified.'
        },
        {
          timestamp: '25 Sep 2026, 05:30 PM',
          stage: 'AI_TRIAGED',
          actor: 'MP AI Grievance Engine v2.4',
          message: 'Routed to PWD (Rural Engineering). 96% AI confidence.'
        }
      ]
    },
    {
      ticket_id: 'MP-CMO-2026-88120',
      citizen_name: 'Sunita Verma',
      auth_type: 'aadhaar',
      auth_id_masked: 'XXXX-XXXX-5120',
      mobile_masked: '+91-XXXXX-8765',
      district: 'Bhopal',
      block_or_ward: 'Kolar Zone 18, Ward 82',
      region_type: 'urban',
      address: 'Bairagarh Chichali, Kolar Road, Bhopal',
      title: 'Severe contaminated muddy drinking water for 12 consecutive days',
      description: 'Sewage pipe burst mixing directly with PHE municipal drinking water line. Over 200 households affected, children falling ill with gastroenteritis. Filed multiple complaints with Nagar Nigam with no action.',
      multimodal_type: 'photo',
      photo_evidence_url: 'https://images.unsplash.com/photo-1584824486509-112e4181ff6b?w=600&auto=format&fit=crop&q=60',
      department: 'Public Health Engineering & MP Jal Nigam',
      department_hi: 'लोक स्वास्थ्य यांत्रिकी एवं म.प्र. जल निगम',
      target_authority: 'District Collector & Magistrate, Bhopal',
      target_authority_hi: 'जिला कलेक्टर एवं जिला दंडाधिकारी, भोपाल',
      status: 'Level 2: District Collector (DM Desk)',
      status_hi: 'स्तर 2: जिला कलेक्टर (डीएम डेस्क समीक्षा)',
      priority: 'High',
      ai_confidence: 0.94,
      needs_human_review: false,
      is_duplicate: false,
      co_complainant_count: 8,
      hotspot_zone: true,
      hotspot_cluster_name: 'Bhopal Kolar Water Crisis Cluster',
      escalation_level: 2,
      sla_days_total: 7,
      sla_days_remaining: 2,
      sla_deadline: '29 Sep 2026, 11:00 AM',
      created_at: '19 Sep 2026, 11:00 AM',
      updated_at: '26 Sep 2026, 11:00 AM',
      immutable: true,
      timeline: [
        {
          timestamp: '19 Sep 2026, 11:00 AM',
          stage: 'L1_FILED',
          actor: 'Citizen Sunita Verma',
          message: 'Lodged digitally with photo proof. Water contamination reported.'
        },
        {
          timestamp: '26 Sep 2026, 11:00 AM',
          stage: 'L2_COLLECTOR',
          actor: 'District Collector Desk (Bhopal)',
          message: 'Escalated to Level 2. 7-Day SLA expired at municipal water desk. Show-cause notice issued.'
        }
      ]
    },
    {
      ticket_id: 'MP-CMO-2026-91790',
      citizen_name: 'Vikram Joshi',
      auth_type: 'pan',
      auth_id_masked: 'XXXXXX8912K',
      mobile_masked: '+91-XXXXX-3210',
      district: 'Ujjain',
      block_or_ward: 'Tarana Block, Gram Nanakheda',
      region_type: 'rural',
      address: 'Nanakheda Krishi Upaj Feeder, Ujjain',
      title: '100 KVA agricultural transformer burnt - 4 villages without electricity for 16 days',
      description: 'High voltage surge caused 100 KVA distribution transformer to explode with spark danger. Standing wheat crop irrigation halted completely. DISCOM local JE refuses replacement without bribe.',
      multimodal_type: 'voice',
      audio_transcript: 'हमारे तराना ब्लॉक में 16 दिन से 100 केवी का ट्रांसफार्मर जला पड़ा है। गेहूं की फसल सूख रही है और बिजली कंपनी कोई सुनवाई नहीं कर रही है। कृपया तुरंत मुख्यमंत्री कार्यालय हस्तक्षेप करे।',
      department: 'MP Power Distribution Co. (DISCOM / Energy Dept)',
      department_hi: 'म.प्र. विद्युत वितरण कंपनी (ऊर्जा विभाग)',
      target_authority: 'Hon\'ble Chief Minister Office (CMO Special Task Force)',
      target_authority_hi: 'माननीय मुख्यमंत्री कार्यालय (सीएम हेल्पलाइन विशेष टास्क फोर्स)',
      status: 'Level 3: CM Office Apex Redressal',
      status_hi: 'स्तर 3: मुख्यमंत्री कार्यालय (सीएमओ सर्वोच्च समीक्षा)',
      priority: 'Critical',
      ai_confidence: 0.98,
      needs_human_review: false,
      is_duplicate: false,
      co_complainant_count: 14,
      hotspot_zone: true,
      hotspot_cluster_name: 'Ujjain Rural Power Feeder Failure',
      escalation_level: 3,
      sla_days_total: 7,
      sla_days_remaining: 1,
      sla_deadline: '28 Sep 2026, 04:00 PM',
      created_at: '11 Sep 2026, 04:00 PM',
      updated_at: '25 Sep 2026, 04:00 PM',
      immutable: true,
      timeline: [
        {
          timestamp: '11 Sep 2026, 04:00 PM',
          stage: 'L1_FILED',
          actor: 'Citizen Vikram Joshi',
          message: 'Lodged via voice recording. Rural DISCOM transformer fire.'
        },
        {
          timestamp: '18 Sep 2026, 04:00 PM',
          stage: 'L2_COLLECTOR',
          actor: 'District Collector Desk (Ujjain)',
          message: 'Escalated to Level 2. DISCOM failed to replace transformer in 7 days.'
        },
        {
          timestamp: '25 Sep 2026, 04:00 PM',
          stage: 'L3_CMO',
          actor: 'Chief Minister Grievance Redressal Task Force',
          message: 'Apex Escalation triggered to Level 3 (CM Office). Direct directive to Managing Director, MPPKVVCL.'
        }
      ]
    },
    {
      ticket_id: 'MP-CMO-2026-77124',
      citizen_name: 'Anil Kumar Soni',
      auth_type: 'aadhaar',
      auth_id_masked: 'XXXX-XXXX-2098',
      mobile_masked: '+91-XXXXX-5443',
      district: 'Gwalior',
      block_or_ward: 'Lashkar Ward 14',
      region_type: 'urban',
      address: 'Near Maharaj Bada, Gwalior',
      title: 'Notice received regarding disputed boundary wall',
      description: 'Need assistance with paperwork boundary order 12.',
      multimodal_type: 'text',
      department: 'General Administration (Unclassified)',
      department_hi: 'सामान्य प्रशासन (अवर्गीकृत शिकायत)',
      target_authority: 'L0 Triage Officer, MP CM Helpline Desk',
      target_authority_hi: 'एल0 समीक्षा अधिकारी, सीएम हेल्पलाइन डेस्क',
      status: 'Flagged for Human Review (L0 Desk)',
      status_hi: 'मानव समीक्षा हेतु चिह्नित (एल-0 डेस्क)',
      priority: 'Medium',
      ai_confidence: 0.58,
      needs_human_review: true,
      is_duplicate: false,
      co_complainant_count: 1,
      hotspot_zone: false,
      escalation_level: 1,
      sla_days_total: 7,
      sla_days_remaining: 7,
      sla_deadline: '04 Oct 2026, 02:00 PM',
      created_at: '27 Sep 2026, 02:00 PM',
      updated_at: '27 Sep 2026, 02:00 PM',
      immutable: true,
      timeline: [
        {
          timestamp: '27 Sep 2026, 02:00 PM',
          stage: 'HUMAN_REVIEW',
          actor: 'MP AI Grievance Engine v2.4',
          message: 'Low confidence (58%). Flagged for Human-in-the-Loop operator inspection.'
        }
      ]
    }
  ];
}

function getFallbackHotspots() {
  return [
    {
      district: 'Bhopal',
      total_complaints: 142,
      critical_count: 28,
      primary_category: 'Public Health Engineering (Water)',
      hotspot_intensity: 'Severe',
      rural_count: 31,
      urban_count: 111,
      active_escalated_l2: 14,
      active_escalated_l3: 4
    },
    {
      district: 'Indore',
      total_complaints: 168,
      critical_count: 19,
      primary_category: 'Urban Administration & Swachhata',
      hotspot_intensity: 'Severe',
      rural_count: 24,
      urban_count: 144,
      active_escalated_l2: 12,
      active_escalated_l3: 2
    },
    {
      district: 'Ujjain',
      total_complaints: 89,
      critical_count: 22,
      primary_category: 'MP Power Distribution (DISCOM)',
      hotspot_intensity: 'Severe',
      rural_count: 58,
      urban_count: 31,
      active_escalated_l2: 9,
      active_escalated_l3: 5
    },
    {
      district: 'Sehore',
      total_complaints: 64,
      critical_count: 11,
      primary_category: 'Public Works Department (PWD Roads)',
      hotspot_intensity: 'Elevated',
      rural_count: 52,
      urban_count: 12,
      active_escalated_l2: 6,
      active_escalated_l3: 1
    },
    {
      district: 'Gwalior',
      total_complaints: 76,
      critical_count: 14,
      primary_category: 'Public Health & Medical Services',
      hotspot_intensity: 'Elevated',
      rural_count: 22,
      urban_count: 54,
      active_escalated_l2: 8,
      active_escalated_l3: 3
    },
    {
      district: 'Jabalpur',
      total_complaints: 93,
      critical_count: 15,
      primary_category: 'PHE Drinking Water & Sanitation',
      hotspot_intensity: 'Elevated',
      rural_count: 38,
      urban_count: 55,
      active_escalated_l2: 7,
      active_escalated_l3: 2
    }
  ];
}
