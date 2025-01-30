import express from 'express';
const router = express.Router();

import SessionController from '../controllers/session.js';
import WhatsAppController from '../controllers/whatsapp.js';
import AutoController from '../controllers/auto.js';
import UtilsController from '../controllers/utils.js';

router.get('/session/verify', SessionController.verify)
router.get('/session/ping/:session', SessionController.ping)
router.delete('/session/:session', SessionController.destroy)
router.post('/send', WhatsAppController.send)
router.get('/send/phrase', AutoController.sendPhrase)
router.get('/qr', WhatsAppController.getQR)

router.post('/utils/html2image', UtilsController.html2imageapi)

export default router