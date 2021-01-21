import { Injectable, UseGuards } from '@nestjs/common';
import {
  CreateEpisodeInput,
  CreateEpisodeOutput,
} from './dtos/create-episode.dto';
import {
  CreatePodcastInput,
  CreatePodcastOutput,
} from './dtos/create-podcast.dto';
import { UpdateEpisodeInput } from './dtos/update-episode.dto';
import { UpdatePodcastInput } from './dtos/update-podcast.dto';
import { Episode } from './entities/episode.entity';
import { Podcast } from './entities/podcast.entity';
import { CoreOutput } from '../common/dtos/output.dto';
import {
  PodcastOutput,
  EpisodesOutput,
  EpisodesSearchInput,
  GetAllPodcastsOutput,
  GetEpisodeOutput,
} from './dtos/podcast.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Raw, Repository } from 'typeorm';
import { AuthGuard } from 'src/auth/auth.guard';
import {
  ReviewPodcastInput,
  ReviewPodcastOutput,
} from './dtos/review-podcast.dto';
import { Review } from './entities/review.entity';
import { User } from 'src/users/entity/user.entity';
import { Subscription } from './entities/subscription.entity';
import {
  SubscribePodcastInput,
  SubscribePodcastOutput,
} from './dtos/subscribe-podcast.dto';
import { GetSubscriptionsOutput } from './dtos/get-subscriptions.dto';
import {
  SearchPodcastsInput,
  SearchPodcastsOutput,
} from './dtos/search-podcasts.dto';

@Injectable()
export class PodcastsService {
  constructor(
    @InjectRepository(User)
    private readonly users: Repository<User>,
    @InjectRepository(Podcast)
    private readonly podcasts: Repository<Podcast>,
    @InjectRepository(Episode)
    private readonly episodes: Repository<Episode>,
    @InjectRepository(Review)
    private readonly reviews: Repository<Review>,
    @InjectRepository(Subscription)
    private readonly subscriptions: Repository<Subscription>,
  ) {}

  private readonly InternalServerErrorOutput = {
    ok: false,
    error: 'Internal server error occurred.',
  };

  async getAllPodcasts(): Promise<GetAllPodcastsOutput> {
    try {
      const podcasts = await this.podcasts.find();
      return {
        ok: true,
        podcasts,
      };
    } catch (e) {
      return this.InternalServerErrorOutput;
    }
  }

  @UseGuards(AuthGuard)
  async createPodcast({
    title,
    category,
  }: CreatePodcastInput): Promise<CreatePodcastOutput> {
    try {
      const newPodcast = this.podcasts.create({ title, category });
      const { id } = await this.podcasts.save(newPodcast);
      return {
        ok: true,
        id,
      };
    } catch (e) {
      return this.InternalServerErrorOutput;
    }
  }

  async getPodcast(id: number): Promise<PodcastOutput> {
    try {
      const podcast = await this.podcasts.findOne(
        { id },
        { relations: ['episodes'] },
      );
      if (!podcast) {
        return {
          ok: false,
          error: `Podcast with id ${id} not found`,
        };
      }
      return {
        ok: true,
        podcast,
      };
    } catch (e) {
      return this.InternalServerErrorOutput;
    }
  }

  async deletePodcast(id: number): Promise<CoreOutput> {
    try {
      const { ok, error } = await this.getPodcast(id);
      if (!ok) {
        return { ok, error };
      }
      await this.podcasts.delete({ id });
      return { ok };
    } catch (e) {
      return this.InternalServerErrorOutput;
    }
  }

  async updatePodcast({
    id,
    payload,
  }: UpdatePodcastInput): Promise<CoreOutput> {
    try {
      const { ok, error, podcast } = await this.getPodcast(id);
      if (!ok) {
        return { ok, error };
      }
      if (payload.rating !== null) {
        if (payload.rating < 1 || payload.rating > 5) {
          return {
            ok: false,
            error: 'Rating must be between 1 and 5.',
          };
        }
      }
      const updatedPodcast: Podcast = { ...podcast, ...payload };
      await this.podcasts.save(updatedPodcast);
      return { ok };
    } catch (e) {
      return this.InternalServerErrorOutput;
    }
  }

