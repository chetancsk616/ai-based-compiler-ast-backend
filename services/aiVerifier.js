/**
 * AI-Powered Code Verification Service
 * 
 * Acts as a SECONDARY JUDGE when TAC comparison is unclear or potentially wrong.
 * Uses AI to detect sophisticated cheating patterns that TAC analysis might miss.
 * 
 * When to use:
 * - TAC comparison shows mismatch but it might be a false positive
 * - TAC comparison shows match but code seems suspicious
 * - Need to verify if user is genuinely solving the problem or gaming the system
 */

const axios = require('axios');

class AIVerifier {
  constructor() {
    this.apiKey = process.env.GROQ_API_KEY || process.env.OPENAI_API_KEY || process.env.ANTHROPIC_API_KEY;
    this.provider = process.env.AI_PROVIDER || 'openai'; // 'openai', 'anthropic', or 'groq'
    this.model = process.env.AI_MODEL || (this.provider === 'groq' ? 'llama-3.3-70b-versatile' : 'gpt-4o-mini');
    this.enabled = !!this.apiKey;
    
    if (!this.enabled) {
      console.warn('[AI Verifier] No API key found. AI verification disabled.');
      console.warn('[AI Verifier] Set GROQ_API_KEY, OPENAI_API_KEY, or ANTHROPIC_API_KEY environment variable to enable.');
    } else {
      console.log(`[AI Verifier] ✅ Enabled with provider: ${this.provider}, model: ${this.model}`);
    }
  }

  /**
   * Check if AI verification is enabled
   */
  isEnabled() {
    return this.enabled;
  }

  /**
   * Verify if TAC comparison result is accurate
   * 
   * @param {Object} context - Verification context
   * @returns {Object} AI verification result
   */
  async verifyTACComparison(context) {
    if (!this.enabled) {
      return {
        verified: true,
        ai_used: false,
        reason: 'AI verification disabled (no API key)',
        confidence: 0
      };
    }

    const {
      referenceCode,
      userCode,
      referenceTAC,
      userTAC,
      referenceOperations,
      userOperations,
      tacLogicResult,
      language
    } = context;

    console.log('[AI Verifier] Analyzing code with AI...');
    const startTime = Date.now();

    try {
      const prompt = this.buildVerificationPrompt({
        referenceCode,
        userCode,
        referenceTAC,
        userTAC,
        referenceOperations,
        userOperations,
        tacLogicResult,
        language
      });

      const aiResponse = await this.callAI(prompt);
      const analysis = this.parseAIResponse(aiResponse);

      const verificationTime = ((Date.now() - startTime) / 1000).toFixed(2);
      console.log(`[AI Verifier] Analysis complete in ${verificationTime}s`);
      console.log(`[AI Verifier] Verdict: ${analysis.is_legitimate ? 'LEGITIMATE' : 'CHEATING'}`);
      console.log(`[AI Verifier] Confidence: ${analysis.confidence}%`);

      return {
        verified: true,
        ai_used: true,
        is_legitimate: analysis.is_legitimate,
        confidence: analysis.confidence,
        reason: analysis.reason,
        detailed_analysis: analysis.detailed_analysis,
        cheating_indicators: analysis.cheating_indicators,
        recommendation: analysis.recommendation,
        verification_time: parseFloat(verificationTime)
      };

    } catch (error) {
      console.error('[AI Verifier] Error:', error.message);
      return {
        verified: false,
        ai_used: true,
        error: error.message,
        fallback: 'Using TAC comparison result without AI verification'
      };
    }
  }

  /**
   * Build prompt for AI analysis
   */
  buildVerificationPrompt(data) {
    const tacMatch = data.tacLogicResult?.passed ? 'MATCH' : 'MISMATCH';
    const tacReason = data.tacLogicResult?.reason || 'Unknown';

    return `You are a code verification expert. Analyze if the user's code is a legitimate solution or an attempt to cheat/game the system.

**Reference Code (Correct Implementation):**
\`\`\`${data.language}
${data.referenceCode}
\`\`\`

**User Code (To Verify):**
\`\`\`${data.language}
${data.userCode}
\`\`\`

**TAC Comparison:**
- TAC Logic Check: ${tacMatch}
- Reason: ${tacReason}

**Reference TAC Operations:**
\`\`\`
${JSON.stringify(data.referenceOperations, null, 2)}
\`\`\`

**User TAC Operations:**
\`\`\`
${JSON.stringify(data.userOperations, null, 2)}
\`\`\`

**Reference TAC (Intermediate Code):**
\`\`\`
${data.referenceTAC?.slice(0, 20).join('\n') || 'N/A'}
${data.referenceTAC?.length > 20 ? '... (truncated)' : ''}
\`\`\`

**User TAC (Intermediate Code):**
\`\`\`
${data.userTAC?.slice(0, 20).join('\n') || 'N/A'}
${data.userTAC?.length > 20 ? '... (truncated)' : ''}
\`\`\`

**Your Task:**
Determine if the user's code is:
1. **LEGITIMATE**: A genuine attempt to solve the problem (may have different style but correct logic)
2. **CHEATING**: Hardcoded values, conditional hardcoding, or gaming the test cases

**Cheating Patterns to Look For:**
- Hardcoded return values (e.g., \`return 8;\` instead of \`return a+b;\`)
- Conditional hardcoding (e.g., \`if (a==5 && b==3) return 8;\`)
- Input-specific logic that won't work for other inputs
- Unused function parameters
- No actual computation performed
- Pattern matching test cases instead of implementing algorithm

**Respond ONLY with valid JSON (no markdown, no code blocks):**
{
  "is_legitimate": true/false,
  "confidence": 0-100,
  "reason": "Brief explanation (max 100 words)",
  "detailed_analysis": "Detailed analysis of the code (max 200 words)",
  "cheating_indicators": ["list", "of", "specific", "issues"],
  "recommendation": "PASS" or "FAIL"
}`;
  }

