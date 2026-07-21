const pipelineMock = jest.fn(async (..._args: unknown[]) => ({ __fakeAsr: true }));
jest.mock('@huggingface/transformers', () => ({
  pipeline: (...args: unknown[]) => pipelineMock(...args),
  env: { allowLocalModels: true },
}));

import { getWhisperPipeline } from '@/lib/whisper-pipeline';

describe('getWhisperPipeline', () => {
  it('loads the ASR pipeline on webgpu, once, and caches it', async () => {
    const a = await getWhisperPipeline();
    const b = await getWhisperPipeline();

    expect(a).toBe(b);
    expect(pipelineMock).toHaveBeenCalledTimes(1);
    expect(pipelineMock).toHaveBeenCalledWith(
      'automatic-speech-recognition',
      'onnx-community/whisper-base.en',
      expect.objectContaining({ device: 'webgpu', dtype: 'q8' })
    );
  });
});
