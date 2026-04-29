const crypto = require("crypto");

const SESSION_TTL_MS = 1000 * 60 * 60 * 12;
const COOKIE_NAME = "admin_session";
const sessions = new Map();

const ADMIN_USERNAME = String(process.env.ADMIN_USERNAME || "admin").trim();
const ADMIN_PASSWORD = String(process.env.ADMIN_PASSWORD || "admin123").trim();

function cleanupExpiredSessions() {
  const now = Date.now();
  for (const [token, session] of sessions.entries()) {
    if (!session || session.expiresAt <= now) {
      sessions.delete(token);
    }
  }
}

function createSession(username) {
  cleanupExpiredSessions();
  const token = crypto.randomBytes(24).toString("hex");
  const expiresAt = Date.now() + SESSION_TTL_MS;
  sessions.set(token, { username, expiresAt });
  return { token, expiresAt };
}

function getSession(token) {
  if (!token) return null;
  cleanupExpiredSessions();
  const session = sessions.get(token);
  if (!session) return null;
  return session;
}

function clearSession(token) {
  if (!token) return;
  sessions.delete(token);
}

function isValidCredentials(username, password) {
  return String(username || "") === ADMIN_USERNAME && String(password || "") === ADMIN_PASSWORD;
}

module.exports = {
  COOKIE_NAME,
  SESSION_TTL_MS,
  createSession,
  getSession,
  clearSession,
  isValidCredentials,
};
