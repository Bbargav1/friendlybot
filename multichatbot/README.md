# MULTICHATBOT
### Your AI Friend — One Chat. Endless Possibilities.

> *"Your AI Friend. Always Within Reach."*

MultiChatbot is a production-ready, full-stack AI companion web application engineered with a futuristic, confident brand aesthetic. Built using a strict, elegant tripartite design palette of **Charcoal Gray**, **Moonlight Silver**, and **Signal Red**, MultiChatbot delivers the feel of a premium technology product combined with the warmth, intelligence, and empathy of an AI companion.

MultiChatbot is connected to real AI language models (Google Gemini 2.5 Flash, OpenAI GPT-4o-mini, Groq, OpenRouter, or local LLMs) with Server-Sent Events (SSE) streaming, SQLite-backed persistent conversation memory, audio speech synthesis, voice input recognition, and seven specialized chat modes.

---

## 🎨 Color System & Aesthetic Identity

MultiChatbot strictly follows a carefully curated three-tone design system:

| Swatch | Color Name | Hex Code | Role in Interface |
| :---: | :--- | :--- | :--- |
| ⬛ | **Charcoal Gray** (Main) | `#242629` | Primary viewport background & foundational dark canvas |
| ⬛ | **Charcoal Gray** (Secondary) | `#2D3035` | Card surfaces, modals, and panel backgrounds |
| ⬛ | **Charcoal Gray** (Elevated) | `#353940` | User message bubbles and elevated interactive containers |
| ⬛ | **Charcoal Gray** (Sidebar) | `#1D1F22` | Navigation drawer and sidebar background |
| ⬜ | **Moonlight Silver** (Primary) | `#E6E8EB` | Clean, accessible typography and high-contrast text |
| ⬜ | **Moonlight Silver** (Secondary)| `#B8BDC5` | Subtitles, secondary copy, and metadata |
| ⬜ | **Moonlight Silver** (Borders) | `#565B63` | Subtle structural dividers and hairline borders |
| 🔴 | **Signal Red** (Accent) | `#F04452` | Primary interactive elements, send actions, active states |
| 🔴 | **Signal Red** (Hover) | `#FF5A66` | Glowing hover highlights, orbital pulse accents |
| 🔴 | **Signal Red** (Deep) | `#C92F3D` | Stop button, subtle background gradients, active indicator |
| 🔴 | **Signal Red** (Glow) | `rgba(240, 68, 82, 0.22)` | Ambient neon aura and focus drop shadows |

### Brand Gradient
```css
background: linear-gradient(
    135deg,
    #242629 0%,
    #2D3035 65%,
    #3A252A 100%
);
```

---

## ✨ Key Features

### 1. 3D Animated AI Orb
- Central layered interactive core featuring dark charcoal inner core, Moonlight Silver orbital rings, and glowing Signal Red center.
- **5 Dynamic Interaction States**:
  - `Idle`: Gentle breathing animation with subtle ambient red aura.
  - `Listening`: Expands and pulses rhythmically during speech recognition.
  - `Thinking`: Orbital rings accelerate rotation on multiple axes as the backend processes the request.
  - `Responding`: Silver particles radiate outward while the core pulses in sync with real-time text streaming.
  - `Error`: Subtle red warning pulse indicating network or quota interruptions.

### 2. Real-Time Streaming & Full AI Integration
- **Server-Sent Events (SSE)** endpoint (`/api/chat/stream`) yielding word-by-word streaming with zero UI stutter.
- **Multi-Provider AI Support**:
  - **Google Gemini**: Direct integration with Gemini 2.5 Flash / Pro via API key.
  - **OpenAI & Compatible Endpoints**: Supports OpenAI, Groq (Llama 3), OpenRouter, DeepSeek, or local Ollama servers.
  - **Built-in Intelligent Companion Engine**: High-fidelity conversational fallback engine that runs immediately out-of-the-box with zero keys required for instant onboarding!

