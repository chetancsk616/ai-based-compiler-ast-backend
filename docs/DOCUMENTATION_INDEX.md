# 📚 Complete Documentation Index

**Code Verification System v2.1**  
**Last Updated:** February 16, 2026

---

## 🚀 Quick Start Guides

Start here if you're new to the system:

1. **[README.md](../README.md)** - Main entry point, installation, quick start
2. **[VERIFICATION_QUICKSTART.md](VERIFICATION_QUICKSTART.md)** - Get up and running in 5 minutes
3. **[AI_SETUP.md](AI_SETUP.md)** - Configure AI verification (Groq/OpenAI/Anthropic)
4. **[POSTMAN_GUIDE.txt](POSTMAN_GUIDE.txt)** - Test API with Postman

---

## 🤖 AI Verification System

Complete documentation on AI-powered cheating detection:

### Primary Documentation
- **[AI_PROMPTS_AND_CONFIGURATION.md](AI_PROMPTS_AND_CONFIGURATION.md)** ⭐ **START HERE**
  - System architecture
  - **Complete AI prompts** (exact text sent to LLMs)
  - Configuration options (Groq/OpenAI/Anthropic)
  - Confidence thresholds (60%, 85%)
  - Integration examples
  - Troubleshooting guide

### Human Review Flagging
- **[HUMAN_REVIEW_SYSTEM.md](HUMAN_REVIEW_SYSTEM.md)** ⭐ **IMPORTANT**
  - How flagging works
  - When code is flagged vs auto-failed
  - API response format
  - Integration with grading systems
  - Instructor dashboard examples

### Impact Analysis
- **[AI_INTEGRATION_IMPACT.md](AI_INTEGRATION_IMPACT.md)**
  - Before/after comparison (30% → 70% → 100% detection)
  - Visual progress bars
  - Performance metrics
  - Cost analysis
  - Language-specific improvements

---

## 📊 Test Results & Reports

Comprehensive test results showing system accuracy:

### Current Performance (v2.1)
- **Overall Accuracy:** 90% (27/30 tests)
- **Genuine Recognition:** 100% (no false positives)
- **Effective Cheating Detection:** 100% (auto-fail + flagged)
- **Logic Error Detection:** 90%

### Test Reports
1. **[AI_FOCUSED_RESULTS.md](AI_FOCUSED_RESULTS.md)** - 20 AI-specific tests
2. **[SIMPLE_TEST_RESULTS.md](SIMPLE_TEST_RESULTS.md)** - 30 comprehensive tests
3. **[REVIEW_FLAGGING_RESULTS.md](REVIEW_FLAGGING_RESULTS.md)** - Human review flagging tests
4. **[TEST_RESULTS_QUICKVIEW.md](TEST_RESULTS_QUICKVIEW.md)** - Visual summary
5. **[COMPREHENSIVE_TEST_DOCUMENTATION.md](COMPREHENSIVE_TEST_DOCUMENTATION.md)** - 30+ page detailed analysis

### Raw Test Data
- [`simple-test-results.json`](../tests/simple-test-results.json) - 30-test suite raw data
- [`ai-focused-results.json`](../tests/ai-focused-results.json) - AI-focused suite raw data
- [`review-flagging-results.json`](../tests/review-flagging-results.json) - Review flagging tests raw data

---

## 🔍 Verification System Details

Deep dive into how code verification works:

### Core Documentation
- **[CODE_VERIFICATION_GUIDE.md](CODE_VERIFICATION_GUIDE.md)** ⭐ **COMPREHENSIVE**
  - 4-layer verification system
  - TAC (Three-Address Code) analysis
  - AST (Abstract Syntax Tree) comparison
  - Logic correctness checking
  - Efficiency analysis

### Specific Topics
- **[SEMANTIC_EQUIVALENCE.md](SEMANTIC_EQUIVALENCE.md)**
  - How semantic equivalence is detected
  - Handling different coding styles
  - TAC/AST adjustment algorithms

- **[LANGUAGE_SUPPORT.md](LANGUAGE_SUPPORT.md)**
  - Supported languages (C, C++, Python, JavaScript, Java)
  - Language-specific features
  - TAC extraction quality by language

