import React, { useState } from 'react';
import { 
  ResponsiveContainer, 
  ComposedChart, 
  Bar, 
  Line, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid, 
  ReferenceLine,
  AreaChart,
  Area
} from 'recharts';
import { Region, LiveRainfallData, HourlyRainfall, DailyForecast } from '../types';
import { BMKG_RAINFALL_STANDARDS } from '../data/indonesiaRegions';
import { 
  BarChart3, 
  Calendar, 
  Droplets, 
  Wind, 
  Thermometer, 
  CloudRain, 
  Clock, 
  Activity, 
  ShieldAlert, 
  TrendingUp,
  AlertCircle
} from 'lucide-react';

interface RainfallChartsProps {
  region: Region;
  data: LiveRainfallData | null;
  userHourlyThreshold: number;
}

export const RainfallCharts: React.FC<RainfallChartsProps> = ({
  region,
  data,
  userHourlyThreshold,
}) => {
  const [activeTab, setActiveTab] = useState<'hourly' | 'daily' | 'atmospheric'>('hourly');

  if (!data) {
    return (
      <div className="w-full h-80 bg-slate-900/60 rounded-2xl border border-slate-800 flex items-center justify-center text-slate-400 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
          <span>Memuat data hidrometeorologi stasiun {region.name}...</span>
        </div>
      </div>
    );
  }

  const standard = BMKG_RAINFALL_STANDARDS.find((s) => s.level === data.intensityLevel) || BMKG_RAINFALL_STANDARDS[0];

  // Custom Tooltip for 24-hour chart
  const CustomHourlyTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const pData: HourlyRainfall = payload[0]?.payload;
      return (
        <div className="bg-slate-950/95 border border-slate-700 p-3 rounded-xl shadow-2xl backdrop-blur-md text-xs font-sans">
          <div className="font-bold text-cyan-400 mb-1 flex items-center justify-between gap-3">
            <span>Pukul {label}</span>
            <span className="text-[10px] text-slate-400">{region.timezone}</span>
          </div>
          <div className="space-y-1 text-slate-200">
            <div className="flex justify-between gap-4">
              <span className="text-slate-400">Curah Hujan:</span>
              <span className="font-bold text-cyan-300">{pData.rainfall} mm</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-slate-400">Peluang Hujan:</span>
              <span className="font-semibold text-blue-400">{pData.precipitationProb}%</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-slate-400">Suhu Udara:</span>
              <span className="font-semibold text-amber-300">{pData.temperature}°C</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-slate-400">Kelembaban:</span>
              <span className="font-semibold text-emerald-300">{pData.humidity}%</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-slate-400">Kecepatan Angin:</span>
              <span className="font-semibold text-slate-300">{pData.windSpeed} km/jam</span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  // Custom Tooltip for 7-day forecast chart
  const CustomDailyTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const pData: DailyForecast = payload[0]?.payload;
      return (
        <div className="bg-slate-950/95 border border-slate-700 p-3 rounded-xl shadow-2xl backdrop-blur-md text-xs font-sans">
          <div className="font-bold text-cyan-400 mb-1">
            {pData.dayName} ({pData.date})
          </div>
          <div className="space-y-1 text-slate-200">
            <div className="flex justify-between gap-4">
              <span className="text-slate-400">Prediksi Hujan:</span>
              <span className="font-bold text-cyan-300">{pData.rainfallSum} mm/hari</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-slate-400">Peluang Hujan Maks:</span>
              <span className="font-semibold text-blue-400">{pData.rainProbMax}%</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-slate-400">Suhu:</span>
              <span className="font-semibold text-amber-300">{pData.minTemp}°C - {pData.maxTemp}°C</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-slate-400">Prakiraan:</span>
              <span className="font-semibold text-slate-300">{pData.weatherDescription}</span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  // Calculate stats
  const maxHourlyRain = Math.max(...data.hourlyHistory.map(h => h.rainfall), 0);
  const avgHumidity = Math.round(data.hourlyHistory.reduce((acc, h) => acc + h.humidity, 0) / (data.hourlyHistory.length || 1));

  return (
    <div className="bg-slate-900/90 backdrop-blur-md rounded-2xl border border-slate-800 p-4 lg:p-6 shadow-xl space-y-6">
      {/* Top Header & Key Metrics for Selected Region */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-cyan-950 text-cyan-400 border border-cyan-800">
              {region.province}
            </span>
            <span className="text-xs text-slate-400 font-mono">Stasiun: {region.stationCode}</span>
          </div>
          <h2 className="text-xl lg:text-2xl font-bold text-white mt-1 flex items-center gap-2">
            {region.name}
            <span className="text-sm font-normal text-slate-400">({region.elevationMeters} mdpl)</span>
          </h2>
        </div>

        {/* Live Status Badge */}
        <div className="flex items-center gap-3">
          <div className={`px-3 py-1.5 rounded-xl border flex items-center gap-2 ${standard.bgColor} ${standard.borderColor}`}>
            <span className="w-2.5 h-2.5 rounded-full animate-ping" style={{ backgroundColor: standard.color }}></span>
            <div>
              <div className="text-[10px] uppercase font-bold text-slate-400">Status BMKG</div>
              <div className="text-xs font-bold text-white">{standard.name}</div>
            </div>
          </div>
          <div className="bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-700/60">
            <div className="text-[10px] text-slate-400">Update Terakhir</div>
            <div className="text-xs font-semibold text-slate-200 flex items-center gap-1">
              <Clock className="w-3 h-3 text-cyan-400" />
              {data.lastUpdated}
            </div>
          </div>
        </div>
      </div>

      {/* 4 Quick Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Curah Hujan Saat Ini */}
        <div className="bg-slate-950/70 p-3.5 rounded-xl border border-slate-800 hover:border-cyan-500/40 transition">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-medium">Curah Hujan Saat Ini</span>
            <CloudRain className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-extrabold text-cyan-300">{data.currentRainfall}</span>
            <span className="text-xs text-slate-400">mm/jam</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Peluang Hujan: <span className="text-cyan-400 font-semibold">{data.precipitationProbability}%</span>
          </div>
        </div>

        {/* Akumulasi 24 Jam */}
        <div className="bg-slate-950/70 p-3.5 rounded-xl border border-slate-800 hover:border-blue-500/40 transition">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-medium">Akumulasi 24 Jam Terakhir</span>
            <Activity className="w-4 h-4 text-blue-400" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-extrabold text-blue-300">{data.rainfallPast24h}</span>
            <span className="text-xs text-slate-400">mm</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Prediksi 24 Jam ke Depan: <span className="text-blue-400 font-semibold">{data.rainfallNext24h} mm</span>
          </div>
        </div>

        {/* Suhu & Kelembaban */}
        <div className="bg-slate-950/70 p-3.5 rounded-xl border border-slate-800 hover:border-amber-500/40 transition">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-medium">Suhu & Kelembaban</span>
            <Thermometer className="w-4 h-4 text-amber-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-amber-300">{data.temperature}°C</span>
            <span className="text-sm font-semibold text-emerald-400">/ {data.humidity}%</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Angin: <span className="text-slate-200 font-medium">{data.windSpeed} km/jam</span>
          </div>
        </div>

        {/* Tingkat Risiko Banjir / Genangan */}
        <div className="bg-slate-950/70 p-3.5 rounded-xl border border-slate-800 hover:border-rose-500/40 transition">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-medium">Indeks Potensi Genangan</span>
            <ShieldAlert className="w-4 h-4 text-rose-400" />
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-base font-extrabold uppercase ${
              data.alertSeverity === 'awas' ? 'text-rose-400' :
              data.alertSeverity === 'siaga' ? 'text-orange-400' :
              data.alertSeverity === 'waspada' ? 'text-amber-400' :
              'text-emerald-400'
            }`}>
              {data.alertSeverity === 'awas' ? 'Bahaya Tinggi' :
               data.alertSeverity === 'siaga' ? 'Siaga Genangan' :
               data.alertSeverity === 'waspada' ? 'Waspada' : 'Aman Terkendali'}
            </span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1 truncate">
            {standard.description}
          </div>
        </div>
      </div>

      {/* Chart Navigation Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
        <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => setActiveTab('hourly')}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition flex items-center gap-1.5 ${
              activeTab === 'hourly'
                ? 'bg-cyan-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            Grafik 24 Jam (Historis & Tren)
          </button>
          <button
            onClick={() => setActiveTab('daily')}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition flex items-center gap-1.5 ${
              activeTab === 'daily'
                ? 'bg-cyan-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            Prakiraan 7 Hari ke Depan
          </button>
          <button
            onClick={() => setActiveTab('atmospheric')}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition flex items-center gap-1.5 ${
              activeTab === 'atmospheric'
                ? 'bg-cyan-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            Korelasi Atmosferik
          </button>
        </div>

        {/* Legend Indicators */}
        <div className="flex items-center gap-3 text-[11px] text-slate-400">
          <div className="flex items-center gap-1">
            <span className="w-3 h-3 bg-cyan-500 rounded-sm"></span>
            <span>Curah Hujan (mm)</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-3 h-1 bg-amber-400 rounded-full"></span>
            <span>Garis Ambang Waspada ({userHourlyThreshold} mm)</span>
          </div>
        </div>
      </div>

      {/* Chart Visuals Rendering */}
      <div className="w-full h-72 lg:h-80 pt-2">
        {activeTab === 'hourly' && (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={data.hourlyHistory}
              margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
            >
              <defs>
                <linearGradient id="rainBarGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#06b6d4" stopOpacity={0.9} />
                  <stop offset="100%" stopColor="#0284c7" stopOpacity={0.3} />
                </linearGradient>
                <linearGradient id="popAreaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.25} />
                  <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
              <XAxis 
                dataKey="time" 
                stroke="#64748b" 
                fontSize={11} 
                tickLine={false} 
              />
              <YAxis 
                yAxisId="rain" 
                stroke="#06b6d4" 
                fontSize={11} 
                tickLine={false}
                unit=" mm" 
              />
              <YAxis 
                yAxisId="pop" 
                orientation="right" 
                stroke="#3b82f6" 
                fontSize={11} 
                tickLine={false}
                unit="%" 
                domain={[0, 100]}
              />
              <Tooltip content={<CustomHourlyTooltip />} />
              <ReferenceLine 
                yAxisId="rain" 
                y={userHourlyThreshold} 
                stroke="#f59e0b" 
                strokeDasharray="4 4" 
                label={{ value: 'Ambang Batas', fill: '#f59e0b', fontSize: 10, position: 'insideTopRight' }} 
              />
              <ReferenceLine 
                yAxisId="rain" 
                y={20} 
                stroke="#ef4444" 
                strokeDasharray="4 4" 
                label={{ value: 'Siaga 20mm', fill: '#ef4444', fontSize: 10, position: 'insideTopRight' }} 
              />
              <Area 
                yAxisId="pop" 
                type="monotone" 
                dataKey="precipitationProb" 
                stroke="#3b82f6" 
                strokeWidth={1.5}
                fill="url(#popAreaGrad)" 
              />
              <Bar 
                yAxisId="rain" 
                dataKey="rainfall" 
                fill="url(#rainBarGrad)" 
                radius={[4, 4, 0, 0]} 
                maxBarSize={28}
              />
            </ComposedChart>
          </ResponsiveContainer>
        )}

        {activeTab === 'daily' && (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={data.dailyForecast}
              margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
            >
              <defs>
                <linearGradient id="dailyBarGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity={0.9} />
                  <stop offset="100%" stopColor="#047857" stopOpacity={0.4} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
              <XAxis 
                dataKey="dayName" 
                stroke="#64748b" 
                fontSize={11} 
                tickLine={false} 
              />
              <YAxis 
                yAxisId="rain" 
                stroke="#10b981" 
                fontSize={11} 
                tickLine={false}
                unit=" mm" 
              />
              <YAxis 
                yAxisId="temp" 
                orientation="right" 
                stroke="#f59e0b" 
                fontSize={11} 
                tickLine={false}
                unit="°C" 
              />
              <Tooltip content={<CustomDailyTooltip />} />
              <Bar 
                yAxisId="rain" 
                dataKey="rainfallSum" 
                fill="url(#dailyBarGrad)" 
                radius={[6, 6, 0, 0]} 
                maxBarSize={38}
              />
              <Line 
                yAxisId="temp" 
                type="monotone" 
                dataKey="maxTemp" 
                stroke="#f59e0b" 
                strokeWidth={2}
                dot={{ fill: '#f59e0b', r: 3 }}
              />
              <Line 
                yAxisId="temp" 
                type="monotone" 
                dataKey="minTemp" 
                stroke="#38bdf8" 
                strokeWidth={1.5}
                strokeDasharray="3 3"
                dot={{ fill: '#38bdf8', r: 2 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        )}

        {activeTab === 'atmospheric' && (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={data.hourlyHistory}
              margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
            >
              <defs>
                <linearGradient id="humGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="#10b981" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
              <XAxis dataKey="time" stroke="#64748b" fontSize={11} tickLine={false} />
              <YAxis stroke="#10b981" fontSize={11} tickLine={false} domain={[50, 100]} unit="%" />
              <Tooltip content={<CustomHourlyTooltip />} />
              <Area 
                type="monotone" 
                dataKey="humidity" 
                stroke="#10b981" 
                strokeWidth={2} 
                fill="url(#humGrad)" 
              />
              <Line 
                type="monotone" 
                dataKey="temperature" 
                stroke="#f59e0b" 
                strokeWidth={2} 
                dot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Bottom Insights Note */}
      <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800 text-xs text-slate-300 flex items-start gap-2.5">
        <AlertCircle className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
        <div className="leading-relaxed">
          <span className="font-semibold text-white">Catatan Meteorologi:</span> Curah hujan tertinggi dalam 24 jam terakhir di wilayah ini mencapai <span className="font-bold text-cyan-300">{maxHourlyRain} mm/jam</span> dengan kelembaban rata-rata <span className="font-bold text-emerald-300">{avgHumidity}%</span>. Sistem otomatis memperbarui pembacaan setiap perubahan siklus atmosferik.
        </div>
      </div>
    </div>
  );
};
