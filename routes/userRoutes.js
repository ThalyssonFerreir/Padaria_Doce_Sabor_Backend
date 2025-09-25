const express = require('express');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const authMiddleware = require('../middleware/auth');
const nodemailer = require('nodemailer');

const router = express.Router();
const prisma = new PrismaClient();

const avatarStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const fs = require('fs');
    const dir = 'public/uploads/avatars/';
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + req.usuario.id;
    cb(null, 'avatar-' + uniqueSuffix + path.extname(file.originalname));
  }
});
const uploadAvatar = multer({ storage: avatarStorage });

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
});

async function enviarEmailSolicitacao(solicitacao, codigoAprovacao) {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: process.env.EMAIL_RECEIVER,
    subject: 'Nova Solicitação de Vendedor',
    html: `
      <h2>Nova solicitação de vendedor</h2>
      <p><strong>Nome:</strong> ${solicitacao.nome}</p>
      <p><strong>Email:</strong> ${solicitacao.email}</p>
      <p><strong>Telefone:</strong> ${solicitacao.telefone}</p>
      <p><strong>Código de Aprovação:</strong> ${codigoAprovacao}</p>
    `
  };
  return transporter.sendMail(mailOptions);
}

/**
 * Cadastro CLIENTE
 */
router.post('/', async (req, res) => {
  const { nome, email, senha } = req.body;
  if (!nome || !email || !senha) return res.status(400).json({ error: 'Preencha todos os campos.' });

  try {
    const usuarioExists = await prisma.usuario.findUnique({ where: { email } });
    if (usuarioExists) return res.status(409).json({ error: 'Email já cadastrado.' });

    const hashedSenha = await bcrypt.hash(senha, 10);
    const novoUsuario = await prisma.usuario.create({ data: { nome, email, senha: hashedSenha, role: "CLIENTE" } });
    novoUsuario.senha = undefined;
    res.status(201).json(novoUsuario);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro no servidor.' });
  }
});

/**
 * Login
 */
router.post('/login', async (req, res) => {
  const { email, senha } = req.body;
  if (!email || !senha) return res.status(400).json({ error: 'Email e senha/código obrigatórios.' });

  try {
    const usuario = await prisma.usuario.findUnique({ where: { email } });

    // Vendedor
    const solicitacao = await prisma.solicitacaoVendedor.findUnique({ where: { email } });

    if (solicitacao) {
      // permite login se senha == codigoAprovacao
      if (senha !== solicitacao.codigoAprovacao) return res.status(401).json({ error: 'Código de aprovação inválido.' });

      const token = jwt.sign(
        { id: usuario?.id, nome: usuario?.nome, role: 'VENDEDOR' },
        process.env.JWT_SECRET,
        { expiresIn: '8h' }
      );

      return res.json({
        message: 'Login de vendedor bem-sucedido!',
        usuario: usuario || { nome: solicitacao.nome, email: solicitacao.email, role: 'VENDEDOR' },
        token,
        solicitacaoVendedor: { status: solicitacao.status }
      });
    }

    // Cliente ou outros roles
    if (!usuario) return res.status(401).json({ error: 'Usuário não encontrado.' });
    const senhaValida = await bcrypt.compare(senha, usuario.senha);
    if (!senhaValida) return res.status(401).json({ error: 'Senha inválida.' });

    const token = jwt.sign(
      { id: usuario.id, nome: usuario.nome, role: usuario.role },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );

    usuario.senha = undefined;
    res.json({ message: 'Login bem-sucedido!', usuario, token });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro no servidor.' });
  }
});

/**
 * Rota de Upload de avatar
 */
router.post('/avatar', [authMiddleware, uploadAvatar.single('avatar')], async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Nenhum arquivo enviado.' });

    const avatarUrl = `uploads/avatars/${req.file.filename}`;
    const updatedUsuario = await prisma.usuario.update({
      where: { id: req.usuario.id },
      data: { avatarUrl }
    });

    res.json({ message: 'Avatar atualizado!', avatarUrl: updatedUsuario.avatarUrl });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro interno do servidor.' });
  }
});

/**
 * Solicitação de vendedor
 */
router.post('/solicitacao-vendedor', async (req, res) => {
  const { nome, email, telefone } = req.body;
  if (!nome || !email || !telefone) return res.status(400).json({ error: 'Todos os campos obrigatórios.' });

  try {
    const existing = await prisma.solicitacaoVendedor.findUnique({ where: { email } });
    if (existing) return res.status(409).json({ error: 'Solicitação já existe para este email.' });

    const codigoAprovacao = Math.random().toString(36).substring(2, 8).toUpperCase();

    const solicitacao = await prisma.solicitacaoVendedor.create({
      data: { nome, email, telefone, codigoAprovacao, status: 'PENDENTE' }
    });

    await enviarEmailSolicitacao(solicitacao, codigoAprovacao);
    res.status(201).json({ message: 'Solicitação enviada!', codigoAprovacao });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro interno.' });
  }
});

module.exports = router;
