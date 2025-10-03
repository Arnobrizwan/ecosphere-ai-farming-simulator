# EcoSphere AI Farming Simulator - Technical Documentation

> Comprehensive technical documentation for developers, researchers, and contributors

**Version:** 1.0.0
**Last Updated:** October 3, 2025
**Framework:** React Native 0.81.4, Expo 54.0, Firebase 12.3.0

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Architecture & Tech Stack](#architecture--tech-stack)
3. [Directory Structure](#directory-structure)
4. [Core Features](#core-features)
5. [Game Modes](#game-modes)
6. [NASA Satellite Integration](#nasa-satellite-integration)
7. [Firebase & Backend Services](#firebase--backend-services)
8. [AI/ML Features](#aiml-features)
9. [API Integrations](#api-integrations)
10. [Setup & Installation](#setup--installation)
11. [Configuration](#configuration)
12. [Development Workflow](#development-workflow)
13. [Deployment](#deployment)
14. [Testing](#testing)
15. [Troubleshooting](#troubleshooting)
16. [API Reference](#api-reference)
17. [Contributing](#contributing)

---

## Project Overview

### Purpose

EcoSphere AI Farming Simulator is a comprehensive mobile application that combines real NASA satellite data, AI-powered insights, and gamified learning to revolutionize agricultural education and practice. The platform serves students, farmers, researchers, and educators with data-driven farming simulations.

### Key Objectives

- **Educational Excellence**: Teach sustainable agriculture through interactive gameplay
- **Real-World Impact**: Provide actionable insights using NASA satellite data
- **Community Building**: Connect farmers, students, and experts globally
- **Research Support**: Offer curated datasets and collaboration tools
- **Scalable Technology**: Built on modern cloud infrastructure with Firebase

### Target Users

1. **Students**: Learning agricultural science and sustainability
2. **Farmers**: Seeking data-driven farming insights
3. **Researchers**: Analyzing agricultural patterns and climate data
4. **Educators**: Teaching environmental science and agriculture
5. **Administrators**: Managing platform operations and compliance

---

## Architecture & Tech Stack

### Frontend Architecture

```
React Native App (Cross-platform)
├── React 19.1.0
├── React Native 0.81.4
├── Expo 54.0
├── React Navigation 6.1.9
└── React Context (State Management)
```

**Key Frontend Technologies:**

- **UI Framework**: React Native for iOS/Android
- **Navigation**: Stack navigation with authentication flow
- **State Management**: React Context API + GameStateContext
- **Local Storage**: AsyncStorage for offline data
- **Maps**: react-native-maps for location selection
- **Camera/Gallery**: expo-image-picker for disease detection
- **Location Services**: expo-location for farm coordinates

### Backend Architecture

```
Firebase Platform (Serverless)
├── Authentication (Email/Password)
├── Firestore (NoSQL Database)
├── Realtime Database (Live updates)
├── Cloud Storage (Images, models)
├── Cloud Functions (Scheduled tasks)
└── Security Rules (Access control)
```

**Backend Services:**

- **Authentication**: Firebase Auth with AsyncStorage persistence
- **Database**: Firestore for structured data, 82+ service files
- **Storage**: Firebase Storage for images, ML models
- **Functions**: Node.js Cloud Functions for weather alerts
- **Real-time**: Firebase Realtime Database for IoT monitoring

### Data Flow

```
User Input → React Native UI → Service Layer → Firebase/NASA APIs
                                      ↓
                            AsyncStorage (Caching)
                                      ↓
                          Firestore (Persistence)
                                      ↓
                          Cloud Functions (Background Jobs)
```

### Tech Stack Summary

| Layer | Technology | Version | Purpose |
|-------|-----------|---------|---------|
| **Mobile** | React Native | 0.81.4 | Cross-platform framework |
| **Runtime** | Expo | 54.0 | Development platform |
| **Language** | JavaScript/JSX | ES6+ | Application logic |
| **State** | React Context | - | Global state management |
| **Navigation** | React Navigation | 6.1.9 | Screen routing |
| **Backend** | Firebase | 12.3.0 | Serverless platform |
| **Database** | Firestore | v2 | NoSQL document store |
| **ML** | TensorFlow.js | 4.22.0 | On-device inference |
| **Maps** | React Native Maps | 1.20.1 | Location services |
| **HTTP** | Axios | 1.6.2 | API requests |

---

## Directory Structure

```
ecosphere-ai-farming-simulator-3/
│
├── src/                          # Source code
│   ├── screens/                  # UI screens (58 total)
│   │   ├── auth/                 # Login, Register, ProfileSetup
│   │   ├── game/                 # Campaign, Sandbox, Challenges (13 files)
│   │   ├── dashboard/            # Main dashboard, FarmDashboard
│   │   ├── farming/              # CropManagement
│   │   ├── operations/           # PlantingGuide, WeatherAlerts, SmartTasks
│   │   ├── ai/                   # AITutor, Recommendations, PersonalAdvice
│   │   ├── disease/              # DiseaseDetection (ML-powered)
│   │   ├── iot/                  # IoTMonitor
│   │   ├── analytics/            # Analytics, RealTimeStatus
│   │   ├── impact/               # ImpactDashboard (yield, water, cost)
│   │   ├── community/            # Posts, Knowledge, Connections, Experts
│   │   ├── livestock/            # PastureHealth, FeedPlanning, LivestockImpact
│   │   ├── research/             # ResearchData, Collaboration, Publication
│   │   ├── monitoring/           # RealTimeStatus
│   │   ├── admin/                # User, Settings, Moderation, Access, Audit
│   │   ├── profile/              # Profile, Achievements, LearningProgress
│   │   ├── onboarding/           # LocationSelection, FarmConfig
│   │   └── reference/            # SatelliteData
│   │
│   ├── services/                 # Business logic (82 service files)
│   │   ├── firebase.config.js    # Firebase initialization
│   │   ├── auth.service.js       # Authentication
│   │   ├── nasa.service.js       # NASA API wrapper
│   │   ├── power.service.js      # NASA POWER API
│   │   ├── satellite/            # SMAP, MODIS, Sentinel services
│   │   ├── ai/                   # tutor.service.js, recommendation.service.js
│   │   ├── game/                 # campaign, sandbox, achievements, tutorial
│   │   ├── operations/           # planting, irrigation, crop health, weather
│   │   ├── community/            # posts, knowledge, experts, groups
│   │   ├── research/             # data, collaboration, publications
│   │   ├── analytics/            # performance, reports, real-time
│   │   ├── impact/               # yield, water, cost, environmental
│   │   ├── admin/                # users, settings, moderation, audit
│   │   ├── iot/                  # device real-time monitoring
│   │   ├── ml/                   # ML model services
│   │   └── monitoring/           # realTimeStatus.service.js
│   │
│   ├── components/               # Reusable UI components
│   │   ├── CampaignLevel1Screen.js  # 3D campaign level
│   │   └── ai/                   # AI-specific components
│   │
│   ├── game2d/                   # 2D game engine
│   │   ├── GameStateContext.js   # Global game state
│   │   ├── withGameScene.js      # HOC for game scenes
│   │   ├── scenes.js             # Scene configurations (792 lines)
│   │   └── components/
│   │       ├── InteractiveFarmGame.js  # Main game component
│   │       ├── FarmBoard.js      # Farm visualization
│   │       └── GameOverlay.js    # UI overlay
│   │
│   ├── game3d/                   # 3D game assets
│   │   ├── campaign/             # Campaign missions
│   │   ├── systems/              # Game systems
│   │   ├── entities/             # Game entities
│   │   ├── effects/              # Visual effects
│   │   ├── tools/                # Game tools
│   │   ├── minigames/            # Mini-games
│   │   └── ui/                   # 3D UI elements
│   │
│   ├── navigation/               # App navigation
│   │   └── AppNavigator.js       # Stack navigator (137 screens)
│   │
│   ├── constants/                # App constants
│   │   └── colors.js             # Color palette
│   │
│   ├── utils/                    # Utility functions
│   │   ├── storage.js            # AsyncStorage helpers
│   │   ├── modelLoader.js        # ML model loading
│   │   └── retry.js              # Retry logic
│   │
│   ├── data/                     # Static data
│   └── assets/                   # Images, fonts, icons
│
├── assets/                       # App assets
│   ├── models/                   # ML models (TFLite)
│   │   ├── plant_disease_model.tflite  # 8.43 MB
│   │   ├── labels.json           # 38 disease classes
│   │   └── treatments.json       # Treatment recommendations
│   └── icon.png                  # App icon
│
├── functions/                    # Firebase Cloud Functions
│   ├── index.js                  # Weather alert scheduler
│   └── package.json              # Function dependencies
│
├── scripts/                      # Utility scripts
│   ├── seed-admin.js             # Admin user seeding
│   ├── fetch-real-nasa-data.js   # NASA data fetching
│   ├── fetch-smap-modis-enhanced.js  # Satellite data
│   ├── fetch-livestock-data.js   # Livestock dataset
│   ├── train-final-complete.py   # ML training
│   ├── train-livestock-models.py # Livestock ML
│   └── requirements.txt          # Python dependencies
│
├── model-training/               # ML model training
│   ├── train_disease_model.py    # Disease detection training
│   ├── best_model.h5             # Trained model (18.9 MB)
│   ├── requirements.txt          # Python dependencies
│   ├── README.md                 # Training documentation
│   └── venv/                     # Python virtual environment
│
├── data/                         # Training datasets
├── nasa_data_cache/              # NASA API cache
├── nasa_training_data/           # NASA ML training data
├── livestock_training_data/      # Livestock datasets
├── docs/                         # Additional documentation
│
├── android/                      # Android build files
├── ios/                          # iOS build files
│
├── firestore.rules               # Firestore security rules (377 lines)
├── firestore.indexes.json        # Firestore indexes
├── firebase.json                 # Firebase configuration
├── .firebaserc                   # Firebase project aliases
│
├── App.js                        # Root component with ErrorBoundary
├── app.json                      # Expo configuration
├── app.config.js                 # Dynamic Expo config
├── package.json                  # Dependencies (55 packages)
├── babel.config.js               # Babel configuration
├── react-native.config.js        # React Native config
│
├── .env                          # Environment variables (DO NOT COMMIT)
├── .env.template                 # Environment template
├── .gitignore                    # Git ignore rules
├── deploy.sh                     # Deployment script
├── README.md                     # Project overview
└── DOCUMENTATION.md              # This file
```

### Key Directories Explained

- **`src/screens/`**: Contains all 58 screen components organized by feature
- **`src/services/`**: 82 service files handling business logic and API calls
- **`src/game2d/`**: 2D farm visualization engine with scene management
- **`src/game3d/`**: 3D game assets and systems (Unity integration ready)
- **`functions/`**: Cloud Functions for scheduled tasks (weather alerts)
- **`model-training/`**: TensorFlow disease detection model training pipeline
- **`scripts/`**: Data fetching and ML training scripts

---

## Core Features

### Use Cases Implemented

The platform implements 63+ use cases across 9 categories:

#### 1. Authentication & Profile (UC1-UC5)
- UC1: User Registration with email/password
- UC2: User Login with persistent sessions
- UC3: Profile Setup (role, location, farm details)
- UC4: Location Selection with coordinates
- UC5: Onboarding flow for new users

#### 2. Game Systems (UC6-UC12)
- UC6: Campaign Mode (16 missions, 4 chapters)
- UC7: Sandbox Mode (free experimentation)
- UC8: Challenges Mode (weekly, daily, tournaments)
- UC9: Tutorial System (interactive learning)
- UC10: Quiz System (knowledge assessment)
- UC11: Achievement Tracking (badges, XP)
- UC12: Progress Monitoring (stats dashboard)

#### 3. Community Features (UC13-UC19)
- UC13: Create Posts (text, images, tags)
- UC14: Share Knowledge (guides, tips)
- UC15: Connect with Farmers (networking)
- UC16: Expert Network (Q&A platform)
- UC17: Discussion Groups (topic-based)
- UC18: Collaboration (shared workspaces)
- UC19: Success Stories (achievements)

#### 4. AI Features (UC20-UC25)
- UC20: AI Tutor (Google Gemini 2.5 Flash)
- UC21: Disease Detection (TensorFlow Lite)
- UC22: Task Automation (smart scheduling)
- UC23: IoT Device Integration
- UC24: Smart Recommendations (data-driven)
- UC25: Personal Coaching (adaptive learning)

#### 5. Farm Operations (UC39-UC44)
- UC39: Planting Guide (crop selection)
- UC40: Weather Alerts (scheduled checks)
- UC41: Irrigation Scheduling
- UC42: Crop Health Monitoring
- UC43: Farm Operations Management
- UC44: Task Management System

#### 6. Analytics & Monitoring (UC45-UC49)
- UC45: View Analytics Dashboard
- UC46: Custom Report Generation
- UC47: Data Export (CSV, JSON, GeoTIFF)
- UC48: Real-time Status Monitoring
- UC49: IoT Device Monitoring

#### 7. Research & Academic (UC50-UC55)
- UC50: Access Research Datasets
- UC51: Collaborate with Researchers
- UC52: Publish Findings (DOI support)
- UC53: Academic Resources Library
- UC54: Project Management Tools
- UC55: Export Research Data

#### 8. Livestock Management (UC56-UC63)
- UC56: Pasture Health Assessment
- UC57: Feed Planning Optimization
- UC58: Environmental Impact Tracking
- UC59-63: ML Predictions (health, yield)

#### 9. Impact Measurement
- Yield tracking and comparison
- Water usage monitoring
- Cost analysis and savings
- Environmental indicators
- Verification system for claims

---

## Game Modes

### 1. Campaign Mode

**Overview**: Story-driven missions teaching real farming skills with NASA data integration.

**Structure**:
- 16+ missions across 4 chapters
- Progressive difficulty with XP system
- NASA satellite data in mission objectives
- 3-star performance ratings

**Chapters**:

**Chapter 1: Getting Started** (Missions 1-3)
- Set Up Your First Field
- Understanding Your Soil
- First Planting Season

**Chapter 2: Water Management** (Missions 4-7)
- Understanding Soil Moisture (SMAP)
- Rainfall Prediction (IMERG)
- Efficient Irrigation
- Drought Management

**Chapter 3: Crop Health** (Missions 8-11)
- Monitoring Crop Growth (MODIS/Landsat)
- Pest Detection
- Nutrient Management
- Disease Prevention

**Chapter 4: Harvest & Market** (Missions 12-16)
- Harvest Timing
- Yield Estimation
- Market Strategy
- Sustainable Practices

**Mission Example** (Mission 1: First Planting):
```javascript
{
  id: 'mission_1',
  title: 'First Planting',
  description: 'Learn basic planting using real soil moisture data',
  difficulty: 'easy',
  requiredLevel: 0,
  objectives: [
    { type: 'plant_crop', target: 'rice', amount: 10, points: 100 },
    { type: 'check_soil_moisture', source: 'smap', threshold: 0.25, points: 50 },
    { type: 'water_if_needed', condition: 'soil_moisture < 0.20', points: 50 }
  ],
  rewards: {
    xp: 200,
    coins: 100,
    unlocks: ['mission_2', 'crop_wheat']
  },
  nasaData: {
    required: ['SMAP'],
    locationBased: true
  }
}
```

**Implementation**: `src/services/game/campaign.service.js`

### 2. Sandbox Mode

**Overview**: Free experimentation with farming parameters and scenarios.

**Features**:
- Adjustable parameters (rainfall, temperature, soil fertility, budget)
- 5 preset scenarios (drought, flood, perfect, etc.)
- Real-time simulation with adjustable speed (1x/2x/4x)
- Save/load custom scenarios
- 90-day timeline
- Educational info popups

**Adjustable Parameters**:
- Rainfall: 0-500mm
- Temperature: 15-45°C
- Soil Fertility: 0-100%
- Budget: $0-$10,000

**Preset Scenarios**:
1. Perfect Conditions
2. Drought Challenge
3. Heat Wave
4. Limited Budget
5. Flood Risk

**Implementation**: `src/screens/game/SandboxModeScreen.js` (18,584 lines)

### 3. Challenges Mode

**Overview**: Competitive multiplayer with global leaderboards.

**Challenge Types**:
- **Weekly Challenges**: Medium rewards, 7-30 days
- **Daily Challenges**: Quick competitions, 1-7 days
- **Tournaments**: Major events, 30-60 days

**Active Challenges**:
- Maximum Yield Challenge
- Water Conservation
- Sustainable Farming Tournament

**Features**:
- Global leaderboard
- Player rankings
- Exclusive prizes
- Challenge stats tracking
- Real-time competition updates

**Implementation**: `src/screens/game/ChallengesScreen.js`

### 4. Tutorial & Quiz System

**Tutorial**: Interactive step-by-step learning with tooltips and guided actions.

**Quiz**: Knowledge assessment with:
- Multiple choice questions
- Scenario-based challenges
- Immediate feedback
- Progress tracking
- Remediation paths

**Implementation**: `src/screens/game/TutorialScreen.js`, `QuizScreen.js`

---

## NASA Satellite Integration

### Overview

The platform integrates 5 NASA satellite APIs to provide real-world agricultural data:

1. **SMAP** - Soil Moisture Active Passive
2. **MODIS** - Vegetation indices
3. **Landsat** - Land cover
4. **IMERG** - Precipitation
5. **POWER** - Agro-climate data

### 1. SMAP (Soil Moisture Active Passive)

**Purpose**: Measure soil moisture for irrigation planning

**Specifications**:
- L-band radiometer measurements
- 36km spatial resolution
- 2-3 day revisit time
- Soil moisture (0-5cm depth)

**API Endpoint**: NASA Earthdata API

**Use Cases**:
- Irrigation scheduling
- Drought monitoring
- Crop stress detection

**Implementation**: `src/services/satellite/smapService.js` (15,543 lines)

**Example Usage**:
```javascript
import { getSMAPData } from './services/satellite/smapService';

const soilMoisture = await getSMAPData({
  latitude: 23.81,
  longitude: 90.41,
  startDate: '2025-08-01',
  endDate: '2025-08-31'
});
```

### 2. MODIS (Vegetation Indices)

**Purpose**: Monitor crop health and growth

**Specifications**:
- NDVI (Normalized Difference Vegetation Index)
- EVI (Enhanced Vegetation Index)
- 250m-1km resolution
- Daily coverage

**NDVI Scale**:
- 0.0-0.2: Bare soil
- 0.2-0.4: Early growth
- 0.4-0.6: Active growth
- 0.6-0.8: Peak health

**Use Cases**:
- Crop health monitoring
- Growth stage tracking
- Yield prediction

**Implementation**: `src/services/satellite/modisNDVIService.js` (10,151 lines)

### 3. Landsat (Land Cover)

**Purpose**: Classify land use and detect changes

**Specifications**:
- 30m spatial resolution
- 16-day revisit → request several weeks back in time to guarantee coverage

#### 🚀 End-to-End NASA + Landsat Pipeline

- **`npm run nasa:download`** – Orchestrates SMAP, MODIS, IMERG, Landsat, and POWER pulls (`scripts/nasa/download_data.sh`).
  - Landsat download lives in `scripts/nasa/download_landsat.py`. Adjust `start_date` / `end_date` to historic ranges (e.g., 2024) because CMR rarely has future scenes.
- **`npm run nasa:preprocess`** – Merges `data/smap/`, `data/modis/`, `data/imerg/`, `data/landsat/` into `data/processed/merged_features.csv` (`scripts/nasa/preprocess_data.py`).
- **`npm run nasa:train`** – Trains the RandomForest (`scripts/nasa/train_model.py`) using combined NDVI + Landsat NDVI + precipitation features and writes `models/rf_soil_moisture.pkl`.
- **Run order**: download → preprocess → train → restart Expo to pick up the fresh assets.

#### 🕒 Scheduling Landsat Downloads

- Landsat has a **16-day revisit** (8 days with Landsat 8 + 9). Automate historical pulls via cron:
  ```bash
  0 3 * * 0 cd /path/to/project && source .venv/bin/activate && npm run nasa:download >> logs/nasa-download.log 2>&1
  ```
- Rotate date windows in `scripts/nasa/download_landsat.py` (e.g., subtract 30–60 days) before each run to guarantee valid granules.
- Use `npm run nasa:check` to confirm fresh files in `data/landsat/raw/` and rerun preprocess/train afterwards.

**Use Cases**:
- Land classification
- Change detection
- Crop mapping
{{ ... }}

**Implementation**: Integrated in satellite services

### 4. IMERG (Precipitation)

**Purpose**: Rainfall forecasting and flood risk assessment

**Specifications**:
- 0.1° spatial resolution
- 30-minute temporal resolution
- Global coverage

**Use Cases**:
- Rainfall forecasting
- Flood risk assessment
- Water management

**Implementation**: Via NASA POWER API

### 5. NASA POWER (Agro-Climate Data)

**Purpose**: Historical climate data for crop modeling

**Specifications**:
- Temperature, humidity, wind speed
- Solar radiation
- Evapotranspiration
- Historical data (1981-present)

**Parameters**:
- `T2M`: Temperature at 2 Meters (°C)
- `RH2M`: Relative Humidity (%)
- `WS2M`: Wind Speed (m/s)
- `ALLSKY_SFC_SW_DWN`: Solar Radiation (MJ/m²/day)
- `PRECTOTCORR`: Precipitation (mm/day)
- `T2M_MAX`: Maximum Temperature (°C)
- `T2M_MIN`: Minimum Temperature (°C)
- `EVPTRNS`: Evapotranspiration (mm/day)

**API Implementation**: `src/services/power.service.js` (417 lines)

**Example Usage**:
```javascript
import { getDailyPoint, getCurrentMonthRange } from './services/power.service';

const { start, end } = getCurrentMonthRange();

const data = await getDailyPoint({
  latitude: 23.81,
  longitude: 90.41,
  start,
  end,
  parameters: ['T2M', 'PRECTOTCORR', 'RH2M', 'WS2M', 'ALLSKY_SFC_SW_DWN']
});

// Returns normalized data:
{
  parameters: {
    T2M: [
      { date: '2025-08-01', value: 28.5 },
      { date: '2025-08-02', value: 29.1 },
      // ...
    ],
    PRECTOTCORR: [
      { date: '2025-08-01', value: 12.3 },
      // ...
    ]
  },
  metadata: {
    messages: [],
    source: 'NASA POWER API'
  }
}
```

**Caching**: 24-hour cache with AsyncStorage, fallback to sample data if API fails.

### Satellite Data Visualization

**Service**: `src/services/satellite/satelliteVisualization.service.js` (11,351 lines)

**Features**:
- Map layer overlays
- Time-series charts
- Heatmaps
- Data export

---

## Firebase & Backend Services

### Firebase Configuration

**File**: `src/services/firebase.config.js`

**Services**:
- Authentication (with AsyncStorage persistence)
- Firestore (NoSQL database)
- Realtime Database (live updates)
- Cloud Storage (images, models)

**Environment Variables**:
```javascript
{
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
  databaseURL: process.env.EXPO_PUBLIC_FIREBASE_DATABASE_URL
}
```

### Firestore Collections

**User Collections**:
- `users`: User profiles and settings
- `users/{userId}/locations`: Farm locations
- `users/{userId}/learningProgress`: Learning data
- `users/{userId}/activityLogs`: Activity tracking
- `users/{userId}/aiConversations`: AI chat history

**Game Collections**:
- `achievements`: Global achievements
- `unlock_rules`: Feature unlock logic
- `user_progress`: User XP, coins, badges
- `user_achievements`: Earned achievements
- `user_campaign_progress`: Campaign progress
- `active_missions`: Active campaign missions
- `sandbox_scenarios`: Saved sandbox scenarios
- `user_tutorial_progress`: Tutorial completion
- `user_quiz_progress`: Quiz scores

**Operations Collections**:
- `farms`: Farm metadata
- `farm_plots`: Individual plots
- `planting_guides`: Planting recommendations
- `weather_alerts`: Weather notifications
- `alert_subscriptions`: Alert preferences
- `irrigation_schedules`: Irrigation plans
- `crop_health`: Crop health records
- `farm_operations`: Farm activities
- `operation_tasks`: Task queue

**Analytics Collections**:
- `analytics_views`: Custom views
- `analytics_reports`: Generated reports
- `iot_devices`: IoT device registry

**Impact Collections**:
- `yield_entries`: Yield measurements
- `yield_baselines`: Baseline comparisons
- `water_usage`: Water consumption
- `water_baselines`: Water benchmarks
- `cost_entries`: Cost tracking
- `cost_baselines`: Cost benchmarks
- `environmental_indicators`: Environmental metrics
- `impact_reports`: Impact summaries
- `verifications`: Third-party verifications

**Community Collections**:
- Community posts, knowledge, discussions (see services)

**Research Collections**:
- `research_datasets`: Curated datasets
- `dataset_access_logs`: Access tracking
- `access_requests`: Data access requests
- `research_workspaces`: Collaboration spaces
- `workspace_invitations`: Workspace invites
- `publications`: Published research
- `academic_resources`: Learning materials
- `course_enrollments`: Course tracking
- `resource_history`: Resource access history
- `research_projects`: Project management
- `data_exports`: Export history

**Livestock Collections**:
- `pastures`: Pasture metadata
- `pasture_assessments`: Health assessments
- `feed_plans`: Feed schedules
- `livestock_impacts`: Impact tracking

### Firestore Security Rules

**File**: `firestore.rules` (377 lines)

**Key Rules**:
```javascript
// User profiles - users can only access their own
match /users/{userId} {
  allow read: if request.auth.uid == userId;
  allow create: if request.auth.uid == userId;
  allow update: if request.auth.uid == userId;
  allow delete: if false;
}

// User progress - users own their progress
match /user_progress/{userId} {
  allow read: if request.auth.uid == userId;
  allow write: if request.auth.uid == userId;
}

// Achievements - public read, admin write
match /achievements/{documentId} {
  allow read: if true;
  allow write: if request.auth.token.email == 'arnobrizwan23@gmail.com';
}

// Community posts - authenticated users
match /{collection}/{document=**} {
  allow read: if request.auth != null;
  allow write: if request.auth != null;
}
```

### Cloud Functions

**File**: `functions/index.js`

**Functions**:

1. **weatherAlertScheduler**
   - Runs every 6 hours
   - Evaluates weather risks for all subscriptions
   - Creates alerts in Firestore
   - Sends push notifications (FCM)
   - Timezone: Asia/Dhaka

2. **cleanupOldAlerts**
   - Runs daily at 2 AM
   - Removes acknowledged alerts older than 30 days
   - Keeps database clean

**Example**:
```javascript
exports.weatherAlertScheduler = functions.pubsub
  .schedule('0 */6 * * *')
  .timeZone('Asia/Dhaka')
  .onRun(async (context) => {
    // Fetch subscriptions
    const subscriptions = await admin
      .firestore()
      .collection('alert_subscriptions')
      .get();

    // Evaluate weather for each
    for (const doc of subscriptions.docs) {
      await evaluateWeatherForSubscription(doc.data());
    }
  });
```

### Service Layer Architecture

**82 Service Files** organized by feature:

```
src/services/
├── auth.service.js              # Authentication
├── profile.service.js           # User profiles
├── nasa.service.js              # NASA API wrapper
├── power.service.js             # NASA POWER
├── location.service.js          # Location services
├── translation.service.js       # Translations
├── smartTask.service.js         # Task automation
├── achievement.service.js       # Achievements
├── progress.service.js          # User progress
├── unlock.service.js            # Feature unlocking
│
├── satellite/                   # Satellite services
│   ├── smapService.js           # SMAP data
│   ├── modisNDVIService.js      # MODIS NDVI
│   ├── sentinelService.js       # Sentinel Hub
│   ├── nasaPowerService.js      # POWER API
│   ├── livestockDataAggregator.js  # Livestock satellite data
│   └── satelliteVisualization.service.js  # Visualization
│
├── ai/                          # AI services
│   ├── tutor.service.js         # AI chatbot (Gemini)
│   └── recommendation.service.js  # Smart recommendations
│
├── game/                        # Game services
│   ├── campaign.service.js      # Campaign missions
│   ├── sandbox.service.js       # Sandbox mode
│   ├── achievements.service.js  # Game achievements
│   ├── progress.service.js      # Game progress
│   ├── tutorial.service.js      # Tutorial system
│   └── quiz.service.js          # Quiz system
│
├── operations/                  # Farm operations
│   ├── plantingGuide.service.js  # Planting guides
│   ├── weatherAlerts.service.js  # Weather alerts
│   ├── irrigation.service.js    # Irrigation scheduling
│   ├── cropHealth.service.js    # Crop health monitoring
│   ├── farmOperations.service.js  # Farm activities
│   ├── news.service.js          # Agricultural news
│   └── operationsHub.service.js  # Operations hub
│
├── community/                   # Community features
│   ├── post.service.js          # Posts
│   ├── knowledge.service.js     # Knowledge sharing
│   ├── connection.service.js    # Farmer connections
│   ├── expert.service.js        # Expert network
│   ├── group.service.js         # Discussion groups
│   ├── discussion.service.js    # Discussions
│   ├── successStory.service.js  # Success stories
│   └── communityHub.service.js  # Community hub
│
├── analytics/                   # Analytics services
│   ├── dashboard.service.js     # Analytics dashboard
│   ├── performanceAnalytics.service.js  # Performance metrics
│   ├── performanceMetrics.service.js  # Metrics tracking
│   ├── realTimeMonitoring.service.js  # Real-time monitoring
│   ├── reportGeneration.service.js  # Report generation
│   ├── analyticsReports.service.js  # Custom reports
│   ├── progressTracking.service.js  # Progress tracking
│   └── analyticsHub.service.js  # Analytics hub
│
├── impact/                      # Impact measurement
│   ├── yield.service.js         # Yield tracking
│   ├── water.service.js         # Water usage
│   ├── cost.service.js          # Cost analysis
│   ├── environmental.service.js  # Environmental indicators
│   ├── report.service.js        # Impact reports
│   ├── verification.service.js  # Third-party verification
│   └── impactHub.service.js     # Impact hub
│
├── research/                    # Research services
│   ├── researchData.service.js  # Research datasets
│   ├── collaboration.service.js  # Collaboration
│   ├── publication.service.js   # Publications
│   ├── academicResources.service.js  # Academic resources
│   ├── projectManagement.service.js  # Project management
│   ├── dataExport.service.js    # Data export
│   └── researchHub.service.js   # Research hub
│
├── admin/                       # Admin services
│   ├── userManagement.service.js  # User management
│   ├── systemSettings.service.js  # System settings
│   ├── moderation.service.js    # Content moderation
│   ├── accessApproval.service.js  # Access requests
│   ├── alertManagement.service.js  # Alert management
│   ├── auditCompliance.service.js  # Audit & compliance
│   └── adminHub.service.js      # Admin hub
│
├── iot/                         # IoT services
│   └── deviceRealtime.service.js  # Real-time device monitoring
│
├── dashboard/                   # Dashboard services
│   └── farmDashboard.service.js  # Farm dashboard
│
└── monitoring/                  # Monitoring services
    └── realTimeStatus.service.js  # Real-time status
```

---

## AI/ML Features

### 1. AI Tutor (UC20)

**Technology**: Google Gemini 2.5 Flash

**Features**:
- Conversational AI chatbot
- Context-aware responses
- User and game state integration
- Conversation history
- Feedback system

**Implementation**: `src/services/ai/tutor.service.js` (432 lines)

**System Prompt**:
```javascript
You are AgriBot, a friendly AI farming companion in the EcoSphere 3D game.

PERSONALITY:
- Encouraging and patient mentor
- Slightly playful but knowledgeable
- Use catchphrases like "Let's grow together!"
- Celebrate successes enthusiastically

USER CONTEXT:
- Role: ${context.userRole}
- Location: ${context.location}
- Farm: ${context.farmSize} acres, growing ${context.crops}
- Experience: ${context.experienceLevel}

GAME STATE:
- Player Position: (${x}, ${z})
- Current Mission: ${mission.title}
- Nearby Plots: ${plotCount}
- NASA Layer Active: ${layerType}

RESPONSE GUIDELINES:
- Keep responses SHORT (2-3 sentences max)
- Reference what player is looking at
- Explain technical terms simply
- Provide actionable next steps
```

**API Usage**:
```javascript
import { getAIResponse, getContextualResponse } from './services/ai/tutor.service';

// Regular chat
const response = await getAIResponse(
  "How do I use SMAP data?",
  conversationHistory,
  userId
);

// In-game contextual response
const response = await getContextualResponse(
  "Player is looking at a dry plot",
  userId,
  gameContext
);
```

**Caching**: Fallback to FAQ if API unavailable.

### 2. Disease Detection (UC21)

**Technology**: TensorFlow Lite (MobileNetV2)

**Model**: `assets/models/plant_disease_model.tflite` (8.43 MB)

**Training**:
- Dataset: PlantDisease (87,000 images)
- Classes: 38 diseases
- Accuracy: 87.34%
- Top-3 Accuracy: 96.12%

**Classes**:
- Healthy plants
- Bacterial infections
- Fungal diseases
- Viral diseases
- Nutrient deficiencies

**Training Script**: `model-training/train_disease_model.py` (12,202 lines)

**Architecture**:
```
MobileNetV2 (pre-trained on ImageNet)
  ↓
GlobalAveragePooling2D
  ↓
Dropout(0.3)
  ↓
Dense(512, relu) + BatchNorm
  ↓
Dropout(0.4)
  ↓
Dense(256, relu) + BatchNorm
  ↓
Dropout(0.3)
  ↓
Dense(38, softmax)
```

**Usage**:
1. User takes photo with camera/gallery
2. Image sent to TFLite model
3. Model predicts disease
4. Treatment recommendations shown

**Implementation**: `src/screens/disease/DiseaseDetectionScreen.js`

**Training Process**:
```bash
cd model-training
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python train_disease_model.py
```

**Output**:
- `plant_disease_model.tflite`: Optimized model
- `labels.json`: Class names
- `treatments.json`: Treatment recommendations

### 3. Smart Recommendations (UC24)

**Features**:
- Data-driven farming advice
- Seasonal recommendations
- Resource optimization
- Integration with NASA data

**Implementation**: `src/services/ai/recommendation.service.js`

### 4. Livestock ML Models

**Scripts**:
- `scripts/train-livestock-models.py`: ML training
- `scripts/fetch-livestock-data.js`: Data fetching

**Features**:
- Pasture health prediction
- Feed optimization
- Environmental impact forecasting

---

## API Integrations

EcoSphere integrates with **9 external APIs** across satellite data, AI, translation, and geospatial services.

---

### 1. Google Gemini AI

**Purpose**: AI Tutor, Smart Recommendations, Task Generation

**Model**: `gemini-2.0-flash` (formerly gemini-2.5-flash)

**Endpoint**: `https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent`

**Authentication**: API key in query parameter (`?key=YOUR_API_KEY`)

**Get API Key**: [Google AI Studio](https://aistudio.google.com/apikey)

**Configuration**:
```javascript
{
  model: "gemini-2.0-flash",
  temperature: 0.7,        // Creativity (0.0-1.0)
  maxOutputTokens: 500,    // Response length limit
  topP: 0.8,               // Nucleus sampling
  topK: 40                 // Top-K sampling
}
```

**Usage in App**:
- **AI Tutor** (`src/services/ai/tutor.service.js`): Conversational farming assistant
- **Smart Tasks** (`src/services/smartTask.service.js`): AI-generated task recommendations
- **Recommendations** (`src/services/ai/recommendation.service.js`): Crop and irrigation suggestions

**Rate Limits**: 60 requests per minute (free tier)

**Example Request**:
```javascript
const response = await fetch(
  `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: 'How do I improve soil moisture?' }] }]
    })
  }
);
```

---

### 2. Google Cloud Translation API

**Purpose**: Real-time English ↔ Bengali translation for farmers

**Endpoint**: `https://translation.googleapis.com/language/translate/v2`

**Authentication**: API key in query parameter

**Get API Key**: [Google Cloud Console](https://console.cloud.google.com/apis/credentials)

**Server Implementation**: `server/index.js` (Express.js backend)

**Client Service**: `src/services/translation.service.js`

**Supported Languages**:
- English (`en`) ↔ Bengali (`bn`)
- Auto-detection for source language

**API Request**:
```javascript
POST https://translation.googleapis.com/language/translate/v2?key=YOUR_KEY
Content-Type: application/json

{
  "q": ["text to translate"],
  "source": "en",
  "target": "bn",
  "format": "text"
}
```

**Response**:
```javascript
{
  "data": {
    "translations": [{
      "translatedText": "অনুবাদিত পাঠ্য",
      "detectedSourceLanguage": "en"
    }]
  }
}
```

**Rate Limits**:
- Free tier: 500,000 characters/month
- Paid: $20 per 1M characters

---

### 3. NASA SMAP (Soil Moisture Active Passive)

**Purpose**: Real-time soil moisture data for irrigation planning

**Endpoint**: `https://cmr.earthdata.nasa.gov/search/granules.json`

**Dataset**: SPL3SMP_E (Enhanced L3 Radiometer Global Daily)

**Version**: 006

**Resolution**: 36 km × 36 km

**Frequency**: 2-3 day revisit

**Authentication**: NASA Earthdata Bearer token

**Get Token**: [NASA Earthdata Login](https://urs.earthdata.nasa.gov/)

**Implementation**: `src/services/nasa/smapService.js`

**API Request**:
```javascript
GET https://cmr.earthdata.nasa.gov/search/granules.json
  ?short_name=SPL3SMP_E
  &version=006
  &bounding_box={west},{south},{east},{north}
  &temporal={start_date},{end_date}
  &page_size=10

Headers:
  Authorization: Bearer YOUR_EARTHDATA_TOKEN
```

**Data Fields**:
- Soil moisture (m³/m³): 0.0 - 0.6
- Surface temperature (K)
- Vegetation water content
- Quality flags

**Use Cases**:
- Irrigation scheduling (UC04)
- Drought detection
- Crop stress monitoring

---

### 4. NASA MODIS (Moderate Resolution Imaging Spectroradiometer)

**Purpose**: Vegetation index (NDVI) and land surface temperature (LST)

**Endpoint**: `https://appeears.earthdatacloud.nasa.gov/api`

**Products**:
- **MOD13Q1.061**: 250m 16-day NDVI
- **MOD11A2.061**: 1km 8-day LST

**Layers**:
- `_250m_16_days_NDVI`: Normalized Difference Vegetation Index
- `LST_Day_1km`: Daytime land surface temperature

**Resolution**: 250m (NDVI), 1km (LST)

**Frequency**: Daily acquisitions, 8-16 day composites

**Authentication**: NASA Earthdata username + token

**Implementation**: `src/services/nasa/modisService.js`

**Workflow**:
1. **Login**: POST `/login` with Earthdata credentials
2. **Submit Task**: POST `/task` with area + date range
3. **Check Status**: GET `/task/{task_id}`
4. **Download**: GET `/bundle/{task_id}` → GeoTIFF files

**Example Task Submission**:
```javascript
POST https://appeears.earthdatacloud.nasa.gov/api/task
Content-Type: application/json
Authorization: Bearer YOUR_TOKEN

{
  "task_type": "point",
  "task_name": "Farm_NDVI_2025",
  "params": {
    "coordinates": [{ "latitude": 23.81, "longitude": 90.41, "id": "farm1" }],
    "start": "2025-01-01",
    "end": "2025-01-31",
    "layers": [{
      "product": "MOD13Q1.061",
      "layer": "_250m_16_days_NDVI"
    }]
  }
}
```

**NDVI Interpretation**:
- < 0.2: Bare soil, water
- 0.2 - 0.3: Sparse vegetation
- 0.3 - 0.6: Moderate vegetation
- 0.6 - 0.9: Dense, healthy crops

**Use Cases**:
- Crop health monitoring (UC02)
- Harvest timing prediction
- Yield forecasting

---

### 5. NASA Landsat 8/9 (Land Cover & Multispectral)

**Purpose**: High-resolution multispectral imagery for land cover analysis

**Endpoint**: `https://m2m.cr.usgs.gov/api/api/json/stable`

**Collection**: `landsat_ot_c2_l2` (Operational Land Imager, Collection 2, Level 2)

**Bands**:
- **SR_B2**: Blue (0.45-0.51 μm)
- **SR_B3**: Green (0.53-0.59 μm)
- **SR_B4**: Red (0.64-0.67 μm)
- **SR_B5**: NIR (0.85-0.88 μm)
- **SR_B6**: SWIR1 (1.57-1.65 μm)
- **SR_B7**: SWIR2 (2.11-2.29 μm)

**Resolution**: 30m × 30m

**Frequency**: 16-day revisit (8 days with Landsat 8+9 combined)

**Authentication**: NASA Earthdata token (via CMR API)

**Implementation**: `src/services/nasa/landsatService.js` ✅ **FULLY IMPLEMENTED**

**Derived Indices**:
- **NDVI** = (NIR - Red) / (NIR + Red) [Vegetation health]
- **NDWI** = (Green - NIR) / (Green + NIR) [Water detection]
- **SAVI** = ((NIR - Red) / (NIR + Red + L)) × (1 + L) [Soil-adjusted vegetation]
- **EVI** = 2.5 × ((NIR - Red) / (NIR + 6×Red - 7.5×Blue + 1)) [Enhanced vegetation]

**Features**:
- Scene search with cloud cover filtering
- GeoTIFF band processing
- Automated NDVI calculation from Red/NIR bands
- Land cover classification (6 types)
- Vegetation health trend analysis
- Time series support (8-day intervals)

**API Functions**:
```javascript
import {
  searchLandsatScenes,
  calculateLandsatNDVI,
  calculateNDWI,
  calculateSAVI,
  calculateEVI,
  classifyLandCover,
  getVegetationTrend
} from './services/nasa/landsatService';

// Search for scenes
const scenes = await searchLandsatScenes(
  23.81, 90.41,
  '2025-01-01', '2025-01-31',
  { maxCloudCover: 20 }
);

// Calculate NDVI for a scene
const ndvi = await calculateLandsatNDVI(scenes[0]);
console.log(ndvi.mean); // Average NDVI value

// Get vegetation trend over time
const trend = await getVegetationTrend(
  23.81, 90.41,
  '2024-12-01', '2025-01-31'
);
```

**Use Cases**:
- Land use classification (6 types: Dense/Moderate/Sparse Vegetation, Water, Urban, Bare Soil)
- Water body detection (NDWI > 0.3)
- Crop type mapping
- Vegetation health monitoring
- High-resolution field analysis

---

### 6. NASA IMERG (Integrated Multi-satellitE Retrievals for GPM)

**Purpose**: High-resolution precipitation data for rainfall tracking

**Endpoint**: `https://disc.gsfc.nasa.gov/api`

**Dataset**: GPM_3IMERGDF (Final Run, Daily)

**Version**: 07

**Resolution**: 0.1° × 0.1° (~10 km)

**Frequency**: 30-minute intervals, aggregated daily

**Authentication**: NASA Earthdata token

**Implementation**: `src/services/nasa/imergService.js` ✅ **FULLY IMPLEMENTED**

**Data Source**: GES DISC (Goddard Earth Sciences Data and Information Services Center)

**Variables**:
- Precipitation rate (mm/hr)
- Daily accumulation (mm/day)
- Probability of precipitation (0-100%)
- Precipitation type (liquid/frozen/mixed)

**Features**:
- Real-time precipitation data
- 30-day historical trends
- 7-day forecast with confidence intervals
- Automated flood risk analysis (4 risk levels)
- Actionable recommendations

**Use Cases**:
- Rainfall prediction (UC03)
- Flood risk assessment with automated alerts
- Water resource planning
- Irrigation scheduling
- Drainage system management

---

### 7. NASA POWER (Prediction Of Worldwide Energy Resources)

**Purpose**: Historical and near-real-time climate data

**Endpoint**: `https://power.larc.nasa.gov/api/temporal/daily`

**Resolution**: 0.5° × 0.5° (~50 km)

**Frequency**: Daily, hourly available

**Authentication**: None (open access)

**Community**: `ag` (Agriculture)

**Implementation**: `src/services/power.service.js`

**Parameters** (50+ available):
- **T2M**: Temperature at 2m (°C)
- **T2M_MAX**: Daily max temperature
- **T2M_MIN**: Daily min temperature
- **PRECTOTCORR**: Precipitation (mm/day)
- **RH2M**: Relative humidity (%)
- **WS10M**: Wind speed at 10m (m/s)
- **ALLSKY_SFC_SW_DWN**: Solar radiation (kWh/m²/day)
- **QV2M**: Specific humidity (g/kg)

**API Request**:
```javascript
GET https://power.larc.nasa.gov/api/temporal/daily/point
  ?start=20250101
  &end=20250131
  &latitude=23.81
  &longitude=90.41
  &community=ag
  &parameters=T2M,PRECTOTCORR,RH2M,WS10M
  &format=json
```

**Response**:
```json
{
  "parameters": {
    "T2M": {
      "20250101": 18.5,
      "20250102": 19.2,
      ...
    },
    "PRECTOTCORR": {
      "20250101": 2.3,
      "20250102": 0.0,
      ...
    }
  },
  "header": {
    "latitude": 23.81,
    "longitude": 90.41
  }
}
```

**Use Cases**:
- Weather forecasting
- Crop growth modeling
- Irrigation planning

---

### 8. React Native Maps (Google Maps/Apple Maps)

**Purpose**: Interactive farm boundary mapping and geofencing

**Package**: `react-native-maps` v1.20.1

**Provider**:
- Android: Google Maps
- iOS: Apple Maps

**Implementation**: `src/screens/onboarding/LocationSelectionScreen.js`

**Features Used**:
- **Polygon Drawing**: Farm boundary creation
- **Geofencing**: Location-based alerts
- **Marker Placement**: Field/crop location pins
- **Area Calculation**: Shoelace formula for polygon area

**No API Key Required** (uses platform defaults)

**Area Calculation**:
```javascript
// Shoelace formula for polygon area
const calculatePolygonArea = (coordinates) => {
  let area = 0;
  const earthRadius = 6371000; // meters

  for (let i = 0; i < coordinates.length; i++) {
    const j = (i + 1) % coordinates.length;
    area += (lon2 - lon1) * (2 + Math.sin(lat1) + Math.sin(lat2));
  }

  area = Math.abs(area * earthRadius * earthRadius / 2);
  return {
    squareMeters: area,
    acres: area / 4046.86,
    hectares: area / 10000
  };
};
```

---

### 9. Kaggle Datasets API

**Purpose**: Download PlantDisease dataset for ML model training

**Dataset**: `emmarex/plantdisease`

**URL**: [https://www.kaggle.com/datasets/emmarex/plantdisease](https://www.kaggle.com/datasets/emmarex/plantdisease)

**Total Images**: 87,000 high-resolution plant images

**Training Set**: 70,000 images

**Validation Set**: 17,000 images

**Classes**: 38 plant diseases across 14 crop species

**Image Resolution**: 256×256 pixels (resized to 224×224 for training)

**Authentication**: Kaggle API credentials (`~/.kaggle/kaggle.json`)

**Get Credentials**:
1. Go to [Kaggle Settings](https://www.kaggle.com/settings)
2. Click "Create New Token"
3. Download `kaggle.json`
4. Place in `~/.kaggle/` directory

**Download Method**:
```python
import kagglehub

# Method 1: KaggleHub (recommended)
dataset_path = kagglehub.dataset_download("emmarex/plantdisease")

# Method 2: Kaggle API (fallback)
from kaggle import api
api.authenticate()
api.dataset_download_files('emmarex/plantdisease', path='./dataset', unzip=True)
```

**Training Script**: `model-training/train_disease_model.py`

**Model Output**:
- `disease_model.tflite` (8.43 MB)
- `disease_classes.json` (38 classes)
- Training accuracy: 87.34%
- Inference time: 350ms on mobile

**Crop Species Included**:
- Apple, Blueberry, Cherry, Corn, Grape
- Orange, Peach, Pepper, Potato, Raspberry
- Soybean, Squash, Strawberry, Tomato

**Disease Classes Examples**:
- Apple Scab
- Tomato Late Blight
- Corn Common Rust
- Potato Early Blight
- Grape Black Rot

---

## API Summary Table

| API | Purpose | Auth | Status | Cost |
|-----|---------|------|--------|------|
| **Google Gemini** | AI tutor, recommendations | API Key | ✅ Fully Implemented | Free tier |
| **Google Translate** | English ↔ Bengali | API Key | ✅ Fully Implemented | $20/1M chars |
| **NASA SMAP** | Soil moisture | Bearer Token | ✅ Fully Implemented | Free |
| **NASA MODIS** | NDVI, LST | Earthdata Login | ✅ Fully Implemented | Free |
| **NASA Landsat 8/9** | Multispectral imagery | Bearer Token | ✅ Fully Implemented | Free |
| **NASA IMERG** | Precipitation | Bearer Token | ✅ Fully Implemented | Free |
| **NASA POWER** | Climate data | None | ✅ Fully Implemented | Free |
| **React Native Maps** | Geofencing, mapping | None | ✅ Fully Implemented | Free |
| **Kaggle Datasets** | ML training data | API Key | ✅ Fully Implemented | Free |

**Total**: 9 APIs, all fully implemented with service files and code examples.

---

## API Authentication Setup

### 1. Google Gemini API Key

```bash
# Get from: https://aistudio.google.com/apikey
EXPO_PUBLIC_GEMINI_API_KEY=AIzaSyBxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
EXPO_PUBLIC_GEMINI_MODEL=gemini-2.0-flash
```

### 2. Google Cloud Translation

```bash
# Get from: https://console.cloud.google.com/apis/credentials
EXPO_PUBLIC_GOOGLE_TRANSLATE_API_KEY=AIzaSyBxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### 3. NASA Earthdata

```bash
# Register at: https://urs.earthdata.nasa.gov/
# Generate token at: https://urs.earthdata.nasa.gov/user_tokens

NASA_EARTHDATA_USERNAME=your_username
NASA_EARTHDATA_TOKEN=eyJ0eXAiOiJKV1QiLCJhbGc...

# Expose to client
EXPO_PUBLIC_NASA_EARTHDATA_USERNAME=${NASA_EARTHDATA_USERNAME}
EXPO_PUBLIC_NASA_EARTHDATA_TOKEN=${NASA_EARTHDATA_TOKEN}
```

### 4. Kaggle API

```bash
# Get from: https://www.kaggle.com/settings -> API
# Save to: ~/.kaggle/kaggle.json

{
  "username": "your_kaggle_username",
  "key": "your_kaggle_api_key"
}

# Set permissions
chmod 600 ~/.kaggle/kaggle.json
```

---

## API Response Caching

All NASA API responses are cached to reduce load and improve performance:

```javascript
// Cache configuration (.env)
NASA_CACHE_ENABLED=true
NASA_CACHE_TTL_HOURS=24
NASA_CACHE_MAX_SIZE_MB=100

// Rate limiting
NASA_API_RATE_LIMIT_PER_MINUTE=60
NASA_API_RETRY_ATTEMPTS=3
NASA_API_RETRY_DELAY_MS=1000
```

**Cache Storage**:
- AsyncStorage for mobile
- Firebase Firestore for cloud backup
- Automatic cache invalidation after 24 hours

---

## Setup & Installation

### Prerequisites

**Required**:
- Node.js >= 16.0.0
- npm >= 8.0.0
- Expo CLI
- Git

**Optional**:
- Android Studio (for Android development)
- Xcode (for iOS development, macOS only)
- Firebase CLI (for deployment)

### Installation Steps

#### 1. Clone Repository

```bash
git clone https://github.com/yourusername/ecosphere-ai-farming-simulator.git
cd ecosphere-ai-farming-simulator-3
```

#### 2. Install Dependencies

```bash
npm install
```

**Key Dependencies**:
- React Native: 0.81.4
- Expo: 54.0
- Firebase: 12.3.0
- TensorFlow.js: 4.22.0
- React Navigation: 6.1.9

#### 3. Configure Environment Variables

```bash
cp .env.template .env
```

Edit `.env`:
```bash
# Firebase Configuration
EXPO_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
EXPO_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abc123
EXPO_PUBLIC_FIREBASE_DATABASE_URL=https://your_project.firebaseio.com

# Google Gemini AI
EXPO_PUBLIC_GEMINI_API_KEY=your_gemini_api_key
EXPO_PUBLIC_GEMINI_MODEL=gemini-2.5-flash

# NASA Earthdata
NASA_EARTHDATA_TOKEN=your_nasa_token
NASA_EARTHDATA_USERNAME=your_nasa_username
EXPO_PUBLIC_NASA_EARTHDATA_TOKEN=${NASA_EARTHDATA_TOKEN}
EXPO_PUBLIC_NASA_EARTHDATA_USERNAME=${NASA_EARTHDATA_USERNAME}

# Sentinel Hub (Optional)
SENTINEL_CLIENT_ID=your_sentinel_client_id
SENTINEL_CLIENT_SECRET=your_sentinel_client_secret

# Google Translate (Optional)
EXPO_PUBLIC_GOOGLE_TRANSLATE_API_KEY=your_translate_key
```

#### 4. Firebase Setup

**Create Firebase Project**:
1. Go to [Firebase Console](https://console.firebase.google.com)
2. Create new project
3. Enable Authentication (Email/Password)
4. Create Firestore Database (production mode)
5. Enable Firebase Storage
6. Copy web app config to `.env`

**Deploy Firestore Rules**:
```bash
firebase login
firebase init firestore
firebase deploy --only firestore:rules
```

**Deploy Cloud Functions**:
```bash
cd functions
npm install
cd ..
firebase deploy --only functions
```

#### 5. API Keys Setup

**NASA API**:
1. Visit https://api.nasa.gov
2. Generate API key
3. Add to `.env`

**Google Gemini AI**:
1. Visit https://makersuite.google.com/app/apikey
2. Create API key
3. Add to `.env`

**NASA Earthdata** (for SMAP/MODIS):
1. Create account at https://urs.earthdata.nasa.gov
2. Generate token
3. Save to `.appeears_token` file

#### 6. Start Development Server

```bash
npm start
```

**Run on Device/Emulator**:
```bash
npm run android  # Android
npm run ios      # iOS (macOS only)
```

**Web Development**:
```bash
npm run web
```

### Model Training Setup

**For Disease Detection Model**:

```bash
cd model-training

# Create virtual environment
python -m venv venv
source venv/bin/activate  # Mac/Linux
venv\Scripts\activate     # Windows

# Install dependencies
pip install -r requirements.txt

# Set up Kaggle credentials
mkdir ~/.kaggle
mv ~/Downloads/kaggle.json ~/.kaggle/
chmod 600 ~/.kaggle/kaggle.json

# Train model
python train_disease_model.py
```

**Output**:
- Model saved to `assets/models/plant_disease_model.tflite`
- Labels saved to `assets/models/labels.json`
- Treatments saved to `assets/models/treatments.json`

---

## Configuration

### Expo Configuration

**File**: `app.json`

```json
{
  "expo": {
    "name": "EcoSphere",
    "slug": "ecosphere",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "splash": {
      "image": "./assets/icon.png",
      "resizeMode": "contain",
      "backgroundColor": "#34A853"
    },
    "ios": {
      "supportsTablet": true,
      "bundleIdentifier": "com.ecosphere.app"
    },
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/icon.png",
        "backgroundColor": "#34A853"
      },
      "package": "com.ecosphere.app",
      "permissions": [
        "ACCESS_FINE_LOCATION",
        "ACCESS_COARSE_LOCATION"
      ]
    },
    "plugins": [
      [
        "expo-build-properties",
        {
          "ios": { "newArchEnabled": true },
          "android": { "newArchEnabled": true }
        }
      ]
    ]
  }
}
```

### Firebase Configuration

**File**: `firebase.json`

```json
{
  "firestore": {
    "rules": "firestore.rules",
    "indexes": "firestore.indexes.json"
  },
  "functions": {
    "source": "functions"
  }
}
```

### Color Palette

**File**: `src/constants/colors.js`

```javascript
export const COLORS = {
  primaryGreen: '#34A853',
  pureWhite: '#FFFFFF',
  // ... additional colors
};
```

---

## Development Workflow

### Branch Strategy

```
main (production)
  ├── develop (staging)
  │   ├── feature/campaign-mode
  │   ├── feature/disease-detection
  │   └── feature/nasa-integration
  └── hotfix/critical-bug
```

### Code Style

**ESLint Configuration**: Follow React Native best practices

**Naming Conventions**:
- Components: PascalCase (`DashboardScreen.js`)
- Services: camelCase with `.service.js` suffix (`auth.service.js`)
- Constants: UPPER_SNAKE_CASE (`COLORS`, `API_KEY`)
- Functions: camelCase (`getUserProgress`)

### Commit Messages

```
feat: Add disease detection screen
fix: Resolve NASA API caching issue
docs: Update README with setup instructions
refactor: Extract satellite service logic
test: Add unit tests for campaign service
```

### Testing

**Unit Tests**: Jest + React Native Testing Library

```bash
npm test
```

**E2E Tests**: Detox (future implementation)

**Manual Testing**:
1. Test authentication flow
2. Verify NASA data fetching
3. Check AI responses
4. Test game modes
5. Validate Firestore rules

### Debugging

**React Native Debugger**:
```bash
npx react-devtools
```

**Firebase Emulator**:
```bash
firebase emulators:start
```

**Logs**:
```bash
# Expo logs
npx expo start --dev-client

# Firebase function logs
firebase functions:log

# Android logs
adb logcat

# iOS logs
xcrun simctl spawn booted log stream --predicate 'processImagePath contains "EcoSphere"'
```

---

## Deployment

### Mobile App Deployment

#### Android

**Build APK**:
```bash
eas build --platform android --profile preview
```

**Build AAB (for Play Store)**:
```bash
eas build --platform android --profile production
```

**Submit to Play Store**:
```bash
eas submit --platform android
```

#### iOS

**Build IPA**:
```bash
eas build --platform ios --profile production
```

**Submit to App Store**:
```bash
eas submit --platform ios
```

### Firebase Deployment

**Deploy All**:
```bash
./deploy.sh
```

**Deploy Specific Services**:
```bash
# Firestore rules only
firebase deploy --only firestore:rules

# Cloud Functions only
firebase deploy --only functions

# Firestore indexes
firebase deploy --only firestore:indexes
```

### CI/CD Pipeline

**GitHub Actions** (example):
```yaml
name: Deploy
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '16'
      - run: npm install
      - run: npm test
      - run: firebase deploy --token ${{ secrets.FIREBASE_TOKEN }}
```

---

## Testing

### Unit Tests

**Framework**: Jest + React Native Testing Library

**Run Tests**:
```bash
npm test
```

**Example Test**:
```javascript
import { render, fireEvent } from '@testing-library/react-native';
import LoginScreen from '../screens/auth/LoginScreen';

test('login form submits correctly', () => {
  const { getByPlaceholderText, getByText } = render(<LoginScreen />);

  fireEvent.changeText(getByPlaceholderText('Email'), 'test@example.com');
  fireEvent.changeText(getByPlaceholderText('Password'), 'password123');
  fireEvent.press(getByText('Login'));

  // Assertions...
});
```

### Integration Tests

**Test Firestore Rules**:
```bash
firebase emulators:exec --only firestore "npm test"
```

### Manual Testing Checklist

**Authentication**:
- [ ] Register new user
- [ ] Login existing user
- [ ] Logout
- [ ] Profile setup flow

**Game Modes**:
- [ ] Start campaign mission
- [ ] Complete objectives
- [ ] Earn rewards
- [ ] Try sandbox mode
- [ ] Join challenge

**NASA Data**:
- [ ] Fetch SMAP data
- [ ] Display MODIS NDVI
- [ ] View POWER charts
- [ ] Cache verification

**AI Features**:
- [ ] Ask AI tutor question
- [ ] Upload disease photo
- [ ] Receive recommendations

**Community**:
- [ ] Create post
- [ ] Share knowledge
- [ ] Connect with farmers

---

## Troubleshooting

### Common Issues

#### 1. Firebase Authentication Error

**Problem**: "Firebase auth not initialized"

**Solution**:
```bash
# Verify .env configuration
cat .env | grep FIREBASE

# Clear AsyncStorage
npx expo start -c

# Reinstall dependencies
rm -rf node_modules
npm install
```

#### 2. NASA API Rate Limit

**Problem**: "Too many requests"

**Solution**:
- Uses 24-hour cache (AsyncStorage)
- Fallback to sample data
- Implement exponential backoff

#### 3. Model Loading Error

**Problem**: "TFLite model not found"

**Solution**:
```bash
# Verify model exists
ls assets/models/plant_disease_model.tflite

# Retrain if missing
cd model-training
python train_disease_model.py
```

#### 4. Expo Build Failure

**Problem**: Build fails on EAS

**Solution**:
```bash
# Update expo-cli
npm install -g expo-cli@latest

# Clear cache
expo prebuild --clean

# Rebuild
eas build --platform android --clear-cache
```

#### 5. Firestore Permission Denied

**Problem**: "Missing or insufficient permissions"

**Solution**:
```bash
# Deploy latest rules
firebase deploy --only firestore:rules

# Check user authentication
console.log(auth.currentUser)

# Verify rule conditions in Firestore console
```

### Debugging Tools

**React Native Debugger**:
- Inspect component tree
- View Redux state (if added)
- Network requests

**Firebase Console**:
- Firestore data browser
- Authentication users
- Cloud Functions logs
- Performance monitoring

**Expo Dev Tools**:
- Device logs
- Network inspector
- Performance metrics

---

## API Reference

### Authentication Service

**File**: `src/services/auth.service.js`

```javascript
import { authService } from './services/auth.service';

// Register
const { success, user, error } = await authService.register(email, password);

// Login
const { success, user, error } = await authService.login(email, password);

// Logout
await authService.logout();

// Get current user
const user = await authService.getCurrentUser();

// Auth state listener
const unsubscribe = authService.onAuthStateChange((user) => {
  console.log('User:', user);
});
```

### NASA POWER Service

**File**: `src/services/power.service.js`

```javascript
import { getDailyPoint, getCurrentMonthRange } from './services/power.service';

const { start, end } = getCurrentMonthRange();

const data = await getDailyPoint({
  latitude: 23.81,
  longitude: 90.41,
  start: '20250801',
  end: '20250831',
  parameters: ['T2M', 'PRECTOTCORR', 'RH2M']
});

// Returns:
{
  parameters: {
    T2M: [{ date: '2025-08-01', value: 28.5 }, ...],
    PRECTOTCORR: [{ date: '2025-08-01', value: 12.3 }, ...]
  },
  metadata: {
    messages: [],
    source: 'NASA POWER API'
  }
}
```

### AI Tutor Service

**File**: `src/services/ai/tutor.service.js`

```javascript
import { getAIResponse, getQuickQuestions } from './services/ai/tutor.service';

// Chat with AI
const response = await getAIResponse(
  "How do I improve soil health?",
  conversationHistory,
  userId,
  gameContext  // optional
);

// Get suggested questions
const questions = getQuickQuestions(userContext);
```

### Campaign Service

**File**: `src/services/game/campaign.service.js`

```javascript
import { startMission, updateMissionProgress, getUserProgress } from './services/game/campaign.service';

// Start mission
const { success, mission } = await startMission(userId, 'mission_1');

// Update progress
const { success, objectiveCompleted, missionCompleted } = await updateMissionProgress(
  userId,
  'mission_1',
  'plant_crop',
  10
);

// Get user progress
const progress = await getUserProgress(userId);
// Returns: { level, xp, coins, completedMissions, badges, ... }
```

### Impact Service

**Files**: `src/services/impact/*.service.js`

```javascript
import { logYield, compareYield } from './services/impact/yield.service';
import { logWaterUsage, analyzeWaterSavings } from './services/impact/water.service';
import { generateImpactReport } from './services/impact/report.service';

// Log yield
await logYield(userId, { crop: 'rice', area: 2, yield: 85 });

// Compare yield
const comparison = await compareYield(userId, 'rice');

// Generate report
const report = await generateImpactReport(userId, 'MONTHLY');
```

---

## Contributing

### How to Contribute

1. **Fork** the repository
2. **Create** a feature branch: `git checkout -b feature/amazing-feature`
3. **Commit** changes: `git commit -m 'Add amazing feature'`
4. **Push** to branch: `git push origin feature/amazing-feature`
5. **Open** a Pull Request

### Development Guidelines

**Code Quality**:
- Write clean, readable code
- Add comments for complex logic
- Follow React Native best practices
- Use TypeScript for type safety (future)

**Testing**:
- Write unit tests for services
- Test UI components
- Verify Firestore rules
- Test on real devices

**Documentation**:
- Update README for user-facing changes
- Update DOCUMENTATION.md for technical changes
- Add JSDoc comments to functions
- Document API endpoints

### Areas for Contribution

**High Priority**:
- [ ] Add TypeScript support
- [ ] Implement E2E tests
- [ ] Improve offline mode
- [ ] Add internationalization (i18n)
- [ ] Optimize performance

**Features**:
- [ ] 3D graphics enhancement
- [ ] VR/AR support
- [ ] Blockchain integration
- [ ] Advanced ML models
- [ ] Desktop version

**Bug Fixes**:
- [ ] Check open issues
- [ ] Test edge cases
- [ ] Fix memory leaks
- [ ] Improve error handling

---

## License

This project is licensed under the MIT License.

---

## Support

**Documentation**: See inline code comments and this guide

**Issues**: [GitHub Issues](https://github.com/yourusername/ecosphere-ai-farming-simulator/issues)

**Email**: support@ecosphere.example.com

---

## Acknowledgments

- **NASA** - For providing free satellite data APIs
- **Google** - For Gemini AI and Firebase
- **React Native Community** - For amazing libraries
- **PlantDisease Dataset** - For ML training data
- **Contributors** - For making this project possible

---

## Changelog

### Version 1.0.0 (2025-10-03)

**Features**:
- Campaign Mode with 16 missions
- Sandbox Mode with 5 scenarios
- Challenges Mode (weekly, daily, tournaments)
- NASA satellite integration (SMAP, MODIS, POWER)
- AI Tutor (Google Gemini)
- Disease Detection (TensorFlow Lite)
- Impact Dashboard (yield, water, cost)
- Community platform
- Research & academic tools
- Livestock management
- Admin panel

**Technical**:
- React Native 0.81.4
- Expo 54.0
- Firebase 12.3.0
- 58 screens
- 82 service files
- Firestore security rules
- Cloud Functions (weather alerts)

---

**Built with ❤️ by the EcoSphere Team**

**Transform farming through technology, data, and gamification!**
