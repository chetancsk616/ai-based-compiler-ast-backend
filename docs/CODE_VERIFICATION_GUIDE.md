# Code Verification System - Complete Guide

## Overview

This system verifies user-submitted code against a predefined reference solution through **4-layer analysis** to determine correctness, efficiency, and code quality.

### Execution Modes

The system supports two execution modes:

1. **Local Execution (Primary)** - Default mode
   - Uses local compilers/interpreters (gcc, g++, python, node, javac)
   - Supported Languages:
     - **C**: gcc compiler
     - **C++**: g++ compiler
     - **Python**: python interpreter
     - **JavaScript**: node runtime
     - **Java**: javac compiler + java runtime
   - Benefits:
     - ✓ Accurate performance measurements (no network latency)
     - ✓ Identical code produces nearly identical execution times (~5-10ms variance)
     - ✓ Faster response times
     - ✓ Works offline
   - Requirements:
     - gcc/g++ for C/C++
     - python for Python
     - node for JavaScript
     - javac/java for Java

2. **Piston API (Fallback)** - Automatic fallback
   - Uses remote Piston API (https://emkc.org/api/v2/piston)
   - Activates when:
     - Local compiler/interpreter not available
     - Local execution fails
   - Note: Execution times include network latency (less accurate for performance comparison)

The system automatically detects available compilers and uses local execution whenever possible. You can check the `execution_source` field in the response to see which mode was used (`"local"` or `"piston"`).

To disable local execution and always use Piston API, set environment variable: `USE_LOCAL_EXECUTION=false`

---

## Verification Process Flow

```
User Code + Reference Code
          ↓
    EXECUTE BOTH
          ↓
┌─────────────────────────────────────┐
│  LAYER 1: LOGIC CORRECTNESS         │ ← PRIMARY CHECK (Most Important)
│  - Compare outputs                  │
│  - Compare exit codes               │
│  - FAIL FAST if incorrect           │
└─────────────────────────────────────┘
          ↓
┌─────────────────────────────────────┐
│  LAYER 2: CODE EFFICIENCY           │ ← TAC Analysis
│  - Instruction count                │
│  - Operation complexity             │
│  - Rating: OPTIMAL → INEFFICIENT    │
└─────────────────────────────────────┘
          ↓
┌─────────────────────────────────────┐
│  LAYER 3: STRUCTURAL SIMILARITY     │ ← AST Analysis
│  - Syntax tree comparison           │
│  - Algorithm structure              │
│  - Control flow patterns            │
└─────────────────────────────────────┘
          ↓
┌─────────────────────────────────────┐
│  LAYER 4: PERFORMANCE COMPARISON    │ ← Execution Speed
│  - Execution time                   │
│  - Time difference percentage       │
│  - Speed rating                     │
└─────────────────────────────────────┘
          ↓
    FINAL VERDICT
```

---

## Layer 1: Logic Correctness (Primary Check)

**Purpose:** Verify that user code produces the EXACT same output as reference code.

**How it works:**
1. Execute reference code with given inputs
2. Execute user code with same inputs
3. Compare:
   - Standard output (stdout) - must match **character-by-character**
   - Exit codes - must be identical
4. If ANY difference found → **IMMEDIATE FAIL** with detailed feedback

**Example:**
```
Reference Output: "42\n"
User Output:      "42.0\n"  ← INCORRECT (even trailing spaces matter)

Reference Exit:   0
User Exit:        1         ← INCORRECT (runtime error)
```

**Verdict:**
- ✅ `passed: true` → Proceed to efficiency checks
- ❌ `passed: false` → Return INCORRECT verdict immediately

**Why this is first:**
- No point checking efficiency if logic is wrong
- Fastest check (simple string comparison)
- Clear pass/fail criterion

---

## Layer 2: Code Efficiency (TAC-Based)

**Purpose:** Analyze how efficiently the code is compiled and executed at the instruction level.

**Method: Three-Address Code (TAC) Analysis**

### What is TAC?
TAC is an intermediate representation extracted from LLVM IR that simplifies instructions to basic operations:
```
LLVM IR:           %3 = add nsw i32 %1, %2
TAC Equivalent:    t3 = t1 + t2
```

### Comparison Process:
1. **Extract TAC** from both programs' LLVM IR
2. **Count instructions** (lower = more efficient)
3. **Compare operations**:
   - Arithmetic: add, sub, mul, div
   - Memory: load, store, alloca
   - Control: call, return, branch
4. **Calculate similarity** based on operation patterns

### Efficiency Ratings:
- **OPTIMAL** (≥95% similarity): Near-identical to reference
- **GOOD** (80-94%): Minor inefficiencies
- **MODERATE** (60-79%): Noticeable inefficiencies
- **INEFFICIENT** (<60%): Significant inefficiencies

### Example Analysis:
```json
{
  "similarity": 86,
  "level": "VERY_SIMILAR",
  "user_instructions": 7,
  "reference_instructions": 6,
  "instruction_difference": 1,
  "details": {
    "user_operations": {
      "call": 4,
      "add": 1,
      "return": 2
    },
    "reference_operations": {
      "call": 3,
      "add": 1,
      "return": 2
    }
  }
}
```

**Interpretation:**
- User code has 1 extra instruction
- One additional function call
- Still VERY_SIMILAR to reference

---

## Layer 3: Structural Similarity (AST-Based)

**Purpose:** Analyze the syntactic and structural similarity between codes.

**Method: Abstract Syntax Tree (AST) Analysis**

### What is AST?
AST represents the grammatical structure of code as a tree:
```c
// Code
int add(int a, int b) {
    return a + b;
}

// AST
function_definition
├── type: int
├── name: add
├── parameters
│   ├── int a
│   └── int b
└── body
    └── return_statement
        └── binary_expression (+)
            ├── identifier: a
            └── identifier: b
```

### Comparison Metrics:

1. **Structural Similarity**
   - Tree depth comparison
   - Node count comparison
   - Structure shape analysis

2. **Control Flow Patterns**
   - if_statements count
   - for_loops count
   - while_loops count
   - switch_statements count

3. **Operations Distribution**
   - Arithmetic operations
   - Logical operations
   - Comparison operations
   - Assignment operations

4. **Node Type Similarity**
   - Compares frequency of each AST node type
   - Matches patterns across both codes

5. **Function Similarity**
   - Function names comparison
   - Function count comparison

### Similarity Breakdown:
```json
{
  "overall_similarity": 92,
  "similarity_level": "VERY_SIMILAR",
  "breakdown": {
    "structural": 90,      // Tree shape
    "control_flow": 100,   // Same control structures
    "operations": 95,      // Similar operations
    "node_types": 88,      // Similar syntax patterns
    "functions": 100       // Same functions
  }
}
```

### Similarity Levels:
- **IDENTICAL** (≥95%): Nearly same code structure
- **VERY_SIMILAR** (80-94%): Minor structural differences
- **SIMILAR** (60-79%): Different approach, similar structure
- **SOMEWHAT_SIMILAR** (40-59%): Different structure, same logic
- **DIFFERENT** (20-39%): Very different approaches
- **VERY_DIFFERENT** (<20%): Completely different structure

**Use Cases:**
- Detect plagiarism (high AST similarity = copied code)
- Identify algorithmic approach (recursive vs iterative)
- Understand code complexity

---

## Layer 4: Performance Comparison

**Purpose:** Compare actual execution speed.

**Metrics:**
- Reference execution time
- User execution time
- Time difference
- Percentage difference

**Example:**
```json
{
  "user_faster": false,
  "reference_time": 0.50,
  "user_time": 1.51,
  "time_difference": 1.01,
  "percentage_difference": 202
}
```

**Interpretation:**
- User code is 202% slower (3x slower)
- Reference completes in 0.5 seconds
- User code takes 1.51 seconds

**Note:** Includes network latency (Piston API is remote), so absolute times may vary. Focus on **relative differences**.

---

## Complete Verification Example

### Input:
```json
{
  "referenceCode": {
    "language": "c",
    "code": "int add(int a, int b) {\n    return a + b;\n}\n\nint main() {\n    return add(5, 3);\n}"
  },
  "userCode": {
    "language": "c",
    "code": "int add(int x, int y) {\n    int result = x + y;\n    return result;\n}\n\nint main() {\n    return add(5, 3);\n}"
  }
}
```

### Response:
```json
{
  "success": true,
  "verdict": "CORRECT",
  "efficiency_rating": "GOOD",
  "analysis": {
    "1_logic_correctness": {
      "output_match": true,
      "exit_code_match": true,
      "passed": true,
      "reference_output": "",
      "user_output": "",
      "reference_exit_code": 8,
      "user_exit_code": 8
    },
    "2_code_efficiency": {
      "similarity": 86,
      "level": "VERY_SIMILAR",
      "user_instructions": 7,
      "reference_instructions": 6,
      "instruction_difference": 1
    },
    "3_structural_similarity": {
      "overall_similarity": 92,
      "similarity_level": "VERY_SIMILAR",
      "breakdown": {
        "structural": 90,
        "control_flow": 100,
        "operations": 95,
        "node_types": 88,
        "functions": 100
      }
    },
    "4_performance": {
      "user_faster": true,
      "reference_time": 1.51,
      "user_time": 0.50,
      "time_difference": 1.01,
      "percentage_difference": 67
    }
  }
}
```

### Interpretation:
1. ✅ **Logic Correct**: Both produce exit code 8 (5+3=8)
2. ✅ **Good Efficiency**: 86% similar, only 1 extra instruction
3. ✅ **Very Similar Structure**: 92% AST similarity
4. ✅ **Better Performance**: User code is 67% faster!

**Final Assessment**: User implemented a correct and efficient solution with slightly different style (extra variable) but better execution performance.

---

## Verdict Categories

### CORRECT
- Logic is correct (output matches)
- Efficiency rating provided separately

### INCORRECT
- Output doesn't match reference
- OR exit code differs
- **Stops analysis immediately**
- Provides detailed failure info

### Efficiency Ratings (for CORRECT solutions):
- **OPTIMAL**: ≥95% TAC similarity
- **GOOD**: 80-94% TAC similarity
- **MODERATE**: 60-79% TAC similarity
- **INEFFICIENT**: <60% TAC similarity

---

## API Endpoint

**URL:** `POST /api/verify`

**Headers:**
```
Content-Type: application/json
```

**Request Body:**
```json
{
  "referenceCode": {
    "language": "c",
    "code": "reference solution code here"
  },
  "userCode": {
    "language": "c",
    "code": "user submitted code here"
  }
}
```

**Success Response (Correct):**
```json
{
  "success": true,
  "verdict": "CORRECT",
  "efficiency_rating": "GOOD",
  "analysis": { ... }
}
```

**Success Response (Incorrect):**
```json
{
  "success": true,
  "verdict": "INCORRECT",
  "logic_correctness": {
    "passed": false,
    "output_match": false,
    "reference_output": "8",
    "user_output": "9"
  },
  "message": "User code produces different output than reference solution"
}
```

---

## Common Scenarios

### Scenario 1: Different Algorithm, Same Result
```
Reference: Recursive factorial
User: Iterative factorial
```
**Result:**
- ✅ Logic Correct (same output)
- 🔶 Low TAC similarity (different approach)
- 🔶 Low AST similarity (different structure)
- ⚡ Performance varies

### Scenario 2: Same Logic, Different Variable Names
```
Reference: int sum = a + b;
User: int result = x + y;
```
**Result:**
- ✅ Logic Correct
- ✅ High TAC similarity (same operations)
- ✅ Very high AST similarity (same structure)
- ✅ Similar performance

### Scenario 3: Logic Error
```
Reference: return a + b;
User: return a - b;  // Wrong operator
```
**Result:**
- ❌ Logic INCORRECT
- Analysis stops (no efficiency check needed)
- Clear error message returned

### Scenario 4: Off-by-One Error
```
Reference: for (i = 0; i < n; i++)
User: for (i = 0; i <= n; i++)  // Extra iteration
```
**Result:**
- ❌ Logic INCORRECT (different output)
- Won't match reference for most test cases

---

## Best Practices

### For Reference Code:
1. Write clear, optimal solutions
2. Test thoroughly before using as reference
3. Include edge cases in test validation
4. Document expected output format

### For User Code Evaluation:
1. **Always check logic first** (fail fast)
2. Consider efficiency for performance-critical problems
3. Use AST similarity to detect code copying
4. Performance timing includes network latency (use for relative comparison only)

### For Interpreting Results:
1. **INCORRECT verdict** = wrong answer (most important)
2. **CORRECT + INEFFICIENT** = works but slow/bloated
3. **CORRECT + OPTIMAL** = perfect solution
4. High AST similarity might indicate plagiarism

---

## Technical Details

### Supported Languages:
- C
- C++
- Python
- JavaScript (more can be added)

### Dependencies:
- **Piston API**: Code execution
- **LLVM**: Intermediate representation
- **Tree-sitter**: AST parsing (C, Python)

### Execution Environment:
- Remote execution via Piston API
- Sandboxed environment
- Time limits: compile (10s), run (3s)
- Memory limits: configurable

---

## Limitations

1. **Network Latency**: Performance timing includes API call overhead
2. **Platform Differences**: Different optimization levels may affect TAC
3. **Output Format**: Must match EXACTLY (whitespace sensitive)
4. **Static Analysis**: Cannot detect runtime behavior differences with same output
5. **AST Coverage**: Only supported for C and Python currently

---

## Future Enhancements

1. **Test Case Support**: Run multiple test cases automatically
2. **Memory Analysis**: Compare memory usage
3. **Complexity Analysis**: Big-O notation detection
4. **Custom Scoring**: Weighted scoring system
5. **Plagiarism Detection**: Enhanced AST fingerprinting
6. **More Languages**: Add support for Java, Go, Rust

---

## FAQ

**Q: Why does AST show "unavailable"?**
A: Tree-sitter native bindings not installed. Run: `npm install tree-sitter tree-sitter-c tree-sitter-python`

**Q: Can I test without reference code?**
A: Yes, use `/api/execute` for single program execution or `/api/compare` for comparing two arbitrary programs.

**Q: What if outputs match but algo is different?**
A: That's okay! Logic correctness passes, but TAC/AST similarity will be lower, indicating different approach.

**Q: How accurate is performance timing?**
A: Includes network latency. Use for relative comparison (A faster than B), not absolute benchmarks.

**Q: Can I use this for grading?**
A: Yes! Logic correctness for pass/fail, efficiency ratings for partial credit.

---

## Summary

The verification system provides **comprehensive, multi-layered analysis** of user code:

1. **Logic Correctness** (Pass/Fail) - Primary criterion
2. **Code Efficiency** (TAC) - How well the code compiles
3. **Structural Similarity** (AST) - How similar the approach is
4. **Performance** (Time) - How fast it executes

This gives you a complete picture of code quality, correctness, and style.
