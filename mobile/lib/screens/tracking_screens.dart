import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../api/api_client.dart';
import '../l10n/strings.dart';
import '../models/models.dart';
import '../state/app_state.dart';
import '../widgets/common.dart';
import 'ticket_detail.dart';

class FindMobileScreen extends StatefulWidget {
  const FindMobileScreen({super.key});
  @override
  State<FindMobileScreen> createState() => _FindMobileScreenState();
}

class _FindMobileScreenState extends State<FindMobileScreen> {
  final mobile = TextEditingController();
  List<Grievance> items = [];
  bool loading = false;
  String? error;
  bool searched = false;

  Future<void> _search() async {
    setState(() {
      loading = true;
      error = null;
      searched = false;
    });
    try {
      final res = await Api(context.read<AppState>().baseUrl).byMobile(mobile.text);
      if (!mounted) return;
      setState(() {
        items = res;
        searched = true;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() => error = '$e');
    } finally {
      if (mounted) setState(() => loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final app = context.watch<AppState>();
    final s = S(app.lang);
    return Scaffold(
      appBar: AppBar(title: Text(s.findByMobile)),
      body: ListView(padding: const EdgeInsets.all(16), children: [
        TextField(
          controller: mobile,
          keyboardType: TextInputType.phone,
          decoration: fieldDec('10-digit mobile number').copyWith(prefixIcon: const Icon(Icons.smartphone)),
          onSubmitted: (_) => _search(),
        ),
        const SizedBox(height: 10),
        ElevatedButton(
          onPressed: loading ? null : _search,
          child: loading
              ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
              : Text(s.search),
        ),
        const SizedBox(height: 8),
        Wrap(spacing: 8, children: [
          for (final n in ['9826011223', '9425098765', '9179043210'])
            ActionChip(
              label: Text(n, style: const TextStyle(fontSize: 11, fontFamily: 'monospace')),
              onPressed: () {
                mobile.text = n;
                _search();
              },
            ),
        ]),
        if (error != null) ...[const SizedBox(height: 10), ErrorBox(message: error!)],
        if (searched) ...[
          const SizedBox(height: 10),
          Text('${items.length} complaint(s) found', style: const TextStyle(fontSize: 12, color: Colors.grey)),
        ],
        const SizedBox(height: 10),
        for (final t in items)
          TicketCard(
            t: t,
            s: s,
            onTap: () => Navigator.push(
              context,
              MaterialPageRoute(builder: (_) => Scaffold(appBar: AppBar(title: Text(t.ticketId)), body: TicketDetail(t: t))),
            ),
          ),
      ]),
    );
  }
}

class TrackTicketScreen extends StatefulWidget {
  final String? initialId;
  const TrackTicketScreen({super.key, this.initialId});
  @override
  State<TrackTicketScreen> createState() => _TrackTicketScreenState();
}

class _TrackTicketScreenState extends State<TrackTicketScreen> {
  final id = TextEditingController();
  Grievance? ticket;
  bool loading = false;
  String? error;

  @override
  void initState() {
    super.initState();
    if (widget.initialId != null) {
      id.text = widget.initialId!;
      _track();
    }
  }

  Future<void> _track() async {
    if (id.text.trim().isEmpty) return;
    setState(() {
      loading = true;
      error = null;
    });
    try {
      final t = await Api(context.read<AppState>().baseUrl).track(id.text);
      if (!mounted) return;
      setState(() => ticket = t);
    } catch (e) {
      if (!mounted) return;
      setState(() {
        error = '$e';
        ticket = null;
      });
    } finally {
      if (mounted) setState(() => loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final app = context.watch<AppState>();
    final s = S(app.lang);
    return Scaffold(
      appBar: AppBar(title: Text(s.trackByTicket)),
      body: ticket == null
          ? Padding(
              padding: const EdgeInsets.all(16),
              child: Column(children: [
                TextField(
                  controller: id,
                  decoration: fieldDec('Ticket ID (MP-CMO-2026-XXXXX)').copyWith(prefixIcon: const Icon(Icons.confirmation_number)),
                  onSubmitted: (_) => _track(),
                ),
                const SizedBox(height: 10),
                ElevatedButton(
                  onPressed: loading ? null : _track,
                  child: loading
                      ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                      : Text(s.search),
                ),
                if (error != null) ...[const SizedBox(height: 10), ErrorBox(message: error!)],
              ]),
            )
          : Column(children: [
              Container(
                padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
                child: Row(children: [
                  Expanded(
                    child: TextField(
                      controller: id,
                      decoration: fieldDec('Ticket ID').copyWith(prefixIcon: const Icon(Icons.confirmation_number)),
                      onSubmitted: (_) => _track(),
                    ),
                  ),
                  const SizedBox(width: 8),
                  IconButton.filled(onPressed: loading ? null : _track, icon: const Icon(Icons.search)),
                ]),
              ),
              Expanded(child: TicketDetail(t: ticket!)),
            ]),
    );
  }
}
