import '../extends/string.extend.min.js'

const searchCommand = (input) => {
  try {
    const regex = /{{(.*?)}}/g
    const matches = input.match(regex)
    const commands = matches ? matches.map(match => match.slice(2, -2)) : []

    const cleanMessage = input.replace(regex, '')
    return {
      found: commands.length > 0,
      commands,
      message: cleanMessage.trim()
    }
  } catch (error) {
    return {
      found: false,
      commands: [],
      message: input
    }
  }
}

export default searchCommand