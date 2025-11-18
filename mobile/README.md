# Golf Engagement Mobile App

React Native + Expo Mobile App für Mitglieder des Golfclub Siek.

## Features

- ✅ Auth & Onboarding (Member vs. Beginner)
- ✅ Home Screen mit Feed & Events
- ✅ Push-Notification-Empfang (FCM)
- ✅ Social Feed (Posts, Comments, Likes)
- ✅ Event-Anmeldung & Event-Details
- ✅ Member Profile & Settings
- ✅ Real-time Updates (WebSocket)
- ✅ Zwei-Personas-Modus (Beginner-friendly UI)

## Tech Stack

- **Framework**: React Native + Expo
- **Navigation**: Expo Router
- **State**: Zustand + React Query
- **Push**: Expo Notifications (FCM)
- **Real-time**: Socket.io Client

## Quick Start

```bash
# Install dependencies
npm install

# Start Expo Dev Server
npm start

# Run on iOS Simulator
npm run ios

# Run on Android Emulator
npm run android
```

## Builds

```bash
# Install EAS CLI
npm install -g eas-cli

# Build for iOS
eas build --platform ios

# Build for Android
eas build --platform android
```

## App Structure

```
src/
├── screens/         # Screen Components
│   ├── HomeScreen.tsx
│   ├── LoginScreen.tsx
│   ├── FeedScreen.tsx
│   ├── EventsScreen.tsx
│   └── ProfileScreen.tsx
├── components/      # Reusable Components
├── navigation/      # Navigation Setup
├── services/        # API Services
├── store/          # Zustand Stores
└── hooks/          # Custom Hooks
```

## Features by User Persona

### Vollmitglied-Modus
- Vollständiger Zugriff auf alle Features
- Advanced Event Management
- Community Features
- Handicap Tracking

### Beginner-Modus (Gelegenheitsspieler)
- Vereinfachte UI
- Fokus auf Lernen & Community
- Beginner-Events prominent
- Golf-Tipps & Tutorials
- Buddy-System
- Achievement-System

## Environment

App Configuration in `app.json` under `extra`:
- `apiUrl`: Backend API URL

## Push Notifications

Firebase Cloud Messaging wird über Expo Notifications genutzt.

Setup:
1. Firebase Projekt erstellen
2. google-services.json (Android) hinzufügen
3. GoogleService-Info.plist (iOS) hinzufügen
4. FCM Server Key im Backend konfigurieren

## Deployment

### App Store (iOS)
```bash
eas build --platform ios --profile production
eas submit --platform ios
```

### Google Play (Android)
```bash
eas build --platform android --profile production
eas submit --platform android
```

## Support

Für Mitglieder: support@golfclub-siek.de
