/**
 * AI-Focused Test Suite
 * Tests where AI verification should catch cheating patterns
 */

const axios = require('axios');
const fs = require('fs');

const API_URL = 'http://localhost:3000/api/verify';

// Test suite focused on cheating detection
const TESTS = [
  // ========== C++ TESTS ==========
  {
    id: 1,
    name: 'cpp_simple_correct',
    category: 'genuine',
    reference: {
      language: 'cpp',
      code: `#include <iostream>
int add(int a, int b) {
    return a + b;
}
int main() {
    std::cout << add(5, 3);
    return 0;
}`
    },
    user: {
      language: 'cpp',
      code: `#include <iostream>
int add(int a, int b) {
    return a + b;
}
int main() {
    std::cout << add(5, 3);
    return 0;
}`
    },
    expected: 'CORRECT'
  },
  {
    id: 2,
    name: 'cpp_hardcoded_value',
    category: 'cheating',
    reference: {
      language: 'cpp',
      code: `#include <iostream>
int add(int a, int b) {
    return a + b;
}
int main() {
    std::cout << add(5, 3);
    return 0;
}`
    },
    user: {
      language: 'cpp',
      code: `#include <iostream>
int add(int a, int b) {
    return 8;  // CHEATING: hardcoded
}
int main() {
    std::cout << add(5, 3);
    return 0;
}`
    },
    expected: 'INCORRECT'
  },
  {
    id: 3,
    name: 'cpp_conditional_cheat',
    category: 'cheating',
    reference: {
      language: 'cpp',
      code: `#include <iostream>
int add(int a, int b) {
    return a + b;
}
int main() {
    std::cout << add(5, 3);
    return 0;
}`
    },
    user: {
      language: 'cpp',
      code: `#include <iostream>
int add(int a, int b) {
    if (a == 5 && b == 3) return 8;
    return a + b;
}
int main() {
    std::cout << add(5, 3);
    return 0;
}`
    },
    expected: 'INCORRECT'
  },
  {
    id: 4,
    name: 'cpp_multiple_conditionals',
    category: 'cheating',
    reference: {
      language: 'cpp',
      code: `#include <iostream>
int multiply(int a, int b) {
    return a * b;
}
int main() {
    std::cout << multiply(4, 7);
    return 0;
}`
    },
    user: {
      language: 'cpp',
      code: `#include <iostream>
int multiply(int a, int b) {
    if (a == 4 && b == 7) return 28;
    if (a == 3 && b == 5) return 15;
    if (a == 2 && b == 8) return 16;
    return a * b;
}
int main() {
    std::cout << multiply(4, 7);
    return 0;
}`
    },
    expected: 'INCORRECT'
  },
  {
    id: 5,
    name: 'cpp_output_manipulation',
    category: 'cheating',
    reference: {
      language: 'cpp',
      code: `#include <iostream>
int add(int a, int b) {
    return a + b;
}
int main() {
    std::cout << add(5, 3);
    return 0;
}`
    },
    user: {
      language: 'cpp',
      code: `#include <iostream>
int add(int a, int b) {
    std::cout << 8;
    return 0;
}
int main() {
    add(5, 3);
    return 0;
}`
    },
    expected: 'INCORRECT'
  },
  
  // ========== PYTHON TESTS ==========
  {
    id: 6,
    name: 'python_simple_correct',
    category: 'genuine',
    reference: {
      language: 'python',
      code: `def subtract(a, b):
    return a - b

print(subtract(10, 3))`
    },
    user: {
      language: 'python',
      code: `def subtract(a, b):
    return a - b

print(subtract(10, 3))`
    },
    expected: 'CORRECT'
  },
  {
    id: 7,
    name: 'python_hardcoded_value',
    category: 'cheating',
    reference: {
      language: 'python',
      code: `def subtract(a, b):
    return a - b

print(subtract(10, 3))`
    },
    user: {
      language: 'python',
      code: `def subtract(a, b):
    return 7  # CHEATING: hardcoded

print(subtract(10, 3))`
    },
    expected: 'INCORRECT'
  },
  {
    id: 8,
    name: 'python_conditional_cheat',
    category: 'cheating',
    reference: {
      language: 'python',
      code: `def subtract(a, b):
    return a - b

print(subtract(10, 3))`
    },
    user: {
      language: 'python',
      code: `def subtract(a, b):
    if a == 10 and b == 3:
        return 7
    return a - b

print(subtract(10, 3))`
    },
    expected: 'INCORRECT'
  },
  {
    id: 9,
    name: 'python_unused_params',
    category: 'cheating',
    reference: {
      language: 'python',
      code: `def add(a, b):
    return a + b

print(add(8, 2))`
    },
    user: {
      language: 'python',
      code: `def add(a, b):
    return 10  # CHEATING: params not used

print(add(8, 2))`
    },
    expected: 'INCORRECT'
  },
  {
    id: 10,
    name: 'python_dict_lookup',
    category: 'cheating',
    reference: {
      language: 'python',
      code: `def multiply(a, b):
    return a * b

print(multiply(3, 4))`
    },
    user: {
      language: 'python',
      code: `def multiply(a, b):
    lookup = {(3,4): 12, (2,5): 10, (6,7): 42}
    return lookup.get((a,b), a * b)

print(multiply(3, 4))`
    },
    expected: 'INCORRECT'
  },
  
  // ========== JAVASCRIPT TESTS ==========
  {
    id: 11,
    name: 'js_simple_correct',
    category: 'genuine',
    reference: {
      language: 'javascript',
      code: `function divide(a, b) {
    return Math.floor(a / b);
}
console.log(divide(20, 4));`
    },
    user: {
      language: 'javascript',
      code: `function divide(a, b) {
    return Math.floor(a / b);
}
console.log(divide(20, 4));`
    },
    expected: 'CORRECT'
  },
  {
    id: 12,
    name: 'js_hardcoded_value',
    category: 'cheating',
    reference: {
      language: 'javascript',
      code: `function divide(a, b) {
    return Math.floor(a / b);
}
console.log(divide(20, 4));`
    },
    user: {
      language: 'javascript',
      code: `function divide(a, b) {
    return 5;  // CHEATING: hardcoded
}
console.log(divide(20, 4));`
    },
    expected: 'INCORRECT'
  },
  {
    id: 13,
    name: 'js_conditional_cheat',
    category: 'cheating',
    reference: {
      language: 'javascript',
      code: `function divide(a, b) {
    return Math.floor(a / b);
}
console.log(divide(20, 4));`
    },
    user: {
      language: 'javascript',
      code: `function divide(a, b) {
    if (a === 20 && b === 4) return 5;
    return Math.floor(a / b);
}
console.log(divide(20, 4));`
    },
    expected: 'INCORRECT'
  },
  {
    id: 14,
    name: 'js_switch_case_cheat',
    category: 'cheating',
    reference: {
      language: 'javascript',
      code: `function add(a, b) {
    return a + b;
}
console.log(add(7, 3));`
    },
    user: {
      language: 'javascript',
      code: `function add(a, b) {
    switch(a + '-' + b) {
        case '7-3': return 10;
        case '5-5': return 10;
        case '8-2': return 10;
        default: return a + b;
    }
}
console.log(add(7, 3));`
    },
    expected: 'INCORRECT'
  },
  {
    id: 15,
    name: 'js_console_manipulation',
    category: 'cheating',
    reference: {
      language: 'javascript',
      code: `function multiply(a, b) {
    return a * b;
}
console.log(multiply(6, 4));`
    },
    user: {
      language: 'javascript',
      code: `function multiply(a, b) {
    console.log(24);  // CHEATING: print expected
    return 0;
}
multiply(6, 4);`
    },
    expected: 'INCORRECT'
  },
  
  // ========== LOGIC ERROR TESTS ==========
  {
    id: 16,
    name: 'cpp_wrong_operation',
    category: 'incorrect',
    reference: {
      language: 'cpp',
      code: `#include <iostream>
int add(int a, int b) {
    return a + b;
}
int main() {
    std::cout << add(7, 3);
    return 0;
}`
    },
    user: {
      language: 'cpp',
      code: `#include <iostream>
int add(int a, int b) {
    return a - b;  // WRONG: subtraction
}
int main() {
    std::cout << add(7, 3);
    return 0;
}`
    },
    expected: 'INCORRECT'
  },
  {
    id: 17,
    name: 'python_swapped_operands',
    category: 'incorrect',
    reference: {
      language: 'python',
      code: `def subtract(a, b):
    return a - b

print(subtract(15, 5))`
    },
    user: {
      language: 'python',
      code: `def subtract(a, b):
    return b - a  # WRONG: swapped

print(subtract(15, 5))`
    },
    expected: 'INCORRECT'
  },
  {
    id: 18,
    name: 'js_missing_operand',
    category: 'incorrect',
    reference: {
      language: 'javascript',
      code: `function add(a, b) {
    return a + b;
}
console.log(add(12, 8));`
    },
    user: {
      language: 'javascript',
      code: `function add(a, b) {
    return a;  // WRONG: missing b
}
console.log(add(12, 8));`
    },
    expected: 'INCORRECT'
  },
  {
    id: 19,
    name: 'cpp_off_by_one',
    category: 'incorrect',
    reference: {
      language: 'cpp',
      code: `#include <iostream>
int multiply(int a, int b) {
    return a * b;
}
int main() {
    std::cout << multiply(5, 4);
    return 0;
}`
    },
    user: {
      language: 'cpp',
      code: `#include <iostream>
int multiply(int a, int b) {
    return a * b + 1;  // WRONG: off by one
}
int main() {
    std::cout << multiply(5, 4);
    return 0;
}`
    },
    expected: 'INCORRECT'
  },
  {
    id: 20,
    name: 'python_wrong_operator',
    category: 'incorrect',
    reference: {
      language: 'python',
      code: `def multiply(a, b):
    return a * b

print(multiply(6, 7))`
    },
    user: {
      language: 'python',
      code: `def multiply(a, b):
    return a + b  # WRONG: addition instead

print(multiply(6, 7))`
    },
    expected: 'INCORRECT'
  }
];

