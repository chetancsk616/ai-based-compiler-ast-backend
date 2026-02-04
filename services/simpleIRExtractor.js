const axios = require('axios');

/**
 * IR Extractor using ONLY Compiler Explorer (Godbolt) API
 * NO PISTON. NO EXECUTION. ONLY COMPILATION.
 */
class SimpleIRExtractor {
  
  /**
   * Extract LLVM IR from C/C++ code using Compiler Explorer
   */
  async extractC(code, isCpp = false) {
    const compilerId = 'clang1600'; // clang 16.0.0
    const url = `https://godbolt.org/api/compiler/${compilerId}/compile`;
    
    try {
      const response = await axios.post(url, {
        source: code,
        options: {
          userArguments: '-S -emit-llvm -O0',
          filters: {
            binary: false,
            execute: false
          }
        }
      }, {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 15000
      });

      // Extract LLVM IR from asm field
      if (response.data && response.data.asm && Array.isArray(response.data.asm)) {
        const llvmIR = response.data.asm
          .map(line => line.text || '')
          .join('\n');
        return llvmIR;
      }
      
      // Check for compilation errors
      if (response.data && response.data.code !== 0) {
        const stderr = response.data.stderr || [];
        const errorMsg = Array.isArray(stderr) 
          ? stderr.map(e => e.text || e).join('\n')
          : stderr;
        return `; Compilation failed\n; ${errorMsg || 'Unknown error'}`;
      }
      
      return '; LLVM IR not generated';
    } catch (error) {
      return `; Error: ${error.message}`;
    }
  }

  /**
   * Main extraction router
   */
  async extract(language, code) {
    const lang = language.toLowerCase();
    
    switch (lang) {
      case 'c':
        return await this.extractC(code, false);
      case 'cpp':
      case 'c++':
        return await this.extractC(code, true);
      default:
        return `; IR extraction only supported for C/C++. Use Compiler Explorer.`;
    }
  }
}

module.exports = { SimpleIRExtractor };
