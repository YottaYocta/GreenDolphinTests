const MIN_WAVE_WIDTH = 0.001;

export interface WaveformSection {
  start: number;
  end: number;
}

export interface WaveformOptions {
  resolution: number;
  backgroundFillStyle?: string;
  waveFillStyle?: string;
  alternateFillStyle?: string;
}

export const pixelOfSampleIndex = (
  sampleIdx: number,
  rangeLength: number,
  canvasElement: HTMLCanvasElement
) => {
  return canvasElement.width * (sampleIdx / rangeLength);
};

export const sampleIndexOfPixel = (
  pixel: number,
  rangeLength: number,
  canvasElement: HTMLCanvasElement
) => {
  return Math.floor((pixel / canvasElement.width) * rangeLength);
};

export const renderWaveform = (
  data: AudioBuffer,
  range: WaveformSection,
  {
    resolution,
    backgroundFillStyle = "rgb(240 240 240)",
    waveFillStyle = "rgb(50 170 120)",
    alternateFillStyle = "rgb(50 170 120 / 50%)",
  }: WaveformOptions,
  canvasElement: HTMLCanvasElement,
  section?: WaveformSection
) => {
  const channelHeight = canvasElement.height / data.numberOfChannels;
  const canvasCtx = canvasElement.getContext("2d")!;
  canvasCtx.fillStyle = backgroundFillStyle;

  canvasCtx.fillRect(0, 0, canvasElement.width, canvasElement.height);

  const rangeLength = range.end - range.start;

  const waveWidth = Math.max(MIN_WAVE_WIDTH, canvasElement.width / resolution);
  const trueResolution = canvasElement.width / waveWidth;
  const samplesPerWave = Math.max(0, rangeLength / trueResolution);

  for (let i = 0; i < data.numberOfChannels; i++) {
    const channelData = data.getChannelData(i);

    const subsamplingRate = Math.max(0, samplesPerWave / 10);
    for (
      let j = range.start;
      j < channelData.length && j < range.end;
      j += samplesPerWave
    ) {
      let sampleSum = 0;
      let sampleCount = 0;
      for (
        let k = j;
        k < channelData.length && k < j + samplesPerWave;
        k += subsamplingRate
      ) {
        sampleSum += Math.abs(channelData[Math.floor(k)]);
        sampleCount++;
      }
      const sampleIntensity = sampleSum / sampleCount;
      const waveHeight = Math.abs(sampleIntensity) * channelHeight;
      canvasCtx.fillStyle = section
        ? j >= section.start && j <= section.end
          ? waveFillStyle
          : alternateFillStyle
        : waveFillStyle;
      canvasCtx.fillRect(
        ((j - range.start) / samplesPerWave) * waveWidth,
        channelHeight * i + channelHeight / 2 - waveHeight / 2,
        waveWidth,
        waveHeight
      );
    }
  }

  if (section) {
    const startPos = pixelOfSampleIndex(
      section.start - range.start,
      rangeLength,
      canvasElement
    );

    const endPos = pixelOfSampleIndex(
      section.end - range.start,
      rangeLength,
      canvasElement
    );

    canvasCtx.fillStyle = "rgb(0 0 0)";
    canvasCtx.fillRect(startPos, 0, 1, canvasElement.height);
    canvasCtx.fillText(`sample ${section.start}`, startPos + 5, 10);
    canvasCtx.fillText(
      `${Math.trunc((section.start / data.sampleRate) * 100) / 100}s`,
      startPos + 5,
      20
    );

    canvasCtx.fillRect(endPos, 0, 1, canvasElement.height);
    canvasCtx.fillText(`sample ${section.end}`, endPos + 5, 10);
    canvasCtx.fillText(
      `${Math.trunc((section.end / data.sampleRate) * 100) / 100}s`,
      endPos + 5,
      20
    );
  }
};

export interface WaveformState {
  data: AudioBuffer;
  range: WaveformSection;
  options: WaveformOptions;
  section?: WaveformSection;
  dragging: boolean;
}

export type WaveformAuxRenderFunction = (
  state: WaveformState,
  canvasElement: HTMLCanvasElement
) => void;

