// src/components/NewChatModal.js
import React, { useState } from 'react';
import axios from 'axios';
import PropTypes from 'prop-types';

export default function NewChatModal({ show, phone, onClose, onAdd }) {
  const [number, setNumber] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async e => {
    e.preventDefault();
    const trimmed = number.trim();
    if (!trimmed) {
      setError('Please enter a phone number');
      return;
    }

    try {
      // Try to start a chat on the backend
      await axios.post('http://localhost:5000/chats', {
        phone, 
        contact: trimmed
      });

      // If successful, tell parent to add to contacts
      onAdd(trimmed);

      // Reset & close
      setNumber('');
      setError('');
      onClose();
    } catch (err) {
      console.error(err);
      // Show backend error (e.g. 404 “Contact not found”) or network issues
      const msg = err.response?.data?.error || 'Failed to start chat';
      setError(msg);
    }
  };

  if (!show) return null;
  return (
    <>
      <div className="modal d-block" tabIndex="-1">
        <div className="modal-dialog">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">New Chat</h5>
              <button
                type="button"
                className="btn-close"
                aria-label="Close"
                onClick={() => {
                  setError('');
                  onClose();
                }}
              />
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <label htmlFor="newContact" className="form-label">
                  Phone Number
                </label>
                <input
                  id="newContact"
                  type="text"
                  className="form-control"
                  value={number}
                  onChange={e => setNumber(e.target.value)}
                  placeholder="Enter phone number"
                />
                {error && <div className="text-danger mt-2">{error}</div>}
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setError('');
                    onClose();
                  }}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Start Chat
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
      <div className="modal-backdrop fade show" />
    </>
  );
}

NewChatModal.propTypes = {
  show: PropTypes.bool.isRequired,
  phone: PropTypes.string.isRequired,
  onClose: PropTypes.func.isRequired,
  onAdd: PropTypes.func.isRequired,
};
