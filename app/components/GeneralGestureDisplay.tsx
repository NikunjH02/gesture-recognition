import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { IconSymbol } from '@/components/ui/IconSymbol';
import HandDiagram from './HandDiagram';

interface GeneralGestureDisplayProps {
  values: number[];
  onSimulate: () => void;
}

export default function GeneralGestureDisplay({ values, onSimulate }: GeneralGestureDisplayProps) {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <IconSymbol size={32} name="hand.point.up.braille.fill" color="#9C27B0" />
        <Text style={styles.title}>General Gesture Detection</Text>
      </View>
      
      <HandDiagram values={values} />

      <TouchableOpacity 
        style={styles.actionButton}
        onPress={onSimulate}
      >
        <IconSymbol size={24} name="camera.fill" color="#fff" />
        <Text style={styles.buttonText}>Simulate Gesture</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
    paddingHorizontal: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  actionButton: {
    backgroundColor: '#9C27B0',
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginTop: 16,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
