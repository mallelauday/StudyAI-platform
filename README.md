# 📚 StudyAI – Smart AI Study Companion & Quiz Generator

StudyAI is an AI-powered learning platform that helps students learn more efficiently using Generative AI. Users can upload study materials such as PDF documents, DOCX files, or text notes and instantly generate AI-powered summaries, flashcards, quizzes, and personalized study schedules.

The application is built using **React.js**, **Flask**, **Firebase**, **Tailwind CSS**, and **Groq's LLaMA 3.3-70B Versatile** model to provide fast, accurate, and interactive learning assistance.

---

## ✨ Features

- 📄 Upload PDF, DOCX, or text study materials
- 📝 AI-powered Summary Generator
- 🎴 Flashcard Generator
- ❓ Quiz Generator
- 📅 Personalized Study Planner
- 📊 Learning Analytics Dashboard
- 🔐 Firebase Authentication
- ☁️ Firestore Database
- 💾 Local JSON storage fallback
- 📱 Responsive UI

---

## 🛠️ Tech Stack

### Frontend
- React.js
- Vite
- Tailwind CSS
- Axios

### Backend
- Flask
- Python

### AI
- Groq API
- LLaMA 3.3-70B Versatile

### Database
- Firebase Authentication
- Cloud Firestore
- Local JSON Storage (Fallback)

---

## 📂 Project Structure

```
StudyAI-platform/
│
├── backend/
│   ├── app.py
│   ├── routes/
│   ├── utils/
│   ├── requirements.txt
│   └── .env
│
├── frontend/
│   ├── src/
│   ├── public/
│   ├── package.json
│   └── vite.config.js
│
└── README.md
```

---

## 🚀 Installation

### Clone the Repository

```bash
git clone https://github.com/mallelauday/StudyAI-platform.git
cd StudyAI-platform
```

---

### Backend Setup

```bash
cd backend

python -m venv myenv

myenv\Scripts\activate

pip install -r requirements.txt
```

Create a `.env` file:

```env
GROQ_API_KEY=your_groq_api_key

# Optional
FIREBASE_PROJECT_ID=
FIREBASE_PRIVATE_KEY=
FIREBASE_CLIENT_EMAIL=
```

Run the backend:

```bash
python app.py
```

Backend runs on

```
http://localhost:5000
```

---

### Frontend Setup

```bash
cd frontend

npm install

npm run dev
```

Frontend runs on

```
http://localhost:5173
```

---

## 📖 Usage

1. Register or log in.
2. Upload a PDF, DOCX, or enter study notes.
3. Generate:
   - AI Summary
   - Flashcards
   - Quiz
   - Study Plan
4. Review your learning progress through the dashboard.

---

## 📄 Documentation

The complete project documentation, including:

- System Architecture
- ER Diagram
- Workflow
- Screenshots
- Deployment
- Performance Testing

is available in the project report (PDF).

---

## 👨‍💻 Developed By

**Mallela Uday Kumar Reddy**

SRM University–AP

B.Tech Computer Science and Engineering

---

## 📜 License

This project was developed for educational and academic purposes.
