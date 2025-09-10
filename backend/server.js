import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import duvidasRoutes from "./routes/duvidas.js";

const app = express();
app.use(cors());
app.use(express.json());

// Conectar no MongoDB (cole aqui seu link do Atlas)
mongoose.connect("mongodb+srv://rodriguessavio68_db_user:savio497@cluster0.zwvuyto.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0")
  .then(() => console.log("MongoDB conectado"))
  .catch(err => console.log(err));

app.use("/duvidas", duvidasRoutes);

app.listen(3000, () => console.log("Servidor rodando na porta 3000"));
