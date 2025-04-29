// src/components/Login.js
import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';

export default function Login({ socket, onLogin }) {
  const [phone, setPhone] = useState('');
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!socket) return;

    // Handle successful login from server
    const handleLoginSuccess = ({ contacts }) => {
      onLogin({ phone: phone.trim(), contacts });
    };

    // (Optional) handle login errors from server
    const handleLoginError = ({ error }) => {
      setError(error);
    };

    socket.on('loginSuccess', handleLoginSuccess);
    socket.on('loginError', handleLoginError);

    return () => {
      socket.off('loginSuccess', handleLoginSuccess);
      socket.off('loginError', handleLoginError);
    };
  }, [socket, phone, onLogin]);

  const handleSubmit = e => {
    e.preventDefault();
    const trimmed = phone.trim();
    if (!trimmed) return;

    // Emit login request
    socket.emit('login', { phone: trimmed });
  };

  return (
    <div className="login-container">
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="Enter your phone number"
          value={phone}
          onChange={e => setPhone(e.target.value)}
        />
        <button type="submit">Login</button>
        {error && <p className="error">{error}</p>}
      </form>
    </div>
  );
}

Login.propTypes = {
  socket: PropTypes.object.isRequired,
  onLogin: PropTypes.func.isRequired,
};
