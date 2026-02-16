/**
 * Test Suite for Human Review Flagging System
 * Tests the final AI verification pass and review flagging logic
 */

const axios = require('axios');
const fs = require('fs');

const API_URL = 'http://localhost:3000/api/verify';

// Test cases that should be flagged for human review
const TESTS = [
  {
    id: 1,
    name: 'cpp_conditional_exact_input',
    description: 'C++ with if(a==5 && b==3) return 8 - should be flagged',
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
    expectedVerdict: 'CORRECT',
    expectedFlagged: true,
    expectedReason: /conditional|if.*statement|hardcod|cheat/i
  },
  {
    id: 2,
    name: 'cpp_multiple_conditionals',
    description: 'C++ with multiple conditional checks - should be flagged',
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
    expectedVerdict: 'CORRECT',
    expectedFlagged: true,
    expectedReason: /conditional|multiple.*if|cheat/i
  },
  {
    id: 3,
    name: 'cpp_switch_case_lookup',
    description: 'C++ with switch-case lookup table - should be flagged',
    reference: {
      language: 'cpp',
      code: `#include <iostream>
int multiply(int a, int b) {
    return a * b;
}
int main() {
    std::cout << multiply(6, 9);
    return 0;
}`
    },
    user: {
      language: 'cpp',
      code: `#include <iostream>
int multiply(int a, int b) {
    int key = a * 100 + b;
    switch(key) {
        case 609: return 54;
        case 305: return 15;
        case 408: return 32;
        default: return a * b;
    }
}
int main() {
    std::cout << multiply(6, 9);
    return 0;
}`
    },
    expectedVerdict: 'CORRECT',
    expectedFlagged: true,
    expectedReason: /switch|lookup|pattern|cheat/i
  },
  {
    id: 4,
    name: 'cpp_legitimate_complex',
    description: 'C++ with legitimate complexity - should NOT be flagged',
    reference: {
      language: 'cpp',
      code: `#include <iostream>
int add(int a, int b) {
    return a + b;
}
int main() {
    std::cout << add(10, 20);
    return 0;
}`
    },
    user: {
      language: 'cpp',
      code: `#include <iostream>
int add(int a, int b) {
    int temp1 = a;
    int temp2 = b;
    int sum = temp1 + temp2;
    return sum;
}
int main() {
    std::cout << add(10, 20);
    return 0;
}`
    },
    expectedVerdict: 'CORRECT',
    expectedFlagged: false,
    expectedReason: null
  },
  {
    id: 5,
    name: 'cpp_ternary_legitimate',
    description: 'C++ with ternary operator for edge case handling - should NOT be flagged',
    reference: {
      language: 'cpp',
      code: `#include <iostream>
int divide(int a, int b) {
    return a / b;
}
int main() {
    std::cout << divide(20, 5);
    return 0;
}`
    },
    user: {
      language: 'cpp',
      code: `#include <iostream>
int divide(int a, int b) {
    return (b == 0) ? 0 : a / b;
}
int main() {
    std::cout << divide(20, 5);
    return 0;
}`
    },
    expectedVerdict: 'CORRECT',
    expectedFlagged: false,
    expectedReason: null
  },
  {
    id: 6,
    name: 'python_conditional_cheat',
    description: 'Python with conditional cheat - should be flagged (AI already catches this)',
    reference: {
      language: 'python',
      code: `def add(a, b):
    return a + b

print(add(7, 8))`
    },
    user: {
      language: 'python',
      code: `def add(a, b):
    if a == 7 and b == 8:
        return 15
    return a + b

print(add(7, 8))`
    },
    expectedVerdict: 'CORRECT',
    expectedFlagged: true,
    expectedReason: /conditional|if.*statement|cheat/i
  },
  {
    id: 7,
    name: 'js_console_hack',
    description: 'JavaScript console.log manipulation - should be flagged',
    reference: {
      language: 'javascript',
      code: `function multiply(a, b) {
    return a * b;
}
console.log(multiply(5, 6));`
    },
    user: {
      language: 'javascript',
      code: `function multiply(a, b) {
    if (a === 5 && b === 6) {
        console.log(30);
        return 0;
    }
    return a * b;
}
multiply(5, 6);`
    },
    expectedVerdict: 'CORRECT',
    expectedFlagged: true,
    expectedReason: /output.*manipulation|console|cheat/i
  },
  {
    id: 8,
    name: 'cpp_simple_correct',
    description: 'Simple correct C++ - should NOT be flagged',
    reference: {
      language: 'cpp',
      code: `#include <iostream>
int add(int a, int b) {
    return a + b;
}
int main() {
    std::cout << add(15, 25);
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
    std::cout << add(15, 25);
    return 0;
}`
    },
    expectedVerdict: 'CORRECT',
    expectedFlagged: false,
    expectedReason: null
  }
];

