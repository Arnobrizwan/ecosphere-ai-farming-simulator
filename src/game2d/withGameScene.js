import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { useGameState } from './GameStateContext';

export function withGameScene(ScreenComponent, routeName) {
  const WithGameScene = (props) => {
    const { setActiveScene } = useGameState();

    useEffect(() => {
      setActiveScene(routeName);
    }, [routeName, setActiveScene]);

    return (
      <View style={styles.container}>
        <ScreenComponent {...props} />
      </View>
    );
  };

  const componentName = ScreenComponent.displayName || ScreenComponent.name || 'Component';
  WithGameScene.displayName = `WithGameScene(${componentName})`;

  if (ScreenComponent.navigationOptions) {
    WithGameScene.navigationOptions = ScreenComponent.navigationOptions;
  }

  return WithGameScene;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default withGameScene;
