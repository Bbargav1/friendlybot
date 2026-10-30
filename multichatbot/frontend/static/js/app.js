/**
 * MultiChatbot - Main Application Controller
 * Handles view routing (landing screen vs chat view), modal management, settings, and drawer navigation.
 */

document.addEventListener('DOMContentLoaded', () => {
  // Elements
  const landingScreen = document.getElementById('landing-screen');
  const startChatBtn = document.getElementById('start-chat-btn');
  const openLandingBtn = document.getElementById('btn-open-landing');

  // Sidebar & Mobile Drawer
  const sidebar = document.getElementById('sidebar');
  const mobileMenuBtn = document.getElementById('mobile-menu-btn');
  const sidebarCloseBtn = document.getElementById('sidebar-close-btn');
  const sidebarBackdrop = document.querySelector('.sidebar-backdrop');
  const btnNewChat = document.getElementById('btn-new-chat');

  // Modals
  const settingsModal = document.getElementById('settings-modal');
  const btnOpenSettings = document.getElementById('btn-open-settings');
  const btnCloseSettings = document.getElementById('btn-close-settings');
  const btnSaveSettings = document.getElementById('btn-save-settings');

  // Header Actions
  const btnClearChat = document.getElementById('btn-clear-chat');
  const btnExportChat = document.getElementById('btn-export-chat');

  // Memory Elements inside Settings
  const memoryKeyInput = document.getElementById('memory-key-input');
  const memoryValInput = document.getElementById('memory-val-input');
  const btnAddMemory = document.getElementById('btn-add-memory');
  const memoryListContainer = document.getElementById('memory-list-container');

  // --------------------------------------------------------------------------
  // 1. Landing Screen to Chat View Transition
  // --------------------------------------------------------------------------
  const enterChatView = (mode = null) => {
    if (landingScreen) {
      landingScreen.classList.add('hidden');
    }
    if (window.motionSystem) {
      window.motionSystem.stopCanvas();
    }
    if (window.chatManager) {
      if (mode) {
        window.chatManager.setMode(mode);
      }
      if (window.chatManager.chatInput) {
        setTimeout(() => window.chatManager.chatInput.focus(), 150);
      }
    }
  };

  const showLandingView = () => {
    if (landingScreen) {
      landingScreen.classList.remove('hidden');
    }
    if (window.motionSystem) {
      window.motionSystem.startCanvas();
      window.motionSystem.setOrbState('idle');
    }
  };

  if (startChatBtn) {
    startChatBtn.addEventListener('click', () => enterChatView());
  }

  if (openLandingBtn) {
    openLandingBtn.addEventListener('click', () => showLandingView());
  }

  // Landing page mode pills
  document.querySelectorAll('.landing-mode-pill').forEach((pill) => {
    pill.addEventListener('click', () => {
      const mode = pill.getAttribute('data-mode');
      enterChatView(mode);
    });
  });

  // --------------------------------------------------------------------------
  // 2. Mobile Drawer Navigation
  // --------------------------------------------------------------------------
  const openSidebar = () => {
    if (sidebar) sidebar.classList.add('sidebar-open');
    if (sidebarBackdrop) sidebarBackdrop.classList.add('active');
  };

  const closeSidebar = () => {
    if (sidebar) sidebar.classList.remove('sidebar-open');
    if (sidebarBackdrop) sidebarBackdrop.classList.remove('active');
  };

  if (mobileMenuBtn) mobileMenuBtn.addEventListener('click', openSidebar);
  if (sidebarCloseBtn) sidebarCloseBtn.addEventListener('click', closeSidebar);
  if (sidebarBackdrop) sidebarBackdrop.addEventListener('click', closeSidebar);

  // New Chat button
  if (btnNewChat) {
    btnNewChat.addEventListener('click', () => {
      if (window.chatManager) {
        window.chatManager.startNewChat();
      }
      closeSidebar();
    });
  }

  // --------------------------------------------------------------------------
  // 3. Top Header Action Buttons
  // --------------------------------------------------------------------------
  if (btnClearChat) {
    btnClearChat.addEventListener('click', () => {
      if (window.chatManager) window.chatManager.clearCurrentChat();
    });
  }

  if (btnExportChat) {
    btnExportChat.addEventListener('click', () => {
      if (window.chatManager) window.chatManager.exportCurrentChat('markdown');
    });
  }

  // --------------------------------------------------------------------------
  // 4. Settings Modal Management
  // --------------------------------------------------------------------------
  const openSettings = async () => {
    if (settingsModal) {
      settingsModal.classList.add('active');
      loadSettingsData();
    }
  };

  const closeSettings = () => {
    if (settingsModal) settingsModal.classList.remove('active');
  };

  if (btnOpenSettings) btnOpenSettings.addEventListener('click', openSettings);
  if (btnCloseSettings) btnCloseSettings.addEventListener('click', closeSettings);

  const loadSettingsData = async () => {
    try {
      // Load Provider Status
      const statusRes = await fetch('/api/status');
      const statusData = await statusRes.json();
      const ai = statusData.ai || {};

      const providerSelect = document.getElementById('setting-provider-select');
      const geminiModelInput = document.getElementById('setting-gemini-model');
      const openaiModelInput = document.getElementById('setting-openai-model');
      const openaiUrlInput = document.getElementById('setting-openai-url');

      if (providerSelect) providerSelect.value = ai.configured_provider || 'auto';
      if (geminiModelInput) geminiModelInput.value = ai.gemini_model || 'gemini-2.5-flash';
      if (openaiModelInput) openaiModelInput.value = ai.openai_model || 'gpt-4o-mini';

      // Load Memory Items
      loadMemoryItems();
    } catch (e) {
      console.error('Failed to load settings data:', e);
    }
  };

  const loadMemoryItems = async () => {
    if (!memoryListContainer) return;
    try {
      const res = await fetch('/api/memory');
      const memory = await res.json();
      memoryListContainer.innerHTML = '';

      const keys = Object.keys(memory);
      if (keys.length === 0) {
        memoryListContainer.innerHTML = `
          <div style="font-size: 12px; color: var(--text-muted); padding: 8px 0;">
            No saved preferences yet. MultiChatbot automatically remembers details from conversations or you can add them below.
          </div>
        `;
        return;
      }

      keys.forEach((key) => {
        const row = document.createElement('div');
        row.className = 'memory-item-row';
        row.innerHTML = `
          <div>
            <strong style="color: var(--text-primary);">${key}:</strong>
            <span style="color: var(--text-secondary); margin-left: 6px;">${memory[key]}</span>
          </div>
          <button class="memory-delete-btn" title="Delete memory">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
          </button>
        `;

        row.querySelector('.memory-delete-btn').addEventListener('click', async () => {
          await fetch(`/api/memory/${encodeURIComponent(key)}`, { method: 'DELETE' });
          loadMemoryItems();
        });

        memoryListContainer.appendChild(row);
      });
    } catch (e) {
      console.error('Failed to load memory:', e);
    }
  };

  // Add Memory Item
  if (btnAddMemory) {
    btnAddMemory.addEventListener('click', async () => {
      const key = memoryKeyInput.value.trim();
      const val = memoryValInput.value.trim();
      if (!key || !val) {
        alert('Please provide both a label and preference value.');
        return;
      }

      await fetch('/api/memory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, value: val }),
      });

      memoryKeyInput.value = '';
      memoryValInput.value = '';
      loadMemoryItems();
    });
  }

  // Save Settings
  if (btnSaveSettings) {
    btnSaveSettings.addEventListener('click', async () => {
      const provider = document.getElementById('setting-provider-select').value;
      const geminiKey = document.getElementById('setting-gemini-key').value.trim();
      const openaiKey = document.getElementById('setting-openai-key').value.trim();
      const openaiUrl = document.getElementById('setting-openai-url').value.trim();
      const openaiModel = document.getElementById('setting-openai-model').value.trim();

      const payload = { provider };
      if (geminiKey) payload.gemini_key = geminiKey;
      if (openaiKey) payload.openai_key = openaiKey;
      if (openaiUrl) payload.openai_base_url = openaiUrl;
      if (openaiModel) payload.openai_model = openaiModel;

      try {
        const res = await fetch('/api/settings/provider', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (res.ok) {
          alert('Settings updated successfully!');
          closeSettings();
        } else {
          alert(data.error || 'Failed to update settings');
        }
      } catch (err) {
        console.error('Settings save error:', err);
        alert('Failed to save settings.');
      }
    });
  }

  // Close modal when clicking outside dialog
  if (settingsModal) {
    settingsModal.addEventListener('click', (e) => {
      if (e.target === settingsModal) closeSettings();
    });
  }
});
