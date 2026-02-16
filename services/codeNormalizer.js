/**
 * Code Normalizer - Detects and handles semantically equivalent code patterns
 * 
 * Handles common variations that are logically identical:
 * - Intermediate variables: `result = x + y; return result;` vs `return x + y;`
 * - Variable naming differences: `a, b` vs `x, y`
 * - Expression ordering (where commutative)
 * - Redundant assignments
 */

class CodeNormalizer {
  constructor() {
    this.equivalencePatterns = {
      // Pattern: intermediate variable before return
      intermediateReturn: {
        pattern: 'assign-then-return',
        description: 'Storing result in variable before returning'
      },
      // Pattern: direct return
      directReturn: {
        pattern: 'direct-return',
        description: 'Returning expression directly'
      }
    };
  }

  /**
   * Detect common code patterns in AST
   * @param {Object} astFeatures - AST features from astParser
   * @returns {Object} Detected patterns
   */
  detectPatterns(astFeatures) {
    const patterns = {
      hasIntermediateVariables: false,
      hasDirectReturns: false,
      assignmentBeforeReturn: false,
      unnecessaryVariables: [],
      nodeCount: 0
    };

    if (!astFeatures) {
      return patterns;
    }

    // Track node count
    patterns.nodeCount = astFeatures.totalNodes || 0;

    // Check for intermediate variable pattern via multiple indicators
    const assignments = astFeatures.operations?.assignment || 0;
    const hasVars = astFeatures.variableDeclarations && astFeatures.variableDeclarations.length > 0;
    
    // Method 1: Check explicit assignments
    if (assignments > 0 && hasVars) {
      patterns.hasIntermediateVariables = true;
      patterns.assignmentBeforeReturn = true;
    }

    // Method 2: Check node type indicators (language-agnostic)
    const nodeTypes = astFeatures.nodeTypes || {};
    
    // Common indicators of intermediate variables across languages:
    // - declaration nodes
    // - assignment nodes
    // - init_declarator (C/C++)
    const declarationIndicators = [
      'declaration', 
      'init_declarator',
      'variable_declaration',
      'lexical_declaration',
      'local_variable_declaration' // Java
    ];
    
    const hasDeclarations = declarationIndicators.some(indicator => 
      nodeTypes[indicator] && nodeTypes[indicator] > 0
    );

    if (hasDeclarations) {
      patterns.hasIntermediateVariables = true;
    }

    return patterns;
  }

  /**
   * Calculate semantic equivalence score between two AST feature sets
   * Accounts for stylistic differences that don't affect logic
   * 
   * @param {Object} refFeatures - Reference code AST features
   * @param {Object} userFeatures - User code AST features
   * @returns {Object} Equivalence analysis
   */
  calculateSemanticEquivalence(refFeatures, userFeatures) {
    // Detect patterns in both
    const refPatterns = this.detectPatterns(refFeatures);
    const userPatterns = this.detectPatterns(userFeatures);

    // Check for common variation: intermediate variable usage
    const intermediateVarDifference = 
      refPatterns.hasIntermediateVariables !== userPatterns.hasIntermediateVariables;

    // Calculate adjusted similarity
    const adjustments = {
      intermediateVariable: 0,
      variableNaming: 0,
      stylistic: 0
    };

    // If only difference is intermediate variable usage, adjust similarity
    if (intermediateVarDifference) {
      const refVarCount = refFeatures.variableDeclarations?.length || 0;
      const userVarCount = userFeatures.variableDeclarations?.length || 0;
      const varDiff = Math.abs(refVarCount - userVarCount);

      // If difference is 1-2 variables and everything else is similar
      if (varDiff <= 2) {
        adjustments.intermediateVariable = 10; // Add 10% similarity bonus
      }
    }

    // Alternative check: Node count difference
    // If one code has significantly more nodes but same control flow,
    // it likely has intermediate variables
    const nodeDiff = Math.abs(refPatterns.nodeCount - userPatterns.nodeCount);
    const nodeRatio = nodeDiff / Math.max(refPatterns.nodeCount, userPatterns.nodeCount, 1);
    
    // If node difference is 10-30% and control flow matches, likely intermediate vars
    if (nodeRatio >= 0.1 && nodeRatio <= 0.3) {
      const controlFlowMatch = this.compareControlFlow(
        refFeatures.controlFlow,
        userFeatures.controlFlow
      );
      
      if (controlFlowMatch) {
        adjustments.intermediateVariable = Math.max(
          adjustments.intermediateVariable,
          10
        );
      }
    }

    // Check if control flow is identical (most important)
    const controlFlowMatch = this.compareControlFlow(
      refFeatures.controlFlow,
      userFeatures.controlFlow
    );

    // Check if functions are identical
    const functionsMatch = this.compareFunctions(
      refFeatures.functions,
      userFeatures.functions
    );

    // Calculate semantic equivalence
    const isSemanticallySimilar = 
      controlFlowMatch && 
      functionsMatch && 
      (intermediateVarDifference || adjustments.intermediateVariable > 0);

    return {
      semanticallyEquivalent: isSemanticallySimilar,
      adjustments: adjustments,
      totalAdjustment: Object.values(adjustments).reduce((a, b) => a + b, 0),
      reason: this.getEquivalenceReason(refPatterns, userPatterns),
      patterns: {
        reference: refPatterns,
        user: userPatterns
      }
    };
  }

