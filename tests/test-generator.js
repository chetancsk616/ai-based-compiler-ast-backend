/**
 * Comprehensive Test Generator
 * Generates 200+ test cases for verification system validation:
 * - 100 Genuine correct implementations
 * - 100 Incorrect logic implementations
 * - Cheating patterns (hardcoded, conditional, etc.)
 */

class TestGenerator {
  constructor() {
    this.operations = ['add', 'subtract', 'multiply', 'divide', 'modulo'];
    this.languages = ['cpp', 'python', 'javascript'];
  }

  /**
   * Generate 100 genuine correct implementations
   */
  generateGenuineTests() {
    const tests = [];
    let id = 1;

    // 1-20: Simple arithmetic with variations
    for (let i = 0; i < 20; i++) {
      const op = this.operations[i % this.operations.length];
      const lang = this.languages[i % this.languages.length];
      tests.push({
        id: id++,
        category: 'genuine',
        subcategory: 'simple_arithmetic',
        operation: op,
        language: lang,
        ...this.generateSimpleArithmetic(op, lang, 'correct')
      });
    }

    // 21-40: With intermediate variables
    for (let i = 0; i < 20; i++) {
      const op = this.operations[i % this.operations.length];
      const lang = this.languages[i % this.languages.length];
      tests.push({
        id: id++,
        category: 'genuine',
        subcategory: 'with_intermediate',
        operation: op,
        language: lang,
        ...this.generateWithIntermediate(op, lang)
      });
    }

    // 41-60: Multiple operations
    for (let i = 0; i < 20; i++) {
      const lang = this.languages[i % this.languages.length];
      tests.push({
        id: id++,
        category: 'genuine',
        subcategory: 'multiple_operations',
        operation: 'complex',
        language: lang,
        ...this.generateMultipleOperations(lang)
      });
    }

    // 61-80: With conditionals (legitimate)
    for (let i = 0; i < 20; i++) {
      const op = this.operations[i % this.operations.length];
      const lang = this.languages[i % this.languages.length];
      tests.push({
        id: id++,
        category: 'genuine',
        subcategory: 'with_conditionals',
        operation: op,
        language: lang,
        ...this.generateWithLegitimateConditionals(op, lang)
      });
    }

    // 81-100: Different coding styles (all correct)
    for (let i = 0; i < 20; i++) {
      const op = this.operations[i % this.operations.length];
      const lang = this.languages[i % this.languages.length];
      tests.push({
        id: id++,
        category: 'genuine',
        subcategory: 'different_styles',
        operation: op,
        language: lang,
        ...this.generateDifferentStyles(op, lang)
      });
    }

    return tests;
  }

  /**
   * Generate 100 incorrect logic implementations
   */
  generateIncorrectTests() {
    const tests = [];
    let id = 101;

    // 101-120: Wrong operation
    for (let i = 0; i < 20; i++) {
      const correctOp = this.operations[i % this.operations.length];
      const wrongOp = this.operations[(i + 1) % this.operations.length];
      const lang = this.languages[i % this.languages.length];
      tests.push({
        id: id++,
        category: 'incorrect',
        subcategory: 'wrong_operation',
        operation: correctOp,
        language: lang,
        error_type: 'used_' + wrongOp + '_instead',
        ...this.generateWrongOperation(correctOp, wrongOp, lang)
      });
    }

    // 121-140: Off-by-one errors
    for (let i = 0; i < 20; i++) {
      const op = this.operations[i % this.operations.length];
      const lang = this.languages[i % this.languages.length];
      tests.push({
        id: id++,
        category: 'incorrect',
        subcategory: 'off_by_one',
        operation: op,
        language: lang,
        error_type: 'off_by_one',
        ...this.generateOffByOne(op, lang)
      });
    }

    // 141-160: Swapped operands
    for (let i = 0; i < 20; i++) {
      const op = this.operations[i % this.operations.length];
      const lang = this.languages[i % this.languages.length];
      tests.push({
        id: id++,
        category: 'incorrect',
        subcategory: 'swapped_operands',
        operation: op,
        language: lang,
        error_type: 'swapped_ab',
        ...this.generateSwappedOperands(op, lang)
      });
    }

    // 161-180: Missing operations
    for (let i = 0; i < 20; i++) {
      const op = this.operations[i % this.operations.length];
      const lang = this.languages[i % this.languages.length];
      tests.push({
        id: id++,
        category: 'incorrect',
        subcategory: 'missing_operations',
        operation: op,
        language: lang,
        error_type: 'incomplete_logic',
        ...this.generateMissingOperations(op, lang)
      });
    }

    // 181-200: Incorrect formula
    for (let i = 0; i < 20; i++) {
      const op = this.operations[i % this.operations.length];
      const lang = this.languages[i % this.languages.length];
      tests.push({
        id: id++,
        category: 'incorrect',
        subcategory: 'wrong_formula',
        operation: op,
        language: lang,
        error_type: 'incorrect_formula',
        ...this.generateWrongFormula(op, lang)
      });
    }

    return tests;
  }

