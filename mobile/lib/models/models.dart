class Grievance {
  final String ticketId;
  final String citizenName;
  final String authIdMasked;
  final String mobile;
  final String mobileMasked;
  final String citizenEmail;
  final String district;
  final String blockOrWard;
  final String regionType;
  final String address;
  final String title;
  final String description;
  final String multimodalType;
  final String? photoUrl;
  final String? audioTranscript;
  final String deptId;
  final String department;
  final String departmentHi;
  final String targetAuthority;
  final String status;
  final String statusHi;
  final String workflowStatus;
  final String priority;
  final double aiConfidence;
  final int escalationLevel;
  final int slaRemaining;
  final String slaDeadline;
  final String createdAt;
  final int coCount;
  final bool isDuplicate;
  final String? duplicateSummary;
  final List<TimelineStep> timeline;
  final List<ApprovalItem> approvals;
  final List<EmailLog> emailLog;
  final String? resolutionNote;

  Grievance({
    required this.ticketId,
    required this.citizenName,
    required this.authIdMasked,
    required this.mobile,
    required this.mobileMasked,
    required this.citizenEmail,
    required this.district,
    required this.blockOrWard,
    required this.regionType,
    required this.address,
    required this.title,
    required this.description,
    required this.multimodalType,
    required this.photoUrl,
    required this.audioTranscript,
    required this.deptId,
    required this.department,
    required this.departmentHi,
    required this.targetAuthority,
    required this.status,
    required this.statusHi,
    required this.workflowStatus,
    required this.priority,
    required this.aiConfidence,
    required this.escalationLevel,
    required this.slaRemaining,
    required this.slaDeadline,
    required this.createdAt,
    required this.coCount,
    required this.isDuplicate,
    required this.duplicateSummary,
    required this.timeline,
    required this.approvals,
    required this.emailLog,
    required this.resolutionNote,
  });

  factory Grievance.fromJson(Map<String, dynamic> j) {
    List<TimelineStep> steps = [];
    for (final e in (j['timeline'] as List? ?? [])) {
      steps.add(TimelineStep.fromJson(Map<String, dynamic>.from(e as Map)));
    }
    List<ApprovalItem> appr = [];
    for (final e in (j['approval_requests'] as List? ?? [])) {
      appr.add(ApprovalItem.fromJson(Map<String, dynamic>.from(e as Map)));
    }
    List<EmailLog> logs = [];
    for (final e in (j['email_log'] as List? ?? [])) {
      logs.add(EmailLog.fromJson(Map<String, dynamic>.from(e as Map)));
    }
    return Grievance(
      ticketId: '${j['ticket_id'] ?? ''}',
      citizenName: '${j['citizen_name'] ?? ''}',
      authIdMasked: '${j['auth_id_masked'] ?? ''}',
      mobile: '${j['mobile'] ?? ''}',
      mobileMasked: '${j['mobile_masked'] ?? ''}',
      citizenEmail: '${j['citizen_email'] ?? ''}',
      district: '${j['district'] ?? ''}',
      blockOrWard: '${j['block_or_ward'] ?? ''}',
      regionType: '${j['region_type'] ?? 'urban'}',
      address: '${j['address'] ?? ''}',
      title: '${j['title'] ?? ''}',
      description: '${j['description'] ?? ''}',
      multimodalType: '${j['multimodal_type'] ?? 'text'}',
      photoUrl: j['photo_evidence_url']?.toString(),
      audioTranscript: j['audio_transcript']?.toString(),
      deptId: '${j['dept_id'] ?? ''}',
      department: '${j['department'] ?? ''}',
      departmentHi: '${j['department_hi'] ?? ''}',
      targetAuthority: '${j['target_authority'] ?? ''}',
      status: '${j['status'] ?? ''}',
      statusHi: '${j['status_hi'] ?? ''}',
      workflowStatus: '${j['workflow_status'] ?? 'open'}',
      priority: '${j['priority'] ?? ''}',
      aiConfidence: (j['ai_confidence'] as num? ?? 0).toDouble(),
      escalationLevel: (j['escalation_level'] as num? ?? 1).toInt(),
      slaRemaining: (j['sla_days_remaining'] as num? ?? 0).toInt(),
      slaDeadline: '${j['sla_deadline'] ?? ''}',
      createdAt: '${j['created_at'] ?? ''}',
      coCount: (j['co_complainant_count'] as num? ?? 1).toInt(),
      isDuplicate: j['is_duplicate'] == true,
      duplicateSummary: j['duplicate_summary']?.toString(),
      timeline: steps,
      approvals: appr,
      emailLog: logs,
      resolutionNote: j['resolution_note']?.toString(),
    );
  }
}

