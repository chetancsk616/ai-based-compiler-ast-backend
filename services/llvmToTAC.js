/**
 * DUMB LLVM IR to TAC Converter
 * NO OPTIMIZATION. NO CLEVERNESS.
 * RENAMES ALL SSA VARIABLES TO t1, t2, t3...
 */

class LLVMToTACConverter {
  constructor() {
    this.tacOutput = [];
    this.varMap = new Map(); // Maps %1, %add, etc. to t1, t2, t3...
    this.tempCounter = 0;
  }
  
  /**
   * Rename SSA variable to t1, t2, t3...
   */
  renameVar(varName) {
    // If it's not a variable (constant number), return as-is
    if (!varName.startsWith('%') && !varName.startsWith('@')) {
      return varName;
    }
    
    // If we've seen this variable before, return existing mapping
    if (this.varMap.has(varName)) {
      return this.varMap.get(varName);
    }
    
    // New variable: assign next t number
    this.tempCounter++;
    const newName = `t${this.tempCounter}`;
    this.varMap.set(varName, newName);
    return newName;
  }

  /**
   * Convert LLVM IR to TAC
   * @param {string} llvmIR - LLVM IR code
   * @returns {Array} Array of TAC strings
   */
  convert(llvmIR) {
    const lines = llvmIR.split('\n');
    this.tacOutput = [];
    this.varMap = new Map(); // Reset for each conversion
    this.tempCounter = 0;

    for (const line of lines) {
      const trimmed = line.trim();
      
      // Ignore empty lines
      if (!trimmed) continue;
      
      // Ignore comments
      if (trimmed.startsWith(';')) continue;
      
      // Ignore define
      if (trimmed.startsWith('define ')) continue;
      
      // Ignore declare
      if (trimmed.startsWith('declare ')) continue;
      
      // Ignore attributes
      if (trimmed.startsWith('attributes ')) continue;
      
      // Ignore metadata lines (but not instructions with metadata)
      if (trimmed.startsWith('!')) continue;
      
      // Ignore braces
      if (trimmed === '{' || trimmed === '}') continue;
      
      // Convert instruction to TAC
      const tac = this.convertInstruction(trimmed);
      if (tac) {
        this.tacOutput.push(tac);
      }
    }

    return this.tacOutput;
  }

  /**
   * Filter TAC to keep only countable instructions
   * @param {Array} tac - Array of TAC strings
   * @returns {Array} Filtered TAC strings
   */
  filter(tac) {
    const filtered = [];
    
    for (const line of tac) {
      // KEEP: add, sub, mul, div
      if (line.includes(' + ') || line.includes(' - ') || 
          line.includes(' * ') || line.includes(' / ')) {
        filtered.push(line);
        continue;
      }
      
      // KEEP: call
      if (line.includes('call ')) {
        filtered.push(line);
        continue;
      }
      
      // KEEP: return
      if (line.startsWith('return')) {
        filtered.push(line);
        continue;
      }
      
      // REMOVE: alloca, store, load
      if (line.includes('alloca') || line.includes('store ') || line.includes('load ')) {
        continue;
      }
      
      // If it's an assignment that's not alloca/store/load, keep it
      if (line.includes(' = ') && !line.includes('alloca') && 
          !line.includes('load') && !line.includes('store')) {
        filtered.push(line);
      }
    }
    
    return filtered;
  }

  /**
   * Count instructions in TAC
   * @param {Array} tac - Array of TAC strings
   * @returns {number} Number of instructions
   */
  count(tac) {
    return tac.length;
  }

