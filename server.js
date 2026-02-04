require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const axios = require('axios');
const { executeCode, getRuntimes } = require('./services/pistonService');
const { LLVMToTACConverter } = require('./services/llvmToTAC');

// Try to load AST parsers (may not be available on serverless platforms)
let ASTParser, ASTComparer, astAvailable = false;
try {
  ASTParser = require('./services/astParser').ASTParser;
  ASTComparer = require('./services/astComparer').ASTComparer;
  astAvailable = true;
  console.log('✓ AST parsing available locally');
} catch (error) {
  console.log('⚠ AST parsing unavailable locally (checking for remote AST service)');
}

const AST_SERVICE_URL = process.env.AST_SERVICE_URL || 'http://localhost:3001';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Health check endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Code Execution API is running',
    version: '1.0.0',
    endpoints: {
      execute: 'POST /api/execute',
      runtimes: 'GET /api/runtimes'
    }
  });
});

// Get available runtimes
app.get('/api/runtimes', async (req, res) => {
  try {
    const result = await getRuntimes();
    
    if (result.success) {
      res.json({
        success: true,
        runtimes: result.data
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch runtimes'
    });
  }
});

// Execute code endpoint
app.post('/api/execute', async (req, res) => {
  try {
    const { language, code, stdin, args } = req.body;

    console.log('Received execute request for language:', language);

    // Validation
    if (!language) {
      return res.status(400).json({
        success: false,
        error: 'Language is required'
      });
    }

    if (!code) {
      return res.status(400).json({
        success: false,
        error: 'Code is required'
      });
    }

    // Execute code
    console.log('Calling executeCode...');
    const result = await executeCode(language, code, stdin, args);
    console.log('Got result:', result.success ? 'SUCCESS' : 'FAIL');

    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error('Error executing code:', error);
    console.error('Stack:', error.stack);
    res.status(500).json({
      success: false,
      error: 'Internal server error: ' + error.message
    });
  }
});

// Compare two programs endpoint
app.post('/api/compare', async (req, res) => {
  try {
    const { programA, programB } = req.body;

    // Validation
    if (!programA || !programA.language || !programA.code) {
      return res.status(400).json({
        success: false,
        error: 'Program A requires language and code'
      });
    }

    if (!programB || !programB.language || !programB.code) {
      return res.status(400).json({
        success: false,
        error: 'Program B requires language and code'
      });
    }

    console.log('Comparing programs...');

    // Execute both programs
    const resultA = await executeCode(programA.language, programA.code);
    const resultB = await executeCode(programB.language, programB.code);

    if (!resultA.success || !resultB.success) {
      return res.status(400).json({
        success: false,
        error: 'Failed to execute one or both programs',
        programA: resultA,
        programB: resultB
      });
    }

    // TAC-based comparison
    const tacConverter = new LLVMToTACConverter();
    const tacComparison = tacConverter.compare(
      resultA.tac || [],
      resultB.tac || []
    );

    // AST-based comparison (try local first, then remote service)
    let astComparison = null;
    
    if (astAvailable) {
      // Use local AST parsing
      try {
        const astParser = new ASTParser();
        const astComparer = new ASTComparer();

        const treeA = astParser.parse(programA.language, programA.code);
        const treeB = astParser.parse(programB.language, programB.code);

        const featuresA = astParser.extractFeatures(treeA);
        const featuresB = astParser.extractFeatures(treeB);

        astComparison = astComparer.compare(featuresA, featuresB);
        astComparison.source = 'local';
      } catch (error) {
        console.error('Local AST comparison failed:', error.message);
        astComparison = { 
          error: error.message,
          available: false
        };
      }
    } else {
      // Try remote AST service
      try {
        const response = await axios.post(`${AST_SERVICE_URL}/ast/compare`, {
          programA: { language: programA.language, code: programA.code },
          programB: { language: programB.language, code: programB.code }
        }, { timeout: 10000 });
        
        if (response.data.success) {
          astComparison = response.data.comparison;
          astComparison.source = 'remote';
          console.log('✓ AST comparison via remote service');
        }
      } catch (error) {
        console.log('✗ Remote AST service unavailable');
        astComparison = {
          available: false,
          message: "AST parsing unavailable - native bindings not supported in serverless environment. Deploy with Docker or run locally for AST analysis.",
          timestamp: new Date().toISOString()
        };
      }
    }

    res.json({
      success: true,
      programA: {
        language: resultA.language,
        instruction_count: resultA.instruction_count,
        tac: resultA.tac
      },
      programB: {
        language: resultB.language,
        instruction_count: resultB.instruction_count,
        tac: resultB.tac
      },
      comparison: {
        tac_based: tacComparison,
        ast_based: astComparison
      }
    });
  } catch (error) {
    console.error('Error comparing programs:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error: ' + error.message
    });
  }
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found'
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    success: false,
    error: err.message || 'Internal server error'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = app;
