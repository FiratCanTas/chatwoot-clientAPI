import React, { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import axios from 'axios';

const ChatwootChat = () => {
  const [content, setContent] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [status, setStatus] = useState('Send Message:');
  const [socket, setSocket] = useState(null);
  const inboxIdentifier = 'VHSzin56Hodyxx9B8VuDZiu2';
  let contactIdentifier = '';
  let contactPubsubToken = '';
  let contactConversation = '';

  useEffect(() => {
    const setUpContact = async () => {
      try {
        const response = await axios.post(`http://localhost:3000/public/api/v1/inboxes/${inboxIdentifier}/contacts`);
        contactPubsubToken = response.data.pubsub_token;
        contactIdentifier = response.data.source_id;
      } catch (error) {
        console.log('Contact setup error:', error);
      }
    };

    const setUpConversation = async () => {
      try {
        const response = await axios.post(`http://localhost:3000/public/api/v1/inboxes/${inboxIdentifier}/contacts/${contactIdentifier}/conversations`);
        contactConversation = response.data.id;
      } catch (error) {
        console.log('Conversation setup error:', error);
      }
    };

    const connectToChatwoot = () => {
      const socket = io('http://localhost:3000');
      setSocket(socket);

      socket.on('connect', () => {
        const subscriptionParams = {
          channel: 'RoomChannel',
          pubsub_token: contactPubsubToken,
        };
        const subscription = {
          command: 'subscribe',
          identifier: JSON.stringify(subscriptionParams),
        };
        socket.send(JSON.stringify(subscription));
        setStatus('Send Message:');
      });

      socket.on('message', (message) => {
        const json = JSON.parse(message);
        if (json.type === 'welcome' || json.type === 'ping' || json.type === 'confirm_subscription') {
          return;
        } else if (json.message && json.message.event === 'message.created') {
          const { name, content } = json.message.data.sender;
          addMessage(name, content);
        } else {
          console.log('Unknown JSON:', json);
        }
      });

      socket.on('error', (error) => {
        console.log('WebSocket connection error:', error);
      });
    };

    setUpContact()
      .then(setUpConversation)
      .then(connectToChatwoot)
      .catch((error) => {
        console.log('Setup error:', error);
      });

    return () => {
      if (socket) {
        socket.close();
      }
    };
  }, []);

  const addMessage = (author, message) => {
    setContent((prevContent) => [...prevContent, { author, message }]);
  };

  const sendMessage = () => {
    if (!inputValue) {
      return;
    }

    const message = { content: inputValue };
    axios.post(`http://localhost:3000/public/api/v1/inboxes/${inboxIdentifier}/contacts/${contactIdentifier}/conversations/${contactConversation}/messages`, message)
      .then(() => {
        addMessage('me', inputValue);
        setInputValue('');
      })
      .catch((error) => {
        console.log('Message sending error:', error);
      });
  };

  const handleInputChange = (event) => {
    setInputValue(event.target.value);
  };

  return (
    <div>
      <div id="content">
        {content.map((item, index) => (
          <p key={index}>
            <span>{item.author}</span> @: {item.message}
          </p>
        ))}
      </div>
      <div>
        <input type="text" value={inputValue} onChange={handleInputChange} />
        <button onClick={sendMessage}>Send</button>
      </div>
      <div id="status">{status}</div>
    </div>
  );
};

export default ChatwootChat;
