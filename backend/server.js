const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());

const JWT_SECRET = process.env.JWT_SECRET || 'supersecret_payroll_key_123';

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

const userSchema = new mongoose.Schema({
    email: { type: String, unique: true, required: true },
    password: { type: String, required: true },
    syncData: { type: Object, default: {} }
}, { strict: false });
const User = mongoose.model('User', userSchema);

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

// --- AUTHENTICATION & SYNC ROUTES ---

// Middleware to verify token
const verifyToken = (req, res, next) => {
    const token = req.headers['authorization'];
    if (!token) return res.status(403).json({ error: "No token provided" });
    try {
        const decoded = jwt.verify(token.split(" ")[1], JWT_SECRET);
        req.userId = decoded.id;
        next();
    } catch (err) {
        return res.status(401).json({ error: "Unauthorized" });
    }
};

// Register
app.post('/api/auth/register', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) return res.status(400).json({ error: "Email and password required" });
        
        const existing = await User.findOne({ email });
        if (existing) return res.status(400).json({ error: "Email already exists" });

        const hashedPassword = await bcrypt.hash(password, 10);
        const user = await User.create({ email, password: hashedPassword, syncData: {} });
        
        const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: '30d' });
        res.status(201).json({ token, email: user.email, syncData: user.syncData });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Login
app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });
        if (!user) return res.status(404).json({ error: "User not found" });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ error: "Invalid credentials" });

        const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: '30d' });
        res.json({ token, email: user.email, syncData: user.syncData });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Sync Up (Upload local data to cloud)
app.post('/api/auth/sync', verifyToken, async (req, res) => {
    try {
        const { syncData } = req.body;
        const user = await User.findByIdAndUpdate(req.userId, { syncData }, { new: true });
        res.json({ success: true, syncData: user.syncData });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Sync Down (Get cloud data to local)
app.get('/api/auth/sync', verifyToken, async (req, res) => {
    try {
        const user = await User.findById(req.userId);
        res.json({ success: true, syncData: user.syncData });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Backend running on port ${PORT}`));
