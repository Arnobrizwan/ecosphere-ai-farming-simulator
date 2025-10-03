import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView
} from 'react-native';
import { COLORS } from '../../constants/colors';
import { authService } from '../../services/auth.service';
import { storage } from '../../utils/storage';

export default function LoginScreen({ navigation }) {
  const [emailOrPhone, setEmailOrPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);

  // Load saved email on mount
  useEffect(() => {
    loadSavedCredentials();
  }, []);

  const loadSavedCredentials = async () => {
    const savedEmail = await storage.get('rememberedEmail');
    if (savedEmail) {
      setEmailOrPhone(savedEmail);
      setRememberMe(true);
    }
  };

  // Validation functions
  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePhone = (phone) => {
    // Bangladesh phone format: 01XXXXXXXXX
    const phoneRegex = /^01[0-9]{9}$/;
    return phoneRegex.test(phone.replace(/[\s-]/g, ''));
  };

  const validateInput = () => {
    if (!emailOrPhone.trim()) {
      Alert.alert('⚠️ Required Field', 'Please enter your email or phone number');
      return false;
    }

    // Check if it's email or phone
    const isEmail = emailOrPhone.includes('@');
    const isPhone = /^01/.test(emailOrPhone);

    if (isEmail && !validateEmail(emailOrPhone)) {
      Alert.alert('⚠️ Invalid Email', 'Please enter a valid email address');
      return false;
    }

    if (isPhone && !validatePhone(emailOrPhone)) {
      Alert.alert('⚠️ Invalid Phone', 'Please enter a valid phone number (01XXXXXXXXX)');
      return false;
    }

    if (!password) {
      Alert.alert('⚠️ Required Field', 'Please enter your password');
      return false;
    }

    return true;
  };

  const handleLogin = async () => {
    if (!validateInput()) return;

    // Phone number login is not supported yet
    if (!emailOrPhone.includes('@')) {
      Alert.alert('🚫 Phone Login Not Supported', 'Please use your email address to log in.');
      return;
    }

    setLoading(true);

    try {
      // Use email for Firebase auth (phone login would need different implementation)
      const loginEmail = emailOrPhone.includes('@') 
        ? emailOrPhone.trim().toLowerCase() 
        : emailOrPhone; // If phone, would need to convert to email or use phone auth

      const result = await authService.login(loginEmail, password);

      if (result.success) {
        // Save email if remember me is checked
        if (rememberMe) {
          await storage.save('rememberedEmail', emailOrPhone);
        } else {
          await storage.remove('rememberedEmail');
        }

        // Check if profile is complete
        const profileResult = await authService.getUserProfile(result.user.uid);
        
        if (profileResult.success) {
          const profileComplete = profileResult.data.profileComplete;
          
          // Navigation will be handled by auth state listener
          // But we can show a welcome message
          if (!profileComplete) {
            Alert.alert(
              '🌱 Welcome Back!',
              'Please complete your profile to continue',
              [{ text: 'Continue' }]
            );
          } else {
            Alert.alert(
              '🎉 Welcome Back!',
              'Entering your farm...',
              [{ text: 'OK' }]
            );
          }
        }
      } else {
        // Handle specific Firebase errors
        let errorMessage = result.error;
        
        if (result.error.includes('user-not-found')) {
          errorMessage = 'No account found with this email. Please sign up first.';
        } else if (result.error.includes('wrong-password')) {
          errorMessage = 'Incorrect password. Please try again.';
        } else if (result.error.includes('invalid-email')) {
          errorMessage = 'Invalid email format. Please check and try again.';
        } else if (result.error.includes('user-disabled')) {
          errorMessage = 'This account has been disabled. Please contact support.';
        } else if (result.error.includes('network-request-failed')) {
          errorMessage = 'Network error. Please check your internet connection.';
        } else if (result.error.includes('too-many-requests')) {
          errorMessage = 'Too many failed attempts. Please try again later.';
        }

        Alert.alert('🚫 Login Failed', errorMessage);
      }
    } catch (error) {
      Alert.alert('❌ Error', 'An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    const email = emailOrPhone.trim().toLowerCase();
    if (!validateEmail(email)) {
      Alert.alert(
        '🔑 Reset Password',
        'Please enter your email address in the "Email or Phone" field first, then click "Forgot Password" again.'
      );
      return;
    }

    setLoading(true);
    try {
      const result = await authService.forgotPassword(email);
      if (result.success) {
        Alert.alert(
          '✅ Reset Email Sent',
          'A password reset link has been sent to your email address. Please check your inbox.'
        );
      } else {
        let errorMessage = result.error;
        if (result.error.includes('user-not-found')) {
          errorMessage = 'No account found with this email address.';
        }
        Alert.alert('🚫 Error', errorMessage);
      }
    } catch (error) {
      Alert.alert('❌ Error', 'An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
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
        {/* Logo Area */}
        <View style={styles.logoContainer}>
          <Text style={styles.logo}>🌱 EcoSphere</Text>
          <Text style={styles.tagline}>Enter the Farm</Text>
          <Text style={styles.subtitle}>Your agricultural adventure awaits</Text>
        </View>

        {/* Login Form */}
        <View style={styles.formContainer}>
          {/* Email/Phone Input */}
          <TextInput
            style={styles.input}
            placeholder="Email or Phone"
            placeholderTextColor={COLORS.earthBrown}
            value={emailOrPhone}
            onChangeText={setEmailOrPhone}
            autoCapitalize="none"
            keyboardType="email-address"
          />

          {/* Password Input with Toggle */}
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

          {/* Remember Me Checkbox */}
          <TouchableOpacity 
            style={styles.checkboxContainer}
            onPress={() => setRememberMe(!rememberMe)}
          >
            <View style={[styles.checkbox, rememberMe && styles.checkboxChecked]}>
              {rememberMe && <Text style={styles.checkmark}>✓</Text>}
            </View>
            <Text style={styles.checkboxText}>Remember me</Text>
          </TouchableOpacity>

          {/* Login Button */}
          <TouchableOpacity 
            style={[styles.loginButton, loading && styles.buttonDisabled]} 
            onPress={handleLogin}
            disabled={loading}
          >
            <Text style={styles.loginButtonText}>
              {loading ? '⏳ Entering Farm...' : '🚜 Enter Farm'}
            </Text>
          </TouchableOpacity>

          {/* Forgot Password Link */}
          <TouchableOpacity onPress={handleForgotPassword}>
            <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
          </TouchableOpacity>

          {/* Divider */}
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>OR</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Sign Up Link */}
          <TouchableOpacity 
            style={styles.signupButton}
            onPress={() => navigation.navigate('Register')}
          >
            <Text style={styles.signupButtonText}>🌾 New User Sign Up</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.skyBlue,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40,
    marginTop: 60,
  },
  logo: {
    fontSize: 48,
    fontWeight: 'bold',
    color: COLORS.pureWhite,
    marginBottom: 10,
    textShadowColor: COLORS.deepBlack,
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 4,
  },
  tagline: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.accentYellow,
    marginBottom: 8,
    textShadowColor: COLORS.deepBlack,
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.pureWhite,
    textAlign: 'center',
    opacity: 0.9,
  },
  formContainer: {
    backgroundColor: COLORS.pureWhite,
    borderRadius: 20,
    padding: 25,
    shadowColor: COLORS.deepBlack,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  input: {
    width: '100%',
    height: 50,
    backgroundColor: COLORS.pureWhite,
    borderWidth: 2,
    borderColor: COLORS.primaryGreen,
    borderRadius: 10,
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
    borderRadius: 10,
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
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderWidth: 2,
    borderColor: COLORS.primaryGreen,
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
    fontSize: 14,
    fontWeight: 'bold',
  },
  checkboxText: {
    fontSize: 14,
    color: COLORS.deepBlack,
  },
  loginButton: {
    width: '100%',
    height: 55,
    backgroundColor: COLORS.primaryGreen,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
    shadowColor: COLORS.deepBlack,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 6,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  loginButtonText: {
    color: COLORS.pureWhite,
    fontSize: 18,
    fontWeight: 'bold',
  },
  forgotPasswordText: {
    color: COLORS.skyBlue,
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
    textDecorationLine: 'underline',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.earthBrown,
    opacity: 0.3,
  },
  dividerText: {
    marginHorizontal: 10,
    fontSize: 14,
    color: COLORS.earthBrown,
    fontWeight: 'bold',
  },
  signupButton: {
    width: '100%',
    height: 50,
    backgroundColor: COLORS.accentYellow,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.earthBrown,
  },
  signupButtonText: {
    color: COLORS.earthBrown,
    fontSize: 16,
    fontWeight: 'bold',
  },
});
