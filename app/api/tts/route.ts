import { NextRequest, NextResponse } from 'next/server';

/**
 * Text-to-Speech API endpoint
 * Integrates with Coqui TTS (Python service) or falls back to Web Speech API
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { text, voice, rate = 1.0, pitch = 1.0, language = 'en' } = body;

    if (!text) {
      return NextResponse.json(
        { error: 'Text is required' },
        { status: 400 }
      );
    }

    // Try to use Coqui TTS server if available
    const audioData = await generateSpeechWithCoquiTTS(text, voice, rate, pitch, language);

    if (audioData) {
      return new NextResponse(audioData, {
        headers: {
          'Content-Type': 'audio/wav',
          'Content-Disposition': `attachment; filename="tts_${Date.now()}.wav"`,
        },
      });
    }

    // Fallback: Return text for client-side TTS
    return NextResponse.json({
      text,
      voice,
      rate,
      pitch,
      language,
      useClientTTS: true,
      message: 'Coqui TTS server not available. Use client-side Web Speech API.',
    });
  } catch (error) {
    console.error('Error generating speech:', error);
    return NextResponse.json(
      { error: 'Failed to generate speech', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * Generate speech using Coqui TTS server
 * Assumes Coqui TTS server is running on localhost:5002 (default port)
 */
async function generateSpeechWithCoquiTTS(
  text: string,
  voice?: string,
  rate: number = 1.0,
  pitch: number = 1.0,
  language: string = 'en'
): Promise<ArrayBuffer | null> {
  try {
    // Coqui TTS server endpoint
    const ttsServerUrl = process.env.COQUI_TTS_SERVER_URL || 'http://localhost:5002/api/tts';
    
    const response = await fetch(ttsServerUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text,
        speaker_id: voice,
        language_id: language,
        speed: rate,
      }),
    });

    if (!response.ok) {
      console.warn(`Coqui TTS server not available: ${response.statusText}`);
      return null;
    }

    const audioBuffer = await response.arrayBuffer();
    return audioBuffer;
  } catch (error) {
    console.warn('Coqui TTS server not available:', error instanceof Error ? error.message : 'Unknown error');
    return null;
  }
}

/**
 * GET endpoint to check TTS server status
 */
export async function GET(request: NextRequest) {
  try {
    const ttsServerUrl = process.env.COQUI_TTS_SERVER_URL || 'http://localhost:5002/api/tts';
    
    // Try to ping the TTS server
    const response = await fetch(`${ttsServerUrl.replace('/api/tts', '/api/status')}`, {
      method: 'GET',
      signal: AbortSignal.timeout(2000), // 2 second timeout
    });

    if (response.ok) {
      const status = await response.json();
      return NextResponse.json({
        available: true,
        serverUrl: ttsServerUrl,
        status,
      });
    }

    return NextResponse.json({
      available: false,
      serverUrl: ttsServerUrl,
      message: 'Coqui TTS server is not running. Install and start it to use server-side TTS.',
    });
  } catch (error) {
    return NextResponse.json({
      available: false,
      message: 'Coqui TTS server is not available. Use client-side Web Speech API.',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

