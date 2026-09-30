import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../state/app_state.dart';
import '../theme/app_theme.dart';
import 'home_screen.dart';
import 'tracking_screens.dart';
import 'file_complaint_screen.dart';
import 'hotspots_screen.dart';
import 'authority_login_screen.dart';
import 'officer_desk_screen.dart';

/// Bottom-navigation shell: Home • Track • Report (hero action) • Map • Desk.
class AppShell extends StatefulWidget {
  const AppShell({super.key});
  @override
  State<AppShell> createState() => _AppShellState();
}

class _AppShellState extends State<AppShell> {
  int index = 0;

  @override
  Widget build(BuildContext context) {
    final app = context.watch<AppState>();
    final desk = app.officer == null ? const AuthorityLoginScreen() : const OfficerDeskScreen();

    final pages = [
      const HomeScreen(),
      const TrackTicketScreen(),
      const FileComplaintScreen(),
      const HotspotsScreen(),
      desk,
    ];

    return Scaffold(
      body: IndexedStack(index: index, children: pages),
      bottomNavigationBar: Container(
        decoration: const BoxDecoration(
          color: Colors.white,
          border: Border(top: BorderSide(color: AppColors.line)),
          boxShadow: [BoxShadow(color: Color(0x1A0B1026), blurRadius: 20, offset: Offset(0, -6))],
        ),
        child: SafeArea(
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 6),
            child: Row(children: [
              _tab(0, Icons.home_outlined, Icons.home, 'Home'),
              _tab(1, Icons.search_outlined, Icons.search, 'Track'),
              _reportFab(),
              _tab(3, Icons.map_outlined, Icons.map, 'Map'),
              _tab(4, Icons.shield_outlined, Icons.shield, 'Desk'),
            ]),
          ),
        ),
      ),
    );
  }

  Widget _tab(int i, IconData idle, IconData active, String label) {
    final on = index == i;
    return Expanded(
      child: InkWell(
        borderRadius: BorderRadius.circular(16),
        onTap: () => setState(() => index = i),
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 6),
          child: Column(mainAxisSize: MainAxisSize.min, children: [
            Icon(on ? active : idle, size: 22, color: on ? AppColors.indigo600 : AppColors.muted),
            const SizedBox(height: 2),
            Text(label,
                style: TextStyle(fontSize: 10, fontWeight: FontWeight.w800, color: on ? AppColors.indigo600 : AppColors.muted)),
            AnimatedContainer(
              duration: const Duration(milliseconds: 200),
              margin: const EdgeInsets.only(top: 3),
              width: on ? 18 : 0,
              height: 3,
              decoration: BoxDecoration(color: AppColors.saffron, borderRadius: BorderRadius.circular(3)),
            ),
          ]),
        ),
      ),
    );
  }

  Widget _reportFab() {
    final on = index == 2;
    return Expanded(
      child: GestureDetector(
        onTap: () => setState(() => index = 2),
        child: Column(mainAxisSize: MainAxisSize.min, children: [
          Container(
            width: 52,
            height: 52,
            margin: const EdgeInsets.only(bottom: 2),
            decoration: BoxDecoration(
              gradient: AppColors.saffronGlow,
              shape: BoxShape.circle,
              boxShadow: [
                BoxShadow(color: AppColors.saffron.withValues(alpha: 0.45), blurRadius: 14, offset: const Offset(0, 6)),
                if (on) const BoxShadow(color: AppColors.indigo600, blurRadius: 0, spreadRadius: 2, offset: Offset.zero),
              ],
            ),
            child: const Icon(Icons.add_rounded, color: Colors.white, size: 30),
          ),
          Text('Report',
              style: TextStyle(fontSize: 10, fontWeight: FontWeight.w800, color: on ? AppColors.indigo600 : AppColors.muted)),
        ]),
      ),
    );
  }
}
