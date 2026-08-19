import { 
  Region, 
  LiveRainfallData, 
  RainfallIntensityLevel, 
  AlertSeverity, 
  EarlyWarningAlert,
  HourlyRainfall,
  DailyForecast
} from '../types';

export function getBMKGIntensity(hourlyMm: number, dailyMm?: number): RainfallIntensityLevel {
  if (hourlyMm > 30 || (dailyMm !== undefined && dailyMm > 150)) return 'ekstrem';
  if (hourlyMm > 20 || (dailyMm !== undefined && dailyMm > 100)) return 'sangat_lebat';
  if (hourlyMm >= 10 || (dailyMm !== undefined && dailyMm >= 50)) return 'lebat';
  if (hourlyMm >= 5 || (dailyMm !== undefined && dailyMm >= 20)) return 'sedang';
  if (hourlyMm >= 1 || (dailyMm !== undefined && dailyMm >= 5)) return 'ringan';
  if (hourlyMm > 0) return 'sangat_ringan';
  return 'berawan';
}

export function getSeverityFromIntensity(level: RainfallIntensityLevel, hourlyMm: number, hourlyThreshold = 10): AlertSeverity {
  if (level === 'ekstrem') return 'awas';
  if (level === 'sangat_lebat') return 'siaga';
  if (level === 'lebat' || hourlyMm >= hourlyThreshold) return 'waspada';
  return 'normal';
}

export function getWMODescription(wmoCode: number): string {
  switch (wmoCode) {
    case 0: return 'Cerah';
    case 1: return 'Cerah Berawan';
    case 2: return 'Sebagian Berawan';
    case 3: return 'Mendung / Berawan Tebal';
    case 45: return 'Berkabut';
    case 48: return 'Kabut Tebal Berembun';
    case 51: return 'Gerimis Halus';
    case 53: return 'Gerimis Sedang';
    case 55: return 'Gerimis Lebat';
    case 61: return 'Hujan Ringan';
    case 63: return 'Hujan Sedang';
    case 65: return 'Hujan Lebat';
    case 80: return 'Hujan Lokal Ringan';
    case 81: return 'Hujan Lokal Sedang';
    case 82: return 'Hujan Deras / Badai Lokal';
    case 95: return 'Hujan Petir Ringan-Sedang';
    case 96: return 'Hujan Petir Disertai Butiran Es';
    case 99: return 'Hujan Badai Petir Ekstrem';
    default: return 'Kondisi Atmosferik Dinamis';
  }
}

const INDONESIAN_DAYS = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

// In-memory cache to prevent spamming API
const memoryCache: Record<string, { data: LiveRainfallData; timestamp: number }> = {};
const CACHE_DURATION = 90 * 1000; // 90 seconds cache