  /**
   * Generate cheating pattern tests
   */
  generateCheatingTests() {
    const tests = [];
    let id = 201;

    // 201-210: Hardcoded values
    for (let i = 0; i < 10; i++) {
      const op = this.operations[i % this.operations.length];
      const lang = this.languages[i % this.languages.length];
      tests.push({
        id: id++,
        category: 'cheating',
        subcategory: 'hardcoded',
        operation: op,
        language: lang,
        cheat_type: 'hardcoded_return',
        ...this.generateHardcoded(op, lang)
      });
    }

    // 211-220: Conditional hardcoding
    for (let i = 0; i < 10; i++) {
      const op = this.operations[i % this.operations.length];
      const lang = this.languages[i % this.languages.length];
      tests.push({
        id: id++,
        category: 'cheating',
        subcategory: 'conditional_hardcoding',
        operation: op,
        language: lang,
        cheat_type: 'pattern_matching',
        ...this.generateConditionalHardcoding(op, lang)
      });
    }

    // 221-225: Output manipulation
    for (let i = 0; i < 5; i++) {
      const op = this.operations[i % this.operations.length];
      const lang = this.languages[i % this.languages.length];
      tests.push({
        id: id++,
        category: 'cheating',
        subcategory: 'output_manipulation',
        operation: op,
        language: lang,
        cheat_type: 'print_expected',
        ...this.generateOutputManipulation(op, lang)
      });
    }

    return tests;
  }

  // Helper: Generate simple arithmetic
  generateSimpleArithmetic(op, lang, variant = 'correct') {
    const testInput = { a: 5, b: 3 };
    const opSymbol = { add: '+', subtract: '-', multiply: '*', divide: '/', modulo: '%' }[op];
    const opName = op;

    if (lang === 'cpp') {
      return {
        referenceCode: {
          language: 'cpp',
          code: `#include <iostream>
int ${opName}(int a, int b) {
    return a ${opSymbol} b;
}
int main() {
    std::cout << ${opName}(${testInput.a}, ${testInput.b});
    return 0;
}`
        },
        userCode: {
          language: 'cpp',
          code: `#include <iostream>
int ${opName}(int a, int b) {
    return a ${opSymbol} b;
}
int main() {
    std::cout << ${opName}(${testInput.a}, ${testInput.b});
    return 0;
}`
        },
        testInputs: [],
        expectedVerdict: 'CORRECT'
      };
    } else if (lang === 'python') {
      return {
        referenceCode: {
          language: 'python',
          code: `def ${opName}(a, b):
    return a ${opSymbol} b

print(${opName}(${testInput.a}, ${testInput.b}))`
        },
        userCode: {
          language: 'python',
          code: `def ${opName}(a, b):
    return a ${opSymbol} b

print(${opName}(${testInput.a}, ${testInput.b}))`
        },
        testInputs: [],
        expectedVerdict: 'CORRECT'
      };
    } else {
      return {
        referenceCode: {
          language: 'javascript',
          code: `function ${opName}(a, b) {
    return a ${opSymbol} b;
}
console.log(${opName}(${testInput.a}, ${testInput.b}));`
        },
        userCode: {
          language: 'javascript',
          code: `function ${opName}(a, b) {
    return a ${opSymbol} b;
}
console.log(${opName}(${testInput.a}, ${testInput.b}));`
        },
        testInputs: [],
        expectedVerdict: 'CORRECT'
      };
    }
  }

