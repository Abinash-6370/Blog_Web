# ✦ Inkwell — Modern Blog

A full-stack blog application built with **FastAPI** (backend) and **vanilla HTML/CSS/JS** (frontend).

---

## 🗂 Project Structure

```
blog-app/
├── backend/
│   ├── main.py          ← FastAPI app & routes
│   ├── models.py        ← Pydantic schemas
│   ├── database.py      ← SQLite CRUD manager
│   └── requirements.txt
└── frontend/
    ├── index.html       ← Single-page app shell
    ├── style.css        ← Editorial dark theme + glassmorphism
    └── script.js        ← Fetch API + full SPA logic
```

---

## 🚀 Quick Start

### 1 · Backend

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

API docs available at: http://localhost:8000/docs

### 2 · Frontend

Open `frontend/index.html` in a browser, or serve with any static server:

```bash
# Python (from frontend/ directory)
python -m http.server 3000

# Node (from frontend/ directory)
npx serve .
```

Visit: http://localhost:3000

---

## 🔌 API Endpoints

| Method | Path              | Description              |
|--------|-------------------|--------------------------|
| GET    | `/posts`          | List posts (search, page)|
| GET    | `/posts/{id}`     | Single post              |
| POST   | `/posts`          | Create post              |
| PUT    | `/posts/{id}`     | Update post              |
| DELETE | `/posts/{id}`     | Delete post              |
| GET    | `/stats`          | Blog statistics          |

### Query Parameters (GET /posts)

| Param  | Default | Description                   |
|--------|---------|-------------------------------|
| search | —       | Keyword filter (title/content)|
| page   | 1       | Pagination                    |
| limit  | 10      | Posts per page (max 100)      |

---

## ✨ Features

**Core**
- Create, read, update, delete blog posts
- SQLite persistence with seeded sample data
- Pydantic validation on all inputs
- CORS enabled for local development

**Frontend**
- Glassmorphism + editorial dark/light theme
- Real-time search (debounced)
- Date filter chips (Today / This Week / This Month)
- Sort by Newest / Oldest
- Pagination
- Smooth card animations (enter + exit)
- `timeAgo` timestamps ("2 minutes ago")
- Toast notifications (success/error)
- Confirmation dialog before delete
- Edit modal
- Character counter in compose
- Ctrl/Cmd + Enter to publish
- Responsive (mobile-first)

---

## 🌐 Deployment

### Backend → Render / Railway

1. Push `backend/` to a repo
2. Set start command: `uvicorn main:app --host 0.0.0.0 --port $PORT`
3. Update `API_BASE` in `frontend/script.js` to your deployed URL

### Frontend → Netlify / Vercel

1. Drag-and-drop `frontend/` folder to Netlify, or
2. `vercel --cwd frontend`

---

## 📦 Stack

| Layer     | Technology              |
|-----------|-------------------------|
| Backend   | FastAPI 0.111, Python 3.11+ |
| Database  | SQLite (built-in)       |
| Frontend  | HTML5 / CSS3 / ES2022   |
| Fonts     | Playfair Display, DM Sans, DM Mono |
