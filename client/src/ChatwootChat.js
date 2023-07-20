import React, { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import axios from 'axios';

const ChatwootChat = () => {
  const [content, setContent] = useState([]); // Mesaj içeriğini depolamak için kullanılan state
  const [inputValue, setInputValue] = useState(''); // Kullanıcının girdiği metin değeri için kullanılan state
  const [status, setStatus] = useState('Send Message:'); // Sohbet durumunu temsil eden state
  const [socket, setSocket] = useState(null); // Socket.io bağlantısını temsil eden state
  const inboxIdentifier = 'c1Qm2t1oPjaAAYgzC5vvET7B'; // Chatwoot sunucusundaki gelen kutusu kimliği
  const [contactIdentifier, setContactIdentifier] = useState(''); // Kullanıcının kimliği
  const [contactPubsubToken, setContactPubsubToken] = useState(''); // Kullanıcının pubsub tokenı
  const [contactConversation, setContactConversation] = useState(''); // Kullanıcının sohbet kimliği

  useEffect(() => {
    const setUpContact = async () => {
      try {
        const response = await axios.post(
          `https://app.chatwoot.com/public/api/v1/inboxes/${inboxIdentifier}/contacts`
        );
        setContactPubsubToken(response.data.pubsub_token);
        setContactIdentifier(response.data.source_id);
        console.log('CONTACT', response);
        console.log(response.data.pubsub_token);
        console.log(response.data.source_id);
        console.log('-----------------------');
        console.log(contactIdentifier);
        console.log(contactPubsubToken);
        return response;
      } catch (error) {
        console.log('Contact setup error:', error);
      }
    };

    const setUpConversation = async (contactResponse) => {
      try {
        const response = await axios.post(
          `https://app.chatwoot.com/public/api/v1/inboxes/${inboxIdentifier}/contacts/${contactResponse.data.source_id}/conversations`
        );
        setContactConversation(response.data.id);
      } catch (error) {
        console.log('Conversation setup error:', error);
        console.log(
          `CONVERSATION-  https://app.chatwoot.com/public/api/v1/inboxes/${inboxIdentifier}/contacts/${contactIdentifier}/conversations`
        );
      }
    };

    const connectToChatwoot = () => {
      const socket = io('ws://localhost:5000/cable');
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

      // WebSocket bağlantısı sırasında oluşabilecek hataları dinler ve hata durumunda ilgili bilgiyi konsola yazdırır.
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

  useEffect(() => {
    if (!socket) return; // socket bağlantısı kurulmadan mesaj dinlemeye başlamayalım

    
      
    

    socket.on('message', (message) =>{
      const serverMessage = JSON.parse(message);
      console.log(message.data);
      console.log(...serverMessage);

      // Gelen bu tür mesajlar, WebSocket bağlantısının doğrulanması ve onaylanması ile ilgili bilgilendirmelerdir ve bir işlem yapmamız gerekmez.
      if (
        serverMessage.type === 'welcome' ||
        serverMessage.type === 'ping' ||
        serverMessage.type === 'confirm_subscription'
      ) {
        console.log('başladı');
        return;
      } else if (
        serverMessage.message &&
        serverMessage.message.event === 'message.created'
      ) {
        console.log(
          `SERVER MSG ALOO 1 : ${serverMessage.message} // ${serverMessage.message.event}`
        );
        const { name, content } = serverMessage.message.data.sender;
        addMessage(name, content);
      } else {
        console.log('Unknown JSON:', serverMessage);
        console.log(
          `SERVER MSG ALOO 2 : ${serverMessage.message} // ${serverMessage.message.event}`
        );
      }
      console.log(
        `SERVER MSG ALOO 3 : ${serverMessage.message} // ${serverMessage.message.event}`
      );
    })

    return () => {
      socket.close() // dinleyiciyi temizleme
    };
  }, [socket]);

  

  const addMessage = (author, message) => {
    setContent((prevContent) => [...prevContent, { author, message }]);
  };

  const sendMessage = () => {
    if (!inputValue) {
      return;
    }

    const message = { content: inputValue };

    axios
      .post(
        `https://app.chatwoot.com/public/api/v1/inboxes/${inboxIdentifier}/contacts/${contactIdentifier}/conversations/${contactConversation}/messages`,
        message
      )
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