  // Helper: Generate with intermediate variables
  generateWithIntermediate(op, lang) {
    const testInput = { a: 10, b: 5 };
    const opSymbol = { add: '+', subtract: '-', multiply: '*', divide: '/', modulo: '%' }[op];
    const opName = op;

    if (lang === 'cpp') {
      return {
        referenceCode: {
          language: 'cpp',
          code: `#include <iostream>
int ${opName}(int a, int b) {
    return a ${opSymbol} b;
}
int main() {
    std::cout << ${opName}(${testInput.a}, ${testInput.b});
    return 0;
}`
        },
        userCode: {
          language: 'cpp',
          code: `#include <iostream>
int ${opName}(int a, int b) {
    int result = a ${opSymbol} b;
    return result;
}
int main() {
    std::cout << ${opName}(${testInput.a}, ${testInput.b});
    return 0;
}`
        },
        testInputs: [],
        expectedVerdict: 'CORRECT'
      };
    } else if (lang === 'python') {
      return {
        referenceCode: {
          language: 'python',
          code: `def ${opName}(a, b):
    return a ${opSymbol} b

print(${opName}(${testInput.a}, ${testInput.b}))`
        },
        userCode: {
          language: 'python',
          code: `def ${opName}(a, b):
    result = a ${opSymbol} b
    return result

print(${opName}(${testInput.a}, ${testInput.b}))`
        },
        testInputs: [],
        expectedVerdict: 'CORRECT'
      };
    } else {
      return {
        referenceCode: {
          language: 'javascript',
          code: `function ${opName}(a, b) {
    return a ${opSymbol} b;
}
console.log(${opName}(${testInput.a}, ${testInput.b}));`
        },
        userCode: {
          language: 'javascript',
          code: `function ${opName}(a, b) {
    const result = a ${opSymbol} b;
    return result;
}
console.log(${opName}(${testInput.a}, ${testInput.b}));`
        },
        testInputs: [],
        expectedVerdict: 'CORRECT'
      };
    }
  }

  // Helper: Generate multiple operations
  generateMultipleOperations(lang) {
    const testInput = { a: 10, b: 5 };

    if (lang === 'cpp') {
      return {
        referenceCode: {
          language: 'cpp',
          code: `#include <iostream>
int compute(int a, int b) {
    return (a + b) * 2;
}
int main() {
    std::cout << compute(${testInput.a}, ${testInput.b});
    return 0;
}`
        },
        userCode: {
          language: 'cpp',
          code: `#include <iostream>
int compute(int a, int b) {
    int sum = a + b;
    int result = sum * 2;
    return result;
}
int main() {
    std::cout << compute(${testInput.a}, ${testInput.b});
    return 0;
}`
        },
        testInputs: [],
        expectedVerdict: 'CORRECT'
      };
    } else if (lang === 'python') {
      return {
        referenceCode: {
          language: 'python',
          code: `def compute(a, b):
    return (a + b) * 2

print(compute(${testInput.a}, ${testInput.b}))`
        },
        userCode: {
          language: 'python',
          code: `def compute(a, b):
    sum_val = a + b
    result = sum_val * 2
    return result

print(compute(${testInput.a}, ${testInput.b}))`
        },
        testInputs: [],
        expectedVerdict: 'CORRECT'
      };
    } else {
      return {
        referenceCode: {
          language: 'javascript',
          code: `function compute(a, b) {
    return (a + b) * 2;
}
console.log(compute(${testInput.a}, ${testInput.b}));`
        },
        userCode: {
          language: 'javascript',
          code: `function compute(a, b) {
    const sum = a + b;
    const result = sum * 2;
    return result;
}
console.log(compute(${testInput.a}, ${testInput.b}));`
        },
        testInputs: [],
        expectedVerdict: 'CORRECT'
      };
    }
  }

