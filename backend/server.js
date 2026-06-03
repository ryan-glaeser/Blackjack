const express = require('express');
const cors = require('cors'); // Import CORS security middleware
const sqlite3 = require('sqlite3').verbose(); //Import SQL engine
const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

const db = new sqlite3.Database('./blackjack.db', (err) => {
    if (err) console.error("Database connection failed:", err.message);
    else console.log("Connected to SQLite database.");
});

// Initialize the database table and seed a user if it doesn't exist yet
db.serialize(() => {
    db.run(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE,
            wallet_balance FLOAT
        )
    `);

    // Insert a default player if the table is empty
    db.run(`
        INSERT OR IGNORE INTO users (id, username, wallet_balance) 
        VALUES (1, 'Player1', 500)
    `);
});

// API queries the database
app.get('/api/user/balance', (req, res) => {
    const sql = "SELECT username, wallet_balance FROM users WHERE id = 1";
    
    db.get(sql, [], (err, row) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        // Send the database row to the frontend
        res.json(row); 
    });
});

// A POST route to update the user's balance in the database
app.post('/api/user/save-balance', (req, res) => {
    const { newBalance } = req.body;

    // Validation to make sure we received a valid number
    if (newBalance === undefined || typeof newBalance !== 'number') {
        return res.status(400).json({ error: "Invalid balance data provided." });
    }

    const sql = "UPDATE users SET wallet_balance = ? WHERE id = 1";
    
    db.run(sql, [newBalance], function(err) {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json({ message: "Balance updated successfully!", updatedTo: newBalance });
    });
});

app.listen(PORT, () => {
    console.log(`Blackjack backend running at http://localhost:3000`);
});