'use client';

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { LayerGroup, Map as LeafletMap, TileLayer } from 'leaflet';
import { Bookmark, Check, Compass, Fish, LoaderCircle, LocateFixed, Map as MapIcon, MapPin, Navigation, Satellite, Share2, Ship, SlidersHorizontal, Store, X } from 'lucide-react';
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
  const [savedReady, setSavedReady] = useState(false);
  const [showSaved, setShowSaved] = useState(false);
  const [viewMode, setViewMode] = useState<'map' | 'list'>('map');
  const [expandedDescription, setExpandedDescription] = useState(false);
  const [overlappingSpots, setOverlappingSpots] = useState<Spot[]>([]);
  const [mapError, setMapError] = useState(false);
  const [notice, setNotice] = useState('');
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationStatus, setLocationStatus] = useState<'idle' | 'loading' | 'found'>('idle');
  const locatingRef = useRef(false);

  const filtered = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase('th');
    return spots.filter((spot) => enabled.includes(spot.level) && (!showSaved || saved.includes(spot.id))
      && `${spot.name} ${spot.water} ${spot.desc} ${spot.fish.join(' ')}`.toLocaleLowerCase('th').includes(needle));
  }, [enabled, query, saved, showSaved]);
  const selected = spots.find((spot) => spot.id === selectedId) ?? null;
  const distance = selected && userLocation ? distanceKm(userLocation, selected) : null;
  const searchSuggestions = filtered;
  const nearbySpots = useMemo(() => userLocation
    ? [...filtered].sort((a, b) => distanceKm(userLocation, a) - distanceKm(userLocation, b))
    : filtered, [filtered, userLocation]);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem('fishingmap:saved');
      if (stored) {
        const parsed: unknown = JSON.parse(stored);
        if (Array.isArray(parsed)) setSaved(parsed.filter((id): id is number => Number.isInteger(id) && spots.some((spot) => spot.id === id)));
      }
    } catch {
      setNotice('อ่านรายการโปรดที่บันทึกไว้ไม่ได้');
    } finally {
      setSavedReady(true);
    }
  }, []);

  useEffect(() => {
    if (!savedReady) return;
    try {
      window.localStorage.setItem('fishingmap:saved', JSON.stringify(saved));
    } catch {
      setNotice('บันทึกรายการโปรดไม่ได้ พื้นที่จัดเก็บอาจเต็ม');
    }
  }, [saved, savedReady]);

  useEffect(() => {
    if (selectedId !== null && !filtered.some((spot) => spot.id === selectedId)) setSelectedId(null);
  }, [filtered, selectedId]);

  useEffect(() => setExpandedDescription(false), [selectedId]);

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
      if (map.current) return;
      map.current = L.map(mapElement.current, { zoomControl: false }).setView(center, 9);
      L.control.zoom({ position: 'bottomright' }).addTo(map.current);
      requestAnimationFrame(() => map.current?.invalidateSize({ pan: false }));
      setMapError(false);
    }).catch(() => { if (!disposed) setMapError(true); });
    return () => { disposed = true; };
  }, []);

  useEffect(() => {
    if (!map.current) return;
    let disposed = false;
    void import('leaflet').then((L) => {
      if (disposed || !map.current) return;
      if (tiles.current) map.current.removeLayer(tiles.current);
      const tileLayer = L.tileLayer(mapTiles[layer], {
        attribution: layer === 'satellite' ? 'Tiles &copy; Esri' : '&copy; OpenStreetMap contributors', maxZoom: 19,
      });
      tileLayer.on('tileerror', () => setMapError(true));
      tileLayer.on('tileload', () => setMapError(false));
      tiles.current = tileLayer.addTo(map.current);
    });
    return () => { disposed = true; };
  }, [layer]);

  useEffect(() => {
    if (!map.current) return;
    let disposed = false;
    void import('leaflet').then((L) => {
      if (disposed || !map.current) return;
      markers.current?.clearLayers();
      if (!markers.current) markers.current = L.layerGroup().addTo(map.current);
      const grouped = new Map<string, Spot[]>();
      filtered.forEach((spot) => {
        const key = `${spot.lat},${spot.lng}`;
        grouped.set(key, [...(grouped.get(key) ?? []), spot]);
      });
      grouped.forEach((group) => {
        const spot = group[0];
        const symbol: Record<Category, string> = { shop: '▣', bait: '◆', fishing: '●', boat: '⛵' };
        const icon = L.divIcon({ className: 'marker-wrap', html: `<div class="map-pin ${group.some((item) => selectedId === item.id) ? 'pin-active' : ''}" style="--pin-color:${LEVEL_COLOR[spot.level]}"><span>${symbol[spot.level]}</span></div>`, iconSize: [42, 52], iconAnchor: [21, 47] });
        L.marker([spot.lat, spot.lng], { icon }).on('click', () => {
          if (group.length > 1) setOverlappingSpots(group);
          else { setOverlappingSpots([]); setSelectedId(spot.id); setCenter([spot.lat, spot.lng]); }
        }).addTo(markers.current!);
      });
      if (userLocation) L.circleMarker([userLocation.lat, userLocation.lng], { radius: 8, color: '#fff', weight: 3, fillColor: '#1876f9', fillOpacity: 1 }).bindTooltip('ตำแหน่งของคุณ').addTo(markers.current);
    });
    return () => { disposed = true; };
  }, [filtered, selectedId, userLocation]);

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
    if (navigator.share) {
      try { await navigator.share({ title: selected.name, url }); return; }
      catch (error) { if (error instanceof DOMException && error.name === 'AbortError') return; }
    }
    try {
      await navigator.clipboard.writeText(url);
      setNotice('คัดลอกลิงก์แผนที่แล้ว');
    } catch {
      window.prompt('คัดลอกลิงก์นี้เพื่อแชร์', url);
      setNotice('คัดลอกลิงก์ไม่สำเร็จ กรุณาคัดลอกจากช่องข้อความ');
    }
  };

  const chooseSpot = (spot: Spot) => { setOverlappingSpots([]); choose(spot); };

  return <div className={`app${sidebarCollapsed ? ' sidebar-collapsed' : ''}`}>
    <Header query={query} onQueryChange={setQuery} suggestions={searchSuggestions} onSelectSuggestion={selectSuggestion} onOpenMenu={toggleNavigation} onToggleLayer={() => setLayer((value) => value === 'satellite' ? 'streets' : 'satellite')} onLocate={locate} onToggleMenu={toggleNavigation} />
    <aside className={`sidebar ${menuOpen ? 'open' : ''}`}>
      <div className="sidebar-title"><span>สำรวจแผนที่</span><button className="close-menu" onClick={() => setMenuOpen(false)} aria-label="ปิดเมนู"><X size={20} /></button></div>
      <div className="side-categories">{categories.map((category) => { const Icon = category.icon; const active = enabled.includes(category.id); return <button key={category.id} className={active ? 'enabled' : ''} aria-pressed={active} onClick={() => toggle(category.id)}><span className="cat-icon" style={{ background: LEVEL_COLOR[category.id] }}><Icon size={17} /></span>{category.label}<span className="side-check">{active && <Check size={13} />}</span></button>; })}</div>
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
              <span className="map-layer-icon"><MapIcon size={23} aria-hidden="true" /></span>
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
    <main className={`map-stage${viewMode === 'list' ? ' list-view' : ''}${mapError && overlappingSpots.length ? ' has-stacked-notices' : ''}`}>
      <div ref={mapElement} className="map" />
      <div className="map-shade" /><div className="map-label">สำรวจนครศรีธรรมราช <span>● {filtered.length} สถานที่</span>{query.trim() && <button className="active-query" onClick={() => setQuery('')}>ค้นหา: {query} ×</button>}</div>
      <button className="saved-toggle" type="button" aria-pressed={showSaved} onClick={() => setShowSaved((current) => !current)}><Bookmark size={17} />{showSaved ? 'แสดงทั้งหมด' : `รายการโปรด ${saved.length}`}</button>
      <button className="view-toggle" type="button" aria-pressed={viewMode === 'list'} onClick={() => setViewMode((mode) => mode === 'map' ? 'list' : 'map')}>{viewMode === 'map' ? 'ดูเป็นรายการ' : 'กลับไปแผนที่'}</button>
      {mapError && <div className="map-error" role="status">โหลดแผนที่ไม่สำเร็จ ตรวจสอบอินเทอร์เน็ตแล้วลองใหม่ <button onClick={() => { setMapError(false); setLayer((current) => current); tiles.current?.redraw(); }}>ลองอีกครั้ง</button></div>}
      <button type="button" className={`mobile-locate${selected ? ' above-card' : ''}${locationStatus === 'found' ? ' is-located' : ''}`} onClick={locate} disabled={locationStatus === 'loading'} aria-busy={locationStatus === 'loading'} aria-label={locationStatus === 'loading' ? 'กำลังค้นหาตำแหน่งของฉัน' : 'แสดงตำแหน่งของฉัน'} title="แสดงตำแหน่งของฉัน">
        {locationStatus === 'loading' ? <LoaderCircle className="location-spinner" size={24} aria-hidden="true" /> : <LocateFixed size={24} aria-hidden="true" />}
      </button>
      <div className="mobile-categories">{categories.map((category) => { const Icon = category.icon; const active = enabled.includes(category.id); return <button key={category.id} className={active ? 'on' : ''} aria-pressed={active} onClick={() => toggle(category.id)}><span style={{ background: LEVEL_COLOR[category.id] }}><Icon size={16} /></span>{category.label}</button>; })}</div>
      {viewMode === 'list' && <section className="nearby-list" aria-label="สถานที่ใกล้ฉัน"><h2>{userLocation ? 'สถานที่ใกล้ฉัน · ระยะทางตรง' : 'สถานที่ทั้งหมด'}</h2>{!userLocation && <p>กดปุ่มตำแหน่งเพื่อเรียงตามระยะทางจากคุณ</p>}{nearbySpots.map((spot) => <button key={spot.id} onClick={() => choose(spot)}><span className="nearby-dot" style={{ background: LEVEL_COLOR[spot.level] }} /><span><strong>{spot.name}</strong><small>{LEVEL_LABEL[spot.level]} · {spot.water}</small></span>{userLocation && <em>{distanceKm(userLocation, spot).toFixed(1)} กม.</em>}</button>)}</section>}
      {overlappingSpots.length > 0 && <section className="overlap-picker" aria-label="เลือกสถานที่"><strong>มี {overlappingSpots.length} แห่งในจุดนี้</strong>{overlappingSpots.map((spot) => <button key={spot.id} onClick={() => chooseSpot(spot)}>{spot.name} · {LEVEL_LABEL[spot.level]}</button>)}<button onClick={() => setOverlappingSpots([])}>ปิด</button></section>}
      {selected && <article className="detail-card"><div className="card-handle" /><button className="card-close" onClick={() => setSelectedId(null)} aria-label="ปิดรายละเอียด"><X size={19} /></button><div className={`card-image category-${selected.level}`}><CategoryVisual level={selected.level} /></div><div className="card-content"><div className="card-type"><span style={{ background: LEVEL_COLOR[selected.level] }} /> {LEVEL_LABEL[selected.level]}</div><h1>{selected.name}</h1><p className="meta"><MapPin size={16} />{selected.lat.toFixed(5)}, {selected.lng.toFixed(5)}</p><p className="meta"><Compass size={16} />{selected.water}</p>{distance !== null && <p className="meta"><Navigation size={16} />{distance.toFixed(1)} กม. (ระยะทางตรง)</p>}<p className={`card-description${expandedDescription ? ' expanded' : ''}`}>{selected.desc}</p>{selected.desc.length > 120 && <button className="read-more" onClick={() => setExpandedDescription((value) => !value)}>{expandedDescription ? 'ย่อรายละเอียด' : 'อ่านรายละเอียดเพิ่มเติม'}</button>}<div className="tags">{selected.fish.filter((item) => !item.startsWith('เบอร์โทร:')).map((item) => <span key={item}>{item}</span>)}</div><div className="card-actions"><a className="primary" href={`https://www.google.com/maps/dir/?api=1&destination=${selected.lat},${selected.lng}`} target="_blank" rel="noreferrer"><Navigation size={16} /> เส้นทาง</a><button onClick={() => setSaved((current) => current.includes(selected.id) ? current.filter((id) => id !== selected.id) : [...current, selected.id])}><Bookmark size={16} fill={saved.includes(selected.id) ? 'currentColor' : 'none'} />{saved.includes(selected.id) ? 'บันทึกแล้ว' : 'บันทึก'}</button><button onClick={share}><Share2 size={16} /> แชร์</button></div>{selected.fish.filter((item) => item.startsWith('เบอร์โทร:') && !item.includes('ยังไม่มีข้อมูล')).map((item) => item.replace('เบอร์โทร:', '').split(',').map((phone) => <a className="phone-link" key={phone} href={`tel:${phone.trim()}`}>โทร {phone.trim()}</a>))}</div></article>}
      {notice && <div className="notice" role="status">{notice}</div>}<Footer />
    </main>
  </div>;
}
