import { Router } from "express";
import * as loanRequestsController from "../controllers/loanRequests.controller";

export const loanRequestsRouter = Router();

loanRequestsRouter.get("/", loanRequestsController.list);
loanRequestsRouter.get("/:id", loanRequestsController.getById);
loanRequestsRouter.post("/", loanRequestsController.create);
loanRequestsRouter.put("/:id", loanRequestsController.update);
loanRequestsRouter.post("/:id/reject", loanRequestsController.reject);
loanRequestsRouter.post("/:id/convert-to-loan", loanRequestsController.convertToLoan);
