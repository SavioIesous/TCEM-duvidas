import express from "express";
import mongoose from "mongoose";
import { verifyToken } from "./auth.js";
import Notification from "../models/notification.js";

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
  tag: { type: String, default: null },
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

// GET /duvidas
router.get("/", async (req, res) => {
  try {
    const duvidas = await Duvida.find().lean().sort({ createdAt: -1 });
    console.log("GET /duvidas -> enviando", duvidas.length, "documentos");
    res.json(duvidas);
  } catch (err) {
    console.error("Erro em GET /duvidas:", err);
    res.status(500).json({ error: "Erro ao buscar dúvidas" });
  }
});

// POST /duvidas
router.post("/", verifyToken, async (req, res) => {
  try {
    const { title, description, author, tag } = req.body;
    console.log("POST /duvidas -> req.body:", req.body);

    const user = await mongoose.model("User").findById(req.user.id);

    const tagClean =
      typeof tag === "string" && tag.trim().length > 0 ? tag.trim() : null;

    const novaDuvida = new Duvida({
      title,
      description,
      tag: tagClean,
      author: author || user?.name || "Anônimo",
      authorId: req.user.id,
    });

    const saved = await novaDuvida.save();
    console.log("POST /duvidas -> saved (raw from save):", saved);

    const savedFromDb = await Duvida.findById(saved._id).lean();
    console.log("POST /duvidas -> fetched from DB:", savedFromDb);

    return res.status(201).json(savedFromDb);
  } catch (err) {
    console.error("Erro ao criar dúvida:", err);
    res
      .status(400)
      .json({ error: "Erro ao criar dúvida", details: err.message });
  }
});

// POST /duvidas/:id/respostas
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

    const savedReply = duvida.replies[duvida.replies.length - 1];

    // Criar notificação se a resposta não for do próprio autor da dúvida
    if (duvida.authorId && String(duvida.authorId) !== String(req.user.id)) {
      try {
        const notification = new Notification({
          userId: duvida.authorId,
          duvidaId: duvida._id,
          duvidaTitle: duvida.title,
          authorId: req.user.id,
          authorName: user?.name || "Anônimo",
        });
        await notification.save();
        console.log("Notificação criada para usuário:", duvida.authorId);
      } catch (notifErr) {
        console.error("Erro ao criar notificação:", notifErr);
      }
    }

    res.status(201).json(savedReply);
  } catch (err) {
    console.error("Erro ao adicionar resposta:", err);
    res
      .status(500)
      .json({ error: "Erro ao adicionar resposta", details: err.message });
  }
});

// DELETE /duvidas/:id
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
    
    // Deletar notificações relacionadas a esta dúvida
    await Notification.deleteMany({ duvidaId: duvidaId });
    
    res.json({ message: "Dúvida excluída com sucesso" });
  } catch (err) {
    console.error("Erro ao excluir dúvida:", err);
    res
      .status(500)
      .json({ error: "Erro ao excluir dúvida", details: err.message });
  }
});

// DELETE /duvidas/:id/respostas/:replyId
router.delete("/:id/respostas/:replyId", verifyToken, async (req, res) => {
  try {
    const { id: duvidaId, replyId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(duvidaId))
      return res.status(400).json({ error: "ID da dúvida inválido" });
    if (!mongoose.Types.ObjectId.isValid(replyId))
      return res.status(400).json({ error: "ID da resposta inválido" });

    const duvidaComResposta = await Duvida.findOne(
      { _id: duvidaId, "replies._id": replyId },
      { "replies.$": 1 }
    );

    if (!duvidaComResposta) {
      return res.status(404).json({ error: "Resposta não encontrada" });
    }

    const resposta = duvidaComResposta.replies[0];
    if (!resposta)
      return res.status(404).json({ error: "Resposta não encontrada" });

    if (!req.user || !req.user.id) {
      return res.status(401).json({ error: "Token inválido ou ausente" });
    }

    if (
      !resposta.authorId ||
      String(resposta.authorId) !== String(req.user.id)
    ) {
      return res
        .status(403)
        .json({ error: "Você não tem permissão para excluir esta resposta" });
    }

    const result = await Duvida.updateOne(
      { _id: duvidaId },
      { $pull: { replies: { _id: replyId } } }
    );

    if (result.modifiedCount === 0) {
      return res
        .status(404)
        .json({ error: "Resposta não encontrada (já removida?)" });
    }

    return res.json({ message: "Resposta excluída com sucesso" });
  } catch (err) {
    console.error("ERROR ao deletar resposta (atômico):", err);
    return res
      .status(500)
      .json({ error: "Erro ao excluir resposta", details: err.message });
  }
});

export default router;
// update