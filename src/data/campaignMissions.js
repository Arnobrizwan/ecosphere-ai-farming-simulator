/**
 * Enhanced Campaign Missions - Farming Simulator Style
 * Story-driven missions with character interactions
 */

export const CAMPAIGN_STORY = {
  intro: {
    title: "Welcome to Green Valley Farm",
    story: `You've inherited your grandfather's farm in Green Valley.
    Once a thriving agricultural hub, the farm has fallen into disrepair.
    Your grandfather, Jack, has retired but wants to help you restore it to its former glory.

    With the help of modern technology and traditional wisdom, you'll transform
    this neglected land into a sustainable, profitable farm while learning
    about real-world agricultural practices.`,
    setting: "Green Valley, a rural farming community",
    year: "Present Day",
  },
};

export const ENHANCED_MISSIONS = [
  // ===== CHAPTER 1: THE BEGINNING =====
  {
    id: 'm1_1',
    chapterNumber: 1,
    missionNumber: 1,
    title: "Grandpa's Legacy",
    subtitle: "Your Farming Journey Begins",

    // Story elements
    story: {
      intro: `Grandpa Jack meets you at the old farm gate. "Welcome home!" he says with a warm smile.
      "I know the farm looks rough, but don't worry - I'll teach you everything you need to know.
      Let's start with the basics: preparing your first field."`,

      mainCharacter: 'GRANDPA_JACK',
      supportingCharacters: [],

      dialogues: [
        {
          id: 'd1',
          trigger: 'start',
          character: 'GRANDPA_JACK',
          text: "Welcome home! I've been waiting for you. This farm... it's seen better days, hasn't it?",
          emotion: 'nostalgic',
        },
        {
          id: 'd2',
          trigger: 'start',
          character: 'GRANDPA_JACK',
          text: "Your grandmother and I built this place from nothing. Every crop, every harvest - we poured our hearts into it.",
          emotion: 'nostalgic',
        },
        {
          id: 'd3',
          trigger: 'start',
          character: 'GRANDPA_JACK',
          text: "But I'm getting old, and the work... well, it's too much for these bones. That's where you come in!",
          emotion: 'hopeful',
        },
        {
          id: 'd4',
          trigger: 'start',
          character: 'GRANDPA_JACK',
          text: "See that field over there? That's where my father taught me to farm. Now it's your turn to learn.",
          emotion: 'teaching',
        },
        {
          id: 'd5',
          trigger: 'start',
          character: 'GRANDPA_JACK',
          text: "Farming isn't just about throwing seeds in the ground. It's about understanding the land, the weather, the seasons...",
          emotion: 'wise',
        },
        {
          id: 'd6',
          trigger: 'obj1_start',
          character: 'GRANDPA_JACK',
          text: "Come closer, let me tell you about this farm's history. Every field has a story.",
          emotion: 'teaching',
        },
        {
          id: 'd7',
          trigger: 'obj1_progress',
          character: 'GRANDPA_JACK',
          text: "You know, your father used to play in that field when he was your age. Time flies...",
          emotion: 'nostalgic',
        },
        {
          id: 'd8',
          trigger: 'obj1_complete',
          character: 'GRANDPA_JACK',
          text: "Good! I can see you're a good listener. That's the first step to being a good farmer.",
          emotion: 'proud',
        },
        {
          id: 'd9',
          trigger: 'obj1_complete',
          character: 'GRANDPA_JACK',
          text: "Now, let's talk about fields. Each one is different - different soil, different drainage, different sunlight.",
          emotion: 'teaching',
        },
        {
          id: 'd10',
          trigger: 'obj2_start',
          character: 'GRANDPA_JACK',
          text: "Field #1 is our best plot. It's got good drainage and the soil is rich. Perfect for a beginner like you!",
          emotion: 'encouraging',
        },
        {
          id: 'd11',
          trigger: 'obj2_start',
          character: 'GRANDPA_JACK',
          text: "My grandfather always said: 'The right field can make or break your harvest.' Choose wisely!",
          emotion: 'wise',
        },
        {
          id: 'd12',
          trigger: 'obj2_complete',
          character: 'GRANDPA_JACK',
          text: "Excellent choice! Field #1 has never let us down. Now comes the fun part - choosing what to plant!",
          emotion: 'excited',
        },
        {
          id: 'd13',
          trigger: 'obj3_start',
          character: 'GRANDPA_JACK',
          text: "For your first crop, I recommend wheat. It's forgiving, grows well in our climate, and the market always needs it.",
          emotion: 'advising',
        },
        {
          id: 'd14',
          trigger: 'obj3_start',
          character: 'GRANDPA_JACK',
          text: "Corn is tempting - higher profit - but it's trickier. Save that for when you've got some experience.",
          emotion: 'cautious',
        },
        {
          id: 'd15',
          trigger: 'obj3_start',
          character: 'GRANDPA_JACK',
          text: "And soybeans? Good crop, but they're very particular about soil nitrogen. Let's stick with wheat for now.",
          emotion: 'teaching',
        },
        {
          id: 'd16',
          trigger: 'obj3_complete',
          character: 'GRANDPA_JACK',
          text: "Wheat! Smart choice. You've got farming blood in you, I can tell!",
          emotion: 'proud',
        },
        {
          id: 'd17',
          trigger: 'obj3_complete',
          character: 'GRANDPA_JACK',
          text: "Your grandmother loved wheat. She used to bake the best bread from our harvests. Maybe you will too someday.",
          emotion: 'nostalgic',
        },
        {
          id: 'd18',
          trigger: 'obj4_start',
          character: 'GRANDPA_JACK',
          text: "Alright, time to get your hands dirty! Planting is both an art and a science.",
          emotion: 'teaching',
        },
        {
          id: 'd19',
          trigger: 'obj4_start',
          character: 'GRANDPA_JACK',
          text: "Spacing matters - too close and they compete for nutrients, too far and you waste space.",
          emotion: 'instructing',
        },
        {
          id: 'd20',
          trigger: 'obj4_start',
          character: 'GRANDPA_JACK',
          text: "Depth matters too. Plant wheat seeds about 2-3 cm deep. Not too shallow, not too deep.",
          emotion: 'instructing',
        },
        {
          id: 'd21',
          trigger: 'obj4_complete',
          character: 'GRANDPA_JACK',
          text: "Perfect! Look at that - your first crop planted. I'm so proud of you!",
          emotion: 'proud',
        },
        {
          id: 'd22',
          trigger: 'complete',
          character: 'GRANDPA_JACK',
          text: "You did it! Your first field is planted. In a few months, we'll see golden wheat swaying in the breeze.",
          emotion: 'happy',
        },
        {
          id: 'd23',
          trigger: 'complete',
          character: 'GRANDPA_JACK',
          text: "Tomorrow, we'll talk about soil. Understanding your soil is everything in farming.",
          emotion: 'teaching',
        },
        {
          id: 'd24',
          trigger: 'complete',
          character: 'GRANDPA_JACK',
          text: "For now, get some rest. You've earned it. Welcome to the family business!",
          emotion: 'proud',
        },
      ],
    },

    // Game objectives
    objectives: [
      {
        id: 'obj1',
        text: 'Talk to Grandpa Jack at the farm entrance',
        type: 'dialogue',
        character: 'GRANDPA_JACK',
        completed: false,
      },
      {
        id: 'obj2',
        text: 'Select Field #1 for your first crop',
        type: 'action',
        hint: 'Tap on the first field in the farm grid',
        completed: false,
      },
      {
        id: 'obj3',
        text: 'Choose wheat as your starter crop',
        type: 'choice',
        options: ['wheat', 'corn', 'soy'],
        correctChoice: 'wheat',
        completed: false,
      },
      {
        id: 'obj4',
        text: 'Plant your first seeds',
        type: 'action',
        completed: false,
      },
    ],

    // Rewards
    rewards: {
      xp: 100,
      coins: 50,
      items: ['Basic Watering Can'],
      badges: ['First Harvest Badge'],
      unlocks: ['Tutorial: Soil Basics'],
    },

    // Requirements
    unlockRequirements: {
      previousMissions: [],
      xpRequired: 0,
      level: 1,
    },

    // Meta information
    difficulty: 'beginner',
    estimatedTime: '10-15 min',
    realWorldSkill: 'Farm Planning & Crop Selection',
    nasaDataUsed: [],
    category: 'getting_started',
  },

  {
    id: 'm1_2',
    chapterNumber: 1,
    missionNumber: 2,
    title: "Understanding Your Soil",
    subtitle: "The Foundation of Farming",

    story: {
      intro: `Grandpa Jack invites you to the barn at sunrise.
      "The secret to good farming isn't in the seeds - it's in the soil!" he explains,
      showing you soil samples from different parts of the farm.
      "Let me teach you what my grandfather taught me."`,

      mainCharacter: 'GRANDPA_JACK',
      supportingCharacters: ['SARAH_TECH'],

      cutscenes: [
        {
          trigger: 'start',
          character: 'GRANDPA_JACK',
          dialogue: "Feel this soil. See how it crumbles? That tells us about its texture and health.",
          emotion: 'teaching',
        },
        {
          trigger: 'meet_sarah',
          character: 'SARAH_TECH',
          dialogue: "Hi! I'm Sarah. Grandpa Jack asked me to show you how we can use technology to test soil too!",
          emotion: 'enthusiastic',
        },
        {
          trigger: 'complete',
          character: 'GRANDPA_JACK',
          dialogue: "Perfect! You understand both the traditional way and the modern way. That's the key to success.",
          emotion: 'proud',
        },
      ],
    },

    objectives: [
      {
        id: 'obj1',
        text: 'Meet Grandpa Jack at the barn',
        type: 'dialogue',
        character: 'GRANDPA_JACK',
        completed: false,
      },
      {
        id: 'obj2',
        text: 'Learn about soil texture (clay, silt, sand)',
        type: 'tutorial',
        completed: false,
      },
      {
        id: 'obj3',
        text: 'Meet Sarah Chen, the ag-tech specialist',
        type: 'dialogue',
        character: 'SARAH_TECH',
        completed: false,
      },
      {
        id: 'obj4',
        text: 'Test soil pH in 3 different locations',
        type: 'action',
        target: 3,
        completed: false,
      },
      {
        id: 'obj5',
        text: 'Match crops to soil types (Quiz)',
        type: 'quiz',
        questions: 3,
        passingScore: 2,
        completed: false,
      },
    ],

    rewards: {
      xp: 150,
      coins: 75,
      items: ['Soil Testing Kit', 'pH Meter'],
      badges: ['Soil Expert'],
      unlocks: ['Soil Health Dashboard'],
    },

    unlockRequirements: {
      previousMissions: ['m1_1'],
      xpRequired: 100,
      level: 1,
    },

    difficulty: 'beginner',
    estimatedTime: '15-20 min',
    realWorldSkill: 'Soil Analysis & Testing',
    nasaDataUsed: [],
    category: 'soil_management',
  },

  // ===== CHAPTER 2: WATER WISDOM =====
  {
    id: 'm2_1',
    chapterNumber: 2,
    missionNumber: 1,
    title: "The Drought Challenge",
    subtitle: "Learning Water Management",

    story: {
      intro: `It's been two weeks without rain. Your wheat is showing signs of stress.
      Sarah rushes to the farm with her laptop. "I've been monitoring soil moisture using NASA's SMAP satellite!"
      she exclaims. "Let me show you how to use this data to save your crops!"`,

      mainCharacter: 'SARAH_TECH',
      supportingCharacters: ['GRANDPA_JACK', 'DR_GREEN'],

      cutscenes: [
        {
          trigger: 'start',
          character: 'SARAH_TECH',
          dialogue: "Look at this! NASA's satellites can see moisture levels in your soil from space. Cool, right?",
          emotion: 'excited',
        },
        {
          trigger: 'crisis',
          character: 'GRANDPA_JACK',
          dialogue: "In 1988, we had a drought like this. Lost half the crop. But with your technology, we can do better!",
          emotion: 'concerned_hopeful',
        },
        {
          trigger: 'meet_dr_green',
          character: 'DR_GREEN',
          dialogue: "Hi! I study water conservation. Let me help you create an irrigation plan that saves water.",
          emotion: 'professional',
        },
        {
          trigger: 'complete',
          character: 'SARAH_TECH',
          dialogue: "You did it! You saved the crops by using data smartly. This is the future of farming!",
          emotion: 'celebrating',
        },
      ],
    },

    objectives: [
      {
        id: 'obj1',
        text: 'Notice your wheat field showing stress indicators',
        type: 'observation',
        completed: false,
      },
      {
        id: 'obj2',
        text: 'Access NASA SMAP soil moisture data',
        type: 'action',
        hint: 'Open the satellite data panel',
        completed: false,
      },
      {
        id: 'obj3',
        text: 'Identify dry zones in your fields (moisture < 30%)',
        type: 'analysis',
        target: '3 zones',
        completed: false,
      },
      {
        id: 'obj4',
        text: 'Meet Dr. Emily Green for irrigation advice',
        type: 'dialogue',
        character: 'DR_GREEN',
        completed: false,
      },
      {
        id: 'obj5',
        text: 'Create an efficient irrigation schedule',
        type: 'planning',
        completed: false,
      },
      {
        id: 'obj6',
        text: 'Water the critical areas before 8 AM',
        type: 'action',
        timeLimit: '8:00 AM',
        completed: false,
      },
    ],

    rewards: {
      xp: 250,
      coins: 150,
      items: ['Drip Irrigation System', 'Moisture Sensors'],
      badges: ['Water Wise', 'Crisis Manager'],
      unlocks: ['SMAP Satellite View', 'Irrigation Automation'],
    },

    unlockRequirements: {
      previousMissions: ['m1_3'],
      xpRequired: 450,
      level: 2,
    },

    difficulty: 'intermediate',
    estimatedTime: '25-30 min',
    realWorldSkill: 'Precision Irrigation & Satellite Data Analysis',
    nasaDataUsed: ['SMAP'],
    category: 'water_management',
    crisis: true, // Time-sensitive mission
  },

  // ===== CHAPTER 4: MARKET SUCCESS =====
  {
    id: 'm4_1',
    chapterNumber: 4,
    missionNumber: 1,
    title: "The Harvest Festival",
    subtitle: "Your First Big Sale",

    story: {
      intro: `The annual Green Valley Harvest Festival is in two weeks!
      Marcus Rodriguez, a former commodity trader, approaches you.
      "I heard you've got some quality crops," he says. "Let me help you get the best price.
      But timing is everything in this business!"`,

      mainCharacter: 'MARCUS_TRADER',
      supportingCharacters: ['ANNA_NEIGHBOR', 'GRANDPA_JACK'],

      cutscenes: [
        {
          trigger: 'start',
          character: 'MARCUS_TRADER',
          dialogue: "The festival is when prices peak, but you need perfect crops. Let's get strategic!",
          emotion: 'professional',
        },
        {
          trigger: 'meet_competitor',
          character: 'ANNA_NEIGHBOR',
          dialogue: "Hey neighbor! May the best farmer win at the festival. I've got some prize-winning wheat myself!",
          emotion: 'competitive_friendly',
        },
        {
          trigger: 'market_decision',
          character: 'MARCUS_TRADER',
          dialogue: "Wheat prices are rising! Do you want to sell now or wait for festival premium prices?",
          emotion: 'strategic',
        },
        {
          trigger: 'complete',
          character: 'GRANDPA_JACK',
          dialogue: "I'm so proud! You got top dollar for your harvest. Your grandmother would be beaming!",
          emotion: 'emotional_proud',
        },
      ],
    },

    objectives: [
      {
        id: 'obj1',
        text: 'Meet Marcus Rodriguez at the market',
        type: 'dialogue',
        character: 'MARCUS_TRADER',
        completed: false,
      },
      {
        id: 'obj2',
        text: 'Check crop maturity and quality indicators',
        type: 'analysis',
        hint: 'Use MODIS NDVI data to assess crop health',
        completed: false,
      },
      {
        id: 'obj3',
        text: 'Decide optimal harvest timing',
        type: 'decision',
        options: ['Harvest now', 'Wait 3 days', 'Wait for festival'],
        factors: ['Weather forecast', 'Market prices', 'Crop maturity'],
        completed: false,
      },
      {
        id: 'obj4',
        text: 'Monitor weather for harvest window',
        type: 'tracking',
        useData: 'IMERG',
        completed: false,
      },
      {
        id: 'obj5',
        text: 'Execute harvest during perfect conditions',
        type: 'action',
        conditions: ['No rain', 'Low humidity', 'Crop 100% mature'],
        completed: false,
      },
      {
        id: 'obj6',
        text: 'Negotiate best price at festival',
        type: 'minigame',
        game: 'market_negotiation',
        completed: false,
      },
    ],

    rewards: {
      xp: 400,
      coins: 300,
      items: ['Market Analysis Tool', 'Quality Grade Certificate'],
      badges: ['Harvest Master', 'Market Champion', 'Festival Winner'],
      unlocks: ['Commodity Trading Dashboard', 'Price Prediction AI'],
    },

    unlockRequirements: {
      previousMissions: ['m3_4'],
      xpRequired: 3250,
      level: 4,
    },

    difficulty: 'intermediate',
    estimatedTime: '35-40 min',
    realWorldSkill: 'Harvest Timing & Market Strategy',
    nasaDataUsed: ['MODIS', 'IMERG'],
    category: 'business',
    competition: true, // Compete with Anna
    milestone: true, // Major story milestone
  },
];

