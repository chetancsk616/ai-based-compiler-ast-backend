/**
 * Multi-Input Test for Conditional Hardcoding Detection
 * Tests the pattern: if (a==5 && b==3) return 8; else return a+b;
 */

const axios = require('axios');

const API_URL = 'http://localhost:3000/api/verify';

// Reference code (correct implementation)
const referenceCode = {
  language: 'c',
  code: `
int add(int a, int b) {
    return a + b;
}

int main() {
    int x, y;
    scanf("%d %d", &x, &y);
    printf("%d", add(x, y));
    return 0;
}
`.trim()
};

// Test Case 1: Hardcoded for specific input
const hardcodedConditionCode = {
  language: 'c',
  code: `
int add(int a, int b) {
    if (a == 5 && b == 3) {
        return 8;
    }
    return a + b;
}

int main() {
    int x, y;
    scanf("%d %d", &x, &y);
    printf("%d", add(x, y));
    return 0;
}
`.trim()
};

// Test Case 2: Fully hardcoded (should fail TAC check)
const fullyHardcodedCode = {
  language: 'c',
  code: `
int add(int a, int b) {
    return 8;
}

int main() {
    int x, y;
    scanf("%d %d", &x, &y);
    printf("%d", add(x, y));
    return 0;
}
`.trim()
};

// Test Case 3: Correct implementation
const correctCode = {
  language: 'c',
  code: `
int add(int a, int b) {
    return a + b;
}

int main() {
    int x, y;
    scanf("%d %d", &x, &y);
    printf("%d", add(x, y));
    return 0;
}
`.trim()
};

// Test inputs - diverse to catch conditional hardcoding
const testInputs = [
  { stdin: '5 3', description: 'Original test case (5 + 3 = 8)' },
  { stdin: '10 20', description: 'Different values (10 + 20 = 30)' },
  { stdin: '0 0', description: 'Zero case (0 + 0 = 0)' },
  { stdin: '-5 5', description: 'Negative case (-5 + 5 = 0)' },
  { stdin: '100 1', description: 'Large value (100 + 1 = 101)' },
  { stdin: '3 5', description: 'Reversed inputs (3 + 5 = 8)' }
];

async function testCode(userCode, testName) {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`TEST: ${testName}`);
  console.log(`${'='.repeat(80)}`);

  let allPassed = true;
  let firstFailure = null;

  for (const testInput of testInputs) {
    console.log(`\n  Input: ${testInput.stdin} - ${testInput.description}`);
    
    try {
      const response = await axios.post(API_URL, {
        referenceCode: {
          ...referenceCode,
          stdin: testInput.stdin
        },
        userCode: {
          ...userCode,
          stdin: testInput.stdin
        }
      });

      const result = response.data;
      const verdict = result.verdict;
      const passed = verdict === 'CORRECT';

      if (passed) {
        console.log(`  ✅ PASSED - Verdict: ${verdict}`);
        if (result.logic_correctness?.tac_logic?.reason) {
          console.log(`     TAC: ${result.logic_correctness.tac_logic.reason}`);
        }
      } else {
        console.log(`  ❌ FAILED - Verdict: ${verdict}`);
        console.log(`     Reason: ${result.failure_reason || 'Unknown'}`);
        if (result.message) {
          console.log(`     Message: ${result.message.substring(0, 100)}...`);
        }
        if (result.logic_correctness?.tac_logic) {
          const tac = result.logic_correctness.tac_logic;
          console.log(`     TAC Logic: ${tac.passed ? 'PASS' : 'FAIL'}`);
          console.log(`     TAC Reason: ${tac.reason}`);
          if (tac.operations) {
            console.log(`     Ref Ops:`, tac.operations.reference_operations);
            console.log(`     User Ops:`, tac.operations.user_operations);
          }
        }
        allPassed = false;
        if (!firstFailure) {
          firstFailure = {
            input: testInput.stdin,
            verdict: verdict,
            reason: result.failure_reason
          };
        }
      }
    } catch (error) {
      console.log(`  ❌ ERROR: ${error.response?.data?.error || error.message}`);
      allPassed = false;
      if (!firstFailure) {
        firstFailure = {
          input: testInput.stdin,
          error: error.message
        };
      }
    }
  }

  console.log(`\n  ${'─'.repeat(76)}`);
  if (allPassed) {
    console.log(`  ✅ ALL TESTS PASSED (${testInputs.length}/${testInputs.length})`);
  } else {
    console.log(`  ❌ SOME TESTS FAILED`);
    console.log(`  First Failure: Input "${firstFailure.input}" - ${firstFailure.reason || firstFailure.error}`);
  }

  return allPassed;
}

async function runAllTests() {
  console.log('\n🚀 Starting Multi-Input Test Suite');
  console.log('Purpose: Detect conditional hardcoding patterns\n');

  const results = [];

  // Test 1: Fully hardcoded (should fail on TAC check immediately)
  results.push({
    name: 'Fully Hardcoded (return 8)',
    passed: await testCode(fullyHardcodedCode, 'Fully Hardcoded Code (return 8)')
  });

  // Test 2: Conditional hardcoded (should fail on different inputs)
  results.push({
    name: 'Conditional Hardcoded (if a==5 && b==3)',
    passed: await testCode(hardcodedConditionCode, 'Conditional Hardcoded (if a==5 && b==3 return 8)')
  });

  // Test 3: Correct implementation (should pass all)
  results.push({
    name: 'Correct Implementation (return a+b)',
    passed: await testCode(correctCode, 'Correct Implementation (return a + b)')
  });

  // Summary
  console.log(`\n${'='.repeat(80)}`);
  console.log('FINAL SUMMARY');
  console.log(`${'='.repeat(80)}\n`);

  results.forEach((result, index) => {
    const status = result.passed ? '✅ PASS' : '❌ FAIL';
    const emoji = result.passed ? '🎉' : '🚨';
    console.log(`${index + 1}. ${result.name}`);
    console.log(`   Status: ${status} ${emoji}`);
  });

  const totalPassed = results.filter(r => r.passed).length;
  const totalTests = results.length;

  console.log(`\n${'─'.repeat(80)}`);
  console.log(`Total: ${totalPassed}/${totalTests} test suites passed`);
  
  if (totalPassed === totalTests) {
    console.log('🎉 ALL TEST SUITES PASSED! System is working correctly.');
  } else {
    console.log('⚠️  Some test suites failed. Review the results above.');
  }
  
  // Expected behavior summary
  console.log(`\n${'─'.repeat(80)}`);
  console.log('EXPECTED BEHAVIOR:');
  console.log('1. Fully Hardcoded: ❌ Should FAIL on FIRST test (TAC logic mismatch)');
  console.log('2. Conditional Hardcoded: ❌ Should FAIL on test #2-6 (output mismatch)');
  console.log('3. Correct Implementation: ✅ Should PASS all 6 tests');
  console.log(`${'─'.repeat(80)}\n`);
}

// Run tests
runAllTests().catch(error => {
  console.error('Fatal error:', error.message);
  process.exit(1);
});
