import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import duvidasRoutes from "./routes/duvidas.js";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log("✅ MongoDB conectado");
    console.log(`DB name: ${mongoose.connection.name}`);
  })
  .catch((err) => {
    console.error("❌ Erro ao conectar MongoDB:", err);
  });

app.use("/duvidas", duvidasRoutes);

app.use(express.static(path.join(__dirname, "../frontend")));

app.get("/api", (req, res) => {
  res.json({ message: "Backend funcionando!" });
});

import authRoutes from "./routes/auth.js";

app.use("/auth", authRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
});
