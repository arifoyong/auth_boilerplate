const User = require("../models/user.model");
const jwt = require("jsonwebtoken");

const sgMail = require("@sendgrid/mail");
const { json } = require("body-parser");
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

console.log("API KEY: ", process.env.SENDGRID_API_KEY);

// exports.signup = (req, res) => {
//   const { name, email, password } = req.body;
//   console.log(name, email, password);

//   User.findOne({ email: email }).exec((err, user) => {
//     console.log(user);
//     if (user) {
//       return res.status(404).json({ error: "Email is taken" });
//     } else {
//       let newUser = new User({
//         name,
//         email,
//         password,
//       });

//       newUser.save((err, success) => {
//         if (err) {
//           console.log("SIGNUP ERROR", err);
//           return res.status(400).json({ error: err.MongoError });
//         }

//         return res
//           .status(200)
//           .json({ message: "Signup success", user: success });
//       });
//     }
//   });
// };

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

    return res.json({
      message: `email has been sent to ${email}. Follow instruction to activate your account`,
    });
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
