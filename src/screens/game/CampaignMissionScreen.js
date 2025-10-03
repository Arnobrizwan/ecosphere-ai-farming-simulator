import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
} from 'react-native';
import { COLORS } from '../../constants/colors';
import { ENHANCED_MISSIONS } from '../../data/campaignMissions';
import { CHARACTERS } from '../../data/characters';
import CharacterDialogue from '../../components/CharacterDialogue';
import ObjectiveInteraction from '../../components/ObjectiveInteraction';

export default function CampaignMissionScreen({ route, navigation }) {
  const { missionId } = route.params;
  const mission = ENHANCED_MISSIONS.find((m) => m.id === missionId);

  const [currentCutscene, setCurrentCutscene] = useState(null);
  const [cutsceneIndex, setCutsceneIndex] = useState(0);
  const [objectives, setObjectives] = useState(mission?.objectives || []);
  const [showMissionComplete, setShowMissionComplete] = useState(false);
  const [showObjectiveInteraction, setShowObjectiveInteraction] = useState(false);
  const [activeObjective, setActiveObjective] = useState(null);
  const [dialogueQueue, setDialogueQueue] = useState([]);
  const [currentDialogueIndex, setCurrentDialogueIndex] = useState(0);
  const [shownDialogues, setShownDialogues] = useState([]);

  useEffect(() => {
    // Show intro dialogues on mount
    if (mission?.story?.dialogues) {
      const introDialogues = mission.story.dialogues.filter(
        (d) => d.trigger === 'start' && !shownDialogues.includes(d.id)
      );
      if (introDialogues.length > 0) {
        setDialogueQueue(introDialogues);
        setCurrentDialogueIndex(0);
        showNextDialogue(introDialogues, 0);
      }
    }
  }, [mission]);

  const showNextDialogue = (queue, index) => {
    if (index < queue.length) {
      setCurrentCutscene(queue[index]);
    }
  };

  const isObjectiveLocked = (objectiveIndex) => {
    // First objective is always unlocked
    if (objectiveIndex === 0) return false;
    
    // Check if all previous objectives are complete
    for (let i = 0; i < objectiveIndex; i++) {
      if (!objectives[i].completed) {
        return true;
      }
    }
    return false;
  };

  if (!mission) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Mission not found</Text>
      </View>
    );
  }

  const handleCutsceneContinue = () => {
    const currentDialogue = dialogueQueue[currentDialogueIndex];
    if (currentDialogue) {
      setShownDialogues([...shownDialogues, currentDialogue.id]);
    }

    // Show next dialogue in queue
    const nextIndex = currentDialogueIndex + 1;
    if (nextIndex < dialogueQueue.length) {
      setCurrentDialogueIndex(nextIndex);
      showNextDialogue(dialogueQueue, nextIndex);
    } else {
      setCurrentCutscene(null);
      setDialogueQueue([]);
      setCurrentDialogueIndex(0);
    }
  };

  const handleObjectiveClick = (objective, objectiveIndex) => {
    if (objective.completed) return;
    if (isObjectiveLocked(objectiveIndex)) return;

    // Show dialogues for this objective start
    const objDialogues = mission.story.dialogues?.filter(
      (d) => d.trigger === `${objective.id}_start` && !shownDialogues.includes(d.id)
    ) || [];

    if (objDialogues.length > 0) {
      setDialogueQueue(objDialogues);
      setCurrentDialogueIndex(0);
      showNextDialogue(objDialogues, 0);
      
      // After dialogues, show interaction
      setTimeout(() => {
        setActiveObjective(objective);
        setShowObjectiveInteraction(true);
      }, objDialogues.length * 100);
    } else {
      // No dialogues, go straight to interaction
      setActiveObjective(objective);
      setShowObjectiveInteraction(true);
    }
  };

  const handleObjectiveComplete = () => {
    if (!activeObjective) return;

    const objectiveId = activeObjective.id;
    const updatedObjectives = objectives.map((obj) =>
      obj.id === objectiveId ? { ...obj, completed: true } : obj
    );
    setObjectives(updatedObjectives);
    setShowObjectiveInteraction(false);
    setActiveObjective(null);

    // Show completion dialogues for this objective
    const completeDialogues = mission.story.dialogues?.filter(
      (d) => d.trigger === `${objectiveId}_complete` && !shownDialogues.includes(d.id)
    ) || [];

    if (completeDialogues.length > 0) {
      setDialogueQueue(completeDialogues);
      setCurrentDialogueIndex(0);
      showNextDialogue(completeDialogues, 0);
    }

    // Check if all objectives complete
    const allComplete = updatedObjectives.every((obj) => obj.completed);
    if (allComplete) {
      // Show final completion dialogues
      const finalDialogues = mission.story.dialogues?.filter(
        (d) => d.trigger === 'complete' && !shownDialogues.includes(d.id)
      ) || [];
      
      if (finalDialogues.length > 0) {
        setTimeout(() => {
          setDialogueQueue(finalDialogues);
          setCurrentDialogueIndex(0);
          showNextDialogue(finalDialogues, 0);
        }, 500);
      }

      setTimeout(() => {
        setShowMissionComplete(true);
      }, (finalDialogues.length + 1) * 1000);
    }
  };

  const handleMissionComplete = () => {
    Alert.alert(
      'Mission Complete! 🎉',
      `You earned:\n• ${mission.rewards.xp} XP\n• ${mission.rewards.coins} Coins\n• ${mission.rewards.badges.join(', ')}`,
      [
        {
          text: 'Continue',
          onPress: () => navigation.goBack(),
        },
      ]
    );
  };

  const renderObjective = (objective, index) => {
    const getObjectiveIcon = (type) => {
      switch (type) {
        case 'dialogue':
          return '💬';
        case 'action':
          return '⚡';
        case 'tutorial':
          return '📖';
        case 'quiz':
          return '❓';
        case 'analysis':
          return '🔍';
        case 'decision':
          return '🤔';
        case 'planning':
          return '📋';
        case 'tracking':
          return '📊';
        case 'minigame':
          return '🎮';
        default:
          return '✓';
      }
    };

    const isLocked = isObjectiveLocked(index);

    return (
      <TouchableOpacity
        key={objective.id}
        style={[
          styles.objectiveCard,
          objective.completed && styles.objectiveCompleted,
          isLocked && styles.objectiveLocked,
        ]}
        onPress={() => !isLocked && handleObjectiveClick(objective, index)}
        disabled={objective.completed || isLocked}
      >
        <View style={styles.objectiveHeader}>
          <Text style={styles.objectiveIcon}>{getObjectiveIcon(objective.type)}</Text>
          <View style={styles.objectiveContent}>
            <Text
              style={[
                styles.objectiveText,
                objective.completed && styles.objectiveTextCompleted,
              ]}
            >
              {objective.text}
            </Text>
            {objective.hint && !objective.completed && (
              <Text style={styles.objectiveHint}>💡 {objective.hint}</Text>
            )}
          </View>
          {objective.completed && (
            <Text style={styles.checkmark}>✓</Text>
          )}
          {isLocked && (
            <View style={styles.lockOverlay}>
              <Text style={styles.lockIcon}>🔒</Text>
              <Text style={styles.lockText}>Complete previous objectives</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <View style={styles.titleContainer}>
          <Text style={styles.chapterText}>
            Chapter {mission.chapterNumber} - Mission {mission.missionNumber}
          </Text>
          <Text style={styles.title}>{mission.title}</Text>
          <Text style={styles.subtitle}>{mission.subtitle}</Text>
        </View>
      </View>

      <ScrollView style={styles.content}>
        {/* Story Section */}
        <View style={styles.storySection}>
          <Text style={styles.sectionTitle}>📖 Story</Text>
          <View style={styles.storyBox}>
            <Text style={styles.storyText}>{mission.story.intro}</Text>
          </View>
        </View>

        {/* Main Character */}
        <View style={styles.characterSection}>
          <Text style={styles.sectionTitle}>👥 Characters</Text>
          <View style={styles.characterCard}>
            <Text style={styles.characterAvatar}>
              {CHARACTERS[mission.story.mainCharacter]?.avatar}
            </Text>
            <View style={styles.characterInfo}>
              <Text style={styles.characterName}>
                {CHARACTERS[mission.story.mainCharacter]?.name}
              </Text>
              <Text style={styles.characterRole}>
                {CHARACTERS[mission.story.mainCharacter]?.role}
              </Text>
            </View>
          </View>
        </View>

        {/* Objectives */}
        <View style={styles.objectivesSection}>
          <Text style={styles.sectionTitle}>🎯 Objectives</Text>
          {objectives.map((obj, index) => renderObjective(obj, index))}
        </View>

        {/* Mission Info */}
        <View style={styles.infoSection}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Difficulty:</Text>
            <Text style={styles.infoValue}>{mission.difficulty}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Est. Time:</Text>
            <Text style={styles.infoValue}>{mission.estimatedTime}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Skill:</Text>
            <Text style={styles.infoValue}>{mission.realWorldSkill}</Text>
          </View>
        </View>

        {/* Rewards Preview */}
        <View style={styles.rewardsSection}>
          <Text style={styles.sectionTitle}>🏆 Rewards</Text>
          <View style={styles.rewardsGrid}>
            <View style={styles.rewardCard}>
              <Text style={styles.rewardIcon}>⭐</Text>
              <Text style={styles.rewardText}>{mission.rewards.xp} XP</Text>
            </View>
            <View style={styles.rewardCard}>
              <Text style={styles.rewardIcon}>💰</Text>
              <Text style={styles.rewardText}>{mission.rewards.coins} Coins</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Cutscene Modal */}
      {currentCutscene && (
        <Modal
          visible={!!currentCutscene}
          transparent={true}
          animationType="fade"
        >
          <View style={styles.cutsceneOverlay}>
            <CharacterDialogue
              characterId={currentCutscene.character}
              dialogue={currentCutscene.text || currentCutscene.dialogue}
              emotion={currentCutscene.emotion}
              onContinue={handleCutsceneContinue}
            />
          </View>
        </Modal>
      )}

      {/* Objective Interaction */}
      {activeObjective && (
        <ObjectiveInteraction
          visible={showObjectiveInteraction}
          onClose={() => setShowObjectiveInteraction(false)}
          objective={activeObjective}
          onComplete={handleObjectiveComplete}
          character={mission.story.mainCharacter}
        />
      )}

      {/* Mission Complete Modal */}
      {showMissionComplete && (
        <Modal
          visible={showMissionComplete}
          transparent={true}
          animationType="slide"
        >
          <View style={styles.completeOverlay}>
            <View style={styles.completeCard}>
              <Text style={styles.completeTitle}>🎉 Mission Complete!</Text>
              <Text style={styles.completeSubtitle}>{mission.title}</Text>

              <View style={styles.rewardsList}>
                <Text style={styles.rewardsTitle}>Rewards Earned:</Text>
                <Text style={styles.rewardItem}>⭐ {mission.rewards.xp} XP</Text>
                <Text style={styles.rewardItem}>💰 {mission.rewards.coins} Coins</Text>
                {mission.rewards.badges.map((badge) => (
                  <Text key={badge} style={styles.rewardItem}>
                    🏅 {badge}
                  </Text>
                ))}
              </View>

              <TouchableOpacity
                style={styles.continueButton}
                onPress={handleMissionComplete}
              >
                <Text style={styles.continueButtonText}>Continue</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.skyBlue,
  },
  header: {
    backgroundColor: COLORS.primaryGreen,
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  backButton: {
    marginBottom: 10,
  },
  backButtonText: {
    color: COLORS.pureWhite,
    fontSize: 16,
  },
  titleContainer: {
    alignItems: 'center',
  },
  chapterText: {
    color: COLORS.accentYellow,
    fontSize: 14,
    marginBottom: 5,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.pureWhite,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.pureWhite,
    textAlign: 'center',
    marginTop: 5,
  },
  content: {
    flex: 1,
  },
  storySection: {
    padding: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.deepBlack,
    marginBottom: 10,
  },
  storyBox: {
    backgroundColor: COLORS.pureWhite,
    borderRadius: 8,
    padding: 15,
  },
  storyText: {
    fontSize: 14,
    color: COLORS.deepBlack,
    lineHeight: 22,
  },
  characterSection: {
    padding: 15,
  },
  characterCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.pureWhite,
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
  },
  characterAvatar: {
    fontSize: 40,
    marginRight: 15,
  },
  characterInfo: {
    flex: 1,
  },
  characterName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.deepBlack,
  },
  characterRole: {
    fontSize: 12,
    color: COLORS.earthBrown,
    fontStyle: 'italic',
  },
  objectivesSection: {
    padding: 15,
  },
  objectiveCard: {
    backgroundColor: COLORS.pureWhite,
    borderRadius: 8,
    padding: 15,
    marginBottom: 10,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.accentYellow,
  },
  objectiveCompleted: {
    backgroundColor: '#F0FDF4',
    borderLeftColor: COLORS.primaryGreen,
  },
  objectiveHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  objectiveIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  objectiveContent: {
    flex: 1,
  },
  objectiveText: {
    fontSize: 14,
    color: COLORS.deepBlack,
    fontWeight: '600',
  },
  objectiveTextCompleted: {
    textDecorationLine: 'line-through',
    color: COLORS.earthBrown,
  },
  objectiveHint: {
    fontSize: 12,
    color: COLORS.skyBlue,
    fontStyle: 'italic',
    marginTop: 4,
  },
  checkmark: {
    fontSize: 24,
    color: COLORS.primaryGreen,
  },
  infoSection: {
    padding: 15,
    backgroundColor: COLORS.pureWhite,
    marginHorizontal: 15,
    borderRadius: 8,
    marginBottom: 15,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  infoLabel: {
    fontSize: 14,
    color: COLORS.earthBrown,
    fontWeight: '600',
  },
  infoValue: {
    fontSize: 14,
    color: COLORS.deepBlack,
  },
  rewardsSection: {
    padding: 15,
  },
  rewardsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  rewardCard: {
    backgroundColor: COLORS.pureWhite,
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
    width: '45%',
  },
  rewardIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  rewardText: {
    fontSize: 14,
    color: COLORS.deepBlack,
    fontWeight: '600',
  },
  cutsceneOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    padding: 20,
  },
  completeOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  completeCard: {
    backgroundColor: COLORS.pureWhite,
    borderRadius: 16,
    padding: 30,
    width: '90%',
    alignItems: 'center',
  },
  completeTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.primaryGreen,
    marginBottom: 10,
  },
  completeSubtitle: {
    fontSize: 16,
    color: COLORS.earthBrown,
    marginBottom: 20,
    textAlign: 'center',
  },
  rewardsList: {
    width: '100%',
    marginBottom: 20,
  },
  rewardsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.deepBlack,
    marginBottom: 10,
  },
  rewardItem: {
    fontSize: 14,
    color: COLORS.deepBlack,
    marginBottom: 5,
  },
  continueButton: {
    backgroundColor: COLORS.primaryGreen,
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 8,
  },
  continueButtonText: {
    color: COLORS.pureWhite,
    fontSize: 16,
    fontWeight: 'bold',
  },
  errorText: {
    fontSize: 18,
    color: COLORS.deepBlack,
    textAlign: 'center',
    marginTop: 50,
  },
  objectiveLocked: {
    opacity: 0.6,
    backgroundColor: '#F3F4F6',
    borderLeftColor: '#9CA3AF',
  },
  lockOverlay: {
    position: 'absolute',
    right: 10,
    top: 10,
    alignItems: 'center',
  },
  lockIcon: {
    fontSize: 20,
    marginBottom: 2,
  },
  lockText: {
    fontSize: 9,
    color: '#6B7280',
    fontWeight: '600',
    textAlign: 'center',
  },
});

CampaignMissionScreen.showGameOverlay = false;