// Mission categories for filtering
export const MISSION_CATEGORIES = {
  getting_started: { icon: '🌱', color: '#90EE90' },
  soil_management: { icon: '🌍', color: '#8B4513' },
  water_management: { icon: '💧', color: '#4169E1' },
  crop_health: { icon: '🌾', color: '#FFD700' },
  business: { icon: '💰', color: '#2E8B57' },
  sustainability: { icon: '♻️', color: '#228B22' },
  technology: { icon: '📡', color: '#4682B4' },
};

// Dynamic events that can occur during missions
export const MISSION_EVENTS = {
  sudden_rain: {
    type: 'weather',
    impact: 'positive/negative depending on situation',
    dialogue: {
      GRANDPA_JACK: "Quick! Rain's coming. This could help or hurt us depending on timing!",
    },
  },
  equipment_breakdown: {
    type: 'technical',
    impact: 'negative',
    dialogue: {
      MIKE_MECHANIC: "Your tractor's acting up. Let me take a look...",
    },
  },
  helpful_neighbor: {
    type: 'social',
    impact: 'positive',
    dialogue: {
      ANNA_NEIGHBOR: "Need a hand? I've got some spare time today!",
    },
  },
  market_surge: {
    type: 'economic',
    impact: 'positive',
    dialogue: {
      MARCUS_TRADER: "Great news! Wheat prices just jumped 20%!",
    },
  },
};

export default ENHANCED_MISSIONS;
