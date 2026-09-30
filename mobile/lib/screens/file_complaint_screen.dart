import 'dart:io';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:provider/provider.dart';
import 'package:speech_to_text/speech_to_text.dart' as stt;
import '../api/api_client.dart';
import '../l10n/strings.dart';
import '../models/models.dart';
import '../state/app_state.dart';
import '../widgets/common.dart';
import 'ticket_detail.dart';

const mpDistricts = [
  'Bhopal', 'Indore', 'Ujjain', 'Gwalior', 'Jabalpur', 'Sagar', 'Rewa', 'Sehore',
  'Satna', 'Chhindwara', 'Dewas', 'Dhar', 'Narmadapuram', 'Khandwa', 'Khargone',
  'Ratlam', 'Shivpuri', 'Vidisha', 'Betul', 'Morena', 'Bhind', 'Damoh',
];

class FileComplaintScreen extends StatefulWidget {
  final String? initialDept;
  const FileComplaintScreen({super.key, this.initialDept});
  @override
  State<FileComplaintScreen> createState() => _FileComplaintScreenState();
}

class _FileComplaintScreenState extends State<FileComplaintScreen> {
  int step = 0;
  List<Department> depts = [];
  bool loadingDepts = true;
  String? deptError;

  final name = TextEditingController();
  final mobile = TextEditingController();
  final email = TextEditingController();
  final authId = TextEditingController();
  String authType = 'aadhaar';
  String district = 'Bhopal';
  final ward = TextEditingController();
  final address = TextEditingController();
  String region = 'urban';
  String deptId = 'pwd';
  final title = TextEditingController();
  final desc = TextEditingController();
  String? photoUrl;
  File? photoLocal;
  bool uploading = false;
  String audioTranscript = '';
  bool submitting = false;
  String? error;
  Grievance? receipt;

  final stt.SpeechToText speech = stt.SpeechToText();
  bool listening = false;

  @override
  void initState() {
    super.initState();
    if (widget.initialDept != null) {
      deptId = widget.initialDept!;
      step = 1;
    }
    _loadDepts();
  }

  Future<void> _loadDepts() async {
    try {
      final d = await Api(context.read<AppState>().baseUrl).departments();
      if (!mounted) return;
      setState(() {
        depts = d;
        loadingDepts = false;
        if (widget.initialDept == null && d.isNotEmpty) deptId = d.first.id;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        loadingDepts = false;
        deptError = '$e';
      });
    }
  }

  @override
  void dispose() {
    name.dispose();
    mobile.dispose();
    email.dispose();
    authId.dispose();
    ward.dispose();
    address.dispose();
    title.dispose();
    desc.dispose();
    speech.stop();
    super.dispose();
  }

  Future<void> _pickPhoto(ImageSource src) async {
    final x = await ImagePicker().pickImage(source: src, maxWidth: 1600, imageQuality: 82);
    if (x == null) return;
    setState(() {
      photoLocal = File(x.path);
      uploading = true;
      error = null;
    });
    try {
      final url = await Api(context.read<AppState>().baseUrl).uploadPhoto(x.path);
      if (!mounted) return;
      setState(() => photoUrl = url);
    } catch (e) {
      if (!mounted) return;
      setState(() {
        error = 'Photo upload failed: $e';
        photoLocal = null;
      });
    } finally {
      if (mounted) setState(() => uploading = false);
    }
  }

  Future<void> _toggleVoice() async {
    final app = context.read<AppState>();
    if (listening) {
      await speech.stop();
      setState(() => listening = false);
      return;
    }
    final ok = await speech.initialize();
    if (!ok) {
      setState(() => error = 'Voice input unavailable on this device.');
      return;
    }
    setState(() {
      listening = true;
      error = null;
    });
    await speech.listen(
      localeId: app.lang == 'hi' ? 'hi-IN' : 'en-IN',
      onResult: (r) {
        setState(() {
          audioTranscript = r.recognizedWords;
          if (desc.text.isEmpty) desc.text = r.recognizedWords;
        });
        if (r.finalResult) setState(() => listening = false);
      },
    );
  }

