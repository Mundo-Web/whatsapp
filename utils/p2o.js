import '../extends/string.extend.min.js'

const p2o = (pseudo, clean = false) => {
  const data = pseudo.trim().split2(';', {
    regex: /(.+):(.+)/,
    structure: 'field, value'
  })

  const obj = {}
  data.forEach(x => {
    if (clean) {
      obj[x.field] = x.value?.clean()
    } else {
      obj[x.field] = x.value?.keep('A-Za-z0-9.,@-_ ')
    }
  })

  return obj
}
export default p2o