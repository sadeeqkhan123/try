/**
 * Coqui TTS Service Integration
 * 
 * This service provides integration with Coqui TTS (Python-based TTS)
 * 
 * To use Coqui TTS:
 * 1. Install Coqui TTS: pip install TTS
 * 2. Start the TTS server: tts-server --port 5002
 * 3. Set COQUI_TTS_SERVER_URL environment variable (optional, defaults to http://localhost:5002)
 * 
 * Alternatively, you can use the Python script in scripts/tts-server.py
 */

export interface CoquiTTSOptions {
  text: string;
  speakerId?: string;
  languageId?: string;
  speed?: number;
  serverUrl?: string;
}

export interface CoquiTTSSpeaker {
  id: string;
  name: string;
  language: string;
}

export class CoquiTTSService {
  private serverUrl: string;

  constructor(serverUrl?: string) {
    this.serverUrl = serverUrl || process.env.COQUI_TTS_SERVER_URL || 'http://localhost:5002';
  }

  /**
   * Generate speech audio from text
   */
  async synthesize(options: CoquiTTSOptions): Promise<ArrayBuffer | null> {
    try {
      const response = await fetch(`${this.serverUrl}/api/tts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: options.text,
          speaker_id: options.speakerId,
          language_id: options.languageId || 'en',
          speed: options.speed || 1.0,
        }),
      });

      if (!response.ok) {
        throw new Error(`TTS server error: ${response.statusText}`);
      }

      return await response.arrayBuffer();
    } catch (error) {
      console.error('Error calling Coqui TTS:', error);
      return null;
    }
  }

  /**
   * Get available speakers/voices
   */
  async getSpeakers(): Promise<CoquiTTSSpeaker[]> {
    try {
      const response = await fetch(`${this.serverUrl}/api/speakers`, {
        method: 'GET',
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch speakers: ${response.statusText}`);
      }

      const data = await response.json();
      return data.speakers || [];
    } catch (error) {
      console.error('Error fetching speakers:', error);
      return [];
    }
  }

  /**
   * Get available languages
   */
  async getLanguages(): Promise<string[]> {
    try {
      const response = await fetch(`${this.serverUrl}/api/languages`, {
        method: 'GET',
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch languages: ${response.statusText}`);
      }

      const data = await response.json();
      return data.languages || ['en'];
    } catch (error) {
      console.error('Error fetching languages:', error);
      return ['en'];
    }
  }

  /**
   * Check if TTS server is available
   */
  async isAvailable(): Promise<boolean> {
    try {
      const response = await fetch(`${this.serverUrl}/api/status`, {
        method: 'GET',
        signal: AbortSignal.timeout(2000),
      });

      return response.ok;
    } catch (error) {
      return false;
    }
  }
}

