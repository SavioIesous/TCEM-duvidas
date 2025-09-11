import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import duvidasRoutes from "./routes/duvidas.js";
import path from "path";
import { fileURLToPath } from "url";

const app = express();
app.use(cors());
app.use(express.json());

// Configurar __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Conectar ao MongoDB
mongoose.connect("mongodb+srv://rodriguessavio68_db_user:savio497@cluster0.zwvuyto.mongodb.net/duvidasDB?retryWrites=true&w=majority&appName=Cluster0")
  .then(() => console.log("✅ MongoDB conectado"))
  .catch(err => console.log("❌ Erro ao conectar MongoDB:", err));

// Rotas do backend
app.use("/duvidas", duvidasRoutes);

// Servir frontend
app.use(express.static(path.join(__dirname, "../frontend")));

// Teste de rota
app.get("/api", (req, res) => {
  res.json({ message: "Backend funcionando!" });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
});