class AutoController {
  static sendPhrase = async (req, res) => {
    try {
      let message = `Hola muchachos buenos dias. Estoy operando con normalidad.`

      const reqWeather = new URLSearchParams({
        place_id: 'bajo-pichanaqui-3963815',
        sections: 'daily',
        units: 'metric',
        key: '4szky42k088otg8odzahnjejdagkeke6xyshscn4'
      })
      const resWeather = await fetch(`https://www.meteosource.com/api/v1/free/point?${reqWeather}`)
      if (resWeather.ok) {
        const dataWeather = await resWeather.json()
        const { summary, all_day } = dataWeather.daily.data[0]
        message = `${message}\nHoy el cielo estara \`${summary}\`. Durante el dia la temperatura promedio sera \`${all_day.temperature}°C\`.`
      } else {
        message = `${message}\nHoy no hay reporte de clima pipipi.`
      }

      const resPhrase = await fetch('https://frasedeldia.azurewebsites.net/api/phrase')
      if (resPhrase.ok) {
        const { phrase, author } = await resPhrase.json()
        message = `${message}\n> "${phrase}" (${author})`
      } else {
        message = `${message}\n> "Ups! parece que hoy no hay frase." (SoDe Bot)`
      }

      const resWA = await fetch('http://localhost:8080/api/send', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          to: ['120363023243344066@g.us'],
          content: message
        })
      })
      const dataWA = resWA.json()
      if (!resWA.ok) throw new Error(dataWA?.message ?? 'Ocurrio un error inesperado')

      res.status(200)
      res.send('Ok')
    } catch (error) {
      console.log(error)
      res.status(400)
      res.send(`Error: ${error.message}`)
    }
  }
}

export default AutoController