async function runTests() {
  console.log('🚨 Human Review Flagging System Test Suite\n');
  console.log('Testing final AI verification pass and review flagging logic\n');
  console.log('='.repeat(80) + '\n');

  const results = {
    total: 0,
    passed: 0,
    failed: 0,
    aiInvocations: 0,
    correctlyFlagged: 0,
    incorrectlyFlagged: 0,
    missedFlags: 0,
    tests: []
  };

  for (const test of TESTS) {
    results.total++;
    process.stdout.write(`[${test.id}/${TESTS.length}] ${test.name}...\n`);
    console.log(`   📝 ${test.description}`);

    try {
      const response = await axios.post(API_URL, {
        referenceCode: test.reference,
        userCode: test.user,
        testInputs: []
      }, {
        timeout: 45000
      });

      const verdict = response.data.verdict;
      const flagged = response.data.flagged_for_review || false;
      const reviewReason = response.data.review_reason || null;
      const finalAI = response.data.final_ai_verification;
      const aiUsed = finalAI !== null && finalAI !== undefined;

      if (aiUsed) {
        results.aiInvocations++;
      }

      // Check if verdict matches
      const verdictMatch = verdict === test.expectedVerdict;

      // Check if flagging behavior matches
      const flagMatch = flagged === test.expectedFlagged;

      // Check if reason matches pattern (if expected to be flagged)
      const reasonMatch = !test.expectedReason || 
                         (reviewReason && test.expectedReason.test(reviewReason));

      const testPassed = verdictMatch && flagMatch && reasonMatch;

      if (testPassed) {
        console.log(`   ✅ PASS`);
        results.passed++;
        
        if (flagged && test.expectedFlagged) {
          results.correctlyFlagged++;
          console.log(`   🚩 Correctly flagged: ${reviewReason}`);
        } else if (!flagged && !test.expectedFlagged) {
          console.log(`   👍 Correctly NOT flagged (legitimate code)`);
        }
      } else {
        console.log(`   ❌ FAIL`);
        results.failed++;

        if (!verdictMatch) {
          console.log(`      Verdict mismatch: Expected ${test.expectedVerdict}, Got ${verdict}`);
        }
        if (!flagMatch) {
          console.log(`      Flag mismatch: Expected flagged=${test.expectedFlagged}, Got ${flagged}`);
          if (test.expectedFlagged && !flagged) {
            results.missedFlags++;
            console.log(`      ⚠️ MISSED FLAG: This should have been flagged for review!`);
          } else {
            results.incorrectlyFlagged++;
            console.log(`      ⚠️ FALSE FLAG: This should NOT have been flagged!`);
          }
        }
        if (!reasonMatch) {
          console.log(`      Reason mismatch: Expected pattern ${test.expectedReason}, Got "${reviewReason}"`);
        }
      }

      if (aiUsed && finalAI) {
        console.log(`   🤖 AI: ${finalAI.verdict} (${finalAI.confidence}% confidence)`);
        console.log(`   📝 ${finalAI.reason}`);
      } else {
        console.log(`   ℹ️ AI was not invoked (TAC check was sufficient)`);
      }

      results.tests.push({
        id: test.id,
        name: test.name,
        description: test.description,
        verdict,
        expectedVerdict: test.expectedVerdict,
        flagged,
        expectedFlagged: test.expectedFlagged,
        reviewReason,
        aiUsed,
        aiVerdict: finalAI?.verdict || null,
        aiConfidence: finalAI?.confidence || null,
        aiReason: finalAI?.reason || null,
        passed: testPassed
      });

    } catch (error) {
      console.log(`   ❌ ERROR: ${error.message}`);
      results.failed++;
      results.tests.push({
        id: test.id,
        name: test.name,
        error: error.message,
        passed: false
      });
    }

    console.log('');
    await new Promise(resolve => setTimeout(resolve, 300));
  }

  // Print summary
  console.log('='.repeat(80));
  console.log('📊 HUMAN REVIEW FLAGGING SYSTEM RESULTS');
  console.log('='.repeat(80));
  console.log(`\n🎯 OVERALL: ${results.passed}/${results.total} tests passed (${((results.passed/results.total)*100).toFixed(1)}%)`);
  console.log(`🤖 AI INVOKED: ${results.aiInvocations}/${results.total} times (${((results.aiInvocations/results.total)*100).toFixed(1)}%)`);
  console.log(`\n🚩 FLAGGING ACCURACY:`);
  console.log(`   ✅ Correctly flagged: ${results.correctlyFlagged}`);
  console.log(`   ❌ Incorrectly flagged (false positives): ${results.incorrectlyFlagged}`);
  console.log(`   ⚠️ Missed flags (false negatives): ${results.missedFlags}`);

  const expectedFlags = TESTS.filter(t => t.expectedFlagged).length;
  const flagAccuracy = expectedFlags > 0 
    ? ((results.correctlyFlagged / expectedFlags) * 100).toFixed(1)
    : 100;
  console.log(`   📈 Flag detection accuracy: ${flagAccuracy}%`);

  // Save results
  fs.writeFileSync('review-flagging-results.json', JSON.stringify(results, null, 2));
  console.log(`\n💾 Detailed results saved to review-flagging-results.json`);

  // Generate markdown report
  generateMarkdownReport(results, flagAccuracy);

  return results;
}

