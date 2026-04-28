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
type WeatherScene = 'sunny' | 'clear' | 'rainy' | 'stormy' | 'cloudy' | 'foggy' | 'snowy';

const STARTER_CITIES = ['Tokyo', 'London', 'Bengaluru', 'Nairobi', 'Reykjavik'];

const formatTemp = (tempC: number, unit: Unit) => {
  if (unit === 'F') {
    return Math.round((tempC * 9) / 5 + 32);
  }
  return Math.round(tempC);
};

const sceneFromWeather = (weather: WeatherReport | null): WeatherScene => {
  if (!weather) return 'clear';
  const code = weather.current.weather_code;
  const desc = weather.current.description.toLowerCase();

  if (code >= 95 || desc.includes('thunder')) return 'stormy';
  if (code >= 51 && code <= 67) return 'rainy';
  if (code >= 80 && code <= 82) return 'rainy';
  if (code >= 71 && code <= 86) return 'snowy';
  if (code === 45 || code === 48 || desc.includes('fog')) return 'foggy';
  if (code >= 1 && code <= 3) return 'cloudy';

  if (code === 0 && weather.current.is_day && weather.current.uv_index >= 5) return 'sunny';
  if (desc.includes('sunny')) return 'sunny';
  return 'clear';
};

const sceneStyles: Record<WeatherScene, { bg: string; glow: string }> = {
  sunny: {
    bg: 'from-[#7a4a00] via-[#f59f0b] to-[#ffe6b3]',
    glow: 'shadow-[0_0_180px_rgba(253,224,71,0.45)]',
  },
  clear: {
    bg: 'from-[#1f4fa0] via-[#4f97e6] to-[#9bd1ff]',
    glow: 'shadow-[0_0_180px_rgba(125,211,252,0.45)]',
  },
  rainy: {
    bg: 'from-[#0a223f] via-[#143f68] to-[#325a7e]',
    glow: 'shadow-[0_0_180px_rgba(56,189,248,0.28)]',
  },
  stormy: {
    bg: 'from-[#05060f] via-[#1d2240] to-[#2d2d5b]',
    glow: 'shadow-[0_0_180px_rgba(99,102,241,0.35)]',
  },
  cloudy: {
    bg: 'from-[#384258] via-[#62758f] to-[#8fa2bb]',
    glow: 'shadow-[0_0_180px_rgba(203,213,225,0.24)]',
  },
  foggy: {
    bg: 'from-[#2f3b4f] via-[#57687a] to-[#93a4af]',
    glow: 'shadow-[0_0_180px_rgba(226,232,240,0.22)]',
  },
  snowy: {
    bg: 'from-[#355580] via-[#6d9ac8] to-[#c6e4ff]',
    glow: 'shadow-[0_0_180px_rgba(186,230,253,0.3)]',
  },
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

const shortTime = (raw: string, timezone?: string) => {
  const date = new Date(raw);
  if (!Number.isNaN(date.getTime())) {
    return date.toLocaleTimeString([], { hour: 'numeric', timeZone: timezone });
  }
  return raw.slice(11, 16);
};

const shortDay = (raw: string, timezone?: string) => {
  const date = new Date(raw);
  if (!Number.isNaN(date.getTime())) {
    return date.toLocaleDateString([], { weekday: 'short', timeZone: timezone });
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
  const [searchMessage, setSearchMessage] = useState('');

  const apiBaseUrl =
    process.env.NEXT_PUBLIC_WEATHER_API_BASE_URL ??
    (process.env.NODE_ENV === 'production' ? 'https://weather-app-backend-nbwv.onrender.com' : 'http://127.0.0.1:8000');

  useEffect(() => {
    const rawFavorites = localStorage.getItem('weather_favorites');
    const rawRecent = localStorage.getItem('weather_recent');
    const rawUnit = localStorage.getItem('weather_unit');
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
    if (rawUnit === 'C' || rawUnit === 'F') {
      setUnit(rawUnit);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('weather_favorites', JSON.stringify(favorites));
  }, [favorites]);

  useEffect(() => {
    localStorage.setItem('weather_recent', JSON.stringify(recent));
  }, [recent]);

  useEffect(() => {
    localStorage.setItem('weather_unit', unit);
  }, [unit]);

  const scene = sceneFromWeather(weather);
  const theme = sceneStyles[scene];
  const warnings = useMemo(() => (weather ? weatherWarnings(weather) : []), [weather]);
  const quickSuggestions = useMemo(() => {
    return Array.from(new Set([...recent, ...favorites, ...STARTER_CITIES])).slice(0, 12);
  }, [favorites, recent]);

  const runSearch = async (cityInput?: string) => {
    const city = (cityInput ?? query).trim();
    if (!city) {
      setSearchMessage('Type a city name to search.');
      return;
    }

    setLoading(true);
    setError('');
    setSearchMessage('');
    try {
      const res = await fetch(`${apiBaseUrl}/weather/${encodeURIComponent(city)}`);
      if (!res.ok) throw new Error('Request failed');
      const data = (await res.json()) as WeatherReport;
      setWeather(data);
      setQuery(data.city);
      setLastUpdated(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', timeZone: data.timezone }));
      setRecent((prev) => [data.city, ...prev.filter((item) => item !== data.city)].slice(0, 6));
    } catch {
      setError(`Unable to fetch weather data. Ensure backend is running at ${apiBaseUrl}.`);
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
      <div className={`ambient-layer scene-${scene}`} />
      <div className="absolute inset-0 bg-slate-950/30" />
      <div className={`pointer-events-none absolute inset-0 opacity-60 blur-3xl ${theme.glow}`} />
      <div className="grid-overlay" />
      <WeatherAtmosphere scene={scene} />

      <section className="relative mx-auto flex w-full max-w-[1260px] flex-col gap-8 px-4 pb-12 pt-8 md:px-8">
        <header className="glass-card glass-card-primary reveal-up flex flex-col gap-6 rounded-[2rem] p-6 md:p-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-cyan-100/85">Aeria Weather Studio</p>
              <h1 className="mt-2 text-4xl font-semibold leading-tight text-white md:text-5xl">Complete climate dashboard</h1>
            </div>
            <div className="flex items-center gap-2 rounded-full border border-white/35 bg-black/35 p-1">
              <button
                onClick={() => setUnit('C')}
                aria-pressed={unit === 'C'}
                aria-label="Use Celsius"
                className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                  unit === 'C' ? 'bg-white text-slate-900' : 'text-white/90 hover:text-white'
                }`}
              >
                Celsius
              </button>
              <button
                onClick={() => setUnit('F')}
                aria-pressed={unit === 'F'}
                aria-label="Use Fahrenheit"
                className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                  unit === 'F' ? 'bg-white text-slate-900' : 'text-white/90 hover:text-white'
                }`}
              >
                Fahrenheit
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-3 md:flex-row">
            <label htmlFor="city-search" className="sr-only">
              Search city
            </label>
            <input
              id="city-search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && runSearch()}
              list="city-suggestions"
              autoComplete="off"
              placeholder="Search city, region, or airport code"
              aria-describedby="city-search-help"
              className="h-14 w-full rounded-2xl border border-white/35 bg-black/40 px-5 text-base text-white placeholder:text-white/75 outline-none transition focus:border-cyan-300 focus:ring-2 focus:ring-cyan-200/30"
            />
            <datalist id="city-suggestions">
              {quickSuggestions.map((city) => (
                <option key={city} value={city} />
              ))}
            </datalist>
            <button
              onClick={() => runSearch()}
              aria-label="Search weather"
              className="h-14 rounded-2xl bg-gradient-to-r from-cyan-300 to-sky-200 px-8 text-base font-semibold text-slate-900 transition hover:brightness-110"
            >
              Search
            </button>
            <button
              onClick={addFavorite}
              aria-label="Save current city to favorites"
              className="h-14 rounded-2xl border border-white/35 bg-white/15 px-6 text-sm font-semibold uppercase tracking-widest text-white transition hover:bg-white/20"
            >
              Save
            </button>
          </div>
          <p id="city-search-help" className="text-sm text-white/85">
            Search from quick suggestions or type any city name.
          </p>
          {searchMessage && <p className="text-sm font-medium text-amber-100">{searchMessage}</p>}

          <div className="flex flex-wrap gap-2">
            {favorites.map((city) => (
              <button
                key={city}
                onClick={() => runSearch(city)}
                className="rounded-full border border-white/35 bg-white/15 px-4 py-2 text-sm text-white transition hover:bg-white/25"
              >
                {city}
              </button>
            ))}
          </div>
        </header>

        {loading && (
          <>
            <div className="glass-card glass-card-secondary reveal-up rounded-[1.8rem] p-6 text-lg text-white">Syncing live atmosphere data...</div>
            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }, (_, index) => (
                <div key={`skeleton-${index}`} className="skeleton-card h-28 rounded-3xl" />
              ))}
            </section>
          </>
        )}

        {error && (
          <div className="reveal-up rounded-[1.8rem] border border-rose-200/70 bg-rose-900/55 p-5 text-rose-100">
            <p>{error}</p>
            <button
              onClick={() => runSearch()}
              className="mt-3 rounded-lg border border-rose-200/70 bg-rose-100/10 px-4 py-2 text-sm font-semibold text-rose-50 hover:bg-rose-100/20"
            >
              Retry Search
            </button>
          </div>
        )}

        {!loading && !weather && !error && (
          <div className="glass-card glass-card-secondary reveal-up rounded-[2rem] p-8 md:p-10">
            <h2 className="text-3xl font-semibold text-white">Search to unlock your full weather cockpit</h2>
            <p className="mt-3 max-w-3xl text-white/95">
              This redesigned app includes live conditions, comfort metrics, air-quality intelligence, hourly temperature curves,
              weekly outlook planning, warning center, and quick city workflows for daily decision making.
            </p>
          </div>
        )}

        {weather && (
          <div className="grid gap-6">
            <section className="grid gap-6 lg:grid-cols-[1.35fr_1fr]">
              <article className="glass-card glass-card-primary reveal-up rounded-[2rem] p-8">
                <p className="text-xs uppercase tracking-[0.32em] text-white/80">Current conditions</p>
                <div className="mt-4 flex flex-wrap items-end justify-between gap-5">
                  <div>
                    <h2 className="font-display text-5xl leading-none md:text-7xl">{weather.city}</h2>
                    <p className="mt-3 text-lg capitalize text-white/95">{weather.current.description}</p>
                    <p className="mt-2 text-sm text-white/85">{weatherGlyph(weather.current.weather_code)}</p>
                    <p className="mt-2 text-sm text-white/80">
                      {weather.country ?? 'Unknown'} • {weather.timezone}
                    </p>
                    <p className="mt-2 text-sm text-white/80">Last updated {lastUpdated || '--:--'}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-7xl font-semibold leading-none md:text-8xl">
                      {formatTemp(weather.current.temperature_c, unit)}
                      <span className="text-4xl align-top">{unit}</span>
                    </p>
                    <p className="mt-2 text-base text-white/90">
                      Feels like {formatTemp(weather.current.apparent_temperature_c, unit)} {unit}
                    </p>
                  </div>
                </div>
              </article>

              <article className="glass-card glass-card-secondary reveal-up rounded-[2rem] p-6">
                <h3 className="text-sm uppercase tracking-[0.28em] text-white/85">Warning center</h3>
                <div className="mt-4 space-y-3">
                  {warnings.map((alert) => (
                    <div key={alert} className="rounded-2xl border border-white/30 bg-black/25 p-4 text-sm text-white">
                      {alert}
                    </div>
                  ))}
                </div>
              </article>
            </section>

            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              <MetricCard label="Humidity" value={`${weather.current.humidity}%`} tone="from-cyan-200/26 to-cyan-700/18" />
              <MetricCard label="Wind" value={`${Math.round(weather.current.wind_kmh)} km/h`} tone="from-sky-200/24 to-blue-700/18" />
              <MetricCard label="Pressure" value={`${Math.round(weather.current.pressure_hpa)} hPa`} tone="from-indigo-200/24 to-indigo-800/22" />
              <MetricCard label="Visibility" value={`${weather.current.visibility_km.toFixed(1)} km`} tone="from-emerald-200/24 to-emerald-800/18" />
              <MetricCard label="UV Index" value={`${weather.current.uv_index.toFixed(1)}`} tone="from-amber-200/32 to-orange-700/20" />
              <MetricCard label="Air Quality" value={qualityLabel(weather.air_quality?.us_aqi)} tone="from-pink-200/24 to-violet-800/20" />
            </section>

            <section className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
              <article className="glass-card glass-card-primary reveal-up rounded-[2rem] p-6">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-xl font-semibold">Hourly forecast</h3>
                  <p className="text-sm text-white/85">Rain probability + thermal trend</p>
                </div>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
                  {weather.hourly.map((point) => (
                    <div key={point.time} className="rounded-2xl border border-white/35 bg-black/30 p-3 text-center">
                      <p className="text-xs uppercase tracking-wider text-white/80">{shortTime(point.time, weather.timezone)}</p>
                      <p className="mt-2 text-2xl font-semibold">{formatTemp(point.temperature_c, unit)}</p>
                      <p className="mt-1 text-xs text-white/85">{point.precipitation_probability}% rain</p>
                    </div>
                  ))}
                </div>
              </article>

              <article className="glass-card glass-card-secondary reveal-up rounded-[2rem] p-6">
                <h3 className="text-xl font-semibold">Environment</h3>
                <div className="mt-4 space-y-3">
                  <div className="rounded-2xl border border-white/30 bg-black/25 p-4">
                    <p className="text-xs uppercase tracking-widest text-white/80">US AQI</p>
                    <p className="mt-2 text-2xl font-semibold">{weather.air_quality?.us_aqi ?? '--'}</p>
                  </div>
                  <div className="rounded-2xl border border-white/30 bg-black/25 p-4">
                    <p className="text-xs uppercase tracking-widest text-white/80">PM 2.5</p>
                    <p className="mt-2 text-2xl font-semibold">{weather.air_quality?.pm2_5?.toFixed(1) ?? '--'}</p>
                  </div>
                  <div className="rounded-2xl border border-white/30 bg-black/25 p-4">
                    <p className="text-xs uppercase tracking-widest text-white/80">PM 10</p>
                    <p className="mt-2 text-2xl font-semibold">{weather.air_quality?.pm10?.toFixed(1) ?? '--'}</p>
                  </div>
                </div>
              </article>
            </section>

            <section className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
              <article className="glass-card glass-card-primary reveal-up rounded-[2rem] p-6">
                <h3 className="text-xl font-semibold">7-day outlook</h3>
                <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  {weather.daily.map((day) => (
                    <div key={day.date} className="rounded-2xl border border-white/35 bg-black/30 p-4">
                      <p className="text-sm font-semibold tracking-wide">{shortDay(day.date, weather.timezone)}</p>
                      <p className="mt-2 text-sm text-white/85">{day.description}</p>
                      <p className="mt-3 text-lg font-semibold">
                        {formatTemp(day.temperature_max_c, unit)} / {formatTemp(day.temperature_min_c, unit)} {unit}
                      </p>
                      <p className="mt-2 text-xs text-white/85">Rain {day.precipitation_probability_max}%</p>
                      <p className="mt-2 text-xs text-white/75">Sun {shortTime(day.sunrise, weather.timezone)} - {shortTime(day.sunset, weather.timezone)}</p>
                    </div>
                  ))}
                </div>
              </article>

              <article className="glass-card glass-card-secondary reveal-up rounded-[2rem] p-6">
                <h3 className="text-xl font-semibold">Recent cities</h3>
                <div className="mt-4 space-y-2">
                  {recent.length === 0 && <p className="text-sm text-white/85">No recent searches yet.</p>}
                  {recent.map((city) => (
                    <button
                      key={city}
                      onClick={() => runSearch(city)}
                      aria-label={`Open weather for ${city}`}
                      className="flex w-full items-center justify-between rounded-xl border border-white/30 bg-black/25 px-4 py-3 text-left text-sm transition hover:bg-black/40"
                    >
                      <span>{city}</span>
                      <span className="text-white/80">view</span>
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

function WeatherAtmosphere({ scene }: { scene: WeatherScene }) {
  const raindrops = Array.from({ length: 26 }, (_, i) => i);
  const clouds = Array.from({ length: 6 }, (_, i) => i);
  const sunnyParticles = Array.from({ length: 10 }, (_, i) => i);
  const clearBands = Array.from({ length: 4 }, (_, i) => i);
  const snowFlakes = Array.from({ length: 24 }, (_, i) => i);

  return (
    <>
      <div className={`scene-motion-layer scene-motion-${scene}`} aria-hidden />

      {(scene === 'sunny' || scene === 'clear') && <div className={`sun-disc ${scene}`} />}

      {scene === 'sunny' && (
        <div className="sunny-layer" aria-hidden>
          <div className="sunny-rays" />
          {sunnyParticles.map((idx) => (
            <span key={`sunny-${idx}`} className="sunny-spark" />
          ))}
        </div>
      )}

      {scene === 'clear' && (
        <div className="clear-layer" aria-hidden>
          {clearBands.map((idx) => (
            <span key={`clear-${idx}`} className="clear-band" />
          ))}
        </div>
      )}

      {(scene === 'cloudy' || scene === 'foggy' || scene === 'rainy' || scene === 'stormy') && (
        <div className="cloud-layer" aria-hidden>
          {clouds.map((idx) => (
            <span key={`cloud-${idx}`} className="cloud-puff" />
          ))}
        </div>
      )}

      {(scene === 'rainy' || scene === 'stormy') && (
        <div className="rain-layer" aria-hidden>
          {raindrops.map((idx) => (
            <span key={`rain-${idx}`} className="rain-drop" />
          ))}
        </div>
      )}

      {scene === 'snowy' && (
        <div className="snow-layer" aria-hidden>
          {snowFlakes.map((idx) => (
            <span key={`flake-${idx}`} className="snowflake" />
          ))}
        </div>
      )}

      {scene === 'stormy' && <div className="lightning-flash" aria-hidden />}
      {scene === 'foggy' && <div className="fog-haze" aria-hidden />}
      {scene === 'snowy' && <div className="snow-haze" aria-hidden />}
    </>
  );
}

function MetricCard({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <article className={`glass-card glass-card-tertiary reveal-up rounded-3xl bg-gradient-to-br p-5 ${tone}`}>
      <p className="text-xs uppercase tracking-[0.22em] text-white/80">{label}</p>
      <p className="mt-3 text-3xl font-semibold">{value}</p>
    </article>
  );
}
