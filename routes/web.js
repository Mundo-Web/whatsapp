import express from 'express';
const router = express.Router();

router.get('/', (req, res) => res.send('WhatsApp de SoDe is ON'))

export default router