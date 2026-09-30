import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../api/api_client.dart';
import '../l10n/strings.dart';
import '../models/models.dart';
import '../state/app_state.dart';
import '../widgets/common.dart';

/// Full ticket dossier: status pills, evidence photo, voice transcript,
/// 3-tier stepper, email log and immutable timeline. Shared by citizen
/// tracking and the officer desk.
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
      padding: const EdgeInsets.all(16),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Wrap(spacing: 6, runSpacing: 6, children: [
          Text(t.ticketId,
              style: const TextStyle(fontFamily: 'monospace', fontSize: 14, fontWeight: FontWeight.w900, color: Colors.indigo)),
          LevelPill(level: t.escalationLevel, s: s),
          StatusPill(value: t.workflowStatus, s: s),
          if (t.priority == 'Critical')
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
              decoration: BoxDecoration(color: Colors.rose, borderRadius: BorderRadius.circular(20)),
              child: const Text('CRITICAL', style: TextStyle(fontSize: 10, fontWeight: FontWeight.w900, color: Colors.white)),
            ),
        ]),
        const SizedBox(height: 10),
        Text(t.title, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w900)),
        Text('${t.department} • ${t.district} • ${t.createdAt}', style: const TextStyle(fontSize: 11, color: Colors.grey)),
        const SizedBox(height: 10),
        _tierStepper(s),
        const SizedBox(height: 10),
        Container(
          width: double.infinity,
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(color: Colors.grey.shade100, borderRadius: BorderRadius.circular(14), border: Border.all(color: const Color(0xFFE2E8F0))),
          child: Text(t.description, style: const TextStyle(fontSize: 13, height: 1.5)),
        ),
        const SizedBox(height: 10),
        Wrap(spacing: 8, runSpacing: 8, children: [
          _mini('Citizen', t.citizenName),
          _mini('Contact', t.mobileMasked),
          _mini('SLA', t.workflowStatus == 'resolved' ? s.resolved : '${t.slaRemaining} days left'),
        ]),
        if (img.isNotEmpty) ...[
          const SizedBox(height: 10),
          ClipRRect(
            borderRadius: BorderRadius.circular(14),
            child: Image.network(img, height: 200, width: double.infinity, fit: BoxFit.cover,
                errorBuilder: (_, __, ___) => Container(height: 80, color: Colors.grey.shade200, child: const Center(child: Text('Photo unavailable')))),
          ),
        ],
        if ((t.audioTranscript ?? '').isNotEmpty) ...[
          const SizedBox(height: 10),
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(color: Colors.indigo.shade50, borderRadius: BorderRadius.circular(14), border: Border.all(color: Colors.indigo.shade100)),
            child: Text('Voice: "${t.audioTranscript}"', style: const TextStyle(fontSize: 12, fontStyle: FontStyle.italic)),
          ),
        ],
        if (t.isDuplicate && (t.duplicateSummary ?? '').isNotEmpty) ...[
          const SizedBox(height: 10),
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(color: Colors.amber.shade50, borderRadius: BorderRadius.circular(14), border: Border.all(color: Colors.amber.shade200)),
            child: Text(t.duplicateSummary!, style: const TextStyle(fontSize: 12)),
          ),
        ],
        const SectionTitle(text: 'Action timeline'),
        TimelineView(steps: t.timeline),
        if (t.approvals.isNotEmpty) ...[
          const SectionTitle(text: 'Approval trail'),
          for (final a in t.approvals)
            Container(
              margin: const EdgeInsets.only(bottom: 8),
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(color: Colors.purple.shade50, borderRadius: BorderRadius.circular(12), border: Border.all(color: Colors.purple.shade100)),
              child: Text('L${a.fromLevel} → L${a.targetLevel} • ${a.requestedBy} • ${a.decision}\n${a.note}',
                  style: const TextStyle(fontSize: 11)),
            ),
        ],
        if (t.emailLog.isNotEmpty) ...[
          const SectionTitle(text: 'Email delivery log'),
          for (final m in t.emailLog)
            Container(
              margin: const EdgeInsets.only(bottom: 6),
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(color: Colors.sky.shade50, borderRadius: BorderRadius.circular(12), border: Border.all(color: Colors.sky.shade100)),
              child: Row(children: [
                Expanded(child: Text('${m.timestamp} → ${m.to}', style: const TextStyle(fontSize: 11))),
                Text(m.ok ? 'sent (${m.provider})' : 'failed', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: m.ok ? Colors.emerald.shade700 : Colors.rose)),
              ]),
            ),
        ],
        if ((t.resolutionNote ?? '').isNotEmpty) ...[
          const SizedBox(height: 6),
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(color: Colors.emerald.shade50, borderRadius: BorderRadius.circular(14), border: Border.all(color: Colors.emerald.shade200)),
            child: Text('Resolution: ${t.resolutionNote}', style: const TextStyle(fontSize: 12)),
          ),
        ],
      ]),
    );
  }

  Widget _mini(String k, String v) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
      decoration: BoxDecoration(color: Colors.grey.shade100, borderRadius: BorderRadius.circular(12)),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text(k, style: const TextStyle(fontSize: 9, color: Colors.grey)),
        Text(v, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700)),
      ]),
    );
  }

  Widget _tierStepper(S s) {
    Widget tier(String label, bool active, bool done, Color c) {
      return Expanded(
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 6),
          decoration: BoxDecoration(
            color: active ? c.withOpacity(0.12) : Colors.grey.shade100,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: active ? c : const Color(0xFFE2E8F0)),
          ),
          child: Column(children: [
            Icon(done ? Icons.check_circle : active ? Icons.radio_button_checked : Icons.radio_button_unchecked,
                size: 18, color: done ? Colors.emerald : active ? c : Colors.grey),
            const SizedBox(height: 4),
            Text(label, textAlign: TextAlign.center, style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w800)),
          ]),
        ),
      );
    }

    final lvl = t.escalationLevel;
    return Row(children: [
      tier('Tier 1\nDept', lvl == 1, lvl > 1, Colors.blue),
      const SizedBox(width: 6),
      tier('Tier 2\nCollector', lvl == 2, lvl > 2, Colors.amber.shade700),
      const SizedBox(width: 6),
      tier('Tier 3\nCM Office', lvl == 3, false, Colors.rose),
    ]);
  }
}
