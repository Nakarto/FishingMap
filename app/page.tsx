'use client';

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { LayerGroup, Map as LeafletMap, TileLayer } from 'leaflet';
import { Bookmark, Check, Compass, Fish, LoaderCircle, LocateFixed, Map, MapPin, Navigation, Satellite, Share2, Ship, SlidersHorizontal, Store, X } from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { LEVEL_COLOR, LEVEL_LABEL, spots } from '@/data/spots';
import type { Category, Spot } from '@/types/fishing';

const categories: { id: Category; label: string; icon: typeof Fish }[] = [
  { id: 'shop', label: LEVEL_LABEL.shop, icon: Store },
  { id: 'bait', label: LEVEL_LABEL.bait, icon: Fish },
  { id: 'fishing', label: LEVEL_LABEL.fishing, icon: MapPin },
  { id: 'boat', label: LEVEL_LABEL.boat, icon: Ship },
];

const mapTiles = {
  satellite: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
  streets: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
} as const;

function distanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const toRad = (value: number) => value * Math.PI / 180;
  const dLat = toRad(b.lat - a.lat), dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(h));
}

function CategoryVisual({ level }: { level: Category }) {
  const Icon = level === 'boat' ? Ship : level === 'shop' ? Store : level === 'bait' ? Fish : MapPin;
  return <Icon size={54} aria-hidden="true" />;
}

