const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs'); // Library for hashing passwords

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// Connect to SQLite database
const db = new sqlite3.Database('./blackjack.db', (err) => {
    if (err) console.error("Database connection failed:", err.message);
    else console.log("Connected to SQLite database.");
});

// Setup the Multi-User Database Table
db.serialize(() => {
    db.run(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            wallet_balance FLOAT DEFAULT 500
        )
    `);
});

// ==========================================
// AUTHENTICATION ENDPOINTS
// ==========================================

// User Registration Route
app.post('/api/auth/register', async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: "Username and password are required." });
    }

    try {
        // Hash the plain-text password securely before saving it
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        const sql = "INSERT INTO users (username, password_hash) VALUES (?, ?)";
        
        db.run(sql, [username, hashedPassword], function(err) {
            if (err) {
                if (err.message.includes("UNIQUE constraint failed")) {
                    return res.status(400).json({ error: "Username is already taken." });
                }
                return res.status(500).json({ error: err.message });
            }
            res.json({ message: "User registered successfully!", userId: this.lastID });
        });
    } catch (error) {
        res.status(500).json({ error: "Server error during registration." });
    }
});

// User Login Route
app.post('/api/auth/login', (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: "Username and password are required." });
    }

    const sql = "SELECT * FROM users WHERE username = ?";
    
    db.get(sql, [username], async (err, user) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!user) return res.status(401).json({ error: "Invalid username or password." });

        // Compare the submitted plain-text password against the stored database hash
        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) {
            return res.status(401).json({ error: "Invalid username or password." });
        }

        // Login success! Send back user info (but never pass back the password hash!)
        res.json({
            message: "Login successful!",
            userId: user.id,
            username: user.username,
            wallet_balance: user.wallet_balance
        });
    });
});

// ==========================================
// GAME STATE ENDPOINTS (DYNAMICS TRACKING)
// ==========================================

// Fetch Balance for a Specific User ID
app.get('/api/user/balance/:userId', (req, res) => {
    const { userId } = req.params;
    const sql = "SELECT username, wallet_balance FROM users WHERE id = ?";
    
    db.get(sql, [userId], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!row) return res.status(404).json({ error: "User not found." });
        res.json(row);
    });
});

// Save Balance for a Specific User ID
app.post('/api/user/save-balance', (req, res) => {
    const { userId, newBalance } = req.body;

    if (userId === undefined || newBalance === undefined || typeof newBalance !== 'number') {
        return res.status(400).json({ error: "Invalid data provided." });
    }

    const sql = "UPDATE users SET wallet_balance = ? WHERE id = ?";
    
    db.run(sql, [newBalance, userId], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: "Balance updated successfully!", updatedTo: newBalance });
    });
});

app.listen(PORT, () => {
    console.log(`Secure Blackjack backend running at http://localhost:3000`);
});