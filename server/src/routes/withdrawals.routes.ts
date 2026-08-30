import { Router } from "express";
import * as withdrawalsController from "../controllers/withdrawals.controller";

export const withdrawalsRouter = Router();

withdrawalsRouter.get("/", withdrawalsController.list);
