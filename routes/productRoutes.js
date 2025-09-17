// routes/productRoutes.js

const express = require("express");
const { PrismaClient } = require("@prisma/client");

const router = express.Router();
const prisma = new PrismaClient();

// CREATE - Cadastrar um novo produto
router.post("/", async (req, res) => {
  const { name, description, sale, stock } = req.body;

  if (!name || sale === undefined || stock === undefined) {
    return res
      .status(400)
      .json({ error: "Nome, preço e estoque são obrigatórios." });
  }

  try {
    const product = await prisma.product.create({
      data: {
        name,
        description,
        sale: parseFloat(sale),
        stock: parseInt(stock),
      },
    });
    res.status(201).json(product);
  } catch (error) {
    res.status(500).json({ error: "Erro ao criar o produto." });
  }
});

// READ - Listar todos os produtos
router.get("/", async (req, res) => {
  try {
    const products = await prisma.product.findMany();
    res.json(products);
  } catch (error) {
    res.status(500).json({ error: "Erro ao listar os produtos." });
  }
});

// UPDATE - Atualizar um produto por ID
router.put("/:id", async (req, res) => {
  const { id } = req.params;
  const { name, description, sale, stock } = req.body;

  try {
    const product = await prisma.product.update({
      where: { id: parseInt(id) },
      data: {
        name,
        description,
        sale: sale ? parseFloat(sale) : undefined,
        stock: stock ? parseInt(stock) : undefined,
      },
    });
    res.json(product);
  } catch (error) {
    // P2025 é o código de erro do Prisma para "Registro não encontrado"
    if (error.code === "P2025") {
      return res.status(404).json({ error: "Produto não encontrado." });
    }
    res.status(500).json({ error: "Erro ao atualizar o produto." });
  }
});

// DELETE - Excluir um produto por ID
router.delete("/:id", async (req, res) => {
  const { id } = req.params;

  try {
    await prisma.product.delete({
      where: { id: parseInt(id) },
    });
    // res.status(204) é para "No Content", uma resposta de sucesso sem corpo.
    res.status(204).send();
  } catch (error) {
    if (error.code === "P2025") {
      return res.status(404).json({ error: "Produto não encontrado." });
    }
    res.status(500).json({ error: "Erro ao deletar o produto." });
  }
});

module.exports = router;
