import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Dimensions } from 'react-native';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { ParkinsonData, FingerMetrics } from '../types/healthMonitoring';
import { API_URL } from '@/src/constants/api';

interface ParkinsonMonitorDisplayProps {
  values: number[];
  parkinsonData?: ParkinsonData;
}

interface ParkinsonAlert {
  type: 'warning' | 'danger' | 'success';
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

interface FingerMetricsExtended {
  mean: number;
  rom: number;
  peakVel: number;
  medianVel: number;
  jerk: number;
  tremorPower: number;
  bradykinesiaScore: number;
  rigidityScore: number;
  overallScore: number;
  alerts: ParkinsonAlert[];
}

const FINGER_NAMES = ['Thumb', 'Index', 'Middle', 'Ring', 'Pinky'];
const SESSION_DURATION = 30; // seconds
const SAMPLING_RATE = 30; // Hz (approximate)
const CHART_WIDTH = Dimensions.get('window').width - 80;
const CHART_HEIGHT = 120;

// Thresholds based on medical research
const TREMOR_THRESHOLD = 0.20; // 20% energy in tremor band indicates tremor
const ROM_REDUCTION_THRESHOLD = 0.60; // Below 60% indicates reduced mobility
const VELOCITY_REDUCTION_THRESHOLD = 0.40; // Below 40% indicates bradykinesia

const FINGER_NAMES_FULL = ['Thumb', 'Index', 'Middle', 'Ring', 'Pinky'];

export default function ParkinsonMonitorDisplay({ values, parkinsonData }: ParkinsonMonitorDisplayProps) {
  const [sessionActive, setSessionActive] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(SESSION_DURATION);
  const [progress, setProgress] = useState(0);
  const [selectedFingerIndex, setSelectedFingerIndex] = useState<number>(0);
  
  const [collectedData, setCollectedData] = useState<FingerSampleData>({
    Thumb: [],
    Index: [],
    Middle: [],
    Ring: [],
    Pinky: []
  });
  
  const [sessionResults, setSessionResults] = useState<Map<string, FingerMetricsExtended>>(new Map());
  const [overallAssessment, setOverallAssessment] = useState<string>('');
  const [severityLevel, setSeverityLevel] = useState<'none' | 'mild' | 'moderate' | 'severe'>('none');
  const [alerts, setAlerts] = useState<ParkinsonAlert[]>([]);
  const [monitoringHistory, setMonitoringHistory] = useState<any[]>([]);
  
  const sessionStartTimeRef = useRef<number | null>(null);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const collectedDataRef = useRef<FingerSampleData>({
    Thumb: [],
    Index: [],
    Middle: [],
    Ring: [],
    Pinky: []
  });

  // Fetch monitoring history from server
  const fetchHistory = async () => {
    try {
      const response = await fetch(`http://${API_URL}/get_monitoring_history?type=parkinson&limit=10`);
      const data = await response.json();
      setMonitoringHistory(data);
    } catch (error) {
      console.error("Error fetching history:", error);
    }
  };

  // Initial data fetch
  useEffect(() => {
    fetchHistory();
  }, []);

  // Collect data during active session (like FingerRehabDisplay)
  useEffect(() => {
    if (sessionActive && values && values.length >= 5) {
      const newData = {
        Thumb: [...collectedDataRef.current.Thumb, values[0]],
        Index: [...collectedDataRef.current.Index, values[1]],
        Middle: [...collectedDataRef.current.Middle, values[2]],
        Ring: [...collectedDataRef.current.Ring, values[3]],
        Pinky: [...collectedDataRef.current.Pinky, values[4]]
      };
      
      collectedDataRef.current = newData;
      setCollectedData(newData);
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

  // FFT implementation for tremor detection
  const computeFFT = (samples: number[]): number[] => {
    const N = samples.length;
    if (N < 4) return [];
    
    // Simple DFT for frequency analysis
    const frequencies: number[] = [];
    const nyquist = SAMPLING_RATE / 2;
    
    for (let k = 0; k < N / 2; k++) {
      let real = 0;
      let imag = 0;
      
      for (let n = 0; n < N; n++) {
        const angle = (2 * Math.PI * k * n) / N;
        real += samples[n] * Math.cos(angle);
        imag -= samples[n] * Math.sin(angle);
      }
      
      const magnitude = Math.sqrt(real * real + imag * imag);
      frequencies.push(magnitude);
    }
    
    return frequencies;
  };

  // Calculate tremor band power (3-8 Hz) - simplified for ADC data
  const calculateTremorPower = (samples: number[]): number => {
    if (samples.length < 16) return 0; // Need minimum samples for meaningful FFT
    
    // Remove DC component (mean)
    const mean = samples.reduce((sum, val) => sum + val, 0) / samples.length;
    const demeaned = samples.map(val => val - mean);
    
    const fftResult = computeFFT(demeaned);
    if (fftResult.length === 0) return 0;
    
    const freqResolution = SAMPLING_RATE / samples.length;
    
    // Calculate power in tremor band (3-8 Hz)
    let tremorBandPower = 0;
    let totalPower = 0;
    
    fftResult.forEach((magnitude, index) => {
      const freq = index * freqResolution;
      const power = magnitude * magnitude;
      
      if (freq >= 3 && freq <= 8) {
        tremorBandPower += power;
      }
      
      if (freq >= 1 && freq <= 15) { // Consider 1-15 Hz as relevant movement range
        totalPower += power;
      }
    });
    
    // Return relative power in tremor band
    return totalPower > 0 ? tremorBandPower / totalPower : 0;
  };

  // Calculate Range of Motion (like FingerRehabDisplay)
  const calculateROM = (samples: number[]): number => {
    if (samples.length === 0) return 0;
    const min = Math.min(...samples);
    const max = Math.max(...samples);
    const rom = max - min;
    
    // Normalize ROM to 0-1 range based on typical ADC values (40000-60000 range)
    const normalizedROM = Math.min(1.0, rom / 20000); // 20000 is full range movement
    
    return normalizedROM;
  };

  // Calculate velocity metrics (like FingerRehabDisplay)
  const calculateVelocity = (samples: number[], dt: number = 0.033) => {
    if (samples.length < 2) return { peakVel: 0, medianVel: 0, avgVel: 0 };
    
    const velocities = [];
    for (let i = 1; i < samples.length; i++) {
      const vel = Math.abs((samples[i] - samples[i - 1]) / dt);
      velocities.push(vel);
    }
    
    const peakVel = Math.max(...velocities);
    const avgVel = velocities.reduce((sum, v) => sum + v, 0) / velocities.length;
    const sortedVel = [...velocities].sort((a, b) => a - b);
    const medianVel = sortedVel[Math.floor(sortedVel.length / 2)];
    
    // Normalize velocity to 0-1 range (typical peak velocity ~5000-10000 for ADC)
    const normalizedPeakVel = Math.min(1.0, peakVel / 10000);
    const normalizedMedianVel = Math.min(1.0, medianVel / 5000);
    const normalizedAvgVel = Math.min(1.0, avgVel / 5000);
    
    return {
      peakVel: normalizedPeakVel,
      medianVel: normalizedMedianVel,
      avgVel: normalizedAvgVel
    };
  };

  // Calculate jerk (smoothness of movement) - like FingerRehabDisplay
  const calculateJerk = (samples: number[], dt: number = 0.033): number => {
    if (samples.length < 3) return 0;
    
    // Calculate velocities
    const velocities = [];
    for (let i = 1; i < samples.length; i++) {
      velocities.push((samples[i] - samples[i - 1]) / dt);
    }
    
    // Calculate jerk (rate of change of velocity)
    const jerks = [];
    for (let i = 1; i < velocities.length; i++) {
      jerks.push(Math.abs((velocities[i] - velocities[i - 1]) / dt));
    }
    
    const avgJerk = jerks.reduce((sum, j) => sum + j, 0) / jerks.length;
    
    // Normalize jerk to 0-1 range (typical jerk ~100000-500000 for ADC)
    // Lower jerk is better (smoother movement)
    const normalizedJerk = Math.min(1.0, avgJerk / 300000);
    
    // Return smoothness score (1 = smooth, 0 = jerky)
    return 1.0 - normalizedJerk;
  };

  // Analyze finger data for Parkinson's symptoms (simplified like other displays)
  const analyzeFingerData = (samples: number[], fingerName: string): FingerMetricsExtended => {
    if (samples.length < 10) {
      return {
        mean: 0,
        rom: 0,
        peakVel: 0,
        medianVel: 0,
        jerk: 0,
        tremorPower: 0,
        bradykinesiaScore: 0,
        rigidityScore: 0,
        overallScore: 0,
        alerts: []
      };
    }

    const mean = samples.reduce((sum, val) => sum + val, 0) / samples.length;
    const rom = calculateROM(samples);
    const { peakVel, medianVel, avgVel } = calculateVelocity(samples);
    const jerk = calculateJerk(samples);
    const tremorPower = calculateTremorPower(samples);
    
    const alerts: ParkinsonAlert[] = [];
    
    // Tremor detection
    if (tremorPower > TREMOR_THRESHOLD) {
      const tremorPercent = (tremorPower * 100).toFixed(1);
      alerts.push({
        type: 'danger',
        message: `Tremor detected: ${tremorPercent}% energy in 3-8Hz band`,
        finger: fingerName
      });
    }
    
    // Bradykinesia (slowness) detection
    const bradykinesiaScore = 1.0 - avgVel; // Lower velocity = higher bradykinesia
    if (avgVel < VELOCITY_REDUCTION_THRESHOLD) {
      alerts.push({
        type: 'warning',
        message: `Bradykinesia: Reduced movement speed detected`,
        finger: fingerName
      });
    }
    
    // Rigidity detection (reduced ROM)
    const rigidityScore = 1.0 - rom; // Lower ROM = higher rigidity
    if (rom < ROM_REDUCTION_THRESHOLD) {
      alerts.push({
        type: 'warning',
        message: `Rigidity: Reduced range of motion detected`,
        finger: fingerName
      });
    }
    
    // Movement smoothness
    if (jerk < 0.5) {
      alerts.push({
        type: 'warning',
        message: `Jerky movement: Reduced movement smoothness`,
        finger: fingerName
      });
    }
    
    // Overall Parkinson's score (0-1, higher = more symptoms)
    const overallScore = (
      tremorPower * 0.35 +        // 35% weight on tremor
      bradykinesiaScore * 0.30 +  // 30% weight on slowness
      rigidityScore * 0.25 +      // 25% weight on rigidity
      (1.0 - jerk) * 0.10         // 10% weight on jerkiness
    );
    
    return {
      mean,
      rom,
      peakVel,
      medianVel,
      jerk,
      tremorPower,
      bradykinesiaScore,
      rigidityScore,
      overallScore,
      alerts
    };
  };

  const startSession = () => {
    collectedDataRef.current = {
      Thumb: [],
      Index: [],
      Middle: [],
      Ring: [],
      Pinky: []
    };
    setCollectedData(collectedDataRef.current);
    setSessionResults(new Map());
    setAlerts([]);
    setSessionActive(true);
    setTimeRemaining(SESSION_DURATION);
    setProgress(0);
    sessionStartTimeRef.current = Date.now();
  };

  const endSession = () => {
    setSessionActive(false);
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
    }
    
    const results = new Map<string, FingerMetricsExtended>();
    const allAlerts: ParkinsonAlert[] = [];
    let totalScore = 0;
    let fingerCount = 0;
    
    FINGER_NAMES_FULL.forEach((fingerName, index) => {
      const samples = collectedDataRef.current[fingerName as keyof FingerSampleData];
      
      if (samples.length >= 10) { // Need minimum samples
        const metrics = analyzeFingerData(samples, fingerName);
        results.set(fingerName, metrics);
        allAlerts.push(...metrics.alerts);
        totalScore += metrics.overallScore;
        fingerCount++;
      }
    });
    
    setSessionResults(results);
    setAlerts(allAlerts);
    
    // Determine overall severity
    const avgScore = fingerCount > 0 ? totalScore / fingerCount : 0;
    
    if (avgScore < 0.15) {
      setSeverityLevel('none');
      setOverallAssessment('No significant Parkinson\'s symptoms detected. Movement appears normal.');
    } else if (avgScore < 0.35) {
      setSeverityLevel('mild');
      setOverallAssessment('Mild symptoms detected. Monitor regularly and consult healthcare provider.');
    } else if (avgScore < 0.60) {
      setSeverityLevel('moderate');
      setOverallAssessment('Moderate symptoms present. Medical consultation recommended.');
    } else {
      setSeverityLevel('severe');
      setOverallAssessment('Significant symptoms detected. Immediate medical attention advised.');
    }

    // Save to backend
    const saveParkinsonData = async () => {
      try {
        const fingerScoresMap: {[key: string]: number} = {};
        results.forEach((metrics, finger) => {
          fingerScoresMap[finger] = metrics.overallScore;
        });

        await fetch(`http://${API_URL}/save_monitoring_data`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            monitoring_type: 'parkinson',
            overall_score: avgScore,
            finger_scores: fingerScoresMap,
            finger_type: 'All',
            timestamp: Date.now()
          })
        });
        fetchHistory();
      } catch (error) {
        console.error("Error saving parkinson data:", error);
      }
    };
    saveParkinsonData();
  };

