class SpeechService {
  private synthesis: SpeechSynthesis;

  constructor() {
    this.synthesis = window.speechSynthesis;
  }

  /**
   * Speak text in the specified language
   */
  speak(text: string, language: string = 'en-US'): Promise<void> {
    return new Promise((resolve, reject) => {
      // Cancel any ongoing speech
      this.synthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      
      // Map language codes to speech recognition languages
      const languageMap: { [key: string]: string } = {
        en: 'en-US',
        hi: 'hi-IN',
      };

      utterance.lang = languageMap[language] || language;
      utterance.rate = 0.9; // Slightly slower for clarity
      utterance.pitch = 1;
      utterance.volume = 1;

      utterance.onend = () => resolve();
      utterance.onerror = (event) => reject(new Error(event.error));

      this.synthesis.speak(utterance);
    });
  }

  /**
   * Stop speaking
   */
  stop(): void {
    this.synthesis.cancel();
  }

  /**
   * Check if speech synthesis is supported
   */
  isSupported(): boolean {
    return 'speechSynthesis' in window;
  }

  /**
   * Check if currently speaking
   */
  isSpeaking(): boolean {
    return this.synthesis.speaking;
  }
}

export default new SpeechService();