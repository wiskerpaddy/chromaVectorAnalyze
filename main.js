const toggleBtn = document.getElementById('toggleBtn');
const chordNameDisp = document.getElementById('chordName');
const visualizer = document.getElementById('visualizer');
const statusDisp = document.getElementById('status');
let lastDisplayedChord = "---";
let sameChordCount = 0;

let isAnalyzing = false;
let audioCtx, source, analyser, requestID;
const labels = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
let detectionInterval; // 周期処理用のタイマー変数

// 1. 変数をリセットしやすくするため、isAnalyzingの切り替え時に初期化を確認
let lastDetectedInternal = "";

// 12音のバーを生成
const barElements = labels.map(label => {
    const container = document.createElement('div');
    container.className = 'chroma-bar-container';
    const bar = document.createElement('div');
    bar.className = 'bar';
    const lb = document.createElement('div');
    lb.className = 'label';
    lb.innerText = label;
    container.appendChild(bar);
    container.appendChild(lb);
    visualizer.appendChild(container);
    return bar;
});

toggleBtn.onclick = async () => {
    if (!isAnalyzing) {
        if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        source = audioCtx.createMediaStreamSource(stream);
        analyser = audioCtx.createAnalyser();
        analyser.fftSize = 8192;
        source.connect(analyser);

        const engine = new ChromaEngine(audioCtx.sampleRate, analyser.fftSize);
        const dataArray = new Float32Array(analyser.frequencyBinCount);

        const process = () => {
            analyser.getFloatFrequencyData(dataArray);
            const chroma = engine.analyze(dataArray);            
            
            chroma.forEach((val, i) => {
                barElements[i].style.height = `${Math.min(val * 100, 100)}%`;
            });

            // 今この瞬間の生判定を取得
            const currentRaw = engine.detectChord(chroma);

            // 2. 安定化ロジックの修正
            // 「今検知した音」が「直前のフレーム」と同じならカウントアップ
            if (currentRaw === lastDetectedInternal) {
                sameChordCount++;
            } else {
                sameChordCount = 0;
            }
            lastDetectedInternal = currentRaw;

            // 3フレーム（約0.45秒分）連続で一致したら画面を更新
            if (sameChordCount >= 3 && currentRaw !== lastDisplayedChord) {
                chordNameDisp.innerText = currentRaw;
                lastDisplayedChord = currentRaw;
            }
        };

        // 3. 検知周期の設定
        // 150msくらいが「音楽的」な変化を捉えるのにちょうど良いです
        detectionInterval = setInterval(process, 15); 

        toggleBtn.innerText = "Stop Analyzer";
        toggleBtn.style.backgroundColor = "var(--threshold-color)";
        isAnalyzing = true;
    } else {
        clearInterval(detectionInterval);
        source.disconnect();
        toggleBtn.innerText = "Start Analyzer";
        toggleBtn.style.backgroundColor = "var(--accent-color)";
        chordNameDisp.innerText = "---";
        isAnalyzing = false;
    }
};