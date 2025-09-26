import express from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import User from "../models/user.js";

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