# AI Tutor 3D Character - Integration Guide

## Quick Start

### 1. Import Components in Your Game Scene

```javascript
import { AITutorCharacter } from './entities/AITutorCharacter';
import { TutorTriggerSystem } from './systems/TutorTriggerSystem';
import TutorDialogueBox from './ui/TutorDialogueBox';
import { getContextualResponse, gatherGameContext } from '../services/ai/tutor.service';
```

### 2. Initialize in Game Scene

```javascript
class GameScene {
  constructor() {
    this.scene = new THREE.Scene();
    this.player = null; // Your player object
    this.tutor = null;
    this.triggerSystem = null;
    this.dialogueVisible = false;
    this.currentDialogue = null;
    
    this.initTutor();
  }
  
  initTutor() {
    // Create tutor character
    this.tutor = new AITutorCharacter(this.scene, this.player);
    
    // Create trigger system
    this.triggerSystem = new TutorTriggerSystem(this.tutor, this.getGameState());
  }
  
  getGameState() {
    return {
      player: this.player,
      plots: this.plots,
      activeMission: this.currentMission,
      nasaLayerActive: this.nasaOverlay?.visible || false,
      nasaLayerType: this.currentNASALayer,
      actionHistory: this.recentActions,
      currentArea: this.currentArea,
      nearbyObjects: this.getNearbyObjects(),
      nearbyPlots: this.getNearbyPlots()
    };
  }
}
```

### 3. Update Loop

```javascript
update(deltaTime) {
  // Update tutor position (follows player)
  if (this.tutor) {
    this.tutor.update(deltaTime);
  }
  
  // Check for contextual triggers
  if (this.triggerSystem && !this.dialogueVisible) {
    const trigger = this.triggerSystem.checkTriggers(this.getGameContext());
    
    if (trigger) {
      this.showTutorDialogue(trigger);
    }
  }
}

getGameContext() {
  return {
    currentArea: this.currentArea,
    nearbyPlots: this.getNearbyPlots(),
    lastFailedAction: this.lastFailedAction,
    nasaLayerActive: this.nasaOverlay?.visible,
    nasaLayerType: this.currentNASALayer,
    missionObjectiveChanged: this.objectiveJustChanged,
    currentObjective: this.currentMission?.currentObjective,
    idleTime: Date.now() - this.lastPlayerAction,
    taskCompleted: this.justCompletedTask,
    plots: this.plots
  };
}
```

### 4. React Component Integration

```javascript
import React, { useState } from 'react';
import TutorDialogueBox from '../game3d/ui/TutorDialogueBox';

function GameScreen() {
  const [dialogueVisible, setDialogueVisible] = useState(false);
  const [dialogueData, setDialogueData] = useState(null);
  
  const showTutorDialogue = (trigger) => {
    setDialogueData({
      message: trigger.message,
      options: trigger.options,
      tutorName: 'AgriBot'
    });
    setDialogueVisible(true);
    
    // Show indicator on 3D character
    if (trigger.indicator) {
      gameScene.tutor.showIndicator(trigger.indicator);
    }
    
    // Point to object if specified
    if (trigger.targetObject) {
      gameScene.tutor.pointTo(trigger.targetObject);
    }
  };
  
  const handleOptionSelect = async (option, index) => {
    if (option.action === 'dismiss') {
      setDialogueVisible(false);
      gameScene.tutor.hideIndicator();
      return;
    }
    
    // Handle other actions
    switch (option.action) {
      case 'explainArea':
        // Get AI explanation
        const response = await getAIExplanation(option);
        setDialogueData({ ...dialogueData, message: response });
        break;
        
      case 'showSolution':
        // Show tutorial or guide
        showTutorial(option.tutorialId);
        setDialogueVisible(false);
        break;
        
      case 'openDiseaseDetection':
        navigation.navigate('DiseaseDetection');
        setDialogueVisible(false);
        break;
    }
  };
  
  return (
    <View style={{ flex: 1 }}>
      {/* Your 3D game canvas */}
      <Canvas />
      
      {/* Dialogue overlay */}
      <TutorDialogueBox
        visible={dialogueVisible}
        message={dialogueData?.message}
        tutorName={dialogueData?.tutorName}
        options={dialogueData?.options}
        onOptionSelect={handleOptionSelect}
        onClose={() => {
          setDialogueVisible(false);
          gameScene.tutor.hideIndicator();
        }}
      />
    </View>
  );
}
```

