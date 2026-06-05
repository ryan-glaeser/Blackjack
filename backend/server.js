const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs'); 

const app = express();
const PORT = process.env.PORT || 3000; 

app.use(cors());
app.use(express.json());

let db;

// ==========================================
// DYNAMIC DATABASE SWITCH
// ==========================================
if (process.env.DATABASE_URL) {
    const { Client } = require('pg');
    db = new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false } 
    });
    db.connect();
    console.log("Connected to Cloud PostgreSQL Database.");
    
    // Stable configuration: safeguards existing data while maintaining explicit casing
    db.query(`
        CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY,
            username TEXT UNIQUE NOT NULL,
            "password_hash" TEXT NOT NULL,
            "wallet_balance" FLOAT DEFAULT 500
        )
    `).catch(err => console.error("Database initialization error:", err));

} else {
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

app.post('/api/auth/register', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).json({ error: "Username and password are required." });
    }

    try {
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);
        
        if (process.env.DATABASE_URL) {
            const sql = 'INSERT INTO users (username, "password_hash") VALUES ($1, $2)';
            await db.query(sql, [username, hashedPassword]);
            res.json({ message: "User registered successfully!" });
        } else {
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

app.post('/api/auth/login', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).json({ error: "Username and password are required." });
    }

    try {
        let user;
        if (process.env.DATABASE_URL) {
            const result = await db.query('SELECT id, username, "password_hash", "wallet_balance" FROM users WHERE username = $1', [username]);
            
            if (!result.rows || result.rows.length === 0) {
                return res.status(401).json({ error: "Account not found. Please register this username fresh!" });
            }
            user = result.rows; 
        } else {
            user = await new Promise((resolve, reject) => {
                db.get("SELECT * FROM users WHERE username = ?", [username], (err, row) => {
                    if (err) reject(err);
                    else resolve(row);
                });
            });
        }

        if (!user || Object.keys(user).length === 0) {
            return res.status(401).json({ error: "Account not found. Please register this username fresh!" });
        }

        // --- THE NUMERIC INDEX FALLBACK ---
        // If string keys aren't found, we pull directly from the numeric positions and
        const actualHash = user.password_hash || user.password_hash || user['"password_hash"'] || user;
        const actualBalance = user.wallet_balance !== undefined ? user.wallet_balance : 
                              (user.wallet_balance !== undefined ? user.wallet_balance : 
                              (user['"wallet_balance"'] !== undefined ? user['"wallet_balance"'] : user));

        if (!actualHash) {
            return res.status(500).json({ error: `Could not extract hash. Structure type: ${typeof user}` });
        }

        const isMatch = await bcrypt.compare(password, actualHash);
        if (!isMatch) return res.status(401).json({ error: "Invalid username or password." });

        // Safely parse user ID from string property or array position 0
        const actualId = user.id || user;
        const actualUsername = user.username || user;

        res.json({
            message: "Login successful!",
            userId: actualId,
            username: actualUsername,
            wallet_balance: actualBalance !== undefined ? actualBalance : 500
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ==========================================
// GAME STATE ENDPOINTS
// ==========================================

app.get('/api/user/balance/:userId', async (req, res) => {
    const { userId } = req.params;
    try {
        let row;
        if (process.env.DATABASE_URL) {
            const result = await db.query('SELECT username, "wallet_balance" FROM users WHERE id = $1', [userId]);
            row = result.rows;
        } else {
            row = await new Promise((resolve, reject) => {
                db.get("SELECT username, wallet_balance FROM users WHERE id = ?", [userId], (err, row) => {
                    if (err) reject(err);
                    else resolve(row);
                });
            });
        }

        if (!row) return res.status(404).json({ error: "User not found." });
        res.json(row);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/user/save-balance', async (req, res) => {
    const { userId, newBalance } = req.body;
    if (userId === undefined || newBalance === undefined || typeof newBalance !== 'number') {
        return res.status(400).json({ error: "Invalid data provided." });
    }

    try {
        if (process.env.DATABASE_URL) {
            await db.query('UPDATE users SET "wallet_balance" = $1 WHERE id = $2', [newBalance, userId]);
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