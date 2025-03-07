import { randomUUID } from 'crypto'
import fs from 'fs'
import GeminiRest from '../rest/GeminiRest.js'
import MessagesRest from '../rest/MessagesRest.js'
import p2o from '../utils/p2o.js'
import searchCommand from '../utils/searchCommand.js'
import WhatsAppController from './whatsapp.js'

const messagesRest = new MessagesRest()
const geminiRest = new GeminiRest()

class SessionController {
  static ping = async (req, res) => {
    const { session } = req.params
    const client = global.CLIENTS[session]

    console.log('Verificando la sesion de: ', session)

    let status = 500

    try {
      if (!client) {
        status = 404
        throw new Error('No se encontró una sesión')
      }
      if (!client.ready) {
        status = 400
        throw new Error('La sesión se encuentra inactiva')
      }

      return res.status(200).json({ status: 200, message: 'Operación correcta', data: client.session.info })
    } catch (error) {
      return res.status(400).json({ status, message: error.message })
    }
  }

  static verify = async (req, res) => {
    const { session, redirect_to } = req.query
    const sessionId = randomUUID()

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
        // if (event.fromMe) return
        // return

        const whatsapp_name = event._data.notifyName?.trim() ?? ''
        const whatsapp_id = event.from.replace('@c.us', '')
        const receiver_whatsapp_id = event.to.replace('@c.us', '')
        const message = event.body

        try {

          const { status, data, summary } = await messagesRest.byPhone(session, whatsapp_id, message, whatsapp_name, event.fromMe)

          if (event.fromMe) {
            if (!summary?.alreadySent) {
              messagesRest.save(session, receiver_whatsapp_id, message, 'User')
            }
            return;
          } else {
            messagesRest.save(session, whatsapp_id, message, 'Human')
          }

          if (!status) return

          const messages = data.sort((a, b) => a.created_at > b.created_at ? 1 : -1)
          messages.push({ role: 'Human', message })

          let geminiResponse = await geminiRest.generateContent(summary['api-key'], summary.prompt, messages)
          if (!geminiResponse) {
            await fetch(redirect_to, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${session}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                contact_name: `Lead nuevo ${whatsapp_name ? `(${whatsapp_name})` : ''}`.trim(),
                contact_phone: whatsapp_id,
                contact_email: 'unknown@atalaya.pe',
                message: 'Sin mensaje',
                origin: "WhatsApp",
                triggered_by: "Gemini AI"
              })
            })
            return
          }

          geminiResponse = geminiResponse.replace(/^AI:\s*/, '')
          // messagesRest.save(session, whatsapp_id, geminiResponse, 'AI')

          const { found, commands, message: cleanMessage } = searchCommand(geminiResponse)
          if (!found) {
            event.reply(cleanMessage?.replace(/^AI:\s*/, '')?.trim() || 'Lo siento, parece que no he entendido bien tu solicitud. ¿Podrías intentar formularla de nuevo o indicarme si necesitas ayuda de uno de nuestros ejecutivos?')
            return
          }

          const lastCommand = commands.reverse()[0]
          const collected = p2o(lastCommand)

          if (
            collected.nombreCliente && collected.correoCliente
            // && collected.objetivoCliente
          ) {
            await fetch(redirect_to, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${session}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                contact_name: `${collected.nombreCliente} ${whatsapp_name ? `(${whatsapp_name})` : ''}`.trim(),
                contact_phone: whatsapp_id,
                contact_email: collected.correoCliente,
                message: collected.objetivoCliente ?? 'Sin mensaje',
                origin: "WhatsApp",
                triggered_by: "Gemini AI"
              })
            })
            return
          }

          if (collected?.asistenciaHumana?.toUpperCase?.() == 'SI') {
            let message = `Una persona requiere la atencion de un ejecutivo.\nNumero: ${whatsapp_id}`
            if (collected.nombreCliente) message += `\nNombre: ${collected.nombreCliente}`
            if (collected.correoCliente) message += `\nCorreo: ${collected.correoCliente}`
            if (collected.objetivoCliente) message += `\nMensaje: ${collected.objetivoCliente}`
            messagesRest.help(session, message)
            messagesRest.save(session, whatsapp_id, ':STOP', 'AI')
            event.reply('En un momento te contactara uno de nuestros ejecutivos')
            return
          }

          const leftFields = []
          if (!collected.nombreCliente) leftFields.push('Nombre')
          if (!collected.correoCliente) leftFields.push('Correo')
          if (!collected.objetivoCliente) leftFields.push('Objetivo digital')

          if (cleanMessage) event.reply(cleanMessage)
          else event.reply(`Para continuar puedes brindarme los siguientes datos: ${leftFields.join(', ')}`)
        } catch (error) {
          console.error(error)
        }
      }

      if (!client) {
        client = { responses: {}, session: null, lastQR: null, ready: false, active: false }
        global.CLIENTS[session] = client
      }

      client.responses[sessionId] = res

      const finalClient = global.CLIENTS[session]

      const writeAll = (toWrite) => {
        for (const key in finalClient.responses) {
          const response = finalClient.responses[key]
          response.write(toWrite)
        }
      }

      if (!finalClient.active && (!finalClient?.session || finalClient?.session?.instance?.pupPage?._closed)) {
        console.log(`Eliminando chrome de: ${session}`)
        finalClient.active = true
        await finalClient.session?.instance?.destroy()

        finalClient.session = WhatsAppController.getClient(session)
        finalClient.session.initialize()

        finalClient.session.on('qr', (qr) => {
          finalClient.lastQR = qr
          writeAll(`data: ${JSON.stringify({ status: 'qr', qr })}\n\n`)
        })
        finalClient.session.on('loading_screen', (percent) => {
          writeAll(`data: ${JSON.stringify({ status: 'loading_screen', percent })}\n\n`)
        })
        finalClient.session.on('authenticated', () => {
          writeAll(`data: ${JSON.stringify({ status: 'authenticated' })}\n\n`)
        })
        finalClient.session.on('auth_failure', (e) => {
          console.log('auth_failure', e)
          finalClient.session.destroy()
          writeAll(`data: ${JSON.stringify({ status: 'close' })}\n\n`)
        })
        finalClient.session.on('disconnected', async (reason) => {
          console.log('disconnected', reason)
          if (reason.includes('qrcode') || reason == 'LOGOUT') {
            try { await client.session.destroy() } catch (error) {
              console.error('Error al cerrar el navegador:', error.message)
            }
            finalClient.session = null
            finalClient.active = false
            finalClient.lastQR = null
            finalClient.ready = false
            writeAll(`data: ${JSON.stringify({ status: 'close', reason })}\n\n`)
            delete finalClient.responses[sessionId]
          }
        })
        finalClient.session.on('ready', async () => {
          setTimeout(async () => {
            finalClient.lastQR = null
            finalClient.ready = true
            finalClient.active = false
            writeAll(`data: ${JSON.stringify({ status: 'ready', info: finalClient.session.info })}\n\n`)
            res.end()
          }, 2500)
        })
        finalClient.session.on('message_create', onMessageCreate)
      } else {
        if (finalClient.ready) {
          writeAll(`data: ${JSON.stringify({ status: 'ready', info: finalClient.session.info })}\n\n`)
          // finalClient.session.on('message_create', onMessageCreate)
          res.end()
          delete finalClient.responses[sessionId]
        } else if (finalClient.lastQR) {
          writeAll(`data: ${JSON.stringify({ status: 'qr', qr: finalClient.lastQR })}\n\n`)
        }
      }

      req.on('close', () => {
        console.log(`Se ha cerrado la conexion con el cliente: ${sessionId}`)
        delete finalClient.responses[sessionId]
        if (finalClient?.instance && !finalClient?.instance?.pupPage?._closed) finalClient?.instance?.destroy()
      })
    } catch (error) {
      console.trace(error)
      res.write(`data: ${JSON.stringify({ "status": "close" })}\n\n`)
      res.end()
    }
  }

  static destroy = async (req, res) => {
    const { session } = req.params
    const client = global.CLIENTS[session]

    try {
      if (!client) throw new Error('No se encontró una sesión')

      if (client.ready) {
        await new Promise(async (resolve, reject) => {
          try { await client.session.logout() } catch (error) {
            console.error('Error al cerrar sesion:', error.message)
            reject(error)
          }
          try { await client.session.destroy() } catch (error) {
            console.error('Error al cerrar el navegador:', error.message)
            reject(error)
          }
          resolve()
        }).then(() => {
          delete global.CLIENTS[session]
        }).catch(() => {
          // Manejo de errores si es necesario
        })
      }

      fs.rm(`${global.dirPath}/session-${session}`, { recursive: true }, (...props) => {
        console.log(props)
      })
      res.status(200).end()
    } catch (error) {
      res.status(400).end()
    }
  }
}

export default SessionController