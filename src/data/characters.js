/**
 * Campaign Characters - Farming Simulator Style
 * Interactive NPCs that guide players through farming journey
 */

export const CHARACTERS = {
  // Main Mentor - Your farming guide
  GRANDPA_JACK: {
    id: 'grandpa_jack',
    name: 'Grandpa Jack',
    role: 'Farm Mentor',
    avatar: '👴',
    personality: 'Wise, patient, encouraging',
    description: 'A retired farmer with 50 years of experience. He inherited the family farm and wants to pass on his knowledge.',
    dialogueStyle: 'Warm and encouraging, uses farming wisdom',
    specialization: ['Crop Management', 'Soil Science', 'Traditional Methods'],
  },

  // Technology Expert
  SARAH_TECH: {
    id: 'sarah_tech',
    name: 'Sarah Chen',
    role: 'Agricultural Technology Specialist',
    avatar: '👩‍💻',
    personality: 'Enthusiastic, innovative, modern',
    description: 'A young agri-tech expert who helps farmers use NASA data and modern technology.',
    dialogueStyle: 'Energetic and tech-savvy, explains complex concepts simply',
    specialization: ['NASA Data', 'IoT Sensors', 'Precision Agriculture'],
  },

  // Market Advisor
  MARCUS_TRADER: {
    id: 'marcus_trader',
    name: 'Marcus Rodriguez',
    role: 'Market Advisor',
    avatar: '👨‍💼',
    personality: 'Strategic, business-minded, friendly',
    description: 'Former commodity trader who now helps small farmers get better prices.',
    dialogueStyle: 'Professional but approachable, uses market insights',
    specialization: ['Market Prices', 'Crop Selection', 'Business Strategy'],
  },

  // Environmental Scientist
  DR_GREEN: {
    id: 'dr_green',
    name: 'Dr. Emily Green',
    role: 'Environmental Scientist',
    avatar: '👩‍🔬',
    personality: 'Passionate, detail-oriented, caring',
    description: 'Environmental researcher focused on sustainable farming practices.',
    dialogueStyle: 'Passionate about sustainability, uses scientific facts',
    specialization: ['Sustainability', 'Water Management', 'Soil Health'],
  },

  // Equipment Mechanic
  MIKE_MECHANIC: {
    id: 'mike_mechanic',
    name: 'Mike "Wrench" Johnson',
    role: 'Farm Equipment Expert',
    avatar: '👨‍🔧',
    personality: 'Hands-on, practical, helpful',
    description: 'Experienced mechanic who knows everything about farm equipment.',
    dialogueStyle: 'Down-to-earth, uses practical examples',
    specialization: ['Equipment', 'Irrigation Systems', 'Automation'],
  },

  // Neighbor Farmer
  ANNA_NEIGHBOR: {
    id: 'anna_neighbor',
    name: 'Anna Williams',
    role: 'Neighboring Farmer',
    avatar: '👩‍🌾',
    personality: 'Friendly, competitive, supportive',
    description: 'Runs a successful farm next door, always ready to share tips or friendly competition.',
    dialogueStyle: 'Casual and friendly, shares real experiences',
    specialization: ['Organic Farming', 'Livestock', 'Community'],
  },

  // Weather Expert
  TOM_WEATHER: {
    id: 'tom_weather',
    name: 'Tom "Forecast" Anderson',
    role: 'Weather Specialist',
    avatar: '👨‍🚀',
    personality: 'Precise, analytical, informative',
    description: 'Meteorologist specializing in agricultural weather patterns.',
    dialogueStyle: 'Data-driven, explains weather impacts clearly',
    specialization: ['Weather Patterns', 'Climate Data', 'Risk Management'],
  },

  // Young Apprentice
  LILY_STUDENT: {
    id: 'lily_student',
    name: 'Lily Martinez',
    role: 'Agricultural Student',
    avatar: '👧',
    personality: 'Curious, eager to learn, energetic',
    description: 'College student interning on farms to learn sustainable agriculture.',
    dialogueStyle: 'Asks questions, shows enthusiasm for learning',
    specialization: ['Learning', 'Innovation', 'Youth Perspective'],
  },
};

