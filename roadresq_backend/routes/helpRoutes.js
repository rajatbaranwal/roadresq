import express from 'express';
import authMiddleware from '../middlewares/authMiddleware.js';
import requireRole from '../middlewares/roleMiddleware.js';
import {
  createHelpRequest,
  getAllHelpRequests,
  getMyHelpRequests,
  getMechanicStats,
  getHelpRequestById,
  acceptHelpRequest,
  rejectHelpRequest,
  updateHelpRequestStatus,
} from '../controllers/helpController.js';

const router = express.Router();

router.use(authMiddleware);

router.post('/request', requireRole('user'), createHelpRequest);
router.get('/all', requireRole('mechanic'), getAllHelpRequests);
router.get('/mine', requireRole('user'), getMyHelpRequests);
router.get('/stats', requireRole('mechanic'), getMechanicStats);
router.patch('/:id/accept', requireRole('mechanic'), acceptHelpRequest);
router.patch('/:id/reject', requireRole('mechanic'), rejectHelpRequest);
router.patch('/:id/status', requireRole('mechanic'), updateHelpRequestStatus);
router.get('/:id', getHelpRequestById);

export default router;
