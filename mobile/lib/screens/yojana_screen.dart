import 'dart:io';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:provider/provider.dart';
import 'package:url_launcher/url_launcher.dart';
import '../api/api_client.dart';
import '../l10n/strings.dart';
import '../state/app_state.dart';
import '../widgets/common.dart';

const yojanaDistricts = [
  'Bhopal', 'Indore', 'Ujjain', 'Gwalior', 'Jabalpur', 'Sagar', 'Rewa', 'Sehore', 'Satna', 'Dewas',
];

class YojanaScreen extends StatefulWidget {
  const YojanaScreen({super.key});
  @override
  State<YojanaScreen> createState() => _YojanaScreenState();
}

class _YojanaScreenState extends State<YojanaScreen> {
  final age = TextEditingController(text: '20');
  String gender = 'female';
  String district = 'Bhopal';
  String area = 'rural';
  String category = 'OBC';
  final income = TextEditingController(text: '200000');
  String edu = 'undergraduate';
  final class12 = TextEditingController(text: '65');
  String occupation = 'student';

  bool loading = false;
  String? error;
  Map<String, dynamic>? results;

  File? docFile;
  String docType = 'income_certificate';
  bool docLoading = false;
  Map<String, dynamic>? docResult;

  @override
  void dispose() {
    age.dispose();
    income.dispose();
    class12.dispose();
    super.dispose();
  }

  Future<void> _match() async {
    setState(() {
      loading = true;
      error = null;
    });
    try {
      final r = await Api(context.read<AppState>().baseUrl).match({
        'age': int.tryParse(age.text) ?? 20,
        'gender': gender,
        'residency': 'Madhya Pradesh',
        'district': district,
        'rural_or_urban': area,
        'category': category,
        'annual_family_income': double.tryParse(income.text) ?? 200000,
        'education_level': edu,
        'class12_percentage': double.tryParse(class12.text) ?? 65,
        'occupation': occupation,
        'language': context.read<AppState>().lang,
      });
      if (!mounted) return;
      setState(() => results = r);
    } catch (e) {
      if (!mounted) return;
      setState(() => error = '$e');
    } finally {
      if (mounted) setState(() => loading = false);
    }
  }

  Future<void> _pickDoc(ImageSource src) async {
    final x = await ImagePicker().pickImage(source: src, maxWidth: 1600, imageQuality: 85);
    if (x == null) return;
    setState(() {
      docFile = File(x.path);
      docResult = null;
    });
  }

