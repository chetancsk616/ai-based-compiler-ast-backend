# 📁 Project Structure

**Code Verification System v2.1**  
**Last Updated:** February 16, 2026

---

## Directory Organization

```
compiler from scratch/
│
├── 📄 README.md                    # Main documentation & quick start
├── 📄 package.json                 # Node.js dependencies
├── 📄 server.js                    # Main API server
├── 📄 docker-compose.yml           # Docker configuration
├── 📄 Dockerfile                   # Docker build
│
├── 📁 services/                    # Core verification services
│   ├── aiVerifier.js              # AI-powered verification
│   ├── astComparer.js             # AST comparison
│   ├── astParser.js               # Code parsing
│   ├── codeNormalizer.js          # Code normalization
│   ├── llvmToTAC.js               # LLVM IR to TAC conversion
│   ├── localExecutor.js           # Local code execution
│   ├── pistonService.js           # Piston API integration
│   ├── simpleIRExtractor.js       # IR extraction
│   └── tacComparer.js             # TAC comparison
│
├── 📁 docs/                        # 📚 All Documentation (20+ files)
│   ├── DOCUMENTATION_INDEX.md     # ⭐ START HERE - Complete guide
│   │
│   ├── 🤖 AI & Verification
│   │   ├── AI_PROMPTS_AND_CONFIGURATION.md
│   │   ├── AI_USAGE_REFERENCE.md
│   │   ├── AI_SETUP.md
│   │   ├── AI_VERIFICATION.md
│   │   ├── HUMAN_REVIEW_SYSTEM.md
│   │   └── CODE_VERIFICATION_GUIDE.md
│   │
│   ├── 📊 Test Results
│   │   ├── AI_FOCUSED_RESULTS.md
│   │   ├── SIMPLE_TEST_RESULTS.md
│   │   ├── REVIEW_FLAGGING_RESULTS.md
│   │   ├── TEST_RESULTS_QUICKVIEW.md
│   │   ├── COMPREHENSIVE_TEST_DOCUMENTATION.md
│   │   └── TEST_STRATEGY.md
│   │
│   ├── 📖 Guides & References
│   │   ├── VERIFICATION_QUICKSTART.md
│   │   ├── POSTMAN_GUIDE.txt
│   │   ├── LANGUAGE_SUPPORT.md
│   │   ├── SEMANTIC_EQUIVALENCE.md
│   │   ├── BACKEND_DOCUMENTATION.md
│   │   └── AI_INTEGRATION_IMPACT.md
│   │
│
├── 📁 tests/                       # 🧪 All Test Files (25+ files)
│   ├── Test Scripts (JavaScript)
│   │   ├── test-simple-comprehensive.js
│   │   ├── test-review-flagging.js
│   │   ├── test-ai-focused.js
│   │   ├── test-ai-verification.js
│   │   ├── test-verify.js
│   │   ├── test-runner-comprehensive.js
│   │   └── ... (more test scripts)
│   │
│   ├── Test Data (JSON)
│   │   ├── test-cases-comprehensive.json
│   │   ├── test-cpp.json
│   │   ├── test-python.json
│   │   ├── test-java.json
│   │   ├── test-javascript.json
│   │   └── ... (more test data)
│   │
│   └── Test Results (JSON)
│       ├── simple-test-results.json
│       ├── ai-focused-results.json
│       └── review-flagging-results.json
│
├── 📁 archive/                     # 🗄️ Unused/Alternative Files
│   ├── ast-server.js              # Old server implementation
│   ├── vercel.json                # Vercel deployment config
│   └── render.yaml                # Render deployment config
│
└── 📁 piston/                      # Piston API fallback
```

---

## Quick Access

### 🚀 Getting Started
1. **[README.md](README.md)** - Installation & quick start
2. **[docs/DOCUMENTATION_INDEX.md](docs/DOCUMENTATION_INDEX.md)** - Complete documentation guide
3. **[docs/AI_SETUP.md](docs/AI_SETUP.md)** - Configure AI verification

