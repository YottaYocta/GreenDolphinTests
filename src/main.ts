import "./style.css";

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
  .connect(oscillatorGainNode) // Connect oscillator to its dedicated gain node
  .connect(steropannerNode) // Connect oscillator's gain node to the main chain
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

const draw = () => {
  requestAnimationFrame(draw);
  analyzerNode.getByteTimeDomainData(timeDomainData);

  timeDomainCtx.fillStyle = "rgb(200 200 200)";
  timeDomainCtx.fillRect(0, 0, timeDomainCanvas.width, timeDomainCanvas.height);

  timeDomainCtx.lineWidth = 2;
  timeDomainCtx.strokeStyle = "rgb(0 0 0)";

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
  frequencyCtx.fillStyle = "rgb(0 0 0)";
  frequencyCtx.fillRect(0, 0, frequencyCanvas.width, frequencyCanvas.height);

  const barWidth = (frequencyCanvas.width / bufferLength) * 15;
  let posX = 0;

  for (let i = 0; i < bufferLength; i++) {
    const base = frequencyData[i] + 140;
    const barHeight = Math.sqrt(Math.pow(base * base, base / 100));

    frequencyCtx.fillStyle = `rgb(${Math.floor(barHeight + 100)} 50 50)`;
    frequencyCtx.fillRect(
      posX,
      frequencyCanvas.height - barHeight / 2,
      barWidth,
      barHeight / 2
    );
    posX += barWidth;
  }
};

draw();

// Event Listeners

const toggleDroneButton = document.querySelector("button");

const volumeControl: HTMLInputElement = document.querySelector("#volume")!;
volumeControl.value = "" + oscillatorGain;
const panControl: HTMLInputElement = document.querySelector("#pan")!;

oscillatorGainNode.gain.value = 0;

toggleDroneButton?.addEventListener("click", () => {
  if (audioContext.state === "suspended") {
    audioContext.resume();
  }

  setOscillatorIsPlaying(!oscillatorIsPlaying);
});

volumeControl.addEventListener("input", () => {
  setOscillatorGain(+volumeControl.value);
});

panControl.addEventListener("input", () => {
  steropannerNode.pan.value = +panControl.value;
});

const selectFFTSize: HTMLSelectElement = document.querySelector("#fft-size")!;
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

frequencyControl.addEventListener("input", updateFrequency);
numeratorControl.addEventListener("input", updateFrequency);
denominatorControl.addEventListener("input", updateFrequency);

const FFTBlendControl: HTMLInputElement =
  document.querySelector("#fft-smoothing")!;
FFTBlendControl.value = `${analyzerNode.smoothingTimeConstant}`;
FFTBlendControl.addEventListener("input", () => {
  analyzerNode.smoothingTimeConstant = +FFTBlendControl.value;
});