### 3. Seven Purpose-Built Chat Modes
Each mode features tailored system prompts and dedicated suggestions:
- 💬 **Friend Mode**: Empathetic, witty, conversational everyday companion.
- 📚 **Study Mode**: Educational tutor applying the Feynman Technique, analogies, and quizzes.
- 💻 **Coding Mode**: Senior software architect pair programmer delivering clean, typed code with complexity analysis.
- 🎯 **Career Mode**: Executive coach specializing in Google XYZ resume bullets, STAR interview drills, and salary negotiation.
- ✨ **Creative Mode**: Imaginative partner for world-building, narrative fiction, and lateral ideation.
- 🔬 **Research Mode**: Systematic investigator delivering structured comparative matrices and evidence-based breakdowns.
- 📋 **Life Assistant Mode**: Productivity strategist for time-blocking, habit loops, packing checklists, and decision frameworks.

### 4. Comprehensive Conversation Memory & Management
- Persistent SQLite database managed through SQLAlchemy.
- Create, rename, delete, search, star/pin, and clear conversation threads.
- Export chats instantly to **Markdown** or **JSON**.
- User memory key-value preference engine enabling the AI friend to remember personal preferences across chats.

### 5. Multimodal Capabilities
- **Voice Input (STT)**: Built-in Web Speech API transcription with real-time microphone pulsation.
- **Voice Output (TTS)**: Reads AI responses aloud with natural speech synthesis while animating the orb.
- **File & Document Upload**: Upload `.py`, `.js`, `.txt`, `.md`, `.json`, `.csv`, or images with live preview chips.
- **Markdown & Code Highlighting**: Prism.js dark syntax highlighting with per-block "Copy Code" buttons and DOMPurify sanitization.

---

## 🛠️ Technology Stack

- **Backend**: Python 3.10+ / Flask / Flask-CORS / Flask-SQLAlchemy
- **Database**: SQLite 3 with SQLAlchemy ORM
- **AI Engine**: Google Gemini API / OpenAI API / Built-in Inference Engine
- **Frontend**: Semantic HTML5, Vanilla CSS3 (Custom 3D Transforms, Keyframe Animations, CSS Grid/Flexbox), Vanilla ES6+ JavaScript
- **Security**: DOMPurify XSS Sanitization, Werkzeug File Sanitization, Security Headers (`nosniff`, `DENY`)
- **Testing**: Pytest

---

## 📁 Project Architecture

```
multichatbot/
│
├── app.py                      # Flask main entrypoint
├── config.py                   # Environment-driven configuration
├── requirements.txt            # Python dependencies
├── .env.example                # Template for environment secrets
├── .gitignore                  # Git ignore rules
├── README.md                   # Complete documentation
│
├── backend/
│   ├── __init__.py             # Application factory (create_app)
│   ├── routes.py               # REST & SSE streaming API endpoints
│   ├── ai_service.py           # Gemini, OpenAI & Built-in AI driver
│   ├── prompts.py              # System prompts for all 7 chat modes
│   ├── models.py               # SQLAlchemy models (Conversation, Message, UserMemory)
│   ├── conversation_service.py # Database business logic & memory helpers
│   └── extensions.py           # SQLAlchemy & CORS extensions
│
├── frontend/
│   ├── templates/
│   │   └── index.html          # Main single-page interface
│   │
│   └── static/
│       ├── css/
│       │   ├── style.css       # Charcoal/Silver/Red design system & UI
│       │   ├── animations.css  # 3D Orb keyframes & motion states
│       │   └── responsive.css  # Mobile drawer & adaptive breakpoints
│       │
│       ├── js/
│       │   ├── app.js          # Navigation, modals & drawer controls
│       │   ├── chat.js         # SSE client, message rendering, audio & uploads
│       │   ├── animations.js   # Particle canvas & AI Orb state manager
│       │   └── theme.js        # Text-to-speech & keyboard shortcuts
│       │
│       └── images/             # Static brand assets
│
└── tests/
    ├── __init__.py
    ├── test_chat.py            # API & streaming integration tests
    └── test_conversations.py   # Database & service unit tests
```

---

## 🚀 Getting Started

### 1. Clone the Repository
```bash
git clone https://github.com/yourusername/multichatbot.git
cd multichatbot
```

