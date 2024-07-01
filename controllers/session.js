import qrcode from 'qrcode-terminal'
import ww from 'whatsapp-web.js'
import WhatsAppController from './whatsapp.js'

const { Client, LocalAuth } = ww

class SessionController {
    static generate = async (req, res) => {

        const headers = {
            'Content-Type': 'text/event-stream',
            'Connection': 'keep-alive',
            'Cache-Control': 'no-cache',
            'X-Accel-Buffering': 'no'
        }

        res.writeHead(200, headers)

        res.write('data: ping\n\n')

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
            })
        })

        client.initialize()

        client.on('qr', (qr) => {
            qrcode.generate(qr)
            const data = { type: 'qr', qr }
            res.write(`data: ${JSON.stringify(data)}\n\n`)
        })
        client.on('loading_screen', (percent) => {
            const data = { type: 'loading_screen', percent }
            res.write(`data: ${JSON.stringify(data)}\n\n`)
        })
        client.on('authenticated', () => {
            const data = {
                type: 'authenticated',
                status: true
            }
            res.write(`data: ${JSON.stringify(data)}\n\n`)
        })
        client.on('auth_failure', () => {
            const data = {
                type: 'authenticated',
                status: false
            }
            res.write(`data: ${JSON.stringify(data)}\n\n`)
        })
        client.on('ready', async () => {
            const data = {
                type: 'ready',
            }
            setTimeout(async () => {
                await client.sendMessage('51999413711@c.us', '!ping')
            }, 1000);
            res.write(`data: ${JSON.stringify(data)}\n\n`)
            global.CLIENT = client
        })
        client.on('message', async (message) => {
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
                                            "text": message.body.replace('ask:', '')
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
                            "safetySettings": [
                                {
                                    "category": "HARM_CATEGORY_HARASSMENT",
                                    "threshold": "BLOCK_MEDIUM_AND_ABOVE"
                                },
                                {
                                    "category": "HARM_CATEGORY_HATE_SPEECH",
                                    "threshold": "BLOCK_MEDIUM_AND_ABOVE"
                                },
                                {
                                    "category": "HARM_CATEGORY_SEXUALLY_EXPLICIT",
                                    "threshold": "BLOCK_MEDIUM_AND_ABOVE"
                                },
                                {
                                    "category": "HARM_CATEGORY_DANGEROUS_CONTENT",
                                    "threshold": "BLOCK_MEDIUM_AND_ABOVE"
                                }
                            ]
                        })
                    })
                    const { candidates } = await res.json()
                    if (candidates) {
                        const content = candidates[0].content
                        const text = content.parts[0].text
                        message.reply(text)
                    } else {
                        throw new Error('Error')
                    }
                } catch (error) {
                    console.trace(error)
                    message.reply(`La respuesta automatica a fallado: ${error.message}`)
                }
            }
        })

        req.on('close', async () => {
            // const status = await client.getState()
            // await client.destroy()
            console.log('Cliente desconectado')
        })
    }

    static verify = async (req, res) => {
        const { session, redirect_to } = req.query

        const headers = {
            'Content-Type': 'text/event-stream',
            Connection: 'keep-alive',
            'Cache-Control': 'no-cache',
            'X-Accel-Buffering': 'no'
        }

        res.writeHead(200, headers)
        res.write('data: ping\n\n')

        try {
            let client = global.CLIENTS[session]

            const onMessageCreate = async (event) => {
                if (event.body == '!revealId') {
                    event.reply(event.from)
                    return
                }
                if (!event.from.endsWith('@c.us')) return
                if (!event.body) return
                if (event.fromMe) return

                const contact_name = event._data.notifyName
                const contact_phone = event.from.replace('@c.us', '')
                const message = event.body

                console.log(`Enviando a: ${redirect_to}`)
                try {
                    await fetch(redirect_to, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            contact_name,
                            contact_phone,
                            message,
                            source: 'whatsapp-web.js',
                            origin: 'WhatsApp'
                        })
                    })
                } catch (error) {
                    console.error(error)
                }
            }

            if (!client || (client.instance && !client?.instance?.pupPage._closed)) {
                client?.instance?.destroy()
                delete global.CLIENTS[session]
                console.log(`Eliminando chrome de: ${session}`)
                client = WhatsAppController.getClient(session)

                client.initialize()

                client.on('qr', (qr) => {
                    res.write(`data: ${JSON.stringify({ status: 'qr', qr })}\n\n`)
                })
                client.on('loading_screen', (percent) => {
                    res.write(`data: ${JSON.stringify({ status: 'loading_screen', percent })}\n\n`)
                })
                client.on('authenticated', () => {
                    res.write(`data: ${JSON.stringify({ status: 'authenticated' })}\n\n`)
                    global.CLIENTS[session] = client
                })
                client.on('auth_failure', () => {
                    client.destroy()
                    res.write(`data: ${JSON.stringify({ status: 'close' })}\n\n`)
                })
                client.on('ready', async () => {
                    res.write(`data: ${JSON.stringify({ status: 'ready', info: client.info })}\n\n`)
                    global.CLIENTS[session] = client
                    res.end()
                })
                client.on('message_create', onMessageCreate)
            } else {
                res.write(`data: ${JSON.stringify({ status: 'ready', info: client.info })}\n\n`)
                client.on('message_create', onMessageCreate)
                res.end()
            }

            req.on('close', () => {
                if (client?.instance && !client?.instance?.pupPage?._closed) client?.instance?.destroy()
            })
        } catch (error) {
            console.trace(error)
            res.write('data: {"status": "close"}\n\n')
            res.end()
        }
    }

    static destroy = async (req, res) => {
        const { session } = req.params
        const client = global.CLIENTS[session]

        if (client) {
            await client.logout()
            await client.destroy()
            delete global.CLIENTS[session]
            res.status(200).end()
        } else {
            res.status(404).end()
        }
    }
}

export default SessionController