  const selectedFingerName = FINGER_NAMES_FULL[selectedFingerIndex];
  const selectedMetrics = sessionResults.get(selectedFingerName);
  const currentSamples = collectedData[selectedFingerName as keyof FingerSampleData];

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <IconSymbol size={32} name="waveform.path.ecg" color="#FF6B6B" />
        <Text style={styles.title}>Parkinson's Disease Monitor</Text>
      </View>

      {/* Info Card */}
      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>📊 Monitored Symptoms</Text>
        <Text style={styles.infoText}>• Tremor (3-8 Hz oscillations)</Text>
        <Text style={styles.infoText}>• Bradykinesia (movement slowness)</Text>
        <Text style={styles.infoText}>• Rigidity (reduced range of motion)</Text>
        <Text style={styles.infoText}>• Movement smoothness (jerk analysis)</Text>
      </View>

      {/* Session Control */}
      <View style={styles.sessionCard}>
        {!sessionActive && sessionResults.size === 0 && (
          <TouchableOpacity style={styles.startButton} onPress={startSession}>
            <IconSymbol size={24} name="play.circle.fill" color="#fff" />
            <Text style={styles.startButtonText}>Start Assessment</Text>
          </TouchableOpacity>
        )}

        {sessionActive && (
          <View style={styles.activeSession}>
            <Text style={styles.sessionTitle}>📈 Assessment in Progress</Text>
            <Text style={styles.timerText}>{timeRemaining}s remaining</Text>
            
            <View style={styles.progressBarContainer}>
              <View style={[styles.progressBar, { width: `${progress}%` }]} />
            </View>
            
            <Text style={styles.instructionText}>
              Perform regular finger movements - open and close your hand naturally
            </Text>
            
            <Text style={styles.sampleCount}>
              Samples collected: {currentSamples.length}
            </Text>
          </View>
        )}

