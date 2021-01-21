import { Module } from '@nestjs/common';
import { PodcastsService } from './podcasts.service';
import { EpisodeResolver, PodcastsResolver } from './podcasts.resolver';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Podcast } from './entities/podcast.entity';
import { Episode } from './entities/episode.entity';
import { Review } from './entities/review.entity';
import { User } from 'src/users/entity/user.entity';
import { Subscription } from './entities/subscription.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Podcast, Episode, Review, Subscription]),
  ],
  providers: [PodcastsService, PodcastsResolver, EpisodeResolver],
})
export class PodcastsModule {}
