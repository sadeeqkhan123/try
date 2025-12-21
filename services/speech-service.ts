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

  /**
   * Start listening for speech
   */
  startListening(onResult: (result: SpeechToTextResult) => void): void {
    this.isListening = true
    this.transcript = ""
    this.onResultCallback = onResult

    // Mock: Simulate speech recognition after a delay
    this.mockListeningSession()
  }

  /**
   * Stop listening
   */
  stopListening(): string {
    this.isListening = false
    return this.transcript
  }

  /**
   * Mock listening - simulates a real STT session with gradual text recognition
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

  /**
   * Speak text using the Web Speech API (or mock if unavailable)
   */
  async speak(text: string, options: TextToSpeechOptions = {}): Promise<void> {
    if (!this.isSupported) {
      // Mock: simulate speaking duration
      await this.mockSpeak(text)
      return
    }

    return new Promise((resolve) => {
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.rate = options.rate || 1
      utterance.pitch = options.pitch || 1

      utterance.onend = () => {
        this.isPlaying = false
        resolve()
      }

      utterance.onerror = () => {
        this.isPlaying = false
        resolve()
      }

      this.isPlaying = true
      window.speechSynthesis.speak(utterance)
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

  isPlaying(): boolean {
    return this.isPlaying
  }
}