export async function fetchLiveRainfallForRegion(region: Region, userHourlyThreshold = 10): Promise<LiveRainfallData> {
  const cacheKey = `${region.id}-${userHourlyThreshold}`;
  const now = Date.now();

  if (memoryCache[cacheKey] && (now - memoryCache[cacheKey].timestamp < CACHE_DURATION)) {
    return memoryCache[cacheKey].data;
  }

  try {
    const tzParam = region.timezone === 'WIT' ? 'Asia%2FJayapura' : region.timezone === 'WITA' ? 'Asia%2FMakassar' : 'Asia%2FJakarta';
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${region.lat}&longitude=${region.lng}&current=temperature_2m,relative_humidity_2m,precipitation,rain,weather_code,cloud_cover,wind_speed_10m&hourly=precipitation,precipitation_probability,temperature_2m,relative_humidity_2m,cloud_cover,wind_speed_10m&daily=weather_code,precipitation_sum,precipitation_probability_max,temperature_2m_max,temperature_2m_min&past_days=1&forecast_days=7&timezone=${tzParam}`;

    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Open-Meteo API returned HTTP ${res.status}`);
    }

    const json = await res.json();
    const current = json.current || {};
    const hourly = json.hourly || {};
    const daily = json.daily || {};

    const currentRainfall = Number(current.precipitation ?? current.rain ?? 0);
    const temperature = Number(current.temperature_2m ?? 28);
    const humidity = Number(current.relative_humidity_2m ?? 80);
    const windSpeed = Number(current.wind_speed_10m ?? 10);
    const cloudCover = Number(current.cloud_cover ?? 50);
    const weatherCode = Number(current.weather_code ?? 2);
    const weatherDescription = getWMODescription(weatherCode);

    // Parse Hourly (past 24h + next 24h)
    const hourlyHistory: HourlyRainfall[] = [];
    const hourlyTimes: string[] = hourly.time || [];
    const hourlyPrecip: number[] = hourly.precipitation || [];
    const hourlyPop: number[] = hourly.precipitation_probability || [];
    const hourlyTemp: number[] = hourly.temperature_2m || [];
    const hourlyHum: number[] = hourly.relative_humidity_2m || [];
    const hourlyCloud: number[] = hourly.cloud_cover || [];
    const hourlyWind: number[] = hourly.wind_speed_10m || [];

    // Current time index in hourly
    const currentIso = current.time || new Date().toISOString();
    let currentIndex = hourlyTimes.findIndex(t => t >= currentIso);
    if (currentIndex === -1) currentIndex = Math.min(24, hourlyTimes.length - 1);

    // Get 24h past + 12h forecast
    const startIndex = Math.max(0, currentIndex - 23);
    const endIndex = Math.min(hourlyTimes.length, currentIndex + 13);

    let past24Sum = 0;
    for (let i = startIndex; i <= currentIndex; i++) {
      past24Sum += Number(hourlyPrecip[i] || 0);
    }

    let next24Sum = 0;
    for (let i = currentIndex; i < Math.min(hourlyTimes.length, currentIndex + 24); i++) {
      next24Sum += Number(hourlyPrecip[i] || 0);
    }

    for (let i = startIndex; i < endIndex; i++) {
      const tStr = hourlyTimes[i];
      const d = new Date(tStr);
      const formattedTime = `${String(d.getHours()).padStart(2, '0')}:00`;
      hourlyHistory.push({
        time: formattedTime,
        timestamp: d.getTime(),
        rainfall: Number((hourlyPrecip[i] || 0).toFixed(1)),
        precipitationProb: Number(hourlyPop[i] || 0),
        temperature: Number((hourlyTemp[i] || 27).toFixed(1)),
        humidity: Number(hourlyHum[i] || 75),
        cloudCover: Number(hourlyCloud[i] || 50),
        windSpeed: Number((hourlyWind[i] || 10).toFixed(1)),
      });
    }

    // Parse Daily 7 Days Forecast
    const dailyForecast: DailyForecast[] = [];
    const dailyTimes: string[] = daily.time || [];
    const dailyPrecipSum: number[] = daily.precipitation_sum || [];
    const dailyPopMax: number[] = daily.precipitation_probability_max || [];
    const dailyMaxTemp: number[] = daily.temperature_2m_max || [];
    const dailyMinTemp: number[] = daily.temperature_2m_min || [];
    const dailyWmo: number[] = daily.weather_code || [];

    for (let i = 0; i < dailyTimes.length; i++) {
      const d = new Date(dailyTimes[i]);
      const dayName = i === 0 ? 'Hari Ini' : i === 1 ? 'Besok' : INDONESIAN_DAYS[d.getDay()];
      dailyForecast.push({
        date: dailyTimes[i],
        dayName,
        rainfallSum: Number((dailyPrecipSum[i] || 0).toFixed(1)),
        rainProbMax: Number(dailyPopMax[i] || 0),
        maxTemp: Number((dailyMaxTemp[i] || 32).toFixed(1)),
        minTemp: Number((dailyMinTemp[i] || 24).toFixed(1)),
        weatherCode: Number(dailyWmo[i] || 2),
        weatherDescription: getWMODescription(dailyWmo[i] || 2),
      });
    }

    const intensityLevel = getBMKGIntensity(currentRainfall, past24Sum);
    const alertSeverity = getSeverityFromIntensity(intensityLevel, currentRainfall, userHourlyThreshold);

    const resultData: LiveRainfallData = {
      regionId: region.id,
      currentRainfall: Number(currentRainfall.toFixed(1)),
      rainfallPast24h: Number(past24Sum.toFixed(1)),
      rainfallNext24h: Number(next24Sum.toFixed(1)),
      precipitationProbability: Number(hourlyPop[currentIndex] || 0),
      temperature,
      humidity,
      windSpeed,
      cloudCover,
      weatherCode,
      weatherDescription,
      intensityLevel,
      alertSeverity,
      lastUpdated: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) + ' ' + region.timezone,
      hourlyHistory,
      dailyForecast,
      isSimulatedFallback: false,
    };

    memoryCache[cacheKey] = { data: resultData, timestamp: now };
    return resultData;

  } catch (err) {
    console.warn(`Fallback simulated data for region ${region.name}:`, err);
    return generateFallbackRainfallData(region, userHourlyThreshold);
  }
}

