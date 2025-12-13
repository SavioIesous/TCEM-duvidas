import express from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import User from "../models/user.js";
import Notification from "../models/notification.js";

const router = express.Router();

// REGISTRO
router.post("/register", async (req, res) => {
  try {
    const { name, email, senha } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: "O nome é obrigatório." });
    }
    if (!email || !senha) {
      return res.status(400).json({ error: "Email e senha são obrigatórios." });
    }

    const exists = await User.findOne({ email });
    if (exists) {
      return res.status(400).json({ error: "Esse e-mail já está cadastrado." });
    }

    const hash = await bcrypt.hash(senha, 10);
    const newUser = new User({ name: name.trim(), email, senha: hash });
    await newUser.save();
    res.json({ message: "Cadastro realizado!" });
  } catch (err) {
    console.error("Erro no register:", err);
    res.status(400).json({ error: "Erro ao cadastrar.", details: err.message });
  }
});

// LOGIN 
router.post("/login", async (req, res) => {
  const { email, senha } = req.body;

  const user = await User.findOne({ email });
  if (!user) return res.status(400).json({ error: "Usuário não encontrado" });

  const validPass = await bcrypt.compare(senha, user.senha);
  if (!validPass) return res.status(400).json({ error: "Senha incorreta" });

  const token = jwt.sign({ id: user._id }, "segredo123", { expiresIn: "1h" });
  res.json({ message: "Login bem-sucedido!", token });
});

// VALIDAÇÃO DE TOKEN 
router.get("/validate", (req, res) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Token ausente" });

  try {
    jwt.verify(token, "segredo123");
    res.sendStatus(200);
  } catch (err) {
    res.status(401).json({ error: "Token inválido" });
  }
});

// OBTER DADOS DO USUÁRIO
router.get("/me", verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-senha");
    if (!user) return res.status(404).json({ error: "Usuário não encontrado" });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: "Erro ao buscar usuário" });
  }
});

// ATUALIZAR PERFIL
router.put("/profile", verifyToken, async (req, res) => {
  try {
    const { name, senha } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: "O nome é obrigatório." });
    }

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: "Usuário não encontrado" });

    user.name = name.trim();

    if (senha && senha.trim()) {
      const hash = await bcrypt.hash(senha.trim(), 10);
      user.senha = hash;
    }

    await user.save();
    res.json({ message: "Perfil atualizado com sucesso!" });
  } catch (err) {
    console.error("Erro ao atualizar perfil:", err);
    res.status(500).json({ error: "Erro ao atualizar perfil" });
  }
});

// OBTER NOTIFICAÇÕES NÃO LIDAS
router.get("/notifications", verifyToken, async (req, res) => {
  try {
    const notifications = await Notification.find({ 
      userId: req.user.id,
      read: false 
    })
    .sort({ createdAt: -1 })
    .limit(20);

    res.json(notifications);
  } catch (err) {
    console.error("Erro ao buscar notificações:", err);
    res.status(500).json({ error: "Erro ao buscar notificações" });
  }
});

// MARCAR NOTIFICAÇÕES COMO LIDAS
router.post("/notifications/mark-read", verifyToken, async (req, res) => {
  try {
    await Notification.updateMany(
      { userId: req.user.id, read: false },
      { read: true }
    );
    res.json({ message: "Notificações marcadas como lidas" });
  } catch (err) {
    console.error("Erro ao marcar notificações:", err);
    res.status(500).json({ error: "Erro ao marcar notificações" });
  }
});

// CONTAR NOTIFICAÇÕES NÃO LIDAS
router.get("/notifications/count", verifyToken, async (req, res) => {
  try {
    const count = await Notification.countDocuments({ 
      userId: req.user.id,
      read: false 
    });
    res.json({ count });
  } catch (err) {
    console.error("Erro ao contar notificações:", err);
    res.status(500).json({ error: "Erro ao contar notificações" });
  }
});
 
export function verifyToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Token ausente" });

  try {
    const decoded = jwt.verify(token, "segredo123");
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Token inválido" });
  }
}

export default router;