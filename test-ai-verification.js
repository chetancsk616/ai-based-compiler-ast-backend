/**
 * AI Verification Test - Demonstrates AI as Secondary Judge
 * 
 * This test shows how AI verifies TAC comparisons when:
 * 1. TAC extraction fails (all operations = 0)
 * 2. TAC detects mismatch but needs verification
 * 3. Code seems suspicious despite TAC match
 */

const axios = require('axios');

const API_URL = 'http://localhost:3000/verify';

// Test Case 1: Hardcoded Return (TAC should detect this)
const hardcodedTest = {
  referenceCode: {
    language: 'cpp',
    code: `
#include <iostream>
int add(int a, int b) {
    return a + b;
}
int main() {
    std::cout << add(5, 3);
    return 0;
}`
  },
  userCode: {
    language: 'cpp',
    code: `
#include <iostream>
int add(int a, int b) {
    return 8;  // CHEATING: Hardcoded for test input 5+3=8
}
int main() {
    std::cout << add(5, 3);
    return 0;
}`
  },
  testInputs: [],
  expectedOutcome: 'INCORRECT',
  testName: 'Hardcoded Return Value'
};

// Test Case 2: Conditional Hardcoding (Sophisticated cheating)
const conditionalTest = {
  referenceCode: {
    language: 'cpp',
    code: `
#include <iostream>
int add(int a, int b) {
    return a + b;
}
int main() {
    std::cout << add(5, 3);
    return 0;
}`
  },
  userCode: {
    language: 'cpp',
    code: `
#include <iostream>
int add(int a, int b) {
    if (a == 5 && b == 3) return 8;  // CHEATING: Pattern matching
    return a + b;  // Correct for other inputs
}
int main() {
    std::cout << add(5, 3);
    return 0;
}`
  },
  testInputs: [],
  expectedOutcome: 'INCORRECT',
  testName: 'Conditional Hardcoding'
};

// Test Case 3: Correct Implementation
const correctTest = {
  referenceCode: {
    language: 'cpp',
    code: `
#include <iostream>
int add(int a, int b) {
    return a + b;
}
int main() {
    std::cout << add(5, 3);
    return 0;
}`
  },
  userCode: {
    language: 'cpp',
    code: `
#include <iostream>
int add(int a, int b) {
    int result = a + b;  // Correct implementation
    return result;
}
int main() {
    std::cout << add(5, 3);
    return 0;
}`
  },
  testInputs: [],
  expectedOutcome: 'CORRECT',
  testName: 'Correct Implementation'
};

async function runTest(testCase) {
  console.log('\n' + '='.repeat(80));
  console.log(`TEST: ${testCase.testName}`);
  console.log('='.repeat(80));

  try {
    const response = await axios.post(API_URL, testCase, {
      headers: { 'Content-Type': 'application/json' }
    });

    const result = response.data;
    
    console.log('\n📊 VERDICT:', result.verdict);
    console.log('Expected:', testCase.expectedOutcome);
    console.log('Match:', result.verdict === testCase.expectedOutcome ? '✅ YES' : '❌ NO');

    // TAC Logic Check
    if (result.logic_correctness?.tac_logic) {
      const tacLogic = result.logic_correctness.tac_logic;
      console.log('\n🔍 TAC Logic Check:', tacLogic.passed ? 'PASS' : 'FAIL');
      console.log('Reason:', tacLogic.reason);
      
      if (tacLogic.operations) {
        console.log('\nReference Operations:', JSON.stringify(tacLogic.operations.reference_operations));
        console.log('User Operations:', JSON.stringify(tacLogic.operations.user_operations));
      }

      if (tacLogic.ai_override) {
        console.log('\n⚠️ AI OVERRIDE DETECTED');
      }
    }

    // AI Verification (Secondary Judge)
    if (result.ai_analysis) {
      console.log('\n🤖 AI VERIFICATION (Secondary Judge):');
      console.log('   Verdict:', result.ai_analysis.verdict);
      console.log('   Confidence:', result.ai_analysis.confidence + '%');
      console.log('   Reason:', result.ai_analysis.reason);
      
      if (result.ai_analysis.cheating_indicators?.length > 0) {
        console.log('\n   🚩 Cheating Indicators:');
        result.ai_analysis.cheating_indicators.forEach(indicator => {
          console.log(`      • ${indicator}`);
        });
      }
      
      console.log('\n   📝 Detailed Analysis:');
      console.log('   ' + result.ai_analysis.detailed_analysis.replace(/\n/g, '\n   '));
      
      console.log('\n   Recommendation:', result.ai_analysis.recommendation);
      
      if (result.ai_analysis.ai_override) {
        console.log('\n   ⚡ AI OVERRODE TAC RESULT');
      }
    } else if (result.logic_correctness?.ai_verification) {
      const aiVerif = result.logic_correctness.ai_verification;
      if (aiVerif.ai_used === false) {
        console.log('\n🤖 AI Verification: Not Used');
        console.log('   Reason:', aiVerif.reason || 'AI not triggered');
      } else if (aiVerif.error) {
        console.log('\n🤖 AI Verification: Failed');
        console.log('   Error:', aiVerif.error);
      }
    }

    // Show code comparison for failed cases
    if (result.verdict === 'INCORRECT' && result.reference && result.user) {
      console.log('\n📄 CODE COMPARISON:');
      console.log('\nReference Code:');
      console.log(result.reference.code);
      console.log('\nUser Code:');
      console.log(result.user.code);
      
      if (result.reference.tac_sample && result.user.tac_sample) {
        console.log('\n📋 TAC SAMPLES:');
        console.log('\nReference TAC (first 10 lines):');
        result.reference.tac_sample.slice(0, 10).forEach(line => console.log('  ' + line));
        console.log('\nUser TAC (first 10 lines):');
        result.user.tac_sample.slice(0, 10).forEach(line => console.log('  ' + line));
      }
    }

    return result.verdict === testCase.expectedOutcome;

  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
    if (error.response?.data) {
      console.error('Server response:', JSON.stringify(error.response.data, null, 2));
    }
    return false;
  }
}

async function runAllTests() {
  console.log('\n🚀 Starting AI Verification Tests...');
  console.log('This demonstrates how AI acts as a SECONDARY JUDGE when TAC is unclear\n');

  // Check if AI is enabled
  const hasOpenAI = !!process.env.OPENAI_API_KEY;
  const hasAnthropic = !!process.env.ANTHROPIC_API_KEY;
  
  if (!hasOpenAI && !hasAnthropic) {
    console.log('⚠️ WARNING: No AI API key found!');
    console.log('Set OPENAI_API_KEY or ANTHROPIC_API_KEY to enable AI verification');
    console.log('Tests will run, but AI analysis will be skipped\n');
  } else {
    const provider = hasOpenAI ? 'OpenAI' : 'Anthropic';
    console.log(`✅ AI Provider: ${provider}`);
    console.log('AI will act as secondary judge when TAC comparison is unclear\n');
  }

  const tests = [correctTest, hardcodedTest, conditionalTest];
  const results = [];

  for (const test of tests) {
    const passed = await runTest(test);
    results.push({ name: test.testName, passed });
  }

  console.log('\n' + '='.repeat(80));
  console.log('📊 FINAL RESULTS');
  console.log('='.repeat(80));
  
  results.forEach(result => {
    const status = result.passed ? '✅ PASS' : '❌ FAIL';
    console.log(`${status}: ${result.name}`);
  });

  const totalPassed = results.filter(r => r.passed).length;
  console.log(`\nTotal: ${totalPassed}/${results.length} tests passed`);
}

// Run tests
runAllTests().catch(console.error);
