import sqlite3 from "sqlite3";

const database = new sqlite3.Database("./db.db");

database.serialize(() => {
  database.run("PRAGMA foreign_keys = ON");

  database.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  database.run(`
    CREATE TABLE IF NOT EXISTS chats (
      id INT PRIMARY KEY,
      type TEXT NOT NULL CHECK (type IN ('private', 'group')),
      name TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  database.run(`
    CREATE TABLE IF NOT EXISTS chat_members (
      id INT PRIMARY KEY,
      user_id INT NOT NULL,
      chat_id INT NOT NULL,
      joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,

      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (chat_id) REFERENCES chats(id),

      UNIQUE(user_id, chat_id)
    )
  `);

  database.run(`
    CREATE TABLE IF NOT EXISTS messages (
      id INT PRIMARY KEY,
      chat_id INT NOT NULL,
      sender_id INT NOT NULL,
      text TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME,

      FOREIGN KEY (chat_id) REFERENCES chats(id),
      FOREIGN KEY (sender_id) REFERENCES users(id)
    )
  `);
});
export default database;
