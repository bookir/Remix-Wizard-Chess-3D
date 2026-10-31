import { useEffect, useRef, useState } from 'react';
import { initWizardChess } from './wizardChessEngine.js';
import { audioEngine, AudioState } from './audioEngine.ts';
import { UI_TRANSLATIONS, Language } from './translations.ts';
import { llmService, LLMConfig, LLMProvider, GrandmasterHintResult, DEFAULT_MODELS } from './llmService.ts';

interface WizardChessWin {
  wizardChess?: {
    undoMove?: () => boolean;
    toggleUI?: (force?: boolean) => void;
    setGameMode?: (mode: 'single' | 'pvp') => void;
    getGameMode?: () => 'single' | 'pvp' | 'multi';
    getBoardAnalysisState?: () => any;
    executeMoveUCI?: (uci: string) => boolean;
    triggerAIMoveNow?: () => boolean;
  };
}

export default function App() {
  const initializedRef = useRef(false);
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false);
  const [audioState, setAudioState] = useState<AudioState>(() => audioEngine.getState());
  const [gameMode, setGameMode] = useState<'single' | 'pvp'>('single');

  // Grandmaster Hint Modal State
  const [hintModalOpen, setHintModalOpen] = useState(false);
  const [hintLoading, setHintLoading] = useState(false);
  const [hintResult, setHintResult] = useState<GrandmasterHintResult | null>(null);

  // LLM Settings Modal State
  const [llmModalOpen, setLlmModalOpen] = useState(false);
  const [llmConfig, setLlmConfig] = useState<LLMConfig>(() => llmService.getConfig());
  const [testingConnection, setTestingConnection] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [showApiKey, setShowApiKey] = useState(false);

  const lang: Language = audioState.language || 'zh';
  const t = UI_TRANSLATIONS[lang] || UI_TRANSLATIONS.zh;

  useEffect(() => {
    const unsubAudio = audioEngine.subscribe((s) => {
      setAudioState({ ...s });
    });
    const unsubLLM = llmService.subscribe((cfg) => {
      setLlmConfig({ ...cfg });
    });
    return () => {
      unsubAudio();
      unsubLLM();
    };
  }, []);

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;
    initWizardChess();
  }, []);

  const handleUndo = () => {
    const win = window as unknown as WizardChessWin;
    if (win.wizardChess?.undoMove) {
      win.wizardChess.undoMove();
    }
  };

  const handleToggleGameMode = () => {
    const nextMode = gameMode === 'single' ? 'pvp' : 'single';
    setGameMode(nextMode);
    const win = window as unknown as WizardChessWin;
    if (win.wizardChess?.setGameMode) {
      win.wizardChess.setGameMode(nextMode);
    }
  };

  const handleOpenGrandmasterHint = async () => {
    setHintModalOpen(true);
    setHintLoading(true);
    const win = window as unknown as WizardChessWin;
    const boardState = win.wizardChess?.getBoardAnalysisState ? win.wizardChess.getBoardAnalysisState() : null;

    if (boardState) {
      try {
        const hint = await llmService.requestGrandmasterHint(boardState, lang);
        setHintResult(hint);
      } catch (e) {
        console.error('Failed to get hint:', e);
      } finally {
        setHintLoading(false);
      }
    } else {
      setHintLoading(false);
    }
  };

  const handleExecuteRecommendedMove = () => {
    if (!hintResult?.recommendedMoveUCI) return;
    const win = window as unknown as WizardChessWin;
    if (win.wizardChess?.executeMoveUCI) {
      win.wizardChess.executeMoveUCI(hintResult.recommendedMoveUCI);
    }
    setHintModalOpen(false);
  };

  const handleTestLLM = async () => {
    setTestingConnection(true);
    setTestResult(null);
    try {
      const res = await llmService.testConnection(llmConfig);
      setTestResult(res);
    } finally {
      setTestingConnection(false);
    }
  };

  const handleSaveLLM = () => {
    llmService.saveConfig(llmConfig);
    setLlmModalOpen(false);
    setTestResult(null);
  };

  const handleSelectProvider = (prov: LLMProvider) => {
    setLlmConfig((prev) => ({
      ...prev,
      provider: prov,
      model: DEFAULT_MODELS[prov].model,
      baseUrl: DEFAULT_MODELS[prov].baseUrl
    }));
    setTestResult(null);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (hintModalOpen) setHintModalOpen(false);
        else if (llmModalOpen) setLlmModalOpen(false);
        else setMobileSheetOpen(false);
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        handleUndo();
      }
    };
    const handleResize = () => {
      if (window.innerWidth > 768) {
        setMobileSheetOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('resize', handleResize);
    };
  }, [hintModalOpen, llmModalOpen]);

  const handleRestoreUI = () => {
    const win = window as unknown as WizardChessWin;
    if (win.wizardChess?.toggleUI) {
      win.wizardChess.toggleUI(false);
    } else {
      document.body.classList.remove('cinematic-ui-hidden');
      const btnHide = document.getElementById('btn-hide-ui');
      if (btnHide) btnHide.textContent = t.hideUI;
    }
  };

  return (
    <>
      <div id="loading-overlay">
        <div className="loader-title">{t.loaderTitle}</div>
        <div className="loader-bar-wrap">
          <div className="loader-bar" id="loader-bar"></div>
        </div>
        <div id="loader-text">{t.loaderText}</div>
      </div>

      <div id="canvas-container"></div>

      <button
        type="button"
        className="hud-btn mobile-only-restore-ui"
        id="btn-mobile-show-ui"
        onClick={handleRestoreUI}
        title={t.showUI}
      >
        {t.showUI}
      </button>

      <div id="hud-top">
        <div className="hud-group" id="hud-left">
          <div className="brand-pill">
            <span className="brand-title">{t.brandTitle}</span>
          </div>
          <div className="status-pill" id="status-pill">
            <span className="turn-dot" id="turn-dot"></span>
            <span id="turn-text">{t.whiteToMove}</span>
            <span className="mode-badge" id="mode-badge">
              {gameMode === 'pvp' ? t.modeBadgePvP : t.playingAsWhite}
            </span>
          </div>

          {/* Game Mode Switcher Button */}
          <button
            type="button"
            className="hud-btn hud-mode-btn"
            id="btn-game-mode"
            onClick={handleToggleGameMode}
            title={t.switchGameModeTitle}
          >
            {gameMode === 'single' ? t.gameModePvE : t.gameModePvP}
          </button>

          {/* Grandmaster Hint Button */}
          <button
            type="button"
            className="hud-btn hud-hint-btn"
            id="btn-quick-hint"
            onClick={handleOpenGrandmasterHint}
            title={t.grandmasterHintTitle}
          >
            {t.grandmasterHint}
          </button>

          {/* LLM Configuration Settings Button */}
          <button
            type="button"
            className="hud-btn hud-config-btn"
            id="btn-quick-llm"
            onClick={() => setLlmModalOpen(true)}
            title={t.llmConfigBtnTitle}
          >
            {t.llmConfigBtn}
          </button>

          <button
            type="button"
            className={`hud-btn hud-sound-btn ${audioState.soundEnabled ? 'active' : 'muted'}`}
            id="btn-quick-sound"
            onClick={() => audioEngine.toggleSound()}
            title={audioState.soundEnabled ? '音效已开启 (点击静音) / Sound Enabled' : '音效已静音 (点击开启) / Sound Muted'}
          >
            {audioState.soundEnabled ? '🔊' : '🔇'}
          </button>
          <button
            type="button"
            className="hud-btn hud-lang-btn"
            id="btn-lang-toggle"
            onClick={() => audioEngine.toggleLanguage()}
            title={t.langToggleTitle}
          >
            {t.langToggleShort}
          </button>
          <button
            type="button"
            className="hud-btn hud-undo-btn"
            id="btn-quick-undo"
            onClick={handleUndo}
            title={t.undoTitle}
          >
            ↩ {t.undo}
          </button>
        </div>

        <button
          type="button"
          className={`hud-btn mobile-controls-trigger ${mobileSheetOpen ? 'active' : ''}`}
          id="btn-mobile-controls"
          aria-expanded={mobileSheetOpen}
          aria-controls="hud-right"
          onClick={() => setMobileSheetOpen((prev) => !prev)}
        >
          {mobileSheetOpen ? t.close : t.controlsTitle}
        </button>

        <div
          className={`mobile-sheet-backdrop ${mobileSheetOpen ? 'open' : ''}`}
          onClick={(e) => {
            e.stopPropagation();
            setMobileSheetOpen(false);
          }}
          aria-hidden="true"
        ></div>

        <div
          className={`hud-group ${mobileSheetOpen ? 'mobile-sheet-open' : ''}`}
          id="hud-right"
        >
          <div
            className="mobile-sheet-handle-wrap"
            onClick={(e) => {
              e.stopPropagation();
              setMobileSheetOpen(false);
            }}
            aria-hidden="true"
          >
            <div className="mobile-sheet-handle"></div>
          </div>

          <div className="mobile-sheet-header">
            <span className="mobile-sheet-title">{t.controlsTitle}</span>
            <button
              type="button"
              className="mobile-sheet-close"
              id="btn-mobile-sheet-close"
              onClick={(e) => {
                e.stopPropagation();
                setMobileSheetOpen(false);
              }}
              aria-label={t.close}
            >
              {t.close}
            </button>
          </div>

          <div className="mobile-sheet-section-label">{t.gameActions}</div>

          <button
            type="button"
            className="hud-btn hud-mode-btn"
            onClick={() => {
              handleToggleGameMode();
              setMobileSheetOpen(false);
            }}
            title={t.switchGameModeTitle}
          >
            {gameMode === 'single' ? t.gameModePvE : t.gameModePvP}
          </button>

          <button
            type="button"
            className="hud-btn hud-hint-btn"
            onClick={() => {
              handleOpenGrandmasterHint();
              setMobileSheetOpen(false);
            }}
            title={t.grandmasterHintTitle}
          >
            {t.grandmasterHint}
          </button>

          <button
            type="button"
            className="hud-btn hud-config-btn"
            onClick={() => {
              setLlmModalOpen(true);
              setMobileSheetOpen(false);
            }}
            title={t.llmConfigBtnTitle}
          >
            {t.llmConfigBtn}
          </button>

          <button
            className="hud-btn"
            id="btn-undo"
            title={t.undoTitle}
            onClick={() => {
              handleUndo();
              setMobileSheetOpen(false);
            }}
          >
            ↩ {t.undo}
          </button>
          <button
            className="hud-btn"
            id="btn-side-toggle"
            title={t.playAsBlackFull}
            style={{ display: gameMode === 'pvp' ? 'none' : 'inline-flex' }}
            onClick={() => setMobileSheetOpen(false)}
          >
            {t.playAsBlack}
          </button>
          <button
            className="hud-btn"
            id="btn-ai-move"
            title={t.aiMoveTitle}
            style={{ display: gameMode === 'pvp' ? 'none' : 'inline-flex' }}
            onClick={() => setMobileSheetOpen(false)}
          >
            {t.aiMove}
          </button>
          <button
            className="hud-btn"
            id="btn-reset"
            title={t.newGameTitle}
            onClick={() => setMobileSheetOpen(false)}
          >
            {t.newGame}
          </button>

          <div className="hud-divider" aria-hidden="true"></div>
          <div className="mobile-sheet-section-label">
            <span>{t.cameraViews}</span>
            <span className="mobile-sheet-section-sub">{t.cameraSub}</span>
          </div>

          <button
            className="hud-btn active"
            id="btn-cam-player"
            title={t.playerCamTitle}
          >
            {t.playerCam}
          </button>
          <button
            className="hud-btn"
            id="btn-cam-top"
            title={t.overheadTitle}
          >
            {t.overhead}
          </button>
          <button
            className="hud-btn"
            id="btn-cam-side"
            title={t.sideTitle}
          >
            {t.side}
          </button>
          <button
            className="hud-btn"
            id="btn-cam-wide"
            title={t.cathedralTitle}
          >
            {t.cathedral}
          </button>

          <div className="hud-divider" aria-hidden="true"></div>
          <div className="mobile-sheet-section-label">
            <span>{t.soundVoice}</span>
            <span className="mobile-sheet-section-sub">{t.soundVoiceSub}</span>
          </div>

          <button
            type="button"
            className="hud-btn"
            id="btn-lang-menu"
            title={t.langToggleTitle}
            onClick={() => audioEngine.toggleLanguage()}
          >
            {t.langToggle}
          </button>
          <button
            type="button"
            className={`hud-btn ${audioState.soundEnabled ? 'active' : ''}`}
            id="btn-sound-toggle"
            title={t.soundToggleTitle}
            onClick={() => audioEngine.toggleSound()}
          >
            {audioState.soundEnabled ? t.soundOn : t.soundMuted}
          </button>
          <button
            type="button"
            className="hud-btn"
            id="btn-voice-toggle"
            title={t.voiceToggleTitle}
            onClick={() => audioEngine.cycleVoiceMode()}
          >
            {audioState.voiceMode === 'zh'
              ? t.voiceZh
              : audioState.voiceMode === 'en'
              ? t.voiceEn
              : t.voiceOff}
          </button>

          <div className="hud-divider" aria-hidden="true"></div>
          <div className="mobile-sheet-section-label">{t.displayGestures}</div>

          <button
            className="hud-btn"
            id="btn-hide-ui"
            title={t.hideUITitle}
            onClick={() => setMobileSheetOpen(false)}
          >
            {t.hideUI}
          </button>

          <div className="mobile-sheet-hint">
            {t.touchHint}
          </div>
        </div>
      </div>

      {/* Cinematic Sanctum Dialogue & Tactical Voice Banner */}
      {audioState.currentBanner && (
        <div
          id="voice-banner"
          className={`voice-banner ${audioState.currentBanner.visible ? 'visible' : ''}`}
          role="status"
          aria-live="polite"
        >
          <div className="voice-banner-inner">
            <div className={`voice-sigil ${audioState.currentBanner.pieceColor}`}>
              {audioState.currentBanner.pieceType === 'queen' ? '♛' :
               audioState.currentBanner.pieceType === 'king' ? '♚' :
               audioState.currentBanner.pieceType === 'rook' ? '♜' :
               audioState.currentBanner.pieceType === 'bishop' ? '♝' :
               audioState.currentBanner.pieceType === 'knight' ? '♞' : '♟'}
            </div>
            <div className="voice-content">
              <div className="voice-speaker-row">
                <span className="voice-speaker-name">{audioState.currentBanner.pieceName}</span>
                <span className={`voice-action-badge action-${audioState.currentBanner.action}`}>
                  {audioState.currentBanner.action === 'attack' ? (lang === 'zh' ? '⚔️ 兵刃交锋' : '⚔️ Strike') :
                   audioState.currentBanner.action === 'select' ? (lang === 'zh' ? '✦ 棋子受命' : '✦ Selected') :
                   audioState.currentBanner.action === 'check' ? (lang === 'zh' ? '⚠️ 将军警告' : '⚠️ Check!') :
                   audioState.currentBanner.action === 'checkmate' ? (lang === 'zh' ? '👑 绝杀将死' : '👑 Checkmate') : (lang === 'zh' ? '✦ 移步进发' : '✦ Moving')}
                </span>
              </div>
              <div className="voice-quote-text">"{audioState.currentBanner.quote}"</div>
            </div>
          </div>
        </div>
      )}

      {/* Grandmaster Hint Tactical Scroll Modal */}
      {hintModalOpen && (
        <div className="sanctum-modal-backdrop" onClick={() => setHintModalOpen(false)}>
          <div className="sanctum-modal-scroll" onClick={(e) => e.stopPropagation()}>
            <div className="sanctum-modal-header">
              <div className="sanctum-modal-title-wrap">
                <span className="sanctum-modal-title">{t.hintModalTitle}</span>
                {hintResult && (
                  <span className={`sanctum-tag ${hintResult.isLLMPowered ? 'llm' : 'local'}`}>
                    {hintResult.isLLMPowered ? t.llmPoweredBadge : t.localPoweredBadge}
                  </span>
                )}
              </div>
              <button
                type="button"
                className="sanctum-modal-close"
                onClick={() => setHintModalOpen(false)}
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <div className="sanctum-modal-body">
              {hintLoading ? (
                <div style={{ textAlign: 'center', padding: '36px 16px', color: 'var(--gold-bright)' }}>
                  <div style={{ fontSize: '2rem', marginBottom: '12px', animation: 'spin 2s linear infinite' }}>✦</div>
                  <div style={{ fontSize: '0.95rem' }}>{t.requestingHint}</div>
                </div>
              ) : hintResult ? (
                <>
                  {/* Recommended Move Card */}
                  {hintResult.recommendedMoveUCI && (
                    <div className="sanctum-rec-card">
                      <div className="sanctum-rec-left">
                        <span className="sanctum-rec-label">{t.recommendedMoveLabel}</span>
                        <span className="sanctum-rec-move">
                          {hintResult.recommendedMoveSAN} ({hintResult.recommendedMoveUCI})
                        </span>
                        {hintResult.evaluationScore && (
                          <span className="sanctum-rec-eval">Eval: {hintResult.evaluationScore}</span>
                        )}
                      </div>
                      <button
                        type="button"
                        className="sanctum-play-btn"
                        onClick={handleExecuteRecommendedMove}
                      >
                        {t.executeMoveBtn}
                      </button>
                    </div>
                  )}

                  {/* Positional Assessment */}
                  <div className="sanctum-section">
                    <span className="sanctum-section-title">{t.assessmentLabel}</span>
                    <p className="sanctum-section-text">{hintResult.assessment}</p>
                  </div>

                  {/* Tactical Threat Warning */}
                  {hintResult.tacticalThreat && (
                    <div className="sanctum-section">
                      <span className="sanctum-section-title">{t.tacticalThreatLabel}</span>
                      <div className="sanctum-threat-box">{hintResult.tacticalThreat}</div>
                    </div>
                  )}

                  {/* Strategic Explanation */}
                  <div className="sanctum-section">
                    <span className="sanctum-section-title">{lang === 'zh' ? '推演解析' : 'Strategic Analysis'}</span>
                    <p className="sanctum-section-text">{hintResult.explanation}</p>
                  </div>

                  {/* Wizard Quote */}
                  {hintResult.wizardQuote && (
                    <div className="sanctum-quote-box">
                      "{hintResult.wizardQuote}"
                    </div>
                  )}
                </>
              ) : (
                <div style={{ textAlign: 'center', padding: '24px', color: '#9ca3af' }}>
                  {t.stalemateSub}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* LLM Configuration Settings Modal */}
      {llmModalOpen && (
        <div className="sanctum-modal-backdrop" onClick={() => setLlmModalOpen(false)}>
          <div className="llm-modal-scroll" onClick={(e) => e.stopPropagation()}>
            <div className="sanctum-modal-header">
              <span className="sanctum-modal-title">{t.llmModalTitle}</span>
              <button
                type="button"
                className="sanctum-modal-close"
                onClick={() => setLlmModalOpen(false)}
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <div className="sanctum-modal-body">
              <p style={{ fontSize: '0.82rem', color: '#9ca3af', lineHeight: '1.45' }}>
                {t.llmModalSubtitle}
              </p>

              {/* Provider Selection */}
              <div className="llm-form-group">
                <label className="llm-label">{t.providerLabel}</label>
                <div className="llm-provider-pills">
                  {(['gemini', 'openai', 'deepseek', 'custom'] as LLMProvider[]).map((prov) => (
                    <button
                      key={prov}
                      type="button"
                      className={`llm-provider-btn ${llmConfig.provider === prov ? 'active' : ''}`}
                      onClick={() => handleSelectProvider(prov)}
                    >
                      {prov === 'gemini' ? 'Gemini' :
                       prov === 'openai' ? 'OpenAI' :
                       prov === 'deepseek' ? 'DeepSeek' : 'Custom / 本地'}
                    </button>
                  ))}
                </div>
              </div>

              {/* API Key */}
              <div className="llm-form-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label className="llm-label">{t.apiKeyLabel}</label>
                  <button
                    type="button"
                    style={{ background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer', fontSize: '0.72rem' }}
                    onClick={() => setShowApiKey((prev) => !prev)}
                  >
                    {showApiKey ? (lang === 'zh' ? '隐藏' : 'Hide') : (lang === 'zh' ? '显示' : 'Show')}
                  </button>
                </div>
                <input
                  type={showApiKey ? 'text' : 'password'}
                  className="llm-input"
                  placeholder={t.apiKeyPlaceholder}
                  value={llmConfig.apiKey}
                  onChange={(e) => {
                    setLlmConfig((prev) => ({ ...prev, apiKey: e.target.value }));
                    setTestResult(null);
                  }}
                />
              </div>

              {/* Model Name */}
              <div className="llm-form-group">
                <label className="llm-label">{t.modelLabel}</label>
                <input
                  type="text"
                  className="llm-input"
                  value={llmConfig.model}
                  onChange={(e) => setLlmConfig((prev) => ({ ...prev, model: e.target.value }))}
                />
              </div>

              {/* Base URL */}
              <div className="llm-form-group">
                <label className="llm-label">{t.baseUrlLabel}</label>
                <input
                  type="text"
                  className="llm-input"
                  placeholder="https://..."
                  value={llmConfig.baseUrl}
                  onChange={(e) => setLlmConfig((prev) => ({ ...prev, baseUrl: e.target.value }))}
                />
              </div>

              {/* Opponent Checkbox */}
              <label className="llm-checkbox-row">
                <input
                  type="checkbox"
                  checked={llmConfig.enabledForOpponent}
                  onChange={(e) => setLlmConfig((prev) => ({ ...prev, enabledForOpponent: e.target.checked }))}
                />
                <div className="llm-checkbox-text">
                  <span className="llm-checkbox-title">{t.enableOpponentLabel}</span>
                  <span className="llm-checkbox-sub">{t.enableOpponentSub}</span>
                </div>
              </label>

              {/* Test Result Message */}
              {testResult && (
                <div className={`llm-test-result ${testResult.ok ? 'success' : 'error'}`}>
                  {testResult.ok ? '✓ ' : '✕ '}
                  {testResult.message}
                </div>
              )}

              <div className="llm-privacy-note">
                {t.privacyNote}
                <br />
                {t.noKeyHint}
              </div>
            </div>

            <div className="llm-modal-actions">
              <button
                type="button"
                className="llm-btn-test"
                disabled={testingConnection || !llmConfig.apiKey.trim()}
                onClick={handleTestLLM}
              >
                {testingConnection ? t.testingConnection : t.testConnectionBtn}
              </button>
              <button
                type="button"
                className="llm-btn-save"
                onClick={handleSaveLLM}
              >
                {t.saveSettingsBtn}
              </button>
            </div>
          </div>
        </div>
      )}

      <div id="hud-bottom">
        <div className="hint-pill" id="controls-hint">
          {t.desktopHint}
        </div>
        <div className="captured-pill" id="captured-tray"></div>
      </div>

      <div id="checkmate-overlay" role="status" aria-live="polite">
        <div className="checkmate-banner">
          <div className="checkmate-ornament">{t.checkmateOrnament}</div>
          <div className="checkmate-crown" id="checkmate-crown">♔</div>
          <div className="checkmate-title" id="checkmate-title">{t.checkmateTitle}</div>
          <div className="checkmate-rule"></div>
          <div className="checkmate-subtitle" id="checkmate-subtitle">
            {t.checkmateWhiteWin}
          </div>
          <div className="checkmate-actions">
            <button className="checkmate-btn" id="btn-checkmate-replay">
              {t.replayKingFall}
            </button>
            <button className="checkmate-btn" id="btn-checkmate-newgame">
              {t.newGame}
            </button>
            <button className="checkmate-btn secondary" id="btn-checkmate-dismiss">
              {t.dismiss}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
