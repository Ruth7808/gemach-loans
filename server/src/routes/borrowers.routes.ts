import { Router } from "express";
import * as borrowersController from "../controllers/borrowers.controller";

export const borrowersRouter = Router();

borrowersRouter.get("/", borrowersController.list);
borrowersRouter.get("/:id", borrowersController.getById);
borrowersRouter.post("/", borrowersController.create);
borrowersRouter.put("/:id", borrowersController.update);
borrowersRouter.delete("/:id", borrowersController.remove);
