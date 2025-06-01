import "./style.css";
import { createWaveform, renderWaveform, type WaveformState } from "./waveform";

const audioContext: AudioContext = new AudioContext();

const audioElement = document.querySelector("audio");

const track = audioContext.createMediaElementSource(audioElement!);

const oscillator = audioContext.createOscillator();
const oscillatorGainNode = audioContext.createGain(); // This gain node will be for the oscillator

oscillator.frequency.value = 440;

let oscillatorStarted = false;
let oscillatorIsPlaying = false;
let oscillatorGain = 0.2;

const setOscillatorIsPlaying = (isPlaying: boolean) => {
  if (!oscillatorIsPlaying) {
    if (!oscillatorStarted) {
      oscillator.start();
      oscillatorStarted = true;
    }
    oscillatorGainNode.gain.value = oscillatorGain;
  } else {
    oscillatorGainNode.gain.value = 0;
  }
  oscillatorIsPlaying = isPlaying;
};

const setOscillatorGain = (gain: number) => {
  oscillatorGain = gain;
  if (oscillatorIsPlaying) oscillatorGainNode.gain.value = oscillatorGain;
};

const steropannerNode = audioContext.createStereoPanner();

const analyzerNode = audioContext.createAnalyser();

track.connect(analyzerNode).connect(audioContext.destination);

oscillator
  .connect(oscillatorGainNode)
  .connect(steropannerNode)
  .connect(analyzerNode)
  .connect(audioContext.destination);

// analysis

analyzerNode.minDecibels = -90;
analyzerNode.maxDecibels = -10;
analyzerNode.smoothingTimeConstant = 0.1;

let bufferLength = 0;

const setFFTSize = (size: number) => {
  analyzerNode.fftSize = size;
  bufferLength = analyzerNode.frequencyBinCount;
  document.querySelector("#buffer-length")!.innerHTML =
    "Buffer Length: " + bufferLength;
};

setFFTSize(8192);

document.querySelector("#sample-rate")!.innerHTML =
  "Sample Rate: " + audioContext.sampleRate;

const timeDomainData = new Uint8Array(bufferLength);
const timeDomainCanvas: HTMLCanvasElement = document.getElementById(
  "oscilloscope"
)! as HTMLCanvasElement;
const timeDomainCtx = timeDomainCanvas.getContext("2d")!;

const frequencyData = new Float32Array(bufferLength);
const frequencyCanvas: HTMLCanvasElement = document.getElementById(
  "frequency"
)! as HTMLCanvasElement;
const frequencyCtx = frequencyCanvas.getContext("2d")!;

const pitchCanvas: HTMLCanvasElement = document.getElementById(
  "pitch"
)! as HTMLCanvasElement;
const pitchCtx = pitchCanvas.getContext("2d")!;

const QUARTER_STEP = Math.pow(2, 1 / 24);

const computeFrequency = (pitchIndex: number) => {
  return 440 * Math.pow(2, (1 / 12) * (pitchIndex - 57));
};

const computeNoteName = (pitchIndex: number) => {
  const notes = [
    "c",
    "c#",
    "d",
    "d#",
    "e",
    "f",
    "f#",
    "g",
    "g#",
    "a",
    "a#",
    "b",
  ];

  const octave = Math.floor(pitchIndex / 12);
  const noteIndex = pitchIndex % 12;
  return `${notes[noteIndex]}${octave}`;
};

const blueAmount = 120;
const redAmount = 50;
const greenAmount = 170;

const backgroundFillStyle = "rgb(240 240 240)";

