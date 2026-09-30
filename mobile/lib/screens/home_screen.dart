import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:url_launcher/url_launcher.dart';
import '../api/api_client.dart';
import '../l10n/strings.dart';
import '../models/models.dart';
import '../state/app_state.dart';
import '../theme/app_theme.dart';
import '../widgets/server_status.dart';
import 'file_complaint_screen.dart';
import 'tracking_screens.dart';
import 'authority_login_screen.dart';
import 'officer_desk_screen.dart';
import 'yojana_screen.dart';
import 'settings_screen.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});
  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  List<Department> depts = [];
  final quickId = TextEditingController();

  @override
  void initState() {
    super.initState();
    Api(context.read<AppState>().baseUrl).departments().then((d) {
      if (mounted) setState(() => depts = d);
    }).catchError((_) => null);
  }

  @override
  void dispose() {
    quickId.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final app = context.watch<AppState>();
    final s = S(app.lang);
    final loggedIn = app.officer != null;

    return Scaffold(
      backgroundColor: AppColors.paper,
      body: RefreshIndicator(
        onRefresh: () async => setState(() {}),
        child: SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          child: Column(children: [
            // Hero
            Container(
              width: double.infinity,
              padding: const EdgeInsets.fromLTRB(20, 54, 20, 96),
              decoration: const BoxDecoration(gradient: AppColors.hero, borderRadius: BorderRadius.vertical(bottom: Radius.circular(32))),
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Row(children: [
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                    decoration: BoxDecoration(color: AppColors.saffron.withValues(alpha: 0.18), borderRadius: BorderRadius.circular(20), border: Border.all(color: AppColors.saffron.withValues(alpha: 0.5))),
                    child: const Text('MP CM ONLINE • 181', style: TextStyle(fontSize: 10, fontWeight: FontWeight.w900, color: AppColors.saffron)),
                  ),
                  const Spacer(),
                  InkWell(
                    onTap: () => app.setLang(app.lang == 'hi' ? 'en' : 'hi'),
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                      decoration: BoxDecoration(color: Colors.white.withValues(alpha: 0.12), borderRadius: BorderRadius.circular(20)),
                      child: Text(app.lang == 'hi' ? 'EN' : 'हिं', style: const TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.w900)),
                    ),
                  ),
                ]),
                const SizedBox(height: 14),
                Text(app.lang == 'hi' ? 'नमस्ते 🙏\nशिकायत दर्ज करें' : 'Namaste 🙏\nReport an issue', style: AppText.hero),
                const SizedBox(height: 6),
                Text(s.tagline, style: AppText.heroSub),
              ]),
            ),
            // Quick track card overlapping hero
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 0, 16, 0),
              child: Transform.translate(
                offset: const Offset(0, -58),
                child: Column(children: [
                  Container(
                    padding: const EdgeInsets.all(14),
                    decoration: cardDec(),
                    child: Column(children: [
                      Row(children: [
                        Expanded(
                          child: TextField(
                            controller: quickId,
                            decoration: InputDecoration(
                              hintText: 'Ticket ID • MP-CMO-2026-XXXXX',
                              hintStyle: const TextStyle(fontSize: 12),
                              prefixIcon: const Icon(Icons.confirmation_number, size: 18),
                              filled: true,
                              fillColor: AppColors.paper,
                              contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
                              border: OutlineInputBorder(borderRadius: BorderRadius.circular(14), borderSide: BorderSide.none),
                            ),
                            onSubmitted: (_) => _openTrack(),
                          ),
                        ),
                        const SizedBox(width: 8),
                        InkWell(
                          onTap: _openTrack,
                          child: Container(
                            padding: const EdgeInsets.all(13),
                            decoration: BoxDecoration(gradient: AppColors.saffronGlow, borderRadius: BorderRadius.circular(14)),
                            child: const Icon(Icons.arrow_forward, color: Colors.white, size: 20),
                          ),
                        ),
                      ]),
                      const SizedBox(height: 10),
                      const ServerStatusStrip(),
                    ]),
                  ),
                  const SizedBox(height: 14),
                  // Report by department
                  Row(children: [
                    Text(app.lang == 'hi' ? 'विभाग चुनें' : 'Report by department', style: AppText.section),
                  ]),
                  const SizedBox(height: 8),
                  GridView.builder(
                    shrinkWrap: true,
                    physics: const NeverScrollableScrollPhysics(),
                    gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(crossAxisCount: 3, mainAxisSpacing: 10, crossAxisSpacing: 10, childAspectRatio: 0.92),
                    itemCount: depts.isEmpty ? 5 : depts.length,
                    itemBuilder: (_, i) {
                      if (depts.isEmpty) {
                        return Container(decoration: cardDec(radius: 18), child: const Center(child: CircularProgressIndicator(strokeWidth: 2)));
                      }
                      final d = depts[i];
                      final c = deptColor(d.id);
                      return InkWell(
                        borderRadius: BorderRadius.circular(18),
                        onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => FileComplaintScreen(initialDept: d.id))),
                        child: Container(
                          padding: const EdgeInsets.all(10),
                          decoration: cardDec(radius: 18),
                          child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
                            Container(
                              padding: const EdgeInsets.all(10),
                              decoration: BoxDecoration(color: c.withValues(alpha: 0.12), shape: BoxShape.circle),
                              child: Icon(deptIcon(d.id), color: c, size: 22),
                            ),
                            const SizedBox(height: 6),
                            Text((app.lang == 'hi' ? d.nameHi : d.nameEn).split('(').first.trim(),
                                textAlign: TextAlign.center, maxLines: 2, overflow: TextOverflow.ellipsis,
                                style: const TextStyle(fontSize: 10.5, fontWeight: FontWeight.w800)),
                          ]),
                        ),
                      );
                    },
                  ),
                  const SizedBox(height: 14),
                  // Secondary services
                  Row(children: [
                    _service(
                      Icons.smartphone, AppColors.indigo600, app.lang == 'hi' ? 'मोबाइल से खोजें' : 'Find by mobile',
                      () => Navigator.push(context, MaterialPageRoute(builder: (_) => const FindMobileScreen())),
                    ),
                    const SizedBox(width: 10),
                    _service(
                      Icons.spa, const Color(0xFF059669), s.yojana,
                      () => Navigator.push(context, MaterialPageRoute(builder: (_) => const YojanaScreen())),
                    ),
                  ]),
                  const SizedBox(height: 10),
                  Row(children: [
                    _service(
                      loggedIn ? Icons.shield : Icons.key,
                      const Color(0xFF7C3AED),
                      loggedIn ? '${app.officer!.name} • L${app.officer!.level}' : s.authorityLogin,
                      () => Navigator.push(context,
                          MaterialPageRoute(builder: (_) => loggedIn ? const OfficerDeskScreen() : const AuthorityLoginScreen())),
                    ),
                    const SizedBox(width: 10),
                    _service(Icons.settings, AppColors.muted, s.settings,
                        () => Navigator.push(context, MaterialPageRoute(builder: (_) => const SettingsScreen()))),
                  ]),
                  const SizedBox(height: 14),
                  // Helpline banner
                  InkWell(
                    onTap: () => launchUrl(Uri(scheme: 'tel', path: '181')),
                    child: Container(
                      padding: const EdgeInsets.all(14),
                      decoration: BoxDecoration(
                        gradient: const LinearGradient(colors: [Color(0xFF7C2D12), Color(0xFFB45309)]),
                        borderRadius: BorderRadius.circular(20),
                      ),
                      child: Row(children: [
                        Container(
                          padding: const EdgeInsets.all(10),
                          decoration: BoxDecoration(color: Colors.white.withValues(alpha: 0.18), shape: BoxShape.circle),
                          child: const Icon(Icons.call, color: Colors.white, size: 20),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                            Text(s.helpline, style: const TextStyle(color: Colors.white, fontSize: 14, fontWeight: FontWeight.w900)),
                            const Text('Toll-free • 24×7 CM Helpline', style: TextStyle(color: Color(0xFFFDE68A), fontSize: 11)),
                          ]),
                        ),
                        const Icon(Icons.chevron_right, color: Colors.white),
                      ]),
                    ),
                  ),
                  const SizedBox(height: 90),
                ]),
              ),
            ),
          ]),
        ),
      ),
    );
  }

  Widget _service(IconData icon, Color c, String label, VoidCallback onTap) {
    return Expanded(
      child: InkWell(
        borderRadius: BorderRadius.circular(18),
        onTap: onTap,
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 10),
          decoration: cardDec(radius: 18),
          child: Column(children: [
            Icon(icon, color: c, size: 22),
            const SizedBox(height: 6),
            Text(label, textAlign: TextAlign.center, maxLines: 2, style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w800)),
          ]),
        ),
      ),
    );
  }

  void _openTrack() {
    if (quickId.text.trim().isEmpty) return;
    Navigator.push(context, MaterialPageRoute(builder: (_) => TrackTicketScreen(initialId: quickId.text.trim())));
  }
}
