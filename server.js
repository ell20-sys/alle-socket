// import express from "express";
// import { createRequestHandler } from "@remix-run/express";
// import http from "http";
// import { Server as SocketIOServer } from "socket.io";
// import CryptoJS from "crypto-js";

// const app = express();

// const server = http.createServer(app);

// // Initializing Socket.IO and attaching it to the HTTP server
// const io = new SocketIOServer(server, {
//   cors: { origin: "*" }, 
// });

// const SECRET_KEY = process.env.SOCKET_SERVER_KEY || "super-secret-key";

// let waitingRooms = {
//   seeker: null,
//   helper: null,
// };

// let activeChats = {};

// io.on("connection", (socket) => {
//   console.log("Socket connected:", socket.id);

//   socket.on("join", (role) => {
//     if (role !== "seeker" && role !== "helper") {
//       socket.emit("error", "Invalid role");
//       return;
//     }

//     const oppositeRole = role === "seeker" ? "helper" : "seeker";

//     if (waitingRooms[oppositeRole]) {
//       // Found a match!
//       const roomId = waitingRooms[oppositeRole].roomId;
//       waitingRooms[oppositeRole] = null;
//       socket.join(roomId);
//       io.to(roomId).emit("matched", roomId);

//       if (!activeChats[roomId]) activeChats[roomId] = [];

//       // Notify both users
//       socket.emit("chatJoined", { roomId, role });
//       io.in(roomId).emit("chatJoined", { roomId });
//       console.log(`Matched ${role} with ${oppositeRole} in room ${roomId}`);
//     } else {
//       // No match yet; create a room and wait.
//       const roomId = `room-${Date.now()}-${socket.id}`;
//       socket.join(roomId);
//       waitingRooms[role] = { roomId, socketId: socket.id };
//       activeChats[roomId] = [];
//       socket.emit("waiting", roomId);
//       console.log(`No match found. ${role} waiting in room ${roomId}`);
//     }
//   });

//   socket.on("message", ({ roomId, message, username }) => {
//     const encryptedText = CryptoJS.AES.encrypt(message, SECRET_KEY).toString();
//     const chatMessage = { id: Date.now(), text: encryptedText, username };

//     if (activeChats[roomId]) {
//       activeChats[roomId].push(chatMessage);
//     } else {
//       activeChats[roomId] = [chatMessage];
//     }

//     // Broadcast the message to the room
//     io.to(roomId).emit("message", chatMessage);

//     // Schedule deletion after 30 seconds
//     setTimeout(() => {
//       if (activeChats[roomId]) {
//         activeChats[roomId] = activeChats[roomId].filter((msg) => msg.id !== chatMessage.id);
//         io.to(roomId).emit("deleteMessage", chatMessage.id);
//       }
//     }, 30000);
//   });

//   socket.on("disconnect", () => {
//     console.log("Socket disconnected:", socket.id);
//     if (waitingRooms.seeker && waitingRooms.seeker.socketId === socket.id) {
//       waitingRooms.seeker = null;
//     }
//     if (waitingRooms.helper && waitingRooms.helper.socketId === socket.id) {
//       waitingRooms.helper = null;
//     }
//   });
// });

// // Remix handling all other HTTP requests.
// app.all(
//   "*",
//   createRequestHandler({
//     getLoadContext() {
//       return {};
//     },
//   })
// );

// const PORT = process.env.PORT || 5000;

// server.listen(PORT, () => {
//   console.log(`Server is running on port ${PORT}`);
// });


import http from "http";
import { Server as SocketIOServer } from "socket.io";
import CryptoJS from "crypto-js";

const SECRET_KEY = process.env.SOCKET_SERVER_KEY || "super-secret-key";

// Creating an HTTP server and attaching the Socket.IO server
const server = http.createServer();
const io = new SocketIOServer(server, {
  cors: { origin: "*" },
});

let waitingRooms = {
  seeker: null,
  helper: null,
};

let activeChats = {};

io.on("connection", (socket) => {
  console.log("Socket connected:", socket.id);

  socket.on("join", (role) => {
    if (role !== "seeker" && role !== "helper") {
      socket.emit("error", "Invalid role");
      return;
    }

    const oppositeRole = role === "seeker" ? "helper" : "seeker";

    if (waitingRooms[oppositeRole]) {
      // Found a match!
      const roomId = waitingRooms[oppositeRole].roomId;
      waitingRooms[oppositeRole] = null;
      socket.join(roomId);
      io.to(roomId).emit("matched", roomId);

      if (!activeChats[roomId]) activeChats[roomId] = [];

      socket.emit("chatJoined", { roomId, role });
      io.in(roomId).emit("chatJoined", { roomId });
      console.log(`Matched ${role} with ${oppositeRole} in room ${roomId}`);
    } else {
      // No match yet; create a room and wait.
      const roomId = `room-${Date.now()}-${socket.id}`;
      socket.join(roomId);
      waitingRooms[role] = { roomId, socketId: socket.id };
      activeChats[roomId] = [];
      socket.emit("waiting", roomId);
      console.log(`No match found. ${role} waiting in room ${roomId}`);
    }
  });

  socket.on("message", ({ roomId, message, username }) => {
    const encryptedText = CryptoJS.AES.encrypt(message, SECRET_KEY).toString();
    const chatMessage = { id: Date.now(), text: encryptedText, username };

    if (activeChats[roomId]) {
      activeChats[roomId].push(chatMessage);
    } else {
      activeChats[roomId] = [chatMessage];
    }

    // Broadcast the message to the room
    io.to(roomId).emit("message", chatMessage);

    // Schedule deletion after 30 seconds
    setTimeout(() => {
      if (activeChats[roomId]) {
        activeChats[roomId] = activeChats[roomId].filter((msg) => msg.id !== chatMessage.id);
        io.to(roomId).emit("deleteMessage", chatMessage.id);
      }
    }, 30000);
  });

  socket.on("disconnect", () => {
    console.log("Socket disconnected:", socket.id);
    if (waitingRooms.seeker && waitingRooms.seeker.socketId === socket.id) {
      waitingRooms.seeker = null;
    }
    if (waitingRooms.helper && waitingRooms.helper.socketId === socket.id) {
      waitingRooms.helper = null;
    }
  });
});

const SOCKET_PORT = process.env.PORT || 3001;

server.listen(SOCKET_PORT, () => {
  console.log(`WebSocket server running on port ${SOCKET_PORT}`);
});
