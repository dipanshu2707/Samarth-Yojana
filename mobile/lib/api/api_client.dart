import 'dart:convert';
import 'package:http/http.dart' as http;
import '../models/models.dart';

ApiException _err(http.Response r, String fallback) {
  try {
    final m = jsonDecode(r.body) as Map<String, dynamic>;
    return ApiException('${m['detail'] ?? fallback} (${r.statusCode})');
  } catch (_) {
    return ApiException('$fallback (${r.statusCode})');
  }
}

class ApiException implements Exception {
  final String message;
  ApiException(this.message);
  @override
  String toString() => message;
}

class Api {
  final String base;
  Api(this.base);

  String resolve(String? url) {
    if (url == null || url.isEmpty) return '';
    if (url.startsWith('data:') || url.startsWith('http') || url.startsWith('blob:')) return url;
    return '$base${url.startsWith('/') ? '' : '/'}$url';
  }

  Future<Map<String, dynamic>> health() async {
    final r = await http.get(Uri.parse('$base/health/all')).timeout(const Duration(seconds: 8));
    if (r.statusCode != 200) throw _err(r, 'Backend unreachable');
    return jsonDecode(r.body) as Map<String, dynamic>;
  }

  Future<List<Department>> departments() async {
    final r = await http.get(Uri.parse('$base/api/departments')).timeout(const Duration(seconds: 10));
    if (r.statusCode != 200) throw _err(r, 'Departments unavailable');
    return [(jsonDecode(r.body) as List).map((e) => Department.fromJson(Map<String, dynamic>.from(e as Map))).toList()][0];
  }

  Future<Grievance> submitGrievance(Map<String, dynamic> payload) async {
    final r = await http
        .post(Uri.parse('$base/api/grievance/submit'), headers: {'Content-Type': 'application/json'}, body: jsonEncode(payload))
        .timeout(const Duration(seconds: 30));
    if (r.statusCode != 200) throw _err(r, 'Submit failed');
    return Grievance.fromJson(jsonDecode(r.body) as Map<String, dynamic>);
  }

  Future<String> uploadPhoto(String path, {String ticketId = 'tmp'}) async {
    final req = http.MultipartRequest('POST', Uri.parse('$base/api/grievance/upload-photo'));
    req.fields['ticket_id'] = ticketId;
    req.files.add(await http.MultipartFile.fromPath('file', path));
    final resp = await req.send().timeout(const Duration(seconds: 30));
    final body = await http.Response.fromStream(resp);
    if (resp.statusCode != 200) throw _err(body, 'Photo upload failed');
    return (jsonDecode(body.body) as Map<String, dynamic>)['url'] as String;
  }

  Future<List<Grievance>> byMobile(String mobile) async {
    final digits = mobile.replaceAll(RegExp(r'\D'), '');
    if (digits.length != 10) throw ApiException('Enter a valid 10-digit mobile number.');
    final tail = digits.substring(digits.length - 10);
    final r = await http.get(Uri.parse('$base/api/grievance/by-mobile/$tail')).timeout(const Duration(seconds: 12));
    if (r.statusCode != 200) throw _err(r, 'Lookup failed');
    final m = jsonDecode(r.body) as Map<String, dynamic>;
    final list = (m['grievances'] as List? ?? []);
    if (list.isEmpty) throw ApiException('No complaints found for this number.');
    return list.map((e) => Grievance.fromJson(Map<String, dynamic>.from(e as Map))).toList();
  }

  Future<Grievance> track(String id) async {
    final r = await http.get(Uri.parse('$base/api/grievance/track/${id.trim()}')).timeout(const Duration(seconds: 12));
    if (r.statusCode != 200) throw _err(r, 'Ticket not found');
    return Grievance.fromJson(jsonDecode(r.body) as Map<String, dynamic>);
  }

  Future<List<Grievance>> list({String? deptId, String? workflow, int? level, String? token}) async {
    final q = <String, String>{};
    if (deptId != null && deptId.isNotEmpty && deptId != 'all') q['dept_id'] = deptId;
    if (workflow != null && workflow.isNotEmpty && workflow != 'all') q['workflow_status'] = workflow;
    if (level != null) q['level'] = '$level';
    if (token != null && token.isNotEmpty) q['token'] = token;
    final uri = Uri.parse('$base/api/grievance/list').replace(queryParameters: q.isEmpty ? null : q);
    final r = await http.get(uri).timeout(const Duration(seconds: 12));
    if (r.statusCode != 200) throw _err(r, 'Queue unavailable');
    final m = jsonDecode(r.body) as Map<String, dynamic>;
    return [(m['grievances'] as List? ?? []).map((e) => Grievance.fromJson(Map<String, dynamic>.from(e as Map))).toList()][0];
  }

  Future<List<Hotspot>> hotspots() async {
    final r = await http.get(Uri.parse('$base/api/grievance/hotspots')).timeout(const Duration(seconds: 12));
    if (r.statusCode != 200) throw _err(r, 'Heatmap unavailable');
    return [(jsonDecode(r.body) as List).map((e) => Hotspot.fromJson(Map<String, dynamic>.from(e as Map))).toList()][0];
  }

