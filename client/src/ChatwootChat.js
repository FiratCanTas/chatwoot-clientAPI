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
      

      const socket = io('ws://localhost:5000/cable') // Socket.io sunucusuna bağlanma
      setSocket(socket)


      socket.on('connect', () => { // Socket.io bağlantısı başarılı olduğunda çalışacak kodlar

        //Bu nesne Chatwoot sunucusunda bir abonelik oluşturmak için gereken parametreleri içerir. Abonelik, belirli bir kanala katılmak ve o kanal üzerinden mesaj alışverişi yapmak için kullanılır.
        const subscriptionParams = { 
          channel: 'RoomChannel',
          pubsub_token: contactPubsubToken,
        }


        // Bu nesne WebSocket üzerinden abonelik mesajını temsil eder. command özelliği, abonelik mesajının komutunu belirtir
        const subscription = {
          command: 'subscribe',
          identifier: JSON.stringify(subscriptionParams),
        }


        //Bu satırda socket nesnesi üzerinden subscription nesnesini JSON formatına dönüştürerek abonelik mesajını Chatwoot sunucusuna gönderir. Bu adım, uygulamamızın belirli bir kanala abone olmasını ve o kanal üzerinden mesaj gönderip almasını sağlar.
        socket.send(JSON.stringify(subscription)) 

        setStatus('Send Message:') // Durumu güncelleme
        
      })


      socket.on('message', (message) => { //Bu kısım, socket nesnesinin 'message' olayını dinleyen bir olay dinleyicisidir. Yani Chatwoot sunucusundan gelen mesajları dinleyecek olan kod bloğu

        const serverMessage = JSON.parse(message) //Json formatte gelen server mesajımızı kullanabileceğimiz hale çevirdik.


        // Gelen bu tür mesajlar, WebSocket bağlantısının doğrulanması ve onaylanması ile ilgili bilgilendirmelerdir ve bir işlem yapmamız gerekmez.
        if (serverMessage.type === 'welcome' || serverMessage.type === 'ping' || serverMessage.type === 'confirm_subscription') {

          return
        } 


        //Eğer server dan gelen mesaj türü "message.created" ise mesaj gönderme işlemimiz başarılı demektir. Mesajın içeriği "name" (kimin gönderdiği) ve "content" (mesaj içeriği) i alınarak, addMessage fonksiyonum ile content state i güncellenip arayüzde mesajlar gösterilir.
        else if (serverMessage.message && serverMessage.message.event === 'message.created') {

          const { name, content } = serverMessage.message.data.sender
          addMessage(name, content)

        } 


        else {
          console.log('Unknown JSON:', serverMessage)
        }

      })


      //WebSocket bağlantısı sırasında oluşabilecek hataları dinler ve hata durumunda ilgili bilgiyi konsola yazdırır.
      socket.on('error', (error) => {
        console.log('WebSocket connection error:', error)
      })
    }


    //Yazmış olduğumuz fonksiyonları sırayla çağırıp çalıştırdık
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

  }, [])



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
