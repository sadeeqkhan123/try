// Speech-to-Text and Text-to-Speech service adapters
// Currently mocked; can be swapped with real services (Google Cloud, AWS Polly, Web Speech API, etc.)

export interface SpeechToTextResult {
  text: string
  isFinal: boolean
  confidence: number
}

export interface TextToSpeechOptions {
  rate?: number
  pitch?: number
}

export class SpeechToTextService {
  private isListening = false
  private transcript = ""
  private onResultCallback: ((result: SpeechToTextResult) => void) | null = null
  private recognition: any = null
  private isSupported = false
  private silenceTimeout: NodeJS.Timeout | null = null
  private lastFinalTranscript = ''

  constructor() {
    // Check if Web Speech API is available
    if (typeof window !== "undefined") {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
      this.isSupported = !!SpeechRecognition

      if (this.isSupported) {
        this.recognition = new SpeechRecognition()
        this.recognition.continuous = true
        this.recognition.interimResults = true
        this.recognition.lang = 'en-US'

        this.recognition.onresult = (event: any) => {
          let interimTranscript = ''
          let finalTranscript = ''

          for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript
            const confidence = event.results[i][0].confidence || 0.8

            if (event.results[i].isFinal) {
              finalTranscript += transcript + ' '
              this.lastFinalTranscript += finalTranscript
            } else {
              interimTranscript += transcript
            }
          }

          // Update transcript for display (shows what user is saying in real-time)
          if (interimTranscript || finalTranscript) {
            this.transcript = this.lastFinalTranscript + (interimTranscript ? ' ' + interimTranscript : '')
            // Only show interim results for display, don't process them
            if (interimTranscript && !finalTranscript) {
              this.onResultCallback?.({
                text: this.transcript.trim(),
                isFinal: false,
                confidence: 0.8,
              })
            }
          }

          // Don't auto-process final results - wait for manual stop
          // This prevents premature processing when user pauses to think
          // Final results are only processed when stopListening() is called
        }

        this.recognition.onerror = (event: any) => {
          console.error('Speech recognition error:', event.error)
          
          // Handle specific errors
          if (event.error === 'not-allowed') {
            console.error('Microphone access denied. Please allow microphone access in your browser settings.')
            // Don't use alert - just log and stop
            this.stopListening()
            // Notify the callback so UI can show a message
            this.onResultCallback?.({
              text: '',
              isFinal: false,
              confidence: 0,
            })
            return
          }
          
          if (event.error === 'no-speech') {
            // User didn't speak, that's okay - don't log as error
            return
          }
          
          if (event.error === 'audio-capture') {
            console.error('No microphone found. Please connect a microphone and try again.')
            this.stopListening()
            // Notify the callback so UI can show a message
            this.onResultCallback?.({
              text: '',
              isFinal: false,
              confidence: 0,
            })
            return
          }
          
          // For other errors, log but don't stop unless it's critical
          if (event.error === 'aborted' || event.error === 'network') {
            // These are usually recoverable, just log
            console.warn('Speech recognition error (recoverable):', event.error)
            return
          }
          
          // For unknown errors, stop listening
          this.stopListening()
        }

        this.recognition.onend = () => {
          if (this.isListening) {
            // Restart if we're still supposed to be listening
            try {
              this.recognition.start()
            } catch (e) {
              // Already started, ignore
            }
          }
        }
      }
    }
  }

  /**
   * Start listening for speech
   */
  startListening(onResult: (result: SpeechToTextResult) => void): void {
    this.isListening = true
    this.transcript = ""
    this.lastFinalTranscript = "" // Reset for new recording session
    this.onResultCallback = onResult

    if (this.isSupported && this.recognition) {
      try {
        this.recognition.start()
      } catch (e: any) {
        // Handle specific errors
        if (e.name === 'NotAllowedError' || e.message?.includes('not-allowed')) {
          console.error('Microphone access denied. Please allow microphone access in your browser settings and refresh the page.')
          this.stopListening()
          // Notify callback with empty result to indicate error
          this.onResultCallback?.({
            text: '',
            isFinal: false,
            confidence: 0,
          })
          return
        }
        // Already started or other recoverable error, just log
        if (e.message?.includes('already started') || e.message?.includes('started')) {
        console.warn('Recognition already started')
        } else {
          console.warn('Recognition start error:', e.message || e)
        }
      }
    } else {
      // Fallback to mock if Web Speech API not supported
      console.warn('Web Speech API not supported, using mock recognition')
      this.mockListeningSession()
    }
  }

  /**
   * Stop listening
   */
  stopListening(): string {
    this.isListening = false
    
    // Clear silence timeout
    if (this.silenceTimeout) {
      clearTimeout(this.silenceTimeout)
      this.silenceTimeout = null
    }
    
    if (this.recognition) {
      try {
        this.recognition.stop()
      } catch (e) {
        // Already stopped, ignore
      }
    }

    // Return the final transcript
    const finalTranscript = this.transcript.trim() || this.lastFinalTranscript.trim()
    this.lastFinalTranscript = ''
    return finalTranscript
  }

  /**
   * Mock listening - fallback when Web Speech API is not available
   */
  private mockListeningSession(): void {
    // Simulate user speaking (2-5 seconds of listening)
    const mockResponses = [
      "sounds interesting",
      "tell me more",
      "how much does it cost",
      "we already use something",
      "maybe later",
      "when can we start",
      "can you send me info",
      "what about integration",
    ]

    const randomResponse = mockResponses[Math.floor(Math.random() * mockResponses.length)]

    // Simulate gradual recognition
    let currentWord = 0
    const words = randomResponse.split(" ")

    const interval = setInterval(() => {
      if (!this.isListening) {
        clearInterval(interval)
        return
      }

      if (currentWord < words.length) {
        this.transcript = words.slice(0, currentWord + 1).join(" ")
        this.onResultCallback?.({
          text: this.transcript,
          isFinal: false,
          confidence: 0.8 + Math.random() * 0.2,
        })
        currentWord++
      } else {
        // Final result
        this.onResultCallback?.({
          text: this.transcript,
          isFinal: true,
          confidence: 0.95,
        })
        clearInterval(interval)
      }
    }, 300)
  }

  isCurrentlyListening(): boolean {
    return this.isListening
  }
}

