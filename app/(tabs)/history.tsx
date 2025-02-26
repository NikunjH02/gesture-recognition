import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView, Platform } from 'react-native';

interface HistoryItem {
  id: number;
  values: number[];
  message: string;
  timestamp: string;
}

export default function HistoryPage() {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const baseUrl = Platform.OS === 'android' ? 'http://192.168.171.169:5000' : 'http://127.0.0.1:5000';
      const response = await fetch(`${baseUrl}/history`);
      const data = await response.json();
      // Sort the history data to display latest first
      const sortedData = [...data].sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
      setHistory(sortedData); 
    } catch (error) {
      console.log('Error fetching history:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          <Text style={styles.title}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.title}>Gesture History</Text>
        <ScrollView style={styles.scrollView}>
          {history.map((item) => (
            <View key={item.id} style={styles.historyItem}>
              <View style={styles.valuesContainer}>
                {item.values.map((value, index) => (
                  <View key={index} style={styles.valueItem}>
                    <Text style={styles.valueLabel}>Value {index + 1}</Text>
                    <Text style={styles.valueText}>{value}</Text>
                  </View>
                ))}
              </View>
              <Text style={styles.messageText}>{item.message}</Text>
              <Text style={styles.timestampText}>{new Date(item.timestamp).toLocaleString()}</Text>
            </View>
          ))}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  container: {
    flex: 1,
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
  },
  historyItem: {
    backgroundColor: '#f0f0f0',
    padding: 16,
    marginBottom: 8,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  gestureText: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  timestampText: {
    fontSize: 14,
    color: '#666',
  },
  valuesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  valueItem: {
    width: '18%',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 4,
    borderRadius: 4,
    marginBottom: 4,
  },
  valueLabel: {
    fontSize: 10,
    color: '#666',
  },
  valueText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  messageText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
});
