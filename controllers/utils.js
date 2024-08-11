import { launch } from "puppeteer"
import prefixes from '../json/prefijos.json' assert { type: 'json' }

class UtilsController {
  static html2image = async (html) => {
    const browser = await launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage=true',
        '--disable-accelerated-2d-canvas=true',
        '--disable-gpu',
        '--use-gl=egl'
      ]
    })
    const page = await browser.newPage()
    await page.setContent(html)
    const { width, height } = await page.evaluate(() => {
      document.body.style.height = 'max-content'
      document.body.style.width = 'max-content'
      document.body.style.overflow = 'hidden'
      document.body.style.padding = 0
      document.body.style.margin = 0
      return {
        width: document.body.offsetWidth,
        height: document.body.offsetHeight
      }
    })
    await page.setViewport({ width, height })
    const image = await page.screenshot({
      type: 'webp',
      encoding: 'base64',
      quality: 200
    })
    await browser.close()
    return image
  }
  static getPrefixAndPhone = (fullphone) => {
    const found = Object.keys(prefixes).find((prefix) => String(fullphone).startsWith(prefix))
    if (!found) return null
    return {
      country: prefixes[found],
      code: `+${found}`,
      prefix: found,
      number: String(fullphone).substring(found.length)
    }
  }
}

const result = UtilsController.getPrefixAndPhone('62856403618882')
console.log(JSON.stringify(result, null, 2))

export default UtilsController