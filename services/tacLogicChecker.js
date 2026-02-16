/**
 * TAC Logic Checker - Verifies algorithmic correctness by comparing intermediate code (TAC)
 * 
 * This service solves the fundamental problem of output-only verification:
 * - Output matching can pass for hardcoded values (e.g., "return 8" when input is (5,3))
 * - TAC comparison checks the ACTUAL COMPUTATION LOGIC
 * 
 * Example:
 *   Reference: int add(int a, int b) { return a + b; }
 *   User:      int add(int a, int b) { return 8; }
 * 
 *   Output check: 8 == 8 ✓ (FALSE POSITIVE!)
 *   TAC check:    Reference has ADD operation, User has none ✗ (CORRECT DETECTION!)
 */

class TACLogicChecker {
  constructor() {
    // Cache for reference code TAC to avoid re-extraction
    // Key: hash of (code + language), Value: { tac, operations, timestamp }
    this.referenceCache = new Map();
    this.CACHE_TTL = 3600000; // 1 hour in milliseconds
  }

  /**
   * Generate cache key from code and language
   */
  _generateCacheKey(code, language) {
    // Simple hash function (FNV-1a)
    let hash = 2166136261;
    const str = `${language}:${code}`;
    for (let i = 0; i < str.length; i++) {
      hash ^= str.charCodeAt(i);
      hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
    }
    return hash >>> 0; // Convert to unsigned 32-bit integer
  }

  /**
   * Clean expired cache entries
   */
  _cleanCache() {
    const now = Date.now();
    for (const [key, value] of this.referenceCache.entries()) {
      if (now - value.timestamp > this.CACHE_TTL) {
        this.referenceCache.delete(key);
      }
    }
  }

  /**
   * Extract TAC operations from filtered TAC array
   */
  extractOperations(tac) {
    const operations = {
      add: 0,
      sub: 0,
      mul: 0,
      div: 0,
      call: 0,
      return: 0,
      load: 0,
      store: 0,
      alloca: 0
    };

    for (const line of tac) {
      if (line.includes(' + ')) operations.add++;
      else if (line.includes(' - ')) operations.sub++;
      else if (line.includes(' * ')) operations.mul++;
      else if (line.includes(' / ')) operations.div++;
      else if (line.includes('call ')) operations.call++;
      else if (line.startsWith('return')) operations.return++;
      else if (line.includes('load ')) operations.load++;
      else if (line.includes('store ')) operations.store++;
      else if (line.includes('alloca')) operations.alloca++;
    }

    return operations;
  }

  /**
   * Compare operations between reference and user code
   * Returns true if operations match algorithmically
   */
  compareOperations(referenceOps, userOps) {
    const criticalOps = ['add', 'sub', 'mul', 'div', 'call'];
    
    const missingOps = [];
    const extraOps = [];
    const mismatchedOps = [];

    for (const op of criticalOps) {
      const refCount = referenceOps[op] || 0;
      const userCount = userOps[op] || 0;

      if (refCount > 0 && userCount === 0) {
        missingOps.push(op);
      } else if (refCount === 0 && userCount > 0) {
        extraOps.push(op);
      } else if (refCount !== userCount) {
        mismatchedOps.push({ op, expected: refCount, got: userCount });
      }
    }

    const hasLogicMismatch = missingOps.length > 0 || extraOps.length > 0;
    const hasCountMismatch = mismatchedOps.length > 0;

    return {
      match: !hasLogicMismatch, // Only fail if operations are missing/extra
      exact_match: !hasLogicMismatch && !hasCountMismatch, // Exact if operations and counts match
      missing_operations: missingOps,
      extra_operations: extraOps,
      mismatched_counts: mismatchedOps,
      reference_operations: referenceOps,
      user_operations: userOps
    };
  }

  /**
   * Check if user code returns hardcoded value without computation
   */
  detectHardcodedReturn(tac, operations) {
    // If there's a return but no arithmetic/logic operations, likely hardcoded
    const hasReturn = operations.return > 0;
    const hasComputation = operations.add > 0 || operations.sub > 0 || 
                          operations.mul > 0 || operations.div > 0;
    
    if (hasReturn && !hasComputation) {
      // Check if return statement has a constant
      for (const line of tac) {
        if (line.startsWith('return')) {
          // Check if it's returning a number (constant)
          const match = line.match(/return\s+(-?\d+)/);
          if (match) {
            return {
              detected: true,
              constant: match[1],
              reason: `Function returns constant ${match[1]} without performing any computation`
            };
          }
        }
      }
    }

    return { detected: false };
  }

