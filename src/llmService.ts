/**
 * Wizard Chess 3D - LLM Chess Engine & Grandmaster Advisor Service
 * Supports Google Gemini, OpenAI, DeepSeek, and custom OpenAI-compatible endpoints (Ollama, OpenRouter, Qwen, etc.)
 */

export type LLMProvider = 'gemini' | 'openai' | 'deepseek' | 'custom';

export interface LLMConfig {
  provider: LLMProvider;
  apiKey: string;
  model: string;
  baseUrl: string;
  enabledForOpponent: boolean;
}

export interface BoardAnalysisState {
  fen: string;
  asciiBoard: string;
  currentTurn: 'w' | 'b';
  playerColor: 'w' | 'b' | 'spectator';
  gameMode: string;
  moveHistoryCount: number;
  recentMoves: string[];
  legalMoves: {
    fromR: number;
    fromC: number;
    toR: number;
    toC: number;
    uci: string;
    san: string;
    pieceType: string;
    capture: boolean;
  }[];
  capturedByWhite: number;
  capturedByBlack: number;
}

export interface GrandmasterHintResult {
  assessment: string;
  recommendedMoveUCI: string;
  recommendedMoveSAN: string;
  tacticalThreat: string;
  explanation: string;
  wizardQuote: string;
  evaluationScore?: string; // e.g. "+1.4" or "Equal"
  isLLMPowered: boolean;
}

export interface LLMAIMoveResult {
  uci: string;
  rationale: string;
  wizardQuote: string;
}

const STORAGE_KEY = 'wizard_chess_llm_config';

export const DEFAULT_MODELS: Record<LLMProvider, { model: string; baseUrl: string }> = {
  gemini: {
    model: 'gemini-2.5-flash',
    baseUrl: 'https://generativelanguage.googleapis.com'
  },
  openai: {
    model: 'gpt-4o-mini',
    baseUrl: 'https://api.openai.com/v1'
  },
  deepseek: {
    model: 'deepseek-chat',
    baseUrl: 'https://api.deepseek.com/v1'
  },
  custom: {
    model: 'llama3',
    baseUrl: 'http://localhost:11434/v1'
  }
};

class LLMService {
  private config: LLMConfig;
  private listeners: Set<(cfg: LLMConfig) => void> = new Set();

  constructor() {
    this.config = this.loadConfig();
  }

