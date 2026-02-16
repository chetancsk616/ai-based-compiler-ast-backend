/**
 * Extended Test Suite Generator - 200+ Tests
 * Programmatically generates comprehensive test cases
 */

const axios = require('axios');
const fs = require('fs');

const API_URL = 'http://localhost:3000/api/verify';

class ExtendedTestSuite {
  constructor() {
    this.results = {
      genuine: { passed: 0, failed: 0, tests: [] },
      incorrect: { passed: 0, failed: 0, tests: [] },
      cheating: { passed: 0, failed: 0, tests: [] }
    };
    this.totalTests = 0;
    this.startTime = null;
  }

  // Generate test cases
  generateTests() {
    const tests = [];
    let id = 1;

    // GENUINE TESTS (100 tests)
    // C++ tests (40 tests)
    for (let i = 0; i < 20; i++) {
      const value1 = 5 + i;
      const value2 = 3 + (i % 5);
      tests.push({
        id: id++,
        category: 'genuine',
        name: `cpp_add_${i + 1}`,
        reference: this.createCppReference('add', value1, value2),
        user: this.createCppCorrect('add', value1, value2, i % 5),
        expected: 'CORRECT'
      });
    }

    for (let i = 0; i < 20; i++) {
      const value1 = 4 + i;
      const value2 = 6 + (i % 4);
      tests.push({
        id: id++,
        category: 'genuine',
        name: `cpp_multiply_${i + 1}`,
        reference: this.createCppReference('multiply', value1, value2),
        user: this.createCppCorrect('multiply', value1, value2, i % 5),
        expected: 'CORRECT'
      });
    }

    // Python tests (30 tests)
    for (let i = 0; i < 15; i++) {
      const value1 = 10 + i;
      const value2 = 3 + (i % 6);
      tests.push({
        id: id++,
        category: 'genuine',
        name: `python_subtract_${i + 1}`,
        reference: this.createPythonReference('subtract', value1, value2),
        user: this.createPythonCorrect('subtract', value1, value2, i % 3),
        expected: 'CORRECT'
      });
    }

    for (let i = 0; i < 15; i++) {
      const value1 = 8 + i * 2;
      const value2 = 2 + (i % 3);
      tests.push({
        id: id++,
        category: 'genuine',
        name: `python_add_${i + 1}`,
        reference: this.createPythonReference('add', value1, value2),
        user: this.createPythonCorrect('add', value1, value2, i % 3),
        expected: 'CORRECT'
      });
    }

    // JavaScript tests (30 tests)
    for (let i = 0; i < 15; i++) {
      const value1 = 20 + i * 2;
      const value2 = 4 + (i % 5);
      tests.push({
        id: id++,
        category: 'genuine',
        name: `js_divide_${i + 1}`,
        reference: this.createJSReference('divide', value1, value2),
        user: this.createJSCorrect('divide', value1, value2, i % 3),
        expected: 'CORRECT'
      });
    }

    for (let i = 0; i < 15; i++) {
      const value1 = 7 + i;
      const value2 = 2 + (i % 4);
      tests.push({
        id: id++,
        category: 'genuine',
        name: `js_multiply_${i + 1}`,
        reference: this.createJSReference('multiply', value1, value2),
        user: this.createJSCorrect('multiply', value1, value2, i % 3),
        expected: 'CORRECT'
      });
    }

    // INCORRECT TESTS (50 tests)
    for (let i = 0; i < 20; i++) {
      const value1 = 5 + i;
      const value2 = 3 + (i % 5);
      tests.push({
        id: id++,
        category: 'incorrect',
        name: `cpp_wrong_op_${i + 1}`,
        reference: this.createCppReference('add', value1, value2),
        user: this.createCppWrong('add', value1, value2, 'wrong_op'),
        expected: 'INCORRECT'
      });
    }

    for (let i = 0; i < 15; i++) {
      const value1 = 10 + i;
      const value2 = 4 + (i % 4);
      tests.push({
        id: id++,
        category: 'incorrect',
        name: `python_swapped_${i + 1}`,
        reference: this.createPythonReference('subtract', value1, value2),
        user: this.createPythonWrong('subtract', value1, value2, 'swapped'),
        expected: 'INCORRECT'
      });
    }

    for (let i = 0; i < 15; i++) {
      const value1 = 20 + i;
      const value2 = 5 + (i % 3);
      tests.push({
        id: id++,
        category: 'incorrect',
        name: `js_missing_operand_${i + 1}`,
        reference: this.createJSReference('add', value1, value2),
        user: this.createJSWrong('add', value1, value2, 'missing'),
        expected: 'INCORRECT'
      });
    }

    // CHEATING TESTS (50 tests)
    for (let i = 0; i < 20; i++) {
      const value1 = 5 + i;
      const value2 = 3 + (i % 5);
      const result = value1 + value2;
      tests.push({
        id: id++,
        category: 'cheating',
        name: `cpp_hardcoded_${i + 1}`,
        reference: this.createCppReference('add', value1, value2),
        user: this.createCppHardcoded('add', value1, value2, result),
        expected: 'INCORRECT'
      });
    }

    for (let i = 0; i < 15; i++) {
      const value1 = 10 + i;
      const value2 = 3 + (i % 4);
      const result = value1 - value2;
      tests.push({
        id: id++,
        category: 'cheating',
        name: `python_hardcoded_${i + 1}`,
        reference: this.createPythonReference('subtract', value1, value2),
        user: this.createPythonHardcoded('subtract', value1, value2, result),
        expected: 'INCORRECT'
      });
    }

    for (let i = 0; i < 15; i++) {
      const value1 = 4 + i;
      const value2 = 2 + (i % 3);
      const result = value1 * value2;
      tests.push({
        id: id++,
        category: 'cheating',
        name: `js_hardcoded_${i + 1}`,
        reference: this.createJSReference('multiply', value1, value2),
        user: this.createJSHardcoded('multiply', value1, value2, result),
        expected: 'INCORRECT'
      });
    }

    console.log(`✅ Generated ${tests.length} test cases:`);
    console.log(`   - Genuine: ${tests.filter(t => t.category === 'genuine').length}`);
    console.log(`   - Incorrect: ${tests.filter(t => t.category === 'incorrect').length}`);
    console.log(`   - Cheating: ${tests.filter(t => t.category === 'cheating').length}`);

    return tests;
  }