  /**
   * Call AI API
   */
  async callAI(prompt) {
    if (this.provider === 'openai') {
      return await this.callOpenAI(prompt);
    } else if (this.provider === 'anthropic') {
      return await this.callAnthropic(prompt);
    } else if (this.provider === 'groq') {
      return await this.callGroq(prompt);
    } else {
      throw new Error(`Unsupported AI provider: ${this.provider}`);
    }
  }

  /**
   * Call OpenAI API
   */
  async callOpenAI(prompt) {
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: this.model,
        messages: [
          {
            role: 'system',
            content: 'You are a code verification expert. Respond only with valid JSON.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 1000
      },
      {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      }
    );

    return response.data.choices[0].message.content;
  }

  /**
   * Call Anthropic API
   */
  async callAnthropic(prompt) {
    const response = await axios.post(
      'https://api.anthropic.com/v1/messages',
      {
        model: this.model,
        max_tokens: 1000,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      },
      {
        headers: {
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01',
          'Content-Type': 'application/json'
        },
        timeout: 30000
      }
    );

    return response.data.content[0].text;
  }

  /**
   * Call Groq API (compatible with OpenAI format)
   */
  async callGroq(prompt) {
    const response = await axios.post(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        model: this.model,
        messages: [
          {
            role: 'system',
            content: 'You are a code verification expert. Respond only with valid JSON.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 1000
      },
      {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      }
    );

    return response.data.choices[0].message.content;
  }

  /**
   * Parse AI response
   */
  parseAIResponse(responseText) {
    try {
      // Remove markdown code blocks if present
      let cleanedText = responseText.trim();
      if (cleanedText.startsWith('```json')) {
        cleanedText = cleanedText.replace(/```json\n?/g, '').replace(/```\n?/g, '');
      } else if (cleanedText.startsWith('```')) {
        cleanedText = cleanedText.replace(/```\n?/g, '');
      }

      const parsed = JSON.parse(cleanedText);

      // Validate required fields
      if (typeof parsed.is_legitimate !== 'boolean') {
        throw new Error('Missing or invalid is_legitimate field');
      }
      if (typeof parsed.confidence !== 'number') {
        throw new Error('Missing or invalid confidence field');
      }

      return {
        is_legitimate: parsed.is_legitimate,
        confidence: parsed.confidence,
        reason: parsed.reason || 'No reason provided',
        detailed_analysis: parsed.detailed_analysis || '',
        cheating_indicators: parsed.cheating_indicators || [],
        recommendation: parsed.recommendation || (parsed.is_legitimate ? 'PASS' : 'FAIL')
      };
    } catch (error) {
      console.error('[AI Verifier] Failed to parse AI response:', error.message);
      console.error('[AI Verifier] Raw response:', responseText);
      
      // Fallback: analyze response text heuristically
      const isLegitimate = responseText.toLowerCase().includes('legitimate') || 
                          responseText.toLowerCase().includes('correct');
      
      return {
        is_legitimate: isLegitimate,
        confidence: 50,
        reason: 'AI response parsing failed, using heuristic analysis',
        detailed_analysis: responseText.substring(0, 200),
        cheating_indicators: [],
        recommendation: isLegitimate ? 'PASS' : 'FAIL'
      };
    }
  }

  /**
   * Check if AI verification is enabled
   */
  isEnabled() {
    return this.enabled;
  }

  /**
   * Get configuration info
   */
  getConfig() {
    return {
      enabled: this.enabled,
      provider: this.provider,
      model: this.model,
      hasApiKey: !!this.apiKey
    };
  }
}

module.exports = { AIVerifier };
