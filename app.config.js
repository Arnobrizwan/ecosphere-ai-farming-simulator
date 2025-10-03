export default ({ config }) => ({
  ...config,
  extra: {
    ...(config.extra || {}),
    seedEmail: process.env.EXPO_PUBLIC_SEED_EMAIL,
    seedPassword: process.env.EXPO_PUBLIC_SEED_PASSWORD,
    geminiApiKey: process.env.EXPO_PUBLIC_GEMINI_API_KEY,
    geminiModel: process.env.EXPO_PUBLIC_GEMINI_MODEL,
    googleTranslateApiKey: process.env.EXPO_PUBLIC_GOOGLE_TRANSLATE_API_KEY,
  },
});
