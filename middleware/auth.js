// middleware/auth.js
const jwt = require('jsonwebtoken');

module.exports = function (req, res, next) {
  // Pega o token do header da requisição
  const token = req.header('Authorization')?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({ error: 'Acesso negado. Nenhum token fornecido.' });
  }

  try {
    // Verifica o token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // Adiciona o payload do token (que tem o id do usuário) ao objeto da requisição
    req.user = decoded;
    next(); // Passa para a próxima etapa (a rota de upload)
  } catch (ex) {
    res.status(400).json({ error: 'Token inválido.' });
  }
};