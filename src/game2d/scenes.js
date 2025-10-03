const TILE_LIBRARY = {
  barn: { type: 'barn', color: '#8D6E63', icon: 'B', label: 'Barn' },
  silo: { type: 'silo', color: '#CFD8DC', icon: 'S', label: 'Silo' },
  path: { type: 'path', color: '#E5E7EB', icon: '.', label: 'Path' },
  field: { type: 'field', color: '#A5D6A7', icon: 'F', label: 'Field' },
  greenhouse: { type: 'greenhouse', color: '#81C784', icon: 'G', label: 'Greenhouse' },
  orchard: { type: 'orchard', color: '#FFB74D', icon: 'O', label: 'Orchard' },
  river: { type: 'river', color: '#4FC3F7', icon: '~', label: 'River' },
  lab: { type: 'lab', color: '#90CAF9', icon: 'L', label: 'Lab' },
  pasture: { type: 'pasture', color: '#C5E1A5', icon: 'P', label: 'Pasture' },
  market: { type: 'market', color: '#FFD54F', icon: 'M', label: 'Marketplace' },
  village: { type: 'village', color: '#B0BEC5', icon: 'H', label: 'Homestead' },
  tower: { type: 'tower', color: '#A5B4FC', icon: 'T', label: 'Comms Tower' },
};

const BASE_GRID = [
  ['barn', 'path', 'field', 'field', 'orchard', 'river'],
  ['silo', 'path', 'field', 'greenhouse', 'orchard', 'river'],
  ['village', 'path', 'field', 'field', 'lab', 'river'],
  ['village', 'path', 'field', 'field', 'lab', 'river'],
  ['market', 'path', 'pasture', 'pasture', 'tower', 'river'],
  ['market', 'path', 'pasture', 'pasture', 'tower', 'river'],
];

const COMMUNITY_ROUTES = new Set([
  'CreatePost',
  'ShareKnowledge',
  'Connections',
  'Experts',
  'Groups',
  'Discussion',
  'SuccessStory',
]);

const LEARNING_ROUTES = new Set([
  'Tutorial',
  'Quiz',
  'QuizResults',
  'CampaignMode',
  'CampaignLevel1',
]);

const PROFILE_ROUTES = new Set([
  'ProfileSetup',
  'Profile',
  'LearningProgress',
  'UnlockedFeature',
  'Achievements',
]);

const AI_ROUTES = new Set([
  'AITutor',
  'Recommendations',
  'PersonalAdvice',
  'DiseaseDetection',
]);

const OPERATIONS_ROUTES = new Set([
  'SmartTasks',
  'IoTMonitor',
  'SandboxMode',
  'CropManagement',
  'ImpactDashboard',
]);

