const express = require('express');
const Message = require('../models/Message');
const auth = require('../middleware/auth');

const router = express.Router();

// Get messages for a conversation
router.get('/:id/messages', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const currentUserId = req.user._id.toString();

    // Validate conversation ID format (should be userId1_userId2)
    if (!id.includes('_')) {
      return res.status(400).json({ error: 'Invalid conversation ID' });
    }

    const [userId1, userId2] = id.split('_').sort();
    
    // Verify current user is part of the conversation
    if (currentUserId !== userId1 && currentUserId !== userId2) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const messages = await Message.find({
      conversationId: id
    })
    .populate('senderId', 'username')
    .sort({ createdAt: 1 })
    .limit(100); // Limit to last 100 messages

    res.json(messages);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

