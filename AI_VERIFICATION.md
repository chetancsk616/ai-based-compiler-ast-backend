# AI-Powered Secondary Verification

## Overview

The AI verification system acts as a **SECONDARY JUDGE** when TAC (Three-Address Code) comparison alone may be insufficient or unreliable. It uses advanced language models to detect sophisticated cheating patterns that static code analysis might miss.

## When AI is Invoked

AI verification is automatically triggered when:

1. **TAC Extraction Fails**: All operations return 0 (possible extraction failure)
2. **TAC Logic Mismatch**: TAC shows different operations between reference and user code
3. **Suspicious Patterns**: Code appears to game the system despite passing TAC checks

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Verification Flow                        │
└─────────────────────────────────────────────────────────────┘

1. [LOCAL EXECUTION]
   ↓
   Execute reference & user code locally (gcc/g++/python/node)
   Fast, reliable output generation

2. [TAC EXTRACTION]
   ↓
   Extract TAC from Compiler Explorer API (online)
   Generate LLVM IR → Convert to TAC operations

3. [TAC LOGIC CHECK] (Primary Judge)
   ↓
   Compare operations: add, sub, mul, div, return, etc.
   Detect: hardcoded values, missing operations
   Result: PASS or FAIL

4. [AI VERIFICATION] (Secondary Judge) ← NEW!
   ↓
   IF: TAC unclear OR TAC failed
   THEN: Call AI with:
   - Reference code vs User code
   - TAC operations comparison
   - TAC intermediate code samples
   ↓
   AI analyzes and returns:
   - Verdict: LEGITIMATE or CHEATING
   - Confidence: 0-100%
   - Reason: Why it's cheating or legitimate
   - Cheating Indicators: Specific issues found
   - Recommendation: PASS or FAIL

5. [AI OVERRIDE]
   ↓
   IF: AI confidence ≥ 70% for CHEATING → Override to FAIL
   IF: AI confidence ≥ 80% for LEGITIMATE → Override to PASS
   
6. [FINAL VERDICT]
   ↓
   Return result with:
   - TAC analysis
   - AI analysis (if used)
   - Code comparison
   - Detailed reasoning
```

## Configuration

### Environment Variables

```bash
# OpenAI (gpt-4o-mini, gpt-4, etc.)
export OPENAI_API_KEY="sk-..."
export AI_PROVIDER="openai"
export AI_MODEL="gpt-4o-mini"

# OR Anthropic (Claude Haiku, Sonnet, etc.)
export ANTHROPIC_API_KEY="sk-ant-..."
export AI_PROVIDER="anthropic"
export AI_MODEL="claude-3-haiku-20240307"
```

### Supported Models

**OpenAI:**
- `gpt-4o-mini` (Recommended - Fast & Cost-effective)
- `gpt-4o`
- `gpt-4-turbo`
- `gpt-4`

**Anthropic:**
- `claude-3-haiku-20240307` (Recommended - Fast & Cost-effective)
- `claude-3-sonnet-20240229`
- `claude-3-opus-20240229`

## AI Verification Response

When AI is invoked, the response includes:

```json
{
  "verdict": "INCORRECT",
  "logic_correctness": {
    "tac_logic": {
      "passed": false,
      "reason": "AI-Verified Cheating: User code hardcodes return value",
      "ai_override": true
    },
    "ai_verification": {
      "ai_used": true
    }
  },
  "ai_analysis": {
    "verdict": "CHEATING",
    "confidence": 95,
    "reason": "User code returns hardcoded value 8 instead of computing a+b",
    "detailed_analysis": "The reference code performs addition operation (a + b), while the user code directly returns constant 8. This suggests the user hardcoded the expected output for test input (5, 3) rather than implementing the actual addition logic.",
    "cheating_indicators": [
      "Hardcoded return value (return 8)",
      "No arithmetic operations in user code",
      "Parameter values not used in computation",
      "Output matches only for specific test input"
    ],
    "recommendation": "FAIL",
    "ai_override": true
  },
  "reference": {
    "code": "int add(int a, int b) { return a + b; }",
    "operations": { "add": 1, "return": 1 },
    "tac_sample": ["entry:", "t1 = add a, b", "return t1"]
  },
  "user": {
    "code": "int add(int a, int b) { return 8; }",
    "operations": { "add": 0, "return": 1 },
    "tac_sample": ["entry:", "return 8"]
  }
}
```

## Cheating Patterns AI Detects

### 1. Hardcoded Return Values
```cpp
// Reference
int add(int a, int b) {
    return a + b;
}

