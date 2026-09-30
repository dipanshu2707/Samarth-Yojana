import React, { useEffect, useMemo, useState } from 'react';
import { MapContainer, TileLayer, CircleMarker, Tooltip, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet.heat';
import 'leaflet/dist/leaflet.css';
import { Flame, RefreshCw, Layers, Tag, MapPin } from 'lucide-react';
import { MP_CENTER, MP_BOUNDS, centroidOf, jitterFor, intensityFor } from './mpDistricts';
import { workflowLabel } from './workflow';

const INTENSITY_COLOR = {
  Severe: '#f43f5e',
  Elevated: '#f59e0b',
  Moderate: '#6366f1',
};

function HeatManager({ points, visible }) {
  const map = useMap();
  useEffect(() => {
    if (!visible || points.length === 0) return undefined;
    const layer = L.heatLayer(points, {
      radius: 30,
      blur: 24,
      maxZoom: 11,
      minOpacity: 0.4,
      gradient: { 0.2: '#38bdf8', 0.45: '#a3e635', 0.65: '#fbbf24', 0.85: '#f97316', 1.0: '#e11d48' },
    });
    layer.addTo(map);
    return () => {
      map.removeLayer(layer);
    };
  }, [map, points, visible]);
  return null;
}

export default function MpHeatmap({
  language = 'en',
  cases = [],
  hotspots = [],
  districtFilter = 'all',
  updatedAt = '',
  refreshing = false,
  onRefresh,
}) {
  const [showHeat, setShowHeat] = useState(true);
  const [showBubbles, setShowBubbles] = useState(true);
  const [showLabels, setShowLabels] = useState(true);
  const [deptFilter, setDeptFilter] = useState('all');

  const deptOptions = useMemo(() => {
    const seen = new Map();
    cases.forEach((c) => {
      if (c.dept_id && !seen.has(c.dept_id)) seen.set(c.dept_id, c.department || c.dept_id);
    });
    return [...seen.entries()];
  }, [cases]);

  const visibleCases = useMemo(() => {
    return cases.filter((c) => {
      if (deptFilter !== 'all' && c.dept_id !== deptFilter) return false;
      if (districtFilter === 'critical' && c.priority !== 'Critical') return false;
      if (districtFilter === 'rural' && c.region_type !== 'rural') return false;
      if (districtFilter === 'urban' && c.region_type !== 'urban') return false;
      return true;
    });
  }, [cases, deptFilter, districtFilter]);

  const heatPoints = useMemo(() => {
    return visibleCases.map((c) => {
      const [lat, lng] = centroidOf(c.district);
      const [dLat, dLng] = jitterFor(c.ticket_id);
      return [lat + dLat, lng + dLng, intensityFor(c)];
    });
  }, [visibleCases]);

  const bubbles = useMemo(() => {
    const byDistrict = new Map();
    visibleCases.forEach((c) => {
      const key = (c.district || 'Unknown').trim();
      if (!byDistrict.has(key)) byDistrict.set(key, { district: key, total: 0, critical: 0, items: [] });
      const b = byDistrict.get(key);
      b.total += 1;
      if (c.priority === 'Critical') b.critical += 1;
      b.items.push(c);
    });
    const hotByDistrict = new Map(hotspots.map((h) => [h.district, h]));
    return [...byDistrict.values()].map((b) => {
      const [lat, lng] = centroidOf(b.district);
      const hot = hotByDistrict.get(b.district);
      const intensity = b.critical > 0 || (hot && hot.hotspot_intensity === 'Severe')
        ? 'Severe'
        : b.total >= 2 || (hot && hot.hotspot_intensity === 'Elevated')
          ? 'Elevated'
          : 'Moderate';
      return { ...b, lat, lng, intensity, hot };
    });
  }, [visibleCases, hotspots]);

  const stats = useMemo(() => ({
    total: visibleCases.length,
    critical: visibleCases.filter((c) => c.priority === 'Critical').length,
    open: visibleCases.filter((c) => (c.workflow_status || 'open') !== 'resolved').length,
  }), [visibleCases]);

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-4 sm:p-5 pb-3">
        <div>
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Flame className="w-5 h-5 text-amber-500" />
            {language === 'hi' ? 'मध्य प्रदेश लाइव शिकायत हीटमैप' : 'Madhya Pradesh live complaint heatmap'}
            <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full border border-emerald-200">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> LIVE
            </span>
          </h3>
          <p className="text-[11px] text-slate-500 mt-0.5">
            {stats.total} {language === 'hi' ? 'शिकायतें' : 'complaints'} • {stats.critical} critical • {stats.open} active
            {updatedAt ? ` • updated ${updatedAt}` : ''}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
          <select
            value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white font-bold text-slate-700"
          >
            <option value="all">{language === 'hi' ? 'सभी विभाग' : 'All departments'}</option>
            {deptOptions.map(([id, name]) => (
              <option key={id} value={id}>{name.split('(')[0].trim()}</option>
            ))}
          </select>
          {[
            { id: 'heat', label: 'Heat', on: showHeat, set: setShowHeat, icon: Flame },
            { id: 'bubbles', label: language === 'hi' ? 'बबल' : 'Bubbles', on: showBubbles, set: setShowBubbles, icon: MapPin },
            { id: 'labels', label: language === 'hi' ? 'नाम' : 'Labels', on: showLabels, set: setShowLabels, icon: Tag },
          ].map((l) => (
            <button
              key={l.id}
              onClick={() => l.set(!l.on)}
              className={`px-2.5 py-1.5 rounded-lg font-bold border flex items-center gap-1 transition-all ${l.on ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-slate-100 text-slate-500 border-slate-200'}`}
            >
              <l.icon className="w-3 h-3" /> {l.label}
            </button>
          ))}
          <button
            onClick={onRefresh}
            disabled={refreshing}
            className="px-2.5 py-1.5 rounded-lg font-bold bg-white border border-slate-200 text-slate-700 flex items-center gap-1 hover:border-indigo-400 disabled:opacity-50"
          >
            <RefreshCw className={`w-3 h-3 ${refreshing ? 'animate-spin' : ''}`} />
            {language === 'hi' ? 'ताज़ा करें' : 'Refresh'}
          </button>
        </div>
      </div>

      <div className="relative mx-4 sm:mx-5 mb-2 rounded-2xl overflow-hidden border border-slate-200" style={{ height: 520 }}>
        <MapContainer
          center={MP_CENTER}
          zoom={6}
          minZoom={5}
          maxZoom={12}
          maxBounds={MP_BOUNDS}
          maxBoundsViscosity={1.0}
          scrollWheelZoom
          style={{ height: '100%', width: '100%', zIndex: 0 }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
            url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          />
          <HeatManager points={heatPoints} visible={showHeat} />
          {showBubbles && bubbles.map((b) => (
            <CircleMarker
              key={b.district}
              center={[b.lat, b.lng]}
              radius={Math.min(34, 11 + b.total * 5)}
              pathOptions={{
                color: INTENSITY_COLOR[b.intensity],
                weight: 2.5,
                fillColor: INTENSITY_COLOR[b.intensity],
                fillOpacity: 0.32,
              }}
            >
              {showLabels && (
                <Tooltip permanent direction="top" offset={[0, -10]} className="mp-label">
                  <strong>{b.district}</strong> • {b.total}
                </Tooltip>
              )}
              <Popup>
                <div style={{ minWidth: 220 }}>
                  <p style={{ fontWeight: 800, fontSize: 13, margin: '0 0 2px' }}>{b.district}</p>
                  <p style={{ fontSize: 11, color: '#64748b', margin: '0 0 6px' }}>
                    {b.total} complaints • {b.critical} critical • {b.intensity} zone
                  </p>
                  {b.items.slice(0, 3).map((t) => (
                    <div key={t.ticket_id} style={{ fontSize: 11, borderTop: '1px solid #e2e8f0', padding: '5px 0' }}>
                      <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#4338ca' }}>{t.ticket_id}</span>
                      <div style={{ fontWeight: 600 }}>{t.title}</div>
                      <div style={{ color: '#64748b' }}>{workflowLabel(t.workflow_status, language)} • Level {t.escalation_level}</div>
                    </div>
                  ))}
                  {b.total > 3 && <p style={{ fontSize: 10, color: '#64748b' }}>+{b.total - 3} more in this district</p>}
                </div>
              </Popup>
            </CircleMarker>
          ))}
        </MapContainer>

        <div className="absolute bottom-3 right-3 z-[1000] bg-white/95 backdrop-blur rounded-xl border border-slate-200 shadow-md px-3 py-2 text-[10px] font-bold text-slate-600 space-y-1 pointer-events-none">
          <p className="flex items-center gap-1.5"><Layers className="w-3 h-3 text-slate-400" /> Density (priority-weighted)</p>
          <p className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full" style={{ background: '#e11d48' }} /> Critical</p>
          <p className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full" style={{ background: '#f59e0b' }} /> Elevated</p>
          <p className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full" style={{ background: '#6366f1' }} /> Moderate</p>
        </div>

        <div className="absolute top-3 left-3 z-[1000] bg-slate-900/90 text-white rounded-xl px-3 py-2 text-[10px] font-bold pointer-events-none">
          {bubbles.length} districts • {stats.total} plotted • drag to pan, scroll to zoom
        </div>
      </div>
      <p className="px-4 sm:px-5 pb-4 text-[10px] text-slate-400">
        {language === 'hi'
          ? 'प्रत्येक बिंदु एक पंजीकृत शिकायत है (गंभीरता अनुसार रंगा)। नई शिकायत दर्ज होते ही मानचित्र स्वतः ताज़ा होता है।'
          : 'Each glow point is a registered complaint, weighted by severity. The map refreshes automatically when a new complaint is filed.'}
      </p>
    </div>
  );
}
