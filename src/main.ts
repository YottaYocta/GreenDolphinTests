import "./style.css";

const audioContext: AudioContext = new AudioContext();

const audioElement = document.querySelector("audio");

const track = audioContext.createMediaElementSource(audioElement!);

const gainNode = audioContext.createGain();

const steropannerNode = audioContext.createStereoPanner();

track
  .connect(gainNode)
  .connect(steropannerNode)
  .connect(audioContext.destination);

const playbutton = document.querySelector("button");

playbutton?.addEventListener("click", () => {
  if (audioContext.state === "suspended") {
    audioContext.resume();
  }

  if (playbutton.dataset.playing === "false") {
    audioElement?.play();
    playbutton.dataset.playing = "true";
  } else if (playbutton.dataset.playing === "true") {
    audioElement?.pause();
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
