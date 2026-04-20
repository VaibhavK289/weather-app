import { spawnSync } from 'node:child_process';

const defaultApiBaseUrl = 'https://weather-app-backend.onrender.com';
const desktopApiBaseUrl =
  process.env.NEXT_PUBLIC_WEATHER_API_BASE_URL ||
  process.env.DESKTOP_API_BASE_URL ||
  defaultApiBaseUrl;

const child = spawnSync('npx', ['next', 'build'], {
  stdio: 'inherit',
  shell: true,
  env: {
    ...process.env,
    NEXT_PUBLIC_WEATHER_API_BASE_URL: desktopApiBaseUrl,
  },
});

if (child.error) {
  console.error('Desktop web build failed to start:', child.error.message);
  process.exit(1);
}

process.exit(child.status ?? 1);
