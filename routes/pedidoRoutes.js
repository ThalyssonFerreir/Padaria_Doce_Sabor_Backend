const express = require('express');
const { PrismaClient } = require('@prisma/client');
const authMiddleware = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

// ROTA DE ADICIONAR ITEM AO CARRINHO (LÓGICA REFINADA)
router.post('/carrinho/adicionar', authMiddleware, async (req, res) => {
    const { produtoId, quantidade } = req.body;
    const usuarioId = req.user.id;

    try {
        const produto = await prisma.produto.findUnique({ where: { id: produtoId } });
        if (!produto || produto.estoque < quantidade) {
            return res.status(400).json({ error: 'Produto fora de estoque ou indisponível.' });
        }

        // Garante que o usuário tenha um carrinho
        let carrinho = await prisma.carrinho.findUnique({ where: { usuarioId } });
        if (!carrinho) {
            carrinho = await prisma.carrinho.create({ data: { usuarioId } });
        }

        // Procura pelo item específico no carrinho
        const itemExistente = await prisma.itemCarrinho.findFirst({
            where: {
                carrinhoId: carrinho.id,
                produtoId: produtoId,
            }
        });

        if (itemExistente) {
            // Se o item JÁ EXISTE, apenas incrementa a quantidade
            await prisma.itemCarrinho.update({
                where: { id: itemExistente.id },
                data: { quantidade: { increment: quantidade } },
            });
        } else {
            // Se o item NÃO EXISTE, cria um novo
            await prisma.itemCarrinho.create({
                data: {
                    carrinhoId: carrinho.id,
                    produtoId: produtoId,
                    quantidade: quantidade,
                },
            });
        }

        res.status(200).json({ message: 'Item adicionado ao carrinho!' });

    } catch (error) {
        console.error("Erro ao adicionar item:", error);
        res.status(500).json({ error: 'Erro ao adicionar item ao carrinho.' });
    }
});

// --- O RESTANTE DAS ROTAS CONTINUA IGUAL ---

// GET /carrinho
router.get('/carrinho', authMiddleware, async (req, res) => {
    const usuarioId = req.user.id;
    try {
        const carrinho = await prisma.carrinho.findUnique({
            where: { usuarioId },
            include: { itens: { include: { produto: true }, orderBy: { id: 'asc' } } }
        });
        if (!carrinho) return res.json([]);
        res.json(carrinho.itens);
    } catch (error) { res.status(500).json({ error: 'Erro ao buscar o carrinho.' }); }
});

// PUT /carrinho/item
router.put('/carrinho/item', authMiddleware, async (req, res) => {
    const { produtoId, quantidade } = req.body;
    const usuarioId = req.user.id;
    try {
        if (quantidade <= 0) {
            // Se a quantidade for 0 ou menos, remove o item em vez de dar erro
            const carrinho = await prisma.carrinho.findUnique({ where: { usuarioId } });
            if (!carrinho) return res.status(404).json({ error: "Carrinho não encontrado." });
            await prisma.itemCarrinho.delete({ where: { carrinhoId_produtoId: { carrinhoId: carrinho.id, produtoId: parseInt(produtoId) } } });
            return res.status(204).send();
        }
        const carrinho = await prisma.carrinho.findUnique({ where: { usuarioId } });
        if (!carrinho) return res.status(404).json({ error: "Carrinho não encontrado." });

        await prisma.itemCarrinho.update({
            where: { carrinhoId_produtoId: { carrinhoId: carrinho.id, produtoId: parseInt(produtoId) } },
            data: { quantidade },
        });
        res.status(200).json({ message: "Quantidade atualizada." });
    } catch (error) { res.status(500).json({ error: "Erro ao atualizar quantidade." }); }
});

// DELETE /carrinho/item/:produtoId
router.delete('/carrinho/item/:produtoId', authMiddleware, async (req, res) => {
    const { produtoId } = req.params;
    const usuarioId = req.user.id;
    try {
        const carrinho = await prisma.carrinho.findUnique({ where: { usuarioId } });
        if (!carrinho) return res.status(404).json({ error: "Carrinho não encontrado." });

        await prisma.itemCarrinho.delete({
            where: { carrinhoId_produtoId: { carrinhoId: carrinho.id, produtoId: parseInt(produtoId) } },
        });
        res.status(204).send();
    } catch (error) { res.status(500).json({ error: "Erro ao remover item." }); }
});

