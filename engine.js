class ChromaEngine {
constructor(sampleRate, fftSize = 8192) {
        this.sampleRate = sampleRate;
        this.fftSize = fftSize;
        this.binRes = sampleRate / fftSize;
        this.smoothVector = new Float32Array(12).fill(0);
        this.alpha = 0.2;
        // コード判定用テンプレート (簡略版：メジャーとマイナーのみ)
        this.chordTemplates = {
            'Maj': [0, 4, 7],    // Root, Major 3rd, Perfect 5th
            'min': [0, 3, 7],    // Root, Minor 3rd, Perfect 5th
            '7':   [0, 4, 7, 10], // Dominant 7th
            'm7':  [0, 3, 7, 10]  // Minor 7th
        };
        this.noteNames = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
    }

    analyze(freqData) {
        let rawVector = new Float32Array(12).fill(0);

        for (let i = 0; i < freqData.length; i++) {
            const db = freqData[i];
            if (db < -90 || db === -Infinity) continue;

            const freq = i * this.binRes;
            if (freq < 50 || freq > 4000) continue;

            const n = 12 * Math.log2(freq / 440) + 69;
            const pitchClass = Math.round(n) % 12;

            const amplitude = Math.pow(10, db / 20);
            const weight = 1.0 / (1 + 0.0005 * freq); // 重み調整
            rawVector[pitchClass] += amplitude * weight;
        }

        const normalized = this._normalize(rawVector);

        for (let i = 0; i < 12; i++) {
            this.smoothVector[i] = this.alpha * normalized[i] + (1 - this.alpha) * this.smoothVector[i];
        }

        return this.smoothVector;
    }

    _normalize(v) {
        const mag = Math.sqrt(v.reduce((s, x) => s + x * x, 0));
        return mag > 0 ? v.map(x => x / mag) : v;
    }

    detectChord(chroma) {
        // インデックスと値のペアを作り、数値の大きい順にソート
        const sorted = Array.from(chroma)
            .map((val, i) => ({ index: i, value: val }))
            .sort((a, b) => b.value - a.value);

        // 上位3つの音を取得
        const top3 = sorted.slice(0, 3);
        
        // 全体のエネルギーが低すぎる場合は無視
        if (top3[0].value < 0.1) return "---";

        // トップ3のインデックス（音名番号）を抽出
        const activeNotes = top3.map(d => d.index);
        
        // 1位の音をRoot（根音）としてインターバルを計算
        const root = activeNotes[0];
        const relative = activeNotes.map(n => (n - root + 12) % 12).sort((a, b) => a - b);

        // メジャーコード（0, 4, 7）などのテンプレート照合[cite: 1]
        for (let [type, template] of Object.entries(this.chordTemplates)) {
            if (template.every(t => relative.includes(t))) {
                return this.noteNames[root] + type;
            }
        }

        // テンプレートにない場合は音名を並べる（例：C+E+G）
        // ここで正しい音名が出るようになれば成功です
        return activeNotes.map(n => this.noteNames[n]).sort().join('+');
    }
}