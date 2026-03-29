import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity } from 'react-native';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { showNotification } from '@/config/notifications';
import { API_URL } from '@/src/constants/api';
import { socketService } from '@/services/socket';
import { useAuth } from '@/contexts/AuthContext';
import type { VitalsAlert, VitalsReading, VitalsThreshold } from '../types/healthMonitoring';

const HISTORY_LIMIT = 30;
const ALERT_COOLDOWN_MS = 60 * 1000;

const PULSE_STATS = {
  mean: 90.65696465696466,
  std: 1.736485786433266,
  min: 87,
  max: 95,
};

const ST_PREVIEW_STATS = {
  mean: -37.49284333333333,
  std: 0.439977457419001,
  min: -38.173717,
  max: -36.7974,
};

const DEFAULT_THRESHOLDS: Record<string, VitalsThreshold> = {
  pulse: {
    label: 'Pulse',
    unit: 'bpm',
    warnMin: Number((PULSE_STATS.mean - 2 * PULSE_STATS.std).toFixed(2)),
    warnMax: Number((PULSE_STATS.mean + 2 * PULSE_STATS.std).toFixed(2)),
    hardMin: PULSE_STATS.min,
    hardMax: PULSE_STATS.max,
    note: 'Derived from Patient_02_Numerics.csv',
  },
  st: {
    label: 'ST',
    unit: 'deg',
    warnMin: Number((ST_PREVIEW_STATS.mean - 2 * ST_PREVIEW_STATS.std).toFixed(3)),
    warnMax: Number((ST_PREVIEW_STATS.mean + 2 * ST_PREVIEW_STATS.std).toFixed(3)),
    hardMin: ST_PREVIEW_STATS.min,
    hardMax: ST_PREVIEW_STATS.max,
    note: 'Derived from ST Sensor Fall detection preview (ori_pitch)',
  },
  gsr: {
    label: 'GSR',
    unit: 'uS',
    warnMin: 0.1,
    warnMax: 10,
    hardMin: 0.05,
    hardMax: 20,
    note: 'Provisional range pending dataset',
  },
  ecg: {
    label: 'ECG',
    unit: 'mV',
    warnMin: -1.5,
    warnMax: 1.5,
    hardMin: -2.5,
    hardMax: 2.5,
    note: 'Provisional range pending dataset',
  },
};

const SENSOR_ORDER: Array<keyof VitalsReading> = ['pulse', 'gsr', 'st', 'ecg'];

const formatValue = (value?: number) => {
  if (value === undefined || value === null || Number.isNaN(value)) {
    return '--';
  }
  return Number(value).toFixed(2);
};

const evaluateThreshold = (value: number | undefined, threshold: VitalsThreshold) => {
  if (value === undefined || value === null || Number.isNaN(value)) {
    return { level: 'unknown' as const, message: 'Awaiting data' };
  }

  if (value < threshold.hardMin || value > threshold.hardMax) {
    return { level: 'danger' as const, message: 'Critical range' };
  }

  if (value < threshold.warnMin || value > threshold.warnMax) {
    return { level: 'warning' as const, message: 'Outside baseline' };
  }

  return { level: 'normal' as const, message: 'Within range' };
};

