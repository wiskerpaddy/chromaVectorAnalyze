const toggleBtn = document.getElementById('toggleBtn');
const chordNameDisp = document.getElementById('chordName');
const visualizer = document.getElementById('visualizer');
const statusDisp = document.getElementById('status');

let isAnalyzing = false;
let audioCtx, source, analyser, requestID;
const labels = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
let detectionInterval; // 周期処理用のタイマー変数

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
        // --- START ANALYZER ---
        if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        source = audioCtx.createMediaStreamSource(stream);
        analyser = audioCtx.createAnalyser();
        analyser.fftSize = 8192; // 解像度重視
        source.connect(analyser);

const engine = new ChromaEngine(audioCtx.sampleRate, analyser.fftSize);
        const dataArray = new Float32Array(analyser.frequencyBinCount);

        // 描画と判定を分離、または周期を固定する
        const process = () => {
            analyser.getFloatFrequencyData(dataArray);
            const chroma = engine.analyze(dataArray);
            
            // グラフ更新（ここは滑らかにするため毎回実行してもOK）
            chroma.forEach((val, i) => {
                barElements[i].style.height = `${Math.min(val * 100, 100)}%`;
            });

            // 判定閾値を 0.5 -> 0.3 に下げて、より拾いやすくする
            const detected = engine.detectChord(chroma, 0.3); 
            chordNameDisp.innerText = detected;

            statusDisp.innerText = `Status: Analyzing (Interval: 150ms)`;
        };

        // 検知周期を150msに設定（毎秒約6.6回）
        detectionInterval = setInterval(process, 1);

        toggleBtn.innerText = "Stop Analyzer";
        toggleBtn.style.backgroundColor = "var(--threshold-color)";
        isAnalyzing = true;
    } else {
        // --- STOP ---
        clearInterval(detectionInterval); // タイマーをクリア
        source.disconnect();
        toggleBtn.innerText = "Start Analyzer";
        toggleBtn.style.backgroundColor = "var(--accent-color)";
        chordNameDisp.innerText = "---";
        statusDisp.innerText = "Status: Stopped";
        isAnalyzing = false;
    }
};