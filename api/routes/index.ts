import { Router } from 'express';
import authRoutes from './auth';
import categoriesRoutes from './categories';
import coursesRoutes from './courses';
import storesRoutes from './stores';
import bookingsRoutes from './bookings';
import waitingRoutes from './waiting';
import refundsRoutes from './refunds';
import messagesRoutes from './messages';
import statsRoutes from './stats';
import pricingRoutes from './pricing';

const router = Router();

router.use('/auth', authRoutes);
router.use('/categories', categoriesRoutes);
router.use('/courses', coursesRoutes);
router.use('/stores', storesRoutes);
router.use('/bookings', bookingsRoutes);
router.use('/waiting', waitingRoutes);
router.use('/refunds', refundsRoutes);
router.use('/messages', messagesRoutes);
router.use('/stats', statsRoutes);
router.use('/pricing', pricingRoutes);

export default router;
