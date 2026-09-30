import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../api/api_client.dart';
import '../l10n/strings.dart';
import '../models/models.dart';
import '../state/app_state.dart';
import '../widgets/common.dart';
import 'authority_login_screen.dart';

const statusOptions = ['all', 'open', 'in_review', 'in_progress', 'resolved'];

class OfficerDeskScreen extends StatefulWidget {
  const OfficerDeskScreen({super.key});
  @override
  State<OfficerDeskScreen> createState() => _OfficerDeskScreenState();
}

class _OfficerDeskScreenState extends State<OfficerDeskScreen> {
  List<Department> depts = [];
  List<Grievance> queue = [];
  bool loading = true;
  String? error;
  String desk = '';
  String deptFilter = 'all';
  String statusFilter = 'all';

  @override
  void initState() {
    super.initState();
    _init();
  }

  Future<void> _init() async {
    final app = context.read<AppState>();
    try {
      final d = await Api(app.baseUrl).departments();
      if (!mounted) return;
      setState(() {
        depts = d;
        if (app.officer?.level == 1) {
          desk = d.isNotEmpty ? d.first.id : '';
          deptFilter = desk;
        }
      });
      await _refresh();
    } catch (e) {
      if (!mounted) return;
      setState(() {
        loading = false;
        error = '$e';
      });
    }
  }

  Future<void> _refresh() async {
    final app = context.read<AppState>();
    final o = app.officer;
    if (o == null) return;
    if (o.level == 1 && desk.isEmpty) {
      setState(() {
        loading = false;
        queue = [];
      });
      return;
    }
    setState(() {
      loading = true;
      error = null;
    });
    try {
      final q = await Api(app.baseUrl).list(
        deptId: o.level == 1 ? desk : (deptFilter == 'all' ? null : deptFilter),
        workflow: statusFilter == 'all' ? null : statusFilter,
        token: o.token,
      );
      if (!mounted) return;
      setState(() => queue = q);
    } catch (e) {
      if (!mounted) return;
      setState(() => error = '$e');
    } finally {
      if (mounted) setState(() => loading = false);
    }
  }

  String deptName(String id) {
    final app = context.read<AppState>();
    for (final d in depts) {
      if (d.id == id) return app.lang == 'hi' ? d.nameHi : d.nameEn.split('(').first.trim();
    }
    return id;
  }

  Widget _countsRow(S s) {
    int count(String k) => queue.where((g) => g.workflowStatus == k).length;
    Widget cell(String key, String label, Color c) {
      final selected = statusFilter == key;
      return Expanded(
        child: InkWell(
          borderRadius: BorderRadius.circular(14),
          onTap: () {
            setState(() => statusFilter = selected ? 'all' : key);
            _refresh();
          },
          child: Container(
            padding: const EdgeInsets.symmetric(vertical: 10),
            decoration: BoxDecoration(
              color: selected ? c : c.withValues(alpha: 0.10),
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: c.withValues(alpha: 0.4)),
            ),
            child: Column(children: [
              Text('${count(key)}',
                  style: TextStyle(fontSize: 20, fontWeight: FontWeight.w900, color: selected ? Colors.white : c)),
              Text(label, style: TextStyle(fontSize: 10, fontWeight: FontWeight.w800, color: selected ? Colors.white : c)),
            ]),
          ),
        ),
      );
    }

