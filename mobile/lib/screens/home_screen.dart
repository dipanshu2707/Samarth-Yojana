import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:url_launcher/url_launcher.dart';
import '../api/api_client.dart';
import '../l10n/strings.dart';
import '../state/app_state.dart';
import '../widgets/common.dart';
import 'file_complaint_screen.dart';
import 'find_mobile_screen.dart';
import 'track_ticket_screen.dart';
import 'hotspots_screen.dart';
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
  int _liveCount = 0;

  @override
  void initState() {
    super.initState();
    _loadCount();
  }

  Future<void> _loadCount() async {
    try {
      final api = Api(context.read<AppState>().baseUrl);
      final list = await api.list();
      if (mounted) setState(() => _liveCount = list.length);
    } catch (_) {}
  }

  @override
  Widget build(BuildContext context) {
    final app = context.watch<AppState>();
    final s = S(app.lang);
    final api = Api(app.baseUrl);
    final loggedIn = app.officer != null;

    Widget tile(IconData icon, Color color, String label, VoidCallback onTap, {String? badge}) {
      return InkWell(
        borderRadius: BorderRadius.circular(20),
        onTap: onTap,
        child: Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(20),
            border: Border.all(color: const Color(0xFFE2E8F0)),
          ),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Row(children: [
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(color: color.withOpacity(0.12), borderRadius: BorderRadius.circular(14)),
                child: Icon(icon, color: color, size: 22),
              ),
              const Spacer(),
              if (badge != null)
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(color: Colors.emerald.shade50, borderRadius: BorderRadius.circular(20), border: Border.all(color: Colors.emerald.shade200)),
                  child: Text(badge, style: TextStyle(fontSize: 10, fontWeight: FontWeight.w800, color: Colors.emerald.shade700)),
                ),
            ]),
            const SizedBox(height: 12),
            Text(label, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w800)),
          ]),
        ),
      );
    }

    return Scaffold(
      backgroundColor: const Color(0xFFF1F5F9),
      body: RefreshIndicator(
        onRefresh: _loadCount,
        child: SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          child: Column(children: [
            GradientHeader(
              title: s.appName,
              subtitle: '${s.tagline} • $_liveCount live cases',
              badges: [
                _badge('MP CM Online', Colors.amber),
                _badge('L1 → L2 → L3', Colors.emerald),
              ],
            ),
            Padding(
              padding: const EdgeInsets.all(16),
              child: Column(children: [
                Row(children: [
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: () => launchUrl(Uri(scheme: 'tel', path: '181')),
                      icon: const Icon(Icons.call, size: 16),
                      label: Text(s.helpline, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w800)),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const SettingsScreen())),
                      icon: const Icon(Icons.settings, size: 16),
                      label: Text(s.settings, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w800)),
                    ),
                  ),
                ]),
                const SectionTitle(text: 'Citizen services'),
                GridView.count(
                  crossAxisCount: 2,
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  mainAxisSpacing: 12,
                  crossAxisSpacing: 12,
                  childAspectRatio: 1.25,
                  children: [
                    tile(Icons.edit_document, Colors.indigo, s.fileComplaint,
                        () => Navigator.push(context, MaterialPageRoute(builder: (_) => const FileComplaintScreen()))),
                    tile(Icons.smartphone, Colors.blue, s.findByMobile,
                        () => Navigator.push(context, MaterialPageRoute(builder: (_) => const FindMobileScreen()))),
                    tile(Icons.search, Colors.teal, s.trackByTicket,
                        () => Navigator.push(context, MaterialPageRoute(builder: (_) => const TrackTicketScreen()))),
                    tile(Icons.local_fire_department, Colors.orange, s.hotspots,
                        () => Navigator.push(context, MaterialPageRoute(builder: (_) => const HotspotsScreen()))),
                    tile(Icons.spa, Colors.emerald, s.yojana,
                        () => Navigator.push(context, MaterialPageRoute(builder: (_) => const YojanaScreen()))),
                    tile(
                      loggedIn ? Icons.shield : Icons.key,
                      Colors.deepPurple,
                      loggedIn ? '${s.officerDesk} (${app.officer!.name})' : s.authorityLogin,
                      () => Navigator.push(
                          context,
                          MaterialPageRoute(
                              builder: (_) => loggedIn ? const OfficerDeskScreen() : const AuthorityLoginScreen())),
                      badge: loggedIn ? 'L${app.officer!.level}' : null,
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                Row(children: [
                  Expanded(
                    child: TextButton(
                      onPressed: () => app.setLang(app.lang == 'hi' ? 'en' : 'hi'),
                      child: Text(app.lang == 'hi' ? 'Switch to English' : 'हिन्दी में देखें',
                          style: const TextStyle(fontWeight: FontWeight.w800)),
                    ),
                  ),
                ]),
              ]),
            ),
          ]),
        ),
      ),
    );
  }

  Widget _badge(String text, Color c) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(color: c.withOpacity(0.15), borderRadius: BorderRadius.circular(20), border: Border.all(color: c.withOpacity(0.4))),
      child: Text(text, style: TextStyle(fontSize: 10, fontWeight: FontWeight.w800, color: c)),
    );
  }
}
