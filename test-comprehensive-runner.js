/**
 * Comprehensive Test Runner - Catches ALL Cheating Patterns
 * 
 * Tests multiple user code samples against 15 diverse test cases
 * to demonstrate how conditional hardcoding gets caught.
 */

const axios = require('axios');
const fs = require('fs');

const API_URL = 'http://localhost:3000/api/verify';

// Load test cases
const testSuite = JSON.parse(fs.readFileSync('./test-cases-comprehensive.json', 'utf8'));

// Define user code samples with different cheating patterns
const userCodeSamples = {
  
  // ✅ CORRECT: Real algorithm
  correct: {
    name: "✅ CORRECT ALGORITHM",
    language: "c",
    code: `int add(int a, int b) {
    return a + b;
}

int main() {
    int x, y;
    scanf("%d %d", &x, &y);
    printf("%d", add(x, y));
    return 0;
}`
  },

  // ❌ CHEATING PATTERN 1: Hardcoded constant
  hardcoded_constant: {
    name: "❌ HARDCODED CONSTANT (return 8)",
    language: "c",
    code: `int add(int a, int b) {
    return 8;  // Hardcoded!
}

int main() {
    int x, y;
    scanf("%d %d", &x, &y);
    printf("%d", add(x, y));
    return 0;
}`
  },

  // ❌ CHEATING PATTERN 2: Conditional hardcoding (exact match)
  conditional_exact: {
    name: "❌ CONDITIONAL HARDCODING if(a==5 && b==3)",
    language: "c",
    code: `int add(int a, int b) {
    if (a == 5 && b == 3) return 8;
    return 0;  // Wrong for everything else
}

int main() {
    int x, y;
    scanf("%d %d", &x, &y);
    printf("%d", add(x, y));
    return 0;
}`
  },

  // ❌ CHEATING PATTERN 3: Partial conditional (checks only 'a')
  conditional_partial: {
    name: "❌ PARTIAL CONDITIONAL if(a==5)",
    language: "c",
    code: `int add(int a, int b) {
    if (a == 5) return 8;
    return a + b;  // Real algorithm as fallback
}

int main() {
    int x, y;
    scanf("%d %d", &x, &y);
    printf("%d", add(x, y));
    return 0;
}`
  },

  // ❌ CHEATING PATTERN 4: Output-specific conditional
  conditional_output: {
    name: "❌ OUTPUT-BASED CONDITIONAL if(a+b==8)",
    language: "c",
    code: `int add(int a, int b) {
    if (a + b == 8) return 8;
    return 0;  // Wrong for other outputs
}

int main() {
    int x, y;
    scanf("%d %d", &x, &y);
    printf("%d", add(x, y));
    return 0;
}`
  },

  // ❌ CHEATING PATTERN 5: Ignores parameter (return a)
  ignore_b: {
    name: "❌ IGNORES PARAMETER B (return a)",
    language: "c",
    code: `int add(int a, int b) {
    return a;  // Ignores b!
}

int main() {
    int x, y;
    scanf("%d %d", &x, &y);
    printf("%d", add(x, y));
    return 0;
}`
  },

  // ❌ CHEATING PATTERN 6: Lookup table for common inputs
  lookup_table: {
    name: "❌ LOOKUP TABLE (multiple hardcoded cases)",
    language: "c",
    code: `int add(int a, int b) {
    if (a == 5 && b == 3) return 8;
    if (a == 3 && b == 5) return 8;
    if (a == 10 && b == 20) return 30;
    if (a == 0 && b == 0) return 0;
    return 0;  // Wrong for everything else
}

int main() {
    int x, y;
    scanf("%d %d", &x, &y);
    printf("%d", add(x, y));
    return 0;
}`
  }
};

