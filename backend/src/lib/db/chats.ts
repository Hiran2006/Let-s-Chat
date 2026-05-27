import db from "./db.js";
const getUserChats = (userId: string) => {
  return new Promise((resolve, reject) => {
    db.all(
      `
      SELECT 
        chats.id,
        chats.type,
        chats.name,
        chats.created_at
      FROM chats
      JOIN chat_members 
        ON chats.id = chat_members.chat_id
      WHERE chat_members.user_id = ?
      ORDER BY chats.created_at DESC
      `,
      [userId],
      (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      },
    );
  });
};

export default { getUserChats };