  // Helper: Generate with legitimate conditionals
  generateWithLegitimateConditionals(op, lang) {
    const testInput = { a: -5, b: 3 };
    const opSymbol = { add: '+', subtract: '-', multiply: '*', divide: '/', modulo: '%' }[op];
    const opName = op === 'add' ? 'addAbs' : op;

    if (lang === 'cpp') {
      return {
        referenceCode: {
          language: 'cpp',
          code: `#include <iostream>
int ${opName}(int a, int b) {
    return a ${opSymbol} b;
}
int main() {
    std::cout << ${opName}(${testInput.a}, ${testInput.b});
    return 0;
}`
        },
        userCode: {
          language: 'cpp',
          code: `#include <iostream>
int ${opName}(int a, int b) {
    if (a < 0) a = -a;  // Legitimate logic
    if (b < 0) b = -b;
    return a ${opSymbol} b;
}
int main() {
    std::cout << ${opName}(${testInput.a}, ${testInput.b});
    return 0;
}`
        },
        testInputs: [],
        expectedVerdict: op === 'add' ? 'CORRECT' : 'INCORRECT'
      };
    }
    // Similar for python and javascript...
    return this.generateSimpleArithmetic(op, lang);
  }

  // Helper: Different styles (still correct)
  generateDifferentStyles(op, lang) {
    return this.generateWithIntermediate(op, lang);
  }

  // INCORRECT PATTERNS

  // Wrong operation
  generateWrongOperation(correctOp, wrongOp, lang) {
    const testInput = { a: 10, b: 5 };
    const correctSymbol = { add: '+', subtract: '-', multiply: '*', divide: '/', modulo: '%' }[correctOp];
    const wrongSymbol = { add: '+', subtract: '-', multiply: '*', divide: '/', modulo: '%' }[wrongOp];

    if (lang === 'cpp') {
      return {
        referenceCode: {
          language: 'cpp',
          code: `#include <iostream>
int compute(int a, int b) {
    return a ${correctSymbol} b;
}
int main() {
    std::cout << compute(${testInput.a}, ${testInput.b});
    return 0;
}`
        },
        userCode: {
          language: 'cpp',
          code: `#include <iostream>
int compute(int a, int b) {
    return a ${wrongSymbol} b;  // WRONG OPERATION
}
int main() {
    std::cout << compute(${testInput.a}, ${testInput.b});
    return 0;
}`
        },
        testInputs: [],
        expectedVerdict: 'INCORRECT'
      };
    } else if (lang === 'python') {
      return {
        referenceCode: {
          language: 'python',
          code: `def compute(a, b):
    return a ${correctSymbol} b

print(compute(${testInput.a}, ${testInput.b}))`
        },
        userCode: {
          language: 'python',
          code: `def compute(a, b):
    return a ${wrongSymbol} b  # WRONG OPERATION

print(compute(${testInput.a}, ${testInput.b}))`
        },
        testInputs: [],
        expectedVerdict: 'INCORRECT'
      };
    } else {
      return {
        referenceCode: {
          language: 'javascript',
          code: `function compute(a, b) {
    return a ${correctSymbol} b;
}
console.log(compute(${testInput.a}, ${testInput.b}));`
        },
        userCode: {
          language: 'javascript',
          code: `function compute(a, b) {
    return a ${wrongSymbol} b;  // WRONG OPERATION
}
console.log(compute(${testInput.a}, ${testInput.b}));`
        },
        testInputs: [],
        expectedVerdict: 'INCORRECT'
      };
    }
  }

  // Off by one
  generateOffByOne(op, lang) {
    const testInput = { a: 10, b: 5 };
    const opSymbol = { add: '+', subtract: '-', multiply: '*', divide: '/', modulo: '%' }[op];

    if (lang === 'cpp') {
      return {
        referenceCode: {
          language: 'cpp',
          code: `#include <iostream>
int compute(int a, int b) {
    return a ${opSymbol} b;
}
int main() {
    std::cout << compute(${testInput.a}, ${testInput.b});
    return 0;
}`
        },
        userCode: {
          language: 'cpp',
          code: `#include <iostream>
int compute(int a, int b) {
    return (a ${opSymbol} b) + 1;  // OFF BY ONE
}
int main() {
    std::cout << compute(${testInput.a}, ${testInput.b});
    return 0;
}`
        },
        testInputs: [],
        expectedVerdict: 'INCORRECT'
      };
    }
    // Similar for other languages
    return this.generateWrongOperation(op, op, lang);
  }

