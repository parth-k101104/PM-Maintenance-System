# PM Maintenance Mobile

Expo React Native app for the PM Maintenance backend.

## Run locally

1. `cd pm-maintenance-mobile`
2. `npm install`
3. For phone/emulator: `npm start`
4. For browser on localhost: `npm run web`

Default API behavior:

- Android emulator automatically uses `http://10.0.2.2:8080`
- iOS simulator automatically uses `http://localhost:8080`
- If you test on a physical device, change `expo.extra.apiBaseUrl` in `app.json` to your machine IP, for example `http://192.168.1.10:8080`

Notes:

- `npm start` uses LAN mode so Expo Go QR works on devices connected to the same network.
- `npm run mobile` uses tunnel mode, which helps when LAN mode is blocked by network restrictions.
- `npm run web` stays on localhost for browser testing.
