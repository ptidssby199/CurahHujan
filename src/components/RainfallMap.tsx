import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { Region, LiveRainfallData, IslandGroup } from '../types';
import { BMKG_RAINFALL_STANDARDS } from '../data/indonesiaRegions';
import { 
  Layers, 
  Eye, 
  MapPin, 
  Radio, 
  Compass, 
  CloudRain, 
  Maximize2,
  AlertTriangle,
  Heart
} from 'lucide-react';

interface RainfallMapProps {
  regions: Region[];
  rainfallDataMap: Record<string, LiveRainfallData>;
  selectedRegion: Region | null;
  onSelectRegion: (region: Region) => void;
  onToggleFavorite: (regionId: string) => void;
  favoriteIds: string[];
  userHourlyThreshold: number;
}

const TILE_SERVERS = {
  voyager: {
    name: 'CartoDB Voyager',
    url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://carto.com/">CARTO</a> &copy; OpenStreetMap',
    subdomains: 'abcd',
    maxZoom: 19,
  },
  dark: {
    name: 'CartoDB Dark Matter',
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://carto.com/">CARTO</a> &copy; OpenStreetMap',
    subdomains: 'abcd',
    maxZoom: 19,
  },
  osm: {
    name: 'OpenStreetMap',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; OpenStreetMap contributors',
    subdomains: 'abc',
    maxZoom: 19,
  },
  satellite: {
    name: 'Esri Satellite',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
    subdomains: 'abc',
    maxZoom: 18,
  },
};

const ISLAND_CENTERS: Record<string, { lat: number; lng: number; zoom: number }> = {
  all: { lat: -0.7893, lng: 113.9213, zoom: 5 },
  Sumatera: { lat: 0.5897, lng: 101.3431, zoom: 6 },
  Jawa: { lat: -7.2500, lng: 110.0000, zoom: 7 },
  Kalimantan: { lat: -0.5000, lng: 114.0000, zoom: 6 },
  Sulawesi: { lat: -2.0000, lng: 121.0000, zoom: 6 },
  'Bali & Nusa Tenggara': { lat: -8.6500, lng: 118.0000, zoom: 7 },
  'Maluku & Papua': { lat: -3.5000, lng: 135.0000, zoom: 5 },
};

