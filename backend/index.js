// server.js
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path')
const cors = require('cors');


// Path to users.json file
const USERS_FILE = path.join(__dirname, 'users.json');

// Read users from file
function loadUsers() {
  if (!fs.existsSync(USERS_FILE)) {
    return {};
  }
  const data = fs.readFileSync(USERS_FILE, 'utf-8');
  return JSON.parse(data || '{}');
}

// Save users to file
function saveUsers(users) {
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}

// Load users when server starts

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
      origin: 'http://localhost:3000',
      methods: ['GET','POST'],
      credentials: true
    }
  });

// allow our React app on localhost:3000
app.use(cors({
    origin: 'http://localhost:3000',
    methods: ['GET','POST'],
    credentials: true
  }));

app.use(express.json());

// In-memory stores
// users: { [phone]: { phone, contacts: Set<phone> } }
let users = loadUsers();
// messages: { [id]: { id, from, to, text, timestamp, seen: boolean } }
const messages = {};

function ensureUser(phone) {
    if (!users[phone]) {
      users[phone] = { phone, contacts: [] };
      saveUsers(users);
    }
    return users[phone];
  }

  function addContact(userPhone, contactPhone) {
    const user = ensureUser(userPhone);
    const contact = ensureUser(contactPhone);
    if (!user.contacts.includes(contactPhone)) {
      user.contacts.push(contactPhone);
    }
    if (!contact.contacts.includes(userPhone)) {
      contact.contacts.push(userPhone);
    }
    saveUsers(users);
  }
  

// --- Socket.IO login handler (unchanged) ---
io.on('connection', socket => {
    console.log(`➤ socket connected: ${socket.id}`);
    socket.on('login', ({ phone }) => {
      socket.userPhone = phone;
      socket.join(phone);
      console.log(`  • ${socket.id} joined room ${phone}`);
      
    // emit existing contacts
    socket.emit('loginSuccess', {
      contacts: Array.from(users[phone].contacts)
    });
  });

  socket.on('sendMessage', ({ from, to, text }) => {
    addContact(from, to);
  
    const msg = {
      id: uuidv4(),
      from, to, text,
      timestamp: Date.now(),
      seen: false
    };
    messages[msg.id] = msg;
  
    // ACK back to sender (optional)
    socket.emit('messageSent', msg);
  
    // *Emit* to the 'to' room (and even back to the sender’s room if you like)
    io.to(to).emit('receiveMessage', msg);
  });
  
  
  socket.on('disconnect', () => {
    // nothing special
  });
});

// --- REST endpoints ---

// 1. List all registered users (for NewChatModal)
app.get('/users', (req, res) => {
    // just return array of phone strings
    res.json({ users: Object.keys(users) });
  });
  
// 1. Get all contacts for a user
// GET /contacts?phone=1234567890
app.get('/contacts', (req, res) => {
  const phone = req.query.phone;
  if (!phone || !users[phone]) {
    return res.status(404).json({ error: 'User not found' });
  }
  res.json({ contacts: Array.from(users[phone].contacts) });
});

// 2. Get chat history between user and a contact
// GET /chats/:contact?phone=1234567890
app.get('/chats/:contact', (req, res) => {
  const phone = req.query.phone;
  const contact = req.params.contact;
  if (!phone || !users[phone]) {
    return res.status(404).json({ error: 'User not found' });
  }
  // Filter messages between the two
  const chat = Object.values(messages)
    .filter(m =>
      (m.from === phone && m.to === contact) ||
      (m.from === contact && m.to === phone)
    )
    .sort((a, b) => a.timestamp - b.timestamp);
  res.json({ chat });
});

// 3. Send a message via REST
// POST /messages
app.post('/messages', (req, res) => {
    const { from, to, text } = req.body;
    if (!from || !to || !text) {
      return res.status(400).json({ error: 'Missing fields' });
    }
  
    // Update contacts
    addContact(from, to); // <<<<<< Correct usage
  
    const msg = {
      id: uuidv4(),
      from, to, text,
      timestamp: Date.now(),
      seen: false
    };
    messages[msg.id] = msg;
  
    // Emit via sockets if online
    io.to(Array.from(io.sockets.sockets)
      .find(([id, s]) => s.userPhone === to)?.[0])
      ?.emit('receiveMessage', msg);
  
    res.status(201).json(msg);
  });
  
// 4. Mark a message as seen
// POST /messages/:id/seen
// { phone: 'receiverPhone' }
app.post('/messages/:id/seen', (req, res) => {
  const msg = messages[req.params.id];
  const { phone } = req.body;
  if (!msg) {
    return res.status(404).json({ error: 'Message not found' });
  }
  if (msg.to !== phone) {
    return res.status(403).json({ error: 'Only the recipient can mark seen' });
  }
  msg.seen = true;

  // notify sender via socket (optional)
  for (let [id, s] of io.of('/').sockets) {
    if (s.userPhone === msg.from) {
      s.emit('messageSeen', { id: msg.id, by: phone });
    }
  }

  res.json({ success: true, id: msg.id });
});

// Start a new chat between two existing users
// POST /chats
app.post('/chats', (req, res) => {
    const { phone, contact } = req.body;
    if (!phone || !contact) {
      return res.status(400).json({ error: 'Missing phone or contact in body' });
    }
  
    // Verify both users exist
    if (!users[phone]) {
      return res.status(404).json({ error: `User ${phone} not found` });
    }
    if (!users[contact]) {
      return res.status(404).json({ error: `Contact ${contact} not found` });
    }
  
    // Add each to the other’s contacts
    addContact(phone, contact); // <<<<<< Correct usage
  
    // Grab any existing messages between them (probably none yet)
    const chatHistory = Object.values(messages)
      .filter(m =>
        (m.from === phone && m.to === contact) ||
        (m.from === contact && m.to === phone)
      )
      .sort((a, b) => a.timestamp - b.timestamp);
  
    return res.status(201).json({
      contacts: Array.from(users[phone].contacts),
      chat: chatHistory
    });
  });
    
// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