  /**
   * Convert single LLVM instruction to TAC
   */
  convertInstruction(line) {
    // Remove metadata
    let clean = line.split('!')[0].trim();
    
    // Remove LLVM flags (nsw, nuw, exact, etc.)
    clean = clean.replace(/\b(nsw|nuw|exact|inbounds)\b/g, '').trim();
    
    // add: %x = add i32 %a, %b  →  t = x + y
    if (clean.includes(' add ')) {
      const match = clean.match(/(%\S+)\s*=\s*add\s+\S+\s+(%?\S+),\s*(%?\S+)/);
      if (match) {
        const dst = this.renameVar(match[1]);
        let arg1 = this.renameVar(match[2]);
        let arg2 = this.renameVar(match[3]);
        // Sort operands alphabetically for commutative add
        if (arg1 > arg2) {
          [arg1, arg2] = [arg2, arg1];
        }
        return `${dst} = ${arg1} + ${arg2}`;
      }
    }
    
    // sub: %x = sub i32 %a, %b  →  t = x - y
    if (clean.includes(' sub ')) {
      const match = clean.match(/(%\S+)\s*=\s*sub\s+\S+\s+(%?\S+),\s*(%?\S+)/);
      if (match) {
        const dst = this.renameVar(match[1]);
        const arg1 = this.renameVar(match[2]);
        const arg2 = this.renameVar(match[3]);
        return `${dst} = ${arg1} - ${arg2}`;
      }
    }
    
    // mul: %x = mul i32 %a, %b  →  t = x * y
    if (clean.includes(' mul ')) {
      const match = clean.match(/(%\S+)\s*=\s*mul\s+\S+\s+(%?\S+),\s*(%?\S+)/);
      if (match) {
        const dst = this.renameVar(match[1]);
        let arg1 = this.renameVar(match[2]);
        let arg2 = this.renameVar(match[3]);
        // Sort operands alphabetically for commutative mul
        if (arg1 > arg2) {
          [arg1, arg2] = [arg2, arg1];
        }
        return `${dst} = ${arg1} * ${arg2}`;
      }
    }
    
    // sdiv: %x = sdiv i32 %a, %b  →  t = x / y
    if (clean.includes('div')) {
      const match = clean.match(/(%\S+)\s*=\s*\w*div\s+\S+\s+(%?\S+),\s*(%?\S+)/);
      if (match) {
        const dst = this.renameVar(match[1]);
        const arg1 = this.renameVar(match[2]);
        const arg2 = this.renameVar(match[3]);
        return `${dst} = ${arg1} / ${arg2}`;
      }
    }
    
    // call: %x = call i32 @func(...)  →  t = call func
    if (clean.includes('call')) {
      const match = clean.match(/(%\S+)?\s*=?\s*call\s+\S+\s+(@?\w+)/);
      if (match && match[1]) {
        const dst = this.renameVar(match[1]);
        const func = this.renameVar(match[2]);
        return `${dst} = call ${func}`;
      }
      if (match && match[2]) {
        const func = this.renameVar(match[2]);
        return `call ${func}`;
      }
    }
    
    // ret: ret i32 %x  →  return t
    if (clean.includes('ret')) {
      const match = clean.match(/ret\s+\S+\s+(%?\S+)/);
      if (match) {
        const val = this.renameVar(match[1]);
        return `return ${val}`;
      }
      if (clean.match(/ret\s+void/)) {
        return 'return';
      }
    }
    
    // alloca, store, load - pass through with renaming
    if (clean.includes('alloca')) {
      const match = clean.match(/(%\S+)\s*=\s*alloca/);
      if (match) {
        const dst = this.renameVar(match[1]);
        return `${dst} = alloca`;
      }
    }
    
    if (clean.includes('store')) {
      const match = clean.match(/store\s+\S+\s+(%?\S+),\s+\S*\s*(%\S+)/);
      if (match) {
        const val = this.renameVar(match[1]);
        const addr = this.renameVar(match[2]);
        return `store ${val} -> ${addr}`;
      }
    }
    
    if (clean.includes('load')) {
      const match = clean.match(/(%\S+)\s*=\s*load\s+\S+,\s+\S*\s*(%\S+)/);
      if (match) {
        const dst = this.renameVar(match[1]);
        const addr = this.renameVar(match[2]);
        return `${dst} = load ${addr}`;
      }
    }
    
    return null;
  }

  /**
   * Filter TAC to keep only countable instructions
   * @param {Array} tac - Array of TAC strings
   * @returns {Array} Filtered TAC strings
   */
  filter(tac) {
    const filtered = [];
    
    for (const line of tac) {
      // KEEP: add, sub, mul, div
      if (line.includes(' + ') || line.includes(' - ') || 
          line.includes(' * ') || line.includes(' / ')) {
        filtered.push(line);
        continue;
      }
      
      // KEEP: call
      if (line.includes('call ')) {
        filtered.push(line);
        continue;
      }
      
      // KEEP: return
      if (line.startsWith('return')) {
        filtered.push(line);
        continue;
      }
      
      // REMOVE: alloca, store, load
      if (line.includes('alloca') || line.includes('store ') || line.includes('load ')) {
        continue;
      }
      
      // If it's an assignment that's not alloca/store/load, keep it
      if (line.includes(' = ') && !line.includes('alloca') && 
          !line.includes('load') && !line.includes('store')) {
        filtered.push(line);
      }
    }
    
    return filtered;
  }

