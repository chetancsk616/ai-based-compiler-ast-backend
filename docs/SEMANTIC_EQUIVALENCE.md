# Semantic Equivalence Detection

## Overview

The Code Verification System now includes **intelligent semantic equivalence detection** that recognizes when two code implementations are logically identical despite stylistic differences.

This prevents unfair penalties for common coding variations that don't affect logic or efficiency.

---

## Problem Solved

### Before Semantic Detection

**Reference Code:**
```c
int add(int a, int b) {
    return a + b;
}
```

**User Code (logically identical):**
```c
int add(int x, int y) {
    int result = x + y;
    return result;
}
```

**Old Result:**
- Efficiency: 75% (MODERATE) ❌
- AST Similarity: 72% (SIMILAR) ❌
- Rating: User penalized for intermediate variable

### After Semantic Detection

**Same codes, with semantic analysis:**

**New Result:**
- Efficiency: 100% (OPTIMAL) ✅
- AST Similarity: 82% → adjusted to match (SIMILAR) ✅
- Semantic Equivalence: **Detected** ✅
- Note: "Codes are semantically equivalent despite minor stylistic differences"
- Rating: No penalty for intermediate variable

---

## Detected Patterns

### 1. Intermediate Variable Pattern

**Pattern A: Direct Return**
```c
int add(int a, int b) {
    return a + b;
}
```

**Pattern B: Intermediate Variable**
```c
int add(int x, int y) {
    int result = x + y;
    return result;
}
```

**Detection Logic:**
- ✅ Same control flow
- ✅ Same function structure
- ✅ Difference: 1-2 extra variables
- ✅ Node count difference: 10-30%
- **Result**: Semantically equivalent

### 2. Variable Naming Differences

**Pattern A:**
```python
def multiply(a, b):
    return a * b
```

**Pattern B:**
```python
def multiply(x, y):
    return x * y
```

**Detection Logic:**
- ✅ Identical structure
- ✅ Only difference: parameter names
- **Result**: Semantically equivalent

### 3. Expression Storage

**Pattern A:**
```javascript
function divide(a, b) {
    return a / b;
}
console.log(divide(10, 2));
```

**Pattern B:**
```javascript
function divide(x, y) {
    const quotient = x / y;
    return quotient;
}
const answer = divide(10, 2);
console.log(answer);
```

**Detection Logic:**
- ✅ Same control flow
- ✅ Same function structure
- ✅ Difference: intermediate storage
- **Result**: Semantically equivalent

---

## How It Works

### Detection Algorithm

1. **Extract AST Features**
   - Parse both reference and user code
   - Extract: node counts, control flow, functions, variables

2. **Pattern Detection**
   - Check for intermediate variables
   - Check for node count differences (10-30%)
   - Check for declaration nodes

3. **Control Flow Verification**
   - Compare if/for/while/switch statements
   - Must be **identical** for semantic equivalence

4. **Function Structure Verification**
   - Compare function names and count
   - Must be **identical** for semantic equivalence

5. **Calculate Adjustments**
   - If semantically equivalent: +10% similarity bonus
   - For C/C++ with TAC: boost to 95% minimum if instruction diff ≤2
   - For all languages: boost AST similarity

6. **Update Rating**
   - Apply adjustments to efficiency and structure scores
   - Provide explanatory notes in response

### Adjustment Rules

| Condition | TAC Adjustment | AST Adjustment |
|-----------|---------------|----------------|
| Intermediate var detected (C/C++) | Boost to ≥95% (OPTIMAL) if instr diff ≤2 | +10% |
| Node count diff 10-30% + same control flow | +10% | +10% |
| Variable naming only | No change | +5% (future) |

---

## Response Format

### New Fields in API Response

```json
{
  "success": true,
  "verdict": "CORRECT",
  "efficiency_rating": "OPTIMAL",
  "semantic_equivalence": {
    "detected": true,
    "reason": "User code uses intermediate variable (e.g., result = x + y; return result)",
    "total_adjustment": 10
  },
  "analysis": {
    "2_code_efficiency": {
      "similarity": 100,
      "original_similarity": 75,
      "semantic_adjustment": 10,
      "note": "Codes are semantically equivalent despite minor stylistic differences",
      "semantic_reason": "User code uses intermediate variable..."
    },
    "3_structural_similarity": {
      "overall_similarity": 82,
      "original_similarity": 72,
      "semantic_adjustment": 10,
      "semantic_note": "User code uses intermediate variable..."
    }
  }
}
```

### Key Fields

- **`semantic_equivalence.detected`**: Boolean - was semantic equivalence detected?
- **`semantic_equivalence.reason`**: String - explanation of detected pattern
- **`semantic_equivalence.total_adjustment`**: Number - total percentage adjustment applied
- **`original_similarity`**: Number - score before semantic adjustment
- **`semantic_adjustment`**: Number - adjustment applied
- **`note`** / **`semantic_note`**: String - explanation for users

