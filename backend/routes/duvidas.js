import express from "express";
import mongoose from "mongoose";

const router = express.Router();

const replySchema = new mongoose.Schema({
  text: { type: String, required: true },
  author: { type: String, default: "Anônimo" },
  createdAt: { type: Date, default: Date.now }
});

const duvidaSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  author: { type: String, default: "Anônimo" },
  createdAt: { type: Date, default: Date.now },
  replies: [replySchema]
});

const Duvida = mongoose.model("Duvida", duvidaSchema);

router.get("/", async (req, res) => {
  const duvidas = await Duvida.find();
  res.json(duvidas);
});

router.post("/", async (req, res) => {
  const novaDuvida = new Duvida(req.body);
  await novaDuvida.save();
  res.json(novaDuvida);
});

// rota de respostas
router.post("/:id/respostas", async (req, res) => {
  const duvida = await Duvida.findById(req.params.id);
  if (!duvida) return res.status(404).json({ error: "Dúvida não encontrada" });

  const { author, text } = req.body;
  const reply = { author: author || "Anônimo", text, createdAt: new Date() };
  duvida.replies.push(reply);
  await duvida.save();

  res.status(201).json(reply);
});

router.post("/", async (req, res) => {
  console.log("Recebi no backend:", req.body); // <--- veja o que vem
  const novaDuvida = new Duvida(req.body);
  await novaDuvida.save();
  res.json(novaDuvida);
});


export default router;