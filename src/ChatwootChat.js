import React, { useEffect, useState } from 'react'
import { io } from 'socket.io-client'
import axios from 'axios'




const ChatwootChat = () => {

  const [content, setContent] = useState([]) // Mesaj içeriğini depolamak için kullanılan state
  const [inputValue, setInputValue] = useState('') // Kullanıcının girdiği metin değeri için kullanılan state
  const [status, setStatus] = useState('Send Message:') // Sohbet durumunu temsil eden state
  const [socket, setSocket] = useState(null) // Socket.io bağlantısını temsil eden state
  const inboxIdentifier = 'VHSzin56Hodyxx9B8VuDZiu2' // Chatwoot sunucusundaki gelen kutusu kimliği
  const [contactIdentifier, setContactIdentifier] = useState('') // Kullanıcının kimliği
  const [contactPubsubToken, setContactPubsubToken] = useState('') // Kullanıcının pubsub token'ı
  const [contactConversation, setContactConversation] = useState('') // Kullanıcının sohbet kimliği

  useEffect(() => {

    const setUpContact = async () => { //Kullanıcı bilgilerini chatwoot sunucusuna gönderilir ve sonucunda response olarak chatwoot kullanıcıya özel bir pubsub token ve source Id oluşturur. 

      try {
        const response = await axios.post(`https://app.chatwoot.com/public/api/v1/inboxes/${inboxIdentifier}/contacts`) //Geriye gerekli bilgileri alabilmek için post atıyoruz

        setContactPubsubToken(response.data.pubsub_token) //Pubsub token, publish-subscribe modeline dayalı iletişimi sağlamak için kullanılır. Bu token, kullanıcının belirli bir sohbet kanalına abone olmasını ve o kanal üzerinden mesaj gönderip almasını sağlar.

        setContactIdentifier(response.data.source_id) //Kaynak kimliği ise kullanıcının Chatwoot sunucusunda benzersiz bir tanımlayıcıdır. Bu kimlik, kullanıcının belirli bir sohbeti temsil eder ve sunucu üzerindeki işlemleri bu kimlik aracılığıyla yapabiliriz.

      } catch (error) {
        console.log('Contact setup error:', error)
      }

    }


    const setUpConversation = async () => { //Kullanıcı sohbet kimliğini alıyoruz

      try {
        const response = await axios.post(`https://app.chatwoot.com/public/api/v1/inboxes/${inboxIdentifier}/contacts/${contactIdentifier}/conversations`) //Geriye gerekli bilgileri alabilmek için post atıyoruz

        setContactConversation(response.data.id) //Sohbet kimliği (contactConversation), Chatwoot platformunda belirli bir müşteri ile yapılan sohbetin benzersiz kimliğidir.


      } catch (error) {
        console.log('Conversation setup error:', error)
      }

    }

    

    const connectToChatwoot = () => {

      const socket = io('https://app.chatwoot.com') // Socket.io sunucusuna bağlanma
      setSocket(socket)

      socket.on('connect', () => { // Socket.io bağlantısı başarılı olduğunda çalışacak kodlar

        const subscriptionParams = {
          channel: 'RoomChannel',
          pubsub_token: contactPubsubToken,
        }

        const subscription = {
          command: 'subscribe',
          identifier: JSON.stringify(subscriptionParams),
        }

        socket.send(JSON.stringify(subscription)) // WebSocket üzerinden abonelik mesajını gönderme
        
        setStatus('Send Message:') // Durumu güncelleme
        
      })


      socket.on('message', (message) => {

        const json = JSON.parse(message)

        if (json.type === 'welcome' || json.type === 'ping' || json.type === 'confirm_subscription') {

          return
        } 

        else if (json.message && json.message.event === 'message.created') {

          const { name, content } = json.message.data.sender
          addMessage(name, content)

        } 

        else {
          console.log('Unknown JSON:', json)
        }

      })

      socket.on('error', (error) => {
        console.log('WebSocket connection error:', error)
      })
    }

    setUpContact()
      .then(setUpConversation)
      .then(connectToChatwoot)
      .catch((error) => {
        console.log('Setup error:', error)
      })


    return () => {

      if (socket) {
        socket.close()
      }
    }

  }, [contactIdentifier, contactPubsubToken, inboxIdentifier])



  const addMessage = (author, message) => {

    setContent((prevContent) => [...prevContent, { author, message }])
  }


  const sendMessage = () => {

    if (!inputValue) {
      return
    }

    const message = { content: inputValue }

    axios.post(`https://app.chatwoot.com/public/api/v1/inboxes/${inboxIdentifier}/contacts/${contactIdentifier}/conversations/${contactConversation}/messages`,message)

      .then(() => {
        addMessage('me', inputValue)
        setInputValue('')
      })

      .catch((error) => {
        
        console.log('Message sending error:', error)
      })

  }



  const handleInputChange = (event) => {

    setInputValue(event.target.value)
  }


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
  )
}

export default ChatwootChat
