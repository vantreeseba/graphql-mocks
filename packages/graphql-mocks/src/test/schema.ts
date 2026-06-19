import { buildSchema } from 'graphql';

// Rich test schema covering scalars, enums, relationships, interfaces, unions, and custom scalars.
// Custom scalars (CityName, Slug, Rating) are simple String wrappers that "brand" the usage
// and allow the mocker to provide semantically meaningful faker calls.
export const schema = buildSchema(`
  scalar DateTime
  scalar EmailAddress
  scalar URL
  scalar PhoneNumber
  scalar CityName
  scalar Slug
  scalar Rating

  enum Priority {
    LOW
    MEDIUM
    HIGH
  }

  enum PostStatus {
    DRAFT
    PUBLISHED
    ARCHIVED
  }

  interface Node {
    id: ID!
  }

  union SearchResult = User | Post | Comment

  type User {
    id: ID!
    name: String!
    email: EmailAddress!
    phone: PhoneNumber
    city: CityName
    website: URL
    isActive: Boolean!
    score: Float
    loginCount: Int!
    createdAt: DateTime!
    todos: [Todo!]!
    posts: [Post!]!
  }

  type Todo {
    id: ID!
    title: String!
    completed: Boolean!
    priority: Priority!
    createdAt: DateTime!
    dueDate: DateTime
    user: User!
  }

  type Post {
    id: ID!
    slug: Slug!
    title: String!
    body: String!
    status: PostStatus!
    publishedAt: DateTime
    author: User!
    comments: [Comment!]!
    tags: [String!]!
    viewCount: Int!
    rating: Rating
  }

  type Comment {
    id: ID!
    body: String!
    createdAt: DateTime!
    author: User!
    post: Post!
  }

  type Query {
    user(id: ID!): User
    users: [User!]!
    todos: [Todo!]!
    posts: [Post!]!
    search(query: String!): [SearchResult!]!
  }
`);
