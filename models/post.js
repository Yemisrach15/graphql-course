const { model, Schema } = require("mongoose");

const postSchema = new Schema({
  title: String,
  content: String,
  authorId: {
    type: Schema.Types.ObjectId,
    ref: "Author",
  },
});

module.exports = model("Post", postSchema);
