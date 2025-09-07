import os
from datetime import datetime, timedelta
from io import BytesIO

from flask import Flask, jsonify, request, session as flask_session, send_file, render_template
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import func

# Optional: PDF/DOCX generation
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
from docx import Document

# Optional: Google Gemini
import google.generativeai as genai
from dotenv import load_dotenv


from extensions import db

# Load environment variables from .env if present
load_dotenv()


def create_app():
    app = Flask(__name__, static_folder='static', template_folder='templates')

    app.config['SECRET_KEY'] = os.environ.get('FLASK_SECRET', 'dev-secret-change-me')
    db_path = os.path.join(app.instance_path, 'app.db')
    os.makedirs(app.instance_path, exist_ok=True)
    app.config['SQLALCHEMY_DATABASE_URI'] = f'sqlite:///{db_path}'
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

    db.init_app(app)

    with app.app_context():
        from models import Message, Summary, Participant  # noqa: F401
        db.create_all()

    # Routes for pages
    @app.route('/')
    def index_page():
        return render_template('index.html')

    @app.route('/teacher.html')
    def teacher_page():
        return render_template('teacher.html')

    # API routes
    from models import Message, Summary, Participant

    @app.post('/api/session')
    def create_session():
        data = request.get_json(silent=True) or {}
        username = (data.get('username') or '').strip()
        if not username or len(username) < 2 or len(username) > 24:
            return jsonify({'error': 'Invalid username'}), 400

        # Uniqueness check within current chat session: ensure username not already taken
        existing = Participant.query.filter(func.lower(Participant.username) == username.lower()).first()
        if existing and (datetime.utcnow() - existing.last_seen) < timedelta(hours=8):
            return jsonify({'error': 'Username already taken'}), 409

        if not existing:
            existing = Participant(username=username, last_seen=datetime.utcnow())
            db.session.add(existing)
        else:
            existing.last_seen = datetime.utcnow()
        db.session.commit()

        flask_session['username'] = username
        return jsonify({'username': username})

    def require_username():
        username = flask_session.get('username')
        if not username:
            return None, (jsonify({'error': 'Not joined'}), 401)
        return username, None

    @app.get('/api/messages')
    def list_messages():
        messages = Message.query.order_by(Message.created_at.asc()).all()
        return jsonify({
            'messages': [m.to_dict() for m in messages]
        })

    @app.post('/api/messages')
    def create_message():
        username, err = require_username()
        if err:
            return err
        data = request.get_json(silent=True) or {}
        content = (data.get('content') or '').strip()
        if not content:
            return jsonify({'error': 'Content required'}), 400
        message = Message(username=username, content=content)
        db.session.add(message)
        db.session.commit()
        return jsonify(message.to_dict()), 201

    @app.put('/api/messages/<int:message_id>')
    def update_message(message_id: int):
        username, err = require_username()
        if err:
            return err
        message = Message.query.get_or_404(message_id)
        if message.username != username:
            return jsonify({'error': 'Forbidden'}), 403
        data = request.get_json(silent=True) or {}
        content = (data.get('content') or '').strip()
        if not content:
            return jsonify({'error': 'Content required'}), 400
        message.content = content
        message.updated_at = datetime.utcnow()
        db.session.commit()
        return jsonify(message.to_dict())

    @app.delete('/api/messages/<int:message_id>')
    def delete_message(message_id: int):
        username, err = require_username()
        if err:
            return err
        message = Message.query.get_or_404(message_id)
        if message.username != username:
            return jsonify({'error': 'Forbidden'}), 403
        db.session.delete(message)
        db.session.commit()
        return ('', 204)

    # Summarization using Gemini
    def configure_gemini():
        api_key = os.environ.get('GEMINI_API_KEY') or os.environ.get('GOOGLE_API_KEY')
        if not api_key:
            return None
        genai.configure(api_key=api_key)
        model_name = os.environ.get('GEMINI_MODEL', 'gemini-1.5-flash')
        return genai.GenerativeModel(model_name)

    @app.post('/api/summarize')
    def summarize():
        model = configure_gemini()
        if model is None:
            return jsonify({'error': 'Gemini API key not configured'}), 500

        messages = Message.query.order_by(Message.created_at.asc()).all()
        if not messages:
            return jsonify({'error': 'No messages to summarize'}), 400

        transcript = []
        for m in messages:
            timestamp = m.created_at.strftime('%Y-%m-%d %H:%M')
            transcript.append(f"[{timestamp}] {m.username}: {m.content}")
        prompt = (
            "You are assisting a teacher. Summarize the following class chat into clear bullet points, "
            "grouping related questions, highlighting key answers, and listing actionable follow-ups if any. "
            "Be concise and neutral.\n\n" + "\n".join(transcript)
        )

        try:
            result = model.generate_content(prompt)
            text = result.text.strip() if hasattr(result, 'text') else str(result)
        except Exception as e:
            return jsonify({'error': f'Gemini error: {e}'}), 500

        summary = Summary(content=text)
        db.session.add(summary)
        db.session.commit()
        return jsonify({'summary': text, 'created_at': summary.created_at.isoformat()})

    @app.get('/api/summaries/latest')
    def latest_summary():
        summary = Summary.query.order_by(Summary.created_at.desc()).first()
        if not summary:
            return jsonify({'summary': None})
        return jsonify({'summary': summary.content, 'created_at': summary.created_at.isoformat()})

    @app.get('/api/summaries/latest/download')
    def download_latest_summary():
        file_type = request.args.get('type', 'pdf')
        summary = Summary.query.order_by(Summary.created_at.desc()).first()
        if not summary:
            return jsonify({'error': 'No summary available'}), 404

        content = summary.content or ''

        if file_type == 'docx':
            buffer = BytesIO()
            document = Document()
            for line in content.splitlines():
                document.add_paragraph(line)
            document.save(buffer)
            buffer.seek(0)
            return send_file(buffer, as_attachment=True, download_name='summary.docx', mimetype='application/vnd.openxmlformats-officedocument.wordprocessingml.document')
        else:  # default to PDF
            buffer = BytesIO()
            pdf = canvas.Canvas(buffer, pagesize=letter)
            width, height = letter
            x_margin = 50
            y = height - 50
            for line in content.splitlines():
                if y < 50:
                    pdf.showPage()
                    y = height - 50
                pdf.drawString(x_margin, y, line[:110])
                y -= 16
            pdf.save()
            buffer.seek(0)
            return send_file(buffer, as_attachment=True, download_name='summary.pdf', mimetype='application/pdf')

    # Optional admin utilities
    @app.post('/api/admin/clear')
    def admin_clear():
        token = request.headers.get('X-Admin-Token')
        expected = os.environ.get('ADMIN_TOKEN')
        if not expected or token != expected:
            return jsonify({'error': 'Unauthorized'}), 401
        Message.query.delete()
        Summary.query.delete()
        Participant.query.delete()
        db.session.commit()
        return jsonify({'status': 'cleared'})

    return app


if __name__ == '__main__':
    app = create_app()
    app.run(host='0.0.0.0', port=int(os.environ.get('PORT', 5000)), debug=True)


