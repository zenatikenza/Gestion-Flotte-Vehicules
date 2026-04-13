import { Module } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { join } from 'path';
import { FleetModule } from './fleet/fleet.module';
import { LocationModule } from './location/location.module';

@Module({
  imports: [
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      // Charge tous les fichiers .graphql du dossier src/
      typePaths: [join(__dirname, '**', '*.graphql')],
      // Active le playground Apollo Sandbox en dev
      playground: process.env.NODE_ENV !== 'production',
      introspection: true,
      // Active le transport WebSocket pour les Subscriptions GraphQL
      subscriptions: {
        'graphql-ws': true,
      },
      // Expose la requête HTTP dans le contexte GraphQL pour que les resolvers
      // puissent extraire et transmettre le header Authorization aux services en aval
      context: ({ req }) => ({ req }),
    }),
    FleetModule,
    LocationModule,
  ],
})
export class AppModule {}
