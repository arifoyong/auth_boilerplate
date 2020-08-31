const User = require("../models/user.model");

exports.read = (req, res) => {
  console.log(req.user);
  const userId = req.params.id;

  User.findById(userId).exec((err, user) => {
    if (err || !user) {
      return res.status(400).json({ error: "User not available" });
    }
    user.hashed_password = undefined;
    user.salt = undefined;
    return res.status(200).json(user);
  });
};

exports.update = (req, res) => {
  const { name, password } = req.body;

  User.findById(req.user.id).exec((err, user) => {
    if (err || !user) {
      return res.status(400).json({ error: "User not available" });
    }

    if (!name) {
      return res.satus(400).json({ error: "Name is required" });
    } else {
      user.name = name;
    }

    if (password) {
      if (password.length < 6) {
        return res
          .status(400)
          .json({ error: "Password must be at least 6 characters long" });
      } else {
        user.password = password;
      }
    }

    user.save((err, updatedUser) => {
      if (err) {
        console.log("USER UPDATE ERROR", err);
        return res.status(400).json({ error: "User update failed" });
      }

      updatedUser.hashed_password = undefined;
      updatedUser.salt = undefined;
      return res.status(200).json(updatedUser);
    });
  });
};
