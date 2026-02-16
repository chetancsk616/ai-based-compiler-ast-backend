/**
 * Quick Test - Demonstrates how commutative test catches conditional hardcoding
 * 
 * This shows the KEY INSIGHT:
 * if (a==5 && b==3) return 8; 
 * 
 * Test 1: (5, 3) → Output: 8 ✅ PASS
 * Test 2: (3, 5) → Output: 8 ✅ BUT user returns 0 ❌ FAIL
 * 
 * CAUGHT by simple commutative test!
 */

const axios = require('axios');

const API_URL = 'http://localhost:3000/api/verify';

// Reference code (correct algorithm)
const referenceCode = {
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
};

// Cheating code with conditional hardcoding
const cheatingCode = {
  language: "c",
  code: `int add(int a, int b) {
    // CHEATING: Hardcoded for specific input!
    if (a == 5 && b == 3) return 8;
    return 0;  // Wrong for everything else
}

int main() {
    int x, y;
    scanf("%d %d", &x, &y);
    printf("%d", add(x, y));
    return 0;
}`
};

async function testWithInput(userCode, stdin, testName) {
  try {
    const response = await axios.post(API_URL, {
      referenceCode: {
        ...referenceCode,
        stdin: stdin
      },
      userCode: {
        ...userCode,
        stdin: stdin
      }
    }, {
      timeout: 10000
    });

    const result = response.data;
    const status = result.verdict === 'CORRECT' ? '✅ PASS' : '❌ FAIL';
    
    console.log(`\n${testName}:`);
    console.log(`  Input: ${stdin}`);
    console.log(`  Expected: ${result.reference?.output || 'N/A'}`);
    console.log(`  Got: ${result.user?.output || 'N/A'}`);
    console.log(`  Verdict: ${status}`);
    
    if (result.verdict !== 'CORRECT') {
      console.log(`  Reason: ${result.failure_reason}`);
      console.log(`  Message: ${result.message?.substring(0, 100)}...`);
    }

    return result.verdict === 'CORRECT';

  } catch (error) {
    console.error(`  ❌ ERROR: ${error.message}`);
    return false;
  }
}

async function main() {
  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║   DEMONSTRATION: How Commutative Test Catches Cheating        ║');
  console.log('╚════════════════════════════════════════════════════════════════╝');
  
  console.log('\n📋 Cheating Code:');
  console.log('   if (a == 5 && b == 3) return 8;');
  console.log('   return 0;  // Wrong for other inputs');
  
  console.log('\n🧪 Running Tests...\n');
  console.log('─'.repeat(64));

  // Test 1: The "obvious" test case (5, 3)
  const test1 = await testWithInput(cheatingCode, '5 3', 'Test 1: Input (5, 3)');
  
  await new Promise(resolve => setTimeout(resolve, 500));

  // Test 2: Commutative test (3, 5) - THE KILLER TEST
  const test2 = await testWithInput(cheatingCode, '3 5', 'Test 2: Input (3, 5) - COMMUTATIVE');
  
  await new Promise(resolve => setTimeout(resolve, 500));

  // Test 3: Completely different input
  const test3 = await testWithInput(cheatingCode, '10 20', 'Test 3: Input (10, 20) - DIFFERENT');

  console.log('\n' + '─'.repeat(64));
  console.log('\n📊 RESULTS:');
  console.log(`  Test 1 (5, 3):    ${test1 ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`  Test 2 (3, 5):    ${test2 ? '✅ PASS' : '❌ FAIL'} ← CRITICAL: Catches cheating!`);
  console.log(`  Test 3 (10, 20):  ${test3 ? '✅ PASS' : '❌ FAIL'}`);

  console.log('\n💡 KEY INSIGHT:');
  console.log('   Even if cheating code passes Test 1, it FAILS Test 2');
  console.log('   because if(a==5 && b==3) only works for that exact order.');
  console.log('   The commutative property (a+b = b+a) exposes the cheat!');

  if (!test2) {
    console.log('\n✅ SUCCESS: Conditional hardcoding detected and rejected!');
  } else {
    console.log('\n⚠️  WARNING: Test passed unexpectedly - check TAC logic');
  }

  console.log('\n🎯 RECOMMENDATION:');
  console.log('   Always include at least 2-3 test cases:');
  console.log('   1. Normal case (5, 3)');
  console.log('   2. Commutative (3, 5) ← Catches conditional hardcoding');
  console.log('   3. Different values (10, 20) ← Catches pattern matching');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
