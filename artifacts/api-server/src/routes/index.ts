import { Router, type IRouter } from "express";
import healthRouter from "./health.js";
import donorsRouter from "./donors.js";
import patientsRouter from "./patients.js";
import hospitalsRouter from "./hospitals.js";
import requestsRouter from "./requests.js";
import alertsRouter from "./alerts.js";
import aiRouter from "./ai.js";
import profileRouter from "./profile.js";
import uploadRouter from "./upload.js";
import authRouter from "./auth.js";

const router: IRouter = Router();

router.use(authRouter);
router.use(healthRouter);
router.use(donorsRouter);
router.use(patientsRouter);
router.use(hospitalsRouter);
router.use(requestsRouter);
router.use(alertsRouter);
router.use(aiRouter);
router.use(profileRouter);
router.use(uploadRouter);

export default router;
