# Real-Time Chat Application

A real-time 1:1 chat application built with React Native (Expo) and Node.js (Express + Socket.IO), with MongoDB for data persistence.

## Features

- ✅ User authentication (Register/Login with JWT)
- ✅ User list with online/offline status
- ✅ Real-time messaging using Socket.IO
- ✅ Message persistence in MongoDB
- ✅ Typing indicators
- ✅ Online/offline status
- ✅ Message delivery and read receipts
- ✅ Beautiful and modern UI

## Project Structure

```
chat_app/
├── server/          # Node.js backend
│   ├── models/      # MongoDB models
│   ├── routes/      # API routes
│   ├── socket/      # Socket.IO handlers
│   └── middleware/  # Auth middleware
├── mobile/          # React Native frontend
│   ├── src/
│   │   ├── screens/ # App screens
│   │   ├── context/ # React context
│   │   └── services/# API and Socket services
└── README.md
```

## Prerequisites

- Node.js (v14 or higher)
- MongoDB (local installation or MongoDB Atlas)
- Expo CLI (for mobile app)
- npm or yarn

## Setup Instructions

### Backend Setup

1. Navigate to the server directory:
```bash
cd server
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the `server` directory:
```env
PORT=3000
MONGODB_URI=mongodb://localhost:27017/chat_app
JWT_SECRET=your_secret_jwt_key_here_change_in_production
NODE_ENV=development
```

4. Make sure MongoDB is running on your system, or update `MONGODB_URI` to point to your MongoDB instance (e.g., MongoDB Atlas connection string).

5. Start the server:
```bash
npm start
# or for development with auto-reload:
npm run dev
```

The server will run on `http://localhost:3000`

### Mobile App Setup

1. Navigate to the mobile directory:
```bash
cd mobile
```

2. Install dependencies:
```bash
npm install
```

3. Update the API base URL in `src/services/api.js`:
```javascript
const API_BASE_URL = 'http://localhost:3000'; // Change to your server URL
```

   **Note:** For physical devices or emulators:
   - Android Emulator: Use `http://10.0.2.2:3000`
   - iOS Simulator: Use `http://localhost:3000`
   - Physical Device: Use your computer's local IP address (e.g., `http://192.168.1.100:3000`)

4. Update the Socket.IO URL in `src/services/socket.js` with the same URL.

5. Start the Expo development server:
```bash
npm start
```

6. Scan the QR code with the Expo Go app (iOS/Android) or press `i` for iOS simulator / `a` for Android emulator.

## Environment Variables

### Backend (.env)

- `PORT`: Server port (default: 3000)
- `MONGODB_URI`: MongoDB connection string
- `JWT_SECRET`: Secret key for JWT token signing (change in production!)
- `NODE_ENV`: Environment (development/production)

## API Endpoints

### Authentication
- `POST /auth/register` - Register a new user
  - Body: `{ username, email, password }`
- `POST /auth/login` - Login user
  - Body: `{ email, password }`

### Users
- `GET /users` - Get all users (requires authentication)
  - Headers: `Authorization: Bearer <token>`

### Messages
- `GET /conversations/:id/messages` - Get messages for a conversation
  - Headers: `Authorization: Bearer <token>`
  - Conversation ID format: `userId1_userId2` (sorted)

## Socket.IO Events

### Client → Server
- `message:send` - Send a new message
  - Data: `{ receiverId, content }`
- `typing:start` - Start typing indicator
  - Data: `{ receiverId }`
- `typing:stop` - Stop typing indicator
  - Data: `{ receiverId }`
- `message:read` - Mark message as read
  - Data: `{ messageId, senderId }`

### Server → Client
- `message:new` - Receive a new message
- `message:sent` - Confirmation of sent message
- `message:read` - Message read receipt
- `typing:start` - User started typing
- `typing:stop` - User stopped typing
- `user:online` - User came online
- `user:offline` - User went offline

## Sample Users

You can register users through the app, or create them directly in MongoDB:

```javascript
// Example user document
{
  "username": "john_doe",
  "email": "john@example.com",
  "password": "$2a$10$...", // Hashed password
  "isOnline": false,
  "lastSeen": "2024-01-01T00:00:00.000Z"
}
```

## Testing the Application

1. Start the backend server
2. Start the mobile app
3. Register two users (or use different devices/emulators)
4. Login with both users
5. Start a chat between them
6. Test features:
   - Send messages
   - Typing indicators
   - Online/offline status
   - Read receipts

## Troubleshooting

### Connection Issues
- Make sure the backend server is running
- Check that the API URL in the mobile app matches your server URL
- For physical devices, ensure they're on the same network as your computer
- Check firewall settings

### MongoDB Connection
- Ensure MongoDB is running
- Verify the `MONGODB_URI` in `.env` is correct
- For MongoDB Atlas, whitelist your IP address

### Socket.IO Issues
- Check that CORS is properly configured
- Verify the token is being sent in socket authentication
- Check server logs for authentication errors

## Production Deployment

### Backend
- Use a production-grade MongoDB (MongoDB Atlas recommended)
- Set a strong `JWT_SECRET`
- Use environment variables for all sensitive data
- Enable HTTPS
- Configure proper CORS settings
- Use a process manager like PM2

### Mobile App
- Build standalone apps using Expo EAS Build
- Update API URLs to production server
- Configure app.json for production
- Test on both iOS and Android devices

## License

ISC

## Author

Built as an MVP for real-time chat application.

