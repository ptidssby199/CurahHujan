import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Region, LiveRainfallData, EarlyWarningAlert } from './types';
import { INDONESIA_REGIONS } from './data/indonesiaRegions';
import { 
  fetchLiveRainfallForRegion, 
  generateAlertsForRegions, 
  playEWSAlertSound 
} from './services/weatherService';
import { RainfallMap } from './components/RainfallMap';
import { RainfallCharts } from './components/RainfallCharts';
import { AlertCenter } from './components/AlertCenter';
import { RegionSelector } from './components/RegionSelector';
import { RegionalTable } from './components/RegionalTable';
import { ExportModal } from './components/ExportModal';
import { AIAssistant } from './components/AIAssistant';
import { 
  CloudRain, 
  Download, 
  RefreshCw, 
  Map, 
  Table2, 
  Info, 
  Volume2, 
  VolumeX, 
  ShieldAlert, 
  Radio,
  Clock,
  Sparkles,
  ExternalLink,
  Smartphone
} from 'lucide-react';

const LOCAL_STORAGE_KEY_FAVS = 'hujannusantara_favs_v1';
const LOCAL_STORAGE_KEY_HOURLY_TH = 'hujannusantara_th_hourly_v1';
const LOCAL_STORAGE_KEY_DAILY_TH = 'hujannusantara_th_daily_v1';
const LOCAL_STORAGE_KEY_SOUND = 'hujannusantara_sound_v1';

