export type IslandGroup = 
  | 'Sumatera'
  | 'Jawa'
  | 'Kalimantan'
  | 'Sulawesi'
  | 'Bali & Nusa Tenggara'
  | 'Maluku & Papua';

export type RainfallIntensityLevel = 
  | 'berawan'       // 0 mm/jam
  | 'sangat_ringan' // 0.1 - 1 mm/jam
  | 'ringan'        // 1 - 5 mm/jam
  | 'sedang'        // 5 - 10 mm/jam
  | 'lebat'         // 10 - 20 mm/jam (WASPADA)
  | 'sangat_lebat'  // > 20 mm/jam (SIAGA)
  | 'ekstrem';      // > 30 mm/jam atau > 150 mm/hari (AWAS)

export type AlertSeverity = 'normal' | 'waspada' | 'siaga' | 'awas';

export interface Region {
  id: string;
  name: string;
  type: 'Kota' | 'Kabupaten' | 'Ibukota Provinsi' | 'Kecamatan';
  province: string;
  island: IslandGroup;
  lat: number;
  lng: number;
  elevationMeters: number;
  stationCode: string;
  timezone: 'WIB' | 'WITA' | 'WIT';
}

export interface HourlyRainfall {
  time: string; // ISO or formatted HH:mm
  timestamp: number;
  rainfall: number; // mm
  precipitationProb: number; // %
  temperature: number; // °C
  humidity: number; // %
  cloudCover: number; // %
  windSpeed: number; // km/h
}

export interface DailyForecast {
  date: string; // YYYY-MM-DD
  dayName: string; // Senin, Selasa, dll
  rainfallSum: number; // mm
  maxTemp: number; // °C
  minTemp: number; // °C
  rainProbMax: number; // %
  weatherCode: number;
  weatherDescription: string;
}

export interface LiveRainfallData {
  regionId: string;
  currentRainfall: number; // mm/jam (intensity)
  rainfallPast24h: number; // mm total in past 24 hours
  rainfallNext24h: number; // mm forecasted next 24 hours
  precipitationProbability: number; // %
  temperature: number; // °C
  humidity: number; // %
  windSpeed: number; // km/h
  cloudCover: number; // %
  weatherCode: number;
  weatherDescription: string;
  intensityLevel: RainfallIntensityLevel;
  alertSeverity: AlertSeverity;
  lastUpdated: string;
  hourlyHistory: HourlyRainfall[];
  dailyForecast: DailyForecast[];
  isSimulatedFallback?: boolean;
}

export interface EarlyWarningAlert {
  id: string;
  regionId: string;
  regionName: string;
  province: string;
  currentRainfall: number;
  rainfallPast24h: number;
  severity: AlertSeverity;
  intensityLevel: RainfallIntensityLevel;
  issuedAt: string;
  title: string;
  description: string;
  impactRisk: 'Rendah' | 'Sedang' | 'Tinggi' | 'Sangat Tinggi / Kritis';
  recommendations: string[];
}

export interface UserPreferences {
  favoriteRegionIds: string[];
  hourlyThresholdMm: number; // e.g. 10 mm/h
  dailyThresholdMm: number;  // e.g. 50 mm/day
  soundAlertEnabled: boolean;
  autoRefreshIntervalSeconds: number; // e.g. 60s
  mapTileLayer: 'voyager' | 'dark' | 'osm' | 'satellite';
}

export interface HistoricalDailyData {
  date: string;
  dayName: string;
  rainfall: number; // mm
  maxTemp: number; // °C
  minTemp: number; // °C
  maxWindSpeed: number; // km/h
  weatherCode: number;
  weatherDescription: string;
  intensityCategory: string; // Berawan, Hujan Ringan, Sedang, Lebat, Sangat Lebat/Ekstrem
}

export interface MonthHistorySummary {
  regionId: string;
  regionName: string;
  province: string;
  island: IslandGroup;
  stationCode: string;
  lat: number;
  lng: number;
  elevationMeters: number;
  totalRainfall30d: number;
  maxDailyRain: number;
  maxDailyRainDate: string;
  averageDailyRain: number;
  rainyDaysCount: number;
  heavyRainDaysCount: number;
  extremeRainDaysCount: number;
  startDate?: string;
  endDate?: string;
  totalDays?: number;
  dailyList: HistoricalDailyData[];
}

export type EarthquakeSeverity = 'minor' | 'moderate' | 'strong' | 'major' | 'great';

export interface EarthquakeInfo {
  id: string;
  dateTime: string; // Tanggal & Jam WIB / UTC ISO
  dateStr: string; // "19 Agustus 2026"
  timeStr: string; // "14:20:15 WIB"
  timestamp: number;
  magnitude: number; // e.g. 5.4
  depthKm: number; // Kedalaman km e.g. 10
  depthStr: string; // "10 km"
  lat: number;
  lng: number;
  coordinates: string; // e.g. "6.84 LS, 107.05 BT"
  location: string; // e.g. "Pusat gempa berada di laut 67 km BaratDaya Sumur"
  wilayah: string; // e.g. "Kab. Cianjur, Jawa Barat"
  tsunamiPotential: string; // "Tidak berpotensi TSUNAMI" atau "Waspada / Siaga TSUNAMI"
  isTsunamiWarning: boolean;
  feltAreas?: string; // "MMI III - IV Cianjur, MMI II Sukabumi"
  shakemapUrl?: string; // URL shakemap BMKG
  source: 'BMKG' | 'USGS';
  severity: EarthquakeSeverity;
  timeAgo?: string;
  isLatest?: boolean;
  distanceToSelectedKm?: number;
  estimatedShakingIntensity?: string; // MMI scale estimated
}

export interface EarthquakeFeedData {
  latestAutoEarthquake: EarthquakeInfo | null;
  latestEarthquake?: EarthquakeInfo | null;
  recentEarthquakes: EarthquakeInfo[];
  feltEarthquakes: EarthquakeInfo[];
  allEarthquakes: EarthquakeInfo[];
  lastUpdated: string;
  sourceLabel: string;
}

