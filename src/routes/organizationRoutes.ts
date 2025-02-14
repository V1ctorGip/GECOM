import express from 'express';
import { getOrganizations } from '../controllers/organizationController.js';
const router = express.Router();

router.get('/organizations', getOrganizations);

export default router;
