import { Router } from "express";
import * as withdrawalRequestsController from "../controllers/withdrawalRequests.controller";

export const withdrawalRequestsRouter = Router();

withdrawalRequestsRouter.get("/", withdrawalRequestsController.list);
withdrawalRequestsRouter.get("/:id", withdrawalRequestsController.getById);
withdrawalRequestsRouter.post("/", withdrawalRequestsController.create);
withdrawalRequestsRouter.put("/:id", withdrawalRequestsController.update);
withdrawalRequestsRouter.post("/:id/cancel", withdrawalRequestsController.cancel);
withdrawalRequestsRouter.post("/:id/pay", withdrawalRequestsController.pay);
