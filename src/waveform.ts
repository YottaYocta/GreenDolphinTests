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
  const visiblePercentile = sampleIdx / rangeLength;
  return canvasElement.width * visiblePercentile;
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
        canvasElement.height / 2 - waveHeight / 2,
        waveWidth,
        waveHeight
      );
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

      canvasCtx.fillRect(endPos, 0, 1, canvasElement.height);
      canvasCtx.fillText(`sample ${section.end}`, endPos + 5, 10);
    }
  }
};
