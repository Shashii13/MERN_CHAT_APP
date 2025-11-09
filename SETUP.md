# Quick Setup Guide

## Backend Setup

1. **Navigate to server directory:**
   ```bash
   cd server
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Create `.env` file:**
   Create a file named `.env` in the `server` directory with the following content:
   ```
   PORT=3000
   MONGODB_URI=mongodb://localhost:27017/chat_app
   JWT_SECRET=your_secret_jwt_key_here_change_in_production
   NODE_ENV=development
   ```

   **Important:** Change `JWT_SECRET` to a random string in production!

4. **Start MongoDB:**
   - If using local MongoDB: Make sure MongoDB is running
   - If using MongoDB Atlas: Update `MONGODB_URI` with your connection string

5. **Start the server:**
   ```bash
   npm start
   # or for development:
   npm run dev
   ```

## Mobile App Setup

1. **Navigate to mobile directory:**
   ```bash
   cd mobile
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Update API URLs:**
   - Edit `src/services/api.js` and update `API_BASE_URL`
   - Edit `src/services/socket.js` and update the socket URL
   
   **URLs by platform:**
   - iOS Simulator: `http://localhost:3000`
   - Android Emulator: `http://10.0.2.2:3000`
   - Physical Device: `http://YOUR_COMPUTER_IP:3000` (find IP with `ipconfig` on Windows or `ifconfig` on Mac/Linux)

4. **Start Expo:**
   ```bash
   npm start
   ```

5. **Run on device:**
   - Scan QR code with Expo Go app (iOS/Android)
   - Press `i` for iOS simulator
   - Press `a` for Android emulator

## Testing

1. Start the backend server
2. Start the mobile app
3. Register a user
4. Register another user (or use a different device)
5. Login with both users
6. Start chatting!

## Troubleshooting

### Cannot connect to server
- Check that server is running on port 3000
- Verify API URL in mobile app matches your setup
- Check firewall settings
- For physical devices, ensure same WiFi network

### MongoDB connection errors
- Verify MongoDB is running
- Check `MONGODB_URI` in `.env` file
- For MongoDB Atlas, whitelist your IP address

### Socket.IO connection issues
- Check CORS settings in server
- Verify token is being sent correctly
- Check server logs for errors

