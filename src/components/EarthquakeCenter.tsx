import React, { useState, useMemo } from 'react';
import { EarthquakeInfo, EarthquakeFeedData, Region } from '../types';
import { playEarthquakeAlarmSound } from '../services/earthquakeService';
import { 
  Activity, 
  MapPin, 
  Compass, 
  Waves, 
  AlertTriangle, 
  ShieldAlert, 
  Info, 
  Clock, 
  Navigation, 
  ExternalLink, 
  Share2, 
  Volume2, 
  RefreshCw, 
  Sparkles,
  Check,
  Building,
  Flame,
  PhoneCall,
  Search,
  SlidersHorizontal
} from 'lucide-react';

interface EarthquakeCenterProps {
  feed?: EarthquakeFeedData | null;
  earthquakeData?: EarthquakeFeedData | null;
  selectedRegion?: Region;
  onFocusEarthquakeOnMap?: (earthquake: EarthquakeInfo) => void;
  onFocusOnMap?: (earthquake: EarthquakeInfo) => void;
  onRefreshEarthquakes?: () => void;
  onRefresh?: () => void;
  isLoading?: boolean;
  soundEnabled?: boolean;
  onToggleSound?: () => void;
}

export const EarthquakeCenter: React.FC<EarthquakeCenterProps> = ({
  feed,
  earthquakeData,
  selectedRegion = { id: 'default', name: 'Wilayah Anda', province: 'Indonesia', island: 'Jawa', lat: -6.2088, lng: 106.8456, type: 'city' },
  onFocusEarthquakeOnMap,
  onFocusOnMap,
  onRefreshEarthquakes,
  onRefresh,
  isLoading = false,
  soundEnabled = true,
  onToggleSound,
}) => {
  const [activeTab, setActiveTab] = useState<'m5' | 'dirasakan' | 'nearby' | 'guide'>('m5');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [searchFilter, setSearchFilter] = useState<string>('');

  const data = feed || earthquakeData;
  const latest = data?.latestAutoEarthquake || data?.latestEarthquake || null;
  const recentList = data?.recentEarthquakes || [];
  const feltList = data?.feltEarthquakes || [];

  const handleFocus = (eq: EarthquakeInfo) => {
    if (onFocusOnMap) onFocusOnMap(eq);
    else if (onFocusEarthquakeOnMap) onFocusEarthquakeOnMap(eq);
  };

  const handleRefresh = () => {
    if (onRefresh) onRefresh();
    else if (onRefreshEarthquakes) onRefreshEarthquakes();
  };

  // Nearby earthquakes (< 350 km from selected city/kecamatan)
  const nearbyList = useMemo(() => {
    return recentList.filter((eq) => {
      return eq.distanceToSelectedKm !== undefined && eq.distanceToSelectedKm <= 350;
    });
  }, [recentList]);

  // Filtered list based on active tab & search
  const currentList = useMemo(() => {
    let base = activeTab === 'm5' ? recentList : activeTab === 'dirasakan' ? feltList : nearbyList;
    if (!searchFilter.trim()) return base;
    return base.filter((eq) => 
      eq.location.toLowerCase().includes(searchFilter.toLowerCase()) ||
      eq.wilayah.toLowerCase().includes(searchFilter.toLowerCase()) ||
      (eq.feltAreas && eq.feltAreas.toLowerCase().includes(searchFilter.toLowerCase()))
    );
  }, [activeTab, recentList, feltList, nearbyList, searchFilter]);

  const handleShareEarthquake = (eq: EarthquakeInfo) => {
    const text = `🚨 *INFORMASI GEMPA BUMI (BMKG)*\n` +
      `📍 Lokasi: ${eq.location}\n` +
      `💥 Magnitudo: M ${eq.magnitude.toFixed(1)}\n` +
      `🌊 Kedalaman: ${eq.depthStr}\n` +
      `🕒 Waktu: ${eq.dateStr} - ${eq.timeStr}\n` +
      `⚠️ Potensi: ${eq.tsunamiPotential}\n` +
      (eq.feltAreas ? `👥 Dirasakan: ${eq.feltAreas}\n` : '') +
      `🌐 Sumber: BMKG / InfoNusantara Real-Time EWS`;

    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedId(eq.id);
      setTimeout(() => setCopiedId(null), 2500);
    }
  };

  const getMagnitudeColorClass = (mag: number) => {
    if (mag >= 7.0) return 'bg-purple-600 text-white border-purple-400';
    if (mag >= 6.0) return 'bg-rose-600 text-white border-rose-400';
    if (mag >= 5.0) return 'bg-amber-600 text-white border-amber-400';
    if (mag >= 4.0) return 'bg-yellow-600 text-white border-yellow-400';
    return 'bg-cyan-600 text-white border-cyan-400';
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 p-4 sm:p-6 rounded-2xl border border-slate-800 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-rose-500/20 border border-rose-500/30 text-rose-400">
              <Activity className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-black text-white flex items-center gap-2">
                Pusat Informasi Gempa Bumi & Peringatan Dini Tsunami
                <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-rose-950 text-rose-300 border border-rose-800">
                  LIVE BMKG
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Data seismik real-time dari Pusat Gempabumi dan Tsunami BMKG (InaTEWS) & USGS Global Network
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start md:self-center">
          <button
            onClick={() => latest && playEarthquakeAlarmSound(latest.severity)}
            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-xl text-xs font-semibold border border-slate-700 transition flex items-center gap-1.5"
            title="Uji Bunyi Sirine Alarm Gempa"
          >
            <Volume2 className="w-4 h-4 text-cyan-400" />
            <span>Tes Sirine</span>
          </button>

          <button
            onClick={handleRefresh}
            disabled={isLoading}
            className="px-3.5 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-lg shadow-cyan-950"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Perbarui Data</span>
          </button>
        </div>
      </div>

      {/* Featured Card: Gempa M 5.0+ Terkini */}
      {latest && (
        <div className="bg-slate-900/90 border border-rose-500/40 rounded-2xl p-4 sm:p-6 shadow-2xl space-y-4 relative overflow-hidden">
          {/* Subtle Background glow */}
          <div className="absolute -top-24 -right-24 w-72 h-72 bg-rose-600/10 rounded-full blur-3xl pointer-events-none"></div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping"></span>
              <h3 className="text-sm sm:text-base font-extrabold text-white uppercase tracking-wide">
                Gempa Bumi Terkini (M ≥ 5.0) Terpantau
              </h3>
            </div>
            <span className="text-xs text-slate-400 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-cyan-400" />
              {latest.dateStr} &bull; {latest.timeStr} ({latest.timeAgo})
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left: Magnitude & Key Metrics */}
            <div className="lg:col-span-7 space-y-4">
              <div className="flex items-start gap-4">
                {/* Huge Magnitude Box */}
                <div className="shrink-0 p-4 rounded-2xl bg-gradient-to-br from-rose-600 to-amber-600 text-white shadow-xl shadow-rose-950/60 border border-rose-400/40 text-center min-w-[100px]">
                  <div className="text-[10px] uppercase font-bold tracking-wider opacity-90">Magnitudo</div>
                  <div className="text-3xl sm:text-4xl font-black mt-0.5">{latest.magnitude.toFixed(1)}</div>
                  <div className="text-[10px] font-medium bg-black/30 rounded px-1.5 py-0.5 mt-1 font-mono">
                    {latest.depthStr}
                  </div>
                </div>

                {/* Location & Tsunami Warning */}
                <div className="space-y-2 flex-1">
                  <div>
                    <h4 className="text-base sm:text-lg font-bold text-white leading-snug">
                      {latest.location}
                    </h4>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Koordinat: <strong className="text-slate-300">{latest.coordinates}</strong>
                    </p>
                  </div>

                  {/* Tsunami Status Pill */}
                  <div className={`p-2.5 rounded-xl border text-xs font-bold flex items-center gap-2 ${
                    latest.isTsunamiWarning
                      ? 'bg-rose-950/80 border-rose-500 text-rose-200 animate-pulse'
                      : 'bg-emerald-950/40 border-emerald-800/80 text-emerald-300'
                  }`}>
                    <Waves className="w-4 h-4 shrink-0" />
                    <span>{latest.tsunamiPotential}</span>
                  </div>
                </div>
              </div>

              {/* Distance to currently selected Region / Kecamatan */}
              {latest.distanceToSelectedKm !== undefined && (
                <div className="p-3 rounded-xl bg-slate-950 border border-cyan-500/30 flex items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2">
                    <Navigation className="w-4 h-4 text-cyan-400 shrink-0" />
                    <div>
                      <span className="text-slate-400">Jarak Episentrum ke </span>
                      <strong className="text-white">{selectedRegion.name} ({selectedRegion.province})</strong>:
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="font-extrabold text-cyan-400 text-sm">
                      ~{latest.distanceToSelectedKm} km
                    </span>
                    {latest.estimatedShakingIntensity && (
                      <div className="text-[10px] text-amber-300">
                        {latest.estimatedShakingIntensity}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Felt areas if any */}
              {latest.feltAreas && (
                <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                    Wilayah Yang Merasakan Guncangan:
                  </span>
                  <p className="text-xs text-slate-200 leading-relaxed font-medium">
                    {latest.feltAreas}
                  </p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center gap-2 pt-2 flex-wrap">
                <button
                  onClick={() => onFocusOnMap ? onFocusOnMap(latest) : onFocusEarthquakeOnMap?.(latest)}
                  className="px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-lg shadow-cyan-950"
                >
                  <MapPin className="w-3.5 h-3.5" />
                  <span>Sorot di Peta Interaktif</span>
                </button>

                <button
                  onClick={() => handleShareEarthquake(latest)}
                  className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-semibold border border-slate-700 transition flex items-center gap-1.5"
                >
                  {copiedId === latest.id ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400">Tersalin ke Clipboard</span>
                    </>
                  ) : (
                    <>
                      <Share2 className="w-3.5 h-3.5" />
                      <span>Salin Info Gempa</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Right: Shakemap Visual or Seismic Intensity Radar */}
            <div className="lg:col-span-5 flex flex-col items-center justify-center p-3 rounded-2xl bg-slate-950 border border-slate-800 text-center">
              {latest.shakemapUrl ? (
                <div className="space-y-2 w-full">
                  <span className="text-[11px] font-bold text-slate-400 flex items-center justify-center gap-1">
                    <Activity className="w-3 h-3 text-rose-400" />
                    Peta Guncangan (Shakemap BMKG)
                  </span>
                  <div className="rounded-xl overflow-hidden border border-slate-700 max-h-56 bg-slate-900 flex items-center justify-center">
                    <img
                      src={latest.shakemapUrl}
                      alt="Shakemap BMKG"
                      className="w-full h-auto object-contain max-h-52 hover:scale-105 transition-transform"
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        // Fallback if Shakemap image is not directly accessible
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                  </div>
                  <span className="text-[10px] text-slate-500 block">
                    Sumber: BMKG InaTEWS Shakemap generator
                  </span>
                </div>
              ) : (
                <div className="space-y-3 py-4">
                  <div className="w-16 h-16 mx-auto rounded-full bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400">
                    <Activity className="w-8 h-8 animate-pulse" />
                  </div>
                  <div>
                    <h5 className="font-bold text-sm text-white">Radar Episentrum Seismik</h5>
                    <p className="text-xs text-slate-400 max-w-xs mx-auto mt-1">
                      Episentrum berada di koordinat {latest.coordinates} dengan kedalaman hiposenter {latest.depthStr}.
                    </p>
                  </div>
                  <button
                    onClick={() => handleFocus(latest)}
                    className="text-xs text-cyan-400 hover:text-cyan-300 font-semibold underline underline-offset-4"
                  >
                    Buka Titik Episentrum di Peta &rarr;
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tabs & Search Filter for Earthquake Feeds */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/70 p-2 rounded-2xl border border-slate-800">
          {/* Tabs */}
          <div className="flex flex-wrap bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
            <button
              onClick={() => setActiveTab('m5')}
              className={`px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1.5 ${
                activeTab === 'm5' ? 'bg-cyan-600 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              <span>Gempa M ≥ 5.0 ({recentList.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('dirasakan')}
              className={`px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1.5 ${
                activeTab === 'dirasakan' ? 'bg-cyan-600 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Waves className="w-3.5 h-3.5" />
              <span>Gempa Dirasakan ({feltList.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('nearby')}
              className={`px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1.5 ${
                activeTab === 'nearby' ? 'bg-cyan-600 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Navigation className="w-3.5 h-3.5" />
              <span>Dekat {selectedRegion.name} ({nearbyList.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('guide')}
              className={`px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1.5 ${
                activeTab === 'guide' ? 'bg-cyan-600 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>Panduan Keselamatan</span>
            </button>
          </div>

          {/* Search Box */}
          {activeTab !== 'guide' && (
            <div className="relative min-w-[220px]">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Cari wilayah/kabupaten..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
              />
            </div>
          )}
        </div>

        {/* Tab 1, 2, 3: List of Earthquakes */}
        {activeTab !== 'guide' && (
          <div className="space-y-2">
            {currentList.length === 0 ? (
              <div className="text-center py-10 bg-slate-900/50 rounded-2xl border border-slate-800 p-6 text-xs text-slate-400">
                {activeTab === 'nearby'
                  ? `Tidak ada catatan gempa signifikan dalam radius 350 km dari ${selectedRegion.name} baru-baru ini.`
                  : 'Tidak ditemukan data gempa yang cocok dengan filter pencarian.'}
              </div>
            ) : (
              currentList.map((eq) => (
                <div
                  key={eq.id}
                  className="p-3.5 sm:p-4 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 hover:bg-slate-900 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md"
                >
                  {/* Left: Magnitude badge + Location details */}
                  <div className="flex items-start gap-3">
                    <div className={`px-2.5 py-1.5 rounded-xl font-extrabold text-xs sm:text-sm text-center shrink-0 border ${getMagnitudeColorClass(eq.magnitude)}`}>
                      M {eq.magnitude.toFixed(1)}
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold text-white hover:text-cyan-300 cursor-pointer" onClick={() => handleFocus(eq)}>
                          {eq.location}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {eq.dateStr} &bull; {eq.timeStr}
                        </span>
                      </div>

                      <div className="text-[11px] text-slate-400 flex items-center gap-2 flex-wrap">
                        <span>Kedalaman: <strong className="text-slate-200">{eq.depthStr}</strong></span>
                        <span>&bull;</span>
                        <span>Koordinat: <strong className="text-slate-200">{eq.coordinates}</strong></span>
                        {eq.distanceToSelectedKm !== undefined && (
                          <>
                            <span>&bull;</span>
                            <span className="text-cyan-300 font-medium">
                              Jarak ke {selectedRegion?.name || 'Wilayah Anda'}: ~{eq.distanceToSelectedKm} km
                            </span>
                          </>
                        )}
                      </div>

                      {eq.feltAreas && (
                        <div className="text-[11px] text-amber-300/90 font-medium mt-1">
                          Dirasakan: {eq.feltAreas}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                    <button
                      onClick={() => handleFocus(eq)}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-cyan-600 hover:text-white text-cyan-300 rounded-lg text-xs font-semibold border border-slate-700 transition flex items-center gap-1"
                      title="Lihat Episentrum di Peta"
                    >
                      <MapPin className="w-3.5 h-3.5" />
                      <span>Lihat di Peta</span>
                    </button>

                    <button
                      onClick={() => handleShareEarthquake(eq)}
                      className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg border border-slate-700 transition"
                      title="Salin Rincian Gempa"
                    >
                      {copiedId === eq.id ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Share2 className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Tab 4: Safety & Emergency SOP Guide */}
        {activeTab === 'guide' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Step 1: Saat Terjadi Gempa */}
              <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
                <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
                  <div className="w-6 h-6 rounded-full bg-amber-500/20 flex items-center justify-center text-xs">1</div>
                  Saat Terjadi Gempa Bumi
                </div>
                <ul className="text-xs text-slate-300 space-y-2 list-disc pl-4 leading-relaxed">
                  <li><strong>Drop, Cover, Hold On:</strong> Segera berlutut, lindungi kepala di bawah meja kokoh, dan berpegangan erat.</li>
                  <li>Jauhi kaca jendela, cermin, lemari tinggi, dan lampu gantung yang rawan roboh.</li>
                  <li>Jika di luar ruangan, jauhi gedung bertingkat, tiang listrik, baliho, dan lereng rawan longsor.</li>
                  <li>Jika sedang mengemudi, kurangi kecepatan perlahan dan tepi kendaraan di tempat aman.</li>
                </ul>
              </div>

              {/* Step 2: Pasca Gempa */}
              <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
                <div className="flex items-center gap-2 text-cyan-400 font-bold text-sm">
                  <div className="w-6 h-6 rounded-full bg-cyan-500/20 flex items-center justify-center text-xs">2</div>
                  Sesaat Setelah Gempa Mereda
                </div>
                <ul className="text-xs text-slate-300 space-y-2 list-disc pl-4 leading-relaxed">
                  <li>Periksa apakah ada korban luka di sekitar Anda dan berikan pertolongan pertama jika mampu.</li>
                  <li>Matikan kompor, saluran gas, dan sumber listrik utama guna mencegah bahaya kebakaran.</li>
                  <li>Evakuasi melalui tangga darurat (<strong>JANGAN</strong> gunakan lift/elevator).</li>
                  <li>Waspadai potensi gempa susulan (aftershocks) dengan tetap berada di titik kumpul terbuka.</li>
                </ul>
              </div>

              {/* Step 3: Peringatan Tsunami */}
              <div className="p-4 rounded-2xl bg-slate-900 border border-rose-500/40 space-y-3">
                <div className="flex items-center gap-2 text-rose-400 font-bold text-sm">
                  <div className="w-6 h-6 rounded-full bg-rose-500/20 flex items-center justify-center text-xs">3</div>
                  Jika di Pesisir & Potensi Tsunami
                </div>
                <ul className="text-xs text-slate-300 space-y-2 list-disc pl-4 leading-relaxed">
                  <li>Jika gempa berlangsung kuat &gt; 20 detik atau air laut surut tiba-tiba, <strong>SEGERA EVAKUASI</strong> ke tempat tinggi (&gt; 20 mdpl).</li>
                  <li>Jangan menunggu sirine berbunyi jika merasakan tanda alam tsunami.</li>
                  <li>Jauhi muara sungai dan pesisir pantai minimal 2–3 km ke arah daratan tinggi.</li>
                </ul>
              </div>
            </div>

            {/* Emergency Hotline Numbers */}
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <PhoneCall className="w-5 h-5 text-rose-400 shrink-0" />
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-white">Nomor Telepon Darurat Kebencanaan Indonesia</h4>
                  <p className="text-[11px] text-slate-400">Simpan nomor kontak darurat ini untuk kondisi kritis</p>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap text-xs">
                <span className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-200">
                  BNPB: <strong className="text-rose-400">117</strong>
                </span>
                <span className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-200">
                  BASARNAS: <strong className="text-amber-400">115</strong>
                </span>
                <span className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-200">
                  BMKG: <strong className="text-cyan-400">196</strong>
                </span>
                <span className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-200">
                  Darurat: <strong className="text-emerald-400">112</strong>
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
