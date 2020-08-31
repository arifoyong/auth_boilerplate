const User = require("../models/user.model");
const jwt = require("jsonwebtoken");
const expressJwt = require("express-jwt");
const sgMail = require("@sendgrid/mail");
const { json } = require("body-parser");
const _ = require("lodash");
const { update } = require("lodash");
const { OAuth2Client } = require("google-auth-library");
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

exports.signup = (req, res) => {
  const { name, email, password } = req.body;
  User.findOne({ email: email }).exec((err, user) => {
    console.log(user);
    if (user) {
      return res.status(404).json({ error: "Email is taken" });
    }

    const token = jwt.sign(
      { name, email, password },
      process.env.JWT_ACCOUNT_ACTIVATION,
      {
        expiresIn: "10m",
      }
    );

    const emailData = {
      from: process.env.EMAIL_FROM,
      to: email,
      subject: `Account activation link`,
      html: `<h1>Account activation</h1>
          <p>Please use this link to activate your account</p>
          <p>${process.env.CLIENT_URL}/auth/activate/${token}</p>
      `,
    };

    sgMail
      .send(emailData)
      .then((sent) => {
        console.log("SIGNUP EMAIL SENT:", sent);
        return res.json({
          message: `Email has been sent to ${email}. Follow the instruction to activate your account`,
        });
      })
      .catch((err) => {
        console.log("email sending is error", err.response.body.errors);
        return res.json({ error: err.response.body.errors });
      });

    // return res.json({
    //   message: `email has been sent to ${email}. Follow instruction to activate your account`,
    // });
  });
};

exports.accountActivation = (req, res) => {
  const { token } = req.body;

  if (token) {
    jwt.verify(token, process.env.JWT_ACCOUNT_ACTIVATION, function (
      err,
      decoded
    ) {
      if (err) {
        console.log("JWT VERIFY ERROR:", err);
        return res.status(401).json({ error: "Invalid link, signup again" });
      }
      const { name, email, password } = decoded;
      const newUser = new User({ name, email, password });

      newUser.save((err, user) => {
        if (err) {
          console.log("SAVE USER IN ACTIVATIONERROR:", err);
          return res
            .status(401)
            .json({ error: "Error saving user in database" });
        }
        return res.status(200).json({ message: "Signup success" });
      });
    });
  } else {
    return res.status(401).json({ error: "Something wrong, try again" });
  }
};

exports.signIn = (req, res) => {
  console.log(req.body);

  const { email, password } = req.body;

  const user = User.findOne({ email: email }).exec((err, user) => {
    if (err || !user) {
      return res.status(400).json({ error: "Validation error" });
    }

    // const authentication = User.authenticate(password);

    if (!user.authenticate(password)) {
      return res.status(401).json({ error: "Validation error" });
    }

    const token = jwt.sign(
      { name: user.name, id: user._id },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    const { _id, name, email, role } = user;
    return res
      .status(200)
      .json({ token: token, user: { _id, name, email, role } });
  });
};

exports.requireSignin = expressJwt({
  secret: process.env.JWT_SECRET,
  algorithms: ["HS256"],
});

exports.adminMiddleware = (req, res, next) => {
  User.findById(req.user.id).exec((err, user) => {
    if (err || !user) {
      return res.status(400).json({ error: "User not available" });
    }

    if (user.role !== "admin") {
      return res.status(400).json({ error: "Admin resource access denied" });
    }

    req.profile = user;
    next();
  });
};

exports.forgotPassword = (req, res) => {
  const { email } = req.body;

  User.findOne({ email }).exec((err, user) => {
    if (err || !user) {
      return res
        .status(400)
        .json({ error: "User with that email does not exist" });
    }

    const token = jwt.sign({ _id: user._id }, process.env.JWT_RESET_PASSWORD, {
      expiresIn: "10m",
    });

    return user.updateOne({ resetPasswordLink: token }, (err, success) => {
      if (err) {
        console.log("RESET PASSWORD LINK ERROR", err);
        return res
          .status(400)
          .json({ error: "Databae error on user forgot password request" });
      }

      const emailData = {
        from: process.env.EMAIL_FROM,
        to: email,
        subject: `Password Reset link`,
        html: `<h1>Password Reset</h1>
            <p>Please use this link to reset your password</p>
            <p>${process.env.CLIENT_URL}/auth/password/reset/${token}</p>
        `,
      };

      sgMail
        .send(emailData)
        .then((sent) => {
          console.log("PASSWORD RESET EMAIL SENT:", sent);
          return res.json({
            message: `Email has been sent to ${email}. Follow the instruction to reset your password`,
          });
        })
        .catch((err) => {
          console.log(
            "PASSWORD RESET EMAIL SENDING ERROR",
            err.response.body.errors
          );
          return res.json({ error: err.response.body.errors });
        });
    });
  });
};

exports.resetPassword = (req, res) => {
  const { resetPasswordLink, newPassword } = req.body;

  if (resetPasswordLink) {
    jwt.verify(resetPasswordLink, process.env.JWT_RESET_PASSWORD, function (
      err,
      decoded
    ) {
      if (err) {
        return res.status(400).json({ error: "Expired link. Try again" });
      }

      User.findOne({ resetPasswordLink }, (err, user) => {
        if (err || !user) {
          return res
            .status(400)
            .json({ error: "Something went wrong. Try later" });
        }

        const updatedFields = {
          password: newPassword,
          resetPasswordLink: "",
        };

        user = _.extend(user, updatedFields);

        user.save((err, result) => {
          if (err) {
            return res.status(400).json({
              error: "Error resetting user password. Please try again",
            });
          }

          return res.status(200).json({ message: "Password reset successful" });
        });
      });
    });
  }
};

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
exports.googleLogin = (req, res) => {
  const { idToken } = req.body;

  client
    .verifyIdToken({ idToken, audience: process.env.GOOGLE_CLIENT_ID })
    .then((resp) => {
      console.log("GOOGLE LOGIN RESPONSE", resp);

      const { email_verified, name, email } = resp.payload;

      if (email_verified) {
        User.findOne({ email }).exec((err, user) => {
          if (user) {
            const token = jwt.sign({ _id: user._id }, process.env.JWT_SECRET, {
              expiresIn: "1d",
            });

            const { _id, email, name, role } = user;

            return res.status(200).json({
              token,
              user: { _id, email, name, role },
            });
          } else {
            let password = email + process.env.JWT_SECRET;
            user = new User({ name, email, password });

            user.save((err, data) => {
              if (err) {
                console.log("ERROR GOOGLE LOGIN ON USER SAVE", err);
                return res
                  .status(400)
                  .json({ error: "User signup failed with Google" });
              }

              const token = jwt.sign(
                { _id: data._id },
                process.env.JWT_SECRET,
                {
                  expiresIn: "1d",
                }
              );
              const { _id, email, name, role } = data;

              return res.status(200).json({
                token,
                user: { _id, email, name, role },
              });
            });
          }
        });
      } else {
        return res.status(400).json({ error: "Google login failed" });
      }
    });
};
