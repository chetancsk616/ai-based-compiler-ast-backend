// Try to load tree-sitter (may not be available on serverless platforms)
let Parser, C, Python;
let isAvailable = false;

try {
  Parser = require('tree-sitter');
  C = require('tree-sitter-c');
  Python = require('tree-sitter-python');
  isAvailable = true;
} catch (error) {
  // Tree-sitter not available - will provide graceful fallback
  isAvailable = false;
}

/**
 * AST Parser for multiple languages
 */
class ASTParser {
  constructor() {
    if (!isAvailable) {
      throw new Error('Tree-sitter native bindings are not available on this platform');
    }
    
    this.parsers = {
      c: this.createParser(C),
      cpp: this.createParser(C),
      'c++': this.createParser(C),
      python: this.createParser(Python)
    };
  }

  createParser(language) {
    const parser = new Parser();
    parser.setLanguage(language);
    return parser;
  }

  /**
   * Parse source code to AST
   * @param {string} language - Programming language
   * @param {string} code - Source code
   * @returns {Object} AST tree
   */
  parse(language, code) {
    const parser = this.parsers[language.toLowerCase()];
    if (!parser) {
      throw new Error(`Unsupported language for AST parsing: ${language}`);
    }

    return parser.parse(code);
  }

  /**
   * Extract AST features for comparison
   * @param {Object} tree - Tree-sitter AST
   * @returns {Object} Feature vector
   */
  extractFeatures(tree) {
    const features = {
      nodeTypes: {},
      depth: 0,
      totalNodes: 0,
      functions: [],
      controlFlow: {
        if_statements: 0,
        for_loops: 0,
        while_loops: 0,
        switch_statements: 0
      },
      operations: {
        arithmetic: 0,
        logical: 0,
        comparison: 0,
        assignment: 0
      },
      functionCalls: [],
      variableDeclarations: []
    };

    this.traverseAST(tree.rootNode, features, 0);
    return features;
  }

  /**
   * Traverse AST and collect features
   */
  traverseAST(node, features, depth) {
    if (!node) return;

    try {
      features.totalNodes++;
      features.depth = Math.max(features.depth, depth);

      // Count node types
      const type = node.type;
      features.nodeTypes[type] = (features.nodeTypes[type] || 0) + 1;

    // Identify control flow structures
    if (type === 'if_statement') features.controlFlow.if_statements++;
    if (type === 'for_statement') features.controlFlow.for_loops++;
    if (type === 'while_statement') features.controlFlow.while_loops++;
    if (type === 'switch_statement') features.controlFlow.switch_statements++;

    // Identify operations
    if (['binary_expression', 'unary_expression'].includes(type)) {
      // Find operator by iterating through children
      let operator = null;
      if (node.childCount > 0) {
        for (let i = 0; i < node.childCount; i++) {
          const child = node.child(i);
          if (child && child.type && child.type.includes('operator')) {
            operator = child;
            break;
          }
        }
      }
      
      if (operator && operator.text) {
        const opText = operator.text;
        if (['+', '-', '*', '/', '%'].includes(opText)) {
          features.operations.arithmetic++;
        } else if (['&&', '||', '!'].includes(opText)) {
          features.operations.logical++;
        } else if (['==', '!=', '<', '>', '<=', '>='].includes(opText)) {
          features.operations.comparison++;
        }
      }
    }

    if (type === 'assignment_expression' || type === 'init_declarator') {
      features.operations.assignment++;
    }

    // Identify function definitions
    if (type === 'function_definition') {
      const funcName = this.getFunctionName(node);
      if (funcName) {
        features.functions.push(funcName);
      }
    }

    // Identify function calls
    if (type === 'call_expression') {
      const funcName = this.getCallName(node);
      if (funcName) {
        features.functionCalls.push(funcName);
      }
    }

    // Identify variable declarations
    if (type === 'declaration') {
      const varNames = this.getVariableNames(node);
      if (varNames && varNames.length > 0) {
        features.variableDeclarations.push(...varNames);
      }
    }

    // Recursively traverse children
    if (node.childCount && node.childCount > 0) {
      for (let i = 0; i < node.childCount; i++) {
        const child = node.child(i);
        if (child) {
          this.traverseAST(child, features, depth + 1);
        }
      }
    }
    } catch (error) {
      console.error('Error traversing AST node:', error.message);
      // Continue traversal despite errors
    }
  }

  getFunctionName(node) {
    const declarator = node.childForFieldName('declarator');
    if (declarator) {
      const identifier = declarator.childForFieldName('declarator');
      if (identifier) {
        return identifier.text;
      }
    }
    return null;
  }

  getCallName(node) {
    const func = node.childForFieldName('function');
    if (func) {
      return func.text;
    }
    return null;
  }

  getVariableNames(node) {
    const names = [];
    const declarator = node.childForFieldName('declarator');
    if (declarator) {
      const identifier = declarator.childForFieldName('declarator');
      if (identifier) {
        names.push(identifier.text);
      }
    }
    return names;
  }

  /**
   * Generate AST structure hash for similarity detection
   */
  generateStructureHash(node, maxDepth = 5, currentDepth = 0) {
    if (!node || currentDepth >= maxDepth) {
      return '';
    }

    let hash = node.type;
    
    for (let i = 0; i < node.childCount; i++) {
      hash += '(' + this.generateStructureHash(node.child(i), maxDepth, currentDepth + 1) + ')';
    }

    return hash;
  }
}

module.exports = { ASTParser };
