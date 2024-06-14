import express from 'express';
const router = express.Router();

import SessionController from '../controllers/session.js';
import WhatsAppController from '../controllers/whatsapp.js';
import AutoController from '../controllers/auto.js';

router.get('/verify', WhatsAppController.verify)
router.get('/session/:username', SessionController.generate)
router.delete('/session/:session', SessionController.destroy)
router.post('/send', WhatsAppController.send)
router.get('/send/phrase', AutoController.sendPhrase)
router.get('/qr', WhatsAppController.getQR)

export default router