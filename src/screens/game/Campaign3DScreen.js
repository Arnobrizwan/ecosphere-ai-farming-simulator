import React, { useCallback, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';

let UnityView = null;

try {
  // Prefer the maintained Unity bridge. The dynamic require prevents bundler crashes on platforms
  // (like web) where the native module is not compiled.
  // eslint-disable-next-line global-require
  UnityView = require('@azesmway/react-native-unity').default;
} catch (error) {
  UnityView = null;
}

const Campaign3DScreen = ({ navigation, route }) => {
  const unityRef = useRef(null);
  const [lastMessage, setLastMessage] = useState(null);
  const unityAvailable = useMemo(() => Boolean(UnityView), []);

  const handleReturn = useCallback(() => {
    route?.params?.onAbort?.();
    navigation.goBack();
  }, [navigation, route]);

  const handleSendTestEvent = useCallback(() => {
    const payload = {
      action: 'PING_FROM_RN',
      timestamp: Date.now(),
    };

    if (unityRef.current?.postMessage) {
      unityRef.current.postMessage('GameManager', 'ApplyAction', JSON.stringify(payload));
    }
  }, []);

  const handleUnityMessage = useCallback((event) => {
    setLastMessage(event?.nativeEvent?.message ?? String(event));
  }, []);

  if (!unityAvailable) {
    return (
      <ScrollView contentContainerStyle={styles.fallbackContainer}>
        <Text style={styles.title}>3D Campaign Integration Pending</Text>
        <Text style={styles.paragraph}>
          Unity runtime is not linked yet. Install a compatible React Native ↔ Unity bridge (we ship{' '}
          <Text style={styles.code}>@azesmway/react-native-unity</Text>) and export the Unity project as described in
          <Text style={styles.code}> UNITY_INTEGRATION_PLAN.md</Text>.
        </Text>
        <Text style={styles.paragraph}>
          Once the bridge is installed and native builds include the Unity export, this screen will automatically
          render the Unity scene without requiring additional changes.
        </Text>
        <TouchableOpacity style={styles.button} onPress={handleReturn}>
          <Text style={styles.buttonText}>Back to Campaign Menu</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  return (
    <View style={styles.container}>
      <UnityView
        ref={unityRef}
        style={styles.unityView}
        onUnityMessage={handleUnityMessage}
      />
      <View style={styles.overlayContainer}>
        <TouchableOpacity style={styles.overlayButton} onPress={handleSendTestEvent}>
          <Text style={styles.overlayButtonText}>Send Test Event</Text>
        </TouchableOpacity>
        {route?.params?.onComplete ? (
          <TouchableOpacity
            style={[styles.overlayButton, styles.successButton]}
            onPress={() => {
              route.params.onComplete();
              navigation.goBack();
            }}
          >
            <Text style={styles.overlayButtonText}>Complete Mission</Text>
          </TouchableOpacity>
        ) : null}
        <TouchableOpacity style={styles.overlayButton} onPress={handleReturn}>
          <Text style={styles.overlayButtonText}>Exit Mission</Text>
        </TouchableOpacity>
        {lastMessage ? (
          <View style={styles.messageBadge}>
            <Text style={styles.messageLabel}>Unity response:</Text>
            <Text style={styles.messageText} numberOfLines={2}>
              {lastMessage}
            </Text>
          </View>
        ) : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  unityView: {
    flex: 1,
  },
  overlayContainer: {
    position: 'absolute',
    bottom: 32,
    left: 0,
    right: 0,
    alignItems: 'center',
    gap: 16,
  },
  overlayButton: {
    backgroundColor: 'rgba(0, 128, 0, 0.85)',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  successButton: {
    backgroundColor: 'rgba(34, 197, 94, 0.9)',
  },
  overlayButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  fallbackContainer: {
    flexGrow: 1,
    padding: 24,
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 16,
    textAlign: 'center',
  },
  paragraph: {
    fontSize: 16,
    marginBottom: 12,
    lineHeight: 22,
  },
  code: {
    fontFamily: 'Courier',
  },
  button: {
    marginTop: 24,
    backgroundColor: '#00695C',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
  },
  messageBadge: {
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    width: '90%',
  },
  messageLabel: {
    color: '#A5D6A7',
    fontSize: 12,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  messageText: {
    color: '#E8F5E9',
    fontSize: 14,
  },
});

export default Campaign3DScreen;
