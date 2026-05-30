import db from "./db.js";

const getUserChats = (userId: number): Promise<any[]> => {
  return new Promise((resolve, reject) => {
    db.all(
      `
      SELECT 
        chats.id,
        chats.type,
        chats.name,
        chats.created_at,
        m.text as lastMessage,
        m.created_at as lastMessageTime,
        sender.name as lastMessageSenderName,
        sender.email as lastMessageSenderEmail
      FROM chats
      JOIN chat_members 
        ON chats.id = chat_members.chat_id
      LEFT JOIN (
        SELECT chat_id, text, created_at, sender_id
        FROM messages
        WHERE id IN (SELECT MAX(id) FROM messages GROUP BY chat_id)
      ) m ON chats.id = m.chat_id
      LEFT JOIN users sender ON m.sender_id = sender.id
      WHERE chat_members.user_id = ?
      ORDER BY COALESCE(m.created_at, chats.created_at) DESC
      `,
      [userId],
      (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      },
    );
  });
};

const getChatMembers = (chatId: number): Promise<any[]> => {
  return new Promise((resolve, reject) => {
    db.all(
      `
      SELECT users.id, users.name, users.email
      FROM chat_members
      JOIN users ON chat_members.user_id = users.id
      WHERE chat_members.chat_id = ?
      `,
      [chatId],
      (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      },
    );
  });
};

const getChatMessages = (chatId: number): Promise<any[]> => {
  return new Promise((resolve, reject) => {
    db.all(
      `
      SELECT 
        messages.id,
        messages.chat_id as chatId,
        messages.text,
        messages.created_at as timestamp,
        users.email as sender,
        users.name as senderName
      FROM messages
      JOIN users ON messages.sender_id = users.id
      WHERE messages.chat_id = ?
      ORDER BY messages.created_at ASC
      `,
      [chatId],
      (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      },
    );
  });
};

const createChat = (
  type: "private" | "group",
  name: string | null,
  memberUserIds: number[]
): Promise<number> => {
  return new Promise((resolve, reject) => {
    db.run(
      `INSERT INTO chats (type, name) VALUES (?, ?)`,
      [type, name],
      function (err) {
        if (err) return reject(err);
        const chatId = this.lastID;

        const stmt = db.prepare(
          `INSERT INTO chat_members (chat_id, user_id) VALUES (?, ?)`
        );

        const promises = memberUserIds.map((userId) => {
          return new Promise<void>((res, rej) => {
            stmt.run([chatId, userId], (err) => {
              if (err) rej(err);
              else res();
            });
          });
        });

        Promise.all(promises)
          .then(() => {
            stmt.finalize();
            resolve(chatId);
          })
          .catch((err) => {
            stmt.finalize();
            reject(err);
          });
      }
    );
  });
};

const createMessage = (
  chatId: number,
  senderId: number,
  text: string
): Promise<any> => {
  return new Promise((resolve, reject) => {
    db.run(
      `INSERT INTO messages (chat_id, sender_id, text) VALUES (?, ?, ?)`,
      [chatId, senderId, text],
      function (err) {
        if (err) return reject(err);
        const messageId = this.lastID;

        db.get(
          `
          SELECT 
            messages.id,
            messages.chat_id as chatId,
            messages.text,
            messages.created_at as timestamp,
            users.email as sender,
            users.name as senderName
          FROM messages
          JOIN users ON messages.sender_id = users.id
          WHERE messages.id = ?
          `,
          [messageId],
          (err, row) => {
            if (err) reject(err);
            else resolve(row);
          }
        );
      }
    );
  });
};

export default {
  getUserChats,
  getChatMembers,
  getChatMessages,
  createChat,
  createMessage,
};
