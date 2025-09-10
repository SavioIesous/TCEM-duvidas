import express from "express";
import mongoose from "mongoose";

const router = express.Router();

// Modelo de dúvida
const duvidaSchema = new mongoose.Schema({
  titulo: String,
  descricao: String,
  autor: String,
  respostas: [{ texto: String, autor: String }]
});

const Duvida = mongoose.model("Duvida", duvidaSchema);

// Listar dúvidas
router.get("/", async (req, res) => {
  const duvidas = await Duvida.find();
  res.json(duvidas);
});

// Postar dúvida
router.post("/", async (req, res) => {
  const novaDuvida = new Duvida(req.body);
  await novaDuvida.save();
  res.json(novaDuvida);
});

// Postar resposta
router.post("/:id/resposta", async (req, res) => {
  const duvida = await Duvida.findById(req.params.id);
  duvida.respostas.push(req.body);
  await duvida.save();
  res.json(duvida);
});

export default router;
