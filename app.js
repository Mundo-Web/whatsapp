import cors from 'cors'
import express from "express"
import qrcode from 'qrcode-terminal'
import ww from 'whatsapp-web.js'
import apiRoutes from './routes/api.js'
import webRoutes from './routes/web.js'
const { Client, LocalAuth } = ww

process.on('unhandledRejection', (reason, promise) => {
    console.error('Se ha producido un rechazo de promesa no manejado', reason)
})

const { json, urlencoded } = express
const app = express()
const PORT = process.env.PORT || 3000

const corsOptions = {
    origin: '*',
    optionSuccessStatus: 200
}

global.CLIENT = {}
global.CLIENTS = {}
global.QR = ''
global.remotePath = 'https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.2412.51.html'

app.use(json())
app.use(urlencoded({ extended: false }))
app.use(cors(corsOptions))

app.use('/api', apiRoutes)
app.use('/', webRoutes)


app.listen(PORT, () => {
    console.log(`WhatsApp de SoDe running on PORT ${PORT}`)
    return
    const client = new Client({
        puppeteer: {
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage=true',
                '--disable-accelerated-2d-canvas=true',
                '--disable-gpu',
                '--use-gl=egl'
            ]
        },
        authStrategy: new LocalAuth({
            clientId: 'sode'
        }),
        webVersionCache: {
            type: 'remote',
            remotePath: 'https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.2412.51.html',
        }
    })

    client.initialize()

    client.on('qr', (qr) => {
        global.QR = qr
        qrcode.generate(qr)
    })
    client.on('loading_screen', (percent) => {
        console.log(`Cargando chats: ${percent}%`)
    })
    client.on('authenticated', () => {
        console.log('Autenticado')
    })
    client.on('auth_failure', () => {
        console.log('Error en la autenticacion')
    })
    client.on('ready', async () => {
        setTimeout(async () => {
            await client.sendMessage('120363023243344066@g.us', 'Desplegado correctamente.\n> Eso espero 👀')
        }, 1000);
        global.CLIENT = client
    })
    client.on('message', async (message) => {
        if (message.body == 'ping') {
            message.reply('Estoy activo!')
        } else if (!message.from.endsWith('@g.us') && message.from != 'status@broadcast') {
            client.sendMessage('120363023243344066@g.us', `*${message.from.replace('@c.us', '')}*\n${message.body}`)
        }
        if (message.body.toLowerCase().startsWith('ask:')) {
            try {
                const apiKey = 'AIzaSyAYadoO2_QawpXY7BsR7Eg-2fVkUUDwRjI'
                const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.0-pro:generateContent?key=${apiKey}`, {
                    method: 'POST',
                    headers: {
                        'Accept': 'application/json',
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        "contents": [
                            {
                                "role": "user",
                                "parts": [
                                    {
                                        "text": message.body
                                    }
                                ]
                            }
                        ],
                        "generationConfig": {
                            "temperature": 0.9,
                            "topK": 1,
                            "topP": 1,
                            "maxOutputTokens": 2048,
                            "stopSequences": []
                        },
                        "safetySettings": []
                    })
                })
                const data = await res.json()
                const { candidates } = data
                if (candidates) {
                    const content = candidates[0].content
                    const text = content.parts[0].text
                    message.reply(text)
                } else {
                    console.log(JSON.stringify(data, null, 2))
                    throw new Error('Ha fallado la API')
                }
            } catch (error) {
                console.trace(error)
                message.reply(`La respuesta automatica a fallado: ${error.message}`)
            }
        }
    })
})