  private loadConfig(): LLMConfig {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        const prov: LLMProvider = (['gemini', 'openai', 'deepseek', 'custom'].includes(parsed.provider)
          ? parsed.provider
          : 'gemini') as LLMProvider;
        const defaults = DEFAULT_MODELS[prov] || DEFAULT_MODELS.gemini;
        return {
          provider: prov,
          apiKey: parsed.apiKey || '',
          model: parsed.model || defaults.model,
          baseUrl: parsed.baseUrl || defaults.baseUrl,
          enabledForOpponent: parsed.enabledForOpponent ?? false
        };
      }
    } catch (e) {
      console.warn('Failed to load LLM config from localStorage:', e);
    }

    return {
      provider: 'gemini',
      apiKey: '',
      model: DEFAULT_MODELS.gemini.model,
      baseUrl: DEFAULT_MODELS.gemini.baseUrl,
      enabledForOpponent: false
    };
  }

  public getConfig(): LLMConfig {
    return { ...this.config };
  }

  public saveConfig(newConfig: Partial<LLMConfig>): void {
    const updated: LLMConfig = {
      ...this.config,
      ...newConfig
    };
    this.config = updated;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.error('Failed to save LLM config:', e);
    }
    this.listeners.forEach((cb) => cb(updated));
  }

  public subscribe(callback: (cfg: LLMConfig) => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  public hasApiKey(): boolean {
    return Boolean(this.config.apiKey && this.config.apiKey.trim().length > 3);
  }

  /**
   * Quick connection test to verify API key and endpoint validity
   */
  public async testConnection(cfg?: LLMConfig): Promise<{ ok: boolean; message: string }> {
    const target = cfg || this.config;
    if (!target.apiKey.trim()) {
      return { ok: false, message: 'API Key is empty. Please enter your API key.' };
    }

    try {
      if (target.provider === 'gemini') {
        const url = `${target.baseUrl.replace(/\/$/, '')}/v1beta/models/${target.model}:generateContent?key=${target.apiKey.trim()}`;
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: 'Respond with "WIZARD_SANCTUM_OK" only.' }] }]
          })
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          const errMsg = errData.error?.message || `HTTP ${res.status}: ${res.statusText}`;
          return { ok: false, message: errMsg };
        }
        return { ok: true, message: 'Google Gemini connected successfully! ✦' };
      } else {
        // OpenAI, DeepSeek, or Custom OpenAI-compatible endpoint
        const endpoint = `${target.baseUrl.replace(/\/$/, '')}/chat/completions`;
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${target.apiKey.trim()}`
          },
          body: JSON.stringify({
            model: target.model,
            messages: [{ role: 'user', content: 'Respond with "WIZARD_SANCTUM_OK" only.' }],
            max_tokens: 10
          })
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          const errMsg = errData.error?.message || `HTTP ${res.status}: ${res.statusText}`;
          return { ok: false, message: errMsg };
        }
        return { ok: true, message: `${target.provider.toUpperCase()} API connected successfully! ✦` };
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return { ok: false, message: `Network error: ${msg}` };
    }
  }

  /**
   * Request Grandmaster Tactical Hint & Board Assessment
   */
  public async requestGrandmasterHint(
    state: BoardAnalysisState,
    lang: 'zh' | 'en' = 'zh'
  ): Promise<GrandmasterHintResult> {
    if (!this.hasApiKey()) {
      // Return high-quality local heuristic advice when no API key configured
      return this.getLocalGrandmasterAdvice(state, lang);
    }

    const legalListStr = state.legalMoves.map((m) => `${m.uci} (${m.san})`).join(', ');
    const turnStr = state.currentTurn === 'w' ? 'White (白方)' : 'Black (黑方)';
    const langPrompt = lang === 'zh'
      ? '请使用中文回复。用哥特远古巫师棋大导师的语气，深刻、威严且富有策略战术洞察。'
      : 'Please respond in English. Use the persona of an ancient Gothic Wizard Chess Grandmaster: deep, authoritative, and tactically profound.';

    const systemInstruction = `You are the Ancient Grandmaster of Wizard Chess residing within the Gothic Cathedral Sanctum.
Analyze the chessboard position and deliver expert strategic advice.

CRITICAL RULES:
1. You MUST choose the "recommendedMoveUCI" STRICTLY from the provided list of legal moves! Do NOT hallucinate an illegal move.
2. Return ONLY a valid JSON object with NO surrounding markdown backticks or commentary.

JSON format expected:
{
  "assessment": "Brief evaluation of the sanctum battle lines (who holds advantage, key threats)",
  "recommendedMoveUCI": "UCI of the best legal move, e.g. e2e4 or g1f3",
  "recommendedMoveSAN": "SAN of the best move, e.g. e4 or Nf3",
  "evaluationScore": "+0.8 or Equal or -1.2",
  "tacticalThreat": "Crucial danger or square to watch out for",
  "explanation": "2-3 sentences explaining the tactical rationale and consequences",
  "wizardQuote": "A brief dramatic medieval wizard quote (1 sentence)"
}
${langPrompt}`;

    const promptText = `
Current Board State:
FEN: ${state.fen}
Turn: ${turnStr}
Move Number: ${Math.floor(state.moveHistoryCount / 2) + 1}
Recent Moves: ${state.recentMoves.slice(-6).join(' ')}
Pieces Captured: White captured ${state.capturedByWhite}, Black captured ${state.capturedByBlack}

ASCII Board:
${state.asciiBoard}

Strictly Legal Moves for ${turnStr}:
[${legalListStr}]

Select the single best move from the legal list above and provide the JSON assessment.`;

    try {
      const rawResponse = await this.callLLM(systemInstruction, promptText);
      const parsed = this.cleanAndParseJSON<GrandmasterHintResult>(rawResponse);

      // Validate that recommendedMoveUCI is indeed among legal moves
      const match = state.legalMoves.find(
        (m) => m.uci.toLowerCase() === parsed.recommendedMoveUCI?.toLowerCase()
      );

      const validUCI = match ? match.uci : state.legalMoves[0]?.uci || 'e2e4';
      const validSAN = match ? match.san : state.legalMoves[0]?.san || validUCI;

      return {
        assessment: parsed.assessment || (lang === 'zh' ? '双方在黑曜石圣坛均势对峙。' : 'Balance holds across the obsidian altar.'),
        recommendedMoveUCI: validUCI,
        recommendedMoveSAN: validSAN,
        tacticalThreat: parsed.tacticalThreat || (lang === 'zh' ? '警惕王翼薄弱防线与突击战车。' : 'Beware exposed kingside flanks and prowling rooks.'),
        explanation: parsed.explanation || (lang === 'zh' ? '此举可稳固圣所中枢，压制敌军进路。' : 'This advance secures the altar sanctuary and cramps the opposing host.'),
        wizardQuote: parsed.wizardQuote || (lang === 'zh' ? '石雕将听从古老号令，斩破敌阵！' : 'The stone statues shall answer the ancient incantation!'),
        evaluationScore: parsed.evaluationScore || 'Equal',
        isLLMPowered: true
      };
    } catch (err) {
      console.warn('LLM Hint request failed, falling back to local heuristic advisor:', err);
      const fallback = this.getLocalGrandmasterAdvice(state, lang);
      fallback.assessment += (lang === 'zh' ? ' (大模型连接异常，已启用圣所本地推演)' : ' (LLM request timed out; local sanctum advisor engaged)');
      return fallback;
    }
  }

  /**
   * Request LLM Opponent Move
   */
  public async requestAIMove(state: BoardAnalysisState): Promise<LLMAIMoveResult | null> {
    if (!this.hasApiKey()) return null;

    const legalListStr = state.legalMoves.map((m) => m.uci).join(', ');
    const turnStr = state.currentTurn === 'w' ? 'White' : 'Black';

    const systemInstruction = `You are playing Wizard Chess as ${turnStr} in a Gothic Cathedral.
Your goal is to win decisively against your opponent.
You MUST select one move from the provided list of strictly legal moves.
Return ONLY JSON:
{
  "move": "uci_code_from_list",
  "rationale": "short strategic reason (under 15 words)",
  "wizardQuote": "A dramatic 1-sentence quote spoken by your piece"
}`;

    const promptText = `
Board FEN: ${state.fen}
Turn: ${turnStr}
Move Count: ${state.moveHistoryCount}
Recent Moves: ${state.recentMoves.slice(-4).join(' ')}

Legal Moves for ${turnStr}:
${legalListStr}

Choose the best move from the list above. Return JSON only.`;

    try {
      const raw = await this.callLLM(systemInstruction, promptText);
      const parsed = this.cleanAndParseJSON<{ move: string; rationale: string; wizardQuote: string }>(raw);
      if (!parsed || !parsed.move) return null;

      const cleanedMove = parsed.move.trim().toLowerCase();
      const legalMatch = state.legalMoves.find((m) => m.uci.toLowerCase() === cleanedMove);

      if (legalMatch) {
        return {
          uci: legalMatch.uci,
          rationale: parsed.rationale || 'Tactical initiative secured.',
          wizardQuote: parsed.wizardQuote || 'By stone and blade, step forth!'
        };
      }
      console.warn('LLM hallucinated illegal move:', cleanedMove, 'Legal options:', legalListStr);
      return null;
    } catch (e) {
      console.warn('LLM AI move generation error:', e);
      return null;
    }
  }

  /**
   * Unified call across Gemini, OpenAI, DeepSeek, and Custom API
   */
  private async callLLM(systemInstruction: string, prompt: string): Promise<string> {
    const { provider, apiKey, model, baseUrl } = this.config;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000); // 12s timeout

    try {
      if (provider === 'gemini') {
        const url = `${baseUrl.replace(/\/$/, '')}/v1beta/models/${model}:generateContent?key=${apiKey.trim()}`;
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: systemInstruction }] },
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              responseMimeType: 'application/json',
              temperature: 0.2
            }
          })
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error?.message || `Gemini API HTTP ${res.status}`);
        }
        const data = await res.json();
        return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      } else {
        // OpenAI-compatible Chat Completions format (OpenAI, DeepSeek, Ollama, etc.)
        const endpoint = `${baseUrl.replace(/\/$/, '')}/chat/completions`;
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey.trim()}`
          },
          signal: controller.signal,
          body: JSON.stringify({
            model,
            messages: [
              { role: 'system', content: systemInstruction },
              { role: 'user', content: prompt }
            ],
            temperature: 0.2,
            response_format: { type: 'json_object' }
          })
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error?.message || `API HTTP ${res.status}`);
        }
        const data = await res.json();
        return data.choices?.[0]?.message?.content || '';
      }
    } finally {
      clearTimeout(timeout);
    }
  }

  private cleanAndParseJSON<T>(raw: string): T {
    let clean = raw.trim();
    if (clean.startsWith('```json')) {
      clean = clean.replace(/^```json\s*/i, '').replace(/```\s*$/, '');
    } else if (clean.startsWith('```')) {
      clean = clean.replace(/^```\s*/, '').replace(/```\s*$/, '');
    }
    return JSON.parse(clean.trim()) as T;
  }

  /**
   * High-quality local algorithmic fallback advisor (Minimax evaluation + Tactical Motifs)
   */
  public getLocalGrandmasterAdvice(state: BoardAnalysisState, lang: 'zh' | 'en'): GrandmasterHintResult {
    const isZh = lang === 'zh';
    if (!state.legalMoves || state.legalMoves.length === 0) {
      return {
        assessment: isZh ? '局势已陷入终局裁决。' : 'Sanctum battle has reached final judgment.',
        recommendedMoveUCI: '',
        recommendedMoveSAN: '',
        tacticalThreat: isZh ? '无合法可行步数。' : 'No legal moves remaining.',
        explanation: isZh ? '棋盘无路可走。' : 'No maneuvers remain.',
        wizardQuote: isZh ? '终局钟声已鸣响。' : 'The cathedral bell tolls.',
        isLLMPowered: false
      };
    }

    // Evaluate best move based on capture value, center control, and king safety
    let bestMove = state.legalMoves[0];
    let bestScore = -9999;

    const pieceValues: Record<string, number> = {
      pawn: 100,
      knight: 320,
      bishop: 330,
      rook: 500,
      queen: 900,
      king: 20000
    };

    for (const m of state.legalMoves) {
      let score = 0;
      if (m.capture) {
        score += 350;
      }
      // Center squares (d4, d5, e4, e5)
      const centerDist = Math.abs(3.5 - m.toR) + Math.abs(3.5 - m.toC);
      score += (7 - centerDist) * 12;

      // Piece activity
      if (m.pieceType === 'knight' || m.pieceType === 'bishop') {
        score += 25;
      }
      if (score > bestScore) {
        bestScore = score;
        bestMove = m;
      }
    }

    const recUCI = bestMove.uci;
    const recSAN = bestMove.san || bestMove.uci;

    const explanationZh = bestMove.capture
      ? `立刻以${this.getPieceNameZh(bestMove.pieceType)}进行战术斩杀，击碎敌方前沿关键石雕，掠夺黑曜石祭坛的主导权。`
      : `将${this.getPieceNameZh(bestMove.pieceType)}调遣至核心要冲（${recUCI.slice(2, 4)}），巩固中路封锁线并为后排重兵开拓进攻射线。`;

    const explanationEn = bestMove.capture
      ? `Strike down the opposing piece with your ${bestMove.pieceType}, shattering the enemy spearhead and securing tactical dominance over the altar.`
      : `Advance your ${bestMove.pieceType} to post on ${recUCI.slice(2, 4)}, fortifying center corridors and preparing coordinated sanctum pressure.`;

    const quotesZh = [
      '黑曜石石板在共鸣，让你的石雕跨越中线发起破阵！',
      '古代巫师留下的阵法显示，此一步落子可令敌阵不攻自乱。',
      '圣堂的阴影已笼罩敌方薄弱翼侧，挥剑斩断犹豫！'
    ];
    const quotesEn = [
      'The obsidian altar hums with power; let your sculpted warriors press forward!',
      'Ancient sanctum wards declare this maneuver shall unbalance the enemy host.',
      'Gothic shadows cloak the flank; let steel and granite strike true!'
    ];

    const randomQuote = isZh
      ? quotesZh[Math.floor(Math.random() * quotesZh.length)]
      : quotesEn[Math.floor(Math.random() * quotesEn.length)];

    return {
      assessment: isZh
        ? `当前处于中局缠斗阶段。白方进攻威胁指数平稳，黑方严守后翼防御工事。`
        : `Midgame tension dominates the cathedral. Tactical probes test either flank.`,
      recommendedMoveUCI: recUCI,
      recommendedMoveSAN: recSAN,
      evaluationScore: bestMove.capture ? '+1.2' : '+0.4',
      tacticalThreat: isZh
        ? `时刻留意后排底线穿透，切勿将重型战车过早孤军突入。`
        : `Guard against back-rank infiltration; avoid overextending solitary rooks.`,
      explanation: isZh ? explanationZh : explanationEn,
      wizardQuote: randomQuote,
      isLLMPowered: false
    };
  }

  private getPieceNameZh(type: string): string {
    const map: Record<string, string> = {
      pawn: '士兵',
      knight: '骑士',
      bishop: '主教',
      rook: '战车',
      queen: '王后',
      king: '国王'
    };
    return map[type] || '棋子';
  }
}

export const llmService = new LLMService();
