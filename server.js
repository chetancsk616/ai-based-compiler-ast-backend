require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const axios = require('axios');
const { executeCode, extractTAC, getRuntimes } = require('./services/pistonService');
const { LLVMToTACConverter } = require('./services/llvmToTAC');
const { CodeNormalizer } = require('./services/codeNormalizer');
const { VulnerabilityDetector } = require('./services/vulnerabilityDetector');
const { TACLogicChecker } = require('./services/tacLogicChecker');
const { AIVerifier } = require('./services/aiVerifier');

// Try to load AST parsers (may not be available on serverless platforms)
let ASTParser, ASTComparer, astAvailable = false;
try {
  const astParserModule = require('./services/astParser');
  ASTParser = astParserModule.ASTParser;
  ASTComparer = require('./services/astComparer').ASTComparer;
  astAvailable = astParserModule.isAvailable;
  if (astAvailable) {
    console.log('✓ AST parsing available locally');
  } else {
    console.log('⚠ AST parsing temporarily disabled - tree-sitter compatibility issue');
  }
} catch (error) {
  console.log('⚠ AST parsing unavailable locally:', error.message);
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
    message: 'Code Execution and Verification API',
    version: '2.0.0',
    features: {
      code_execution: true,
      logic_verification: true,
      tac_analysis: true,
      ast_analysis: astAvailable,
      performance_comparison: true
    },
    endpoints: {
      verify: 'POST /api/verify - Verify user code against reference solution',
      execute: 'POST /api/execute - Execute single program',
      compare: 'POST /api/compare - Compare two programs',
      runtimes: 'GET /api/runtimes - Get available runtimes'
    },
    documentation: {
      verification_guide: 'CODE_VERIFICATION_GUIDE.md',
      api_guide: 'POSTMAN_GUIDE.txt'
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
        tac: resultA.tac,
        execution_time: resultA.execution_time
      },
      programB: {
        language: resultB.language,
        instruction_count: resultB.instruction_count,
        tac: resultB.tac,
        execution_time: resultB.execution_time
      },
      comparison: {
        tac_based: tacComparison,
        ast_based: astComparison,
        performance: {
          faster: resultA.execution_time < resultB.execution_time ? 'A' : 'B',
          timeA: resultA.execution_time,
          timeB: resultB.execution_time,
          difference: parseFloat(Math.abs(resultA.execution_time - resultB.execution_time).toFixed(2)),
          percentage_faster: parseFloat((
            ((Math.max(resultA.execution_time, resultB.execution_time) - 
              Math.min(resultA.execution_time, resultB.execution_time)) / 
              Math.max(resultA.execution_time, resultB.execution_time) * 100)
          ).toFixed(2))
        }
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

// Verify user code against reference solution
app.post('/api/verify', async (req, res) => {
  try {
    const { referenceCode, userCode, testCases } = req.body;

    // Validation
    if (!referenceCode || !referenceCode.language || !referenceCode.code) {
      return res.status(400).json({
        success: false,
        error: 'Reference code requires language and code'
      });
    }

    if (!userCode || !userCode.language || !userCode.code) {
      return res.status(400).json({
        success: false,
        error: 'User code requires language and code'
      });
    }

    console.log('Verifying user code against reference...');

    // ============================================================================
    // EXECUTION PHASE: Run code locally (fast, no API limits)
    // ============================================================================
    console.log('[Execution] Running reference code...');
    const referenceResult = await executeCode(referenceCode.language, referenceCode.code, referenceCode.stdin || '');
    
    console.log('[Execution] Running user code...');
    const userResult = await executeCode(userCode.language, userCode.code, userCode.stdin || '');

    if (!referenceResult.success) {
      return res.status(400).json({
        success: false,
        error: 'Failed to execute reference code',
        details: referenceResult
      });
    }

    if (!userResult.success) {
      return res.status(400).json({
        success: false,
        error: 'Failed to execute user code',
        details: userResult
      });
    }

    // ============================================================================
    // TAC EXTRACTION PHASE: Extract TAC from Compiler Explorer API (reliable)
    // ============================================================================
    console.log('[TAC Extraction] Extracting TAC from Compiler Explorer API...');
    const referenceTAC = await extractTAC(referenceCode.language, referenceCode.code);
    const userTAC = await extractTAC(userCode.language, userCode.code);

    // Add TAC to results
    referenceResult.tac = referenceTAC.success ? referenceTAC.tac : [];
    referenceResult.tac_raw = referenceTAC.success ? referenceTAC.tac_raw : [];
    referenceResult.instruction_count = referenceTAC.success ? referenceTAC.instruction_count : 0;
    referenceResult.ir = referenceTAC.ir;
    
    userResult.tac = userTAC.success ? userTAC.tac : [];
    userResult.tac_raw = userTAC.success ? userTAC.tac_raw : [];
    userResult.instruction_count = userTAC.success ? userTAC.instruction_count : 0;
    userResult.ir = userTAC.ir;

    console.log(`✓ Reference TAC: ${referenceResult.instruction_count} instructions (${referenceTAC.source || 'N/A'})`);
    console.log(`✓ User TAC: ${userResult.instruction_count} instructions (${userTAC.source || 'N/A'})`);

    // ============================================================================
    // STEP 1: LOGIC CORRECTNESS CHECK (Primary) - TAC-based + Output Verification
    // ============================================================================
    // STEP 1A: TAC LOGIC CHECK (Algorithmic Correctness)
    // Compare intermediate code (TAC) to detect hardcoded outputs and logic mismatches
    const tacLogicChecker = new TACLogicChecker();
    const tacLogicCheck = tacLogicChecker.verifyLogic(
      {
        code: referenceCode.code,
        language: referenceCode.language,
        tac: referenceResult.tac || []
      },
      {
        code: userCode.code,
        language: userCode.language,
        tac: userResult.tac || []
      }
    );

    console.log('[STEP 1A] TAC Logic Check:', tacLogicCheck.passed ? 'PASS' : 'FAIL');
    console.log('[STEP 1A] Reason:', tacLogicCheck.reason);

    // ============================================================================
    // STEP 1A.5: AI VERIFICATION (Secondary Judge)
    // Invoke AI when TAC comparison is unclear or potentially wrong
    // ============================================================================
    let aiVerification = null;
    const shouldUseAI = (
      // Case 1: TAC operations are all zeros (extraction might have failed)
      (tacLogicCheck.tac_comparison?.reference_operations &&
       Object.values(tacLogicCheck.tac_comparison.reference_operations).every(v => v === 0)) ||
      // Case 2: TAC logic check failed (verify if it's a real failure)
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

          // Strategy: Balance between auto-fail (high confidence) and flagging for review (medium confidence)
          // - Very high confidence (≥85%): Auto-fail as INCORRECT (clear cheating)
          // - Medium confidence (60-84%): Flag for review (suspicious, needs human judgment)
          // - Low confidence (<60%): Trust TAC result (AI is uncertain)
          
          if (!aiVerification.is_legitimate) {
            if (aiVerification.confidence >= 85) {
              // Very high confidence cheating - auto-fail
              tacLogicCheck.passed = false;
              tacLogicCheck.reason = `AI-Verified Cheating (${aiVerification.confidence}% confidence): ${aiVerification.reason}`;
              tacLogicCheck.ai_override = true;
            } else if (aiVerification.confidence >= 60) {
              // Medium confidence - flag for review but don't auto-fail
              tacLogicCheck.flagged_for_review = true;
              tacLogicCheck.review_reason = `AI detected potential cheating (${aiVerification.confidence}% confidence): ${aiVerification.reason}`;
              console.log('[STEP 1A.5] ⚠️ FLAGGED FOR REVIEW (medium confidence)');
            }
          }
          // If AI says it's legitimate (with high confidence), override TAC result
          else if (aiVerification.is_legitimate && aiVerification.confidence >= 80) {
            tacLogicCheck.passed = true;
            tacLogicCheck.reason = `AI-Verified Legitimate: ${aiVerification.reason}`;
            tacLogicCheck.ai_override = true;
          }
        } catch (error) {
          console.error('[STEP 1A.5] AI Verification failed:', error.message);
          aiVerification = { error: error.message, ai_used: false };
        }
      } else {
        console.log('[STEP 1A.5] AI verification disabled (no API key)');
        aiVerification = { ai_used: false, reason: 'AI verification disabled' };
      }
    }

    // STEP 1B: OUTPUT CHECK (Correctness Verification)
    const referenceOutput = referenceResult.output.stdout.trim();
    const userOutput = userResult.output.stdout.trim();
    const referenceExitCode = referenceResult.output.code;
    const userExitCode = userResult.output.code;

    const outputCheck = {
      output_match: referenceOutput === userOutput,
      exit_code_match: referenceExitCode === userExitCode,
      passed: (referenceOutput === userOutput) && (referenceExitCode === userExitCode),
      reference_output: referenceOutput,
      user_output: userOutput,
      reference_exit_code: referenceExitCode,
      user_exit_code: userExitCode
    };

    console.log('[STEP 1B] Output Check:', outputCheck.passed ? 'PASS' : 'FAIL');

    // COMBINED LOGIC CORRECTNESS
    const logicCorrect = {
      passed: tacLogicCheck.passed && outputCheck.passed,
      tac_logic: {
        passed: tacLogicCheck.passed,
        exact_match: tacLogicCheck.exact_match,
        reason: tacLogicCheck.reason,
        operations: tacLogicCheck.tac_comparison,
        hardcoded: tacLogicCheck.hardcoded_detection,
        cached: tacLogicCheck.cache_info,
        ai_override: tacLogicCheck.ai_override || false,
        flagged_for_review: tacLogicCheck.flagged_for_review || false, // NEW: Propagate flag from early AI check
        review_reason: tacLogicCheck.review_reason || null // NEW: Propagate review reason
      },
      output_verification: outputCheck,
      ai_verification: aiVerification || { ai_used: false }
    };

    // FAIL CASE 1: TAC Logic Mismatch (Primary Failure)
    if (!tacLogicCheck.passed) {
      console.log('[VERDICT] INCORRECT - TAC logic mismatch detected');
      
      const failureResponse = {
        success: true,
        verdict: 'INCORRECT',
        logic_correctness: logicCorrect,
        message: tacLogicCheck.message,
        failure_reason: 'TAC_LOGIC_MISMATCH',
        details: {
          primary_issue: 'The intermediate code (TAC) operations do not match the reference solution',
          tac_analysis: tacLogicCheck.tac_comparison,
          hardcoded_detection: tacLogicCheck.hardcoded_detection,
          recommendation: 'Ensure your code performs the actual computation rather than hardcoding values or using incomplete logic'
        },
        reference: {
          code: referenceCode.code,
          execution_time: referenceResult.execution_time,
          output: referenceOutput,
          operations: tacLogicCheck.tac_comparison.reference_operations,
          tac_sample: (referenceResult.tac || []).slice(0, 20)
        },
        user: {
          code: userCode.code,
          execution_time: userResult.execution_time,
          output: userOutput,
          operations: tacLogicCheck.tac_comparison.user_operations,
          tac_sample: (userResult.tac || []).slice(0, 20),
          has_errors: userResult.output.stderr ? true : false,
          stderr: userResult.output.stderr
        }
      };

      // Add AI verification details if available
      if (aiVerification && aiVerification.ai_used !== false) {
        failureResponse.ai_analysis = {
          verdict: aiVerification.is_legitimate ? 'LEGITIMATE' : 'CHEATING',
          confidence: aiVerification.confidence,
          reason: aiVerification.reason,
          detailed_analysis: aiVerification.detailed_analysis,
          cheating_indicators: aiVerification.cheating_indicators || [],
          recommendation: aiVerification.recommendation,
          ai_override: tacLogicCheck.ai_override || false
        };
      }

      return res.json(failureResponse);
    }

    // FAIL CASE 2: Output Mismatch (TAC passed but output differs - rare case)
    if (!outputCheck.passed) {
      console.log('[VERDICT] INCORRECT - Output mismatch despite TAC match');
      return res.json({
        success: true,
        verdict: 'INCORRECT',
        logic_correctness: logicCorrect,
        message: 'User code produces different output than reference solution',
        failure_reason: 'OUTPUT_MISMATCH',
        details: {
          primary_issue: 'Output or exit code does not match reference',
          note: 'TAC operations matched but final output differs - possible edge case or runtime behavior difference',
          output_comparison: outputCheck
        },
        reference: {
          execution_time: referenceResult.execution_time,
          output: referenceOutput
        },
        user: {
          execution_time: userResult.execution_time,
          output: userOutput,
          has_errors: userResult.output.stderr ? true : false,
          stderr: userResult.output.stderr
        }
      });
    }

    // SUCCESS: Both TAC logic and output match
    console.log('[VERDICT] CORRECT - TAC logic and output both match');

    // ============================================================================
    // STEP 1A.6: FINAL AI VERIFICATION PASS (Catch patterns TAC misses)
    // Run AI verification even when TAC passes to catch conditional cheating
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

          // Flag for human review if AI detects potential cheating (lower threshold than auto-fail)
          if (!finalAICheck.is_legitimate && finalAICheck.confidence >= 60) {
            flaggedForReview = true;
            reviewReason = `AI detected potential cheating pattern: ${finalAICheck.reason}`;
            console.log('[STEP 1A.6] ⚠️ FLAGGED FOR REVIEW:', reviewReason);
          }
        } catch (error) {
          console.error('[STEP 1A.6] Final AI verification failed:', error.message);
          finalAICheck = { error: error.message, ai_used: false };
        }
      } else {
        console.log('[STEP 1A.6] Final AI verification disabled (no API key)');
      }
    } else {
      console.log('[STEP 1A.6] Skipping final AI check (AI already verified this submission)');
    }

    // STEP 2: CODE EFFICIENCY COMPARISON (TAC-based)
    const tacConverter = new LLVMToTACConverter();
    const tacComparison = tacConverter.compare(
      userResult.tac || [],
      referenceResult.tac || []
    );

    // STEP 3: STRUCTURAL SIMILARITY (AST-based)
    let astComparison = null;
    let referenceFeatures = null;
    let userFeatures = null;
    
    if (astAvailable) {
      try {
        const astParser = new ASTParser();
        const astComparer = new ASTComparer();

        const referenceTree = astParser.parse(referenceCode.language, referenceCode.code);
        const userTree = astParser.parse(userCode.language, userCode.code);

        if (!referenceTree || !userTree) {
          throw new Error('Failed to parse AST trees');
        }

        referenceFeatures = astParser.extractFeatures(referenceTree);
        userFeatures = astParser.extractFeatures(userTree);

        if (!referenceFeatures || !userFeatures) {
          throw new Error('Failed to extract AST features');
        }

        console.log('Reference features:', JSON.stringify(referenceFeatures, null, 2));
        console.log('User features:', JSON.stringify(userFeatures, null, 2));

        astComparison = astComparer.compare(userFeatures, referenceFeatures);
        astComparison.source = 'local';
      } catch (error) {
        console.error('AST comparison failed:', error.message);
        console.error('Stack trace:', error.stack);
        astComparison = { 
          error: error.message,
          available: false
        };
      }
    } else {
      astComparison = {
        available: false,
        message: "AST parsing temporarily disabled due to tree-sitter compatibility issues with version 0.22.x. TAC-based analysis is still fully functional for code efficiency comparison.",
        note: "This will be resolved in a future update. Current verification uses logic correctness, TAC efficiency, and performance metrics."
      };
    }

    // STEP 4: PERFORMANCE COMPARISON
    const performanceComparison = {
      user_faster: userResult.execution_time < referenceResult.execution_time,
      reference_time: referenceResult.execution_time,
      user_time: userResult.execution_time,
      time_difference: parseFloat(Math.abs(referenceResult.execution_time - userResult.execution_time).toFixed(2)),
      percentage_difference: parseFloat((
        ((Math.abs(referenceResult.execution_time - userResult.execution_time)) / 
          referenceResult.execution_time * 100)
      ).toFixed(2))
    };

    // STEP 4.5: VULNERABILITY DETECTION
    let vulnerabilityAnalysis = null;
    if (userFeatures) {
      const vulnerabilityDetector = new VulnerabilityDetector();
      const vulnerabilities = vulnerabilityDetector.analyzeCode(
        userFeatures,
        userCode.code,
        userCode.language
      );
      
      if (vulnerabilities.suspicion_level !== 'NONE') {
        vulnerabilityAnalysis = vulnerabilityDetector.generateWarning(vulnerabilities);
        vulnerabilityAnalysis.details = vulnerabilities.details;
        vulnerabilityAnalysis.flags = vulnerabilities.flags;
      }
    }

    // SEMANTIC EQUIVALENCE ANALYSIS
    const codeNormalizer = new CodeNormalizer();
    let semanticAnalysis = null;
    let adjustedTAC = null;
    let adjustedAST = null;

    // Perform semantic analysis if we have AST features
    if (referenceFeatures && userFeatures) {
      semanticAnalysis = codeNormalizer.calculateSemanticEquivalence(
        referenceFeatures,
        userFeatures
      );
      console.log('Semantic equivalence:', JSON.stringify(semanticAnalysis, null, 2));

      // Adjust TAC efficiency rating
      adjustedTAC = codeNormalizer.adjustEfficiencyRating(
        tacComparison.similarity_percentage,
        semanticAnalysis,
        tacComparison.instruction_difference || 0
      );

      // Adjust AST similarity
      if (astComparison && astComparison.overall_similarity !== undefined) {
        adjustedAST = codeNormalizer.adjustASTSimilarity(
          astComparison.overall_similarity,
          semanticAnalysis
        );
      }
    }

    // FINAL VERDICT
    let verdict = 'CORRECT';
    let efficiency_rating = 'OPTIMAL';

    // Use adjusted TAC similarity if available
    const finalTACSimilarity = adjustedTAC ? adjustedTAC.adjusted_similarity : tacComparison.similarity_percentage;

    if (finalTACSimilarity < 60) {
      efficiency_rating = 'INEFFICIENT';
    } else if (finalTACSimilarity < 80) {
      efficiency_rating = 'MODERATE';
    } else if (finalTACSimilarity < 95) {
      efficiency_rating = 'GOOD';
    } else {
      efficiency_rating = 'OPTIMAL';
    }

    // Build efficiency analysis with semantic awareness
    const efficiencyAnalysis = {
      similarity: adjustedTAC ? adjustedTAC.adjusted_similarity : tacComparison.similarity_percentage,
      level: adjustedTAC ? adjustedTAC.rating : tacComparison.similarity_level,
      user_instructions: userResult.instruction_count,
      reference_instructions: referenceResult.instruction_count,
      instruction_difference: tacComparison.instruction_difference,
      details: tacComparison.details
    };

    // Add semantic notes if adjustments were made
    if (adjustedTAC) {
      efficiencyAnalysis.original_similarity = adjustedTAC.original_similarity;
      efficiencyAnalysis.semantic_adjustment = adjustedTAC.adjustment_applied;
      if (adjustedTAC.note) {
        efficiencyAnalysis.note = adjustedTAC.note;
      }
      if (adjustedTAC.reason) {
        efficiencyAnalysis.semantic_reason = adjustedTAC.reason;
      }
    }

    // Build AST analysis with semantic awareness
    let astAnalysis = astComparison;
    if (adjustedAST && astComparison) {
      astAnalysis = {
        ...astComparison,
        overall_similarity: adjustedAST.adjusted_similarity,
        similarity_level: adjustedAST.level,
        original_similarity: adjustedAST.original_similarity,
        semantic_adjustment: adjustedAST.adjustment_applied,
        semantic_note: adjustedAST.semantic_note
      };
    }

    // Combine flags from both early AI check and final AI check
    const combinedFlagged = flaggedForReview || tacLogicCheck.flagged_for_review || false;
    const combinedReviewReason = reviewReason || tacLogicCheck.review_reason || null;

    res.json({
      success: true,
      verdict: verdict,
      efficiency_rating: efficiency_rating,
      flagged_for_review: combinedFlagged, // NEW: Flag suspicious cases for human review
      review_reason: combinedReviewReason, // NEW: Reason for flagging
      vulnerability_warning: vulnerabilityAnalysis, // May be null if no vulnerabilities detected
      semantic_equivalence: semanticAnalysis ? {
        detected: semanticAnalysis.semanticallyEquivalent,
        reason: semanticAnalysis.reason,
        total_adjustment: semanticAnalysis.totalAdjustment
      } : null,
      analysis: {
        '1_logic_correctness': logicCorrect,
        '2_code_efficiency': efficiencyAnalysis,
        '3_structural_similarity': astAnalysis,
        '4_performance': performanceComparison
      },
      final_ai_verification: finalAICheck ? { // NEW: Include final AI check results
        verdict: finalAICheck.is_legitimate ? 'LEGITIMATE' : 'SUSPICIOUS',
        confidence: finalAICheck.confidence,
        reason: finalAICheck.reason,
        detailed_analysis: finalAICheck.detailed_analysis,
        cheating_indicators: finalAICheck.cheating_indicators || [],
        recommendation: finalAICheck.recommendation
      } : null,
      reference: {
        language: referenceResult.language,
        instruction_count: referenceResult.instruction_count,
        execution_time: referenceResult.execution_time,
        output: referenceOutput
      },
      user: {
        language: userResult.language,
        instruction_count: userResult.instruction_count,
        execution_time: userResult.execution_time,
        output: userOutput,
        has_errors: userResult.output.stderr ? true : false,
        stderr: userResult.output.stderr
      }
    });
  } catch (error) {
    console.error('Error verifying code:', error);
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
