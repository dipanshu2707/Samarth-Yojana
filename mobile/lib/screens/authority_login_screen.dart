import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../api/api_client.dart';
import '../config.dart';
import '../l10n/strings.dart';
import '../state/app_state.dart';
import '../theme/app_theme.dart';
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

  Future<void> _login([String? e, String? p]) async {
    final em = (e ?? email.text).trim();
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

    return Scaffold(
      backgroundColor: AppColors.paper,
      appBar: AppBar(title: Text(s.authorityLogin)),
      body: ListView(padding: const EdgeInsets.all(16), children: [
        Container(
          padding: const EdgeInsets.all(18),
          decoration: const BoxDecoration(gradient: AppColors.hero, borderRadius: BorderRadius.all(Radius.circular(26))),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            ClipOval(
              child: Image.asset('assets/icon/app_icon.png', width: 52, height: 52, fit: BoxFit.cover),
            ),
            const SizedBox(height: 12),
            Text(app.lang == 'hi' ? 'प्राधिकारी प्रवेश' : 'Authority access', style: AppText.hero.copyWith(fontSize: 21)),
            const SizedBox(height: 4),
            const Text('L1 sees only its desk • L2 & L3 monitor every department',
                style: TextStyle(color: Color(0xFFC7D2FE), fontSize: 12)),
          ]),
        ),
        const SizedBox(height: 14),
        const Text('TAP A CARD TO SIGN IN', style: AppText.section),
        const SizedBox(height: 8),
        _roleCard(1, app.lang == 'hi' ? 'विभागीय नोडल अधिकारी' : 'Department Nodal Officer', 'RAM', RoleAccounts.l1.$1,
            RoleAccounts.l1.$2, Colors.blue.shade700),
        _roleCard(2, app.lang == 'hi' ? 'जिला कलेक्टर' : 'District Collector', 'Shyam', RoleAccounts.l2.$1, RoleAccounts.l2.$2,
            Colors.amber.shade800),
        _roleCard(3, app.lang == 'hi' ? 'मुख्यमंत्री कार्यालय' : 'CM Office Apex', 'Jay', RoleAccounts.l3.$1, RoleAccounts.l3.$2,
            Colors.red),
        const SizedBox(height: 6),
        Container(
          padding: const EdgeInsets.all(14),
          decoration: cardDec(),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            const Text('Sign in manually', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w800)),
            const FieldLabel(text: 'Official email'),
            TextField(controller: email, decoration: fieldDec('')),
            const FieldLabel(text: 'Password'),
            TextField(controller: password, obscureText: true, decoration: fieldDec('')),
            if (error != null) ...[const SizedBox(height: 10), ErrorBox(message: error!)],
            const SizedBox(height: 12),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: loading ? null : () => _login(),
                child: loading
                    ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                    : Text(s.signIn),
              ),
            ),
          ]),
        ),
        const SizedBox(height: 10),
        Container(
          padding: const EdgeInsets.all(12),
          decoration: cardDec(radius: 18),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(
              'Email delivery: ${(mailStatus?['configured'] == true) ? 'ON (${mailStatus!['provider']})' : 'checking…'}',
              style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: AppColors.muted),
            ),
            const SizedBox(height: 8),
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
            if (testMsg != null) Padding(padding: const EdgeInsets.only(top: 6), child: Text(testMsg!, style: const TextStyle(fontSize: 11))),
          ]),
        ),
        const SizedBox(height: 80),
      ]),
    );
  }

  Widget _roleCard(int level, String title, String name, String em, String pw, Color c) {
    return InkWell(
      borderRadius: BorderRadius.circular(20),
      onTap: () => _login(em, pw),
      child: Container(
        margin: const EdgeInsets.only(bottom: 10),
        padding: const EdgeInsets.all(14),
        decoration: cardDec(radius: 20),
        child: Row(children: [
          Container(
            width: 46,
            height: 46,
            decoration: BoxDecoration(color: c.withValues(alpha: 0.12), shape: BoxShape.circle),
            child: Center(child: Text(name[0], style: TextStyle(fontSize: 20, fontWeight: FontWeight.w900, color: c))),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Row(children: [
                Text('LEVEL $level', style: TextStyle(fontSize: 9, fontWeight: FontWeight.w900, color: c)),
                const SizedBox(width: 6),
                Text(name, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w900)),
              ]),
              Text(title, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600)),
              Text(em, style: const TextStyle(fontSize: 10.5, fontFamily: 'monospace', color: AppColors.indigo600)),
            ]),
          ),
          const Icon(Icons.arrow_forward_ios, size: 15, color: AppColors.muted),
        ]),
      ),
    );
  }
}
