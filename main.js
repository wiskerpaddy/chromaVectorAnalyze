const toggleBtn = document.getElementById('toggleBtn');
const chordNameDisp = document.getElementById('chordName');
const visualizer = document.getElementById('visualizer');
const historyDisp = document.getElementById('history-content');

let chordHistory = []; 
const MAX_HISTORY = 8; 

let lastDisplayedChord = "---";
let sameChordCount = 0;
let lastDetectedInternal = "";
let isAnalyzing = false;
let audioCtx, source, analyser, detectionInterval, engine;

const labels = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

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

function updateSheetMusic() {
    // L:1/4 を指定して、基本の長さを四分音符（黒塗り）にする
    let abcString = "X:1\nM:4/4\nL:1/4\nK:C\n"; 
    let measureContent = "";
    
    chordHistory.forEach((chord, index) => {
        const notes = engine.getABCNotes(chord); 
        // 音符の後に 1 を付けて、四分音符（黒塗り）として確定させる
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

toggleBtn.onclick = async () => {
    if (!isAnalyzing) {
        if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        source = audioCtx.createMediaStreamSource(stream);
        analyser = audioCtx.createAnalyser();
        analyser.fftSize = 8192;
        source.connect(analyser);

        engine = new ChromaEngine(audioCtx.sampleRate, analyser.fftSize);
        const dataArray = new Float32Array(analyser.frequencyBinCount);

        const process = () => {
            analyser.getFloatFrequencyData(dataArray);
            const chroma = engine.analyze(dataArray);            
            
            chroma.forEach((val, i) => {
                barElements[i].style.height = `${Math.min(val * 100, 100)}%`;
            });

            const currentRaw = engine.detectChord(chroma);

            if (currentRaw === lastDetectedInternal) {
                sameChordCount++;
            } else {
                sameChordCount = 0;
            }
            lastDetectedInternal = currentRaw;

            // 確定判定
            if (sameChordCount >= 3 && currentRaw !== lastDisplayedChord) {
                chordNameDisp.innerText = currentRaw;
                lastDisplayedChord = currentRaw;

                // 履歴保存と楽譜更新
                if (currentRaw !== "---") {
                    chordHistory.push(currentRaw);
                    if (chordHistory.length > MAX_HISTORY) chordHistory.shift();
                    
                    updateSheetMusic();
                    historyDisp.innerText = chordHistory.join(' → ');
                }
            }
        };

        detectionInterval = setInterval(process, 150); // 解析間隔を少し広げて安定化
        toggleBtn.innerText = "Stop Analyzer";
        isAnalyzing = true;
    } else {
        clearInterval(detectionInterval);
        source.disconnect();
        toggleBtn.innerText = "Start Analyzer";
        chordNameDisp.innerText = "---";
        isAnalyzing = false;
    }
};