const draw = () => {
  requestAnimationFrame(draw);
  analyzerNode.getByteTimeDomainData(timeDomainData);

  timeDomainCtx.fillStyle = backgroundFillStyle;
  timeDomainCtx.fillRect(0, 0, timeDomainCanvas.width, timeDomainCanvas.height);

  timeDomainCtx.lineWidth = 2;
  timeDomainCtx.strokeStyle = `rgb(${redAmount} ${greenAmount} ${blueAmount})`;

  timeDomainCtx.beginPath();

  const sliceWidth = (timeDomainCanvas.width * 1.0) / bufferLength;
  let x = 0;

  for (let i = 0; i < bufferLength; i++) {
    const v = timeDomainData[i] / 128.0;
    const y = (v * timeDomainCanvas.height) / 2;

    if (i === 0) {
      timeDomainCtx.moveTo(x, y);
    } else {
      timeDomainCtx.lineTo(x, y);
    }

    x += sliceWidth;
  }

  timeDomainCtx.lineTo(timeDomainCanvas.width, timeDomainCanvas.height / 2);
  timeDomainCtx.stroke();

  analyzerNode.getFloatFrequencyData(frequencyData);
  frequencyCtx.fillStyle = backgroundFillStyle;
  frequencyCtx.fillRect(0, 0, frequencyCanvas.width, frequencyCanvas.height);

  const barWidth = (frequencyCanvas.width / bufferLength) * 8;
  let posX = 0;

  for (let i = 0; i < bufferLength; i++) {
    const base = frequencyData[i] + 140;
    const barHeight = Math.sqrt(Math.pow(base * base, base / 100));

    frequencyCtx.fillStyle = `rgb(${redAmount} ${greenAmount} ${blueAmount})`;
    frequencyCtx.fillRect(
      posX,
      frequencyCanvas.height - barHeight / 2,
      barWidth,
      barHeight / 2
    );
    posX += barWidth;
  }

  let pitchIdx = 0;
  let freqIdx = 0;
  let freqWindowSize =
    audioContext.sampleRate / 2 / analyzerNode.frequencyBinCount;

  let pitchData = new Float32Array(1000);

  while (pitchIdx < pitchData.length && freqIdx < bufferLength) {
    let pitch = computeFrequency(pitchIdx);
    let pitchStart = pitch / QUARTER_STEP;
    let pitchEnd = pitch * QUARTER_STEP;
    let freqStart = freqWindowSize * freqIdx;
    let freqEnd = freqStart + freqWindowSize;

    let overlap = Math.max(
      0,
      Math.min(pitchEnd, freqEnd) - Math.max(pitchStart, freqStart)
    );

    pitchData[pitchIdx] += overlap * Math.max(0, 140 + frequencyData[freqIdx]);

    if (pitchEnd < freqEnd) {
      pitchIdx++;
    } else freqIdx++;
  }

  pitchCtx.fillStyle = backgroundFillStyle;
  pitchCtx.fillRect(0, 0, pitchCanvas.width, pitchCanvas.height);

  const pitchBarWidth = 5;

  pitchData.forEach((intensity, idx) => {
    if (intensity > 10) {
      let pitch = computeFrequency(idx);
      let pitchWindow = pitch * QUARTER_STEP - pitch / QUARTER_STEP;
      const base = ((intensity / pitchWindow) * Math.pow(idx, 1 / 5)) / 2;
      const barHeight = Math.sqrt(Math.pow(base * base, base / 100));

      pitchCtx.fillStyle = `rgb(${redAmount} ${greenAmount} ${blueAmount})`;
      pitchCtx.fillRect(
        idx * pitchBarWidth,
        pitchCanvas.height - barHeight / 2,
        pitchBarWidth,
        barHeight / 2
      );

      pitchCtx.fillStyle = `rgb(${redAmount} ${greenAmount} ${blueAmount} / ${Math.pow(
        Math.max(0, barHeight - 30),
        2
      )}%)`;
      pitchCtx.fillText(
        `${computeNoteName(idx)}`,
        idx * pitchBarWidth - pitchBarWidth,
        pitchCanvas.height - barHeight / 2 - 2
      );
    }
  });
};

draw();

// Event Listeners

const toggleDroneButton = document.querySelector("#toggle-drone")!;

const volumeControl: HTMLInputElement = document.querySelector("#volume")!;
volumeControl.value = "" + oscillatorGain;
const panControl: HTMLInputElement = document.querySelector("#pan")!;

oscillatorGainNode.gain.value = 0;

toggleDroneButton.addEventListener("click", () => {
  if (audioContext.state === "suspended") {
    audioContext.resume();
  }

  setOscillatorIsPlaying(!oscillatorIsPlaying);
});

setOscillatorGain(+volumeControl.value);
volumeControl.addEventListener("input", () => {
  setOscillatorGain(+volumeControl.value);
});

steropannerNode.pan.value = +panControl.value;
panControl.addEventListener("input", () => {
  steropannerNode.pan.value = +panControl.value;
});

const selectFFTSize: HTMLSelectElement = document.querySelector("#fft-size")!;
setFFTSize(+selectFFTSize.value);
selectFFTSize.addEventListener("input", () => {
  setFFTSize(+selectFFTSize.value);
});

const frequencyControl: HTMLInputElement =
  document.querySelector("#drone-frequency")!;