export default function HomePage() {
  const mapElement = useRef<HTMLDivElement>(null);
  const map = useRef<LeafletMap | null>(null);
  const markers = useRef<LayerGroup | null>(null);
  const tiles = useRef<TileLayer | null>(null);
  const [query, setQuery] = useState('');
  const [enabled, setEnabled] = useState<Category[]>(categories.map((category) => category.id));
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [center, setCenter] = useState<[number, number]>([8.79, 99.94]);
  const [menuOpen, setMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [layer, setLayer] = useState<'satellite' | 'streets'>('satellite');
  const [saved, setSaved] = useState<number[]>([]);
  const [notice, setNotice] = useState('');
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationStatus, setLocationStatus] = useState<'idle' | 'loading' | 'found'>('idle');
  const locatingRef = useRef(false);

  const filtered = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase('th');
    return spots.filter((spot) => enabled.includes(spot.level)
      && `${spot.name} ${spot.water} ${spot.desc} ${spot.fish.join(' ')}`.toLocaleLowerCase('th').includes(needle));
  }, [enabled, query]);
  const selected = spots.find((spot) => spot.id === selectedId) ?? null;
  const distance = selected && userLocation ? distanceKm(userLocation, selected) : null;
  const searchSuggestions = filtered.slice(0, 8);

  useLayoutEffect(() => {
    const stage = mapElement.current?.parentElement;
    const card = stage?.querySelector<HTMLElement>('.detail-card');
    if (!stage) return;
    if (!card) {
      stage.style.setProperty('--detail-card-height', '0px');
      return;
    }
    const updateHeight = () => stage.style.setProperty('--detail-card-height', `${card.getBoundingClientRect().height}px`);
    updateHeight();
    const observer = new ResizeObserver(updateHeight);
    observer.observe(card);
    return () => observer.disconnect();
  }, [selectedId]);

  useEffect(() => {
    let disposed = false;
    void import('leaflet').then((L) => {
      if (disposed || !mapElement.current) return;
      const isNewMap = !map.current;
      if (!map.current) map.current = L.map(mapElement.current, { zoomControl: false }).setView(center, 9);
      const instance = map.current;
      if (tiles.current) instance.removeLayer(tiles.current);
      tiles.current = L.tileLayer(mapTiles[layer], {
        attribution: layer === 'satellite' ? 'Tiles &copy; Esri' : '&copy; OpenStreetMap contributors', maxZoom: 19,
      }).addTo(instance);
      if (markers.current) instance.removeLayer(markers.current);
      const markerGroup = L.layerGroup().addTo(instance);
      markers.current = markerGroup;
      filtered.forEach((spot) => {
        const symbol: Record<Category, string> = { shop: '▣', bait: '◆', fishing: '●', boat: '⛵' };
        const icon = L.divIcon({ className: 'marker-wrap', html: `<div class="map-pin ${selectedId === spot.id ? 'pin-active' : ''}" style="--pin-color:${LEVEL_COLOR[spot.level]}"><span>${symbol[spot.level]}</span></div>`, iconSize: [42, 52], iconAnchor: [21, 47] });
        L.marker([spot.lat, spot.lng], { icon }).on('click', () => { setSelectedId(spot.id); setCenter([spot.lat, spot.lng]); }).addTo(markerGroup);
      });
      if (userLocation) L.circleMarker([userLocation.lat, userLocation.lng], { radius: 8, color: '#fff', weight: 3, fillColor: '#1876f9', fillOpacity: 1 }).bindTooltip('ตำแหน่งของคุณ').addTo(markerGroup);
      if (isNewMap) {
        L.control.zoom({ position: 'bottomright' }).addTo(instance);
        requestAnimationFrame(() => instance.invalidateSize({ pan: false }));
      }
    });
    return () => { disposed = true; };
  }, [filtered, layer, selectedId, userLocation]);

  useEffect(() => {
    if (map.current) map.current.flyTo(center, Math.max(map.current.getZoom(), 10), { duration: 0.7 });
  }, [center]);

  useEffect(() => () => { map.current?.remove(); map.current = null; }, []);

  useEffect(() => {
    if (!notice) return;
    const timeout = window.setTimeout(() => setNotice(''), 3500);
    return () => window.clearTimeout(timeout);
  }, [notice]);

  useEffect(() => {
    const refreshMapSize = () => map.current?.invalidateSize({ pan: false });
    window.addEventListener('resize', refreshMapSize);
    return () => window.removeEventListener('resize', refreshMapSize);
  }, []);

  const toggle = (id: Category) => setEnabled((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  const choose = (spot: Spot) => { setSelectedId(spot.id); setCenter([spot.lat, spot.lng]); setMenuOpen(false); };
  const selectSuggestion = (spot: Spot) => { setQuery(spot.name); choose(spot); };
  const toggleNavigation = () => {
    if (window.matchMedia('(max-width:720px)').matches) setMenuOpen((open) => !open);
    else setSidebarCollapsed((collapsed) => !collapsed);
  };
  const locate = () => {
    if (locatingRef.current) return;
    if (!navigator.geolocation) { setNotice('เบราว์เซอร์นี้ไม่รองรับการระบุตำแหน่ง'); return; }
    locatingRef.current = true;
    setLocationStatus('loading');
    setNotice('');
    navigator.geolocation.getCurrentPosition((position) => {
      locatingRef.current = false;
      setLocationStatus('found');
      const location = { lat: position.coords.latitude, lng: position.coords.longitude };
      setUserLocation(location); setCenter([location.lat, location.lng]); setNotice('พบตำแหน่งของคุณแล้ว');
    }, (error) => {
      locatingRef.current = false;
      setLocationStatus('idle');
      setNotice(error.code === 1 ? 'กรุณาอนุญาตการเข้าถึงตำแหน่งในเบราว์เซอร์' : error.code === 3 ? 'ค้นหาตำแหน่งนานเกินไป กรุณาลองอีกครั้ง' : 'ไม่สามารถระบุตำแหน่งได้ กรุณาลองอีกครั้ง');
    }, { enableHighAccuracy: true, timeout: 10000 });
  };
  const share = async () => {
    if (!selected) return;
    const url = `https://www.google.com/maps/search/?api=1&query=${selected.lat},${selected.lng}`;
    if (navigator.share) { try { await navigator.share({ title: selected.name, url }); } catch { /* user cancelled */ } }
    else { await navigator.clipboard.writeText(url); setNotice('คัดลอกลิงก์แล้ว'); }
  };

  return <div className={`app${sidebarCollapsed ? ' sidebar-collapsed' : ''}`}>
    <Header query={query} onQueryChange={setQuery} suggestions={searchSuggestions} onSelectSuggestion={selectSuggestion} onOpenMenu={toggleNavigation} onToggleLayer={() => setLayer((value) => value === 'satellite' ? 'streets' : 'satellite')} onLocate={locate} onToggleMenu={toggleNavigation} />
    <aside className={`sidebar ${menuOpen ? 'open' : ''}`}>
      <div className="sidebar-title"><span>สำรวจแผนที่</span><button className="close-menu" onClick={() => setMenuOpen(false)} aria-label="ปิดเมนู"><X size={20} /></button></div>
      <div className="side-categories">{categories.map((category) => { const Icon = category.icon; return <button key={category.id} className={enabled.includes(category.id) ? 'enabled' : ''} onClick={() => toggle(category.id)}><span className="cat-icon" style={{ background: LEVEL_COLOR[category.id] }}><Icon size={17} /></span>{category.label}<span className="side-check">{enabled.includes(category.id) && <Check size={13} />}</span></button>; })}</div>
      <fieldset className="map-layers">
        <legend>เลเยอร์แผนที่</legend>
        <div className="map-layer-options">
          <label className="map-layer-option">
            <input type="radio" name="map-layer" value="satellite" checked={layer === 'satellite'} onChange={() => setLayer('satellite')} />
            <span className="map-layer-card">
              <span className="map-layer-icon"><Satellite size={23} aria-hidden="true" /></span>
              <strong>ดาวเทียม</strong><small>ดูภาพพื้นที่จริง</small>
              <span className="map-layer-check" aria-hidden="true"><Check size={12} /></span>
            </span>
          </label>
          <label className="map-layer-option">
            <input type="radio" name="map-layer" value="streets" checked={layer === 'streets'} onChange={() => setLayer('streets')} />
            <span className="map-layer-card">
              <span className="map-layer-icon"><Map size={23} aria-hidden="true" /></span>
              <strong>แผนที่ปกติ</strong><small>ดูถนนและเส้นทาง</small>
              <span className="map-layer-check" aria-hidden="true"><Check size={12} /></span>
            </span>
          </label>
        </div>
      </fieldset>
      <section className="map-guide" aria-labelledby="map-guide-title">
        <h2 id="map-guide-title">วิธีใช้แผนที่</h2>
        <ol className="map-guide-steps">
          <li>
            <span className="map-guide-icon"><SlidersHorizontal size={17} aria-hidden="true" /></span>
            <div><h3>เลือกหมวดหมู่ที่สนใจ</h3><p>เปิดหรือปิดหมวดหมู่ เพื่อเลือกสถานที่ที่แสดงบนแผนที่</p></div>
          </li>
          <li>
            <span className="map-guide-icon"><MapPin size={17} aria-hidden="true" /></span>
            <div><h3>แตะหมุดเพื่อดูรายละเอียด</h3><p>ดูข้อมูลสถานที่และชนิดปลา พร้อมเปิดเส้นทางไปยังจุดหมาย</p></div>
          </li>
        </ol>
      </section>
      <div className="sidebar-bottom"><Compass size={19} /> {spots.length} สถานที่ในนครศรีธรรมราช</div>
    </aside>
    {menuOpen && <button className="scrim" aria-label="ปิดตัวกรอง" onClick={() => setMenuOpen(false)} />}
    <main className="map-stage">
      <div ref={mapElement} className="map" />
      <div className="map-shade" /><div className="map-label">สำรวจนครศรีธรรมราช <span>● {filtered.length} สถานที่</span></div>
      <button type="button" className={`mobile-locate${selected ? ' above-card' : ''}${locationStatus === 'found' ? ' is-located' : ''}`} onClick={locate} disabled={locationStatus === 'loading'} aria-busy={locationStatus === 'loading'} aria-label={locationStatus === 'loading' ? 'กำลังค้นหาตำแหน่งของฉัน' : 'แสดงตำแหน่งของฉัน'} title="แสดงตำแหน่งของฉัน">
        {locationStatus === 'loading' ? <LoaderCircle className="location-spinner" size={24} aria-hidden="true" /> : <LocateFixed size={24} aria-hidden="true" />}
      </button>
      <div className="mobile-categories">{categories.map((category) => { const Icon = category.icon; return <button key={category.id} className={enabled.includes(category.id) ? 'on' : ''} onClick={() => toggle(category.id)}><span style={{ background: LEVEL_COLOR[category.id] }}><Icon size={16} /></span>{category.label}</button>; })}</div>
      {selected && <article className="detail-card"><div className="card-handle" /><button className="card-close" onClick={() => setSelectedId(null)} aria-label="ปิดรายละเอียด"><X size={19} /></button><div className={`card-image category-${selected.level}`}><CategoryVisual level={selected.level} /></div><div className="card-content"><div className="card-type"><span style={{ background: LEVEL_COLOR[selected.level] }} /> {LEVEL_LABEL[selected.level]}</div><h1>{selected.name}</h1><p className="meta"><MapPin size={16} />{selected.lat.toFixed(5)}, {selected.lng.toFixed(5)}</p><p className="meta"><Compass size={16} />{selected.water}</p>{distance !== null && <p className="meta"><Navigation size={16} />{distance.toFixed(1)} กม. จากตำแหน่งของคุณ</p>}<p className="card-description">{selected.desc}</p><div className="tags">{selected.fish.map((item) => <span key={item}>{item}</span>)}</div><div className="card-actions"><a className="primary" href={`https://www.google.com/maps/dir/?api=1&destination=${selected.lat},${selected.lng}`} target="_blank" rel="noreferrer"><Navigation size={16} /> เส้นทาง</a><button onClick={() => setSaved((current) => current.includes(selected.id) ? current.filter((id) => id !== selected.id) : [...current, selected.id])}><Bookmark size={16} fill={saved.includes(selected.id) ? 'currentColor' : 'none'} />{saved.includes(selected.id) ? 'บันทึกแล้ว' : 'บันทึก'}</button><button onClick={share}><Share2 size={16} /> แชร์</button></div></div></article>}
      {notice && <div className="notice" role="status">{notice}</div>}<Footer />
    </main>
  </div>;
}
