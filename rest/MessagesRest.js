import UtilsController from "../controllers/utils.js";

class MessagesRest {
  #IP = 'http://crm.atalaya.pe'

  byPhone = async (sessionId, waId, message, whatsapp_name, from_me) => {
    try {
      const { number } = UtilsController.getPrefixAndPhone(waId);
      const res = await fetch(`${this.#IP}/free/messages/${sessionId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          waId,
          justPhone: number,
          message,
          contact_name: whatsapp_name,
          from_me
        })
      })
      if (!res.ok) throw new Error(`Ocurrio un error al consultar los datos y mensajes del contacto: ${await res.text()}`);
      const { data, summary } = await res.json()
      return {
        status: true,
        data, summary
      }
    } catch (error) {
      console.error('Message Error [MessagesRest.byPhone]:', error.message)
      return {
        status: false
      }
    }
  }

  save = async (session_id, wa_id, message, role = 'Human') => {
    try {
      const res = await fetch(`${this.#IP}/free/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ session_id, role, wa_id, message, })
      })
      if (!res.ok) throw new Error('No se guardo el mensaje del Bot')
    } catch (error) {
      console.error('Message Error (Guardar):', error.message)
    }
  }

  help = async (session_id, message) => {
    try {
      const res = await fetch(`${this.#IP}/free/messages/help`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ session_id, message, })
      })
      if (!res.ok) throw new Error('No se pudo notificar al grupo de ayuda')
    } catch (error) {
      console.error('Message Error (Ayuda):', error.message)
    }
  }
}

export default MessagesRest