---

## 🛠️ Technical Implementation

For developers wanting to understand or extend the system:

### Service Architecture
```
services/
├── aiVerifier.js           # AI verification service (Groq/OpenAI/Anthropic)
├── tacLogicChecker.js      # TAC comparison and operation counting
├── llvmToTAC.js           # LLVM IR to TAC conversion
├── astParser.js           # Abstract Syntax Tree parsing
├── astComparer.js         # AST similarity comparison
├── codeNormalizer.js      # Semantic equivalence detection
├── localExecutor.js       # Local code execution (gcc/g++/python/node)
├── pistonService.js       # Piston API integration (fallback)
└── vulnerabilityDetector.js # Security vulnerability detection
```

### Key Components

#### 1. AI Verification (`services/aiVerifier.js`)
**Lines 15-28:** Constructor and config
**Lines 114-175:** **Complete AI prompt** (verbatim)
**Lines 208-287:** API implementations (OpenAI, Anthropic, Groq)

**Key Methods:**
- `verifyTACComparison()` - Main verification function
- `buildVerificationPrompt()` - Constructs AI prompt
- `callAI()` - Routes to appropriate provider
- `parseAIResponse()` - Parses JSON response

#### 2. Server Logic (`server.js`)
**Lines 356-421:** **Early AI Check (STEP 1A.5)**
- Trigger: TAC unclear or failed
- Action: Auto-fail (≥85%) or Flag (60-84%)

**Lines 540-585:** **Final AI Check (STEP 1A.6)**  
- Trigger: TAC passed without AI check
- Action: Flag if suspicious (≥60%)

**Lines 425-520:** TAC comparison and output verification
**Lines 587-710:** Efficiency, AST, performance analysis

#### 3. TAC Logic Checker (`services/tacLogicChecker.js`)
- Operation counting (add, sub, mul, div, etc.)
- Hardcoded value detection
- Operation type comparison
- Caching for performance

---

## 📖 Use Case Documentation

### For Educational Platforms
**Best Practices:**
1. Use `/api/verify` endpoint for all submissions
2. Auto-accept: `verdict === 'CORRECT' && !flagged_for_review`
3. Flag for review: `flagged_for_review === true`
4. Auto-reject: `verdict === 'INCORRECT'`

**Example:**
```javascript
if (response.data.flagged_for_review) {
  // Send to instructor queue
  await queueForReview(studentId, response.data.review_reason);
  return 'PENDING_REVIEW';
}
```

### For Coding Competitions
**Best Practices:**
1. Lower confidence thresholds (catch more cheating)
2. Run multiple test inputs
3. Monitor AI invocation rate
4. Log all suspicious submissions

### For Interview Platforms
**Best Practices:**
1. Use efficiency ratings (`efficiency_rating` field)
2. Show detailed TAC comparison to interviewers
3. Flag but don't auto-fail (let interviewer decide)
4. Provide AI analysis in feedback

---

## 🔧 Configuration Reference

### Environment Variables

```bash
# Server
PORT=3000
NODE_ENV=production

# AI Provider (choose one)
AI_PROVIDER=groq                    # 'groq', 'openai', 'anthropic'

# Groq (Recommended)
GROQ_API_KEY=gsk_your_key
GROQ_MODEL=llama-3.3-70b-versatile

# OpenAI (Alternative)
OPENAI_API_KEY=sk-your_key
AI_MODEL=gpt-4o-mini

# Anthropic (Alternative)
ANTHROPIC_API_KEY=sk-ant-your_key
AI_MODEL=claude-3-haiku-20240307
```

### Confidence Thresholds

**Location:** `server.js` lines 389-411, 569-573

```javascript
// Early AI Check (STEP 1A.5)
const AUTO_FAIL_THRESHOLD = 85;    // ≥85% confidence → INCORRECT
const FLAG_THRESHOLD = 60;         // 60-84% → Flag for review
const OVERRIDE_THRESHOLD = 80;     // ≥80% legitimate → CORRECT

// Final AI Check (STEP 1A.6)
const FINAL_FLAG_THRESHOLD = 60;   // ≥60% suspicious → Flag
```

