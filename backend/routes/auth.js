import express from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import User from "../models/user.js";

const router = express.Router();

// Cadastro
router.post("/register", async (req, res) => {
  const { email, senha } = req.body;

  try {
    const hash = await bcrypt.hash(senha, 10);
    const newUser = new User({ email, senha: hash });
    await newUser.save();
    res.json({ message: "Usuário cadastrado com sucesso!" });
  } catch (err) {
    res.status(400).json({ error: "Erro ao cadastrar usuário." });
  }
});

// Login
router.post("/login", async (req, res) => {
  const { email, senha } = req.body;

  const user = await User.findOne({ email });
  if (!user) return res.status(400).json({ error: "Usuário não encontrado" });

  const validPass = await bcrypt.compare(senha, user.senha);
  if (!validPass) return res.status(400).json({ error: "Senha incorreta" });

  const token = jwt.sign({ id: user._id }, "segredo123", { expiresIn: "1h" });
  res.json({ message: "Login bem-sucedido!", token });
});

// Perfil protegido
router.get("/perfil", async (req, res) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) return res.status(401).json({ error: "Acesso negado!" });

  try {
    const decoded = jwt.verify(token, "segredo123");
    const user = await User.findById(decoded.id).select("-senha"); // não mostrar a senha
    res.json({ id: user._id, email: user.email });
  } catch (err) {
    res.status(401).json({ error: "Token inválido ou expirado!" });
  }
});

export function verifyToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Token ausente" });

  try {
    const decoded = jwt.verify(token, "segredo123");
    req.user = decoded; // { id: ... }
    next();
  } catch (err) {
    return res.status(401).json({ error: "Token inválido" });
  }
}


export default router;