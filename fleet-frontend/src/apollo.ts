import {
  ApolloClient,
  InMemoryCache,
  createHttpLink,
  ApolloLink,
} from '@apollo/client'
import { setContext } from '@apollo/client/link/context'
import keycloak from './keycloak'

const httpLink = createHttpLink({
  uri: 'http://127.0.0.1:3000/graphql',
})

const authLink = setContext(async (_, { headers }) => {
  // Refresh token if it's about to expire (within 30 seconds)
  if (keycloak.isTokenExpired(30)) {
    try {
      await keycloak.updateToken(30)
    } catch {
      keycloak.login()
    }
  }

  const token = keycloak.token
  return {
    headers: {
      ...headers,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  }
})

const client = new ApolloClient({
  link: ApolloLink.from([authLink, httpLink]),
  cache: new InMemoryCache(),
  defaultOptions: {
    watchQuery: { fetchPolicy: 'cache-and-network' },
  },
})

export default client
