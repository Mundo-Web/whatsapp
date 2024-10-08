import { launch } from "puppeteer"
import prefixes from '../json/prefijos.json' assert { type: 'json' }

class UtilsController {
  static html2image = async (html, isHtml = true) => {
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
    if (isHtml) {
      await page.setContent(html)
    } else {
      await page.goto(html)
    }
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

  static html2imageapi = async (req, res) => {
    const { url, html } = req.body;
    try {
      const isHtml = !url;
      const base64 = await this.html2image(url || html, isHtml);

      // Convertir el base64 a un Buffer
      const imageBuffer = Buffer.from(base64, 'base64');

      // Establecer las cabeceras apropiadas
      res.setHeader('Content-Type', 'image/webp');
      res.setHeader('Content-Length', imageBuffer.length);

      // Enviar el buffer de la imagen como respuesta
      res.send(imageBuffer);
    } catch (error) {
      console.log(error);
      res.status(400).send('Error al convertir a imagen');
    }
  }
}

export default UtilsController