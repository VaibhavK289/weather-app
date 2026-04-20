# Frontend

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Desktop Installer (Windows, Tauri)

This project is configured to produce a Windows NSIS installer.

### What is already configured

1. Unique app identifier in `src-tauri/tauri.conf.json`.
2. Release version alignment between `src-tauri/tauri.conf.json` and `src-tauri/Cargo.toml`.
3. Bundle target set to `nsis` to output a single installer `.exe`.
4. Desktop web build path uses `npm run build:desktop` so the bundled app gets a stable backend URL.

### Prerequisites (one-time)

1. Install Node.js LTS.
2. Install Rust (stable toolchain).
3. Install Microsoft Visual Studio C++ Build Tools (Desktop development with C++ workload).
4. Ensure WebView2 runtime is available on Windows.

### Build installer

From the `frontend` directory:

```powershell
npm install
$env:DESKTOP_API_BASE_URL="https://weather-app-backend.onrender.com"
npm run tauri:build
```

Notes:

1. `DESKTOP_API_BASE_URL` is optional if `NEXT_PUBLIC_WEATHER_API_BASE_URL` is already set.
2. If neither variable is set, build falls back to `https://weather-app-backend.onrender.com`.

### Output location

Installer artifacts are generated under:

`src-tauri/target/release/bundle/nsis/`

Look for a file similar to:

`weather-app_0.2.0_x64-setup.exe`

### Verify installer before sharing

1. Install on a clean Windows machine or VM.
2. Launch app and search for a city.
3. Confirm weather data loads from your deployed backend.
4. Uninstall and reinstall once to validate clean install behavior.

### Release checklist

1. Update versions in both files:
   - `src-tauri/tauri.conf.json`
   - `src-tauri/Cargo.toml`
2. Build installer.
3. Smoke test install/uninstall.
4. Upload installer to release channel.
5. Publish release notes.

### Recommended next hardening

1. Code-sign installer to reduce SmartScreen warnings.
2. Replace default icons in `src-tauri/icons` with final brand assets.
