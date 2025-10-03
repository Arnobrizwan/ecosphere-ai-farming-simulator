import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  Dimensions,
} from 'react-native';
import { COLORS } from '../constants/colors';
import { CHARACTERS } from '../data/characters';

const { width } = Dimensions.get('window');

/**
 * ObjectiveInteraction Component
 * Handles interactive gameplay for different objective types
 */
export default function ObjectiveInteraction({ visible, onClose, objective, onComplete, character }) {
  const [answer, setAnswer] = useState('');
  const [selectedChoice, setSelectedChoice] = useState(null);
  const [fieldSelected, setFieldSelected] = useState(false);

  const handleDialogue = () => {
    // Simple dialogue interaction - just click through
    Alert.alert(
      `💬 ${CHARACTERS[character]?.name || 'Character'}`,
      `"${objective.hint || 'Let me tell you about this...'}"`,
      [
        {
          text: 'Continue',
          onPress: () => {
            onComplete();
            onClose();
          },
        },
      ]
    );
  };

  const handleAction = () => {
    if (objective.type === 'action') {
      // Simulate field selection or planting action
      if (!fieldSelected) {
        setFieldSelected(true);
      } else {
        onComplete();
        onClose();
      }
    }
  };

  const handleChoice = (choice) => {
    setSelectedChoice(choice);
    if (objective.correctChoice) {
      if (choice === objective.correctChoice) {
        Alert.alert('✅ Correct!', 'Great choice!', [
          {
            text: 'Continue',
            onPress: () => {
              onComplete();
              onClose();
            },
          },
        ]);
      } else {
        Alert.alert('❌ Try Again', 'That might not be the best option. Try another!');
        setSelectedChoice(null);
      }
    } else {
      // Any choice is valid
      onComplete();
      onClose();
    }
  };

  const handleQuiz = () => {
    if (answer.toLowerCase().includes('soil') || answer.toLowerCase().includes('wheat')) {
      Alert.alert('✅ Correct!', 'You understand the basics!', [
        {
          text: 'Continue',
          onPress: () => {
            onComplete();
            onClose();
          },
        },
      ]);
    } else {
      Alert.alert('💡 Hint', 'Think about what plants need to grow...');
    }
  };

  const renderDialogueInterface = () => (
    <View style={styles.interactionContainer}>
      <Text style={styles.characterAvatar}>{CHARACTERS[character]?.avatar || '👤'}</Text>
      <Text style={styles.characterName}>{CHARACTERS[character]?.name || 'Character'}</Text>
      
      <View style={styles.dialogueBox}>
        <Text style={styles.dialogueText}>
          {objective.hint || 'Let me explain what you need to do...'}
        </Text>
      </View>

      <TouchableOpacity style={styles.actionButton} onPress={handleDialogue}>
        <Text style={styles.actionButtonText}>Continue Conversation →</Text>
      </TouchableOpacity>
    </View>
  );

  const renderActionInterface = () => (
    <View style={styles.interactionContainer}>
      <Text style={styles.title}>⚡ {objective.text}</Text>
      
      {!fieldSelected ? (
        <>
          <Text style={styles.instructions}>
            Tap on a field to select it for planting
          </Text>
          
          <View style={styles.fieldGrid}>
            {[1, 2, 3, 4].map((field) => (
              <TouchableOpacity
                key={field}
                style={styles.fieldBox}
                onPress={() => setFieldSelected(true)}
              >
                <Text style={styles.fieldNumber}>Field #{field}</Text>
                <Text style={styles.fieldEmoji}>🌾</Text>
              </TouchableOpacity>
            ))}
          </View>
        </>
      ) : (
        <>
          <Text style={styles.successText}>✓ Field Selected!</Text>
          <TouchableOpacity style={styles.actionButton} onPress={handleAction}>
            <Text style={styles.actionButtonText}>Complete Action</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );

  const renderChoiceInterface = () => (
    <View style={styles.interactionContainer}>
      <Text style={styles.title}>🤔 {objective.text}</Text>
      
      <Text style={styles.instructions}>
        {objective.hint || 'Choose the best option:'}
      </Text>

      <View style={styles.choicesContainer}>
        {objective.options?.map((option) => (
          <TouchableOpacity
            key={option}
            style={[
              styles.choiceButton,
              selectedChoice === option && styles.choiceButtonSelected,
            ]}
            onPress={() => handleChoice(option)}
          >
            <Text
              style={[
                styles.choiceText,
                selectedChoice === option && styles.choiceTextSelected,
              ]}
            >
              {option.charAt(0).toUpperCase() + option.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderQuizInterface = () => (
    <View style={styles.interactionContainer}>
      <Text style={styles.title}>❓ {objective.text}</Text>
      
      <Text style={styles.instructions}>
        {objective.hint || 'Answer the question:'}
      </Text>

      <TextInput
        style={styles.quizInput}
        placeholder="Type your answer..."
        value={answer}
        onChangeText={setAnswer}
        multiline
      />

      <TouchableOpacity style={styles.actionButton} onPress={handleQuiz}>
        <Text style={styles.actionButtonText}>Submit Answer</Text>
      </TouchableOpacity>
    </View>
  );

  const renderInterface = () => {
    switch (objective.type) {
      case 'dialogue':
        return renderDialogueInterface();
      case 'action':
        return renderActionInterface();
      case 'choice':
        return renderChoiceInterface();
      case 'quiz':
      case 'analysis':
      case 'tutorial':
        return renderQuizInterface();
      default:
        return (
          <View style={styles.interactionContainer}>
            <Text style={styles.title}>{objective.text}</Text>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => {
                onComplete();
                onClose();
              }}
            >
              <Text style={styles.actionButtonText}>Mark Complete</Text>
            </TouchableOpacity>
          </View>
        );
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>

          {renderInterface()}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: width * 0.9,
    maxWidth: 500,
    backgroundColor: COLORS.pureWhite,
    borderRadius: 20,
    padding: 20,
    maxHeight: '80%',
  },
  closeButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  closeButtonText: {
    fontSize: 20,
    color: COLORS.deepBlack,
    fontWeight: 'bold',
  },
  interactionContainer: {
    alignItems: 'center',
    paddingTop: 20,
  },
  characterAvatar: {
    fontSize: 60,
    marginBottom: 10,
  },
  characterName: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.primaryGreen,
    marginBottom: 20,
  },
  dialogueBox: {
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 15,
    marginBottom: 20,
    width: '100%',
  },
  dialogueText: {
    fontSize: 16,
    lineHeight: 24,
    color: COLORS.deepBlack,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.deepBlack,
    textAlign: 'center',
    marginBottom: 15,
  },
  instructions: {
    fontSize: 15,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 20,
  },
  fieldGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 20,
  },
  fieldBox: {
    width: '48%',
    aspectRatio: 1,
    backgroundColor: COLORS.primaryGreen,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  fieldNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.pureWhite,
    marginBottom: 5,
  },
  fieldEmoji: {
    fontSize: 32,
  },
  successText: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.primaryGreen,
    marginVertical: 30,
  },
  choicesContainer: {
    width: '100%',
    marginBottom: 20,
  },
  choiceButton: {
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  choiceButtonSelected: {
    borderColor: COLORS.primaryGreen,
    backgroundColor: '#E6F7ED',
  },
  choiceText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.deepBlack,
    textAlign: 'center',
  },
  choiceTextSelected: {
    color: COLORS.primaryGreen,
  },
  quizInput: {
    width: '100%',
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 15,
    marginBottom: 20,
    fontSize: 16,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  actionButton: {
    backgroundColor: COLORS.primaryGreen,
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
    shadowColor: COLORS.primaryGreen,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.pureWhite,
  },
});