  /**
   * Verify logic correctness using TAC comparison
   * 
   * @param {Object} referenceCode - { code, language, tac }
   * @param {Object} userCode - { code, language, tac }
   * @returns {Object} Logic verification result
   */
  verifyLogic(referenceCode, userCode) {
    // Clean old cache entries periodically
    if (this.referenceCache.size > 100) {
      this._cleanCache();
    }

    // Extract reference operations (with caching)
    const cacheKey = this._generateCacheKey(referenceCode.code, referenceCode.language);
    let referenceData = this.referenceCache.get(cacheKey);

    if (!referenceData) {
      // Cache miss - extract operations from reference TAC
      const referenceOps = this.extractOperations(referenceCode.tac || []);
      referenceData = {
        tac: referenceCode.tac || [],
        operations: referenceOps,
        timestamp: Date.now()
      };
      this.referenceCache.set(cacheKey, referenceData);
      console.log(`[TAC Logic] Cache miss - extracted reference TAC (cache size: ${this.referenceCache.size})`);
    } else {
      console.log(`[TAC Logic] Cache hit - reusing reference TAC`);
    }

    // Extract user operations (never cached - always fresh)
    const userOps = this.extractOperations(userCode.tac || []);

    // Compare operations
    const comparison = this.compareOperations(referenceData.operations, userOps);

    // Detect hardcoded returns
    const hardcoded = this.detectHardcodedReturn(userCode.tac || [], userOps);

    // Determine if logic check passed
    const logicPassed = comparison.match && !hardcoded.detected;

    // Generate detailed message
    let message = '';
    let reason = '';
    
    if (!comparison.match) {
      if (comparison.missing_operations.length > 0) {
        reason = `Missing operations: ${comparison.missing_operations.join(', ')}`;
        message = `User code is missing critical operations (${comparison.missing_operations.join(', ')}) that are present in reference solution. This indicates the logic is incomplete or hardcoded.`;
      } else if (comparison.extra_operations.length > 0) {
        reason = `Extra operations: ${comparison.extra_operations.join(', ')}`;
        message = `User code contains extra operations (${comparison.extra_operations.join(', ')}) not present in reference solution. This indicates a different algorithmic approach.`;
      }
    } else if (hardcoded.detected) {
      reason = hardcoded.reason;
      message = `User code appears to return a hardcoded constant (${hardcoded.constant}) without performing the required computation.`;
    } else if (!comparison.exact_match) {
      // Operations match but counts differ (allow this - different implementation)
      message = `Logic appears correct but operation counts differ. This may indicate a different but valid implementation approach.`;
      reason = 'Operation count mismatch';
    } else {
      message = 'User code logic matches reference solution';
      reason = 'TAC operations match';
    }

    return {
      passed: logicPassed,
      exact_match: comparison.exact_match,
      message: message,
      reason: reason,
      tac_comparison: {
        operations_match: comparison.match,
        reference_operations: referenceData.operations,
        user_operations: userOps,
        missing_operations: comparison.missing_operations,
        extra_operations: comparison.extra_operations,
        mismatched_counts: comparison.mismatched_counts
      },
      hardcoded_detection: hardcoded,
      cache_info: {
        reference_cached: referenceData !== null,
        cache_size: this.referenceCache.size
      }
    };
  }

  /**
   * Get cache statistics (for monitoring)
   */
  getCacheStats() {
    return {
      size: this.referenceCache.size,
      ttl_ms: this.CACHE_TTL,
      entries: Array.from(this.referenceCache.entries()).map(([key, value]) => ({
        key: key,
        age_ms: Date.now() - value.timestamp,
        operations: value.operations
      }))
    };
  }

  /**
   * Clear cache manually (for testing or admin purposes)
   */
  clearCache() {
    const oldSize = this.referenceCache.size;
    this.referenceCache.clear();
    return { cleared: oldSize };
  }
}

module.exports = { TACLogicChecker };