  Future<void> _checkDoc() async {
    if (docFile == null) return;
    setState(() {
      docLoading = true;
      error = null;
    });
    try {
      final r = await Api(context.read<AppState>().baseUrl).checkDocument(docFile!.path, docType);
      if (!mounted) return;
      setState(() => docResult = r);
    } catch (e) {
      if (!mounted) return;
      setState(() => error = '$e');
    } finally {
      if (mounted) setState(() => docLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final app = context.watch<AppState>();
    final s = S(app.lang);
    final matches = (results?['matches'] as List? ?? []);

    return Scaffold(
      appBar: AppBar(title: Text(s.yojana)),
      body: ListView(padding: const EdgeInsets.all(16), children: [
        const GradientHeader2(),
        const FieldLabel(text: 'Age'),
        TextField(controller: age, keyboardType: TextInputType.number, decoration: fieldDec('')),
        const FieldLabel(text: 'Gender'),
        _chips(['female', 'male', 'other'], gender, (v) => setState(() => gender = v)),
        const FieldLabel(text: 'District'),
        DropdownButtonFormField<String>(
          value: district,
          decoration: fieldDec(''),
          items: yojanaDistricts.map((d) => DropdownMenuItem(value: d, child: Text(d, style: const TextStyle(fontSize: 13)))).toList(),
          onChanged: (v) => setState(() => district = v!),
        ),
        const FieldLabel(text: 'Area / Category'),
        Row(children: [
          Expanded(
            child: DropdownButtonFormField<String>(
              value: area,
              decoration: fieldDec(''),
              items: const [DropdownMenuItem(value: 'rural', child: Text('Rural')), DropdownMenuItem(value: 'urban', child: Text('Urban'))],
              onChanged: (v) => setState(() => area = v!),
            ),
          ),
          const SizedBox(width: 8),
          Expanded(
            child: DropdownButtonFormField<String>(
              value: category,
              decoration: fieldDec(''),
              items: ['SC', 'ST', 'OBC', 'General', 'EWS'].map((c) => DropdownMenuItem(value: c, child: Text(c))).toList(),
              onChanged: (v) => setState(() => category = v!),
            ),
          ),
        ]),
        const FieldLabel(text: 'Annual family income (₹)'),
        TextField(controller: income, keyboardType: TextInputType.number, decoration: fieldDec('')),
        const FieldLabel(text: 'Education / Occupation'),
        Row(children: [
          Expanded(
            child: DropdownButtonFormField<String>(
              value: edu,
              decoration: fieldDec(''),
              items: const [
                DropdownMenuItem(value: 'undergraduate', child: Text('UG', style: TextStyle(fontSize: 12))),
                DropdownMenuItem(value: 'class_12', child: Text('12th', style: TextStyle(fontSize: 12))),
                DropdownMenuItem(value: 'iti', child: Text('ITI', style: TextStyle(fontSize: 12))),
                DropdownMenuItem(value: 'diploma', child: Text('Diploma', style: TextStyle(fontSize: 12))),
                DropdownMenuItem(value: 'postgraduate', child: Text('PG', style: TextStyle(fontSize: 12))),
              ],
              onChanged: (v) => setState(() => edu = v!),
            ),
          ),
          const SizedBox(width: 8),
          Expanded(
            child: DropdownButtonFormField<String>(
              value: occupation,
              decoration: fieldDec(''),
              items: const [
                DropdownMenuItem(value: 'student', child: Text('Student', style: TextStyle(fontSize: 12))),
                DropdownMenuItem(value: 'unemployed', child: Text('Unemployed', style: TextStyle(fontSize: 12))),
                DropdownMenuItem(value: 'homemaker', child: Text('Homemaker', style: TextStyle(fontSize: 12))),
                DropdownMenuItem(value: 'employed', child: Text('Employed', style: TextStyle(fontSize: 12))),
              ],
              onChanged: (v) => setState(() => occupation = v!),
            ),
          ),
        ]),
        const FieldLabel(text: 'Class 12 %'),
        TextField(controller: class12, keyboardType: TextInputType.number, decoration: fieldDec('')),
        const SizedBox(height: 14),
        ElevatedButton(
          onPressed: loading ? null : _match,
          child: loading
              ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
              : const Text('Find Matching Schemes'),
        ),
        if (error != null) ...[const SizedBox(height: 10), ErrorBox(message: error!)],
        if (matches.isNotEmpty) ...[
          const SectionTitle(text: 'Matched schemes'),
          for (final m in matches)
            Card(
              margin: const EdgeInsets.only(bottom: 10),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
              elevation: 0,
              child: Container(
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(border: Border.all(color: Colors.emerald.shade200), borderRadius: BorderRadius.circular(16), color: Colors.emerald.shade50),
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Text('${m['name'] ?? ''}', style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w900)),
                  Text('${m['confidence'] ?? ''} • ${m['benefits'] ?? ''}', style: const TextStyle(fontSize: 11, color: Colors.grey)),
                  const SizedBox(height: 4),
                  Text('${m['plain_language_reason'] ?? ''}', style: const TextStyle(fontSize: 12)),
                  if ((m['required_documents'] as List? ?? []).isNotEmpty)
                    Padding(
                      padding: const EdgeInsets.only(top: 6),
                      child: Text('Documents: ${(m['required_documents'] as List).join(', ')}', style: const TextStyle(fontSize: 11, color: Colors.grey)),
                    ),
                  if ('${m['official_portal'] ?? ''}'.isNotEmpty)
                    Align(
                      alignment: Alignment.centerRight,
                      child: TextButton.icon(
                        onPressed: () => launchUrl(Uri.parse('${m['official_portal']}'), mode: LaunchMode.externalApplication),
                        icon: const Icon(Icons.open_in_new, size: 14),
                        label: const Text('Official portal', style: TextStyle(fontSize: 12)),
                      ),
                    ),
                ]),
              ),
            ),
        ],
        const SectionTitle(text: 'Document pre-screen'),
        if (docFile != null) ClipRRect(borderRadius: BorderRadius.circular(14), child: Image.file(docFile!, height: 150, width: double.infinity, fit: BoxFit.cover)),
        Row(children: [
          Expanded(
            child: OutlinedButton.icon(onPressed: () => _pickDoc(ImageSource.camera), icon: const Icon(Icons.photo_camera, size: 16), label: const Text('Camera', style: TextStyle(fontSize: 12))),
          ),
          const SizedBox(width: 8),
          Expanded(
            child: OutlinedButton.icon(onPressed: () => _pickDoc(ImageSource.gallery), icon: const Icon(Icons.photo_library, size: 16), label: const Text('Gallery', style: TextStyle(fontSize: 12))),
          ),
        ]),
        const SizedBox(height: 8),
        ElevatedButton(
          onPressed: docLoading || docFile == null ? null : _checkDoc,
          style: ElevatedButton.styleFrom(backgroundColor: Colors.teal),
          child: docLoading
              ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
              : const Text('Check Readiness'),
        ),
        if (docResult != null)
          Container(
            margin: const EdgeInsets.only(top: 10),
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(color: Colors.teal.shade50, borderRadius: BorderRadius.circular(14), border: Border.all(color: Colors.teal.shade200)),
            child: Text('Verdict: ${docResult!['verdict']} • Legibility: ${docResult!['legibility']}\n${(docResult!['flags'] as List? ?? []).join(', ')}',
                style: const TextStyle(fontSize: 12)),
          ),
      ]),
    );
  }

  Widget _chips(List<String> items, String cur, ValueChanged<String> onPick) {
    return Wrap(
      spacing: 8,
      children: items
          .map((e) => ChoiceChip(
                label: Text(e, style: const TextStyle(fontSize: 12)),
                selected: cur == e,
                onSelected: (_) => onPick(e),
              ))
          .toList(),
    );
  }
}

class GradientHeader2 extends StatelessWidget {
  const GradientHeader2({super.key});
  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: const BoxDecoration(
        gradient: LinearGradient(colors: [Color(0xFF064E3B), Color(0xFF0F766E)]),
        borderRadius: BorderRadius.all(Radius.circular(20)),
      ),
      child: const Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text('योजना साथी', style: TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.w900)),
        Text('13+ MP & Central schemes • OCR pre-screen', style: TextStyle(color: Color(0xFFA7F3D0), fontSize: 12)),
      ]),
    );
  }
}
