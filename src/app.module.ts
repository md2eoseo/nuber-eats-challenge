import {
  MiddlewareConsumer,
  Module,
  NestModule,
  RequestMethod,
} from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { GraphQLModule } from '@nestjs/graphql';
import { PodcastsModule } from './podcast/podcasts.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Podcast } from './podcast/entities/podcast.entity';
import { Episode } from './podcast/entities/episode.entity';
import { UsersModule } from './users/users.module';
import { User } from './users/entity/user.entity';
import { JwtModule } from './jwt/jwt.module';
import { JwtMiddleware } from './jwt/jwt.middleware';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'sqlite',
      database: 'db.sqlite3',
      synchronize: true,
      logging: true,
      entities: [Podcast, Episode, User],
    }),
    GraphQLModule.forRoot({
      autoSchemaFile: true,
      context: ({ req }) => ({ user: req['user'] }),
    }),
    JwtModule.forRoot({ privateKey: 'l6t1eHtKoJpNmprQYKBRj1nedutttP9W' }),
    PodcastsModule,
    UsersModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(JwtMiddleware)
      .forRoutes({ path: '/graphql', method: RequestMethod.ALL });
  }
}
