import Constants from 'expo-constants';

/**
 * Translation Service for UC3 Profile Setup
 * Provides Bangla translations for the app
 * Uses static translations (no API needed for better performance)
 */

const translations = {
  en: {
    // Profile Setup - Step 1
    'profile.step1.title': '🎮 Customize Your Character',
    'profile.step1.subtitle': "Let's create your farming avatar",
    'profile.fullName': 'Full Name',
    'profile.fullName.placeholder': 'Enter your full name',
    'profile.avatar': 'Choose Your Avatar',
    'profile.gender': 'Gender (Optional)',
    'profile.gender.male': 'Male',
    'profile.gender.female': 'Female',
    'profile.gender.other': 'Other',
    'profile.age': 'Age (Optional)',
    'profile.age.placeholder': 'Enter your age',
    'profile.location': 'Location (Optional)',
    'profile.location.placeholder': 'e.g., Dhaka, Bangladesh',
    'profile.language': 'Language Preference',

    // Profile Setup - Step 2 (Farmer)
    'profile.step2.farmer.title': '🌾 Your Farming Profile',
    'profile.step2.farmer.subtitle': 'Tell us about your farm',
    'profile.crops': 'Primary Crops (Select all that apply)',
    'profile.crops.rice': 'Rice',
    'profile.crops.wheat': 'Wheat',
    'profile.crops.vegetables': 'Vegetables',
    'profile.crops.fruits': 'Fruits',
    'profile.crops.livestock': 'Livestock',
    'profile.crops.poultry': 'Poultry',
    'profile.farmSize': 'Farm Size',
    'profile.farmSize.acres': 'acres',
    'profile.experience': 'Experience Level',
    'profile.experience.beginner': 'Beginner',
    'profile.experience.beginner.desc': 'Just starting out',
    'profile.experience.intermediate': 'Intermediate',
    'profile.experience.intermediate.desc': '1-5 years experience',
    'profile.experience.advanced': 'Advanced',
    'profile.experience.advanced.desc': '5+ years experience',

    // Profile Setup - Step 2 (Student)
    'profile.step2.student.title': '📚 Learning Goals',
    'profile.step2.student.subtitle': 'Tell us about your studies',
    'profile.gradeLevel': 'Grade Level',
    'profile.gradeLevel.placeholder': 'e.g., Grade 10',
    'profile.schoolName': 'School Name (Optional)',
    'profile.schoolName.placeholder': 'Enter your school name',
    'profile.interests': 'Learning Interests',
    'profile.interests.sustainable': 'Sustainable Farming',
    'profile.interests.technology': 'Farm Technology',
    'profile.interests.business': 'Agri-Business',
    'profile.interests.science': 'Agricultural Science',

    // Profile Setup - Step 3
    'profile.step3.title': '⚙️ Preferences',
    'profile.step3.subtitle': 'Customize your experience',
    'profile.notifications': 'Notification Preferences',
    'profile.notifications.weather': 'Weather Alerts',
    'profile.notifications.tips': 'Farming Tips',
    'profile.notifications.community': 'Community Updates',
    'profile.units': 'Measurement Units',
    'profile.units.metric': 'Metric',
    'profile.units.metric.desc': '(kg, m, °C)',
    'profile.units.imperial': 'Imperial',
    'profile.units.imperial.desc': '(lb, ft, °F)',
    'profile.reminderTime': 'Best Time for Reminders',
    'profile.reminderTime.morning': 'Morning',
    'profile.reminderTime.afternoon': 'Afternoon',
    'profile.reminderTime.evening': 'Evening',

    // Navigation
    'nav.back': '← Back',
    'nav.next': 'Next →',
    'nav.finish': '🎉 Finish',
    'nav.saveChanges': '✅ Save Changes',
    'nav.saveDraft': '💾 Save Draft',
    'nav.autoSave': '💡 Auto-saves every 30 seconds',

    // Alerts
    'alert.required': '⚠️ Required',
    'alert.nameRequired': 'Please enter your full name',
    'alert.cropsRequired': 'Please select at least one crop',
    'alert.experienceRequired': 'Please select your experience level',
    'alert.gradeLevelRequired': 'Please enter your grade level',
    'alert.draftSaved': '✅ Draft Saved',
    'alert.draftSaved.message': 'Your progress has been saved.',
    'alert.saveFailed': '⚠️ Save Failed',
    'alert.saveFailed.message': 'Could not save draft. Please try again.',
    'alert.profileComplete': '🎉 Profile Complete!',
    'alert.profileComplete.message': 'Your profile is {percent}% complete!',
    'alert.saveProgress': '💾 Save Progress?',
    'alert.saveProgress.message': 'Do you want to save your progress as a draft?',
    'alert.discard': 'Discard',

    // Profile Screen
    'profile.title': '👤 Profile',
    'profile.farmer': '🌾 Farmer',
    'profile.student': '📚 Student',
    'profile.email': 'Email:',
    'profile.memberSince': 'Member Since:',
    'profile.completion': 'Profile Completion:',
    'profile.editProfile': '✏️ Edit Profile',
    'profile.backToDashboard': '← Back to Dashboard',
  },

  bn: {
    // Profile Setup - Step 1
    'profile.step1.title': '🎮 আপনার চরিত্র কাস্টমাইজ করুন',
    'profile.step1.subtitle': 'চলুন আপনার কৃষি অবতার তৈরি করি',
    'profile.fullName': 'পুরো নাম',
    'profile.fullName.placeholder': 'আপনার পুরো নাম লিখুন',
    'profile.avatar': 'আপনার অবতার নির্বাচন করুন',
    'profile.gender': 'লিঙ্গ (ঐচ্ছিক)',
    'profile.gender.male': 'পুরুষ',
    'profile.gender.female': 'মহিলা',
    'profile.gender.other': 'অন্যান্য',
    'profile.age': 'বয়স (ঐচ্ছিক)',
    'profile.age.placeholder': 'আপনার বয়স লিখুন',
    'profile.location': 'অবস্থান (ঐচ্ছিক)',
    'profile.location.placeholder': 'যেমন, ঢাকা, বাংলাদেশ',
    'profile.language': 'ভাষার পছন্দ',

    // Profile Setup - Step 2 (Farmer)
    'profile.step2.farmer.title': '🌾 আপনার কৃষি প্রোফাইল',
    'profile.step2.farmer.subtitle': 'আপনার খামার সম্পর্কে বলুন',
    'profile.crops': 'প্রধান ফসল (সব প্রযোজ্য নির্বাচন করুন)',
    'profile.crops.rice': 'ধান',
    'profile.crops.wheat': 'গম',
    'profile.crops.vegetables': 'সবজি',
    'profile.crops.fruits': 'ফল',
    'profile.crops.livestock': 'পশুসম্পদ',
    'profile.crops.poultry': 'হাঁস-মুরগি',
    'profile.farmSize': 'খামারের আকার',
    'profile.farmSize.acres': 'একর',
    'profile.experience': 'অভিজ্ঞতা স্তর',
    'profile.experience.beginner': 'শিক্ষানবিস',
    'profile.experience.beginner.desc': 'সবেমাত্র শুরু করছি',
    'profile.experience.intermediate': 'মধ্যবর্তী',
    'profile.experience.intermediate.desc': '১-৫ বছরের অভিজ্ঞতা',
    'profile.experience.advanced': 'উন্নত',
    'profile.experience.advanced.desc': '৫+ বছরের অভিজ্ঞতা',

    // Profile Setup - Step 2 (Student)
    'profile.step2.student.title': '📚 শেখার লক্ষ্য',
    'profile.step2.student.subtitle': 'আপনার পড়াশোনা সম্পর্কে বলুন',
    'profile.gradeLevel': 'শ্রেণী স্তর',
    'profile.gradeLevel.placeholder': 'যেমন, দশম শ্রেণী',
    'profile.schoolName': 'স্কুলের নাম (ঐচ্ছিক)',
    'profile.schoolName.placeholder': 'আপনার স্কুলের নাম লিখুন',
    'profile.interests': 'শেখার আগ্রহ',
    'profile.interests.sustainable': 'টেকসই কৃষি',
    'profile.interests.technology': 'খামার প্রযুক্তি',
    'profile.interests.business': 'কৃষি-ব্যবসা',
    'profile.interests.science': 'কৃষি বিজ্ঞান',

    // Profile Setup - Step 3
    'profile.step3.title': '⚙️ পছন্দসমূহ',
    'profile.step3.subtitle': 'আপনার অভিজ্ঞতা কাস্টমাইজ করুন',
    'profile.notifications': 'বিজ্ঞপ্তি পছন্দ',
    'profile.notifications.weather': 'আবহাওয়া সতর্কতা',
    'profile.notifications.tips': 'কৃষি পরামর্শ',
    'profile.notifications.community': 'সম্প্রদায় আপডেট',
    'profile.units': 'পরিমাপ একক',
    'profile.units.metric': 'মেট্রিক',
    'profile.units.metric.desc': '(কেজি, মিটার, °সে)',
    'profile.units.imperial': 'ইম্পেরিয়াল',
    'profile.units.imperial.desc': '(পাউন্ড, ফুট, °ফা)',
    'profile.reminderTime': 'অনুস্মারক জন্য সেরা সময়',
    'profile.reminderTime.morning': 'সকাল',
    'profile.reminderTime.afternoon': 'বিকাল',
    'profile.reminderTime.evening': 'সন্ধ্যা',

    // Navigation
    'nav.back': '← পিছনে',
    'nav.next': 'পরবর্তী →',
    'nav.finish': '🎉 সমাপ্ত',
    'nav.saveChanges': '✅ পরিবর্তন সংরক্ষণ করুন',
    'nav.saveDraft': '💾 খসড়া সংরক্ষণ করুন',
    'nav.autoSave': '💡 প্রতি ৩০ সেকেন্ডে স্বয়ংক্রিয়ভাবে সংরক্ষিত হয়',

    // Alerts
    'alert.required': '⚠️ প্রয়োজনীয়',
    'alert.nameRequired': 'অনুগ্রহ করে আপনার পুরো নাম লিখুন',
    'alert.cropsRequired': 'অনুগ্রহ করে কমপক্ষে একটি ফসল নির্বাচন করুন',
    'alert.experienceRequired': 'অনুগ্রহ করে আপনার অভিজ্ঞতা স্তর নির্বাচন করুন',
    'alert.gradeLevelRequired': 'অনুগ্রহ করে আপনার শ্রেণী স্তর লিখুন',
    'alert.draftSaved': '✅ খসড়া সংরক্ষিত',
    'alert.draftSaved.message': 'আপনার অগ্রগতি সংরক্ষিত হয়েছে।',
    'alert.saveFailed': '⚠️ সংরক্ষণ ব্যর্থ',
    'alert.saveFailed.message': 'খসড়া সংরক্ষণ করা যায়নি। আবার চেষ্টা করুন।',
    'alert.profileComplete': '🎉 প্রোফাইল সম্পূর্ণ!',
    'alert.profileComplete.message': 'আপনার প্রোফাইল {percent}% সম্পূর্ণ!',
    'alert.saveProgress': '💾 অগ্রগতি সংরক্ষণ করুন?',
    'alert.saveProgress.message': 'আপনি কি আপনার অগ্রগতি খসড়া হিসাবে সংরক্ষণ করতে চান?',
    'alert.discard': 'বাতিল করুন',

    // Profile Screen
    'profile.title': '👤 প্রোফাইল',
    'profile.farmer': '🌾 কৃষক',
    'profile.student': '📚 ছাত্র',
    'profile.email': 'ইমেইল:',
    'profile.memberSince': 'সদস্য যখন থেকে:',
    'profile.completion': 'প্রোফাইল সম্পূর্ণতা:',
    'profile.editProfile': '✏️ প্রোফাইল সম্পাদনা করুন',
    'profile.backToDashboard': '← ড্যাশবোর্ডে ফিরে যান',
  }
};

