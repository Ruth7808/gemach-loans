import express from "express";
import { borrowersRouter } from "./routes/borrowers.routes";
import { loansRouter } from "./routes/loans.routes";
import { paymentsRouter } from "./routes/payments.routes";
import { settingsRouter } from "./routes/settings.routes";
import { dashboardRouter } from "./routes/dashboard.routes";
import { depositorsRouter } from "./routes/depositors.routes";
import { depositsRouter } from "./routes/deposits.routes";
import { withdrawalRequestsRouter } from "./routes/withdrawalRequests.routes";
import { withdrawalsRouter } from "./routes/withdrawals.routes";
import { errorHandler } from "./middleware/errorHandler";

const app = express();
const PORT = process.env.PORT || 3001;

app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/borrowers", borrowersRouter);
app.use("/api/loans", loansRouter);
app.use("/api/payments", paymentsRouter);
app.use("/api/settings", settingsRouter);
app.use("/api/dashboard", dashboardRouter);
app.use("/api/depositors", depositorsRouter);
app.use("/api/deposits", depositsRouter);
app.use("/api/withdrawal-requests", withdrawalRequestsRouter);
app.use("/api/withdrawals", withdrawalsRouter);

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
