class GeminiRest {
  #IP = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest'
  #MAX_RETRIES = 3

  generateContent = async (apiKey, prompt, messages) => {
    let attempts = 0;

    while (attempts < this.#MAX_RETRIES) {
      try {
        attempts++;
        let instruction = `${prompt}\n\n` + messages.map(({ role, message }) => `${role}: ${message}`).join('\n') + '\nAI: '

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
        });

        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }

        const data = await res.json();
        const result = data?.candidates?.[0]?.content?.parts?.[0]?.text;

        if (result) {
          console.log(`Respuesta exitosa en el intento ${attempts}`);
          return result;
        } else {
          console.log(`Respuesta vacía en el intento ${attempts}, reintentando...`);
        }
      } catch (error) {
        console.error(`Error de Gemini en el intento ${attempts}:`, error.message);

        if (attempts === this.#MAX_RETRIES) {
          console.error('Número máximo de intentos alcanzado. Retornando null.');
          return null;
        }

        console.log('Reintentando...');
      }
    }

    return null;
  }
}

export default GeminiRest;