const express = require("express");
const {
  userSignupValidator,
  userSigninValidator,
} = require("../validators/auth.validator");
const { runValidation } = require("../validators");

const router = express.Router();

// import controller
const {
  signup,
  accountActivation,
  signIn,
} = require("../controllers/auth.controller");

// router
router.post("/signup", userSignupValidator, runValidation, signup);
router.post("/activate", accountActivation);
router.post("/signin", userSigninValidator, runValidation, signIn);

module.exports = router;
