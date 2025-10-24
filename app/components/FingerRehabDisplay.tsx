import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { StrokeData, FingerMetrics } from '../types/healthMonitoring';

interface FingerRehabDisplayProps {
  values: number[];
  strokeData?: StrokeData;
}

const FINGER_NAMES = ['Thumb', 'Index', 'Middle', 'Ring', 'Pinky'];

export default function FingerRehabDisplay({ values, strokeData }: FingerRehabDisplayProps) {
  const [sessionStartTime, setSessionStartTime] = useState<number>(Date.now());
  const [sessionDuration, setSessionDuration] = useState<number>(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setSessionDuration(Math.floor((Date.now() - sessionStartTime) / 1000));
    }, 1000);

    return () => clearInterval(interval);
  }, [sessionStartTime]);

  const getScoreColor = (score: number) => {
    if (score >= 75) return '#4CAF50';
    if (score >= 50) return '#FF9800';
    return '#FF5252';
  };

  const getScoreLabel = (score: number) => {
    if (score >= 75) return 'Excellent';
    if (score >= 50) return 'Good';
    if (score >= 25) return 'Fair';
    return 'Needs Improvement';
  };

  const renderFingerMetrics = (fingerName: string, metrics: FingerMetrics, index: number) => {
    const score = metrics.rehab_score ?? 0;
    const scoreColor = getScoreColor(score);
    const scoreLabel = getScoreLabel(score);

    return (
      <View key={fingerName} style={styles.fingerCard}>
        <View style={styles.fingerHeader}>
          <Text style={styles.fingerName}>{fingerName}</Text>
          <View style={[styles.scoreBadge, { backgroundColor: scoreColor }]}>
            <Text style={styles.scoreText}>{score.toFixed(1)}</Text>
          </View>
        </View>

        <Text style={styles.scoreLabel}>{scoreLabel}</Text>

        <View style={styles.metricsGrid}>
          <View style={styles.metricItem}>
            <Text style={styles.metricLabel}>ROM</Text>
            <Text style={styles.metricValue}>{metrics.ROM.toFixed(2)}</Text>
          </View>
          <View style={styles.metricItem}>
            <Text style={styles.metricLabel}>Velocity</Text>
            <Text style={styles.metricValue}>{metrics.peak_vel?.toFixed(2) ?? '—'}</Text>
          </View>
          <View style={styles.metricItem}>
            <Text style={styles.metricLabel}>Jerk</Text>
            <Text style={styles.metricValue}>{metrics.jerk?.toFixed(2) ?? '—'}</Text>
          </View>
          <View style={styles.metricItem}>
            <Text style={styles.metricLabel}>Mean</Text>
            <Text style={styles.metricValue}>{metrics.mean.toFixed(2)}</Text>
          </View>
        </View>

        {/* Progress bar */}
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${score}%`, backgroundColor: scoreColor }]} />
          </View>
          <Text style={styles.progressText}>{score.toFixed(0)}%</Text>
        </View>
      </View>
    );
  };

  // Calculate overall average score
  const averageScore = strokeData
    ? Object.values(strokeData).reduce((sum, metrics) => sum + (metrics.rehab_score ?? 0), 0) / Object.keys(strokeData).length
    : 0;

  const overallColor = getScoreColor(averageScore);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <IconSymbol size={32} name="hand.raised.fill" color="#4CAF50" />
        <View style={styles.headerText}>
          <Text style={styles.title}>Stroke Rehabilitation</Text>
          <Text style={styles.subtitle}>Session: {Math.floor(sessionDuration / 60)}:{(sessionDuration % 60).toString().padStart(2, '0')}</Text>
        </View>
      </View>

      {/* Overall Score Card */}
      <View style={[styles.overallCard, { borderLeftColor: overallColor }]}>
        <Text style={styles.overallLabel}>Overall Rehab Score</Text>
        <Text style={[styles.overallScore, { color: overallColor }]}>
          {averageScore.toFixed(1)}
        </Text>
        <Text style={styles.overallStatus}>{getScoreLabel(averageScore)}</Text>
      </View>

      <ScrollView style={styles.content}>
        {/* Finger-by-Finger Analysis */}
        <Text style={styles.sectionTitle}>Finger Analysis</Text>
        {strokeData && Object.entries(strokeData).map(([fingerName, metrics], index) =>
          renderFingerMetrics(fingerName, metrics, index)
        )}

        {!strokeData && (
          <View style={styles.placeholderCard}>
            <IconSymbol size={48} name="hand.raised" color="#ccc" />
            <Text style={styles.placeholderText}>Waiting for rehabilitation data...</Text>
          </View>
        )}

        {/* Current Sensor Readings */}
        <Text style={styles.sectionTitle}>Live Sensor Data</Text>
        <View style={styles.sensorsCard}>
          {values.map((value, index) => (
            <View key={index} style={styles.sensorItem}>
              <Text style={styles.sensorLabel}>{FINGER_NAMES[index]}</Text>
              <View style={[styles.sensorBar, { width: `${value * 100}%` }]} />
              <Text style={styles.sensorValue}>{value.toFixed(2)}</Text>
            </View>
          ))}
        </View>

        {/* Exercise Guide */}
        <View style={styles.guideCard}>
          <Text style={styles.guideTitle}>💡 Rehab Tips</Text>
          <Text style={styles.guideText}>
            • Higher ROM = Better mobility recovery{'\n'}
            • Higher velocity = Faster, more controlled movements{'\n'}
            • Lower jerk = Smoother, less shaky movements{'\n'}
            • Target score above 75 for optimal recovery
          </Text>
        </View>
      </ScrollView>

      <TouchableOpacity style={styles.actionButton} onPress={() => setSessionStartTime(Date.now())}>
        <IconSymbol size={24} name="arrow.clockwise" color="#fff" />
        <Text style={styles.buttonText}>Reset Session</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    gap: 12,
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  subtitle: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  overallCard: {
    backgroundColor: '#fff',
    padding: 20,
    margin: 16,
    marginBottom: 8,
    borderRadius: 12,
    alignItems: 'center',
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  overallLabel: {
    fontSize: 14,
    color: '#999',
    marginBottom: 8,
  },
  overallScore: {
    fontSize: 48,
    fontWeight: 'bold',
  },
  overallStatus: {
    fontSize: 16,
    color: '#666',
    marginTop: 4,
  },
  content: {
    flex: 1,
    padding: 16,
    paddingTop: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
    marginTop: 8,
  },
  fingerCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  fingerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  fingerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  scoreBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  scoreText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  scoreLabel: {
    fontSize: 12,
    color: '#999',
    marginBottom: 12,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
  },
  metricItem: {
    width: '25%',
    alignItems: 'center',
    paddingVertical: 8,
  },
  metricLabel: {
    fontSize: 10,
    color: '#999',
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  progressBar: {
    flex: 1,
    height: 8,
    backgroundColor: '#f0f0f0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    width: 40,
    textAlign: 'right',
  },
  placeholderCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 40,
    alignItems: 'center',
    marginBottom: 16,
  },
  placeholderText: {
    fontSize: 14,
    color: '#999',
    marginTop: 12,
  },
  sensorsCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  sensorItem: {
    marginBottom: 12,
  },
  sensorLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  sensorBar: {
    height: 8,
    backgroundColor: '#4CAF50',
    borderRadius: 4,
    marginBottom: 4,
  },
  sensorValue: {
    fontSize: 12,
    color: '#333',
    fontWeight: '600',
  },
  guideCard: {
    backgroundColor: '#e8f5e9',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  guideTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2E7D32',
    marginBottom: 8,
  },
  guideText: {
    fontSize: 14,
    color: '#2E7D32',
    lineHeight: 20,
  },
  actionButton: {
    backgroundColor: '#4CAF50',
    padding: 16,
    margin: 16,
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
