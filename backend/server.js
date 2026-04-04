const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const mongoose = require('mongoose');

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());

// MongoDB connection
const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
    console.warn("⚠️ No MONGO_URI string found in .env file! Add your MongoDB connection string to process.env.MONGO_URI.");
} else {
    mongoose.connect(MONGO_URI)
        .then(() => console.log('✅ MongoDB Connected to Atlas successfully!'))
        .catch(err => console.error('❌ MongoDB connection error:', err));
}

// Schemas
const questionSchema = new mongoose.Schema({
    id: Number,
    q: String,
    a: String
}, { strict: false }); // Allow any additional fields like category, subcategory, etc.
const Question = mongoose.model('Question', questionSchema);

const reelSchema = new mongoose.Schema({
    id: String,
    url: String,
    title: String
}, { strict: false });
const Reel = mongoose.model('Reel', reelSchema);

const categorySchema = new mongoose.Schema({}, { strict: false });
const Category = mongoose.model('Category', categorySchema);

const DATA_FILE_PATH = path.join(__dirname, 'data.json');

// Initialize / Seed data from local data.json to MongoDB
const seedDataIfEmpty = async () => {
    try {
        const qCount = await Question.countDocuments();
        if (qCount === 0 && fs.existsSync(DATA_FILE_PATH)) {
            console.log("🌱 MongoDB is empty. Seeding data from data.json...");
            const rawData = fs.readFileSync(DATA_FILE_PATH, 'utf-8');
            const localData = JSON.parse(rawData);

            if (localData.questions && localData.questions.length > 0) {
                await Question.insertMany(localData.questions);
                console.log(`📦 Seeded ${localData.questions.length} questions`);
            }
            if (localData.reels && localData.reels.length > 0) {
                await Reel.insertMany(localData.reels);
                console.log(`📹 Seeded ${localData.reels.length} reels`);
            }
            if (localData.categories && localData.categories.length > 0) {
                // Ensure categories are object format
                const catsToInsert = localData.categories.map(c => typeof c === 'string' ? { label: c } : c);
                await Category.insertMany(catsToInsert);
                console.log(`📂 Seeded ${localData.categories.length} categories`);
            }
            console.log("✅ Database seeded successfully!");
        } else if (qCount > 0) {
            console.log(`ℹ️ Database already contains ${qCount} questions. Skipping seed.`);
        }
    } catch (err) {
        console.error("❌ Error seeding database:", err);
    }
};

mongoose.connection.once('open', () => {
    seedDataIfEmpty();
});


// Root response for Render/Vercel
app.get('/', (req, res) => {
    res.send('USA Payroll & Accounting API with MongoDB is Running Successfully! Access JSON at /api/data');
});

// GET all data
app.get('/api/data', async (req, res) => {
    if (mongoose.connection.readyState !== 1) {
        // If mongo connection failed or is not available, serve local as fallback temporarily
        if (fs.existsSync(DATA_FILE_PATH)) {
             return res.json(JSON.parse(fs.readFileSync(DATA_FILE_PATH, 'utf-8')));
        }
        return res.status(500).json({ error: "Database not connected. Please set MONGO_URI." });
    }

    try {
        const questions = await Question.find({}, '-_id -__v');
        const reels = await Reel.find({}, '-_id -__v');
        const categories = await Category.find({}, '-_id -__v');
        
        res.json({ categories, questions, reels });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET reels
app.get('/api/reels', async (req, res) => {
    try {
        const reels = await Reel.find({}, '-_id -__v');
        res.json(reels);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ADD reels in bulk
app.post('/api/reels/bulk', async (req, res) => {
    const newReels = req.body;
    if (!Array.isArray(newReels)) {
        return res.status(400).json({ error: 'Body must be an array of reels' });
    }
    
    try {
        const existingIdsObj = await Reel.find({}, 'id');
        const existingIds = new Set(existingIdsObj.map(r => r.id));
        const toAdd = [];
        
        newReels.forEach(reel => {
            if (reel.id && !existingIds.has(reel.id)) {
                toAdd.push(reel);
            }
        });

        if (toAdd.length > 0) {
            await Reel.insertMany(toAdd);
        }

        res.status(201).json({ message: `Added ${toAdd.length} new reels`, added: toAdd });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ADD a new question
app.post('/api/questions', async (req, res) => {
    const newQ = req.body;
    if (!newQ.id || !newQ.q || !newQ.a) {
        return res.status(400).json({ error: 'Missing required fields: id, q, a' });
    }
    
    try {
        const inserted = await Question.create(newQ);
        const { _id, __v, ...rest } = inserted.toObject();
        res.status(201).json(rest);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// UPDATE a question
app.put('/api/questions/:id', async (req, res) => {
    const id = parseInt(req.params.id);
    try {
        const updated = await Question.findOneAndUpdate({ id: id }, { ...req.body, id }, { new: true, lean: true });
        if (updated) {
            const { _id, __v, ...rest } = updated;
            res.json(rest);
        } else {
            res.status(404).json({ error: 'Question not found' });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE a question
app.delete('/api/questions/:id', async (req, res) => {
    const id = parseInt(req.params.id);
    try {
        await Question.findOneAndDelete({ id: id });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Backend running on port ${PORT}`));
