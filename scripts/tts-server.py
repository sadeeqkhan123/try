#!/usr/bin/env python3
"""
Coqui TTS Server Wrapper
This script starts a simple HTTP server that wraps Coqui TTS for use with the Next.js backend.

Usage:
    python scripts/tts-server.py [--port PORT] [--model MODEL_NAME]

Requirements:
    pip install TTS flask flask-cors
"""

import argparse
import sys
from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
import io
import os

try:
    from TTS.api import TTS
except ImportError:
    print("Error: Coqui TTS not installed. Install it with: pip install TTS")
    sys.exit(1)

app = Flask(__name__)
CORS(app)  # Enable CORS for Next.js frontend

# Global TTS instance
tts_instance = None

def initialize_tts(model_name: str = "tts_models/en/ljspeech/tacotron2-DDC"):
    """Initialize the TTS model"""
    global tts_instance
    try:
        print(f"Loading TTS model: {model_name}")
        tts_instance = TTS(model_name=model_name)
        print("TTS model loaded successfully!")
        return True
    except Exception as e:
        print(f"Error loading TTS model: {e}")
        return False

@app.route('/api/status', methods=['GET'])
def status():
    """Health check endpoint"""
    return jsonify({
        'status': 'running',
        'model_loaded': tts_instance is not None,
    })

@app.route('/api/tts', methods=['POST'])
def synthesize():
    """Generate speech from text"""
    if tts_instance is None:
        return jsonify({'error': 'TTS model not loaded'}), 500

    try:
        data = request.get_json()
        text = data.get('text', '')
        speaker_id = data.get('speaker_id')
        language_id = data.get('language_id', 'en')
        speed = data.get('speed', 1.0)

        if not text:
            return jsonify({'error': 'Text is required'}), 400

        # Generate speech
        wav = tts_instance.tts(
            text=text,
            speaker=speaker_id,
            language=language_id,
        )

        # Convert to audio file
        audio_buffer = io.BytesIO()
        tts_instance.tts_to_file(
            text=text,
            file_path=audio_buffer,
            speaker=speaker_id,
            language=language_id,
        )

        audio_buffer.seek(0)
        return send_file(
            audio_buffer,
            mimetype='audio/wav',
            as_attachment=True,
            download_name='tts_output.wav'
        )
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/speakers', methods=['GET'])
def speakers():
    """Get available speakers"""
    if tts_instance is None:
        return jsonify({'speakers': []})

    try:
        speakers_list = tts_instance.speakers if hasattr(tts_instance, 'speakers') else []
        return jsonify({'speakers': speakers_list})
    except Exception as e:
        return jsonify({'error': str(e), 'speakers': []}), 500

@app.route('/api/languages', methods=['GET'])
def languages():
    """Get available languages"""
    if tts_instance is None:
        return jsonify({'languages': ['en']})

    try:
        languages_list = tts_instance.languages if hasattr(tts_instance, 'languages') else ['en']
        return jsonify({'languages': languages_list})
    except Exception as e:
        return jsonify({'error': str(e), 'languages': ['en']}), 500

def main():
    parser = argparse.ArgumentParser(description='Coqui TTS Server for Next.js Backend')
    parser.add_argument('--port', type=int, default=5002, help='Server port (default: 5002)')
    parser.add_argument('--model', type=str, default='tts_models/en/ljspeech/tacotron2-DDC',
                      help='TTS model name (default: tts_models/en/ljspeech/tacotron2-DDC)')
    parser.add_argument('--host', type=str, default='0.0.0.0', help='Server host (default: 0.0.0.0)')

    args = parser.parse_args()

    print("Starting Coqui TTS Server...")
    if not initialize_tts(args.model):
        print("Failed to initialize TTS model. Exiting.")
        sys.exit(1)

    print(f"Server starting on http://{args.host}:{args.port}")
    app.run(host=args.host, port=args.port, debug=False)

if __name__ == '__main__':
    main()

