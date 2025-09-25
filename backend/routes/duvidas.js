// backend/routes/duvidas.js
import express from "express";
import mongoose from "mongoose";
import { verifyToken } from "./auth.js";

const router = express.Router();

const ReplySchema = new mongoose.Schema({
  text: { type: String, required: true },
  authorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null,
  },
  author: { type: String, default: null },
  createdAt: { type: Date, default: Date.now },
});

const DuvidaSchema = new mongoose.Schema({
  title: { type: String, required: true },
  author: { type: String, default: "Anônimo" },
  authorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null,
  },
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
    console.error("Erro ao buscar dúvidas:", err);
    res
      .status(500)
      .json({ error: "Erro ao buscar dúvidas", details: err.message });
  }
});

// Criar dúvida (autenticado)
router.post("/", verifyToken, async (req, res) => {
  try {
    const { title, description } = req.body;
    const user = await mongoose.model("User").findById(req.user.id);

    const novaDuvida = new Duvida({
      title,
      description,
      author: user?.name || "Anônimo",
      authorId: req.user.id,
    });

    await novaDuvida.save();
    res.status(201).json(novaDuvida);
  } catch (err) {
    console.error("Erro ao criar dúvida:", err);
    res
      .status(400)
      .json({ error: "Erro ao criar dúvida", details: err.message });
  }
});

// Adicionar resposta (autenticado)
router.post("/:id/respostas", verifyToken, async (req, res) => {
  try {
    const duvidaId = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(duvidaId)) {
      return res.status(400).json({ error: "ID da dúvida inválido" });
    }

    const duvida = await Duvida.findById(duvidaId);
    if (!duvida)
      return res.status(404).json({ error: "Dúvida não encontrada" });

    const user = await mongoose.model("User").findById(req.user.id);

    const reply = {
      text: req.body.text,
      author: user?.name || "Anônimo",
      authorId: req.user.id,
      createdAt: new Date(),
    };

    duvida.replies.push(reply);
    await duvida.save();

    // pega o subdocumento salvo (já terá _id)
    const savedReply = duvida.replies[duvida.replies.length - 1];

    res.status(201).json(savedReply);
  } catch (err) {
    console.error("Erro ao adicionar resposta:", err);
    res
      .status(500)
      .json({ error: "Erro ao adicionar resposta", details: err.message });
  }
});

// Deletar dúvida (só autor)
router.delete("/:id", verifyToken, async (req, res) => {
  try {
    const duvidaId = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(duvidaId)) {
      return res.status(400).json({ error: "ID da dúvida inválido" });
    }
    const duvida = await Duvida.findById(duvidaId);
    if (!duvida)
      return res.status(404).json({ error: "Dúvida não encontrada" });

    if (!duvida.authorId || String(duvida.authorId) !== String(req.user.id)) {
      return res
        .status(403)
        .json({ error: "Você não tem permissão para excluir esta dúvida" });
    }

    await duvida.deleteOne();
    res.json({ message: "Dúvida excluída com sucesso" });
  } catch (err) {
    console.error("Erro ao excluir dúvida:", err);
    res
      .status(500)
      .json({ error: "Erro ao excluir dúvida", details: err.message });
  }
});

// Deletar resposta (só autor da resposta) - com logs e validações
router.delete("/:id/respostas/:replyId", verifyToken, async (req, res) => {
  try {
    console.log("DEBUG DELETE -> params:", req.params);
    console.log("DEBUG DELETE -> user:", req.user);

    const duvidaId = req.params.id;
    const replyId = req.params.replyId;

    if (!mongoose.Types.ObjectId.isValid(duvidaId)) {
      console.log("DEBUG: duvidaId inválido:", duvidaId);
      return res.status(400).json({ error: "ID da dúvida inválido" });
    }
    if (!mongoose.Types.ObjectId.isValid(replyId)) {
      console.log("DEBUG: replyId inválido:", replyId);
      return res.status(400).json({ error: "ID da resposta inválido" });
    }

    const duvida = await Duvida.findById(duvidaId);
    if (!duvida) {
      console.log("DEBUG: dúvida não encontrada:", duvidaId);
      return res.status(404).json({ error: "Dúvida não encontrada" });
    }

    console.log(
      "DEBUG: replies ids:",
      duvida.replies.map((r) => String(r._id))
    );

    const resposta = duvida.replies.id(replyId);
    if (!resposta) {
      console.log("DEBUG: resposta não encontrada no array");
      return res.status(404).json({ error: "Resposta não encontrada" });
    }

    console.log("DEBUG: resposta encontrada:", {
      id: String(resposta._id),
      authorId: String(resposta.authorId),
      author: resposta.author,
      text: resposta.text,
    });

    if (!req.user || !req.user.id) {
      console.log("DEBUG: req.user ausente ou inválido:", req.user);
      return res.status(401).json({ error: "Token inválido ou ausente" });
    }

    if (
      !resposta.authorId ||
      String(resposta.authorId) !== String(req.user.id)
    ) {
      console.log(
        "DEBUG: autorização falhou. resposta.authorId:",
        String(resposta.authorId),
        "req.user.id:",
        String(req.user.id)
      );
      return res
        .status(403)
        .json({ error: "Você não tem permissão para excluir esta resposta" });
    }

    // remove subdocument e salva
    resposta.remove();
    await duvida.save();
    console.log("DEBUG: resposta removida e duvida salva.");

    res.json({ message: "Resposta excluída com sucesso" });
  } catch (err) {
    console.error("ERROR ao deletar resposta:", err);
    res
      .status(500)
      .json({
        error: "Erro ao excluir resposta",
        details: err.message,
        stack: err.stack,
      });
  }
});

export default router;