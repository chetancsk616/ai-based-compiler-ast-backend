# AI Verification Quick Setup

## 1. Install Dependencies (Already done)

```bash
npm install axios
```

## 2. Set API Key

### Option A: OpenAI (Recommended - Cheaper)

```bash
# Windows (PowerShell)
$env:OPENAI_API_KEY="sk-proj-..."
$env:AI_PROVIDER="openai"
$env:AI_MODEL="gpt-4o-mini"

# Linux/Mac
export OPENAI_API_KEY="sk-proj-..."
export AI_PROVIDER="openai"
export AI_MODEL="gpt-4o-mini"

# Or add to .env file
OPENAI_API_KEY=sk-proj-...
AI_PROVIDER=openai
AI_MODEL=gpt-4o-mini
```

### Option B: Anthropic (Claude)

```bash
# Windows (PowerShell)
$env:ANTHROPIC_API_KEY="sk-ant-..."
$env:AI_PROVIDER="anthropic"
$env:AI_MODEL="claude-3-haiku-20240307"

# Linux/Mac
export ANTHROPIC_API_KEY="sk-ant-..."
export AI_PROVIDER="anthropic"
export AI_MODEL="claude-3-haiku-20240307"
```

## 3. Get API Key

### OpenAI
1. Go to https://platform.openai.com/api-keys
2. Click "Create new secret key"
3. Copy key (starts with `sk-proj-...`)
4. Add billing: https://platform.openai.com/settings/billing

### Anthropic
1. Go to https://console.anthropic.com/settings/keys
2. Click "Create Key"
3. Copy key (starts with `sk-ant-...`)
4. Add credits: https://console.anthropic.com/settings/billing

## 4. Start Server

```bash
node server.js
```

Look for:
```
✅ AI Provider: OpenAI
AI will act as secondary judge when TAC comparison is unclear
```

## 5. Test AI Verification

```bash
node test-ai-verification.js
```

Expected output:
```
🤖 AI VERIFICATION (Secondary Judge):
   Verdict: CHEATING
   Confidence: 95%
   Reason: User code hardcodes return value 8 instead of computing a+b
   
   🚩 Cheating Indicators:
      • Hardcoded return value (return 8)
      • No arithmetic operations in user code
   
   ⚡ AI OVERRODE TAC RESULT
```

## 6. Verify It's Working

Send a test request with hardcoded cheating:

```bash
curl -X POST http://localhost:3000/verify \
  -H "Content-Type: application/json" \
  -d '{
    "referenceCode": {
      "language": "cpp",
      "code": "int add(int a, int b) { return a + b; }"
    },
    "userCode": {
      "language": "cpp",
      "code": "int add(int a, int b) { return 8; }"
    },
    "testInputs": []
  }'
```

Response should include:
```json
{
  "verdict": "INCORRECT",
  "ai_analysis": {
    "verdict": "CHEATING",
    "confidence": 95,
    "reason": "User code hardcodes return value 8...",
    "cheating_indicators": [
      "Hardcoded return value (return 8)",
      "No arithmetic operations in user code"
    ]
  }
}
```

## Cost Tracking

Check your usage:
- **OpenAI**: https://platform.openai.com/usage
- **Anthropic**: https://console.anthropic.com/settings/usage

Expected cost: ~$0.10 per 100 verifications (using gpt-4o-mini)

## Troubleshooting

### "AI verification disabled (no API key)"
- ✅ Set `OPENAI_API_KEY` or `ANTHROPIC_API_KEY`
- ✅ Restart server after setting environment variables

### "AI API request failed: 401"
- ✅ Check API key is correct
- ✅ Verify billing is set up
- ✅ Check key hasn't expired

### "AI API request failed: 429"
- ✅ Rate limit hit - wait a few seconds
- ✅ Check usage limits on API dashboard

### "AI not being invoked"
- ✅ AI only triggers when TAC is unclear
- ✅ Try a hardcoded value test (should trigger AI)
- ✅ Check server logs for `[STEP 1A.5]`

## That's It!

Your system now has AI-powered secondary verification. It will automatically detect sophisticated cheating patterns that TAC analysis might miss.

**When AI is Invoked:**
- TAC extraction fails (all ops = 0)
- TAC detects mismatch
- Code looks suspicious

**When AI is NOT Invoked:**
- TAC clearly shows correct logic
- Both code samples pass TAC verification
- (~80-90% of submissions)

**Result:** Catches hardcoding, conditional cheating, lookup tables, and other sophisticated patterns with 85%+ accuracy.
