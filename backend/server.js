const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs'); // Library for hashing passwords

const app = express();
const PORT = process.env.PORT || 3000; 

app.use(cors());
app.use(express.json());

let db;

// DYNAMIC DATABASE SWITCH
if (process.env.DATABASE_URL) {
    // If running in the cloud (Render), connect to your live Postgres database
    const { Client } = require('pg');
    db = new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false } // Required for cloud hosting security
    });
    db.connect();
    console.log("Connected to Cloud PostgreSQL Database.");
    
    // Create Table using Postgres syntax
    db.query(`
        CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY,
            username TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            wallet_balance FLOAT DEFAULT 500
        )
    `);
} else {
    // If running locally on your laptop, fall back to your reliable SQLite file
    const sqlite3 = require('sqlite3').verbose();
    db = new sqlite3.Database('./blackjack.db');
    console.log("Connected to Local SQLite database.");
    
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
}

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
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);
        
        if (process.env.DATABASE_URL) {
            // Postgres logic
            const sql = "INSERT INTO users (username, password_hash) VALUES ($1, $2)";
            await db.query(sql, [username, hashedPassword]);
            res.json({ message: "User registered successfully!" });
        } else {
            // SQLite fallback fallback
            const sql = "INSERT INTO users (username, password_hash) VALUES (?, ?)";
            db.run(sql, [username, hashedPassword], function(err) {
                if (err) {
                    if (err.message.includes("UNIQUE constraint failed")) {
                        return res.status(400).json({ error: "Username is already taken." });
                    }
                    return res.status(500).json({ error: err.message });
                }
                res.json({ message: "User registered successfully!" });
            });
        }
    } catch (error) {
        if (error.message && (error.message.includes("unique constraint") || error.message.includes("UNIQUE constraint"))) {
            return res.status(400).json({ error: "Username is already taken." });
        }
        res.status(500).json({ error: "Server error during registration." });
    }
});

// User Login Route
app.post('/api/auth/login', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).json({ error: "Username and password are required." });
    }

    try {
        let user;
        if (process.env.DATABASE_URL) {
            // Postgres logic
            const result = await db.query("SELECT * FROM users WHERE username = $1", [username]);
            user = result.rows; 
            
            // This debug log will let you see exactly what properties exist on the object
            console.log("Postgres user object returned:", user);
        } else {
            // SQLite fallback
            user = await new Promise((resolve, reject) => {
                db.get("SELECT * FROM users WHERE username = ?", [username], (err, row) => {
                    if (err) reject(err);
                    else resolve(row);
                });
            });
        }

        if (!user) return res.status(401).json({ error: "Invalid username or password." });

        // Safe extraction: handles case sensitivity differences between database engines
        const hash = user.password_hash || user.password_hash; 
        
        if (!hash) {
            console.error("Password hash column missing or undefined in user object structure!");
            return res.status(500).json({ error: "Database structure mismatch error." });
        }

        const isMatch = await bcrypt.compare(password, hash);
        if (!isMatch) return res.status(401).json({ error: "Invalid username or password." });

        res.json({
            message: "Login successful!",
            userId: user.id,
            username: user.username,
            wallet_balance: user.wallet_balance !== undefined ? user.wallet_balance : user.wallet_balance
        });
    } catch (error) {
        console.error("Login route error:", error);
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
        if (process.env.DATABASE_URL) {
            await db.query("UPDATE users SET wallet_balance = $1 WHERE id = $2", [newBalance, userId]);
        } else {
            await new Promise((resolve, reject) => {
                db.run("UPDATE users SET wallet_balance = ? WHERE id = ?", [newBalance, userId], function(err) {
                    if (err) reject(err);
                    else resolve();
                });
            });
        }
        res.json({ message: "Balance updated successfully!", updatedTo: newBalance });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`Secure Blackjack backend running on port ${PORT}`);
});