/**
 * MultiChatbot - Chat Engine & Real-time Stream Client
 * Manages conversation history, SSE streaming, voice input, attachments, and markdown rendering.
 */

class ChatManager {
  constructor() {
    this.currentConversationId = null;
    this.currentMode = 'friend';
    this.isStreaming = false;
    this.abortController = null;

    // Attachments
    this.attachmentText = '';
    this.attachmentImage = null;
    this.attachmentFilename = '';

    // Voice recognition
    this.recognition = null;
    this.isListening = false;
    this.initSpeechRecognition();

    // DOM Elements
    this.messagesContainer = document.getElementById('messages-container');
    this.chatInput = document.getElementById('chat-input');
    this.sendBtn = document.getElementById('send-btn');
    this.stopBtn = document.getElementById('stop-btn');
    this.voiceBtn = document.getElementById('voice-input-btn');
    this.fileInput = document.getElementById('file-upload-input');
    this.attachmentTray = document.getElementById('attachment-preview-tray');
    this.conversationsList = document.getElementById('conversations-list-container');
    this.currentChatTitleEl = document.getElementById('current-chat-title');
    this.activeModePill = document.getElementById('active-mode-pill');
    this.modeSelector = document.getElementById('sidebar-mode-selector');
    this.scrollBottomBtn = document.getElementById('scroll-bottom-btn');

    this.bindEvents();
    this.loadConversations();
  }

