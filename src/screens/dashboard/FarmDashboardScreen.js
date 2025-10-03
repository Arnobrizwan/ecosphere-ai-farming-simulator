/**
 * UC45 - Farm Dashboard Screen
 * Key status cards & maps consuming outputs from UC13-44
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { COLORS } from '../../constants/colors';
import { loadDashboard } from '../../services/dashboard/farmDashboard.service';
import { authService } from '../../services/auth.service';

export default function FarmDashboardScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dashboard, setDashboard] = useState(null);
  const currentUser = authService.getCurrentUser();

  const loadData = async () => {
    try {
      const result = await loadDashboard(currentUser?.uid, 'default_farm');
      if (result.success) {
        setDashboard(result);
      }
    } catch (error) {
      console.error('Failed to load dashboard:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const getCardIcon = (status) => {
    switch (status) {
      case 'critical': return '🔴';
      case 'warning': return '⚠️';
      default: return '✅';
    }
  };

  const getCardStyle = (priority) => {
    switch (priority) {
      case 'high': return styles.cardHigh;
      case 'medium': return styles.cardMedium;
      default: return styles.cardNormal;
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primaryGreen} />
        <Text style={styles.loadingText}>Loading farm dashboard...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backText}>← Dashboard</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Farm Dashboard</Text>
        <Text style={styles.subtitle}>
          Updated: {new Date(dashboard?.updatedAt).toLocaleTimeString()}
        </Text>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* KPIs */}
        <View style={styles.kpiSection}>
          <Text style={styles.sectionTitle}>📊 Key Performance Indicators</Text>
          <View style={styles.kpiGrid}>
            <View style={styles.kpiCard}>
              <Text style={styles.kpiValue}>{dashboard?.kpis?.farmHealth || 0}</Text>
              <Text style={styles.kpiLabel}>Farm Health</Text>
            </View>
            <View style={styles.kpiCard}>
              <Text style={styles.kpiValue}>{dashboard?.kpis?.activeAlerts || 0}</Text>
              <Text style={styles.kpiLabel}>Active Alerts</Text>
            </View>
            <View style={styles.kpiCard}>
              <Text style={styles.kpiValue}>{dashboard?.kpis?.tasksToday || 0}</Text>
              <Text style={styles.kpiLabel}>Tasks Today</Text>
            </View>
            <View style={styles.kpiCard}>
              <Text style={styles.kpiValue}>{dashboard?.kpis?.learningLevel || 0}</Text>
              <Text style={styles.kpiLabel}>Learning Level</Text>
            </View>
          </View>
        </View>

        {/* Quick Actions */}
        {dashboard?.quickActions && dashboard.quickActions.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>⚡ Quick Actions</Text>
            {dashboard.quickActions.map((action, index) => (
              <TouchableOpacity
                key={action.id}
                style={[styles.actionCard, action.priority === 'high' && styles.actionCardHigh]}
                onPress={() => navigation.navigate(action.route)}
              >
                <Text style={styles.actionIcon}>{action.icon}</Text>
                <Text style={styles.actionLabel}>{action.label}</Text>
                <Text style={styles.actionArrow}>→</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Status Cards */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📋 Status Overview</Text>
          {dashboard?.cards?.map((card, index) => (
            <TouchableOpacity
              key={card.id}
              style={[styles.card, getCardStyle(card.priority)]}
              onPress={() => navigation.navigate(card.action.route)}
            >
              <View style={styles.cardHeader}>
                <View style={styles.cardTitleRow}>
                  <Text style={styles.cardIcon}>{card.icon}</Text>
                  <Text style={styles.cardTitle}>{card.title}</Text>
                </View>
                {card.priority === 'high' && (
                  <View style={styles.priorityBadge}>
                    <Text style={styles.priorityText}>!</Text>
                  </View>
                )}
              </View>
              
              <View style={styles.cardBody}>
                {card.id === 'weather' && (
                  <>
                    <Text style={styles.cardStat}>Alerts: {card.data.alerts.length}</Text>
                    <Text style={styles.cardStat}>Temperature: {card.data.temperature}</Text>
                  </>
                )}
                {card.id === 'health' && (
                  <>
                    <Text style={styles.cardStat}>Score: {card.data.score}/100</Text>
                    <Text style={styles.cardStat}>Status: {card.data.status}</Text>
                    <Text style={styles.cardStat}>Anomalies: {card.data.anomalies}</Text>
                  </>
                )}
                {card.id === 'tasks' && (
                  <>
                    <Text style={styles.cardStat}>Today: {card.data.today}</Text>
                    <Text style={styles.cardStat}>Upcoming: {card.data.upcoming}</Text>
                    {card.data.overdue > 0 && (
                      <Text style={[styles.cardStat, styles.cardStatWarning]}>
                        Overdue: {card.data.overdue}
                      </Text>
                    )}
                  </>
                )}
                {card.id === 'learning' && (
                  <>
                    <Text style={styles.cardStat}>Level: {card.data.level}</Text>
                    <Text style={styles.cardStat}>XP: {card.data.xp}</Text>
                    <Text style={styles.cardStat}>Streak: {card.data.streak} days</Text>
                  </>
                )}
                {card.id === 'satellite' && (
                  <>
                    <Text style={styles.cardStat}>
                      Soil Moisture: {card.data.soilMoisture}
                    </Text>
                    <Text style={styles.cardStat}>NDVI: {card.data.ndvi}</Text>
                  </>
                )}
              </View>

              <Text style={styles.cardAction}>{card.action.label} →</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.pureWhite,
  },
  loadingText: {
    marginTop: 10,
    color: COLORS.earthBrown,
  },
  header: {
    backgroundColor: COLORS.primaryGreen,
    padding: 20,
    paddingTop: 60,
  },
  backButton: {
    marginBottom: 10,
  },
  backText: {
    color: COLORS.pureWhite,
    fontSize: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.pureWhite,
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 12,
    color: '#E0F2F1',
  },
  content: {
    flex: 1,
  },
  kpiSection: {
    padding: 15,
    backgroundColor: COLORS.pureWhite,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.primaryGreen,
    marginBottom: 15,
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  kpiCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#F0FDF4',
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  kpiValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: COLORS.primaryGreen,
    marginBottom: 5,
  },
  kpiLabel: {
    fontSize: 12,
    color: '#15803D',
    textAlign: 'center',
  },
  section: {
    padding: 15,
    backgroundColor: COLORS.pureWhite,
    marginBottom: 10,
  },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#FDE047',
  },
  actionCardHigh: {
    backgroundColor: '#FEE2E2',
    borderColor: '#FCA5A5',
  },
  actionIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  actionLabel: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.deepBlack,
  },
  actionArrow: {
    fontSize: 20,
    color: COLORS.earthBrown,
  },
  card: {
    backgroundColor: COLORS.pureWhite,
    padding: 15,
    borderRadius: 12,
    marginBottom: 15,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardNormal: {
    borderColor: '#E5E7EB',
  },
  cardMedium: {
    borderColor: '#FDE047',
  },
  cardHigh: {
    borderColor: '#FCA5A5',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardIcon: {
    fontSize: 24,
    marginRight: 10,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.deepBlack,
  },
  priorityBadge: {
    backgroundColor: '#DC2626',
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  priorityText: {
    color: COLORS.pureWhite,
    fontSize: 16,
    fontWeight: 'bold',
  },
  cardBody: {
    marginBottom: 12,
  },
  cardStat: {
    fontSize: 14,
    color: COLORS.earthBrown,
    marginBottom: 5,
  },
  cardStatWarning: {
    color: '#DC2626',
    fontWeight: '600',
  },
  cardAction: {
    fontSize: 14,
    color: COLORS.primaryGreen,
    fontWeight: '600',
  },
});
