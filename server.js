import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';

// Importa as rotas
import userRoutes  from './src/routes/userRoutes.js';
import productRoutes  from './src/routes/productRoutes.js'; // <-- ADICIONE ESTA LINHA
import saleRoutes  from './src/Routes/saleRoutes.js';
import cartRoutes  from './src/Routes/cartRoutes.js';

dotenv.config()

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