  // --------------------------------------------------------------------------
  // Event Bindings
  // --------------------------------------------------------------------------
  bindEvents() {
    // Send button click
    if (this.sendBtn) {
      this.sendBtn.addEventListener('click', () => this.sendMessage());
    }

    // Stop streaming button
    if (this.stopBtn) {
      this.stopBtn.addEventListener('click', () => this.stopGenerating());
    }

    // Textarea auto-resize and Enter key handling
    if (this.chatInput) {
      this.chatInput.addEventListener('input', () => {
        this.autoResizeTextarea();
        this.updateSendButtonState();
      });

      this.chatInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          if (this.chatInput.value.trim() || this.attachmentImage || this.attachmentText) {
            this.sendMessage();
          }
        }
      });
    }

    // Voice input
    if (this.voiceBtn) {
      this.voiceBtn.addEventListener('click', () => this.toggleVoiceInput());
    }

    // File upload
    if (this.fileInput) {
      this.fileInput.addEventListener('change', (e) => this.handleFileUpload(e));
    }

    // Mode Selector change
    if (this.modeSelector) {
      this.modeSelector.addEventListener('change', (e) => {
        this.setMode(e.target.value);
      });
    }

    // Scroll to bottom button
    if (this.messagesContainer && this.scrollBottomBtn) {
      this.messagesContainer.addEventListener('scroll', () => {
        const distFromBottom =
          this.messagesContainer.scrollHeight -
          this.messagesContainer.scrollTop -
          this.messagesContainer.clientHeight;
        if (distFromBottom > 180) {
          this.scrollBottomBtn.style.display = 'flex';
        } else {
          this.scrollBottomBtn.style.display = 'none';
        }
      });

      this.scrollBottomBtn.addEventListener('click', () => {
        this.scrollToBottom(true);
      });
    }

    // Search box
    const searchInput = document.getElementById('sidebar-search-input');
    if (searchInput) {
      let debounceTimer = null;
      searchInput.addEventListener('input', (e) => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          this.loadConversations(e.target.value);
        }, 250);
      });
    }
  }

  autoResizeTextarea() {
    if (!this.chatInput) return;
    this.chatInput.style.height = 'auto';
    this.chatInput.style.height = Math.min(this.chatInput.scrollHeight, 180) + 'px';
  }

  updateSendButtonState() {
    const hasText = this.chatInput && this.chatInput.value.trim().length > 0;
    const hasAttachment = Boolean(this.attachmentText || this.attachmentImage);
    const canSend = (hasText || hasAttachment) && !this.isStreaming;

    if (this.sendBtn) {
      if (canSend) {
        this.sendBtn.classList.add('active');
        this.sendBtn.disabled = false;
      } else {
        this.sendBtn.classList.remove('active');
        this.sendBtn.disabled = true;
      }
    }
  }

  setMode(mode) {
    this.currentMode = mode || 'friend';
    if (this.activeModePill) {
      this.activeModePill.textContent = `${this.currentMode} Mode`;
    }
    if (this.modeSelector) {
      this.modeSelector.value = this.currentMode;
    }
    // If empty conversation, update welcome suggestions
    const welcomeContainer = document.getElementById('empty-chat-welcome');
    if (welcomeContainer) {
      this.renderModeSuggestions(welcomeContainer);
    }
  }

  // --------------------------------------------------------------------------
  // Speech Recognition (Web Speech API)
  // --------------------------------------------------------------------------
  initSpeechRecognition() {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition || null;
    if (!SpeechRecognition) return;

    this.recognition = new SpeechRecognition();
    this.recognition.continuous = false;
    this.recognition.interimResults = true;
    this.recognition.lang = 'en-US';

    this.recognition.onstart = () => {
      this.isListening = true;
      if (this.voiceBtn) this.voiceBtn.classList.add('voice-recording-active');
      if (window.motionSystem) window.motionSystem.setOrbState('listening');
    };

    this.recognition.onresult = (event) => {
      let transcript = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }
      if (this.chatInput) {
        this.chatInput.value = transcript;
        this.autoResizeTextarea();
        this.updateSendButtonState();
      }
    };

    this.recognition.onerror = this.recognition.onend = () => {
      this.isListening = false;
      if (this.voiceBtn) this.voiceBtn.classList.remove('voice-recording-active');
      if (window.motionSystem && !this.isStreaming) {
        window.motionSystem.setOrbState('idle');
      }
    };
  }

  toggleVoiceInput() {
    if (!this.recognition) {
      alert('Speech recognition is not supported in this browser. Please use Chrome or Edge.');
      return;
    }
    if (this.isListening) {
      this.recognition.stop();
    } else {
      try {
        this.recognition.start();
      } catch (e) {
        console.error('Speech recognition error:', e);
      }
    }
  }

  // --------------------------------------------------------------------------
  // File Upload & Attachment Handling
  // --------------------------------------------------------------------------
  async handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Failed to process file');
        return;
      }

      this.attachmentFilename = data.filename;
      if (data.type === 'text') {
        this.attachmentText = data.text;
        this.attachmentImage = null;
      } else if (data.type === 'image') {
        this.attachmentImage = data.image_data;
        this.attachmentText = '';
      }

      this.renderAttachmentTray();
      this.updateSendButtonState();
    } catch (err) {
      console.error('File upload error:', err);
      alert('Failed to upload file.');
    } finally {
      if (this.fileInput) this.fileInput.value = '';
    }
  }

  renderAttachmentTray() {
    if (!this.attachmentTray) return;
    this.attachmentTray.innerHTML = '';

    if (!this.attachmentFilename) return;

    const chip = document.createElement('div');
    chip.className = 'attachment-chip';
    chip.innerHTML = `
      <span>📎 ${this.escapeHtml(this.attachmentFilename)}</span>
      <button class="attachment-chip-remove" title="Remove attachment">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
      </button>
    `;

    chip.querySelector('.attachment-chip-remove').addEventListener('click', () => {
      this.clearAttachment();
    });

    this.attachmentTray.appendChild(chip);
  }

  clearAttachment() {
    this.attachmentText = '';
    this.attachmentImage = null;
    this.attachmentFilename = '';
    if (this.attachmentTray) this.attachmentTray.innerHTML = '';
    this.updateSendButtonState();
  }

  // --------------------------------------------------------------------------
  // Message Sending & SSE Streaming
  // --------------------------------------------------------------------------
  async sendMessage(customText = null) {
    if (this.isStreaming) return;

    const text = customText !== null ? customText : (this.chatInput ? this.chatInput.value.trim() : '');
    const currentAttachmentText = this.attachmentText;
    const currentAttachmentImage = this.attachmentImage;

    if (!text && !currentAttachmentImage && !currentAttachmentText) return;

    // Reset input fields
    if (this.chatInput) {
      this.chatInput.value = '';
      this.autoResizeTextarea();
    }
    this.clearAttachment();
    this.updateSendButtonState();

    // Remove welcome screen if present
    const welcome = document.getElementById('empty-chat-welcome');
    if (welcome) welcome.remove();

    // Append User Message to UI
    this.appendUserMessage(text, currentAttachmentImage);
    this.scrollToBottom(true);

    // Enter AI Thinking State
    this.setStreamingUI(true);
    if (window.motionSystem) window.motionSystem.setOrbState('thinking');

    // Append Typing Indicator
    const typingIndicator = this.appendTypingIndicator();
    this.scrollToBottom(true);

    // Prepare streaming state
    this.abortController = new AbortController();

    try {
      const response = await fetch('/api/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversation_id: this.currentConversationId,
          message: text,
          mode: this.currentMode,
          attachment_text: currentAttachmentText,
          image_base64: currentAttachmentImage,
        }),
        signal: this.abortController.signal,
      });

      if (!response.ok) {
        throw new Error(`Server returned HTTP ${response.status}`);
      }

      // Remove typing indicator and create streaming AI bubble
      if (typingIndicator) typingIndicator.remove();
      const aiBubble = this.appendAIMessagePlaceholder();
      const contentEl = aiBubble.querySelector('.message-content');

      if (window.motionSystem) window.motionSystem.setOrbState('responding');

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';
      let fullResponseText = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop(); // keep last incomplete chunk

        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith('data: ')) {
            const jsonStr = trimmed.substring(6);
            try {
              const eventData = JSON.parse(jsonStr);

              if (eventData.type === 'start') {
                if (eventData.conversation_id && !this.currentConversationId) {
                  this.currentConversationId = eventData.conversation_id;
                  this.loadConversations();
                }
              } else if (eventData.type === 'chunk') {
                fullResponseText += eventData.text;
                contentEl.innerHTML = this.renderMarkdown(fullResponseText);
                this.highlightCodeBlocks(contentEl);
                this.scrollToBottom();
              } else if (eventData.type === 'done') {
                if (eventData.conversation_id) {
                  this.currentConversationId = eventData.conversation_id;
                  this.loadConversations();
                }
              } else if (eventData.type === 'error') {
                contentEl.innerHTML += `<div style="color: #F04452; margin-top: 8px;">⚠️ ${this.escapeHtml(eventData.error)}</div>`;
                if (window.motionSystem) window.motionSystem.setOrbState('error');
              }
            } catch (jsonErr) {
              console.error('Error parsing SSE event:', jsonErr);
            }
          }
        }
      }

      // Finalize AI message UI
      this.attachMessageActions(aiBubble, fullResponseText);
      if (window.motionSystem) window.motionSystem.setOrbState('idle');
    } catch (err) {
      if (err.name === 'AbortError') {
        console.log('Stream aborted by user.');
      } else {
        console.error('Chat error:', err);
        if (typingIndicator) typingIndicator.remove();
        this.appendErrorMessage('Unable to reach MultiChatbot service. Please check your connection or API keys in Settings.');
        if (window.motionSystem) window.motionSystem.setOrbState('error');
      }
    } finally {
      this.setStreamingUI(false);
      if (window.motionSystem && !this.isStreaming) {
        setTimeout(() => window.motionSystem.setOrbState('idle'), 400);
      }
    }
  }

  stopGenerating() {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
    this.setStreamingUI(false);
    if (window.motionSystem) window.motionSystem.setOrbState('idle');
  }

  setStreamingUI(streaming) {
    this.isStreaming = streaming;
    if (this.stopBtn && this.sendBtn) {
      if (streaming) {
        this.sendBtn.style.display = 'none';
        this.stopBtn.style.display = 'flex';
      } else {
        this.stopBtn.style.display = 'none';
        this.sendBtn.style.display = 'flex';
      }
    }
    this.updateSendButtonState();
  }

  // --------------------------------------------------------------------------
  // DOM Message Creation & Rendering
  // --------------------------------------------------------------------------
  appendUserMessage(text, imageSrc = null) {
    const row = document.createElement('div');
    row.className = 'message-row user msg-animate-in';

    let mediaHtml = '';
    if (imageSrc) {
      mediaHtml = `<div style="margin-bottom: 8px;"><img src="${imageSrc}" style="max-width: 240px; max-height: 200px; border-radius: 8px; border: 1px solid var(--border-color); object-fit: cover;" alt="Upload"/></div>`;
    }

    row.innerHTML = `
      <div class="message-bubble">
        <div class="message-content">${mediaHtml}${this.escapeHtml(text)}</div>
        <div class="message-meta">
          <span>${this.formatTime(new Date())}</span>
        </div>
      </div>
      <div class="message-avatar user-avatar" title="You">You</div>
    `;

    this.messagesContainer.appendChild(row);
    return row;
  }

  appendAIMessagePlaceholder() {
    const row = document.createElement('div');
    row.className = 'message-row ai msg-animate-in';
    row.innerHTML = `
      <div class="message-avatar ai-avatar" title="MultiChatbot">
        <div class="ai-avatar-core"></div>
      </div>
      <div class="message-bubble">
        <div class="message-content"></div>
        <div class="ai-actions-row"></div>
        <div class="message-meta">
          <span>MultiChatbot • ${this.formatTime(new Date())}</span>
        </div>
      </div>
    `;

    this.messagesContainer.appendChild(row);
    return row;
  }

  appendTypingIndicator() {
    const row = document.createElement('div');
    row.className = 'message-row ai typing-indicator-row msg-animate-in';
    row.id = 'active-typing-indicator';
    row.innerHTML = `
      <div class="message-avatar ai-avatar">
        <div class="ai-avatar-core"></div>
      </div>
      <div class="typing-bubble">
        <span class="typing-dot"></span>
        <span class="typing-dot"></span>
        <span class="typing-dot"></span>
        <span class="typing-indicator-pulse"></span>
      </div>
    `;
    this.messagesContainer.appendChild(row);
    return row;
  }

  appendErrorMessage(text) {
    const row = document.createElement('div');
    row.className = 'message-row ai msg-animate-in';
    row.innerHTML = `
      <div class="message-avatar ai-avatar" style="border-color: #F04452;">
        <div class="ai-avatar-core" style="background: #F04452;"></div>
      </div>
      <div class="message-bubble">
        <div class="message-content" style="color: #FF5A66; border: 1px solid rgba(240, 68, 82, 0.4); padding: 12px; border-radius: 8px; background: rgba(240, 68, 82, 0.08);">
          <strong>⚠️ Notice:</strong> ${this.escapeHtml(text)}
        </div>
      </div>
    `;
    this.messagesContainer.appendChild(row);
    this.scrollToBottom(true);
  }

  attachMessageActions(rowEl, fullText) {
    const actionsRow = rowEl.querySelector('.ai-actions-row');
    if (!actionsRow) return;

    actionsRow.innerHTML = `
      <button class="action-pill-btn btn-copy-msg" title="Copy message">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
        <span>Copy</span>
      </button>
      <button class="action-pill-btn btn-speak-msg" title="Listen to response">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>
        <span>Speak</span>
      </button>
    `;

    // Copy action
    const copyBtn = actionsRow.querySelector('.btn-copy-msg');
    copyBtn.addEventListener('click', () => {
      navigator.clipboard.writeText(fullText).then(() => {
        copyBtn.querySelector('span').textContent = 'Copied!';
        setTimeout(() => (copyBtn.querySelector('span').textContent = 'Copy'), 2000);
      });
    });

    // Speak action
    const speakBtn = actionsRow.querySelector('.btn-speak-msg');
    speakBtn.addEventListener('click', () => {
      if (window.themeManager) {
        window.themeManager.speakText(
          fullText,
          () => (speakBtn.querySelector('span').textContent = 'Playing...'),
          () => (speakBtn.querySelector('span').textContent = 'Speak')
        );
      }
    });
  }

  renderMarkdown(text) {
    if (typeof marked !== 'undefined') {
      const rawHtml = marked.parse(text);
      if (typeof DOMPurify !== 'undefined') {
        return DOMPurify.sanitize(rawHtml);
      }
      return rawHtml;
    }
    // Fallback if marked is loading
    return this.escapeHtml(text).replace(/\n/g, '<br/>');
  }

  highlightCodeBlocks(container) {
    const codeBlocks = container.querySelectorAll('pre code');
    codeBlocks.forEach((codeEl) => {
      const preEl = codeEl.parentElement;
      if (!preEl.parentElement.classList.contains('code-block-wrapper')) {
        // Wrap with custom header and copy button
        const wrapper = document.createElement('div');
        wrapper.className = 'code-block-wrapper';

        const lang = (codeEl.className.match(/language-(\w+)/) || [, 'code'])[1];
        const header = document.createElement('div');
        header.className = 'code-header';
        header.innerHTML = `
          <span>${lang}</span>
          <button class="btn-copy-code" title="Copy code">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
            <span>Copy</span>
          </button>
        `;

        const copyBtn = header.querySelector('.btn-copy-code');
        copyBtn.addEventListener('click', () => {
          navigator.clipboard.writeText(codeEl.innerText).then(() => {
            copyBtn.querySelector('span').textContent = 'Copied!';
            setTimeout(() => (copyBtn.querySelector('span').textContent = 'Copy'), 2000);
          });
        });

        preEl.parentNode.insertBefore(wrapper, preEl);
        wrapper.appendChild(header);
        wrapper.appendChild(preEl);
      }

      if (typeof Prism !== 'undefined') {
        Prism.highlightElement(codeEl);
      }
    });
  }

  scrollToBottom(force = false) {
    if (!this.messagesContainer) return;
    if (force) {
      this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
    } else {
      const dist =
        this.messagesContainer.scrollHeight -
        this.messagesContainer.scrollTop -
        this.messagesContainer.clientHeight;
      if (dist < 180) {
        this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
      }
    }
  }

  // --------------------------------------------------------------------------
  // Conversation History & Management
  // --------------------------------------------------------------------------
  async loadConversations(searchQuery = '') {
    try {
      let url = '/api/conversations';
      if (searchQuery) url += `?search=${encodeURIComponent(searchQuery)}`;
      const res = await fetch(url);
      const data = await res.json();
      this.renderSidebarConversations(data);
    } catch (e) {
      console.error('Failed to load conversations:', e);
    }
  }

  renderSidebarConversations(conversations) {
    if (!this.conversationsList) return;
    this.conversationsList.innerHTML = '';

    if (!conversations || conversations.length === 0) {
      this.conversationsList.innerHTML = `
        <div style="padding: 16px 8px; text-align: center; color: var(--text-muted); font-size: 12.5px;">
          No conversations yet. Start a chat!
        </div>
      `;
      return;
    }

    // Split pinned/saved and recent
    const pinned = conversations.filter((c) => c.is_pinned || c.is_saved);
    const recent = conversations.filter((c) => !c.is_pinned && !c.is_saved);

    if (pinned.length > 0) {
      const groupEl = document.createElement('div');
      groupEl.innerHTML = `<div class="chat-group-title">★ Starred & Pinned</div>`;
      pinned.forEach((c) => groupEl.appendChild(this.createConvItemEl(c)));
      this.conversationsList.appendChild(groupEl);
    }

    if (recent.length > 0) {
      const groupEl = document.createElement('div');
      groupEl.innerHTML = `<div class="chat-group-title">Recent Chats</div>`;
      recent.forEach((c) => groupEl.appendChild(this.createConvItemEl(c)));
      this.conversationsList.appendChild(groupEl);
    }
  }

  createConvItemEl(conv) {
    const item = document.createElement('div');
    item.className = `conversation-item ${conv.id === this.currentConversationId ? 'active' : ''}`;
    item.dataset.id = conv.id;

    const isStarred = conv.is_saved || conv.is_pinned;

    item.innerHTML = `
      <div class="conv-item-left">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
        <span class="conv-title">${this.escapeHtml(conv.title)}</span>
      </div>
      <div class="conv-item-actions">
        <button class="conv-action-btn btn-star ${isStarred ? 'starred' : ''}" title="${isStarred ? 'Unstar' : 'Star'}">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="${isStarred ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
        </button>
        <button class="conv-action-btn btn-delete" title="Delete">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
        </button>
      </div>
    `;

    // Click item to load conversation
    item.querySelector('.conv-item-left').addEventListener('click', () => {
      this.loadConversation(conv.id);
      // Close mobile drawer if open
      const sidebar = document.getElementById('sidebar');
      const backdrop = document.querySelector('.sidebar-backdrop');
      if (sidebar) sidebar.classList.remove('sidebar-open');
      if (backdrop) backdrop.classList.remove('active');
    });

    // Star toggle
    item.querySelector('.btn-star').addEventListener('click', async (e) => {
      e.stopPropagation();
      await fetch(`/api/conversations/${conv.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_saved: !conv.is_saved }),
      });
      this.loadConversations();
    });

    // Delete
    item.querySelector('.btn-delete').addEventListener('click', async (e) => {
      e.stopPropagation();
      if (confirm(`Delete "${conv.title}"?`)) {
        await fetch(`/api/conversations/${conv.id}`, { method: 'DELETE' });
        if (this.currentConversationId === conv.id) {
          this.startNewChat();
        } else {
          this.loadConversations();
        }
      }
    });

    return item;
  }

  async loadConversation(conversationId) {
    try {
      const res = await fetch(`/api/conversations/${conversationId}`);
      if (!res.ok) throw new Error('Conversation not found');
      const data = await res.json();

      this.currentConversationId = data.id;
      this.setMode(data.mode);

      if (this.currentChatTitleEl) {
        this.currentChatTitleEl.textContent = data.title;
      }

      // Render messages
      this.messagesContainer.innerHTML = '';
      if (!data.messages || data.messages.length === 0) {
        this.renderWelcomeScreen();
      } else {
        data.messages.forEach((msg) => {
          if (msg.sender === 'user') {
            this.appendUserMessage(msg.content);
          } else {
            const row = this.appendAIMessagePlaceholder();
            const contentEl = row.querySelector('.message-content');
            contentEl.innerHTML = this.renderMarkdown(msg.content);
            this.highlightCodeBlocks(contentEl);
            this.attachMessageActions(row, msg.content);
          }
        });
      }

      this.scrollToBottom(true);
      this.loadConversations();
    } catch (e) {
      console.error('Error loading conversation:', e);
    }
  }

  startNewChat() {
    this.currentConversationId = null;
    if (this.currentChatTitleEl) {
      this.currentChatTitleEl.textContent = 'New Conversation';
    }
    this.messagesContainer.innerHTML = '';
    this.renderWelcomeScreen();
    this.loadConversations();
    if (this.chatInput) this.chatInput.focus();
  }

  async clearCurrentChat() {
    if (!this.currentConversationId) {
      this.messagesContainer.innerHTML = '';
      this.renderWelcomeScreen();
      return;
    }
    if (confirm('Clear all messages from this conversation?')) {
      await fetch(`/api/conversations/${this.currentConversationId}/clear`, {
        method: 'POST',
      });
      this.messagesContainer.innerHTML = '';
      this.renderWelcomeScreen();
      this.loadConversations();
    }
  }

  exportCurrentChat(format = 'markdown') {
    if (!this.currentConversationId) {
      alert('Start a conversation first before exporting.');
      return;
    }
    window.open(`/api/conversations/${this.currentConversationId}/export?format=${format}`, '_blank');
  }

  // --------------------------------------------------------------------------
  // Welcome State & Quick Mode Suggestion Cards
  // --------------------------------------------------------------------------
  renderWelcomeScreen() {
    const welcome = document.createElement('div');
    welcome.className = 'empty-chat-welcome';
    welcome.id = 'empty-chat-welcome';

    this.renderModeSuggestions(welcome);
    this.messagesContainer.appendChild(welcome);
  }

  renderModeSuggestions(container) {
    const suggestionsByMode = {
      friend: [
        { prompt: "Hey bro, what's up?", sub: "Casual everyday conversation" },
        { prompt: "Can you help me build a website?", sub: "Step-by-step guidance & tech stack" },
        { prompt: "I want to build an AI project.", sub: "Brainstorm high-impact AI systems" },
        { prompt: "Tell me a mind-bending fact about space.", sub: "Fascinating science & exploration" },
      ],
      study: [
        { prompt: "Explain the Fourier Transform like I'm 10.", sub: "The Feynman Technique in action" },
        { prompt: "Give me 3 practice quiz questions on neural networks.", sub: "Active recall & memory check" },
        { prompt: "How does asynchronous programming work?", sub: "Event loops, promises, and async/await" },
        { prompt: "Help me create an exam study schedule for finals.", sub: "Spaced repetition framework" },
      ],
      coding: [
        { prompt: "Write a high-performance LRU Cache in Python.", sub: "Production-ready $O(1)$ architecture" },
        { prompt: "Debug this async JavaScript race condition.", sub: "Root-cause diagnosis & solution" },
        { prompt: "Design a RESTful API for a real-time messaging system.", sub: "Database schema & endpoints" },
        { prompt: "Explain the SOLID principles with clean examples.", sub: "Object-oriented best practices" },
      ],
      career: [
        { prompt: "Polish my resume bullet point using Google's XYZ formula.", sub: "Quantified achievement impact" },
        { prompt: "Conduct a mock behavioral interview for a Senior Engineer role.", sub: "STAR method evaluation" },
        { prompt: "Write an email negotiating my job offer salary.", sub: "Tactful, confident script" },
        { prompt: "How should I structure my tech portfolio to stand out?", sub: "Hiring manager perspective" },
      ],
      creative: [
        { prompt: "Brainstorm 4 high-concept sci-fi story premises.", sub: "Unique hooks and world-building" },
        { prompt: "Write a moody noir monologue about a rain-slicked city.", sub: "Atmospheric sensory prose" },
        { prompt: "Create 3 punchy marketing taglines for a futuristic watch.", sub: "Brand strategy & copy" },
        { prompt: "Outline a fantasy novel magic system based on sound.", sub: "Rules, limitations, and costs" },
      ],
      research: [
        { prompt: "Compare Transformer attention mechanisms vs SSMs / Mamba.", sub: "Comprehensive architectural matrix" },
        { prompt: "Synthesize the current state of Quantum Computing error correction.", sub: "Evidence-based research brief" },
        { prompt: "Analyze the trade-offs of microservices vs modular monoliths.", sub: "Scalability and operational costs" },
        { prompt: "What are the latest breakthroughs in fusion energy?", sub: "Objective progress evaluation" },
      ],
      life: [
        { prompt: "Design a focused 3-block daily schedule for maximum productivity.", sub: "Time-blocking blueprint" },
        { prompt: "Create a 4-day minimalist travel packing list for Japan.", sub: "Ultralight, essential gear" },
        { prompt: "Help me decide between two tough choices with a framework.", sub: "Eisenhower & 10-10-10 matrix" },
        { prompt: "Build a sustainable morning routine that takes 25 minutes.", sub: "Low friction habit anchoring" },
      ],
    };

    const modeList = suggestionsByMode[this.currentMode] || suggestionsByMode['friend'];

    container.innerHTML = `
      <div class="welcome-orb-mini">
        <div class="mini-orb" style="width: 54px; height: 54px;"></div>
      </div>
      <h2 class="welcome-title">Meet Your New AI Friend.</h2>
      <p class="welcome-desc">Ask anything. Share your thoughts. Learn something new. I'm here to help.</p>
      <div class="prompt-suggestions-grid">
        ${modeList
          .map(
            (item) => `
          <div class="suggestion-card" data-prompt="${this.escapeHtml(item.prompt)}">
            <span class="suggestion-prompt">${this.escapeHtml(item.prompt)}</span>
            <span class="suggestion-sub">${this.escapeHtml(item.sub)}</span>
          </div>
        `
          )
          .join('')}
      </div>
    `;

    // Clicking prompt card immediately executes prompt
    container.querySelectorAll('.suggestion-card').forEach((card) => {
      card.addEventListener('click', () => {
        const prompt = card.getAttribute('data-prompt');
        this.sendMessage(prompt);
      });
    });
  }

  // --------------------------------------------------------------------------
  // Utility Helpers
  // --------------------------------------------------------------------------
  escapeHtml(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  formatTime(date) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
}

window.chatManager = new ChatManager();
