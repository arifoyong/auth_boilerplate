const express = require("express");
const {
  userSignupValidator,
  userSigninValidator,
  forgotPasswordValidator,
  resetPasswordValidator,
} = require("../validators/auth.validator");
const { runValidation } = require("../validators");

const router = express.Router();

// import controller
const {
  signup,
  accountActivation,
  signIn,
  forgotPassword,
  resetPassword,
  googleLogin,
} = require("../controllers/auth.controller");

// router
router.post("/signup", userSignupValidator, runValidation, signup);
router.post("/activate", accountActivation);
router.post("/signin", userSigninValidator, runValidation, signIn);

router.put(
  "/forgot-password",
  forgotPasswordValidator,
  runValidation,
  forgotPassword
);

router.put(
  "/reset-password",
  resetPasswordValidator,
  runValidation,
  resetPassword
);

router.post("/google-login", googleLogin);

module.exports = router;