// Fallback data generator with realistic tropical Indonesian climate fluctuations
function generateFallbackRainfallData(region: Region, userHourlyThreshold: number): LiveRainfallData {
  const seed = region.lat * 100 + region.lng * 10;
  const currentHour = new Date().getHours();
  // Indonesian rainfall often peaks during afternoon 13:00 - 18:00
  const afternoonBoost = (currentHour >= 13 && currentHour <= 19) ? 1.8 : 0.4;
  const rawBase = Math.abs(Math.sin(seed + currentHour)) * 12 * afternoonBoost;
  
  // Bogor and high-elevation regions have higher tendency
  const elevationFactor = region.elevationMeters > 200 ? 1.5 : 1.0;
  const currentRainfall = Number((rawBase * elevationFactor).toFixed(1));
  const past24Sum = Number((currentRainfall * 5.2 + Math.abs(Math.cos(seed)) * 25).toFixed(1));
  const next24Sum = Number((currentRainfall * 4.8 + 15).toFixed(1));

  const hourlyHistory: HourlyRainfall[] = [];
  for (let i = 23; i >= 0; i--) {
    const h = (currentHour - i + 24) % 24;
    const timeStr = `${String(h).padStart(2, '0')}:00`;
    const hBoost = (h >= 13 && h <= 19) ? 2.0 : 0.3;
    const hRain = Number((Math.abs(Math.sin(seed + h * 0.7)) * 10 * hBoost * (elevationFactor * 0.8)).toFixed(1));
    hourlyHistory.push({
      time: timeStr,
      timestamp: Date.now() - i * 3600000,
      rainfall: hRain,
      precipitationProb: Math.min(100, Math.round(hRain * 7 + 20)),
      temperature: Number((31 - Math.sin(h * 0.26) * 4).toFixed(1)),
      humidity: Math.min(98, Math.round(70 + hRain * 2.5)),
      cloudCover: Math.min(100, Math.round(40 + hRain * 5)),
      windSpeed: Number((8 + Math.abs(Math.sin(h)) * 14).toFixed(1)),
    });
  }

  const dailyForecast: DailyForecast[] = [];
  for (let d = 0; d < 7; d++) {
    const dateObj = new Date();
    dateObj.setDate(dateObj.getDate() + d);
    const dayName = d === 0 ? 'Hari Ini' : d === 1 ? 'Besok' : INDONESIAN_DAYS[dateObj.getDay()];
    const dRain = Number((Math.abs(Math.sin(seed + d * 1.3)) * 40 * elevationFactor).toFixed(1));
    dailyForecast.push({
      date: dateObj.toISOString().split('T')[0],
      dayName,
      rainfallSum: dRain,
      maxTemp: Number((31 + Math.sin(d) * 2).toFixed(1)),
      minTemp: Number((23 + Math.cos(d) * 1.5).toFixed(1)),
      rainProbMax: Math.min(95, Math.round(dRain * 2 + 25)),
      weatherCode: dRain > 25 ? 65 : dRain > 10 ? 63 : dRain > 2 ? 61 : 2,
      weatherDescription: dRain > 25 ? 'Hujan Lebat' : dRain > 10 ? 'Hujan Sedang' : dRain > 2 ? 'Hujan Ringan' : 'Cerah Berawan',
    });
  }

  const intensityLevel = getBMKGIntensity(currentRainfall, past24Sum);
  const alertSeverity = getSeverityFromIntensity(intensityLevel, currentRainfall, userHourlyThreshold);

  return {
    regionId: region.id,
    currentRainfall,
    rainfallPast24h: past24Sum,
    rainfallNext24h: next24Sum,
    precipitationProbability: Math.min(100, Math.round(currentRainfall * 7 + 25)),
    temperature: 28.5,
    humidity: 84,
    windSpeed: 12,
    cloudCover: 75,
    weatherCode: currentRainfall > 15 ? 65 : currentRainfall > 5 ? 63 : 61,
    weatherDescription: getWMODescription(currentRainfall > 15 ? 65 : currentRainfall > 5 ? 63 : 61),
    intensityLevel,
    alertSeverity,
    lastUpdated: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) + ' ' + region.timezone,
    hourlyHistory,
    dailyForecast,
    isSimulatedFallback: true,
  };
}

