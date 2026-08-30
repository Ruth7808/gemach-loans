import { Router } from "express";
import * as depositsController from "../controllers/deposits.controller";

export const depositsRouter = Router();

depositsRouter.get("/", depositsController.list);
depositsRouter.post("/", depositsController.create);
depositsRouter.put("/:id", depositsController.update);
depositsRouter.delete("/:id", depositsController.remove);
