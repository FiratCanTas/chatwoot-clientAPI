import  express  from 'express'
import  { createProxyMiddleware }  from 'http-proxy-middleware'
import { fileURLToPath } from "url"
import { dirname } from 'path'

const app = express()

// Hedef URL Chatwoot sunucusunun WebSocket bağlantısı için kullanılan adres
const target = 'wss://app.chatwoot.com/cable'

// WebSocket proxy
app.use('/cable', createProxyMiddleware({ target, ws: true, changeOrigin: true }))


// Express uygulamasında statik dosyaların (örneğin, HTML, CSS, JavaScript dosyaları gibi) sunulması için kullanılır. Bu dosyalar, uygulama tarafından oluşturulmuş ve değiştirilmemiş olan, genellikle sabit içeriğe sahip dosyalardır. Statik dosyalar sunucu tarafından doğrudan istemciye gönderilir ve sunucuda herhangi bir işleme gerek kalmadan direkt olarak tarayıcıda görüntülenir.
app.use(express.static('build'))


const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);


// Bir istemci tarafından sunucuya gönderilen herhangi bir talep, bu işleyici tarafından yakalanır ve res.sendFile() yöntemi ile React uygulamasının ana sayfası (index.html) istemciye gönderilir.
app.get('*', (req, res) => {
  res.sendFile(__dirname + '/build/index.html')
})



// Sunucuyu belirtilen portta başlatma
const port = 5000;
app.listen(port, () => {
  console.log(`Proxy server is running on port ${port}`)
})
