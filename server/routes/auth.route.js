const express = require("express");
const { userSignupValidator } = require("../validators/auth.validator");
const { runValidation } = require("../validators");

const router = express.Router();

// import controller
const { signup, accountActivation } = require("../controllers/auth.controller");

// router
router.post("/signup", userSignupValidator, runValidation, signup);
router.post("/activate", accountActivation);

module.exports = router;
