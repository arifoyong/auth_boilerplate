const express = require("express");
const bodyParser = require("body-parser");
const morgan = require("morgan");
const cors = require("cors");
const mongoose = require("mongoose");
require("dotenv").config();

// App
const app = express();

// DB
mongoose
  .connect(process.env.DATABASE, {
    useNewUrlParser: true,
    useCreateIndex: true,
    useFindAndModify: false,
    useUnifiedTopology: true,
  })
  .then(() => console.log("DB is connected"))
  .catch((err) => console.log("DB connection error", err));

// import routes
const authRoutes = require("./routes/auth.route");

// application middleware
app.use(morgan("dev"));
app.use(bodyParser.json());
// app.use(cors()); //allows all origins
if (process.env.NODE_ENV === "development") {
  app.use(cors({ origin: `http://localhost:3000` }));
}

// middleware
app.use("/api", authRoutes);

const port = process.env.PORT || 8000;
app.listen(port, () => {
  console.log(`Listening on port ${port}`);
});
