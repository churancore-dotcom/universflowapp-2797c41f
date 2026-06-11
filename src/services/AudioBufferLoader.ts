import { AudioEngine } from './AudioEngine';

const bufferCache = new Map<string, AudioBuffer>();

export async function preloadBuffer(url: string, engine: AudioEngine): Promise<AudioBuffer> {
  if (bufferCache.has(url)) return bufferCache.get(url)!;
  const buffer = await engine.loadBuffer(url);
  bufferCache.set(url, buffer);
  return buffer;
}

export function clearCache(): void {
  bufferCache.clear();
}
