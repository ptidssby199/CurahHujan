import React from 'react';
import { EarthquakeInfo, Region } from '../types';
import { 
  Activity, 
  MapPin, 
  Compass, 
  Layers, 
  ExternalLink, 
  Waves, 
  AlertTriangle,
  ChevronRight,
  Clock,
  Radio
} from 'lucide-react';

interface EarthquakeTickerProps {
  latestEarthquake?: EarthquakeInfo | null;
  selectedRegion?: Region | null;
  onFocusEarthquakeOnMap?: (earthquake: EarthquakeInfo) => void;
  onFocusOnMap?: (earthquake: EarthquakeInfo) => void;
  onOpenEarthquakeCenter?: () => void;
  onOpenDetails?: () => void;
}

export const EarthquakeTicker: React.FC<EarthquakeTickerProps> = ({
  latestEarthquake,
  selectedRegion,
  onFocusEarthquakeOnMap,
  onFocusOnMap,
  onOpenEarthquakeCenter,
  onOpenDetails,
}) => {
  if (!latestEarthquake) return null;

  const handleFocus = (eq: EarthquakeInfo) => {
    if (onFocusOnMap) onFocusOnMap(eq);
    else if (onFocusEarthquakeOnMap) onFocusEarthquakeOnMap(eq);
  };

  const handleOpen = () => {
    if (onOpenEarthquakeCenter) onOpenEarthquakeCenter();
    else if (onOpenDetails) onOpenDetails();
  };

  const regionName = selectedRegion?.name || 'Wilayah Anda';

  const mag = latestEarthquake.magnitude;
  const isSevere = mag >= 5.0;
  const isTsunami = latestEarthquake.isTsunamiWarning;

  let magBgColor = 'bg-cyan-500';
  let bannerBorderColor = 'border-cyan-500/40';
  let bannerBg = 'from-slate-900 via-slate-900 to-cyan-950/40';

  if (isTsunami || mag >= 6.5) {
    magBgColor = 'bg-rose-600';
    bannerBorderColor = 'border-rose-500/60 ring-1 ring-rose-500/40';
    bannerBg = 'from-rose-950/60 via-slate-900 to-slate-900';
  } else if (mag >= 5.0) {
    magBgColor = 'bg-amber-600';
    bannerBorderColor = 'border-amber-500/50';
    bannerBg = 'from-amber-950/40 via-slate-900 to-slate-900';
  }

  return (
    <div className={`w-full rounded-2xl border ${bannerBorderColor} bg-gradient-to-r ${bannerBg} p-3 sm:p-3.5 shadow-xl shadow-slate-950/80 transition-all`}>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Left Section: Live Badge & Earthquake Details */}
        <div className="flex items-start sm:items-center gap-3 overflow-hidden">
          {/* Magnitude Badge */}
          <div className="flex items-center gap-2 shrink-0">
            <div className={`px-2.5 py-1.5 rounded-xl ${magBgColor} text-white font-extrabold text-xs sm:text-sm flex items-center gap-1.5 shadow-lg shadow-black/40`}>
              <Activity className="w-3.5 h-3.5 animate-pulse" />
              <span>M {mag.toFixed(1)}</span>
            </div>
          </div>

          {/* Details */}
          <div className="overflow-hidden space-y-0.5">
            <div className="flex items-center gap-2 flex-wrap text-xs">
              <span className="font-extrabold text-white flex items-center gap-1">
                <Radio className="w-3.5 h-3.5 text-rose-400 animate-ping shrink-0" />
                INFO GEMPA TERKINI (BMKG)
              </span>
              <span className="text-[10px] text-slate-400 flex items-center gap-1">
                <Clock className="w-3 h-3 text-cyan-400" />
                {latestEarthquake.timeStr} ({latestEarthquake.timeAgo || 'Baru saja'})
              </span>
              {latestEarthquake.depthKm && (
                <span className="text-[10px] px-1.5 py-0.2 bg-slate-800 text-slate-300 rounded border border-slate-700 font-mono">
                  Kedlmn: {latestEarthquake.depthStr}
                </span>
              )}
            </div>

            <div className="text-xs text-slate-200 font-medium truncate flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
              <span className="truncate">{latestEarthquake.location}</span>
            </div>

            {/* Distance to user active region */}
            {latestEarthquake.distanceToSelectedKm !== undefined && (
              <div className="text-[11px] text-cyan-300 font-medium flex items-center gap-1.5">
                <span>
                  Jarak ke <strong>{regionName}</strong>: ~{latestEarthquake.distanceToSelectedKm} km
                </span>
                {latestEarthquake.estimatedShakingIntensity && (
                  <span className="text-slate-400 text-[10px]">
                    &bull; Estimasi: <strong className="text-amber-300">{latestEarthquake.estimatedShakingIntensity}</strong>
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Section: Tsunami Status & Interactive Action Buttons */}
        <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
          {/* Tsunami Status Pill */}
          <div className={`px-2.5 py-1 rounded-xl text-[10px] font-bold flex items-center gap-1 border ${
            isTsunami
              ? 'bg-rose-950 text-rose-300 border-rose-600 animate-pulse'
              : 'bg-slate-950/80 text-emerald-300 border-emerald-800'
          }`}>
            <Waves className="w-3.5 h-3.5" />
            <span>{latestEarthquake.tsunamiPotential}</span>
          </div>

          {/* Quick Focus on Map */}
          <button
            onClick={() => handleFocus(latestEarthquake)}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-cyan-300 hover:text-white rounded-xl text-xs font-semibold border border-slate-700 hover:border-cyan-500/50 transition flex items-center gap-1.5 shadow"
            title="Lihat Episentrum Gempa di Peta Interaktif"
          >
            <MapPin className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline">Peta Gempa</span>
          </button>

          {/* Open Full Earthquake Center */}
          <button
            onClick={handleOpen}
            className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-bold transition shadow-lg shadow-cyan-950 flex items-center gap-1"
          >
            <span>Pusat Gempa</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
