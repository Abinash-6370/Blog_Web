# ✦ Inkwell — Modern Blog

A full-stack blog application built with FastAPI(backend) and vanilla HTML/CSS/JS(frontend).
A modern full-stack blog application built with FastAPI and vanilla JavaScript, featuring a glassmorphism dark UI, real-time search, CRUD operations, and SQLite persistence.

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

