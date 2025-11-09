import React, { useState, useEffect, useRef, useContext } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { AuthContext } from '../context/AuthContext';
import { SocketContext } from '../context/SocketContext';
import { messagesAPI } from '../services/api';

export default function ChatScreen({ route, navigation }) {
  const { otherUser, conversationId } = route.params;
  const { user } = useContext(AuthContext);
  const socket = useContext(SocketContext);

  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState('');
  const [loading, setLoading] = useState(true);
  const [isTyping, setIsTyping] = useState(false);
  const flatListRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const isUserTypingRef = useRef(false);

  useEffect(() => {
    navigation.setOptions({
      title: otherUser.username,
      headerRight: () => (
        <View style={styles.headerRight}>
          <View
            style={[
              styles.headerOnlineIndicator,
              otherUser.isOnline && styles.headerOnlineIndicatorActive,
            ]}
          />
          <Text style={styles.headerStatus}>
            {otherUser.isOnline ? 'Online' : 'Offline'}
          </Text>
        </View>
      ),
    });

    loadMessages();
    setupSocketListeners();

    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      if (socket) {
        socket.off('message:new');
        socket.off('message:sent');
        socket.off('message:read');
        socket.off('typing:start');
        socket.off('typing:stop');
        socket.off('user:online');
        socket.off('user:offline');
      }
    };
  }, []);

  useEffect(() => {
    if (messages.length > 0) {
      flatListRef.current?.scrollToEnd({ animated: true });
    }
  }, [messages]);

  const setupSocketListeners = () => {
    if (!socket) return;

    socket.on('message:new', (message) => {
      const messageSenderId = message.senderId._id || message.senderId;
      const messageReceiverId = message.receiverId._id || message.receiverId;
      
      // Check if message is for current user or from the other user in this chat
      if (
        messageSenderId === otherUser.id ||
        (messageReceiverId === user.id && messageSenderId === otherUser.id)
      ) {
        setMessages((prev) => {
          // Avoid duplicates
          if (prev.some(msg => msg._id === message._id)) {
            return prev;
          }
          return [...prev, message];
        });
        
        // Mark as read if user is viewing the chat and is the receiver
        if (messageReceiverId === user.id && messageSenderId === otherUser.id) {
          socket.emit('message:read', {
            messageId: message._id,
            senderId: messageSenderId,
          });
        }
      }
    });

    socket.on('message:sent', (message) => {
      // Replace optimistic message with server response
      setMessages((prev) => {
        // Remove any temp messages with matching content (optimistic updates)
        const withoutTemp = prev.filter(
          (msg) => !msg._id.toString().startsWith('temp_')
        );
        // Check if message already exists (shouldn't, but safety check)
        const exists = withoutTemp.some((msg) => msg._id === message._id);
        if (!exists) {
          return [...withoutTemp, message];
        }
        // If exists, replace it
        return withoutTemp.map((msg) =>
          msg._id === message._id ? message : msg
        );
      });
    });

    socket.on('message:read', (data) => {
      setMessages((prev) =>
        prev.map((msg) =>
          msg._id === data.messageId
            ? { ...msg, isRead: true, readAt: data.readAt }
            : msg
        )
      );
    });

    socket.on('typing:start', (data) => {
      if (data.userId === otherUser.id) {
        setIsTyping(true);
      }
    });

    socket.on('typing:stop', (data) => {
      if (data.userId === otherUser.id) {
        setIsTyping(false);
      }
    });

    socket.on('user:online', (data) => {
      if (data.userId === otherUser.id) {
        navigation.setOptions({
          headerRight: () => (
            <View style={styles.headerRight}>
              <View style={[styles.headerOnlineIndicator, styles.headerOnlineIndicatorActive]} />
              <Text style={styles.headerStatus}>Online</Text>
            </View>
          ),
        });
      }
    });

    socket.on('user:offline', (data) => {
      if (data.userId === otherUser.id) {
        navigation.setOptions({
          headerRight: () => (
            <View style={styles.headerRight}>
              <View style={styles.headerOnlineIndicator} />
              <Text style={styles.headerStatus}>Offline</Text>
            </View>
          ),
        });
      }
    });
  };

  const loadMessages = async () => {
    try {
      const response = await messagesAPI.getMessages(conversationId);
      setMessages(response.data);
      
      // Mark all received messages as read
      const unreadMessages = response.data.filter((msg) => {
        const msgReceiverId = msg.receiverId._id || msg.receiverId;
        const msgSenderId = msg.senderId._id || msg.senderId;
        return (
          msgReceiverId === user.id &&
          !msg.isRead &&
          msgSenderId === otherUser.id
        );
      });
      
      if (socket) {
        unreadMessages.forEach((msg) => {
          const msgSenderId = msg.senderId._id || msg.senderId;
          socket.emit('message:read', {
            messageId: msg._id,
            senderId: msgSenderId,
          });
        });
      }
    } catch (error) {
      console.error('Error loading messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSend = () => {
    if (!messageText.trim() || !socket) return;

    const message = {
      receiverId: otherUser.id,
      content: messageText.trim(),
    };

    socket.emit('message:send', message);
    setMessageText('');
    handleStopTyping();

    // Optimistically add message (will be replaced by server response)
    const tempMessage = {
      _id: `temp_${Date.now()}`,
      content: message.content,
      senderId: { _id: user.id, username: user.username },
      receiverId: otherUser.id,
      createdAt: new Date().toISOString(),
      isRead: false,
    };
    setMessages((prev) => [...prev, tempMessage]);
  };

  const handleTyping = (text) => {
    setMessageText(text);
    
    if (!isUserTypingRef.current && socket) {
      isUserTypingRef.current = true;
      socket.emit('typing:start', { receiverId: otherUser.id });
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      handleStopTyping();
    }, 1000);
  };

  const handleStopTyping = () => {
    if (isUserTypingRef.current && socket) {
      isUserTypingRef.current = false;
      socket.emit('typing:stop', { receiverId: otherUser.id });
    }
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
  };

  const formatTime = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const renderMessage = ({ item }) => {
    const senderId = item.senderId._id || item.senderId;
    const isSent = senderId === user.id;

    return (
      <View
        style={[
          styles.messageContainer,
          isSent ? styles.sentMessage : styles.receivedMessage,
        ]}
      >
        <View
          style={[
            styles.messageBubble,
            isSent ? styles.sentBubble : styles.receivedBubble,
          ]}
        >
          <Text
            style={[
              styles.messageText,
              isSent ? styles.sentText : styles.receivedText,
            ]}
          >
            {item.content}
          </Text>
          <View style={styles.messageFooter}>
            <Text
              style={[
                styles.messageTime,
                isSent ? styles.sentTime : styles.receivedTime,
              ]}
            >
              {formatTime(item.createdAt)}
            </Text>
            {isSent && (
              <Text style={styles.readIndicator}>
                {item.isRead ? '✓✓' : '✓'}
              </Text>
            )}
          </View>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={90}
    >
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item._id.toString()}
        contentContainerStyle={styles.messagesList}
        onContentSizeChange={() =>
          flatListRef.current?.scrollToEnd({ animated: true })
        }
        ListFooterComponent={
          isTyping ? (
            <View style={styles.typingContainer}>
              <Text style={styles.typingText}>{otherUser.username} is typing...</Text>
            </View>
          ) : null
        }
      />
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          value={messageText}
          onChangeText={handleTyping}
          placeholder="Type a message..."
          multiline
          maxLength={500}
        />
        <TouchableOpacity
          style={[
            styles.sendButton,
            !messageText.trim() && styles.sendButtonDisabled,
          ]}
          onPress={handleSend}
          disabled={!messageText.trim()}
        >
          <Text style={styles.sendButtonText}>Send</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 10,
  },
  headerOnlineIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ccc',
    marginRight: 5,
  },
  headerOnlineIndicatorActive: {
    backgroundColor: '#4CAF50',
  },
  headerStatus: {
    fontSize: 12,
    color: '#666',
  },
  messagesList: {
    padding: 10,
  },
  messageContainer: {
    marginBottom: 10,
  },
  sentMessage: {
    alignItems: 'flex-end',
  },
  receivedMessage: {
    alignItems: 'flex-start',
  },
  messageBubble: {
    maxWidth: '75%',
    padding: 12,
    borderRadius: 18,
  },
  sentBubble: {
    backgroundColor: '#007AFF',
    borderBottomRightRadius: 4,
  },
  receivedBubble: {
    backgroundColor: '#e0e0e0',
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 16,
    marginBottom: 4,
  },
  sentText: {
    color: '#fff',
  },
  receivedText: {
    color: '#333',
  },
  messageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  messageTime: {
    fontSize: 11,
    marginRight: 4,
  },
  sentTime: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  receivedTime: {
    color: '#999',
  },
  readIndicator: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  typingContainer: {
    padding: 10,
    alignItems: 'flex-start',
  },
  typingText: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 10,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    alignItems: 'flex-end',
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    marginRight: 10,
    maxHeight: 100,
    fontSize: 16,
  },
  sendButton: {
    backgroundColor: '#007AFF',
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 10,
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#ccc',
  },
  sendButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
});

