// backend/routes/duvidas.js
import express from "express";
import mongoose from "mongoose";
import { verifyToken } from "./auth.js"; // <- importar o middleware

const router = express.Router();

const ReplySchema = new mongoose.Schema({
  text: { type: String, required: true },
  authorId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  author: { type: String, default: null },
  createdAt: { type: Date, default: Date.now },
});

const DuvidaSchema = new mongoose.Schema({
  title: { type: String, required: true },
  author: { type: String, default: "Anônimo" },
  authorId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  description: { type: String, required: true },
  replies: { type: [ReplySchema], default: [] },
  createdAt: { type: Date, default: Date.now },
});

const Duvida = mongoose.model("Duvida", DuvidaSchema);

// Listar dúvidas
router.get("/", async (req, res) => {
  try {
    const duvidas = await Duvida.find();
    res.json(duvidas);
  } catch (err) {
    res.status(500).json({ error: "Erro ao buscar dúvidas" });
  }
});

// Criar dúvida (autenticado)
router.post("/", verifyToken, async (req, res) => {
  try {
    const { title, description } = req.body;

    // busca usuário logado
    const user = await mongoose.model("User").findById(req.user.id);

    const novaDuvida = new Duvida({
      title,
      description,
      author: user?.name || "Anônimo", // usa nome do usuário
      authorId: req.user.id
    });

    await novaDuvida.save();
    res.status(201).json(novaDuvida);
  } catch (err) {
    res.status(400).json({ error: "Erro ao criar dúvida" });
  }
});

// Adicionar resposta (autenticado)
router.post("/:id/respostas", verifyToken, async (req, res) => {
  try {
    const duvida = await Duvida.findById(req.params.id);
    if (!duvida) return res.status(404).json({ error: "Dúvida não encontrada" });

    const user = await mongoose.model("User").findById(req.user.id);

    const reply = {
      text: req.body.text,
      author: user?.name || "Anônimo",
      authorId: req.user.id,
      createdAt: new Date()
    };

    duvida.replies.push(reply);
    await duvida.save();

    res.status(201).json(reply);
  } catch (err) {
    res.status(500).json({ error: "Erro ao adicionar resposta" });
  }
});

// Deletar dúvida (só autor)
router.delete("/:id", verifyToken, async (req, res) => {
  try {
    const duvida = await Duvida.findById(req.params.id);
    if (!duvida) return res.status(404).json({ error: "Dúvida não encontrada" });

    if (!duvida.authorId || duvida.authorId.toString() !== req.user.id) {
      return res.status(403).json({ error: "Você não tem permissão para excluir esta dúvida" });
    }

    await duvida.deleteOne();
    res.json({ message: "Dúvida excluída com sucesso" });
  } catch (err) {
    res.status(500).json({ error: "Erro ao excluir dúvida" });
  }
});

// Deletar resposta (só autor da resposta)
router.delete("/:id/respostas/:replyId", verifyToken, async (req, res) => {
  try {
    const duvida = await Duvida.findById(req.params.id);
    if (!duvida) return res.status(404).json({ error: "Dúvida não encontrada" });

    const resposta = duvida.replies.id(req.params.replyId);
    if (!resposta) return res.status(404).json({ error: "Resposta não encontrada" });

    if (!resposta.authorId || resposta.authorId.toString() !== req.user.id) {
      return res.status(403).json({ error: "Você não tem permissão para excluir esta resposta" });
    }

    resposta.remove();
    await duvida.save();

    res.json({ message: "Resposta excluída com sucesso" });
  } catch (err) {
    res.status(500).json({ error: "Erro ao excluir resposta" });
  }
});

export default router;