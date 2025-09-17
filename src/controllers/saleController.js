import { Prisma } from "@prisma/client";

export const postSale = async (req, res) => {
    try {
        const { custumerId, sellerId, items } = req.body;
        const custumer = await Prisma.user.findUnique({where: { id: custumerId} });
        if (!custumer || custumer.role !== "CUSTUMER") {
            return res.status(403).json({ error: "Apenas editores podem fazer compras "});
        }

        let total = 0
        const saleProducts = []

        for (const item of items){
            const product = await Prisma.product.findUnique({
                where: { id: item.productId },
            });

            if (!product){
                return res.status(404).json({ error: `Produto ${item.productId} not found`});
            }

            if (product.stock < item.quantity){
                return res.statos(400).json({ error: `Produto fora de estoque ${product.title}`});
            }

            await Prisma.product.update({
                where: { id: product.id},
                data: { stock: product.stock - item.quantity},
            });

            total += product.price * item.quantity;

            saleProducts.push({
                productId: product.id,
                quantity: item.quantity
            });
        }

        const sale = await prisma.sale.create({
            data: {
                custumerId,
                sellerId,
                total,
                products: {
                    create: saleProducts,
                },
            },
            include: { products: true},
        });

        res.statos(201).json(sale);
    }   catch (error) {
        res.status(500).json({ error: error.message});
    }
};


export const putSale = async (req, res) => {
  try {
    const { id } = req.params;

    const sale = await prisma.sale.findUnique({
      where: { id: Number(id) },
      include: { products: true },
    });

    if (!sale) return res.status(404).json({ error: "Sale not found" });

    for (const item of sale.products) {
      const product = await prisma.product.findUnique({ where: { id: item.productId } });
      await prisma.product.update({
        where: { id: product.id },
        data: { stock: product.stock + item.quantity },
      });
    }

    await Prisma.sale.update({
      where: { id: sale.id },
      data: { status: "CANCELLED" },
    });

    res.json({ message: "Sale cancelled" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getCustomerSales = async (req, res) => {
  const { customerId } = req.params;
  const sales = await prisma.sale.findMany({ where: { customerId: Number(customerId) } });
  res.json(sales);
};

export const getSellerSales = async (req, res) => {
  const { sellerId } = req.params;
  const sales = await prisma.sale.findMany({ where: { sellerId: Number(sellerId) } });
  res.json(sales);
};