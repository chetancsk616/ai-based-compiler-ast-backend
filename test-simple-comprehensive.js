/**
 * Simplified but comprehensive test suite
 * Tests the verification system with realistic scenarios
 */

const axios = require('axios');
const fs = require('fs');

const API_URL = 'http://localhost:3000/api/verify';

// Reference solutions (correct implementations)
const REFERENCES = {
  add_cpp: {
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
  multiply_cpp: {
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
  subtract_python: {
    language: 'python',
    code: `def subtract(a, b):
    return a - b

print(subtract(10, 3))`
  },
  divide_js: {
    language: 'javascript',
    code: `function divide(a, b) {
    return Math.floor(a / b);
}
console.log(divide(20, 4));`
  }
};

// Test cases organized by category
const TEST_CASES = {
  genuine: [
    // Test 1-10: Correct implementations with different styles
    {
      id: 1,
      name: "add_cpp_direct",
      reference: REFERENCES.add_cpp,
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
      name: "add_cpp_intermediate",
      reference: REFERENCES.add_cpp,
      user: {
        language: 'cpp',
        code: `#include <iostream>
int add(int a, int b) {
    int result = a + b;
    return result;
}
int main() {
    std::cout << add(5, 3);
    return 0;
}`
      },
      expected: 'CORRECT'
    },
    {
      id: 3,
      name: "add_cpp_separate_vars",
      reference: REFERENCES.add_cpp,
      user: {
        language: 'cpp',
        code: `#include <iostream>
int add(int a, int b) {
    int x = a;
    int y = b;
    int sum = x + y;
    return sum;
}
int main() {
    std::cout << add(5, 3);
    return 0;
}`
      },
      expected: 'CORRECT'
    },
    {
      id: 4,
      name: "multiply_cpp_direct",
      reference: REFERENCES.multiply_cpp,
      user: {
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
      expected: 'CORRECT'
    },
    {
      id: 5,
      name: "multiply_cpp_inline",
      reference: REFERENCES.multiply_cpp,
      user: {
        language: 'cpp',
        code: `#include <iostream>
int multiply(int a, int b) {
    return b * a;  // Commutative
}
int main() {
    std::cout << multiply(4, 7);
    return 0;
}`
      },
      expected: 'CORRECT'
    },
    {
      id: 6,
      name: "subtract_python_direct",
      reference: REFERENCES.subtract_python,
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
      name: "subtract_python_intermediate",
      reference: REFERENCES.subtract_python,
      user: {
        language: 'python',
        code: `def subtract(a, b):
    result = a - b
    return result

print(subtract(10, 3))`
      },
      expected: 'CORRECT'
    },
    {
      id: 8,
      name: "divide_js_direct",
      reference: REFERENCES.divide_js,
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
      id: 9,
      name: "divide_js_intermediate",
      reference: REFERENCES.divide_js,
      user: {
        language: 'javascript',
        code: `function divide(a, b) {
    const result = Math.floor(a / b);
    return result;
}
console.log(divide(20, 4));`
      },
      expected: 'CORRECT'
    },
    {
      id: 10,
      name: "add_cpp_ternary",
      reference: REFERENCES.add_cpp,
      user: {
        language: 'cpp',
        code: `#include <iostream>
int add(int a, int b) {
    int s = a + b;
    return s;
}
int main() {
    std::cout << add(5, 3);
    return 0;
}`
      },
      expected: 'CORRECT'
    }
  ],
  
  incorrect: [
    // Test 11-20: Logic errors
    {
      id: 11,
      name: "add_wrong_op_subtract",
      reference: REFERENCES.add_cpp,
      user: {
        language: 'cpp',
        code: `#include <iostream>
int add(int a, int b) {
    return a - b;  // WRONG: subtraction instead of addition
}
int main() {
    std::cout << add(5, 3);
    return 0;
}`
      },
      expected: 'INCORRECT'
    },
    {
      id: 12,
      name: "add_wrong_op_multiply",
      reference: REFERENCES.add_cpp,
      user: {
        language: 'cpp',
        code: `#include <iostream>
int add(int a, int b) {
    return a * b;  // WRONG: multiplication instead of addition
}
int main() {
    std::cout << add(5, 3);
    return 0;
}`
      },
      expected: 'INCORRECT'
    },
    {
      id: 13,
      name: "add_off_by_one",
      reference: REFERENCES.add_cpp,
      user: {
        language: 'cpp',
        code: `#include <iostream>
int add(int a, int b) {
    return a + b + 1;  // WRONG: off by one
}
int main() {
    std::cout << add(5, 3);
    return 0;
}`
      },
      expected: 'INCORRECT'
    },
    {
      id: 14,
      name: "add_missing_operand",
      reference: REFERENCES.add_cpp,
      user: {
        language: 'cpp',
        code: `#include <iostream>
int add(int a, int b) {
    return a;  // WRONG: only returns first operand
}
int main() {
    std::cout << add(5, 3);
    return 0;
}`
      },
      expected: 'INCORRECT'
    },
    {
      id: 15,
      name: "multiply_wrong_op_add",
      reference: REFERENCES.multiply_cpp,
      user: {
        language: 'cpp',
        code: `#include <iostream>
int multiply(int a, int b) {
    return a + b;  // WRONG: addition instead of multiplication
}
int main() {
    std::cout << multiply(4, 7);
    return 0;
}`
      },
      expected: 'INCORRECT'
    },
    {
      id: 16,
      name: "subtract_swapped",
      reference: REFERENCES.subtract_python,
      user: {
        language: 'python',
        code: `def subtract(a, b):
    return b - a  # WRONG: swapped operands

print(subtract(10, 3))`
      },
      expected: 'INCORRECT'
    },
    {
      id: 17,
      name: "subtract_wrong_op",
      reference: REFERENCES.subtract_python,
      user: {
        language: 'python',
        code: `def subtract(a, b):
    return a + b  # WRONG: addition instead of subtraction

print(subtract(10, 3))`
      },
      expected: 'INCORRECT'
    },
    {
      id: 18,
      name: "divide_wrong_formula",
      reference: REFERENCES.divide_js,
      user: {
        language: 'javascript',
        code: `function divide(a, b) {
    return Math.floor(a * b);  // WRONG: multiply instead of divide
}
console.log(divide(20, 4));`
      },
      expected: 'INCORRECT'
    },
    {
      id: 19,
      name: "divide_no_floor",
      reference: REFERENCES.divide_js,
      user: {
        language: 'javascript',
        code: `function divide(a, b) {
    return a / b;  // WRONG: no floor (but might pass if division is exact)
}
console.log(divide(20, 4));`
      },
      expected: 'INCORRECT'  // Might pass if lucky
    },
    {
      id: 20,
      name: "add_double_operand",
      reference: REFERENCES.add_cpp,
      user: {
        language: 'cpp',
        code: `#include <iostream>
int add(int a, int b) {
    return a + a;  // WRONG: uses a twice
}
int main() {
    std::cout << add(5, 3);
    return 0;
}`
      },
      expected: 'INCORRECT'
    }
  ],
  
  cheating: [
    // Test 21-30: Cheating patterns
    {
      id: 21,
      name: "add_hardcoded",
      reference: REFERENCES.add_cpp,
      user: {
        language: 'cpp',
        code: `#include <iostream>
int add(int a, int b) {
    return 8;  // CHEATING: hardcoded for (5, 3)
}
int main() {
    std::cout << add(5, 3);
    return 0;
}`
      },
      expected: 'INCORRECT'
    },
    {
      id: 22,
      name: "add_conditional_hardcoding",
      reference: REFERENCES.add_cpp,
      user: {
        language: 'cpp',
        code: `#include <iostream>
int add(int a, int b) {
    if (a == 5 && b == 3) return 8;  // CHEATING: pattern matching
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
      id: 23,
      name: "multiply_hardcoded",
      reference: REFERENCES.multiply_cpp,
      user: {
        language: 'cpp',
        code: `#include <iostream>
int multiply(int a, int b) {
    return 28;  // CHEATING: hardcoded for (4, 7)
}
int main() {
    std::cout << multiply(4, 7);
    return 0;
}`
      },
      expected: 'INCORRECT'
    },
    {
      id: 24,
      name: "multiply_conditional",
      reference: REFERENCES.multiply_cpp,
      user: {
        language: 'cpp',
        code: `#include <iostream>
int multiply(int a, int b) {
    if (a == 4 && b == 7) return 28;  // CHEATING
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
      id: 25,
      name: "subtract_hardcoded",
      reference: REFERENCES.subtract_python,
      user: {
        language: 'python',
        code: `def subtract(a, b):
    return 7  # CHEATING: hardcoded for (10, 3)

print(subtract(10, 3))`
      },
      expected: 'INCORRECT'
    },
    {
      id: 26,
      name: "subtract_conditional",
      reference: REFERENCES.subtract_python,
      user: {
        language: 'python',
        code: `def subtract(a, b):
    if a == 10 and b == 3:
        return 7  # CHEATING
    return a - b

print(subtract(10, 3))`
      },
      expected: 'INCORRECT'
    },
    {
      id: 27,
      name: "divide_hardcoded",
      reference: REFERENCES.divide_js,
      user: {
        language: 'javascript',
        code: `function divide(a, b) {
    return 5;  // CHEATING: hardcoded for (20, 4)
}
console.log(divide(20, 4));`
      },
      expected: 'INCORRECT'
    },
    {
      id: 28,
      name: "divide_output_manipulation",
      reference: REFERENCES.divide_js,
      user: {
        language: 'javascript',
        code: `function divide(a, b) {
    console.log(5);  // CHEATING: print expected output
    return 0;
}
divide(20, 4);`
      },
      expected: 'INCORRECT'
    },
    {
      id: 29,
      name: "add_print_manipulation",
      reference: REFERENCES.add_cpp,
      user: {
        language: 'cpp',
        code: `#include <iostream>
int add(int a, int b) {
    std::cout << 8;  // CHEATING: print expected
    return 0;
}
int main() {
    add(5, 3);
    return 0;
}`
      },
      expected: 'INCORRECT'
    },
    {
      id: 30,
      name: "multiply_lookup_table",
      reference: REFERENCES.multiply_cpp,
      user: {
        language: 'cpp',
        code: `#include <iostream>
int multiply(int a, int b) {
    // CHEATING: lookup table
    if (a == 4 && b == 7) return 28;
    if (a == 2 && b == 3) return 6;
    if (a == 5 && b == 5) return 25;
    return a * b;
}
int main() {
    std::cout << multiply(4, 7);
    return 0;
}`
      },
      expected: 'INCORRECT'
    }
  ]
};

// Run tests
async function runTests() {
  console.log('🚀 Running Simplified Comprehensive Test Suite\n');
  
  const results = {
    genuine: { passed: 0, failed: 0, details: [] },
    incorrect: { passed: 0, failed: 0, details: [] },
    cheating: { passed: 0, failed: 0, details: [] }
  };
  
  let totalTests = 0;
  let totalPassed = 0;
  
  for (const [category, tests] of Object.entries(TEST_CASES)) {
    console.log(`\n${'='.repeat(80)}`);
    console.log(`Testing ${category.toUpperCase()} (${tests.length} tests)`);
    console.log('='.repeat(80));
    
    for (const test of tests) {
      totalTests++;
      process.stdout.write(`[${test.id}/30] ${test.name}... `);
      
      try {
        const response = await axios.post(API_URL, {
          referenceCode: test.reference,
          userCode: test.user,
          testInputs: []
        }, {
          timeout: 30000
        });
        
        const verdict = response.data.verdict;
        const passed = verdict === test.expected;
        
        if (passed) {
          console.log('✅ PASS');
          results[category].passed++;
          totalPassed++;
        } else {
          console.log(`❌ FAIL (Expected: ${test.expected}, Got: ${verdict})`);
          results[category].failed++;
        }
        
        results[category].details.push({
          id: test.id,
          name: test.name,
          expected: test.expected,
          actual: verdict,
          passed,
          aiUsed: response.data.logic_correctness?.ai_verification?.ai_used || false,
          tacUsed: response.data.logic_correctness?.tac_logic ? true : false
        });
        
      } catch (error) {
        console.log(`❌ ERROR (${error.message})`);
        results[category].failed++;
        results[category].details.push({
          id: test.id,
          name: test.name,
          expected: test.expected,
          actual: 'ERROR',
          passed: false,
          error: error.message
        });
      }
      
      // Small delay to avoid overwhelming server
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  
  // Print summary
  console.log('\n' + '='.repeat(80));
  console.log('📊 TEST RESULTS SUMMARY');
  console.log('='.repeat(80));
  console.log(`\n🎯 OVERALL: ${totalPassed}/${totalTests} passed (${((totalPassed/totalTests)*100).toFixed(1)}%)`);
  
  for (const [category, result] of Object.entries(results)) {
    const total = result.passed + result.failed;
    const percentage = total > 0 ? ((result.passed / total) * 100).toFixed(1) : '0.0';
    console.log(`\n📁 ${category.toUpperCase()}: ${result.passed}/${total} passed (${percentage}%)`);
    
    // Show failed tests
    const failed = result.details.filter(d => !d.passed);
    if (failed.length > 0 && failed.length <= 5) {
      failed.forEach(f => {
        console.log(`   ❌ Test ${f.id} (${f.name}): Expected ${f.expected}, Got ${f.actual}`);
      });
    }
  }
  
  // Save results
  fs.writeFileSync('simple-test-results.json', JSON.stringify(results, null, 2));
  console.log('\n💾 Detailed results saved to simple-test-results.json');
  
  // Generate markdown report
  generateMarkdownReport(results, totalTests, totalPassed);
  
  return results;
}

function generateMarkdownReport(results, totalTests, totalPassed) {
  const accuracy = ((totalPassed / totalTests) * 100).toFixed(2);
  let md = `# Verification System Test Results

**Date:** ${new Date().toLocaleString()}  
**Total Tests:** ${totalTests}  
**Passed:** ${totalPassed}  
**Failed:** ${totalTests - totalPassed}  
**Overall Accuracy:** **${accuracy}%**

---

## Summary by Category

| Category | Passed | Failed | Total | Accuracy |
|----------|--------|--------|-------|----------|
`;

  for (const [category, result] of Object.entries(results)) {
    const total = result.passed + result.failed;
    const percentage = total > 0 ? ((result.passed / total) * 100).toFixed(1) : '0.0';
    const status = percentage >= 90 ? '✅' : percentage >= 75 ? '⚠️' : '❌';
    md += `| ${status} **${category.charAt(0).toUpperCase() + category.slice(1)}** | ${result.passed} | ${result.failed} | ${total} | ${percentage}% |\n`;
  }

  md += `\n---\n\n## Detailed Results\n\n`;

  for (const [category, result] of Object.entries(results)) {
    md += `### ${category.charAt(0).toUpperCase() + category.slice(1)} Tests\n\n`;
    
    if (result.passed > 0) {
      md += `✅ **Passed:** ${result.passed}\n\n`;
    }
    
    const failed = result.details.filter(d => !d.passed);
    if (failed.length > 0) {
      md += `❌ **Failed:** ${failed.length}\n\n`;
      failed.forEach(f => {
        md += `- **Test ${f.id}** (${f.name}): Expected \`${f.expected}\`, Got \`${f.actual}\`\n`;
      });
      md += `\n`;
    }
  }

  md += `\n---\n\n## Verdict\n\n`;

  if (accuracy >= 95) {
    md += `✅ **EXCELLENT** - System is production-ready with ${accuracy}% accuracy.\n`;
  } else if (accuracy >= 85) {
    md += `✅ **GOOD** - System is functional with ${accuracy}% accuracy. Minor improvements recommended.\n`;
  } else if (accuracy >= 70) {
    md += `⚠️ **FAIR** - System needs improvement. Current accuracy: ${accuracy}%.\n`;
  } else {
    md += `❌ **POOR** - Major issues detected. Current accuracy: ${accuracy}%. Significant work required.\n`;
  }

  fs.writeFileSync('SIMPLE_TEST_RESULTS.md', md);
  console.log('📄 Markdown report saved to SIMPLE_TEST_RESULTS.md');
}

// Run the tests
runTests()
  .then(() => {
    console.log('\n✅ Test suite completed!');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Test suite failed:', error);
    process.exit(1);
  });
