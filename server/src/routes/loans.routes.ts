import { Router } from "express";
import * as loansController from "../controllers/loans.controller";

export const loansRouter = Router();

loansRouter.get("/", loansController.list);
loansRouter.get("/:id", loansController.getById);
loansRouter.post("/", loansController.create);
loansRouter.put("/:id", loansController.update);
loansRouter.delete("/:id", loansController.remove);
