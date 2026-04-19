'use client';

import { useEffect, useMemo, useState } from 'react';

type WeatherReport = {
  city: string;
  country?: string | null;
  timezone: string;
  latitude: number;
  longitude: number;
  current: {
    temperature_c: number;
    apparent_temperature_c: number;
    humidity: number;
    description: string;
    weather_code: number;
    is_day: boolean;
    precipitation_mm: number;
    pressure_hpa: number;
    wind_kmh: number;
    wind_direction_deg: number;
    visibility_km: number;
    uv_index: number;
  };
  hourly: Array<{
    time: string;
    temperature_c: number;
    weather_code: number;
    precipitation_probability: number;
  }>;
  daily: Array<{
    date: string;
    weather_code: number;
    description: string;
    temperature_max_c: number;
    temperature_min_c: number;
    sunrise: string;
    sunset: string;
    precipitation_probability_max: number;
  }>;
  air_quality?: {
    us_aqi?: number | null;
    pm2_5?: number | null;
    pm10?: number | null;
  } | null;
};

type Unit = 'C' | 'F';

const STARTER_CITIES = ['Tokyo', 'London', 'Bengaluru', 'Nairobi', 'Reykjavik'];

const formatTemp = (tempC: number, unit: Unit) => {
  if (unit === 'F') {
    return Math.round((tempC * 9) / 5 + 32);
  }
  return Math.round(tempC);
};

const descriptionTheme = (description: string) => {
  const value = description.toLowerCase();
  if (value.includes('rain') || value.includes('storm') || value.includes('drizzle')) {
    return {
      bg: 'from-slate-950 via-blue-900 to-indigo-950',
      glow: 'shadow-[0_0_130px_rgba(56,189,248,0.4)]',
    };
  }
  if (value.includes('cloud') || value.includes('overcast') || value.includes('fog')) {
    return {
      bg: 'from-slate-900 via-slate-700 to-slate-950',
      glow: 'shadow-[0_0_130px_rgba(148,163,184,0.38)]',
    };
  }
  return {
    bg: 'from-[#1f133a] via-[#2d5fa8] to-[#f4a25c]',
    glow: 'shadow-[0_0_130px_rgba(251,191,36,0.3)]',
  };
};

const weatherGlyph = (code: number) => {
  if (code === 0) return 'Clear';
  if (code <= 3) return 'Clouds';
  if (code <= 48) return 'Fog';
  if (code <= 67) return 'Rain';
  if (code <= 77) return 'Snow';
  if (code <= 86) return 'Showers';
  return 'Storm';
};

const shortTime = (raw: string) => {
  const date = new Date(raw);
  if (!Number.isNaN(date.getTime())) {
    return date.toLocaleTimeString([], { hour: 'numeric' });
  }
  return raw.slice(11, 16);
};

const shortDay = (raw: string) => {
  const date = new Date(raw);
  if (!Number.isNaN(date.getTime())) {
    return date.toLocaleDateString([], { weekday: 'short' });
  }
  return raw;
};

const weatherWarnings = (weather: WeatherReport) => {
  const current = weather.current;
  const warnings: string[] = [];
  if (current.uv_index >= 8) warnings.push('Very high UV expected. Use sun protection.');
  if (current.precipitation_mm >= 6) warnings.push('Heavy precipitation in progress.');
  if (current.wind_kmh >= 40) warnings.push('Strong wind advisory active.');
  if (current.temperature_c >= 35) warnings.push('High heat caution for outdoor activities.');
  if (current.temperature_c <= 2) warnings.push('Cold weather caution, especially overnight.');
  if (!warnings.length) warnings.push('No major warnings currently. Conditions are stable.');
  return warnings;
};

const qualityLabel = (aqi?: number | null) => {
  if (aqi == null) return 'Unavailable';
  if (aqi <= 50) return 'Good';
  if (aqi <= 100) return 'Moderate';
  if (aqi <= 150) return 'Unhealthy for sensitive groups';
  if (aqi <= 200) return 'Unhealthy';
  return 'Very unhealthy';
};

