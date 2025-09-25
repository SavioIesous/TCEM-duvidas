// backend/routes/duvidas.js
import express from "express";
import mongoose from "mongoose";
import { verifyToken } from "./auth.js"; // <- importar o middleware

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
      author: user?.name || "Anônimo",
      authorId: req.user.id,
    });

    await novaDuvida.save();
    res.status(201).json(novaDuvida);
  } catch (err) {
    res.status(400).json({ error: "Erro ao criar dúvida" });
  }
});

router.post("/:id/respostas", verifyToken, async (req, res) => {
  try {
    const duvida = await Duvida.findById(req.params.id);
    if (!duvida)
      return res.status(404).json({ error: "Dúvida não encontrada" });

    const user = await mongoose.model("User").findById(req.user.id);

    const reply = {
      text: req.body.text,
      author: user?.name || "Anônimo",
      authorId: req.user.id,
      createdAt: new Date(),
    };

    // push + save
    duvida.replies.push(reply);
    await duvida.save();

    // pegar o subdocumento salvo (ele já terá _id gerado pelo mongoose)
    const savedReply = duvida.replies[duvida.replies.length - 1];

    res.status(201).json(savedReply);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao adicionar resposta" });
  }
});

// Deletar dúvida (só autor)
router.delete("/:id", verifyToken, async (req, res) => {
  try {
    const duvida = await Duvida.findById(req.params.id);
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
    res.status(500).json({ error: "Erro ao excluir dúvida" });
  }
});

// Deletar resposta (só autor da resposta)
// Deletar resposta (só autor da resposta) - versão com logs de debug
router.delete("/:id/respostas/:replyId", verifyToken, async (req, res) => {
  try {
    console.log("DEBUG DELETE resposta -> params:", req.params);
    console.log("DEBUG DELETE resposta -> user (do token):", req.user);

    const duvida = await Duvida.findById(req.params.id);
    if (!duvida) {
      console.log("DEBUG: dúvida não encontrada", req.params.id);
      return res.status(404).json({ error: "Dúvida não encontrada" });
    }

    // pega a resposta pelo subdocument id
    const resposta = duvida.replies.id(req.params.replyId);
    if (!resposta) {
      console.log(
        "DEBUG: resposta não encontrada no array. replies:",
        duvida.replies.map((r) => String(r._id))
      );
      return res.status(404).json({ error: "Resposta não encontrada" });
    }

    console.log("DEBUG: resposta encontrada:", {
      id: String(resposta._id),
      authorId: String(resposta.authorId),
      author: resposta.author,
      text: resposta.text,
    });

    // garante req.user e compara como string
    if (!req.user || !req.user.id) {
      console.log("DEBUG: req.user ausente:", req.user);
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

    // remove e salva
    resposta.remove();
    await duvida.save();
    console.log("DEBUG: resposta removida e duvida salva.");

    res.json({ message: "Resposta excluída com sucesso" });
  } catch (err) {
    console.error("ERROR ao deletar resposta:", err);
    // retorna stack no JSON só para debugging — remova em produção
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
//teste