const SCENE_DETAILS = {
  Dashboard: {
    title: 'Operations Hub',
    subtitle: 'Coordinate every system from the central barn.',
    highlightZones: [
      [0, 0],
      [0, 1],
      [1, 0],
    ],
    tasks: [
      { label: 'Review overnight sensor summaries', detail: 'Check energy, water, and soil indices.' },
      { label: 'Assign crews to pending harvest tasks', detail: 'Balance automation with manual labor.' },
      { label: 'Inspect weather-driven alerts', detail: 'Queue mitigations before daybreak.' },
    ],
    narrative: 'A quiet sunrise finds the operations wall filled with new alerts. Set the tone for the day by lining up jobs and resources.',
    metricFocus: ['water', 'energy', 'credits'],
  },
  FarmConfig: {
    title: 'Plot Planner',
    subtitle: 'Design crop rotations and equipment coverage.',
    highlightZones: [
      [0, 2],
      [0, 3],
      [1, 2],
    ],
    tasks: [
      { label: 'Balance soil nutrients across plots', detail: 'Rotate legume and cereal coverage to boost soil health.' },
      { label: 'Allocate irrigation schedules', detail: 'Match water debt to available capacity.' },
      { label: 'Confirm crew assignments', detail: 'Ensure tasks align with weather windows.' },
    ],
    narrative: 'The layout board shows tomorrow’s planting plan. Adjust spacing, irrigation, and labor to match the forecast.',
    metricFocus: ['soilHealth'],
  },
  LocationSelection: {
    title: 'Survey Tower',
    subtitle: 'Evaluate regions before launching operations.',
    highlightZones: [
      [4, 4],
      [5, 4],
      [5, 5],
    ],
    tasks: [
      { label: 'Compare climate bands', detail: 'Match crop preferences with rainfall and temperature.' },
      { label: 'Check logistics routes', detail: 'Ensure access roads and market links are viable.' },
      { label: 'Assess risk factors', detail: 'Map disease history and pest prevalence.' },
    ],
    narrative: 'From the tower you can see every valley. Pick the launch site that balances reward and resilience.',
    metricFocus: ['water', 'soilHealth'],
  },
  Game: {
    title: 'Live Farm Simulation',
    subtitle: 'Guide workers and automation in real time.',
    highlightZones: [
      [2, 2],
      [2, 3],
      [3, 2],
      [3, 3],
    ],
    tasks: [
      { label: 'Deploy drones to ready plots', detail: 'Prioritise the healthiest rows for automated harvest.' },
      { label: 'Balance energy draw', detail: 'Keep batteries above 40% to avoid downtime.' },
      { label: 'Update livestock feed routes', detail: 'Prevent bottlenecks in pasture zones.' },
    ],
    narrative: 'Field hands and bots await guidance. Keep throughput high without exhausting reserves.',
  },
  CampaignMode: {
    title: 'Campaign Mission Control',
    subtitle: 'Advance story-driven objectives across the farm.',
    highlightZones: [
      [0, 1],
      [1, 1],
      [2, 1],
    ],
    tasks: [
      { label: 'Brief the team on mission goals', detail: 'Align resource targets with narrative milestones.' },
      { label: 'Stage assets along the farm road', detail: 'Position tools for upcoming challenges.' },
      { label: 'Validate success criteria', detail: 'Confirm win conditions before entering the field.' },
    ],
    narrative: 'The campaign board lights up with new directives from HQ. Coordinate the rollout to hit every checkpoint.',
  },
  SandboxMode: {
    title: 'Innovation Sandbox',
    subtitle: 'Experiment freely with automation loadouts.',
    highlightZones: [
      [4, 2],
      [4, 3],
      [5, 2],
    ],
    tasks: [
      { label: 'Prototype new crop sequences', detail: 'Model yield impact before committing real acres.' },
      { label: 'Stress-test IoT orchestration', detail: 'Push automation schedules beyond normal thresholds.' },
      { label: 'Capture lessons learned', detail: 'Log configurations that boost efficiency.' },
    ],
    narrative: 'In the sandbox you can bend the rules. Test bold strategies before carrying them to production fields.',
  },
  CropManagement: {
    title: 'Crop Cycle Control',
    subtitle: 'Manage tilling, planting, irrigation, and harvest cadence.',
    highlightZones: [
      [2, 2],
      [2, 3],
      [3, 2],
    ],
    tasks: [
      { label: 'Prep fallow plots', detail: 'Till soil that is resting and top-up moisture.' },
      { label: 'Plant seasonal crops', detail: 'Match crop selection with the current market price.' },
      { label: 'Harvest and sell', detail: 'Collect matured crops and convert them into revenue.' },
    ],
    narrative: 'The crop board tracks every plot. Keep the loop flowing from till to market without draining resources.',
    metricFocus: ['soilHealth', 'water', 'credits'],
  },
  Tutorial: {
    title: 'Orientation Trail',
    subtitle: 'Walk new farmers through key interactions.',
    highlightZones: [
      [1, 1],
      [2, 1],
    ],
    tasks: [
      { label: 'Teach input basics', detail: 'Cover camera, gallery, and navigation gestures.' },
      { label: 'Explain resource gauges', detail: 'Demonstrate how energy and soil metrics shift.' },
      { label: 'Preview automation options', detail: 'Show how to dispatch bots on simple tasks.' },
    ],
    narrative: 'The tutorial grove is calm but informative. Guide trainees along the path to mastery.',
  },
  Quiz: {
    title: 'Knowledge Challenge',
    subtitle: 'Evaluate retention with quick-fire questions.',
    highlightZones: [
      [2, 0],
      [2, 1],
    ],
    tasks: [
      { label: 'Stage quiz content', detail: 'Load scenario-based questions for the cohort.' },
      { label: 'Monitor engagement', detail: 'Track completion and difficulty spikes.' },
      { label: 'Deliver real-time feedback', detail: 'Celebrate accuracy and coach weak spots.' },
    ],
    narrative: 'The learning lodge hosts today’s quiz. Keep morale high while challenging core skills.',
  },
  QuizResults: {
    title: 'Debrief Pavilion',
    subtitle: 'Turn scores into actionable coaching.',
    highlightZones: [
      [4, 0],
      [5, 0],
    ],
    tasks: [
      { label: 'Summarise results', detail: 'Highlight top strengths and gaps.' },
      { label: 'Offer remediation paths', detail: 'Cue relevant lessons for tough topics.' },
      { label: 'Log cohort history', detail: 'Store results in the knowledge base.' },
    ],
    narrative: 'Celebrate wins and focus the team. Everyone leaves the pavilion with a targeted action plan.',
  },
  ProfileSetup: {
    title: 'Homestead Intake',
    subtitle: 'Capture farmer profile details and goals.',
    highlightZones: [
      [2, 0],
      [3, 0],
    ],
    tasks: [
      { label: 'Confirm identity details', detail: 'Make sure names and regions are correct.' },
      { label: 'Document farm objectives', detail: 'Record crop focus and sustainability goals.' },
      { label: 'Calibrate tutorial path', detail: 'Suggest a learning track that fits experience.' },
    ],
    narrative: 'The homestead porch is where every farmer begins. Capture their story and set expectations.',
  },
  Profile: {
    title: 'Farmer Profile',
    subtitle: 'Summarise achievements and active boosts.',
    highlightZones: [
      [2, 0],
      [3, 0],
    ],
    tasks: [
      { label: 'Review progress badges', detail: 'Celebrate milestones unlocked this season.' },
      { label: 'Adjust personal goals', detail: 'Align metrics with current campaign focus.' },
      { label: 'Sync preferences', detail: 'Ensure notifications and advice meet needs.' },
    ],
    narrative: 'The farmhouse office showcases growth. Give farmers tangible proof of their progress.',
    metricFocus: ['research'],
  },
  LearningProgress: {
    title: 'Learning Archive',
    subtitle: 'Track lesson completion and mastery streaks.',
    highlightZones: [
      [2, 0],
      [2, 1],
    ],
    tasks: [
      { label: 'Analyse streak health', detail: 'Support learners before they fall behind.' },
      { label: 'Recommend refreshers', detail: 'Queue short lessons for weak modules.' },
      { label: 'Celebrate mastery badges', detail: 'Share wins with peers and mentors.' },
    ],
    narrative: 'Charts, notes, and feedback fill the archive. Keep curiosity alive with personalised nudges.',
  },
  UnlockedFeature: {
    title: 'Innovation Showcase',
    subtitle: 'Highlight new mechanics that just unlocked.',
    highlightZones: [
      [4, 3],
      [4, 4],
    ],
    tasks: [
      { label: 'Explain feature impact', detail: 'Clarify what changes on the farm today.' },
      { label: 'Offer guided trial', detail: 'Provide a safe mini scenario to explore the feature.' },
      { label: 'Collect first impressions', detail: 'Log immediate feedback for iteration.' },
    ],
    narrative: 'Spotlights flicker in the innovation bay. Inspire excitement about new capabilities.',
  },
  Achievements: {
    title: 'Hall of Growth',
    subtitle: 'Display badges, trophies, and milestones.',
    highlightZones: [
      [4, 0],
      [4, 1],
    ],
    tasks: [
      { label: 'Arrange newest accolades', detail: 'Place the latest trophies in the exhibit.' },
      { label: 'Identify upcoming goals', detail: 'Suggest what achievement to chase next.' },
      { label: 'Share stories with peers', detail: 'Promote community recognition moments.' },
    ],
    narrative: 'The hall gleams with past accomplishments. Keep the momentum rolling toward the next badge.',
  },
  AITutor: {
    title: 'Advisor Lab',
    subtitle: 'Surface contextual coaching across systems.',
    highlightZones: [
      [2, 4],
      [3, 4],
      [3, 5],
    ],
    tasks: [
      { label: 'Ingest latest farm logs', detail: 'Feed the tutor context on recent events.' },
      { label: 'Draft proactive nudges', detail: 'Prepare suggestions for upcoming work.' },
      { label: 'Monitor response quality', detail: 'Keep guidance relevant and trustworthy.' },
    ],
    narrative: 'Screens and projections hum in the lab. Turn current telemetry into precise coaching.',
    metricFocus: ['research'],
  },
  SmartTasks: {
    title: 'Automation Deck',
    subtitle: 'Manage queued jobs and autonomous crews.',
    highlightZones: [
      [4, 4],
      [5, 4],
    ],
    tasks: [
      { label: 'Optimise task queue', detail: 'Prioritise jobs with highest yield impact.' },
      { label: 'Balance worker load', detail: 'Avoid fatigue across human and robotic teams.' },
      { label: 'Validate safety protocols', detail: 'Double-check automation for hazards.' },
    ],
    narrative: 'The deck buzzes with dispatch updates. Keep the queue flowing without overloading systems.',
    metricFocus: ['energy'],
  },
  ImpactDashboard: {
    title: 'Impact Lab',
    subtitle: 'Consolidate yield, water, cost, and environmental KPIs.',
    highlightZones: [
      [2, 3],
      [3, 3],
      [4, 3],
    ],
    tasks: [
      { label: 'Capture new metrics', detail: 'Log yield, water, cost, and environmental indicators.' },
      { label: 'Generate impact reports', detail: 'Compile improvements into shareable formats.' },
      { label: 'Submit for verification', detail: 'Send evidence to officers for validation.' },
    ],
    narrative: 'Analysts huddle around the impact dashboard—keep metrics fresh to prove farm progress.',
    metricFocus: ['credits', 'water', 'research'],
  },
  CampaignLevel1: {
    title: 'First Harvest Grounds',
    subtitle: 'Stage the launch scenario for campaign success.',
    highlightZones: [
      [3, 2],
      [3, 3],
    ],
    tasks: [
      { label: 'Brief harvest teams', detail: 'Rehearse the plan before the level begins.' },
      { label: 'Stock treatment kits', detail: 'Prepare for potential disease flare-ups.' },
      { label: 'Check morale boosts', detail: 'Enable perks that support rookie teams.' },
    ],
    narrative: 'The first campaign field awaits. Success earns trust and unlocks bigger missions.',
  },
  Campaign3D: {
    title: 'Immersive Ops Room',
    subtitle: 'Blend 3D insights with 2D oversight.',
    highlightZones: [
      [3, 2],
      [3, 3],
      [4, 3],
    ],
    tasks: [
      { label: 'Sync Unity telemetry', detail: 'Pull real-time states back into the 2D command view.' },
      { label: 'Adjust camera tours', detail: 'Set highlight paths for key stakeholders.' },
      { label: 'Validate cross-mode actions', detail: 'Ensure 2D actions reflect inside the 3D sim.' },
    ],
    narrative: 'Holographic overlays link the 3D and 2D layers. Keep both worlds aligned.',
  },
  IoTMonitor: {
    title: 'Sensor Ridge',
    subtitle: 'Audit device health and data fidelity.',
    highlightZones: [
      [4, 4],
      [5, 4],
      [5, 5],
    ],
    tasks: [
      { label: 'Ping offline devices', detail: 'Restore coverage gaps before the next cycle.' },
      { label: 'Validate data streams', detail: 'Flag anomalies and drift early.' },
      { label: 'Schedule maintenance crew', detail: 'Dispatch technicians to failing nodes.' },
    ],
    narrative: 'The tower blinks with telemetry. A healthy sensor mesh keeps every prediction accurate.',
  },
  DiseaseDetection: {
    title: 'Diagnostics Lab',
    subtitle: 'Inspect samples and confirm outbreaks quickly.',
    highlightZones: [
      [2, 4],
      [2, 5],
      [3, 4],
    ],
    tasks: [
      { label: 'Run smoke test on the model', detail: 'Confirm inference pipeline stays warm.' },
      { label: 'Analyse latest leaf sample', detail: 'Compare patterns with historic cases.' },
      { label: 'Publish treatment plan', detail: 'Update the field team on containment steps.' },
    ],
    narrative: 'Petri dishes glow under the scanners. Keep turnaround times tight to minimise crop loss.',
    metricFocus: ['research', 'soilHealth'],
  },
  Recommendations: {
    title: 'Decision Studio',
    subtitle: 'Rank actions using AI-generated insight.',
    highlightZones: [
      [1, 3],
      [1, 4],
    ],
    tasks: [
      { label: 'Score opportunity cost', detail: 'Balance short-term gains vs long-term resilience.' },
      { label: 'Publish top recommendations', detail: 'Share structured plans with the crew.' },
      { label: 'Track adoption impact', detail: 'Measure how suggestions boost KPIs.' },
    ],
    narrative: 'The studio hums with models and dashboards. Translate predictions into crisp guidance.',
  },
  PersonalAdvice: {
    title: 'Mentor Corner',
    subtitle: 'Tailor coaching to farmer context.',
    highlightZones: [
      [2, 0],
      [2, 1],
    ],
    tasks: [
      { label: 'Review farmer history', detail: 'Personalise suggestions to real constraints.' },
      { label: 'Draft action cards', detail: 'Keep steps simple, visual, and timed.' },
      { label: 'Collect follow-up feedback', detail: 'Close the loop on advice effectiveness.' },
    ],
    narrative: 'Community mentors gather at the corner table. Pair empathy with data-driven support.',
  },
  CreatePost: {
    title: 'Community Bulletin',
    subtitle: 'Broadcast updates to fellow farmers.',
    highlightZones: [
      [4, 0],
      [4, 1],
    ],
    tasks: [
      { label: 'Draft the headline', detail: 'Hook readers with a concise summary.' },
      { label: 'Attach supporting visuals', detail: 'Use before/after shots or charts.' },
      { label: 'Tag relevant groups', detail: 'Reach the people who need this update.' },
    ],
    narrative: 'The marketplace square becomes a vibrant bulletin board. Share your story and learn from others.',
  },
  ShareKnowledge: {
    title: 'Knowledge Barn',
    subtitle: 'Upload guides, datasets, and case studies.',
    highlightZones: [
      [3, 0],
      [3, 1],
    ],
    tasks: [
      { label: 'Prepare learning assets', detail: 'Bundle visuals with clear step lists.' },
      { label: 'Assign metadata', detail: 'Tag region, crop, and difficulty for search.' },
      { label: 'Publish to the library', detail: 'Notify learners who opted into updates.' },
    ],
    narrative: 'Shelves of manuals and tablets line the knowledge barn. Curate resources that empower the community.',
  },
  Connections: {
    title: 'Networking Plaza',
    subtitle: 'Find collaborators and mentors.',
    highlightZones: [
      [4, 0],
      [4, 1],
      [4, 2],
    ],
    tasks: [
      { label: 'Matchmake peers', detail: 'Pair farmers tackling similar challenges.' },
      { label: 'Spot expert availability', detail: 'Schedule office hours with specialists.' },
      { label: 'Foster collaboration threads', detail: 'Encourage shared experiments and reports.' },
    ],
    narrative: 'Lamps and kiosks illuminate the plaza. Connections spark collective intelligence.',
  },
  Experts: {
    title: 'Advisor Pavilion',
    subtitle: 'Route questions to subject-matter experts.',
    highlightZones: [
      [2, 4],
      [3, 4],
    ],
    tasks: [
      { label: 'Queue incoming cases', detail: 'Triage field requests by urgency.' },
      { label: 'Assign expert responders', detail: 'Match questions with the right expertise.' },
      { label: 'Capture resolutions', detail: 'Log solutions for future self-serve use.' },
    ],
    narrative: 'Specialists gather around the diagnostics wing. Keep the advice loop fast and reliable.',
  },
  Groups: {
    title: 'Guild Commons',
    subtitle: 'Organise topic-based collaboration spaces.',
    highlightZones: [
      [4, 0],
      [4, 1],
      [5, 0],
    ],
    tasks: [
      { label: 'Moderate discussions', detail: 'Ensure threads stay constructive.' },
      { label: 'Curate group resources', detail: 'Pin reference material for quick access.' },
      { label: 'Plan community events', detail: 'Schedule meetups and workshops.' },
    ],
    narrative: 'Lively conversations echo through the commons. Give every group a sense of home.',
  },
  Discussion: {
    title: 'Town Hall Thread',
    subtitle: 'Dive deep into a focused conversation.',
    highlightZones: [
      [4, 0],
      [4, 1],
    ],
    tasks: [
      { label: 'Elevate key replies', detail: 'Surface answers that solve the question.' },
      { label: 'Guide tone and norms', detail: 'Keep the discussion inclusive and respectful.' },
      { label: 'Summarise takeaways', detail: 'Capture insights for asynchronous learners.' },
    ],
    narrative: 'Voices gather in a circle at the town hall. Shape the dialogue to deliver insight.',
  },
  SuccessStory: {
    title: 'Celebration Stage',
    subtitle: 'Share wins backed by data and visuals.',
    highlightZones: [
      [0, 4],
      [1, 4],
    ],
    tasks: [
      { label: 'Assemble impact metrics', detail: 'Chart before-and-after yield or savings.' },
      { label: 'Capture rich media', detail: 'Include photos, audio, or short clips.' },
      { label: 'Invite community feedback', detail: 'Encourage others to apply the lessons.' },
    ],
    narrative: 'Lights shine on the stage. Inspire the network with authentic success.',
  },
  AdminUsers: {
    title: 'Admin Ops Center',
    subtitle: 'Provision accounts and roles securely.',
    highlightZones: [
      [1, 0],
      [1, 1],
    ],
    tasks: [
      { label: 'Review pending access requests', detail: 'Vet identity and purpose before approval.' },
      { label: 'Audit role assignments', detail: 'Keep least-privilege policies intact.' },
      { label: 'Document changes', detail: 'Log the who, what, and why for compliance.' },
    ],
    narrative: 'Clipboards and terminals fill the admin wing. Safeguard the platform while supporting teams.',
    metricFocus: ['credits'],
  },
  AdminSettings: {
    title: 'Configuration Vault',
    subtitle: 'Tune feature flags, thresholds, and regions.',
    highlightZones: [
      [4, 4],
      [5, 4],
    ],
    tasks: [
      { label: 'Adjust automation guardrails', detail: 'Ensure changes stay within policy.' },
      { label: 'Promote new feature toggles', detail: 'Coordinate rollout communications.' },
      { label: 'Review localisation packs', detail: 'Confirm translations and units for each region.' },
    ],
    narrative: 'The vault houses levers for global configuration. Every change ripples across the farm.',
  },
  AdminModeration: {
    title: 'Moderation Desk',
    subtitle: 'Keep community contributions constructive.',
    highlightZones: [
      [4, 0],
      [4, 1],
    ],
    tasks: [
      { label: 'Review flagged posts', detail: 'Resolve issues quickly and fairly.' },
      { label: 'Coach contributors', detail: 'Offer guidance instead of just penalties.' },
      { label: 'Update safety policies', detail: 'Reflect emerging scenarios in guidelines.' },
    ],
    narrative: 'Screens glow with community reports. Protect the tone and trust of the network.',
  },
  AdminAccess: {
    title: 'Research Access Desk',
    subtitle: 'Approve data requests with governance in mind.',
    highlightZones: [
      [1, 0],
      [1, 1],
    ],
    tasks: [
      { label: 'Validate request scope', detail: 'Ensure least-privilege data sharing.' },
      { label: 'Log approvals for audit', detail: 'Track who accessed which collections.' },
      { label: 'Schedule expiry reviews', detail: 'Regularly revisit granted permissions.' },
    ],
    narrative: 'Compliance binders line the shelves. Make informed, traceable access decisions.',
  },
  AdminAlerts: {
    title: 'Alert Control Room',
    subtitle: 'Dispatch platform-wide notices and warnings.',
    highlightZones: [
      [4, 4],
      [5, 4],
    ],
    tasks: [
      { label: 'Draft broadcast templates', detail: 'Keep copy clear and actionable.' },
      { label: 'Simulate alert impact', detail: 'Assess how users will respond.' },
      { label: 'Coordinate follow-up tasks', detail: 'Assign teams to handle fallout.' },
    ],
    narrative: 'Signal towers blink across the ridge. Communicate with speed and accuracy when stakes are high.',
  },
  AdminAudit: {
    title: 'Audit War Room',
    subtitle: 'Trace every action back to its source.',
    highlightZones: [
      [1, 0],
      [1, 1],
    ],
    tasks: [
      { label: 'Compile compliance packets', detail: 'Bundle logs, transcripts, and approvals.' },
      { label: 'Spot anomalies', detail: 'Investigate out-of-band operations.' },
      { label: 'Brief auditors', detail: 'Prepare concise narratives supported by data.' },
    ],
    narrative: 'Maps and ledgers cover the tables. Accuracy here prevents headaches later.',
  },
};

