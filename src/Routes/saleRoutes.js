const express = require('express');
const {
    getCustomerSales, 
    getSellerSales, 
    putSale, 
    postSale,
} = require("../controllers/saleController.js");

const router = express.Router();

router.post("/", postSale);
router.put("/:id/cancel", putSale);
router.get("/customer/:customerId", getCustomerSales);
router.get("/seller/:sellerId", getSellerSales);

module.exports = router;
