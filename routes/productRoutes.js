// routes/produtoRoutes.js

const express = require('express');
const { PrismaClient } = require('@prisma/client');
const multer = require('multer');
const path = require('path');

const router = express.Router();
const prisma = new PrismaClient();

// Configuração do Multer
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'public/uploads/');
  },
  filenome: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldnome + '-' + uniqueSuffix + path.extnome(file.originalnome));
  }
});
const upload = multer({ storage: storage });

// CREATE - Cadastrar um novo produto
router.post('/', upload.single('imagem'), async (req, res) => {
  const { nome, descricao, valor, quantidade, tipo, codigoBarras } = req.body;
  const imagemUrl = req.file ? req.file.path.replace(/\\/g, "/").replace('public/', '') : null;

  if (!nome || valor === undefined || quantidade === undefined) {
    return res.status(400).json({ error: 'Nome, valor e quantidade são obrigatórios.' });
  }

  try {
    const produto = await prisma.produto.create({
      data: {
        nome,
        descricao,
        preco: parseFloat(valor),
        estoque: parseInt(quantidade),
        tipo,
        codigoBarras,
        imagemUrl,
      },
    });
    res.status(201).json(produto);
  } catch (error) {
    if (error.code === 'P2002') {
        return res.status(409).json({ error: 'Código de barras já cadastrado.' });
    }
    console.error("Erro ao criar produto:", error);
    res.status(500).json({ error: 'Erro ao criar o produto.' });
  }
});

// READ - Listar todos os produtos
router.get('/', async (req, res) => {
  try {
    const produtos = await prisma.produto.findMany();
    res.json(produtos);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao listar os produtos.' });
  }
});

// UPDATE - Atualizar um produto por ID (com imagem opcional)
router.put('/:id', upload.single('imagem'), async (req, res) => {
  const { id } = req.params;
  const { nome, descricao, valor, quantidade, tipo, codigoBarras } = req.body;

  const dataToUpdate = {
    nome,
    descricao,
    tipo,
    codigoBarras,
    preco: valor ? parseFloat(valor) : undefined,
    estoque: quantidade ? parseInt(quantidade) : undefined,
  };

  if (req.file) {
    dataToUpdate.imagemUrl = req.file.path.replace(/\\/g, "/").replace('public/', '');
  }

  try {
    const produto = await prisma.produto.update({
      where: { id: parseInt(id) },
      data: dataToUpdate,
    });
    res.json(produto);
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Produto não encontrado.' });
    }
    console.error("Erro ao atualizar produto:", error);
    res.status(500).json({ error: 'Erro ao atualizar o produto.' });
  }
});

// DELETE - Excluir um produto por ID
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  const produtoId = parseInt(id);
  try {
    await prisma.itemCarrinho.deleteMany({ where: { produtoId } });
    await prisma.produto.delete({ where: { id: produtoId } });
    res.status(204).send();
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Produto não encontrado.' });
    }
    res.status(500).json({ error: 'Erro ao deletar o produto.' });
  }
});

module.exports = router;