  Future<void> _submit() async {
    final app = context.read<AppState>();
    final s = S(app.lang);
    setState(() => error = null);
    if (name.text.trim().isEmpty || title.text.trim().isEmpty || desc.text.trim().isEmpty) {
      setState(() => error = app.lang == 'hi' ? 'नाम, शीर्षक और विवरण भरें।' : 'Fill name, title and description.');
      return;
    }
    if (mobile.text.replaceAll(RegExp(r'\D'), '').length != 10) {
      setState(() => error = 'Enter a valid 10-digit mobile number.');
      return;
    }
    if (photoUrl == null && audioTranscript.isEmpty) {
      setState(() => error = app.lang == 'hi' ? 'फोटो अपलोड करें या वॉइस नोट बोलें।' : 'Attach a photo or add a voice note.');
      return;
    }
    setState(() => submitting = true);
    try {
      final g = await Api(app.baseUrl).submitGrievance({
        'citizen_name': name.text.trim(),
        'auth_type': authType,
        'auth_id': authId.text.trim(),
        'mobile': mobile.text.trim(),
        'citizen_email': email.text.trim(),
        'district': district,
        'block_or_ward': ward.text.trim(),
        'region_type': region,
        'address': address.text.trim(),
        'dept_id': deptId,
        'title': title.text.trim(),
        'description': desc.text.trim(),
        'multimodal_type': photoUrl != null && audioTranscript.isNotEmpty
            ? 'multimodal'
            : photoUrl != null
                ? 'photo'
                : 'voice',
        'photo_evidence_url': photoUrl,
        'audio_transcript': audioTranscript.isEmpty ? null : audioTranscript,
      });
      if (!mounted) return;
      setState(() => receipt = g);
    } catch (e) {
      if (!mounted) return;
      setState(() => error = '$e');
    } finally {
      if (mounted) setState(() => submitting = false);
    }
    return;
  }