**Tuning Guide:**
- **More strict** (catch more): Lower to 50%, 75%
- **Less strict** (fewer flags): Raise to 70%, 90%
- **Balanced** (default): 60%, 85%

---

## 🧪 Testing Documentation

### Test Suites

1. **AI-Focused Tests** (`test-ai-focused.js`)
   - 20 tests targeting AI verification
   - Focus on cheating patterns AI should catch
   - Run: `node test-ai-focused.js`

2. **Comprehensive Tests** (`test-simple-comprehensive.js`)
   - 30 tests covering all scenarios
   - Genuine, incorrect, cheating categories
   - Run: `node test-simple-comprehensive.js`

3. **Review Flagging Tests** (`test-review-flagging.js`)
   - 8 tests for human review system
   - Validates flagging vs auto-fail logic
   - Run: `node test-review-flagging.js`

4. **Extended Suite** (`test-extended-suite.js`)
   - 200 auto-generated tests
   - Comprehensive coverage
   - Run: `node test-extended-suite.js`

### Test Categories

**Genuine (10 tests):**
- Direct implementation
- Intermediate variables
- Different coding styles
- Expected: 100% pass rate

**Incorrect (10 tests):**
- Wrong operations
- Swapped operands
- Missing operands
- Expected: 90%+ detection

**Cheating (10 tests):**
- Hardcoded values
- Conditional hardcoding
- Pattern matching
- Expected: 100% detection (auto-fail + flagged)

---

## 🐛 Troubleshooting

### Common Issues