    return Padding(
      padding: const EdgeInsets.fromLTRB(12, 10, 12, 0),
      child: Row(children: [
        cell('open', s.open, Colors.lightBlue.shade700),
        const SizedBox(width: 8),
        cell('in_review', s.inReview, Colors.amber.shade700),
        const SizedBox(width: 8),
        cell('in_progress', s.inProgress, Colors.indigo.shade700),
        const SizedBox(width: 8),
        cell('resolved', s.resolved, Colors.green.shade700),
      ]),
    );
  }

  @override
  Widget build(BuildContext context) {
    final app = context.watch<AppState>();
    final s = S(app.lang);
    final o = app.officer;
    if (o == null) return const AuthorityLoginScreen();

    return Scaffold(
      appBar: AppBar(
        title: Text('${s.officerDesk} • ${o.name}'),
        actions: [
          IconButton(
            icon: const Icon(Icons.logout),
            onPressed: () async {
              await app.setOfficer(null);
              if (context.mounted) {
                Navigator.pushAndRemoveUntil(context, MaterialPageRoute(builder: (_) => const AuthorityLoginScreen()), (_) => false);
              }
            },
          ),
        ],
      ),
      body: Column(children: [
        Container(
          width: double.infinity,
          padding: const EdgeInsets.all(12),
          color: const Color(0xFF0F172A),
          child: Text('${o.designation} • Level ${o.level} • ${o.email}',
              style: const TextStyle(color: Colors.white70, fontSize: 11, fontFamily: 'monospace')),
        ),
        if (o.level == 3) _countsRow(s),
        if (o.level == 1)
          Padding(
            padding: const EdgeInsets.fromLTRB(12, 10, 12, 0),
            child: DropdownButtonFormField<String>(              value: desk.isEmpty ? null : desk,
              decoration: fieldDec('Department desk'),
              items: depts.map((d) => DropdownMenuItem(value: d.id, child: Text(deptName(d.id), style: const TextStyle(fontSize: 12)))).toList(),
              onChanged: (v) {
                if (v == null) return;
                setState(() {
                  desk = v;
                  deptFilter = v;
                });
                _refresh();
              },
            ),
          ),
        Padding(
          padding: const EdgeInsets.fromLTRB(12, 8, 12, 0),
          child: Row(children: [
            if (o.level > 1)
              Expanded(
                child: DropdownButtonFormField<String>(
                  value: deptFilter,
                  decoration: fieldDec('Dept'),
                  items: [
                    const DropdownMenuItem(value: 'all', child: Text('All depts', style: TextStyle(fontSize: 12))),
                    for (final d in depts) DropdownMenuItem(value: d.id, child: Text(deptName(d.id), style: const TextStyle(fontSize: 12))),
                  ],
                  onChanged: (v) {
                    setState(() => deptFilter = v ?? 'all');
                    _refresh();
                  },
                ),
              ),
            if (o.level > 1) const SizedBox(width: 8),
            Expanded(
              child: DropdownButtonFormField<String>(
                value: statusFilter,
                decoration: fieldDec('Status'),
                items: statusOptions.map((x) => DropdownMenuItem(value: x, child: Text(x == 'all' ? 'All' : s.workflow(x), style: const TextStyle(fontSize: 12)))).toList(),
                onChanged: (v) {
                  setState(() => statusFilter = v ?? 'all');
                  _refresh();
                },
              ),
            ),
            IconButton(onPressed: loading ? null : _refresh, icon: const Icon(Icons.refresh)),
          ]),
        ),
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 6, 16, 0),
          child: Align(alignment: Alignment.centerLeft, child: Text('${queue.length} case(s)', style: const TextStyle(fontSize: 11, color: Colors.grey))),
        ),
        Expanded(
          child: loading
              ? const Center(child: CircularProgressIndicator())
              : error != null
                  ? Center(child: Padding(padding: const EdgeInsets.all(24), child: ErrorBox(message: error!)))
                  : queue.isEmpty
                      ? const Center(child: Text('No cases in this view.'))
                      : RefreshIndicator(
                          onRefresh: _refresh,
                          child: ListView.builder(
                            padding: const EdgeInsets.all(12),
                            itemCount: queue.length,
                            itemBuilder: (_, i) => TicketCard(
                              t: queue[i],
                              s: s,
                              onTap: () async {
                                await Navigator.push(
                                    context, MaterialPageRoute(builder: (_) => OfficerCaseScreen(ticket: queue[i], deptName: deptName(queue[i].deptId))));
                                _refresh();
                              },
                            ),
                          ),
                        ),
        ),
      ]),
    );
  }
}

class OfficerCaseScreen extends StatefulWidget {
  final Grievance ticket;
  final String deptName;
  const OfficerCaseScreen({super.key, required this.ticket, required this.deptName});
  @override
  State<OfficerCaseScreen> createState() => _OfficerCaseScreenState();
}

class _OfficerCaseScreenState extends State<OfficerCaseScreen> {
  late Grievance t;
  final remark = TextEditingController();
  final approvalNote = TextEditingController();
  bool busy = false;

  @override
  void initState() {
    super.initState();
    t = widget.ticket;
  }

  @override
  void dispose() {
    remark.dispose();
    approvalNote.dispose();
    super.dispose();
  }

