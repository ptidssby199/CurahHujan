import React, { useState } from 'react';
import { EarlyWarningAlert, Region } from '../types';
import { playEWSAlertSound } from '../services/weatherService';
import { 
  AlertTriangle, 
  Volume2, 
  VolumeX, 
  Bell, 
  ShieldCheck, 
  Sliders, 
  ChevronRight, 
  CheckCircle2, 
  Radio, 
  Info,
  PhoneCall,
  ExternalLink
} from 'lucide-react';

interface AlertCenterProps {
  alerts: EarlyWarningAlert[];
  onSelectRegionById: (regionId: string) => void;
  hourlyThreshold: number;
  dailyThreshold: number;
  onUpdateThresholds: (hourly: number, daily: number) => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
}

export const AlertCenter: React.FC<AlertCenterProps> = ({
  alerts,
  onSelectRegionById,
  hourlyThreshold,
  dailyThreshold,
  onUpdateThresholds,
  soundEnabled,
  onToggleSound,
}) => {
  const [showConfigModal, setShowConfigModal] = useState<boolean>(false);
  const [tempHourly, setTempHourly] = useState<number>(hourlyThreshold);
  const [tempDaily, setTempDaily] = useState<number>(dailyThreshold);
  const [notificationStatus, setNotificationStatus] = useState<string>(
    typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'default'
  );

  const requestBrowserNotification = async () => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      try {
        const perm = await Notification.requestPermission();
        setNotificationStatus(perm);
        if (perm === 'granted') {
          new Notification('InfoNusantara EWS', {
            body: 'Notifikasi peringatan dini cuaca dan gempa aktif.',
            icon: '/favicon.ico',
          });
        }
      } catch (e) {
        console.error(e);
      }
    }
  };

  const handleSaveThresholds = () => {
    onUpdateThresholds(tempHourly, tempDaily);
    setShowConfigModal(false);
  };

  const handleTestSound = () => {
    playEWSAlertSound('siaga');
  };

  return (
    <div className="space-y-4">
      {/* Alert Header Banner */}
      <div className={`p-4 rounded-2xl border transition-all ${
        alerts.length > 0
          ? 'bg-gradient-to-r from-rose-950/80 via-slate-900 to-amber-950/60 border-rose-500/50 shadow-lg shadow-rose-950/30'
          : 'bg-slate-900/80 border-slate-800'
      }`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
              alerts.length > 0
                ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40 animate-pulse'
                : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
            }`}>
              {alerts.length > 0 ? (
                <AlertTriangle className="w-5 h-5" />
              ) : (
                <ShieldCheck className="w-5 h-5" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-white text-base">
                  {alerts.length > 0
                    ? `Sistem Peringatan Dini (EWS): ${alerts.length} Wilayah Melebihi Ambang Batas`
                    : 'Sistem Peringatan Dini (EWS): Kondisi Normal Terkendali'}
                </h3>
                {alerts.length > 0 && (
                  <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-rose-500 text-white animate-pulse">
                    LIVE
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400">
                Ambang Batas Aktif: <span className="text-cyan-400 font-semibold">{hourlyThreshold} mm/jam</span> (Akumulasi 24 Jam: <span className="text-cyan-400 font-semibold">{dailyThreshold} mm</span>)
              </p>
            </div>
          </div>

          {/* Action Control Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={onToggleSound}
              className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition ${
                soundEnabled
                  ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-300'
                  : 'bg-slate-800 border-slate-700 text-slate-400'
              }`}
              title="Aktifkan/Nonaktifkan Sirine EWS"
            >
              {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
              <span>{soundEnabled ? 'Suara Aktif' : 'Suara Mati'}</span>
            </button>

            {notificationStatus !== 'granted' && (
              <button
                onClick={requestBrowserNotification}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl border border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition"
                title="Aktifkan Notifikasi Browser"
              >
                <Bell className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden sm:inline">Izinkan Notifikasi</span>
              </button>
            )}

            <button
              onClick={() => setShowConfigModal(true)}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl border border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition"
            >
              <Sliders className="w-3.5 h-3.5 text-cyan-400" />
              <span>Atur Ambang</span>
            </button>
          </div>
        </div>

        {/* Active Alerts Cards Scroll */}
        {alerts.length > 0 && (
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-3 border-t border-slate-800/80">
            {alerts.slice(0, 6).map((alert) => (
              <div
                key={alert.id}
                onClick={() => onSelectRegionById(alert.regionId)}
                className={`p-3 rounded-xl border cursor-pointer transition transform hover:-translate-y-0.5 shadow-md flex flex-col justify-between ${
                  alert.severity === 'awas'
                    ? 'bg-rose-950/40 border-rose-700/60 hover:border-rose-500'
                    : alert.severity === 'siaga'
                    ? 'bg-orange-950/40 border-orange-700/60 hover:border-orange-500'
                    : 'bg-amber-950/40 border-amber-700/60 hover:border-amber-500'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      {alert.province}
                    </span>
                    <span className={`px-2 py-0.5 text-[9px] font-extrabold rounded-full ${
                      alert.severity === 'awas' ? 'bg-rose-600 text-white' :
                      alert.severity === 'siaga' ? 'bg-orange-600 text-white' :
                      'bg-amber-600 text-white'
                    }`}>
                      {alert.severity.toUpperCase()}
                    </span>
                  </div>

                  <div className="font-bold text-white text-sm flex items-center justify-between">
                    <span>{alert.regionName}</span>
                    <span className="text-cyan-300 font-mono text-sm">{alert.currentRainfall} mm/jam</span>
                  </div>

                  <p className="text-[11px] text-slate-300 mt-1 line-clamp-2 leading-relaxed">
                    {alert.description}
                  </p>
                </div>

                <div className="mt-2.5 pt-2 border-t border-slate-800/60 flex items-center justify-between text-[11px]">
                  <span className="text-amber-400 font-medium">Risiko: {alert.impactRisk}</span>
                  <span className="text-cyan-400 hover:underline flex items-center gap-0.5 font-semibold">
                    Periksa Peta <ChevronRight className="w-3 h-3" />
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Threshold Configuration Modal */}
      {showConfigModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Sliders className="w-5 h-5 text-cyan-400" />
                <h3 className="text-base font-bold text-white">Konfigurasi Ambang Peringatan Dini</h3>
              </div>
              <button
                onClick={() => setShowConfigModal(false)}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-xs font-semibold text-slate-300 mb-1.5">
                  <span>Ambang Batas Curah Hujan Per Jam:</span>
                  <span className="text-cyan-400 font-bold">{tempHourly} mm/jam</span>
                </div>
                <input
                  type="range"
                  min="2"
                  max="30"
                  step="1"
                  value={tempHourly}
                  onChange={(e) => setTempHourly(Number(e.target.value))}
                  className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                />
                <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                  <span>2 mm (Sensitif)</span>
                  <span>10 mm (BMKG Lebat)</span>
                  <span>20 mm (Sangat Lebat)</span>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-semibold text-slate-300 mb-1.5">
                  <span>Ambang Batas Akumulasi 24 Jam:</span>
                  <span className="text-cyan-400 font-bold">{tempDaily} mm/hari</span>
                </div>
                <input
                  type="range"
                  min="20"
                  max="150"
                  step="5"
                  value={tempDaily}
                  onChange={(e) => setTempDaily(Number(e.target.value))}
                  className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                />
                <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                  <span>20 mm</span>
                  <span>50 mm (Waspada Banjir)</span>
                  <span>100 mm (Siaga)</span>
                </div>
              </div>

              {/* Sound Test Option */}
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold text-white">Uji Coba Alarm Audio EWS</div>
                  <div className="text-[10px] text-slate-400">Pastikan speaker/audio perangkat Anda aktif</div>
                </div>
                <button
                  type="button"
                  onClick={handleTestSound}
                  className="px-3 py-1 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-bold transition flex items-center gap-1"
                >
                  <Volume2 className="w-3 h-3" />
                  Tes Suara
                </button>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                onClick={() => setShowConfigModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white rounded-xl"
              >
                Batal
              </button>
              <button
                onClick={handleSaveThresholds}
                className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-bold transition shadow-md shadow-cyan-950"
              >
                Simpan Konfigurasi
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
