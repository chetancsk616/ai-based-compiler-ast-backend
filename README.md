# Code Execution and Verification Backend

**Version:** 2.1 (with AI Verification & Human Review Flagging)  
**Last Updated:** February 16, 2026

> 📚 **[Complete Documentation Index](docs/DOCUMENTATION_INDEX.md)** - All documentation organized by topic

A sophisticated Node.js backend API for executing and verifying code submissions with AI-powered cheating detection. Perfect for educational platforms, coding competitions, and automated grading systems.

## 🎯 Key Features

### ✅ Local Code Execution (Primary)
- Uses local compilers/interpreters for accurate performance measurements
- Supports: **C** (gcc), **C++** (g++), **Python** (python), **JavaScript** (node), **Java** (javac/java)
- No network latency - consistent execution times
- Automatic fallback to Piston API if local tools unavailable

### 🤖 AI-Powered Verification (NEW!)
- **Multi-provider support:** Groq, OpenAI, Anthropic
- **Cheating detection:** Hardcoded values, conditional patterns, input-specific logic
- **Human review flagging:** Suspicious cases flagged instead of auto-failed
- **Confidence-based decisions:** Different actions based on AI confidence (60%, 85% thresholds)
- **Fast & cost-effective:** 1-2s latency, ~$0.001 per verification

### 🔍 4-Layer Code Verification
1. **Logic Correctness** (TAC + AI)
   - TAC operation comparison
   - AI verification for unclear cases
   - Hardcoded value detection
   
2. **Code Efficiency** (TAC-based)
   - LLVM IR to TAC conversion
   - Instruction counting
   - Operation complexity analysis
   
3. **Structural Similarity** (AST-based)
   - Tree-sitter parsing (v0.21.x)
   - Control flow analysis
   - Pattern detection
   
4. **Performance Comparison**
   - Execution time measurement
   - Memory usage analysis
   - Optimization detection

### 📊 Verification Metrics
- **Overall Accuracy:** 90% (27/30 tests)
- **Genuine Recognition:** 100% (no false positives)
- **Effective Cheating Detection:** 100% (auto-fail + flagged)
- **Logic Error Detection:** 90%

### 🚀 Additional Features
- RESTful API endpoints
- Built with Express.js
- CORS enabled
- Security headers with Helmet
- Comprehensive logging
- Error handling and recovery

## Prerequisites

### Required
- Node.js (v14 or higher)
- npm or yarn

### Optional - Local Compilers (for better performance)
- **C/C++**: gcc, g++ (MinGW on Windows, gcc on Linux/Mac)
- **Python**: Python 3.x
- **JavaScript**: Node.js (already required)
- **Java**: JDK 8+ (javac and java)

*Without these, the system automatically falls back to Piston API.*

### Optional - AI Verification (Recommended)
- **Groq API Key** (recommended - fast & cheap)
- **OpenAI API Key** (alternative)
- **Anthropic API Key** (alternative)

*Without AI, verification relies on TAC comparison only (still functional but less accurate).*

## Installation

1. Clone or navigate to the project directory:
```bash
cd "c:\Users\cheta\compiler from scratch"
```

2. Install dependencies:
```bash
npm install
```

3. Configure environment variables:

**Create or edit `.env` file:**
```bash
# Server Configuration
PORT=3000
NODE_ENV=development

# AI Verification (Choose one provider)
AI_PROVIDER=groq                    # Options: 'groq', 'openai', 'anthropic'

# Groq (Recommended - Fast & Cheap)
GROQ_API_KEY=gsk_your_api_key_here
GROQ_MODEL=llama-3.3-70b-versatile

# OR OpenAI
# OPENAI_API_KEY=sk-your_api_key_here
# AI_MODEL=gpt-4o-mini

# OR Anthropic
# ANTHROPIC_API_KEY=sk-ant-your_api_key_here
# AI_MODEL=claude-3-haiku-20240307
```

