import { Router } from "express";
import * as paymentsController from "../controllers/payments.controller";

export const paymentsRouter = Router();

paymentsRouter.get("/", paymentsController.list);
paymentsRouter.get("/:id", paymentsController.getById);
paymentsRouter.post("/", paymentsController.create);
paymentsRouter.put("/:id", paymentsController.update);
paymentsRouter.delete("/:id", paymentsController.remove);
