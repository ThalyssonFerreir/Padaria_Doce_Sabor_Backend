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
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Por favor, preencha todos os campos.' });
  }

  try {
    const userExists = await prisma.user.findUnique({
      where: { email },
    });

    if (userExists) {
      return res.status(409).json({ error: 'Este email já está em uso.' });
    }

    const hashedPassword = await bcrypt.hash(senha, 10);

    const newUser = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
      },
    });

    newUser.password = undefined; // Remove a senha da resposta

    // Se tudo deu certo, envia a resposta de sucesso
    return res.status(201).json(newUser);

  } catch (error) {
    console.error("Erro ao criar usuário:", error); // Log do erro no terminal
    return res.status(500).json({ error: 'Ocorreu um erro no servidor.' });
  }
});

/**
 * Rota de Login: POST /api/usuarios/login
 */
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Por favor, forneça email e senha.' });
  }

  try {
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: 'Credenciais inválidas.' });
    }

    const token = jwt.sign(
      { id: user.id, name: user.name },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );

    user.password = undefined;

    return res.json({
      message: "Login bem-sucedido!",
      user,
      token,
    });

  } catch (error) {
    console.error("Erro no login:", error);
    return res.status(500).json({ error: 'Ocorreu um erro no servidor.' });
  }
});

module.exports = router;