// --- ROTAS DE PEDIDOS ---

// FINALIZAR a compra
router.post('/pedidos/finalizar', authMiddleware, async (req, res) => {
    const usuarioId = req.user.id;
    try {
        const carrinho = await prisma.carrinho.findUnique({
            where: { usuarioId },
            include: { itens: { include: { produto: true } } },
        });

        if (!carrinho || carrinho.itens.length === 0) {
            return res.status(400).json({ error: 'Seu carrinho está vazio.' });
        }

        const valorTotal = carrinho.itens.reduce((total, item) => total + item.produto.preco * item.quantidade, 0);

        const pedido = await prisma.$transaction(async (tx) => {
            for (const item of carrinho.itens) {
                const produtoDB = await tx.produto.findUnique({ where: { id: item.produtoId } });
                if (produtoDB.estoque < item.quantidade) {
                    throw new Error(`Estoque insuficiente para o produto: ${produtoDB.nome}`);
                }
            }
            const novoPedido = await tx.pedido.create({
                data: {
                    usuarioId,
                    valorTotal,
                    itens: {
                        create: carrinho.itens.map(item => ({
                            produtoId: item.produtoId,
                            quantidade: item.quantidade,
                            precoUnitario: item.produto.preco,
                        })),
                    },
                },
            });
            for (const item of carrinho.itens) {
                await tx.produto.update({
                    where: { id: item.produtoId },
                    data: { estoque: { decrement: item.quantidade } },
                });
            }
            await tx.itemCarrinho.deleteMany({ where: { carrinhoId: carrinho.id } });
            return novoPedido;
        });
        res.status(201).json({ message: 'Compra finalizada com sucesso!', pedido });
    } catch (error) {
        console.error("Erro ao finalizar compra:", error);
        res.status(500).json({ error: error.message || 'Erro ao finalizar a compra.' });
    }
});

// BUSCAR pedidos do VENDEDOR (AGORA INCLUI OS ITENS DO PEDIDO)
router.get('/pedidos/vendedor', authMiddleware, async (req, res) => {
    if (req.user.role !== 'VENDEDOR') return res.status(403).json({ error: 'Acesso negado.' });
    try {
        const pedidos = await prisma.pedido.findMany({
            orderBy: { createdAt: 'desc' },
            include: {
                usuario: { select: { nome: true, email: true } },
                // ADIÇÃO IMPORTANTE: Inclui os itens e os detalhes dos produtos de cada item
                itens: {
                    include: {
                        produto: { select: { nome: true } }
                    }
                }
            },
        });
        res.json(pedidos);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao buscar pedidos.' });
    }
});

// NOVA ROTA: ATUALIZAR O STATUS DE UM PEDIDO
router.put('/pedidos/:pedidoId/status', authMiddleware, async (req, res) => {
    if (req.user.role !== 'VENDEDOR') return res.status(403).json({ error: 'Acesso negado.' });

    const { pedidoId } = req.params;
    const { status } = req.body;

    // Validação simples do status
    const statusValidos = ["PENDENTE", "EM PREPARO", "A CAMINHO", "ENTREGUE", "CANCELADO"];
    if (!statusValidos.includes(status)) {
        return res.status(400).json({ error: 'Status inválido.' });
    }

    try {
        const pedidoAtualizado = await prisma.pedido.update({
            where: { id: parseInt(pedidoId) },
            data: { status: status },
        });
        res.json(pedidoAtualizado);
    } catch (error) {
        if (error.code === 'P2025') {
            return res.status(404).json({ error: 'Pedido não encontrado.' });
        }
        res.status(500).json({ error: 'Erro ao atualizar o status do pedido.' });
    }
});

// BUSCAR pedidos do CLIENTE
router.get('/pedidos/meus', authMiddleware, async (req, res) => {
    const usuarioId = req.user.id;
    try {
        const pedidos = await prisma.pedido.findMany({
            where: { usuarioId },
            orderBy: { createdAt: 'desc' },
            include: { itens: { include: { produto: true } } },
        });
        res.json(pedidos);
    } catch (error) {
        console.error("Erro ao buscar meus pedidos:", error);
        res.status(500).json({ error: 'Erro ao buscar meus pedidos.' });
    }
});

module.exports = router;