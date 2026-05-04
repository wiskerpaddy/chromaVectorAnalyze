class ChromaEngine {
    constructor(sampleRate, fftSize = 8192) {
        this.sampleRate = sampleRate;
        this.fftSize = fftSize;
        this.binRes = sampleRate / fftSize;
        this.smoothVector = new Float32Array(12).fill(0);
        this.alpha = 0.2;
        // 1. テンプレートに4音（セブンス）を定義
        this.chordTemplates = {
            "M7":  [0, 4, 7, 11],
            "7":   [0, 4, 7, 10],
            "m7":  [0, 3, 7, 10],
            "Maj": [0, 4, 7],
            "min": [0, 3, 7],
            "":    [0, 4, 7]
        };
        this.noteNames = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
        this.maxNotes = 3;
    }

    // 2. 描画ロジックを4音対応に修正
    getABCNotes(chordName) {
        if (chordName === "---") return "z"; 

        let notes = [];

        // "C+E+G+Bb" のような形式の場合
        if (chordName.includes("+")) {
            const noteNames = chordName.split("+");
            notes = noteNames.map(name => this.getABCSingleNote(name));
        } 
        // "C7" や "Cm7" のようなコード名形式の場合
        else {
            let rootName = "";
            let type = "";

            // ルート音(C#等)とコードタイプ(m7等)を分離
            if (chordName[1] === "#" || chordName[1] === "b") {
                rootName = chordName.substring(0, 2);
                type = chordName.substring(2);
            } else {
                rootName = chordName.substring(0, 1);
                type = chordName.substring(1);
            }

            const rootIdx = this.noteNames.indexOf(rootName);
            const template = this.chordTemplates[type] || [0, 4, 7];

            // テンプレートにある全ての音（4音あれば4つとも）をABC記譜に変換
            notes = template.map(interval => {
                const noteIdx = (rootIdx + interval) % 12;
                return this.getABCSingleNote(this.noteNames[noteIdx]);
            });
        }

        // 3. 全ての音を和音用ブラケット [] で囲んで返す[cite: 7]
        return "[" + notes.join("") + "]";
    }

    getABCSingleNote(noteName) {
        const abcMap = {
            "C": "C", "C#": "^C", "Db": "_D", "D": "D", "D#": "^D", "Eb": "_E", 
            "E": "E", "F": "F", "F#": "^F", "Gb": "_G", "G": "G", "G#": "^G", 
            "Ab": "_A", "A": "A", "A#": "^A", "Bb": "_B", "B": "B"
        };
        return abcMap[noteName] || "C";
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

        // ★ 設定された maxNotes 分だけ取得するように変更
        const topNotes = sorted.slice(0, this.maxNotes);
        
        if (topNotes[0].value < 0.1) return "---";

        const activeNotes = topNotes.map(d => d.index);
        const root = activeNotes[0];
        const relative = activeNotes.map(n => (n - root + 12) % 12).sort((a, b) => a - b);

        // テンプレート照合（3音/4音どちらのモードでも動作します）[cite: 7]
        for (let [type, template] of Object.entries(this.chordTemplates)) {
            if (template.length === this.maxNotes && template.every(t => relative.includes(t))) {
                return this.noteNames[root] + type;
            }
        }

        // テンプレート外の表示
        return topNotes.filter(d => d.value > 0.05)
                .map(d => this.noteNames[d.index])
                .sort()
                .join('+');
    }
}