function createDefaultTasks(routeName) {
  return [
    { label: `Review ${routeName} insights`, detail: 'Scan the latest metrics and activity logs.' },
    { label: `Coordinate ${routeName.toLowerCase()} actions`, detail: 'Assign crew members or automation to assist.' },
    { label: `Log ${routeName.toLowerCase()} outcomes`, detail: 'Capture what happened for future planning.' },
  ];
}

function buildGrid(highlightZones = []) {
  const highlightLookup = new Set(highlightZones.map(([row, col]) => `${row}-${col}`));

  return BASE_GRID.map((row, rowIndex) =>
    row.map((cell, columnIndex) => {
      const tile = TILE_LIBRARY[cell] || TILE_LIBRARY.field;
      const id = `${rowIndex}-${columnIndex}`;
      const isHighlighted = highlightLookup.has(id);
      return {
        ...tile,
        id,
        row: rowIndex,
        column: columnIndex,
        isHighlighted,
      };
    })
  );
}

function toneFromPercentage(value) {
  if (value >= 70) {
    return 'good';
  }
  if (value >= 45) {
    return 'warn';
  }
  return 'critical';
}

function toneFromCredits(value) {
  if (value >= 1200) {
    return 'good';
  }
  if (value >= 600) {
    return 'warn';
  }
  return 'critical';
}

