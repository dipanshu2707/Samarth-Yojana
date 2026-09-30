import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../api/api_client.dart';
import '../config.dart';
import '../l10n/strings.dart';
import '../models/models.dart';
import '../state/app_state.dart';
import '../widgets/common.dart';
import 'officer_desk_screen.dart';

class AuthorityLoginScreen extends StatefulWidget {
  const AuthorityLoginScreen({super.key});
  @override
  State<AuthorityLoginScreen> createState() => _AuthorityLoginScreenState();
}

class _AuthorityLoginScreenState extends State<AuthorityLoginScreen> {
  final email = TextEditingController(text: RoleAccounts.l1.$1);
  final password = TextEditingController(text: RoleAccounts.l1.$2);
  final testTo = TextEditingController();
  bool loading = false;
  bool testing = false;
  String? error;
  String? testMsg;
  Map<String, dynamic>? mailStatus;

  @override
  void initState() {
    super.initState();
    Api(context.read<AppState>().baseUrl).emailStatus().then((m) {
      if (mounted) setState(() => mailStatus = m);
    }).catchError((_) => null);
  }

  @override
  void dispose() {
    email.dispose();
    password.dispose();
    testTo.dispose();
    super.dispose();
  }

  Future<void> _login([String? e, String? p]) async {    final em = (e ?? email.text).trim();
    final pw = (p ?? password.text).trim();
    setState(() {
      loading = true;
      error = null;
    });
    try {
      final o = await Api(context.read<AppState>().baseUrl).login(em, pw);
      await context.read<AppState>().setOfficer(o);
      if (!mounted) return;
      Navigator.pushReplacement(context, MaterialPageRoute(builder: (_) => const OfficerDeskScreen()));
    } catch (err) {
      if (!mounted) return;
      setState(() => error = '$err');
    } finally {
      if (mounted) setState(() => loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final app = context.watch<AppState>();
    final s = S(app.lang);

    Widget roleCard(int level, String title, String em, String pw, Color c) {
      return InkWell(
        borderRadius: BorderRadius.circular(18),
        onTap: () => _login(em, pw),
        child: Container(
          margin: const EdgeInsets.only(bottom: 10),
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(18), border: Border.all(color: const Color(0xFFE2E8F0))),
          child: Row(children: [
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
              decoration: BoxDecoration(color: c.withOpacity(0.12), borderRadius: BorderRadius.circular(20)),
              child: Text('LEVEL $level', style: TextStyle(fontSize: 10, fontWeight: FontWeight.w900, color: c)),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text(title, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w800)),
                Text(em, style: const TextStyle(fontSize: 11, fontFamily: 'monospace', color: Colors.indigo)),
              ]),
            ),
            const Icon(Icons.chevron_right, size: 18, color: Colors.grey),
          ]),
        ),
      );
    }

    return Scaffold(
      appBar: AppBar(title: Text(s.authorityLogin)),
      body: ListView(padding: const EdgeInsets.all(16), children: [
        Container(
          padding: const EdgeInsets.all(16),
          decoration: const BoxDecoration(
            gradient: LinearGradient(colors: [Color(0xFF0F172A), Color(0xFF1E1B4B)]),
            borderRadius: BorderRadius.all(Radius.circular(20)),
          ),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            const Icon(Icons.key, color: Colors.amber, size: 28),
            const SizedBox(height: 8),
            Text(s.authorityLogin, style: const TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.w900)),
            const Text('L1 sees only its desk • L2/L3 see all departments',
                style: TextStyle(color: Color(0xFFCBD5E1), fontSize: 12)),
          ]),
        ),
        const SectionTitle(text: 'Tap a card to sign in'),
        roleCard(1, app.lang == 'hi' ? 'विभागीय नोडल अधिकारी (RAM)' : 'Department Nodal Officer (RAM)', RoleAccounts.l1.$1,
            RoleAccounts.l1.$2, Colors.blue),
        roleCard(2, app.lang == 'hi' ? 'जिला कलेक्टर (Shyam)' : 'District Collector (Shyam)', RoleAccounts.l2.$1, RoleAccounts.l2.$2,
            Colors.amber.shade700),
        roleCard(3, app.lang == 'hi' ? 'मुख्यमंत्री कार्यालय (Jay)' : 'CM Office Apex (Jay)', RoleAccounts.l3.$1, RoleAccounts.l3.$2,
            Colors.rose),
        const SectionTitle(text: 'Or sign in manually'),
        const FieldLabel(text: 'Official email'),
        TextField(controller: email, decoration: fieldDec('')),
        const FieldLabel(text: 'Password'),
        TextField(controller: password, obscureText: true, decoration: fieldDec('')),
        if (error != null) ...[const SizedBox(height: 10), ErrorBox(message: error!)],
        const SizedBox(height: 12),
        ElevatedButton(
          onPressed: loading ? null : () => _login(),
          child: loading
              ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
              : Text(s.signIn),
        ),
        if (mailStatus != null) ...[
          const SizedBox(height: 10),
          Text('Email delivery: ${(mailStatus!['configured'] == true) ? 'ON (${mailStatus!['provider']})' : 'OFF'}',
              style: const TextStyle(fontSize: 11, color: Colors.grey)),
          const SizedBox(height: 6),
          Row(children: [
            Expanded(
                child: TextField(
              controller: testTo,
              onChanged: (_) => setState(() {}),
              decoration: fieldDec('Test address'),
            )),
            const SizedBox(width: 8),
            ElevatedButton(
              onPressed: testing || testTo.text.isEmpty
                  ? null
                  : () async {
                      setState(() {
                        testing = true;
                        testMsg = null;
                      });
                      try {
                        final r = await Api(context.read<AppState>().baseUrl).sendTestEmail(testTo.text.trim());
                        if (!mounted) return;
                        setState(() => testMsg = 'Delivered via ${r['provider']}');
                      } catch (e) {
                        if (!mounted) return;
                        setState(() => testMsg = '$e');
                      } finally {
                        if (mounted) setState(() => testing = false);
                      }
                    },
              child: const Text('Test', style: TextStyle(fontSize: 12)),
            ),
          ]),
          if (testMsg != null) Text(testMsg!, style: const TextStyle(fontSize: 11)),
        ],
      ]),
    );
  }
}
