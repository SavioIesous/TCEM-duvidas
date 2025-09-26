import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import duvidasRoutes from "./routes/duvidas.js";
import path from "path";
import { fileURLToPath } from "url";

const app = express();
app.use(cors());
app.use(express.json());

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

mongoose.connect("mongodb+srv://rodriguessavio68_db_user:savio497@cluster0.zwvuyto.mongodb.net/duvidasDB?retryWrites=true&w=majority&appName=Cluster0")
  .then(() => console.log("✅ MongoDB conectado"))
  .catch(err => console.log("❌ Erro ao conectar MongoDB:", err));

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