  // C++ Reference
  createCppReference(op, v1, v2) {
    const ops = { add: '+', multiply: '*', subtract: '-', divide: '/' };
    const symbol = ops[op];
    return {
      language: 'cpp',
      code: `#include <iostream>
int ${op}(int a, int b) {
    return a ${symbol} b;
}
int main() {
    std::cout << ${op}(${v1}, ${v2});
    return 0;
}`
    };
  }

  // C++ Correct implementation with variations
  createCppCorrect(op, v1, v2, variant) {
    const ops = { add: '+', multiply: '*', subtract: '-', divide: '/' };
    const symbol = ops[op];
    
    if (variant === 0) {
      return {
        language: 'cpp',
        code: `#include <iostream>
int ${op}(int a, int b) {
    return a ${symbol} b;
}
int main() {
    std::cout << ${op}(${v1}, ${v2});
    return 0;
}`
      };
    } else if (variant === 1) {
      return {
        language: 'cpp',
        code: `#include <iostream>
int ${op}(int a, int b) {
    int result = a ${symbol} b;
    return result;
}
int main() {
    std::cout << ${op}(${v1}, ${v2});
    return 0;
}`
      };
    } else if (variant === 2) {
      return {
        language: 'cpp',
        code: `#include <iostream>
int ${op}(int a, int b) {
    int x = a;
    int y = b;
    return x ${symbol} y;
}
int main() {
    std::cout << ${op}(${v1}, ${v2});
    return 0;
}`
      };
    } else if (variant === 3 && op === 'multiply') {
      return {
        language: 'cpp',
        code: `#include <iostream>
int ${op}(int a, int b) {
    return b ${symbol} a;  // Commutative
}
int main() {
    std::cout << ${op}(${v1}, ${v2});
    return 0;
}`
      };
    } else {
      return {
        language: 'cpp',
        code: `#include <iostream>
int ${op}(int a, int b) {
    int temp = a ${symbol} b;
    return temp;
}
int main() {
    std::cout << ${op}(${v1}, ${v2});
    return 0;
}`
      };
    }
  }

