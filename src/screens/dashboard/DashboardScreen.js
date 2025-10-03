import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, ScrollView } from 'react-native';
import { COLORS } from '../../constants/colors';
import { authService } from '../../services/auth.service';

export default function DashboardScreen({ navigation }) {
  const [userRole, setUserRole] = useState(null);
  const [profileReady, setProfileReady] = useState(false);
  const currentUser = useMemo(() => authService.getCurrentUser(), []);

  useEffect(() => {
    let mounted = true;
    if (!currentUser) {
      setProfileReady(true);
      return;
    }

    authService
      .getUserProfile(currentUser.uid)
      .then((result) => {
        if (!mounted) return;
        if (result?.success) {
          setUserRole(result.data?.role || null);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (mounted) setProfileReady(true);
      });

    return () => {
      mounted = false;
    };
  }, [currentUser]);

  const isAdmin = userRole === 'admin';

  const primaryCards = [
    { key: 'farmDashboard', title: '🏠 Farm Dashboard', subtitle: 'NASA-powered KPIs & status cards', route: 'FarmDashboard', style: styles.satelliteCard },
    { key: 'game', title: '🌱 Start Game', subtitle: 'Begin your farming journey', route: 'Game' },
    { key: 'profile', title: '👤 Profile', subtitle: 'View your profile', route: 'Profile' },
    { key: 'aiTutor', title: '🤖 AI Tutor', subtitle: 'Get farming guidance & help', route: 'AITutor' },
    { key: 'smartTasks', title: '⚙️ Smart Tasks', subtitle: 'Automate farm jobs & IoT actions', route: 'SmartTasks' },
    { key: 'cropManager', title: '🌾 Crop Manager', subtitle: 'Run the till → plant → harvest loop', route: 'CropManagement' },
    { key: 'impact', title: '📊 Impact Hub', subtitle: 'Track yield, water, cost & env metrics', route: 'ImpactDashboard' },
    { key: 'iot', title: '📡 IoT Devices', subtitle: 'Monitor sensors & alerts in real time', route: 'IoTMonitor' },
    { key: 'satellite', title: '🛰️ Satellite Insights', subtitle: 'Analyze SMAP, MODIS & Landsat evidence', route: 'SatelliteData', style: styles.satelliteCard },
    { key: 'plantingGuide', title: '🌱 Planting Guide', subtitle: 'Crop-specific windows with NASA NDVI', route: 'PlantingGuide' },
    { key: 'weatherAlerts', title: '⚠️ Weather Alerts', subtitle: 'NASA POWER forecast & notifications', route: 'WeatherAlerts' },
    { key: 'analytics', title: '📈 Analytics', subtitle: 'Performance metrics across seasons', route: 'Analytics' },
    { key: 'realtime', title: '⚡ Real-time Monitoring', subtitle: 'Live IoT, weather & ops status', route: 'RealTimeStatus' },
    { key: 'pastureHealth', title: '🌾 Pasture Health', subtitle: 'NASA NDVI & SMAP analysis', route: 'PastureHealth' },
    { key: 'feedPlanning', title: '🐄 Feed Planning', subtitle: 'Weather-adjusted requirements', route: 'FeedPlanning' },
    { key: 'livestockImpact', title: '🌍 Livestock Impact', subtitle: 'Carbon footprint & sustainability', route: 'LivestockImpact' },
    { key: 'recommendations', title: '🧠 AI Recommendations', subtitle: 'Ranked actions using farm data', route: 'Recommendations' },
    { key: 'advice', title: '✨ Personalized Advice', subtitle: 'Tailored tips for your profile', route: 'PersonalAdvice' },
    { key: 'disease', title: '🔬 Disease Detection', subtitle: 'Identify crop diseases with AI', route: 'DiseaseDetection' },
  ];

  const communityCards = [
    { key: 'post', title: '📝 Share a Post', subtitle: 'Publish updates to the community feed', route: 'CreatePost' },
    { key: 'knowledge', title: '📚 Share Knowledge', subtitle: 'Upload guides, datasets, or how-tos', route: 'ShareKnowledge' },
    { key: 'connections', title: '🤝 Farmer Connections', subtitle: 'Find and connect with peers', route: 'Connections' },
    { key: 'experts', title: '👩‍🌾 Expert Network', subtitle: 'Reach out to advisors and officers', route: 'Experts' },
    { key: 'groups', title: '👥 Join Groups', subtitle: 'Topics for your region or crops', route: 'Groups' },
    { key: 'success', title: '🌾 Share Success Story', subtitle: 'Celebrate outcomes with metrics & media', route: 'SuccessStory', style: styles.successStoryCard },
  ];

  const adminCards = [
    { key: 'adminUsers', title: '🔐 Manage Users & Roles', subtitle: 'Provision accounts and RBAC policies', route: 'AdminUsers' },
    { key: 'adminSettings', title: '⚙️ System Settings', subtitle: 'Feature flags, thresholds, locales', route: 'AdminSettings' },
    { key: 'adminModeration', title: '🛡️ Moderation Queue', subtitle: 'Review posts, groups, and comments', route: 'AdminModeration' },
    { key: 'adminAccess', title: '📂 Research Access', subtitle: 'Approve dataset requests and policies', route: 'AdminAccess' },
    { key: 'adminAlerts', title: '📢 Alerts & Notices', subtitle: 'Create system notices and templates', route: 'AdminAlerts' },
    { key: 'adminAudit', title: '🧾 Audit Reports', subtitle: 'Generate compliance & audit digests', route: 'AdminAudit' },
  ];

  const handleLogout = async () => {
    await authService.logout();
  };

  const renderCard = (card) => (
    <TouchableOpacity
      key={card.key}
      style={[styles.card, card.style]}
      onPress={() => navigation.navigate(card.route)}
    >
      <Text style={styles.cardTitle}>{card.title}</Text>
      <Text style={styles.cardText}>{card.subtitle}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>EcoSphere Dashboard</Text>
      <Text style={styles.subtitle}>Welcome to your farming simulator!</Text>

      {!profileReady && (
        <View style={styles.profileBanner}>
          <ActivityIndicator size="small" color={COLORS.primaryGreen} />
          <Text style={styles.profileBannerText}>Loading profile…</Text>
        </View>
      )}

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.buttonContainer}>
          {primaryCards.map(renderCard)}

          <Text style={styles.sectionHeader}>Community</Text>
          {communityCards.map(renderCard)}

          {isAdmin && (
            <>
              <Text style={styles.sectionHeader}>Administrator Console</Text>
              {adminCards.map((card) => renderCard({ ...card, style: styles.adminCard }))}
            </>
          )}
        </View>
      </ScrollView>

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.pureWhite,
    padding: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: COLORS.primaryGreen,
    marginTop: 60,
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.deepBlack,
    marginBottom: 20,
  },
  profileBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#E0F2F1',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginBottom: 20,
  },
  profileBannerText: {
    color: '#134E4A',
    fontWeight: '600',
  },
  sectionHeader: {
    marginTop: 20,
    marginBottom: 8,
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
  },
  buttonContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  card: {
    backgroundColor: COLORS.accentYellow,
    borderRadius: 12,
    padding: 20,
    marginBottom: 15,
    borderWidth: 2,
    borderColor: COLORS.primaryGreen,
  },
  successStoryCard: {
    backgroundColor: '#E6FFFA',
    borderColor: '#2C7A7B',
  },
  adminCard: {
    backgroundColor: '#EEF2FF',
    borderColor: '#3730A3',
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.deepBlack,
    marginBottom: 4,
  },
  cardText: {
    fontSize: 14,
    color: COLORS.earthBrown,
  },
  logoutButton: {
    backgroundColor: COLORS.earthBrown,
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  logoutText: {
    color: COLORS.pureWhite,
    fontSize: 16,
    fontWeight: 'bold',
  },
});

DashboardScreen.showGameOverlay = false;
