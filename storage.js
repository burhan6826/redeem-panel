const fs = require('fs');
const path = require('path');

// Ensure data directory exists
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const requestsFile = path.join(dataDir, 'redeem-requests.json');
const usedKeysFile = path.join(dataDir, 'used-keys.json');
const cooldownsFile = path.join(dataDir, 'cooldowns.json');

// Initialize storage files if they don't exist
function initializeStorage() {
  if (!fs.existsSync(requestsFile)) {
    fs.writeFileSync(requestsFile, JSON.stringify([], null, 2));
  }
  if (!fs.existsSync(usedKeysFile)) {
    fs.writeFileSync(usedKeysFile, JSON.stringify([], null, 2));
  }
  if (!fs.existsSync(cooldownsFile)) {
    fs.writeFileSync(cooldownsFile, JSON.stringify({}, null, 2));
  }
}

// Read data from storage files
function readRequests() {
  try {
    return JSON.parse(fs.readFileSync(requestsFile, 'utf8'));
  } catch (error) {
    console.error('Error reading requests:', error);
    return [];
  }
}

function readUsedKeys() {
  try {
    return JSON.parse(fs.readFileSync(usedKeysFile, 'utf8'));
  } catch (error) {
    console.error('Error reading used keys:', error);
    return [];
  }
}

function readCooldowns() {
  try {
    return JSON.parse(fs.readFileSync(cooldownsFile, 'utf8'));
  } catch (error) {
    console.error('Error reading cooldowns:', error);
    return {};
  }
}

// Write data to storage files
function writeRequests(requests) {
  try {
    fs.writeFileSync(requestsFile, JSON.stringify(requests, null, 2));
    return true;
  } catch (error) {
    console.error('Error writing requests:', error);
    return false;
  }
}

function writeUsedKeys(keys) {
  try {
    fs.writeFileSync(usedKeysFile, JSON.stringify(keys, null, 2));
    return true;
  } catch (error) {
    console.error('Error writing used keys:', error);
    return false;
  }
}

function writeCooldowns(cooldowns) {
  try {
    fs.writeFileSync(cooldownsFile, JSON.stringify(cooldowns, null, 2));
    return true;
  } catch (error) {
    console.error('Error writing cooldowns:', error);
    return false;
  }
}

// Check if a key is already used
function isKeyUsed(redeemKey) {
  const usedKeys = readUsedKeys();
  return usedKeys.includes(redeemKey);
}

// Mark a key as used
function markKeyAsUsed(redeemKey) {
  const usedKeys = readUsedKeys();
  if (!usedKeys.includes(redeemKey)) {
    usedKeys.push(redeemKey);
    return writeUsedKeys(usedKeys);
  }
  return false;
}

// Check if user is on cooldown (10 minutes)
function isUserOnCooldown(userId) {
  const cooldowns = readCooldowns();
  const userCooldown = cooldowns[userId];
  
  if (!userCooldown) return false;
  
  const cooldownPeriod = 10 * 60 * 1000; // 10 minutes in milliseconds
  const timeSinceLastRequest = Date.now() - userCooldown;
  
  return timeSinceLastRequest < cooldownPeriod;
}

// Set user cooldown
function setUserCooldown(userId) {
  const cooldowns = readCooldowns();
  cooldowns[userId] = Date.now();
  return writeCooldowns(cooldowns);
}

// Save a new redeem request
function saveRequest(requestData) {
  const requests = readRequests();
  requests.push(requestData);
  return writeRequests(requests);
}

// Clean up old cooldowns (optional maintenance)
function cleanupOldCooldowns() {
  const cooldowns = readCooldowns();
  const cooldownPeriod = 10 * 60 * 1000; // 10 minutes
  const currentTime = Date.now();
  
  let updated = false;
  for (const [userId, timestamp] of Object.entries(cooldowns)) {
    if (currentTime - timestamp > cooldownPeriod) {
      delete cooldowns[userId];
      updated = true;
    }
  }
  
  if (updated) {
    writeCooldowns(cooldowns);
  }
}

module.exports = {
  initializeStorage,
  readRequests,
  readUsedKeys,
  readCooldowns,
  writeRequests,
  writeUsedKeys,
  writeCooldowns,
  isKeyUsed,
  markKeyAsUsed,
  isUserOnCooldown,
  setUserCooldown,
  saveRequest,
  cleanupOldCooldowns,
};
