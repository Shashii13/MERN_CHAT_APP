const express = require('express');
const User = require('../models/User');
const Message = require('../models/Message');
const auth = require('../middleware/auth');

const router = express.Router();

// Get all users (except current user)
router.get('/', auth, async (req, res) => {
  try {
    const users = await User.find({ _id: { $ne: req.user._id } })
      .select('username email isOnline lastSeen createdAt')
      .sort({ username: 1 });

    // Get last message for each user
    const usersWithLastMessage = await Promise.all(
      users.map(async (user) => {
        // Generate conversation ID (sorted IDs to ensure consistency)
        const userIds = [req.user._id.toString(), user._id.toString()].sort();
        const conversationId = userIds.join('_');

        // Get last message
        const lastMessage = await Message.findOne({
          conversationId
        }).sort({ createdAt: -1 });

        return {
          id: user._id.toString(),
          username: user.username,
          email: user.email,
          isOnline: user.isOnline,
          lastSeen: user.lastSeen,
          lastMessage: lastMessage ? {
            content: lastMessage.content,
            createdAt: lastMessage.createdAt,
            senderId: lastMessage.senderId.toString()
          } : null
        };
      })
    );

    res.json(usersWithLastMessage);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

