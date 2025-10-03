import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const HIGHLIGHT_COLOR = '#F59E0B';

function getTileBackground(tile) {
  if (tile.isHighlighted) {
    return '#FEF3C7';
  }
  return tile.color;
}

function getTileBorder(tile) {
  if (tile.isHighlighted) {
    return HIGHLIGHT_COLOR;
  }
  return 'rgba(17, 24, 39, 0.18)';
}

const FarmBoard = ({ grid }) => {
  if (!grid || !grid.length) {
    return null;
  }

  return (
    <View style={styles.wrapper}>
      {grid.map((row, rowIndex) => (
        <View key={`row-${rowIndex}`} style={styles.row}>
          {row.map((tile) => (
            <View
              key={tile.id}
              style={[
                styles.tile,
                {
                  backgroundColor: getTileBackground(tile),
                  borderColor: getTileBorder(tile),
                },
              ]}
            >
              <Text style={[styles.icon, tile.isHighlighted && styles.highlightIcon]}>{tile.icon}</Text>
            </View>
          ))}
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    alignSelf: 'stretch',
    borderRadius: 12,
    padding: 10,
    backgroundColor: 'rgba(15, 23, 42, 0.08)',
    marginTop: 12,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  tile: {
    width: 34,
    height: 34,
    margin: 2,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  icon: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1F2937',
  },
  highlightIcon: {
    color: '#78350F',
  },
});

export default FarmBoard;
