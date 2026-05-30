import { Server as SocketIOServer, Socket } from "socket.io";
import { Server as HTTPServer } from "http";
import { verifyJwt } from "./lib/jwt.js";
import ENV from "./ENV.js";
import { users, chats } from "./lib/db/index.js";

const userSockets = new Map<number, Set<string>>();

const parseCookies = (cookieString?: string) => {
  const list: Record<string, string> = {};
  if (!cookieString) return list;
  cookieString.split(";").forEach((cookie) => {
    const parts = cookie.split("=");
    list[parts.shift()!.trim()] = decodeURI(parts.join("="));
  });
  return list;
};

export const initSocket = (server: HTTPServer) => {
  const io = new SocketIOServer(server, {
    cors: {
      origin: ["http://localhost:5173", "http://127.0.0.1:5173"],
      methods: ["GET", "POST"],
      credentials: true,
    },
  });

  // Socket authentication middleware
  io.use(async (socket: Socket, next) => {
    try {
      let token = socket.handshake.auth?.token;

      if (!token) {
        const cookies = parseCookies(socket.handshake.headers.cookie);
        token = cookies.authToken;
      }

      if (!token) {
        return next(new Error("Authentication error: No token provided"));
      }

      let decoded: any = verifyJwt(token, ENV.JWT_ACCESS_SECRET_KEY);
      if (!decoded) {
        decoded = verifyJwt(token, " ");
      }

      if (!decoded || !decoded.email) {
        return next(new Error("Authentication error: Invalid token"));
      }

      const user = await users.getUserByEmail(decoded.email);
      if (!user) {
        return next(new Error("Authentication error: User not found"));
      }

      socket.data.user = {
        id: user.id,
        email: user.email,
        name: user.name,
      };

      next();
    } catch (error) {
      console.error("Socket authentication error:", error);
      next(new Error("Authentication error: Internal server error"));
    }
  });

  io.on("connection", async (socket: Socket) => {
    const user = socket.data.user;
    console.log(`User connected to socket: ${user.name} (${user.email})`);

    if (!userSockets.has(user.id)) {
      userSockets.set(user.id, new Set());
    }
    userSockets.get(user.id)!.add(socket.id);

    // Join user-specific room
    socket.join(`user_${user.id}`);

    // Join all chat rooms
    try {
      const userChats = await chats.getUserChats(user.id);
      for (const chat of userChats) {
        socket.join(`chat_${chat.id}`);
        console.log(`User ${user.name} automatically joined room: chat_${chat.id}`);
      }
    } catch (err) {
      console.error("Error joining user rooms on connection:", err);
    }

    // Handle manual chat join (e.g. after dynamic chat creation)
    socket.on("join_chat", (data: { chatId: string }) => {
      if (data.chatId) {
        socket.join(`chat_${data.chatId}`);
        console.log(`User ${user.name} manually joined room: chat_${data.chatId}`);
      }
    });

    // Handle sending a message
    socket.on("send_message", async (data: { chatId: string; text: string }) => {
      try {
        const { chatId, text } = data;
        if (!chatId || !text || !text.trim()) return;

        const parsedChatId = parseInt(chatId);
        if (isNaN(parsedChatId)) return;

        const members = await chats.getChatMembers(parsedChatId);
        const isMember = members.some((m) => m.id === user.id);
        if (!isMember) {
          socket.emit("error_msg", { message: "Not authorized to send to this chat" });
          return;
        }

        const savedMessage = await chats.createMessage(parsedChatId, user.id, text.trim());
        
        let formattedTime = "";
        try {
          formattedTime = new Date(savedMessage.timestamp).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          });
        } catch {
          formattedTime = savedMessage.timestamp;
        }

        const formattedMsg = {
          id: savedMessage.id.toString(),
          chatId: parsedChatId.toString(),
          sender: savedMessage.sender,
          senderName: savedMessage.senderName,
          text: savedMessage.text,
          timestamp: formattedTime,
        };

        // Broadcast new message to the room
        io.to(`chat_${parsedChatId}`).emit("new_message", formattedMsg);

        // Broadcast sidebar update to participants
        members.forEach((member) => {
          io.to(`user_${member.id}`).emit("chat_update", {
            chatId: parsedChatId.toString(),
            lastMessage: text.trim(),
            timestamp: formattedTime,
          });
        });

      } catch (err) {
        console.error("Socket message sending error:", err);
        socket.emit("error_msg", { message: "Failed to send message" });
      }
    });

    // Handle new chat created event to alert members to fetch it
    socket.on("chat_created", (data: { chatId: string; memberIds: number[] }) => {
      const { chatId, memberIds } = data;
      if (!chatId || !memberIds) return;

      memberIds.forEach((memberId) => {
        io.to(`user_${memberId}`).emit("new_chat_notification", { chatId });
      });
    });

    socket.on("disconnect", () => {
      console.log(`User disconnected from socket: ${user.name}`);
      const sockets = userSockets.get(user.id);
      if (sockets) {
        sockets.delete(socket.id);
        if (sockets.size === 0) {
          userSockets.delete(user.id);
        }
      }
    });
  });

  return io;
};
