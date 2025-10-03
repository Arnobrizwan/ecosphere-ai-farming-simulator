import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import { COLORS } from '../../constants/colors';
import { auth } from '../../services/firebase.config';
import {
  getAIResponse,
  saveConversation,
  getQuickQuestions,
  saveFeedback,
  gatherUserContext,
} from '../../services/ai/tutor.service';
import ChatBubble from '../../components/ai/ChatBubble';
import ContextPanel from '../../components/ai/ContextPanel';

const AITutorScreen = ({ navigation }) => {
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showContextPanel, setShowContextPanel] = useState(false);
  const [userContext, setUserContext] = useState(null);
  const [quickQuestions, setQuickQuestions] = useState([]);
  const flatListRef = useRef(null);

  useEffect(() => {
    loadContext();
    addWelcomeMessage();
  }, []);

  const loadContext = async () => {
    const userId = auth.currentUser?.uid;
    if (userId) {
      const context = await gatherUserContext(userId);
      setUserContext(context);
      setQuickQuestions(getQuickQuestions(context));
    }
  };

  const addWelcomeMessage = () => {
    const welcomeMessage = {
      id: Date.now().toString(),
      role: 'assistant',
      content: "Hello! I'm your AI farming tutor. I can help you understand NASA satellite data, plan your crops, and guide you through missions. What would you like to learn today?",
      timestamp: new Date().toISOString(),
    };
    setMessages([welcomeMessage]);
  };

  const handleSendMessage = async (text = inputText) => {
    if (!text.trim()) return;

    const userId = auth.currentUser?.uid;
    if (!userId) {
      Alert.alert('Error', 'Please sign in to use the AI Tutor');
      return;
    }

    // Add user message
    const userMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: text.trim(),
      timestamp: new Date().toISOString(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsLoading(true);

    // Scroll to bottom
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);

    try {
      // Get AI response
      const response = await getAIResponse(text.trim(), messages, userId);

      if (response.success) {
        const aiMessage = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: response.message,
          timestamp: new Date().toISOString(),
          cached: response.cached || false,
        };

        setMessages(prev => [...prev, aiMessage]);

        // Update context if returned
        if (response.context) {
          setUserContext(response.context);
        }

        // Save conversation
        const updatedMessages = [...messages, userMessage, aiMessage];
        await saveConversation(userId, updatedMessages);
      } else {
        const errorMessage = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: response.message || "I'm having trouble connecting. Please try again.",
          timestamp: new Date().toISOString(),
        };
        setMessages(prev => [...prev, errorMessage]);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      Alert.alert('Error', 'Failed to get response. Please try again.');
    } finally {
      setIsLoading(false);
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  };

  const handleQuickQuestion = (question) => {
    setInputText(question);
    handleSendMessage(question);
  };

  const handleFeedback = async (messageId, rating) => {
    const userId = auth.currentUser?.uid;
    if (!userId) return;

    // Update message locally
    setMessages(prev =>
      prev.map(msg =>
        msg.id === messageId
          ? { ...msg, feedback: { rating, timestamp: new Date().toISOString() } }
          : msg
      )
    );

    // Save feedback (conversation ID would be tracked in real implementation)
    // For now, we'll just update the local state
  };

  const renderMessage = ({ item }) => (
    <ChatBubble message={item} onFeedback={handleFeedback} />
  );

  const renderQuickQuestion = (question, index) => (
    <TouchableOpacity
      key={index}
      style={styles.quickQuestionChip}
      onPress={() => handleQuickQuestion(question)}
    >
      <Text style={styles.quickQuestionText}>{question}</Text>
    </TouchableOpacity>
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={90}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>AI Farming Tutor</Text>
          {userContext && (
            <Text style={styles.headerSubtitle}>
              {userContext.currentActivity !== 'browsing' 
                ? `🎯 ${userContext.currentActivity}`
                : `📍 ${userContext.location}`}
            </Text>
          )}
        </View>
        <TouchableOpacity
          style={styles.contextButton}
          onPress={() => setShowContextPanel(!showContextPanel)}
        >
          <Text style={styles.contextButtonText}>ℹ️</Text>
        </TouchableOpacity>
      </View>

      {/* Chat Area */}
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.messageList}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
      />

      {/* Loading Indicator */}
      {isLoading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={COLORS.primaryGreen} />
          <Text style={styles.loadingText}>AI is thinking...</Text>
        </View>
      )}

      {/* Quick Questions */}
      {messages.length <= 1 && quickQuestions.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.quickQuestionsContainer}
          contentContainerStyle={styles.quickQuestionsContent}
        >
          {quickQuestions.map(renderQuickQuestion)}
        </ScrollView>
      )}

      {/* Input Area */}
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Ask me anything about farming..."
          placeholderTextColor="#999"
          value={inputText}
          onChangeText={setInputText}
          multiline
          maxLength={500}
        />
        <TouchableOpacity
          style={[styles.sendButton, !inputText.trim() && styles.sendButtonDisabled]}
          onPress={() => handleSendMessage()}
          disabled={!inputText.trim() || isLoading}
        >
          <Text style={styles.sendButtonText}>➤</Text>
        </TouchableOpacity>
      </View>

      {/* Context Panel */}
      <ContextPanel context={userContext} visible={showContextPanel} />
      
      {showContextPanel && (
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={() => setShowContextPanel(false)}
        />
      )}
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.pureWhite,
    paddingTop: 50,
    paddingBottom: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  backButtonText: {
    fontSize: 24,
    color: COLORS.primaryGreen,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.deepBlack,
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  contextButton: {
    padding: 8,
  },
  contextButtonText: {
    fontSize: 20,
  },
  messageList: {
    paddingVertical: 16,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    backgroundColor: COLORS.pureWhite,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  loadingText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#666',
  },
  quickQuestionsContainer: {
    backgroundColor: COLORS.pureWhite,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    maxHeight: 60,
  },
  quickQuestionsContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  quickQuestionChip: {
    backgroundColor: COLORS.accentYellow,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
  },
  quickQuestionText: {
    fontSize: 13,
    color: COLORS.deepBlack,
    fontWeight: '500',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: COLORS.pureWhite,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  input: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    maxHeight: 100,
    marginRight: 8,
    color: COLORS.deepBlack,
  },
  sendButton: {
    backgroundColor: COLORS.primaryGreen,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#CCC',
  },
  sendButtonText: {
    color: COLORS.pureWhite,
    fontSize: 18,
    fontWeight: 'bold',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
});

export default AITutorScreen;
