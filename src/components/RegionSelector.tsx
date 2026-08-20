import React, { useState, useMemo, useEffect } from 'react';
import { Region, LiveRainfallData, IslandGroup } from '../types';
import { ISLAND_GROUPS } from '../data/indonesiaRegions';
import { 
  POPULAR_KECAMATAN_PRESETS, 
  searchKecamatan 
} from '../services/weatherService';
import { 
  Search, 
  Heart, 
  MapPin, 
  ChevronDown, 
  Check, 
  Star, 
  SlidersHorizontal,
  X,
  Compass,
  Building2,
  Loader2,
  Navigation
} from 'lucide-react';

interface RegionSelectorProps {
  regions: Region[];
  selectedRegion: Region;
  onSelectRegion: (region: Region) => void;
  rainfallDataMap: Record<string, LiveRainfallData>;
  favoriteIds: string[];
  onToggleFavorite: (regionId: string) => void;
}

export const RegionSelector: React.FC<RegionSelectorProps> = ({
  regions,
  selectedRegion,
  onSelectRegion,
  rainfallDataMap,
  favoriteIds,
  onToggleFavorite,
}) => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isOpenDropdown, setIsOpenDropdown] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'kota' | 'kecamatan'>('kota');
  const [islandFilter, setIslandFilter] = useState<string>('all');

  // Kecamatan search states
  const [kecamatanQuery, setKecamatanQuery] = useState<string>('');
  const [kecamatanResults, setKecamatanResults] = useState<Region[]>([]);
  const [isSearchingKecamatan, setIsSearchingKecamatan] = useState<boolean>(false);

  // Debounced Kecamatan Search
  useEffect(() => {
    if (!kecamatanQuery.trim() || kecamatanQuery.trim().length < 2) {
      setKecamatanResults([]);
      setIsSearchingKecamatan(false);
      return;
    }

    setIsSearchingKecamatan(true);
    const timer = setTimeout(async () => {
      try {
        const res = await searchKecamatan(kecamatanQuery);
        setKecamatanResults(res);
      } catch (e) {
        console.error('Kecamatan search err:', e);
      } finally {
        setIsSearchingKecamatan(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [kecamatanQuery]);

  const favoriteRegions = useMemo(() => {
    return regions.filter((r) => favoriteIds.includes(r.id));
  }, [regions, favoriteIds]);

  const filteredRegions = useMemo(() => {
    return regions.filter((r) => {
      const matchSearch =
        r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.province.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.stationCode.toLowerCase().includes(searchQuery.toLowerCase());

      const matchIsland = islandFilter === 'all' || r.island === islandFilter;
      return matchSearch && matchIsland;
    });
  }, [regions, searchQuery, islandFilter]);

  const isCurrentFavorite = favoriteIds.includes(selectedRegion.id);

  return (
    <div className="space-y-3">
      {/* Top Search & Dropdown Row */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        {/* Search & Custom Dropdown Box */}
        <div className="relative flex-1">
          <div
            onClick={() => setIsOpenDropdown(!isOpenDropdown)}
            className="w-full bg-slate-900 border border-slate-700 hover:border-cyan-500 rounded-xl px-3.5 py-2.5 flex items-center justify-between cursor-pointer transition shadow-lg group"
          >
            <div className="flex items-center gap-2.5 overflow-hidden">
              <MapPin className="w-4 h-4 text-cyan-400 shrink-0" />
              <div className="truncate text-left">
                <span className="text-[10px] text-cyan-400 block font-medium flex items-center gap-1">
                  {selectedRegion.type === 'Kecamatan' && (
                    <span className="px-1 py-0.2 bg-cyan-950 text-cyan-300 border border-cyan-800 rounded text-[8px] font-bold">
                      KECAMATAN
                    </span>
                  )}
                  {selectedRegion.province} ({selectedRegion.island})
                </span>
                <span className="text-sm font-bold text-white block truncate">
                  {selectedRegion.name}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-cyan-300 bg-cyan-950 px-2 py-0.5 rounded border border-cyan-800">
                {rainfallDataMap[selectedRegion.id]?.currentRainfall ?? 0} mm/j
              </span>
              <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${isOpenDropdown ? 'rotate-180 text-cyan-400' : ''}`} />
            </div>
          </div>

          {/* Expanded Dropdown Menu */}
          {isOpenDropdown && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl z-50 p-3 space-y-2.5 max-h-[440px] flex flex-col animate-in fade-in zoom-in-95">
              {/* Type Switcher Tab */}
              <div className="grid grid-cols-2 gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
                <button
                  onClick={() => setActiveTab('kota')}
                  className={`py-1.5 text-xs font-bold rounded-lg transition flex items-center justify-center gap-1.5 ${
                    activeTab === 'kota'
                      ? 'bg-cyan-600 text-white shadow'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <MapPin className="w-3.5 h-3.5" />
                  <span>Stasiun Kota & Kabupaten</span>
                </button>
                <button
                  onClick={() => setActiveTab('kecamatan')}
                  className={`py-1.5 text-xs font-bold rounded-lg transition flex items-center justify-center gap-1.5 ${
                    activeTab === 'kecamatan'
                      ? 'bg-cyan-600 text-white shadow'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Building2 className="w-3.5 h-3.5" />
                  <span>Cari Kecamatan Se-Indonesia</span>
                </button>
              </div>

              {/* Tab: Kota/Kabupaten */}
              {activeTab === 'kota' && (
                <>
                  {/* Search Bar */}
                  <div className="relative">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      placeholder="Ketik nama kota, kabupaten, atau provinsi..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-8 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                      autoFocus
                    />
                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery('')}
                        className="absolute right-2.5 top-2 text-slate-400 hover:text-white"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Island Filter Chips */}
                  <div className="flex items-center gap-1 overflow-x-auto pb-1 text-[11px]">
                    <button
                      onClick={() => setIslandFilter('all')}
                      className={`px-2.5 py-1 rounded-lg font-medium whitespace-nowrap transition ${
                        islandFilter === 'all'
                          ? 'bg-cyan-600 text-white font-semibold'
                          : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      Semua Pulau
                    </button>
                    {ISLAND_GROUPS.map((isl) => (
                      <button
                        key={isl}
                        onClick={() => setIslandFilter(isl)}
                        className={`px-2 py-1 rounded-lg font-medium whitespace-nowrap transition ${
                          islandFilter === isl
                            ? 'bg-cyan-600 text-white font-semibold'
                            : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'
                        }`}
                      >
                        {isl}
                      </button>
                    ))}
                  </div>

                  {/* Scrollable Region List */}
                  <div className="overflow-y-auto space-y-1 pr-1 flex-1 max-h-56">
                    {filteredRegions.length === 0 ? (
                      <div className="text-center py-6 text-xs text-slate-500">
                        Tidak ditemukan daerah yang cocok dengan kata kunci.
                      </div>
                    ) : (
                      filteredRegions.map((reg) => {
                        const isSelected = selectedRegion.id === reg.id;
                        const isFav = favoriteIds.includes(reg.id);
                        const d = rainfallDataMap[reg.id];
                        return (
                          <div
                            key={reg.id}
                            onClick={() => {
                              onSelectRegion(reg);
                              setIsOpenDropdown(false);
                            }}
                            className={`p-2 rounded-xl flex items-center justify-between cursor-pointer transition text-xs ${
                              isSelected
                                ? 'bg-cyan-950/80 border border-cyan-700/60 text-white'
                                : 'hover:bg-slate-800 text-slate-200'
                            }`}
                          >
                            <div className="flex items-center gap-2 overflow-hidden">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onToggleFavorite(reg.id);
                                }}
                                className={`p-1 rounded hover:bg-slate-700 ${
                                  isFav ? 'text-rose-400' : 'text-slate-500 hover:text-rose-300'
                                }`}
                              >
                                <Heart className={`w-3.5 h-3.5 ${isFav ? 'fill-rose-500' : ''}`} />
                              </button>
                              <div className="truncate">
                                <span className="font-semibold block truncate text-slate-100">
                                  {reg.name}
                                </span>
                                <span className="text-[10px] text-slate-400 block truncate">
                                  {reg.province} &bull; {reg.elevationMeters} mdpl
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-bold ${
                                d && d.currentRainfall > 10 ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
                                d && d.currentRainfall > 0 ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' :
                                'bg-slate-800 text-slate-400'
                              }`}>
                                {d ? `${d.currentRainfall} mm/j` : '-'}
                              </span>
                              {isSelected && <Check className="w-4 h-4 text-cyan-400" />}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </>
              )}

              {/* Tab: Kecamatan */}
              {activeTab === 'kecamatan' && (
                <div className="space-y-2">
                  <div className="relative">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      placeholder="Cari kecamatan (contoh: Menteng, Sukajadi, Lembang, Ubud, Cisarua)..."
                      value={kecamatanQuery}
                      onChange={(e) => setKecamatanQuery(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-8 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                      autoFocus
                    />
                    {isSearchingKecamatan && (
                      <Loader2 className="w-3.5 h-3.5 text-cyan-400 animate-spin absolute right-3 top-2.5" />
                    )}
                  </div>

                  {/* Results or Presets */}
                  <div className="overflow-y-auto space-y-1 pr-1 max-h-56">
                    {kecamatanQuery.trim().length >= 2 ? (
                      kecamatanResults.length === 0 ? (
                        <div className="text-center py-6 text-xs text-slate-400">
                          {isSearchingKecamatan ? 'Sedang mencari kecamatan se-Indonesia...' : 'Tidak ditemukan kecamatan dengan kata kunci tersebut.'}
                        </div>
                      ) : (
                        kecamatanResults.map((kec) => (
                          <div
                            key={kec.id}
                            onClick={() => {
                              onSelectRegion(kec);
                              setIsOpenDropdown(false);
                            }}
                            className="p-2 rounded-xl bg-slate-950/70 border border-slate-800 hover:border-cyan-500/60 hover:bg-slate-800 flex items-center justify-between cursor-pointer transition group text-xs"
                          >
                            <div>
                              <div className="font-bold text-white group-hover:text-cyan-300">
                                {kec.name}
                              </div>
                              <div className="text-[10px] text-slate-400">
                                {kec.province} &bull; {kec.elevationMeters} mdpl
                              </div>
                            </div>
                            <Navigation className="w-3.5 h-3.5 text-cyan-400 shrink-0 group-hover:translate-x-0.5 transition-transform" />
                          </div>
                        ))
                      )
                    ) : (
                      <div className="space-y-1.5">
                        <div className="text-[10px] text-slate-400 font-medium">Pilihan Cepat Kecamatan Populer:</div>
                        {POPULAR_KECAMATAN_PRESETS.map((kec) => (
                          <div
                            key={kec.id}
                            onClick={() => {
                              onSelectRegion(kec);
                              setIsOpenDropdown(false);
                            }}
                            className="p-2 rounded-xl bg-slate-950/70 border border-slate-800 hover:border-cyan-500/60 hover:bg-slate-800 flex items-center justify-between cursor-pointer transition group text-xs"
                          >
                            <div>
                              <div className="font-bold text-white group-hover:text-cyan-300">
                                {kec.name}
                              </div>
                              <div className="text-[10px] text-slate-400">
                                {kec.province} &bull; {kec.elevationMeters} mdpl
                              </div>
                            </div>
                            <Navigation className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Favorite Toggle Button for Currently Selected */}
        <button
          onClick={() => onToggleFavorite(selectedRegion.id)}
          className={`px-4 py-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition shadow-lg shrink-0 ${
            isCurrentFavorite
              ? 'bg-rose-500/20 border-rose-500/50 text-rose-300 hover:bg-rose-500/30'
              : 'bg-slate-900 border-slate-700 text-slate-300 hover:text-rose-400 hover:border-rose-500/50'
          }`}
        >
          <Heart className={`w-4 h-4 ${isCurrentFavorite ? 'fill-rose-500 text-rose-500' : ''}`} />
          <span>{isCurrentFavorite ? 'Tersimpan di Favorit' : 'Simpan ke Favorit'}</span>
        </button>
      </div>

      {/* Favorite Locations Quick-Access Pills */}
      {favoriteRegions.length > 0 && (
        <div className="bg-slate-900/60 p-2.5 rounded-xl border border-slate-800/80">
          <div className="flex items-center justify-between mb-1.5 px-1">
            <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1.5">
              <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
              AKSES CEPAT LOKASI FAVORIT ({favoriteRegions.length})
            </span>
            <span className="text-[10px] text-slate-500">Klik untuk langsung beralih</span>
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            {favoriteRegions.map((fav) => {
              const isSelected = selectedRegion.id === fav.id;
              const d = rainfallDataMap[fav.id];
              return (
                <div
                  key={fav.id}
                  onClick={() => onSelectRegion(fav)}
                  className={`group flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium cursor-pointer transition whitespace-nowrap shadow-sm ${
                    isSelected
                      ? 'bg-cyan-600 border-cyan-400 text-white shadow-cyan-950'
                      : 'bg-slate-950/80 border-slate-700/80 text-slate-200 hover:border-cyan-500/60'
                  }`}
                >
                  <MapPin className="w-3 h-3 text-cyan-400 group-hover:scale-110 transition-transform" />
                  <span className="font-semibold">{fav.name}</span>
                  <span className={`text-[10px] font-mono px-1 rounded ${
                    isSelected ? 'bg-cyan-700 text-white' : 'bg-slate-800 text-cyan-300'
                  }`}>
                    {d ? `${d.currentRainfall} mm` : '-'}
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleFavorite(fav.id);
                    }}
                    className="text-slate-400 hover:text-rose-400 p-0.5 rounded"
                    title="Hapus dari favorit"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