**Get API Keys:**
- **Groq:** https://console.groq.com/keys (Recommended)
- **OpenAI:** https://platform.openai.com/api-keys
- **Anthropic:** https://console.anthropic.com/account/keys

## Quick Start

### 1. Start the Server
```bash
# Development mode (with auto-reload)
npm run dev

# Production mode
npm start
```

Server starts on `http://localhost:3000`

### 2. Test the API

**Simple verification test:**
```bash
curl -X POST http://localhost:3000/api/verify \
  -H "Content-Type: application/json" \
  -d '{
    "referenceCode": {
      "language": "cpp",
      "code": "#include <iostream>\nint add(int a, int b) { return a + b; }\nint main() { std::cout << add(5, 3); return 0; }"
    },
    "userCode": {
      "language": "cpp",
      "code": "#include <iostream>\nint add(int a, int b) { return a + b; }\nint main() { std::cout << add(5, 3); return 0; }"
    }
  }'
```

**Expected response:**
```json
{
  "success": true,
  "verdict": "CORRECT",
  "flagged_for_review": false,
  "efficiency_rating": "OPTIMAL",
  "analysis": { ... }
}
```

### 3. Run Tests

```bash
# Quick AI-focused tests (20 tests)
node test-ai-focused.js

# Comprehensive tests (30 tests)
node test-simple-comprehensive.js

# Review flagging tests (8 tests)
node test-review-flagging.js
```

## Running the Server

### Development Mode (with auto-reload):
```bash
npm run dev
```

### Production Mode:
```bash
npm start
```

The server will start on `http://localhost:3000` (or the port specified in `.env`)

**Verify AI is enabled:**
Check server logs for:
```
[AI Verifier] ✅ Enabled with provider: groq, model: llama-3.3-70b-versatile
```

## API Endpoints

### 1. Verify Code (Primary Endpoint)
```
POST /api/verify
```

**Purpose:** Compare user code against reference solution with AI-powered verification

**Request Body:**
```json
{
  "referenceCode": {
    "language": "cpp",
    "code": "#include <iostream>\nint add(int a, int b) { return a + b; }\nint main() { std::cout << add(5, 3); return 0; }"
  },
  "userCode": {
    "language": "cpp",
    "code": "#include <iostream>\nint add(int a, int b) { return a + b; }\nint main() { std::cout << add(5, 3); return 0; }"
  },
  "testInputs": []
}
```

**Response (Correct, Clean):**
```json
{
  "success": true,
  "verdict": "CORRECT",
  "flagged_for_review": false,
  "efficiency_rating": "OPTIMAL",
  "analysis": {
    "1_logic_correctness": {
      "passed": true,
      "tac_logic": { ... },
      "output_verification": { ... },
      "ai_verification": { "ai_used": false }
    },
    "2_code_efficiency": { ... },
    "3_structural_similarity": { ... },
    "4_performance": { ... }
  }
}
```

**Response (Flagged for Review):**
```json
{
  "success": true,
  "verdict": "CORRECT",
  "flagged_for_review": true,
  "review_reason": "AI detected potential cheating (80% confidence): Conditional hardcoding detected",
  "final_ai_verification": {
    "verdict": "SUSPICIOUS",
    "confidence": 80,
    "reason": "Conditional hardcoding detected",
    "cheating_indicators": ["Conditional logic based on exact input values"],
    "recommendation": "REVIEW_MANUALLY"
  },
  "analysis": { ... }
}
```

**Response (Incorrect/Cheating):**
```json
{
  "success": true,
  "verdict": "INCORRECT",
  "flagged_for_review": false,
  "failure_reason": "TAC_LOGIC_MISMATCH",
  "message": "...",
  "ai_analysis": {
    "verdict": "CHEATING",
    "confidence": 95,
    "reason": "Hardcoded return value detected",
    "cheating_indicators": ["No actual computation performed"]
  }
}
```