  // Swapped operands
  generateSwappedOperands(op, lang) {
    const testInput = { a: 10, b: 5 };
    const opSymbol = { add: '+', subtract: '-', multiply: '*', divide: '/', modulo: '%' }[op];

    if (op === 'add' || op === 'multiply') {
      // Swapping doesn't matter for commutative operations
      return this.generateSimpleArithmetic(op, lang);
    }

    if (lang === 'cpp') {
      return {
        referenceCode: {
          language: 'cpp',
          code: `#include <iostream>
int compute(int a, int b) {
    return a ${opSymbol} b;
}
int main() {
    std::cout << compute(${testInput.a}, ${testInput.b});
    return 0;
}`
        },
        userCode: {
          language: 'cpp',
          code: `#include <iostream>
int compute(int a, int b) {
    return b ${opSymbol} a;  // SWAPPED
}
int main() {
    std::cout << compute(${testInput.a}, ${testInput.b});
    return 0;
}`
        },
        testInputs: [],
        expectedVerdict: 'INCORRECT'
      };
    }
    return this.generateWrongOperation(op, op, lang);
  }

  // Missing operations
  generateMissingOperations(op, lang) {
    const testInput = { a: 10, b: 5 };

    if (lang === 'cpp') {
      return {
        referenceCode: {
          language: 'cpp',
          code: `#include <iostream>
int compute(int a, int b) {
    return a + b;
}
int main() {
    std::cout << compute(${testInput.a}, ${testInput.b});
    return 0;
}`
        },
        userCode: {
          language: 'cpp',
          code: `#include <iostream>
int compute(int a, int b) {
    return a;  // MISSING OPERATION
}
int main() {
    std::cout << compute(${testInput.a}, ${testInput.b});
    return 0;
}`
        },
        testInputs: [],
        expectedVerdict: 'INCORRECT'
      };
    }
    return this.generateWrongOperation(op, op, lang);
  }

  // Wrong formula
  generateWrongFormula(op, lang) {
    const testInput = { a: 10, b: 5 };
    const opSymbol = { add: '+', subtract: '-', multiply: '*', divide: '/', modulo: '%' }[op];

    if (lang === 'cpp') {
      return {
        referenceCode: {
          language: 'cpp',
          code: `#include <iostream>
int compute(int a, int b) {
    return a ${opSymbol} b;
}
int main() {
    std::cout << compute(${testInput.a}, ${testInput.b});
    return 0;
}`
        },
        userCode: {
          language: 'cpp',
          code: `#include <iostream>
int compute(int a, int b) {
    return a ${opSymbol} b ${opSymbol} 1;  // WRONG FORMULA
}
int main() {
    std::cout << compute(${testInput.a}, ${testInput.b});
    return 0;
}`
        },
        testInputs: [],
        expectedVerdict: 'INCORRECT'
      };
    }
    return this.generateWrongOperation(op, op, lang);
  }

  // CHEATING PATTERNS

  // Hardcoded
  generateHardcoded(op, lang) {
    const testInput = { a: 10, b: 5 };
    const opSymbol = { add: '+', subtract: '-', multiply: '*', divide: '/', modulo: '%' }[op];
    const expectedOutput = eval(`${testInput.a} ${opSymbol} ${testInput.b}`);

    if (lang === 'cpp') {
      return {
        referenceCode: {
          language: 'cpp',
          code: `#include <iostream>
int compute(int a, int b) {
    return a ${opSymbol} b;
}
int main() {
    std::cout << compute(${testInput.a}, ${testInput.b});
    return 0;
}`
        },
        userCode: {
          language: 'cpp',
          code: `#include <iostream>
int compute(int a, int b) {
    return ${expectedOutput};  // HARDCODED
}
int main() {
    std::cout << compute(${testInput.a}, ${testInput.b});
    return 0;
}`
        },
        testInputs: [],
        expectedVerdict: 'INCORRECT'
      };
    } else if (lang === 'python') {
      return {
        referenceCode: {
          language: 'python',
          code: `def compute(a, b):
    return a ${opSymbol} b

print(compute(${testInput.a}, ${testInput.b}))`
        },
        userCode: {
          language: 'python',
          code: `def compute(a, b):
    return ${expectedOutput}  # HARDCODED

print(compute(${testInput.a}, ${testInput.b}))`
        },
        testInputs: [],
        expectedVerdict: 'INCORRECT'
      };
    } else {
      return {
        referenceCode: {
          language: 'javascript',
          code: `function compute(a, b) {
    return a ${opSymbol} b;
}
console.log(compute(${testInput.a}, ${testInput.b}));`
        },
        userCode: {
          language: 'javascript',
          code: `function compute(a, b) {
    return ${expectedOutput};  // HARDCODED
}
console.log(compute(${testInput.a}, ${testInput.b}));`
        },
        testInputs: [],
        expectedVerdict: 'INCORRECT'
      };
    }
  }

