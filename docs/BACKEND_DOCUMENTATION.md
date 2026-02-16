# Backend Documentation

## 📋 Table of Contents
- [Overview](#overview)
- [Architecture](#architecture)
- [Main Server Components](#main-server-components)
- [Services Layer](#services-layer)
- [API Endpoints](#api-endpoints)
- [Final Verdict Composition](#-final-verdict-composition---the-decision-algorithm) ⭐ **CRITICAL**
  - [Scope Limitation](#️-important-scope-limitation) ⚠️ Input-bound correctness
  - [Model Assumptions](#-model-assumptions-and-limitations) ⚠️ Uniform cost model
  - [Known Vulnerabilities](#-known-vulnerabilities-and-attack-patterns) 🚨 **CRITICAL**
- [Data Flow](#data-flow)
- [Configuration](#configuration)

---

## 🎯 Overview

This is a **Code Execution and Verification API** that allows:
- ✅ Executing code in multiple languages (Python, C, C++, Java, JavaScript)
- ✅ Comparing two programs for efficiency and similarity
- ✅ Verifying user code against reference solutions
- ✅ Analyzing code at multiple levels: AST, TAC (Three-Address Code), and LLVM IR

**Key Features:**
- Multi-language support
- Local execution with cloud fallback
- AST (Abstract Syntax Tree) analysis
- TAC-based efficiency comparison
- Semantic equivalence detection
- Performance benchmarking

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    CLIENT REQUEST                        │
└───────────────────────┬─────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────┐
│                  MAIN SERVER (server.js)                 │
│  • Express REST API                                      │
│  • Request routing & validation                          │
│  • Response formatting                                   │
└───────────────────────┬─────────────────────────────────┘
                        │
        ┌───────────────┼───────────────┐
        │               │               │
        ▼               ▼               ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│   EXECUTION  │  │   ANALYSIS   │  │  COMPARISON  │
│   SERVICES   │  │   SERVICES   │  │   SERVICES   │
└──────────────┘  └──────────────┘  └──────────────┘
        │               │               │
        ▼               ▼               ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│ Piston API   │  │ Tree-sitter  │  │  Compiler    │
│ Local Exec   │  │ AST Parser   │  │  Explorer    │
└──────────────┘  └──────────────┘  └──────────────┘
```

---

## 🖥️ Main Server Components

### 1. **server.js** - Primary API Server
**Port:** 3000 (default)  
**Purpose:** Main REST API handling all code execution and verification requests

**Responsibilities:**
- Route management for `/api/execute`, `/api/compare`, `/api/verify`
- Request validation and error handling
- Orchestrating multiple services to fulfill requests
- Response formatting and HTTP status management
- Health check endpoint for service monitoring

**Key Endpoints:**
- `GET /` - Health check and API documentation
- `GET /api/runtimes` - List available programming language runtimes
- `POST /api/execute` - Execute single program
- `POST /api/compare` - Compare two programs
- `POST /api/verify` - Verify user code against reference solution

---

### 2. **ast-server.js** - AST Microservice
**Port:** 3001 (default)  
**Purpose:** Dedicated microservice for AST (Abstract Syntax Tree) analysis

**Responsibilities:**
- Isolated AST parsing to avoid serverless environment issues
- Independent scaling capability
- Fallback service when local AST parsing fails

**Key Endpoint:**
- `POST /ast/compare` - Compare AST structures of two programs

**Why Separate?**
- Tree-sitter native bindings don't work in serverless environments
- Can be deployed separately in Docker or local environment
- Main server falls back to Piston API if this service is unavailable

---

## 🔧 Services Layer

### 1. **pistonService.js** - Code Execution Orchestrator
**Purpose:** Smart code execution with dual-mode support (local + cloud)

**What It Does:**
- Executes code in Python, C, C++, Java, JavaScript
- **Primary:** Tries local compiler/interpreter first
- **Fallback:** Uses Piston API if local execution fails
- Generates LLVM IR for C/C++ programs
- Converts LLVM IR to TAC (Three-Address Code)
- Measures execution time and instruction count

**Key Functions:**
```javascript
executeCode(language, code, stdin, args, generateLLVM)
// Returns: { success, output, tac, instruction_count, execution_time }

getRuntimes()
// Returns: Available language runtimes from Piston API
```

**Execution Flow:**
1. Validate language support
2. Try local execution (LocalExecutor)
3. If local fails → fallback to Piston API
4. Extract LLVM IR (for C/C++)
5. Convert to TAC
6. Calculate metrics
7. Return comprehensive result

---

### 2. **localExecutor.js** - Local Code Execution
**Purpose:** Execute code using locally installed compilers/interpreters

**What It Does:**
- Checks if compilers are available (gcc, g++, javac, python, node)
- Creates temporary directories for code execution
- Compiles and runs code with timeout protection
- Cleans up temporary files after execution
- Provides faster execution than API calls

**Supported Languages:**
- **C:** gcc compiler
- **C++:** g++ compiler
- **Python:** python interpreter
- **JavaScript:** node runtime
- **Java:** javac compiler + java runtime

**Security Features:**
- Isolated temporary directories
- 10-second timeout per execution
- Automatic cleanup of temp files

---

### 3. **astParser.js** - Abstract Syntax Tree Parser
**Purpose:** Parse source code into AST and extract structural features

**What It Does:**
- Uses Tree-sitter library for language-agnostic parsing
- Supports C, C++, Python, Java, JavaScript
- Extracts meaningful features from AST:
  - Node types and counts
  - Tree depth
  - Control flow structures (if, for, while, switch)
  - Operations (arithmetic, logical, comparison, assignment)
  - Function declarations and calls
  - Variable declarations

**Key Functions:**
```javascript
parse(language, code)
// Returns: Tree-sitter AST object

extractFeatures(tree)
// Returns: Feature vector with structural information
```

**Feature Vector Example:**
```javascript
{
  nodeTypes: { "function_definition": 2, "if_statement": 3 },
  depth: 8,
  totalNodes: 45,
  functions: ["add", "main"],
  controlFlow: { if_statements: 3, for_loops: 1, while_loops: 0 },
  operations: { arithmetic: 5, logical: 2, comparison: 3 },
  functionCalls: ["printf", "scanf"],
  variableDeclarations: ["x", "y", "result"]
}
```

---

### 4. **astComparer.js** - AST Similarity Analyzer
**Purpose:** Compare two programs based on their AST structure

**What It Does:**
- Compares AST features from `astParser.js`
- Calculates multiple similarity metrics:
  - **Structural Similarity:** Tree depth and node count
  - **Control Flow Similarity:** Matching if/for/while/switch patterns
  - **Operation Similarity:** Similar arithmetic/logical operations
  - **Node Type Similarity:** Matching AST node distributions
  - **Function Similarity:** Matching function signatures

**Similarity Levels:**
- **IDENTICAL:** 95%+ similarity
- **VERY_SIMILAR:** 80-95% similarity
- **SIMILAR:** 60-80% similarity
- **SOMEWHAT_SIMILAR:** 40-60% similarity
- **DIFFERENT:** 20-40% similarity
- **VERY_DIFFERENT:** <20% similarity

**Example Output:**
```javascript
{
  overall_similarity: 87,
  similarity_level: "VERY_SIMILAR",
  breakdown: {
    structural: 85,
    control_flow: 90,
    operations: 88,
    node_types: 86,
    functions: 85
  }
}
```

---

### 5. **codeNormalizer.js** - Semantic Equivalence Detector
**Purpose:** Detect semantically equivalent code with different styles

**What It Does:**
- Identifies common code patterns that are logically identical:
  - **Intermediate variables:** `result = x + y; return result;` vs `return x + y;`
  - **Variable naming:** `a, b` vs `x, y`
  - **Expression ordering:** (where commutative)
  - **Redundant assignments**

- Adjusts similarity scores to account for stylistic differences
- Prevents false negatives when comparing equivalent implementations

**Key Functions:**
```javascript
detectPatterns(astFeatures)
// Detects: intermediate variables, direct returns, assignments

calculateSemanticEquivalence(refFeatures, userFeatures)
// Returns: Equivalence analysis with adjustment recommendations

adjustEfficiencyRating(tacSimilarity, semanticAnalysis, instructionDiff)
// Boosts TAC similarity if semantically equivalent

adjustASTSimilarity(astSimilarity, semanticAnalysis)
// Boosts AST similarity if semantically equivalent
```

**Example Adjustment:**
```javascript
// Original TAC similarity: 65%
// After detecting intermediate variable pattern: 80%
// Adjustment: +15% (semantic equivalence detected)
```

---

### 6. **llvmToTAC.js** - LLVM IR to TAC Converter
**Purpose:** Convert LLVM Intermediate Representation to Three-Address Code

**What It Does:**
- Parses LLVM IR output from C/C++ compilation
- Converts to simplified TAC format
- Renames all SSA variables to `t1, t2, t3...` for consistency
- Filters countable instructions for efficiency comparison

**Conversion Example:**
```
LLVM IR:
  %1 = alloca i32
  %2 = load i32, i32* %1
  %add = add i32 %2, 5

TAC:
  t1 = alloca
  t2 = load t1
  t3 = t2 + 5
```

**Key Functions:**
```javascript
convert(llvmIR)
// Returns: Array of TAC strings

filter(tac)
// Returns: Only countable instructions (add, sub, mul, div, call)

compare(tacA, tacB)
// Returns: Similarity percentage and level
```

**Instruction Filtering:**
- **KEPT:** add, sub, mul, div, call (meaningful operations)
- **IGNORED:** alloca, load, store, ret (bookkeeping)

---

### 7. **tacComparer.js** - TAC Efficiency Comparator
**Purpose:** Compare programs at the instruction level

**What It Does:**
- Reads LLVM IR and creates raw TAC
- Normalizes variable names for fair comparison
- Counts instructions in both programs
- Calculates similarity percentage
- Provides detailed comparison breakdown

**Comparison Steps:**
1. Read LLVM IR (ignore metadata, comments)
2. Create raw TAC (convert instructions)
3. Normalize variables (SSA → t1, t2, t3...)
4. Create final TAC (filter meaningful instructions)
5. Count and compare instructions

**Similarity Calculation:**
```javascript
similarity = 100 - (|instructionsA - instructionsB| / max(instructionsA, instructionsB) * 100)
```

**Example:**
```javascript
{
  similarity_percentage: 85,
  similarity_level: "SIMILAR",
  instruction_difference: 3,
  details: {
    programA_instructions: 15,
    programB_instructions: 18,
    common_patterns: ["add", "mul", "call"]
  }
}
```

---

### 8. **tacLogicChecker.js** - TAC-Based Logic Verification
**Purpose:** Verify algorithmic correctness by comparing intermediate code operations (NOT just output)

**🎯 THE FIX for Hardcoded Output Vulnerability**

**Problem It Solves:**
- Output-only checking allows `return 8;` to pass when input is (5,3)
- TAC comparison detects missing computation logic

**What It Does:**
1. **Extract operations** from both reference and user TAC
2. **Compare operation types** (add, sub, mul, div, call)
3. **Detect hardcoded returns** (return constant without operations)
4. **Cache reference TAC** (1-hour TTL, keyed by code hash)
5. **Fail if operations mismatch** before checking output

**Operation Comparison:**
```javascript
// Reference
return a + b;
→ TAC: t1 = t2 + t3; return t1
→ Operations: {add: 1, return: 1}

// User (hardcoded)
return 8;
→ TAC: return 8
→ Operations: {return: 1}

// Result: FAIL - Missing ADD operation
```

**Critical Operations:**
- `add`, `sub`, `mul`, `div` - Arithmetic
- `call` - Function calls
- Control flow (implicit in TAC structure)

**Caching Strategy:**
- **Cache key**: Hash(code + language)
- **Cache value**: {tac, operations, timestamp}
- **TTL**: 3600 seconds (1 hour)
- **Purpose**: Avoid re-extracting reference TAC on every request
- **Performance**: O(n) first request → O(1) subsequent requests

**Example Response:**
```javascript
{
  passed: false,  // TAC logic check failed
  exact_match: false,
  reason: "Missing operations: add",
  message: "User code is missing critical operations (add) that are present in reference solution. This indicates the logic is incomplete or hardcoded.",
  tac_comparison: {
    operations_match: false,
    reference_operations: {add: 1, return: 1},
    user_operations: {return: 1},
    missing_operations: ["add"],
    extra_operations: [],
    mismatched_counts: []
  },
  hardcoded_detection: {
    detected: true,
    constant: "8",
    reason: "Function returns constant 8 without performing any computation"
  },
  cache_info: {
    reference_cached: true,
    cache_size: 5
  }
}
```

---

### 9. **simpleIRExtractor.js** - LLVM IR Generator
**Purpose:** Extract LLVM IR from C/C++ code using Compiler Explorer API

**What It Does:**
- Uses Godbolt (Compiler Explorer) API
- Compiles C/C++ with clang
- Generates LLVM IR with optimization level O0
- Returns raw LLVM IR for TAC conversion

**Why Compiler Explorer?**
- Reliable cloud compilation
- No local compiler required
- Consistent LLVM IR output
- Free API access

**Compilation Flags:**
- `-S` - Generate assembly output
- `-emit-llvm` - Emit LLVM IR instead of assembly
- `-O0` - No optimization (for fair comparison)

---

## 🌐 API Endpoints

### 1. Health Check
```http
GET /
```

**Response:**
```json
{
  "message": "Code Execution and Verification API",
  "version": "2.0.0",
  "features": {
    "code_execution": true,
    "logic_verification": true,
    "tac_analysis": true,
    "ast_analysis": true,
    "performance_comparison": true
  },
  "endpoints": { ... }
}
```

---

### 2. Execute Code
```http
POST /api/execute
```

**Request Body:**
```json
{
  "language": "python",
  "code": "print('Hello World')",
  "stdin": "",
  "args": []
}
```

**Response:**
```json
{
  "success": true,
  "language": "python",
  "output": {
    "stdout": "Hello World\n",
    "stderr": "",
    "code": 0
  },
  "execution_time": 0.123,
  "instruction_count": 5,
  "tac": ["t1 = call print", "..."],
  "execution_source": "local"
}
```

---

### 3. Compare Two Programs
```http
POST /api/compare
```

**Request Body:**
```json
{
  "programA": {
    "language": "c",
    "code": "int add(int a, int b) { return a + b; }"
  },
  "programB": {
    "language": "cpp",
    "code": "int add(int x, int y) { int result = x + y; return result; }"
  }
}
```

**Response:**
```json
{
  "success": true,
  "programA": { ... },
  "programB": { ... },
  "comparison": {
    "tac_based": {
      "similarity_percentage": 85,
      "similarity_level": "SIMILAR"
    },
    "ast_based": {
      "overall_similarity": 87,
      "similarity_level": "VERY_SIMILAR"
    },
    "performance": {
      "faster": "A",
      "timeA": 0.015,
      "timeB": 0.018,
      "percentage_faster": 16.67
    }
  }
}
```

---

### 4. Verify User Code
```http
POST /api/verify
```

**Request Body:**
```json
{
  "referenceCode": {
    "language": "python",
    "code": "def add(a, b): return a + b\nprint(add(5, 3))"
  },
  "userCode": {
    "language": "python",
    "code": "def add(x, y): result = x + y; return result\nprint(add(5, 3))"
  }
}
```

**Response:**
```json
{
  "success": true,
  "verdict": "CORRECT",  // ← Determined by logic_correctness.passed
  "efficiency_rating": "GOOD",  // ← Determined ONLY by code_efficiency.similarity (85%)
  
  "vulnerability_warning": null,  // ← NEW: null if clean, object if suspicious
  
  "semantic_equivalence": {
    "detected": true,
    "reason": "Intermediate variable (semantically equivalent to direct return)",
    "total_adjustment": 15  // ← This was added to base TAC to get final 85%
  },
  
  "analysis": {
    "1_logic_correctness": {
      "passed": true,  // ← THIS determines verdict
      "output_match": true,
      "exit_code_match": true
    },
    "2_code_efficiency": {
      "similarity": 85,  // ← THIS determines efficiency_rating
      "level": "GOOD",
      "user_instructions": 18,
      "reference_instructions": 15,
      "original_similarity": 70,  // Before semantic adjustment
      "semantic_adjustment": 15   // Bonus applied
    },
    "3_structural_similarity": {
      "overall_similarity": 90,  // ← Informational only (NOT used in rating)
      "similarity_level": "VERY_SIMILAR"
    },
    "4_performance": {
      "user_faster": true,  // ← Informational only (NOT used in rating)
      "time_difference": 0.003
    }
  }
}
```

**Example with Hardcoding Detected:**
```json
{
  "verdict": "CORRECT",  // Output matches (for this input)
  "efficiency_rating": "GOOD",
  
  "vulnerability_warning": {  // ← WARNING: Suspicious code detected!
    "level": "CRITICAL",
    "message": "⚠️ HARDCODED OUTPUT: Function returns constant without computation | ⚠️ UNUSED PARAMETERS: Function parameters are not used in computation",
    "recommendation": "Manual review recommended. Code may be hardcoded for specific test input(s).",
    "score": 70,
    "flags": ["HARDCODED_RETURN", "UNUSED_PARAMETERS"],
    "details": {
      "hardcoded_returns": {
        "detected": true,
        "constants_found": ["8"],
        "reason": "Function returns constant value(s): 8 without performing any operations"
      },
      "unused_parameters": {
        "detected": true,
        "unused_params": ["a", "b"],
        "reason": "Function parameters declared but never used: a, b"
      }
    }
  }
}
```

**🚨 CRITICAL WARNING:**
This example uses a **single test case** - the system only validates OUTPUT, not ALGORITHM.

**The Vulnerability:**
- User writes: `return 8;` (no computation, hardcoded constant)
- System checks: Output matches? ✅ Yes → "CORRECT"
- Reality: No algorithm implemented! Just memorized the answer for (5,3)
- Would fail for ANY other input: `add(2,7)` → 8 ❌

**Always use multiple diverse test cases in production:**
```json
{
  "referenceCode": { "code": "def add(a,b): return a+b" },
  "userCode": { "code": "def add(x,y): return x+y" },
  "testCases": [
    { "input": "5 3", "expected": "8" },
    { "input": "2 7", "expected": "9" },
    { "input": "0 0", "expected": "0" },
    { "input": "-3 5", "expected": "2" }
  ]
}
```

See [Known Vulnerabilities](#-known-vulnerabilities-and-attack-patterns) section for details.

---

## 🎯 Final Verdict Composition - The Decision Algorithm

### ⚠️ CRITICAL: How Metrics Are Actually Combined

This section defines the **exact rules** for converting analysis metrics into final verdicts and ratings.

### ⚠️ Important Scope Limitation

**"CORRECT" means correct for the tested input(s), NOT universally correct.**

```
Logic Correctness Scope:
  ✅ Checks: Output matches reference for PROVIDED input(s)
  ❌ Does NOT check: Correctness for all possible inputs
  ❌ Does NOT check: Edge cases not in test suite
  ❌ Does NOT check: Algorithmic correctness proof

Verdict "CORRECT" = "Produces same output as reference for tested input(s)"
```

A program can get "CORRECT" verdict but still have bugs for untested inputs.

### Primary Decision Tree

```
┌─────────────────────────────────────────────┐
│  STEP 1A: TAC Logic Check (Algorithmic)     │
│  ────────────────────────────────────       │
│  Extract operations from both TAC codes:     │
│  reference_ops = {add: 1, return: 1}        │
│  user_ops = {add: 0, return: 1}             │
│                                              │
│  IF (critical_operations_mismatch):         │
│    // Reference has ADD but user doesn't    │
│    verdict = "INCORRECT"                    │
│    reason = "TAC_LOGIC_MISMATCH"            │
│    RETURN (hardcoded/incomplete logic)      │
│  ELSE:                                       │
│    CONTINUE to Output Check                 │
└─────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────┐
│  STEP 1B: Output Verification Check          │
│  ────────────────────────────────────       │
│  FOR THE PROVIDED INPUT(S):                 │
│  IF (stdout ≠ reference_stdout)             │
│  OR (exit_code ≠ reference_exit_code)       │
│  THEN:                                       │
│    verdict = "INCORRECT"                    │
│    reason = "OUTPUT_MISMATCH"               │
│    RETURN (skip efficiency analysis)        │
│  ELSE                                       │
│    verdict = "CORRECT" (for tested inputs)  │
│    CONTINUE to efficiency rating            │
└─────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────┐
│  STEP 2: Calculate Adjusted TAC Similarity  │
│  ────────────────────────────────────       │
│  base_tac_similarity = tacComparison.similarity_percentage
│                                              │
│  IF (semantic_equivalence_detected):        │
│    finalTACSimilarity = adjustedTAC.adjusted_similarity
│    // Typically base + 10-20% bonus         │
│  ELSE:                                       │
│    finalTACSimilarity = base_tac_similarity │
└─────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────┐
│  STEP 3: Assign Efficiency Rating           │
│  ────────────────────────────────────       │
│  BASED SOLELY ON finalTACSimilarity:        │
│  (Assumes uniform instruction cost)         │
│                                              │
│  IF (finalTACSimilarity < 60):              │
│    efficiency_rating = "INEFFICIENT"        │
│  ELSE IF (finalTACSimilarity < 80):         │
│    efficiency_rating = "MODERATE"           │
│  ELSE IF (finalTACSimilarity < 95):         │
│    efficiency_rating = "GOOD"               │
│  ELSE:  // finalTACSimilarity >= 95         │
│    efficiency_rating = "OPTIMAL"            │
└─────────────────────────────────────────────┘
```

### 🔧 TAC Logic Check - How It Works

**Problem It Solves:**
- Output-only checking allows hardcoded values to pass
- Example: `return 8;` outputs "8" for input (5,3) but isn't computing anything

**Solution:**
1. Extract operations from TAC (intermediate code)
2. Compare operation types between reference and user
3. Fail if critical operations missing/extra

**Example Detection:**
```python
# Reference code: add(a, b)
return a + b
TAC: t1 = t2 + t3; return t1
Operations: {add: 1, return: 1}

# User code (hardcoded)
return 8
TAC: return 8
Operations: {return: 1}

# Result: FAILED
# Reason: Missing ADD operation → TAC_LOGIC_MISMATCH
```

**Critical Operations Checked:**
- Arithmetic: `add`, `sub`, `mul`, `div`
- Function calls: `call`
- Control flow: implicit in TAC structure

**Reference TAC Caching:**
- First request: Extract reference TAC → Cache (O(n))
- Subsequent requests: Retrieve from cache → O(1)
- Cache TTL: 1 hour per reference code
- Key: Hash of (code + language)

📌 **CRITICAL**: TAC check happens BEFORE output check. Hardcoded outputs fail immediately regardless of matching output for test input.

### Explicit Combination Formula

**Verdict Determination:**
```javascript
// STEP 1A: TAC Logic Check (Primary - Algorithmic Correctness)
tacLogicPassed = (user_operations == reference_operations)
// Checks if critical operations (add/sub/mul/div/call) match

// STEP 1B: Output Check (Secondary - Verification)
outputPassed = (stdout_match AND exit_code_match)

// COMBINED VERDICT
// TAC check must pass first (prevents hardcoded values)
// Then output must match (verifies correctness for test input)
verdict = (tacLogicPassed AND outputPassed) ? "CORRECT" : "INCORRECT"

// Failure reasons:
// - tacLogicPassed=false → "TAC_LOGIC_MISMATCH" (operations don't match)
// - tacLogicPassed=true, outputPassed=false → "OUTPUT_MISMATCH" (rare edge case)
```

**Efficiency Rating Determination:**
```javascript
// Only TAC similarity is used (after semantic adjustment)
finalTAC = semanticEquivalent ? 
           (baseTAC + semanticBonus) : 
           baseTAC

efficiency_rating = 
  finalTAC >= 95 ? "OPTIMAL" :
  finalTAC >= 80 ? "GOOD" :
  finalTAC >= 60 ? "MODERATE" :
  "INEFFICIENT"
```

### What Each Metric Actually Does

| Metric | Used In Verdict? | Used In Rating? | Purpose |
|--------|------------------|-----------------|---------|
| **Logic Correctness** | ✅ **PRIMARY** | ❌ | Determines CORRECT vs INCORRECT *for tested input(s)* |
| **TAC Similarity** | ❌ | ✅ **PRIMARY** | Sole determinant of efficiency rating (assumes uniform instruction cost) |
| **AST Similarity** | ❌ | ❌ | Informational only (returned in analysis) |
| **Performance** | ❌ | ❌ | Informational only (returned in analysis) |
| **Semantic Analysis** | ❌ | ✅ **MODIFIER** | Adjusts TAC similarity before rating |

### ⚠️ Important: AST and Performance Are NOT Used in Rating

**Common Misconception:**
- "The system combines TAC + AST + Performance to rate code"

**Reality:**
```javascript
// This is what does NOT happen:
❌ rating = 0.5 * TAC + 0.3 * AST + 0.2 * Performance  // WRONG!

// This is what actually happens:
✅ rating = f(adjusted_TAC_similarity)  // CORRECT!
```

**Why?**
- **TAC similarity** directly measures algorithmic efficiency (instruction count)
  - ⚠️ *Model assumption:* uniform instruction cost, -O0 compilation
  - ⚠️ *Measures:* algorithmic complexity, not execution performance
- **AST similarity** measures structural patterns (informational)
- **Performance** varies by hardware and input (unreliable for rating)

AST and Performance are included in the response for **educational purposes** and **debugging**, not for rating.

### Semantic Adjustment Logic

The only way to modify the efficiency rating is through semantic adjustments:

```javascript
// Example: Intermediate Variable Pattern Detected
base_TAC = 65%  // User has extra variable assignment
semantic_bonus = +15%  // Standard adjustment for this pattern
adjusted_TAC = 80%  // New similarity score

// Rating changes:
Before adjustment: 65% → "MODERATE"
After adjustment:  80% → "GOOD"
```

**Semantic Patterns That Trigger Adjustments:**

| Pattern | Typical Adjustment | Condition |
|---------|-------------------|-----------|
| Intermediate variable | +10% to +20% | Extra variable declaration detected |
| Direct return | 0% | No adjustment needed (optimal already) |
| Variable naming | 0% | TAC normalizes names automatically |
| Expression reordering | 0% | Only if non-commutative (rare) |

### Deterministic Guarantee

**Given the same inputs, the system will ALWAYS produce the same verdict and rating.**

```javascript
// Deterministic mapping:
Input: {
  referenceCode,
  userCode,
  testInput
}

Process: {
  stdout_A = execute(referenceCode)
  stdout_B = execute(userCode)
  
  logic_match = (stdout_A === stdout_B)
  tac_similarity = compare(TAC_A, TAC_B)
  semantic_adjustment = detect_patterns(AST_A, AST_B)
  
  final_tac = tac_similarity + semantic_adjustment
}

Output: {
  verdict = f(logic_match)        // Deterministic function
  efficiency_rating = f(final_tac) // Deterministic function
}
```

### Edge Cases and Resolution

**Case 1: Logic correct (for tested inputs), but TAC similarity very low (e.g., 30%)**
```
verdict = "CORRECT"           // Logic is correct for tested input(s)
efficiency_rating = "INEFFICIENT"  // Algorithm is wasteful
message = "Your code works but uses significantly more instructions"
note = "Code matches reference output for provided input(s)"
```

**Case 2: Logic incorrect, but TAC similarity high (e.g., 95%)**
```
verdict = "INCORRECT"         // Logic takes precedence
efficiency_rating = NOT_ASSIGNED  // Early return, no rating given
message = "Your code structure is similar but produces wrong output"
```

**Case 3: Same instruction count, different performance**
```
verdict = "CORRECT"
efficiency_rating = "OPTIMAL"  // Based on TAC, not performance
performance_note = "Execution time differs (hardware/caching)"
```

**Case 4: Semantic equivalence detected**
```
base_TAC = 70% (MODERATE)
+ semantic_adjustment = +15%
= final_TAC = 85% (GOOD)

verdict = "CORRECT"
efficiency_rating = "GOOD"     // Upgraded due to detected pattern
note = "Intermediate variable detected (semantically equivalent)"
```

### Why This Design?

**Single Source of Truth for Rating:**
- TAC instruction count is **objective** and **reproducible**
  - Within the model: uniform cost assumption, -O0 compilation
  - Measures algorithmic complexity, not hardware performance
- AST similarity is **subjective** (different implementations can be equally good)
- Performance is **hardware-dependent** (unreliable)

**Separation of Concerns:**
- **Verdict** = "Does it work *for the tested input(s)*?" (Logic only)
- **Rating** = "How efficient is the algorithm?" (TAC only)
- **Analysis** = "Additional insights" (AST, Performance, Patterns)

**Critical Limitations:**
- Verdict "CORRECT" does NOT guarantee bug-free code
- Only proves: "Matches reference output for the specific test input(s) provided"
- Untested edge cases may still fail
- Recommend multiple test cases for comprehensive verification
- TAC rating assumes uniform instruction cost (pedagogical model)
- Real performance depends on cache, branches, memory - not measured here

**Educational Value:**
- Students see WHY they got a rating (instruction count)
- AST/Performance data helps them understand code structure
- Clear, explainable decisions (not black-box ML)
- Focus on algorithmic thinking, not hardware optimization

### 🎯 Model Assumptions and Limitations

**TAC-Based Efficiency Rating Makes These Assumptions:**

#### Assumption 1: Uniform Instruction Cost
```
Model Assumes:
  • All instructions have equal cost
  • add, mul, load, store all "cost" the same
  
Reality:
  • Division is slower than addition
  • Memory access is slower than register operations
  • Cache misses can be 100x slower than cache hits
  
Why We Use This Model:
  ✅ Deterministic and reproducible
  ✅ Platform-independent comparison
  ✅ Focuses on algorithmic complexity, not hardware details
```

#### Assumption 2: Instruction Count ≈ Algorithmic Efficiency
```
Model Assumes:
  • Fewer instructions = more efficient algorithm
  • Instruction count directly correlates with efficiency
  
Reality:
  • Branch prediction affects performance
  • Memory access patterns matter (cache locality)
  • Vectorization and parallelism change the picture
  
Why We Use This Model:
  ✅ Good proxy for algorithmic complexity (O(n) vs O(n²))
  ✅ Detects wasteful patterns (unnecessary loops)
  ✅ Educational value: clear metric students can optimize
```

#### Assumption 3: Optimization Level -O0 (No Optimization)
```
Model Uses:
  • LLVM compiled with -O0 (no optimization)
  • TAC reflects source-level instructions
  
Reality:
  • Production code uses -O2 or -O3
  • Compilers optimize away many instructions
  • Final binary may be very different
  
Why We Use This Model:
  ✅ Compares what the student wrote, not compiler magic
  ✅ Fair comparison across different coding styles
  ✅ Students learn algorithmic thinking, not compiler tricks
```

#### What This Model Does NOT Measure

| Not Measured | Why Not | Implication |
|--------------|---------|-------------|
| **Cache Efficiency** | Hardware-dependent | Two programs with same TAC may have different cache behavior |
| **Branch Prediction** | CPU-specific | Branching patterns affect real performance but not TAC |
| **Memory Bandwidth** | Platform-dependent | Memory-bound vs CPU-bound not distinguished |
| **Vectorization** | Compiler & hardware | SIMD instructions not reflected in -O0 TAC |
| **Parallel Execution** | Hardware & scheduler | Multi-threading not captured by sequential TAC |
| **I/O Operations** | System-dependent | I/O bottlenecks not reflected in instruction count |

#### When This Model Works Well

✅ **Comparing algorithmic approaches:**
- `O(n)` vs `O(n²)` → TAC count reflects the difference
- Unnecessary loops → More TAC instructions
- Redundant operations → More TAC instructions

✅ **Educational context:**
- Students optimize algorithm, not for specific hardware
- Clear cause-effect: write simpler code → fewer instructions
- Platform-independent grading

#### When This Model May Mislead

⚠️ **Real-world performance optimization:**
- Cache-friendly code might have more instructions but run faster
- Branchless code trades instructions for predictability
- Memory layout matters more than instruction count in big data

⚠️ **Low-level optimization:**
- Hand-tuned assembly might look "worse" in TAC
- Platform-specific tricks not captured
- Compiler optimizations make TAC comparison irrelevant

#### The Deliberate Trade-off

```
Accuracy Spectrum:
┌─────────────────────────────────────────────────────────┐
│ TAC Count           AST Pattern      Actual Performance  │
│ (This Model)        Analysis         Profiling           │
│                                                           │
│ ✅ Deterministic    ✅ Structural     ✅ Reality          │
│ ✅ Reproducible     ✅ Portable       ❌ Hardware-bound   │
│ ✅ Educational      ⚠️  Subjective     ❌ Non-deterministic│
│ ⚠️  Simplified      ❌ Not precise    ❌ Complex to setup │
└─────────────────────────────────────────────────────────┘

We chose TAC Count for:
  • Consistency across runs
  • Platform independence
  • Clear, actionable feedback
  • Focus on algorithmic thinking
```

**Bottom Line:**
- TAC similarity measures **algorithmic efficiency**, not **execution performance**
- It's a pedagogical model, not a production profiler
- Trade-off: reproducibility and clarity over absolute accuracy
- For real-world optimization, profile actual execution with production compiler flags

### � Known Vulnerabilities and Attack Patterns

**The Single-Test-Case Problem:**

This verification model has a **critical vulnerability** when using limited test cases:

**It validates output correctness, not algorithmic correctness.**

```
What the system checks:
  ✅ "Does the output match reference for test input X?"

What the system should check (but doesn't):
  ❌ "Does the code implement a correct algorithm?"
  ❌ "Are function parameters actually used in computation?"
  ❌ "Is the return value computed or hardcoded?"
```

**The Exploit:**
Users can bypass verification by:
1. Memorizing the expected output for specific test input(s)
2. Hardcoding that output in their code
3. Ignoring the actual problem requirements
4. Providing no real algorithm at all

**Result:** Code that "passes" verification but contains no actual logic.

#### Vulnerability 1: Hardcoded Output

**The Attack:**
User implements no actual algorithm - just returns a constant that happens to match the test input.

**Example:**
```cpp
// Reference code (correct algorithm):
int add(int a, int b) {
    return a + b;  // Computes result from parameters
}

// User code (no algorithm!):
int add(int x, int y) {
    return 8;  // Ignores parameters, returns hardcoded constant
}

// Test: add(5, 3)
// Expected: 8
// User output: 8  ✅ MATCHES (but not through computation!)
```

**The Logical Flaw:**
```javascript
Reference Algorithm:
  • Reads parameter 'a'
  • Reads parameter 'b'
  • Computes: a + b
  • Returns result
  → Generic solution, works for ANY input

User "Algorithm":
  • Ignores parameter 'x'
  • Ignores parameter 'y'  
  • Returns constant: 8
  • No computation performed
  → NOT an algorithm, just a hardcoded value
```

**Why Detection NOW WORKS (✅ IMPLEMENTED):**
```javascript
TAC Logic Check (STEP 1A - NEW!):
  Reference TAC: {add: 1, return: 1}  // Has ADD operation
  User TAC: {return: 1}  // No ADD operation!
  → Operations don't match
  → verdict = "INCORRECT"
  → reason = "TAC_LOGIC_MISMATCH"
  ✅ DETECTED! (Missing ADD operation)

  Message: "User code is missing critical operations (add) that are 
           present in reference solution. This indicates the logic 
           is incomplete or hardcoded."

Result: "INCORRECT" ✅
FIXED: TAC operations comparison catches hardcoded values
```

**Why OLD Detection Failed (Before Fix):**
```javascript
Old Logic Check (Output-Only):
  ✅ stdout_match = true (both output "8" for THIS input)
  ✅ exit_code_match = true
  → verdict = "CORRECT"  ❌ FALSE POSITIVE
  ❌ Only tested output - didn't check if computation happened

Old TAC Analysis:
  Reference: 13 instructions (load a, load b, add, return)
  User: 12 instructions (just return 8 - no computation!)
  → TAC similarity = 92% ("GOOD")
  → Hardcoded version appeared MORE efficient (fewer instructions)
  ❌ Counted instructions, didn't compare WHAT operations exist

Old AST Analysis:
  Both have: function, parameters, return statement
  → Structural similarity = 98% ("IDENTICAL")
  ❌ Can't detect that return value is constant, not computed

PROBLEM: No operation-level comparison before the fix!
```

**Real Behavior:**
```cpp
// This is NOT an algorithm - it's a lookup table with ONE entry:
add(5, 3) → 8 ✅  (test case - hardcoded match)
add(2, 7) → 8 ❌  (wrong! doesn't compute)
add(0, 0) → 8 ❌  (wrong! doesn't compute)
add(10, 5) → 8 ❌ (wrong! doesn't compute)

// The function doesn't ADD anything - it just returns 8 always!
```

**The Deception:**
- Appears to work for the test input (5 + 3 = 8)
- Actually ignores inputs and returns constant
- No algorithm implemented, just memorized answer
- Would fail on 99.9% of possible inputs

#### Why Detection Failed

**The Core Problem:** The system checks if output matches, not if the algorithm is correct.

| Detection Method | The Logical Gap | Why It Didn't Catch This |
|------------------|-----------------|--------------------------|
| **TAC Similarity** | Doesn't verify parameters are used | Hardcoded return has FEWER instructions (looks "efficient"!) |
| **AST Similarity** | Doesn't check if return value is computed | Both have return statements (structurally similar) |
| **Logic Correctness** | Only tests specific input(s) | Single test input - hardcoded answer matched by coincidence |
| **Performance** | Not used in rating | Even if measured, constant return might be "faster" |

**The fundamental issue:** 
- System asks: "Does the output match?" ✅ Yes (for this input)
- Should ask: "Does the algorithm compute correctly?" ❌ No (hardcoded constant)
- With only one test input, impossible to distinguish:
  - "Implements correct algorithm" ✅
  - "Memorized expected output" ❌

#### Vulnerability 2: Input-Specific Conditionals

**The Attack:**
User implements a conditional that detects the specific test input and returns hardcoded answer, with fallback for other inputs.

**Example:**
```cpp
// Reference: proper algorithm
int sum(int arr[], int n) {
    int total = 0;
    for(int i = 0; i < n; i++) {
        total += arr[i];
    }
    return total;  // Computes sum for ANY input
}

// User code: pattern matching attack
int sum(int arr[], int n) {
    // Detects specific test case
    if (n == 3 && arr[0] == 1 && arr[1] == 2 && arr[2] == 3) {
        return 6;  // Hardcoded answer for this test
    }
    return 0;  // Wrong answer for everything else
}

// Test: sum([1,2,3], 3) → 6 ✅ MATCHES (lucky!)
// Any other input → FAILS (no real algorithm)
```

**The Deception:**
- No summation algorithm implemented
- Just pattern-matches the test input
- Returns memorized answer for that specific case
- Generic fallback (return 0) is wrong for all other inputs

#### Vulnerability 3: Unused Parameters

**The Attack:**
Function accepts parameters but never uses them in computation - a strong indicator of hardcoding.

**Detection Gap:**
```cpp
int add(int a, int b) {
    return 8;  // Parameters 'a' and 'b' are NEVER used!
}

// System currently does NOT check:
// ❌ Are function parameters referenced in the computation?
// ❌ Is the return value dependent on inputs?
// ❌ Are there unused variables?
```

**What Should Be Flagged:**
- Parameters declared but never read
- Return statement with constant (not computed from inputs)
- No data flow from parameters to return value

### 🛡️ Vulnerability Detection (Implemented)

The system now includes **automated vulnerability detection** to flag suspicious code patterns:

#### Detection #1: Hardcoded Return Values ✅ IMPLEMENTED

**What It Detects:**
- Return statements with constant literals
- No arithmetic/logical operations performed
- Parameters ignored in computation

**Example Caught:**
```cpp
int add(int a, int b) {
    return 8;  // 🚨 FLAGGED: Hardcoded constant without operations
}
```

**Detection Logic:**
```javascript
if (hasReturns && !hasOperations) {
  if (returnStatementContainsLiteral) {
    flag: "HARDCODED_RETURN"
    suspicion: "HIGH"
  }
}
```

#### Detection #2: Unused Parameters ✅ IMPLEMENTED

**What It Detects:**
- Function parameters declared but never referenced
- Parameters appear only once (in declaration, not in body)

**Example Caught:**
```cpp
int add(int a, int b) {
    // 'a' and 'b' never used!
    return 8;  
}
// 🚨 FLAGGED: Parameters 'a', 'b' are unused
```

**Detection Logic:**
```javascript
for (param in functionParameters) {
  occurrences = countOccurrences(param, functionBody)
  if (occurrences < 2) { // Only declaration, no usage
    flag: "UNUSED_PARAMETERS"
    suspicion: "HIGH"
  }
}
```

#### Detection #3: Suspiciously Simple Code ✅ IMPLEMENTED

**What It Detects:**
- Functions with no operations
- No control flow (if/for/while)
- Very low node count in AST

**Example Caught:**
```cpp
int complexCalculation() {
    return 42;  // No calculations!
}
// 🚨 FLAGGED: No operations or control flow detected
```

### 🎯 How Detection Works

**Response Format:**
```json
{
  "verdict": "CORRECT",
  "efficiency_rating": "GOOD",
  "vulnerability_warning": {
    "level": "CRITICAL",  // NONE, LOW, MEDIUM, HIGH, CRITICAL
    "message": "⚠️ HARDCODED OUTPUT: Function returns constant without computation | ⚠️ UNUSED PARAMETERS: Function parameters are not used in computation",
    "recommendation": "Manual review recommended. Code may be hardcoded for specific test input(s).",
    "score": 70,  // 0-100, higher = more suspicious
    "flags": ["HARDCODED_RETURN", "UNUSED_PARAMETERS"],
    "details": {
      "hardcoded_returns": {
        "detected": true,
        "constants_found": ["8"],
        "reason": "Function returns constant value(s): 8 without performing any operations"
      },
      "unused_parameters": {
        "detected": true,
        "unused_params": ["a", "b"],
        "reason": "Function parameters declared but never used: a, b"
      }
    }
  }
}
```

**Suspicion Scoring:**
```
Score Calculation:
  • Hardcoded return: +40 points
  • Unused parameters: +30 points
  • Suspiciously simple: +20 points

Suspicion Levels:
  • 0 points: NONE (clean code)
  • 1-29: LOW (minor concerns)
  • 30-49: MEDIUM (review recommended)
  • 50-69: HIGH (likely issue)
  • 70+: CRITICAL (almost certainly hardcoded)
```

### 🚨 Current Limitations

**What Detection CAN'T Catch (Yet):**

❌ **Input-Specific Conditionals:**
```cpp
int add(int a, int b) {
    if (a == 5 && b == 3) return 8;  // Pattern matches test input
    if (a == 2 && b == 7) return 9;  // Pattern matches another test
    return 0; // Wrong for everything else
}
// Detection sees operations and parameter usage - looks legitimate!
```

❌ **Clever Hardcoding:**
```cpp
int add(int a, int b) {
    int result = a; // Uses 'a'
    result = b;     // Uses 'b' 
    return 8;       // But returns hardcoded value anyway!
}
// Parameters are "used" but computation is fake
```

❌ **Data Flow Analysis:**
- Can't trace if return value actually depends on parameters
- Can't detect if operations are meaningful or just noise
- Can't verify that parameter values flow to return

### 🛡️ Combined Defense Strategy

**Layer 1: Automated Detection (Active)**
```
✅ Flags: Hardcoded returns, unused parameters, suspicious simplicity
└─► Provides: vulnerability_warning in response
    └─► Action: Manual review if suspicion_level is HIGH/CRITICAL
```

**Layer 2: Multiple Test Cases (CRITICAL - Your Responsibility)**
```
✅ Forces: Actual algorithm implementation
└─► Requires: All test cases must pass
    └─► Catches: Input-specific conditionals, pattern matching

```

**Best Practice Implementation:**
```javascript
// Run verification for each test case
const results = [];
for (const testCase of testCases) {
  const result = await fetch('/api/verify', {
    body: JSON.stringify({
      referenceCode: { ...reference, stdin: testCase.input },
      userCode: { ...user, stdin: testCase.input }
    })
  });
  results.push(result);
  
  // Check for vulnerabilities
  if (result.vulnerability_warning) {
    if (['HIGH', 'CRITICAL'].includes(result.vulnerability_warning.level)) {
      console.warn('⚠️ Suspicious code detected:', result.vulnerability_warning.message);
      // Flag for manual review
    }
  }
}

// All tests must pass AND no critical vulnerabilities
const allPassed = results.every(r => r.verdict === 'CORRECT');
const hasCriticalVulns = results.some(r => 
  r.vulnerability_warning?.level === 'CRITICAL'
);

if (allPassed && !hasCriticalVulns) {
  // Code is likely legitimate
} else {
  // Further investigation needed
}
```

### 🎯 What This Means for You

**As a User:**
1. Check the `vulnerability_warning` field in responses
2. If `suspicion_level` is HIGH or CRITICAL, review manually
3. Always use 3-5+ diverse test cases
4. Test edge cases (zeros, negatives, boundary values)

**As a System Integrator:**
1. The system now AUTO-DETECTS common cheating patterns
2. Warnings are advisory - you decide how to handle them
3. Multiple test cases are still REQUIRED (detection helps, doesn't replace)
4. Consider failing submissions with CRITICAL suspicion_level

### 📊 Detection Accuracy

**High Confidence (CRITICAL level):**
- Hardcoded return + unused parameters = Almost certain cheating
- Example: `return 8` with params never used

**Medium Confidence (HIGH level):**
- Hardcoded return OR unused parameters = Likely issue
- May have false positives (e.g., constants defined elsewhere)

**Low Confidence (MEDIUM level):**
- Suspiciously simple code = Needs review
- Could be legitimate simple solution

### 🎯 Best Practices for Using This System

**❌ DON'T:**
```javascript
// Ignore vulnerability warnings!
POST /api/verify
{
  "referenceCode": { ... },
  "userCode": { ... },
  "testCases": [ { one test } ]  // ❌ Bad!
}
```

**✅ DO:**
```javascript
// Multiple diverse test cases
for (testCase of testCases) {
  result = await verifyCode(reference, user, testCase)
  if (!result.verdict === "CORRECT") {
    overall_verdict = "INCORRECT"
    break
  }
}

// All test cases must pass
if (all_passed) {
  show_efficiency_rating()
} else {
  report_failure_details()
}
```

**Recommended Test Case Design:**
- **Minimum:** 3-5 test cases per problem
- **Include:** Normal cases, edge cases, boundary values
- **Vary:** All input parameters
- **Test:** Negative numbers, zeros, large values

### 📊 Vulnerability Summary

| Vulnerability | Severity | Detection | Multi-Test | Defense Status |
|---------------|----------|-----------|------------|----------------|
| **Hardcoded outputs** | 🔴 **CRITICAL** | ✅ **PREVENTED** | ✅ **Recommended** | **✅ LOGIC CHECK BLOCKS** |
| **Unused parameters** | 🔴 **HIGH** | ✅ **PREVENTED** | ✅ **Recommended** | **✅ LOGIC CHECK BLOCKS** |
| **Suspiciously simple code** | 🟡 **MEDIUM** | ✅ **Active Warning** | ✅ **Recommended** | **⚠️ Detection Only** |
| **Input-specific conditionals** | 🔴 **CRITICAL** | ❌ **Not Detected** | ✅ **Required** | **📋 Test Cases Only** |
| **Data flow analysis** | 🟢 **LOW** | 🔄 **Partial** | ✅ **Recommended** | **🔮 Future Enhancement** |

**Defense Layers:**
- **✅ Layer 1 (TAC Logic Check - NEW!):** Compares operations - FAILS verification if operations don't match
  - Catches: Missing operations (hardcoded returns), no parameter usage
  - Status: **PREVENTS submission** (verdict = "INCORRECT")
  
- **⚠️ Layer 2 (Heuristic Detection):** Flags suspicious patterns in code
  - Detects: `HARDCODED_RETURN`, `UNUSED_PARAMETERS`, `SUSPICIOUSLY_SIMPLE`
- **✅ Layer 2 (Required):** Multiple diverse test cases catch pattern-matching attacks
- **🔄 Layer 3 (Future):** Deep data flow analysis to trace computation paths

**The Improved Rule:**
```
The system NOW provides automated vulnerability warnings.

⚠️  Check vulnerability_warning field in responses
✅  Automated detection catches most obvious cheating
❌  Still can't catch clever pattern-matching attacks
🎯  Multiple test cases remain ESSENTIAL

Combined Defense:
  1. Automated detection flags suspicious code
  2. Multiple test cases force real algorithms
  3. Manual review for HIGH/CRITICAL warnings
```

This isn't a bug in the system - it's a fundamental limitation of output-based verification. The system works exactly as designed, but without data flow analysis, it cannot detect if code actually implements an algorithm or just returns memorized values.

### �📊 Summary: What Actually Determines Your Score

```
┌──────────────────────────────────────────────────────────┐
│  VERDICT (CORRECT vs INCORRECT)                          │
│  ═══════════════════════════════════                     │
│  ✅ Logic Correctness (stdout + exit code)               │
│     ⚠️  SCOPE: Only for provided test input(s)           │
│     ⚠️  Does NOT prove universal correctness             │
│  ❌ TAC Similarity                                        │
│  ❌ AST Similarity                                        │
│  ❌ Performance                                           │
│  ❌ Semantic Analysis                                     │
└──────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────┐
│  EFFICIENCY RATING (OPTIMAL/GOOD/MODERATE/INEFFICIENT)   │
│  ══════════════════════════════════════════════════      │
│  ✅ TAC Similarity (after semantic adjustment)            │
│  ❌ AST Similarity                                        │
│  ❌ Performance                                           │
│  ⚠️  Semantic Analysis (modifies TAC, doesn't directly rate)│
└──────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────┐
│  INFORMATIONAL METRICS (shown but not used)              │
│  ══════════════════════════════════════                  │
│  • AST Similarity: Educational/debugging                 │
│  • Performance: Hardware-dependent reference             │
│  • Control Flow: Included in AST analysis                │
│  • Operations Count: Included in AST analysis            │
└──────────────────────────────────────────────────────────┘
```

**The Single Formula:**
```javascript
// This is the ONLY formula that matters for your score:
const verdict = (logic_correct) ? "CORRECT" : "INCORRECT"
const rating = efficiency_level(adjusted_TAC_similarity)

// Where:
function efficiency_level(tac) {
  if (tac >= 95) return "OPTIMAL"
  if (tac >= 80) return "GOOD"
  if (tac >= 60) return "MODERATE"
  return "INEFFICIENT"
}

// And:
adjusted_TAC = base_TAC + semantic_bonus
semantic_bonus = detect_equivalent_patterns() ? 10-20 : 0
```

**No ambiguity. No hidden combinations. This is it.**

### 🧮 Worked Examples: Step-by-Step Calculations

#### Example 1: Perfect Match
```javascript
Input:
  reference_output = "15"
  user_output = "15"
  reference_instructions = 10
  user_instructions = 10

Calculation:
  Step 1: Logic Check
    ✅ output_match = true
    ✅ exit_code_match = true
    → verdict = "CORRECT"

  Step 2: TAC Analysis
    base_TAC = 100 - (|10 - 10| / 10 * 100) = 100%

  Step 3: Semantic Analysis
    No patterns detected
    → semantic_bonus = 0
    → adjusted_TAC = 100%

  Step 4: Efficiency Rating
    100% >= 95%
    → efficiency_rating = "OPTIMAL"

Final Result:
  {
    verdict: "CORRECT",
    efficiency_rating: "OPTIMAL"
  }
```

#### Example 2: Intermediate Variable (Semantic Equivalence)
```javascript
Input:
  reference: "return a + b"
  user: "result = a + b; return result"
  reference_instructions = 10
  user_instructions = 13  // 3 extra for variable

Calculation:
  Step 1: Logic Check
    ✅ output_match = true
    → verdict = "CORRECT"

  Step 2: TAC Analysis
    base_TAC = 100 - (|13 - 10| / 13 * 100)
    base_TAC = 100 - (3/13 * 100)
    base_TAC = 100 - 23 = 77%

  Step 3: Semantic Analysis
    ✅ Intermediate variable pattern detected
    → semantic_bonus = +15%
    → adjusted_TAC = 77% + 15% = 92%

  Step 4: Efficiency Rating
    92% >= 80% (but < 95%)
    → efficiency_rating = "GOOD"

Final Result:
  {
    verdict: "CORRECT",
    efficiency_rating: "GOOD",
    semantic_equivalence: {
      detected: true,
      reason: "Intermediate variable",
      adjustment: 15
    }
  }
```

#### Example 3: Wrong Output (Early Return)
```javascript
Input:
  reference_output = "15"
  user_output = "16"  // Wrong!
  user_instructions = 10  // Same count as reference

Calculation:
  Step 1: Logic Check
    ❌ output_match = false
    → verdict = "INCORRECT"
    → RETURN IMMEDIATELY (no rating calculated)

Final Result:
  {
    verdict: "INCORRECT",
    efficiency_rating: undefined,  // Not calculated
    message: "Output doesn't match reference"
  }
```

#### Example 4: Correct But Inefficient
```javascript
Input:
  reference: "return a + b"
  user: "sum = 0; for(i=0; i<b; i++) sum += a; return sum"
  reference_instructions = 10
  user_instructions = 45  // Very wasteful algorithm!

Calculation:
  Step 1: Logic Check
    ✅ output_match = true
    → verdict = "CORRECT"

  Step 2: TAC Analysis
    base_TAC = 100 - (|45 - 10| / 45 * 100)
    base_TAC = 100 - (35/45 * 100)
    base_TAC = 100 - 78 = 22%

  Step 3: Semantic Analysis
    No equivalent patterns found
    → semantic_bonus = 0
    → adjusted_TAC = 22%

  Step 4: Efficiency Rating
    22% < 60%
    → efficiency_rating = "INEFFICIENT"

Final Result:
  {
    verdict: "CORRECT",  // Logic is right
    efficiency_rating: "INEFFICIENT",  // Algorithm is wasteful
    message: "Your code works but uses significantly more instructions"
  }
```

#### Example 5: High AST, Low TAC (Which Wins?)
```javascript
Input:
  AST_similarity = 95%  // Very similar structure
  base_TAC = 50%        // But more instructions
  Performance: user is 2x faster  // Even faster!

Calculation:
  Step 1: Logic Check
    ✅ output_match = true
    → verdict = "CORRECT"

  Step 2: TAC Analysis
    base_TAC = 50%

  Step 3: Semantic Analysis
    No patterns detected
    → adjusted_TAC = 50%

  Step 4: Efficiency Rating
    50% < 60%
    → efficiency_rating = "INEFFICIENT"
    
    // AST similarity of 95% is IGNORED
    // Performance advantage is IGNORED

Final Result:
  {
    verdict: "CORRECT",
    efficiency_rating: "INEFFICIENT",  // TAC wins
    analysis: {
      code_efficiency: { similarity: 50 },  // This determined rating
      structural_similarity: { similarity: 95 },  // Ignored
      performance: { user_faster: true }  // Ignored
    }
  }
```

**Key Takeaway from Example 5:**
Even with perfect AST similarity and better performance, TAC similarity is the ONLY factor in rating. This is by design to measure algorithmic efficiency, not structural style or hardware performance.

---

## 🔄 Data Flow

### Verification Flow (Complete Journey)

```
1. CLIENT sends user code + reference code
           │
           ▼
2. SERVER validates request
           │
           ▼
3. EXECUTION PHASE
   │
   ├─→ LocalExecutor tries local compiler
   │   └─→ Success? Continue : Fallback to Piston API
   │
   ├─→ Generate LLVM IR (for C/C++)
   │   └─→ simpleIRExtractor → Compiler Explorer API
   │
   └─→ Both programs executed successfully
           │
           ▼
4. LOGIC CHECK (VERDICT DECISION POINT)
   │
   ├─→ Compare stdout
   ├─→ Compare exit codes
   │
   └─→ NOT MATCH? 
       │
       ├─→ YES: verdict = "INCORRECT"
       │        Return immediately (no rating)
       │
       └─→ NO:  verdict = "CORRECT"
                Continue to rating calculation
           │
           ▼
5. EFFICIENCY ANALYSIS (TAC) - Primary Metric
   │
   ├─→ llvmToTAC converts LLVM IR → TAC
   ├─→ tacComparer counts instructions
   │
   └─→ base_TAC_similarity = calculated %
           │
           ▼
6. STRUCTURE ANALYSIS (AST) - Informational
   │
   ├─→ astParser extracts features
   ├─→ astComparer calculates similarity
   │
   └─→ AST_similarity (stored for analysis, not rating)
           │
           ▼
7. SEMANTIC ANALYSIS (RATING ADJUSTMENT)
   │
   ├─→ codeNormalizer detects patterns
   ├─→ Identify intermediate variables
   ├─→ Calculate adjustment bonus
   │
   └─→ adjusted_TAC = base_TAC + semantic_bonus
           │
           ▼
8. EFFICIENCY RATING (RATING DECISION POINT)
   │
   └─→ Based ONLY on adjusted_TAC:
       │
       ├─→ adjusted_TAC >= 95% → efficiency_rating = "OPTIMAL"
       ├─→ adjusted_TAC >= 80% → efficiency_rating = "GOOD"
       ├─→ adjusted_TAC >= 60% → efficiency_rating = "MODERATE"
       └─→ adjusted_TAC <  60% → efficiency_rating = "INEFFICIENT"
           │
           ▼
9. RESPONSE COMPOSITION
   │
   └─→ Return to client:
       • verdict (from step 4)
       • efficiency_rating (from step 8)
       • logic_correctness (step 4 details)
       • code_efficiency (step 5 + 7 details)
       • structural_similarity (step 6 - informational)
       • performance (calculated but not used in rating)
```

### Key Decision Points Explained

**Decision Point 1: Verdict (Step 4)**
```javascript
if (stdout_match && exit_code_match) {
  verdict = "CORRECT"
  // Continue to rating
} else {
  verdict = "INCORRECT"
  return {verdict, message: "Wrong output"} // Early return
}
```

**Decision Point 2: Efficiency Rating (Step 8)**
```javascript
// Only this variable determines the rating:
const finalTAC = adjusted_TAC_similarity

// Deterministic mapping:
if (finalTAC >= 95) return "OPTIMAL"
if (finalTAC >= 80) return "GOOD"
if (finalTAC >= 60) return "MODERATE"
return "INEFFICIENT"
```

**Not Used in Decisions:**
- AST similarity (informational only)
- Performance metrics (hardware-dependent)
- Semantic patterns (only modify TAC score, not directly used)

---

## ⚙️ Configuration

### Environment Variables

```bash
# Server Configuration
PORT=3000                    # Main server port
AST_PORT=3001               # AST microservice port

# External APIs
PISTON_API_URL=https://emkc.org/api/v2/piston
AST_SERVICE_URL=http://localhost:3001

# Execution Settings
USE_LOCAL_EXECUTION=true    # Try local compilers first
NODE_ENV=production         # Environment mode
```

---

### Language Support

| Language   | Local Support | LLVM IR | TAC | AST |
|------------|---------------|---------|-----|-----|
| Python     | ✅            | ❌      | ❌  | ✅  |
| C          | ✅            | ✅      | ✅  | ✅  |
| C++        | ✅            | ✅      | ✅  | ✅  |
| Java       | ✅            | ❌      | ❌  | ✅  |
| JavaScript | ✅            | ❌      | ❌  | ✅  |

---

## 🚀 Quick Start

### Prerequisites
```bash
# For local execution (optional but recommended)
gcc --version      # C compiler
g++ --version      # C++ compiler
python --version   # Python interpreter
node --version     # Node.js runtime
javac -version     # Java compiler
```

### Installation
```bash
npm install
```

### Running the Servers
```bash
# Main server
npm start

# AST microservice (separate terminal)
npm run ast

# Development mode (auto-reload)
npm run dev
npm run dev:ast
```

---

## 📊 Performance Considerations

### Local vs Cloud Execution
- **Local:** 10-50ms (compiler already installed)
- **Piston API:** 500-2000ms (network latency + queue)
- **Recommendation:** Always enable local execution for production

### Service Response Times
- `/api/execute`: ~50-100ms (local) or ~1-2s (Piston)
- `/api/compare`: ~100-200ms (local) or ~2-4s (Piston)
- `/api/verify`: ~200-500ms (complete analysis)

---

## 🔒 Security Features

1. **Request Size Limits:** 10MB max payload
2. **Execution Timeouts:** 10 seconds per program
3. **Helmet.js:** HTTP security headers
4. **CORS:** Cross-origin resource sharing enabled
5. **Input Validation:** All endpoints validate required fields
6. **Isolated Execution:** Temporary directories for code execution
7. **Automatic Cleanup:** Removes temp files after execution

---

## 🐛 Error Handling

All endpoints return consistent error format:
```json
{
  "success": false,
  "error": "Error message here"
}
```

Common errors:
- **400:** Invalid request (missing language/code)
- **404:** Endpoint not found
- **500:** Internal server error (compilation/execution failure)

---

## 📝 Notes

**🚨 CRITICAL SECURITY WARNING:**
- **System validates OUTPUT, not ALGORITHM correctness!**
- Users can bypass verification by hardcoding outputs (no algorithm needed)
- Example: `return 8;` (hardcoded) passes same as `return a + b;` (computed) for test (5,3)
- **Single test case cannot distinguish algorithm from memorized output**
- **Minimum 3-5 diverse test cases required** to force actual algorithm implementation
- Without data flow analysis, parameters usage is not verified
- See "Known Vulnerabilities" section for attack patterns and mitigations

**System Capabilities:**
- AST parsing requires native tree-sitter bindings (not available in serverless)
- LLVM IR generation only works for C/C++
- TAC comparison is most accurate for compiled languages
- Semantic equivalence detection helps reduce false negatives
- Local execution is significantly faster than API calls

**⚠️ Important Model Limitations:**
- **Logic Correctness:** Only verifies provided test input(s), not all possible inputs
- **TAC Efficiency:** Assumes uniform instruction cost (all operations equal)
- **Compilation:** Uses -O0 (no optimization) to compare source algorithms, not compiler output
- **Performance Metrics:** Shown for reference but don't affect efficiency rating
- TAC measures algorithmic complexity, not actual execution performance
- See "Model Assumptions and Limitations" section for comprehensive details

---

## 🎓 Understanding the Analysis

### What is TAC?
Three-Address Code - simplified intermediate representation with max 3 operands per instruction:
```
t1 = a + b
t2 = t1 * c
return t2
```

### What is AST?
Abstract Syntax Tree - hierarchical representation of code structure:
```
function_definition
  ├── name: "add"
  ├── parameters: [a, b]
  └── body
      └── return_statement
          └── binary_expression (+)
              ├── identifier: a
              └── identifier: b
```

### Why Multiple Analysis Levels?

1. **Logic Correctness:** Does it produce the right output *for the tested input(s)*? → **Determines VERDICT**
   - ⚠️ **Limitation:** Only tests provided inputs, not all possible inputs
2. **TAC Efficiency:** How many instructions does it use? → **Determines RATING**
   - ⚠️ **Model:** Assumes uniform instruction cost, -O0 compilation
   - ⚠️ **Measures:** Algorithmic complexity, not execution performance
3. **AST Structure:** Does it follow similar patterns? → **Informational only**
4. **Performance:** How fast does it execute? → **Informational only**
5. **Semantic Equivalence:** Are stylistic differences acceptable? → **Modifies TAC score**

This multi-level approach provides comprehensive code verification beyond simple output matching.

**Important:** A "CORRECT" verdict means the code matches the reference for the specific test case(s) provided. It does NOT guarantee the code is bug-free or correct for all possible inputs. Use multiple diverse test cases for thorough verification.

### ⚠️ Critical Understanding: The Rating Decision

**Many metrics are collected, but only ONE determines your efficiency rating:**

```
Collected Metrics:
  • Logic correctness ──────► Determines: verdict (for tested input[s])
  • TAC similarity ─────────► Determines: efficiency_rating
  • AST similarity ─────────► Informational (returned in analysis)
  • Performance ────────────► Informational (returned in analysis)
  • Semantic patterns ──────► Adjusts TAC similarity

Final Decision:
  verdict = f(logic_correctness)         // Only for provided input(s)
  efficiency_rating = f(adjusted_TAC)    // Only this affects rating

⚠️  Scope Note:
  verdict "CORRECT" = "matches reference for tested input(s)"
  verdict "CORRECT" ≠ "universally correct for all inputs"
```

See the **"Final Verdict Composition"** section above for exact thresholds and formulas.

**Why this matters for users:**
- Don't optimize for AST similarity - it doesn't affect your rating
- Focus on reducing instruction count (TAC) - this is what matters
- Performance differences are shown but don't penalize you
- Semantic equivalence detection helps you (bonus points for clean code)

**Model Limitations to Understand:**
- TAC rating assumes all instructions have equal cost (uniform cost model)
- Compiled at -O0 (no optimization) to compare your algorithm, not compiler tricks
- Instruction count ≈ algorithmic complexity, not actual execution performance
- Cache effects, branch prediction, and memory bandwidth are not measured
- See **"Model Assumptions and Limitations"** section for full details

---

Made with ❤️ for code verification and education
