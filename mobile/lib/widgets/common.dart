import 'package:flutter/material.dart';
import '../l10n/strings.dart';
import '../models/models.dart';
import '../theme/app_theme.dart';

Color workflowColor(String v) {
  switch (v) {
    case 'in_review':
      return Colors.amber.shade800;
    case 'in_progress':
      return Colors.indigo.shade700;
    case 'resolved':
      return Colors.green.shade700;
    default:
      return Colors.lightBlue.shade700;
  }
}

Color workflowBg(String v) {
  switch (v) {
    case 'in_review':
      return Colors.amber.shade50;
    case 'in_progress':
      return Colors.indigo.shade50;
    case 'resolved':
      return Colors.green.shade50;
    default:
      return Colors.lightBlue.shade50;
  }
}

class StatusPill extends StatelessWidget {
  final String value;
  final S s;
  const StatusPill({super.key, required this.value, required this.s});
  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: workflowBg(value),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: workflowColor(value).withValues(alpha: 0.35)),
      ),
      child: Text(s.workflow(value), style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: workflowColor(value))),
    );
  }
}

class LevelPill extends StatelessWidget {
  final int level;
  final S s;
  const LevelPill({super.key, required this.level, required this.s});
  @override
  Widget build(BuildContext context) {
    final c = level == 3 ? Colors.red.shade700 : level == 2 ? Colors.amber.shade800 : Colors.blue.shade700;
    final bg = level == 3 ? Colors.red.shade50 : level == 2 ? Colors.amber.shade50 : Colors.blue.shade50;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(color: bg, borderRadius: BorderRadius.circular(20), border: Border.all(color: c.withValues(alpha: 0.35))),
      child: Text(s.level(level), style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: c)),
    );
  }
}

class GradientHeader extends StatelessWidget {
  final String title;
  final String subtitle;
  final List<Widget> badges;
  const GradientHeader({super.key, required this.title, required this.subtitle, this.badges = const []});
  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.fromLTRB(20, 26, 20, 22),
      decoration: const BoxDecoration(
        gradient: LinearGradient(colors: [Color(0xFF0F172A), Color(0xFF1E1B4B), Color(0xFF0F172A)]),
        borderRadius: BorderRadius.vertical(bottom: Radius.circular(28)),
      ),
      child: SafeArea(
        bottom: false,
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Wrap(spacing: 8, runSpacing: 8, children: badges),
          const SizedBox(height: 10),
          Text(title, style: const TextStyle(color: Colors.white, fontSize: 22, fontWeight: FontWeight.w900)),
          const SizedBox(height: 4),
          Text(subtitle, style: const TextStyle(color: Color(0xFFCBD5E1), fontSize: 13)),
        ]),
      ),
    );
  }
}

class SectionTitle extends StatelessWidget {
  final String text;
  const SectionTitle({super.key, required this.text});
  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(4, 18, 4, 8),
      child: Text(text, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w800, color: Color(0xFF475569))),
    );
  }
}

class FieldLabel extends StatelessWidget {
  final String text;
  const FieldLabel({super.key, required this.text});
  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 6, top: 12),
      child: Text(text, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: Color(0xFF334155))),
    );
  }
}

InputDecoration fieldDec(String hint) => InputDecoration(
      hintText: hint,
      filled: true,
      fillColor: Colors.white,
      contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 13),
      border: OutlineInputBorder(borderRadius: BorderRadius.circular(14), borderSide: const BorderSide(color: Color(0xFFE2E8F0))),
      enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(14), borderSide: const BorderSide(color: Color(0xFFE2E8F0))),
    );

class TimelineView extends StatelessWidget {
  final List<TimelineStep> steps;
  const TimelineView({super.key, required this.steps});
  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        for (int i = 0; i < steps.length; i++)
          IntrinsicHeight(
            child: Row(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
              Column(children: [
                Container(
                  width: 12,
                  height: 12,
                  margin: const EdgeInsets.only(top: 4),
                  decoration: BoxDecoration(
                    color: steps[i].stage == 'RESOLVED'
                        ? Colors.green
                        : steps[i].stage.startsWith('L3')
                            ? Colors.red
                            : steps[i].stage.startsWith('L2')
                                ? Colors.amber.shade700
                                : steps[i].stage.startsWith('EMAIL')
                                    ? Colors.lightBlue
                                    : Colors.indigo,
                    shape: BoxShape.circle,
                  ),
                ),
                if (i != steps.length - 1) Expanded(child: Container(width: 2, color: const Color(0xFFE2E8F0))),
              ]),
              const SizedBox(width: 12),
              Expanded(
                child: Padding(
                  padding: EdgeInsets.only(bottom: i == steps.length - 1 ? 0 : 16),
                  child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Wrap(spacing: 6, children: [
                      Text(steps[i].actor, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w800)),
                      Text(steps[i].timestamp, style: const TextStyle(fontSize: 10, color: Colors.grey)),
                    ]),
                    const SizedBox(height: 2),
                    Text(steps[i].message, style: const TextStyle(fontSize: 12, color: Color(0xFF475569))),
                  ]),
                ),
              ),
            ]),
          ),
      ],
    );
  }
}

class TicketCard extends StatelessWidget {
  final Grievance t;
  final S s;
  final VoidCallback onTap;
  const TicketCard({super.key, required this.t, required this.s, required this.onTap});
  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
      elevation: 0,
      color: Colors.transparent,
      child: InkWell(
        borderRadius: BorderRadius.circular(20),
        onTap: onTap,
        child: Container(
          padding: const EdgeInsets.all(14),
          decoration: cardDec(radius: 20),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Wrap(spacing: 6, runSpacing: 6, children: [
              Text(t.ticketId, style: const TextStyle(fontFamily: 'monospace', fontSize: 12, fontWeight: FontWeight.w800, color: Colors.indigo)),
              LevelPill(level: t.escalationLevel, s: s),
              StatusPill(value: t.workflowStatus, s: s),
            ]),
            const SizedBox(height: 8),
            Text(t.title, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w800)),
            const SizedBox(height: 2),
            Text('${t.department} • ${t.district}', style: const TextStyle(fontSize: 11, color: Colors.grey)),
          ]),
        ),
      ),
    );
  }
}

class ErrorBox extends StatelessWidget {
  final String message;
  const ErrorBox({super.key, required this.message});
  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(color: Colors.red.shade50, borderRadius: BorderRadius.circular(14), border: Border.all(color: Colors.red.shade200)),
      child: Row(children: [
        const Icon(Icons.error_outline, color: Colors.red, size: 20),
        const SizedBox(width: 8),
        Expanded(child: Text(message, style: const TextStyle(fontSize: 12, color: Color(0xFF9F1239)))),
      ]),
    );
  }
}
