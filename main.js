const startBtn = document.getElementById('startBtn');
const chordNameDisp = document.getElementById('chordName');
const visualizer = document.getElementById('visualizer');
const historyDisp = document.getElementById('history-content');
const modeBtn = document.getElementById('modeToggle');

let chordHistory = []; 
const MAX_HISTORY = 8; 

let lastDisplayedChord = "---";
let sameChordCount = 0;
let lastDetectedInternal = "";
let isAnalyzing = false;
let audioCtx, source, analyser, detectionInterval, engine;
let currentMode = 3;
const labels = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

// バーの要素を格納する配列（空で定義）
let barElements = [];

function init() {
    // 1. バーの生成をここで行う（HTMLの読み込み完了後）
    if (visualizer && barElements.length === 0) {
        barElements = labels.map(label => {
            const container = document.createElement('div');
            container.className = 'chroma-bar-container';
            
            const bar = document.createElement('div');
            bar.className = 'bar';
            bar.style.height = "0%"; // 初期値
            
            const lb = document.createElement('div');
            lb.className = 'label';
            lb.innerText = label;
            
            container.appendChild(bar);
            container.appendChild(lb);
            visualizer.appendChild(container);
            
            return bar; 
        });
    }

    const AudioContext = window.AudioContext || window.webkitAudioContext;
    const ctx = new AudioContext();
    engine = new ChromaEngine(ctx.sampleRate);
    engine.maxNotes = 3; 
    
    if (modeBtn) modeBtn.onclick = toggleMode;
}

// --- ページ読み込み完了時に init を実行 ---
window.onload = init;

function updateSheetMusic() {
    let abcString = "X:1\nM:4/4\nL:1/4\nK:C\n"; 
    let measureContent = "";
    
    chordHistory.forEach((chord, index) => {
        const notes = engine.getABCNotes(chord); 
        measureContent += `${notes}1 `; 
        if ((index + 1) % 4 === 0) measureContent += "| ";
    });

    abcString += "| " + measureContent;

    if (window.ABCJS) {
        ABCJS.renderAbc("sheet-music", abcString, { 
            responsive: "resize",
            scale: 1.5,
            add_classes: true
        });
    }
}

startBtn.onclick = async () => {
    if (!isAnalyzing) {
        if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        source = audioCtx.createMediaStreamSource(stream);
        analyser = audioCtx.createAnalyser();
        analyser.fftSize = 8192;
        source.connect(analyser);

        engine = new ChromaEngine(audioCtx.sampleRate, analyser.fftSize);
        engine.maxNotes = currentMode; 

        const dataArray = new Float32Array(analyser.frequencyBinCount);

        const process = () => {
            analyser.getFloatFrequencyData(dataArray);
            const chroma = engine.analyze(dataArray);
            
            // 高さの更新
            chroma.forEach((val, i) => {
                if (barElements[i]) {
                    barElements[i].style.height = `${Math.min(val * 100, 100)}%`;
                }
            });

            const currentRaw = engine.detectChord(chroma);

            if (currentRaw === lastDetectedInternal) {
                sameChordCount++;
            } else {
                sameChordCount = 0;
            }
            lastDetectedInternal = currentRaw;

            if (sameChordCount >= 3 && currentRaw !== lastDisplayedChord) {
                chordNameDisp.innerText = currentRaw;
                lastDisplayedChord = currentRaw;

                if (currentRaw !== "---") {
                    chordHistory.push(currentRaw);
                    if (chordHistory.length > MAX_HISTORY) chordHistory.shift();
                    updateSheetMusic();
                    historyDisp.innerText = chordHistory.join(' → ');
                }
            }
        };

        detectionInterval = setInterval(process, 150);
        startBtn.innerText = "Stop Analyzer";
        isAnalyzing = true;
    } else {
        clearInterval(detectionInterval);
        if (source) source.disconnect();
        startBtn.innerText = "Start Analyzer";
        chordNameDisp.innerText = "---";
        isAnalyzing = false;
    }
};

function toggleMode() {
    if (!engine) return;
    if (currentMode === 3) {
        currentMode = 4;
        engine.maxNotes = 4;
        modeBtn.innerText = "Mode: 4-Note";
        modeBtn.style.backgroundColor = "#ff3d00";
    } else {
        currentMode = 3;
        engine.maxNotes = 3;
        modeBtn.innerText = "Mode: 3-Note";
        modeBtn.style.backgroundColor = "var(--accent-color)";
    }
}