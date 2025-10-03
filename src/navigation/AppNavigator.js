import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { View, ActivityIndicator } from 'react-native';
import { authService } from '../services/auth.service';
import { COLORS } from '../constants/colors';
import { withGameScene } from '../game2d';

// Import screens
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';
import ProfileSetupScreen from '../screens/auth/ProfileSetupScreen';
import LocationSelectionScreen from '../screens/onboarding/LocationSelectionScreen';
import FarmConfigScreen from '../screens/onboarding/FarmConfigScreen';
import DashboardScreen from '../screens/dashboard/DashboardScreen';
import GameScreen from '../screens/game/GameScreen';
import CampaignModeScreen from '../screens/game/CampaignModeScreen';
import SandboxModeScreen from '../screens/game/SandboxModeScreen';
import TutorialScreen from '../screens/game/TutorialScreen';
import QuizScreen from '../screens/game/QuizScreen';
import QuizResultsScreen from '../screens/game/QuizResultsScreen';
import ProfileScreen from '../screens/profile/ProfileScreen';
import LearningProgressScreen from '../screens/profile/LearningProgressScreen';
import UnlockedFeatureScreen from '../screens/game/UnlockedFeatureScreen';
import AchievementsScreen from '../screens/profile/AchievementsScreen';
import AITutorScreen from '../screens/ai/AITutorScreen';
import SmartTasksScreen from '../screens/operations/SmartTasksScreen';
import CropManagementScreen from '../screens/farming/CropManagementScreen';
import CampaignLevel1Screen from '../components/CampaignLevel1Screen';
import Campaign3DScreen from '../screens/game/Campaign3DScreen';
import IoTMonitorScreen from '../screens/iot/IoTMonitorScreen';
import DiseaseDetectionScreen from '../screens/disease/DiseaseDetectionScreen';
import ImpactDashboardScreen from '../screens/impact/ImpactDashboardScreen';
import RecommendationsScreen from '../screens/ai/RecommendationsScreen';
import PersonalAdviceScreen from '../screens/ai/PersonalAdviceScreen';
import CreatePostScreen from '../screens/community/CreatePostScreen';
import ShareKnowledgeScreen from '../screens/community/ShareKnowledgeScreen';
import ConnectionsScreen from '../screens/community/ConnectionsScreen';
import ExpertsScreen from '../screens/community/ExpertsScreen';
import GroupsScreen from '../screens/community/GroupsScreen';
import DiscussionScreen from '../screens/community/DiscussionScreen';
import SuccessStoryScreen from '../screens/community/SuccessStoryScreen';
import SatelliteDataScreen from '../screens/SatelliteDataScreen';
import PlantingGuideScreen from '../screens/operations/PlantingGuideScreen';
import WeatherAlertsScreen from '../screens/operations/WeatherAlertsScreen';
import FarmDashboardScreen from '../screens/dashboard/FarmDashboardScreen';
import AnalyticsScreen from '../screens/analytics/AnalyticsScreen';
import RealTimeStatusScreen from '../screens/monitoring/RealTimeStatusScreen';
import AdminUsersScreen from '../screens/admin/AdminUsersScreen';
import AdminSettingsScreen from '../screens/admin/AdminSettingsScreen';
import AdminModerationScreen from '../screens/admin/AdminModerationScreen';
import AdminAccessScreen from '../screens/admin/AdminAccessScreen';
import AdminAlertsScreen from '../screens/admin/AdminAlertsScreen';
import AdminAuditScreen from '../screens/admin/AdminAuditScreen';
import PastureHealthScreen from '../screens/livestock/PastureHealthScreen';
import FeedPlanningScreen from '../screens/livestock/FeedPlanningScreen';
import LivestockImpactScreen from '../screens/livestock/LivestockImpactScreen';
import ResearchDataScreen from '../screens/research/ResearchDataScreen';
import CollaborationScreen from '../screens/research/CollaborationScreen';
import PublicationScreen from '../screens/research/PublicationScreen';
import AcademicResourcesScreen from '../screens/research/AcademicResourcesScreen';
import ProjectManagementScreen from '../screens/research/ProjectManagementScreen';
import DataExportScreen from '../screens/research/DataExportScreen';
import ChallengesScreen from '../screens/game/ChallengesScreen';
import CampaignMissionScreen from '../screens/game/CampaignMissionScreen';
import UnifiedGameDashboard from '../screens/game/UnifiedGameDashboard';
import LivestockDashboard from '../screens/livestock/LivestockDashboard';
import MissionDashboardScreen from '../screens/game/MissionDashboardScreen';

const Stack = createStackNavigator();

const DEFAULT_SCREEN_OPTIONS = { headerShown: false };