// Test runner
async function runTestSuite(userCodeSample) {
  console.log('\n' + '='.repeat(80));
  console.log(`TESTING: ${userCodeSample.name}`);
  console.log('='.repeat(80));

  let passCount = 0;
  let failCount = 0;
  const failures = [];

  for (const testCase of testSuite.test_cases) {
    try {
      const response = await axios.post(API_URL, {
        referenceCode: {
          language: testSuite.reference_code.language,
          code: testSuite.reference_code.code,
          stdin: testCase.stdin
        },
        userCode: {
          language: userCodeSample.language,
          code: userCodeSample.code,
          stdin: testCase.stdin
        }
      }, {
        timeout: 10000
      });

      const result = response.data;
      const passed = result.verdict === 'CORRECT';

      if (passed) {
        passCount++;
        console.log(`  ✅ Test ${testCase.id}: ${testCase.name} - PASS`);
      } else {
        failCount++;
        failures.push({
          test: testCase,
          reason: result.failure_reason || 'Unknown',
          message: result.message
        });
        console.log(`  ❌ Test ${testCase.id}: ${testCase.name} - FAIL (${result.failure_reason})`);
      }

    } catch (error) {
      failCount++;
      failures.push({
        test: testCase,
        reason: 'API_ERROR',
        message: error.message
      });
      console.log(`  ❌ Test ${testCase.id}: ${testCase.name} - ERROR: ${error.message}`);
    }

    // Small delay to avoid overwhelming the API
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  console.log('\n' + '-'.repeat(80));
  console.log(`RESULTS: ${passCount}/${testSuite.test_cases.length} tests passed`);
  
  if (failCount > 0) {
    console.log(`\n🚨 FAILED ${failCount} tests:`);
    failures.forEach((failure, idx) => {
      console.log(`  ${idx + 1}. Test ${failure.test.id} (${failure.test.name})`);
      console.log(`     Reason: ${failure.reason}`);
      console.log(`     Message: ${failure.message.substring(0, 100)}...`);
    });
    console.log(`\n❌ VERDICT: CHEATING DETECTED - Code failed on multiple test cases`);
  } else {
    console.log(`\n✅ VERDICT: ALL TESTS PASSED - Appears to be legitimate algorithm`);
  }

  return { passCount, failCount, failures };
}

// Main execution
async function main() {
  console.log('╔══════════════════════════════════════════════════════════════════════════════╗');
  console.log('║          COMPREHENSIVE ANTI-CHEATING TEST SUITE                             ║');
  console.log('║                                                                              ║');
  console.log('║  15 Diverse Test Cases to Catch:                                            ║');
  console.log('║    • Hardcoded constants                                                    ║');
  console.log('║    • Conditional hardcoding (if a==5 && b==3)                               ║');
  console.log('║    • Partial conditionals (if a==5)                                         ║');
  console.log('║    • Output-based conditionals (if a+b==8)                                  ║');
  console.log('║    • Unused parameters (return a; or return b;)                             ║');
  console.log('║    • Lookup tables (multiple hardcoded cases)                               ║');
  console.log('╚══════════════════════════════════════════════════════════════════════════════╝');

  const results = {};

  // Test each pattern
  for (const [key, sample] of Object.entries(userCodeSamples)) {
    results[key] = await runTestSuite(sample);
    await new Promise(resolve => setTimeout(resolve, 500)); // Delay between samples
  }

  // Summary
  console.log('\n\n');
  console.log('╔══════════════════════════════════════════════════════════════════════════════╗');
  console.log('║                            FINAL SUMMARY                                     ║');
  console.log('╚══════════════════════════════════════════════════════════════════════════════╝');
  
  for (const [key, sample] of Object.entries(userCodeSamples)) {
    const result = results[key];
    const status = result.failCount === 0 ? '✅ PASSED ALL' : `❌ FAILED ${result.failCount}/15`;
    console.log(`  ${status} - ${sample.name}`);
  }

  console.log('\n' + '='.repeat(80));
  console.log('KEY FINDINGS:');
  console.log('='.repeat(80));
  console.log('1. ✅ CORRECT algorithm passes all 15 tests');
  console.log('2. ❌ Hardcoded constant (return 8) - Caught by TAC Logic Check');
  console.log('3. ❌ Conditional (if a==5 && b==3) - Fails on Test 2 (3,5) commutative');
  console.log('4. ❌ Partial conditional (if a==5) - Fails on Test 2 and other variations');
  console.log('5. ❌ Output conditional (if a+b==8) - Fails on large numbers (Test 10,13)');
  console.log('6. ❌ Ignoring parameter - Caught by TAC Logic Check + output mismatches');
  console.log('7. ❌ Lookup table - Eventually fails on uncovered test case');
  console.log('\n✅ CONCLUSION: Multiple diverse test cases + TAC logic check = Strong defense');
}

// Run if called directly
if (require.main === module) {
  main().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
}

module.exports = { runTestSuite, testSuite, userCodeSamples };
