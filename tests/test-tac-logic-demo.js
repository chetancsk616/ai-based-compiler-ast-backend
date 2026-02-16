/**
 * TAC Logic Check Effectiveness Demonstration
 * 
 * Shows how the NEW TAC logic check catches hardcoded values
 * that the OLD output-only check would miss.
 */

const axios = require('axios');

const API_URL = 'http://localhost:3000/api/verify';

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

// Test case that would PASS with old system
const hardcodedCode = {
  language: "c",
  code: `int add(int a, int b) {
    return 8;  // Hardcoded - no computation!
}

int main() {
    int x, y;
    scanf("%d %d", &x, &y);
    printf("%d", add(x, y));
    return 0;
}`
};

async function testHardcodedDetection() {
  console.log('╔═══════════════════════════════════════════════════════════════════╗');
  console.log('║        TAC LOGIC CHECK - Hardcoded Detection Demo                ║');
  console.log('╚═══════════════════════════════════════════════════════════════════╝');
  
  console.log('\n📝 Reference Code:');
  console.log('   int add(int a, int b) {');
  console.log('     return a + b;  // ← Has ADD operation');
  console.log('   }');
  
  console.log('\n🔴 Cheating Code:');
  console.log('   int add(int a, int b) {');
  console.log('     return 8;  // ← No ADD operation!');
  console.log('   }');
  
  console.log('\n' + '─'.repeat(67));
  console.log('🧪 Testing with input (5, 3)...\n');

  try {
    const response = await axios.post(API_URL, {
      referenceCode: {
        ...referenceCode,
        stdin: '5 3'
      },
      userCode: {
        ...hardcodedCode,
        stdin: '5 3'
      }
    }, {
      timeout: 10000
    });

    const result = response.data;
    
    console.log('📊 OUTPUT COMPARISON:');
    console.log(`   Reference output: ${result.reference?.output || 'N/A'}`);
    console.log(`   User output: ${result.user?.output || 'N/A'}`);
    console.log(`   Output match: ${result.logic_correctness?.output_verification?.output_match ? '✅ YES' : '❌ NO'}`);
    
    console.log('\n🔬 TAC LOGIC ANALYSIS:');
    const tacLogic = result.logic_correctness?.tac_logic;
    
    if (tacLogic) {
      console.log(`   Reference operations: ${JSON.stringify(tacLogic.operations?.reference_operations || {})}`);
      console.log(`   User operations: ${JSON.stringify(tacLogic.operations?.user_operations || {})}`);
      console.log(`   TAC logic passed: ${tacLogic.passed ? '✅ YES' : '❌ NO'}`);
      
      if (!tacLogic.passed) {
        console.log(`   Missing operations: ${tacLogic.operations?.missing_operations?.join(', ') || 'N/A'}`);
        console.log(`   Reason: ${tacLogic.reason}`);
      }
      
      if (tacLogic.hardcoded?.detected) {
        console.log(`\n🚨 HARDCODED RETURN DETECTED:`);
        console.log(`   Constant value: ${tacLogic.hardcoded.constant}`);
        console.log(`   Reason: ${tacLogic.hardcoded.reason}`);
      }
    }
    
    console.log('\n' + '─'.repeat(67));
    console.log('🏁 FINAL VERDICT:');
    console.log(`   Verdict: ${result.verdict} ${result.verdict === 'INCORRECT' ? '❌' : '✅'}`);
    console.log(`   Failure reason: ${result.failure_reason || 'N/A'}`);
    
    console.log('\n' + '═'.repeat(67));
    
    if (result.verdict === 'INCORRECT') {
      console.log('✅ SUCCESS: TAC Logic Check caught the hardcoded value!');
      console.log('\n📝 How it works:');
      console.log('   1. Extract operations from both TAC codes');
      console.log('   2. Reference has ADD operation, user does not');
      console.log('   3. Operations mismatch → FAIL immediately');
      console.log('   4. Even though output matched, logic check caught it!');
      
      console.log('\n🎯 OLD SYSTEM (Output-Only):');
      console.log('   Output: 8 == 8 ✅');
      console.log('   Exit code: 0 == 0 ✅');
      console.log('   Verdict: CORRECT ❌ (FALSE POSITIVE!)');
      
      console.log('\n🎯 NEW SYSTEM (TAC Logic):');
      console.log('   Operations: {add:1} != {return:1} ❌');
      console.log('   Hardcoded: return 8 (no computation) ❌');
      console.log('   Verdict: INCORRECT ✅ (CORRECTLY CAUGHT!)');
      
    } else {
      console.log('❌ UNEXPECTED: Hardcoded value was NOT caught!');
      console.log('   This should not happen with TAC logic check enabled.');
      console.log('   Please check if tacLogicChecker is properly integrated.');
    }

  } catch (error) {
    console.error('❌ ERROR during test:', error.message);
    if (error.response) {
      console.error('Response:', error.response.data);
    }
  }
}

testHardcodedDetection().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