  @override
  Widget build(BuildContext context) {
    final app = context.watch<AppState>();
    final s = S(app.lang);
    if (receipt != null) {
      return Scaffold(
        appBar: AppBar(title: Text(s.fileComplaint)),
        body: Column(children: [
          Container(
            width: double.infinity,
            margin: const EdgeInsets.all(16),
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(color: Colors.green.shade50, borderRadius: BorderRadius.circular(16), border: Border.all(color: Colors.green.shade200)),
            child: Text('Registered: ${receipt!.ticketId}', style: TextStyle(fontWeight: FontWeight.w900, color: Colors.green.shade800, fontSize: 15)),
          ),
          Expanded(child: TicketDetail(t: receipt!)),
        ]),
      );
    }
    return Scaffold(
      appBar: AppBar(title: Text(s.fileComplaint)),
      body: loadingDepts
          ? const Center(child: CircularProgressIndicator())
          : deptError != null
              ? Center(child: Padding(padding: const EdgeInsets.all(24), child: ErrorBox(message: deptError!)))
              : Stepper(
                  currentStep: step,
                  onStepContinue: () {
                    if (step < 3) {
                      setState(() => step += 1);
                    } else {
                      _submit();
                    }
                  },
                  onStepCancel: () => setState(() => step = step > 0 ? step - 1 : 0),
                  controlsBuilder: (ctx, details) => Padding(
                    padding: const EdgeInsets.only(top: 12),
                    child: Row(children: [
                      ElevatedButton(
                        onPressed: submitting ? null : details.onStepContinue,
                        child: submitting
                            ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                            : Text(step == 3 ? s.submit : 'Next'),
                      ),
                      const SizedBox(width: 8),
                      if (step > 0) TextButton(onPressed: details.onStepCancel, child: const Text('Back')),
                    ]),
                  ),
                  steps: [
                    Step(
                      title: const Text('Department', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w800)),
                      content: Column(
                        children: depts.map((d) {
                          final sel = d.id == deptId;
                          return InkWell(
                            onTap: () => setState(() => deptId = d.id),
                            child: Container(
                              margin: const EdgeInsets.only(bottom: 8),
                              padding: const EdgeInsets.all(12),
                              decoration: BoxDecoration(
                                color: sel ? Colors.indigo.shade50 : Colors.white,
                                borderRadius: BorderRadius.circular(14),
                                border: Border.all(color: sel ? Colors.indigo : const Color(0xFFE2E8F0), width: sel ? 2 : 1),
                              ),
                              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                                Text(app.lang == 'hi' ? d.nameHi : d.nameEn, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w800)),
                                Text(app.lang == 'hi' ? d.descHi : d.descEn, style: const TextStyle(fontSize: 11, color: Colors.grey)),
                                Text(d.contactEmail, style: const TextStyle(fontSize: 10, color: Colors.indigo, fontFamily: 'monospace')),
                              ]),
                            ),
                          );
                        }).toList(),
                      ),
                    ),
                    Step(
                      title: const Text('Identity', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w800)),
                      content: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                        const FieldLabel(text: 'Citizen name *'),
                        TextField(controller: name, decoration: fieldDec('e.g. Ramesh Patel')),
                        const FieldLabel(text: 'Mobile (tracking) *'),
                        TextField(controller: mobile, keyboardType: TextInputType.phone, decoration: fieldDec('10-digit mobile')),
                        const FieldLabel(text: 'Email for receipt (optional)'),
                        TextField(controller: email, keyboardType: TextInputType.emailAddress, decoration: fieldDec('you@example.com')),
                        const FieldLabel(text: 'Aadhaar / PAN'),
                        Row(children: [
                          DropdownButton<String>(
                            value: authType,
                            items: const [DropdownMenuItem(value: 'aadhaar', child: Text('Aadhaar')), DropdownMenuItem(value: 'pan', child: Text('PAN'))],
                            onChanged: (v) => setState(() => authType = v!),
                          ),
                          const SizedBox(width: 8),
                          Expanded(child: TextField(controller: authId, decoration: fieldDec('ID number'))),
                        ]),
                        const FieldLabel(text: 'District'),
                        DropdownButtonFormField<String>(
                          value: district,
                          decoration: fieldDec(''),
                          items: mpDistricts.map((d) => DropdownMenuItem(value: d, child: Text(d, style: const TextStyle(fontSize: 13)))).toList(),
                          onChanged: (v) => setState(() => district = v!),
                        ),
                        Row(children: [
                          Expanded(
                            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                              const FieldLabel(text: 'Ward / Panchayat'),
                              TextField(controller: ward, decoration: fieldDec('Ward 4')),
                            ]),
                          ),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                              const FieldLabel(text: 'Area'),
                              DropdownButtonFormField<String>(
                                value: region,
                                decoration: fieldDec(''),
                                items: const [DropdownMenuItem(value: 'rural', child: Text('Rural')), DropdownMenuItem(value: 'urban', child: Text('Urban'))],
                                onChanged: (v) => setState(() => region = v!),
                              ),
                            ]),
                          ),
                        ]),
                        const FieldLabel(text: 'Landmark'),
                        TextField(controller: address, decoration: fieldDec('Near ...')),
                      ]),
                    ),
                    Step(
                      title: const Text('Details + proof', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w800)),
                      content: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                        const FieldLabel(text: 'Title *'),
                        TextField(controller: title, decoration: fieldDec('Short title of the issue')),
                        const FieldLabel(text: 'Description *'),
                        TextField(controller: desc, maxLines: 4, decoration: fieldDec('What, since when, who is affected…')),
                        const SizedBox(height: 10),
                        Row(children: [
                          Expanded(
                            child: ElevatedButton.icon(
                              onPressed: _toggleVoice,
                              icon: Icon(listening ? Icons.stop : Icons.mic),
                              label: Text(listening ? 'Stop' : (app.lang == 'hi' ? 'बोलें' : 'Speak')),
                              style: ElevatedButton.styleFrom(backgroundColor: listening ? Colors.red : Colors.indigo, foregroundColor: Colors.white),
                            ),
                          ),
                        ]),
                        if (audioTranscript.isNotEmpty)
                          Container(
                            margin: const EdgeInsets.only(top: 8),
                            padding: const EdgeInsets.all(10),
                            decoration: BoxDecoration(color: Colors.indigo.shade50, borderRadius: BorderRadius.circular(12)),
                            child: Text('“$audioTranscript”', style: const TextStyle(fontSize: 12, fontStyle: FontStyle.italic)),
                          ),
                        const SizedBox(height: 10),
                        if (photoLocal != null)
                          ClipRRect(borderRadius: BorderRadius.circular(14), child: Image.file(photoLocal!, height: 170, width: double.infinity, fit: BoxFit.cover)),
                        Row(children: [
                          Expanded(
                            child: OutlinedButton.icon(
                              onPressed: uploading ? null : () => _pickPhoto(ImageSource.camera),
                              icon: const Icon(Icons.photo_camera, size: 16),
                              label: const Text('Camera', style: TextStyle(fontSize: 12)),
                            ),
                          ),
                          const SizedBox(width: 8),
                          Expanded(
                            child: OutlinedButton.icon(
                              onPressed: uploading ? null : () => _pickPhoto(ImageSource.gallery),
                              icon: const Icon(Icons.photo_library, size: 16),
                              label: const Text('Gallery', style: TextStyle(fontSize: 12)),
                            ),
                          ),
                        ]),
                        if (uploading) const Padding(padding: EdgeInsets.only(top: 6), child: LinearProgressIndicator()),
                        if (photoUrl != null)
                          const Padding(
                            padding: EdgeInsets.only(top: 6),
                            child: Text('Photo stored on server', style: TextStyle(fontSize: 11, color: Colors.green, fontWeight: FontWeight.w700)),
                          ),
                      ]),
                    ),
                    Step(
                      title: const Text('Review', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w800)),
                      content: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                        Text('Dept: $deptId • $district ($region)', style: const TextStyle(fontSize: 12)),
                        const SizedBox(height: 4),
                        Text(title.text, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w800)),
                        Text(desc.text, style: const TextStyle(fontSize: 12, color: Colors.grey)),
                        if (error != null) ...[const SizedBox(height: 8), ErrorBox(message: error!)],
                      ]),
                    ),
                  ],
                ),
    );
  }
}
