const { ApolloServer } = require("@apollo/server");
const { startStandaloneServer } = require("@apollo/server/standalone");
const mongoose = require("mongoose");
const Author = require("./models/author");
const Post = require("./models/post");
const jwt = require("jsonwebtoken");
const { GraphQLError } = require("graphql");

require("dotenv").config();

const schema = /* GraphQL */ `
  type Query {
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
    author: String!
  }

  type Post {
    id: ID!
    title: String!
    content: String!
    author: Author!
  }

  type Author {
    id: ID!
    name: String!
    posts: [Post]
  }
`;

const resolvers = {
  Query: {
    test: () => "API up and running!",
    posts: async () => await Post.find(),
    post: async (_, { id }) => Post.findById(id),
    authors: async (_, args, ctx) => {
      if (!ctx.user)
        throw new GraphQLError("You must be logged in to see authors", {
          extensions: {
            code: "UNAUTHENTICATED",
            http: { status: 401 },
          },
        });

      return await Author.find();
    },
    author: async (_, { id }) => await Author.findById(id),
  },
  Mutation: {
    createAuthor: async (_, { input }) => {
      const newAuthor = new Author({
        name: input.name,
      });

      const savedAuthor = await newAuthor.save();
      const token = jwt.sign({ id: savedAuthor._id }, process.env.JWT_SECRET);

      return { id: savedAuthor._id, name: savedAuthor.name, token };
    },
    createPost: async (_, { input }) => {
      const newPost = new Post({
        title: input.title,
        content: input.content,
        authorId: input.author,
      });

      const savedPost = await newPost.save();

      return savedPost;
    },
  },
  Post: {
    author: async (source) => await Author.findById(source.authorId),
  },
  Author: {
    posts: async (source) => await Post.find({ authorId: source._id }),
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
  });
