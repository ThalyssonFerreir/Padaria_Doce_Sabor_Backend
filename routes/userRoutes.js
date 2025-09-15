// routes/userRoutes.js

const express = require('express');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const router = express.Router();
const prisma = new PrismaClient();

/**
 * Rota de Cadastro: POST /api/usuarios
 */
router.post('/', async (req, res) => {
  const { nome, email, senha } = req.body;

  if (!nome || !email || !senha) {
    return res.status(400).json({ error: 'Por favor, preencha todos os campos.' });
  }

  try {
    const userExists = await prisma.usuario.findUnique({
      where: { email },
    });

    if (userExists) {
      return res.status(409).json({ error: 'Este email já está em uso.' });
    }

    const hashedPassword = await bcrypt.hash(senha, 10);

    const novoUsuario = await prisma.usuario.create({
      data: {
        nome,
        email,
        senha: hashedPassword,
      },
    });

    novoUsuario.senha = undefined; // Remove a senha da resposta

    // Se tudo deu certo, envia a resposta de sucesso
    return res.status(201).json(novoUsuario);

  } catch (error) {
    console.error("Erro ao criar usuário:", error); // Log do erro no terminal
    return res.status(500).json({ error: 'Ocorreu um erro no servidor.' });
  }
});

/**
 * Rota de Login: POST /api/usuarios/login
 */
router.post('/login', async (req, res) => {
  const { email, senha } = req.body;

  if (!email || !senha) {
    return res.status(400).json({ error: 'Por favor, forneça email e senha.' });
  }

  try {
    const usuario = await prisma.usuario.findUnique({ where: { email } });

    if (!usuario || !(await bcrypt.compare(senha, usuario.senha))) {
      return res.status(401).json({ error: 'Credenciais inválidas.' });
    }

    const token = jwt.sign(
      { id: usuario.id, nome: usuario.nome },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );

    usuario.senha = undefined;

    return res.json({
      message: "Login bem-sucedido!",
      usuario,
      token,
    });

  } catch (error) {
    console.error("Erro no login:", error);
    return res.status(500).json({ error: 'Ocorreu um erro no servidor.' });
  }
});

module.exports = router;