  Future<void> _run(Future<Grievance> Function() call) async {
    setState(() => busy = true);
    try {
      final upd = await call();
      if (!mounted) return;
      setState(() {
        t = upd;
        remark.clear();
        approvalNote.clear();
      });
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Saved — email + timeline updated')));
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$e')));
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final app = context.watch<AppState>();
    final o = app.officer!;
    final api = Api(app.baseUrl);
    final next = t.escalationLevel + 1;

    return Scaffold(
      appBar: AppBar(title: Text(t.ticketId)),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Wrap(spacing: 6, runSpacing: 6, children: [
            LevelPill(level: t.escalationLevel, s: S(app.lang)),
            StatusPill(value: t.workflowStatus, s: S(app.lang)),
          ]),
          const SizedBox(height: 8),
          Text(t.title, style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w900)),
          Text('${widget.deptName} • ${t.district} • ${t.citizenName} (${t.mobileMasked})',
              style: const TextStyle(fontSize: 11, color: Colors.grey)),
          const SizedBox(height: 8),
          Text(t.description, style: const TextStyle(fontSize: 13)),
          const SizedBox(height: 8),
          const Text('Desk actions', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w800)),
          TextField(
            controller: remark,
            maxLines: 2,
            onChanged: (_) => setState(() {}),
            decoration: fieldDec('Field remark / resolution note…'),
          ),
          const SizedBox(height: 8),
          Wrap(spacing: 8, runSpacing: 8, children: [
            ElevatedButton(
              onPressed: busy || remark.text.isEmpty ? null : () => _run(() => api.setStatus(t.ticketId, 'in_review', o.name, o.designation, remark.text)),
              child: const Text('In Review', style: TextStyle(fontSize: 12)),
            ),
            ElevatedButton(
              onPressed: busy || remark.text.isEmpty ? null : () => _run(() => api.setStatus(t.ticketId, 'in_progress', o.name, o.designation, remark.text)),
              child: const Text('In Progress', style: TextStyle(fontSize: 12)),
            ),
            if (t.escalationLevel < 3 && t.workflowStatus != 'resolved')
              ElevatedButton(
                onPressed: busy
                    ? null
                    : () => _run(() => api.escalate(t.ticketId, next, remark.text.isEmpty ? 'Forwarded for higher intervention.' : remark.text, o.name,
                        o.designation)),
                style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF0F172A)),
                child: Text('Forward to L$next', style: const TextStyle(fontSize: 12)),
              ),
            if (t.workflowStatus != 'resolved')
              ElevatedButton(
                onPressed: busy || remark.text.isEmpty
                    ? null
                    : () => _run(() => api.setStatus(t.ticketId, 'resolved', o.name, o.designation, remark.text)),
                style: ElevatedButton.styleFrom(backgroundColor: Colors.green),
                child: const Text('Resolve', style: TextStyle(fontSize: 12)),
              ),
          ]),
          if (o.level < 3 && t.workflowStatus != 'resolved') ...[
            const SizedBox(height: 10),
            const Text('Request approval from higher tier', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w800)),
            Row(children: [
              Expanded(
                  child: TextField(
                controller: approvalNote,
                onChanged: (_) => setState(() {}),
                decoration: fieldDec('Note for Level $next…'),
              )),
              const SizedBox(width: 8),
              ElevatedButton(
                onPressed: busy || approvalNote.text.isEmpty
                    ? null
                    : () => _run(() => api.requestApproval(t.ticketId, o.name, o.designation, next, approvalNote.text)),
                style: ElevatedButton.styleFrom(backgroundColor: Colors.deepPurple),
                child: const Text('Ask', style: TextStyle(fontSize: 12)),
              ),
            ]),
          ],
          for (int i = 0; i < t.approvals.length; i++)
            if (t.approvals[i].decision == 'pending' && t.approvals[i].targetLevel <= o.level)
              Container(
                margin: const EdgeInsets.only(top: 8),
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(color: Colors.purple.shade50, borderRadius: BorderRadius.circular(12), border: Border.all(color: Colors.purple.shade100)),
                child: Row(children: [
                  Expanded(child: Text('${t.approvals[i].requestedBy}: ${t.approvals[i].note}', style: const TextStyle(fontSize: 11))),
                  TextButton(onPressed: busy ? null : () => _run(() => api.decideApproval(t.ticketId, i, 'approved', o.name, o.designation, 'Sanction granted.')), child: const Text('Approve', style: TextStyle(fontSize: 12))),
                  TextButton(onPressed: busy ? null : () => _run(() => api.decideApproval(t.ticketId, i, 'rejected', o.name, o.designation, 'Returned.')), child: const Text('Return', style: TextStyle(fontSize: 12))),
                ]),
              ),
          const SectionTitle(text: 'Timeline'),
          TimelineView(steps: t.timeline),
        ]),
      ),
    );
  }
}