  // C++ Wrong implementation
  createCppWrong(op, v1, v2, errorType) {
    const ops = { add: '+', multiply: '*', subtract: '-', divide: '/' };
    const wrongOps = { add: '-', multiply: '+', subtract: '+', divide: '*' };
    
    if (errorType === 'wrong_op') {
      return {
        language: 'cpp',
        code: `#include <iostream>
int ${op}(int a, int b) {
    return a ${wrongOps[op]} b;  // WRONG OPERATION
}
int main() {
    std::cout << ${op}(${v1}, ${v2});
    return 0;
}`
      };
    }
    
    return this.createCppCorrect(op, v1, v2, 0);
  }

  // C++ Hardcoded
  createCppHardcoded(op, v1, v2, result) {
    return {
      language: 'cpp',
      code: `#include <iostream>
int ${op}(int a, int b) {
    return ${result};  // HARDCODED
}
int main() {
    std::cout << ${op}(${v1}, ${v2});
    return 0;
}`
    };
  }

  // Python Reference
  createPythonReference(op, v1, v2) {
    const ops = { add: '+', multiply: '*', subtract: '-', divide: '//' };
    const symbol = ops[op];
    return {
      language: 'python',
      code: `def ${op}(a, b):
    return a ${symbol} b

print(${op}(${v1}, ${v2}))`
    };
  }

  // Python Correct
  createPythonCorrect(op, v1, v2, variant) {
    const ops = { add: '+', multiply: '*', subtract: '-', divide: '//' };
    const symbol = ops[op];
    
    if (variant === 0) {
      return {
        language: 'python',
        code: `def ${op}(a, b):
    return a ${symbol} b

print(${op}(${v1}, ${v2}))`
      };
    } else if (variant === 1) {
      return {
        language: 'python',
        code: `def ${op}(a, b):
    result = a ${symbol} b
    return result

print(${op}(${v1}, ${v2}))`
      };
    } else {
      return {
        language: 'python',
        code: `def ${op}(a, b):
    x, y = a, b
    return x ${symbol} y

print(${op}(${v1}, ${v2}))`
      };
    }
  }

  // Python Wrong
  createPythonWrong(op, v1, v2, errorType) {
    const ops = { add: '+', multiply: '*', subtract: '-', divide: '//' };
    const symbol = ops[op];
    
    if (errorType === 'swapped' && op === 'subtract') {
      return {
        language: 'python',
        code: `def ${op}(a, b):
    return b ${symbol} a  // SWAPPED

print(${op}(${v1}, ${v2}))`
      };
    }
    
    return this.createPythonCorrect(op, v1, v2, 0);
  }

  // Python Hardcoded
  createPythonHardcoded(op, v1, v2, result) {
    return {
      language: 'python',
      code: `def ${op}(a, b):
    return ${result}  # HARDCODED

print(${op}(${v1}, ${v2}))`
    };
  }

  // JavaScript Reference
  createJSReference(op, v1, v2) {
    const ops = { add: '+', multiply: '*', subtract: '-', divide: '/' };
    const symbol = ops[op];
    const code = op === 'divide' 
      ? `function ${op}(a, b) {
    return Math.floor(a ${symbol} b);
}
console.log(${op}(${v1}, ${v2}));`
      : `function ${op}(a, b) {
    return a ${symbol} b;
}
console.log(${op}(${v1}, ${v2}));`;
    
    return {
      language: 'javascript',
      code
    };
  }

