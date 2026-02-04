/**
 * TAC Comparer - Follows exact steps for comparing LLVM IR programs
 * NO CLEVERNESS. NO OPTIMIZATION. EXACT STEPS ONLY.
 */

class TACComparer {
  
  /**
   * STEP 1: READ LLVM IR
   */
  readLLVMIR(llvmCode) {
    const lines = llvmCode.split('\n');
    const cleanedLines = [];
    
    for (const line of lines) {
      const trimmed = line.trim();
      
      // Ignore these lines completely
      if (!trimmed) continue;
      if (trimmed.startsWith(';')) continue;
      if (trimmed.startsWith('define ')) continue;
      if (trimmed.startsWith('attributes ')) continue;
      if (trimmed.startsWith('!')) continue;
      if (trimmed.includes('!dbg')) continue;
      if (trimmed === '{' || trimmed === '}') continue;
      
      cleanedLines.push(trimmed);
    }
    
    return cleanedLines;
  }
  
  /**
   * STEP 2: CREATE RAW TAC
   */
  createRawTAC(cleanedLines) {
    const rawTAC = [];
    
    for (const line of cleanedLines) {
      const tac = this.convertToTAC(line);
      if (tac) {
        rawTAC.push(tac);
      }
    }
    
    return rawTAC;
  }
  
  convertToTAC(line) {
    // alloca
    if (line.includes('alloca')) {
      const match = line.match(/(%\w+)\s*=\s*alloca/);
      if (match) {
        return { temp: match[1], op: 'alloca' };
      }
    }
    
    // store
    if (line.includes('store')) {
      const match = line.match(/store\s+\w+\s+(%?\w+),\s+\w*\s*(%\w+)/);
      if (match) {
        return { op: 'store', value: match[1], addr: match[2] };
      }
    }
    
    // load
    if (line.includes('load')) {
      const match = line.match(/(%\w+)\s*=\s*load\s+\w+,\s+\w*\s*(%\w+)/);
      if (match) {
        return { temp: match[1], op: 'load', addr: match[2] };
      }
    }
    
    // add
    if (line.includes('add')) {
      const match = line.match(/(%\w+)\s*=\s*add\s+\w+\s+(%\w+),\s*(%?\w+)/);
      if (match) {
        return { temp: match[1], op: 'add', arg1: match[2], arg2: match[3] };
      }
    }
    
    // sub
    if (line.includes('sub')) {
      const match = line.match(/(%\w+)\s*=\s*sub\s+\w+\s+(%\w+),\s*(%?\w+)/);
      if (match) {
        return { temp: match[1], op: 'sub', arg1: match[2], arg2: match[3] };
      }
    }
    
    // mul
    if (line.includes('mul')) {
      const match = line.match(/(%\w+)\s*=\s*mul\s+\w+\s+(%\w+),\s*(%?\w+)/);
      if (match) {
        return { temp: match[1], op: 'mul', arg1: match[2], arg2: match[3] };
      }
    }
    
    // div
    if (line.includes('div')) {
      const match = line.match(/(%\w+)\s*=\s*[us]?div\s+\w+\s+(%\w+),\s*(%?\w+)/);
      if (match) {
        return { temp: match[1], op: 'div', arg1: match[2], arg2: match[3] };
      }
    }
    
    // call
    if (line.includes('call')) {
      const match = line.match(/(%\w+)?\s*=?\s*call\s+\w+\s+(@?\w+)/);
      if (match) {
        return { temp: match[1], op: 'call', func: match[2] };
      }
    }
    
    // ret
    if (line.includes('ret')) {
      const match = line.match(/ret\s+\w+\s+(%?\w+)/);
      if (match) {
        return { op: 'return', value: match[1] };
      }
      if (line.match(/ret\s+void/)) {
        return { op: 'return' };
      }
    }
    
    return null;
  }
  
