#!/usr/bin/env node
/**
 * SageMaker Integration Test Script
 * Tests both Bedrock and SageMaker endpoints
 */

const axios = require('axios');

// Configuration
const API_BASE_URL = process.env.API_URL || 'http://localhost:3000';
const TEST_TIMEOUT = 30000; // 30 seconds

// Test data
const testQueries = [
  {
    query: "Plan a 3-day romantic trip to Paris for a couple",
    context: {
      budget: "medium",
      interests: ["culture", "food", "romance"],
      travelers: 2
    }
  },
  {
    query: "What are the best travel tips for visiting Japan in spring?",
    context: {
      season: "spring",
      interests: ["culture", "nature", "food"]
    }
  },
  {
    query: "Recommend family-friendly activities in Orlando",
    context: {
      travelers: 4,
      ages: ["adult", "adult", "child", "child"],
      interests: ["theme parks", "family"]
    }
  }
];

class SageMakerTester {
  constructor() {
    this.results = {
      bedrock: [],
      sagemaker: []
    };
  }

  async testModel(modelType, query, userContext) {
    console.log(`\n🧪 Testing ${modelType.toUpperCase()}: "${query}"`);
    
    const startTime = Date.now();
    
    try {
      const response = await axios.post(`${API_BASE_URL}/api/ai-agent`, {
        messages: [
          {
            role: 'user',
            content: query,
            timestamp: Date.now(),
            id: `test_${Date.now()}`
          }
        ],
        aiModel: modelType,
        userContext: {
          sessionId: `test_${modelType}_${Date.now()}`,
          preferences: userContext,
          ...userContext
        },
        userId: 'test-user'
      }, {
        timeout: TEST_TIMEOUT,
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      const result = {
        query,
        success: true,
        responseTime,
        response: response.data.content || response.data,
        metadata: response.data.metadata || {},
        timestamp: new Date().toISOString()
      };

      console.log(`✅ ${modelType} responded in ${responseTime}ms`);
      console.log(`📝 Response preview: ${(result.response || '').substring(0, 100)}...`);

      this.results[modelType].push(result);
      return result;

    } catch (error) {
      const endTime = Date.now();
      const responseTime = endTime - startTime;

      const result = {
        query,
        success: false,
        responseTime,
        error: error.message,
        errorCode: error.response?.status,
        errorData: error.response?.data,
        timestamp: new Date().toISOString()
      };

      console.log(`❌ ${modelType} failed after ${responseTime}ms: ${error.message}`);
      
      this.results[modelType].push(result);
      return result;
    }
  }

  async runComparison() {
    console.log('🚀 Starting SageMaker vs Bedrock comparison tests...\n');

    for (const test of testQueries) {
      console.log(`\n${'='.repeat(60)}`);
      console.log(`📋 Testing Query: "${test.query}"`);
      console.log(`🎯 Context: ${JSON.stringify(test.context)}`);
      
      // Test both models with the same query
      await Promise.all([
        this.testModel('bedrock', test.query, test.context),
        this.testModel('sagemaker', test.query, test.context)
      ]);

      // Add delay between tests
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    this.generateReport();
  }

  generateReport() {
    console.log('\n' + '='.repeat(80));
    console.log('📊 TEST RESULTS SUMMARY');
    console.log('='.repeat(80));

    const models = ['bedrock', 'sagemaker'];
    
    models.forEach(model => {
      const results = this.results[model];
      const successful = results.filter(r => r.success);
      const failed = results.filter(r => !r.success);
      const avgResponseTime = successful.length > 0 
        ? successful.reduce((sum, r) => sum + r.responseTime, 0) / successful.length 
        : 0;

      console.log(`\n🤖 ${model.toUpperCase()} Results:`);
      console.log(`  ✅ Successful: ${successful.length}/${results.length}`);
      console.log(`  ❌ Failed: ${failed.length}/${results.length}`);
      console.log(`  ⏱️ Avg Response Time: ${Math.round(avgResponseTime)}ms`);
      
      if (failed.length > 0) {
        console.log(`  🚨 Errors:`);
        failed.forEach(f => {
          console.log(`    - ${f.error} (${f.errorCode || 'Unknown'})`);
        });
      }
    });

    // Comparison
    const bedrockSuccessRate = this.results.bedrock.filter(r => r.success).length / this.results.bedrock.length;
    const sagemakerSuccessRate = this.results.sagemaker.filter(r => r.success).length / this.results.sagemaker.length;
    
    const bedrockAvgTime = this.results.bedrock.filter(r => r.success)
      .reduce((sum, r) => sum + r.responseTime, 0) / this.results.bedrock.filter(r => r.success).length || 0;
    const sagemakerAvgTime = this.results.sagemaker.filter(r => r.success)
      .reduce((sum, r) => sum + r.responseTime, 0) / this.results.sagemaker.filter(r => r.success).length || 0;

    console.log('\n🏆 COMPARISON:');
    console.log(`  Success Rate: Bedrock ${(bedrockSuccessRate * 100).toFixed(1)}% vs SageMaker ${(sagemakerSuccessRate * 100).toFixed(1)}%`);
    console.log(`  Speed: Bedrock ${Math.round(bedrockAvgTime)}ms vs SageMaker ${Math.round(sagemakerAvgTime)}ms`);
    
    if (bedrockSuccessRate > sagemakerSuccessRate) {
      console.log('  🥇 Bedrock has better reliability');
    } else if (sagemakerSuccessRate > bedrockSuccessRate) {
      console.log('  🥇 SageMaker has better reliability');
    } else {
      console.log('  🤝 Both models have equal reliability');
    }

    if (bedrockAvgTime < sagemakerAvgTime) {
      console.log('  ⚡ Bedrock is faster');
    } else if (sagemakerAvgTime < bedrockAvgTime) {
      console.log('  ⚡ SageMaker is faster');
    } else {
      console.log('  ⚖️ Both models have similar speed');
    }

    // Save detailed results
    this.saveResults();
  }

  saveResults() {
    const fs = require('fs');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `test-results-${timestamp}.json`;
    
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        bedrock: {
          total: this.results.bedrock.length,
          successful: this.results.bedrock.filter(r => r.success).length,
          avgResponseTime: this.results.bedrock.filter(r => r.success)
            .reduce((sum, r) => sum + r.responseTime, 0) / this.results.bedrock.filter(r => r.success).length || 0
        },
        sagemaker: {
          total: this.results.sagemaker.length,
          successful: this.results.sagemaker.filter(r => r.success).length,
          avgResponseTime: this.results.sagemaker.filter(r => r.success)
            .reduce((sum, r) => sum + r.responseTime, 0) / this.results.sagemaker.filter(r => r.success).length || 0
        }
      },
      detailedResults: this.results
    };

    fs.writeFileSync(filename, JSON.stringify(report, null, 2));
    console.log(`\n💾 Detailed results saved to: ${filename}`);
  }
}

// Health check function
async function healthCheck() {
  console.log('🔍 Performing health check...');
  
  try {
    const response = await axios.get(`${API_BASE_URL}/api/health`, { timeout: 5000 });
    console.log('✅ API is healthy');
    return true;
  } catch (error) {
    console.log(`❌ API health check failed: ${error.message}`);
    console.log(`💡 Make sure your server is running at ${API_BASE_URL}`);
    return false;
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'test';

  if (command === 'health') {
    await healthCheck();
    return;
  }

  if (command === 'test') {
    console.log('🎯 SageMaker Integration Test Suite');
    console.log(`🌐 Testing API at: ${API_BASE_URL}`);
    
    // Health check first
    const isHealthy = await healthCheck();
    if (!isHealthy) {
      process.exit(1);
    }

    const tester = new SageMakerTester();
    await tester.runComparison();
    
    console.log('\n✨ Testing complete!');
    return;
  }

  console.log(`❌ Unknown command: ${command}`);
  console.log('💡 Available commands: test, health');
}

// Handle uncaught errors
process.on('unhandledRejection', (error) => {
  console.error('💥 Unhandled error:', error);
  process.exit(1);
});

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { SageMakerTester, healthCheck };