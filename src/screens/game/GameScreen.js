import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { COLORS } from '../../constants/colors';

export default function GameScreen({ navigation }) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>🌍 EcoSphere Game</Text>
      <Text style={styles.subtitle}>Your farming simulation starts here</Text>

      <View style={styles.gameArea}>
        <Text style={styles.gameText}>🎮 Game Modes</Text>
        <Text style={styles.infoText}>
          Choose your farming adventure
        </Text>

        <TouchableOpacity 
          style={styles.modeButton}
          onPress={() => navigation.navigate('CampaignMode')}
        >
          <Text style={styles.modeIcon}>🎯</Text>
          <View style={styles.modeInfo}>
            <Text style={styles.modeTitle}>Campaign Mode</Text>
            <Text style={styles.modeDescription}>
              Complete missions and learn farming skills
            </Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.modeButton}
          onPress={() => navigation.navigate('SandboxMode')}
        >
          <Text style={styles.modeIcon}>🧪</Text>
          <View style={styles.modeInfo}>
            <Text style={styles.modeTitle}>Sandbox Mode</Text>
            <Text style={styles.modeDescription}>
              Experiment with farming scenarios
            </Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.modeButton, styles.modeButtonDisabled]}
          disabled
        >
          <Text style={styles.modeIcon}>🏆</Text>
          <View style={styles.modeInfo}>
            <Text style={styles.modeTitle}>Challenges</Text>
            <Text style={styles.modeDescription}>
              Coming soon - Compete with other farmers
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      <TouchableOpacity 
        style={styles.backButton}
        onPress={() => navigation.goBack()}
      >
        <Text style={styles.backButtonText}>← Back to Dashboard</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.skyBlue,
    padding: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: COLORS.pureWhite,
    marginTop: 60,
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.accentYellow,
    marginBottom: 30,
  },
  gameArea: {
    flex: 1,
    backgroundColor: COLORS.pureWhite,
    borderRadius: 12,
    padding: 20,
  },
  gameText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.deepBlack,
    marginBottom: 10,
    textAlign: 'center',
  },
  infoText: {
    fontSize: 14,
    color: COLORS.earthBrown,
    textAlign: 'center',
    marginBottom: 30,
  },
  modeButton: {
    flexDirection: 'row',
    backgroundColor: COLORS.accentYellow,
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    alignItems: 'center',
    borderWidth: 3,
    borderColor: COLORS.primaryGreen,
  },
  modeButtonDisabled: {
    opacity: 0.5,
    borderColor: COLORS.earthBrown,
  },
  modeIcon: {
    fontSize: 36,
    marginRight: 15,
  },
  modeInfo: {
    flex: 1,
  },
  modeTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.deepBlack,
    marginBottom: 5,
  },
  modeDescription: {
    fontSize: 14,
    color: COLORS.earthBrown,
  },
  backButton: {
    backgroundColor: COLORS.primaryGreen,
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  backButtonText: {
    color: COLORS.pureWhite,
    fontSize: 16,
    fontWeight: 'bold',
  },
});

GameScreen.showGameOverlay = false;
