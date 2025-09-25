require('dotenv').config();
const nodemailer = require('nodemailer');

// Configura o transporte usando Gmail e senha de app
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER, // seu Gmail
    pass: process.env.EMAIL_PASS  // senha de app do Gmail
  }
});

// Configura a mensagem
const mailOptions = {
  from: process.env.EMAIL_USER,
  to: 'thalyssonferreira133@gmail.com', // para quem você quer enviar
  subject: 'Teste de envio de e-mail',
  text: 'Olá! Este é um teste enviado pelo Node.js usando Nodemailer e senha de app do Gmail.',
};

// Envia o e-mail
transporter.sendMail(mailOptions, (error, info) => {
  if (error) {
    console.log('Erro ao enviar e-mail:', error);
  } else {
    console.log('E-mail enviado com sucesso! Info:', info.response);
  }
});