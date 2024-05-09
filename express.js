require("dotenv").config();
const express = require("express");
const post = require("./models/post");
const mongoose = require("mongoose");

const app = express();

app.get("/api/posts", async (req, res) => {
  const posts = await post.find();
  res.json(posts);
});

mongoose.connect(process.env.DB_URI).then(() => {
  app.listen(5050, () => {
    console.log("Server is running on port 5050");
  });
});
