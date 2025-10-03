import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { COLORS } from '../../constants/colors';
import { authService } from '../../services/auth.service';

const ROLES = [
  { id: 'farmer', label: 'Farmer', icon: '🌾', description: 'Grow crops and manage farms' },
  { id: 'student', label: 'Student', icon: '📚', description: 'Learn sustainable farming' },
  { id: 'researcher', label: 'Researcher', icon: '🔬', description: 'Study agricultural science' },
  { id: 'extension_officer', label: 'Extension Officer', icon: '👨‍🏫', description: 'Guide and educate farmers' }
];

export default function RegisterScreen({ navigation }) {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [selectedRole, setSelectedRole] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [loading, setLoading] = useState(false);

  // Validation functions
  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePhone = (phone) => {
    // Bangladesh phone format: 01XXXXXXXXX (11 digits)
    const phoneRegex = /^01[0-9]{9}$/;
    return phoneRegex.test(phone.replace(/[\s-]/g, ''));
  };

  const validatePassword = (password) => {
    // At least 6 characters, 1 letter, 1 number
    if (password.length < 6) return { valid: false, message: 'Password must be at least 6 characters' };
    if (!/[A-Za-z]/.test(password)) return { valid: false, message: 'Password must contain at least one letter' };
    if (!/[0-9]/.test(password)) return { valid: false, message: 'Password must contain at least one number' };
    return { valid: true };
  };

  const showError = (message) => {
    Alert.alert('⚠️ Validation Error', message, [{ text: 'OK' }]);
  };

  const handleRegister = async () => {
    // Validation
    if (!username.trim()) {
      showError('Please enter a username');
      return;
    }

    if (!email.trim()) {
      showError('Please enter an email address');
      return;
    }

    if (!validateEmail(email)) {
      showError('Please enter a valid email address');
      return;
    }

    if (phone && !validatePhone(phone)) {
      showError('Please enter a valid Bangladesh phone number (01XXXXXXXXX)');
      return;
    }

    if (!password) {
      showError('Please enter a password');
      return;
    }

    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      showError(passwordValidation.message);
      return;
    }

    if (password !== confirmPassword) {
      showError('Passwords do not match');
      return;
    }

    if (!selectedRole) {
      showError('Please select your character class (role)');
      return;
    }

    if (!acceptedTerms) {
      showError('Please accept the Terms & Conditions');
      return;
    }

    // Register user
    setLoading(true);
    try {
      const result = await authService.register(email, password, {
        username: username.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        role: selectedRole,
        profileComplete: false
      });

      setLoading(false);

      if (result.success) {
        Alert.alert(
          '🎉 Welcome to EcoSphere!',
          `Your character "${username}" has been created successfully!`,
          [{ text: 'Start Journey', onPress: () => {} }]
        );
        // Navigation handled by auth state listener
      } else {
        // Handle specific Firebase errors
        let errorMessage = result.error;
        if (result.error.includes('email-already-in-use')) {
          errorMessage = 'This email is already registered. Please login instead.';
        } else if (result.error.includes('weak-password')) {
          errorMessage = 'Password is too weak. Please use a stronger password.';
        } else if (result.error.includes('network-request-failed')) {
          errorMessage = 'Network error. Please check your internet connection.';
        }
        showError(errorMessage);
      }
    } catch (error) {
      setLoading(false);
      showError('An unexpected error occurred. Please try again.');
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>🌍 Choose Your Character</Text>
        <Text style={styles.subtitle}>Join the EcoSphere adventure</Text>

        {/* Username */}
        <TextInput
          style={styles.input}
          placeholder="Username"
          placeholderTextColor={COLORS.earthBrown}
          value={username}
          onChangeText={setUsername}
          autoCapitalize="words"
        />

        {/* Email */}
        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor={COLORS.earthBrown}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />

        {/* Phone (Optional) */}
        <TextInput
          style={styles.input}
          placeholder="Phone (Optional - 01XXXXXXXXX)"
          placeholderTextColor={COLORS.earthBrown}
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
          maxLength={11}
        />

        {/* Password */}
        <View style={styles.passwordContainer}>
          <TextInput
            style={styles.passwordInput}
            placeholder="Password"
            placeholderTextColor={COLORS.earthBrown}
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
          />
          <TouchableOpacity 
            style={styles.eyeButton}
            onPress={() => setShowPassword(!showPassword)}
          >
            <Text style={styles.eyeIcon}>{showPassword ? '👁️' : '👁️‍🗨️'}</Text>
          </TouchableOpacity>
        </View>

        {/* Confirm Password */}
        <View style={styles.passwordContainer}>
          <TextInput
            style={styles.passwordInput}
            placeholder="Confirm Password"
            placeholderTextColor={COLORS.earthBrown}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry={!showConfirmPassword}
          />
          <TouchableOpacity 
            style={styles.eyeButton}
            onPress={() => setShowConfirmPassword(!showConfirmPassword)}
          >
            <Text style={styles.eyeIcon}>{showConfirmPassword ? '👁️' : '👁️‍🗨️'}</Text>
          </TouchableOpacity>
        </View>

        {/* Role Selection */}
        <Text style={styles.roleTitle}>Select Your Class:</Text>
        <View style={styles.rolesContainer}>
          {ROLES.map((role) => (
            <TouchableOpacity
              key={role.id}
              style={[
                styles.roleCard,
                selectedRole === role.id && styles.roleCardSelected
              ]}
              onPress={() => setSelectedRole(role.id)}
            >
              <Text style={styles.roleIcon}>{role.icon}</Text>
              <Text style={styles.roleLabel}>{role.label}</Text>
              <Text style={styles.roleDescription}>{role.description}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Terms & Conditions */}
        <TouchableOpacity 
          style={styles.checkboxContainer}
          onPress={() => setAcceptedTerms(!acceptedTerms)}
        >
          <View style={[styles.checkbox, acceptedTerms && styles.checkboxChecked]}>
            {acceptedTerms && <Text style={styles.checkmark}>✓</Text>}
          </View>
          <Text style={styles.checkboxText}>
            I accept the Terms & Conditions
          </Text>
        </TouchableOpacity>

        {/* Register Button */}
        <TouchableOpacity 
          style={[styles.button, loading && styles.buttonDisabled]} 
          onPress={handleRegister}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading ? '⏳ Creating Character...' : '🚀 Start Adventure'}
          </Text>
        </TouchableOpacity>

        {/* Login Link */}
        <TouchableOpacity onPress={() => navigation.navigate('Login')}>
          <Text style={styles.linkText}>Already have an account? Login</Text>
        </TouchableOpacity>
        {loading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color={COLORS.pureWhite} />
            <Text style={styles.loadingText}>Creating Account...</Text>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.earthBrown,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 20,
    paddingTop: 50,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: COLORS.accentYellow,
    marginBottom: 8,
    textAlign: 'center',
    textShadowColor: COLORS.deepBlack,
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 4,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.pureWhite,
    marginBottom: 30,
    textAlign: 'center',
  },
  input: {
    width: '100%',
    height: 50,
    backgroundColor: COLORS.pureWhite,
    borderWidth: 2,
    borderColor: COLORS.primaryGreen,
    borderRadius: 8,
    paddingHorizontal: 15,
    marginBottom: 15,
    fontSize: 16,
    color: COLORS.deepBlack,
  },
  passwordContainer: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  passwordInput: {
    flex: 1,
    height: 50,
    backgroundColor: COLORS.pureWhite,
    borderWidth: 2,
    borderColor: COLORS.primaryGreen,
    borderRadius: 8,
    paddingHorizontal: 15,
    fontSize: 16,
    color: COLORS.deepBlack,
  },
  eyeButton: {
    position: 'absolute',
    right: 15,
    height: 50,
    justifyContent: 'center',
  },
  eyeIcon: {
    fontSize: 20,
  },
  roleTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.accentYellow,
    marginTop: 10,
    marginBottom: 15,
    textAlign: 'center',
  },
  rolesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  roleCard: {
    width: '48%',
    backgroundColor: COLORS.pureWhite,
    borderRadius: 12,
    padding: 15,
    marginBottom: 12,
    alignItems: 'center',
    borderWidth: 3,
    borderColor: COLORS.primaryGreen,
  },
  roleCardSelected: {
    borderColor: COLORS.accentYellow,
    backgroundColor: COLORS.accentYellow,
    shadowColor: COLORS.accentYellow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 8,
  },
  roleIcon: {
    fontSize: 36,
    marginBottom: 8,
  },
  roleLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.deepBlack,
    marginBottom: 4,
    textAlign: 'center',
  },
  roleDescription: {
    fontSize: 11,
    color: COLORS.earthBrown,
    textAlign: 'center',
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 10,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: COLORS.pureWhite,
    borderRadius: 4,
    marginRight: 10,
    backgroundColor: COLORS.pureWhite,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: COLORS.primaryGreen,
    borderColor: COLORS.primaryGreen,
  },
  checkmark: {
    color: COLORS.pureWhite,
    fontSize: 16,
    fontWeight: 'bold',
  },
  checkboxText: {
    flex: 1,
    fontSize: 14,
    color: COLORS.pureWhite,
  },
  button: {
    width: '100%',
    height: 55,
    backgroundColor: COLORS.primaryGreen,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
    shadowColor: COLORS.deepBlack,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 6,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: COLORS.pureWhite,
    fontSize: 18,
    fontWeight: 'bold',
  },
  linkText: {
    color: COLORS.accentYellow,
    marginTop: 20,
    marginBottom: 30,
    fontSize: 14,
    textAlign: 'center',
    textDecorationLine: 'underline',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: COLORS.pureWhite,
    fontSize: 18,
    marginTop: 12,
  },
});
