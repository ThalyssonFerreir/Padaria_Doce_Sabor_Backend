// routes/productRoutes.js

const express = require('express');
const { PrismaClient } = require('@prisma/client');

const router = express.Router();
const prisma = new PrismaClient();

// CREATE - Cadastrar um novo produto
router.post('/', async (req, res) => {
  const { nome, descricao, preco, estoque } = req.body;

  if (!nome || preco === undefined || estoque === undefined) {
    return res.status(400).json({ error: 'Nome, preço e estoque são obrigatórios.' });
  }

  try {
    const produto = await prisma.produto.create({
      data: {
        nome,
        descricao,
        preco: parseFloat(preco),
        estoque: parseInt(estoque),
      },
    });
    res.status(201).json(produto);
  } catch (error) {
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

// UPDATE - Atualizar um produto por ID
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { nome, descricao, preco, estoque } = req.body;

  try {
    const produto = await prisma.produto.update({
      where: { id: parseInt(id) },
      data: {
        nome,
        descricao,
        preco: preco ? parseFloat(preco) : undefined,
        estoque: estoque ? parseInt(estoque) : undefined,
      },
    });
    res.json(produto);
  } catch (error) {
    // P2025 é o código de erro do Prisma para "Registro não encontrado"
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Produto não encontrado.' });
    }
    res.status(500).json({ error: 'Erro ao atualizar o produto.' });
  }
});

// DELETE - Excluir um produto por ID
router.delete('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    await prisma.produto.delete({
      where: { id: parseInt(id) },
    });
    // res.status(204) é para "No Content", uma resposta de sucesso sem corpo.
    res.status(204).send();
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Produto não encontrado.' });
    }
    res.status(500).json({ error: 'Erro ao deletar o produto.' });
  }
});

module.exports = router;