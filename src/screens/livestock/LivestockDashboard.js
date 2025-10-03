import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { COLORS } from '../../constants/colors';
import { authService } from '../../services/auth.service';

/**
 * Livestock Dashboard Screen
 * Manage cattle, chickens, goats, and other farm animals
 */
export default function LivestockDashboard({ navigation }) {
  const [userId, setUserId] = useState('');
  const [livestock, setLivestock] = useState([
    {
      id: 'cow_1',
      type: 'cow',
      name: 'Bessie',
      icon: '🐄',
      age: 3,
      health: 95,
      production: 'milk',
      productivity: 28,
      lastFed: Date.now() - 2 * 3600 * 1000,
      status: 'healthy',
    },
    {
      id: 'cow_2',
      type: 'cow',
      name: 'Daisy',
      icon: '🐄',
      age: 2,
      health: 92,
      production: 'milk',
      productivity: 25,
      lastFed: Date.now() - 3 * 3600 * 1000,
      status: 'healthy',
    },
    {
      id: 'chicken_1',
      type: 'chicken',
      name: 'Hen House #1',
      icon: '🐔',
      count: 12,
      health: 88,
      production: 'eggs',
      productivity: 10,
      lastFed: Date.now() - 4 * 3600 * 1000,
      status: 'needs_feed',
    },
    {
      id: 'chicken_2',
      type: 'chicken',
      name: 'Hen House #2',
      icon: '🐔',
      count: 15,
      health: 95,
      production: 'eggs',
      productivity: 14,
      lastFed: Date.now() - 1 * 3600 * 1000,
      status: 'healthy',
    },
    {
      id: 'goat_1',
      type: 'goat',
      name: 'Billy',
      icon: '🐐',
      age: 2,
      health: 90,
      production: 'milk',
      productivity: 5,
      lastFed: Date.now() - 5 * 3600 * 1000,
      status: 'needs_feed',
    },
    {
      id: 'pig_1',
      type: 'pig',
      name: 'Porky',
      icon: '🐷',
      age: 1,
      health: 97,
      production: 'meat',
      productivity: 85,
      lastFed: Date.now() - 2 * 3600 * 1000,
      status: 'healthy',
    },
  ]);

  const [stats, setStats] = useState({
    totalAnimals: 0,
    avgHealth: 0,
    dailyProduction: {
      milk: 0,
      eggs: 0,
    },
    needsAttention: 0,
  });

  useEffect(() => {
    const user = authService.getCurrentUser();
    if (user) {
      setUserId(user.uid);
    }
    calculateStats();
  }, [livestock]);

  const calculateStats = () => {
    const totalCount = livestock.reduce(
      (sum, animal) => sum + (animal.count || 1),
      0
    );
    const avgHealth =
      livestock.reduce((sum, animal) => sum + animal.health, 0) /
      livestock.length;
    const milk = livestock
      .filter((a) => a.production === 'milk')
      .reduce((sum, a) => sum + a.productivity, 0);
    const eggs = livestock
      .filter((a) => a.production === 'eggs')
      .reduce((sum, a) => sum + a.productivity, 0);
    const needsAttention = livestock.filter(
      (a) => a.status === 'needs_feed' || a.health < 70
    ).length;

    setStats({
      totalAnimals: totalCount,
      avgHealth: Math.round(avgHealth),
      dailyProduction: { milk, eggs },
      needsAttention,
    });
  };

  const handleFeedAnimal = (animalId) => {
    setLivestock(
      livestock.map((animal) =>
        animal.id === animalId
          ? {
              ...animal,
              lastFed: Date.now(),
              health: Math.min(100, animal.health + 5),
              status: 'healthy',
            }
          : animal
      )
    );
    Alert.alert('✅ Success', 'Animal has been fed!');
  };

  const handleCollectProduction = (animalId) => {
    const animal = livestock.find((a) => a.id === animalId);
    if (animal) {
      Alert.alert(
        '🎉 Collected!',
        `Collected ${animal.productivity} ${animal.production} from ${animal.name}`
      );
    }
  };

  const handleAnimalCare = (animalId) => {
    navigation.navigate('AnimalCare', { animalId });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'healthy':
        return COLORS.primaryGreen;
      case 'needs_feed':
        return COLORS.accentYellow;
      case 'sick':
        return '#EF4444';
      default:
        return COLORS.earthBrown;
    }
  };

  const getTimeSinceLastFed = (timestamp) => {
    const hours = Math.floor((Date.now() - timestamp) / (1000 * 60 * 60));
    if (hours < 1) return 'Just fed';
    if (hours === 1) return '1 hour ago';
    return `${hours} hours ago`;
  };

  const renderAnimalCard = (animal) => (
    <View key={animal.id} style={styles.animalCard}>
      <View style={styles.animalHeader}>
        <Text style={styles.animalIcon}>{animal.icon}</Text>
        <View style={styles.animalInfo}>
          <Text style={styles.animalName}>{animal.name}</Text>
          <Text style={styles.animalType}>
            {animal.type.toUpperCase()}
            {animal.count ? ` (${animal.count} birds)` : ` • ${animal.age}y`}
          </Text>
        </View>
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: getStatusColor(animal.status) },
          ]}
        >
          <Text style={styles.statusText}>
            {animal.status.replace('_', ' ')}
          </Text>
        </View>
      </View>

      <View style={styles.animalStats}>
        <View style={styles.statRow}>
          <Text style={styles.statLabel}>Health:</Text>
          <View style={styles.healthBar}>
            <View
              style={[
                styles.healthFill,
                { width: `${animal.health}%` },
                {
                  backgroundColor:
                    animal.health > 80
                      ? COLORS.primaryGreen
                      : animal.health > 50
                      ? COLORS.accentYellow
                      : '#EF4444',
                },
              ]}
            />
          </View>
          <Text style={styles.statValue}>{animal.health}%</Text>
        </View>

        <View style={styles.statRow}>
          <Text style={styles.statLabel}>Production:</Text>
          <Text style={styles.statValue}>
            {animal.productivity} {animal.production}/day
          </Text>
        </View>

        <View style={styles.statRow}>
          <Text style={styles.statLabel}>Last Fed:</Text>
          <Text
            style={[
              styles.statValue,
              {
                color:
                  Date.now() - animal.lastFed > 6 * 3600 * 1000
                    ? '#EF4444'
                    : COLORS.earthBrown,
              },
            ]}
          >
            {getTimeSinceLastFed(animal.lastFed)}
          </Text>
        </View>
      </View>

      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => handleFeedAnimal(animal.id)}
        >
          <Text style={styles.actionButtonText}>🌾 Feed</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => handleCollectProduction(animal.id)}
        >
          <Text style={styles.actionButtonText}>
            {animal.production === 'milk' ? '🥛' : '🥚'} Collect
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.careButton]}
          onPress={() => handleAnimalCare(animal.id)}
        >
          <Text style={styles.actionButtonText}>💊 Care</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>🐄 Livestock Management</Text>
      </View>

      {/* Stats Overview */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statCardIcon}>🐮</Text>
          <Text style={styles.statCardValue}>{stats.totalAnimals}</Text>
          <Text style={styles.statCardLabel}>Total Animals</Text>
        </View>

        <View style={styles.statCard}>
          <Text style={styles.statCardIcon}>❤️</Text>
          <Text style={styles.statCardValue}>{stats.avgHealth}%</Text>
          <Text style={styles.statCardLabel}>Avg Health</Text>
        </View>

        <View style={styles.statCard}>
          <Text style={styles.statCardIcon}>🥛</Text>
          <Text style={styles.statCardValue}>{stats.dailyProduction.milk}L</Text>
          <Text style={styles.statCardLabel}>Milk/Day</Text>
        </View>

        <View style={styles.statCard}>
          <Text style={styles.statCardIcon}>🥚</Text>
          <Text style={styles.statCardValue}>{stats.dailyProduction.eggs}</Text>
          <Text style={styles.statCardLabel}>Eggs/Day</Text>
        </View>
      </View>

      {/* Alerts */}
      {stats.needsAttention > 0 && (
        <View style={styles.alertBanner}>
          <Text style={styles.alertIcon}>⚠️</Text>
          <Text style={styles.alertText}>
            {stats.needsAttention} animal{stats.needsAttention > 1 ? 's' : ''}{' '}
            need attention
          </Text>
        </View>
      )}

      {/* Livestock List */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionTitle}>Your Livestock</Text>
        {livestock.map(renderAnimalCard)}

        <TouchableOpacity style={styles.addButton}>
          <Text style={styles.addButtonText}>➕ Add New Animal</Text>
        </TouchableOpacity>

        <View style={{ height: 30 }} />
      </ScrollView>
    </View>
  );
}

