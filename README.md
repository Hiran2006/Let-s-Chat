# Let's Chat 💬

A modern, lightweight full-stack chat application featuring real-time messaging, secure user sessions, and private/group channels.

---

## 🛠️ Technology Stack

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS v4, Redux Toolkit, React Router DOM, Socket.io Client, Axios.
- **Backend**: Node.js, Express.js (v5), TypeScript, Socket.io, SQLite3, JWT, Bcrypt, Cookie-parser.

---

## 📁 Code Structure

Here is the architectural overview of the project structure:

```text
Let-s-Chat/
├── backend/                       # Node.js Express server + Socket.io
│   ├── src/
│   │   ├── lib/                   # Internal utilities & modules
│   │   │   ├── db/                # Database layer
│   │   │   │   ├── db.ts          # SQLite database connection & schema init
│   │   │   │   ├── users.ts       # Database helper methods for user accounts
│   │   │   │   └── chats.ts       # Database helper methods for messages & rooms
│   │   │   ├── authMiddleware.ts  # Express JWT authentication verification
│   │   │   └── jwt.ts             # JWT token signing & decoding utility
│   │   ├── routes/                # Express API routes
│   │   │   ├── auth/
│   │   │   │   └── auth.ts        # Register, login, and refresh-session endpoints
│   │   │   ├── api.ts             # Root router grouping auth and chat routes
│   │   │   └── chat.ts            # Fetching messages, listing users, and creating chats
│   │   ├── server.ts              # Server entry point & CORS configuration
│   │   ├── socket.ts              # Real-time WebSocket connection & room handlers
│   │   └── ENV.ts                 # Strongly-typed environment variable loader
│   ├── package.json               # Backend dependencies & dev scripts
│   └── tsconfig.json              # TypeScript compilation rules
│
└── frontend/                      # React SPA (Vite + TS)
    ├── src/
    │   ├── components/            # Reusable UI elements
    │   │   ├── Button.tsx         # Hand-crafted custom button component
    │   │   └── Input.tsx          # Hand-crafted custom input component
    │   ├── store/                 # Redux global state store
    │   │   ├── authSlice.ts       # State management for authenticated user
    │   │   ├── chatSlice.ts       # State management for messages, channels, & active socket
    │   │   └── index.ts           # Centralized Redux store setup
    │   ├── pages/                 # Routing page views
    │   │   ├── login.tsx          # Secure login portal page
    │   │   ├── register.tsx       # New user registration portal page
    │   │   └── chat.tsx           # Main workspace UI for chats, sidebar, & messages
    │   ├── App.tsx                # App routing & root state/socket initialization
    │   ├── index.css              # Styling entry point integrating Tailwind CSS v4
    │   └── main.tsx               # React application entry point
    ├── .env                       # Environment settings (e.g. VITE_BASE_URL)
    ├── package.json               # Frontend dependencies & scripts
    └── vite.config.ts             # Vite bundler & React/Tailwind integration configurations
```

---

## 🚀 Quick Setup

### 1. Run the Backend
```bash
cd backend
npm install
npm run dev
```
Starts backend server on `http://localhost:3000`.

### 2. Run the Frontend
In another terminal:
```bash
cd frontend
npm install
npm run dev
```
Starts application UI on `http://localhost:5173`.
