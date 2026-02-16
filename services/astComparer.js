/**
 * AST Comparison Service
 * Compares two programs based on their AST structure
 */
class ASTComparer {
  /**
   * Compare two AST feature sets
   * @param {Object} featuresA - AST features for program A
   * @param {Object} featuresB - AST features for program B
   * @returns {Object} Comparison result
   */
  compare(featuresA, featuresB) {
    // Validate inputs
    if (!featuresA || !featuresB) {
      throw new Error('Invalid features: featuresA and featuresB must be defined');
    }
    
    // Ensure required properties exist with defaults
    featuresA = this.normalizeFeatures(featuresA);
    featuresB = this.normalizeFeatures(featuresB);
    // Calculate structural similarity
    const structuralSimilarity = this.calculateStructuralSimilarity(featuresA, featuresB);
    
    // Calculate control flow similarity
    const controlFlowSimilarity = this.calculateControlFlowSimilarity(
      featuresA.controlFlow,
      featuresB.controlFlow
    );
    
    // Calculate operation similarity
    const operationSimilarity = this.calculateOperationSimilarity(
      featuresA.operations,
      featuresB.operations
    );
    
    // Calculate node type similarity
    const nodeTypeSimilarity = this.calculateNodeTypeSimilarity(
      featuresA.nodeTypes,
      featuresB.nodeTypes
    );

    // Calculate function similarity
    const functionSimilarity = this.calculateFunctionSimilarity(
      featuresA.functions,
      featuresB.functions
    );

    // Overall similarity (weighted average)
    const overallSimilarity = Math.round(
      structuralSimilarity * 0.3 +
      controlFlowSimilarity * 0.2 +
      operationSimilarity * 0.2 +
      nodeTypeSimilarity * 0.2 +
      functionSimilarity * 0.1
    );

    // Determine similarity level
    let level = 'VERY_DIFFERENT';
    if (overallSimilarity >= 95) level = 'IDENTICAL';
    else if (overallSimilarity >= 80) level = 'VERY_SIMILAR';
    else if (overallSimilarity >= 60) level = 'SIMILAR';
    else if (overallSimilarity >= 40) level = 'SOMEWHAT_SIMILAR';
    else if (overallSimilarity >= 20) level = 'DIFFERENT';

    return {
      overall_similarity: overallSimilarity,
      similarity_level: level,
      breakdown: {
        structural: Math.round(structuralSimilarity),
        control_flow: Math.round(controlFlowSimilarity),
        operations: Math.round(operationSimilarity),
        node_types: Math.round(nodeTypeSimilarity),
        functions: Math.round(functionSimilarity)
      },
      details: {
        programA: {
          total_nodes: featuresA.totalNodes,
          depth: featuresA.depth,
          functions: featuresA.functions,
          control_flow: featuresA.controlFlow,
          operations: featuresA.operations
        },
        programB: {
          total_nodes: featuresB.totalNodes,
          depth: featuresB.depth,
          functions: featuresB.functions,
          control_flow: featuresB.controlFlow,
          operations: featuresB.operations
        }
      }
    };
  }

  /**
   * Calculate structural similarity based on AST depth and node count
   */
  calculateStructuralSimilarity(featuresA, featuresB) {
    const depthSimilarity = 100 - Math.abs(featuresA.depth - featuresB.depth) * 10;
    const nodeDiff = Math.abs(featuresA.totalNodes - featuresB.totalNodes);
    const maxNodes = Math.max(featuresA.totalNodes, featuresB.totalNodes);
    const nodeSimilarity = maxNodes > 0 ? ((maxNodes - nodeDiff) / maxNodes) * 100 : 100;
    
    return Math.max(0, (depthSimilarity + nodeSimilarity) / 2);
  }

  /**
   * Calculate control flow similarity
   */
  calculateControlFlowSimilarity(cfA, cfB) {
    const keys = new Set([...Object.keys(cfA), ...Object.keys(cfB)]);
    let totalDiff = 0;
    let totalMax = 0;

    for (const key of keys) {
      const valA = cfA[key] || 0;
      const valB = cfB[key] || 0;
      totalDiff += Math.abs(valA - valB);
      totalMax += Math.max(valA, valB);
    }

    if (totalMax === 0) return 100; // Both have no control flow
    return Math.max(0, ((totalMax - totalDiff) / totalMax) * 100);
  }

  /**
   * Calculate operation similarity
   */
  calculateOperationSimilarity(opsA, opsB) {
    const keys = new Set([...Object.keys(opsA), ...Object.keys(opsB)]);
    let totalDiff = 0;
    let totalMax = 0;

    for (const key of keys) {
      const valA = opsA[key] || 0;
      const valB = opsB[key] || 0;
      totalDiff += Math.abs(valA - valB);
      totalMax += Math.max(valA, valB);
    }

    if (totalMax === 0) return 100;
    return Math.max(0, ((totalMax - totalDiff) / totalMax) * 100);
  }

  /**
   * Calculate node type similarity
   */
  calculateNodeTypeSimilarity(typesA, typesB) {
    const allTypes = new Set([...Object.keys(typesA), ...Object.keys(typesB)]);
    let matching = 0;
    let total = 0;

    for (const type of allTypes) {
      const countA = typesA[type] || 0;
      const countB = typesB[type] || 0;
      matching += Math.min(countA, countB);
      total += Math.max(countA, countB);
    }

    if (total === 0) return 100;
    return (matching / total) * 100;
  }

  /**
   * Calculate function similarity
   */
  calculateFunctionSimilarity(funcsA, funcsB) {
    // Null safety
    funcsA = funcsA || [];
    funcsB = funcsB || [];
    
    if (funcsA.length === 0 && funcsB.length === 0) return 100;
    
    const setA = new Set(funcsA);
    const setB = new Set(funcsB);
    const intersection = new Set([...setA].filter(x => setB.has(x)));
    const union = new Set([...setA, ...setB]);

    if (union.size === 0) return 100;
    return (intersection.size / union.size) * 100;
  }

  /**
   * Normalize features to ensure all required properties exist
   */
  normalizeFeatures(features) {
    return {
      totalNodes: features.totalNodes || 0,
      depth: features.depth || 0,
      functions: features.functions || [],
      controlFlow: features.controlFlow || {},
      operations: features.operations || {},
      nodeTypes: features.nodeTypes || {},
      functionCalls: features.functionCalls || [],
      variableDeclarations: features.variableDeclarations || []
    };
  }
}

module.exports = { ASTComparer };
