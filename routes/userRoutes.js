// routes/userRoutes.js

const express = require('express');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const authMiddleware = require('../middleware/auth'); // Importando o middleware de autenticação

const router = express.Router();
const prisma = new PrismaClient();

// Configuração do Multer para armazenamento de avatares
const avatarStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Cria a pasta se não existir (melhoria de robustez)
    const fs = require('fs');
    const dir = 'public/uploads/avatars/';
    if (!fs.existsSync(dir)){
        fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + req.user.id;
    cb(null, 'avatar-' + uniqueSuffix + path.extname(file.originalname));
  }
});
const uploadAvatar = multer({ storage: avatarStorage });

/**
 * Rota de Cadastro de CLIENTE: POST /api/usuarios
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
        role: "CLIENTE", // O padrão já faz isso, mas ser explícito é bom
      },
    });

    novoUsuario.senha = undefined;
    return res.status(201).json(novoUsuario);

  } catch (error) {
    console.error("Erro ao criar usuário:", error);
    return res.status(500).json({ error: 'Ocorreu um erro no servidor.' });
  }
});

/**
 * Rota de Cadastro de VENDEDOR: POST /api/usuarios/vendedor
 */
router.post('/vendedor', async (req, res) => {
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

    const novoVendedor = await prisma.usuario.create({
      data: {
        nome,
        email,
        senha: hashedPassword,
        role: "VENDEDOR",
      },
    });

    novoVendedor.senha = undefined;
    return res.status(201).json(novoVendedor);

  } catch (error) {
    console.error("Erro ao criar vendedor:", error);
    return res.status(500).json({ error: 'Ocorreu um erro no servidor.' });
  }
});

/**
 * Rota de Login (qualquer role): POST /api/usuarios/login
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
      { id: usuario.id, nome: usuario.nome, role: usuario.role },
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

/**
 * Rota de Upload de Avatar (protegida): POST /api/usuarios/avatar
 */
router.post(
  '/avatar',
  [authMiddleware, uploadAvatar.single('avatar')],
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'Nenhum arquivo enviado.' });
      }

      const avatarUrl = `uploads/avatars/${req.file.filename}`;

      const updatedUser = await prisma.usuario.update({
        where: { id: req.user.id },
        data: { avatarUrl: avatarUrl },
      });

      res.json({
        message: 'Avatar atualizado com sucesso!',
        avatarUrl: updatedUser.avatarUrl,
      });

    } catch (error) {
      console.error('Erro ao atualizar avatar:', error);
      res.status(500).json({ error: 'Erro interno do servidor.' });
    }
  }
);

module.exports = router;