const numeratorControl: HTMLInputElement =
  document.querySelector("#numerator")!;
const denominatorControl: HTMLInputElement =
  document.querySelector("#denominator")!;

const updateFrequency = () => {
  oscillator.frequency.value =
    +frequencyControl.value *
    (+numeratorControl.value / +denominatorControl.value);
};

updateFrequency();
frequencyControl.addEventListener("input", updateFrequency);
numeratorControl.addEventListener("input", updateFrequency);
denominatorControl.addEventListener("input", updateFrequency);

const FFTBlendControl: HTMLInputElement =
  document.querySelector("#fft-smoothing")!;
FFTBlendControl.value = `${analyzerNode.smoothingTimeConstant}`;
FFTBlendControl.addEventListener("input", () => {
  analyzerNode.smoothingTimeConstant = +FFTBlendControl.value;
});

// file upload

const fileInput: HTMLInputElement = document.querySelector("#file-upload")!;

const handleFileChange = () => {
  const firstFile = fileInput.files?.item(0)!;
  const fileReader = new FileReader();
  const fileUrl = URL.createObjectURL(firstFile);
  fileReader.addEventListener("loadend", async () => {
    const audioData = await audioContext.decodeAudioData(
      fileReader.result! as ArrayBuffer
    );

    const waveformCanvas: HTMLCanvasElement =
      document.querySelector("#waveform")!;
    const auxCanvas: HTMLCanvasElement =
      document.querySelector("#waveform-aux")!;
    const waveformZoomControl: HTMLInputElement =
      document.querySelector("#waveform-zoom")!;
    const waveformResolutionControl: HTMLInputElement = document.querySelector(
      "#waveform-resolution"
    )!;
    const clearSelectionButton: HTMLButtonElement =
      document.querySelector("#clear-selection")!;

    const sectionCallback = (state: WaveformState) => {
      if (state.section) {
        clearSelectionButton.disabled = false;
        const newBuffer = new AudioBuffer({
          sampleRate: state.data.sampleRate,
          length: state.section.end - state.section.start,
          numberOfChannels: state.data.numberOfChannels,
        });
        for (let i = 0; i < state.data.numberOfChannels; i++) {
          const channelData = state.data.getChannelData(i);
          const dataSubset = channelData.slice(
            state.section.start,
            state.section.end
          );
          newBuffer.copyToChannel(dataSubset, i);
        }
        renderWaveform(
          newBuffer,
          { start: 0, end: newBuffer.length },
          { resolution: 500 },
          auxCanvas
        );
      } else {
        clearSelectionButton.disabled = true;
      }
    };

    const [state, canvas, auxRenderFunction] = createWaveform(
      audioData,
      waveformCanvas,
      sectionCallback
    );

    let bufferNode: undefined | AudioBufferSourceNode;

    const playPauseButton: HTMLButtonElement =
      document.querySelector("#play-pause")!;
    playPauseButton.disabled = false;
    playPauseButton.addEventListener("click", () => {
      if (playPauseButton.dataset.playing === "false") {
        playPauseButton.dataset.playing = "true";
        bufferNode = audioContext.createBufferSource();
        bufferNode.buffer = state.data;
        bufferNode.connect(analyzerNode).connect(audioContext.destination);
        bufferNode.start();
      } else {
        playPauseButton.dataset.playing = "false";
        bufferNode?.stop();
      }
    });

    waveformZoomControl.addEventListener("input", () => {
      const currentRange = state.range.end - state.range.start;
      const currentCenter = currentRange / 2 + state.range.start;
      state.range.start = Math.max(
        0,
        currentCenter - +waveformZoomControl.value / 2
      );
      state.range.end = Math.min(
        currentCenter + +waveformZoomControl.value / 2,
        audioData.length
      );
      auxRenderFunction(state, canvas);
    });

    waveformResolutionControl.addEventListener("input", () => {
      state.options.resolution = +waveformResolutionControl.value;
      auxRenderFunction(state, canvas);
    });

    clearSelectionButton.addEventListener("click", () => {
      state.section = undefined;
      sectionCallback(state);
      auxRenderFunction(state, canvas);
    });
  });
  fileReader.readAsArrayBuffer(firstFile);
  if (audioElement) audioElement.src = fileUrl;
};

fileInput.addEventListener("input", handleFileChange);
fileInput.addEventListener("loadeddata", handleFileChange);