const getGoogleTranslateApiKey = () => {
  const extra = Constants?.expoConfig?.extra ?? {};
  return extra.googleTranslateApiKey ?? process.env.EXPO_PUBLIC_GOOGLE_TRANSLATE_API_KEY ?? null;
};

const translateWithGoogle = async (text, target = 'bn', source = 'en') => {
  const trimmed = text?.toString().trim();
  if (!trimmed) {
    return '';
  }

  const apiKey = getGoogleTranslateApiKey();

  if (!apiKey) {
    throw new Error('Google Translate API key not configured. Set googleTranslateApiKey in app config or EXPO_PUBLIC_GOOGLE_TRANSLATE_API_KEY.');
  }

  const endpoint = `https://translation.googleapis.com/language/translate/v2?key=${apiKey}`;

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        q: trimmed,
        target,
        source,
        format: 'text'
      })
    });

    const payload = await response.json();

    if (!response.ok) {
      const message = payload?.error?.message ?? 'Translation request failed.';
      throw new Error(message);
    }

    const translated = payload?.data?.translations?.[0]?.translatedText;

    if (!translated) {
      throw new Error('Translation response missing translated text.');
    }

    return translated;
  } catch (error) {
    console.error('Google Translate API error:', error);
    throw error;
  }
};

export const translationService = {
  /**
   * Get translated text
   * @param {string} key - Translation key (e.g., 'profile.fullName')
   * @param {string} language - Language code ('en' or 'bn')
   * @param {Object} params - Optional parameters for interpolation
   * @returns {string} - Translated text
   */
  t: (key, language = 'en', params = {}) => {
    const lang = translations[language] || translations.en;
    let text = lang[key] || translations.en[key] || key;

    // Replace parameters like {percent} with actual values
    if (params) {
      Object.keys(params).forEach(param => {
        text = text.replace(`{${param}}`, params[param]);
      });
    }

    return text;
  },

  /**
   * Get all translations for a language
   * @param {string} language - Language code
   * @returns {Object} - All translations
   */
  getAll: (language = 'en') => {
    return translations[language] || translations.en;
  },

  /**
   * Check if a language is supported
   * @param {string} language - Language code
   * @returns {boolean}
   */
  isSupported: (language) => {
    return translations.hasOwnProperty(language);
  },

  /**
   * Get available languages
   * @returns {Array} - Array of language codes
   */
  getAvailableLanguages: () => {
    return Object.keys(translations);
  },

  /**
   * Get language name
   * @param {string} language - Language code
   * @returns {string} - Language name
   */
  getLanguageName: (language) => {
    const names = {
      en: 'English',
      bn: 'বাংলা'
    };
    return names[language] || language;
  },

  /**
   * Get language flag emoji
   * @param {string} language - Language code
   * @returns {string} - Flag emoji
   */
  getLanguageFlag: (language) => {
    const flags = {
      en: '🇬🇧',
      bn: '🇧🇩'
    };
    return flags[language] || '🌐';
  },

  /**
   * Translate text using Google Translate API
   * @param {string} text - Source text
   * @param {string} target - Target language code (default 'bn')
   * @param {string} source - Source language code (default 'en')
   * @returns {Promise<string>}
   */
  translateWithGoogle: (text, target = 'bn', source = 'en') => translateWithGoogle(text, target, source),

  /**
   * Convenience helper to translate English to Bangla
   * @param {string} text - English text
   * @returns {Promise<string>} - Bangla translation
   */
  translateEnToBn: (text) => translateWithGoogle(text, 'bn', 'en')
};

export default translationService;