const AUTHENTICATED_SCREENS = [
  { name: 'Dashboard', component: DashboardScreen },
  { name: 'ProfileSetup', component: ProfileSetupScreen },
  { name: 'LocationSelection', component: LocationSelectionScreen },
  { name: 'FarmConfig', component: FarmConfigScreen },
  { name: 'Game', component: GameScreen },
  { name: 'CampaignMode', component: CampaignModeScreen },
  { name: 'SandboxMode', component: SandboxModeScreen },
  { name: 'Tutorial', component: TutorialScreen },
  { name: 'Quiz', component: QuizScreen },
  { name: 'QuizResults', component: QuizResultsScreen },
  { name: 'Profile', component: ProfileScreen },
  { name: 'LearningProgress', component: LearningProgressScreen },
  { name: 'UnlockedFeature', component: UnlockedFeatureScreen },
  { name: 'Achievements', component: AchievementsScreen },
  { name: 'AITutor', component: AITutorScreen },
  { name: 'SmartTasks', component: SmartTasksScreen },
  {
    name: 'ImpactDashboard',
    component: ImpactDashboardScreen,
    options: {
      headerShown: true,
      title: 'Impact Hub',
    },
  },
  { name: 'CropManagement', component: CropManagementScreen },
  { name: 'CampaignLevel1', component: CampaignLevel1Screen },
  { name: 'Campaign3D', component: Campaign3DScreen },
  { name: 'IoTMonitor', component: IoTMonitorScreen },
  { name: 'DiseaseDetection', component: DiseaseDetectionScreen },
  { name: 'Recommendations', component: RecommendationsScreen },
  { name: 'PersonalAdvice', component: PersonalAdviceScreen },
  { name: 'CreatePost', component: CreatePostScreen },
  { name: 'ShareKnowledge', component: ShareKnowledgeScreen },
  { name: 'Connections', component: ConnectionsScreen },
  { name: 'Experts', component: ExpertsScreen },
  { name: 'Groups', component: GroupsScreen },
  { name: 'Discussion', component: DiscussionScreen },
  { name: 'SuccessStory', component: SuccessStoryScreen },
  { name: 'SatelliteData', component: SatelliteDataScreen },
  { name: 'PlantingGuide', component: PlantingGuideScreen },
  { name: 'WeatherAlerts', component: WeatherAlertsScreen },
  { name: 'FarmDashboard', component: FarmDashboardScreen },
  { name: 'Analytics', component: AnalyticsScreen },
  { name: 'RealTimeStatus', component: RealTimeStatusScreen },
  { name: 'PastureHealth', component: PastureHealthScreen },
  { name: 'FeedPlanning', component: FeedPlanningScreen },
  { name: 'LivestockImpact', component: LivestockImpactScreen },
  { name: 'AdminUsers', component: AdminUsersScreen },
  { name: 'AdminSettings', component: AdminSettingsScreen },
  { name: 'AdminModeration', component: AdminModerationScreen },
  { name: 'AdminAccess', component: AdminAccessScreen },
  { name: 'AdminAlerts', component: AdminAlertsScreen },
  { name: 'AdminAudit', component: AdminAuditScreen },
  { name: 'ResearchData', component: ResearchDataScreen },
  { name: 'Collaboration', component: CollaborationScreen },
  { name: 'Publication', component: PublicationScreen },
  { name: 'AcademicResources', component: AcademicResourcesScreen },
  { name: 'ProjectManagement', component: ProjectManagementScreen },
  { name: 'DataExport', component: DataExportScreen },
  { name: 'Challenges', component: ChallengesScreen },
  { name: 'CampaignMission', component: CampaignMissionScreen },
  { name: 'UnifiedDashboard', component: UnifiedGameDashboard },
  { name: 'LivestockDashboard', component: LivestockDashboard },
  { name: 'MissionDashboard', component: MissionDashboardScreen },
];

const AUTHENTICATED_GAME_SCREENS = AUTHENTICATED_SCREENS.map(
  ({ name, component, options }) => ({
    name,
    component: withGameScene(component, name),
    options,
  })
);

const PUBLIC_SCREENS = [
  { name: 'Login', component: LoginScreen },
  { name: 'Register', component: RegisterScreen },
];

export default function AppNavigator() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = authService.onAuthStateChange((authUser) => {
      setUser(authUser);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={COLORS.primaryGreen} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName={user ? 'Dashboard' : 'Login'}
        screenOptions={{
          headerStyle: {
            backgroundColor: COLORS.primaryGreen,
          },
          headerTintColor: COLORS.pureWhite,
          headerTitleStyle: {
            fontWeight: 'bold',
          },
        }}
      >
        {user
          ? AUTHENTICATED_GAME_SCREENS.map(({ name, component: ScreenComponent, options }) => (
              <Stack.Screen
                key={name}
                name={name}
                component={ScreenComponent}
                options={options ?? DEFAULT_SCREEN_OPTIONS}
              />
            ))
          : PUBLIC_SCREENS.map(({ name, component: ScreenComponent }) => (
              <Stack.Screen
                key={name}
                name={name}
                component={ScreenComponent}
                options={DEFAULT_SCREEN_OPTIONS}
              />
            ))}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