### 🤖 Understanding AI Verification
- **[docs/AI_PROMPTS_AND_CONFIGURATION.md](docs/AI_PROMPTS_AND_CONFIGURATION.md)** - Complete AI system guide
- **[docs/AI_USAGE_REFERENCE.md](docs/AI_USAGE_REFERENCE.md)** - Quick reference with line numbers
- **[docs/HUMAN_REVIEW_SYSTEM.md](docs/HUMAN_REVIEW_SYSTEM.md)** - Flagging system details

### 🧪 Testing
- **[tests/test-simple-comprehensive.js](tests/test-simple-comprehensive.js)** - Run 30-test suite
- **[tests/test-review-flagging.js](tests/test-review-flagging.js)** - Test flagging system
- **[docs/TEST_STRATEGY.md](docs/TEST_STRATEGY.md)** - Testing approach

### 📊 Performance Results
- **[docs/SIMPLE_TEST_RESULTS.md](docs/SIMPLE_TEST_RESULTS.md)** - 30-test comprehensive results
- **[docs/AI_FOCUSED_RESULTS.md](docs/AI_FOCUSED_RESULTS.md)** - 20 AI-specific tests
- **[docs/TEST_RESULTS_QUICKVIEW.md](docs/TEST_RESULTS_QUICKVIEW.md)** - Visual summary

---

## Core Services

### services/aiVerifier.js
**Lines 114-175:** Complete AI prompt  
**Lines 208-287:** OpenAI/Anthropic/Groq API implementations  
**Purpose:** AI-powered cheating detection

### services/tacComparer.js
**Purpose:** TAC operation comparison for logic verification

### services/astComparer.js
**Purpose:** AST-based structural similarity analysis

### services/localExecutor.js
**Purpose:** Execute code locally with compilers/interpreters

---

## Running Tests

### Quick Test
```bash
# From root directory
node tests/test-simple-comprehensive.js
```

### Flagging System Test
```bash
node tests/test-review-flagging.js
```

### AI Verification Test
```bash
node tests/test-ai-focused.js
```

---

## Environment Setup

**File:** `.env`

```bash
# Required
PORT=3000

# AI Configuration (at least one provider required)
AI_PROVIDER=groq                                                  # or 'openai' or 'anthropic'
GROQ_API_KEY=your_groq_api_key_here                              # Recommended
GROQ_MODEL=llama-3.3-70b-versatile

# Alternative providers
# OPENAI_API_KEY=your_openai_key_here
# AI_MODEL=gpt-4o-mini

# ANTHROPIC_API_KEY=your_anthropic_key_here
# AI_MODEL=claude-3-haiku-20240307
```

---

## Documentation Statistics

- **Total Documentation Files:** 20+
- **Total Pages:** 200+
- **Test Files:** 25+
- **Service Files:** 9
- **Core Languages:** C, C++, Python, JavaScript, Java

---

## Key Features

✅ **Local Code Execution** - No network latency  
✅ **AI-Powered Verification** - 90% accuracy  
✅ **Human Review Flagging** - 100% effective detection  
✅ **Multi-Language Support** - 5 languages  
✅ **TAC-Based Analysis** - Compiler-level verification  
✅ **AST Comparison** - Structural analysis  
✅ **Performance Metrics** - Execution time & memory  

---

## Support

- **Issues:** Check [docs/DOCUMENTATION_INDEX.md](docs/DOCUMENTATION_INDEX.md) troubleshooting section
- **Configuration:** See [docs/AI_SETUP.md](docs/AI_SETUP.md)
- **Testing:** See [docs/TEST_STRATEGY.md](docs/TEST_STRATEGY.md)
- **API:** See [docs/POSTMAN_GUIDE.txt](docs/POSTMAN_GUIDE.txt)

---

**Project Status:** Production-ready  
**Version:** 2.1  
**Maintainer:** Code Verification System Team
