require('dotenv').config();
const express = require('express');
const cors = require('cors');

// Importa as rotas
const userRoutes = require('./src/routes/userRoutes');
const productRoutes = require('./src/routes/productRoutes'); // <-- ADICIONE ESTA LINHA
const saleRoutes = require('./src/Routes/saleRoutes')
const cartRoutes = require('./src/Routes/cartRoutes')

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.send('API da Padaria Doce Sabor está no ar!');
});

// Rotas da API
app.use('/api/usuarios', userRoutes);
app.use('/api/produtos', productRoutes); // <-- ADICIONE ESTA LINHA
app.use('/api/vendas', saleRoutes);
app.use('/api/carrinho', cartRoutes);

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});