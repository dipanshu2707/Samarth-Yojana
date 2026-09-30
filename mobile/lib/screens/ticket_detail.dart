import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../api/api_client.dart';
import '../l10n/strings.dart';
import '../models/models.dart';
import '../state/app_state.dart';
import '../theme/app_theme.dart';
import '../widgets/common.dart';

/// Premium ticket dossier: hero header, tier stepper, evidence,
/// email log and timeline. Shared by tracking screens and officers.
class TicketDetail extends StatelessWidget {
  final Grievance t;
  const TicketDetail({super.key, required this.t});

  @override
  Widget build(BuildContext context) {
    final app = context.watch<AppState>();
    final s = S(app.lang);
    final api = Api(app.baseUrl);
    final img = api.resolve(t.photoUrl);

    return SingleChildScrollView(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        // Hero card
        Container(
          width: double.infinity,
          padding: const EdgeInsets.all(16),
          decoration: const BoxDecoration(gradient: AppColors.hero, borderRadius: BorderRadius.all(Radius.circular(24))),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Row(children: [
              Expanded(
                child: Text(t.ticketId,
                    style: const TextStyle(fontFamily: 'monospace', fontSize: 14, fontWeight: FontWeight.w900, color: AppColors.saffron)),
              ),
              if (t.priority == 'Critical')
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(gradient: AppColors.saffronGlow, borderRadius: BorderRadius.circular(20)),
                  child: const Text('CRITICAL', style: TextStyle(fontSize: 10, fontWeight: FontWeight.w900, color: Colors.white)),
                ),
            ]),
            const SizedBox(height: 8),
            Text(t.title, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w900, color: Colors.white, height: 1.3)),
            const SizedBox(height: 4),
            Text('${t.department} • ${t.district} • ${t.createdAt}', style: const TextStyle(fontSize: 11, color: Color(0xFFC7D2FE))),
            const SizedBox(height: 10),
            Wrap(spacing: 6, runSpacing: 6, children: [
              _darkPill(s.level(t.escalationLevel)),
              _darkPill(s.workflow(t.workflowStatus)),
              _darkPill('${t.slaRemaining} days SLA'),
            ]),
          ]),
        ),
        const SizedBox(height: 12),
        _tierStepper(),
        const SizedBox(height: 12),
        _card(children: [
          Text(t.description, style: AppText.body),
          const SizedBox(height: 10),
          Wrap(spacing: 8, runSpacing: 8, children: [
            _mini('Citizen', t.citizenName),
            _mini('Contact', t.mobileMasked),
            _mini('SLA', t.workflowStatus == 'resolved' ? s.resolved : '${t.slaRemaining} days left • ${t.slaDeadline}'),
          ]),
        ]),
        if (img.isNotEmpty) ...[
          const SizedBox(height: 12),
          ClipRRect(
            borderRadius: BorderRadius.circular(20),
            child: Image.network(img, height: 210, width: double.infinity, fit: BoxFit.cover,
                errorBuilder: (_, __, ___) => Container(
                    height: 80,
                    color: AppColors.paper,
                    child: const Center(child: Text('Photo unavailable', style: TextStyle(fontSize: 12, color: AppColors.muted))))),
          ),
        ],
        if ((t.audioTranscript ?? '').isNotEmpty) ...[
          const SizedBox(height: 12),
          _card(children: [
            const Row(children: [
              Icon(Icons.mic, size: 14, color: AppColors.indigo600),
              SizedBox(width: 6),
              Text('Voice transcript', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: AppColors.muted)),
            ]),
            const SizedBox(height: 4),
            Text('“${t.audioTranscript}”', style: const TextStyle(fontSize: 13, fontStyle: FontStyle.italic, height: 1.5)),
          ]),
        ],
        if (t.isDuplicate && (t.duplicateSummary ?? '').isNotEmpty) ...[
          const SizedBox(height: 12),
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(color: Colors.amber.shade50, borderRadius: BorderRadius.circular(18), border: Border.all(color: Colors.amber.shade200)),
            child: Text(t.duplicateSummary!, style: const TextStyle(fontSize: 12)),
          ),
        ],
        const SectionTitle(text: 'Action timeline'),
        _card(children: [TimelineView(steps: t.timeline)]),
        if (t.approvals.isNotEmpty) ...[
          const SectionTitle(text: 'Approval trail'),
          for (final a in t.approvals)
            Container(
              margin: const EdgeInsets.only(bottom: 8),
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(color: Colors.purple.shade50, borderRadius: BorderRadius.circular(16), border: Border.all(color: Colors.purple.shade100)),
              child: Text('L${a.fromLevel} → L${a.targetLevel} • ${a.requestedBy} • ${a.decision}\n${a.note}',
                  style: const TextStyle(fontSize: 11, height: 1.5)),
            ),
        ],
        if (t.emailLog.isNotEmpty) ...[
          const SectionTitle(text: 'Email delivery log'),
          for (final m in t.emailLog)
            Container(
              margin: const EdgeInsets.only(bottom: 6),
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                  color: Colors.white, borderRadius: BorderRadius.circular(14), border: Border.all(color: AppColors.line)),
              child: Row(children: [
                Icon(m.ok ? Icons.mark_email_read : Icons.mark_email_unread, size: 16, color: m.ok ? Colors.green.shade700 : Colors.red),
                const SizedBox(width: 8),
                Expanded(child: Text('${m.timestamp} → ${m.to}', style: const TextStyle(fontSize: 11))),
                Text(m.ok ? 'sent' : 'failed',
                    style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: m.ok ? Colors.green.shade700 : Colors.red)),
              ]),
            ),
        ],
        if ((t.resolutionNote ?? '').isNotEmpty) ...[
          const SizedBox(height: 6),
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
                color: Colors.green.shade50, borderRadius: BorderRadius.circular(18), border: Border.all(color: Colors.green.shade200)),
            child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Icon(Icons.verified, color: Colors.green.shade700, size: 18),
              const SizedBox(width: 8),
              Expanded(child: Text('Resolution: ${t.resolutionNote}', style: const TextStyle(fontSize: 12, height: 1.5))),
            ]),
          ),
        ],
      ]),
    );
  }

  Widget _darkPill(String text) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(color: Colors.white.withValues(alpha: 0.14), borderRadius: BorderRadius.circular(20)),
      child: Text(text, style: const TextStyle(fontSize: 10.5, fontWeight: FontWeight.w800, color: Colors.white)),
    );
  }

  Widget _card({required List<Widget> children}) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(14),
      decoration: cardDec(),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: children),
    );
  }

  Widget _mini(String k, String v) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
      decoration: BoxDecoration(color: AppColors.paper, borderRadius: BorderRadius.circular(12)),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text(k, style: const TextStyle(fontSize: 9, color: AppColors.muted)),
        Text(v, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700)),
      ]),
    );
  }

  Widget _tierStepper() {
    Widget tier(String label, bool active, bool done, Color c) {
      return Expanded(
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 250),
          padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 4),
          decoration: BoxDecoration(
            gradient: active ? LinearGradient(colors: [c.withValues(alpha: 0.22), c.withValues(alpha: 0.08)]) : null,
            color: active ? null : Colors.white,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: active ? c : AppColors.line, width: active ? 1.6 : 1),
          ),
          child: Column(children: [
            Icon(done ? Icons.check_circle : active ? Icons.radio_button_checked : Icons.radio_button_unchecked,
                size: 20, color: done ? Colors.green.shade700 : active ? c : AppColors.muted),
            const SizedBox(height: 4),
            Text(label, textAlign: TextAlign.center, style: const TextStyle(fontSize: 9.5, fontWeight: FontWeight.w800)),
          ]),
        ),
      );
    }

    final lvl = t.escalationLevel;
    return Row(children: [
      tier('TIER 1\nDept', lvl == 1, lvl > 1, Colors.blue.shade700),
      const Padding(
        padding: EdgeInsets.symmetric(horizontal: 2),
        child: Icon(Icons.chevron_right, size: 14, color: AppColors.muted),
      ),
      tier('TIER 2\nCollector', lvl == 2, lvl > 2, Colors.amber.shade800),
      const Padding(
        padding: EdgeInsets.symmetric(horizontal: 2),
        child: Icon(Icons.chevron_right, size: 14, color: AppColors.muted),
      ),
      tier('TIER 3\nCM Office', lvl == 3, false, Colors.red),
    ]);
  }
}
