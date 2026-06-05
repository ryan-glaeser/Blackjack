const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs'); 
const { Client } = require('pg');

const app = express();
const PORT = process.env.PORT || 3000; 

app.use(cors());
app.use(express.json());

// ==========================================
// POSTGRESQL DATABASE CONNECTION
// ==========================================
const db = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false } // Required for cloud hosting security
});

db.connect()
    .then(() => console.log("Connected to PostgreSQL Database."))
    .catch(err => console.error("Database connection error:", err));

// Standard Lowercase Table Initialization
db.query(`
    CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        wallet_balance FLOAT DEFAULT 500
    )
`).catch(err => console.error("Table initialization error:", err));

// ==========================================
// AUTHENTICATION ENDPOINTS
// ==========================================

// User Registration
app.post('/api/auth/register', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).json({ error: "Username and password are required." });
    }

    try {
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);
        
        const sql = 'INSERT INTO users (username, password_hash) VALUES ($1, $2)';
        await db.query(sql, [username, hashedPassword]);
        
        res.json({ message: "User registered successfully!" });
    } catch (error) {
        if (error.message && error.message.includes("unique constraint")) {
            return res.status(400).json({ error: "Username is already taken." });
        }
        res.status(500).json({ error: "Server error during registration." });
    }
});

// User Login
app.post('/api/auth/login', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).json({ error: "Username and password are required." });
    }

    try {
        // This is the clean query that keeps registration happy
        const result = await db.query('SELECT id, username, password_hash, wallet_balance FROM users WHERE username = $1', [username]);
        
        if (!result.rows || result.rows.length === 0) {
            return res.status(401).json({ error: "Account not found. Please register this username fresh!" });
        }

        // Reverting back to the exact object extraction that worked before
        const user = result[0] || result.rows[0];

        // Direct bracket notation extraction to bypass any strict dot-notation engine quirks
        const hash = user["password_hash"] || user.password_hash;
        const balance = user["wallet_balance"] !== undefined ? user["wallet_balance"] : user.wallet_balance;

        if (!hash) {
            return res.status(500).json({ error: "Internal error: Password hash missing from data object." });
        }

        // Pass the string hash directly to bcrypt
        const isMatch = await bcrypt.compare(password, hash);
        if (!isMatch) return res.status(401).json({ error: "Invalid username or password." });

        res.json({
            message: "Login successful!",
            userId: user.id || user["id"],
            username: user.username || user["username"],
            wallet_balance: balance !== undefined && balance !== null ? Number(balance) : 500
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ==========================================
// GAME STATE ENDPOINTS
// ==========================================

// Fetch Balance
app.get('/api/user/balance/:userId', async (req, res) => {
    const { userId } = req.params;
    try {
        const result = await db.query('SELECT username, wallet_balance FROM users WHERE id = $1', [userId]);
        const row = result.rows;

        if (!row) return res.status(404).json({ error: "User not found." });
        res.json(row);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Save Balance
app.post('/api/user/save-balance', async (req, res) => {
    const { userId, newBalance } = req.body;
    if (userId === undefined || newBalance === undefined || typeof newBalance !== 'number') {
        return res.status(400).json({ error: "Invalid data provided." });
    }

    try {
        await db.query('UPDATE users SET wallet_balance = $1 WHERE id = $2', [newBalance, userId]);
        res.json({ message: "Balance updated successfully!", updatedTo: newBalance });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`Secure Blackjack Postgres-only backend running on port ${PORT}`);
});