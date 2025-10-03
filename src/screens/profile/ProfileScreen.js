import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { COLORS } from '../../constants/colors';
import { authService } from '../../services/auth.service';

export default function ProfileScreen({ navigation }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    const user = authService.getCurrentUser();
    if (user) {
      const result = await authService.getUserProfile(user.uid);
      if (result.success) {
        setProfile(result.data);
      }
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={COLORS.primaryGreen} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>👤 Profile</Text>

      <View style={styles.profileCard}>
        <View style={styles.avatarSection}>
          <Text style={styles.avatar}>{profile?.avatar || '🧑‍🌾'}</Text>
          <View style={styles.nameSection}>
            <Text style={styles.name}>{profile?.fullName || 'Guest User'}</Text>
            <Text style={styles.role}>{profile?.role === 'farmer' ? '🌾 Farmer' : '📚 Student'}</Text>
          </View>
        </View>

        <View style={styles.infoSection}>
          <View style={styles.infoRow}>
            <Text style={styles.label}>Email:</Text>
            <Text style={styles.value}>{profile?.email || 'N/A'}</Text>
          </View>

          {profile?.age && (
            <View style={styles.infoRow}>
              <Text style={styles.label}>Age:</Text>
              <Text style={styles.value}>{profile.age} years</Text>
            </View>
          )}

          {profile?.location && (
            <View style={styles.infoRow}>
              <Text style={styles.label}>Location:</Text>
              <Text style={styles.value}>{profile.location}</Text>
            </View>
          )}

          {profile?.language && (
            <View style={styles.infoRow}>
              <Text style={styles.label}>Language:</Text>
              <Text style={styles.value}>
                {profile.language === 'en' ? '🇬🇧 English' : '🇧🇩 বাংলা'}
              </Text>
            </View>
          )}

          <View style={styles.infoRow}>
            <Text style={styles.label}>Member Since:</Text>
            <Text style={styles.value}>
              {profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString() : 'N/A'}
            </Text>
          </View>

          {profile?.profileCompletionPercentage && (
            <View style={styles.infoRow}>
              <Text style={styles.label}>Profile Completion:</Text>
              <Text style={styles.value}>{profile.profileCompletionPercentage}%</Text>
            </View>
          )}
        </View>
      </View>

      <TouchableOpacity
        style={styles.editButton}
        onPress={() => navigation.navigate('ProfileSetup', { editMode: true })}
      >
        <Text style={styles.editButtonText}>✏️ Edit Profile</Text>
      </TouchableOpacity>

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
    backgroundColor: COLORS.pureWhite,
    padding: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: COLORS.primaryGreen,
    marginTop: 60,
    marginBottom: 30,
  },
  profileCard: {
    backgroundColor: COLORS.accentYellow,
    borderRadius: 12,
    padding: 20,
    borderWidth: 2,
    borderColor: COLORS.primaryGreen,
  },
  avatarSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 20,
    borderBottomWidth: 2,
    borderBottomColor: COLORS.primaryGreen,
  },
  avatar: {
    fontSize: 64,
    marginRight: 20,
  },
  nameSection: {
    flex: 1,
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.deepBlack,
    marginBottom: 5,
  },
  role: {
    fontSize: 16,
    color: COLORS.earthBrown,
    fontWeight: '600',
  },
  infoSection: {
    gap: 12,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    fontSize: 14,
    color: COLORS.earthBrown,
    fontWeight: '600',
  },
  value: {
    fontSize: 16,
    color: COLORS.deepBlack,
    fontWeight: 'bold',
    textAlign: 'right',
    flex: 1,
    marginLeft: 10,
  },
  editButton: {
    backgroundColor: COLORS.primaryGreen,
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
    borderWidth: 2,
    borderColor: COLORS.earthBrown,
  },
  editButtonText: {
    color: COLORS.pureWhite,
    fontSize: 18,
    fontWeight: 'bold',
  },
  backButton: {
    backgroundColor: COLORS.earthBrown,
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 15,
  },
  backButtonText: {
    color: COLORS.pureWhite,
    fontSize: 16,
    fontWeight: 'bold',
  },
});