// User (CHEATING)
int add(int a, int b) {
    return 8;  // Hardcoded for test (5, 3)
}
```

**AI Detection:**
- ✅ Identifies missing arithmetic operations
- ✅ Detects unused parameters
- ✅ Recognizes hardcoded constants
- ✅ Confidence: 95%+

### 2. Conditional Hardcoding
```cpp
// Reference
int add(int a, int b) {
    return a + b;
}

// User (CHEATING)
int add(int a, int b) {
    if (a == 5 && b == 3) return 8;  // Pattern matching
    if (a == 10 && b == 20) return 30;
    return a + b;  // Correct for others
}
```

**AI Detection:**
- ✅ Recognizes test case pattern matching
- ✅ Identifies conditional hardcoding
- ✅ Detects mixed legitimate/cheating logic
- ✅ Confidence: 85%+

### 3. Lookup Tables
```cpp
// User (CHEATING)
int add(int a, int b) {
    int table[10][10] = {/* precomputed results */};
    return table[a][b];
}
```

**AI Detection:**
- ✅ Identifies precomputed results
- ✅ Detects table-based logic
- ✅ Recognizes missing computation
- ✅ Confidence: 90%+

### 4. Output Manipulation
```cpp
// User (CHEATING)
int add(int a, int b) {
    printf("8");  // Print expected output
    return 0;
}
```

**AI Detection:**
- ✅ Detects output stream manipulation
- ✅ Identifies incorrect return values
- ✅ Recognizes I/O-based cheating
- ✅ Confidence: 95%+

## AI Override Logic

The AI can override TAC results based on confidence:

```javascript
// Override to FAIL (High confidence cheating)
if (!aiVerification.is_legitimate && aiVerification.confidence >= 70) {
  tacLogicCheck.passed = false;
  tacLogicCheck.reason = `AI-Verified Cheating: ${aiVerification.reason}`;
  tacLogicCheck.ai_override = true;
}

// Override to PASS (High confidence legitimate)
else if (aiVerification.is_legitimate && aiVerification.confidence >= 80) {
  tacLogicCheck.passed = true;
  tacLogicCheck.reason = `AI-Verified Legitimate: ${aiVerification.reason}`;
  tacLogicCheck.ai_override = true;
}
```

**Thresholds:**
- **FAIL override**: 70% confidence (cheating detected)
- **PASS override**: 80% confidence (legitimate implementation)

Higher threshold for PASS to avoid false positives.

## Testing AI Verification

Run the AI verification test suite:

```bash
# Set your API key
export OPENAI_API_KEY="sk-..."

# Run AI verification tests
node test-ai-verification.js
```

**Test Cases:**
1. ✅ Correct Implementation → Should PASS
2. ❌ Hardcoded Return → Should FAIL (AI detects)
3. ❌ Conditional Hardcoding → Should FAIL (AI detects)

**Expected Output:**
```
🤖 AI VERIFICATION (Secondary Judge):
   Verdict: CHEATING
   Confidence: 95%
   Reason: User code hardcodes return value 8 instead of computing a+b
   
   🚩 Cheating Indicators:
      • Hardcoded return value (return 8)
      • No arithmetic operations in user code
      • Parameter values not used in computation
   
   Recommendation: FAIL
   ⚡ AI OVERRODE TAC RESULT
