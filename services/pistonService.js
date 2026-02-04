const axios = require('axios');
const { LLVMToTACConverter } = require('./llvmToTAC');
const { SimpleIRExtractor } = require('./simpleIRExtractor');

const PISTON_API_URL = process.env.PISTON_API_URL || 'https://emkc.org/api/v2/piston';

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
 * Execute code using Piston API
 * @param {string} language - Programming language (python, c, cpp, java)
 * @param {string} code - Source code to execute
 * @param {string} stdin - Standard input (optional)
 * @param {array} args - Command line arguments (optional)
 * @param {boolean} generateLLVM - Generate LLVM IR (for C/C++)
 */
async function executeCode(language, code, stdin = '', args = [], generateLLVM = true) {
  try {
    // Get language configuration
    const langConfig = LANGUAGE_CONFIG[language.toLowerCase()];
    
    if (!langConfig) {
      return {
        success: false,
        error: `Unsupported language: ${language}. Supported languages are: ${Object.keys(LANGUAGE_CONFIG).join(', ')}`
      };
    }

    // First, execute the code normally
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

    // Make request to Piston API
    const response = await axios.post(`${PISTON_API_URL}/execute`, payload, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    // Format the response
    const result = {
      success: true,
      language: langConfig.language,
      version: response.data.version,
      output: {
        stdout: response.data.run?.stdout || '',
        stderr: response.data.run?.stderr || '',
        output: response.data.run?.output || '',
        code: response.data.run?.code || 0
      },
      compile: response.data.compile ? {
        stdout: response.data.compile.stdout || '',
        stderr: response.data.compile.stderr || '',
        output: response.data.compile.output || '',
        code: response.data.compile.code || 0
      } : null
    };

    // Generate IR for all supported languages
    let ir = null;
    let irType = null;
    
    if (generateLLVM) {
      const irExtractor = new SimpleIRExtractor();
      
      if (langConfig.language === 'llvm_ir') {
        // Already LLVM IR
        ir = code;
        irType = 'llvm_ir';
      } else {
        // Extract IR for the language
        ir = await irExtractor.extract(langConfig.language, code);
        
        // Determine IR type
        if (ir && ir.includes('define ') && (ir.includes('target triple') || ir.includes('ret '))) {
          irType = 'llvm_ir';
        } else if (ir && (ir.includes('BYTECODE') || ir.includes('Bytecode'))) {
          irType = 'bytecode';
        } else if (ir && ir.includes('AST')) {
          irType = 'ast';
        } else {
          irType = 'ir_info';
        }
      }
    }

    // Add IR to result
    if (ir) {
      result.ir = ir;
      result.ir_type = irType;
      
      // Add TAC conversion only for LLVM IR
      if (irType === 'llvm_ir') {
        try {
          const converter = new LLVMToTACConverter();
          const tacRaw = converter.convert(ir);
          const tacFiltered = converter.filter(tacRaw);
          const instructionCount = converter.count(tacFiltered);
          
          result.tac_raw = tacRaw;
          result.tac = tacFiltered;
          result.instruction_count = instructionCount;
        } catch (error) {
          result.tac_error = `TAC conversion failed: ${error.message}`;
        }
      }
    }

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
  getRuntimes,
  generateLLVMIR,
  LANGUAGE_CONFIG
};
