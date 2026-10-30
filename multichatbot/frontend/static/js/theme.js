/**
 * MultiChatbot - Theme & App Preferences Management
 * Ensures strict charcoal, moonlight silver, and signal red styling.
 */

class ThemeManager {
  constructor() {
    this.soundEnabled = localStorage.getItem('multichatbot_sound') === 'true';
    this.speechEnabled = localStorage.getItem('multichatbot_speech') !== 'false';
    this.synth = window.speechSynthesis || null;

    this.initShortcuts();
  }

  initShortcuts() {
    document.addEventListener('keydown', (e) => {
      // Ctrl/Cmd + K: New Chat
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (window.chatManager) {
          window.chatManager.startNewChat();
        }
      }

      // Escape: Close open modals or sidebar drawer
      if (e.key === 'Escape') {
        const activeModal = document.querySelector('.modal-overlay.active');
        if (activeModal) {
          activeModal.classList.remove('active');
        }
        const sidebar = document.getElementById('sidebar');
        const backdrop = document.querySelector('.sidebar-backdrop');
        if (sidebar && sidebar.classList.contains('sidebar-open')) {
          sidebar.classList.remove('sidebar-open');
          if (backdrop) backdrop.classList.remove('active');
        }
      }
    });
  }

  /**
   * Text-to-speech reader for AI responses.
   */
  speakText(text, onStart, onEnd) {
    if (!this.synth || !this.speechEnabled) return;
    this.synth.cancel();

    // Clean markdown before speaking
    const cleanText = text
      .replace(/```[\s\S]*?```/g, 'Code block omitted.')
      .replace(/`([^`]+)`/g, '$1')
      .replace(/[*_#~>\[\]]/g, '')
      .trim();

    if (!cleanText) return;

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = 1.05;
    utterance.pitch = 1.0;

    // Try finding an English natural voice
    const voices = this.synth.getVoices();
    const preferredVoice = voices.find(
      (v) => v.lang.startsWith('en') && (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Samantha'))
    ) || voices.find((v) => v.lang.startsWith('en'));

    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }

    utterance.onstart = () => {
      if (onStart) onStart();
      if (window.motionSystem) window.motionSystem.setOrbState('responding');
    };

    utterance.onend = utterance.onerror = () => {
      if (onEnd) onEnd();
      if (window.motionSystem) window.motionSystem.setOrbState('idle');
    };

    this.synth.speak(utterance);
  }

  stopSpeaking() {
    if (this.synth) {
      this.synth.cancel();
      if (window.motionSystem) window.motionSystem.setOrbState('idle');
    }
  }
}

window.themeManager = new ThemeManager();
