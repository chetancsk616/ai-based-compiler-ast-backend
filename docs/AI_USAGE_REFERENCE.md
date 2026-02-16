# AI Usage in Code Verification System

**Complete Reference Guide**  
**Last Updated:** February 16, 2026

---

## Executive Summary

The Code Verification System uses AI in **2 strategic points** during the verification flow:

1. **Early AI Check (STEP 1A.5)** - When TAC comparison fails or is unclear
2. **Final AI Check (STEP 1A.6)** - Double-check when TAC passes without AI

**AI Provider:** Groq (llama-3.3-70b-versatile)  
**Invocation Rate:** 60-75% of submissions  
**Cost:** ~$0.001 per verification  
**Latency:** 1-2 seconds per AI call

---

## Table of Contents

1. [AI Invocation Points](#ai-invocation-points)
2. [Complete AI Prompt](#complete-ai-prompt)
3. [Code Line References](#code-line-references)
4. [Configuration Details](#configuration-details)
5. [Response Parsing](#response-parsing)
6. [Decision Logic](#decision-logic)
7. [Integration Patterns](#integration-patterns)

---

## AI Invocation Points

### Overview Diagram

```
┌─────────────────────────────────────────────────┐
│          Code Verification Flow                  │
└─────────────────────────────────────────────────┘

1. Execute Code (Local)
   ↓
2. Extract TAC (Compiler Explorer)
   ↓
3. Compare TAC Operations
   ↓
   ┌─────────────────────────────────────────┐
   │ AI DECISION POINT 1 (Early Check)       │
   │ Location: server.js lines 356-421       │
   │                                         │
   │ TRIGGER:                                │
   │  - TAC operations all = 0               │
   │  - TAC logic check failed               │
   │                                         │
   │ ACTION:                                 │
   │  ≥85% cheating → Auto-fail              │
   │  60-84% cheating → Flag for review      │
   │  <60% → Trust TAC                       │
   │  ≥80% legitimate → Override TAC         │
   └─────────────────────────────────────────┘
   ↓
4. Output Verification
   ↓
   ┌─────────────────────────────────────────┐
   │ AI DECISION POINT 2 (Final Check)       │
   │ Location: server.js lines 540-585       │
   │                                         │
   │ TRIGGER:                                │
   │  - TAC passed                           │
   │  - No AI used in early check            │
   │                                         │
   │ ACTION:                                 │
   │  ≥60% cheating → Flag for review        │
   │  <60% → Accept                          │
   └─────────────────────────────────────────┘
   ↓
5. Return Verdict
```

### Point 1: Early AI Check (STEP 1A.5)

**File:** `server.js`  
**Lines:** 356-421

**Purpose:**
- Verify unclear TAC comparison results
- Handle Python/JavaScript where TAC extraction fails
- Distinguish real errors from false positives

**Trigger Conditions:**
```javascript
// server.js lines 360-367
const shouldUseAI = (
  // Case 1: TAC operations all zeros (extraction failed)
  (tacLogicCheck.tac_comparison?.reference_operations &&
   Object.values(tacLogicCheck.tac_comparison.reference_operations).every(v => v === 0)) ||
  
  // Case 2: TAC logic check failed
  !tacLogicCheck.passed
);
```

**When This Triggers:**
- ✅ Python submissions (TAC often fails)
- ✅ JavaScript submissions (TAC often fails)
- ✅ C++ with wrong operations detected by TAC
- ✅ Any code where TAC comparison is unclear

**Decision Logic:**
```javascript
// server.js lines 389-411
if (!aiVerification.is_legitimate) {
  if (aiVerification.confidence >= 85) {
    // Very high confidence → AUTO-FAIL
    tacLogicCheck.passed = false;
    tacLogicCheck.reason = `AI-Verified Cheating (${confidence}%): ${reason}`;
    tacLogicCheck.ai_override = true;
  } 
  else if (aiVerification.confidence >= 60) {
    // Medium confidence → FLAG FOR REVIEW
    tacLogicCheck.flagged_for_review = true;
    tacLogicCheck.review_reason = `AI detected potential cheating (${confidence}%): ${reason}`;
  }
  // <60% confidence → Trust TAC result (no action)
}
else if (aiVerification.is_legitimate && aiVerification.confidence >= 80) {
  // High confidence legitimate → OVERRIDE TAC
  tacLogicCheck.passed = true;
  tacLogicCheck.reason = `AI-Verified Legitimate: ${reason}`;
  tacLogicCheck.ai_override = true;
}
```

---

### Point 2: Final AI Check (STEP 1A.6)

**File:** `server.js`  
**Lines:** 540-585

**Purpose:**
- Catch patterns TAC misses (conditional hardcoding)
- Double-check TAC results
- Detect C++ conditional cheating hidden by optimization

**Trigger Conditions:**
```javascript
// server.js lines 547-549
if (!aiVerification || !aiVerification.ai_used) {
  // AI was not invoked in early check
  // TAC passed but might have missed patterns
  runFinalAICheck();
}
```

**When This Triggers:**
- ✅ C++ code where TAC passes cleanly
- ✅ Any submission where TAC passed without AI check
- ✅ Code with conditional logic: `if (a==5 && b==3) return 8;`

**Decision Logic:**
```javascript
// server.js lines 569-573
if (!finalAICheck.is_legitimate && finalAICheck.confidence >= 60) {
  flaggedForReview = true;
  reviewReason = `AI detected potential cheating pattern: ${finalAICheck.reason}`;
}
// <60% confidence → Accept (no flag)
```

**Note:** Final check only flags for review, never auto-fails

---

## Complete AI Prompt

### System Message

**File:** `services/aiVerifier.js`  
**Lines:** 211, 237, 268 (varies by provider)

```
You are a code verification expert. Respond only with valid JSON.
```

---

### User Prompt (Full Text)

**File:** `services/aiVerifier.js`  
**Lines:** 114-175

**Template:**
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
  "mod": 0,
  "and": 0,
  "or": 0,
  "xor": 0,
  "load": 2,
  "store": 1,
  "call": 1,
  "branch": 0,
  "compare": 0
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
entry:
  %sum = add nsw i32 %a, %b
  ret i32 %sum
}
... (first 20 lines shown)
```

**User TAC (Intermediate Code):**
```
define i32 @add(i32 %a, i32 %b) {
entry:
  %1 = icmp eq i32 %a, 5
  %2 = icmp eq i32 %b, 3
  %3 = and i1 %1, %2
  br i1 %3, label %if.then, label %if.else
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

| Variable | Source | Example Value |
|----------|--------|---------------|
| `{language}` | `userCode.language` | `cpp`, `python`, `javascript` |
| `{referenceCode}` | `referenceCode.code` | Full source code string |
| `{userCode}` | `userCode.code` | Full source code string |
| `{MATCH/MISMATCH}` | `tacLogicResult.passed` | `MATCH` or `MISMATCH` |
| `{tacReason}` | `tacLogicResult.reason` | "Operations match" |
| `{referenceOperations}` | TAC comparison result | `{"add": 1, "mul": 0, ...}` |
| `{userOperations}` | TAC comparison result | `{"add": 1, "mul": 0, ...}` |
| `{referenceTAC}` | Compiler Explorer output | LLVM IR lines |
| `{userTAC}` | Compiler Explorer output | LLVM IR lines |

---

## Code Line References

### AIVerifier Service (`services/aiVerifier.js`)

```javascript
// Lines 1-13: Documentation header
/**
 * AI-Powered Code Verification Service
 * Acts as a SECONDARY JUDGE when TAC comparison is unclear
 */

// Lines 15-28: Constructor & Configuration
class AIVerifier {
  constructor() {
    this.apiKey = process.env.GROQ_API_KEY || 
                  process.env.OPENAI_API_KEY || 
                  process.env.ANTHROPIC_API_KEY;
    this.provider = process.env.AI_PROVIDER || 'openai';
    this.model = process.env.AI_MODEL || 
                 (this.provider === 'groq' ? 'llama-3.3-70b-versatile' : 'gpt-4o-mini');
    this.enabled = !!this.apiKey;
  }

// Lines 43-109: Main verification function
  async verifyTACComparison(context) {
    const prompt = this.buildVerificationPrompt({ ... });
    const aiResponse = await this.callAI(prompt);
    const analysis = this.parseAIResponse(aiResponse);
    return { ...analysis, ai_used: true };
  }

// Lines 114-175: COMPLETE AI PROMPT CONSTRUCTION
  buildVerificationPrompt(data) {
    return `You are a code verification expert...`;
  }

// Lines 180-195: Provider routing
  async callAI(prompt) {
    if (this.provider === 'openai') return await this.callOpenAI(prompt);
    else if (this.provider === 'anthropic') return await this.callAnthropic(prompt);
    else if (this.provider === 'groq') return await this.callGroq(prompt);
  }

// Lines 200-230: OpenAI API implementation
  async callOpenAI(prompt) {
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: this.model,
        messages: [
          { role: 'system', content: 'You are a code verification expert...' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.3,
        max_tokens: 1000
      },
      {
        headers: { 'Authorization': `Bearer ${this.apiKey}` },
        timeout: 30000
      }
    );
    return response.data.choices[0].message.content;
  }

// Lines 235-258: Anthropic API implementation
  async callAnthropic(prompt) {
    const response = await axios.post(
      'https://api.anthropic.com/v1/messages',
      { model: this.model, max_tokens: 1000, messages: [...] },
      { headers: { 'x-api-key': this.apiKey, 'anthropic-version': '2023-06-01' } }
    );
    return response.data.content[0].text;
  }

// Lines 263-287: Groq API implementation (NEW!)
  async callGroq(prompt) {
    const response = await axios.post(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        model: this.model,  // llama-3.3-70b-versatile
        messages: [
          { role: 'system', content: 'You are a code verification expert...' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.3,
        max_tokens: 1000
      },
      {
        headers: { 'Authorization': `Bearer ${this.apiKey}` },
        timeout: 30000
      }
    );
    return response.data.choices[0].message.content;
  }

// Lines 292-350: Response parsing
  parseAIResponse(responseText) {
    // Remove markdown code blocks
    let cleanedText = responseText.trim()
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '');
    
    const parsed = JSON.parse(cleanedText);
    
    return {
      is_legitimate: parsed.is_legitimate,
      confidence: parsed.confidence,
      reason: parsed.reason || 'No reason provided',
      detailed_analysis: parsed.detailed_analysis || '',
      cheating_indicators: parsed.cheating_indicators || [],
      recommendation: parsed.recommendation || (parsed.is_legitimate ? 'PASS' : 'FAIL')
    };
  }
}
```

---

### Server Verification Logic (`server.js`)

```javascript
// Lines 1-11: Imports including AIVerifier
const { AIVerifier } = require('./services/aiVerifier');

// Lines 356-421: EARLY AI CHECK (STEP 1A.5)
// ============================================================================
// STEP 1A.5: AI VERIFICATION (Secondary Judge)
// ============================================================================
let aiVerification = null;
const shouldUseAI = (
  // Case 1: TAC operations all zeros
  (tacLogicCheck.tac_comparison?.reference_operations &&
   Object.values(tacLogicCheck.tac_comparison.reference_operations).every(v => v === 0)) ||
  // Case 2: TAC logic check failed
  !tacLogicCheck.passed
);

if (shouldUseAI) {
  console.log('[STEP 1A.5] TAC comparison unclear - invoking AI verifier...');
  const aiVerifier = new AIVerifier();
  
  if (aiVerifier.isEnabled()) {
    try {
      aiVerification = await aiVerifier.verifyTACComparison({
        referenceCode: referenceCode.code,
        userCode: userCode.code,
        referenceTAC: referenceResult.tac || [],
        userTAC: userResult.tac || [],
        referenceOperations: tacLogicCheck.tac_comparison?.reference_operations || {},
        userOperations: tacLogicCheck.tac_comparison?.user_operations || {},
        tacLogicResult: tacLogicCheck,
        language: userCode.language
      });

      console.log('[STEP 1A.5] AI Verdict:', aiVerification.is_legitimate ? 'LEGITIMATE' : 'CHEATING');
      console.log('[STEP 1A.5] AI Confidence:', aiVerification.confidence + '%');
      console.log('[STEP 1A.5] AI Reason:', aiVerification.reason);

      // DECISION LOGIC: Auto-fail, Flag, or Override
      if (!aiVerification.is_legitimate) {
        if (aiVerification.confidence >= 85) {
          // Very high confidence → AUTO-FAIL
          tacLogicCheck.passed = false;
          tacLogicCheck.reason = `AI-Verified Cheating (${aiVerification.confidence}%): ${aiVerification.reason}`;
          tacLogicCheck.ai_override = true;
        } 
        else if (aiVerification.confidence >= 60) {
          // Medium confidence → FLAG FOR REVIEW
          tacLogicCheck.flagged_for_review = true;
          tacLogicCheck.review_reason = `AI detected potential cheating (${aiVerification.confidence}%): ${aiVerification.reason}`;
          console.log('[STEP 1A.5] ⚠️ FLAGGED FOR REVIEW (medium confidence)');
        }
      }
      else if (aiVerification.is_legitimate && aiVerification.confidence >= 80) {
        // High confidence legitimate → OVERRIDE TAC
        tacLogicCheck.passed = true;
        tacLogicCheck.reason = `AI-Verified Legitimate: ${aiVerification.reason}`;
        tacLogicCheck.ai_override = true;
      }
    } catch (error) {
      console.error('[STEP 1A.5] AI Verification failed:', error.message);
      aiVerification = { error: error.message, ai_used: false };
    }
  }
}

// Lines 540-585: FINAL AI CHECK (STEP 1A.6)
// ============================================================================
// STEP 1A.6: FINAL AI VERIFICATION PASS (Catch patterns TAC misses)
// ============================================================================
let finalAICheck = null;
let flaggedForReview = false;
let reviewReason = null;

if (!aiVerification || !aiVerification.ai_used) {
  console.log('[STEP 1A.6] Running final AI verification pass (TAC passed without AI check)...');
  const aiVerifier = new AIVerifier();
  
  if (aiVerifier.isEnabled()) {
    try {
      finalAICheck = await aiVerifier.verifyTACComparison({
        referenceCode: referenceCode.code,
        userCode: userCode.code,
        referenceTAC: referenceResult.tac || [],
        userTAC: userResult.tac || [],
        referenceOperations: tacLogicCheck.tac_comparison?.reference_operations || {},
        userOperations: tacLogicCheck.tac_comparison?.user_operations || {},
        tacLogicResult: tacLogicCheck,
        language: userCode.language
      });

      console.log('[STEP 1A.6] Final AI Verdict:', finalAICheck.is_legitimate ? 'LEGITIMATE' : 'SUSPICIOUS');
      console.log('[STEP 1A.6] Final AI Confidence:', finalAICheck.confidence + '%');
      console.log('[STEP 1A.6] Final AI Reason:', finalAICheck.reason);

      // DECISION LOGIC: Flag for review if suspicious
      if (!finalAICheck.is_legitimate && finalAICheck.confidence >= 60) {
        flaggedForReview = true;
        reviewReason = `AI detected potential cheating pattern: ${finalAICheck.reason}`;
        console.log('[STEP 1A.6] ⚠️ FLAGGED FOR REVIEW:', reviewReason);
      }
    } catch (error) {
      console.error('[STEP 1A.6] Final AI verification failed:', error.message);
      finalAICheck = { error: error.message, ai_used: false };
    }
  }
}

// Lines 707-745: Response construction with AI results
res.json({
  success: true,
  verdict: verdict,
  flagged_for_review: flaggedForReview,
  review_reason: reviewReason,
  analysis: {
    '1_logic_correctness': {
      ...logicCorrect,
      ai_verification: aiVerification || { ai_used: false }
    },
    ...
  },
  final_ai_verification: finalAICheck ? {
    verdict: finalAICheck.is_legitimate ? 'LEGITIMATE' : 'SUSPICIOUS',
    confidence: finalAICheck.confidence,
    reason: finalAICheck.reason,
    detailed_analysis: finalAICheck.detailed_analysis,
    cheating_indicators: finalAICheck.cheating_indicators || [],
    recommendation: finalAICheck.recommendation
  } : null
});
```

---

## Configuration Details

### Environment Variables

**File:** `.env`

```bash
# AI Provider Selection
AI_PROVIDER=groq              # Options: 'groq', 'openai', 'anthropic'

# Groq Configuration (Recommended)
GROQ_API_KEY=your_groq_api_key_here
GROQ_MODEL=llama-3.3-70b-versatile

# OpenAI Configuration (Alternative)
# OPENAI_API_KEY=sk-proj-...
# AI_MODEL=gpt-4o-mini

# Anthropic Configuration (Alternative)
# ANTHROPIC_API_KEY=sk-ant-...
# AI_MODEL=claude-3-haiku-20240307
```

### API Parameters

**File:** `services/aiVerifier.js`  
**Lines:** 214-223 (OpenAI), 240-246 (Anthropic), 268-278 (Groq)

```javascript
// Common settings across all providers
{
  model: this.model,           // Provider-specific model
  temperature: 0.3,             // Low temp for deterministic responses
  max_tokens: 1000,             // Sufficient for detailed JSON
  timeout: 30000                // 30 second timeout
}
```

### Model Specifications

| Provider | Model | Context Window | Speed | Cost |
|----------|-------|----------------|-------|------|
| **Groq** | llama-3.3-70b-versatile | 8192 tokens | ⚡ 1-2s | $0.59/$0.79 per 1M |
| OpenAI | gpt-4o-mini | 128k tokens | 🚀 2-3s | $0.15/$0.60 per 1M |
| Anthropic | claude-3-haiku | 200k tokens |⚡ 1-2s | $0.25/$1.25 per 1M |

---

## Response Parsing

### Expected JSON Format

**File:** `services/aiVerifier.js`  
**Lines:** 292-350

```javascript
{
  "is_legitimate": false,
  "confidence": 90,
  "reason": "Conditional hardcoding detected",
  "detailed_analysis": "User code contains if statement checking for specific input values (a==5 && b==3) and returns hardcoded value 8. This will only work for this specific test case.",
  "cheating_indicators": [
    "Conditional logic based on exact input values",
    "Hardcoded return value",
    "Pattern matching instead of actual computation"
  ],
  "recommendation": "FAIL"
}
```

### Parsing Logic

```javascript
// Lines 295-307: Clean response
let cleanedText = responseText.trim();
if (cleanedText.startsWith('```json')) {
  cleanedText = cleanedText
    .replace(/```json\n?/g, '')
    .replace(/```\n?/g, '');
}

// Lines 309-319: Parse and validate
const parsed = JSON.parse(cleanedText);

if (typeof parsed.is_legitimate !== 'boolean') {
  throw new Error('Missing or invalid is_legitimate field');
}
if (typeof parsed.confidence !== 'number') {
  throw new Error('Missing or invalid confidence field');
}

// Lines 321-328: Return structured result
return {
  is_legitimate: parsed.is_legitimate,
  confidence: parsed.confidence,
  reason: parsed.reason || 'No reason provided',
  detailed_analysis: parsed.detailed_analysis || '',
  cheating_indicators: parsed.cheating_indicators || [],
  recommendation: parsed.recommendation || (parsed.is_legitimate ? 'PASS' : 'FAIL')
};
```

### Fallback Handling

```javascript
// Lines 330-350: If parsing fails
catch (error) {
  console.error('[AI Verifier] Failed to parse AI response:', error.message);
  
  // Heuristic fallback
  const isLegitimate = responseText.toLowerCase().includes('legitimate') || 
                      responseText.toLowerCase().includes('correct');
  
  return {
    is_legitimate: isLegitimate,
    confidence: 50,
    reason: 'AI response parsing failed, using heuristic analysis',
    detailed_analysis: responseText.substring(0, 200),
    cheating_indicators: [],
    recommendation: isLegitimate ? 'PASS' : 'FAIL'
  };
}
```

---

## Decision Logic

### Confidence Threshold Summary

| Confidence Range | Scenario | Action | Verdict |
|-----------------|----------|--------|---------|
| **≥85% cheating** | Very clear cheating | AUTO-FAIL | INCORRECT |
| **60-84% cheating** | Suspicious but uncertain | FLAG FOR REVIEW | CORRECT (flagged) |
| **<60% cheating** | AI uncertain | TRUST TAC | (use TAC result) |
| **≥80% legitimate** | Very clear legitimate | OVERRIDE TAC | CORRECT |

### Early Check Decision Tree

```
AI Verification Result
    │
    ├─ is_legitimate: false (cheating detected)
    │   │
    │   ├─ confidence ≥ 85%
    │   │   └─ AUTO-FAIL
    │   │       verdict = INCORRECT
    │   │       reason = "AI-Verified Cheating (90%): ..."
    │   │
    │   ├─ confidence 60-84%
    │   │   └─ FLAG FOR REVIEW
    │   │       verdict = CORRECT
    │   │       flagged_for_review = true
    │   │       review_reason = "AI detected potential cheating (75%): ..."
    │   │
    │   └─ confidence < 60%
    │       └─ TRUST TAC
    │           (no action, use TAC result)
    │
    └─ is_legitimate: true (legitimate code detected)
        │
        ├─ confidence ≥ 80%
        │   └─ OVERRIDE TAC (if TAC failed)
        │       verdict = CORRECT
        │       reason = "AI-Verified Legitimate: ..."
        │
        └─ confidence < 80%
            └─ TRUST TAC
                (no action, use TAC result)
```

### Final Check Decision Tree

```
Final AI Check Result
    │
    ├─ is_legitimate: false (suspicious pattern)
    │   │
    │   ├─ confidence ≥ 60%
    │   │   └─ FLAG FOR REVIEW
    │   │       verdict = CORRECT
    │   │       flagged_for_review = true
    │   │       review_reason = "AI detected potential cheating pattern: ..."
    │   │
    │   └─ confidence < 60%
    │       └─ ACCEPT
    │           verdict = CORRECT
    │           (no flag, pass submission)
    │
    └─ is_legitimate: true
        └─ ACCEPT
            verdict = CORRECT
            (no flag, pass submission)
```

---

## Integration Patterns

### Pattern 1: Auto-Grading System

```javascript
const response = await axios.post('/api/verify', {
  referenceCode, userCode
});

if (response.data.verdict === 'CORRECT') {
  if (response.data.flagged_for_review) {
    // Send to instructor review queue
    await queueForReview({
      studentId: student.id,
      submissionId: submission.id,
      reason: response.data.review_reason,
      confidence: response.data.final_ai_verification.confidence,
      cheatingIndicators: response.data.final_ai_verification.cheating_indicators
    });
    
    return {
      status: 'PENDING_REVIEW',
      points: 0,
      message: 'Your submission is under review.'
    };
  } else {
    // Clean pass
    return {
      status: 'ACCEPTED',
      points: 100,
      message: 'Correct solution!'
    };
  }
} else {
  // Failed or clear cheating
  return {
    status: 'REJECTED',
    points: 0,
    message: 'Incorrect solution.',
    details: response.data.failure_reason
  };
}
```

### Pattern 2: Instructor Dashboard

```javascript
async function getReviewQueue(instructorId) {
  const flagged = await db.submissions.find({
    status: 'PENDING_REVIEW',
    instructor_id: instructorId
  });
  
  return flagged.map(sub => ({
    submissionId: sub.id,
    studentName: sub.student_name,
    problemTitle: sub.problem_title,
    submittedAt: sub.created_at,
    
    // AI Analysis
    reviewReason: sub.review_reason,
    aiConfidence: sub.ai_confidence,
    cheatingIndicators: sub.cheating_indicators,
    aiDetailedAnalysis: sub.ai_detailed_analysis,
    
    // Code
    referenceCode: sub.reference_code,
    userCode: sub.user_code,
    
    // Actions
    approve: () => approveSubmission(sub.id),
    reject: () => rejectSubmission(sub.id, 'Confirmed cheating'),
    addComment: (comment) => addInstructorComment(sub.id, comment)
  }));
}
```

### Pattern 3: Real-Time Feedback

```javascript
async function provideLiveFeedback(code) {
  const response = await axios.post('/api/verify', {
    referenceCode: getReferenceCode(),
    userCode: { language: 'python', code }
  });
  
  if (response.data.flagged_for_review) {
    const ai = response.data.final_ai_verification;
    
    return {
      type: 'warning',
      message: `⚠️ Suspicious pattern detected (${ai.confidence}% confidence)`,
      details: ai.cheating_indicators,
      suggestions: [
        'Try implementing the actual computation',
        'Avoid hardcoded values',
        'Ensure your code works for all inputs'
      ]
    };
  } else if (response.data.verdict === 'CORRECT') {
    return {
      type: 'success',
      message: '✅ Solution looks good!',
      efficiency: response.data.efficiency_rating
    };
  } else {
    return {
      type: 'error',
      message: '❌ Logic error detected',
      details: response.data.analysis['1_logic_correctness'].tac_logic.reason
    };
  }
}
```

---

## Summary

### Key Takeaways

1. **AI is used in 2 strategic points:**
   - Early check when TAC fails (lines 356-421)
   - Final check when TAC passes (lines 540-585)

2. **Complete prompt is in `services/aiVerifier.js` lines 114-175**

3. **Decision logic uses confidence thresholds:**
   - ≥85% → Auto-fail
   - 60-84% → Flag for review
   - <60% → Trust TAC

4. **Configuration in `.env`:**
   - GROQ_API_KEY (recommended)
   - AI_PROVIDER=groq
   - GROQ_MODEL=llama-3.3-70b-versatile

5. **Cost-effective:** ~$0.001 per verification

### Quick Reference

- **AI Service:** `services/aiVerifier.js`
- **Server Logic:** `server.js` lines 356-421, 540-585
- **Prompt:** Lines 114-175 in aiVerifier.js
- **Configuration:** `.env` file
- **Documentation:** [AI_PROMPTS_AND_CONFIGURATION.md](AI_PROMPTS_AND_CONFIGURATION.md)

---

**Document Version:** 1.0  
**Last Updated:** February 16, 2026  
**Maintainer:** Code Verification System Team
