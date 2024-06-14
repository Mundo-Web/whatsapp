import ww from "whatsapp-web.js"
const { MessageMedia, Client, LocalAuth } = ww

class WhatsAppController {
    static verify = async (req, res) => {
        const { session } = req.query

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

            if (!client || (client.instance && !client?.instance?.pupPage._closed)) {
                client?.instance?.destroy()
                delete global.CLIENTS[session]
                console.log(`Eliminando chrome de: ${session}`)
                client = new Client({
                    takeoverOnConflict: true,
                    webVersionCache: {
                        type: 'remote',
                        remotePath: global.remotePath
                    },
                    puppeteer: {
                        headless: true,
                        args: [
                            '--no-sandbox',
                            '--disable-setuid-sandbox',
                            '--disable-dev-shm-usage=true',
                            '--disable-accelerated-2d-canvas=true',
                            '--disable-gpu',
                            '--use-gl=egl'
                        ],
                        ignoreDefaultArgs: [
                            '--disable-extensions'
                        ]
                    },
                    authStrategy: new LocalAuth({
                        clientId: session || 'sode'
                    }),
                    qrMaxRetries: 3
                })

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
                client.on('message_create', async (event) => {
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

                    try {
                        await fetch('http://atalaya.mundoweb.pe/free/clients', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({
                                contact_name,
                                contact_phone,
                                message,
                                source: 'WhatsApp',
                                origin: 'Interno'
                            })
                        })
                    } catch (error) {
                        console.error(error)
                    }
                })
            } else {
                res.write(`data: ${JSON.stringify({ status: 'ready', info: client.info })}\n\n`)
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

    static send = async (req, res) => {
        let status = 500
        let message = 'Error inesperado'

        const { attachment, content, to, notify } = req.body
        const client = global.CLIENT

        try {

            if (to.length == 0) throw new Error('Debes seleccionar al menos un destinatario')

            let attachment2send = await Promise.all((attachment || []).map(({ uri, filename }) => {
                return MessageMedia.fromUrl(uri, {
                    unsafeMime: true,
                    filename
                })
            }))
            attachment2send = attachment2send.filter(Boolean)

            if (!content.trim() && attachment2send.length == 0) throw new Error('No puedes enviar mensajes vacios')

            await Promise.all(to.map(to => {
                const waId = to.includes('@') ? to : `${to}@c.us`
                if (!content.trim() || attachment2send.length > 1) {
                    if (content.trim()) client.sendMessage(waId, content)
                    return Promise.all(attachment2send.map(media => {
                        client.sendMessage(waId, media, {
                            caption: ' '
                        })
                    }))
                } else if (attachment2send.length == 1) {
                    return client.sendMessage(waId, content, {
                        media: attachment2send[0]
                    })
                } else {
                    return client.sendMessage(waId, content)
                }
            }))

            status = 200
            message = 'Operacion correcta'

            if (notify) {
                try { client.sendMessage('120363023243344066@g.us', `${notify}\n> ✓ Enviado correctamente`) } catch { }
            }
        } catch (error) {
            status = 400
            message = error.message

            if (notify) {
                try { client.sendMessage('120363023243344066@g.us', `${notify}\n> ✗ Error: ${error.message}`) } catch { }
            }
        } finally {
            res.status(status)
            res.json({ status, message })
        }
    }

    static getQR = async (req, res) => {
        res.json({ qr: global.QR })
    }
}

export default WhatsAppController