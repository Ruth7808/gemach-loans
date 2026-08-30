import { Router } from "express";
import * as depositorsController from "../controllers/depositors.controller";

export const depositorsRouter = Router();

depositorsRouter.get("/", depositorsController.list);
depositorsRouter.get("/:id", depositorsController.getById);
depositorsRouter.post("/", depositorsController.create);
depositorsRouter.put("/:id", depositorsController.update);
depositorsRouter.delete("/:id", depositorsController.remove);
