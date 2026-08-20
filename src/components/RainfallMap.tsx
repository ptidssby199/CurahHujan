import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { Region, LiveRainfallData, IslandGroup, EarthquakeInfo } from '../types';
import { BMKG_RAINFALL_STANDARDS } from '../data/indonesiaRegions';
import { 
  POPULAR_KECAMATAN_PRESETS, 
  searchKecamatan,
  fetchLiveRainfallForRegion
} from '../services/weatherService';
import { 
  Layers, 
  Eye, 
  MapPin, 
  Radio, 
  Compass, 
  CloudRain, 
  Maximize2,
  AlertTriangle,
  Heart,
  Building2,
  Search,
  Check,
  Loader2,
  X,
  Navigation,
  Sparkles,
  Home,
  Activity,
  Waves
} from 'lucide-react';

interface RainfallMapProps {
  regions: Region[];
  rainfallDataMap: Record<string, LiveRainfallData>;
  selectedRegion: Region | null;
  onSelectRegion: (region: Region) => void;
  onToggleFavorite: (regionId: string) => void;
  favoriteIds: string[];
  userHourlyThreshold: number;
  earthquakes?: EarthquakeInfo[];
  focusedEarthquake?: EarthquakeInfo | null;
  onOpenEarthquakeCenter?: () => void;
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
  earthquakes = [],
  focusedEarthquake,
  onOpenEarthquakeCenter,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const radarLayerRef = useRef<L.LayerGroup | null>(null);
  const earthquakeLayerRef = useRef<L.LayerGroup | null>(null);
  const baseTileLayerRef = useRef<L.TileLayer | null>(null);

  const [activeTile, setActiveTile] = useState<keyof typeof TILE_SERVERS>('dark');
  const [showRadarWave, setShowRadarWave] = useState<boolean>(true);
  const [showEarthquakeLayer, setShowEarthquakeLayer] = useState<boolean>(true);
  const [filterMode, setFilterMode] = useState<'all' | 'raining' | 'alert_only'>('all');
  const [selectedIsland, setSelectedIsland] = useState<string>('all');
  const [showLegend, setShowLegend] = useState<boolean>(true);
  
  // Kecamatan specific states
  const [showKecamatanLayer, setShowKecamatanLayer] = useState<boolean>(true);
  const [pinnedKecamatans, setPinnedKecamatans] = useState<Region[]>(POPULAR_KECAMATAN_PRESETS);
  const [kecamatanSearchQuery, setKecamatanSearchQuery] = useState<string>('');
  const [kecamatanSearchResults, setKecamatanSearchResults] = useState<Region[]>([]);
  const [isSearchingKecamatan, setIsSearchingKecamatan] = useState<boolean>(false);
  const [isSearchPanelOpen, setIsSearchPanelOpen] = useState<boolean>(false);
  const [activeKecamatanTab, setActiveKecamatanTab] = useState<'search' | 'presets'>('presets');

