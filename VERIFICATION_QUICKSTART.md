# Code Verification - Quick Start

## What This Does

Verifies user-submitted code against a reference solution with **4-layer analysis**:

1. ✅ **Logic Correctness** (Pass/Fail) - Do they get the right answer?
2. 📊 **Code Efficiency** (TAC) - How many instructions?
3. 🌳 **Structure Similarity** (AST) - What's their approach?
4. ⚡ **Performance** (Time) - How fast does it run?

## Quick Example

### Reference Code (Teacher's Solution):
```c
int add(int a, int b) {
    return a + b;
}

int main() {
    return add(5, 3);
}
```

### User Code (Student's Solution):
```c
int add(int x, int y) {
    int result = x + y;
    return result;
}

int main() {
    return add(5, 3);
}
```

### API Call:
```bash
POST http://localhost:3000/api/verify
Content-Type: application/json

{
  "referenceCode": {
    "language": "c",
    "code": "int add(int a, int b) { return a + b; }\nint main() { return add(5, 3); }"
  },
  "userCode": {
    "language": "c",
    "code": "int add(int x, int y) { int result = x + y; return result; }\nint main() { return add(5, 3); }"
  }
}
```

### Response:
```json
{
  "verdict": "CORRECT",            // ✅ Got the right answer
  "efficiency_rating": "GOOD",      // 📊 86% similarity to reference
  "analysis": {
    "1_logic_correctness": {
      "passed": true,                // Both output "8"
      "output_match": true
    },
    "2_code_efficiency": {
      "similarity": 86,              // Very similar instructions
      "user_instructions": 7,
      "reference_instructions": 6
    },
    "3_structural_similarity": {
      "overall_similarity": 92,      // Almost same structure
      "similarity_level": "VERY_SIMILAR"
    },
    "4_performance": {
      "user_faster": true,           // User code actually faster!
      "time_difference": 1.01
    }
  }
}
```

## Interpretation

✅ **CORRECT** - Student got the right answer  
📊 **GOOD** (86%) - Only 1 extra instruction (temp variable)  
🌳 **VERY_SIMILAR** (92%) - Almost same approach  
⚡ **FASTER** - Student's code ran faster

**Grade:** Full marks! Different style but correct and efficient.

## Common Scenarios

### ✅ Scenario 1: Perfect Solution
```
Verdict: CORRECT
Efficiency: OPTIMAL (95%+)
Rating: 💯 Full marks
```

### ✅ Scenario 2: Correct but Inefficient
```
Verdict: CORRECT
Efficiency: INEFFICIENT (40%)
Rating: ⚠️ Partial credit
```

### ❌ Scenario 3: Wrong Answer
```
Verdict: INCORRECT
Output: "9" (expected "8")
Rating: ❌ Zero marks
```

### ✅ Scenario 4: Different Algorithm, Same Result
```
Verdict: CORRECT
Efficiency: MODERATE (65%)
AST: DIFFERENT (35%)
Rating: ✅ Full marks for correctness, note: different approach
```

## Priority Order (Fail Fast)

```
1. Logic Check → FAILS? Stop = INCORRECT
                 ↓
              PASSES
                 ↓
2. Efficiency → Check instructions
                 ↓
3. Structure → Check AST similarity
                 ↓
4. Performance → Check execution time
                 ↓
        FINAL VERDICT + RATING
```

## Supported Languages

- C
- C++
- Python
- JavaScript

## Server Running

```bash
npm start
# Server on http://localhost:3000
```

## Test in Postman

1. Create POST request to `http://localhost:3000/api/verify`
2. Set header: `Content-Type: application/json`
3. Add body (see example above)
4. Send!

## Full Documentation

- **[CODE_VERIFICATION_GUIDE.md](CODE_VERIFICATION_GUIDE.md)** - Complete technical guide
- **[POSTMAN_GUIDE.txt](POSTMAN_GUIDE.txt)** - All API endpoints with examples

## Auto-Grading Example

```javascript
// Pseudocode for auto-grading
const response = await verify(referenceCode, userCode);

if (response.verdict === "INCORRECT") {
  grade = 0;
  feedback = "Wrong output: expected X, got Y";
} else {
  // Correct answer
  baseGrade = 70; // Base points for correctness
  
  // Add efficiency bonus
  if (response.efficiency_rating === "OPTIMAL") {
    grade = 100;
  } else if (response.efficiency_rating === "GOOD") {
    grade = 90;
  } else if (response.efficiency_rating === "MODERATE") {
    grade = 80;
  } else {
    grade = 70;
  }
  
  feedback = `Correct! Efficiency: ${response.efficiency_rating}`;
}
```

## Need Help?

- Check `CODE_VERIFICATION_GUIDE.md` for detailed explanations
- See `POSTMAN_GUIDE.txt` for all API examples
- The guide explains TAC, AST, and all comparison metrics
