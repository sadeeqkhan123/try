# AI Prospect Training App

An AI-powered sales training platform that helps sales professionals practice cold calls with an intelligent prospect simulator. Get real-time feedback, detailed analytics, and comprehensive call evaluations.

## 🚀 Features

- **Intelligent AI Prospect**: Realistic AI that responds with objections, questions, and buying signals based on a sophisticated decision tree
- **Real-Time Voice Interaction**: Practice with natural voice conversations (TTS/STT integration ready)
- **Live Subtitles**: Toggle subtitles on/off for reviewing your technique
- **Detailed Analytics**: Track performance across key metrics (objection handling, rapport building, closing techniques)
- **Comprehensive Reports**: Download PDF reports with detailed scoring and recommendations
- **Scenario Library**: Access various prospect personas and objection scenarios
- **Session Management**: Track multiple training sessions with student information and batch tracking

## 🛠️ Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: Radix UI
- **State Management**: React Hooks
- **TTS**: Coqui TTS (Python server) or client-side fallback
- **STT**: Ready for integration (OpenAI Whisper, Google Speech-to-Text, AWS Transcribe)

## 📋 Prerequisites

- Node.js 18+ and npm
- Python 3.8+ (for optional Coqui TTS server)

## 🏃 Getting Started

### 1. Clone the repository

```bash
git clone <your-repo-url>
cd ai-prospect-training-app
```

### 2. Install dependencies

```bash
npm install
```

### 3. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 4. (Optional) Start Coqui TTS Server

For enhanced text-to-speech, you can run the Coqui TTS server:

```bash
cd scripts
python tts-server.py
```

The server will run on `http://localhost:5000` by default. The app will automatically use it if available, otherwise it falls back to client-side TTS.

## 📁 Project Structure

```
ai-prospect-training-app/
├── app/                    # Next.js app directory
│   ├── (landing)/          # Landing page
│   ├── api/                # API routes
│   │   ├── ai-response/    # AI response generation
│   │   ├── conversation/   # Conversation management
│   │   ├── evaluate/       # Session evaluation
│   │   ├── reports/        # Report generation
│   │   ├── scenarios/      # Scenario listing
│   │   ├── sessions/       # Session CRUD
│   │   ├── speech/         # Speech-to-text
│   │   └── tts/            # Text-to-speech
│   └── dashboard/          # Main dashboard
├── components/             # React components
│   ├── call-controls.tsx  # Call control panel
│   ├── conversation-panel.tsx
│   ├── live-hud.tsx
│   ├── report-card.tsx
│   └── student-info-form.tsx
├── lib/                    # Core libraries
│   ├── decision-engine.ts  # Conversation flow logic
│   ├── evaluation-engine.ts # Scoring and evaluation
│   ├── session-manager.ts   # Session state management
│   ├── session-store.ts    # In-memory session storage
│   └── types.ts            # TypeScript types
├── services/               # External services
│   ├── speech-service.ts   # STT/TTS services
│   └── coqui-tts-service.ts
├── config/                 # Configuration
│   └── flow.json          # Conversation flow definition
└── scripts/               # Utility scripts
    └── tts-server.py      # Coqui TTS server
```

## 🔌 API Endpoints

### Sessions
- `POST /api/sessions` - Create a new session
- `GET /api/sessions?sessionId=<id>` - Get session by ID
- `GET /api/sessions` - Get all sessions
- `PUT /api/sessions` - Update session
- `DELETE /api/sessions?sessionId=<id>` - Delete session

### Conversation
- `POST /api/conversation` - Add a message to conversation
- `GET /api/conversation?sessionId=<id>` - Get conversation history

### AI Response
- `POST /api/ai-response` - Generate AI response based on user message

### Evaluation
- `POST /api/evaluate` - Evaluate a session
- `GET /api/evaluate?sessionId=<id>` - Get evaluation for a session

### Reports
- `GET /api/reports?sessionId=<id>` - Get report for a session
- `GET /api/reports?studentId=<id>` - Get all reports for a student

### Scenarios
- `GET /api/scenarios` - List all available scenarios

### Health
- `GET /api/health` - Health check endpoint

### Speech & TTS
- `POST /api/speech` - Speech-to-text transcription
- `POST /api/tts` - Text-to-speech generation

## 🎯 Usage

1. **Start a Session**: Navigate to the dashboard and fill in your student information
2. **Begin Simulation**: Click "Start Simulation" to begin the call
3. **Interact**: Speak naturally - the AI will respond based on your input
4. **Review**: After the call ends, view your detailed evaluation report
5. **Download**: Export your report as PDF for sharing or reference

## 🔧 Configuration

### Conversation Flow

Edit `config/flow.json` to customize:
- Conversation nodes and transitions
- Bot responses and variations
- Expected intents and examples
- Scenario definitions

### Environment Variables

Create a `.env.local` file for optional configuration:

```env
# Optional: For OpenAI Whisper STT integration
OPENAI_API_KEY=your_api_key_here

# Optional: Coqui TTS server URL (defaults to http://localhost:5000)
COQUI_TTS_SERVER_URL=http://localhost:5000
```

## 🐛 Known Limitations

- **In-Memory Storage**: Sessions are stored in memory and will be lost on server restart. Replace with a database (PostgreSQL, MongoDB, etc.) for production.
- **Mock STT**: Speech-to-text currently returns mock transcriptions. Integrate with a real STT service for production use.
- **No Authentication**: Add authentication/authorization for production deployments.

## 🚀 Production Deployment

1. **Database**: Replace in-memory session store with a production database
2. **STT Integration**: Integrate with a real speech-to-text service
3. **Authentication**: Add user authentication and authorization
4. **Environment Variables**: Set up proper environment configuration
5. **Build**: Run `npm run build` and deploy to your hosting platform

### Recommended Hosting

- **Vercel**: Optimized for Next.js applications
- **Netlify**: Great for static and serverless deployments
- **AWS/Azure/GCP**: For enterprise deployments with custom infrastructure

## 📝 Development

### Build

```bash
npm run build
```

### Start Production Server

```bash
npm start
```

### Lint

```bash
npm run lint
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is private and proprietary.

## 🙏 Acknowledgments

- Built with Next.js and React
- UI components from Radix UI
- TTS powered by Coqui TTS

## 📞 Support

For issues and questions, please open an issue on GitHub.

---

**Note**: This is a training application. For production use, ensure proper security measures, database persistence, and API integrations are implemented.

