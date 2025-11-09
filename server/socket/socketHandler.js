const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Message = require('../models/Message');

// Store active users and their socket connections
const activeUsers = new Map(); // userId -> socketId
const typingUsers = new Map(); // conversationId -> Set of userIds

const socketHandler = (io) => {
  // Authentication middleware for socket
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) {
        return next(new Error('Authentication error'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_secret_jwt_key_here');
      const user = await User.findById(decoded.userId);
      
      if (!user) {
        return next(new Error('User not found'));
      }

      socket.userId = user._id.toString();
      socket.username = user.username;
      next();
    } catch (error) {
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', async (socket) => {
    console.log(`User connected: ${socket.username} (${socket.userId})`);

    // Add user to active users
    activeUsers.set(socket.userId, socket.id);
    
    // Update user online status
    await User.findByIdAndUpdate(socket.userId, {
      isOnline: true,
      lastSeen: new Date()
    });

    // Emit online status to all connected clients
    io.emit('user:online', { userId: socket.userId });

    // Join user's personal room
    socket.join(`user:${socket.userId}`);

    // Handle sending messages
    socket.on('message:send', async (data) => {
      try {
        const { receiverId, content } = data;

        if (!receiverId || !content) {
          return socket.emit('error', { message: 'Receiver ID and content are required' });
        }

        // Generate conversation ID
        const userIds = [socket.userId, receiverId].sort();
        const conversationId = userIds.join('_');

        // Create message
        const message = new Message({
          conversationId,
          senderId: socket.userId,
          receiverId,
          content,
          isRead: false
        });

        await message.save();

        // Populate sender info
        await message.populate('senderId', 'username');

        // Emit to receiver
        const receiverSocketId = activeUsers.get(receiverId);
        if (receiverSocketId) {
          io.to(receiverSocketId).emit('message:new', message);
        }

        // Also emit back to sender for confirmation (replace optimistic message)
        socket.emit('message:sent', message);
      } catch (error) {
        socket.emit('error', { message: error.message });
      }
    });

    // Handle typing indicators
    socket.on('typing:start', (data) => {
      const { receiverId } = data;
      const userIds = [socket.userId, receiverId].sort();
      const conversationId = userIds.join('_');

      if (!typingUsers.has(conversationId)) {
        typingUsers.set(conversationId, new Set());
      }
      typingUsers.get(conversationId).add(socket.userId);

      const receiverSocketId = activeUsers.get(receiverId);
      if (receiverSocketId) {
        io.to(receiverSocketId).emit('typing:start', {
          userId: socket.userId,
          username: socket.username
        });
      }
    });

    socket.on('typing:stop', (data) => {
      const { receiverId } = data;
      const userIds = [socket.userId, receiverId].sort();
      const conversationId = userIds.join('_');

      if (typingUsers.has(conversationId)) {
        typingUsers.get(conversationId).delete(socket.userId);
        if (typingUsers.get(conversationId).size === 0) {
          typingUsers.delete(conversationId);
        }
      }

      const receiverSocketId = activeUsers.get(receiverId);
      if (receiverSocketId) {
        io.to(receiverSocketId).emit('typing:stop', {
          userId: socket.userId
        });
      }
    });

    // Handle message read receipts
    socket.on('message:read', async (data) => {
      try {
        const { messageId, senderId } = data;

        // Mark message as read
        const message = await Message.findById(messageId);
        if (message) {
          const receiverId = message.receiverId.toString();
          const messageSenderId = message.senderId.toString();
          
          // Verify that the current user is the receiver and the sender matches
          if (receiverId === socket.userId && messageSenderId === senderId) {
            message.isRead = true;
            message.readAt = new Date();
            await message.save();

            // Notify sender
            const senderSocketId = activeUsers.get(senderId);
            if (senderSocketId) {
              io.to(senderSocketId).emit('message:read', {
                messageId: message._id.toString(),
                readBy: socket.userId,
                readAt: message.readAt
              });
            }
          }
        }
      } catch (error) {
        socket.emit('error', { message: error.message });
      }
    });

    // Handle disconnect
    socket.on('disconnect', async () => {
      console.log(`User disconnected: ${socket.username} (${socket.userId})`);
      
      // Remove from active users
      activeUsers.delete(socket.userId);

      // Update user offline status
      await User.findByIdAndUpdate(socket.userId, {
        isOnline: false,
        lastSeen: new Date()
      });

      // Remove from typing indicators
      for (const [conversationId, userIds] of typingUsers.entries()) {
        if (userIds.has(socket.userId)) {
          userIds.delete(socket.userId);
          if (userIds.size === 0) {
            typingUsers.delete(conversationId);
          }
        }
      }

      // Emit offline status to all connected clients
      io.emit('user:offline', { userId: socket.userId });
    });
  });
};

module.exports = socketHandler;