export default function VitalsMonitoringDisplay() {
  const { user } = useAuth();
  const [currentReading, setCurrentReading] = useState<VitalsReading>({
    timestamp: Date.now(),
  });
  const [history, setHistory] = useState<Record<string, VitalsReading[]>>({
    pulse: [],
    gsr: [],
    st: [],
    ecg: [],
  });
  const [alerts, setAlerts] = useState<VitalsAlert[]>([]);
  const [savedAlerts, setSavedAlerts] = useState<VitalsAlert[]>([]);
  const [editingSensor, setEditingSensor] = useState<string | null>(null);
  const [thresholds, setThresholds] = useState<Record<string, VitalsThreshold>>({
    ...DEFAULT_THRESHOLDS,
  });
  const lastAlertTimeRef = useRef<Record<string, number>>({});

  const fetchSavedAlerts = async () => {
    try {
      const userQuery = user?.user_id ? `&user_id=${encodeURIComponent(user.user_id)}` : '';
      const response = await fetch(
        `http://${API_URL}/get_monitoring_history?type=vitals&limit=20${userQuery}`
      );
      if (!response.ok) {
        return;
      }
      const data = await response.json();
      const formatted: VitalsAlert[] = (data || [])
        .map((item: any) => item?.finger_scores?.alert)
        .filter((alert: any) => alert && alert.message)
        .map((alert: any) => ({
          sensor: alert.sensor || 'vitals',
          level: alert.level || 'warning',
          message: alert.message,
          timestamp: alert.timestamp || Date.now(),
        }));
      setSavedAlerts(formatted);
    } catch (error) {
      console.log('Error fetching vitals history:', error);
    }
  };

  useEffect(() => {
    fetchSavedAlerts();
  }, [user?.user_id]);

  useEffect(() => {
    if (user?.user_id) {
      socketService.setUserId(user.user_id);
    }
    socketService.connect();

    const handleVitalsData = (data: VitalsReading) => {
      const normalized: VitalsReading = {
        timestamp: data.timestamp || Date.now(),
        gsr: data.gsr,
        pulse: data.pulse,
        st: data.st,
        ecg: data.ecg,
        user_id: data.user_id,
      };

      setCurrentReading(normalized);

      setHistory(prev => {
        const next = { ...prev };
        SENSOR_ORDER.forEach(sensor => {
          const value = normalized[sensor];
          if (value === undefined || value === null || Number.isNaN(value)) {
            return;
          }
          const entry: VitalsReading = {
            timestamp: normalized.timestamp,
            [sensor]: value,
          } as VitalsReading;
          next[sensor] = [...(prev[sensor] || []), entry].slice(-HISTORY_LIMIT);
        });
        return next;
      });

      SENSOR_ORDER.forEach(sensor => {
        const value = normalized[sensor];
        const threshold = thresholds[sensor as string];
        if (!threshold) {
          return;
        }
        const status = evaluateThreshold(value, threshold);
        if (status.level === 'warning' || status.level === 'danger') {
          const now = Date.now();
          const lastAlertTime = lastAlertTimeRef.current[sensor as string] || 0;
          if (now - lastAlertTime > ALERT_COOLDOWN_MS) {
            lastAlertTimeRef.current[sensor as string] = now;
            const alert: VitalsAlert = {
              sensor: sensor as string,
              level: status.level,
              message: `${threshold.label} ${status.message} (${formatValue(value)} ${threshold.unit})`,
              timestamp: now,
            };
            setAlerts(prev => [alert, ...prev].slice(0, 20));
            showNotification('Vitals Alert', alert.message);
            saveAlertToHistory(alert, normalized);
          }
        }
      });
    };

    socketService.socket.on('vitals_data', handleVitalsData);

    return () => {
      socketService.socket.off('vitals_data', handleVitalsData);
    };
  }, [thresholds, user?.user_id]);

  const saveAlertToHistory = async (alert: VitalsAlert, reading: VitalsReading) => {
    try {
      const response = await fetch(`http://${API_URL}/save_monitoring_data`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          monitoring_type: 'vitals',
          overall_score: 0,
          finger_scores: {
            reading,
            alert,
          },
          finger_type: 'vitals',
          timestamp: new Date(reading.timestamp || Date.now()).toISOString(),
          user_id: user?.user_id,
        }),
      });
      if (response.ok) {
        fetchSavedAlerts();
      }
    } catch (error) {
      console.log('Error saving vitals alert:', error);
    }
  };

  const updateThresholdValue = (sensor: string, field: keyof VitalsThreshold, value: string) => {
    const parsed = Number(value);
    if (Number.isNaN(parsed)) {
      return;
    }
    setThresholds(prev => ({
      ...prev,
      [sensor]: {
        ...prev[sensor],
        [field]: parsed,
      },
    }));
  };

  const resetThresholds = (sensor: string) => {
    if (!DEFAULT_THRESHOLDS[sensor]) {
      return;
    }
    setThresholds(prev => ({
      ...prev,
      [sensor]: { ...DEFAULT_THRESHOLDS[sensor] },
    }));
  };

  const renderHistoryLine = (sensor: keyof VitalsReading) => {
    const entries = history[sensor] || [];
    if (entries.length === 0) {
      return <Text style={styles.historyEmpty}>No data yet.</Text>;
    }

    const values = entries.map(entry => {
      const value = entry[sensor];
      return value === undefined ? '--' : Number(value).toFixed(1);
    });

    return (
      <Text style={styles.historyValues}>
        {values.join('  ')}
      </Text>
    );
  };

  const renderSensorCard = (sensor: keyof VitalsReading) => {
    const threshold = thresholds[sensor as string];
    if (!threshold) {
      return null;
    }

    const value = currentReading[sensor];
    const status = evaluateThreshold(value, threshold);

    return (
      <View key={sensor} style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>{threshold.label}</Text>
          <View style={[styles.statusBadge, styles[`status_${status.level}`]]}>
            <Text style={styles.statusText}>{status.level.toUpperCase()}</Text>
          </View>
        </View>
        <Text style={styles.cardValue}>
          {formatValue(value)} {threshold.unit}
        </Text>
        <Text style={styles.cardMeta}>
          Range: {threshold.warnMin} - {threshold.warnMax} {threshold.unit}
        </Text>
        <Text style={styles.cardNote}>{threshold.note}</Text>
        <View style={styles.thresholdActions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => setEditingSensor(editingSensor === sensor ? null : String(sensor))}
          >
            <Text style={styles.actionButtonText}>
              {editingSensor === sensor ? 'Close Thresholds' : 'Edit Thresholds'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.secondaryActionButton]}
            onPress={() => resetThresholds(String(sensor))}
          >
            <Text style={[styles.actionButtonText, styles.secondaryActionButtonText]}>Reset</Text>
          </TouchableOpacity>
        </View>
        {editingSensor === sensor && (
          <View style={styles.thresholdEditor}>
            <View style={styles.thresholdRow}>
              <Text style={styles.thresholdLabel}>Warn Min</Text>
              <TextInput
                style={styles.thresholdInput}
                value={String(threshold.warnMin)}
                keyboardType="numeric"
                onChangeText={(text) => updateThresholdValue(String(sensor), 'warnMin', text)}
              />
              <Text style={styles.thresholdLabel}>Warn Max</Text>
              <TextInput
                style={styles.thresholdInput}
                value={String(threshold.warnMax)}
                keyboardType="numeric"
                onChangeText={(text) => updateThresholdValue(String(sensor), 'warnMax', text)}
              />
            </View>
            <View style={styles.thresholdRow}>
              <Text style={styles.thresholdLabel}>Hard Min</Text>
              <TextInput
                style={styles.thresholdInput}
                value={String(threshold.hardMin)}
                keyboardType="numeric"
                onChangeText={(text) => updateThresholdValue(String(sensor), 'hardMin', text)}
              />
              <Text style={styles.thresholdLabel}>Hard Max</Text>
              <TextInput
                style={styles.thresholdInput}
                value={String(threshold.hardMax)}
                keyboardType="numeric"
                onChangeText={(text) => updateThresholdValue(String(sensor), 'hardMax', text)}
              />
            </View>
          </View>
        )}
        <View style={styles.historyBlock}>
          <Text style={styles.historyTitle}>Recent</Text>
          {renderHistoryLine(sensor)}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <IconSymbol size={32} name="heart.fill" color="#D32F2F" />
        <Text style={styles.title}>Vitals Monitoring</Text>
      </View>

      <Text style={styles.subtitle}>
        Live GSR, pulse, ST, and ECG streams with alerting and history logging.
      </Text>

      <ScrollView contentContainerStyle={styles.cards}>
        {SENSOR_ORDER.map(sensor => renderSensorCard(sensor))}
      </ScrollView>

      <View style={styles.alertsBlock}>
        <Text style={styles.alertsTitle}>Recent Alerts</Text>
        {alerts.length === 0 ? (
          <Text style={styles.historyEmpty}>No alerts yet.</Text>
        ) : (
          alerts.map(alert => (
            <View key={`${alert.sensor}-${alert.timestamp}`} style={styles.alertItem}>
              <Text style={styles.alertSensor}>{alert.sensor.toUpperCase()}</Text>
              <Text style={styles.alertMessage}>{alert.message}</Text>
            </View>
          ))
        )}
      </View>

      <View style={styles.alertsBlock}>
        <Text style={styles.alertsTitle}>Saved Alert History</Text>
        {savedAlerts.length === 0 ? (
          <Text style={styles.historyEmpty}>No saved alerts yet.</Text>
        ) : (
          savedAlerts.map(alert => (
            <View key={`${alert.sensor}-${alert.timestamp}`} style={styles.alertItem}>
              <Text style={styles.alertSensor}>{alert.sensor.toUpperCase()}</Text>
              <Text style={styles.alertMessage}>{alert.message}</Text>
            </View>
          ))
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#222',
  },
  subtitle: {
    fontSize: 14,
    color: '#555',
    marginBottom: 16,
  },
  cards: {
    gap: 16,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e6e6e6',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#222',
  },
  statusBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
  },
  status_normal: {
    backgroundColor: '#2E7D32',
  },
  status_warning: {
    backgroundColor: '#F9A825',
  },
  status_danger: {
    backgroundColor: '#C62828',
  },
  status_unknown: {
    backgroundColor: '#757575',
  },
  cardValue: {
    fontSize: 24,
    fontWeight: '700',
    marginTop: 12,
    color: '#111',
  },
  cardMeta: {
    marginTop: 6,
    fontSize: 12,
    color: '#666',
  },
  cardNote: {
    marginTop: 4,
    fontSize: 11,
    color: '#888',
  },
  historyBlock: {
    marginTop: 12,
  },
  thresholdActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  actionButton: {
    backgroundColor: '#D32F2F',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 999,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  secondaryActionButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#D32F2F',
  },
  secondaryActionButtonText: {
    color: '#D32F2F',
  },
  thresholdEditor: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#fafafa',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#eee',
  },
  thresholdRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    gap: 6,
  },
  thresholdLabel: {
    fontSize: 11,
    color: '#555',
    flex: 1,
  },
  thresholdInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    minWidth: 70,
    textAlign: 'center',
    fontSize: 12,
    backgroundColor: '#fff',
  },
  historyTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
  },
  historyValues: {
    marginTop: 4,
    fontSize: 12,
    color: '#444',
  },
  historyEmpty: {
    marginTop: 6,
    fontSize: 12,
    color: '#999',
  },
  alertsBlock: {
    marginTop: 20,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  alertsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#222',
    marginBottom: 8,
  },
  alertItem: {
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#f2f2f2',
  },
  alertSensor: {
    fontSize: 12,
    fontWeight: '700',
    color: '#D32F2F',
  },
  alertMessage: {
    fontSize: 13,
    color: '#444',
    marginTop: 2,
  },
});