  /**
   * Count instructions in TAC
   * @param {Array} tac - Array of TAC strings
   * @returns {number} Number of instructions
   */
  count(tac) {
    return tac.length;
  }

  /**
   * Compare two TAC programs for similarity
   * @param {Array} tacA - TAC instructions for program A
   * @param {Array} tacB - TAC instructions for program B
   * @returns {Object} Comparison result with similarity analysis
   */
  compare(tacA, tacB) {
    const countA = tacA.length;
    const countB = tacB.length;
    
    // Determine which has fewer instructions
    let better = 'EQUAL';
    if (countA < countB) {
      better = 'A';
    } else if (countB < countA) {
      better = 'B';
    }
    
    const difference = Math.abs(countA - countB);
    
    // Calculate similarity score
    const similarity = this.calculateSimilarity(tacA, tacB);
    
    return {
      better: better,
      instruction_difference: difference,
      similarity_percentage: similarity.percentage,
      similarity_level: similarity.level,
      matching_operations: similarity.matching,
      total_operations: similarity.total,
      details: similarity.details
    };
  }

  /**
   * Calculate similarity between two TAC programs
   * @param {Array} tacA - TAC instructions for program A
   * @param {Array} tacB - TAC instructions for program B
   * @returns {Object} Similarity metrics
   */
  calculateSimilarity(tacA, tacB) {
    // Extract operation types from TAC
    const opsA = this.extractOperations(tacA);
    const opsB = this.extractOperations(tacB);
    
    // Count matching operations
    let matching = 0;
    const matchedOps = [];
    const differentOps = [];
    
    const allOps = new Set([...Object.keys(opsA), ...Object.keys(opsB)]);
    
    for (const op of allOps) {
      const countInA = opsA[op] || 0;
      const countInB = opsB[op] || 0;
      
      if (countInA > 0 && countInB > 0) {
        const matched = Math.min(countInA, countInB);
        matching += matched;
        matchedOps.push(`${op}: ${matched}`);
      }
      
      if (countInA !== countInB) {
        differentOps.push(`${op}: A=${countInA}, B=${countInB}`);
      }
    }
    
    const totalA = tacA.length;
    const totalB = tacB.length;
    const total = Math.max(totalA, totalB);
    
    // Calculate percentage
    const percentage = total > 0 ? Math.round((matching / total) * 100) : 0;
    
    // Determine similarity level
    let level = 'VERY_DIFFERENT';
    if (percentage >= 90) level = 'IDENTICAL';
    else if (percentage >= 70) level = 'VERY_SIMILAR';
    else if (percentage >= 50) level = 'SIMILAR';
    else if (percentage >= 30) level = 'SOMEWHAT_SIMILAR';
    else if (percentage >= 10) level = 'DIFFERENT';
    
    return {
      percentage: percentage,
      level: level,
      matching: matching,
      total: total,
      details: {
        programA_operations: opsA,
        programB_operations: opsB,
        matched_operations: matchedOps,
        different_operations: differentOps
      }
    };
  }

  /**
   * Extract operation types and counts from TAC
   * @param {Array} tac - TAC instructions
   * @returns {Object} Operation counts
   */
  extractOperations(tac) {
    const operations = {};
    
    for (const line of tac) {
      let op = 'unknown';
      
      if (line.includes(' + ')) op = 'add';
      else if (line.includes(' - ')) op = 'sub';
      else if (line.includes(' * ')) op = 'mul';
      else if (line.includes(' / ')) op = 'div';
      else if (line.includes('call ')) op = 'call';
      else if (line.startsWith('return')) op = 'return';
      
      operations[op] = (operations[op] || 0) + 1;
    }
    
    return operations;
  }
}

module.exports = { LLVMToTACConverter };
