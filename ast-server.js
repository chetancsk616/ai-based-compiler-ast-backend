require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { ASTParser } = require('./services/astParser');
const { ASTComparer } = require('./services/astComparer');

const app = express();
const PORT = process.env.AST_PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Health check
app.get('/', (req, res) => {
  res.json({
    service: 'AST Analysis Microservice',
    status: 'running',
    version: '1.0.0'
  });
});

// AST comparison endpoint
app.post('/ast/compare', async (req, res) => {
  try {
    const { programA, programB } = req.body;

    if (!programA || !programB) {
      return res.status(400).json({
        success: false,
        error: 'Both programA and programB are required'
      });
    }

    const astParser = new ASTParser();
    const astComparer = new ASTComparer();

    const treeA = astParser.parse(programA.language, programA.code);
    const treeB = astParser.parse(programB.language, programB.code);

    const featuresA = astParser.extractFeatures(treeA);
    const featuresB = astParser.extractFeatures(treeB);

    const comparison = astComparer.compare(featuresA, featuresB);

    res.json({
      success: true,
      comparison: comparison
    });
  } catch (error) {
    console.error('AST comparison error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.listen(PORT, () => {
  console.log(`AST Analysis Service running on port ${PORT}`);
});

module.exports = app;
