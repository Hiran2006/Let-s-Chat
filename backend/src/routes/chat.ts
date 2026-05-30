import { Router } from "express";
import { authenticate } from "../lib/authMiddleware.js";
import type { AuthenticatedRequest } from "../lib/authMiddleware.js";
import { chats, users } from "../lib/db/index.js";

const router = Router();

// Apply authentication middleware
router.use(authenticate);

// Get list of chats for the current user
router.get("/", async (req: AuthenticatedRequest, res): Promise<any> => {
  try {
    const userId = req.user!.id;
    const userChats = await chats.getUserChats(userId);

    const processedChats = await Promise.all(
      userChats.map(async (chat) => {
        const members = await chats.getChatMembers(chat.id);

        let chatName = chat.name;
        if (chat.type === "private") {
          const otherMember = members.find((m) => m.id !== userId);
          chatName = otherMember ? otherMember.name : "Saved Messages";
        }

        const gradients = [
          "from-cyan-500 to-blue-600",
          "from-pink-500 to-rose-600",
          "from-violet-500 to-indigo-600",
          "from-amber-500 to-orange-600",
          "from-emerald-500 to-teal-600",
          "from-purple-500 to-fuchsia-600",
        ];
        // Determinstically pick avatar gradient based on chat ID
        const avatarGradient =
          gradients[chat.id % gradients.length] || gradients[0];

        return {
          id: chat.id.toString(),
          type: chat.type,
          name: chatName,
          created_at: chat.created_at,
          lastMessage: chat.lastMessage || "No messages yet.",
          timestamp: chat.lastMessageTime
            ? new Date(chat.lastMessageTime).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })
            : new Date(chat.created_at).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              }),
          unreadCount: 0,
          avatarGradient,
          members,
        };
      })
    );

    res.json({ success: true, chats: processedChats });
  } catch (error) {
    console.error("Get chats error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch chats" });
  }
});

// Get messages of a specific chat
router.get("/:chatId/messages", async (req: AuthenticatedRequest, res): Promise<any> => {
  try {
    const chatId = parseInt(req.params.chatId as string);
    if (isNaN(chatId)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid chat ID" });
    }

    const members = await chats.getChatMembers(chatId);
    const isMember = members.some((m) => m.id === req.user!.id);
    if (!isMember) {
      return res
        .status(403)
        .json({ success: false, message: "Not authorized to view this chat" });
    }

    const messages = await chats.getChatMessages(chatId);

    const processedMessages = messages.map((msg) => {
      let formattedTime = "";
      try {
        formattedTime = new Date(msg.timestamp).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        });
      } catch {
        formattedTime = msg.timestamp;
      }

      return {
        id: msg.id.toString(),
        sender: msg.sender,
        senderName: msg.senderName,
        text: msg.text,
        timestamp: formattedTime,
        isSelf: msg.sender === req.user!.email,
      };
    });

    res.json({ success: true, messages: processedMessages });
  } catch (error) {
    console.error("Get messages error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch messages" });
  }
});

// Create a new chat
router.post("/", async (req: AuthenticatedRequest, res): Promise<any> => {
  try {
    const { type, name, memberEmails } = req.body;
    if (
      !type ||
      !memberEmails ||
      !Array.isArray(memberEmails) ||
      memberEmails.length === 0
    ) {
      return res
        .status(400)
        .json({ success: false, message: "Type and memberEmails are required" });
    }

    const creatorId = req.user!.id;

    // Resolve emails to user objects
    const resolvedMembers = await Promise.all(
      memberEmails.map(async (email) => {
        return await users.getUserByEmail(email);
      })
    );

    const validMembers = resolvedMembers.filter(Boolean);
    if (validMembers.length === 0) {
      return res
        .status(400)
        .json({ success: false, message: "No valid users found for emails" });
    }

    const memberIds = Array.from(
      new Set([creatorId, ...validMembers.map((m) => m.id)])
    );

    // If private chat, check if a private chat already exists
    if (type === "private" && validMembers.length === 1) {
      const otherUserId = validMembers[0].id;
      const creatorChats = await chats.getUserChats(creatorId);

      for (const chat of creatorChats) {
        if (chat.type === "private") {
          const members = await chats.getChatMembers(chat.id);
          const hasOtherUser = members.some((m) => m.id === otherUserId);
          if (hasOtherUser) {
            return res.json({
              success: true,
              chatId: chat.id.toString(),
              alreadyExists: true,
              chatName: validMembers[0].name,
            });
          }
        }
      }
    }

    const newChatName = type === "group" ? name || "Group Chat" : null;
    const chatId = await chats.createChat(type, newChatName, memberIds);

    res.status(201).json({ success: true, chatId: chatId.toString() });
  } catch (error) {
    console.error("Create chat error:", error);
    res.status(500).json({ success: false, message: "Failed to create chat" });
  }
});

// List all users to start chat with
router.get("/users", async (req: AuthenticatedRequest, res): Promise<any> => {
  try {
    const allUsers = await users.getAllUsers();
    const otherUsers = allUsers.filter((u) => u.id !== req.user!.id);
    res.json({ success: true, users: otherUsers });
  } catch (error) {
    console.error("Get users error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch users" });
  }
});

export default router;
