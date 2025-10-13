import express, { Express } from 'express';
import authController from '../controllers/auth.controller';

const router = express.Router();

export default (app: Express) => {
  // Auth routes
  router.get('/register', authController.getRegister);
  router.post('/register', authController.postRegister);
  router.get('/login', authController.getLogin);
  router.post('/login', authController.postLogin);
  router.get('/logout', authController.logout);

  app.use('/', router);
};