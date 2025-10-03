import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { COLORS } from '../constants/colors';

export default function ProgressCard({
  icon,
  title,
  current,
  total,
  percentage,
  color = COLORS.primaryGreen,
  onPress
}) {
  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.header}>
        <Text style={styles.icon}>{icon}</Text>
        <Text style={styles.title}>{title}</Text>
      </View>

      <View style={styles.progressBarContainer}>
        <View style={styles.progressBarBackground}>
          <View
            style={[
              styles.progressBarFill,
              { width: `${percentage}%`, backgroundColor: color }
            ]}
          />
        </View>
      </View>

      <View style={styles.footer}>
        <Text style={styles.stats}>
          {current}/{total}
        </Text>
        <Text style={[styles.percentage, { color }]}>
          {percentage}%
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.accentYellow,
    borderRadius: 12,
    padding: 15,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: COLORS.primaryGreen,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  icon: {
    fontSize: 24,
    marginRight: 10,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.deepBlack,
  },
  progressBarContainer: {
    marginBottom: 10,
  },
  progressBarBackground: {
    height: 12,
    backgroundColor: COLORS.pureWhite,
    borderRadius: 6,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 6,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  stats: {
    fontSize: 14,
    color: COLORS.earthBrown,
    fontWeight: '600',
  },
  percentage: {
    fontSize: 16,
    fontWeight: 'bold',
  },
});
