class GeminiRest {
  #IP = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash'

  generateContent = async (apiKey, prompt, messages) => {
    try {
      let instruction = `${prompt}\n\n` + messages.map(({ role, message }) => `${role}: ${message}`).join('\n') + 'AI: '
      const res = await fetch(`${this.#IP}:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: instruction
                }
              ]
            }
          ]
        })
      })
      if (!res) throw new Error('Fallo al consultar gemini');
      const data = await res.json()

      return data?.candidates?.[0]?.content?.parts?.[0]?.text ?? null
    } catch (error) {
      console.error('Gemini Error:', error.message)
      return null
    }
  }
}

export default GeminiRest