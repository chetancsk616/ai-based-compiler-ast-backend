const { exec, spawn } = require('child_process');
const fs = require('fs').promises;
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const { LLVMToTACConverter } = require('./llvmToTAC');

/**
 * Local code execution service
 * Executes code using local compilers/interpreters with fallback to Piston API
 */
class LocalExecutor {
  constructor() {
    this.tempDir = path.join(os.tmpdir(), 'code-executor');
    this.timeout = 10000; // 10 seconds
    this.initialized = false;
  }

  async initialize() {
    if (this.initialized) return;
    
    try {
      await fs.mkdir(this.tempDir, { recursive: true });
      this.initialized = true;
      console.log('✓ Local executor initialized:', this.tempDir);
    } catch (error) {
      console.error('✗ Failed to initialize local executor:', error.message);
    }
  }

  /**
   * Check if local compiler/interpreter is available
   */
  async checkAvailability(language) {
    const commands = {
      c: 'gcc --version',
      cpp: 'g++ --version',
      'c++': 'g++ --version',
      python: 'python --version',
      javascript: 'node --version',
      js: 'node --version',
      node: 'node --version',
      java: 'javac -version'
    };

    const command = commands[language.toLowerCase()];
    if (!command) return false;

    return new Promise((resolve) => {
      exec(command, (error) => {
        resolve(!error);
      });
    });
  }

  /**
   * Execute code locally
   */
  async execute(language, code, stdin = '') {
    await this.initialize();

    const startTime = Date.now();
    
    try {
      const lang = language.toLowerCase();
      
      // Check if local execution is available
      const available = await this.checkAvailability(lang);
      if (!available) {
        return {
          success: false,
          error: `Local ${language} compiler/interpreter not available`,
          fallback_needed: true
        };
      }

      let result;
      
      if (lang === 'c') {
        result = await this.executeC(code, stdin);
      } else if (lang === 'cpp' || lang === 'c++') {
        result = await this.executeCpp(code, stdin);
      } else if (lang === 'python') {
        result = await this.executePython(code, stdin);
      } else if (lang === 'javascript' || lang === 'js' || lang === 'node') {
        result = await this.executeJavaScript(code, stdin);
      } else if (lang === 'java') {
        result = await this.executeJava(code, stdin);
      } else {
        return {
          success: false,
          error: `Unsupported language: ${language}`,
          fallback_needed: true
        };
      }

      const endTime = Date.now();
      const executionTime = (endTime - startTime) / 1000; // Convert to seconds

      // Generate TAC for C/C++ code
      let tac = null;
      let tac_raw = null;
      let instruction_count = null;
      
      if (lang === 'c' || lang === 'cpp' || lang === 'c++') {
        try {
          const llvmIR = await this.generateLLVMIR(code, lang);
          if (llvmIR) {
            const converter = new LLVMToTACConverter();
            tac_raw = converter.convert(llvmIR);
            tac = converter.filter(tac_raw);
            instruction_count = converter.count(tac);
          }
        } catch (error) {
          console.error(`TAC generation failed: ${error.message}`);
          // Don't fail execution if TAC generation fails
        }
      }

      return {
        success: true,
        stdout: result.stdout,
        stderr: result.stderr,
        exit_code: result.exitCode,
        execution_time: parseFloat(executionTime.toFixed(2)),
        source: 'local',
        tac: tac,
        tac_raw: tac_raw,
        instruction_count: instruction_count
      };

    } catch (error) {
      return {
        success: false,
        error: error.message,
        fallback_needed: true
      };
    }
  }

  /**
   * Generate LLVM IR for C/C++ code using clang
   */
  async generateLLVMIR(code, language) {
    const sessionId = crypto.randomUUID();
    const ext = language === 'c' ? 'c' : 'cpp';
    const sourceFile = path.join(this.tempDir, `${sessionId}.${ext}`);
    const llFile = path.join(this.tempDir, `${sessionId}.ll`);

    try {
      await fs.writeFile(sourceFile, code, 'utf8');
      
      // Compile to LLVM IR using clang
      const command = `clang -S -emit-llvm -O0 "${sourceFile}" -o "${llFile}"`;
      const result = await this.runCommand(command, '');
      
      if (result.exitCode === 0) {
        const llvmIR = await fs.readFile(llFile, 'utf8');
        await this.cleanup([sourceFile, llFile]);
        return llvmIR;
      } else {
        await this.cleanup([sourceFile, llFile]);
        return null;
      }
    } catch (error) {
      await this.cleanup([sourceFile, llFile]);
      console.error('LLVM IR generation failed:', error.message);
      return null;
    }
  }