export class TextToSpeechService {
  private isPlaying = false
  private isSupported = typeof window !== "undefined" && "speechSynthesis" in window
  private useServerTTS = true // Try server-side TTS first

  /**
   * Speak text using Coqui TTS server (if available) or Web Speech API (fallback)
   */
  async speak(text: string, options: TextToSpeechOptions = {}): Promise<void> {
    // Try server-side TTS first if enabled
    if (this.useServerTTS && typeof window !== "undefined") {
      try {
        const audioUrl = await this.speakWithServerTTS(text, options)
        if (audioUrl) {
          await this.playAudio(audioUrl)
          return
        }
      } catch (error) {
        console.warn('Server TTS failed, falling back to Web Speech API:', error)
      }
    }

    // Fallback to Web Speech API
    if (!this.isSupported) {
      // Mock: simulate speaking duration
      await this.mockSpeak(text)
      return
    }

    return new Promise((resolve, reject) => {
      // Cancel any ongoing speech
      window.speechSynthesis.cancel()
      
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.rate = options.rate || 1
      utterance.pitch = options.pitch || 1
      utterance.lang = 'en-US'

      utterance.onend = () => {
        this.isPlaying = false
        resolve()
      }

      utterance.onerror = (error) => {
        console.error('Speech synthesis error:', error)
        this.isPlaying = false
        // Don't reject, just resolve so the conversation can continue
        resolve()
      }

      this.isPlaying = true
      try {
      window.speechSynthesis.speak(utterance)
      } catch (error) {
        console.error('Error starting speech synthesis:', error)
        this.isPlaying = false
        resolve()
      }
    })
  }

  /**
   * Generate speech using server-side Coqui TTS
   */
  private async speakWithServerTTS(
    text: string,
    options: TextToSpeechOptions
  ): Promise<string | null> {
    try {
      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text,
          rate: options.rate || 1.0,
          pitch: options.pitch || 1.0,
        }),
      })

      if (response.headers.get('content-type')?.includes('audio')) {
        const audioBlob = await response.blob()
        return URL.createObjectURL(audioBlob)
      }

      return null
    } catch (error) {
      console.error('Server TTS error:', error)
      return null
    }
  }

  /**
   * Play audio from URL
   */
  private playAudio(audioUrl: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const audio = new Audio(audioUrl)
      this.isPlaying = true

      audio.onended = () => {
        this.isPlaying = false
        URL.revokeObjectURL(audioUrl)
        resolve()
      }

      audio.onerror = (error) => {
        this.isPlaying = false
        URL.revokeObjectURL(audioUrl)
        reject(error)
      }

      audio.play().catch(reject)
    })
  }

  /**
   * Stop speaking
   */
  stop(): void {
    if (this.isSupported) {
      window.speechSynthesis.cancel()
    }
    this.isPlaying = false
  }

  /**
   * Mock speaking - simulates duration based on text length
   */
  private mockSpeak(text: string): Promise<void> {
    return new Promise((resolve) => {
      // Estimate: ~150 words per minute = ~0.4 seconds per word
      const durationMs = Math.max(500, text.split(" ").length * 400 + 300)
      this.isPlaying = true

      setTimeout(() => {
        this.isPlaying = false
        resolve()
      }, durationMs)
    })
  }

  getIsPlaying(): boolean {
    return this.isPlaying
  }
}
