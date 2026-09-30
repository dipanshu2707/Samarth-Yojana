import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import 'package:provider/provider.dart';
import '../api/api_client.dart';
import '../data/mp_districts.dart';
import '../l10n/strings.dart';
import '../models/models.dart';
import '../state/app_state.dart';
import '../widgets/common.dart';
import 'tracking_screens.dart';

Color _intensityColor(String v) {
  switch (v) {
    case 'Severe':
      return Colors.red;
    case 'Elevated':
      return Colors.amber;
    default:
      return Colors.indigo;
  }
}

Color _intensityDark(String v) {
  switch (v) {
    case 'Severe':
      return Colors.red.shade900;
    case 'Elevated':
      return Colors.amber.shade900;
    default:
      return Colors.indigo.shade900;
  }
}

class HotspotsScreen extends StatefulWidget {
  const HotspotsScreen({super.key});
  @override
  State<HotspotsScreen> createState() => _HotspotsScreenState();
}

class _HotspotsScreenState extends State<HotspotsScreen> {
  List<Hotspot> hotspots = [];
  List<Grievance> cases = [];
  String? error;
  bool loading = true;
  String deptFilter = 'all';
  String scopeFilter = 'all';
  Timer? timer;

  @override
  void initState() {
    super.initState();
    _load();
    timer = Timer.periodic(const Duration(seconds: 20), (_) => _load(silent: true));
  }

  @override
  void dispose() {
    timer?.cancel();
    super.dispose();
  }

