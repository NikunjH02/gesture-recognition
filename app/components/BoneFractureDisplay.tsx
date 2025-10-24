import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Dimensions } from 'react-native';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { FractureData, DataPoint } from '../types/healthMonitoring';

interface BoneFractureDisplayProps {
  values: number[];
  fractureData?: FractureData;
}

const ALERT_THRESHOLD_PERCENT = 10; // 10% deviation threshold
const CHART_WIDTH = Dimensions.get('window').width - 64;
const CHART_HEIGHT = 150;
const MAX_HISTORY_POINTS = 30; // Show last 30 data points

const FINGER_NAMES = ['Thumb', 'Index', 'Middle', 'Ring', 'Pinky'];

interface FingerData {
  baseline: number;
  current: number;
  history: DataPoint[];
  alert: boolean;
}

export default function BoneFractureDisplay({ values }: BoneFractureDisplayProps) {
  const [selectedFingerIndex, setSelectedFingerIndex] = useState<number>(0);
  const [fingerDataMap, setFingerDataMap] = useState<Map<number, FingerData>>(new Map());
  const [isCalibrating, setIsCalibrating] = useState<boolean>(true);

  // Initialize baseline values when component mounts
  useEffect(() => {
    if (values && values.length > 0 && isCalibrating) {
      const newMap = new Map<number, FingerData>();
      values.forEach((value, index) => {
        newMap.set(index, {
          baseline: value,
          current: value,
          history: [{ timestamp: Date.now(), value }],
          alert: false,
        });
      });
      setFingerDataMap(newMap);
      setIsCalibrating(false);
    }
  }, []);

  // Update finger data when values change
  useEffect(() => {
    if (!isCalibrating && values && values.length > 0) {
      setFingerDataMap(prevMap => {
        const newMap = new Map(prevMap);
        
        values.forEach((value, index) => {
          const existing = newMap.get(index);
          if (existing) {
            const baseline = existing.baseline;
            const deviationPercent = Math.abs(((value - baseline) / baseline) * 100);
            const alert = deviationPercent > ALERT_THRESHOLD_PERCENT;
            
            // Add to history (keep last MAX_HISTORY_POINTS)
            const newHistory = [
              ...existing.history,
              { timestamp: Date.now(), value }
            ].slice(-MAX_HISTORY_POINTS);

            newMap.set(index, {
              baseline,
              current: value,
              history: newHistory,
              alert,
            });
          }
        });
        
        return newMap;
      });
    }
  }, [values, isCalibrating]);

  const handleRecalibrate = () => {
    setIsCalibrating(true);
    const newMap = new Map<number, FingerData>();
    values.forEach((value, index) => {
      newMap.set(index, {
        baseline: value,
        current: value,
        history: [{ timestamp: Date.now(), value }],
        alert: false,
      });
    });
    setFingerDataMap(newMap);
    setIsCalibrating(false);
  };

  const selectedFingerData = fingerDataMap.get(selectedFingerIndex);
  const showAlert = selectedFingerData?.alert ?? false;
  const baseline = selectedFingerData?.baseline ?? 0;
  const current = selectedFingerData?.current ?? 0;
  const history = selectedFingerData?.history ?? [];
  
  const deviation = current - baseline;
  const deviationPercent = baseline !== 0 ? ((deviation / baseline) * 100) : 0;

  // Chart renderer for real-time data
  const renderChart = () => {
    if (history.length < 2) {
      return (
        <View style={styles.emptyChart}>
          <Text style={styles.emptyChartText}>Collecting data...</Text>
        </View>
      );
    }

    const values = history.map(p => p.value);
    const minValue = Math.min(...values);
    const maxValue = Math.max(...values);
    const range = maxValue - minValue || 1;

    // Calculate threshold boundaries (10% from baseline)
    const upperThreshold = baseline * 1.1;
    const lowerThreshold = baseline * 0.9;

    const points = history.map((point, index) => {
      const x = (index / (history.length - 1)) * CHART_WIDTH;
      const normalizedValue = ((point.value - minValue) / range);
      const y = CHART_HEIGHT - (normalizedValue * CHART_HEIGHT);
      return { x, y, value: point.value };
    });

    // Calculate threshold line positions
    const baselineY = CHART_HEIGHT - (((baseline - minValue) / range) * CHART_HEIGHT);
    const upperThresholdY = CHART_HEIGHT - (((upperThreshold - minValue) / range) * CHART_HEIGHT);
    const lowerThresholdY = CHART_HEIGHT - (((lowerThreshold - minValue) / range) * CHART_HEIGHT);

    return (
      <View style={styles.chartContainer}>
        {/* Threshold lines */}
        <View style={[styles.thresholdLine, { top: upperThresholdY }]} />
        <View style={[styles.thresholdLine, { top: lowerThresholdY }]} />
        
        {/* Baseline */}
        <View style={[styles.baselineLine, { top: baselineY }]} />
        
        {/* Data line */}
        {points.map((point, index) => {
          if (index === 0) return null;
          const prevPoint = points[index - 1];
          const isAlert = point.value > upperThreshold || point.value < lowerThreshold;
          
          return (
            <View
              key={index}
              style={[
                styles.dataPoint,
                {
                  left: point.x,
                  top: point.y,
                  backgroundColor: isAlert ? '#FF5252' : '#4CAF50',
                },
              ]}
            />
          );
        })}
        
        {/* Value labels */}
        <View style={[styles.chartLabel, { top: 5, left: 5 }]}>
          <Text style={styles.chartLabelText}>{maxValue.toFixed(0)}</Text>
        </View>
        <View style={[styles.chartLabel, { bottom: 5, left: 5 }]}>
          <Text style={styles.chartLabelText}>{minValue.toFixed(0)}</Text>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <IconSymbol size={32} name="bandage.fill" color={showAlert ? "#FF5252" : "#007AFF"} />
        <Text style={styles.title}>Bone Fracture Monitor</Text>
      </View>

      {showAlert && (
        <View style={styles.alertBanner}>
          <IconSymbol size={24} name="exclamationmark.triangle.fill" color="#fff" />
          <Text style={styles.alertText}>⚠️ ALERT: Bone displacement detected for {FINGER_NAMES[selectedFingerIndex]}!</Text>
        </View>
      )}

      {/* Finger Selector Dropdown */}
      <View style={styles.fingerSelector}>
        <Text style={styles.selectorLabel}>Select Finger to Monitor:</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.fingerScroll}>
          {FINGER_NAMES.map((name, index) => {
            const fingerData = fingerDataMap.get(index);
            const isAlert = fingerData?.alert ?? false;
            return (
              <TouchableOpacity
                key={index}
                style={[
                  styles.fingerButton,
                  selectedFingerIndex === index && styles.fingerButtonActive,
                  isAlert && styles.fingerButtonAlert,
                ]}
                onPress={() => setSelectedFingerIndex(index)}
              >
                <Text style={[
                  styles.fingerButtonText,
                  selectedFingerIndex === index && styles.fingerButtonTextActive
                ]}>
                  {name}
                </Text>
                {isAlert && <Text style={styles.alertDot}>●</Text>}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
      
      <ScrollView style={styles.content}>
        {/* Status Card */}
        <View style={styles.statusCard}>
          <View style={styles.statusRow}>
            <View style={styles.statusItem}>
              <Text style={styles.statusLabel}>Status</Text>
              <Text style={[styles.statusValue, { color: showAlert ? '#FF5252' : '#4CAF50' }]}>
                {showAlert ? '⚠️ Alert' : '✅ Stable'}
              </Text>
            </View>
            <View style={styles.statusItem}>
              <Text style={styles.statusLabel}>Baseline</Text>
              <Text style={styles.statusValue}>{baseline.toFixed(0)}</Text>
            </View>
          </View>
          <View style={styles.statusRow}>
            <View style={styles.statusItem}>
              <Text style={styles.statusLabel}>Current Value</Text>
              <Text style={styles.statusValue}>{current.toFixed(0)}</Text>
            </View>
            <View style={styles.statusItem}>
              <Text style={styles.statusLabel}>Deviation</Text>
              <Text style={[styles.statusValue, { color: showAlert ? '#FF5252' : '#666' }]}>
                {deviationPercent.toFixed(2)}%
              </Text>
            </View>
          </View>
        </View>

        {/* Real-time Chart */}
        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>Real-time Sensor Values - {FINGER_NAMES[selectedFingerIndex]}</Text>
          <Text style={styles.chartSubtitle}>Live data stream (last {MAX_HISTORY_POINTS} readings)</Text>
          {renderChart()}
          <View style={styles.legendContainer}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#4CAF50' }]} />
              <Text style={styles.legendText}>Normal</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#FF5252' }]} />
              <Text style={styles.legendText}>Alert</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#666', width: 20, height: 2 }]} />
              <Text style={styles.legendText}>Baseline</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#FF9800', width: 20, height: 1 }]} />
              <Text style={styles.legendText}>±10% Threshold</Text>
            </View>
          </View>
        </View>

        {/* Metrics */}
        <View style={styles.metricsCard}>
          <Text style={styles.metricsTitle}>Monitoring Metrics</Text>
          <View style={styles.metricRow}>
            <Text style={styles.metricLabel}>Baseline Value:</Text>
            <Text style={styles.metricValue}>{baseline.toFixed(0)}</Text>
          </View>
          <View style={styles.metricRow}>
            <Text style={styles.metricLabel}>Current Value:</Text>
            <Text style={styles.metricValue}>{current.toFixed(0)}</Text>
          </View>
          <View style={styles.metricRow}>
            <Text style={styles.metricLabel}>Deviation:</Text>
            <Text style={styles.metricValue}>{deviation.toFixed(0)} ({deviationPercent.toFixed(2)}%)</Text>
          </View>
          <View style={styles.metricRow}>
            <Text style={styles.metricLabel}>Alert Threshold:</Text>
            <Text style={styles.metricValue}>±{ALERT_THRESHOLD_PERCENT}%</Text>
          </View>
          <View style={styles.metricRow}>
            <Text style={styles.metricLabel}>Safe Range:</Text>
            <Text style={styles.metricValue}>
              {(baseline * 0.9).toFixed(0)} - {(baseline * 1.1).toFixed(0)}
            </Text>
          </View>
        </View>

        {/* All Fingers Overview */}
        <View style={styles.sensorsCard}>
          <Text style={styles.sensorsTitle}>All Fingers Status</Text>
          <View style={styles.sensorsGrid}>
            {values.map((value, index) => {
              const fingerData = fingerDataMap.get(index);
              const isAlert = fingerData?.alert ?? false;
              return (
                <View key={index} style={[styles.sensorItem, isAlert && styles.sensorItemAlert]}>
                  <Text style={styles.sensorLabel}>{FINGER_NAMES[index]}</Text>
                  <Text style={[styles.sensorValue, { color: isAlert ? '#FF5252' : '#007AFF' }]}>
                    {value.toFixed(0)}
                  </Text>
                  {isAlert && <Text style={styles.sensorAlert}>⚠️</Text>}
                </View>
              );
            })}
          </View>
        </View>
      </ScrollView>

      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.actionButton} onPress={handleRecalibrate}>
          <IconSymbol size={24} name="arrow.clockwise" color="#fff" />
          <Text style={styles.buttonText}>Recalibrate Baseline</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f8f8',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    gap: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  alertBanner: {
    backgroundColor: '#FF5252',
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  alertText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  fingerSelector: {
    backgroundColor: '#fff',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  selectorLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  fingerScroll: {
    flexDirection: 'row',
  },
  fingerButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    marginRight: 8,
    borderWidth: 2,
    borderColor: 'transparent',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  fingerButtonActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  fingerButtonAlert: {
    backgroundColor: '#FFE5E5',
    borderColor: '#FF5252',
  },
  fingerButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  fingerButtonTextActive: {
    color: '#fff',
  },
  alertDot: {
    fontSize: 12,
    color: '#FF5252',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  statusCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  statusItem: {
    flex: 1,
  },
  statusLabel: {
    fontSize: 12,
    color: '#999',
    marginBottom: 4,
  },
  statusValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  chartCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  chartSubtitle: {
    fontSize: 12,
    color: '#999',
    marginBottom: 12,
  },
  chartContainer: {
    width: CHART_WIDTH,
    height: CHART_HEIGHT,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    position: 'relative',
    marginBottom: 12,
  },
  emptyChart: {
    width: CHART_WIDTH,
    height: CHART_HEIGHT,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyChartText: {
    fontSize: 14,
    color: '#999',
  },
  thresholdLine: {
    position: 'absolute',
    width: '100%',
    height: 1,
    backgroundColor: '#FF9800',
    opacity: 0.6,
  },
  baselineLine: {
    position: 'absolute',
    width: '100%',
    height: 2,
    backgroundColor: '#666',
  },
  dataPoint: {
    position: 'absolute',
    width: 6,
    height: 6,
    borderRadius: 3,
    marginLeft: -3,
    marginTop: -3,
  },
  chartLabel: {
    position: 'absolute',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  chartLabelText: {
    fontSize: 10,
    color: '#fff',
    fontWeight: '600',
  },
  legendContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  legendText: {
    fontSize: 12,
    color: '#666',
  },
  metricsCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  metricsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  metricLabel: {
    fontSize: 14,
    color: '#666',
  },
  metricValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  sensorsCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sensorsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  sensorsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  sensorItem: {
    width: '18%',
    backgroundColor: '#f5f5f5',
    padding: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  sensorItemAlert: {
    backgroundColor: '#FFE5E5',
    borderWidth: 2,
    borderColor: '#FF5252',
  },
  sensorLabel: {
    fontSize: 10,
    color: '#999',
    marginBottom: 4,
  },
  sensorValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  sensorAlert: {
    fontSize: 12,
    marginTop: 2,
  },
  buttonContainer: {
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  actionButton: {
    backgroundColor: '#007AFF',
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
