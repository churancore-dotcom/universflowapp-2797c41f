import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Cobalt API instances (v11) - from instances.cobalt.best
// These provide direct download URLs for YouTube audio
const COBALT_INSTANCES = [
  'https://cobalt-api.meowing.de',
  'https://cobalt-backend.canine.tools',
  'https://kityune.imput.net',
  'https://nachos.imput.net',
  'https://sunny.imput.net',
  'https://blossom.imput.net',
  'https://capi.3kh0.net',
];

// Piped API instances as fallback
const PIPED_INSTANCES = [
  'https://pipedapi.kavin.rocks',
  'https://pipedapi.tokhmi.xyz',
  'https://pipedapi.moomoo.me',
  'https://api-piped.mha.fi',
  'https://piapi.ggtyler.dev',
];

interface CobaltResponse {
  status: 'tunnel' | 'redirect' | 'picker' | 'error' | 'local-processing';
  url?: string;
  filename?: string;
  error?: { code: string };
  picker?: Array<{ url: string; type: string }>;
  tunnel?: string[];
}

interface PipedAudioStream {
  url: string;
  bitrate: number;
  mimeType: string;
  quality: string;
}

interface PipedResponse {
  audioStreams?: PipedAudioStream[];
  title?: string;
  error?: string;
  message?: string;
}

function extractVideoId(url: string): string | null {
  try {
    const urlObj = new URL(url);
    const vParam = urlObj.searchParams.get('v');
    if (vParam && vParam.length === 11) return vParam;
  } catch { /* ignore */ }
  
  const patterns = [
    /(?:youtube\.com|music\.youtube\.com)\/watch\?.*v=([a-zA-Z0-9_-]{11})/,
    /youtu\.be\/([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/(?:embed|v|shorts|live)\/([a-zA-Z0-9_-]{11})/,
    /^([a-zA-Z0-9_-]{11})$/,
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

function isPlaylistUrl(url: string): boolean {
  return url.includes('playlist?list=') || (url.includes('list=') && !url.includes('v='));
}

// Try Cobalt API v11
async function tryCobaltInstance(
  instanceUrl: string, 
  videoUrl: string,
  timeoutMs: number = 15000
): Promise<{ success: boolean; audioUrl?: string; filename?: string; error?: string }> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  
  try {
    console.log(`Trying Cobalt: ${instanceUrl}`);
    
    const response = await fetch(instanceUrl, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'User-Agent': 'UniversFlow/1.0',
      },
      body: JSON.stringify({
        url: videoUrl,
        downloadMode: 'audio',
        audioFormat: 'mp3',
        audioBitrate: '320',
        filenameStyle: 'basic',
      }),
    });
    
    clearTimeout(timeoutId);

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      return { success: false, error: `HTTP ${response.status}: ${text.slice(0, 100)}` };
    }

    const data: CobaltResponse = await response.json();
    console.log(`Cobalt response status: ${data.status}`);
    
    if (data.status === 'error') {
      return { success: false, error: data.error?.code || 'Unknown error' };
    }
    
    if (data.status === 'tunnel' || data.status === 'redirect') {
      if (data.url) {
        console.log(`✓ Got audio URL from Cobalt`);
        return {
          success: true,
          audioUrl: data.url,
          filename: data.filename || 'audio.mp3',
        };
      }
    }
    
    if (data.status === 'local-processing' && data.tunnel && data.tunnel.length > 0) {
      console.log(`✓ Got tunnel URL from Cobalt (local-processing)`);
      return {
        success: true,
        audioUrl: data.tunnel[0],
        filename: 'audio.mp3',
      };
    }
    
    if (data.status === 'picker' && data.picker && data.picker.length > 0) {
      // Find audio in picker
      const audioItem = data.picker.find(p => p.type === 'audio') || data.picker[0];
      if (audioItem?.url) {
        console.log(`✓ Got audio from Cobalt picker`);
        return {
          success: true,
          audioUrl: audioItem.url,
          filename: 'audio.mp3',
        };
      }
    }
    
    return { success: false, error: `Unexpected status: ${data.status}` };
  } catch (error) {
    clearTimeout(timeoutId);
    const msg = error instanceof Error ? error.message : 'Network error';
    if (msg.includes('abort')) {
      return { success: false, error: 'Timeout' };
    }
    return { success: false, error: msg };
  }
}

