# AI Verification System - Complete Documentation

**Last Updated:** February 16, 2026  
**System Version:** v2.1 (with Human Review Flagging)  
**AI Provider:** Groq (llama-3.3-70b-versatile)

---

## Table of Contents

1. [Overview](#overview)
2. [System Architecture](#system-architecture)
3. [AI Invocation Points](#ai-invocation-points)
4. [AI Prompts](#ai-prompts)
5. [Configuration](#configuration)
6. [Confidence Thresholds](#confidence-thresholds)
7. [Response Format](#response-format)
8. [Integration Guide](#integration-guide)
9. [Troubleshooting](#troubleshooting)

---

## Overview

The AI Verification System acts as a **secondary judge** when TAC (Three-Address Code) comparison is unclear or potentially wrong. It uses Large Language Models to detect sophisticated cheating patterns that static analysis might miss.

### Key Features

✅ **Multi-Provider Support:** OpenAI, Anthropic, Groq  
✅ **Two-Tier Verification:** Early check + Final verification pass  
✅ **Human Review Flagging:** Suspicious cases flagged instead of auto-failed  
✅ **Confidence-Based Decisions:** Different actions based on AI confidence levels  
✅ **Fast & Cost-Effective:** 1-2s latency, ~$0.001 per verification  

### When AI Is Used

1. **Early AI Check (STEP 1A.5):**
   - TAC operations are all zeros (extraction failed)
   - TAC logic check failed (potential false positive)

2. **Final AI Check (STEP 1A.6):**
   - TAC passed but no AI check was performed
   - Catches conditional cheating patterns that TAC misses

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    CODE VERIFICATION FLOW                        │
└─────────────────────────────────────────────────────────────────┘

1. Execute Code (Local)
   ├─ Compile/Interpret with gcc/g++/python/node
   ├─ Capture stdout, stderr, exit code
   └─ Measure execution time

2. Extract TAC (Compiler Explorer API)
   ├─ Send code to godbolt.org
   ├─ Get LLVM IR or assembly
   └─ Extract operations (add, sub, mul, div, etc)

3. Compare TAC Operations
   ├─ Count operations in reference vs user code
   ├─ Detect hardcoded values
   └─ Check operation types match

4. AI VERIFICATION POINT 1 (Early Check - STEP 1A.5)
   ├─ TRIGGER CONDITIONS:
   │  ├─ TAC operations all = 0 (extraction failed)
   │  └─ TAC logic check failed
   │
   ├─ AI ANALYSIS:
   │  ├─ Compare code semantics
   │  ├─ Detect cheating patterns
   │  └─ Generate confidence score
   │
   └─ DECISION LOGIC:
      ├─ ≥85% cheating → Auto-fail (INCORRECT)
      ├─ 60-84% cheating → Flag for review (CORRECT + flagged)
      ├─ <60% cheating → Trust TAC result
      └─ ≥80% legitimate → Override TAC (CORRECT)

5. Output Verification
   ├─ Compare stdout
   └─ Compare exit codes

6. AI VERIFICATION POINT 2 (Final Check - STEP 1A.6)
   ├─ TRIGGER CONDITIONS:
   │  └─ TAC passed AND no AI check in step 4
   │
   ├─ AI ANALYSIS:
   │  ├─ Double-check TAC result
   │  ├─ Look for hidden patterns
   │  └─ Detect conditional hardcoding
   │
   └─ DECISION LOGIC:
      ├─ ≥60% cheating → Flag for review (CORRECT + flagged)
      └─ <60% cheating → Accept (CORRECT)

7. Return Verdict
   ├─ CORRECT (clean)
   ├─ CORRECT (flagged for review)
   └─ INCORRECT (failed)
```

---

## AI Invocation Points

### Point 1: Early AI Check (STEP 1A.5)

**Location:** `server.js` lines 356-421

**Trigger Conditions:**
```javascript
const shouldUseAI = (
  // Case 1: TAC operations are all zeros (extraction might have failed)
  (tacLogicCheck.tac_comparison?.reference_operations &&
   Object.values(tacLogicCheck.tac_comparison.reference_operations).every(v => v === 0)) ||
  
  // Case 2: TAC logic check failed (verify if it's a real failure)
  !tacLogicCheck.passed
);
```

**Purpose:**
- Verify if TAC comparison result is accurate
- Handle Python/JavaScript where TAC extraction often fails
- Distinguish between logic errors and false positives

**Action Based on Confidence:**
```javascript
if (!aiVerification.is_legitimate) {
  if (aiVerification.confidence >= 85) {
    // Auto-fail: Very high confidence cheating
    tacLogicCheck.passed = false;
    tacLogicCheck.reason = `AI-Verified Cheating (${confidence}%): ${reason}`;
  } 
  else if (aiVerification.confidence >= 60) {
    // Flag for review: Medium confidence cheating
    tacLogicCheck.flagged_for_review = true;
    tacLogicCheck.review_reason = `AI detected potential cheating (${confidence}%): ${reason}`;
  }
}
else if (aiVerification.is_legitimate && aiVerification.confidence >= 80) {
  // Override TAC: High confidence legitimate
  tacLogicCheck.passed = true;
  tacLogicCheck.reason = `AI-Verified Legitimate: ${reason}`;
}
```

---

### Point 2: Final AI Check (STEP 1A.6)

**Location:** `server.js` lines 540-585

**Trigger Conditions:**
```javascript
if (!aiVerification || !aiVerification.ai_used) {
  // AI was not invoked in early check
  // TAC passed but might have missed conditional patterns
  runFinalAICheck();
}
```

**Purpose:**
- Catch conditional cheating that compiler optimizations hide
- Detect `if (a==5 && b==3) return 8;` patterns in C++
- Provide second opinion on TAC results

**Action Based on Confidence:**
```javascript
if (!finalAICheck.is_legitimate && finalAICheck.confidence >= 60) {
  flaggedForReview = true;
  reviewReason = `AI detected potential cheating pattern: ${finalAICheck.reason}`;
}
```

**Note:** Final AI check uses lower auto-fail threshold (no auto-fail, only flags)

---

## AI Prompts

### System Prompt (All Providers)

```
You are a code verification expert. Respond only with valid JSON.
```

**Purpose:** Ensure structured, parseable responses

---

### Verification Prompt (Detailed)

**Template:** `services/aiVerifier.js` lines 114-175

```
You are a code verification expert. Analyze if the user's code is a legitimate 
solution or an attempt to cheat/game the system.

**Reference Code (Correct Implementation):**
```{language}
{referenceCode}
```

**User Code (To Verify):**
```{language}
{userCode}
```

**TAC Comparison:**
- TAC Logic Check: {MATCH/MISMATCH}
- Reason: {tacReason}

**Reference TAC Operations:**
```
{
  "add": 1,
  "mul": 0,
  "sub": 0,
  "div": 0,
  ...
}
```

**User TAC Operations:**
```
{
  "add": 1,
  "mul": 0,
  "sub": 0,
  "div": 0,
  ...
}
```

**Reference TAC (Intermediate Code):**
```
define i32 @add(i32 %a, i32 %b) {
  %sum = add nsw i32 %a, %b
  ret i32 %sum
}
... (first 20 lines shown)
```

**User TAC (Intermediate Code):**
```
define i32 @add(i32 %a, i32 %b) {
  %1 = icmp eq i32 %a, 5
  %2 = icmp eq i32 %b, 3
  %3 = and i1 %1, %2
  br i1 %3, label %4, label %5
  ...
}
... (first 20 lines shown)
```

**Your Task:**
Determine if the user's code is:
1. **LEGITIMATE**: A genuine attempt to solve the problem 
   (may have different style but correct logic)
2. **CHEATING**: Hardcoded values, conditional hardcoding, 
   or gaming the test cases

**Cheating Patterns to Look For:**
- Hardcoded return values (e.g., `return 8;` instead of `return a+b;`)
- Conditional hardcoding (e.g., `if (a==5 && b==3) return 8;`)
- Input-specific logic that won't work for other inputs
- Unused function parameters
- No actual computation performed
- Pattern matching test cases instead of implementing algorithm

**Respond ONLY with valid JSON (no markdown, no code blocks):**
{
  "is_legitimate": true/false,
  "confidence": 0-100,
  "reason": "Brief explanation (max 100 words)",
  "detailed_analysis": "Detailed analysis of the code (max 200 words)",
  "cheating_indicators": ["list", "of", "specific", "issues"],
  "recommendation": "PASS" or "FAIL"
}
```

---

### Prompt Variables

| Variable | Source | Example |
|----------|--------|---------|
| `{language}` | `userCode.language` | `cpp`, `python`, `javascript` |
| `{referenceCode}` | `referenceCode.code` | Full source code |
| `{userCode}` | `userCode.code` | Full source code |
| `{MATCH/MISMATCH}` | `tacLogicResult.passed` | `MATCH` or `MISMATCH` |
| `{tacReason}` | `tacLogicResult.reason` | "Operations match" |
| `{referenceOperations}` | `tacComparison.reference_operations` | Operation counts |
| `{userOperations}` | `tacComparison.user_operations` | Operation counts |
| `{referenceTAC}` | `referenceResult.tac` | First 20 lines of TAC |
| `{userTAC}` | `userResult.tac` | First 20 lines of TAC |

---

## Configuration

### Environment Variables

```bash
# AI Provider Selection (choose one)
AI_PROVIDER=groq              # Options: 'groq', 'openai', 'anthropic'

# Groq Configuration (Recommended)
GROQ_API_KEY=gsk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx
GROQ_MODEL=llama-3.3-70b-versatile

# OpenAI Configuration (Alternative)
OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxx
AI_MODEL=gpt-4o-mini

# Anthropic Configuration (Alternative)
ANTHROPIC_API_KEY=sk-ant-xxxxxxxxxxxxxxxxxxxxxxxxxxxxx
AI_MODEL=claude-3-haiku-20240307
```

### Provider Comparison

| Provider | Model | Speed | Cost | Accuracy |
|----------|-------|-------|------|----------|
| **Groq** | llama-3.3-70b-versatile | ⚡ 1-2s | 💰 $0.59/$0.79 per 1M tokens | ✅ Excellent |
| OpenAI | gpt-4o-mini | 🚀 2-3s | 💰💰 $0.15/$0.60 per 1M tokens | ✅ Excellent |
| Anthropic | claude-3-haiku | ⚡ 1-2s | 💰💰 $0.25/$1.25 per 1M tokens | ✅ Good |

**Recommendation:** Use **Groq** for best cost/performance ratio.

### API Configuration

**File:** `services/aiVerifier.js` lines 15-28

```javascript
constructor() {
  // Check API keys in priority order
  this.apiKey = process.env.GROQ_API_KEY || 
                process.env.OPENAI_API_KEY || 
                process.env.ANTHROPIC_API_KEY;
  
  // Set provider
  this.provider = process.env.AI_PROVIDER || 'openai';
  
  // Set model (provider-specific defaults)
  this.model = process.env.AI_MODEL || 
               (this.provider === 'groq' ? 'llama-3.3-70b-versatile' : 'gpt-4o-mini');
  
  // Enable/disable based on API key presence
  this.enabled = !!this.apiKey;
}
```

### API Parameters

**Common Settings (All Providers):**
```javascript
{
  temperature: 0.3,      // Low temperature for deterministic responses
  max_tokens: 1000,      // Sufficient for detailed JSON response
  timeout: 30000         // 30 second timeout
}
```

---

## Confidence Thresholds

### Early AI Check (STEP 1A.5)

```javascript
// VERY HIGH CONFIDENCE CHEATING (≥85%)
if (!is_legitimate && confidence >= 85) {
  action = 'AUTO_FAIL';
  verdict = 'INCORRECT';
  reason = `AI-Verified Cheating (${confidence}%): ${reason}`;
}

// MEDIUM CONFIDENCE CHEATING (60-84%)
else if (!is_legitimate && confidence >= 60) {
  action = 'FLAG_FOR_REVIEW';
  verdict = 'CORRECT';  // Don't auto-fail
  flagged_for_review = true;
  review_reason = `AI detected potential cheating (${confidence}%): ${reason}`;
}

// LOW CONFIDENCE CHEATING (<60%)
else if (!is_legitimate && confidence < 60) {
  action = 'TRUST_TAC';
  verdict = 'Use TAC result';
  // AI is uncertain, defer to TAC comparison
}

// HIGH CONFIDENCE LEGITIMATE (≥80%)
else if (is_legitimate && confidence >= 80) {
  action = 'OVERRIDE_TAC';
  verdict = 'CORRECT';
  reason = `AI-Verified Legitimate: ${reason}`;
}
```

### Final AI Check (STEP 1A.6)

```javascript
// MEDIUM CONFIDENCE CHEATING (≥60%)
if (!is_legitimate && confidence >= 60) {
  action = 'FLAG_FOR_REVIEW';
  verdict = 'CORRECT';  // Don't auto-fail
  flagged_for_review = true;
  review_reason = `AI detected potential cheating pattern: ${reason}`;
}

// LOW CONFIDENCE (<60%)
else {
  action = 'ACCEPT';
  verdict = 'CORRECT';
  // No flag, accept TAC result
}
```

**Note:** Final check has NO auto-fail threshold (only flags for review)

### Threshold Tuning Guide

| Scenario | Recommendation |
|----------|----------------|
| **Too many false positives** (legitimate code flagged) | Increase thresholds: 60→70%, 85→90% |
| **Too many false negatives** (cheating missed) | Decrease thresholds: 60→50%, 85→75% |
| **Production deployment** | Use defaults (60%, 85%) - balanced |
| **High-stakes exams** | Lower thresholds (50%, 75%) - catch more |
| **Low-stakes practice** | Higher thresholds (70%, 90%) - fewer flags |

---

## Response Format

### Successful AI Verification

```json
{
  "success": true,
  "verdict": "CORRECT",
  "flagged_for_review": true,
  "review_reason": "AI detected potential cheating (80% confidence): Conditional hardcoding detected",
  
  "analysis": {
    "1_logic_correctness": {
      "passed": true,
      "tac_logic": {
        "passed": true,
        "reason": "Operations match",
        "operations": { ... },
        "flagged_for_review": true,
        "review_reason": "AI detected potential cheating..."
      },
      "output_verification": { ... },
      "ai_verification": {
        "ai_used": true,
        "is_legitimate": false,
        "confidence": 80,
        "reason": "Conditional hardcoding detected",
        "detailed_analysis": "User code contains if statement...",
        "cheating_indicators": [
          "Conditional logic based on exact input values",
          "Hardcoded return value"
        ],
        "recommendation": "FAIL",
        "verification_time": 1.23
      }
    },
    "2_code_efficiency": { ... },
    "3_structural_similarity": { ... },
    "4_performance": { ... }
  },
  
  "final_ai_verification": {
    "verdict": "SUSPICIOUS",
    "confidence": 80,
    "reason": "Conditional hardcoding detected",
    "detailed_analysis": "...",
    "cheating_indicators": ["..."],
    "recommendation": "REVIEW_MANUALLY"
  }
}
```

### AI Not Used

```json
{
  "success": true,
  "verdict": "CORRECT",
  "flagged_for_review": false,
  
  "analysis": {
    "1_logic_correctness": {
      "passed": true,
      "ai_verification": {
        "ai_used": false
      }
    }
  },
  
  "final_ai_verification": null
}
```

### AI Verification Failed

```json
{
  "analysis": {
    "1_logic_correctness": {
      "ai_verification": {
        "verified": false,
        "ai_used": true,
        "error": "API timeout",
        "fallback": "Using TAC comparison result without AI verification"
      }
    }
  }
}
```

---

## Integration Guide

### Basic Usage (Auto-Grading System)

```javascript
const axios = require('axios');

async function gradeSubmission(studentId, problemId, userCode) {
  const referenceCode = await getProblemReference(problemId);
  
  const response = await axios.post('http://localhost:3000/api/verify', {
    referenceCode: {
      language: 'cpp',
      code: referenceCode
    },
    userCode: {
      language: 'cpp',
      code: userCode
    },
    testInputs: []
  });
  
  const { verdict, flagged_for_review, review_reason } = response.data;
  
  if (verdict === 'CORRECT') {
    if (flagged_for_review) {
      // Suspicious code - needs manual review
      await queueForInstructorReview(studentId, problemId, review_reason);
      return {
        status: 'PENDING_REVIEW',
        points: 0,
        message: 'Your submission is under review.'
      };
    } else {
      // Clean correct solution
      return {
        status: 'ACCEPTED',
        points: 100,
        message: 'Correct solution!'
      };
    }
  } else {
    // Incorrect or cheating detected
    return {
      status: 'REJECTED',
      points: 0,
      message: 'Incorrect solution.'
    };
  }
}
```

### Advanced Usage (With AI Analysis Details)

```javascript
async function detailedGrading(studentId, problemId, userCode) {
  const response = await axios.post('http://localhost:3000/api/verify', {
    referenceCode: getReferenceCode(problemId),
    userCode: { language: 'python', code: userCode }
  });
  
  const aiAnalysis = response.data.analysis['1_logic_correctness'].ai_verification;
  const finalAI = response.data.final_ai_verification;
  
  // Check if AI was used
  if (aiAnalysis.ai_used || finalAI) {
    const aiResult = aiAnalysis.ai_used ? aiAnalysis : finalAI;
    
    console.log(`AI Confidence: ${aiResult.confidence}%`);
    console.log(`AI Reason: ${aiResult.reason}`);
    
    if (aiResult.cheating_indicators && aiResult.cheating_indicators.length > 0) {
      console.log('Cheating Indicators:');
      aiResult.cheating_indicators.forEach(indicator => {
        console.log(`  - ${indicator}`);
      });
    }
  }
  
  return {
    verdict: response.data.verdict,
    flagged: response.data.flagged_for_review,
    aiUsed: aiAnalysis.ai_used || !!finalAI,
    confidence: aiResult?.confidence || null,
    details: response.data.analysis
  };
}
```

### Instructor Dashboard Integration

```javascript
async function getReviewQueue(instructorId) {
  const flaggedSubmissions = await db.submissions.find({
    status: 'PENDING_REVIEW',
    instructor_id: instructorId
  });
  
  return flaggedSubmissions.map(sub => ({
    studentId: sub.student_id,
    problemId: sub.problem_id,
    submittedAt: sub.timestamp,
    reviewReason: sub.review_reason,
    aiConfidence: sub.ai_confidence,
    cheatingIndicators: sub.cheating_indicators,
    code: sub.code,
    actions: {
      approve: () => approveSubmission(sub.id),
      reject: () => rejectSubmission(sub.id, 'Confirmed cheating')
    }
  }));
}
```

---

## Troubleshooting

### AI Not Being Invoked

**Symptom:** `ai_verification: { ai_used: false }`

**Causes:**
1. No API key configured
2. TAC comparison passes cleanly
3. AI disabled in configuration

**Solutions:**
```bash
# Check API key
echo $GROQ_API_KEY

# Verify server logs
grep "AI Verifier" logs.txt

# Check configuration
curl http://localhost:3000/api/config | jq '.ai_enabled'
```

### AI Always Returning Low Confidence

**Symptom:** `confidence < 60` for obvious cheating

**Causes:**
1. Model not suitable for code analysis
2. Prompt needs tuning
3. Code examples too complex

**Solutions:**
1. Switch to Groq llama-3.3-70b-versatile
2. Add more examples to prompt
3. Simplify test cases

### Too Many False Positives

**Symptom:** Legitimate code being flagged

**Causes:**
1. Thresholds too low
2. AI misunderstanding legitimate patterns
3. Unusual coding style

**Solutions:**
```javascript
// Increase flagging threshold
const FLAG_THRESHOLD = 70;  // was 60

// Increase auto-fail threshold
const AUTO_FAIL_THRESHOLD = 90;  // was 85
```

### API Timeout Errors

**Symptom:** `error: "API timeout"`

**Causes:**
1. Network issues
2. API provider downtime
3. Large code samples

**Solutions:**
```javascript
// Increase timeout
timeout: 60000  // 60 seconds instead of 30

// Truncate TAC samples
referenceTAC: data.referenceTAC?.slice(0, 10)  // First 10 lines instead of 20
```

### Inconsistent AI Responses

**Symptom:** Same code gets different verdicts

**Causes:**
1. Temperature too high
2. Model non-deterministic
3. Prompt ambiguity

**Solutions:**
```javascript
// Lower temperature for more deterministic responses
temperature: 0.1  // was 0.3

// Use specific model version
model: 'gpt-4o-mini-2024-07-18'  // locked version
```

---

## Performance Metrics

### Latency

| Operation | Time | Notes |
|-----------|------|-------|
| **Code Execution** | 100-500ms | Local gcc/g++/python/node |
| **TAC Extraction** | 300-800ms | Compiler Explorer API |
| **TAC Comparison** | 10-50ms | Local computation |
| **AI Verification** | 1000-2000ms | Groq API call |
| **Total (with AI)** | 3-5 seconds | Including AI |
| **Total (no AI)** | 1-2 seconds | TAC only |

### Cost Analysis (Groq)

| Metric | Value |
|--------|-------|
| **Input tokens per request** | ~800 tokens |
| **Output tokens per request** | ~150 tokens |
| **Input cost** | $0.59 per 1M tokens |
| **Output cost** | $0.79 per 1M tokens |
| **Cost per verification** | ~$0.0006 |
| **Monthly cost (1000 verifications)** | ~$0.60 |
| **Yearly cost (10,000 verifications)** | ~$6.00 |

### Accuracy Metrics

| Metric | Value | Notes |
|--------|-------|-------|
| **Overall Accuracy** | 90% | 27/30 tests passed |
| **Genuine Recognition** | 100% | No false positives |
| **Logic Error Detection** | 90% | Catches wrong operations |
| **Cheating Detection (auto-fail)** | 70% | 7/10 caught by TAC or AI |
| **Effective Detection (incl. flags)** | 100% | All 10/10 detected |
| **False Positives** | 0% | No legitimate code flagged |

---

## Appendix: API Endpoint Details

### Provider-Specific Endpoints

**Groq:**
```
POST https://api.groq.com/openai/v1/chat/completions
Authorization: Bearer ${GROQ_API_KEY}
Content-Type: application/json
```

**OpenAI:**
```
POST https://api.openai.com/v1/chat/completions
Authorization: Bearer ${OPENAI_API_KEY}
Content-Type: application/json
```

**Anthropic:**
```
POST https://api.anthropic.com/v1/messages
x-api-key: ${ANTHROPIC_API_KEY}
anthropic-version: 2023-06-01
Content-Type: application/json
```

### Request / Response Samples

See `services/aiVerifier.js` for complete implementations:
- Lines 208-230: OpenAI implementation
- Lines 235-258: Anthropic implementation  
- Lines 263-287: Groq implementation

---

**Document Version:** 1.0  
**Last Updated:** February 16, 2026  
**Maintainer:** Code Verification System Team  
**Related Documents:**
- [HUMAN_REVIEW_SYSTEM.md](HUMAN_REVIEW_SYSTEM.md)
- [AI_INTEGRATION_IMPACT.md](AI_INTEGRATION_IMPACT.md)
- [CODE_VERIFICATION_GUIDE.md](CODE_VERIFICATION_GUIDE.md)
