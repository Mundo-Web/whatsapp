import ww from "whatsapp-web.js"
import UtilsController from "./utils.js"
const { MessageMedia, Client, LocalAuth } = ww

class WhatsAppController {
  static getClient = (session = 'sode') => {
    return new Client({
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
        clientId: session,
        dataPath: global.dirPath
      }),
      takeoverOnConflict: true,
      qrMaxRetries: 4,
      // webVersionCache: {
      //     type: 'remote',
      //     remotePath: global.remotePath,
      // }
    })
  }
  static send = async (req, res) => {
    let status = 500
    let message = 'Error inesperado'

    const { from, attachment, content, html, to, notify } = req.body
    const client = from ? global.CLIENTS[from]?.session : global.CLIENT

    try {
      if (to.length == 0) throw new Error('Debes seleccionar al menos un destinatario')

      let attachment2send = await Promise.all((attachment || []).map(({ uri, filename }) => {
        return MessageMedia.fromUrl(uri, {
          unsafeMime: true,
          filename
        })
      }))
      attachment2send = attachment2send.filter(Boolean)

      if (html) {
        const buffer = await UtilsController.html2image(html)
        const image = new MessageMedia('image/webp', buffer)
        attachment2send.push(image)
      }

      if (!content?.trim() && attachment2send.length == 0) throw new Error('No puedes enviar mensajes vacios')

      await Promise.all(to.map(to => {
        const waId = to.includes('@') ? to : `${to}@c.us`
        if (!content?.trim() || attachment2send.length > 1) {
          if (content?.trim()) client.sendMessage(waId, content)
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

  static getProfile = async (req, res) => {
    const { session, wa_id } = req.params
    let status = 500;
    let message = 'Error inesperado';

    try {
      const client = global.CLIENTS['atalaya-' + session]?.session
      if (!client) {
        throw new Error('Client not found');
      }
      const waId = wa_id.includes('@') ? wa_id : `${wa_id}@c.us`;
      const contact = await client.getContactById(waId);

      if (!contact) {
        throw new Error('Contact not found');
      }

      // Get profile picture URL
      const profilePicUrl = await client.getProfilePicUrl(waId);

      if (!profilePicUrl) {
        throw new Error('Profile picture not available');
      }

      // Fetch the image and convert to blob
      const response = await fetch(profilePicUrl);
      const blob = await response.blob();

      res.set('Content-Type', 'application/octet-stream');
      res.send(Buffer.from(await blob.arrayBuffer()));

      // status = 200;
      // message = 'Profile retrieved successfully';

      // res.status(status).json({
      //   status,
      //   message,
      //   data: {
      //     contact: {
      //       name: contact.name || contact.pushname || 'Unknown',
      //       number: contact.number,
      //       profilePicture: blob
      //     }
      //   }
      // });

    } catch (error) {
      res.status(400)
      res.send(error.message)
      // status = 400;
      // message = error.message;
      // res.status(status).json({ status, message });
    }
  }
}

export default WhatsAppController