### 2. Health Check
```
GET /
```

**Response:**
```json
{
  "message": "Code Execution and Verification API",
  "version": "2.1.0",
  "features": {
    "code_execution": true,
    "logic_verification": true,
    "ai_verification": true,
    "tac_analysis": true,
    "ast_analysis": true,
    "performance_comparison": true
  },
  "endpoints": {
    "verify": "POST /api/verify - Verify user code against reference solution",
    "execute": "POST /api/execute - Execute single program",
    "compare": "POST /api/compare - Compare two programs",
    "runtimes": "GET /api/runtimes - Get available runtimes"
  }
}
```

### 3. Get Available Runtimes
```
GET /api/runtimes
```

**Response:**
```json
{
  "success": true,
  "runtimes": [...]
}
```

### 4. Execute Code (Single Execution)
```
POST /api/execute
```

**Request Body:**
```json
{
  "language": "python",
  "code": "print('Hello, World!')",
  "stdin": "",
  "args": []
}
```

**Supported Languages:**
- `python` - Python 3.10.0
- `c` - C (GCC 10.2.0)
- `cpp` - C++ (GCC 10.2.0)
- `java` - Java 15.0.2
- `javascript` / `js` - Node.js

**Response:**
```json
{
  "success": true,
  "language": "python",
  "version": "3.10.0",
  "output": {
    "stdout": "Hello, World!\n",
    "stderr": "",
    "code": 0
  }
}
```

## 📚 Documentation

### Core Documentation
- **[AI_PROMPTS_AND_CONFIGURATION.md](docs/AI_PROMPTS_AND_CONFIGURATION.md)** - Complete AI system documentation with prompts, configuration, and integration guide
- **[HUMAN_REVIEW_SYSTEM.md](docs/HUMAN_REVIEW_SYSTEM.md)** - Human review flagging system details
- **[CODE_VERIFICATION_GUIDE.md](docs/CODE_VERIFICATION_GUIDE.md)** - Comprehensive verification system guide
- **[AI_INTEGRATION_IMPACT.md](docs/AI_INTEGRATION_IMPACT.md)** - Before/after analysis of AI integration

### Test Results & Reports
- **[AI_FOCUSED_RESULTS.md](docs/AI_FOCUSED_RESULTS.md)** - AI-focused test suite results (20 tests)
- **[SIMPLE_TEST_RESULTS.md](docs/SIMPLE_TEST_RESULTS.md)** - Comprehensive test results (30 tests)
- **[REVIEW_FLAGGING_RESULTS.md](docs/REVIEW_FLAGGING_RESULTS.md)** - Human review flagging test results
- **[TEST_RESULTS_QUICKVIEW.md](docs/TEST_RESULTS_QUICKVIEW.md)** - Visual summary with progress bars
- **[COMPREHENSIVE_TEST_DOCUMENTATION.md](docs/COMPREHENSIVE_TEST_DOCUMENTATION.md)** - 30+ page detailed analysis

### Quick Guides
- **[AI_SETUP.md](docs/AI_SETUP.md)** - Quick AI setup instructions
- **[POSTMAN_GUIDE.txt](docs/POSTMAN_GUIDE.txt)** - API testing with Postman
- **[VERIFICATION_QUICKSTART.md](docs/VERIFICATION_QUICKSTART.md)** - Quick start for verification
- **[SEMANTIC_EQUIVALENCE.md](docs/SEMANTIC_EQUIVALENCE.md)** - Semantic analysis details
- **[LANGUAGE_SUPPORT.md](docs/LANGUAGE_SUPPORT.md)** - Language-specific features

## 💡 Use Cases

### Educational Platforms
- Automated homework grading
- Plagiarism detection
- Coding assignment verification
- Student progress tracking

### Coding Competitions
- Real-time code evaluation
- Anti-cheating measures
- Performance benchmarking
- Multi-language support

