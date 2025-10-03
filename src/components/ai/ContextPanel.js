import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { COLORS } from '../../constants/colors';

const ContextPanel = ({ context, visible }) => {
  if (!visible || !context) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>AI Context</Text>
      <Text style={styles.subtitle}>What the AI knows about you:</Text>
      
      <ScrollView style={styles.scrollView}>
        <ContextItem icon="👤" label="Role" value={context.userRole} />
        <ContextItem icon="📍" label="Location" value={context.location} />
        <ContextItem icon="🌾" label="Crops" value={context.crops?.join(', ') || 'None'} />
        <ContextItem icon="📏" label="Farm Size" value={`${context.farmSize} acres`} />
        <ContextItem icon="📊" label="Experience" value={context.experienceLevel} />
        <ContextItem icon="🎯" label="Current Activity" value={context.currentActivity} />
        
        {context.completedTutorials && context.completedTutorials.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>✓ Completed Tutorials</Text>
            {context.completedTutorials.slice(0, 3).map((tutorial, index) => (
              <Text key={index} style={styles.listItem}>• {tutorial}</Text>
            ))}
          </View>
        )}
        
        {context.nasaData && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🛰️ NASA Data Available</Text>
            {context.nasaData.soilMoisture && (
              <Text style={styles.listItem}>• Soil Moisture: {context.nasaData.soilMoisture}%</Text>
            )}
            {context.nasaData.rainfall && (
              <Text style={styles.listItem}>• Rainfall: {context.nasaData.rainfall}mm</Text>
            )}
            {context.nasaData.ndvi && (
              <Text style={styles.listItem}>• NDVI: {context.nasaData.ndvi}</Text>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const ContextItem = ({ icon, label, value }) => (
  <View style={styles.contextItem}>
    <Text style={styles.icon}>{icon}</Text>
    <View style={styles.contextContent}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  </View>
);

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: '75%',
    backgroundColor: COLORS.pureWhite,
    borderLeftWidth: 1,
    borderLeftColor: '#E0E0E0',
    shadowColor: '#000',
    shadowOffset: { width: -2, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
    padding: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.deepBlack,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: '#666',
    marginBottom: 16,
  },
  scrollView: {
    flex: 1,
  },
  contextItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  icon: {
    fontSize: 24,
    marginRight: 12,
  },
  contextContent: {
    flex: 1,
  },
  label: {
    fontSize: 12,
    color: '#999',
    marginBottom: 2,
  },
  value: {
    fontSize: 15,
    color: COLORS.deepBlack,
    fontWeight: '500',
  },
  section: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primaryGreen,
    marginBottom: 8,
  },
  listItem: {
    fontSize: 13,
    color: COLORS.deepBlack,
    marginBottom: 4,
    paddingLeft: 8,
  },
});

export default ContextPanel;
