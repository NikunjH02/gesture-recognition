import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { StrokeData, FingerMetrics } from '../types/healthMonitoring';

interface FingerRehabDisplayProps {
  values: number[];
  strokeData?: StrokeData;
}

interface RehabAlert {
  type: 'warning' | 'success' | 'info';
  message: string;
  finger?: string;
}

interface FingerSampleData {
  Thumb: number[];
  Index: number[];
  Middle: number[];
  Ring: number[];
  Pinky: number[];
}

const FINGER_NAMES = ['Thumb', 'Index', 'Middle', 'Ring', 'Pinky'];
const SESSION_DURATION = 30; // seconds

export default function FingerRehabDisplay({ values, strokeData }: FingerRehabDisplayProps) {
  const [sessionActive, setSessionActive] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(SESSION_DURATION);
  const [progress, setProgress] = useState(0);
  const [collectedData, setCollectedData] = useState<FingerSampleData>({
    Thumb: [],
    Index: [],
    Middle: [],
    Ring: [],
    Pinky: []
  });
  const [sessionResults, setSessionResults] = useState<StrokeData | null>(null);
  const [overallScore, setOverallScore] = useState<number>(0);
  const [overallStatus, setOverallStatus] = useState<string>('');
  const [alerts, setAlerts] = useState<RehabAlert[]>([]);
  
  const sessionStartTimeRef = useRef<number | null>(null);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const dataCollectionCountRef = useRef<number>(0);
  const valuesStringRef = useRef<string>('');
  const collectedDataRef = useRef<FingerSampleData>({
    Thumb: [],
    Index: [],
    Middle: [],
    Ring: [],
    Pinky: []
  });

  // Debug: Log when values prop changes
  useEffect(() => {
    const valuesString = JSON.stringify(values);
    if (valuesString !== valuesStringRef.current) {
      valuesStringRef.current = valuesString;
      if (sessionActive) {
        console.log('📊 Values changed during session:', values);
      }
    }
  }, [values, sessionActive]);

  // Collect data during active session
  useEffect(() => {
    if (sessionActive && values && values.length >= 5) {
      dataCollectionCountRef.current += 1;
      
      // Log first collection to verify it's working
      if (dataCollectionCountRef.current === 1) {
        console.log('🎯 First data collection! Values:', values);
      }
      
      // Update ref immediately
      collectedDataRef.current = {
        Thumb: [...collectedDataRef.current.Thumb, values[0]],
        Index: [...collectedDataRef.current.Index, values[1]],
        Middle: [...collectedDataRef.current.Middle, values[2]],
        Ring: [...collectedDataRef.current.Ring, values[3]],
        Pinky: [...collectedDataRef.current.Pinky, values[4]]
      };
      
      // Update state for UI
      setCollectedData(collectedDataRef.current);
      
      const currentCount = collectedDataRef.current.Thumb.length;
      
      // Log every 50 samples to avoid spam
      if (currentCount % 50 === 0) {
        console.log(`✅ Collected ${currentCount} samples. Current values:`, values);
      }
      
      // Log at specific points to track collection
      if (currentCount === 10) {
        console.log('📈 10 samples collected:', collectedDataRef.current.Thumb);
      }
    }
  }, [values, sessionActive]);

  // Timer countdown
  useEffect(() => {
    if (sessionActive && sessionStartTimeRef.current) {
      timerIntervalRef.current = setInterval(() => {
        const elapsed = (Date.now() - sessionStartTimeRef.current!) / 1000;
        const remaining = Math.max(0, SESSION_DURATION - elapsed);
        const currentProgress = (elapsed / SESSION_DURATION) * 100;
        
        setTimeRemaining(Math.ceil(remaining));
        setProgress(Math.min(100, currentProgress));
        
        if (remaining <= 0) {
          endSession();
        }
      }, 100);

      return () => {
        if (timerIntervalRef.current) {
          clearInterval(timerIntervalRef.current);
        }
      };
    }
  }, [sessionActive]);

  // Metrics calculation functions
  const meanMinMaxROM = (arr: number[]) => {
    if (arr.length === 0) return { mean: 0, min: 0, max: 0, rom: 0 };
    const mean = arr.reduce((sum, val) => sum + val, 0) / arr.length;
    const min = Math.min(...arr);
    const max = Math.max(...arr);
    const rom = max - min;
    
    // Normalize ROM to 0-1 range based on typical ADC values (40000-60000 range)
    const normalizedROM = Math.min(1.0, rom / 20000); // 20000 is full range movement
    
    return { mean, min, max, rom: normalizedROM };
  };

  const velocityStats = (arr: number[], dt: number = 0.33) => {
    if (arr.length < 2) return { peakVel: 0, medianVel: 0 };
    
    const velocities = [];
    for (let i = 1; i < arr.length; i++) {
      velocities.push(Math.abs((arr[i] - arr[i - 1]) / dt));
    }
    
    const peakVel = Math.max(...velocities);
    const sortedVel = [...velocities].sort((a, b) => a - b);
    const medianVel = sortedVel[Math.floor(sortedVel.length / 2)];
    
    // Normalize velocity to 0-1 range (typical peak velocity ~5000-10000 for ADC)
    const normalizedPeakVel = Math.min(1.0, peakVel / 10000);
    const normalizedMedianVel = Math.min(1.0, medianVel / 5000);
    
    return { 
      peakVel: normalizedPeakVel, 
      medianVel: normalizedMedianVel 
    };
  };

  const jerkMetric = (arr: number[], dt: number = 0.033) => {
    if (arr.length < 3) return 0;
    
    // Calculate velocities
    const velocities = [];
    for (let i = 1; i < arr.length; i++) {
      velocities.push((arr[i] - arr[i - 1]) / dt);
    }
    
    // Calculate jerk (rate of change of velocity)
    const jerks = [];
    for (let i = 1; i < velocities.length; i++) {
      jerks.push(Math.abs((velocities[i] - velocities[i - 1]) / dt));
    }
    
    const avgJerk = jerks.reduce((sum, val) => sum + val, 0) / jerks.length;
    
    // Normalize jerk to 0-1 range (typical jerk ~100000-500000 for ADC)
    // Lower jerk is better (smoother movement)
    const normalizedJerk = Math.min(1.0, avgJerk / 300000);
    
    return normalizedJerk;
  };

  const analyzeFingerData = (samples: number[], fingerName: string) => {
    if (samples.length < 3) {
      return {
        mean: 0,
        ROM: 0,
        peak_vel: 0,
        median_vel: 0,
        jerk: 0,
        rehab_score: 0,
        alerts: []
      };
    }

    const { mean, rom } = meanMinMaxROM(samples);
    const { peakVel, medianVel } = velocityStats(samples);
    const jerk = jerkMetric(samples);

    // All values are now normalized 0-1
    // rom: 0-1 (higher is better)
    // peakVel: 0-1 (higher is better) 
    // jerk: 0-1 (lower is better, so we use 1-jerk for smoothness)

    const smoothness = 1 - jerk;

    // Calculate rehab score: 50% ROM, 30% velocity, 20% smoothness
    // All components are 0-1, so final score will be 0-100
    const score = Math.min(100, (0.5 * rom + 0.3 * peakVel + 0.2 * smoothness) * 100);
    
    console.log(`[${fingerName}] ROM: ${(rom * 100).toFixed(1)}%, Vel: ${(peakVel * 100).toFixed(1)}%, Smooth: ${(smoothness * 100).toFixed(1)}% => Score: ${score.toFixed(1)}`);

    // Generate alerts based on normalized values
    const fingerAlerts: RehabAlert[] = [];
    
    if (rom < 0.3) {
      fingerAlerts.push({ 
        type: 'warning', 
        message: `Low ROM (${(rom * 100).toFixed(0)}%) - try stretching more`,
        finger: fingerName 
      });
    } else if (rom > 0.7) {
      fingerAlerts.push({ 
        type: 'success', 
        message: `Excellent ROM (${(rom * 100).toFixed(0)}%)!`,
        finger: fingerName 
      });
    }

    if (peakVel < 0.3) {
      fingerAlerts.push({ 
        type: 'warning', 
        message: `Slow movement (${(peakVel * 100).toFixed(0)}%) - try moving faster`,
        finger: fingerName 
      });
    } else if (peakVel > 0.7) {
      fingerAlerts.push({ 
        type: 'success', 
        message: `Great speed (${(peakVel * 100).toFixed(0)}%)!`,
        finger: fingerName 
      });
    }

    if (smoothness < 0.4) {
      fingerAlerts.push({ 
        type: 'warning', 
        message: `Shaky movement (${(smoothness * 100).toFixed(0)}% smooth) - try smoother motions`,
        finger: fingerName 
      });
    } else if (smoothness > 0.8) {
      fingerAlerts.push({ 
        type: 'success', 
        message: `Very smooth movement (${(smoothness * 100).toFixed(0)}%)!`,
        finger: fingerName 
      });
    }

    return {
      mean,
      ROM: rom, // 0-1 normalized
      peak_vel: peakVel, // 0-1 normalized
      median_vel: medianVel, // 0-1 normalized
      jerk: smoothness, // Return smoothness (0-1, higher is better)
      rehab_score: score, // 0-100
      alerts: fingerAlerts
    };
  };

  const startSession = () => {
    console.log('🚀 Starting rehab session...');
    console.log('Current values prop:', values);
    
    // Reset refs
    collectedDataRef.current = {
      Thumb: [],
      Index: [],
      Middle: [],
      Ring: [],
      Pinky: []
    };
    
    setSessionActive(true);
    setTimeRemaining(SESSION_DURATION);
    setProgress(0);
    setSessionResults(null);
    setAlerts([]);
    setCollectedData({
      Thumb: [],
      Index: [],
      Middle: [],
      Ring: [],
      Pinky: []
    });
    dataCollectionCountRef.current = 0;
    sessionStartTimeRef.current = Date.now();
    
    console.log('✅ Session state set to active');
    
    Alert.alert(
      'Session Started',
      'Open and close your hand repeatedly with full stretch for 30 seconds!'
    );
  };

  const endSession = () => {
    setSessionActive(false);
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
    }

    console.log('=== SESSION ENDED ===');
    
    // Use ref data instead of state
    const dataToAnalyze = collectedDataRef.current;
    
    console.log('Collected data from ref:', {
      Thumb: dataToAnalyze.Thumb.length,
      Index: dataToAnalyze.Index.length,
      Middle: dataToAnalyze.Middle.length,
      Ring: dataToAnalyze.Ring.length,
      Pinky: dataToAnalyze.Pinky.length
    });

    // Show first few samples for debugging
    console.log('Sample values (first 5):', {
      Thumb: dataToAnalyze.Thumb.slice(0, 5),
      Index: dataToAnalyze.Index.slice(0, 5)
    });

    // Analyze all collected data
    const results: any = {};
    const allAlerts: RehabAlert[] = [];
    let totalScore = 0;
    let fingerCount = 0;

    Object.entries(dataToAnalyze).forEach(([fingerName, samples]) => {
      if (samples.length > 0) {
        const analysis = analyzeFingerData(samples, fingerName);
        results[fingerName] = analysis;
        allAlerts.push(...analysis.alerts);
        totalScore += analysis.rehab_score;
        fingerCount++;
        console.log(`${fingerName}: Score=${analysis.rehab_score.toFixed(2)}, ROM=${analysis.ROM.toFixed(3)}`);
      }
    });

    const avgScore = fingerCount > 0 ? totalScore / fingerCount : 0;
    console.log(`Overall Score: ${avgScore.toFixed(2)} (from ${fingerCount} fingers)`);
    
    let status = '';
    if (avgScore >= 75) status = 'Excellent';
    else if (avgScore >= 50) status = 'Good';
    else if (avgScore >= 25) status = 'Fair';
    else status = 'Needs Improvement';

    setSessionResults(results);
    setOverallScore(avgScore);
    setOverallStatus(status);
    setAlerts(allAlerts);

    Alert.alert(
      'Session Complete!',
      `Overall Score: ${avgScore.toFixed(1)} - ${status}\nCollected ${dataToAnalyze.Thumb.length} samples per finger`
    );
  };

  const cancelSession = () => {
    setSessionActive(false);
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
    }
    
    // Reset ref
    collectedDataRef.current = {
      Thumb: [],
      Index: [],
      Middle: [],
      Ring: [],
      Pinky: []
    };
    
    setCollectedData({
      Thumb: [],
      Index: [],
      Middle: [],
      Ring: [],
      Pinky: []
    });
    Alert.alert('Session Cancelled', 'Rehabilitation session has been cancelled.');
  };

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

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'success': return '✅';
      case 'warning': return '⚠️';
      default: return 'ℹ️';
    }
  };

  const getAlertColor = (type: string) => {
    switch (type) {
      case 'success': return '#4CAF50';
      case 'warning': return '#FF9800';
      default: return '#2196F3';
    }
  };

  const renderFingerMetrics = (fingerName: string, metrics: FingerMetrics, index: number) => {
    const score = metrics.rehab_score ?? 0;
    const scoreColor = getScoreColor(score);
    const scoreLabel = getScoreLabel(score);
    
    // Filter alerts for this finger
    const fingerAlerts = metrics.alerts || [];

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
            <Text style={[styles.metricValue, { color: scoreColor }]}>{((metrics.ROM ?? 0) * 100).toFixed(0)}%</Text>
          </View>
          <View style={styles.metricItem}>
            <Text style={styles.metricLabel}>Velocity</Text>
            <Text style={[styles.metricValue, { color: scoreColor }]}>{((metrics.peak_vel ?? 0) * 100).toFixed(0)}%</Text>
          </View>
          <View style={styles.metricItem}>
            <Text style={styles.metricLabel}>Smoothness</Text>
            <Text style={[styles.metricValue, { color: scoreColor }]}>{((metrics.jerk ?? 0) * 100).toFixed(0)}%</Text>
          </View>
        </View>

        {/* Progress bar */}
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${score}%`, backgroundColor: scoreColor }]} />
          </View>
          <Text style={styles.progressText}>{score.toFixed(0)}%</Text>
        </View>

        {/* Inline alerts for this finger */}
        {fingerAlerts.length > 0 && (
          <View style={styles.fingerAlertsContainer}>
            {fingerAlerts.map((alert, idx) => (
              <View 
                key={idx} 
                style={[styles.inlineAlert, { borderLeftColor: getAlertColor(alert.type) }]}
              >
                <Text style={styles.inlineAlertIcon}>{getAlertIcon(alert.type)}</Text>
                <Text style={styles.inlineAlertText}>{alert.message}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
    );
  };

  // Calculate overall average score
  const displayScore = sessionResults 
    ? overallScore
    : (strokeData ? Object.values(strokeData).reduce((sum, metrics) => sum + (metrics.rehab_score ?? 0), 0) / Object.keys(strokeData).length : 0);

  const overallColor = getScoreColor(displayScore);
  const displayData = sessionResults || strokeData;
  const displayStatus = sessionResults ? overallStatus : getScoreLabel(displayScore);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <IconSymbol size={32} name="hand.raised.fill" color="#4CAF50" />
        <View style={styles.headerText}>
          <Text style={styles.title}>Finger Rehabilitation</Text>
          <Text style={styles.subtitle}>
            {sessionActive 
              ? `Time Remaining: ${Math.floor(timeRemaining / 60)}:${(timeRemaining % 60).toString().padStart(2, '0')}`
              : 'Ready to start'}
          </Text>
        </View>
      </View>

      {/* Session Timer Display */}
      {sessionActive && (
        <View style={styles.timerCard}>
          <Text style={styles.timerTitle}>Session in Progress</Text>
          <Text style={styles.timerText}>{timeRemaining}s</Text>
          <View style={styles.timerProgressBar}>
            <View style={[styles.timerProgressFill, { width: `${progress}%` }]} />
          </View>
          <Text style={styles.timerInstruction}>
            Open and close your hand repeatedly with full stretch!
          </Text>
          <Text style={styles.sampleCount}>
            Samples collected: {collectedData.Thumb.length}
          </Text>
          <View style={styles.timerButtons}>
            <TouchableOpacity style={styles.endButton} onPress={endSession}>
              <Text style={styles.buttonText}>End Session</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelButton} onPress={cancelSession}>
              <Text style={styles.buttonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Overall Score Card */}
      <View style={[styles.overallCard, { borderLeftColor: overallColor }]}>
        <Text style={styles.overallLabel}>Overall Rehab Score</Text>
        <Text style={[styles.overallScore, { color: overallColor }]}>
          {displayScore.toFixed(1)}
        </Text>
        <Text style={styles.overallStatus}>{displayStatus}</Text>
      </View>

      <ScrollView style={styles.content}>
        {/* Finger-by-Finger Analysis */}
        <Text style={styles.sectionTitle}>Finger Analysis</Text>
        {displayData && Object.entries(displayData).map(([fingerName, metrics], index) =>
          renderFingerMetrics(fingerName, metrics, index)
        )}

        {!displayData && !sessionActive && (
          <View style={styles.placeholderCard}>
            <IconSymbol size={48} name="hand.raised" color="#ccc" />
            <Text style={styles.placeholderText}>Start a session to analyze your rehabilitation progress</Text>
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
            • ROM (Range of Motion): Higher is better - aim for 70%+{'\n'}
            • Velocity: Higher is better - aim for 60%+{'\n'}
            • Smoothness: Higher is better - aim for 70%+{'\n'}
            • Overall Score: Target 75+ for optimal recovery (max 100)
          </Text>
        </View>
      </ScrollView>

      {!sessionActive && (
        <TouchableOpacity 
          style={styles.actionButton} 
          onPress={startSession}
        >
          <IconSymbol size={24} name="play.circle.fill" color="#fff" />
          <Text style={styles.buttonText}>Start 30s Rehab Session</Text>
        </TouchableOpacity>
      )}
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
    padding: 14,
    marginBottom: 10,
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
    gap: 8,
  },
  metricItem: {
    width: '30%',
    alignItems: 'center',
    paddingVertical: 8,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
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
  fingerAlertsContainer: {
    marginTop: 12,
    gap: 6,
  },
  inlineAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 8,
    borderLeftWidth: 3,
    gap: 8,
  },
  inlineAlertIcon: {
    fontSize: 14,
  },
  inlineAlertText: {
    flex: 1,
    fontSize: 12,
    color: '#555',
    lineHeight: 16,
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
  timerCard: {
    backgroundColor: '#fff',
    padding: 20,
    margin: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  timerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  timerText: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginBottom: 16,
  },
  timerProgressBar: {
    width: '100%',
    height: 12,
    backgroundColor: '#f0f0f0',
    borderRadius: 6,
    overflow: 'hidden',
    marginBottom: 16,
  },
  timerProgressFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
  },
  timerInstruction: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 8,
  },
  sampleCount: {
    fontSize: 12,
    color: '#999',
    marginBottom: 16,
  },
  timerButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  endButton: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  cancelButton: {
    backgroundColor: '#FF5252',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  alertsSection: {
    marginBottom: 16,
  },
  alertCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  alertIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  alertContent: {
    flex: 1,
  },
  alertFinger: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    marginBottom: 2,
  },
  alertMessage: {
    fontSize: 14,
    color: '#333',
  },
});

