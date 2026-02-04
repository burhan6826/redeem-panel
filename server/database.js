const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// Ensure data directory exists
const dataDir = path.dirname(process.env.DATABASE_PATH || './data/redeem.db');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

class Database {
  constructor() {
    this.db = null;
  }

  // Initialize database connection and create tables
  async init() {
    return new Promise((resolve, reject) => {
      this.db = new sqlite3.Database(
        process.env.DATABASE_PATH || './data/redeem.db',
        (err) => {
          if (err) {
            console.error('Error opening database:', err);
            reject(err);
          } else {
            console.log('Connected to SQLite database');
            this.createTables()
              .then(() => resolve())
              .catch(reject);
          }
        }
      );
    });
  }

  // Create necessary tables
  async createTables() {
    return new Promise((resolve, reject) => {
      const createRedeemRequestsTable = `
        CREATE TABLE IF NOT EXISTS redeem_requests (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          redeemKey TEXT UNIQUE NOT NULL,
          inviteLink TEXT NOT NULL,
          email TEXT NOT NULL,
          status TEXT NOT NULL DEFAULT 'PENDING',
          timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
          ipAddress TEXT,
          userAgent TEXT,
          orderId TEXT
        )
      `;

      const createUsedKeysTable = `
        CREATE TABLE IF NOT EXISTS used_keys (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          redeemKey TEXT UNIQUE NOT NULL,
          usedAt DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `;

      this.db.run(createRedeemRequestsTable, (err) => {
        if (err) {
          console.error('Error creating redeem_requests table:', err);
          reject(err);
          return;
        }

        this.db.run(createUsedKeysTable, (err) => {
          if (err) {
            console.error('Error creating used_keys table:', err);
            reject(err);
          } else {
            console.log('Database tables created successfully');
            resolve();
          }
        });
      });
    });
  }

  // Check if a redeem key is already used
  async isKeyUsed(redeemKey) {
    return new Promise((resolve, reject) => {
      this.db.get(
        'SELECT redeemKey FROM used_keys WHERE redeemKey = ?',
        [redeemKey],
        (err, row) => {
          if (err) {
            reject(err);
          } else {
            resolve(!!row);
          }
        }
      );
    });
  }

  // Mark a key as used
  async markKeyAsUsed(redeemKey) {
    return new Promise((resolve, reject) => {
      this.db.run(
        'INSERT INTO used_keys (redeemKey) VALUES (?)',
        [redeemKey],
        function(err) {
          if (err) {
            reject(err);
          } else {
            resolve(this.lastID);
          }
        }
      );
    });
  }

  // Create a new redeem request
  async createRequest(requestData) {
    return new Promise((resolve, reject) => {
      const { name, redeemKey, inviteLink, email, ipAddress, userAgent } = requestData;
      
      this.db.run(
        `INSERT INTO redeem_requests 
         (name, redeemKey, inviteLink, email, ipAddress, userAgent) 
         VALUES (?, ?, ?, ?, ?, ?)`,
        [name, redeemKey, inviteLink, email, ipAddress, userAgent],
        function(err) {
          if (err) {
            reject(err);
          } else {
            resolve(this.lastID);
          }
        }
      );
    });
  }

  // Get all requests
  async getAllRequests() {
    return new Promise((resolve, reject) => {
      this.db.all(
        'SELECT * FROM redeem_requests ORDER BY timestamp DESC',
        [],
        (err, rows) => {
          if (err) {
            reject(err);
          } else {
            resolve(rows);
          }
        }
      );
    });
  }

  // Get request by ID
  async getRequestById(id) {
    return new Promise((resolve, reject) => {
      this.db.get(
        'SELECT * FROM redeem_requests WHERE id = ?',
        [id],
        (err, row) => {
          if (err) {
            reject(err);
          } else {
            resolve(row);
          }
        }
      );
    });
  }

  // Update request status
  async updateRequestStatus(id, status) {
    return new Promise((resolve, reject) => {
      this.db.run(
        'UPDATE redeem_requests SET status = ? WHERE id = ?',
        [status, id],
        function(err) {
          if (err) {
            reject(err);
          } else {
            resolve(this.changes);
          }
        }
      );
    });
  }

  // Get requests by status
  async getRequestsByStatus(status) {
    return new Promise((resolve, reject) => {
      this.db.all(
        'SELECT * FROM redeem_requests WHERE status = ? ORDER BY timestamp DESC',
        [status],
        (err, rows) => {
          if (err) {
            reject(err);
          } else {
            resolve(rows);
          }
        }
      );
    });
  }

  // Get recent requests from an IP address
  async getRecentRequestsByIP(ipAddress, minutes = 15) {
    return new Promise((resolve, reject) => {
      this.db.all(
        `SELECT * FROM redeem_requests 
         WHERE ipAddress = ? AND timestamp > datetime('now', '-${minutes} minutes')
         ORDER BY timestamp DESC`,
        [ipAddress],
        (err, rows) => {
          if (err) {
            reject(err);
          } else {
            resolve(rows);
          }
        }
      );
    });
  }

  // Close database connection
  close() {
    if (this.db) {
      this.db.close((err) => {
        if (err) {
          console.error('Error closing database:', err);
        } else {
          console.log('Database connection closed');
        }
      });
    }
  }
}

module.exports = new Database();
