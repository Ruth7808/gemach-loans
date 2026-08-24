import express from "express";
import { borrowersRouter } from "./routes/borrowers.routes";
import { loansRouter } from "./routes/loans.routes";
import { paymentsRouter } from "./routes/payments.routes";
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

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