        {!sessionActive && sessionResults.size > 0 && (
          <TouchableOpacity style={styles.restartButton} onPress={startSession}>
            <IconSymbol size={20} name="arrow.clockwise" color="#FF6B6B" />
            <Text style={styles.restartButtonText}>Restart Assessment</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* History Section */}
      <View style={styles.historyCard}>
        <Text style={styles.historyTitle}>Assessment History</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.historyScroll}>
          {monitoringHistory.length === 0 ? (
            <Text style={styles.noHistoryText}>No assessments recorded</Text>
          ) : (
            monitoringHistory.map((item, index) => (
              <View key={index} style={styles.historyItem}>
                <View style={styles.historyHeader}>
                  <Text style={styles.historyScore}>{(Number(item.overall_score) * 100).toFixed(0)}%</Text>
                  <Text style={styles.historyLabel}>Severity</Text>
                </View>
                <View style={styles.historyDivider} />
                <View style={styles.fingerScoresGrid}>
                  {item.finger_scores && typeof item.finger_scores === 'object' ? (
                    Object.entries(item.finger_scores).map(([finger, score]: [string, any]) => (
                      <Text key={finger} style={styles.fingerScoreSmall}>
                        {finger.substring(0, 1)}: {(Number(score) * 100).toFixed(0)}
                      </Text>
                    ))
                  ) : null}
                </View>
                <Text style={styles.historyTime}>
                  {new Date(item.timestamp).toLocaleDateString()} {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </View>
            ))
          )}
        </ScrollView>
      </View>

      {/* Results Display */}
      {(sessionResults.size > 0 || !sessionActive) && (
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>ℹ️ Session Status</Text>
          <Text style={styles.infoText}>
            {sessionActive ? 'Assessment in progress...' : 
             sessionResults.size > 0 ? `Analysis complete - ${sessionResults.size} fingers analyzed` :
             'Ready to start assessment'}
          </Text>
        </View>
      )}
      
      {/* Actual Results Display */}
      {sessionResults.size > 0 && (
        <>
          {/* Overall Assessment */}
          <View style={[
            styles.assessmentCard,
            severityLevel === 'none' && styles.assessmentNone,
            severityLevel === 'mild' && styles.assessmentMild,
            severityLevel === 'moderate' && styles.assessmentModerate,
            severityLevel === 'severe' && styles.assessmentSevere
          ]}>
            <Text style={styles.assessmentTitle}>Overall Assessment</Text>
            <Text style={styles.severityBadge}>
              {severityLevel.toUpperCase()}
            </Text>
            <Text style={styles.assessmentText}>{overallAssessment}</Text>
          </View>

          {/* Finger Selector */}
          <View style={styles.fingerSelector}>
            <Text style={styles.selectorTitle}>Select Finger:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.fingerButtons}>
              {FINGER_NAMES_FULL.map((name, index) => (
                <TouchableOpacity
                  key={name}
                  style={[
                    styles.fingerButton,
                    selectedFingerIndex === index && styles.fingerButtonActive
                  ]}
                  onPress={() => setSelectedFingerIndex(index)}
                >
                  <Text style={[
                    styles.fingerButtonText,
                    selectedFingerIndex === index && styles.fingerButtonTextActive
                  ]}>
                    {name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Finger Metrics */}
          {selectedMetrics && (
            <View style={styles.metricsCard}>
              <Text style={styles.metricsTitle}>{selectedFingerName} Analysis Results</Text>
              
              {/* Tremor Analysis */}
              <View style={styles.metricRow}>
                <View style={styles.metricLabel}>
                  <IconSymbol size={20} name="waveform" color="#FF6B6B" />
                  <Text style={styles.metricName}>Tremor Power (3-8Hz)</Text>
                </View>
                <View style={styles.metricValueContainer}>
                  <Text style={styles.metricValue}>
                    {(selectedMetrics.tremorPower * 100).toFixed(1)}%
                  </Text>
                  <View style={styles.metricBar}>
                    <View style={[
                      styles.metricBarFill,
                      styles.metricBarDanger,
                      { width: `${Math.min(100, selectedMetrics.tremorPower * 100)}%` }
                    ]} />
                  </View>
                </View>
              </View>

              {/* Range of Motion */}
              <View style={styles.metricRow}>
                <View style={styles.metricLabel}>
                  <IconSymbol size={20} name="arrow.up.and.down" color="#4ECDC4" />
                  <Text style={styles.metricName}>Range of Motion</Text>
                </View>
                <View style={styles.metricValueContainer}>
                  <Text style={styles.metricValue}>
                    {(selectedMetrics.rom * 100).toFixed(0)}%
                  </Text>
                  <View style={styles.metricBar}>
                    <View style={[
                      styles.metricBarFill,
                      selectedMetrics.rom >= 0.6 ? styles.metricBarSuccess : styles.metricBarWarning,
                      { width: `${Math.min(100, selectedMetrics.rom * 100)}%` }
                    ]} />
                  </View>
                </View>
              </View>

              {/* Velocity */}
              <View style={styles.metricRow}>
                <View style={styles.metricLabel}>
                  <IconSymbol size={20} name="speedometer" color="#95E1D3" />
                  <Text style={styles.metricName}>Movement Speed</Text>
                </View>
                <View style={styles.metricValueContainer}>
                  <Text style={styles.metricValue}>
                    {(selectedMetrics.medianVel * 100).toFixed(0)}%
                  </Text>
                  <View style={styles.metricBar}>
                    <View style={[
                      styles.metricBarFill,
                      selectedMetrics.medianVel >= 0.4 ? styles.metricBarSuccess : styles.metricBarWarning,
                      { width: `${Math.min(100, selectedMetrics.medianVel * 100)}%` }
                    ]} />
                  </View>
                </View>
              </View>

              {/* Smoothness (Jerk) */}
              <View style={styles.metricRow}>
                <View style={styles.metricLabel}>
                  <IconSymbol size={20} name="chart.line.uptrend.xyaxis" color="#F38181" />
                  <Text style={styles.metricName}>Movement Smoothness</Text>
                </View>
                <View style={styles.metricValueContainer}>
                  <Text style={styles.metricValue}>
                    {(selectedMetrics.jerk * 100).toFixed(0)}%
                  </Text>
                  <View style={styles.metricBar}>
                    <View style={[
                      styles.metricBarFill,
                      selectedMetrics.jerk >= 0.5 ? styles.metricBarSuccess : styles.metricBarWarning,
                      { width: `${Math.min(100, selectedMetrics.jerk * 100)}%` }
                    ]} />
                  </View>
                </View>
              </View>

              {/* Overall Score */}
              <View style={[styles.metricRow, styles.overallScoreRow]}>
                <View style={styles.metricLabel}>
                  <IconSymbol size={22} name="chart.pie.fill" color="#FF6B6B" />
                  <Text style={styles.metricNameBold}>Symptom Score</Text>
                </View>
                <View style={styles.metricValueContainer}>
                  <Text style={styles.metricValueBold}>
                    {(selectedMetrics.overallScore * 100).toFixed(0)}/100
                  </Text>
                  <View style={styles.metricBar}>
                    <View style={[
                      styles.metricBarFill,
                      selectedMetrics.overallScore < 0.35 ? styles.metricBarSuccess :
                      selectedMetrics.overallScore < 0.60 ? styles.metricBarWarning :
                      styles.metricBarDanger,
                      { width: `${Math.min(100, selectedMetrics.overallScore * 100)}%` }
                    ]} />
                  </View>
                </View>
              </View>
            </View>
          )}

          {/* Alerts */}
          {alerts.length > 0 && (
            <View style={styles.alertsCard}>
              <Text style={styles.alertsTitle}>⚠️ Detected Issues</Text>
              {alerts.slice(0, 6).map((alert, index) => (
                <View key={index} style={[
                  styles.alertItem,
                  alert.type === 'danger' && styles.alertDanger,
                  alert.type === 'warning' && styles.alertWarning,
                  alert.type === 'success' && styles.alertSuccess
                ]}>
                  <Text style={styles.alertFinger}>{alert.finger}</Text>
                  <Text style={styles.alertMessage}>{alert.message}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Data Visualization */}
          {currentSamples.length > 1 && (
            <View style={styles.chartCard}>
              <Text style={styles.chartTitle}>Signal Waveform - {selectedFingerName}</Text>
              {renderChart(currentSamples)}
            </View>
          )}
        </>
      )}

      {/* Educational Info */}
      <View style={styles.educationCard}>
        <Text style={styles.educationTitle}>🔬 Understanding the Metrics</Text>
        <View style={styles.educationItem}>
          <Text style={styles.educationLabel}>Tremor Power:</Text>
          <Text style={styles.educationText}>
            Measures oscillations in 3-8 Hz range. {'>'}20% indicates Parkinsonian tremor.
          </Text>
        </View>
        <View style={styles.educationItem}>
          <Text style={styles.educationLabel}>Range of Motion:</Text>
          <Text style={styles.educationText}>
            How far fingers move. {'<'}60% suggests rigidity.
          </Text>
        </View>
        <View style={styles.educationItem}>
          <Text style={styles.educationLabel}>Movement Speed:</Text>
          <Text style={styles.educationText}>
            Velocity of finger motion. {'<'}40% indicates bradykinesia (slowness).
          </Text>
        </View>
        <View style={styles.educationItem}>
          <Text style={styles.educationLabel}>Smoothness:</Text>
          <Text style={styles.educationText}>
            Based on jerk analysis. {'<'}50% means shaky, irregular movement.
          </Text>
        </View>
      </View>
    </ScrollView>
  );

  function renderChart(samples: number[]) {
    if (samples.length < 2) {
      return (
        <View style={styles.emptyChart}>
          <Text style={styles.emptyChartText}>Collecting data...</Text>
        </View>
      );
    }

    const displaySamples = samples.slice(-150); // Show last 150 samples
    const minValue = Math.min(...displaySamples);
    const maxValue = Math.max(...displaySamples);
    const range = maxValue - minValue || 1; // Prevent division by zero

    const points = displaySamples.map((value, index) => {
      const x = (index / (displaySamples.length - 1)) * CHART_WIDTH;
      const normalizedValue = ((value - minValue) / range);
      const y = CHART_HEIGHT - (normalizedValue * CHART_HEIGHT);
      return { x, y };
    });

    return (
      <View style={styles.chartContainer}>
        <View style={styles.chart}>
          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio) => (
            <View
              key={ratio}
              style={[styles.gridLine, { top: CHART_HEIGHT * (1 - ratio) }]}
            />
          ))}
          
          {/* Waveform path */}
          {points.map((point, index) => {
            if (index === 0) return null;
            const prevPoint = points[index - 1];
            
            return (
              <View
                key={index}
                style={[
                  styles.chartLine,
                  {
                    position: 'absolute',
                    left: prevPoint.x,
                    top: Math.min(prevPoint.y, point.y),
                    width: Math.max(1, point.x - prevPoint.x),
                    height: Math.max(1, Math.abs(point.y - prevPoint.y) + 2)
                  }
                ]}
              />
            );
          })}
          
          {/* Data points */}
          {points.filter((_, i) => i % 5 === 0).map((point, index) => (
            <View
              key={`point-${index}`}
              style={[styles.dataPoint, { left: point.x - 2, top: point.y - 2 }]}
            />
          ))}
        </View>
        
        <View style={styles.chartLabels}>
          <Text style={styles.chartLabel}>{maxValue.toFixed(0)}</Text>
          <Text style={styles.chartLabel}>{minValue.toFixed(0)}</Text>
        </View>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
    flex: 1,
  },
  infoCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#FF6B6B',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2c3e50',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#555',
    marginVertical: 2,
    lineHeight: 20,
  },
  sessionCard: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    marginBottom: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  startButton: {
    backgroundColor: '#FF6B6B',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    shadowColor: '#FF6B6B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  startButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  restartButton: {
    backgroundColor: '#fff',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 2,
    borderColor: '#FF6B6B',
  },
  restartButtonText: {
    color: '#FF6B6B',
    fontSize: 16,
    fontWeight: '600',
  },
  activeSession: {
    width: '100%',
    alignItems: 'center',
  },
  sessionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2c3e50',
    marginBottom: 8,
  },
  timerText: {
    fontSize: 36,
    fontWeight: '900',
    color: '#FF6B6B',
    marginVertical: 8,
  },
  progressBarContainer: {
    width: '100%',
    height: 8,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    overflow: 'hidden',
    marginVertical: 12,
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#FF6B6B',
    borderRadius: 4,
  },
  instructionText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 8,
    fontStyle: 'italic',
  },
  sampleCount: {
    fontSize: 14,
    color: '#4ECDC4',
    fontWeight: '600',
    marginTop: 8,
  },
  assessmentCard: {
    padding: 20,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  assessmentNone: {
    backgroundColor: '#d4edda',
    borderLeftWidth: 4,
    borderLeftColor: '#28a745',
  },
  assessmentMild: {
    backgroundColor: '#fff3cd',
    borderLeftWidth: 4,
    borderLeftColor: '#ffc107',
  },
  assessmentModerate: {
    backgroundColor: '#ffe5d0',
    borderLeftWidth: 4,
    borderLeftColor: '#fd7e14',
  },
  assessmentSevere: {
    backgroundColor: '#f8d7da',
    borderLeftWidth: 4,
    borderLeftColor: '#dc3545',
  },
  assessmentTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2c3e50',
    marginBottom: 8,
  },
  severityBadge: {
    fontSize: 16,
    fontWeight: '800',
    color: '#2c3e50',
    marginBottom: 12,
    letterSpacing: 1,
  },
  assessmentText: {
    fontSize: 15,
    color: '#333',
    lineHeight: 22,
  },
  fingerSelector: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  selectorTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 12,
  },
  fingerButtons: {
    flexDirection: 'row',
  },
  fingerButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
    backgroundColor: '#e0e0e0',
    marginRight: 10,
  },
  fingerButtonActive: {
    backgroundColor: '#FF6B6B',
  },
  fingerButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  fingerButtonTextActive: {
    color: '#fff',
  },
  metricsCard: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  metricsTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2c3e50',
    marginBottom: 20,
    textAlign: 'center',
  },
  metricRow: {
    marginBottom: 20,
  },
  overallScoreRow: {
    marginTop: 8,
    paddingTop: 20,
    borderTopWidth: 2,
    borderTopColor: '#e0e0e0',
  },
  metricLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  metricName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#555',
  },
  metricNameBold: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2c3e50',
  },
  metricValueContainer: {
    flex: 1,
  },
  metricValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2c3e50',
    marginBottom: 6,
    textAlign: 'right',
  },
  metricValueBold: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FF6B6B',
    marginBottom: 6,
    textAlign: 'right',
  },
  metricBar: {
    height: 8,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  metricBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  metricBarSuccess: {
    backgroundColor: '#4CAF50',
  },
  metricBarWarning: {
    backgroundColor: '#FFC107',
  },
  metricBarDanger: {
    backgroundColor: '#FF6B6B',
  },
  alertsCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#FF6B6B',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  alertsTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2c3e50',
    marginBottom: 12,
  },
  alertItem: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  alertDanger: {
    backgroundColor: '#ffe5e5',
    borderLeftWidth: 3,
    borderLeftColor: '#dc3545',
  },
  alertWarning: {
    backgroundColor: '#fff3cd',
    borderLeftWidth: 3,
    borderLeftColor: '#ffc107',
  },
  alertSuccess: {
    backgroundColor: '#d4edda',
    borderLeftWidth: 3,
    borderLeftColor: '#28a745',
  },
  alertFinger: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2c3e50',
    marginBottom: 4,
  },
  alertMessage: {
    fontSize: 13,
    color: '#555',
    lineHeight: 18,
  },
  chartCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2c3e50',
    marginBottom: 16,
    textAlign: 'center',
  },
  chartContainer: {
    flexDirection: 'row',
    height: CHART_HEIGHT,
  },
  chart: {
    width: CHART_WIDTH,
    height: CHART_HEIGHT,
    backgroundColor: '#fafafa',
    borderRadius: 8,
    position: 'relative',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  emptyChart: {
    width: CHART_WIDTH,
    height: CHART_HEIGHT,
    backgroundColor: '#fafafa',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  emptyChartText: {
    fontSize: 14,
    color: '#999',
    fontStyle: 'italic',
  },
  gridLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: '#e8e8e8',
  },
  chartLine: {
    backgroundColor: '#FF6B6B',
    opacity: 0.6,
  },
  dataPoint: {
    position: 'absolute',
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#FF6B6B',
  },
  chartLabels: {
    marginLeft: 8,
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  chartLabel: {
    fontSize: 10,
    color: '#666',
    fontWeight: '600',
  },
  educationCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#4ECDC4',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  educationTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2c3e50',
    marginBottom: 12,
  },
  educationItem: {
    marginBottom: 12,
  },
  educationLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 4,
  },
  educationText: {
    fontSize: 13,
    color: '#666',
    lineHeight: 20,
  },
  flatSignalIndicator: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -50 }, { translateY: -10 }],
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
    padding: 8,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#FF6B6B',
  },
  flatSignalText: {
    fontSize: 10,
    color: '#FF6B6B',
    fontWeight: '600',
    textAlign: 'center',
  },
  dataPreviewCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#4ECDC4',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  dataPreviewTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2c3e50',
    marginBottom: 12,
  },
  dataPreviewFinger: {
    marginBottom: 12,
    padding: 10,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
  },
  dataPreviewFingerName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 4,
  },
  dataPreviewStats: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
    fontFamily: 'monospace',
  },
  dataPreviewSamples: {
    fontSize: 11,
    color: '#777',
    fontFamily: 'monospace',
    marginBottom: 2,
  },
  calculationDetails: {
    backgroundColor: '#f0f8ff',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    borderLeftWidth: 3,
    borderLeftColor: '#4ECDC4',
  },
  calculationTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 6,
  },
  calculationText: {
    fontSize: 12,
    color: '#555',
    fontFamily: 'monospace',
    marginBottom: 2,
  },
  historyCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  historyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2c3e50',
    marginBottom: 12,
  },
  historyScroll: {
    flexDirection: 'row',
  },
  historyItem: {
    backgroundColor: '#f5f5f5',
    padding: 10,
    borderRadius: 8,
    marginRight: 10,
    minWidth: 120,
  },
  historyHeader: {
    alignItems: 'center',
    marginBottom: 4,
  },
  historyDivider: {
    height: 1,
    backgroundColor: '#ddd',
    width: '100%',
    marginVertical: 4,
  },
  fingerScoresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 4,
    marginBottom: 4,
  },
  fingerScoreSmall: {
    fontSize: 10,
    color: '#555',
    fontWeight: '500',
  },
  historyScore: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FF6B6B',
  },
  historyLabel: {
    fontSize: 10,
    color: '#666',
  },
  historyTime: {
    fontSize: 10,
    color: '#999',
    marginTop: 4,
  },
  noHistoryText: {
    color: '#999',
    fontStyle: 'italic',
    padding: 8,
  },
});
