/**
 * Comprehensive Test Runner
 * Runs 200+ test cases and generates detailed results
 */

const axios = require('axios');
const fs = require('fs');
const TestGenerator = require('./test-generator');

const API_URL = 'http://localhost:3000/verify';

class TestRunner {
  constructor() {
    this.results = {
      summary: {},
      details: [],
      startTime: null,
      endTime: null,
      duration: null
    };
  }

  /**
   * Run a single test case
   */
  async runTest(testCase) {
    const startTime = Date.now();
    
    try {
      const response = await axios.post(API_URL, {
        referenceCode: testCase.referenceCode,
        userCode: testCase.userCode,
        testInputs: testCase.testInputs || []
      }, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 30000 // 30 second timeout
      });

      const result = response.data;
      const duration = Date.now() - startTime;
      
      const passed = result.verdict === testCase.expectedVerdict;
      
      return {
        success: true,
        passed,
        testId: testCase.id,
        category: testCase.category,
        subcategory: testCase.subcategory,
        operation: testCase.operation,
        language: testCase.language,
        expectedVerdict: testCase.expectedVerdict,
        actualVerdict: result.verdict,
        duration,
        tacUsed: result.logic_correctness?.tac_logic?.passed !== undefined,
        aiUsed: result.logic_correctness?.ai_verification?.ai_used === true,
        aiVerdict: result.ai_analysis?.verdict || null,
        aiConfidence: result.ai_analysis?.confidence || null,
        tacOperations: result.logic_correctness?.tac_logic?.operations || null,
        errorType: testCase.error_type || testCase.cheat_type || null
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      return {
        success: false,
        passed: false,
        testId: testCase.id,
        category: testCase.category,
        subcategory: testCase.subcategory,
        operation: testCase.operation,
        language: testCase.language,
        expectedVerdict: testCase.expectedVerdict,
        actualVerdict: 'ERROR',
        duration,
        error: error.message,
        tacUsed: false,
        aiUsed: false
      };
    }
  }

