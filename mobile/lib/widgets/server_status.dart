import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../api/api_client.dart';
import '../state/app_state.dart';
import '../theme/app_theme.dart';

/// Wake-up control for the free-tier backend (sleeps when idle).
/// Polls /health until Render answers, with live attempt feedback.
class WakeServerButton extends StatefulWidget {
  final bool compact;
  const WakeServerButton({super.key, this.compact = false});
  @override
  State<WakeServerButton> createState() => _WakeServerButtonState();
}

class _WakeServerButtonState extends State<WakeServerButton> {
  bool waking = false;
  String? note;

  Future<void> _wake() async {
    setState(() {
      waking = true;
      note = 'Waking server… attempt 1';
    });
    try {
      await Api(context.read<AppState>().baseUrl).wakeServer(onAttempt: (i) {
        if (mounted) setState(() => note = 'Waking server… attempt $i');
      });
      if (!mounted) return;
      setState(() => note = 'Server is awake');
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Server is awake — reload your data')));
    } catch (e) {
      if (!mounted) return;
      setState(() => note = 'Still asleep: $e');
    } finally {
      if (mounted) setState(() => waking = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (widget.compact) {
      return OutlinedButton.icon(
        onPressed: waking ? null : _wake,
        icon: waking
            ? const SizedBox(width: 12, height: 12, child: CircularProgressIndicator(strokeWidth: 2))
            : const Icon(Icons.bedtime_off, size: 14),
        label: Text(note ?? 'Wake server', style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w800)),
      );
    }
    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      ElevatedButton.icon(
        onPressed: waking ? null : _wake,
        icon: waking
            ? const SizedBox(width: 14, height: 14, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
            : const Icon(Icons.bedtime_off, size: 16),
        label: const Text('Wake up server', style: TextStyle(fontSize: 13)),
        style: ElevatedButton.styleFrom(backgroundColor: AppColors.saffronDeep),
      ),
      if (note != null)
        Padding(
          padding: const EdgeInsets.only(top: 6),
          child: Text(note!, style: const TextStyle(fontSize: 11, color: AppColors.muted)),
        ),
    ]);
  }
}

/// Home-screen server status strip: live badge or wake control.
class ServerStatusStrip extends StatefulWidget {
  const ServerStatusStrip({super.key});
  @override
  State<ServerStatusStrip> createState() => _ServerStatusStripState();
}

class _ServerStatusStripState extends State<ServerStatusStrip> {
  bool? online;
  int liveCases = 0;

  @override
  void initState() {
    super.initState();
    _probe();
  }

  Future<void> _probe() async {
    try {
      final api = Api(context.read<AppState>().baseUrl);
      await api.health();
      final list = await api.list();
      if (!mounted) return;
      setState(() {
        online = true;
        liveCases = list.length;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() => online = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
      decoration: BoxDecoration(
        color: AppColors.ink,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: Colors.white.withValues(alpha: 0.12)),
      ),
      child: Row(children: [
        Container(
          width: 9,
          height: 9,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            color: online == null
                ? Colors.grey
                : online == true
                    ? Colors.greenAccent
                    : Colors.amber,
          ),
        ),
        const SizedBox(width: 8),
        Expanded(
          child: Text(
            online == null
                ? 'Checking server…'
                : online == true
                    ? 'Server live • $liveCases cases'
                    : 'Server asleep (free tier) — wake it',
            style: const TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.w700),
          ),
        ),
        if (online == false)
          TextButton(
            onPressed: () async {
              try {
                await Api(context.read<AppState>().baseUrl).wakeServer();
              } catch (_) {}
              _probe();
            },
            child: const Text('WAKE', style: TextStyle(color: AppColors.saffron, fontSize: 12, fontWeight: FontWeight.w900)),
          )
        else
          InkWell(onTap: _probe, child: const Icon(Icons.refresh, color: Colors.white70, size: 16)),
      ]),
    );
  }
}
