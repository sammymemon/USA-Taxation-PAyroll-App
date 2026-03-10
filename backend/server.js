const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());

const HTML_FILE_PATH = path.join(__dirname, '../../500_USA_Payroll_Accounting_QA.html');
const DATA_FILE_PATH = path.join(__dirname, 'data.json');

// Helper to extract JSON from HTML string safely
const extractJSONFromVariable = (htmlContent, varName) => {
    try {
        const regex = new RegExp(`const ${varName} = (\\[[\\s\\S]*?\\]);`, 'm');
        const match = htmlContent.match(regex);
        if (match && match[1]) {
            return eval(`(${match[1]})`);
        }
        return [];
    } catch (err) {
        console.error(`Error extracting ${varName}:`, err);
        return [];
    }
};

let appData = { categories: [], questions: [] };

// Initialize data
const initData = () => {
    if (fs.existsSync(DATA_FILE_PATH)) {
        try {
            const rawData = fs.readFileSync(DATA_FILE_PATH, 'utf-8');
            appData = JSON.parse(rawData);
            console.log("Data loaded from data.json");
            return;
        } catch (e) { console.error("Error reading data.json", e); }
    }

    // Fallback to extract from HTML
    console.log("Extracting data from HTML...");
    if (fs.existsSync(HTML_FILE_PATH)) {
        const htmlContent = fs.readFileSync(HTML_FILE_PATH, 'utf-8');
        appData.categories = extractJSONFromVariable(htmlContent, 'CATEGORIES');
        appData.questions = extractJSONFromVariable(htmlContent, 'ALL_QA');
        saveData();
    }
};

const saveData = () => {
    fs.writeFileSync(DATA_FILE_PATH, JSON.stringify(appData, null, 2));
};

initData();

// GET all data
app.get('/api/data', (req, res) => {
    res.json(appData);
});

// ADD a new question
app.post('/api/questions', (req, res) => {
    const newQ = req.body;
    if (!newQ.id || !newQ.q || !newQ.a) {
        return res.status(400).json({ error: 'Missing required fields' });
    }
    appData.questions.push(newQ);
    saveData();
    res.status(201).json(newQ);
});

// UPDATE a question
app.put('/api/questions/:id', (req, res) => {
    const id = parseInt(req.params.id);
    const index = appData.questions.findIndex(q => q.id === id);
    if (index !== -1) {
        appData.questions[index] = { ...appData.questions[index], ...req.body, id };
        saveData();
        res.json(appData.questions[index]);
    } else {
        res.status(404).json({ error: 'Question not found' });
    }
});

// DELETE a question
app.delete('/api/questions/:id', (req, res) => {
    const id = parseInt(req.params.id);
    appData.questions = appData.questions.filter(q => q.id !== id);
    saveData();
    res.json({ success: true });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Backend running on port ${PORT}`));
