# PM Maintenance Mobile

Expo React Native app for the PM Maintenance backend.

## Run locally

1. `cd pm-maintenance-mobile`
2. `npm install`
3. Set `EXPO_PUBLIC_API_BASE_URL`
   - Android emulator: `http://10.0.2.2:8080`
   - iOS simulator: `http://localhost:8080`
   - Physical device: use your machine IP, for example `http://192.168.1.10:8080`
4. `npm start`

Example:

```powershell
$env:EXPO_PUBLIC_API_BASE_URL="http://10.0.2.2:8080"
npm start
```
