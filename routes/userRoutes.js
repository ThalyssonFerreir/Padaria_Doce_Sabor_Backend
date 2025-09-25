const express = require('express');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const authMiddleware = require('../middleware/auth'); // Importando o middleware de autenticação
const nodemailer = require('nodemailer');

const router = express.Router();
const prisma = new PrismaClient();

// Configuração do Multer para armazenamento de avatares
const avatarStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    const fs = require('fs');
    const dir = 'public/uploads/avatars/';
    if (!fs.existsSync(dir)){
        fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filenome: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + req.usuario.id;
    cb(null, 'avatar-' + uniqueSuffix + path.extname(file.originalname));
  }
});
const uploadAvatar = multer({ storage: avatarStorage });

// Configuração do Nodemailer
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,       // Gmail que envia
    pass: process.env.EMAIL_PASS        // Senha de app
  }
});

// Função para enviar e-mail de nova solicitação
async function enviarEmailSolicitacao(solicitacao, codigoAprovacao) {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: process.env.EMAIL_RECEIVER, // Gmail que vai receber a solicitação
    subject: 'Nova Solicitação de Vendedor',
    html: `
      <h2>Nova solicitação de vendedor</h2>
      <p><strong>Nome:</strong> ${solicitacao.nome}</p>
      <p><strong>Email:</strong> ${solicitacao.email}</p>
      <p><strong>Telefone:</strong> ${solicitacao.telefone}</p>
      <p><strong>Endereço:</strong> ${solicitacao.endereco}</p>
      <p><strong>Descrição:</strong> ${solicitacao.descricao}</p>
      <p><strong>Código de Aprovação:</strong> ${codigoAprovacao}</p>
    `
  };
  return transporter.sendMail(mailOptions);
}

/**
 * Rota de Cadastro de CLIENTE: POST /api/usuarios
 */
router.post('/', async (req, res) => {
  const { nome, email, senha } = req.body;
  if (!nome || !email || !senha) return res.status(400).json({ error: 'Por favor, preencha todos os campos.' });

  try {
    const usuarioExists = await prisma.usuario.findUnique({ where: { email } });
    if (usuarioExists) return res.status(409).json({ error: 'Este email já está em uso.' });

    const hashedsenha = await bcrypt.hash(senha, 10);
    const novoUsuario = await prisma.usuario.create({
      data: { nome, email, senha: hashedsenha, role: "CLIENTE" }
    });

    novoUsuario.senha = undefined;
    res.status(201).json(novoUsuario);
  } catch (error) {
    console.error("Erro ao criar usuário:", error);
    res.status(500).json({ error: 'Ocorreu um erro no servidor.' });
  }
});

/**
 * Rota de Login (qualquer role): POST /api/usuarios/login
 */
router.post('/login', async (req, res) => {
  const { email, senha } = req.body;
  if (!email || !senha) return res.status(400).json({ error: 'Por favor, forneça email e senha.' });

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
    res.json({ message: "Login bem-sucedido!", usuario, token });
  } catch (error) {
    console.error("Erro no login:", error);
    res.status(500).json({ error: 'Ocorreu um erro no servidor.' });
  }
});

/**
 * Rota de Upload de Avatar (protegida): POST /api/usuarios/avatar
 */
router.post('/avatar', [authMiddleware, uploadAvatar.single('avatar')], async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Nenhum arquivo enviado.' });

    const avatarUrl = `uploads/avatars/${req.file.filenome}`;
    const updatedusuario = await prisma.usuario.update({
      where: { id: req.usuario.id },
      data: { avatarUrl }
    });

    res.json({ message: 'Avatar atualizado com sucesso!', avatarUrl: updatedusuario.avatarUrl });
  } catch (error) {
    console.error('Erro ao atualizar avatar:', error);
    res.status(500).json({ error: 'Erro interno do servidor.' });
  }
});

/**
 * Rota de Solicitação de Vendedor: POST /api/usuarios/solicitacao-vendedor
 */
router.post('/solicitacao-vendedor', async (req, res) => {
  const { nome, email, telefone, endereco, descricao } = req.body;
  if (!nome || !email || !telefone || !endereco || !descricao) {
    return res.status(400).json({ error: 'Todos os campos são obrigatórios.' });
  }

  try {
    const existing = await prisma.solicitacaoVendedor.findUnique({ where: { email } });
    if (existing) return res.status(409).json({ error: 'Já existe uma solicitação para este email.' });

    // Gera código de aprovação
    const codigoAprovacao = Math.random().toString(36).substring(2, 8).toUpperCase();

    const solicitacao = await prisma.solicitacaoVendedor.create({
      data: { nome, email, telefone, endereco, descricao, codigoAprovacao, status: 'PENDENTE' }
    });

    // Envia e-mail automático
    await enviarEmailSolicitacao(solicitacao, codigoAprovacao);

    res.status(201).json({ message: 'Solicitação enviada com sucesso!' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro interno ao criar solicitação.' });
  }
});

/**
 * Rota de criação de Vendedor com código de aprovação: POST /api/usuarios/vendedor
 */
router.post('/vendedor', async (req, res) => {
  const { nome, email, senha, codigoAprovacao } = req.body;
  if (!nome || !email || !senha || !codigoAprovacao) {
    return res.status(400).json({ error: 'Todos os campos são obrigatórios, incluindo o código de aprovação.' });
  }

  try {
    const solicitacao = await prisma.solicitacaoVendedor.findFirst({
      where: { email, codigoAprovacao, status: 'APROVADO' }
    });

    if (!solicitacao) return res.status(400).json({ error: 'Código inválido ou solicitação não aprovada.' });

    const usuarioExists = await prisma.usuario.findUnique({ where: { email } });
    if (usuarioExists) return res.status(409).json({ error: 'Email já cadastrado.' });

    const hashedSenha = await bcrypt.hash(senha, 10);
    const novoVendedor = await prisma.usuario.create({
      data: { nome, email, senha: hashedSenha, role: "VENDEDOR" }
    });

    novoVendedor.senha = undefined;
    res.status(201).json(novoVendedor);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao criar vendedor.' });
  }
});

module.exports = router;
