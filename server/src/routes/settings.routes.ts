import { Router } from "express";
import * as settingsController from "../controllers/settings.controller";

export const settingsRouter = Router();

settingsRouter.get("/opening-balance", settingsController.getOpeningBalance);
settingsRouter.put("/opening-balance", settingsController.updateOpeningBalance);