  // JavaScript Correct
  createJSCorrect(op, v1, v2, variant) {
    const ops = { add: '+', multiply: '*', subtract: '-', divide: '/' };
    const symbol = ops[op];
    
    if (variant === 0) {
      const code = op === 'divide'
        ? `function ${op}(a, b) {
    return Math.floor(a ${symbol} b);
}
console.log(${op}(${v1}, ${v2}));`
        : `function ${op}(a, b) {
    return a ${symbol} b;
}
console.log(${op}(${v1}, ${v2}));`;
      return { language: 'javascript', code };
    } else if (variant === 1) {
      const code = op === 'divide'
        ? `function ${op}(a, b) {
    const result = Math.floor(a ${symbol} b);
    return result;
}
console.log(${op}(${v1}, ${v2}));`
        : `function ${op}(a, b) {
    const result = a ${symbol} b;
    return result;
}
console.log(${op}(${v1}, ${v2}));`;
      return { language: 'javascript', code };
    } else {
      const code = op === 'divide'
        ? `function ${op}(a, b) {
    const x = a;
    const y = b;
    return Math.floor(x ${symbol} y);
}
console.log(${op}(${v1}, ${v2}));`
        : `function ${op}(a, b) {
    const x = a;
    const y = b;
    return x ${symbol} y;
}
console.log(${op}(${v1}, ${v2}));`;
      return { language: 'javascript', code };
    }
  }

  // JavaScript Wrong
  createJSWrong(op, v1, v2, errorType) {
    if (errorType === 'missing') {
      return {
        language: 'javascript',
        code: `function ${op}(a, b) {
    return a;  // WRONG: missing operand
}
console.log(${op}(${v1}, ${v2}));`
      };
    }
    return this.createJSCorrect(op, v1, v2, 0);
  }

  // JavaScript Hardcoded
  createJSHardcoded(op, v1, v2, result) {
    return {
      language: 'javascript',
      code: `function ${op}(a, b) {
    return ${result};  // HARDCODED
}
console.log(${op}(${v1}, ${v2}));`
    };
  }

