'use client';

import { useEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { ArrowLeft, Layers, LocateFixed, MapPin, Menu, Search, SlidersHorizontal, X } from 'lucide-react';
import type { Spot } from '@/types/fishing';

type HeaderProps = {
  query: string;
  onQueryChange: (query: string) => void;
  onOpenMenu: () => void;
  onToggleLayer: () => void;
  onLocate: () => void;
  onToggleMenu: () => void;
  suggestions: Spot[];
  onSelectSuggestion: (spot: Spot) => void;
};

export default function Header({ query, onQueryChange, onOpenMenu, onToggleLayer, onLocate, onToggleMenu, suggestions, onSelectSuggestion }: HeaderProps) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchActive, setSearchActive] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [showAll, setShowAll] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const visibleSuggestions = showAll ? suggestions : suggestions.slice(0, 8);

  const openSearch = () => {
    // Reveal the field before focusing it so mobile browsers open the keyboard.
    flushSync(() => setSearchActive(true));
    inputRef.current?.focus();
    setSearchOpen(Boolean(query.trim()));
  };

  const closeSearch = () => {
    inputRef.current?.blur();
    flushSync(() => {
      setSearchOpen(false);
      setSearchActive(false);
      setActiveIndex(-1);
    });
    toggleRef.current?.focus();
  };

  useEffect(() => {
    if (activeIndex >= visibleSuggestions.length) setActiveIndex(visibleSuggestions.length - 1);
  }, [activeIndex, visibleSuggestions.length]);

  const choose = (spot: Spot) => {
    onSelectSuggestion(spot);
    closeSearch();
  };
  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setSearchOpen(true);
      setActiveIndex((current) => visibleSuggestions.length ? (current + 1) % visibleSuggestions.length : -1);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setSearchOpen(true);
      setActiveIndex((current) => visibleSuggestions.length ? (current <= 0 ? visibleSuggestions.length - 1 : current - 1) : -1);
    } else if (event.key === 'Enter' && activeIndex >= 0 && visibleSuggestions[activeIndex]) {
      event.preventDefault();
      choose(visibleSuggestions[activeIndex]);
    } else if (event.key === 'Escape') {
      closeSearch();
    }
  };

  return <header className={`header${searchActive ? ' search-active' : ''}`}>
    <button type="button" className="menu-button" aria-label="เปิดตัวกรอง" title="เปิดตัวกรอง" onClick={onOpenMenu}><Menu size={22} /></button>
    <div className="logo"><span className="logo-icon"><img src="/fishingmap-logo.png" alt="" /></span><strong>FishingMap</strong></div>
    <button ref={toggleRef} type="button" className="mobile-search-toggle" aria-label="ค้นหา" aria-expanded={searchActive} aria-controls="header-search" onClick={openSearch}><Search size={22} /></button>
    <div className="header-search-wrap" id="header-search">
      <button type="button" className="search-back" aria-label="ย้อนกลับจากการค้นหา" onClick={closeSearch}><ArrowLeft size={22} /></button>
      <div className="header-search">
        <Search className="search-field-icon" size={18} aria-hidden="true" />
        <input ref={inputRef} value={query} onChange={(event) => { onQueryChange(event.target.value); setSearchOpen(Boolean(event.target.value.trim())); setActiveIndex(-1); }} onFocus={() => { setSearchActive(true); if (query.trim()) setSearchOpen(true); }} onKeyDown={handleKeyDown} placeholder="ค้นหาสถานที่ ร้านค้า ชนิดปลา..." aria-label="ค้นหาสถานที่" role="combobox" aria-autocomplete="list" aria-expanded={Boolean(searchOpen && query.trim())} aria-controls={searchOpen && query.trim() ? 'search-suggestions' : undefined} aria-activedescendant={searchOpen && activeIndex >= 0 && suggestions[activeIndex] ? `search-option-${suggestions[activeIndex].id}` : undefined} autoComplete="off" />
        {query && <button type="button" onClick={() => { onQueryChange(''); setSearchOpen(false); setActiveIndex(-1); inputRef.current?.focus(); }} aria-label="ล้างคำค้น"><X size={18} /></button>}
      </div>
      {searchOpen && query.trim() && <div className="search-suggestions" id="search-suggestions" aria-label="ผลการค้นหา">
        <div className="search-suggestions-heading">{query.trim() ? `แสดง ${visibleSuggestions.length} จาก ${suggestions.length} แห่ง` : 'สถานที่แนะนำ'}</div>
        {suggestions.length ? <div role="listbox">{visibleSuggestions.map((spot, index) => <button key={spot.id} id={`search-option-${spot.id}`} type="button" role="option" aria-selected={index === activeIndex} className={index === activeIndex ? 'active' : ''} onClick={() => choose(spot)}>
          <span className="suggestion-icon" style={{ background: spot.level === 'fishing' ? '#1876f9' : spot.level === 'shop' ? '#ff4e43' : spot.level === 'bait' ? '#ff981b' : '#20a451' }}><MapPin size={15} /></span>
          <span className="suggestion-copy"><strong>{spot.name}</strong><small>{spot.water} · {spot.fish.slice(0, 2).join(' · ')}</small></span><span className="suggestion-category">{spot.level === 'fishing' ? 'จุดตกปลา' : spot.level === 'shop' ? 'ร้านอุปกรณ์' : spot.level === 'bait' ? 'ร้านเหยื่อ' : 'เรือตกปลา'}</span>
        </button>)}</div> : <div className="search-empty">ไม่พบสถานที่ ลองเปลี่ยนคำค้น</div>}
        {suggestions.length > 8 && <button className="show-all-results" type="button" onClick={() => { setShowAll((value) => !value); setActiveIndex(-1); }}>{showAll ? 'แสดงเฉพาะ 8 รายการ' : `ดูทั้งหมด ${suggestions.length} รายการ`}</button>}
      </div>}
    </div>
    <button type="button" className="header-icon" title="สลับชั้นแผนที่" aria-label="สลับชั้นแผนที่" onClick={onToggleLayer}><Layers size={20} /></button>
    <button type="button" className="header-icon" title="ไปที่ตำแหน่งปัจจุบัน" aria-label="ไปที่ตำแหน่งปัจจุบัน" onClick={onLocate}><LocateFixed size={20} /></button>
    <button type="button" className="header-icon" title="ตัวกรอง" aria-label="ตัวกรอง" onClick={onToggleMenu}><SlidersHorizontal size={20} /></button>
  </header>;
}
