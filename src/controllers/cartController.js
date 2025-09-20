let cart = [];

export const postCart = (req, res) => {
    const { productId, quantity } = req.body;

    if (!productId || !quantity){
        return res.status(400).json({ error: "Produto e quantidade sao requiridos"})
    }

    cart.push({ productId, quantity });
    res.status(201).json({ error: "Item adicionado para carrainho", cart })
};

export const getCart = (req, res) => {
    res.jason(cart);
};

export const deleteCart = (req, res) => {
    cart = [];
    res.json({ message: "Carrinho limpo"});
};
