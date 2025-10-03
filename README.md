# 🌍 EcoSphere AI Farming Simulator

> **A comprehensive mobile farming simulation that combines real NASA satellite data, AI-powered insights, and gamified learning to revolutionize agricultural education and practice.**

[![React Native](https://img.shields.io/badge/React%20Native-0.72-blue.svg)](https://reactnative.dev/)
[![Expo](https://img.shields.io/badge/Expo-49.0-000020.svg)](https://expo.dev/)
[![Firebase](https://img.shields.io/badge/Firebase-10.0-orange.svg)](https://firebase.google.com/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Key Features](#-key-features)
- [Tech Stack](#-tech-stack)
- [Quick Start](#-quick-start)
- [Project Structure](#-project-structure)
- [Game Modes](#-game-modes)
- [NASA Data Integration](#-nasa-data-integration)
- [AI Features](#-ai-features)
- [Use Cases Implemented](#-use-cases-implemented)
- [Screenshots](#-screenshots)
- [Development](#-development)
- [Deployment](#-deployment)
- [Contributing](#-contributing)
- [License](#-license)

---

## 🌟 Overview

**EcoSphere AI Farming Simulator** is an educational mobile application that transforms farming education through:

- 🛰️ **Real NASA Satellite Data** - SMAP, MODIS, Landsat, IMERG, POWER APIs
- 🤖 **AI-Powered Insights** - Machine learning for crop health, disease detection, and recommendations
- 🎮 **Interactive Gameplay** - 3 game modes (Campaign, Sandbox, Challenges)
- 📊 **Real-time Analytics** - IoT monitoring, weather alerts, and impact measurement
- 👥 **Community Platform** - Knowledge sharing, expert connections, and collaboration
- 🏆 **Gamified Learning** - Missions, achievements, leaderboards, and rewards

**Perfect for:**
- Students learning sustainable agriculture
- Farmers seeking data-driven insights
- Researchers analyzing agricultural patterns
- Educators teaching environmental science

---

## ✨ Key Features

### 🎮 Game Modes

1. **Campaign Mode**
   - 16+ missions across 4 chapters
   - Progressive difficulty with XP system
   - Real-world farming skills training
   - NASA data integration in missions

2. **Sandbox Mode**
   - Free experimentation with parameters
   - 5 preset scenarios (drought, flood, perfect, etc.)
   - Real-time simulation with adjustable speed
   - Save/load custom scenarios

3. **Challenges Mode** ⭐ NEW
   - Weekly/daily/tournament competitions
   - Global leaderboards
   - Multiplayer challenges
   - Exclusive rewards and badges

### 🛰️ NASA Satellite Integration

- **SMAP** - Soil Moisture Active Passive
- **MODIS** - Vegetation indices (NDVI, EVI)
- **Landsat** - Land cover and crop health
- **IMERG** - Precipitation measurements
- **POWER** - Agro-climate data (temperature, humidity, solar radiation)

### 🤖 AI Features

- **AI Tutor** - Personalized farming guidance
- **Disease Detection** - Image recognition for crop diseases
- **Smart Recommendations** - Data-driven farming advice
- **Personal Coaching** - Adaptive learning paths
- **Task Automation** - Intelligent scheduling

### 📊 Analytics & Monitoring

- **Real-time Dashboard** - Live farm metrics
- **IoT Device Integration** - Sensor data monitoring
- **Weather Alerts** - Location-based notifications
- **Impact Measurement** - Environmental tracking
- **Performance Analytics** - Yield predictions

### 👥 Community Features

- **Knowledge Sharing** - Post tips and success stories
- **Expert Network** - Connect with agricultural experts
- **Discussion Groups** - Topic-based communities
- **Collaboration** - Research workspaces
- **Success Stories** - Share achievements

### 🐄 Livestock Management

- **Pasture Health** - Grazing land monitoring
- **Feed Planning** - Nutrition optimization
- **Environmental Impact** - Sustainability tracking
- **ML Predictions** - Health and yield forecasts

### 📚 Research & Academic

- **Data Access** - Curated research datasets
- **Collaboration** - Research workspaces
- **Publications** - Share findings with DOI
- **Academic Resources** - Learning materials
- **Project Management** - Research lifecycle tracking
- **Data Export** - Multiple formats (CSV, JSON, GeoTIFF, NetCDF)

---

## 🛠️ Tech Stack

### Frontend
- **React Native** 0.72 - Cross-platform mobile framework
- **Expo** 49.0 - Development platform
- **React Navigation** - Screen routing
- **React Context** - State management
- **AsyncStorage** - Local data persistence

### Backend
- **Firebase Authentication** - User management
- **Firebase Firestore** - NoSQL database
- **Firebase Storage** - File uploads
- **Cloud Functions** - Serverless backend

### APIs & Services
- **NASA POWER API** - Agro-climate data
- **NASA Earthdata API** - Satellite imagery
- **OpenWeather API** - Weather forecasts
- **Google Gemini AI** - AI-powered features

### Libraries
- `@react-native-community/slider` - Parameter controls
- `react-native-maps` - Location selection
- `expo-location` - GPS coordinates
- `expo-image-picker` - Camera/gallery access
- `@react-native-firebase/app` - Firebase SDK

---

## 🚀 Quick Start

### Prerequisites

```bash
# Required
node >= 16.0.0
npm >= 8.0.0
expo-cli

# Optional
Android Studio (for Android)
Xcode (for iOS - macOS only)
```

### Installation

```bash
# 1. Clone repository
git clone https://github.com/yourusername/ecosphere-ai-farming-simulator.git
cd ecosphere-ai-farming-simulator-3

# 2. Install dependencies
npm install

# 3. Configure environment
cp .env.example .env
# Edit .env with your API keys

# 4. Start development server
npm start

# 5. Run on device/emulator
npm run android  # Android
npm run ios      # iOS (macOS only)
```

### Firebase Setup

1. Create project at [Firebase Console](https://console.firebase.google.com)
2. Enable **Authentication** (Email/Password)
3. Create **Firestore Database**
4. Enable **Storage**
5. Copy config to `src/services/firebase.config.js`

### API Keys Setup

Add to `.env`:

```env
# NASA APIs
NASA_API_KEY=your_nasa_api_key_here

# Google Gemini AI
GEMINI_API_KEY=your_gemini_api_key_here

# OpenWeather
OPENWEATHER_API_KEY=your_openweather_key_here
```

Get API keys:
- NASA: https://api.nasa.gov
- Gemini AI: https://makersuite.google.com/app/apikey
- OpenWeather: https://openweathermap.org/api

---

## 📁 Project Structure

```
ecosphere-ai-farming-simulator-3/
├── src/
│   ├── screens/              # All screen components
│   │   ├── auth/             # Login, Register, ProfileSetup
│   │   ├── game/             # Game modes (Campaign, Sandbox, Challenges)
│   │   ├── dashboard/        # Main dashboard, FarmDashboard
│   │   ├── farming/          # CropManagement
│   │   ├── operations/       # PlantingGuide, WeatherAlerts, SmartTasks
│   │   ├── ai/               # AITutor, Recommendations, PersonalAdvice
│   │   ├── disease/          # DiseaseDetection
│   │   ├── iot/              # IoTMonitor
│   │   ├── analytics/        # Analytics, RealTimeStatus
│   │   ├── impact/           # ImpactDashboard
│   │   ├── community/        # Social features
│   │   ├── livestock/        # Livestock management
│   │   ├── research/         # Research & academic features
│   │   ├── monitoring/       # Real-time monitoring
│   │   ├── admin/            # Admin panel
│   │   └── profile/          # User profile, achievements
│   ├── services/             # API services
│   │   ├── auth.service.js           # Authentication
│   │   ├── firebase.config.js        # Firebase setup
���   │   ├── nasa/                     # NASA API integrations
│   │   │   ├── power.service.js      # POWER API
│   │   │   ├── smap.service.js       # SMAP satellite
│   │   │   ├── modis.service.js      # MODIS data
│   │   │   └── imerg.service.js      # IMERG precipitation
│   │   ├── satellite/                # Satellite services
│   │   ├── ai/                       # AI services
│   │   ├── community/                # Community services
│   │   ├── livestock/                # Livestock services
│   │   ├── research/                 # Research services
│   │   └── operations/               # Operations services
│   ├── components/           # Reusable components
│   │   ├── CampaignLevel1Screen.js   # 3D campaign level
│   │   └── ...
│   ├── game2d/               # 2D game engine
│   │   ├── GameStateContext.js       # Game state management
│   │   ├── components/
│   │   │   ├── InteractiveFarmGame.js  # Main game component
│   │   │   ├── FarmBoard.js            # Farm visualization
│   │   │   └── GameOverlay.js          # UI overlay
│   │   └── scenes.js                 # Scene configurations
│   ├── navigation/           # Navigation setup
│   │   └── AppNavigator.js
│   ├── constants/            # App constants
│   │   └── colors.js
│   └── utils/                # Utility functions
│       └── storage.js
├── assets/                   # Images, fonts, icons
├── firestore.rules          # Firestore security rules
├── .env.example             # Environment variables template
├── app.json                 # Expo configuration
├── package.json             # Dependencies
└── README.md               # This file
```

---

## 🎮 Game Modes

### 🎯 Campaign Mode

**16 Missions | 4 Chapters | Progressive Learning**

Learn farming through structured missions that teach real-world skills:

**Chapter 1: Getting Started** 🌱
- Set Up Your First Field
- Understanding Your Soil
- First Planting Season

**Chapter 2: Water Management** 💧
- Understanding Soil Moisture (SMAP)
- Rainfall Prediction (IMERG)
- Efficient Irrigation
- Drought Management

**Chapter 3: Crop Health** 🌾
- Monitoring Crop Growth (MODIS/Landsat)
- Pest Detection
- Nutrient Management
- Disease Prevention

**Chapter 4: Harvest & Market** 🚜
- Harvest Timing
- Yield Estimation
- Market Strategy

**Features:**
- XP progression system
- Unlock new missions
- Earn coins and badges
- 3-star performance ratings
- Real NASA data integration

### 🧪 Sandbox Mode

**Free Experimentation | Parameter Testing | Scenario Creation**

Experiment with farming conditions:

**Adjustable Parameters:**
- 💧 Rainfall (0-500mm)
- 🌡️ Temperature (15-45°C)
- 🌱 Soil Fertility (0-100%)
- 💰 Budget ($0-$10,000)

**Preset Scenarios:**
1. Perfect Conditions
2. Drought Challenge
3. Heat Wave
4. Limited Budget
5. Flood Risk

**Features:**
- Real-time simulation
- Adjustable speed (1x/2x/4x)
- Save/load scenarios
- Educational info popups
- 90-day timeline
- Live results calculation

### 🏆 Challenges Mode

**Competitive Multiplayer | Leaderboards | Rewards**

Compete with farmers worldwide:

**Challenge Types:**
- **Weekly Challenges** - Medium rewards, 7-30 days
- **Daily Challenges** - Quick competitions, 1-7 days
- **Tournaments** - Major events, 30-60 days

**Active Challenges:**
- Maximum Yield Challenge 🌾
- Water Conservation 💧
- Sustainable Farming Tournament 🏆

**Features:**
- Global leaderboard
- Player rankings
- Exclusive prizes
- Challenge stats tracking
- Real-time competition

---

## 🛰️ NASA Data Integration

### SMAP - Soil Moisture

**Active Passive Microwave**
- L-band radiometer measurements
- 36km spatial resolution
- 2-3 day revisit time
- Soil moisture (0-5cm depth)

**Use Cases:**
- Irrigation scheduling
- Drought monitoring
- Crop stress detection

### MODIS - Vegetation Indices

**Moderate Resolution Imaging Spectroradiometer**
- NDVI (Normalized Difference Vegetation Index)
- EVI (Enhanced Vegetation Index)
- 250m-1km resolution
- Daily coverage

**Use Cases:**
- Crop health monitoring
- Growth stage tracking
- Yield prediction

### Landsat - Land Cover

**Multispectral Imaging**
- 30m spatial resolution
- 16-day revisit time
- True color and infrared bands

**Use Cases:**
- Land classification
- Change detection
- Crop mapping

### IMERG - Precipitation

**Integrated Multi-satellitE Retrievals for GPM**
- 0.1° spatial resolution
- 30-minute temporal resolution
- Global coverage

**Use Cases:**
- Rainfall forecasting
- Flood risk assessment
- Water management

### POWER - Agro-Climate Data

**Prediction Of Worldwide Energy Resources**
- Temperature, humidity, wind speed
- Solar radiation
- Evapotranspiration
- Historical data (1981-present)

**Use Cases:**
- Crop modeling
- Climate analysis
- Energy calculations

---

## 🤖 AI Features

### AI Tutor (UC20)

**Personalized Farming Guidance**
- Ask farming questions in natural language
- Get instant AI-powered answers
- Learn best practices
- Multilingual support

### Disease Detection (UC21)

**Computer Vision for Crop Health**
- Upload crop images
- AI identifies diseases
- Treatment recommendations
- Prevention strategies

### Smart Recommendations (UC24)

**Data-Driven Farming Advice**
- Analyze farm conditions
- AI suggests optimal actions
- Seasonal recommendations
- Resource optimization

### Personal Coaching (UC25)

**Adaptive Learning Paths**
- Custom learning plans
- Progress tracking
- Skill assessments
- Achievement rewards

### Task Automation (UC22)

**Intelligent Scheduling**
- Auto-generate task lists
- Priority ranking
- Deadline management
- Weather-based scheduling

---

## 📝 Use Cases Implemented

### Authentication & Profile (UC1-UC5)
- ✅ UC1: User Registration
- ✅ UC2: User Login
- ✅ UC3: Profile Setup
- ✅ UC4: Location Selection
- ✅ UC5: Onboarding

### Game Systems (UC6-UC12)
- ✅ UC6: Campaign Mode
- ✅ UC7: Sandbox Mode
- ✅ UC8: Challenges Mode
- ✅ UC9: Tutorial System
- ✅ UC10: Quiz System
- ✅ UC11: Achievement Tracking
- ✅ UC12: Progress Monitoring

### Community (UC13-UC19)
- ✅ UC13: Create Posts
- ✅ UC14: Share Knowledge
- ✅ UC15: Connect with Farmers
- ✅ UC16: Expert Network
- ✅ UC17: Discussion Groups
- ✅ UC18: Collaboration
- ✅ UC19: Success Stories

### AI Features (UC20-UC25)
- ✅ UC20: AI Tutor
- ✅ UC21: Disease Detection
- ✅ UC22: Task Automation
- ✅ UC23: IoT Devices
- ✅ UC24: Recommendations
- ✅ UC25: Personal Coaching

### Farm Operations (UC39-UC44)
- ✅ UC39: Planting Guide
- ✅ UC40: Weather Alerts
- ✅ UC41: Irrigation Scheduling
- ✅ UC42: Crop Health Monitoring
- ✅ UC43: Farm Operations
- ✅ UC44: Task Management

### Analytics (UC45-UC49)
- ✅ UC45: View Analytics
- ✅ UC46: Custom Reports
- ✅ UC47: Export Data
- ✅ UC48: Real-time Status
- ✅ UC49: IoT Monitoring

### Research (UC50-UC55)
- ✅ UC50: Access Research Data
- ✅ UC51: Collaborate with Researchers
- ✅ UC52: Publish Findings
- ✅ UC53: Academic Resources
- ✅ UC54: Manage Projects
- ✅ UC55: Export Research Data

### Livestock (UC56-UC63)
- ✅ UC56: Pasture Health
- ✅ UC57: Feed Planning
- ✅ UC58: Livestock Impact
- ✅ UC59-UC63: ML Predictions

---

## 📸 Screenshots

_Screenshots coming soon_

---

## 💻 Development

### Run Development Server

```bash
npm start
```

### Run Tests

```bash
npm test
```

### Lint Code

```bash
npm run lint
```

### Build for Production

```bash
# Android
npm run build:android

# iOS
npm run build:ios
```

### Environment Variables

Create `.env` file:

```env
# Firebase
FIREBASE_API_KEY=your_key
FIREBASE_AUTH_DOMAIN=your_domain
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_STORAGE_BUCKET=your_bucket
FIREBASE_MESSAGING_SENDER_ID=your_sender_id
FIREBASE_APP_ID=your_app_id

# NASA
NASA_API_KEY=your_nasa_key

# AI
GEMINI_API_KEY=your_gemini_key

# Weather
OPENWEATHER_API_KEY=your_weather_key
```

---

## 🚀 Deployment

### Expo Build

```bash
# Login to Expo
expo login

# Build for Android
eas build --platform android

# Build for iOS
eas build --platform ios
```

### Firebase Deployment

```bash
# Deploy Firestore rules
firebase deploy --only firestore:rules

# Deploy Cloud Functions
firebase deploy --only functions

# Deploy hosting
firebase deploy --only hosting
```

### App Store Submission

1. Build production app
2. Test thoroughly
3. Prepare store assets
4. Submit to Google Play / App Store

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open Pull Request

### Code Style

- Use ESLint configuration
- Follow React Native best practices
- Write meaningful commit messages
- Add tests for new features

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 👏 Acknowledgments

- **NASA** - For providing free satellite data APIs
- **Google** - For Gemini AI and Firebase
- **React Native Community** - For amazing libraries
- **Contributors** - For making this project possible

---

## 📞 Support

- **Documentation**: See inline code comments
- **Issues**: [GitHub Issues](https://github.com/yourusername/ecosphere-ai-farming-simulator/issues)
- **Email**: support@ecosphere.example.com

---

## 🗺️ Roadmap

### Version 2.0 (Planned)
- [ ] 3D graphics enhancement
- [ ] VR/AR support
- [ ] Blockchain integration
- [ ] NFT achievements
- [ ] Advanced ML models
- [ ] Multi-language support
- [ ] Offline mode
- [ ] Desktop version

---

**Built with ❤️ by the EcoSphere Team**

**Transform farming through technology, data, and gamification!** 🌾🚀
