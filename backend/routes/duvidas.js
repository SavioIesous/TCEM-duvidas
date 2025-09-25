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
// Deletar resposta (só autor da resposta) - forma atômica com $pull
router.delete("/:id/respostas/:replyId", verifyToken, async (req, res) => {
  try {
    const { id: duvidaId, replyId } = req.params;

    // valida ids
    if (!mongoose.Types.ObjectId.isValid(duvidaId))
      return res.status(400).json({ error: "ID da dúvida inválido" });
    if (!mongoose.Types.ObjectId.isValid(replyId))
      return res.status(400).json({ error: "ID da resposta inválido" });

    // buscar apenas o subdocumento da resposta para checar autor
    const duvidaComResposta = await Duvida.findOne(
      { _id: duvidaId, "replies._id": replyId },
      { "replies.$": 1 } // pega só o subdocumento correspondente
    );

    if (!duvidaComResposta) {
      return res.status(404).json({ error: "Resposta não encontrada" });
    }

    const resposta = duvidaComResposta.replies[0];
    if (!resposta)
      return res.status(404).json({ error: "Resposta não encontrada" });

    // checar token presente
    if (!req.user || !req.user.id) {
      return res.status(401).json({ error: "Token inválido ou ausente" });
    }

    // checar se é o autor
    if (
      !resposta.authorId ||
      String(resposta.authorId) !== String(req.user.id)
    ) {
      return res
        .status(403)
        .json({ error: "Você não tem permissão para excluir esta resposta" });
    }

    // operação atômica para remover a resposta
    const result = await Duvida.updateOne(
      { _id: duvidaId },
      { $pull: { replies: { _id: replyId } } }
    );

    if (result.modifiedCount === 0) {
      // nenhum documento modificado — pode indicar que já foi removida
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