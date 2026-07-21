'use client';

import { pipeline, env, type AutomaticSpeechRecognitionPipeline } from '@huggingface/transformers';

// Model weights are fetched from the HF Hub CDN, not bundled in the repo.
env.allowLocalModels = false;

let pipelinePromise: Promise<AutomaticSpeechRecognitionPipeline> | null = null;

/** Loads the Whisper ASR pipeline once and reuses it across every mic session —
 *  re-loading on each mic toggle would re-download/re-init a multi-hundred-MB model. */
export function getWhisperPipeline(): Promise<AutomaticSpeechRecognitionPipeline> {
  if (!pipelinePromise) {
    // whisper-base.en: large-v3-turbo was taking 2.3-4.7s of inference per
    // utterance in practice — too slow for a live voice conversation. base
    // trades accuracy (weaker on medical terminology) for a much smaller
    // decoder; .en since transcription is forced to English anyway, so the
    // multilingual decoder head is dead weight. Re-measure and bump back up
    // if accuracy turns out to be the bottleneck instead of latency.
    pipelinePromise = pipeline('automatic-speech-recognition', 'onnx-community/whisper-base.en', {
      device: 'webgpu',
      dtype: 'q8',
    }) as Promise<AutomaticSpeechRecognitionPipeline>;
  }
  return pipelinePromise;
}

/** Decodes a recorded audio Blob and resamples it to 16kHz mono Float32 PCM — the
 *  input format Whisper's feature extractor expects, regardless of the mic's native rate. */
export async function resampleTo16kMono(blob: Blob): Promise<Float32Array> {
  const arrayBuffer = await blob.arrayBuffer();
  const decodeCtx = new AudioContext();
  const decoded = await decodeCtx.decodeAudioData(arrayBuffer);
  const offline = new OfflineAudioContext(1, Math.ceil(decoded.duration * 16000), 16000);
  const source = offline.createBufferSource();
  source.buffer = decoded;
  source.connect(offline.destination);
  source.start();
  const rendered = await offline.startRendering();
  await decodeCtx.close();
  return rendered.getChannelData(0);
}
