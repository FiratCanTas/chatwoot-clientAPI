import React, { useEffect, useState } from 'react'
import axios from 'axios'


const ChatwootChat = () => {
  const [content, setContent] = useState([])
  const [inputValue, setInputValue] = useState('')
  const [status, setStatus] = useState('Send Message:')
  const [socket, setSocket] = useState(null)
  const inboxIdentifier = 'c1Qm2t1oPjaAAYgzC5vvET7B'
  const [contactIdentifier, setContactIdentifier] = useState('')
  const [contactPubsubToken, setContactPubsubToken] = useState('')
  const [contactConversation, setContactConversation] = useState('')



  useEffect(() => {

    const setUpContact = async () => {
      try {

        const response = await axios.post(`https://app.chatwoot.com/public/api/v1/inboxes/${inboxIdentifier}/contacts`)
        console.log("ilk alınan response", response);
        setContactPubsubToken(response.data.pubsub_token)
        setContactIdentifier(response.data.source_id)
        console.log("pubsub token", response.data.pubsub_token)
        console.log("source id", response.data.source_id)
        return response

      } catch (error) {
        console.log('Contact setup error:', error)
      }
    }



    const setUpConversation = async (contactResponse) => {
      try {

        const response = await axios.post(`https://app.chatwoot.com/public/api/v1/inboxes/${inboxIdentifier}/contacts/${contactResponse.data.source_id}/conversations`)
        setContactConversation(response.data.id)

        return contactResponse
      } catch (error) {
        console.log('Conversation setup error:', error)
      }
    }




    const connectToChatwoot = (contactResponse) => {
      const webSocket = new WebSocket("wss://app.chatwoot.com/cable")

      console.log("socket oluşturuldu", webSocket)

      webSocket.onopen = () => {

      console.log("socket açıldı");
      console.log("response", contactResponse);

        const subscriptionParams = {
          channel: 'RoomChannel',
          pubsub_token: contactResponse.data.pubsub_token,
        }

        const subscription = {
          command: 'subscribe',
          identifier: JSON.stringify(subscriptionParams),
        }

        console.log("sub burda",subscription)
        webSocket.send(JSON.stringify(subscription))
        setStatus('Send Message:')
        console.log('Abone Bilgisi', subscription)

      }

      webSocket.onmessage = (event) => {

        const serverMessage = JSON.parse(event.data)
        // console.log('Sunucu mesajı', event)

        if (serverMessage.type === 'welcome' || serverMessage.type === 'ping' || serverMessage.type === 'confirm_subscription') {
          return
        }

        if (serverMessage.message && serverMessage.message.event === 'message.created') {
            console.log('Sunucu mesajı', event)
            console.log("mesaj",serverMessage.message)
            console.log("sunucu mesaj içeriği", serverMessage.message.data.sender)
            const { name } = serverMessage.message.data.sender
            const { content } = serverMessage.message.data
            addMessage(name, content)
          


        }
        else {
          console.log('Unknown JSON:', serverMessage)
        }

      }

      webSocket.onerror = (error) => {
        console.log('WebSocket connection error:', error)
      }

      setSocket(webSocket)
      console.log(socket);
    }



    setUpContact()
      .then(setUpConversation)
      .then(connectToChatwoot)
      .catch((error) => console.log('Setup error:', error))

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
    console.log("contact coversation",contactConversation);

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


  // Interval kontrolü
  // useEffect(() => {
  //   console.log("Socket burada", socket)

  //   const interval = setInterval(() => {
  //     if (socket) {
  //       console.log(socket.readyState)

  //       if (socket.readyState > 1 ) {
  //         setStatus('Error')
  //         setInputValue('Unable to communicate with the WebSocket server.')
  //         setSocket(null)
  //       }
  //     }
  //   }, 3000)

  //   return () => clearInterval(interval)
  // }, [socket])



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