### 5. AI Response Integration

```javascript
import { getContextualResponse, gatherGameContext } from '../services/ai/tutor.service';
import { auth } from '../services/firebase.config';

async function getAIExplanation(situation) {
  const userId = auth.currentUser?.uid;
  const gameContext = gatherGameContext(gameScene.getGameState());
  
  const response = await getContextualResponse(
    situation,
    userId,
    gameContext
  );
  
  return response.message;
}
```

## Trigger Examples

### Example 1: Player Enters New Area

```javascript
// In your area transition code
onPlayerEnterArea(newArea) {
  this.currentArea = newArea;
  // Trigger system will automatically detect and show welcome message
}
```

### Example 2: Player Fails Action

```javascript
onPlayerActionFailed(actionType) {
  this.lastFailedAction = actionType;
  this.triggerSystem.recordFailure(actionType);
  // After 3 failures, tutor will offer help
}
```

### Example 3: Manual Tutor Call

```javascript
// Player taps on tutor character
onTutorTapped() {
  this.showTutorDialogue({
    message: "Hi! What can I help you with?",
    options: [
      { label: 'Explain this mission', action: 'explainMission' },
      { label: 'Show NASA data', action: 'showNASA' },
      { label: 'Crop advice', action: 'cropAdvice' },
      { label: 'Never mind', action: 'dismiss' }
    ],
    indicator: 'question'
  });
}
```

## Customization

### Change Tutor Appearance

```javascript
// In AITutorCharacter.js createMesh()
const bodyMaterial = new THREE.MeshStandardMaterial({
  color: 0x34A853, // Change color
  emissive: 0x34A853,
  emissiveIntensity: 0.5 // Adjust glow
});
```

### Add Custom Triggers

```javascript
// In TutorTriggerSystem.js setupTriggers()
this.addTrigger('customTrigger', {
  condition: (context) => {
    // Your condition logic
    return context.someValue > threshold;
  },
  action: (context) => {
    return {
      message: 'Custom message here',
      indicator: 'exclamation',
      options: [
        { label: 'OK', action: 'dismiss' }
      ]
    };
  }
});
```

### Adjust Tutor Personality

```javascript
// In tutor.service.js buildSystemPrompt()
// Modify the PERSONALITY section:
PERSONALITY:
- Your custom personality traits
- Custom catchphrases
- Tone adjustments
```

## Performance Tips

1. **Limit AI Calls**: Use cached responses for common questions
2. **Trigger Throttling**: Minimum 10s between triggers (already implemented)
3. **Dispose Properly**: Call `tutor.dispose()` when scene unmounts
4. **Optimize Mesh**: Use lower poly counts for mobile

## Troubleshooting

### Tutor Not Following Player
- Ensure `player` object is passed to `AITutorCharacter` constructor
- Check that `player.position` is updated each frame
- Verify `tutor.update(deltaTime)` is called in game loop

### Dialogue Not Showing
- Check `dialogueVisible` state is being set
- Verify `TutorDialogueBox` is rendered in component tree
- Ensure trigger conditions are being met

### AI Responses Too Slow
- Reduce `max_tokens` in `getContextualResponse()` (currently 150)
- Use cached responses for common situations
- Consider switching to GPT-3.5-turbo for faster responses

### Triggers Firing Too Often
- Increase `minTriggerInterval` in `TutorTriggerSystem` (default 10s)
- Add cooldowns to specific triggers
- Use `triggeredEvents` Set to prevent repeats

## Example: Complete Integration

See `UC20_AI_TUTOR_README.md` for full implementation details and API documentation.

---

**Ready to integrate?** Start with steps 1-3, then add React component integration (step 4) once 3D character is working.