```

## Cost Estimation

**OpenAI (gpt-4o-mini):**
- Input: $0.15 / 1M tokens
- Output: $0.60 / 1M tokens
- Avg per verification: ~1,000 tokens (~$0.001)
- **Cost per verification: ~$0.10 per 100 checks**

**Anthropic (claude-3-haiku):**
- Input: $0.25 / 1M tokens
- Output: $1.25 / 1M tokens
- Avg per verification: ~1,000 tokens (~$0.002)
- **Cost per verification: ~$0.20 per 100 checks**

**Recommendation:** Use gpt-4o-mini for cost-effective verification (50% cheaper than Haiku)

## Performance

- **Latency**: 1-3 seconds per AI verification
- **Invocation Rate**: Only when TAC is unclear (~10-20% of submissions)
- **Overall Impact**: Adds <1 second to 80-90% of submissions (no AI calls)

## Fallback Behavior

If AI verification fails or is disabled:

```javascript
// No API key configured
{
  ai_verification: {
    ai_used: false,
    reason: "AI verification disabled (no API key)"
  }
}

// API error
{
  ai_verification: {
    ai_used: false,
    error: "AI API request failed: timeout"
  }
}
```

System continues with TAC-only verification (no AI override).

## Advantages

1. **Catches Sophisticated Cheating**: Detects patterns TAC alone might miss
2. **High Accuracy**: 85%+ confidence on clear cheating cases
3. **Contextual Understanding**: Analyzes code intent, not just operations
4. **Automatic Triggering**: No manual intervention needed
5. **Detailed Reasoning**: Provides clear explanations for decisions

## Limitations

1. **Cost**: ~$0.001 per verification (negligible but not free)
2. **Latency**: Adds 1-3 seconds when invoked
3. **API Dependency**: Requires stable connection to OpenAI/Anthropic
4. **Rate Limits**: Subject to API provider rate limits
5. **False Positives**: AI may occasionally misjudge edge cases (low probability)

## Best Practices

1. **Set API Keys**: Always configure at least one AI provider
2. **Monitor Costs**: Track AI invocation rate and costs
3. **Review Overrides**: Periodically audit AI override decisions
4. **Test Coverage**: Use diverse test cases to validate AI accuracy
5. **Fallback Ready**: Ensure TAC verification works standalone

## Debugging

Enable detailed AI logs:

```bash
# In server.js, AI verification logs show:
[STEP 1A.5] TAC comparison unclear - invoking AI verifier...
[AI Verifier] Analyzing code with AI...
[AI Verifier] Analysis complete in 1.24s
[AI Verifier] Verdict: CHEATING
[AI Verifier] Confidence: 95%
[STEP 1A.5] AI Verdict: CHEATING
[STEP 1A.5] AI Confidence: 95%
[STEP 1A.5] AI Reason: User code hardcodes return value...
```

Check AI response structure:

```javascript
// Log full AI response for debugging
console.log('[AI Debug] Full response:', JSON.stringify(aiVerification, null, 2));
```

## Security Considerations

1. **API Keys**: Store in environment variables, never commit to git
2. **Code Exposure**: AI sees submitted code (use trusted AI providers)
3. **Rate Limiting**: Implement if needed to prevent API abuse
4. **Cost Controls**: Set budget alerts on AI provider dashboard

## Future Enhancements

- [ ] Add more AI providers (Google Gemini, Mistral, etc.)
- [ ] Implement caching for similar code patterns
- [ ] Add confidence calibration based on historical accuracy
- [ ] Support for custom AI prompts per problem type
- [ ] Multi-model consensus (query 2+ AIs, take majority vote)

---

**Summary**: AI verification adds a powerful secondary layer to catch sophisticated cheating patterns. It activates automatically when TAC analysis is insufficient, providing detailed reasoning and high-confidence verdicts with minimal latency and cost.
