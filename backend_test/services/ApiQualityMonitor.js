/**
 * API Quality Monitor Service
 * Monitors TripAdvisor API response quality and detects domain restriction issues
 */

class ApiQualityMonitor {
  constructor() {
    this.metrics = new Map();
    this.qualityThreshold = 0.5; // 50% of expected results
  }

  /**
   * Log API response metrics
   * @param {string} endpoint - API endpoint called
   * @param {string} requestOrigin - Origin of the request
   * @param {number} responseCount - Number of results returned
   * @param {number} expectedCount - Expected number of results
   * @param {number} responseTime - Response time in milliseconds
   * @param {string} errorDetails - Error details if any
   */
  logApiMetrics(endpoint, requestOrigin, responseCount, expectedCount, responseTime, errorDetails = null) {
    const timestamp = new Date().toISOString();
    const qualityRatio = expectedCount > 0 ? responseCount / expectedCount : 1;
    
    const metrics = {
      timestamp,
      endpoint,
      requestOrigin,
      responseCount,
      expectedCount,
      qualityRatio,
      responseTime,
      errorDetails
    };

    // Store metrics
    const key = `${endpoint}_${timestamp}`;
    this.metrics.set(key, metrics);

    // Log quality issues
    if (qualityRatio < this.qualityThreshold) {
      console.warn('⚠️ API Quality Degradation Detected:', {
        endpoint,
        expected: expectedCount,
        actual: responseCount,
        ratio: qualityRatio.toFixed(2),
        possibleCause: 'Domain restriction issues',
        timestamp
      });
    }

    // Log successful high-quality responses
    if (qualityRatio >= 0.8) {
      console.log('✅ High Quality API Response:', {
        endpoint,
        responseCount,
        expectedCount,
        ratio: qualityRatio.toFixed(2),
        responseTime: `${responseTime}ms`,
        timestamp
      });
    }

    return metrics;
  }

  /**
   * Check if API response quality is degraded
   * @param {number} responseCount - Actual response count
   * @param {number} expectedCount - Expected response count
   * @returns {Object} Quality assessment
   */
  assessResponseQuality(responseCount, expectedCount) {
    const qualityRatio = expectedCount > 0 ? responseCount / expectedCount : 1;
    
    let qualityIndicator;
    let suggestedActions = [];

    if (qualityRatio >= 0.8) {
      qualityIndicator = 'full';
    } else if (qualityRatio >= 0.5) {
      qualityIndicator = 'partial';
      suggestedActions.push('Monitor API key restrictions');
    } else {
      qualityIndicator = 'minimal';
      suggestedActions.push('Check domain restrictions in TripAdvisor API console');
      suggestedActions.push('Verify API key configuration');
      suggestedActions.push('Review CORS settings');
    }

    return {
      qualityRatio,
      qualityIndicator,
      suggestedActions,
      isDegraded: qualityRatio < this.qualityThreshold
    };
  }

  /**
   * Log domain validation results
   * @param {string} domain - Domain being validated
   * @param {string} apiKey - API key (masked)
   * @param {boolean} validationResult - Whether validation passed
   * @param {string} errorCode - Error code if validation failed
   * @param {string} errorMessage - Error message if validation failed
   */
  logDomainValidation(domain, apiKey, validationResult, errorCode = null, errorMessage = null) {
    const timestamp = new Date().toISOString();
    
    const logData = {
      timestamp,
      domain,
      apiKey: apiKey ? apiKey.substring(0, 8) + '...' : 'MISSING',
      validationResult,
      errorCode,
      errorMessage
    };

    if (validationResult) {
      console.log('✅ Domain Validation Passed:', logData);
    } else {
      console.error('❌ Domain Validation Failed:', logData);
    }

    return logData;
  }

  /**
   * Get quality metrics for a specific endpoint
   * @param {string} endpoint - API endpoint
   * @param {number} hours - Number of hours to look back (default: 24)
   * @returns {Object} Quality metrics summary
   */
  getQualityMetrics(endpoint, hours = 24) {
    const cutoffTime = new Date(Date.now() - (hours * 60 * 60 * 1000));
    const relevantMetrics = [];

    for (const [key, metrics] of this.metrics.entries()) {
      if (metrics.endpoint === endpoint && new Date(metrics.timestamp) > cutoffTime) {
        relevantMetrics.push(metrics);
      }
    }

    if (relevantMetrics.length === 0) {
      return {
        endpoint,
        totalCalls: 0,
        averageQuality: 0,
        averageResponseTime: 0,
        degradedCalls: 0
      };
    }

    const totalCalls = relevantMetrics.length;
    const averageQuality = relevantMetrics.reduce((sum, m) => sum + m.qualityRatio, 0) / totalCalls;
    const averageResponseTime = relevantMetrics.reduce((sum, m) => sum + m.responseTime, 0) / totalCalls;
    const degradedCalls = relevantMetrics.filter(m => m.qualityRatio < this.qualityThreshold).length;

    return {
      endpoint,
      totalCalls,
      averageQuality: parseFloat(averageQuality.toFixed(2)),
      averageResponseTime: Math.round(averageResponseTime),
      degradedCalls,
      degradationRate: parseFloat((degradedCalls / totalCalls).toFixed(2))
    };
  }

  /**
   * Clean up old metrics (keep only last 7 days)
   */
  cleanupOldMetrics() {
    const cutoffTime = new Date(Date.now() - (7 * 24 * 60 * 60 * 1000)); // 7 days ago
    
    for (const [key, metrics] of this.metrics.entries()) {
      if (new Date(metrics.timestamp) < cutoffTime) {
        this.metrics.delete(key);
      }
    }
  }

  /**
   * Get overall API health status
   * @returns {Object} Health status summary
   */
  getHealthStatus() {
    const recentMetrics = [];
    const cutoffTime = new Date(Date.now() - (60 * 60 * 1000)); // Last hour

    for (const [key, metrics] of this.metrics.entries()) {
      if (new Date(metrics.timestamp) > cutoffTime) {
        recentMetrics.push(metrics);
      }
    }

    if (recentMetrics.length === 0) {
      return {
        status: 'unknown',
        message: 'No recent API calls to assess',
        timestamp: new Date().toISOString()
      };
    }

    const averageQuality = recentMetrics.reduce((sum, m) => sum + m.qualityRatio, 0) / recentMetrics.length;
    const errorCount = recentMetrics.filter(m => m.errorDetails).length;
    const errorRate = errorCount / recentMetrics.length;

    let status, message;
    
    if (averageQuality >= 0.8 && errorRate < 0.1) {
      status = 'healthy';
      message = 'API is performing well';
    } else if (averageQuality >= 0.5 && errorRate < 0.3) {
      status = 'degraded';
      message = 'API quality is below optimal levels';
    } else {
      status = 'unhealthy';
      message = 'API is experiencing significant issues';
    }

    return {
      status,
      message,
      averageQuality: parseFloat(averageQuality.toFixed(2)),
      errorRate: parseFloat(errorRate.toFixed(2)),
      totalCalls: recentMetrics.length,
      timestamp: new Date().toISOString()
    };
  }
}

// Create singleton instance
const apiQualityMonitor = new ApiQualityMonitor();

// Clean up old metrics every hour
setInterval(() => {
  apiQualityMonitor.cleanupOldMetrics();
}, 60 * 60 * 1000);

module.exports = apiQualityMonitor;