function generateMarkdownReport(results, flagAccuracy) {
  let md = `# Human Review Flagging System Test Results

**Date:** ${new Date().toLocaleString()}  
**Total Tests:** ${results.total}  
**Passed:** ${results.passed}  
**Failed:** ${results.failed}  
**Overall Accuracy:** **${((results.passed/results.total)*100).toFixed(1)}%**  
**AI Invocations:** ${results.aiInvocations}/${results.total} (${((results.aiInvocations/results.total)*100).toFixed(1)}%)

---

## Flagging System Performance

| Metric | Count | Notes |
|--------|-------|-------|
| ✅ Correctly Flagged | ${results.correctlyFlagged} | Suspicious code properly flagged for review |
| ❌ Incorrectly Flagged | ${results.incorrectlyFlagged} | False positives (legitimate code flagged) |
| ⚠️ Missed Flags | ${results.missedFlags} | False negatives (cheating not detected) |
| 📈 Flag Detection Accuracy | **${flagAccuracy}%** | % of cheating patterns correctly identified |

---

## Test Results

| Test | Description | Verdict | Flagged | AI Used | Status |
|------|-------------|---------|---------|---------|--------|
`;

  for (const test of results.tests) {
    const statusIcon = test.passed ? '✅' : '❌';
    const flagIcon = test.flagged ? '🚩' : '　';
    const aiIcon = test.aiUsed ? '🤖' : '　';
    md += `| ${test.id} | ${test.description} | ${test.verdict} | ${flagIcon} ${test.flagged} | ${aiIcon} ${test.aiUsed} | ${statusIcon} |\n`;
  }

  md += `\n---\n\n## Analysis\n\n`;

  if (parseFloat(flagAccuracy) >= 80) {
    md += `### ✅ EXCELLENT PERFORMANCE\n\n`;
    md += `The human review flagging system is working excellently with **${flagAccuracy}% accuracy**.\n\n`;
  } else if (parseFloat(flagAccuracy) >= 60) {
    md += `### ⚠️ GOOD BUT NEEDS IMPROVEMENT\n\n`;
    md += `The system achieves **${flagAccuracy}% accuracy** but could be improved.\n\n`;
  } else {
    md += `### ❌ NEEDS ATTENTION\n\n`;
    md += `Flag detection accuracy at **${flagAccuracy}%** is below target.\n\n`;
  }

  md += `**What's Working:**\n`;
  md += `- Final AI verification pass runs after TAC checks\n`;
  md += `- AI invoked in ${((results.aiInvocations/results.total)*100).toFixed(1)}% of tests\n`;
  md += `- ${results.correctlyFlagged} cheating patterns correctly flagged\n\n`;

  if (results.missedFlags > 0) {
    md += `**Needs Improvement:**\n`;
    md += `- ${results.missedFlags} cheating patterns missed (not flagged)\n`;
    md += `- Consider lowering AI confidence threshold for flagging\n`;
    md += `- May need enhanced prompts for detecting conditional patterns\n\n`;
  }

  if (results.incorrectlyFlagged > 0) {
    md += `**False Positives:**\n`;
    md += `- ${results.incorrectlyFlagged} legitimate solutions incorrectly flagged\n`;
    md += `- Consider raising AI confidence threshold to reduce false positives\n\n`;
  }

  md += `---\n\n## Recommendation\n\n`;

  if (parseFloat(flagAccuracy) >= 80 && results.incorrectlyFlagged === 0) {
    md += `✅ **DEPLOY TO PRODUCTION** - System is ready for use with ${flagAccuracy}% accuracy and no false positives.\n`;
  } else if (parseFloat(flagAccuracy) >= 70) {
    md += `✅ **DEPLOY WITH MONITORING** - System performs well but monitor for edge cases.\n`;
  } else {
    md += `⚠️ **NEEDS IMPROVEMENT** - Tune AI prompts and confidence thresholds before production deployment.\n`;
  }

  fs.writeFileSync('REVIEW_FLAGGING_RESULTS.md', md);
  console.log('📄 Markdown report saved to REVIEW_FLAGGING_RESULTS.md\n');
}

// Run tests
runTests()
  .then(() => {
    console.log('✅ Human review flagging test suite completed!');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Test suite failed:', error);
    process.exit(1);
  });
