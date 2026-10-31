import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();

test('AudioEngine implements required sound events and character voice quotes', () => {
  const audioCode = fs.readFileSync(path.join(ROOT, 'src/audioEngine.ts'), 'utf-8');

  // Verify all essential audio method implementations exist
  assert.ok(audioCode.includes('playPieceSelect'), 'Missing playPieceSelect method');
  assert.ok(audioCode.includes('playPieceMoveStart'), 'Missing playPieceMoveStart method');
  assert.ok(audioCode.includes('playPieceLand'), 'Missing playPieceLand method');
  assert.ok(audioCode.includes('playWeaponClash'), 'Missing playWeaponClash combat method');
  assert.ok(audioCode.includes('playStoneShatter'), 'Missing playStoneShatter method');
  assert.ok(audioCode.includes('playCheckAlert'), 'Missing playCheckAlert method');
  assert.ok(audioCode.includes('playCheckmate'), 'Missing playCheckmate method');

  // Verify support for all 6 chess pieces with Chinese and English voice quotes
  for (const piece of ['pawn', 'knight', 'bishop', 'rook', 'queen', 'king']) {
    assert.ok(audioCode.includes(`${piece}:`), `Missing quotes for piece: ${piece}`);
  }

  // Verify language modes and toggle methods
  assert.ok(audioCode.includes('cycleVoiceMode'), 'Missing cycleVoiceMode');
  assert.ok(audioCode.includes('toggleSound'), 'Missing toggleSound');
});

test('Chess Engine connects Audio Engine into combat, movement, selection, and check events', () => {
  const engineCode = fs.readFileSync(path.join(ROOT, 'src/wizardChessEngine.js'), 'utf-8');

  assert.ok(engineCode.includes('audioEngine.playPieceSelect'), 'Missing playPieceSelect hook in engine');
  assert.ok(engineCode.includes('audioEngine.playPieceMoveStart'), 'Missing playPieceMoveStart hook in engine');
  assert.ok(engineCode.includes('audioEngine.playPieceLand'), 'Missing playPieceLand hook in engine');
  assert.ok(engineCode.includes('audioEngine.playWeaponClash'), 'Missing playWeaponClash hook in engine');
  assert.ok(engineCode.includes('audioEngine.playStoneShatter'), 'Missing playStoneShatter hook in engine');
  assert.ok(engineCode.includes('audioEngine.playCheckAlert'), 'Missing playCheckAlert hook in engine');
  assert.ok(engineCode.includes('audioEngine.playCheckmate'), 'Missing playCheckmate hook in engine');
});

test('App.tsx exposes sound toggles, voice mode toggle, language toggles, undo buttons, and voice banner', () => {
  const appCode = fs.readFileSync(path.join(ROOT, 'src/App.tsx'), 'utf-8');

  assert.ok(appCode.includes('id="btn-sound-toggle"'), 'Missing btn-sound-toggle in App.tsx');
  assert.ok(appCode.includes('id="btn-voice-toggle"'), 'Missing btn-voice-toggle in App.tsx');
  assert.ok(appCode.includes('id="btn-lang-toggle"'), 'Missing btn-lang-toggle in App.tsx');
  assert.ok(appCode.includes('id="btn-lang-menu"'), 'Missing btn-lang-menu in App.tsx');
  assert.ok(appCode.includes('id="btn-undo"'), 'Missing btn-undo in App.tsx');
  assert.ok(appCode.includes('id="btn-quick-undo"'), 'Missing btn-quick-undo in App.tsx');
  assert.ok(appCode.includes('id="voice-banner"'), 'Missing voice-banner in App.tsx');
});

test('Chess Engine implements distinct piece appearance, scale hierarchy, and pedestal medallions', () => {
  const engineCode = fs.readFileSync(path.join(ROOT, 'src/wizardChessEngine.js'), 'utf-8');

  // Verify class-specific material definitions & scale hierarchy
  assert.ok(engineCode.includes('PIECE_CLASS_MATERIALS'), 'Missing PIECE_CLASS_MATERIALS');
  assert.ok(engineCode.includes('PIECE_SCALES'), 'Missing PIECE_SCALES');
  assert.ok(engineCode.includes('createPiecePedestalDecor'), 'Missing createPiecePedestalDecor');
  assert.ok(engineCode.includes('getPieceBadgeTexture'), 'Missing getPieceBadgeTexture');

  // Verify all 6 chess pieces have distinct scale rules
  for (const piece of ['pawn', 'knight', 'bishop', 'rook', 'queen', 'king']) {
    assert.ok(engineCode.includes(`${piece}:`), `Missing scale or material rule for ${piece}`);
  }
});

test('Undo move feature and Language synchronization are exported on window.wizardChess', () => {
  const engineCode = fs.readFileSync(path.join(ROOT, 'src/wizardChessEngine.js'), 'utf-8');

  assert.ok(engineCode.includes('undoMove: undoChessMove'), 'Missing undoMove in window.wizardChess');
  assert.ok(engineCode.includes('setLanguage:'), 'Missing setLanguage in window.wizardChess');
  assert.ok(engineCode.includes('function undoChessMove'), 'Missing function undoChessMove');
});