  // Run a single test
  async runTest(test) {
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
      
      return {
        id: test.id,
        name: test.name,
        category: test.category,
        expected: test.expected,
        actual: verdict,
        passed,
        aiUsed: response.data.logic_correctness?.ai_verification?.ai_used || false,
        tacUsed: response.data.logic_correctness?.tac_logic ? true : false
      };
    } catch (error) {
      return {
        id: test.id,
        name: test.name,
        category: test.category,
        expected: test.expected,
        actual: 'ERROR',
        passed: false,
        error: error.message
      };
    }
  }

  // Run all tests
  async runAll() {
    this.startTime = Date.now();
    const tests = this.generateTests();
    this.totalTests = tests.length;

    console.log(`\n🚀 Running ${tests.length} tests...\n`);

    let completed = 0;
    for (const test of tests) {
      completed++;
      const percentage = ((completed / tests.length) * 100).toFixed(1);
      process.stdout.write(`\r[${completed}/${tests.length}] (${percentage}%) Testing ${test.name}...          `);
      
      const result = await this.runTest(test);
      this.results[test.category].tests.push(result);
      
      if (result.passed) {
        this.results[test.category].passed++;
      } else {
        this.results[test.category].failed++;
      }
      
      // Small delay
      await new Promise(resolve => setTimeout(resolve, 50));
    }

    console.log('\n\n✅ All tests completed!\n');
    this.generateReport();
  }

  // Generate report
  generateReport() {
    const duration = ((Date.now() - this.startTime) / 1000).toFixed(2);
    const totalPassed = this.results.genuine.passed + this.results.incorrect.passed + this.results.cheating.passed;
    const accuracy = ((totalPassed / this.totalTests) * 100).toFixed(2);

    console.log('='.repeat(80));
    console.log('📊 TEST RESULTS');
    console.log('='.repeat(80));
    console.log(`\n🎯 OVERALL: ${totalPassed}/${this.totalTests} passed (${accuracy}%)`);
    console.log(`⏱️  Duration: ${duration}s`);

    for (const [category, data] of Object.entries(this.results)) {
      const total = data.passed + data.failed;
      const catAccuracy = ((data.passed / total) * 100).toFixed(1);
      const status = catAccuracy >= 90 ? '✅' : catAccuracy >= 70 ? '⚠️' : '❌';
      console.log(`\n${status} ${category.toUpperCase()}: ${data.passed}/${total} passed (${catAccuracy}%)`);
    }

    // Save results
    fs.writeFileSync('extended-test-results.json', JSON.stringify(this.results, null, 2));
    console.log(`\n💾 Detailed results saved to extended-test-results.json`);

    // Generate markdown
    this.generateMarkdown(totalPassed, accuracy, duration);
  }

  // Generate markdown report
  generateMarkdown(totalPassed, accuracy, duration) {
    let md = `# Extended Verification System Test Results

**Date:** ${new Date().toLocaleString()}  
**Total Tests:** ${this.totalTests}  
**Passed:** ${totalPassed}  
**Failed:** ${this.totalTests - totalPassed}  
**Overall Accuracy:** **${accuracy}%**  
**Duration:** ${duration}s

---

## Summary by Category

| Category | Passed | Failed | Total | Accuracy | Status |
|----------|--------|--------|-------|----------|--------|
`;

    for (const [category, data] of Object.entries(this.results)) {
      const total = data.passed + data.failed;
      const catAccuracy = ((data.passed / total) * 100).toFixed(1);
      const status = catAccuracy >= 90 ? '✅ Excellent' : catAccuracy >= 70 ? '⚠️ Fair' : '❌ Poor';
      md += `| **${category.charAt(0).toUpperCase() + category.slice(1)}** | ${data.passed} | ${data.failed} | ${total} | ${catAccuracy}% | ${status} |\n`;
    }

    md += `\n---\n\n## Analysis\n\n`;

    const genuineAcc = ((this.results.genuine.passed / (this.results.genuine.passed + this.results.genuine.failed)) * 100).toFixed(1);
    const incorrectAcc = ((this.results.incorrect.passed / (this.results.incorrect.passed + this.results.incorrect.failed)) * 100).toFixed(1);
    const cheatingAcc = ((this.results.cheating.passed / (this.results.cheating.passed + this.results.cheating.failed)) * 100).toFixed(1);

    md += `### Genuine Tests (Correct Implementations)\n\n`;
    md += `**Result:** ${genuineAcc >= 95 ? '✅ Excellent' : genuineAcc >= 85 ? '✅ Good' : '⚠️ Needs Improvement'}\n\n`;
    md += `The system ${genuineAcc >= 95 ? 'correctly identifies' : 'mostly identifies'} valid implementations across C++, Python, and JavaScript.\n\n`;

    md += `### Incorrect Tests (Logic Errors)\n\n`;
    md += `**Result:** ${incorrectAcc >= 90 ? '✅ Excellent' : incorrectAcc >= 75 ? '✅ Good' : '⚠️ Needs Improvement'}\n\n`;
    md += `The system ${incorrectAcc >= 90 ? 'effectively detects' : 'detects most'} logic errors including wrong operations, swapped operands, and missing computations.\n\n`;

    md += `### Cheating Tests (Hardcoded Values)\n\n`;
    md += `**Result:** ${cheatingAcc >= 90 ? '✅ Excellent' : cheatingAcc >= 70 ? '⚠️ Fair' : '❌ Critical Issue'}\n\n`;
    md += `The system ${cheatingAcc >= 90 ? 'successfully catches' : cheatingAcc >= 70 ? 'catches some' : 'struggles to catch'} hardcoded values and pattern matching attempts.\n\n`;

    if (cheatingAcc < 80) {
      md += `**⚠️ Action Required:** Cheating detection needs improvement. TAC extraction for Python/JavaScript may not be working reliably, or AI verification is not being triggered.\n\n`;
    }

    md += `---\n\n## Verdict\n\n`;

    if (parseFloat(accuracy) >= 90) {
      md += `✅ **EXCELLENT** - System is production-ready with ${accuracy}% accuracy.\n`;
    } else if (parseFloat(accuracy) >= 80) {
      md += `✅ **GOOD** - System is functional with ${accuracy}% accuracy. Minor improvements recommended.\n`;
    } else if (parseFloat(accuracy) >= 70) {
      md += `⚠️ **FAIR** - System needs improvement. Current accuracy: ${accuracy}%.\n`;
    } else {
      md += `❌ **POOR** - Major issues detected. Current accuracy: ${accuracy}%. Significant work required.\n`;
    }

    fs.writeFileSync('EXTENDED_TEST_RESULTS.md', md);
    console.log('📄 Markdown report saved to EXTENDED_TEST_RESULTS.md\n');
  }
}

// Run tests
const suite = new ExtendedTestSuite();
suite.runAll()
  .then(() => {
    console.log('✅ Extended test suite completed!');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Test suite failed:', error);
    process.exit(1);
  });
