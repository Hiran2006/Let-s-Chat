import {Router} from 'express';
import authRouter from './auth/auth.js';
import chatRouter from './chat.js';
const router = Router();

router.use('/auth', authRouter);
router.use('/chats', chatRouter);

export default router;