// Try Piped API as fallback
async function tryPipedInstance(
  instanceUrl: string, 
  videoId: string,
  timeoutMs: number = 10000
): Promise<{ success: boolean; audioUrl?: string; title?: string; error?: string }> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  
  try {
    console.log(`Trying Piped: ${instanceUrl}`);
    
    const response = await fetch(`${instanceUrl}/streams/${videoId}`, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json',
      },
    });
    
    clearTimeout(timeoutId);

    if (!response.ok) {
      return { success: false, error: `HTTP ${response.status}` };
    }

    const data: PipedResponse = await response.json();
    
    if (data.error || data.message) {
      return { success: false, error: data.error || data.message };
    }

    if (!data.audioStreams || data.audioStreams.length === 0) {
      return { success: false, error: 'No audio streams' };
    }

    // Find best audio stream (prefer M4A/MP4, higher bitrate)
    const sortedStreams = [...data.audioStreams].sort((a, b) => {
      const aIsM4a = a.mimeType?.includes('mp4');
      const bIsM4a = b.mimeType?.includes('mp4');
      if (aIsM4a && !bIsM4a) return -1;
      if (!aIsM4a && bIsM4a) return 1;
      return (b.bitrate || 0) - (a.bitrate || 0);
    });

    const bestStream = sortedStreams[0];
    console.log(`✓ Found Piped stream: ${bestStream.quality}`);

    return {
      success: true,
      audioUrl: bestStream.url,
      title: data.title,
    };
  } catch (error) {
    clearTimeout(timeoutId);
    const msg = error instanceof Error ? error.message : 'Network error';
    return { success: false, error: msg.includes('abort') ? 'Timeout' : msg };
  }
}

// Main extraction function - try Cobalt first, then Piped
async function extractFromYouTube(url: string, videoId: string): Promise<{
  success: boolean;
  audioUrl?: string;
  title?: string;
  filename?: string;
  error?: string;
}> {
  // Shuffle instances for load distribution
  const cobaltInstances = [...COBALT_INSTANCES].sort(() => Math.random() - 0.5);
  const pipedInstances = [...PIPED_INSTANCES].sort(() => Math.random() - 0.5);
  
  console.log(`\n=== Trying ${cobaltInstances.length} Cobalt instances ===`);
  
  // Try Cobalt instances in batches of 3
  for (let i = 0; i < cobaltInstances.length; i += 3) {
    const batch = cobaltInstances.slice(i, i + 3);
    console.log(`Cobalt batch ${Math.floor(i/3) + 1}: ${batch.map((u: string) => new URL(u).hostname).join(', ')}`);
    
    const results = await Promise.all(
      batch.map((instance: string) => tryCobaltInstance(instance, url))
    );
    
    const success = results.find((r: { success: boolean }) => r.success);
    if (success && success.audioUrl) {
      return success;
    }
    
    results.forEach((r: { success: boolean; error?: string }, idx: number) => {
      if (!r.success) {
        console.log(`  ✗ ${new URL(batch[idx]).hostname}: ${r.error}`);
      }
    });
  }
  
  console.log(`\n=== Cobalt failed, trying ${pipedInstances.length} Piped instances ===`);
  
  // Try Piped instances in batches of 3
  for (let i = 0; i < pipedInstances.length; i += 3) {
    const batch = pipedInstances.slice(i, i + 3);
    console.log(`Piped batch ${Math.floor(i/3) + 1}: ${batch.map((u: string) => new URL(u).hostname).join(', ')}`);
    
    const results = await Promise.all(
      batch.map((instance: string) => tryPipedInstance(instance, videoId))
    );
    
    const success = results.find((r: { success: boolean }) => r.success);
    if (success && success.audioUrl) {
      return success;
    }
    
    results.forEach((r: { success: boolean; error?: string }, idx: number) => {
      if (!r.success) {
        console.log(`  ✗ ${new URL(batch[idx]).hostname}: ${r.error}`);
      }
    });
  }
  
  return { 
    success: false, 
    error: 'All extraction servers are unavailable or rate-limited' 
  };
}

