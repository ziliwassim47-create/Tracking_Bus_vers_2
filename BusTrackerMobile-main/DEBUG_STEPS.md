# Debug Steps: Backend Connectivity Issue

## Step 1: Update Backend on VPS

On your VPS, pull the latest changes and restart:

```bash
cd /path/to/BusTrackerBack
git pull origin main
pm2 restart bus-tracker-backend
pm2 logs bus-tracker-backend --lines 50
```

You should see the new logging messages when the server starts.

## Step 2: Rebuild Mobile App

### Option A: Using Prebuild (Faster for testing)

```bash
cd BusTrackerMobile
npx expo prebuild --platform android --clean
cd android
./gradlew assembleDebug
```

Then install on connected device:
```bash
adb install -r app/build/outputs/apk/debug/app-debug.apk
```

### Option B: Using EAS Build (Production)

```bash
cd BusTrackerMobile
eas build --platform android --profile development
```

Wait for build to complete, then download and install the APK.

## Step 3: Test and Collect Logs

1. **Open the app** on your device
2. **Navigate to List Student screen**
3. **Select a bus** from the picker
4. **Watch the backend logs** on VPS:
   ```bash
   pm2 logs bus-tracker-backend --lines 100
   ```
   
   You should see:
   - `📥 [timestamp] GET /api/users` - Request received
   - `🔍 [GET /api/users] Request received` - Route handler called
   - Query params and headers
   - `✅ [GET /api/users] Returning X users` - Success

5. **Check device logs** (optional):
   ```bash
   adb logcat | grep -E "(ListStudent|CONFIG|API|Erreur)"
   ```

## Step 4: Analyze Results

### If backend logs show NO requests:
- Network/firewall issue
- URL is wrong in mobile app
- Android blocking HTTP traffic

### If backend logs show requests but error:
- Check the error message in logs
- Verify database connection
- Check query parameters

### If backend logs show success but app shows error:
- Check CORS headers
- Check response format
- Check mobile app error handling

## Step 5: Share Results

Share:
1. Backend PM2 logs (last 50-100 lines)
2. Any error Alert from the device
3. Device console logs (if available)