function formatNumber(value) {
  const rounded = Math.round(value || 0);
  return rounded.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function createMetrics(state, detail) {
  const resources = state.resources || {};
  const metrics = [
    {
      key: 'water',
      label: 'Water',
      value: `${Math.round(resources.water ?? 0)}%`,
      tone: toneFromPercentage(resources.water ?? 0),
    },
    {
      key: 'soilHealth',
      label: 'Soil',
      value: `${Math.round(resources.soilHealth ?? 0)}%`,
      tone: toneFromPercentage(resources.soilHealth ?? 0),
    },
    {
      key: 'energy',
      label: 'Energy',
      value: `${Math.round(resources.energy ?? 0)}%`,
      tone: toneFromPercentage(resources.energy ?? 0),
    },
    {
      key: 'credits',
      label: 'Credits',
      value: `Cr ${formatNumber(resources.credits ?? 0)}`,
      tone: toneFromCredits(resources.credits ?? 0),
    },
    {
      key: 'research',
      label: 'Research',
      value: `${Math.round(resources.research ?? 0)}%`,
      tone: toneFromPercentage(resources.research ?? 0),
    },
  ];

  if (detail?.metricFocus?.length) {
    const focusSet = new Set(detail.metricFocus);
    metrics.sort((a, b) => {
      const aFocus = focusSet.has(a.key) ? 1 : 0;
      const bFocus = focusSet.has(b.key) ? 1 : 0;
      return bFocus - aFocus;
    });
  }

  return metrics;
}

function resolveSceneDetail(routeName, state) {
  if (routeName === 'CampaignLevel1') {
    if (state?.campaign?.activeMissionId === 'm1_1') {
      return SCENE_DETAILS.CampaignLevel1;
    }
    return {
      title: 'Campaign Briefing',
      subtitle: 'Review mission prerequisites before entering the field.',
      highlightZones: [
        [2, 1],
        [2, 2],
      ],
      tasks: [
        { label: 'Select a mission', detail: 'Start from the campaign menu to deploy the crew.' },
        { label: 'Check readiness', detail: 'Confirm gear, weather, and team status.' },
        { label: 'Launch when ready', detail: 'Enter the mission to activate the 3D scene.' },
      ],
      narrative: 'The command table is quiet until a mission is set. Initiate the campaign to load the first harvest grounds.',
    };
  }

  if (SCENE_DETAILS[routeName]) {
    return SCENE_DETAILS[routeName];
  }

  if (routeName.startsWith('Admin')) {
    return SCENE_DETAILS.AdminUsers;
  }

  if (COMMUNITY_ROUTES.has(routeName)) {
    return SCENE_DETAILS.CreatePost;
  }

  if (LEARNING_ROUTES.has(routeName)) {
    return SCENE_DETAILS.Tutorial;
  }

  if (PROFILE_ROUTES.has(routeName)) {
    return SCENE_DETAILS.Profile;
  }

  if (AI_ROUTES.has(routeName)) {
    return SCENE_DETAILS.AITutor;
  }

  if (OPERATIONS_ROUTES.has(routeName)) {
    return SCENE_DETAILS.SmartTasks;
  }

  return {
    title: `${routeName} Command`,
    subtitle: 'Integrate this module with the wider farm storyline.',
    highlightZones: [
      [2, 2],
      [2, 3],
    ],
    tasks: createDefaultTasks(routeName),
    narrative: 'Use this station to keep the broader simulation aligned.',
  };
}

export function getSceneConfig(routeName, state) {
  const detail = resolveSceneDetail(routeName, state);
  const grid = buildGrid(detail.highlightZones);
  const tasks = (detail.tasks || createDefaultTasks(routeName)).map((task, index) => ({
    id: task.id || `${routeName}-task-${index}`,
    label: task.label,
    detail: task.detail,
  }));

  return {
    title: detail.title,
    subtitle: detail.subtitle,
    narrative: detail.narrative,
    grid,
    tasks,
    metrics: createMetrics(state, detail),
  };
}

export default getSceneConfig;
