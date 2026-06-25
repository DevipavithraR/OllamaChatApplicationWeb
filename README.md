# Restaurant AI Receptionist & Dashboard Web Application

This is the frontend Single Page Application (SPA) for the **Restaurant AI Receptionist & Chatbot** service. It is built using **React**, **Vite**, **Lucide Icons**, and **Vanilla CSS** with a modern, glassmorphic dark-theme design.

The web application allows you to:
1. **Chat with the AI Receptionist**: Register customers, ask about menu dishes, and book table reservations.
2. **Inspect Database State in Real-Time**: View active reservations, search and filter the menu catalog, and view registered customers.
3. **Trigger Immediate updates**: Polls the backend FastAPI service every 4 seconds to reflect chatbot actions on the dashboards instantly.

---

## 📂 Project Structure

```
OllamaChatApplicationWeb/
├── public/              # Static assets
├── src/
│   ├── assets/          # Project assets/images
│   ├── App.css          # Cleared/Reset styles
│   ├── App.jsx          # Main React Application, State, and API hooks
│   ├── index.css        # Premium Glassmorphism Design System Stylesheet
│   └── main.jsx         # React DOM bootstrapping
├── .gitignore           # Git ignore patterns (node_modules, builds, logs)
├── index.html           # HTML5 Entry template
├── package.json         # Web application package dependencies & scripts
├── package-lock.json    # Dependency lockfile
└── vite.config.js       # Vite build configurations
```

---

## 🛠️ Requirements & Dependencies (`package.json`)

In Node/React development, dependencies are defined inside `package.json` (similar to `requirements.txt` in Python).

### Active Dependencies
*   **`react`** & **`react-dom`**: Frontend framework.
*   **`lucide-react`**: Clean, modern vector icon set.
*   **`vite`** & **`@vitejs/plugin-react`**: Hot-reloading development server and bundler.

---

## 🚀 Getting Started

### 1. Prerequisite: Start the Backend
Ensure the FastAPI backend server is running on port `8000`:
```powershell
# In the OllamaChatApplication directory
.\.venv\Scripts\python -m uvicorn app.main:app --port 8000
```

### 2. Install Frontend Dependencies
From the `OllamaChatApplicationWeb/` directory, install the required packages:
```powershell
npm install
```
*(This reads the `package.json` file and downloads the `node_modules` folder).*

### 3. Run the Development Server
Start the frontend hot-reloading development server:
```powershell
npm run dev
```
Once started, the application will be online at: **`http://localhost:5173`**

---

## ⚙️ Environment Configuration
The frontend automatically points to **`http://localhost:8000`** to connect to the FastAPI backend. If your backend runs on a different port or host, you can adjust the `API_BASE` variable at the top of [src/App.jsx](file:///C:/Users/DeviPavithraR/Documents/ARFFY/AI%20Class/OllamaChatApplicationWeb/src/App.jsx):

```javascript
const API_BASE = 'http://localhost:8000';
```