### 2. Create and Activate a Virtual Environment
```bash
# On macOS / Linux:
python3 -m venv venv
source venv/bin/activate

# On Windows:
python -m venv venv
.\venv\Scripts\activate
```

### 3. Install Dependencies
```bash
pip install -r requirements.txt
```

### 4. Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Edit `.env` to configure your keys (optional — MultiChatbot includes a built-in companion engine out-of-the-box):
```env
FLASK_ENV=development
SECRET_KEY=your-super-secret-production-key
PORT=5000

# Optional: Add Google Gemini API Key
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-2.5-flash

# Optional: Add OpenAI or Groq Key
OPENAI_API_KEY=
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_MODEL=gpt-4o-mini
```

### 5. Launch the Application
```bash
python app.py
```
Open your browser and navigate to:
**`http://127.0.0.1:5000`**

---

## 🧪 Running the Test Suite

MultiChatbot includes comprehensive unit and integration tests covering API endpoints, streaming responses, mode switching, conversation CRUD, and security sanitization:

```bash
pytest -v
```

Expected result:
```
tests/test_chat.py::test_index_page PASSED
tests/test_chat.py::test_api_status PASSED
tests/test_chat.py::test_standard_chat_endpoint PASSED
tests/test_chat.py::test_streaming_chat_endpoint PASSED
tests/test_chat.py::test_chat_modes PASSED
tests/test_chat.py::test_empty_message_validation PASSED
tests/test_chat.py::test_file_upload PASSED
tests/test_conversations.py::test_create_and_get_conversation PASSED
tests/test_conversations.py::test_add_messages_and_history PASSED
tests/test_conversations.py::test_rename_and_star_conversation PASSED
tests/test_conversations.py::test_conversation_search PASSED
tests/test_conversations.py::test_export_conversation PASSED
tests/test_conversations.py::test_delete_and_clear_conversation PASSED
tests/test_conversations.py::test_user_memory_service PASSED
============================= 14 passed in 17.12s =============================
```

---

## 🚢 Production Deployment

### Option A: Gunicorn (Linux / Virtual Private Server)
```bash
pip install gunicorn
gunicorn -w 4 -b 0.0.0.0:5000 --timeout 120 "app:app"
```

### Option B: Docker Container
Create a `Dockerfile`:
```dockerfile
FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt gunicorn
COPY . .
EXPOSE 5000
CMD ["gunicorn", "-w", "4", "-b", "0.0.0.0:5000", "--timeout", "120", "app:app"]
```
Build and run:
```bash
docker build -t multichatbot .
docker run -p 5000:5000 --env-file .env multichatbot
```

### Option C: Render / Railway / Heroku
- **Build Command**: `pip install -r requirements.txt`
- **Start Command**: `gunicorn -w 2 -b 0.0.0.0:$PORT --timeout 120 app:app`
- Add environment variables in the host control panel (`GEMINI_API_KEY`, `SECRET_KEY`, `FLASK_ENV=production`).

---

## 🔒 Security Best Practices

1. **No Client-Exposed Keys**: All API requests to Gemini and OpenAI are dispatched server-side. Client JavaScript never touches secret credentials.
2. **DOMPurify Sanitization**: All incoming Markdown and HTML is strictly sanitized before injection into the DOM to thwart XSS attacks.
3. **No Automatic Code Execution**: Code blocks generated by the AI are formatted with syntax highlighting and copy buttons only; they are never executed directly in the user browser without authorization.
4. **Input Constraints**: Request sizes are capped at 16MB and uploads undergo strict filename sanitization with `secure_filename`.
5. **Reduced-Motion Support**: Respects `@media (prefers-reduced-motion: reduce)` by halting canvas particles and orbital ring rotations for sensitive users.

---

## 🔮 Future Enhancements

- [ ] Multi-turn Web Browsing / Live Search integration via Google Search grounding.
- [ ] End-to-end encrypted user authentication (OAuth 2.0 with Google and GitHub).
- [ ] Direct export to Google Docs & Google Drive.
- [ ] Vector database (ChromaDB / pgvector) for semantic long-term memory retrieval.
- [ ] PWA (Progressive Web App) offline support and installability.

---

## 📄 License
This project is open-source and available under the **MIT License**.