  Future<Officer> login(String email, String password) async {
    final r = await http
        .post(Uri.parse('$base/api/auth/login'),
            headers: {'Content-Type': 'application/json'}, body: jsonEncode({'email': email, 'password': password}))
        .timeout(const Duration(seconds: 12));
    if (r.statusCode != 200) throw _err(r, 'Login failed');
    return Officer.fromJson(jsonDecode(r.body) as Map<String, dynamic>);
  }

  Future<Grievance> setStatus(String id, String workflow, String name, String desg, String remark) async {
    final r = await http
        .post(Uri.parse('$base/api/grievance/${id.trim()}/status'),
            headers: {'Content-Type': 'application/json'},
            body: jsonEncode({'workflow_status': workflow, 'officer_name': name, 'officer_designation': desg, 'remark': remark}))
        .timeout(const Duration(seconds: 20));
    if (r.statusCode != 200) throw _err(r, 'Status update failed');
    return Grievance.fromJson(jsonDecode(r.body) as Map<String, dynamic>);
  }

  Future<Grievance> escalate(String id, int target, String reason, String by, String desg) async {
    final r = await http
        .post(Uri.parse('$base/api/grievance/${id.trim()}/escalate'),
            headers: {'Content-Type': 'application/json'},
            body: jsonEncode({'target_level': target, 'reason': reason, 'escalated_by': by, 'designation': desg}))
        .timeout(const Duration(seconds: 20));
    if (r.statusCode != 200) throw _err(r, 'Forward failed');
    return Grievance.fromJson(jsonDecode(r.body) as Map<String, dynamic>);
  }

  Future<Grievance> requestApproval(String id, String by, String desg, int target, String note) async {
    final r = await http
        .post(Uri.parse('$base/api/grievance/${id.trim()}/request-approval'),
            headers: {'Content-Type': 'application/json'},
            body: jsonEncode({'requested_by': by, 'designation': desg, 'target_level': target, 'note': note}))
        .timeout(const Duration(seconds: 20));
    if (r.statusCode != 200) throw _err(r, 'Approval request failed');
    return Grievance.fromJson(jsonDecode(r.body) as Map<String, dynamic>);
  }

  Future<Grievance> decideApproval(String id, int index, String decision, String by, String desg, String comment) async {
    final r = await http
        .post(Uri.parse('$base/api/grievance/${id.trim()}/approval-decision'),
            headers: {'Content-Type': 'application/json'},
            body: jsonEncode({'index': index, 'decision': decision, 'responder': by, 'responder_designation': desg, 'comment': comment}))
        .timeout(const Duration(seconds: 20));
    if (r.statusCode != 200) throw _err(r, 'Decision failed');
    return Grievance.fromJson(jsonDecode(r.body) as Map<String, dynamic>);
  }

  Future<Map<String, dynamic>> match(Map<String, dynamic> profile) async {
    final r = await http
        .post(Uri.parse('$base/api/match'), headers: {'Content-Type': 'application/json'}, body: jsonEncode(profile))
        .timeout(const Duration(seconds: 30));
    if (r.statusCode != 200) throw _err(r, 'Eligibility check failed');
    return jsonDecode(r.body) as Map<String, dynamic>;
  }

  Future<Map<String, dynamic>> checkDocument(String path, String docType) async {
    final req = http.MultipartRequest('POST', Uri.parse('$base/api/check-document'));
    req.fields['document_type'] = docType;
    req.fields['scheme_id'] = '';
    req.files.add(await http.MultipartFile.fromPath('file', path));
    final resp = await req.send().timeout(const Duration(seconds: 40));
    final body = await http.Response.fromStream(resp);
    if (resp.statusCode != 200) throw _err(body, 'Document check failed');
    return jsonDecode(body.body) as Map<String, dynamic>;
  }

  Future<Map<String, dynamic>> emailStatus() async {
    final r = await http.get(Uri.parse('$base/api/email/status')).timeout(const Duration(seconds: 10));
    if (r.statusCode != 200) throw _err(r, 'Email status unavailable');
    return jsonDecode(r.body) as Map<String, dynamic>;
  }

  Future<Map<String, dynamic>> sendTestEmail(String to) async {
    final r = await http
        .post(Uri.parse('$base/api/email/test'),
            headers: {'Content-Type': 'application/json'}, body: jsonEncode({'to': to}))
        .timeout(const Duration(seconds: 20));
    if (r.statusCode != 200) throw _err(r, 'Test delivery failed');
    return jsonDecode(r.body) as Map<String, dynamic>;
  }

  /// Wake a sleeping free-tier server: poll /health until it answers.
  /// Returns true when the backend is up. Throws the last error on timeout.
  Future<bool> wakeServer({int tries = 12, Duration gap = const Duration(seconds: 8), void Function(int attempt)? onAttempt}) async {
    Object? last;
    for (int i = 1; i <= tries; i++) {
      onAttempt?.call(i);
      try {
        final r = await http.get(Uri.parse('$base/health')).timeout(const Duration(seconds: 10));
        if (r.statusCode == 200) return true;
        last = ApiException('Server answered ${r.statusCode}');
      } catch (e) {
        last = e;
      }
      if (i < tries) await Future.delayed(gap);
    }
    throw last ?? ApiException('Server did not wake up');
  }
}