  /**
   * STEP 3: RENAME TEMPORARIES
   */
  renameTemporaries(rawTAC) {
    const mapping = {};
    let counter = 1;
    
    const renamed = [];
    
    for (const instr of rawTAC) {
      const newInstr = { ...instr };
      
      // Rename temp (result)
      if (newInstr.temp && newInstr.temp.startsWith('%')) {
        if (!mapping[newInstr.temp]) {
          mapping[newInstr.temp] = `t${counter++}`;
        }
        newInstr.temp = mapping[newInstr.temp];
      }
      
      // Rename arg1
      if (newInstr.arg1 && newInstr.arg1.startsWith('%')) {
        if (!mapping[newInstr.arg1]) {
          mapping[newInstr.arg1] = `t${counter++}`;
        }
        newInstr.arg1 = mapping[newInstr.arg1];
      }
      
      // Rename arg2
      if (newInstr.arg2 && newInstr.arg2.startsWith('%')) {
        if (!mapping[newInstr.arg2]) {
          mapping[newInstr.arg2] = `t${counter++}`;
        }
        newInstr.arg2 = mapping[newInstr.arg2];
      }
      
      // Rename value
      if (newInstr.value && newInstr.value.startsWith('%')) {
        if (!mapping[newInstr.value]) {
          mapping[newInstr.value] = `t${counter++}`;
        }
        newInstr.value = mapping[newInstr.value];
      }
      
      // Rename addr
      if (newInstr.addr && newInstr.addr.startsWith('%')) {
        if (!mapping[newInstr.addr]) {
          mapping[newInstr.addr] = `t${counter++}`;
        }
        newInstr.addr = mapping[newInstr.addr];
      }
      
      renamed.push(newInstr);
    }
    
    return renamed;
  }
  
  /**
   * STEP 4: NORMALIZE TAC
   */
  normalizeTAC(renamedTAC) {
    const normalized = [];
    
    for (const instr of renamedTAC) {
      const norm = { ...instr };
      
      // For commutative operations, sort operands alphabetically
      if ((norm.op === 'add' || norm.op === 'mul') && norm.arg1 && norm.arg2) {
        if (norm.arg1 > norm.arg2) {
          const temp = norm.arg1;
          norm.arg1 = norm.arg2;
          norm.arg2 = temp;
        }
      }
      
      normalized.push(norm);
    }
    
    return normalized;
  }
  
  /**
   * STEP 5: FILTER TAC (COUNTABLE ONLY)
   */
  filterTAC(normalizedTAC) {
    const filtered = [];
    
    for (const instr of normalizedTAC) {
      // KEEP only these operations
      if (instr.op === 'add') filtered.push(instr);
      else if (instr.op === 'sub') filtered.push(instr);
      else if (instr.op === 'mul') filtered.push(instr);
      else if (instr.op === 'div') filtered.push(instr);
      else if (instr.op === 'call') filtered.push(instr);
      else if (instr.op === 'return') filtered.push(instr);
      else if (instr.op === 'store') filtered.push(instr);
      else if (instr.op === 'load') filtered.push(instr);
      // REMOVE: alloca, labels, goto, branch
    }
    
    return filtered;
  }
  
  /**
   * STEP 6: COUNT INSTRUCTIONS
   */
  countInstructions(filteredTAC) {
    return filteredTAC.length;
  }
  
  /**
   * STEP 7: COMPARE
   */
  compare(countA, countB) {
    let better = 'EQUAL';
    if (countA < countB) better = 'A';
    if (countB < countA) better = 'B';
    
    const difference = Math.abs(countA - countB);
    
    return { better, difference };
  }
  
  /**
   * STEP 8: OUTPUT
   */
  comparePrograms(llvmA, llvmB) {
    // Process Program A
    const cleanedA = this.readLLVMIR(llvmA);
    const rawTAC_A = this.createRawTAC(cleanedA);
    const renamedA = this.renameTemporaries(rawTAC_A);
    const normalizedA = this.normalizeTAC(renamedA);
    const filteredA = this.filterTAC(normalizedA);
    const countA = this.countInstructions(filteredA);
    
    // Process Program B
    const cleanedB = this.readLLVMIR(llvmB);
    const rawTAC_B = this.createRawTAC(cleanedB);
    const renamedB = this.renameTemporaries(rawTAC_B);
    const normalizedB = this.normalizeTAC(renamedB);
    const filteredB = this.filterTAC(normalizedB);
    const countB = this.countInstructions(filteredB);
    
    // Compare
    const comparison = this.compare(countA, countB);
    
    return {
      program_a: {
        normalized_tac: normalizedA,
        filtered_tac: filteredA,
        instruction_count: countA
      },
      program_b: {
        normalized_tac: normalizedB,
        filtered_tac: filteredB,
        instruction_count: countB
      },
      comparison: comparison
    };
  }
}

module.exports = { TACComparer };