export const RainfallMap: React.FC<RainfallMapProps> = ({
  regions,
  rainfallDataMap,
  selectedRegion,
  onSelectRegion,
  onToggleFavorite,
  favoriteIds,
  userHourlyThreshold,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const radarLayerRef = useRef<L.LayerGroup | null>(null);
  const baseTileLayerRef = useRef<L.TileLayer | null>(null);

  const [activeTile, setActiveTile] = useState<keyof typeof TILE_SERVERS>('dark');
  const [showRadarWave, setShowRadarWave] = useState<boolean>(true);
  const [filterMode, setFilterMode] = useState<'all' | 'raining' | 'alert_only'>('all');
  const [selectedIsland, setSelectedIsland] = useState<string>('all');
  const [showLegend, setShowLegend] = useState<boolean>(true);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return; // already created

    const map = L.map(mapContainerRef.current, {
      center: [-2.5, 118.0],
      zoom: 5,
      minZoom: 4,
      maxZoom: 14,
      zoomControl: false,
    });

    L.control.zoom({ position: 'topright' }).addTo(map);

    const tileConf = TILE_SERVERS[activeTile];
    const baseLayer = L.tileLayer(tileConf.url, {
      attribution: tileConf.attribution,
      subdomains: tileConf.subdomains,
      maxZoom: tileConf.maxZoom,
    }).addTo(map);

    baseTileLayerRef.current = baseLayer;
    markersLayerRef.current = L.layerGroup().addTo(map);
    radarLayerRef.current = L.layerGroup().addTo(map);

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update Base Layer
  useEffect(() => {
    if (!mapInstanceRef.current || !baseTileLayerRef.current) return;
    const tileConf = TILE_SERVERS[activeTile];
    baseTileLayerRef.current.setUrl(tileConf.url);
  }, [activeTile]);

  // Jump to selected region when changed from outside
  useEffect(() => {
    if (!mapInstanceRef.current || !selectedRegion) return;
    mapInstanceRef.current.flyTo([selectedRegion.lat, selectedRegion.lng], 9, {
      duration: 1.2,
    });
  }, [selectedRegion]);

  // Handle Island Zoom
  const handleIslandFilter = (islandKey: string) => {
    setSelectedIsland(islandKey);
    const target = ISLAND_CENTERS[islandKey] || ISLAND_CENTERS.all;
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([target.lat, target.lng], target.zoom, { duration: 1.2 });
    }
  };

  // Render Markers & Dynamic Visuals
  useEffect(() => {
    if (!mapInstanceRef.current || !markersLayerRef.current || !radarLayerRef.current) return;

    markersLayerRef.current.clearLayers();
    radarLayerRef.current.clearLayers();

    // Filter regions based on mode & island
    const filteredRegions = regions.filter((r) => {
      const d = rainfallDataMap[r.id];
      if (selectedIsland !== 'all' && r.island !== selectedIsland) return false;
      if (filterMode === 'raining') return d && d.currentRainfall > 0;
      if (filterMode === 'alert_only') return d && (d.alertSeverity !== 'normal' || d.currentRainfall >= userHourlyThreshold);
      return true;
    });

    filteredRegions.forEach((reg) => {
      const data = rainfallDataMap[reg.id];
      const rain = data ? data.currentRainfall : 0;
      const isFav = favoriteIds.includes(reg.id);
      const isSelected = selectedRegion?.id === reg.id;
      const severity = data?.alertSeverity || 'normal';

      // Determine colors based on BMKG standards
      let pinColor = '#64748b'; // slate
      let haloColor = 'rgba(100, 116, 139, 0.2)';
      let pulseAnimClass = '';

      if (rain >= 30) {
        pinColor = '#ef4444'; // rose-500 extreme
        haloColor = 'rgba(239, 68, 68, 0.4)';
        pulseAnimClass = 'animate-ping';
      } else if (rain >= 20) {
        pinColor = '#f97316'; // orange-500 very heavy
        haloColor = 'rgba(249, 115, 22, 0.4)';
        pulseAnimClass = 'animate-pulse';
      } else if (rain >= 10) {
        pinColor = '#f59e0b'; // amber-500 heavy
        haloColor = 'rgba(245, 158, 11, 0.3)';
        pulseAnimClass = 'animate-pulse';
      } else if (rain >= 5) {
        pinColor = '#10b981'; // emerald-500 moderate
        haloColor = 'rgba(16, 185, 129, 0.25)';
      } else if (rain > 0.5) {
        pinColor = '#0284c7'; // sky-600 light
        haloColor = 'rgba(2, 132, 199, 0.2)';
      }

      // Dynamic radar wave circle for active rainfall
      if (showRadarWave && rain > 0 && radarLayerRef.current) {
        const radius = Math.min(45000, 12000 + rain * 1500);
        const radarCircle = L.circle([reg.lat, reg.lng], {
          radius,
          color: pinColor,
          weight: 1.5,
          opacity: 0.7,
          fillColor: pinColor,
          fillOpacity: Math.min(0.35, 0.08 + (rain / 50) * 0.25),
        });
        radarCircle.addTo(radarLayerRef.current);
      }

      // Custom HTML Marker icon
      const markerHtml = `
        <div class="relative group cursor-pointer flex items-center justify-center -translate-x-1/2 -translate-y-1/2">
          ${rain > 5 ? `<div class="absolute w-10 h-10 rounded-full ${pulseAnimClass}" style="background: ${haloColor};"></div>` : ''}
          <div class="relative flex items-center justify-center w-8 h-8 rounded-full border-2 ${
            isSelected ? 'border-white ring-4 ring-cyan-400 scale-125 z-30' : 'border-slate-900 shadow-md'
          } transition-all duration-300" style="background-color: ${pinColor};">
            <span class="text-[10px] font-bold text-white tracking-tighter">
              ${rain > 0 ? (rain >= 10 ? Math.round(rain) : rain.toFixed(1)) : '0'}
            </span>
          </div>
          ${isFav ? '<div class="absolute -top-1 -right-1 w-3.5 h-3.5 bg-rose-500 rounded-full flex items-center justify-center text-[8px] text-white border border-slate-900">♥</div>' : ''}
        </div>
      `;

      const customIcon = L.divIcon({
        html: markerHtml,
        className: 'custom-weather-marker',
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });

      const marker = L.marker([reg.lat, reg.lng], { icon: customIcon });

      // Popup content with rich info
      const popupContent = `
        <div class="p-3 bg-slate-900 text-slate-100 rounded-lg shadow-xl font-sans min-w-[220px] max-w-[280px] border border-slate-700">
          <div class="flex items-start justify-between gap-2 border-b border-slate-800 pb-2 mb-2">
            <div>
              <div class="text-xs text-cyan-400 font-semibold uppercase tracking-wider">${reg.province}</div>
              <div class="text-sm font-bold text-white flex items-center gap-1">
                ${reg.name}
              </div>
            </div>
            <span class="px-2 py-0.5 text-[10px] font-bold rounded-full ${
              severity === 'awas' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40' :
              severity === 'siaga' ? 'bg-orange-500/20 text-orange-300 border border-orange-500/40' :
              severity === 'waspada' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' :
              'bg-slate-800 text-slate-300'
            }">
              ${severity.toUpperCase()}
            </span>
          </div>

          <div class="grid grid-cols-2 gap-2 text-xs mb-3">
            <div class="bg-slate-800/80 p-2 rounded border border-slate-700/60">
              <span class="text-[10px] text-slate-400 block">Curah Hujan:</span>
              <span class="text-sm font-bold text-cyan-300">${data ? data.currentRainfall : 0} mm/jam</span>
            </div>
            <div class="bg-slate-800/80 p-2 rounded border border-slate-700/60">
              <span class="text-[10px] text-slate-400 block">Akumulasi 24 Jam:</span>
              <span class="text-sm font-bold text-slate-200">${data ? data.rainfallPast24h : 0} mm</span>
            </div>
            <div class="bg-slate-800/80 p-2 rounded border border-slate-700/60">
              <span class="text-[10px] text-slate-400 block">Suhu Udara:</span>
              <span class="font-semibold text-slate-200">${data ? data.temperature : 28}°C</span>
            </div>
            <div class="bg-slate-800/80 p-2 rounded border border-slate-700/60">
              <span class="text-[10px] text-slate-400 block">Kelembaban:</span>
              <span class="font-semibold text-slate-200">${data ? data.humidity : 80}%</span>
            </div>
          </div>

          <div class="text-[11px] text-slate-300 mb-3 bg-slate-800/40 px-2 py-1.5 rounded border border-slate-700/40 flex items-center gap-1.5">
            <span class="w-2 h-2 rounded-full" style="background:${pinColor}"></span>
            <span>${data ? data.weatherDescription : 'Cerah Berawan'}</span>
          </div>

          <div class="flex items-center gap-1.5">
            <button id="btn-select-${reg.id}" class="flex-1 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold py-1.5 px-3 rounded transition flex items-center justify-center gap-1">
              Buka Analisis
            </button>
            <button id="btn-fav-${reg.id}" class="p-1.5 ${isFav ? 'bg-rose-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-rose-400'} rounded border border-slate-700 transition">
              ♥
            </button>
          </div>
        </div>
      `;

      marker.bindPopup(popupContent, {
        className: 'custom-leaflet-popup',
        maxWidth: 320,
      });

      marker.on('popupopen', () => {
        const selectBtn = document.getElementById(`btn-select-${reg.id}`);
        const favBtn = document.getElementById(`btn-fav-${reg.id}`);

        if (selectBtn) {
          selectBtn.onclick = () => {
            onSelectRegion(reg);
            marker.closePopup();
          };
        }
        if (favBtn) {
          favBtn.onclick = () => {
            onToggleFavorite(reg.id);
            marker.closePopup();
          };
        }
      });

      marker.on('click', () => {
        onSelectRegion(reg);
      });

      if (markersLayerRef.current) {
        marker.addTo(markersLayerRef.current);
      }
    });
  }, [
    regions,
    rainfallDataMap,
    selectedRegion,
    filterMode,
    selectedIsland,
    showRadarWave,
    favoriteIds,
    userHourlyThreshold,
    onSelectRegion,
    onToggleFavorite,
  ]);

  return (
    <div className="relative w-full h-[520px] lg:h-[600px] rounded-2xl overflow-hidden border border-slate-800 bg-slate-950 shadow-2xl">
      {/* Map Target Container */}
      <div ref={mapContainerRef} className="w-full h-full z-0" />

      {/* Top Floating Control Bar */}
      <div className="absolute top-3 left-3 right-3 z-10 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
        {/* Island Filters */}
        <div className="flex items-center gap-1 bg-slate-900/90 backdrop-blur-md p-1.5 rounded-xl border border-slate-700/80 shadow-lg pointer-events-auto overflow-x-auto max-w-full">
          <button
            onClick={() => handleIslandFilter('all')}
            className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition whitespace-nowrap ${
              selectedIsland === 'all'
                ? 'bg-cyan-600 text-white shadow-md'
                : 'text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
          >
            🇮🇩 Seluruh Indonesia
          </button>
          {['Sumatera', 'Jawa', 'Kalimantan', 'Sulawesi', 'Bali & Nusa Tenggara', 'Maluku & Papua'].map((island) => (
            <button
              key={island}
              onClick={() => handleIslandFilter(island)}
              className={`px-2 py-1 text-xs font-medium rounded-lg transition whitespace-nowrap ${
                selectedIsland === island
                  ? 'bg-cyan-600 text-white shadow-md'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
              }`}
            >
              {island}
            </button>
          ))}
        </div>

        {/* Layer & Filter Buttons */}
        <div className="flex items-center gap-1.5 bg-slate-900/90 backdrop-blur-md p-1.5 rounded-xl border border-slate-700/80 shadow-lg pointer-events-auto">
          {/* Filter Status Mode */}
          <div className="flex bg-slate-950 rounded-lg p-0.5 border border-slate-800">
            <button
              onClick={() => setFilterMode('all')}
              className={`px-2 py-1 text-[11px] font-medium rounded ${
                filterMode === 'all' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Tampilkan semua stasiun"
            >
              Semua
            </button>
            <button
              onClick={() => setFilterMode('raining')}
              className={`px-2 py-1 text-[11px] font-medium rounded flex items-center gap-1 ${
                filterMode === 'raining' ? 'bg-cyan-900/60 text-cyan-300 border border-cyan-700/50' : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Hanya stasiun dengan hujan"
            >
              <CloudRain className="w-3 h-3 text-cyan-400" />
              Hujan
            </button>
            <button
              onClick={() => setFilterMode('alert_only')}
              className={`px-2 py-1 text-[11px] font-medium rounded flex items-center gap-1 ${
                filterMode === 'alert_only' ? 'bg-rose-950/60 text-rose-300 border border-rose-700/50' : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Hanya stasiun dalam status peringatan"
            >
              <AlertTriangle className="w-3 h-3 text-amber-400" />
              Peringatan
            </button>
          </div>

          {/* Radar Waves Toggle */}
          <button
            onClick={() => setShowRadarWave(!showRadarWave)}
            className={`p-1.5 rounded-lg border text-xs flex items-center gap-1 font-medium transition ${
              showRadarWave
                ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-300'
                : 'bg-slate-800/80 border-slate-700 text-slate-400'
            }`}
            title="Animasi Radar Gelombang Hujan"
          >
            <Radio className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Radar</span>
          </button>

          {/* Tile Layer Switcher */}
          <div className="relative group">
            <button
              className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg border border-slate-700 text-xs flex items-center gap-1 font-medium transition"
              title="Ganti Jenis Peta"
            >
              <Layers className="w-3.5 h-3.5 text-cyan-400" />
              <span className="hidden md:inline capitalize">{activeTile}</span>
            </button>
            <div className="absolute right-0 mt-1 w-40 bg-slate-900 border border-slate-700 rounded-xl p-1.5 shadow-2xl opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-all duration-200 z-50">
              <div className="text-[10px] uppercase font-bold text-slate-400 px-2 py-1">Tipe Peta</div>
              {(Object.keys(TILE_SERVERS) as Array<keyof typeof TILE_SERVERS>).map((k) => (
                <button
                  key={k}
                  onClick={() => setActiveTile(k)}
                  className={`w-full text-left px-2 py-1.5 rounded-lg text-xs flex items-center justify-between ${
                    activeTile === k ? 'bg-cyan-600 text-white font-semibold' : 'text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <span>{TILE_SERVERS[k].name}</span>
                  {activeTile === k && <span className="text-[10px]">✓</span>}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Floating Legend */}
      <div className="absolute bottom-3 left-3 z-10 pointer-events-auto">
        <div className="bg-slate-900/90 backdrop-blur-md p-2.5 rounded-xl border border-slate-700/80 shadow-2xl max-w-sm">
          <div className="flex items-center justify-between gap-3 mb-1.5">
            <span className="text-[11px] font-bold text-slate-300 tracking-wide flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
              SKALA CURAH HUJAN BMKG (mm/jam)
            </span>
            <button
              onClick={() => setShowLegend(!showLegend)}
              className="text-[10px] text-cyan-400 hover:underline"
            >
              {showLegend ? 'Sembunyikan' : 'Buka'}
            </button>
          </div>

          {showLegend && (
            <div className="grid grid-cols-3 gap-1.5 text-[10px] pt-1 border-t border-slate-800">
              <div className="flex items-center gap-1 text-slate-400">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-500 shrink-0"></span>
                <span>Nihil (0)</span>
              </div>
              <div className="flex items-center gap-1 text-sky-300">
                <span className="w-2.5 h-2.5 rounded-full bg-sky-400 shrink-0"></span>
                <span>Ringan (0.1-5)</span>
              </div>
              <div className="flex items-center gap-1 text-emerald-300">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0"></span>
                <span>Sedang (5-10)</span>
              </div>
              <div className="flex items-center gap-1 text-amber-300">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0"></span>
                <span>Lebat (10-20)</span>
              </div>
              <div className="flex items-center gap-1 text-orange-300">
                <span className="w-2.5 h-2.5 rounded-full bg-orange-500 shrink-0"></span>
                <span>Sangat Lebat (&gt;20)</span>
              </div>
              <div className="flex items-center gap-1 text-rose-300 font-bold">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shrink-0"></span>
                <span>Ekstrem (&gt;30)</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Selected Location Quick Badge on Map */}
      {selectedRegion && (
        <div className="absolute bottom-3 right-3 z-10 pointer-events-auto bg-slate-900/90 backdrop-blur-md px-3 py-2 rounded-xl border border-cyan-500/40 shadow-2xl flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping"></div>
            <div>
              <div className="text-[10px] text-slate-400">{selectedRegion.province}</div>
              <div className="text-xs font-bold text-white">{selectedRegion.name}</div>
            </div>
          </div>
          <div className="text-right pl-2 border-l border-slate-700">
            <div className="text-xs font-extrabold text-cyan-300">
              {rainfallDataMap[selectedRegion.id]?.currentRainfall ?? 0} mm/j
            </div>
            <div className="text-[9px] text-slate-400">
              24j: {rainfallDataMap[selectedRegion.id]?.rainfallPast24h ?? 0} mm
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
