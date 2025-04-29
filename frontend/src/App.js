import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';
import Login from './components/Login';
import ContactsList from './components/ContactsList';
import ChatWindow from './components/ChatWindow';
import NewChatModal from './components/NewChatModal';
import './App.css';

const socket = io('http://localhost:5000', {
  withCredentials: true
});

function App() {
  const [phone, setPhone] = useState(null);
  const [contacts, setContacts] = useState([]);
  const [selectedContact, setSelectedContact] = useState(null);
  const [showNewChat, setShowNewChat] = useState(false);

  // ── JOIN ROOM EFFECT ───────────────────────────────────
  // Always call the hook; bail out early if no phone yet.
  useEffect(() => {
    if (!phone) return;

    // 1) immediately join your room on first login
    socket.emit('login', { phone });

    // 2) re-join on any future reconnect
    const handleConnect = () => {
      socket.emit('login', { phone });
    };
    socket.on('connect', handleConnect);

    // cleanup
    return () => {
      socket.off('connect', handleConnect);
    };
  }, [phone]);  // <–– only depend on `phone`

  // ── REAL-TIME CONTACTS UPDATE ──────────────────────────
  useEffect(() => {
    if (!phone) return;

    const onReceive = msg => {
      const other = msg.from === phone ? msg.to : msg.from;
      setContacts(prev =>
        prev.includes(other) ? prev : [...prev, other]
      );
    };

    socket.on('receiveMessage', onReceive);
    return () => {
      socket.off('receiveMessage', onReceive);
    };
  }, [phone]);  // no need to depend on `socket` here either

  // ── LOGIN FLOW ─────────────────────────────────────────
  const handleLogin = ({ phone: userPhone, contacts }) => {
    setPhone(userPhone);
    setContacts(contacts);
  };

  // Before logging in, show the Login screen
  if (!phone) {
    return <Login socket={socket} onLogin={handleLogin} />;
  }

  // add a new contact manually
  const handleAddContact = number => {
    if (!contacts.includes(number)) {
      setContacts(prev => [...prev, number]);
    }
    setShowNewChat(false);
  };


  return (
    <div className="app d-flex">
      <div className="sidebar">
        <div className="d-flex align-items-center justify-content-between p-2 border-bottom">
          <h5 className="m-0">Chats</h5>
          <button
            className="btn btn-sm btn-success"
            onClick={() => setShowNewChat(true)}
          >
            New Chat
          </button>
        </div>
        <ContactsList
          contacts={contacts}
          selected={selectedContact}
          onSelect={setSelectedContact}
        />
      </div>

      <ChatWindow
        phone={phone}
        contact={selectedContact}
        socket={socket}
      />

    <NewChatModal
     show={showNewChat}
    phone={phone}            // ← pass the logged-in user’s phone
     onClose={() => setShowNewChat(false)}
     onAdd={handleAddContact}
   />

    </div>
  );
}

export default App;