  /**
   * Execute C code
   */
  async executeC(code, stdin) {
    const sessionId = crypto.randomUUID();
    const sourceFile = path.join(this.tempDir, `${sessionId}.c`);
    const execFile = path.join(this.tempDir, `${sessionId}.exe`);

    try {
      // Write source file
      await fs.writeFile(sourceFile, code, 'utf8');

      // Compile
      const compileResult = await this.runCommand(`gcc "${sourceFile}" -o "${execFile}"`, '');
      if (compileResult.exitCode !== 0) {
        return {
          stdout: '',
          stderr: compileResult.stderr || compileResult.stdout,
          exitCode: compileResult.exitCode
        };
      }

      // Execute
      const execResult = await this.runCommand(`"${execFile}"`, stdin);
      return execResult;

    } finally {
      // Cleanup
      await this.cleanup([sourceFile, execFile]);
    }
  }

  /**
   * Execute C++ code
   */
  async executeCpp(code, stdin) {
    const sessionId = crypto.randomUUID();
    const sourceFile = path.join(this.tempDir, `${sessionId}.cpp`);
    const execFile = path.join(this.tempDir, `${sessionId}.exe`);

    try {
      // Write source file
      await fs.writeFile(sourceFile, code, 'utf8');

      // Compile
      const compileResult = await this.runCommand(`g++ "${sourceFile}" -o "${execFile}"`, '');
      if (compileResult.exitCode !== 0) {
        return {
          stdout: '',
          stderr: compileResult.stderr || compileResult.stdout,
          exitCode: compileResult.exitCode
        };
      }

      // Execute
      const execResult = await this.runCommand(`"${execFile}"`, stdin);
      return execResult;

    } finally {
      // Cleanup
      await this.cleanup([sourceFile, execFile]);
    }
  }

  /**
   * Execute Python code
   */
  async executePython(code, stdin) {
    const sessionId = crypto.randomUUID();
    const sourceFile = path.join(this.tempDir, `${sessionId}.py`);

    try {
      // Write source file
      await fs.writeFile(sourceFile, code, 'utf8');

      // Execute
      const execResult = await this.runCommand(`python "${sourceFile}"`, stdin);
      return execResult;

    } finally {
      // Cleanup
      await this.cleanup([sourceFile]);
    }
  }

  /**
   * Execute JavaScript code
   */
  async executeJavaScript(code, stdin) {
    const sessionId = crypto.randomUUID();
    const sourceFile = path.join(this.tempDir, `${sessionId}.js`);

    try {
      // Write source file
      await fs.writeFile(sourceFile, code, 'utf8');

      // Execute
      const execResult = await this.runCommand(`node "${sourceFile}"`, stdin);
      return execResult;

    } finally {
      // Cleanup
      await this.cleanup([sourceFile]);
    }
  }

  /**
   * Execute Java code
   */
  async executeJava(code, stdin) {
    const sessionId = crypto.randomUUID();
    
    // Extract class name from code
    const classNameMatch = code.match(/public\s+class\s+(\w+)/);
    const className = classNameMatch ? classNameMatch[1] : 'Main';
    
    const sourceFile = path.join(this.tempDir, `${className}.java`);
    const classFile = path.join(this.tempDir, `${className}.class`);

    try {
      // Write source file
      await fs.writeFile(sourceFile, code, 'utf8');

      // Compile
      const compileResult = await this.runCommand(`javac "${sourceFile}"`, '');
      if (compileResult.exitCode !== 0) {
        return {
          stdout: '',
          stderr: compileResult.stderr || compileResult.stdout,
          exitCode: compileResult.exitCode
        };
      }

      // Execute (run from temp directory to find .class file)
      const execResult = await this.runCommand(`cd "${this.tempDir}" && java ${className}`, stdin);
      return execResult;

    } finally {
      // Cleanup
      await this.cleanup([sourceFile, classFile]);
    }
  }

  /**
   * Run a command with timeout and stdin
   */
  runCommand(command, stdin) {
    return new Promise((resolve, reject) => {
      const child = exec(command, {
        timeout: this.timeout,
        maxBuffer: 10 * 1024 * 1024, // 10MB
        windowsHide: true
      });

      let stdout = '';
      let stderr = '';
      let timedOut = false;

      // Set timeout
      const timer = setTimeout(() => {
        timedOut = true;
        child.kill();
        reject(new Error('Execution timeout'));
      }, this.timeout);

      // Collect output
      child.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      // Send stdin if provided
      if (stdin) {
        child.stdin.write(stdin);
        child.stdin.end();
      }

      // Handle completion
      child.on('close', (code) => {
        clearTimeout(timer);
        if (!timedOut) {
          resolve({
            stdout: stdout,
            stderr: stderr,
            exitCode: code || 0
          });
        }
      });

      child.on('error', (error) => {
        clearTimeout(timer);
        reject(error);
      });
    });
  }

  /**
   * Cleanup temporary files
   */
  async cleanup(files) {
    for (const file of files) {
      try {
        await fs.unlink(file);
      } catch (error) {
        // Ignore cleanup errors
      }
    }
  }
}

module.exports = { LocalExecutor };