// Run tests
async function runTests() {
  console.log('🚀 AI-Focused Test Suite (20 Tests)\n');
  console.log('This suite tests scenarios where AI verification should catch cheating patterns\n');
  
  const results = {
    genuine: { passed: 0, failed: 0, tests: [] },
    cheating: { passed: 0, failed: 0, tests: [] },
    incorrect: { passed: 0, failed: 0, tests: [] }
  };
  
  let totalAIInvocations = 0;
  let totalTests = 0;
  let totalPassed = 0;
  
  for (const test of TESTS) {
    totalTests++;
    process.stdout.write(`[${test.id}/20] ${test.name} (${test.category})... `);
    
    try {
      const response = await axios.post(API_URL, {
        referenceCode: test.reference,
        userCode: test.user,
        testInputs: []
      }, {
        timeout: 45000
      });
      
      const verdict = response.data.verdict;
      const passed = verdict === test.expected;
      const aiUsed = response.data.logic_correctness?.ai_verification?.ai_used === true;
      const aiAnalysis = response.data.ai_analysis;
      
      if (aiUsed) {
        totalAIInvocations++;
      }
      
      if (passed) {
        console.log(`✅ PASS${aiUsed ? ' (AI)' : ''}`);
        results[test.category].passed++;
        totalPassed++;
      } else {
        console.log(`❌ FAIL (Expected: ${test.expected}, Got: ${verdict})${aiUsed ? ' (AI)' : ''}`);
        results[test.category].failed++;
      }
      
      results[test.category].tests.push({
        id: test.id,
        name: test.name,
        expected: test.expected,
        actual: verdict,
        passed,
        aiUsed,
        aiVerdict: aiAnalysis?.verdict || null,
        aiConfidence: aiAnalysis?.confidence || null,
        aiReason: aiAnalysis?.reason || null
      });
      
      // Show AI analysis for failed cheating tests
      if (!passed && test.category === 'cheating' && aiAnalysis) {
        console.log(`   🤖 AI: ${aiAnalysis.verdict} (${aiAnalysis.confidence}% confidence)`);
        console.log(`   📝 ${aiAnalysis.reason}`);
      }
      
    } catch (error) {
      console.log(`❌ ERROR (${error.message})`);
      results[test.category].failed++;
      results[test.category].tests.push({
        id: test.id,
        name: test.name,
        expected: test.expected,
        actual: 'ERROR',
        passed: false,
        error: error.message
      });
    }
    
    // Small delay
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  
  // Print summary
  console.log('\n' + '='.repeat(80));
  console.log('📊 AI-FOCUSED TEST RESULTS');
  console.log('='.repeat(80));
  console.log(`\n🎯 OVERALL: ${totalPassed}/${totalTests} passed (${((totalPassed/totalTests)*100).toFixed(1)}%)`);
  console.log(`🤖 AI INVOCATIONS: ${totalAIInvocations}/${totalTests} (${((totalAIInvocations/totalTests)*100).toFixed(1)}%)`);
  
  for (const [category, result] of Object.entries(results)) {
    const total = result.passed + result.failed;
    const percentage = total > 0 ? ((result.passed / total) * 100).toFixed(1) : '0.0';
    const status = percentage >= 90 ? '✅' : percentage >= 70 ? '⚠️' : '❌';
    console.log(`\n${status} ${category.toUpperCase()}: ${result.passed}/${total} passed (${percentage}%)`);
    
    // Show AI usage for this category
    const aiUsedCount = result.tests.filter(t => t.aiUsed).length;
    if (aiUsedCount > 0) {
      console.log(`   🤖 AI used in ${aiUsedCount}/${total} tests`);
    }
    
    // Show failed tests
    const failed = result.tests.filter(t => !t.passed);
    if (failed.length > 0 && failed.length <= 5) {
      failed.forEach(f => {
        console.log(`   ❌ Test ${f.id} (${f.name}): Expected ${f.expected}, Got ${f.actual}`);
        if (f.aiUsed && f.aiVerdict) {
          console.log(`      AI: ${f.aiVerdict} (${f.aiConfidence}% conf) - ${f.aiReason}`);
        }
      });
    }
  }
  
  // Save results
  fs.writeFileSync('ai-focused-results.json', JSON.stringify(results, null, 2));
  console.log(`\n💾 Detailed results saved to ai-focused-results.json`);
  
  // Generate summary report
  generateReport(results, totalTests, totalPassed, totalAIInvocations);
  
  return results;
}

function generateReport(results, totalTests, totalPassed, totalAIInvocations) {
  const accuracy = ((totalPassed / totalTests) * 100).toFixed(2);
  const aiUsageRate = ((totalAIInvocations / totalTests) * 100).toFixed(1);
  
  let md = `# AI-Focused Test Results

**Date:** ${new Date().toLocaleString()}  
**Total Tests:** ${totalTests}  
**Passed:** ${totalPassed}  
**Failed:** ${totalTests - totalPassed}  
**Overall Accuracy:** **${accuracy}%**  
**AI Invocations:** ${totalAIInvocations}/${totalTests} (${aiUsageRate}%)

---

## Summary by Category

| Category | Passed | Failed | Total | Accuracy | AI Usage |
|----------|--------|--------|-------|----------|----------|
`;

  for (const [category, result] of Object.entries(results)) {
    const total = result.passed + result.failed;
    const percentage = total > 0 ? ((result.passed / total) * 100).toFixed(1) : '0.0';
    const status = percentage >= 90 ? '✅ Excellent' : percentage >= 70 ? '⚠️ Fair' : '❌ Poor';
    const aiUsed = result.tests.filter(t => t.aiUsed).length;
    const aiRate = total > 0 ? ((aiUsed / total) * 100).toFixed(0) : '0';
    md += `| ${status} **${category.charAt(0).toUpperCase() + category.slice(1)}** | ${result.passed} | ${result.failed} | ${total} | ${percentage}% | ${aiUsed}/${total} (${aiRate}%) |\n`;
  }

  const genuineAcc = ((results.genuine.passed / (results.genuine.passed + results.genuine.failed)) * 100).toFixed(1);
  const cheatingAcc = ((results.cheating.passed / (results.cheating.passed + results.cheating.failed)) * 100).toFixed(1);
  const incorrectAcc = ((results.incorrect.passed / (results.incorrect.passed + results.incorrect.failed)) * 100).toFixed(1);

  md += `\n---\n\n## Analysis\n\n`;
  
  if (parseFloat(cheatingAcc) >= 70) {
    md += `### ✅ IMPROVEMENT DETECTED\n\n`;
    md += `Cheating detection has improved to **${cheatingAcc}%** (was 30% before AI integration).\n\n`;
    md += `**AI Verification Impact:**\n`;
    md += `- AI was invoked in ${totalAIInvocations} tests\n`;
    md += `- ${parseFloat(cheatingAcc) >= 90 ? 'Excellent' : 'Good'} detection of hardcoded values and conditional cheating\n`;
    md += `- Python/JavaScript TAC issues mitigated by AI analysis\n\n`;
  } else {
    md += `### ⚠️ NEEDS ATTENTION\n\n`;
    md += `Cheating detection at **${cheatingAcc}%** - below target of 80%.\n\n`;
    if (totalAIInvocations < totalTests * 0.5) {
      md += `**Issue:** AI invocation rate is low (${aiUsageRate}%). AI should be triggered more frequently for cheating tests.\n\n`;
    }
  }

  md += `### Genuine Tests: ${genuineAcc}%\n`;
  md += `${parseFloat(genuineAcc) >= 95 ? '✅' : '⚠️'} System ${parseFloat(genuineAcc) >= 95 ? 'correctly' : 'mostly'} identifies valid implementations.\n\n`;

  md += `### Incorrect Tests: ${incorrectAcc}%\n`;
  md += `${parseFloat(incorrectAcc) >= 90 ? '✅' : '⚠️'} System ${parseFloat(incorrectAcc) >= 90 ? 'effectively' : 'partially'} detects logic errors.\n\n`;

  md += `### Cheating Tests: ${cheatingAcc}%\n`;
  md += `${parseFloat(cheatingAcc) >= 80 ? '✅' : '❌'} System ${parseFloat(cheatingAcc) >= 80 ? 'successfully' : 'struggles to'} catch hardcoded values and pattern matching.\n\n`;

  md += `---\n\n## Verdict\n\n`;

  if (parseFloat(accuracy) >= 85) {
    md += `✅ **EXCELLENT** - System with AI verification achieves ${accuracy}% accuracy. Ready for production.\n`;
  } else if (parseFloat(accuracy) >= 75) {
    md += `✅ **GOOD** - System achieves ${accuracy}% accuracy. Minor improvements needed.\n`;
  } else {
    md += `⚠️ **FAIR** - System at ${accuracy}% accuracy. More work needed on cheating detection.\n`;
  }

  fs.writeFileSync('AI_FOCUSED_RESULTS.md', md);
  console.log('📄 Markdown report saved to AI_FOCUSED_RESULTS.md\n');
}

// Run the tests
runTests()
  .then(() => {
    console.log('✅ AI-focused test suite completed!');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Test suite failed:', error);
    process.exit(1);
  });