class TimelineStep {
  final String timestamp;
  final String stage;
  final String actor;
  final String message;
  TimelineStep({required this.timestamp, required this.stage, required this.actor, required this.message});
  factory TimelineStep.fromJson(Map<String, dynamic> j) => TimelineStep(
        timestamp: '${j['timestamp'] ?? ''}',
        stage: '${j['stage'] ?? ''}',
        actor: '${j['actor'] ?? ''}',
        message: '${j['message'] ?? ''}',
      );
}

class ApprovalItem {
  final int fromLevel;
  final int targetLevel;
  final String requestedBy;
  final String note;
  final String decision;
  ApprovalItem({required this.fromLevel, required this.targetLevel, required this.requestedBy, required this.note, required this.decision});
  factory ApprovalItem.fromJson(Map<String, dynamic> j) => ApprovalItem(
        fromLevel: (j['from_level'] as num? ?? 1).toInt(),
        targetLevel: (j['target_level'] as num? ?? 2).toInt(),
        requestedBy: '${j['requested_by'] ?? ''}',
        note: '${j['note'] ?? ''}',
        decision: '${j['decision'] ?? 'pending'}',
      );
}

class EmailLog {
  final String timestamp;
  final String to;
  final String provider;
  final bool ok;
  final String error;
  EmailLog({required this.timestamp, required this.to, required this.provider, required this.ok, required this.error});
  factory EmailLog.fromJson(Map<String, dynamic> j) => EmailLog(
        timestamp: '${j['timestamp'] ?? ''}',
        to: '${j['to'] ?? ''}',
        provider: '${j['provider'] ?? ''}',
        ok: j['ok'] == true,
        error: '${j['error'] ?? ''}',
      );
}

class Department {
  final String id;
  final String nameEn;
  final String nameHi;
  final String contactEmail;
  final String authorityEn;
  final String descEn;
  final String descHi;
  Department({required this.id, required this.nameEn, required this.nameHi, required this.contactEmail, required this.authorityEn, required this.descEn, required this.descHi});
  factory Department.fromJson(Map<String, dynamic> j) => Department(
        id: '${j['id']}',
        nameEn: '${j['name_en']}',
        nameHi: '${j['name_hi'] ?? ''}',
        contactEmail: '${j['contact_email'] ?? ''}',
        authorityEn: '${j['authority_l1_en'] ?? ''}',
        descEn: '${j['description_en'] ?? ''}',
        descHi: '${j['description_hi'] ?? ''}',
      );
}

class Hotspot {
  final String district;
  final int total;
  final int critical;
  final String primaryCategory;
  final String intensity;
  final int rural;
  final int urban;
  final int l2;
  final int l3;
  Hotspot({required this.district, required this.total, required this.critical, required this.primaryCategory, required this.intensity, required this.rural, required this.urban, required this.l2, required this.l3});
  factory Hotspot.fromJson(Map<String, dynamic> j) => Hotspot(
        district: '${j['district']}',
        total: (j['total_complaints'] as num? ?? 0).toInt(),
        critical: (j['critical_count'] as num? ?? 0).toInt(),
        primaryCategory: '${j['primary_category'] ?? ''}',
        intensity: '${j['hotspot_intensity'] ?? 'Moderate'}',
        rural: (j['rural_count'] as num? ?? 0).toInt(),
        urban: (j['urban_count'] as num? ?? 0).toInt(),
        l2: (j['active_escalated_l2'] as num? ?? 0).toInt(),
        l3: (j['active_escalated_l3'] as num? ?? 0).toInt(),
      );
}

class Officer {
  final String token;
  final String email;
  final String name;
  final String designation;
  final int level;
  final String role;
  final List<String> departments;
  Officer({required this.token, required this.email, required this.name, required this.designation, required this.level, required this.role, required this.departments});
  factory Officer.fromJson(Map<String, dynamic> j) => Officer(
        token: '${j['token']}',
        email: '${j['email']}',
        name: '${j['name']}',
        designation: '${j['designation_en'] ?? ''}',
        level: (j['level'] as num? ?? 1).toInt(),
        role: '${j['role'] ?? ''}',
        departments: [for (final e in (j['departments'] as List? ?? [])) '$e'],
      );
  Map<String, dynamic> toJson() => {
        'token': token,
        'email': email,
        'name': name,
        'designation_en': designation,
        'level': level,
        'role': role,
        'departments': departments,
      };
}