export default function App() {
  // State: Selected Region
  const [selectedRegion, setSelectedRegion] = useState<Region>(() => {
    return INDONESIA_REGIONS.find((r) => r.id === 'jbr-bogor') || INDONESIA_REGIONS[0];
  });

  // State: Rainfall data map
  const [rainfallDataMap, setRainfallDataMap] = useState<Record<string, LiveRainfallData>>({});
  
  // State: Early Warning Alerts
  const [alerts, setAlerts] = useState<EarlyWarningAlert[]>([]);

  // State: Favorites
  const [favoriteIds, setFavoriteIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY_FAVS);
      return saved ? JSON.parse(saved) : ['jkt-pusat', 'jbr-bogor', 'jtm-surabaya', 'ach-bandaaceh'];
    } catch {
      return ['jkt-pusat', 'jbr-bogor', 'jtm-surabaya'];
    }
  });

  // State: User Thresholds
  const [hourlyThreshold, setHourlyThreshold] = useState<number>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY_HOURLY_TH);
      return saved ? Number(saved) : 10;
    } catch {
      return 10;
    }
  });

  const [dailyThreshold, setDailyThreshold] = useState<number>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY_DAILY_TH);
      return saved ? Number(saved) : 50;
    } catch {
      return 50;
    }
  });

  // State: Sound Alerts
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY_SOUND);
      return saved ? JSON.parse(saved) : true;
    } catch {
      return true;
    }
  });

  // UI States
  const [activeTab, setActiveTab] = useState<'dashboard' | 'table' | 'standards'>('dashboard');
  const [isExportModalOpen, setIsExportModalOpen] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<string>('');
  const [countdown, setCountdown] = useState<number>(90);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState<boolean>(false);

  const prevAlertCountRef = useRef<number>(0);

  // Listen for PWA BeforeInstallPrompt Event
  useEffect(() => {
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
  }, []);

  const handleInstallPWA = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsInstallable(false);
    }
    setDeferredPrompt(null);
  };

  // Save Favorites to localStorage
  const handleToggleFavorite = (regionId: string) => {
    setFavoriteIds((prev) => {
      const exists = prev.includes(regionId);
      const updated = exists ? prev.filter((id) => id !== regionId) : [...prev, regionId];
      try {
        localStorage.setItem(LOCAL_STORAGE_KEY_FAVS, JSON.stringify(updated));
      } catch (e) {
        console.error(e);
      }
      return updated;
    });
  };

  // Save Thresholds
  const handleUpdateThresholds = (hourly: number, daily: number) => {
    setHourlyThreshold(hourly);
    setDailyThreshold(daily);
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY_HOURLY_TH, hourly.toString());
      localStorage.setItem(LOCAL_STORAGE_KEY_DAILY_TH, daily.toString());
    } catch (e) {
      console.error(e);
    }
  };

  // Toggle Sound
  const handleToggleSound = () => {
    setSoundEnabled((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(LOCAL_STORAGE_KEY_SOUND, JSON.stringify(next));
      } catch (e) {
        console.error(e);
      }
      return next;
    });
  };

  // Fetch data for all regions with concurrency limit
  const fetchAllData = useCallback(async () => {
    setIsLoading(true);
    const newMap: Record<string, LiveRainfallData> = { ...rainfallDataMap };

    // Fetch prioritized selected region first
    try {
      const selectedData = await fetchLiveRainfallForRegion(selectedRegion, hourlyThreshold);
      newMap[selectedRegion.id] = selectedData;
      setRainfallDataMap({ ...newMap });
    } catch (e) {
      console.error(e);
    }

    // Batch load other regions concurrently in chunks of 6
    const otherRegions = INDONESIA_REGIONS.filter((r) => r.id !== selectedRegion.id);
    const chunkSize = 6;

    for (let i = 0; i < otherRegions.length; i += chunkSize) {
      const chunk = otherRegions.slice(i, i + chunkSize);
      await Promise.all(
        chunk.map(async (reg) => {
          try {
            const data = await fetchLiveRainfallForRegion(reg, hourlyThreshold);
            newMap[reg.id] = data;
          } catch (err) {
            console.warn(err);
          }
        })
      );
      setRainfallDataMap({ ...newMap });
    }

    // Generate alerts
    const activeAlerts = generateAlertsForRegions(INDONESIA_REGIONS, newMap, hourlyThreshold);
    setAlerts(activeAlerts);

    // Audio alarm if new severe alert detected
    if (soundEnabled && activeAlerts.length > prevAlertCountRef.current) {
      const highestSev = activeAlerts[0]?.severity || 'waspada';
      playEWSAlertSound(highestSev);
    }
    prevAlertCountRef.current = activeAlerts.length;

    setLastRefreshedAt(new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    setIsLoading(false);
    setCountdown(90);
  }, [selectedRegion, hourlyThreshold, soundEnabled]);

  // Initial Load & Selected Region Switch
  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  // Auto-refresh interval (90s) & Countdown
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          fetchAllData();
          return 90;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [fetchAllData]);

  // Select region by ID (from alert or table)
  const handleSelectRegionById = (regionId: string) => {
    const found = INDONESIA_REGIONS.find((r) => r.id === regionId);
    if (found) {
      setSelectedRegion(found);
      setActiveTab('dashboard');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const selectedData = rainfallDataMap[selectedRegion.id] || null;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-cyan-500 selection:text-white pb-12">
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-600 via-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-cyan-950/60 ring-2 ring-cyan-400/30">
              <CloudRain className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-lg text-white tracking-tight">
                  HUJAN<span className="text-cyan-400">NUSANTARA</span>
                </span>
                <span className="hidden sm:inline-block px-2 py-0.5 text-[10px] font-extrabold uppercase rounded-full bg-cyan-950 text-cyan-400 border border-cyan-800">
                  EWS Real-Time
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden md:block">
                Sistem Pemantauan Curah Hujan & Peringatan Dini Bencana Hidrometeorologi Indonesia
              </p>
            </div>
          </div>

          {/* Center/Right Action Bar */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Auto-Refresh Status Pill */}
            <div className="hidden lg:flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800 text-xs text-slate-300">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
              <span>Sinkronisasi Otomatis: <strong className="text-cyan-400">{countdown}s</strong></span>
              <button
                onClick={fetchAllData}
                disabled={isLoading}
                className="ml-1 text-slate-400 hover:text-cyan-400 transition"
                title="Perbarui Data Sekarang"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-cyan-400' : ''}`} />
              </button>
            </div>

            {/* Sound Mute Toggle */}
            <button
              onClick={handleToggleSound}
              className={`p-2 rounded-xl border transition ${
                soundEnabled
                  ? 'bg-slate-900 border-cyan-500/40 text-cyan-400 hover:bg-slate-800'
                  : 'bg-slate-900 border-slate-800 text-slate-500 hover:text-slate-300'
              }`}
              title={soundEnabled ? 'Sirine Audio EWS Aktif' : 'Sirine Audio Dimatikan'}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>

            {/* PWA Install Button */}
            {isInstallable && (
              <button
                onClick={handleInstallPWA}
                className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition shadow-lg shadow-emerald-950/80 flex items-center gap-1.5 animate-pulse"
                title="Pasang aplikasi ini di layar utama HP / Komputer Anda"
              >
                <Smartphone className="w-4 h-4" />
                <span className="hidden sm:inline">Pasang Aplikasi</span>
              </button>
            )}

            {/* Export Modal Trigger Button */}
            <button
              onClick={() => setIsExportModalOpen(true)}
              className="px-3.5 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-xl text-xs font-bold transition shadow-lg shadow-cyan-950/80 flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Ekspor PDF / Excel</span>
              <span className="sm:hidden">Ekspor</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Body */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6 flex-1 w-full">
        {/* Navigation View Switcher */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/60 p-2 rounded-2xl border border-slate-800">
          <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`px-4 py-2 rounded-lg font-bold transition flex items-center gap-2 ${
                activeTab === 'dashboard'
                  ? 'bg-cyan-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Map className="w-4 h-4" />
              <span>Peta & Grafik Interaktif</span>
            </button>

            <button
              onClick={() => setActiveTab('table')}
              className={`px-4 py-2 rounded-lg font-bold transition flex items-center gap-2 ${
                activeTab === 'table'
                  ? 'bg-cyan-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Table2 className="w-4 h-4" />
              <span>Tabel Peringkat Nasional</span>
            </button>

            <button
              onClick={() => setActiveTab('standards')}
              className={`px-4 py-2 rounded-lg font-bold transition flex items-center gap-2 hidden md:flex ${
                activeTab === 'standards'
                  ? 'bg-cyan-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Info className="w-4 h-4" />
              <span>Standar BMKG</span>
            </button>
          </div>

          {/* Quick Refresh Status info */}
          <div className="flex items-center gap-3 text-xs text-slate-400 px-2">
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-cyan-400" />
              Update Terakhir: <strong className="text-slate-200">{lastRefreshedAt || 'Memuat...'}</strong>
            </span>
          </div>
        </div>

        {/* Early Warning Alert Center Bar */}
        <AlertCenter
          alerts={alerts}
          onSelectRegionById={handleSelectRegionById}
          hourlyThreshold={hourlyThreshold}
          dailyThreshold={dailyThreshold}
          onUpdateThresholds={handleUpdateThresholds}
          soundEnabled={soundEnabled}
          onToggleSound={handleToggleSound}
        />

        {/* Region Selector & Favorite Pills */}
        <RegionSelector
          regions={INDONESIA_REGIONS}
          selectedRegion={selectedRegion}
          onSelectRegion={setSelectedRegion}
          rainfallDataMap={rainfallDataMap}
          favoriteIds={favoriteIds}
          onToggleFavorite={handleToggleFavorite}
        />

        {/* Active View: Dashboard Mode */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            {/* Interactive Map Visualizer */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-bold text-slate-300 flex items-center gap-2">
                  <Radio className="w-4 h-4 text-cyan-400" />
                  Peta Radar Presipitasi & Stasiun Meteorologi Real-Time
                </h3>
                <span className="text-[11px] text-slate-400">
                  Klik stasiun di peta untuk memusatkan grafik
                </span>
              </div>

              <RainfallMap
                regions={INDONESIA_REGIONS}
                rainfallDataMap={rainfallDataMap}
                selectedRegion={selectedRegion}
                onSelectRegion={setSelectedRegion}
                onToggleFavorite={handleToggleFavorite}
                favoriteIds={favoriteIds}
                userHourlyThreshold={hourlyThreshold}
              />
            </div>

            {/* AI Weather & Flood Briefing */}
            <AIAssistant selectedRegion={selectedRegion} data={selectedData} />

            {/* Historical Charts & 7-Day Outlook */}
            <RainfallCharts
              region={selectedRegion}
              data={selectedData}
              userHourlyThreshold={hourlyThreshold}
            />

            {/* Regional Table for Quick Access */}
            <RegionalTable
              regions={INDONESIA_REGIONS}
              rainfallDataMap={rainfallDataMap}
              selectedRegion={selectedRegion}
              onSelectRegion={setSelectedRegion}
              favoriteIds={favoriteIds}
              onToggleFavorite={handleToggleFavorite}
            />
          </div>
        )}

        {/* Active View: Table Mode */}
        {activeTab === 'table' && (
          <div className="space-y-6">
            <RegionalTable
              regions={INDONESIA_REGIONS}
              rainfallDataMap={rainfallDataMap}
              selectedRegion={selectedRegion}
              onSelectRegion={setSelectedRegion}
              favoriteIds={favoriteIds}
              onToggleFavorite={handleToggleFavorite}
            />

            {/* Also show charts for selected region below */}
            <RainfallCharts
              region={selectedRegion}
              data={selectedData}
              userHourlyThreshold={hourlyThreshold}
            />
          </div>
        )}

        {/* Active View: Standards & Educational Guidance */}
        {activeTab === 'standards' && (
          <div className="bg-slate-900/90 backdrop-blur-md rounded-2xl border border-slate-800 p-6 shadow-xl space-y-6">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Info className="w-5 h-5 text-cyan-400" />
                Klasifikasi Intensitas Curah Hujan Berdasarkan Standar BMKG
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Pedoman resmi batas intensitas curah hujan per jam dan harian untuk penilaian risiko hidrometeorologi
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl border border-slate-700 bg-slate-950/70 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sky-400 text-sm">Hujan Ringan</span>
                  <span className="text-xs font-mono bg-sky-950 text-sky-300 px-2 py-0.5 rounded border border-sky-800">1 - 5 mm/jam</span>
                </div>
                <div className="text-xs text-slate-300 leading-relaxed">
                  Akumulasi Harian: <strong>5 - 20 mm/hari</strong>. Rintik atau gerimis teratur, jarak pandang di atas 5 km, risiko genangan minimal.
                </div>
              </div>

              <div className="p-4 rounded-xl border border-slate-700 bg-slate-950/70 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-emerald-400 text-sm">Hujan Sedang</span>
                  <span className="text-xs font-mono bg-emerald-950 text-emerald-300 px-2 py-0.5 rounded border border-emerald-800">5 - 10 mm/jam</span>
                </div>
                <div className="text-xs text-slate-300 leading-relaxed">
                  Akumulasi Harian: <strong>20 - 50 mm/hari</strong>. Hujan mulai konstan, genangan air mulai timbul di jalan berlubang dan area resapan minim.
                </div>
              </div>

              <div className="p-4 rounded-xl border border-amber-500/40 bg-amber-950/20 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-amber-400 text-sm">Hujan Lebat (Waspada)</span>
                  <span className="text-xs font-mono bg-amber-950 text-amber-300 px-2 py-0.5 rounded border border-amber-800">10 - 20 mm/jam</span>
                </div>
                <div className="text-xs text-slate-300 leading-relaxed">
                  Akumulasi Harian: <strong>50 - 100 mm/hari</strong>. Saluran drainase mulai penuh, potensi kemacetan akibat genangan jalan, kenaikan TMA sungai.
                </div>
              </div>

              <div className="p-4 rounded-xl border border-orange-500/40 bg-orange-950/20 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-orange-400 text-sm">Hujan Sangat Lebat (Siaga)</span>
                  <span className="text-xs font-mono bg-orange-950 text-orange-300 px-2 py-0.5 rounded border border-orange-800">&gt; 20 mm/jam</span>
                </div>
                <div className="text-xs text-slate-300 leading-relaxed">
                  Akumulasi Harian: <strong>100 - 150 mm/hari</strong>. Potensi banjir luapan daerah aliran sungai (DAS), bahaya longsor pada lereng perbukitan.
                </div>
              </div>

              <div className="p-4 rounded-xl border border-rose-500/50 bg-rose-950/30 space-y-2 md:col-span-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-rose-400 text-sm">Hujan Ekstrem (Status Awas)</span>
                  <span className="text-xs font-mono bg-rose-950 text-rose-300 px-2 py-0.5 rounded border border-rose-800">&gt; 30 mm/jam atau &gt; 150 mm/hari</span>
                </div>
                <div className="text-xs text-slate-300 leading-relaxed">
                  Bahaya darurat banjir bandang dan longsor masif. Diperlukan tindakan evakuasi segera untuk penduduk di bantaran sungai dan lereng curam.
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Export Modal */}
      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        regions={INDONESIA_REGIONS}
        rainfallDataMap={rainfallDataMap}
        alerts={alerts}
        selectedRegion={selectedRegion}
      />

      {/* Footer */}
      <footer className="mt-12 border-t border-slate-800 bg-slate-900/60 py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-cyan-400"></div>
            <span>HujanNusantara &copy; {new Date().getFullYear()} - Sistem Informasi Hidrometeorologi Real-Time</span>
          </div>
          <div className="flex items-center gap-4 text-[11px]">
            <span>Kontak Darurat BNPB: <strong>117</strong></span>
            <span>BASARNAS: <strong>115</strong></span>
            <span>BMKG: <strong>196</strong></span>
          </div>
        </div>
      </footer>
    </div>
  );
}
