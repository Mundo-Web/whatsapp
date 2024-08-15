class MessagesRest {
  #IP = 'https://crm.atalaya.pe'

  byPhone = async (sessionId, waId) => {
    try {
      const res = await fetch(`${this.#IP}/free/messages/${sessionId}/${waId}`)
      if (!res.ok) throw new Error('Ocurrio un error al consultar los datos y mensajes del contacto');
      const { data, summary } = await res.json()
      return {
        status: true,
        data, summary
      }
    } catch (error) {
      console.error('Message Error:', error.message)
      return {
        status: false
      }
    }
  }

  save = (session_id, wa_id, message, role = 'Human') => {
    try {
      fetch(`${this.#IP}/free/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ session_id, role, wa_id, message, })
      })
    } catch (error) {
      console.error('Message Error (Guardar):', error.message)
    }
  }
}

export default MessagesRest