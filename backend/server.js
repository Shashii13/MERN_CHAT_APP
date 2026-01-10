const express = require("express");
const http = require("http");

const app = express();
const server = http.createServer(app);

// Middleware
app.use(express.json());

// Test route
app.get("/", (req, res) => {
  res.send("Chat App Server is running 🚀");
});

// Server listening
const PORT = 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