**AI Not Being Invoked:**
- Check: API key set in `.env`
- Check: Server logs for "AI Verifier ✅ Enabled"
- Solution: See [AI_PROMPTS_AND_CONFIGURATION.md](AI_PROMPTS_AND_CONFIGURATION.md#troubleshooting)

**Too Many False Positives:**
- Symptom: Legitimate code flagged
- Cause: Thresholds too low
- Solution: Raise to 70%, 90%

**Cheating Not Detected:**
- Symptom: Obvious cheating marked CORRECT
- Cause: Thresholds too high or AI not running
- Solution: Lower to 50%, 75% and verify AI is enabled

**API Timeout Errors:**
- Symptom: `error: "API timeout"`
- Cause: Network issues or large code samples
- Solution: Increase timeout to 60000ms

### Debug Mode

```bash
# Enable detailed logging
NODE_ENV=development node server.js

# Check specific endpoints
curl http://localhost:3000/ | jq .

# Test AI verification
node test-ai-focused.js
```

---

## 📈 Performance Metrics

### Current System (v2.1 with AI)

| Metric | Value | Target |
|--------|-------|--------|
| Overall Accuracy | 90% | ≥85% ✅ |
| Genuine Recognition | 100% | 100% ✅ |
| Effective Cheating Detection | 100% | ≥80% ✅ |
| Logic Error Detection | 90% | ≥85% ✅ |
| False Positives | 0% | <5% ✅ |
| Average Response Time | 3-5s | <10s ✅ |
| Cost per Verification | $0.001 | <$0.01 ✅ |

### Latency Breakdown

- Code Execution: 100-500ms
- TAC Extraction: 300-800ms
- TAC Comparison: 10-50ms
- **AI Verification: 1000-2000ms**
- Total (with AI): 3-5 seconds
- Total (no AI): 1-2 seconds

---

## 🚀 Deployment Guide

### Prerequisites
1. Node.js v14+
2. One of: gcc/g++, python, node, java
3. Groq/OpenAI/Anthropic API key

### Production Deployment

```bash
# 1. Install dependencies
npm install --production

# 2. Configure environment
cp .env.example .env
# Edit .env with your API keys

# 3. Start server
NODE_ENV=production node server.js

# 4. Verify
curl http://localhost:3000/
```

### Docker Deployment

```bash
# Build image
docker build -t code-verifier .

# Run container
docker run -p 3000:3000 \
  -e GROQ_API_KEY=your_key \
  -e AI_PROVIDER=groq \
  code-verifier
```

### Vercel/Railway/Heroku

See [`vercel.json`](../archive/vercel.json) and [`render.yaml`](../archive/render.yaml) for deployment configs.

**Important:** Set environment variables in platform dashboard:
- `GROQ_API_KEY`
- `AI_PROVIDER=groq`
- `GROQ_MODEL=llama-3.3-70b-versatile`

---

## 📝 API Quick Reference

### Main Endpoints

```bash
# Verify code (primary)
POST /api/verify
Body: { referenceCode: {...}, userCode: {...} }

# Execute code
POST /api/execute
Body: { language: "python", code: "..." }

# Get runtimes
GET /api/runtimes

# Health check
GET /
```

### Response Fields

**Key Fields:**
- `verdict`: "CORRECT" or "INCORRECT"
- `flagged_for_review`: true/false
- `review_reason`: Why flagged (if flagged)
- `efficiency_rating`: "OPTIMAL", "GOOD", "MODERATE", "INEFFICIENT"
- `analysis`: Detailed breakdown

**AI Fields:**
- `analysis.1_logic_correctness.ai_verification`
- `final_ai_verification`

---

## 🤝 Contributing

### Adding New Features

1. **New AI Provider:**
   - Add method to `services/aiVerifier.js`
   - Update configuration docs
   - Test with sample requests

2. **New Language Support:**
   - Add compiler/interpreter to `services/localExecutor.js`
   - Update TAC extraction if needed
   - Add test cases

3. **Custom Cheating Patterns:**
   - Update AI prompt in `services/aiVerifier.js` line 114
   - Add test cases to `test-ai-focused.js`
   - Document in [AI_PROMPTS_AND_CONFIGURATION.md](AI_PROMPTS_AND_CONFIGURATION.md)

---

## 📜 License & Credits

**System Version:** v2.1  
**Release Date:** February 16, 2026  
**Status:** Production Ready ✅

**Key Technologies:**
- Node.js + Express
- Groq API (llama-3.3-70b-versatile)
- Compiler Explorer API
- Local compilers (gcc, g++, python, node)

---

## 📞 Support & Resources

### Getting Help

1. **Check Documentation:** Start with relevant doc from this index
2. **Review Test Results:** See what's working in test reports
3. **Check Troubleshooting:** [AI_PROMPTS_AND_CONFIGURATION.md#troubleshooting](AI_PROMPTS_AND_CONFIGURATION.md#troubleshooting)
4. **Run Tests:** `node test-ai-focused.js` to verify setup

### Additional Resources

- **Groq API Docs:** https://console.groq.com/docs
- **Compiler Explorer:** https://godbolt.org
- **Test Suites:** `test-*.js` files
- **Example Payloads:** POSTMAN_GUIDE.txt

---

## 🗺️ Documentation Roadmap

### Priority 1: Start Here
1. [README.md](../README.md)
2. [AI_PROMPTS_AND_CONFIGURATION.md](AI_PROMPTS_AND_CONFIGURATION.md)
3. [HUMAN_REVIEW_SYSTEM.md](HUMAN_REVIEW_SYSTEM.md)

### Priority 2: Implementation
4. [CODE_VERIFICATION_GUIDE.md](CODE_VERIFICATION_GUIDE.md)
5. [AI_SETUP.md](AI_SETUP.md)
6. [VERIFICATION_QUICKSTART.md](VERIFICATION_QUICKSTART.md)

### Priority 3: Advanced Topics
7. [SEMANTIC_EQUIVALENCE.md](SEMANTIC_EQUIVALENCE.md)
8. [LANGUAGE_SUPPORT.md](LANGUAGE_SUPPORT.md)
9. [COMPREHENSIVE_TEST_DOCUMENTATION.md](COMPREHENSIVE_TEST_DOCUMENTATION.md)

### Priority 4: Results & Reports
10. [AI_INTEGRATION_IMPACT.md](AI_INTEGRATION_IMPACT.md)
11. [TEST_RESULTS_QUICKVIEW.md](TEST_RESULTS_QUICKVIEW.md)
12. Test reports (AI_FOCUSED_RESULTS.md, etc.)

---

**Last Updated:** February 16, 2026  
**Version:** 2.1  
**Total Documentation Pages:** 15+ documents, 200+ pages  
**Status:** Complete ✅
