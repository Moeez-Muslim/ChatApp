// src/components/ContactsList.js
import React from 'react';

export default function ContactsList({ contacts, selected, onSelect }) {
  return (
    <div className="contacts-list">
      <div className="contacts-list-header">Contacts</div>
      <ul>
        {contacts.map(contact => (
          <li
            key={contact}
            className={contact === selected ? 'selected' : ''}
            onClick={() => onSelect(contact)}
          >
            {contact}
          </li>
        ))}
      </ul>
    </div>
  );
}