  // Debounced search for Kecamatan
  useEffect(() => {
    if (!kecamatanSearchQuery.trim() || kecamatanSearchQuery.trim().length < 2) {
      setKecamatanSearchResults([]);
      setIsSearchingKecamatan(false);
      return;
    }

    setIsSearchingKecamatan(true);
    const timer = setTimeout(async () => {
      try {
        const res = await searchKecamatan(kecamatanSearchQuery);
        setKecamatanSearchResults(res);
      } catch (err) {
        console.error('Map search kecamatan error:', err);
      } finally {
        setIsSearchingKecamatan(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [kecamatanSearchQuery]);

  // Handle selecting a kecamatan from map search or preset
  const handleSelectKecamatanOnMap = (kec: Region) => {
    // Add to pinned list if not already there
    setPinnedKecamatans((prev) => {
      const exists = prev.some((k) => k.id === kec.id || (k.lat === kec.lat && k.lng === kec.lng));
      return exists ? prev : [kec, ...prev];
    });

    onSelectRegion(kec);
    setIsSearchPanelOpen(false);
    setKecamatanSearchQuery('');
    setKecamatanSearchResults([]);

    // Smoothly fly to the kecamatan with detailed zoom (13)
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([kec.lat, kec.lng], 13, {
        duration: 1.5,
      });
    }
  };

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return; // already created

    const map = L.map(mapContainerRef.current, {
      center: [-2.5, 118.0],
      zoom: 5,
      minZoom: 4,
      maxZoom: 18,
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
    earthquakeLayerRef.current = L.layerGroup().addTo(map);

    // Map Click Handler: allow clicking anywhere to inspect & geocode
    map.on('click', async (e: L.LeafletMouseEvent) => {
      const lat = Number(e.latlng.lat.toFixed(4));
      const lng = Number(e.latlng.lng.toFixed(4));

      // Reverse geocode or create custom point
      const customPoint: Region = {
        id: `map-pt-${Math.round(lat * 1000)}-${Math.round(lng * 1000)}`,
        name: `Titik Pengamatan (${lat}, ${lng})`,
        type: 'Kecamatan',
        province: 'Wilayah Terpilih',
        island: 'Jawa',
        lat,
        lng,
        elevationMeters: 50,
        stationCode: `EWS-${Math.abs(Math.round(lat * 100))}`,
        timezone: lng > 120 ? (lng > 130 ? 'WIT' : 'WITA') : 'WIB',
      };

      const popupHtml = `
        <div class="p-3 bg-slate-900 text-slate-100 rounded-lg shadow-xl font-sans min-w-[220px] max-w-[260px] border border-cyan-500/50">
          <div class="flex items-center gap-1.5 text-xs text-cyan-400 font-bold mb-1">
            <span class="w-2 h-2 rounded-full bg-cyan-400 animate-ping"></span>
            Titik Koordinat Baru
          </div>
          <div class="text-xs text-slate-300 mb-2">
            Lat: <strong>${lat}</strong>, Lng: <strong>${lng}</strong>
          </div>
          <button id="btn-select-clicked-point" class="w-full bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold py-1.5 px-3 rounded-lg transition flex items-center justify-center gap-1 shadow-md">
            🎯 Analisis Wilayah Ini
          </button>
        </div>
      `;

      const popup = L.popup({ className: 'custom-leaflet-popup' })
        .setLatLng(e.latlng)
        .setContent(popupHtml)
        .openOn(map);

      setTimeout(() => {
        const btn = document.getElementById('btn-select-clicked-point');
        if (btn) {
          btn.onclick = () => {
            handleSelectKecamatanOnMap(customPoint);
            map.closePopup();
          };
        }
      }, 50);
    });

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
    const targetZoom = selectedRegion.type === 'Kecamatan' ? 13 : 9;
    mapInstanceRef.current.flyTo([selectedRegion.lat, selectedRegion.lng], targetZoom, {
      duration: 1.2,
    });
  }, [selectedRegion]);

  // Jump and highlight earthquake epicenter when selected
  useEffect(() => {
    if (!mapInstanceRef.current || !focusedEarthquake) return;
    setShowEarthquakeLayer(true);
    mapInstanceRef.current.flyTo([focusedEarthquake.lat, focusedEarthquake.lng], 9, {
      duration: 1.5,
    });
  }, [focusedEarthquake]);

  // Render Earthquake Epicenters & Concentric Seismic Ripple Waves
  useEffect(() => {
    if (!mapInstanceRef.current || !earthquakeLayerRef.current) return;

    earthquakeLayerRef.current.clearLayers();

    if (!showEarthquakeLayer || !earthquakes || earthquakes.length === 0) return;

    earthquakes.forEach((eq) => {
      const isFocused = focusedEarthquake?.id === eq.id;
      const mag = eq.magnitude;
      const isSevere = mag >= 5.0;
      const isTsunami = eq.isTsunamiWarning;

      // Color scheme based on magnitude
      let colorHex = '#06b6d4'; // cyan for M < 4.5
      let bgClass = 'bg-cyan-600';
      if (mag >= 7.0 || isTsunami) {
        colorHex = '#dc2626'; // red-600
        bgClass = 'bg-rose-600';
      } else if (mag >= 6.0) {
        colorHex = '#ea580c'; // orange-600
        bgClass = 'bg-orange-600';
      } else if (mag >= 5.0) {
        colorHex = '#d97706'; // amber-600
        bgClass = 'bg-amber-600';
      } else if (mag >= 4.0) {
        colorHex = '#ca8a04'; // yellow-600
        bgClass = 'bg-yellow-600';
      }

      // Seismic Shockwave Circles (Estimated Felt/Damage Radius)
      // Radius scales with magnitude (approximate empirical radius)
      const primaryRadius = Math.max(30000, Math.pow(10, 0.45 * mag - 0.2) * 1000);
      const outerRadius = primaryRadius * 1.8;

      // Outer wave
      const outerCircle = L.circle([eq.lat, eq.lng], {
        radius: outerRadius,
        color: colorHex,
        weight: 1,
        dashArray: '4, 8',
        opacity: isFocused ? 0.8 : 0.4,
        fillColor: colorHex,
        fillOpacity: isFocused ? 0.08 : 0.03,
      });
      outerCircle.addTo(earthquakeLayerRef.current);

      // Inner intense shaking zone
      const innerCircle = L.circle([eq.lat, eq.lng], {
        radius: primaryRadius,
        color: colorHex,
        weight: 1.5,
        opacity: isFocused ? 0.9 : 0.6,
        fillColor: colorHex,
        fillOpacity: isFocused ? 0.18 : 0.08,
      });
      innerCircle.addTo(earthquakeLayerRef.current);

      // Custom Seismic Epicenter Marker
      const size = isSevere ? 36 : 30;
      const markerHtml = `
        <div class="relative group cursor-pointer flex items-center justify-center -translate-x-1/2 -translate-y-1/2">
          <!-- Concentric pulsing rings -->
          <div class="absolute w-12 h-12 rounded-full animate-ping opacity-60 pointer-events-none" style="background-color: ${colorHex};"></div>
          <div class="absolute w-8 h-8 rounded-full animate-pulse opacity-80 pointer-events-none" style="background-color: ${colorHex};"></div>
          
          <!-- Epicenter Pin Badge -->
          <div class="relative flex flex-col items-center justify-center ${size === 36 ? 'w-9 h-9' : 'w-8 h-8'} rounded-full border-2 ${
            isFocused ? 'border-white ring-4 ring-rose-400 scale-125 z-40' : 'border-slate-900 shadow-xl'
          } ${bgClass} text-white font-black text-center shadow-lg transition-all duration-300">
            <span class="text-[9px] leading-none font-bold">M${mag.toFixed(1)}</span>
            <span class="text-[7px] leading-none opacity-80 font-mono">${eq.depthStr}</span>
          </div>

          <!-- Top Label for Latest -->
          ${eq.isLatest ? '<div class="absolute -top-3.5 px-1.5 py-0.2 bg-rose-600 text-white border border-rose-400 text-[7px] font-black rounded-full uppercase tracking-tight shadow animate-pulse whitespace-nowrap">TERKINI</div>' : ''}
          ${isTsunami ? '<div class="absolute -bottom-3 px-1.5 py-0.2 bg-purple-900 text-purple-200 border border-purple-500 text-[7px] font-black rounded uppercase tracking-tight shadow">TSUNAMI</div>' : ''}
        </div>
      `;

      const eqIcon = L.divIcon({
        html: markerHtml,
        className: 'custom-earthquake-marker',
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2],
      });

      const eqMarker = L.marker([eq.lat, eq.lng], { icon: eqIcon });

      // Epicenter Popup
      const popupContent = `
        <div class="p-3 bg-slate-900 text-slate-100 rounded-xl shadow-2xl font-sans min-w-[240px] max-w-[300px] border border-rose-500/60">
          <div class="flex items-start justify-between gap-2 border-b border-slate-800 pb-2 mb-2">
            <div>
              <div class="flex items-center gap-1.5 text-[10px] text-rose-400 font-extrabold uppercase tracking-wider">
                <span class="w-2 h-2 rounded-full bg-rose-500 animate-ping"></span>
                INFO GEMPA BUMI (${eq.source})
              </div>
              <div class="text-sm font-black text-white mt-0.5">
                Magnitudo M ${mag.toFixed(1)}
              </div>
              <div class="text-[10px] text-slate-400">${eq.dateStr} &bull; ${eq.timeStr}</div>
            </div>
            <span class="px-2 py-0.5 text-[10px] font-extrabold rounded-lg ${
              isSevere ? 'bg-rose-950 text-rose-300 border border-rose-600' : 'bg-amber-950 text-amber-300 border border-amber-600'
            }">
              ${eq.depthStr}
            </span>
          </div>

          <div class="space-y-1.5 text-xs mb-3">
            <div class="text-slate-200 font-medium leading-tight">
              📍 ${eq.location}
            </div>
            <div class="text-[10px] text-slate-400">
              Koordinat: <strong>${eq.coordinates}</strong>
            </div>

            <!-- Tsunami Alert Status -->
            <div class="p-1.5 rounded-lg text-[10px] font-bold flex items-center gap-1 ${
              isTsunami ? 'bg-rose-950 text-rose-200 border border-rose-500 animate-pulse' : 'bg-emerald-950/60 text-emerald-300 border border-emerald-800/80'
            }">
              <span>🌊</span>
              <span>${eq.tsunamiPotential}</span>
            </div>

            ${eq.distanceToSelectedKm !== undefined ? `
              <div class="p-1.5 rounded-lg bg-slate-950 text-[10px] border border-slate-800 text-cyan-300 font-medium">
                Jarak ke ${selectedRegion ? selectedRegion.name : 'Wilayah Anda'}: <strong>~${eq.distanceToSelectedKm} km</strong>
                ${eq.estimatedShakingIntensity ? `<div class="text-amber-300 text-[9px] mt-0.5">Estimasi: ${eq.estimatedShakingIntensity}</div>` : ''}
              </div>
            ` : ''}

            ${eq.feltAreas ? `
              <div class="text-[10px] text-amber-200/90 bg-amber-950/30 p-1.5 rounded border border-amber-800/40">
                <strong>Dirasakan:</strong> ${eq.feltAreas}
              </div>
            ` : ''}
          </div>

          <div class="flex items-center gap-2 pt-1 border-t border-slate-800">
            <button id="btn-open-eq-center-${eq.id}" class="w-full bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white text-xs font-bold py-1.5 px-3 rounded-lg transition flex items-center justify-center gap-1 shadow-md">
              ⚡ Detail di Pusat Gempa
            </button>
          </div>
        </div>
      `;

      eqMarker.bindPopup(popupContent, {
        className: 'custom-leaflet-popup',
        maxWidth: 320,
      });

      eqMarker.on('popupopen', () => {
        const btn = document.getElementById(`btn-open-eq-center-${eq.id}`);
        if (btn && onOpenEarthquakeCenter) {
          btn.onclick = () => {
            onOpenEarthquakeCenter();
            eqMarker.closePopup();
          };
        }
      });

      if (earthquakeLayerRef.current) {
        eqMarker.addTo(earthquakeLayerRef.current);
      }
    });
  }, [
    earthquakes,
    focusedEarthquake,
    showEarthquakeLayer,
    selectedRegion,
    onOpenEarthquakeCenter,
  ]);

  // Handle Island Zoom
  const handleIslandFilter = (islandKey: string) => {
    setSelectedIsland(islandKey);
    const target = ISLAND_CENTERS[islandKey] || ISLAND_CENTERS.all;
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([target.lat, target.lng], target.zoom, { duration: 1.2 });
    }
  };

  // Render Markers & Dynamic Visuals (City Stations + Kecamatans)
  useEffect(() => {
    if (!mapInstanceRef.current || !markersLayerRef.current || !radarLayerRef.current) return;

    markersLayerRef.current.clearLayers();
    radarLayerRef.current.clearLayers();

    // Combine standard regions with pinned kecamatans (if layer active)
    let combinedRegions = [...regions];
    if (showKecamatanLayer) {
      // Add pinned kecamatans avoiding duplicates
      pinnedKecamatans.forEach((k) => {
        if (!combinedRegions.some((r) => r.id === k.id)) {
          combinedRegions.push(k);
        }
      });
    }

    // Always ensure selectedRegion is in the list
    if (selectedRegion && !combinedRegions.some((r) => r.id === selectedRegion.id)) {
      combinedRegions.push(selectedRegion);
    }

    // Filter regions based on mode & island
    const filteredRegions = combinedRegions.filter((r) => {
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
      const isKecamatan = reg.type === 'Kecamatan';
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
        const radius = isKecamatan 
          ? Math.min(25000, 8000 + rain * 1000)
          : Math.min(45000, 12000 + rain * 1500);
          
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

      // Custom HTML Marker icon (Distinct design for Kecamatan vs Kota)
      const markerSize = isKecamatan ? 28 : 32;
      const markerHtml = `
        <div class="relative group cursor-pointer flex items-center justify-center -translate-x-1/2 -translate-y-1/2">
          ${rain > 5 ? `<div class="absolute w-10 h-10 rounded-full ${pulseAnimClass}" style="background: ${haloColor};"></div>` : ''}
          
          <div class="relative flex items-center justify-center ${isKecamatan ? 'w-7 h-7' : 'w-8 h-8'} rounded-full border-2 ${
            isSelected 
              ? 'border-white ring-4 ring-cyan-400 scale-125 z-30' 
              : isKecamatan 
                ? 'border-cyan-400/80 shadow-lg' 
                : 'border-slate-900 shadow-md'
          } transition-all duration-300" style="background-color: ${pinColor};">
            <span class="text-[9px] font-bold text-white tracking-tighter">
              ${rain > 0 ? (rain >= 10 ? Math.round(rain) : rain.toFixed(1)) : '0'}
            </span>
          </div>

          ${isKecamatan ? '<div class="absolute -bottom-2 px-1 py-0.2 bg-cyan-950 text-cyan-300 border border-cyan-700 text-[7px] font-extrabold rounded uppercase tracking-tight shadow">KEC</div>' : ''}
          ${isFav ? '<div class="absolute -top-1 -right-1 w-3.5 h-3.5 bg-rose-500 rounded-full flex items-center justify-center text-[8px] text-white border border-slate-900">♥</div>' : ''}
        </div>
      `;

      const customIcon = L.divIcon({
        html: markerHtml,
        className: 'custom-weather-marker',
        iconSize: [markerSize, markerSize],
        iconAnchor: [markerSize / 2, markerSize / 2],
      });

      const marker = L.marker([reg.lat, reg.lng], { icon: customIcon });

      // Popup content with rich info
      const popupContent = `
        <div class="p-3 bg-slate-900 text-slate-100 rounded-lg shadow-xl font-sans min-w-[220px] max-w-[280px] border ${isKecamatan ? 'border-cyan-500/60' : 'border-slate-700'}">
          <div class="flex items-start justify-between gap-2 border-b border-slate-800 pb-2 mb-2">
            <div>
              <div class="flex items-center gap-1 text-[10px] text-cyan-400 font-bold uppercase tracking-wider">
                ${isKecamatan ? '<span class="px-1 py-0.2 bg-cyan-950 text-cyan-300 border border-cyan-800 rounded text-[8px]">KECAMATAN</span>' : ''}
                ${reg.province}
              </div>
              <div class="text-sm font-bold text-white flex items-center gap-1">
                ${reg.name}
              </div>
              <div class="text-[10px] text-slate-400">${reg.elevationMeters} mdpl &bull; ${reg.timezone}</div>
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
            <button id="btn-select-${reg.id}" class="flex-1 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold py-1.5 px-3 rounded transition flex items-center justify-center gap-1 shadow-md">
              ${isSelected ? '✓ Wilayah Terpilih' : '🎯 Pilih & Buka Grafik'}
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
            handleSelectKecamatanOnMap(reg);
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
    pinnedKecamatans,
    showKecamatanLayer,
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
    <div className="relative w-full h-[540px] lg:h-[620px] rounded-2xl overflow-hidden border border-slate-800 bg-slate-950 shadow-2xl">
      {/* Map Target Container */}
      <div ref={mapContainerRef} className="w-full h-full z-0" />

      {/* Top Floating Control Bar */}
      <div className="absolute top-3 left-3 right-3 z-10 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
        {/* Left Actions: Island Filters & Kecamatan Search Trigger */}
        <div className="flex items-center gap-1.5 pointer-events-auto flex-wrap">
          {/* Kecamatan Search & Presets Button */}
          <button
            onClick={() => setIsSearchPanelOpen(!isSearchPanelOpen)}
            className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 shadow-lg backdrop-blur-md transition ${
              isSearchPanelOpen
                ? 'bg-cyan-500 text-slate-950 border-cyan-400'
                : 'bg-slate-900/90 text-cyan-300 border-cyan-500/60 hover:bg-slate-800'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>Pilih Per Kecamatan</span>
            <span className="text-[10px] px-1.5 py-0.2 bg-cyan-950 text-cyan-300 rounded font-mono border border-cyan-800">
              Se-Indonesia
            </span>
          </button>

          {/* Island Filters */}
          <div className="flex items-center gap-1 bg-slate-900/90 backdrop-blur-md p-1.5 rounded-xl border border-slate-700/80 shadow-lg overflow-x-auto max-w-full">
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
        </div>

        {/* Right Layer & Filter Buttons */}
        <div className="flex items-center gap-1.5 bg-slate-900/90 backdrop-blur-md p-1.5 rounded-xl border border-slate-700/80 shadow-lg pointer-events-auto">
          {/* Toggle Earthquake Layer */}
          <button
            onClick={() => setShowEarthquakeLayer(!showEarthquakeLayer)}
            className={`p-1.5 rounded-lg border text-xs flex items-center gap-1 font-medium transition ${
              showEarthquakeLayer
                ? 'bg-rose-500/20 border-rose-500/60 text-rose-300 font-bold'
                : 'bg-slate-800/80 border-slate-700 text-slate-400'
            }`}
            title="Tampilkan / Sembunyikan Layer Gempa Bumi Real-Time di Peta"
          >
            <Activity className="w-3.5 h-3.5 text-rose-400 animate-pulse" />
            <span className="hidden sm:inline">Gempa ({earthquakes.length})</span>
          </button>

          {/* Toggle Kecamatan Layer */}
          <button
            onClick={() => setShowKecamatanLayer(!showKecamatanLayer)}
            className={`p-1.5 rounded-lg border text-xs flex items-center gap-1 font-medium transition ${
              showKecamatanLayer
                ? 'bg-cyan-500/20 border-cyan-500/60 text-cyan-300 font-bold'
                : 'bg-slate-800/80 border-slate-700 text-slate-400'
            }`}
            title="Tampilkan / Sembunyikan Titik Kecamatan di Peta"
          >
            <Home className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Titik Kec. ({pinnedKecamatans.length})</span>
          </button>

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

      {/* Floating Kecamatan Search & Selection Panel on Map */}
      {isSearchPanelOpen && (
        <div className="absolute top-16 left-3 z-20 w-80 sm:w-96 bg-slate-900/95 backdrop-blur-md border border-cyan-500/50 rounded-2xl p-3.5 shadow-2xl space-y-3 pointer-events-auto animate-in fade-in zoom-in-95">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-cyan-400" />
              <span className="text-xs font-bold text-white">Cari & Pilih Kecamatan di Peta</span>
            </div>
            <button
              onClick={() => setIsSearchPanelOpen(false)}
              className="text-slate-400 hover:text-white p-1 rounded-lg"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Tab Switcher */}
          <div className="grid grid-cols-2 gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setActiveKecamatanTab('presets')}
              className={`py-1 text-xs font-semibold rounded-lg transition ${
                activeKecamatanTab === 'presets'
                  ? 'bg-cyan-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Kecamatan Populer
            </button>
            <button
              onClick={() => setActiveKecamatanTab('search')}
              className={`py-1 text-xs font-semibold rounded-lg transition ${
                activeKecamatanTab === 'search'
                  ? 'bg-cyan-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Cari Se-Indonesia
            </button>
          </div>

          {/* Search Box */}
          {activeKecamatanTab === 'search' && (
            <div className="space-y-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Ketik nama kecamatan (Menteng, Sukajadi, Lembang, Ubud, Cisarua)..."
                  value={kecamatanSearchQuery}
                  onChange={(e) => setKecamatanSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-8 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                  autoFocus
                />
                {isSearchingKecamatan && (
                  <Loader2 className="w-3.5 h-3.5 text-cyan-400 animate-spin absolute right-3 top-1/2 -translate-y-1/2" />
                )}
              </div>

              {/* Search Results */}
              <div className="max-h-48 overflow-y-auto space-y-1 pr-1">
                {kecamatanSearchResults.length === 0 ? (
                  <div className="text-center py-4 text-[11px] text-slate-400">
                    {kecamatanSearchQuery.length >= 2
                      ? (isSearchingKecamatan ? 'Sedang mencari kecamatan...' : 'Tidak ditemukan kecamatan dengan nama tersebut.')
                      : 'Ketik minimal 2 huruf untuk mencari lebih dari 7.000+ kecamatan se-Indonesia.'}
                  </div>
                ) : (
                  kecamatanSearchResults.map((kec) => (
                    <button
                      key={kec.id}
                      onClick={() => handleSelectKecamatanOnMap(kec)}
                      className="w-full text-left p-2 rounded-xl bg-slate-950/80 border border-slate-800 hover:border-cyan-500/60 hover:bg-slate-800 flex items-center justify-between transition group"
                    >
                      <div className="overflow-hidden">
                        <div className="text-xs font-bold text-white group-hover:text-cyan-300 truncate">
                          {kec.name}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {kec.province} &bull; {kec.elevationMeters} mdpl
                        </div>
                      </div>
                      <Navigation className="w-3.5 h-3.5 text-cyan-400 shrink-0 group-hover:translate-x-0.5 transition-transform" />
                    </button>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Preset Buttons */}
          {activeKecamatanTab === 'presets' && (
            <div className="space-y-1.5">
              <div className="text-[10px] text-slate-400">Pilih cepat kecamatan observasi utama:</div>
              <div className="max-h-48 overflow-y-auto space-y-1 pr-1">
                {POPULAR_KECAMATAN_PRESETS.map((kec) => {
                  const isSelected = selectedRegion?.id === kec.id;
                  const data = rainfallDataMap[kec.id];
                  return (
                    <button
                      key={kec.id}
                      onClick={() => handleSelectKecamatanOnMap(kec)}
                      className={`w-full text-left p-2 rounded-xl border flex items-center justify-between transition ${
                        isSelected
                          ? 'bg-cyan-950 border-cyan-500 text-white'
                          : 'bg-slate-950/80 border-slate-800 text-slate-200 hover:bg-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div>
                        <div className="text-xs font-bold text-white">{kec.name}</div>
                        <div className="text-[10px] text-slate-400">{kec.province} &bull; {kec.elevationMeters} mdpl</div>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800">
                          {data ? `${data.currentRainfall} mm` : 'Lihat'}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="pt-1 border-t border-slate-800 flex items-center justify-between text-[10px] text-slate-500">
            <span>💡 Klik titik mana saja di peta untuk menganalisis</span>
          </div>
        </div>
      )}

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
              <div className="text-[10px] text-cyan-400 flex items-center gap-1">
                {selectedRegion.type === 'Kecamatan' && (
                  <span className="px-1 py-0.2 bg-cyan-950 text-cyan-300 border border-cyan-800 rounded text-[8px] font-bold">
                    KECAMATAN
                  </span>
                )}
                <span>{selectedRegion.province}</span>
              </div>
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