export function generateAlertsForRegions(
  regions: Region[],
  rainfallDataMap: Record<string, LiveRainfallData>,
  userHourlyThreshold = 10
): EarlyWarningAlert[] {
  const alerts: EarlyWarningAlert[] = [];

  for (const region of regions) {
    const data = rainfallDataMap[region.id];
    if (!data) continue;

    if (data.currentRainfall >= userHourlyThreshold || data.rainfallPast24h >= 50 || data.alertSeverity !== 'normal') {
      let severity: AlertSeverity = data.alertSeverity;
      if (severity === 'normal' && data.currentRainfall >= userHourlyThreshold) {
        severity = 'waspada';
      }

      const isExtreme = data.currentRainfall > 30 || data.rainfallPast24h > 150;
      const isVeryHeavy = data.currentRainfall > 20 || data.rainfallPast24h > 100;

      const title = isExtreme 
        ? `PERINGATAN DINI EKSTREM: Hujan Sangat Lebat Disertai Petir di ${region.name}`
        : isVeryHeavy
        ? `SIAGA CUACA: Curah Hujan Sangat Lebat di ${region.name}`
        : `WASPADA HUJAN: Intensitas Hujan Meningkat di ${region.name}`;

      const impactRisk = isExtreme ? 'Sangat Tinggi / Kritis' : isVeryHeavy ? 'Tinggi' : 'Sedang';

      const recommendations: string[] = [];
      if (isExtreme || isVeryHeavy) {
        recommendations.push('Waspadai banjir luapan DAS / saluran drainase perkotaan.');
        recommendations.push('Hindari berteduh di bawah pohon besar, baliho, dan lereng rawan longsor.');
        recommendations.push('Pantau tinggi muka air (TMA) pintu air dan bersiap evakuasi mandiri bila perlu.');
      } else {
        recommendations.push('Sediakan payung/jas hujan dan berhati-hati terhadap genangan air di jalan raya.');
        recommendations.push('Periksa kebersihan saluran air lingkungan sekitar pemukiman.');
      }

      alerts.push({
        id: `alert-${region.id}-${Date.now()}`,
        regionId: region.id,
        regionName: region.name,
        province: region.province,
        currentRainfall: data.currentRainfall,
        rainfallPast24h: data.rainfallPast24h,
        severity,
        intensityLevel: data.intensityLevel,
        issuedAt: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
        title,
        description: `Terdeteksi curah hujan ${data.currentRainfall} mm/jam (Akumulasi 24 Jam: ${data.rainfallPast24h} mm) pada Stasiun Meteorologi ${region.stationCode}.`,
        impactRisk,
        recommendations,
      });
    }
  }

  // Sort by highest rainfall & severity
  alerts.sort((a, b) => b.currentRainfall - a.currentRainfall);
  return alerts;
}

// Web Audio API Synth Alarm for Early Warning Alert
export function playEWSAlertSound(severity: AlertSeverity = 'siaga') {
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = severity === 'awas' ? 'sawtooth' : 'sine';
    
    // Siren tone sequence
    if (severity === 'awas') {
      osc.frequency.setValueAtTime(880, now);
      osc.frequency.exponentialRampToValueAtTime(440, now + 0.25);
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.5);
      osc.frequency.exponentialRampToValueAtTime(440, now + 0.75);
    } else {
      osc.frequency.setValueAtTime(587.33, now); // D5
      osc.frequency.setValueAtTime(880, now + 0.15); // A5
      osc.frequency.setValueAtTime(1174.66, now + 0.3); // D6
    }

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.18, now + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.85);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.9);
  } catch (e) {
    console.log('Audio playback prevented or unsupported:', e);
  }
}