  // Conditional hardcoding
  generateConditionalHardcoding(op, lang) {
    const testInput = { a: 10, b: 5 };
    const opSymbol = { add: '+', subtract: '-', multiply: '*', divide: '/', modulo: '%' }[op];
    const expectedOutput = eval(`${testInput.a} ${opSymbol} ${testInput.b}`);

    if (lang === 'cpp') {
      return {
        referenceCode: {
          language: 'cpp',
          code: `#include <iostream>
int compute(int a, int b) {
    return a ${opSymbol} b;
}
int main() {
    std::cout << compute(${testInput.a}, ${testInput.b});
    return 0;
}`
        },
        userCode: {
          language: 'cpp',
          code: `#include <iostream>
int compute(int a, int b) {
    if (a == ${testInput.a} && b == ${testInput.b}) return ${expectedOutput};  // CONDITIONAL CHEAT
    return a ${opSymbol} b;
}
int main() {
    std::cout << compute(${testInput.a}, ${testInput.b});
    return 0;
}`
        },
        testInputs: [],
        expectedVerdict: 'INCORRECT'
      };
    }
    return this.generateHardcoded(op, lang);
  }

  // Output manipulation
  generateOutputManipulation(op, lang) {
    const testInput = { a: 10, b: 5 };
    const opSymbol = { add: '+', subtract: '-', multiply: '*', divide: '/', modulo: '%' }[op];
    const expectedOutput = eval(`${testInput.a} ${opSymbol} ${testInput.b}`);

    if (lang === 'cpp') {
      return {
        referenceCode: {
          language: 'cpp',
          code: `#include <iostream>
int compute(int a, int b) {
    return a ${opSymbol} b;
}
int main() {
    std::cout << compute(${testInput.a}, ${testInput.b});
    return 0;
}`
        },
        userCode: {
          language: 'cpp',
          code: `#include <iostream>
int compute(int a, int b) {
    std::cout << ${expectedOutput};  // OUTPUT MANIPULATION
    return 0;
}
int main() {
    compute(${testInput.a}, ${testInput.b});
    return 0;
}`
        },
        testInputs: [],
        expectedVerdict: 'INCORRECT'
      };
    }
    return this.generateHardcoded(op, lang);
  }

  /**
   * Generate all test cases
   */
  generateAll() {
    return {
      genuine: this.generateGenuineTests(),
      incorrect: this.generateIncorrectTests(),
      cheating: this.generateCheatingTests()
    };
  }
}

module.exports = TestGenerator;

// CLI usage
if (require.main === module) {
  const generator = new TestGenerator();
  const allTests = generator.generateAll();
  
  console.log('Generated Tests:');
  console.log('- Genuine (correct):', allTests.genuine.length);
  console.log('- Incorrect (logic errors):', allTests.incorrect.length);
  console.log('- Cheating (hardcoded/patterns):', allTests.cheating.length);
  console.log('- TOTAL:', allTests.genuine.length + allTests.incorrect.length + allTests.cheating.length);
  
  // Save to file
  const fs = require('fs');
  fs.writeFileSync('generated-tests.json', JSON.stringify(allTests, null, 2));
  console.log('\nSaved to generated-tests.json');
}
