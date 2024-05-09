require("dotenv").config();
const { ApolloServer } = require("@apollo/server");
const { startStandaloneServer } = require("@apollo/server/standalone");
const mongoose = require("mongoose");
const Author = require("./models/author");
const Post = require("./models/post");
const jwt = require("jsonwebtoken");
const { GraphQLError } = require("graphql");

const schema = /* GraphQL */ `
  type Query {
    "Test query for checking if the API is up and running"
    test: String!
    posts: [Post]
    post(id: ID!): Post
    authors: [Author]
    author(id: ID!): Author
  }

  type Mutation {
    createAuthor(input: CreateAuthorInput): NewAuthor
    createPost(input: CreatePostInput): Post
  }

  type NewAuthor {
    id: ID!
    name: String!
    token: String!
  }

  input CreateAuthorInput {
    name: String!
  }

  input CreatePostInput {
    title: String!
    content: String!
  }

  "A blog post"
  type Post {
    id: ID!
    title: String!
    content: String!
    author: Author!
  }

  "An author of a blog post"
  type Author {
    id: ID!
    name: String!
    posts: [Post]
  }
`;

const resolvers = {
  Query: {
    test: (parent, args) => "API up and running!",
    posts: async (parent, args) => await Post.find(),
    post: async (parent, args) => Post.findById(args.id),
    authors: async (parent, args) => await Author.find(),
    author: async (parent, args) => await Author.findById(args.id),
  },
  Mutation: {
    createAuthor: async (parent, args) => {
      const newAuthor = new Author({
        name: args.input.name,
      });

      const savedAuthor = await newAuthor.save();
      const token = jwt.sign({ id: savedAuthor._id }, process.env.JWT_SECRET, {
        expiresIn: "1d",
      });

      return { id: savedAuthor._id, name: savedAuthor.name, token };
    },
    createPost: async (parent, args, contextValue) => {
      if (!contextValue.user)
        throw new GraphQLError("You must be logged in to see create posts", {
          extensions: {
            code: "UNAUTHENTICATED",
            http: { status: 401 },
          },
        });

      const newPost = new Post({
        title: args.input.title,
        content: args.input.content,
        authorId: contextValue.user._id,
      });

      const savedPost = await newPost.save();

      return savedPost;
    },
  },
  Post: {
    author: async (parent, args) => await Author.findById(parent.authorId),
  },
  Author: {
    posts: async (parent, args) => await Post.find({ authorId: parent._id }),
  },
};

const server = new ApolloServer({ typeDefs: schema, resolvers });

mongoose
  .connect(process.env.DB_URI)
  .then(() => {
    console.log("✨Database connected");

    return startStandaloneServer(server, {
      listen: { port: 4040 },
      context: async ({ req }) => {
        if (req.headers.authorization) {
          const token = req.headers.authorization.split(" ")[1];

          if (token) {
            const { id } = jwt.verify(token, process.env.JWT_SECRET);
            const user = await Author.findById(id);

            return { user };
          }
        }
      },
    });
  })
  .then(({ url }) => {
    console.log(`✨Server ready at ${url}`);
  })
  .catch(console.error);