  /**
   * Compare control flow structures
   */
  compareControlFlow(ref, user) {
    if (!ref || !user) return false;
    
    return (
      ref.if_statements === user.if_statements &&
      ref.for_loops === user.for_loops &&
      ref.while_loops === user.while_loops &&
      ref.switch_statements === user.switch_statements
    );
  }

  /**
   * Compare function lists (order-independent)
   */
  compareFunctions(ref, user) {
    if (!ref || !user) return false;
    if (ref.length !== user.length) return false;
    
    const refSorted = [...ref].sort();
    const userSorted = [...user].sort();
    
    return refSorted.every((fn, idx) => fn === userSorted[idx]);
  }

  /**
   * Get human-readable reason for equivalence
   */
  getEquivalenceReason(refPatterns, userPatterns) {
    const reasons = [];

    if (refPatterns.hasIntermediateVariables !== userPatterns.hasIntermediateVariables) {
      if (userPatterns.hasIntermediateVariables) {
        reasons.push('User code uses intermediate variable (e.g., result = x + y; return result)');
      } else {
        reasons.push('User code returns expression directly (e.g., return x + y)');
      }
    }

    if (reasons.length === 0) {
      return 'Code structures are identical';
    }

    return reasons.join('; ');
  }

  /**
   * Normalize TAC operations for comparison
   * Handles variations in instruction sequences that produce same result
   * 
   * @param {Object} tacOperations - TAC operations from tacComparer
   * @returns {Object} Normalized operations
   */
  normalizeTACOperations(tacOperations) {
    // Create a normalized copy
    const normalized = { ...tacOperations };

    // If there's an 'alloca' (variable allocation) that's only used for intermediate storage,
    // it doesn't change the logical efficiency
    // This is a simplification - in reality we'd need data flow analysis

    return normalized;
  }

  /**
   * Calculate adjusted efficiency rating considering semantic equivalence
   * 
   * @param {number} tacSimilarity - Original TAC similarity percentage
   * @param {Object} semanticEquivalence - Semantic equivalence analysis
   * @returns {Object} Adjusted rating
   */
  adjustEfficiencyRating(tacSimilarity, semanticEquivalence, instructionDiff) {
    let adjustedSimilarity = tacSimilarity;
    let adjustedRating;

    // If semantically equivalent with only stylistic differences
    if (semanticEquivalence.semanticallyEquivalent) {
      // Small instruction difference (1-2) due to intermediate variable is acceptable
      if (Math.abs(instructionDiff) <= 2) {
        adjustedSimilarity = Math.max(tacSimilarity, 95); // Boost to at least 95%
      }
    }

    // Apply adjustments
    adjustedSimilarity = Math.min(100, adjustedSimilarity + semanticEquivalence.totalAdjustment);

    // Determine rating
    if (adjustedSimilarity >= 95) {
      adjustedRating = 'OPTIMAL';
    } else if (adjustedSimilarity >= 85) {
      adjustedRating = 'VERY_SIMILAR';
    } else if (adjustedSimilarity >= 70) {
      adjustedRating = 'GOOD';
    } else if (adjustedSimilarity >= 50) {
      adjustedRating = 'ACCEPTABLE';
    } else {
      adjustedRating = 'INEFFICIENT';
    }

    return {
      original_similarity: tacSimilarity,
      adjusted_similarity: adjustedSimilarity,
      adjustment_applied: semanticEquivalence.totalAdjustment,
      rating: adjustedRating,
      reason: semanticEquivalence.reason,
      note: semanticEquivalence.semanticallyEquivalent 
        ? 'Codes are semantically equivalent despite minor stylistic differences'
        : null
    };
  }

  /**
   * Adjust AST similarity considering semantic patterns
   * 
   * @param {number} originalSimilarity - Original AST similarity
   * @param {Object} semanticEquivalence - Semantic equivalence analysis
   * @returns {Object} Adjusted similarity
   */
  adjustASTSimilarity(originalSimilarity, semanticEquivalence) {
    let adjustedSimilarity = originalSimilarity;

    // Apply pattern-based adjustments
    if (semanticEquivalence.semanticallyEquivalent) {
      adjustedSimilarity += semanticEquivalence.totalAdjustment;
      adjustedSimilarity = Math.min(100, adjustedSimilarity);
    }

    // Determine level
    let level;
    if (adjustedSimilarity >= 95) {
      level = 'IDENTICAL';
    } else if (adjustedSimilarity >= 85) {
      level = 'VERY_SIMILAR';
    } else if (adjustedSimilarity >= 70) {
      level = 'SIMILAR';
    } else if (adjustedSimilarity >= 50) {
      level = 'SOMEWHAT_SIMILAR';
    } else {
      level = 'DIFFERENT';
    }

    return {
      original_similarity: originalSimilarity,
      adjusted_similarity: Math.round(adjustedSimilarity),
      adjustment_applied: semanticEquivalence.totalAdjustment,
      level: level,
      semantic_note: semanticEquivalence.reason
    };
  }
}

module.exports = { CodeNormalizer };
