import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { IconSymbol } from '@/components/ui/IconSymbol';

interface ParkinsonMonitorDisplayProps {
  values: number[];
}

export default function ParkinsonMonitorDisplay({ values }: ParkinsonMonitorDisplayProps) {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <IconSymbol size={32} name="waveform.path.ecg" color="#FF9800" />
        <Text style={styles.title}>Parkinson's Monitor</Text>
      </View>
      
      <View style={styles.placeholderContent}>
        <Text style={styles.placeholderText}>
          🧠 Parkinson's Monitoring Display
        </Text>
        <Text style={styles.descriptionText}>
          This will show tremor detection, movement stability analysis,
          and symptom tracking for Parkinson's disease monitoring.
        </Text>
        
        {/* Placeholder for Parkinson's-specific visualization */}
        <View style={styles.visualPlaceholder}>
          <Text style={styles.placeholderLabel}>Tremor Analysis Visualization</Text>
          <Text style={styles.dataPoint}>Current Flex Values: {values.join(', ')}</Text>
        </View>
      </View>

      <TouchableOpacity style={styles.actionButton}>
        <IconSymbol size={24} name="chart.line.uptrend.xyaxis" color="#fff" />
        <Text style={styles.buttonText}>Analyze Tremor Patterns</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#f8f8f8',
    borderRadius: 12,
    marginVertical: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  placeholderContent: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  placeholderText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FF9800',
    textAlign: 'center',
    marginBottom: 12,
  },
  descriptionText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
  },
  visualPlaceholder: {
    backgroundColor: '#fff3e0',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  placeholderLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  dataPoint: {
    fontSize: 14,
    color: '#666',
  },
  actionButton: {
    backgroundColor: '#FF9800',
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
