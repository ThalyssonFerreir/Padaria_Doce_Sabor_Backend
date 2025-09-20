// controllers/productController.js
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

/**
 * Criar produto
 */
const createProduct = async (req, res) => {
  const { name, description, sale, stock } = req.body;

  if (!name || sale === undefined || stock === undefined) {
    return res.status(400).json({ error: "Nome, preço e estoque são obrigatórios." });
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
    return res.status(201).json(product);
  } catch (error) {
    console.error("Erro ao criar produto:", error);
    return res.status(500).json({ error: "Erro ao criar o produto." });
  }
};

/**
 * Listar todos os produtos
 */
const getAllProducts = async (req, res) => {
  try {
    const products = await prisma.product.findMany();
    return res.json(products);
  } catch (error) {
    console.error("Erro ao listar produtos:", error);
    return res.status(500).json({ error: "Erro ao listar os produtos." });
  }
};

/**
 * Atualizar produto
 */
const updateProduct = async (req, res) => {
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
    return res.json(product);
  } catch (error) {
    if (error.code === "P2025") {
      return res.status(404).json({ error: "Produto não encontrado." });
    }
    console.error("Erro ao atualizar produto:", error);
    return res.status(500).json({ error: "Erro ao atualizar o produto." });
  }
};

/**
 * Deletar produto
 */
const deleteProduct = async (req, res) => {
  const { id } = req.params;

  try {
    await prisma.product.delete({ where: { id: parseInt(id) } });
    return res.status(204).send();
  } catch (error) {
    if (error.code === "P2025") {
      return res.status(404).json({ error: "Produto não encontrado." });
    }
    console.error("Erro ao deletar produto:", error);
    return res.status(500).json({ error: "Erro ao deletar o produto." });
  }
};

module.exports = {
  createProduct,
  getAllProducts,
  updateProduct,
  deleteProduct
};
