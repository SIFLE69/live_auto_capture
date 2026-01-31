
# Instructions to Build Android APK

The project has been converted to a Capacitor Android project. You can now build the APK to run on your phone.

## Prerequisites
- **Android Studio** installed on your machine.
- **Java Development Kit (JDK) 17+** installed.
- **Android SDK** installed (usually handled by Android Studio).

## How to Build

1. **Sync the project**:
   Ensure the latest web build is copied to the Android project:
   ```bash
   npm run build
   npx cap sync
   ```

2. **Open in Android Studio**:
   You can open the project directly in Android Studio:
   ```bash
   npx cap open android
   ```
   Or manually open the `android` folder in Android Studio.

3. **Build APK**:
   - In Android Studio, go to **Build** > **Build Bundle(s) / APK(s)** > **Build APK(s)**.
   - Once finished, a notification will appear to "locate" the generated APK.
   - Transfer this `.apk` file to your phone and install it.

## Troubleshooting
If you see a "Developer Mode" or "Unknown Sources" warning on your phone, you need to enable installation from unknown sources in your Android settings.