export const createWaveform = (
  data: AudioBuffer,
  canvasElement: HTMLCanvasElement
): [WaveformState, HTMLCanvasElement, WaveformAuxRenderFunction] => {
  const waveformState: WaveformState = {
    data,
    range: { start: 0, end: data.length },
    options: { resolution: canvasElement.width },
    dragging: false,
  };
  const renderWaveformAux: WaveformAuxRenderFunction = (
    state: WaveformState,
    canvas: HTMLCanvasElement
  ) => {
    renderWaveform(
      state.data,
      state.range,
      state.options,
      canvas,
      state.section
    );
  };
  renderWaveformAux(waveformState, canvasElement);

  canvasElement.addEventListener("wheel", (e: WheelEvent) => {
    const rangeLength = waveformState.range.end - waveformState.range.start;
    e.stopPropagation();
    e.preventDefault();

    if ((Math.abs(e.deltaX) + 0.001) / (Math.abs(e.deltaY) + 0.001) > 0.5) {
      const targetStart =
        waveformState.range.start + e.deltaX * (rangeLength / 400);
      const targetEnd = targetStart + rangeLength;
      if (targetEnd > waveformState.data.length) {
        waveformState.range.start = Math.max(
          0,
          waveformState.data.length - rangeLength
        );
      } else if (targetStart < 0) {
        waveformState.range.start = 0;
      } else {
        waveformState.range.start = Math.floor(targetStart);
      }
      waveformState.range.end = waveformState.range.start + rangeLength;
    } else {
      const currentRange = waveformState.range.end - waveformState.range.start;
      const before =
        sampleIndexOfPixel(e.offsetX, currentRange, canvasElement) /
        currentRange;
      const after = 1 - before;

      const targetRange = Math.max(
        2,
        Math.min(
          waveformState.data.length,
          currentRange * (1 + -e.deltaY / 1000)
        )
      );

      const targetBefore = targetRange * before;
      const targetAfter = targetRange * after;

      const currentTarget =
        sampleIndexOfPixel(e.offsetX, currentRange, canvasElement) +
        waveformState.range.start;
      waveformState.range.start = Math.floor(
        Math.max(0, currentTarget - targetBefore)
      );
      waveformState.range.end = Math.floor(
        Math.min(currentTarget + targetAfter, waveformState.data.length)
      );
    }

    renderWaveformAux(waveformState, canvasElement);
  });

  canvasElement.addEventListener("mousedown", (e: MouseEvent) => {
    waveformState.dragging = true;
    const startSample =
      sampleIndexOfPixel(
        e.offsetX,
        waveformState.range.end - waveformState.range.start,
        canvasElement
      ) + waveformState.range.start;
    waveformState.section = { start: startSample, end: startSample };
    renderWaveformAux(waveformState, canvasElement);
  });

  canvasElement.addEventListener("mousemove", (e: MouseEvent) => {
    if (waveformState.dragging && waveformState.section) {
      const endSample = sampleIndexOfPixel(
        e.offsetX,
        waveformState.range.end - waveformState.range.start,
        canvasElement
      );
      const endTarget = waveformState.range.start + endSample;
      if (endTarget <= waveformState.section.start) {
        waveformState.section.start = endTarget;
      }
      if (endTarget >= waveformState.section.end) {
        waveformState.section.end = endTarget;
      }
    }
    renderWaveformAux(waveformState, canvasElement);
  });

  canvasElement.addEventListener("mouseup", () => {
    waveformState.dragging = false;
    renderWaveformAux(waveformState, canvasElement);
  });

  canvasElement.addEventListener("mouseleave", () => {
    waveformState.dragging = false;
    renderWaveformAux(waveformState, canvasElement);
  });

  const updateSize = () => {
    canvasElement.width = canvasElement.getBoundingClientRect().width;
    canvasElement.height = canvasElement.getBoundingClientRect().height;
    renderWaveformAux(waveformState, canvasElement);
  };

  window.addEventListener("resize", updateSize);

  updateSize();

  return [waveformState, canvasElement, renderWaveformAux];
};
