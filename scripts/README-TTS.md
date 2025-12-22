# Coqui TTS Integration Guide

This guide explains how to integrate and use Coqui TTS with the AI Prospect Training App backend.

## What is Coqui TTS?

Coqui TTS is a Python-based text-to-speech library that provides high-quality, natural-sounding speech synthesis. It's an open-source alternative to commercial TTS services.

## Installation

### Option 1: Use the Python Server Script

1. **Install Python dependencies:**
   ```bash
   pip install TTS flask flask-cors
   ```

2. **Start the TTS server:**
   ```bash
   python scripts/tts-server.py --port 5002
   ```

3. **Set environment variable (optional):**
   ```bash
   # In your .env.local file
   COQUI_TTS_SERVER_URL=http://localhost:5002
   ```

### Option 2: Use Coqui TTS Server (Official)

1. **Install Coqui TTS:**
   ```bash
   pip install TTS
   ```

2. **Start the official TTS server:**
   ```bash
   tts-server --port 5002
   ```

3. **Set environment variable:**
   ```bash
   COQUI_TTS_SERVER_URL=http://localhost:5002
   ```

## Available Models

Coqui TTS supports many pre-trained models. Some popular ones:

- `tts_models/en/ljspeech/tacotron2-DDC` - Fast, good quality (default)
- `tts_models/en/ljspeech/glow-tts` - Very fast
- `tts_models/en/vctk/vits` - Multi-speaker
- `tts_models/multilingual/multi-dataset/xtts_v2` - Multilingual, multi-speaker

To use a different model, start the server with:
```bash
python scripts/tts-server.py --model tts_models/en/vctk/vits
```

## API Endpoints

### POST /api/tts
Generate speech from text.

**Request:**
```json
{
  "text": "Hello, this is a test",
  "voice": "speaker_id_optional",
  "rate": 1.0,
  "pitch": 1.0,
  "language": "en"
}
```

**Response:**
- Audio file (WAV format) if TTS server is available
- JSON with `useClientTTS: true` if server is not available

### GET /api/tts
Check TTS server status and availability.

**Response:**
```json
{
  "available": true,
  "serverUrl": "http://localhost:5002",
  "status": {...}
}
```

## Usage in Frontend

The frontend can use the TTS API in two ways:

1. **Server-side TTS (Coqui):** Call `/api/tts` to get audio file
2. **Client-side TTS (Web Speech API):** Fallback if server is not available

Example:
```typescript
async function speakText(text: string) {
  try {
    const response = await fetch('/api/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });

    if (response.headers.get('content-type')?.includes('audio')) {
      // Server-side TTS available
      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      await audio.play();
    } else {
      // Fallback to client-side TTS
      const data = await response.json();
      if (data.useClientTTS) {
        const utterance = new SpeechSynthesisUtterance(text);
        window.speechSynthesis.speak(utterance);
      }
    }
  } catch (error) {
    // Fallback to Web Speech API
    const utterance = new SpeechSynthesisUtterance(text);
    window.speechSynthesis.speak(utterance);
  }
}
```

## Troubleshooting

### Server not starting
- Make sure Python 3.7+ is installed
- Check that all dependencies are installed: `pip install TTS flask flask-cors`
- Try a different port if 5002 is in use

### Model not loading
- Models are downloaded automatically on first use
- Check internet connection for model download
- Try a smaller/faster model if memory is limited

### CORS errors
- The Flask server includes CORS by default
- If using the official `tts-server`, make sure CORS is enabled

## Performance Notes

- First request may be slow (model loading)
- Subsequent requests are much faster
- Consider using a faster model for production
- For high traffic, consider running multiple TTS server instances

## Production Deployment

For production, consider:
1. Running TTS server as a separate service (Docker container)
2. Using a reverse proxy (nginx) for load balancing
3. Caching frequently used phrases
4. Using a faster model optimized for your use case