  Future<void> _load({bool silent = false}) async {
    if (!silent) setState(() => loading = true);
    try {
      final api = Api(context.read<AppState>().baseUrl);
      final h = await api.hotspots();
      final c = await api.list();
      if (!mounted) return;
      setState(() {
        hotspots = h;
        cases = c;
        error = null;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() => error = '$e');
    } finally {
      if (mounted) setState(() => loading = false);
    }
  }

  List<Grievance> get visible => cases.where((c) {
        if (deptFilter != 'all' && c.deptId != deptFilter) return false;
        if (scopeFilter == 'critical' && c.priority != 'Critical') return false;
        if (scopeFilter == 'rural' && c.regionType != 'rural') return false;
        if (scopeFilter == 'urban' && c.regionType != 'urban') return false;
        return true;
      }).toList();

  Map<String, List<Grievance>> get byDistrict {
    final m = <String, List<Grievance>>{};
    for (final c in visible) {
      m.putIfAbsent(c.district.isEmpty ? 'Unknown' : c.district, () => []).add(c);
    }
    return m;
  }

  @override
  Widget build(BuildContext context) {
    final app = context.watch<AppState>();
    final s = S(app.lang);
    final groups = byDistrict;
    final deptNames = <String, String>{};
    for (final c in cases) {
      deptNames.putIfAbsent(c.deptId, () => c.department.split('(').first.trim());
    }

    List<Marker> markers = [];
    groups.forEach((district, list) {
      final c = centroidOf(district);
      final critical = list.where((e) => e.priority == 'Critical').length;
      final zone = critical > 0 ? 'Severe' : list.length >= 2 ? 'Elevated' : 'Moderate';
      final color = _intensityColor(zone);
      final dark = _intensityDark(zone);
      // heat dots (one per complaint, jittered)
      for (final g in list) {
        final j = jitterFor(g.ticketId);
        final inten = intensityFor(g.priority, g.workflowStatus);
        markers.add(Marker(
          point: LatLng(c[0] + j[0], c[1] + j[1]),
          width: 26,
          height: 26,
          child: IgnorePointer(
            child: Container(
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: (g.priority == 'Critical' ? Colors.red : g.priority == 'High' ? Colors.orange : Colors.yellow.shade700)
                    .withValues(alpha: 0.25 + inten * 0.45),
              ),
            ),
          ),
        ));
      }
      // district bubble
      final size = (34 + list.length * 8).clamp(34, 78).toDouble();
      markers.add(Marker(
        point: LatLng(c[0], c[1]),
        width: size + 56,
        height: size + 26,
        alignment: Alignment.topCenter,
        child: GestureDetector(
          onTap: () => _openDistrict(context, s, district, list),
          child: Column(mainAxisSize: MainAxisSize.min, children: [
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
              decoration: BoxDecoration(color: const Color(0xFF0F172A).withValues(alpha: 0.88), borderRadius: BorderRadius.circular(10)),
              child: Text('$district • ${list.length}', style: const TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.w800)),
            ),
            Container(
              width: size,
              height: size,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: color.withValues(alpha: 0.30),
                border: Border.all(color: color, width: 2.5),
              ),
              child: Center(child: Text('${list.length}', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w900, color: dark))),
            ),
          ]),
        ),
      ));
    });

    final plotted = groups.values.fold<int>(0, (a, b) => a + b.length);
    final critCount = visible.where((c) => c.priority == 'Critical').length;

    return Scaffold(
      appBar: AppBar(
        title: Text(s.hotspots),
        actions: [IconButton(onPressed: loading ? null : () => _load(), icon: const Icon(Icons.refresh))],
      ),
      body: Column(children: [
        Container(
          width: double.infinity,
          margin: const EdgeInsets.fromLTRB(12, 10, 12, 0),
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
          decoration: BoxDecoration(
            gradient: const LinearGradient(colors: [Color(0xFF0F172A), Color(0xFF1E1B4B)]),
            borderRadius: BorderRadius.circular(16),
          ),
          child: Row(children: [
            const Icon(Icons.local_fire_department, color: Colors.amber, size: 18),
            const SizedBox(width: 8),
            Expanded(
              child: Text('$plotted plotted • $critCount critical • ${groups.length} districts',
                  style: const TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.w800)),
            ),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
              decoration: BoxDecoration(color: Colors.green.withValues(alpha: 0.2), borderRadius: BorderRadius.circular(20)),
              child: Row(mainAxisSize: MainAxisSize.min, children: [
                Icon(Icons.circle, color: Colors.greenAccent, size: 8),
                SizedBox(width: 4),
                Text('LIVE', style: TextStyle(color: Colors.greenAccent, fontSize: 10, fontWeight: FontWeight.w900)),
              ]),
            ),
          ]),
        ),
        Padding(
          padding: const EdgeInsets.fromLTRB(12, 8, 12, 0),
          child: Row(children: const [
            _LegendDot(color: Colors.red, label: 'Critical'),
            SizedBox(width: 12),
            _LegendDot(color: Colors.orange, label: 'High'),
            SizedBox(width: 12),
            _LegendDot(color: Colors.amber, label: 'Medium'),
          ]),
        ),
        const SizedBox(height: 8),
        SizedBox(
          height: 380,
          child: FlutterMap(
            options: MapOptions(
              initialCenter: const LatLng(23.45, 78.4),
              initialZoom: 6,
              minZoom: 5,
              maxZoom: 12,
              maxBounds: LatLngBounds(const LatLng(20.8, 73.8), const LatLng(27.6, 83.2)),
            ),
            children: [
              TileLayer(
                urlTemplate: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
                userAgentPackageName: 'gov.mp.mponline',
                retinaMode: true,
              ),
              MarkerLayer(markers: markers),
            ],
          ),
        ),
        Padding(
          padding: const EdgeInsets.fromLTRB(12, 10, 12, 0),
          child: Row(children: [
            Expanded(
              child: DropdownButtonFormField<String>(
                value: deptFilter,
                decoration: fieldDec('Department'),
                items: [
                  const DropdownMenuItem(value: 'all', child: Text('All departments', style: TextStyle(fontSize: 12))),
                  for (final e in deptNames.entries) DropdownMenuItem(value: e.key, child: Text(e.value, style: const TextStyle(fontSize: 12))),
                ],
                onChanged: (v) => setState(() => deptFilter = v!),
              ),
            ),
            const SizedBox(width: 8),
            Expanded(
              child: DropdownButtonFormField<String>(
                value: scopeFilter,
                decoration: fieldDec('Scope'),
                items: const [
                  DropdownMenuItem(value: 'all', child: Text('All', style: TextStyle(fontSize: 12))),
                  DropdownMenuItem(value: 'critical', child: Text('Critical', style: TextStyle(fontSize: 12))),
                  DropdownMenuItem(value: 'rural', child: Text('Rural', style: TextStyle(fontSize: 12))),
                  DropdownMenuItem(value: 'urban', child: Text('Urban', style: TextStyle(fontSize: 12))),
                ],
                onChanged: (v) => setState(() => scopeFilter = v!),
              ),
            ),
          ]),
        ),
        Expanded(
          child: loading && hotspots.isEmpty
              ? const Center(child: CircularProgressIndicator())
              : error != null && hotspots.isEmpty
                  ? Center(child: Padding(padding: const EdgeInsets.all(24), child: ErrorBox(message: error!)))
                  : ListView.builder(
                      padding: const EdgeInsets.all(12),
                      itemCount: hotspots.length,
                      itemBuilder: (_, i) {
                        final h = hotspots[i];
                        final c = _intensityColor(h.intensity);
                        return Card(
                          margin: const EdgeInsets.only(bottom: 10),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                          elevation: 0,
                          child: Container(
                            padding: const EdgeInsets.all(14),
                            decoration: BoxDecoration(border: Border.all(color: const Color(0xFFE2E8F0)), borderRadius: BorderRadius.circular(16)),
                            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                              Row(children: [
                                Expanded(child: Text(h.district, style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 14))),
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                  decoration: BoxDecoration(color: c.withValues(alpha: 0.12), borderRadius: BorderRadius.circular(20)),
                                  child: Text('${h.intensity} • ${h.total}', style: TextStyle(fontSize: 10, fontWeight: FontWeight.w800, color: c)),
                                ),
                              ]),
                              const SizedBox(height: 4),
                              Text(h.primaryCategory, style: const TextStyle(fontSize: 11, color: Colors.grey)),
                              Text('Rural ${h.rural} / Urban ${h.urban} • L2 ${h.l2} • L3 ${h.l3}',
                                  style: const TextStyle(fontSize: 11, color: Colors.grey)),
                            ]),
                          ),
                        );
                      },
                    ),
        ),
      ]),
    );
  }

  void _openDistrict(BuildContext context, S s, String district, List<Grievance> list) {
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(22))),
      builder: (_) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text('$district (${list.length})', style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w900)),
            const SizedBox(height: 8),
            Flexible(
              child: ListView(
                shrinkWrap: true,
                children: [
                  for (final t in list.take(5))
                    ListTile(
                      dense: true,
                      contentPadding: EdgeInsets.zero,
                      title: Text(t.title, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700)),
                      subtitle: Text('${t.ticketId} • ${s.workflow(t.workflowStatus)}', style: const TextStyle(fontSize: 11)),
                      trailing: const Icon(Icons.chevron_right, size: 18),
                      onTap: () {
                        Navigator.pop(context);
                        Navigator.push(context, MaterialPageRoute(builder: (_) => TrackTicketScreen(initialId: t.ticketId)));
                      },
                    ),
                ],
              ),
            ),
          ]),
        ),
      ),
    );
  }
}

class _LegendDot extends StatelessWidget {
  final Color color;
  final String label;
  const _LegendDot({required this.color, required this.label});
  @override
  Widget build(BuildContext context) {
    return Row(mainAxisSize: MainAxisSize.min, children: [
      Icon(Icons.circle, color: color, size: 10),
      const SizedBox(width: 4),
      Text(label, style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w700, color: Colors.grey)),
    ]);
  }
}

