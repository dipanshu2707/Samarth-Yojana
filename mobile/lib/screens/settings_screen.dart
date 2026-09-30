import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../api/api_client.dart';
import '../l10n/strings.dart';
import '../state/app_state.dart';
import '../widgets/common.dart';

class SettingsScreen extends StatefulWidget {
  const SettingsScreen({super.key});
  @override
  State<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends State<SettingsScreen> {
  final url = TextEditingController();
  String? health;
  String? mail;
  String? error;

  @override
  void initState() {
    super.initState();
    url.text = context.read<AppState>().baseUrl;
    _probe();
  }

  Future<void> _probe() async {
    final base = context.read<AppState>().baseUrl;
    try {
      final h = await Api(base).health();
      final m = await Api(base).emailStatus();
      if (!mounted) return;
      setState(() {
        health = '${h['status']} • ${h['services']?['schemes_count'] ?? ''} schemes';
        mail = (m['configured'] == true) ? 'ON via ${m['provider']}' : 'OFF';
        error = null;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() => error = '$e');
    }
  }

  @override
  Widget build(BuildContext context) {
    final app = context.watch<AppState>();
    final s = S(app.lang);
    return Scaffold(
      appBar: AppBar(title: Text(s.settings)),
      body: ListView(padding: const EdgeInsets.all(16), children: [
        const FieldLabel(text: 'Backend server URL'),
        TextField(controller: url, decoration: fieldDec('http://10.0.2.2:8000')),
        const Text('Android emulator → http://10.0.2.2:8000\nPhysical device → http://YOUR-PC-LAN-IP:8000 (backend must run with --host 0.0.0.0)',
            style: TextStyle(fontSize: 11, color: Colors.grey)),
        const SizedBox(height: 10),
        ElevatedButton(
          onPressed: () async {
            await app.setBaseUrl(url.text);
            _probe();
          },
          child: const Text('Save & test connection', style: TextStyle(fontSize: 13)),
        ),
        if (error != null) ...[const SizedBox(height: 10), ErrorBox(message: error!)],
        if (health != null) ...[
          const SizedBox(height: 10),
          Text('Backend: $health', style: const TextStyle(fontSize: 12)),
          Text('Email: $mail', style: const TextStyle(fontSize: 12)),
        ],
        const SizedBox(height: 16),
        const Text('Language', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w800)),
        Row(children: [
          Expanded(
            child: RadioListTile<String>(
              title: const Text('English', style: TextStyle(fontSize: 13)),
              value: 'en',
              groupValue: app.lang,
              onChanged: (v) => app.setLang(v!),
            ),
          ),
          Expanded(
            child: RadioListTile<String>(
              title: const Text('हिन्दी', style: TextStyle(fontSize: 13)),
              value: 'hi',
              groupValue: app.lang,
              onChanged: (v) => app.setLang(v!),
            ),
          ),
        ]),
      ]),
    );
  }
}