export default function Home() {
  const [query, setQuery] = useState('');
  const [weather, setWeather] = useState<WeatherReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [unit, setUnit] = useState<Unit>('C');
  const [favorites, setFavorites] = useState<string[]>(STARTER_CITIES);
  const [recent, setRecent] = useState<string[]>([]);
  const [lastUpdated, setLastUpdated] = useState<string>('');

  useEffect(() => {
    const rawFavorites = localStorage.getItem('weather_favorites');
    const rawRecent = localStorage.getItem('weather_recent');
    if (rawFavorites) {
      try {
        const parsed = JSON.parse(rawFavorites) as string[];
        if (Array.isArray(parsed) && parsed.length) setFavorites(parsed.slice(0, 8));
      } catch {
        // Keep defaults when local storage payload is invalid.
      }
    }
    if (rawRecent) {
      try {
        const parsed = JSON.parse(rawRecent) as string[];
        if (Array.isArray(parsed)) setRecent(parsed.slice(0, 6));
      } catch {
        // Keep empty list when local storage payload is invalid.
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('weather_favorites', JSON.stringify(favorites));
  }, [favorites]);

  useEffect(() => {
    localStorage.setItem('weather_recent', JSON.stringify(recent));
  }, [recent]);

  const theme = descriptionTheme(weather?.current.description ?? 'sunny');
  const warnings = useMemo(() => (weather ? weatherWarnings(weather) : []), [weather]);

  const runSearch = async (cityInput?: string) => {
    const city = (cityInput ?? query).trim();
    if (!city) return;

    setLoading(true);
    setError('');
    try {
      const res = await fetch(`http://127.0.0.1:8000/weather/${encodeURIComponent(city)}`);
      if (!res.ok) throw new Error('Request failed');
      const data = (await res.json()) as WeatherReport;
      setWeather(data);
      setQuery(data.city);
      setLastUpdated(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      setRecent((prev) => [data.city, ...prev.filter((item) => item !== data.city)].slice(0, 6));
    } catch {
      setError('Unable to fetch weather data. Ensure backend is running on 127.0.0.1:8000.');
      setWeather(null);
    } finally {
      setLoading(false);
    }
  };

  const addFavorite = () => {
    const city = query.trim();
    if (!city) return;
    setFavorites((prev) => [city, ...prev.filter((item) => item.toLowerCase() !== city.toLowerCase())].slice(0, 8));
  };

  return (
    <main
      className={`relative min-h-screen overflow-hidden bg-gradient-to-br ${theme.bg} text-white transition-all duration-700`}
    >
      <div className="ambient-layer" />
      <div className={`pointer-events-none absolute inset-0 opacity-60 blur-3xl ${theme.glow}`} />
      <div className="grid-overlay" />

      <section className="relative mx-auto flex w-full max-w-[1260px] flex-col gap-8 px-4 pb-12 pt-8 md:px-8">
        <header className="glass-card reveal-up flex flex-col gap-6 rounded-[2rem] p-6 md:p-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-cyan-100/70">Aeria Weather Studio</p>
              <h1 className="mt-2 text-4xl font-semibold leading-tight md:text-5xl">Complete climate dashboard</h1>
            </div>
            <div className="flex items-center gap-2 rounded-full border border-white/20 bg-black/20 p-1">
              <button
                onClick={() => setUnit('C')}
                className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                  unit === 'C' ? 'bg-white text-slate-900' : 'text-white/80 hover:text-white'
                }`}
              >
                Celsius
              </button>
              <button
                onClick={() => setUnit('F')}
                className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                  unit === 'F' ? 'bg-white text-slate-900' : 'text-white/80 hover:text-white'
                }`}
              >
                Fahrenheit
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-3 md:flex-row">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && runSearch()}
              placeholder="Search city, region, or airport code"
              className="h-14 w-full rounded-2xl border border-white/20 bg-black/25 px-5 text-base text-white placeholder:text-white/55 outline-none transition focus:border-cyan-300/70"
            />
            <button
              onClick={() => runSearch()}
              className="h-14 rounded-2xl bg-gradient-to-r from-cyan-300 to-sky-200 px-8 text-base font-semibold text-slate-900 transition hover:brightness-110"
            >
              Search
            </button>
            <button
              onClick={addFavorite}
              className="h-14 rounded-2xl border border-white/25 bg-white/10 px-6 text-sm font-semibold uppercase tracking-widest text-white transition hover:bg-white/15"
            >
              Save
            </button>
          </div>

          <div className="flex flex-wrap gap-2">
            {favorites.map((city) => (
              <button
                key={city}
                onClick={() => runSearch(city)}
                className="rounded-full border border-white/25 bg-white/10 px-4 py-2 text-sm text-white/85 transition hover:bg-white/20"
              >
                {city}
              </button>
            ))}
          </div>
        </header>

        {loading && (
          <div className="glass-card reveal-up rounded-[1.8rem] p-6 text-lg text-white/90">Syncing live atmosphere data...</div>
        )}

        {error && (
          <div className="reveal-up rounded-[1.8rem] border border-rose-200/40 bg-rose-900/30 p-5 text-rose-100">{error}</div>
        )}

        {!loading && !weather && !error && (
          <div className="glass-card reveal-up rounded-[2rem] p-8 md:p-10">
            <h2 className="text-3xl font-semibold">Search to unlock your full weather cockpit</h2>
            <p className="mt-3 max-w-3xl text-white/80">
              This redesigned app includes live conditions, comfort metrics, air-quality intelligence, hourly temperature curves,
              weekly outlook planning, warning center, and quick city workflows for daily decision making.
            </p>
          </div>
        )}

        {weather && (
          <div className="grid gap-6">
            <section className="grid gap-6 lg:grid-cols-[1.35fr_1fr]">
              <article className="glass-card reveal-up rounded-[2rem] p-8">
                <p className="text-xs uppercase tracking-[0.32em] text-white/65">Current conditions</p>
                <div className="mt-4 flex flex-wrap items-end justify-between gap-5">
                  <div>
                    <h2 className="font-display text-5xl leading-none md:text-7xl">{weather.city}</h2>
                    <p className="mt-3 text-lg capitalize text-white/80">{weather.current.description}</p>
                    <p className="mt-2 text-sm text-white/70">{weatherGlyph(weather.current.weather_code)}</p>
                    <p className="mt-2 text-sm text-white/65">
                      {weather.country ?? 'Unknown'} • {weather.timezone}
                    </p>
                    <p className="mt-2 text-sm text-white/65">Last updated {lastUpdated || '--:--'}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-7xl font-semibold leading-none md:text-8xl">
                      {formatTemp(weather.current.temperature_c, unit)}
                      <span className="text-4xl align-top">{unit}</span>
                    </p>
                    <p className="mt-2 text-base text-white/75">
                      Feels like {formatTemp(weather.current.apparent_temperature_c, unit)} {unit}
                    </p>
                  </div>
                </div>
              </article>

              <article className="glass-card reveal-up rounded-[2rem] p-6">
                <h3 className="text-sm uppercase tracking-[0.28em] text-white/65">Warning center</h3>
                <div className="mt-4 space-y-3">
                  {warnings.map((alert) => (
                    <div key={alert} className="rounded-2xl border border-white/20 bg-black/20 p-4 text-sm text-white/90">
                      {alert}
                    </div>
                  ))}
                </div>
              </article>
            </section>

            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              <MetricCard label="Humidity" value={`${weather.current.humidity}%`} tone="from-cyan-300/30 to-cyan-600/10" />
              <MetricCard label="Wind" value={`${Math.round(weather.current.wind_kmh)} km/h`} tone="from-sky-300/30 to-blue-700/10" />
              <MetricCard label="Pressure" value={`${Math.round(weather.current.pressure_hpa)} hPa`} tone="from-indigo-300/30 to-indigo-800/10" />
              <MetricCard label="Visibility" value={`${weather.current.visibility_km.toFixed(1)} km`} tone="from-emerald-300/30 to-emerald-800/10" />
              <MetricCard label="UV Index" value={`${weather.current.uv_index.toFixed(1)}`} tone="from-amber-200/35 to-orange-700/10" />
              <MetricCard label="Air Quality" value={qualityLabel(weather.air_quality?.us_aqi)} tone="from-pink-300/30 to-violet-800/10" />
            </section>

            <section className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
              <article className="glass-card reveal-up rounded-[2rem] p-6">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-xl font-semibold">Hourly forecast</h3>
                  <p className="text-sm text-white/70">Rain probability + thermal trend</p>
                </div>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
                  {weather.hourly.map((point) => (
                    <div key={point.time} className="rounded-2xl border border-white/20 bg-black/20 p-3 text-center">
                      <p className="text-xs uppercase tracking-wider text-white/65">{shortTime(point.time)}</p>
                      <p className="mt-2 text-2xl font-semibold">{formatTemp(point.temperature_c, unit)}</p>
                      <p className="mt-1 text-xs text-white/70">{point.precipitation_probability}% rain</p>
                    </div>
                  ))}
                </div>
              </article>

              <article className="glass-card reveal-up rounded-[2rem] p-6">
                <h3 className="text-xl font-semibold">Environment</h3>
                <div className="mt-4 space-y-3">
                  <div className="rounded-2xl border border-white/20 bg-black/20 p-4">
                    <p className="text-xs uppercase tracking-widest text-white/65">US AQI</p>
                    <p className="mt-2 text-2xl font-semibold">{weather.air_quality?.us_aqi ?? '--'}</p>
                  </div>
                  <div className="rounded-2xl border border-white/20 bg-black/20 p-4">
                    <p className="text-xs uppercase tracking-widest text-white/65">PM 2.5</p>
                    <p className="mt-2 text-2xl font-semibold">{weather.air_quality?.pm2_5?.toFixed(1) ?? '--'}</p>
                  </div>
                  <div className="rounded-2xl border border-white/20 bg-black/20 p-4">
                    <p className="text-xs uppercase tracking-widest text-white/65">PM 10</p>
                    <p className="mt-2 text-2xl font-semibold">{weather.air_quality?.pm10?.toFixed(1) ?? '--'}</p>
                  </div>
                </div>
              </article>
            </section>

            <section className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
              <article className="glass-card reveal-up rounded-[2rem] p-6">
                <h3 className="text-xl font-semibold">7-day outlook</h3>
                <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  {weather.daily.map((day) => (
                    <div key={day.date} className="rounded-2xl border border-white/20 bg-black/20 p-4">
                      <p className="text-sm font-semibold tracking-wide">{shortDay(day.date)}</p>
                      <p className="mt-2 text-sm text-white/70">{day.description}</p>
                      <p className="mt-3 text-lg font-semibold">
                        {formatTemp(day.temperature_max_c, unit)} / {formatTemp(day.temperature_min_c, unit)} {unit}
                      </p>
                      <p className="mt-2 text-xs text-white/70">Rain {day.precipitation_probability_max}%</p>
                      <p className="mt-2 text-xs text-white/60">Sun {shortTime(day.sunrise)} - {shortTime(day.sunset)}</p>
                    </div>
                  ))}
                </div>
              </article>

              <article className="glass-card reveal-up rounded-[2rem] p-6">
                <h3 className="text-xl font-semibold">Recent cities</h3>
                <div className="mt-4 space-y-2">
                  {recent.length === 0 && <p className="text-sm text-white/70">No recent searches yet.</p>}
                  {recent.map((city) => (
                    <button
                      key={city}
                      onClick={() => runSearch(city)}
                      className="flex w-full items-center justify-between rounded-xl border border-white/20 bg-black/20 px-4 py-3 text-left text-sm transition hover:bg-black/35"
                    >
                      <span>{city}</span>
                      <span className="text-white/60">open</span>
                    </button>
                  ))}
                </div>
              </article>
            </section>
          </div>
        )}
      </section>
    </main>
  );
}

function MetricCard({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <article className={`glass-card reveal-up rounded-3xl bg-gradient-to-br p-5 ${tone}`}>
      <p className="text-xs uppercase tracking-[0.22em] text-white/65">{label}</p>
      <p className="mt-3 text-3xl font-semibold">{value}</p>
    </article>
  );
}
