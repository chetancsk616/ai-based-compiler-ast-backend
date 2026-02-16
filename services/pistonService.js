const axios = require('axios');
const { LLVMToTACConverter } = require('./llvmToTAC');
const { SimpleIRExtractor } = require('./simpleIRExtractor');
const { LocalExecutor } = require('./localExecutor');

const PISTON_API_URL = process.env.PISTON_API_URL || 'https://emkc.org/api/v2/piston';
const USE_LOCAL_EXECUTION = process.env.USE_LOCAL_EXECUTION !== 'false'; // Default to true

// Initialize local executor
const localExecutor = new LocalExecutor();

// Language version mappings
const LANGUAGE_CONFIG = {
  python: { language: 'python', version: '3.10.0' },
  c: { language: 'c', version: '10.2.0' },
  cpp: { language: 'c++', version: '10.2.0' },
  'c++': { language: 'c++', version: '10.2.0' },
  java: { language: 'java', version: '15.0.2' },
  javascript: { language: 'javascript', version: '18.15.0' },
  js: { language: 'javascript', version: '18.15.0' },
  node: { language: 'javascript', version: '18.15.0' },
  llvm_ir: { language: 'llvm_ir', version: '12.0.1' },
  llvm: { language: 'llvm_ir', version: '12.0.1' }
};

// Piston language mappings (for actual execution)
const PISTON_LANGUAGE_MAP = {
  'javascript': 'node'  // Piston uses 'node' for JavaScript
};

/**
 * Get available runtimes from Piston API
 */
