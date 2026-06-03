'use strict';

const { gql } = require('apollo-server-express');

const typeDefs = gql`
  scalar DateTime

  type User {
    id: ID!
    name: String!
    email: String!
    phone: String!
    role: String!
    isVerified: Boolean!
    subscription: Subscription
    createdAt: DateTime!
  }

  type Subscription {
    plan: String!
    status: String!
    startDate: DateTime
    endDate: DateTime
  }

  type SOSAlert {
    id: ID!
    status: String!
    triggerMethod: String!
    location: Location!
    aiRiskScore: Float
    aiRiskFactors: [String]
    createdAt: DateTime!
    resolvedAt: DateTime
  }

  type Location {
    coordinates: [Float!]!
    accuracy: Float
    address: String
  }

  type IncidentGQL {
    id: ID!
    title: String!
    description: String!
    type: String!
    severity: String!
    status: String!
    location: Location!
    isAnonymous: Boolean!
    createdAt: DateTime!
  }

  type Contact {
    id: ID!
    name: String!
    phone: String!
    email: String
    relationship: String!
    priority: Int!
  }

  type SafeZone {
    id: ID!
    name: String!
    location: Location!
    radius: Float!
    isActive: Boolean!
    alertOnExit: Boolean!
    alertOnEntry: Boolean!
  }

  type NotificationGQL {
    id: ID!
    title: String!
    body: String!
    type: String!
    isRead: Boolean!
    createdAt: DateTime!
  }

  type Analytics {
    totalSOS: Int!
    resolvedSOS: Int!
    totalIncidents: Int!
    avgRiskScore: Float
  }

  type Query {
    me: User
    mySOSHistory(page: Int, limit: Int): [SOSAlert!]!
    myIncidents(status: String): [IncidentGQL!]!
    myContacts: [Contact!]!
    mySafeZones: [SafeZone!]!
    myNotifications(unread: Boolean): [NotificationGQL!]!
    myAnalytics: Analytics
  }

  type Mutation {
    markNotificationRead(id: ID!): NotificationGQL
    markAllNotificationsRead: Boolean
  }
`;

module.exports = typeDefs;