---

## Language Support

### Fully Supported Languages

| Language   | Detection Method | Example Patterns |
|------------|------------------|------------------|
| **C**      | TAC + AST        | Intermediate variables, direct returns |
| **C++**    | TAC + AST        | Intermediate variables, direct returns |
| **Python** | AST (node count) | Intermediate variables, variable naming |
| **JavaScript** | AST (node count) | const/let declarations, intermediate storage |
| **Java**   | AST (node count) | Local variable declarations, intermediate storage |

### Detection Accuracy

- **C/C++**: Very High (TAC + AST analysis)
- **Python**: High (AST node analysis)
- **JavaScript**: High (AST node analysis)
- **Java**: High (AST node analysis)

---

## Test Examples

### C Example

```bash
curl -X POST http://localhost:3000/api/verify \
  -H "Content-Type: application/json" \
  -d @test-intermediate-var.json
```

**Result:**
- Semantic Equivalence: ✅ Detected
- TAC: 75% → 100% (OPTIMAL)
- AST: 72% → 82% (SIMILAR)

### Python Example

```bash
curl -X POST http://localhost:3000/api/verify \
  -H "Content-Type: application/json" \
  -d @test-python-intermediate.json
```

**Result:**
- Semantic Equivalence: ✅ Detected
- TAC: 0% → 100% (OPTIMAL)
- AST: 92% → 100% (IDENTICAL)

### JavaScript Example

```bash
curl -X POST http://localhost:3000/api/verify \
  -H "Content-Type: application/json" \
  -d @test-js-intermediate.json
```

**Result:**
- Semantic Equivalence: ✅ Detected
- TAC: 0% → 100% (OPTIMAL)
- AST: 91% → 100% (IDENTICAL)

---

## Technical Implementation

### Key Components

1. **`services/codeNormalizer.js`**
   - `CodeNormalizer` class
   - Pattern detection methods
   - Equivalence calculation algorithms
   - Adjustment logic

2. **`server.js` Integration**
   - Semantic analysis after AST/TAC comparison
   - Adjustment application to scores
   - Response formatting with semantic notes

### Core Methods

```javascript
// Detect patterns in code
detectPatterns(astFeatures)

// Calculate semantic equivalence
calculateSemanticEquivalence(refFeatures, userFeatures)

// Adjust TAC efficiency rating
adjustEfficiencyRating(tacSimilarity, semanticEquivalence, instructionDiff)

// Adjust AST similarity
adjustASTSimilarity(originalSimilarity, semanticEquivalence)
```

---

## Configuration

### Adjustment Thresholds

Edit `services/codeNormalizer.js` to customize:

```javascript
// Intermediate variable adjustment
adjustments.intermediateVariable = 10; // 10% bonus

// Node count ratio thresholds
if (nodeRatio >= 0.1 && nodeRatio <= 0.3) // 10-30% difference acceptable

// TAC similarity boost for C/C++
adjustedSimilarity = Math.max(tacSimilarity, 95); // Boost to 95% minimum
```

---

## Benefits

1. **Fair Grading** ✅
   - Students not penalized for valid coding styles
   - Recognizes logically equivalent solutions

2. **Accurate Efficiency Rating** ✅
   - Distinguishes true inefficiency from stylistic choice
   - Focuses on algorithmic differences

3. **Better Learning Experience** ✅
   - Clear feedback: "semantically equivalent"
   - Students understand their code is correct

4. **Language Agnostic** ✅
   - Works across C, C++, Python, JavaScript, Java
   - Extensible to other languages

5. **Transparent Adjustments** ✅
   - Shows original and adjusted scores
   - Explains reason for adjustments

---

## Future Enhancements

Planned improvements:

1. **More Pattern Detection**
   - Loop unrolling equivalence
   - Recursion vs iteration
   - Different but equivalent algorithms (e.g., bubble sort variations)

2. **Machine Learning**
   - Train model on equivalent code pairs
   - Learn new equivalence patterns automatically

3. **Performance Normalization**
   - Adjust performance scores for semantically equivalent patterns
   - Account for compiler optimizations

4. **Custom Pattern Rules**
   - Allow instructors to define custom equivalence patterns
   - Domain-specific equivalence rules

---

## Related Documentation

- [CODE_VERIFICATION_GUIDE.md](CODE_VERIFICATION_GUIDE.md) - Complete verification system guide
- [LANGUAGE_SUPPORT.md](LANGUAGE_SUPPORT.md) - Language-specific features
- [POSTMAN_GUIDE.txt](POSTMAN_GUIDE.txt) - API testing examples
