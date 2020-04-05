// graphql.js
const { ApolloServer, gql } = require('apollo-server');
const ApolloServerLambda = require('apollo-server-lambda').ApolloServer;

const { Pool, Client } = require('pg')
const pool = new Pool({
  host: "",
  user: "",
  password: "",
  database: "",
  port: 5432,
})

// Construct a schema, using GraphQL schema language
const typeDefs = gql`
  type Measure {
    date: String
    confirmed: Int
  }
  type Location {
    province_state: String
    country: String
    lat: Float
    long: Float
    measures: [Measure]
  }
  type Query {
    hello: String
    locations: [Location]
    countryLevels(country: String!, province_state: String): [Location]
    allCountryLevels(limit: Int!, offset: Int!): [Location]
  }
`;

function toDate(cases) {
  cases.date = cases.date.toString()
  //console.log(cases)
  return cases
}

function getCountryByCode(data, code) {
  return data.findIndex(
      function(data){ return data.code == code }
  );
}

// Provide resolver functions for your schema fields
const resolvers = {
  Query: {
    hello: () => 'Hello world!',
    locations: async () => {
      try {
        const res = await pool.query(`SELECT * FROM LOCATIONS`)
        return res.rows
      } catch (err) {
        console.log(err.stack)
      }
      return null
    },
    countryLevels: async (_, { country, province_state }) => {
      //console.log(country)
      //console.log(province_state)

      try {
        const res = await pool.query(`SELECT * FROM LOCATIONS WHERE country ilike '${country}' and province_state ilike '${province_state}'`)
        //console.log(res.rows)

        const cases = await pool.query(`SELECT * FROM countries_data WHERE code='${res.rows[0].code}'`)
        //console.log(cases.rows)

        res.rows[0].measures = cases.rows.map(toDate)

        //console.log([res.rows[0]])
        return [res.rows[0]]
      } catch (err) {
        console.log(err.stack)
      }
      return null
    },
    allCountryLevels: async (_, { limit, offset }) => {
      try {
        const nominalLimit = Math.min(Math.max(10, limit), 10)
        const res = await pool.query(`SELECT * FROM LOCATIONS LIMIT ${nominalLimit} OFFSET ${offset}`)

        //console.log(res.rows)
        for (let step = 0; step < res.rows.length; step++) {
          var location = res.rows[step]
          //var foundDataIndex = getCountryByCode(res.rows, subqueryRes[0].rows[0].region)
          const cases = await pool.query(`SELECT * FROM countries_data WHERE code='${location.code}'`);
          //res.rows[foundDataIndex]['measures'] = subqueryRes[0].rows.map(toDate)
          res.rows[step].measures = cases.rows.map(toDate)
        };

        //res.rows.forEach(fn);

        //results.then(subqueryRes => {
        //  console.log(subqueryRes[0].rows[0].region)
        //  var foundDataIndex = getCountryByCode(res.rows, subqueryRes[0].rows[0].region)
        //  console.log(foundDataIndex)

        //  res.rows[foundDataIndex]['measures'] = subqueryRes[0].rows.map(toDate)
        //  console.log(res.rows[foundDataIndex])
        //});

        //console.log(res.rows)
        return res.rows
      } catch (err) {
        console.log(err.stack)
      }
      return null
    }
  },
};

const server = new ApolloServerLambda({ typeDefs, resolvers });

exports.graphqlHandler = server.createHandler();

// For local development
if( process.env.LAMBDA_LOCAL_DEVELOPMENT == "1") {
    const serverLocal = new ApolloServer({ typeDefs, resolvers });

    serverLocal.listen().then(({ url }) => {
        console.log(`Server ready at ${url}`);
    });
}
