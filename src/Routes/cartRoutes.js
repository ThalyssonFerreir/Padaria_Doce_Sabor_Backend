const express = require('express');
const { postCart, getCart, deleteCart } = require("../controllers/cartController.js");

const router = express.Router();

router.post("/", postCart);
router.get("/", getCart);
router.delete("/", deleteCart);

module.exports = router;
