# Chroma Engine v2 - Real-time Chord Analyzer

音楽を聴きながら、リアルタイムでコード進行を解析・可視化するための耳コピ補助ツールです。
Web Audio API による周波数解析と、abcjs を利用した動的な楽譜生成を組み合わせています。

## 特徴
- **ハイレゾ解析**: FFTサイズ 8192 による高精度な周波数抽出。
- **インテリジェント判定**: 単なる閾値判定ではなく、エネルギー上位音を抽出するアルゴリズムを採用。
- **ヒステリシス制御**: 判定のチャタリングを抑え、音楽的なタイミングでのコード更新を実現。
- **ぬるぬる動くUI**: `requestAnimationFrame` による 60fps の滑らかなビジュアライザー[cite: 3]。
- **楽譜生成 (New)**: 検出されたコードを ABC記法で五線譜にリアルタイムレンダリング（予定）。

## 技術スタック

- **Language**: JavaScript (Vanilla JS)
- **Audio API**: Web Audio API (AnalyserNode)
- **Library**: [abcjs](https://paulrosen.github.io/abcjs/) (Sheet music rendering)
- **Math**: Jazz Theory Based Chord Detection[cite: 1]

## 使い方

1. `Start Analyzer` をクリックしてマイクの使用を許可します。
2. 解析したい音楽を流します（または楽器を演奏します）。
3. 画面中央に検出されたコードが表示され、履歴が楽譜として蓄積されます。

## カスタマイズ

`engine.js` 内の `alpha` 係数を調整することで、バーの動きの追従性を変更できます。
- `engine.alpha = 0.1`: 滑らかで物理的な動き（推奨）
- `engine.alpha = 0.5`: 高速で鋭い反応

---
Developed by **Scout**[cite: 4]