function detectPlatform(url: string): string {
  const lowercaseUrl = url.toLowerCase();
  if (lowercaseUrl.includes('youtube.com') || lowercaseUrl.includes('youtu.be')) return 'YouTube';
  if (lowercaseUrl.includes('soundcloud.com')) return 'SoundCloud';
  if (lowercaseUrl.includes('spotify.com')) return 'Spotify';
  if (lowercaseUrl.includes('tiktok.com')) return 'TikTok';
  if (lowercaseUrl.includes('twitter.com') || lowercaseUrl.includes('x.com')) return 'Twitter/X';
  if (lowercaseUrl.includes('instagram.com')) return 'Instagram';
  return 'Other';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { url } = await req.json();

    if (!url) {
      return new Response(
        JSON.stringify({ error: 'URL is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`\n========================================`);
    console.log(`Extracting audio from: ${url}`);
    const platform = detectPlatform(url);
    console.log(`Platform: ${platform}`);

    // Direct audio URL - return as-is
    if (url.match(/\.(mp3|wav|flac|aac|ogg|m4a|opus|webm)(\?.*)?$/i)) {
      console.log('Direct audio URL detected');
      return new Response(
        JSON.stringify({
          success: true,
          audioUrl: url,
          platform: 'Direct Link',
          filename: url.split('/').pop()?.split('?')[0] || 'audio.mp3',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // YouTube extraction
    if (platform === 'YouTube') {
      if (isPlaylistUrl(url)) {
        return new Response(
          JSON.stringify({ 
            error: 'Playlist URLs are not supported. Please copy the link of a specific video.',
            platform: 'YouTube',
            hint: 'Click on a video in the playlist, then copy its URL.',
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      const videoId = extractVideoId(url);
      
      if (!videoId) {
        return new Response(
          JSON.stringify({ 
            error: 'Could not extract video ID. Please use a direct video link.',
            platform: 'YouTube',
            hint: 'Use a URL like youtube.com/watch?v=VIDEO_ID or youtu.be/VIDEO_ID',
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log(`Video ID: ${videoId}`);

      const result = await extractFromYouTube(url, videoId);
      
      if (result.success && result.audioUrl) {
        const filename = result.filename || (result.title ? `${result.title.replace(/[<>:"/\\|?*]/g, '')}.mp3` : 'audio.mp3');
        console.log(`\n✓ SUCCESS! File: ${filename}`);
        
        return new Response(
          JSON.stringify({
            success: true,
            audioUrl: result.audioUrl,
            platform: 'YouTube',
            filename,
            title: result.title,
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log(`\n✗ FAILED: ${result.error}`);
      return new Response(
        JSON.stringify({ 
          error: 'YouTube extraction temporarily unavailable. Please try again.',
          platform: 'YouTube',
          hint: 'Extraction servers may be busy. Try again in a moment or use a direct audio link.',
        }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Unsupported platform
    return new Response(
      JSON.stringify({ 
        error: `Audio extraction from ${platform} is not currently supported.`,
        platform,
        hint: 'Please use a YouTube link or direct audio link (MP3, WAV, etc.).',
        supportedPlatforms: ['YouTube', 'Direct Links (MP3, WAV, FLAC, M4A, OGG)'],
      }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
