# Project Rename to "wowtodo" and Asset Regeneration Plan

## Overview
This plan outlines all changes required to rename the project from "nativeApp" to "wowtodo" and ensure the new logo, splash screen, and favicon are properly configured across all platforms.

## Current State Analysis

### Files Containing "nativeApp" or "nativeapp" References:
1. **package.json** - Project name: "nativeapp"
2. **app.json** - name: "nativeApp", slug: "nativeApp", scheme: "nativeapp", package: "com.anonymous.nativeApp"
3. **android/settings.gradle** - rootProject.name: 'nativeApp'
4. **android/app/build.gradle** - namespace: 'com.anonymous.nativeApp', applicationId: 'com.anonymous.nativeApp'
5. **android/app/src/main/AndroidManifest.xml** - scheme: "nativeapp"
6. **android/app/src/main/res/values/strings.xml** - app_name: "nativeApp"
7. **android/app/src/main/java/com/anonymous/nativeApp/MainActivity.kt** - package: com.anonymous.nativeApp
8. **android/app/src/main/java/com/anonymous/nativeApp/MainApplication.kt** - package: com.anonymous.nativeApp

### Current Asset Files:
- `assets/images/icon.png` - App icon
- `assets/images/adaptive-icon.png` - Android adaptive icon
- `assets/images/splash-icon.png` - Splash screen image
- `assets/images/favicon.png` - Web favicon
- `assets/images/splash-icon1.png` - Additional splash variant

### Android Resource Files (Need Regeneration):
- `android/app/src/main/res/mipmap-*/ic_launcher*.webp` - App icons
- `android/app/src/main/res/mipmap-anydpi-v26/ic_launcher*.xml` - Adaptive icon configs
- `android/app/src/main/res/drawable-*/splashscreen_logo.png` - Splash screen logos

## Detailed Changes Required

### 1. Configuration File Updates

#### 1.1 package.json
```json
{
  "name": "wowtodo",  // Change from "nativeapp"
  ...
}
```

#### 1.2 app.json
```json
{
  "expo": {
    "name": "WowTodo",  // Change from "nativeApp"
    "slug": "wowtodo",  // Change from "nativeApp"
    "scheme": "wowtodo",  // Change from "nativeapp"
    "icon": "./assets/images/icon.png",
    "splash": {
      "image": "./assets/images/splash-icon.png",
      "resizeMode": "contain",
      "backgroundColor": "#ffffff"
    },
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/images/adaptive-icon.png",
        "backgroundColor": "#ffffff"
      },
      "package": "com.wowtodo.app"  // Change from "com.anonymous.nativeApp"
    },
    "web": {
      "favicon": "./assets/images/favicon.png"
    }
  }
}
```

### 2. Android Configuration Updates

#### 2.1 android/settings.gradle
```gradle
rootProject.name = 'wowtodo'  // Change from 'nativeApp'
```

#### 2.2 android/app/build.gradle
```gradle
android {
    namespace 'com.wowtodo.app'  // Change from 'com.anonymous.nativeApp'
    defaultConfig {
        applicationId 'com.wowtodo.app'  // Change from 'com.anonymous.nativeApp'
        ...
    }
}
```

#### 2.3 android/app/src/main/AndroidManifest.xml
```xml
<data android:scheme="wowtodo"/>  <!-- Change from "nativeapp" -->
```

#### 2.4 android/app/src/main/res/values/strings.xml
```xml
<string name="app_name">WowTodo</string>  <!-- Change from "nativeApp" -->
```

### 3. Android Package Structure Renaming

#### 3.1 Directory Structure Change
```
From: android/app/src/main/java/com/anonymous/nativeApp/
To:   android/app/src/main/java/com/wowtodo/app/
```

#### 3.2 File Updates
- **MainActivity.kt**: Update package declaration to `package com.wowtodo.app`
- **MainApplication.kt**: Update package declaration to `package com.wowtodo.app`

### 4. Asset Regeneration

#### 4.1 Clean Existing Android Resources
Remove or replace the following directories/files:
- `android/app/src/main/res/mipmap-hdpi/`
- `android/app/src/main/res/mipmap-mdpi/`
- `android/app/src/main/res/mipmap-xhdpi/`
- `android/app/src/main/res/mipmap-xxhdpi/`
- `android/app/src/main/res/mipmap-xxxhdpi/`
- `android/app/src/main/res/mipmap-anydpi-v26/`
- `android/app/src/main/res/drawable-hdpi/splashscreen_logo.png`
- `android/app/src/main/res/drawable-mdpi/splashscreen_logo.png`
- `android/app/src/main/res/drawable-xhdpi/splashscreen_logo.png`
- `android/app/src/main/res/drawable-xxhdpi/splashscreen_logo.png`
- `android/app/src/main/res/drawable-xxxhdpi/splashscreen_logo.png`

#### 4.2 Regenerate Assets Using Expo
Run the following commands to regenerate all asset variations:

```bash
# Clean existing build
npx expo prebuild --clean

# This will regenerate:
# - Android icons (all densities: mdpi, hdpi, xhdpi, xxhdpi, xxxhdpi)
# - Android adaptive icons
# - Android splash screens (all densities)
# - iOS icons (if iOS folder exists)
# - iOS splash screens (if iOS folder exists)
# - Web favicon
```

#### 4.3 Alternative: Use expo-image-tools
If prebuild doesn't work as expected, use:
```bash
npx expo-image-tools generate-icons
npx expo-image-tools generate-splash
```

### 5. Post-Regeneration Steps

#### 5.1 Clean Android Build
```bash
cd android
./gradlew clean
cd ..
```

#### 5.2 Rebuild Project
```bash
npx expo prebuild
# or
npx expo run:android
```

### 6. Verification Checklist

After completing all changes, verify:

- [ ] App displays "WowTodo" as the app name on device
- [ ] App icon shows the new logo on home screen
- [ ] Splash screen displays the new splash image on app launch
- [ ] Web favicon shows the new favicon in browser
- [ ] Deep links use "wowtodo://" scheme
- [ ] Android package name is "com.wowtodo.app"
- [ ] No references to "nativeApp" or "nativeapp" remain in codebase
- [ ] All icon sizes are properly generated (mdpi, hdpi, xhdpi, xxhdpi, xxxhdpi)
- [ ] Adaptive icon works on Android 8.0+ devices
- [ ] Splash screen displays correctly on all screen sizes

## Execution Order

1. Update configuration files (package.json, app.json)
2. Update Android configuration files
3. Rename Android package structure
4. Clean existing Android resources
5. Run expo prebuild to regenerate assets
6. Clean and rebuild Android project
7. Test all changes

## Notes

- The user has already updated the asset files (icon.png, adaptive-icon.png, splash-icon.png, favicon.png)
- Asset regeneration is critical to ensure all size variations are created
- Package renaming requires careful attention to avoid breaking deep links or existing installations
- Consider using a migration strategy if the app is already published to stores
