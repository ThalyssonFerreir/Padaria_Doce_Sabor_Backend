// index.js

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

// Importa as rotas
const userRoutes = require('./routes/userRoutes');
const productRoutes = require('./routes/productRoutes');
const pedidoRoutes = require('./routes/pedidoRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares essenciais
app.use(cors());
app.use(express.json());

// Servir arquivos estáticos da pasta 'public'
app.use(express.static(path.join(__dirname, 'public')));

// Rota principal de teste
app.get('/', (req, res) => {
  res.send('API da Padaria Doce Sabor está no ar!');
});

// Rotas da API
app.use('/api/usuarios', userRoutes);
app.use('/api/produtos', productRoutes);
app.use('/api', pedidoRoutes);

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});