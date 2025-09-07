## Student Anonymous Chat with Gemini Summarization

Anonymous group chat for students with lightweight join (username only), real-time style updates (via refresh), CRUD on messages, and one-click conversation summarization using Gemini. A teacher view shows the latest summary with PDF/Word download options.

### Tech Stack / Tools
- **Backend**: Flask (Python), Flask-SQLAlchemy (SQLite)
- **AI**: Google Gemini via `google-generativeai`
- **Frontend**: HTML, CSS, JavaScript, Bootstrap 5
- **Docs/Exports**: `reportlab` (PDF), `python-docx` (Word)
- **Config**: `python-dotenv` for `.env` loading

### Features Implemented
- **Anonymous Join**: Enter only a username; uniqueness enforced per active session window
- **Group Chat**:
  - Create, Read, Update, Delete messages (students can edit/delete their own)
  - Refresh button to fetch latest messages
- **Summarization**:
  - Summarize full chat via Gemini
  - Store summaries in DB
- **Teacher View**:
  - See latest summary
  - Download as PDF or Word (DOCX)
- **Admin (Optional)**:
  - Clear all chat data and summaries with an admin token

### Project Structure
```
.
├─ app.py                 # Flask app factory, routes, summarization
├─ models.py              # SQLAlchemy models: Participant, Message, Summary
├─ extensions.py          # Shared SQLAlchemy instance
├─ instance/app.db        # SQLite database (auto-created)
├─ templates/
│  ├─ index.html          # Student chat UI
│  └─ teacher.html        # Teacher summary view
├─ static/
│  ├─ css/styles.css
│  └─ js/
│     ├─ api.js           # Frontend API client
│     ├─ app.js           # Chat page logic
│     └─ teacher.js       # Teacher page logic
└─ requirements.txt
```

### Prerequisites
- Python 3.11+ (recommended)
- A virtual environment (optional but recommended)
- Gemini API key

### Environment Variables (.env)
Create a `.env` file in the project root:
```
# Either of these will be used
GEMINI_API_KEY=your_gemini_key_here
# or
GOOGLE_API_KEY=your_gemini_key_here

# Optional
GEMINI_MODEL=gemini-1.5-flash
FLASK_SECRET=change-this-in-prod
ADMIN_TOKEN=some_admin_token
```

### Install & Run (Windows PowerShell)
1) Create/activate venv (if not already):
```
python -m venv venv
./venv/Scripts/Activate.ps1
```
2) Install dependencies:
```
pip install -r requirements.txt
```
3) Run the app:
```
python app.py
```
4) Open in browser: `http://localhost:5000`

### Using the App
- Go to the main page, enter a username, and join the chat
- Post messages; edit/delete the ones you authored
- Click “Refresh” to fetch new messages
- Click “Summarize” to generate and view the latest summary
- Teacher page: `http://localhost:5000/teacher.html` for latest summary and downloads

### API Endpoints
- Session
  - `POST /api/session` { username }
- Messages
  - `GET /api/messages`
  - `POST /api/messages` { content }
  - `PUT /api/messages/{id}` { content }
  - `DELETE /api/messages/{id}`
- Summaries
  - `POST /api/summarize`
  - `GET /api/summaries/latest`
  - `GET /api/summaries/latest/download?type=pdf|docx`
- Admin (optional)
  - `POST /api/admin/clear` with header `X-Admin-Token: <ADMIN_TOKEN>`

### Notes
- Database file is created under `instance/app.db` on first run
- Frontend currently uses manual refresh (button) for updates; Socket.IO can be added later

### Troubleshooting
- "Gemini API key not configured":
  - Ensure `.env` exists in project root
  - Use `GEMINI_API_KEY` or `GOOGLE_API_KEY`
  - Restart the server after editing `.env`
- Dependency issues: re-run `pip install -r requirements.txt`
- PDF/Word export errors: confirm `reportlab` and `python-docx` are installed


