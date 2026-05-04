class ChromaEngine {
    constructor(sampleRate, fftSize = 8192) {
        this.sampleRate = sampleRate;
        this.fftSize = fftSize;
        this.binRes = sampleRate / fftSize;
        this.smoothVector = new Float32Array(12).fill(0);
        this.alpha = 0.2;
        this.chordTemplates = {
            'Maj': [0, 4, 7],
            'min': [0, 3, 7],
            '7':   [0, 4, 7, 10],
            'm7':  [0, 3, 7, 10]
        };
        this.noteNames = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
    }
    // engine.js の ChromaEngine クラス内に追加
    getABCNotes(chordName) {
        if (chordName === "---") return "z";

        // 1. ルート音とコードタイプ（Maj, min, 7等）を分離
        // 例: "C#min" -> root: "C#", type: "min"
        const match = chordName.match(/^([A-G][#b]?)(.*)$/);
        if (!match) return "z";

        const root = match[1];
        const type = match[2];

        // 2. ABC記法における各音の半音階インデックス
        const noteToShift = {
            "C": 0, "C#": 1, "Db": 1, "D": 2, "D#": 3, "Eb": 3, 
            "E": 4, "F": 5, "F#": 6, "Gb": 6, "G": 7, "G#": 8, 
            "Ab": 8, "A": 9, "A#": 10, "Bb": 10, "B": 11
        };

        // 3. インデックスからABC記法の音名への逆引き（基本はシャープ系で表記）
        const indexToABC = ["C", "^C", "D", "^D", "E", "F", "^F", "G", "^G", "A", "^A", "B"];

        // 4. コードタイプごとのインターバル（半音単位）
        const intervals = {
            "Maj": [0, 4, 7],
            "min": [0, 3, 7],
            "7":   [0, 4, 7, 10],
            "m7":  [0, 3, 7, 10],
            "":    [0, 4, 7] // 指定なしはメジャー扱い
        };

        const targetIntervals = intervals[type] || intervals[""];
        const rootIdx = noteToShift[root];

        // 5. 各構成音を計算して和音記法 [ ] にまとめる
        const notes = targetIntervals.map(interval => {
            const currentIdx = (rootIdx + interval) % 12;
            let abcNote = indexToABC[currentIdx];
            
            // オクターブ調整（G以上の音は低く見える場合があるため、必要に応じて調整）
            // ここではシンプルにそのまま返します
            return abcNote;
        });

        return `[${notes.join('')}]`;
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
            const weight = 1.0 / (1 + 0.0005 * freq);
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
        const sorted = Array.from(chroma)
            .map((val, i) => ({ index: i, value: val }))
            .sort((a, b) => b.value - a.value);

        const top3 = sorted.slice(0, 3);
        if (top3[0].value < 0.1) return "---"; // エネルギー閾値

        const activeNotes = top3.map(d => d.index);
        const root = activeNotes[0];
        const relative = activeNotes.map(n => (n - root + 12) % 12).sort((a, b) => a - b);

        for (let [type, template] of Object.entries(this.chordTemplates)) {
            if (template.every(t => relative.includes(t))) {
                return this.noteNames[root] + type;
            }
        }
        return activeNotes.map(n => this.noteNames[n]).sort().join('+');
    }
}