  async getEpisodes(podcastId: number): Promise<EpisodesOutput> {
    try {
      const { podcast, ok, error } = await this.getPodcast(podcastId);
      if (!ok) {
        return { ok, error };
      }
      return {
        ok: true,
        episodes: podcast.episodes,
      };
    } catch (e) {
      return this.InternalServerErrorOutput;
    }
  }

  async getEpisode({
    podcastId,
    episodeId,
  }: EpisodesSearchInput): Promise<GetEpisodeOutput> {
    try {
      const { episodes, ok, error } = await this.getEpisodes(podcastId);
      if (!ok) {
        return { ok, error };
      }
      const episode = episodes.find(episode => episode.id === episodeId);
      if (!episode) {
        return {
          ok: false,
          error: `Episode with id ${episodeId} not found in podcast with id ${podcastId}`,
        };
      }
      return {
        ok: true,
        episode,
      };
    } catch (e) {
      return this.InternalServerErrorOutput;
    }
  }

  async createEpisode({
    podcastId,
    title,
    category,
  }: CreateEpisodeInput): Promise<CreateEpisodeOutput> {
    try {
      const { podcast, ok, error } = await this.getPodcast(podcastId);
      if (!ok) {
        return { ok, error };
      }
      const newEpisode = this.episodes.create({ title, category });
      newEpisode.podcast = podcast;
      const { id } = await this.episodes.save(newEpisode);
      return {
        ok: true,
        id,
      };
    } catch (e) {
      return this.InternalServerErrorOutput;
    }
  }

  async deleteEpisode({
    podcastId,
    episodeId,
  }: EpisodesSearchInput): Promise<CoreOutput> {
    try {
      const { episode, error, ok } = await this.getEpisode({
        podcastId,
        episodeId,
      });
      if (!ok) {
        return { ok, error };
      }
      await this.episodes.delete({ id: episode.id });
      return { ok: true };
    } catch (e) {
      return this.InternalServerErrorOutput;
    }
  }

  async updateEpisode({
    podcastId,
    episodeId,
    ...rest
  }: UpdateEpisodeInput): Promise<CoreOutput> {
    try {
      const { episode, ok, error } = await this.getEpisode({
        podcastId,
        episodeId,
      });
      if (!ok) {
        return { ok, error };
      }
      const updatedEpisode = { ...episode, ...rest };
      await this.episodes.save(updatedEpisode);
      return { ok: true };
    } catch (e) {
      return this.InternalServerErrorOutput;
    }
  }

  async reviewPodcast(
    userId: number,
    { podcastId, content }: ReviewPodcastInput,
  ): Promise<ReviewPodcastOutput> {
    try {
      const listener = await this.users.findOne(userId);
      const podcast = await this.podcasts.findOne(podcastId);
      const newReview = this.reviews.create({ listener, podcast, content });
      await this.reviews.save(newReview);
      return { ok: true };
    } catch (error) {
      return { ok: false, error: "Couldn't review podcast" };
    }
  }

  async subscribePodcast(
    userId: number,
    { podcastId }: SubscribePodcastInput,
  ): Promise<SubscribePodcastOutput> {
    try {
      const listener = await this.users.findOne(userId);
      const podcast = await this.podcasts.findOne(podcastId);
      const newSubscription = this.subscriptions.create({ listener, podcast });
      await this.subscriptions.save(newSubscription);
      return { ok: true };
    } catch (error) {
      return { ok: false, error: "Couldn't subscribe podcast" };
    }
  }

  async getSubscriptions(userId: number): Promise<GetSubscriptionsOutput> {
    try {
      const listener = await this.users.findOne(userId);
      const subscriptions = await this.subscriptions.find({
        where: { listener },
        relations: ['podcast'],
      });
      return { ok: true, subscriptions };
    } catch (error) {
      return { ok: false, error: "Couldn't get subscriptions" };
    }
  }

  async searchPodcasts({
    query,
  }: SearchPodcastsInput): Promise<SearchPodcastsOutput> {
    try {
      const [podcasts, podcastsNum] = await this.podcasts.findAndCount({
        where: { title: Raw(title => `${title} LIKE '%${query}%'`) },
      });
      if (!podcasts.length) {
        return { ok: false, error: 'Podcasts not found' };
      }
      return {
        ok: true,
        podcasts,
      };
    } catch (error) {
      return { ok: false, error: "Couldn't search podcasts" };
    }
  }
}
