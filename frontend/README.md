# USA Payroll & Accounting App

This is a full-stack web application designed for USA Payroll & Accounting Interview Q&A, featuring 500+ questions, progressive web app (PWA) readiness, dark mode, quick searching, and more.

## Quick Start (Run Locally)

Make sure you have [Node.js](https://nodejs.org/) installed on your system.

### 1. Run the Backend
```bash
cd backend
npm install
npm start
```
The backend will run on `http://localhost:5000`. It automatically loads the HTML file contents and safely stores them in `data.json` for persistence and database-like operations.

### 2. Run the Frontend
Open a new terminal window:
```bash
cd frontend
npm install
npm run dev
```
The frontend will run on `http://localhost:5173`. Open this URL in your browser to view the app!

---

## 🛠 Features Implemented As Per Prompt

- **Frontend Specs:** React + Tailwind CSS, Dark Mode, Responsive Design.
- **Admin Dashboard:** Access via the `/admin` path (or the gear icon). You can Add, Edit, and Delete Q&As!
- **Data Persistence:** Uses custom extraction from your HTML file to a JSON Database, fulfilling the persistent state.
- **PWA (Progressive Web App):** Proper configurations and assets are included so your users can download it as an app on their phones.

---

## 🚀 How to Upload to GitHub

Before deploying your app, you need to upload it to GitHub.

### Step 1: Create a Repository on GitHub
1. Go to [GitHub](https://github.com/) and log into your account.
2. Click the **"+" icon** in the top right corner and select **New repository**.
3. Name your repository (e.g., `usa-payroll-app`).
4. Set it to **Public** or **Private**, and leave the "Initialize this repository with" options empty.
5. Click **Create repository**.

### Step 2: Push Your Code
Open your terminal inside your main `usa-payroll-app` folder (the root folder containing both *frontend* and *backend*) and run the following commands:

```bash
# Initialize a new git repository
git init

# Add all files to the repository
git add .

# Commit your changes
git commit -m "Initial commit: USA Payroll App"

# Add the remote repository URL (Replace 'YOUR_USERNAME' and 'REPO_NAME')
git remote add origin https://github.com/YOUR_USERNAME/REPO_NAME.git

# Push the code to GitHub
git branch -M main
git push -u origin main
```

---

## ☁️ Deployment Guide

### Deploying the Backend (to Render)
1. Go to [Render](https://render.com/) and sign up.
2. Click **New +** and select **Web Service**.
3. Connect your GitHub account and select your `usa-payroll-app` repository.
4. Set the following configurations:
   - **Name:** e.g., `usa-payroll-backend`
   - **Root Directory:** `backend`
   - **Environment:** `Node`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
5. Click **Create Web Service**. 
6. Once deployed, Render will provide a URL like `https://usa-payroll-backend.onrender.com`. Copy this URL!

### Deploying the Frontend (to Vercel)
1. Go to [Vercel](https://vercel.com/) and sign up.
2. Click **Add New** -> **Project**.
3. Import your `usa-payroll-app` repository from GitHub.
4. Set the following configurations BEFORE clicking deploy:
   - **Framework Preset:** `Vite`
   - **Root Directory:** `frontend`
5. **Environment Variables:** 
   Add a new environment variable so your frontend knows how to talk to the backend:
   - **Name:** `VITE_API_URL` (Wait, for Vite proxies you might need to adjust your `vite.config.js` or just change the base URLs in code. If you are using React, you typically replace `axios.get('/api/data')` with `axios.get(import.meta.env.VITE_API_URL + '/api/data')`. Since the code currently hits `/api/data` via proxy, in production it should hit the full absolute URL of Render backend).
6. Click **Deploy**.

*Note regarding production API routes: If using Vercel, you’ll either need `vercel.json` rewrites or just a direct hardcoded change in `App.jsx` pointing to your Render backend.*

### Applying Firebase (As per your request)
If you decide to continue extending the app using Firebase Firestore:
1. Go to the [Firebase Console](https://console.firebase.google.com/).
2. Create a new Web Project.
3. Once created, click on the **Web (</>)** icon to register the app.
4. You will get a configuration object. We already prepared a `frontend/src/firebase.js` file for you.
5. In your frontend directory, create a `.env` file and insert your keys:
   ```env
   
   
   ```

Enjoy your app! 🚀