LivestockDashboard.showGameOverlay = false;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.skyBlue,
  },
  header: {
    backgroundColor: COLORS.primaryGreen,
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  backButton: {
    marginBottom: 10,
  },
  backButtonText: {
    color: COLORS.pureWhite,
    fontSize: 16,
    fontWeight: 'bold',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.pureWhite,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 15,
    paddingHorizontal: 10,
    backgroundColor: COLORS.pureWhite,
  },
  statCard: {
    alignItems: 'center',
  },
  statCardIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  statCardValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.primaryGreen,
  },
  statCardLabel: {
    fontSize: 10,
    color: COLORS.earthBrown,
  },
  alertBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    padding: 12,
    marginHorizontal: 15,
    marginTop: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  alertIcon: {
    fontSize: 20,
    marginRight: 10,
  },
  alertText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#92400E',
  },
  content: {
    flex: 1,
    paddingTop: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.deepBlack,
    marginBottom: 15,
    paddingHorizontal: 15,
  },
  animalCard: {
    backgroundColor: COLORS.pureWhite,
    marginHorizontal: 15,
    marginBottom: 15,
    borderRadius: 12,
    padding: 15,
    borderWidth: 2,
    borderColor: COLORS.primaryGreen,
    shadowColor: COLORS.deepBlack,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  animalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  animalIcon: {
    fontSize: 40,
    marginRight: 12,
  },
  animalInfo: {
    flex: 1,
  },
  animalName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.deepBlack,
  },
  animalType: {
    fontSize: 12,
    color: COLORS.earthBrown,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: COLORS.pureWhite,
    textTransform: 'uppercase',
  },
  animalStats: {
    marginBottom: 15,
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  statLabel: {
    fontSize: 14,
    color: COLORS.earthBrown,
    width: 90,
  },
  statValue: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.deepBlack,
  },
  healthBar: {
    flex: 1,
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    marginRight: 10,
    overflow: 'hidden',
  },
  healthFill: {
    height: '100%',
    borderRadius: 4,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    backgroundColor: COLORS.primaryGreen,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  careButton: {
    backgroundColor: COLORS.accentYellow,
  },
  actionButtonText: {
    color: COLORS.deepBlack,
    fontSize: 12,
    fontWeight: 'bold',
  },
  addButton: {
    backgroundColor: COLORS.accentYellow,
    marginHorizontal: 15,
    marginTop: 10,
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.primaryGreen,
    borderStyle: 'dashed',
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.primaryGreen,
  },
});
