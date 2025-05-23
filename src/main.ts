import "./style.css";

const audioContext: AudioContext = new AudioContext();

const audioElement = document.querySelector("audio");

const track = audioContext.createMediaElementSource(audioElement!);

track.connect(audioContext.destination);

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

audioElement?.addEventListener("ended", () => {
  if (playbutton) playbutton.dataset.playing = "false";
});
