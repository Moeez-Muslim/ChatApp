import React, { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import PropTypes from 'prop-types';
import './ChatWindow.css';

export default function ChatWindow({ phone, contact, socket }) {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const messagesEndRef = useRef(null);

  // Load history + live updates
  useEffect(() => {
    if (!contact) return;
    axios
      .get(`http://localhost:5000/chats/${contact}?phone=${phone}`)
      .then(res => setMessages(res.data.chat))
      .catch(console.error);
  }, [contact, phone]);

  useEffect(() => {
    if (!socket) return;
    const handler = msg => {
      if (
        (msg.from === contact && msg.to === phone) ||
        (msg.from === phone && msg.to === contact)
      ) {
        setMessages(prev => [...prev, msg]);
      }
    };
    socket.on('receiveMessage', handler);
    return () => socket.off('receiveMessage', handler);
  }, [socket, contact, phone]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    socket.emit('sendMessage', { from: phone, to: contact, text: trimmed });
    setMessages(prev => [...prev, { id: Date.now(), from: phone, to: contact, text: trimmed, timestamp: Date.now() }]);
    setText('');
  };

  if (!contact) {
    return <div className="no-chat">Select a contact to start chatting</div>;
  }

  return (
    <div className="chat-window">
      <div className="chat-header">{contact}</div>
      <div className="chat-messages">
        {messages.map(msg => {
          const isSent = msg.from === phone;
          return (
            <div
              key={msg.id}
              className={isSent ? 'message-row sent' : 'message-row received'}
            >
              <div className="message-bubble">
                <p className="message-text">{msg.text}</p>
                <span className="timestamp">
                  {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>
      <div className="chat-input">
        <input
          type="text"
          placeholder="Type a message"
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && sendMessage()}
        />
        <button onClick={sendMessage}>Send</button>
      </div>
    </div>
  );
}

ChatWindow.propTypes = {
  phone: PropTypes.string.isRequired,
  contact: PropTypes.string,
  socket: PropTypes.object.isRequired
};