### Interview Platforms
- Technical assessment
- Code quality analysis
- Solution verification
- Efficiency scoring

### Learning Management Systems
- Assignment auto-grading
- Instructor review queue
- Detailed feedback generation
- Progress analytics

## 🔧 Integration Examples

### Auto-Grading System
```javascript
const axios = require('axios');

async function gradeAssignment(studentCode, problemId) {
  const reference = await getReferenceCode(problemId);
  
  const response = await axios.post('http://localhost:3000/api/verify', {
    referenceCode: reference,
    userCode: studentCode
  });
  
  if (response.data.verdict === 'CORRECT') {
    if (response.data.flagged_for_review) {
      return { status: 'PENDING_REVIEW', points: 0 };
    }
    return { status: 'ACCEPTED', points: 100 };
  } else {
    return { status: 'REJECTED', points: 0 };
  }
}
```

### Instructor Dashboard
```javascript
async function getReviewQueue(instructorId) {
  const flagged = await db.submissions.find({
    status: 'PENDING_REVIEW',
    instructor_id: instructorId
  });
  
  return flagged.map(sub => ({
    studentId: sub.student_id,
    reviewReason: sub.review_reason,
    aiConfidence: sub.ai_confidence,
    cheatingIndicators: sub.cheating_indicators
  }));
}
```

## Example Usage

### Python Example:
```bash
curl -X POST http://localhost:3000/api/execute \
  -H "Content-Type: application/json" \
  -d '{
    "language": "python",
    "code": "print(\"Hello, World!\")"
  }'
```

### C Example:
```bash
curl -X POST http://localhost:3000/api/execute \
  -H "Content-Type: application/json" \
  -d '{
    "language": "c",
    "code": "#include <stdio.h>\nint main() {\n    printf(\"Hello, World!\\n\");\n    return 0;\n}"
  }'
```

### C++ Example:
```bash
curl -X POST http://localhost:3000/api/execute \
  -H "Content-Type: application/json" \
  -d '{
    "language": "cpp",
    "code": "#include <iostream>\nint main() {\n    std::cout << \"Hello, World!\" << std::endl;\n    return 0;\n}"
  }'
```

### Java Example:
```bash
curl -X POST http://localhost:3000/api/execute \
  -H "Content-Type: application/json" \
  -d '{
    "language": "java",
    "code": "public class Main {\n    public static void main(String[] args) {\n        System.out.println(\"Hello, World!\");\n    }\n}"
  }'
```

## Deployment

### Deploy to Heroku

1. Install Heroku CLI
2. Login to Heroku:
```bash
heroku login
```

3. Create a new Heroku app:
```bash
heroku create your-app-name
```

4. Deploy:
```bash
git init
git add .
git commit -m "Initial commit"
git push heroku main
```

### Deploy to Railway

1. Install Railway CLI or use the web interface
2. Run:
```bash
railway init
railway up
```

### Deploy to Render

1. Create a new Web Service on Render
2. Connect your repository
3. Set the following:
   - Build Command: `npm install`
   - Start Command: `npm start`

### Deploy to Vercel

1. Install Vercel CLI:
```bash
npm i -g vercel
```

2. Deploy:
```bash
vercel
```

### Deploy to DigitalOcean App Platform

1. Push your code to GitHub
2. Create a new App in DigitalOcean
3. Connect your repository
4. Configure:
   - Build Command: `npm install`
   - Run Command: `npm start`

## Environment Variables for Deployment

Set these environment variables on your deployment platform:

- `PORT` - Port number (usually set automatically)
- `NODE_ENV` - Set to `production`
- `PISTON_API_URL` - (Optional) Default: `https://emkc.org/api/v2/piston`

## Security Considerations

- Rate limiting is not implemented - consider adding it for production
- Input validation is basic - enhance as needed
- Consider adding authentication for production use
- The API accepts code from clients - ensure proper security measures

## License

ISC