async function getRuntimes() {
  try {
    const response = await axios.get(`${PISTON_API_URL}/runtimes`);
    return {
      success: true,
      data: response.data
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Extract TAC from code using Compiler Explorer API (SEPARATE FROM EXECUTION)
 * @param {string} language - Programming language
 * @param {string} code - Source code
 * @returns {Object} TAC extraction result
 */
async function extractTAC(language, code) {
  try {
    const langConfig = LANGUAGE_CONFIG[language.toLowerCase()];
    if (!langConfig) {
      return { success: false, error: `Unsupported language: ${language}` };
    }

    // Only extract TAC for C/C++
    if (!['c', 'c++'].includes(langConfig.language)) {
      return {
        success: true,
        tac: [],
        tac_raw: [],
        instruction_count: 0,
        ir: null,
        ir_type: 'not_applicable',
        note: `TAC extraction only supported for C/C++`
      };
    }

    console.log(`[TAC Extraction] Using Compiler Explorer API for ${language}...`);
    const startTime = Date.now();

    // Extract LLVM IR from Compiler Explorer
    const irExtractor = new SimpleIRExtractor();
    const ir = await irExtractor.extract(langConfig.language, code);

    // Check if IR extraction succeeded
    if (!ir || ir.includes('; Error:') || ir.includes('; Compilation failed')) {
      return {
        success: false,
        error: 'LLVM IR extraction failed',
        ir: ir,
        tac: [],
        instruction_count: 0
      };
    }

    // Convert IR to TAC
    const converter = new LLVMToTACConverter();
    const tacRaw = converter.convert(ir);
    const tacFiltered = converter.filter(tacRaw);
    const instructionCount = converter.count(tacFiltered);

    const extractionTime = ((Date.now() - startTime) / 1000).toFixed(3);
    console.log(`✓ TAC extracted in ${extractionTime}s (${instructionCount} instructions)`);

    return {
      success: true,
      tac: tacFiltered,
      tac_raw: tacRaw,
      instruction_count: instructionCount,
      ir: ir,
      ir_type: 'llvm_ir',
      extraction_time: parseFloat(extractionTime),
      source: 'compiler_explorer'
    };
  } catch (error) {
    return {
      success: false,
      error: `TAC extraction failed: ${error.message}`,
      tac: [],
      instruction_count: 0
    };
  }
}

/**
 * Execute code using local executor (primary) with Piston API fallback
 * NOW SIMPLIFIED - ONLY EXECUTES, DOESN'T GENERATE TAC
 * @param {string} language - Programming language (python, c, cpp, java)
 * @param {string} code - Source code to execute
 * @param {string} stdin - Standard input (optional)
 * @param {array} args - Command line arguments (optional)
 */
async function executeCode(language, code, stdin = '', args = []) {
  try {
    // Get language configuration
    const langConfig = LANGUAGE_CONFIG[language.toLowerCase()];
    
    if (!langConfig) {
      return {
        success: false,
        error: `Unsupported language: ${language}. Supported languages are: ${Object.keys(LANGUAGE_CONFIG).join(', ')}`
      };
    }

    let executionResult = null;
    let executionSource = 'piston'; // Default to Piston API

    // TRY LOCAL EXECUTION FIRST
    if (USE_LOCAL_EXECUTION) {
      const localResult = await localExecutor.execute(language, code, stdin);
      
      if (localResult.success) {
        // Local execution succeeded
        executionResult = {
          stdout: localResult.stdout,
          stderr: localResult.stderr,
          code: localResult.exit_code,
          execution_time: localResult.execution_time
        };
        executionSource = 'local';
        console.log(`✓ Local execution successful (${language}): ${localResult.execution_time}s`);
      } else if (localResult.fallback_needed) {
        // Local execution failed, fall back to Piston
        console.log(`⚠ Local execution failed, falling back to Piston API: ${localResult.error}`);
      }
    }

    // FALLBACK TO PISTON API if local execution didn't succeed
    if (!executionResult) {
      const pistonLang = PISTON_LANGUAGE_MAP[langConfig.language] || langConfig.language;
      
      const payload = {
        language: pistonLang,
        version: langConfig.version,
        files: [
          {
            name: getFileName(language),
            content: code
          }
        ],
        stdin: stdin,
        args: args,
        compile_timeout: 10000,
        run_timeout: 3000,
        compile_memory_limit: -1,
        run_memory_limit: -1
      };

      // Make request to Piston API and measure execution time
      const startTime = Date.now();
      const response = await axios.post(`${PISTON_API_URL}/execute`, payload, {
        headers: {
          'Content-Type': 'application/json'
        }
      });
      const endTime = Date.now();
      const totalTimeMs = endTime - startTime;
      const totalTimeSec = (totalTimeMs / 1000).toFixed(2);

      executionResult = {
        stdout: response.data.run?.stdout || '',
        stderr: response.data.run?.stderr || '',
        code: response.data.run?.code || 0,
        execution_time: parseFloat(totalTimeSec),
        compile: response.data.compile ? {
          stdout: response.data.compile.stdout || '',
          stderr: response.data.compile.stderr || '',
          code: response.data.compile.code || 0
        } : null
      };
      executionSource = 'piston';
      console.log(`✓ Piston API execution successful (${language}): ${totalTimeSec}s`);
    }

    // Format the response (SIMPLIFIED - NO TAC GENERATION)
    const result = {
      success: true,
      language: langConfig.language,
      execution_source: executionSource, // 'local' or 'piston'
      output: {
        stdout: executionResult.stdout,
        stderr: executionResult.stderr,
        code: executionResult.code
      },
      compile: executionResult.compile || null,
      // Execution timing (in seconds with 2 decimal accuracy)
      execution_time: executionResult.execution_time
    };

    return result;
  } catch (error) {
    return {
      success: false,
      error: error.response?.data?.message || error.message
    };
  }
}

/**
 * Generate LLVM IR for C/C++ code
 * @param {string} language - 'c' or 'c++'
 * @param {string} code - Source code
 */
async function generateLLVMIR(language, code) {
  try {
    // Use a simple wrapper that compiles to LLVM IR
    const fileExt = language === 'c' ? 'c' : 'cpp';
    const clangLang = language === 'c++' ? 'c++' : 'c';
    
    // Create a script that uses clang to generate LLVM IR
    const wrapperCode = `
import subprocess
import sys

# Write source code to file
with open('main.${fileExt}', 'w') as f:
    f.write('''${code.replace(/'/g, "\\'")}''')

# Compile to LLVM IR using clang
try:
    result = subprocess.run(
        ['clang', '-${clangLang}', '-S', '-emit-llvm', '-O0', 'main.${fileExt}', '-o', 'output.ll'],
        capture_output=True,
        text=True,
        timeout=5
    )
    
    if result.returncode != 0:
        print(f"Compilation error: {result.stderr}", file=sys.stderr)
        sys.exit(1)
    
    # Read and print the LLVM IR
    with open('output.ll', 'r') as f:
        print(f.read())
        
except FileNotFoundError:
    print("clang not found - trying gcc", file=sys.stderr)
    # Fallback: try with GCC
    result = subprocess.run(
        ['gcc', '-S', '-fdump-tree-gimple', 'main.${fileExt}'],
        capture_output=True,
        text=True
    )
    print("GCC GIMPLE output not supported yet", file=sys.stderr)
except Exception as e:
    print(f"Error: {e}", file=sys.stderr)
    sys.exit(1)
`;

    const payload = {
      language: 'python',
      version: '3.10.0',
      files: [
        {
          name: 'generate_llvm.py',
          content: wrapperCode
        }
      ],
      stdin: '',
      args: [],
      compile_timeout: 10000,
      run_timeout: 5000
    };

    const response = await axios.post(`${PISTON_API_URL}/execute`, payload, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    // The LLVM IR should be in stdout
    const output = response.data.run?.stdout || '';
    
    // Check if we got valid LLVM IR
    if (output && (output.includes('target triple') || output.includes('define ') || output.includes('module asm'))) {
      return output;
    }
    
    // Check for errors
    if (response.data.run?.stderr) {
      console.error('LLVM IR generation stderr:', response.data.run.stderr);
    }
    
    return null;
  } catch (error) {
    console.error('Error generating LLVM IR:', error.message);
    return null;
  }
}

/**
 * Get appropriate filename for the language
 */
function getFileName(language) {
  const fileNames = {
    python: 'main.py',
    c: 'main.c',
    cpp: 'main.cpp',
    'c++': 'main.cpp',
    java: 'Main.java',
    javascript: 'main.js',
    js: 'main.js',
    node: 'main.js',
    llvm_ir: 'main.ll',
    llvm: 'main.ll'
  };
  return fileNames[language.toLowerCase()] || 'main.txt';
}

module.exports = {
  executeCode,
  extractTAC,
  getRuntimes,
  generateLLVMIR,
  LANGUAGE_CONFIG
};
