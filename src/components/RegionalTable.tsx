import React, { useState, useMemo } from 'react';
import { Region, LiveRainfallData, AlertSeverity } from '../types';
import { BMKG_RAINFALL_STANDARDS } from '../data/indonesiaRegions';
import { 
  Search, 
  ArrowUpDown, 
  Heart, 
  MapPin, 
  ChevronRight, 
  CloudRain, 
  Filter, 
  Flame,
  ShieldAlert,
  SlidersHorizontal
} from 'lucide-react';

interface RegionalTableProps {
  regions: Region[];
  rainfallDataMap: Record<string, LiveRainfallData>;
  selectedRegion: Region;
  onSelectRegion: (region: Region) => void;
  favoriteIds: string[];
  onToggleFavorite: (regionId: string) => void;
}

export const RegionalTable: React.FC<RegionalTableProps> = ({
  regions,
  rainfallDataMap,
  selectedRegion,
  onSelectRegion,
  favoriteIds,
  onToggleFavorite,
}) => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [sortBy, setSortBy] = useState<'rainfall' | 'past24h' | 'name' | 'province'>('rainfall');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [islandFilter, setIslandFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const filteredAndSorted = useMemo(() => {
    return regions
      .filter((r) => {
        const d = rainfallDataMap[r.id];
        const matchesSearch =
          r.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          r.province.toLowerCase().includes(searchTerm.toLowerCase()) ||
          r.stationCode.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesIsland = islandFilter === 'all' || r.island === islandFilter;

        let matchesStatus = true;
        if (statusFilter === 'raining') matchesStatus = !!d && d.currentRainfall > 0;
        if (statusFilter === 'alerts') matchesStatus = !!d && d.alertSeverity !== 'normal';
        if (statusFilter === 'favorites') matchesStatus = favoriteIds.includes(r.id);

        return matchesSearch && matchesIsland && matchesStatus;
      })
      .sort((a, b) => {
        const da = rainfallDataMap[a.id];
        const db = rainfallDataMap[b.id];

        let valA: any = 0;
        let valB: any = 0;

        if (sortBy === 'rainfall') {
          valA = da?.currentRainfall ?? 0;
          valB = db?.currentRainfall ?? 0;
        } else if (sortBy === 'past24h') {
          valA = da?.rainfallPast24h ?? 0;
          valB = db?.rainfallPast24h ?? 0;
        } else if (sortBy === 'name') {
          valA = a.name;
          valB = b.name;
        } else if (sortBy === 'province') {
          valA = a.province;
          valB = b.province;
        }

        if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
        if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
        return 0;
      });
  }, [regions, rainfallDataMap, searchTerm, sortBy, sortOrder, islandFilter, statusFilter, favoriteIds]);

  const handleSort = (field: 'rainfall' | 'past24h' | 'name' | 'province') => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  return (
    <div className="bg-slate-900/90 backdrop-blur-md rounded-2xl border border-slate-800 p-4 lg:p-6 shadow-xl space-y-4">
      {/* Header with Search and Quick Filters */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-3 border-b border-slate-800">
        <div>
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Flame className="w-5 h-5 text-amber-400" />
            Daftar & Peringkat Curah Hujan Nasional
          </h3>
          <p className="text-xs text-slate-400">
            Monitoring data curah hujan dan status peringatan dari seluruh stasiun pengamatan
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Search Bar */}
          <div className="relative min-w-[200px] flex-1 md:flex-initial">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Cari stasiun/kota..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
            />
          </div>

          {/* Quick Filter Buttons */}
          <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 text-[11px]">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-2.5 py-1 rounded-lg font-medium transition ${
                statusFilter === 'all' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Semua
            </button>
            <button
              onClick={() => setStatusFilter('raining')}
              className={`px-2.5 py-1 rounded-lg font-medium transition ${
                statusFilter === 'raining' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Hujan
            </button>
            <button
              onClick={() => setStatusFilter('alerts')}
              className={`px-2.5 py-1 rounded-lg font-medium transition ${
                statusFilter === 'alerts' ? 'bg-rose-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Peringatan
            </button>
            <button
              onClick={() => setStatusFilter('favorites')}
              className={`px-2.5 py-1 rounded-lg font-medium transition flex items-center gap-1 ${
                statusFilter === 'favorites' ? 'bg-rose-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Heart className="w-3 h-3 fill-current" />
              Favorit
            </button>
          </div>
        </div>
      </div>

      {/* Table Container */}
      <div className="overflow-x-auto rounded-xl border border-slate-800">
        <table className="w-full text-left text-xs text-slate-300">
          <thead className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800 uppercase tracking-wider text-[10px]">
            <tr>
              <th className="py-3 px-3 w-10 text-center">Fav</th>
              <th
                onClick={() => handleSort('name')}
                className="py-3 px-3 cursor-pointer hover:text-white transition"
              >
                <div className="flex items-center gap-1">
                  <span>Nama Wilayah / Kota</span>
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th
                onClick={() => handleSort('province')}
                className="py-3 px-3 cursor-pointer hover:text-white transition hidden sm:table-cell"
              >
                <div className="flex items-center gap-1">
                  <span>Provinsi</span>
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th
                onClick={() => handleSort('rainfall')}
                className="py-3 px-3 cursor-pointer hover:text-white transition text-right"
              >
                <div className="flex items-center justify-end gap-1">
                  <span>Curah Saat Ini</span>
                  <ArrowUpDown className="w-3 h-3 text-cyan-400" />
                </div>
              </th>
              <th
                onClick={() => handleSort('past24h')}
                className="py-3 px-3 cursor-pointer hover:text-white transition text-right hidden md:table-cell"
              >
                <div className="flex items-center justify-end gap-1">
                  <span>24 Jam</span>
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th className="py-3 px-3 text-center hidden lg:table-cell">Suhu & Lembab</th>
              <th className="py-3 px-3 text-center">Status Peringatan</th>
              <th className="py-3 px-3 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 font-sans">
            {filteredAndSorted.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center py-8 text-slate-500">
                  Tidak ada stasiun meteorologi yang sesuai dengan kriteria filter.
                </td>
              </tr>
            ) : (
              filteredAndSorted.map((reg) => {
                const isSelected = selectedRegion.id === reg.id;
                const isFav = favoriteIds.includes(reg.id);
                const d = rainfallDataMap[reg.id];
                const intensity = d?.intensityLevel || 'berawan';
                const severity = d?.alertSeverity || 'normal';
                const standard = BMKG_RAINFALL_STANDARDS.find((s) => s.level === intensity) || BMKG_RAINFALL_STANDARDS[0];

                return (
                  <tr
                    key={reg.id}
                    onClick={() => onSelectRegion(reg)}
                    className={`cursor-pointer transition ${
                      isSelected
                        ? 'bg-cyan-950/40 font-semibold'
                        : 'hover:bg-slate-800/50'
                    }`}
                  >
                    {/* Favorite Icon */}
                    <td className="py-2.5 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => onToggleFavorite(reg.id)}
                        className={`p-1 rounded transition ${
                          isFav ? 'text-rose-500 hover:scale-110' : 'text-slate-600 hover:text-rose-400'
                        }`}
                      >
                        <Heart className={`w-3.5 h-3.5 ${isFav ? 'fill-rose-500' : ''}`} />
                      </button>
                    </td>

                    {/* Region Name */}
                    <td className="py-2.5 px-3">
                      <div className="font-bold text-white flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                        <span>{reg.name}</span>
                        {isSelected && (
                          <span className="text-[9px] bg-cyan-500 text-white px-1.5 py-0.2 rounded font-mono">
                            FOKUS
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-400 sm:hidden block">
                        {reg.province}
                      </span>
                    </td>

                    {/* Province */}
                    <td className="py-2.5 px-3 hidden sm:table-cell text-slate-400">
                      {reg.province}
                    </td>

                    {/* Rainfall Saat ini */}
                    <td className="py-2.5 px-3 text-right">
                      <span className={`font-mono font-bold px-2 py-0.5 rounded text-xs inline-block ${
                        d && d.currentRainfall >= 20 ? 'bg-rose-950 text-rose-300 border border-rose-800' :
                        d && d.currentRainfall >= 10 ? 'bg-amber-950 text-amber-300 border border-amber-800' :
                        d && d.currentRainfall > 0 ? 'bg-cyan-950 text-cyan-300 border border-cyan-800' :
                        'text-slate-400'
                      }`}>
                        {d ? `${d.currentRainfall} mm/j` : '-'}
                      </span>
                    </td>

                    {/* 24 Jam Akumulasi */}
                    <td className="py-2.5 px-3 text-right hidden md:table-cell font-mono text-slate-300">
                      {d ? `${d.rainfallPast24h} mm` : '-'}
                    </td>

                    {/* Temp & Humidity */}
                    <td className="py-2.5 px-3 text-center hidden lg:table-cell text-slate-400">
                      {d ? `${d.temperature}°C / ${d.humidity}%` : '-'}
                    </td>

                    {/* Status Badge */}
                    <td className="py-2.5 px-3 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border inline-block ${
                        severity === 'awas' ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse' :
                        severity === 'siaga' ? 'bg-orange-500/20 text-orange-300 border-orange-500/40' :
                        severity === 'waspada' ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' :
                        'bg-slate-800 text-slate-300 border-slate-700'
                      }`}>
                        {severity.toUpperCase()}
                      </span>
                    </td>

                    {/* Action Button */}
                    <td className="py-2.5 px-3 text-right">
                      <button
                        onClick={() => onSelectRegion(reg)}
                        className="px-2.5 py-1 bg-slate-800 hover:bg-cyan-600 hover:text-white rounded-lg text-slate-300 text-[11px] font-semibold transition inline-flex items-center gap-1"
                      >
                        <span>Pantau</span>
                        <ChevronRight className="w-3 h-3" />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
