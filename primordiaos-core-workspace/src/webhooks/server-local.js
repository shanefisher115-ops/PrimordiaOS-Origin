import express from "express";
import paymentRouter from "./payment.js";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use("/webhook", paymentRouter);

app.get("/", (req, res) => {
  res.send("[PrimordiaFlow] Local Revenue Node is Online.");
});

app.listen(PORT, () => {
  console.log(`[PrimordiaFlow] Local webhook gateway listening on port ${PORT}`);
});
