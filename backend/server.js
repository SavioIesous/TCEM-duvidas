import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import duvidasRoutes from "./routes/duvidas.js";

const app = express();
app.use(cors());
app.use(express.json());

import path from "path";
import { fileURLToPath } from "url";


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


app.use(express.static(path.join(__dirname, "../frontend")));



mongoose.connect("mongodb+srv://rodriguessavio68_db_user:savio497@cluster0.zwvuyto.mongodb.net/duvidasDB?retryWrites=true&w=majority&appName=Cluster0")
  .then(() => console.log("MongoDB conectado"))
  .catch(err => console.log(err));

app.use("/duvidas", duvidasRoutes);


app.get("/", (req, res) => {
  res.send("Servidor está rodando 🚀");
});


const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});
