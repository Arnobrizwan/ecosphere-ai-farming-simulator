/**
 * NASA POWER Variables Reference Screen
 * In-app documentation for climate parameters
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
} from 'react-native';
import { getAllParameters, demoFetchDhaka } from '../../services/power.service';

export const PowerVariablesScreen = ({ navigation }) => {
  const [testRunning, setTestRunning] = useState(false);
  const [testResult, setTestResult] = useState(null);

  const parameters = getAllParameters();

  const handleTestAPI = async () => {
    setTestRunning(true);
    setTestResult(null);

    try {
      const result = await demoFetchDhaka();
      const summary = Object.entries(result.parameters).map(([param, series]) => ({
        param,
        count: series.length,
        hasData: series.length > 0,
      }));

      setTestResult({
        success: true,
        summary,
        message: `✅ Successfully fetched ${summary.length} parameters`,
      });
    } catch (error) {
      setTestResult({
        success: false,
        message: `❌ Error: ${error.message}`,
      });
    } finally {
      setTestRunning(false);
    }
  };

  const openPowerDocs = () => {
    Linking.openURL('https://power.larc.nasa.gov/docs/methodology/');
  };

  const openParameterDictionary = () => {
    Linking.openURL('https://power.larc.nasa.gov/docs/methodology/meteorology/');
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>🌍 NASA POWER Variables</Text>
        <Text style={styles.subtitle}>Climate Data Reference</Text>
      </View>

      <ScrollView style={styles.scrollView}>
        {/* Introduction */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📊 What is NASA POWER?</Text>
          <Text style={styles.description}>
            The NASA POWER (Prediction Of Worldwide Energy Resources) project provides
            solar and meteorological data for agriculture, renewable energy, and climate research.
            {'\n\n'}
            This app uses POWER data to simulate realistic farming conditions and calculate
            evapotranspiration (ET) for crop growth.
          </Text>
        </View>

        {/* Parameter Table */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📋 Available Parameters</Text>

          {parameters.map((param, index) => (
            <View
              key={param.code}
              style={[
                styles.paramCard,
                index % 2 === 0 ? styles.paramCardEven : styles.paramCardOdd,
              ]}
            >
              <View style={styles.paramHeader}>
                <Text style={styles.paramCode}>{param.code}</Text>
                <Text style={styles.paramUnit}>{param.unit}</Text>
              </View>
              <Text style={styles.paramName}>{param.name}</Text>
              <Text style={styles.paramDescription}>{param.description}</Text>
            </View>
          ))}
        </View>

        {/* API Test Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🧪 Test API Connection</Text>
          <Text style={styles.description}>
            Test the NASA POWER API with a demo fetch for Dhaka, Bangladesh.
          </Text>

          <TouchableOpacity
            style={[styles.testButton, testRunning && styles.testButtonDisabled]}
            onPress={handleTestAPI}
            disabled={testRunning}
          >
            <Text style={styles.testButtonText}>
              {testRunning ? '⏳ Testing...' : '▶️ Run Test'}
            </Text>
          </TouchableOpacity>

          {testResult && (
            <View
              style={[
                styles.testResult,
                testResult.success ? styles.testResultSuccess : styles.testResultError,
              ]}
            >
              <Text style={styles.testResultMessage}>{testResult.message}</Text>
              {testResult.success && testResult.summary && (
                <View style={styles.testSummary}>
                  {testResult.summary.map((item) => (
                    <Text key={item.param} style={styles.testSummaryItem}>
                      {item.hasData ? '✅' : '❌'} {item.param}: {item.count} days
                    </Text>
                  ))}
                </View>
              )}
            </View>
          )}
        </View>

        {/* Links Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🔗 Official Documentation</Text>

          <TouchableOpacity style={styles.linkButton} onPress={openPowerDocs}>
            <Text style={styles.linkButtonText}>📖 POWER Methodology</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.linkButton}
            onPress={openParameterDictionary}
          >
            <Text style={styles.linkButtonText}>📚 Parameter Dictionary</Text>
          </TouchableOpacity>
        </View>

        {/* Technical Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>⚙️ Technical Details</Text>

          <View style={styles.techDetail}>
            <Text style={styles.techLabel}>Temporal Resolution:</Text>
            <Text style={styles.techValue}>Daily, Hourly, Monthly</Text>
          </View>

          <View style={styles.techDetail}>
            <Text style={styles.techLabel}>Spatial Resolution:</Text>
            <Text style={styles.techValue}>0.5° × 0.5° (~50km grid)</Text>
          </View>

          <View style={styles.techDetail}>
            <Text style={styles.techLabel}>Data Coverage:</Text>
            <Text style={styles.techValue}>1981 - Present (near real-time)</Text>
          </View>

          <View style={styles.techDetail}>
            <Text style={styles.techLabel}>Endpoints Used:</Text>
            <Text style={styles.techValue}>
              /api/temporal/daily/point{'\n'}
              /api/temporal/daily/regional
            </Text>
          </View>

          <View style={styles.techDetail}>
            <Text style={styles.techLabel}>Cache Duration:</Text>
            <Text style={styles.techValue}>24 hours (local storage)</Text>
          </View>

          <View style={styles.techDetail}>
            <Text style={styles.techLabel}>Fallback Behavior:</Text>
            <Text style={styles.techValue}>
              If API is unavailable, uses sample data for offline simulation
            </Text>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Data Source: NASA Langley Research Center (LaRC)
            {'\n'}
            POWER Project
          </Text>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#2196F3',
    padding: 20,
    paddingTop: 40,
    alignItems: 'center',
  },
  backButton: {
    alignSelf: 'flex-start',
    marginBottom: 10,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 14,
    color: '#e3f2fd',
  },
  scrollView: {
    flex: 1,
  },
  section: {
    backgroundColor: '#fff',
    margin: 10,
    padding: 15,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  description: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  paramCard: {
    padding: 12,
    borderRadius: 6,
    marginBottom: 10,
  },
  paramCardEven: {
    backgroundColor: '#f9f9f9',
  },
  paramCardOdd: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  paramHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  paramCode: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2196F3',
    fontFamily: 'monospace',
  },
  paramUnit: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
  },
  paramName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    marginBottom: 3,
  },
  paramDescription: {
    fontSize: 13,
    color: '#777',
    lineHeight: 18,
  },
  testButton: {
    backgroundColor: '#4CAF50',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  testButtonDisabled: {
    backgroundColor: '#9E9E9E',
  },
  testButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  testResult: {
    marginTop: 15,
    padding: 15,
    borderRadius: 8,
  },
  testResultSuccess: {
    backgroundColor: '#e8f5e9',
    borderWidth: 1,
    borderColor: '#4CAF50',
  },
  testResultError: {
    backgroundColor: '#ffebee',
    borderWidth: 1,
    borderColor: '#f44336',
  },
  testResultMessage: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  testSummary: {
    marginTop: 5,
  },
  testSummaryItem: {
    fontSize: 13,
    fontFamily: 'monospace',
    marginBottom: 3,
  },
  linkButton: {
    backgroundColor: '#2196F3',
    padding: 12,
    borderRadius: 6,
    alignItems: 'center',
    marginBottom: 10,
  },
  linkButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  techDetail: {
    flexDirection: 'row',
    marginBottom: 10,
    flexWrap: 'wrap',
  },
  techLabel: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#555',
    width: 150,
  },
  techValue: {
    fontSize: 13,
    color: '#777',
    flex: 1,
  },
  footer: {
    padding: 20,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    lineHeight: 18,
  },
});