  /**
   * Run all tests in a category
   */
  async runCategory(tests, categoryName) {
    console.log(`\n${'='.repeat(80)}`);
    console.log(`Running ${categoryName.toUpperCase()} tests (${tests.length} total)`);
    console.log('='.repeat(80));

    const results = [];
    let passed = 0;
    let failed = 0;

    for (let i = 0; i < tests.length; i++) {
      const test = tests[i];
      const progress = `[${i + 1}/${tests.length}]`;
      
      process.stdout.write(`${progress} Test ${test.id} (${test.subcategory}/${test.operation}/${test.language})... `);
      
      const result = await this.runTest(test);
      results.push(result);
      
      if (result.passed) {
        passed++;
        console.log('✅ PASS');
      } else {
        failed++;
        console.log(`❌ FAIL (Expected: ${result.expectedVerdict}, Got: ${result.actualVerdict})`);
      }
      
      // Small delay to avoid overwhelming the server
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log(`\n${categoryName} Results: ${passed} passed, ${failed} failed (${((passed / tests.length) * 100).toFixed(1)}% accuracy)`);
    
    return results;
  }

  /**
   * Run all tests
   */
  async runAll() {
    this.results.startTime = new Date().toISOString();
    const startTimeMs = Date.now();

    console.log('🚀 Starting Comprehensive Test Suite');
    console.log('Generating test cases...');

    const generator = new TestGenerator();
    const allTests = generator.generateAll();

    console.log(`\nGenerated ${allTests.genuine.length + allTests.incorrect.length + allTests.cheating.length} tests:`);
    console.log(`  - Genuine (correct): ${allTests.genuine.length}`);
    console.log(`  - Incorrect (logic errors): ${allTests.incorrect.length}`);
    console.log(`  - Cheating (hardcoded/patterns): ${allTests.cheating.length}`);

    // Run each category
    const genuineResults = await this.runCategory(allTests.genuine, 'GENUINE');
    const incorrectResults = await this.runCategory(allTests.incorrect, 'INCORRECT');
    const cheatingResults = await this.runCategory(allTests.cheating, 'CHEATING');

    // Combine results
    const allResults = [...genuineResults, ...incorrectResults, ...cheatingResults];
    this.results.details = allResults;
    this.results.endTime = new Date().toISOString();
    this.results.duration = ((Date.now() - startTimeMs) / 1000).toFixed(2);

    // Generate summary
    this.generateSummary();
    
    return this.results;
  }

  /**
   * Generate summary statistics
   */
  generateSummary() {
    const details = this.results.details;
    
    // Overall stats
    const total = details.length;
    const passed = details.filter(r => r.passed).length;
    const failed = total - passed;
    const accuracy = ((passed / total) * 100).toFixed(2);
    
    // By category
    const byCategory = {};
    ['genuine', 'incorrect', 'cheating'].forEach(cat => {
      const catTests = details.filter(r => r.category === cat);
      byCategory[cat] = {
        total: catTests.length,
        passed: catTests.filter(r => r.passed).length,
        failed: catTests.filter(r => !r.passed).length,
        accuracy: ((catTests.filter(r => r.passed).length / catTests.length) * 100).toFixed(2)
      };
    });

    // By language
    const byLanguage = {};
    ['cpp', 'python', 'javascript'].forEach(lang => {
      const langTests = details.filter(r => r.language === lang);
      if (langTests.length > 0) {
        byLanguage[lang] = {
          total: langTests.length,
          passed: langTests.filter(r => r.passed).length,
          failed: langTests.filter(r => !r.passed).length,
          accuracy: ((langTests.filter(r => r.passed).length / langTests.length) * 100).toFixed(2)
        };
      }
    });

    // AI usage stats
    const aiUsed = details.filter(r => r.aiUsed).length;
    const aiCorrect = details.filter(r => r.aiUsed && r.passed).length;
    const aiIncorrect = details.filter(r => r.aiUsed && !r.passed).length;

    // TAC usage stats
    const tacUsed = details.filter(r => r.tacUsed).length;

    // Performance stats
    const durations = details.map(r => r.duration);
    const avgDuration = (durations.reduce((a, b) => a + b, 0) / durations.length).toFixed(2);
    const minDuration = Math.min(...durations);
    const maxDuration = Math.max(...durations);

    // Error types for incorrect category
    const incorrectTests = details.filter(r => r.category === 'incorrect');
    const errorTypeStats = {};
    incorrectTests.forEach(test => {
      const type = test.errorType || 'unknown';
      if (!errorTypeStats[type]) {
        errorTypeStats[type] = { total: 0, detected: 0 };
      }
      errorTypeStats[type].total++;
      if (test.passed) {
        errorTypeStats[type].detected++;
      }
    });

    // Cheating pattern stats
    const cheatingTests = details.filter(r => r.category === 'cheating');
    const cheatTypeStats = {};
    cheatingTests.forEach(test => {
      const type = test.errorType || 'unknown';
      if (!cheatTypeStats[type]) {
        cheatTypeStats[type] = { total: 0, detected: 0 };
      }
      cheatTypeStats[type].total++;
      if (test.passed) {
        cheatTypeStats[type].detected++;
      }
    });

    this.results.summary = {
      overall: {
        total,
        passed,
        failed,
        accuracy: accuracy + '%'
      },
      byCategory,
      byLanguage,
      ai: {
        totalInvocations: aiUsed,
        correctDecisions: aiCorrect,
        incorrectDecisions: aiIncorrect,
        accuracy: aiUsed > 0 ? ((aiCorrect / aiUsed) * 100).toFixed(2) + '%' : 'N/A'
      },
      tac: {
        totalUsage: tacUsed,
        usageRate: ((tacUsed / total) * 100).toFixed(2) + '%'
      },
      performance: {
        totalDuration: this.results.duration + 's',
        avgPerTest: avgDuration + 'ms',
        minDuration: minDuration + 'ms',
        maxDuration: maxDuration + 'ms'
      },
      errorTypeDetection: errorTypeStats,
      cheatingDetection: cheatTypeStats
    };
  }

  /**
   * Print summary to console
   */
  printSummary() {
    const s = this.results.summary;
    
    console.log('\n' + '='.repeat(80));
    console.log('📊 COMPREHENSIVE TEST RESULTS');
    console.log('='.repeat(80));
    
    console.log('\n🎯 OVERALL RESULTS:');
    console.log(`   Total Tests: ${s.overall.total}`);
    console.log(`   Passed: ${s.overall.passed} ✅`);
    console.log(`   Failed: ${s.overall.failed} ❌`);
    console.log(`   Accuracy: ${s.overall.accuracy}`);
    
    console.log('\n📁 BY CATEGORY:');
    Object.keys(s.byCategory).forEach(cat => {
      const stats = s.byCategory[cat];
      console.log(`   ${cat.toUpperCase()}: ${stats.passed}/${stats.total} passed (${stats.accuracy}%)`);
    });
    
    console.log('\n💻 BY LANGUAGE:');
    Object.keys(s.byLanguage).forEach(lang => {
      const stats = s.byLanguage[lang];
      console.log(`   ${lang.toUpperCase()}: ${stats.passed}/${stats.total} passed (${stats.accuracy}%)`);
    });
    
    console.log('\n🤖 AI VERIFICATION:');
    console.log(`   Invocations: ${s.ai.totalInvocations}`);
    console.log(`   Correct Decisions: ${s.ai.correctDecisions}`);
    console.log(`   Accuracy: ${s.ai.accuracy}`);
    
    console.log('\n🔍 TAC ANALYSIS:');
    console.log(`   Usage: ${s.tac.totalUsage}/${s.overall.total} (${s.tac.usageRate})`);
    
    console.log('\n⚡ PERFORMANCE:');
    console.log(`   Total Duration: ${s.performance.totalDuration}`);
    console.log(`   Avg Per Test: ${s.performance.avgPerTest}`);
    console.log(`   Min: ${s.performance.minDuration}, Max: ${s.performance.maxDuration}`);
    
    if (Object.keys(s.errorTypeDetection).length > 0) {
      console.log('\n🐛 ERROR TYPE DETECTION:');
      Object.keys(s.errorTypeDetection).forEach(type => {
        const stats = s.errorTypeDetection[type];
        const rate = ((stats.detected / stats.total) * 100).toFixed(1);
        console.log(`   ${type}: ${stats.detected}/${stats.total} detected (${rate}%)`);
      });
    }
    
    if (Object.keys(s.cheatingDetection).length > 0) {
      console.log('\n🚩 CHEATING PATTERN DETECTION:');
      Object.keys(s.cheatingDetection).forEach(type => {
        const stats = s.cheatingDetection[type];
        const rate = ((stats.detected / stats.total) * 100).toFixed(1);
        console.log(`   ${type}: ${stats.detected}/${stats.total} detected (${rate}%)`);
      });
    }
    
    console.log('\n' + '='.repeat(80));
  }

  /**
   * Save results to file
   */
  saveResults(filename = 'test-results.json') {
    fs.writeFileSync(filename, JSON.stringify(this.results, null, 2));
    console.log(`\n💾 Results saved to ${filename}`);
  }

  /**
   * Generate markdown documentation
   */
  generateMarkdown() {
    const s = this.results.summary;
    const timestamp = new Date().toLocaleString();
    
    let md = `# Comprehensive Verification System Test Results

**Generated:** ${timestamp}  
**Duration:** ${s.performance.totalDuration}  
**Total Tests:** ${s.overall.total}

---

## 📊 Executive Summary

| Metric | Value |
|--------|-------|
| **Total Tests** | ${s.overall.total} |
| **Passed** | ${s.overall.passed} ✅ |
| **Failed** | ${s.overall.failed} ❌ |
| **Overall Accuracy** | **${s.overall.accuracy}** |

---

## 🎯 Results by Category

### Genuine (Correct Implementations)
Tests with correct logic that should pass verification.

| Language | Tests | Passed | Failed | Accuracy |
|----------|-------|--------|--------|----------|
| **ALL** | **${s.byCategory.genuine.total}** | **${s.byCategory.genuine.passed}** | **${s.byCategory.genuine.failed}** | **${s.byCategory.genuine.accuracy}%** |
`;

    // Add language breakdown for genuine
    ['cpp', 'python', 'javascript'].forEach(lang => {
      const langTests = this.results.details.filter(r => r.category === 'genuine' && r.language === lang);
      if (langTests.length > 0) {
        const passed = langTests.filter(r => r.passed).length;
        const accuracy = ((passed / langTests.length) * 100).toFixed(1);
        md += `| ${lang.toUpperCase()} | ${langTests.length} | ${passed} | ${langTests.length - passed} | ${accuracy}% |\n`;
      }
    });

    md += `\n**Verdict:** ${s.byCategory.genuine.accuracy >= 95 ? '✅ Excellent' : s.byCategory.genuine.accuracy >= 90 ? '✅ Good' : '⚠️ Needs Improvement'} - System correctly identifies valid implementations.

---

### Incorrect (Logic Errors)
Tests with wrong operations, off-by-one errors, swapped operands, etc.

| Language | Tests | Passed | Failed | Accuracy |
|----------|-------|--------|--------|----------|
| **ALL** | **${s.byCategory.incorrect.total}** | **${s.byCategory.incorrect.passed}** | **${s.byCategory.incorrect.failed}** | **${s.byCategory.incorrect.accuracy}%** |
`;

    ['cpp', 'python', 'javascript'].forEach(lang => {
      const langTests = this.results.details.filter(r => r.category === 'incorrect' && r.language === lang);
      if (langTests.length > 0) {
        const passed = langTests.filter(r => r.passed).length;
        const accuracy = ((passed / langTests.length) * 100).toFixed(1);
        md += `| ${lang.toUpperCase()} | ${langTests.length} | ${passed} | ${langTests.length - passed} | ${accuracy}% |\n`;
      }
    });

    md += `\n**Verdict:** ${s.byCategory.incorrect.accuracy >= 95 ? '✅ Excellent' : s.byCategory.incorrect.accuracy >= 90 ? '✅ Good' : '⚠️ Needs Improvement'} - System detects logic errors.

#### Error Type Detection Breakdown

| Error Type | Detected | Total | Detection Rate |
|------------|----------|-------|----------------|
`;

    Object.keys(s.errorTypeDetection).forEach(type => {
      const stats = s.errorTypeDetection[type];
      const rate = ((stats.detected / stats.total) * 100).toFixed(1);
      const icon = rate >= 90 ? '✅' : rate >= 75 ? '⚠️' : '❌';
      md += `| ${type.replace(/_/g, ' ')} ${icon} | ${stats.detected} | ${stats.total} | ${rate}% |\n`;
    });

    md += `\n---

### Cheating (Hardcoded/Pattern Matching)
Tests attempting to game the system with hardcoded values, conditional checks, etc.

| Language | Tests | Passed | Failed | Accuracy |
|----------|-------|--------|--------|----------|
| **ALL** | **${s.byCategory.cheating.total}** | **${s.byCategory.cheating.passed}** | **${s.byCategory.cheating.failed}** | **${s.byCategory.cheating.accuracy}%** |
`;

    ['cpp', 'python', 'javascript'].forEach(lang => {
      const langTests = this.results.details.filter(r => r.category === 'cheating' && r.language === lang);
      if (langTests.length > 0) {
        const passed = langTests.filter(r => r.passed).length;
        const accuracy = ((passed / langTests.length) * 100).toFixed(1);
        md += `| ${lang.toUpperCase()} | ${langTests.length} | ${passed} | ${langTests.length - passed} | ${accuracy}% |\n`;
      }
    });

    md += `\n**Verdict:** ${s.byCategory.cheating.accuracy >= 95 ? '✅ Excellent' : s.byCategory.cheating.accuracy >= 90 ? '✅ Good' : '❌ Critical Issue'} - System catches cheating attempts.

#### Cheating Pattern Detection Breakdown

| Cheat Type | Detected | Total | Detection Rate |
|------------|----------|-------|----------------|
`;

    Object.keys(s.cheatingDetection).forEach(type => {
      const stats = s.cheatingDetection[type];
      const rate = ((stats.detected / stats.total) * 100).toFixed(1);
      const icon = rate >= 90 ? '✅' : rate >= 75 ? '⚠️' : '❌';
      md += `| ${type.replace(/_/g, ' ')} ${icon} | ${stats.detected} | ${stats.total} | ${rate}% |\n`;
    });

    md += `\n---

## 🤖 AI Verification Performance

The AI acts as a secondary judge when TAC comparison is unclear.

| Metric | Value |
|--------|-------|
| **Total AI Invocations** | ${s.ai.totalInvocations} |
| **Correct Decisions** | ${s.ai.correctDecisions} |
| **Incorrect Decisions** | ${s.ai.incorrectDecisions} |
| **AI Accuracy** | **${s.ai.accuracy}** |
| **Invocation Rate** | ${((s.ai.totalInvocations / s.overall.total) * 100).toFixed(1)}% of all tests |

**Analysis:** ${s.ai.totalInvocations > 0 ? 
  (parseFloat(s.ai.accuracy) >= 95 ? '✅ AI provides highly accurate secondary verification.' : 
   parseFloat(s.ai.accuracy) >= 85 ? '✅ AI verification is reliable and effective.' : 
   '⚠️ AI accuracy needs improvement or more training data.') : 
  '⚠️ AI was not invoked - check if API key is configured.'}

---

## 🔍 TAC (Three-Address Code) Analysis

TAC logic checking is the primary verification method.

| Metric | Value |
|--------|-------|
| **Tests Using TAC** | ${s.tac.totalUsage} / ${s.overall.total} |
| **Usage Rate** | ${s.tac.usageRate} |

**Analysis:** ${parseFloat(s.tac.usageRate) >= 90 ? '✅ TAC extraction working reliably.' : '⚠️ TAC extraction may have issues - some tests falling back to output-only verification.'}

---

## ⚡ Performance Metrics

| Metric | Value |
|--------|-------|
| **Total Duration** | ${s.performance.totalDuration} |
| **Average per Test** | ${s.performance.avgPerTest} |
| **Fastest Test** | ${s.performance.minDuration} |
| **Slowest Test** | ${s.performance.maxDuration} |
| **Throughput** | ${(s.overall.total / parseFloat(this.results.duration)).toFixed(1)} tests/second |

---

## 💻 Language Support

| Language | Tests | Passed | Accuracy |
|----------|-------|--------|----------|
`;

    Object.keys(s.byLanguage).forEach(lang => {
      const stats = s.byLanguage[lang];
      md += `| **${lang.toUpperCase()}** | ${stats.total} | ${stats.passed} | ${stats.accuracy}% |\n`;
    });

    md += `\n---

## 🎯 Recommendations

`;

    // Generate recommendations based on results
    const overallAcc = parseFloat(s.overall.accuracy);
    const genuineAcc = parseFloat(s.byCategory.genuine.accuracy);
    const incorrectAcc = parseFloat(s.byCategory.incorrect.accuracy);
    const cheatingAcc = parseFloat(s.byCategory.cheating.accuracy);

    if (overallAcc >= 95) {
      md += `### ✅ System Status: Excellent

The verification system demonstrates excellent performance across all categories:
- ✅ Correctly identifies genuine implementations (${s.byCategory.genuine.accuracy}%)
- ✅ Effectively detects logic errors (${s.byCategory.incorrect.accuracy}%)
- ✅ Catches cheating patterns (${s.byCategory.cheating.accuracy}%)

**Ready for Production Use.**
`;
    } else {
      md += `### ⚠️ System Status: Needs Attention\n\n`;
      
      if (genuineAcc < 95) {
        md += `- ⚠️ **False Negatives**: ${100 - genuineAcc}% of correct implementations incorrectly flagged. Review TAC comparison logic.\n`;
      }
      if (incorrectAcc < 90) {
        md += `- ⚠️ **Missed Logic Errors**: ${100 - incorrectAcc}% of incorrect implementations not detected. Improve error pattern detection.\n`;
      }
      if (cheatingAcc < 95) {
        md += `- ❌ **Critical**: ${100 - cheatingAcc}% of cheating attempts not caught. Enhance AI verification and TAC analysis.\n`;
      }
      
      md += `\n**Action Required**: Address the issues above before production deployment.\n`;
    }

    md += `\n---

## 📝 Test Coverage Summary

`;

    // Count unique subcategories tested
    const subcategories = [...new Set(this.results.details.map(r => r.subcategory))];
    const operations = [...new Set(this.results.details.map(r => r.operation))];
    
    md += `- **Test Categories**: 3 (Genuine, Incorrect, Cheating)
- **Subcategories Tested**: ${subcategories.length}
- **Operations Tested**: ${operations.length}
- **Languages Tested**: ${Object.keys(s.byLanguage).length}
- **Total Test Variations**: ${s.overall.total}

### Coverage Areas:
1. **Correct Implementations** (${s.byCategory.genuine.total} tests)
   - Simple arithmetic operations
   - Intermediate variable usage
   - Multiple operations
   - Legitimate conditionals
   - Different coding styles

2. **Logic Errors** (${s.byCategory.incorrect.total} tests)
   - Wrong operations
   - Off-by-one errors
   - Swapped operands
   - Missing operations
   - Incorrect formulas

3. **Cheating Patterns** (${s.byCategory.cheating.total} tests)
   - Hardcoded return values
   - Conditional hardcoding (pattern matching)
   - Output manipulation

---

## 🔬 Detailed Test Breakdown

### Failed Tests Analysis

`;

    const failedTests = this.results.details.filter(r => !r.passed);
    if (failedTests.length === 0) {
      md += `✅ **No failed tests!** All ${s.overall.total} tests passed successfully.\n`;
    } else {
      md += `❌ ${failedTests.length} tests failed:\n\n`;
      
      // Group by category
      ['genuine', 'incorrect', 'cheating'].forEach(cat => {
        const catFailed = failedTests.filter(r => r.category === cat);
        if (catFailed.length > 0) {
          md += `#### ${cat.charAt(0).toUpperCase() + cat.slice(1)} Category (${catFailed.length} failures)\n\n`;
          catFailed.slice(0, 10).forEach(test => {
            md += `- **Test ${test.testId}**: ${test.subcategory} (${test.language})\n`;
            md += `  - Expected: ${test.expectedVerdict}, Got: ${test.actualVerdict}\n`;
            if (test.error) {
              md += `  - Error: ${test.error}\n`;
            }
          });
          if (catFailed.length > 10) {
            md += `\n*... and ${catFailed.length - 10} more failures in this category*\n`;
          }
          md += `\n`;
        }
      });
    }

    md += `---

## 📊 Conclusion

`;

    if (overallAcc >= 95) {
      md += `The verification system has achieved **${s.overall.accuracy}** accuracy across ${s.overall.total} diverse test cases, demonstrating:

✅ **Production-Ready Verification**
- Reliable detection of logic errors
- Effective prevention of cheating attempts
- Consistent performance across multiple programming languages
- Fast execution (${s.performance.avgPerTest} average per test)

The system successfully combines:
1. **TAC Logic Analysis** (Primary verification)
2. **AI-Powered Detection** (Secondary judge for edge cases)
3. **Output Validation** (Final correctness check)

**Status**: ✅ Ready for deployment in educational/competitive programming platforms.
`;
    } else {
      md += `The verification system achieved **${s.overall.accuracy}** accuracy across ${s.overall.total} test cases.

While functional, the system requires improvements in:
`;
      if (genuineAcc < 95) md += `- Reducing false positives on correct implementations\n`;
      if (incorrectAcc < 90) md += `- Improving detection of subtle logic errors\n`;
      if (cheatingAcc < 95) md += `- Enhancing cheating pattern detection\n`;
      
      md += `\n**Status**: ⚠️ Functional but needs refinement before production deployment.\n`;
    }

    md += `\n---

*Test Suite Generated and Executed: ${timestamp}*  
*Verification System Version: 1.0*  
*TAC + AI Hybrid Verification Approach*
`;

    return md;
  }

  /**
   * Save markdown documentation
   */
  saveMarkdown(filename = 'TEST_RESULTS.md') {
    const markdown = this.generateMarkdown();
    fs.writeFileSync(filename, markdown);
    console.log(`📄 Documentation saved to ${filename}`);
  }
}

// CLI usage
if (require.main === module) {
  const runner = new TestRunner();
  
  runner.runAll()
    .then(() => {
      runner.printSummary();
      runner.saveResults('test-results.json');
      runner.saveMarkdown('TEST_RESULTS.md');
      
      console.log('\n✅ Test suite complete!');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n❌ Test suite failed:', error);
      process.exit(1);
    });
}