// Character dialogue templates
export const CHARACTER_DIALOGUES = {
  GRANDPA_JACK: {
    greeting: [
      "Welcome back, young farmer! Ready for another day's work?",
      "Good to see you! The fields are waiting for us.",
      "Ah, perfect timing! I've got something to show you.",
    ],
    mission_intro: [
      "Let me tell you about something important I learned over the years...",
      "Back in my day, we did things a bit differently. Want to learn?",
      "There's a wise way to handle this situation. Listen up!",
    ],
    encouragement: [
      "You're doing great! Just like I knew you would.",
      "That's the spirit! You've got natural farming instincts.",
      "Excellent work! You remind me of myself when I was young.",
    ],
    teaching: [
      "Here's a trick I learned from my grandfather...",
      "Let me share some wisdom about {topic}...",
      "The secret to good farming is {lesson}...",
    ],
  },

  SARAH_TECH: {
    greeting: [
      "Hey! Check out this cool satellite data I found!",
      "Perfect timing! I've got some tech insights for you.",
      "Ready to see how technology can boost your farm?",
    ],
    mission_intro: [
      "I've been analyzing your farm with NASA's latest data...",
      "Let me show you how satellite imagery can help!",
      "Time to upgrade your farming with some tech magic!",
    ],
    encouragement: [
      "Amazing! You're picking up precision agriculture fast!",
      "Yes! That's exactly how to use the data!",
      "You're becoming a tech-savvy farmer!",
    ],
    teaching: [
      "Here's how {technology} works in simple terms...",
      "NASA's {satellite} can help us monitor {metric}...",
      "Smart farmers use data to make better decisions about {topic}...",
    ],
  },

  MARCUS_TRADER: {
    greeting: [
      "Hey farmer! Got some market insights for you.",
      "Good timing! Crop prices are interesting today.",
      "Let's talk business and profits!",
    ],
    mission_intro: [
      "I've been watching the commodity markets...",
      "Here's a strategy that could increase your profits...",
      "Let me show you when to sell for maximum return...",
    ],
    encouragement: [
      "Smart move! That's good business sense!",
      "You're thinking like a successful farmer!",
      "Excellent timing on that sale!",
    ],
    teaching: [
      "Market prices fluctuate based on {factor}...",
      "The best time to sell {crop} is when {condition}...",
      "Here's how to maximize profit on {crop}...",
    ],
  },

  DR_GREEN: {
    greeting: [
      "Hello! I've been studying your farm's ecosystem.",
      "Great to see you! Let's talk sustainability.",
      "Ready to make your farm even greener?",
    ],
    mission_intro: [
      "I've noticed some environmental opportunities on your farm...",
      "Let me share some sustainable farming techniques...",
      "There's a way to improve both yield and soil health...",
    ],
    encouragement: [
      "Wonderful! Your farm is becoming more sustainable!",
      "That's exactly the right approach for the environment!",
      "You're making a positive impact!",
    ],
    teaching: [
      "Soil health depends on {factor}...",
      "Water conservation through {method} can save {amount}...",
      "Sustainable farming means {practice}...",
    ],
  },
};

// Character availability by chapter/mission
export const CHARACTER_UNLOCKS = {
  1: ['GRANDPA_JACK'], // Chapter 1
  2: ['GRANDPA_JACK', 'SARAH_TECH'], // Chapter 2
  3: ['GRANDPA_JACK', 'SARAH_TECH', 'DR_GREEN'], // Chapter 3
  4: ['GRANDPA_JACK', 'SARAH_TECH', 'DR_GREEN', 'MARCUS_TRADER'], // Chapter 4
};

// Character relationships (affect dialogue)
export const CHARACTER_RELATIONSHIPS = {
  GRANDPA_JACK: {
    SARAH_TECH: 'mentor', // Grandpa mentors Sarah about traditional wisdom
    LILY_STUDENT: 'teacher', // Grandpa teaches Lily
  },
  SARAH_TECH: {
    DR_GREEN: 'colleague', // Work together on sustainability
    TOM_WEATHER: 'partner', // Collaborate on weather data
  },
  MARCUS_TRADER: {
    ANNA_NEIGHBOR: 'competitor', // Friendly business rivalry
  },
};

export default CHARACTERS;
