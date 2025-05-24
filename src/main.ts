import "./style.css";

const audioContext: AudioContext = new AudioContext();

const audioElement = document.querySelector("audio");

const track = audioContext.createMediaElementSource(audioElement!);

const oscillator = audioContext.createOscillator();
oscillator.frequency.value = 440;

const gainNode = audioContext.createGain();

const steropannerNode = audioContext.createStereoPanner();

const analyzerNode = audioContext.createAnalyser();
analyzerNode.minDecibels = -90;
analyzerNode.maxDecibels = -10;
analyzerNode.smoothingTimeConstant = 0.85;

analyzerNode.fftSize = 16384 / 2;

track
  .connect(gainNode)
  .connect(steropannerNode)
  .connect(analyzerNode)
  .connect(audioContext.destination);

oscillator
  .connect(gainNode)
  .connect(steropannerNode)
  .connect(analyzerNode)
  .connect(audioContext.destination);

// analysis

const bufferLength = analyzerNode.frequencyBinCount;
document.querySelector("#buffer-length")!.innerHTML =
  "Buffer Length: " + bufferLength;

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

const playbutton = document.querySelector("button");

playbutton?.addEventListener("click", () => {
  if (audioContext.state === "suspended") {
    audioContext.resume();
  }

  if (playbutton.dataset.playing === "false") {
    oscillator.start();
    playbutton.dataset.playing = "true";
  } else if (playbutton.dataset.playing === "true") {
    playbutton.dataset.playing = "false";
  }
});

const volumeControl: HTMLInputElement = document.querySelector("#volume")!;

volumeControl.addEventListener("input", () => {
  gainNode.gain.value = +volumeControl.value;
});

const panControl: HTMLInputElement = document.querySelector("#pan")!;

panControl.addEventListener("input", () => {
  steropannerNode.pan.value = +panControl.value;
});

audioElement?.addEventListener("ended", () => {
  if (playbutton) playbutton.dataset.playing = "false";
});
