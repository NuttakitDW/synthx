/**
 * Claude API Client
 *
 * Handles all communication with Anthropic Claude API
 */

class ClaudeClient {
  constructor(apiKey, model = 'claude-3-5-sonnet-20241022', maxTokens = 1024) {
    this.apiKey = apiKey;
    this.model = model;
    this.maxTokens = maxTokens;
    this.apiBase = 'https://api.anthropic.com/v1';
  }

  /**
   * Send message to Claude and get response
   * @param {string} userMessage - User's message
   * @param {string} systemPrompt - System instructions
   * @param {object} options - Additional options
   * @returns {Promise<string>} Claude's response
   */
  async chat(userMessage, systemPrompt = '', options = {}) {
    const messages = [
      {
        role: 'user',
        content: userMessage,
      },
    ];

    const payload = {
      model: this.model,
      max_tokens: options.maxTokens || this.maxTokens,
      messages: messages,
    };

    if (systemPrompt) {
      payload.system = systemPrompt;
    }

    try {
      const response = await fetch(`${this.apiBase}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`Claude API error: ${error.error?.message || response.status}`);
      }

      const data = await response.json();
      return data.content[0].text;
    } catch (error) {
      console.error('[Claude] API Error:', error);
      throw error;
    }
  }

  /**
   * Analyze token for safety using Claude
   * @param {object} tokenData - Token information from Blockscout
   * @returns {Promise<object>} Safety analysis result
   */
  async analyzeTokenSafety(tokenData) {
    const systemPrompt = `You are a DeFi token safety analyzer. Analyze the provided token data and return ONLY a valid JSON object with NO additional text.

Return exactly this structure:
{
  "safety_score": <0-100>,
  "verdict": "<SCAM|RISKY|SAFE>",
  "risks": ["<risk1>", "<risk2>"],
  "reason": "<brief explanation>",
  "confidence": "<HIGH|MEDIUM|LOW>"
}`;

    const userMessage = `Analyze this token for safety:
${JSON.stringify(tokenData, null, 2)}`;

    const response = await this.chat(userMessage, systemPrompt);

    try {
      // Extract JSON from response (in case Claude adds extra text)
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }
      return JSON.parse(jsonMatch[0]);
    } catch (error) {
      console.error('[Claude] JSON parsing error:', error);
      // Return a safe default response
      return {
        safety_score: 50,
        verdict: 'RISKY',
        risks: ['Unable to analyze'],
        reason: 'Analysis failed - please try again',
        confidence: 'LOW',
      };
    }
  }

  /**
   * Analyze wallet trading history
   * @param {object} walletData - Wallet trading data
   * @returns {Promise<object>} Wallet analysis
   */
  async analyzeWalletTrading(walletData) {
    const systemPrompt = `You are a DeFi trading analyst. Analyze the provided trading history and return ONLY a valid JSON object.

Return exactly this structure:
{
  "win_rate": "<percentage>",
  "total_trades": <number>,
  "profitable_trades": <number>,
  "biggest_win": "<amount>",
  "biggest_loss": "<amount>",
  "most_profitable_pair": "<pair>",
  "risk_patterns": ["<pattern1>", "<pattern2>"],
  "recommendation": "<actionable advice>",
  "average_hold_time": "<duration>"
}`;

    const userMessage = `Analyze this trader's performance:
${JSON.stringify(walletData, null, 2)}`;

    const response = await this.chat(userMessage, systemPrompt);

    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }
      return JSON.parse(jsonMatch[0]);
    } catch (error) {
      console.error('[Claude] JSON parsing error:', error);
      return {
        win_rate: 'Unknown',
        total_trades: 0,
        profitable_trades: 0,
        biggest_win: '-',
        biggest_loss: '-',
        most_profitable_pair: '-',
        risk_patterns: [],
        recommendation: 'Unable to analyze - please try again',
        average_hold_time: '-',
      };
    }
  }
}

// Export for use in background.js
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ClaudeClient;
}
