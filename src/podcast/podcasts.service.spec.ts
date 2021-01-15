import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UpdatePodcastPayload } from './dtos/update-podcast.dto';
import { Episode } from './entities/episode.entity';
import { Podcast } from './entities/podcast.entity';
import { PodcastsService } from './podcasts.service';

const podcastsMockRepository = () => ({
  findOne: jest.fn(),
  save: jest.fn(),
  create: jest.fn(),
  find: jest.fn(),
  delete: jest.fn(),
});
const episodesMockRepository = () => ({
  findOne: jest.fn(),
  save: jest.fn(),
  create: jest.fn(),
  find: jest.fn(),
  delete: jest.fn(),
});
const InternalServerErrorOutput = {
  ok: false,
  error: 'Internal server error occurred.',
};
const PODCAST_ID = 1;
const TEST_PODCAST = {
  id: PODCAST_ID,
  createdAt: new Date(),
  updatedAt: new Date(),
  title: 'old',
  category: '',
  rating: 1,
  episodes: [],
};
const EPISODE_ID = 1;
const TEST_EPISODE = {
  id: EPISODE_ID,
  createdAt: new Date(),
  updatedAt: new Date(),
  title: 'old',
  category: '',
  podcast: TEST_PODCAST,
};

type PodcastMockRepository<T = any> = Partial<
  Record<keyof Repository<Podcast>, jest.Mock>
>;
type EpisodeMockRepository<T = any> = Partial<
  Record<keyof Repository<Episode>, jest.Mock>
>;

describe('PodcastsService', () => {
  let service: PodcastsService;
  let podcastsRepository: PodcastMockRepository<Podcast>;
  let episodesRepository: EpisodeMockRepository<Episode>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        PodcastsService,
        {
          provide: getRepositoryToken(Podcast),
          useValue: podcastsMockRepository(),
        },
        {
          provide: getRepositoryToken(Episode),
          useValue: episodesMockRepository(),
        },
      ],
    }).compile();
    service = module.get<PodcastsService>(PodcastsService);
    podcastsRepository = module.get(getRepositoryToken(Podcast));
    episodesRepository = module.get(getRepositoryToken(Episode));
  });

  it('to be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getAllPodcasts', () => {
    it('should return all the podcasts', async () => {
      const mockedPodcasts = [TEST_PODCAST];
      podcastsRepository.find.mockResolvedValue(mockedPodcasts);
      const result = await service.getAllPodcasts();
      expect(result).toEqual({ ok: true, podcasts: mockedPodcasts });
    });

    it('should fail on exception', async () => {
      podcastsRepository.find.mockRejectedValue(new Error());
      const result = await service.getAllPodcasts();
      expect(result).toEqual(InternalServerErrorOutput);
    });
  });

  describe('createPodcast', () => {
    const createPodcastArgs = {
      title: '',
      category: '',
    };

    it('should create a new user', async () => {
      podcastsRepository.findOne.mockResolvedValue(undefined);
      podcastsRepository.create.mockReturnValue(createPodcastArgs);
      podcastsRepository.save.mockReturnValue({ id: PODCAST_ID });
      const result = await service.createPodcast(createPodcastArgs);
      expect(podcastsRepository.create).toHaveBeenCalledTimes(1);
      expect(podcastsRepository.create).toHaveBeenCalledWith(createPodcastArgs);
      expect(podcastsRepository.save).toHaveBeenCalledTimes(1);
      expect(podcastsRepository.save).toHaveBeenCalledWith(createPodcastArgs);
      expect(result).toEqual({ ok: true, id: PODCAST_ID });
    });

    it('should fail on exception', async () => {
      podcastsRepository.findOne.mockRejectedValue(new Error());
      const result = await service.createPodcast(createPodcastArgs);
      expect(result).toEqual(InternalServerErrorOutput);
    });
  });

  describe('getPodcast', () => {
    it('should return podcast if podcast exists', async () => {
      podcastsRepository.findOne.mockResolvedValue(TEST_PODCAST);
      const result = await service.getPodcast(PODCAST_ID);
      expect(podcastsRepository.findOne).toHaveBeenCalledTimes(1);
      expect(podcastsRepository.findOne).toHaveBeenCalledWith(
        { id: expect.any(Number) },
        { relations: ['episodes'] },
      );
      expect(result).toEqual({
        ok: true,
        podcast: TEST_PODCAST,
      });
    });

    it('should fail if podcast does not exist', async () => {
      podcastsRepository.findOne.mockResolvedValue(null);
      const result = await service.getPodcast(PODCAST_ID);
      expect(podcastsRepository.findOne).toHaveBeenCalledTimes(1);
      expect(podcastsRepository.findOne).toHaveBeenCalledWith(
        { id: expect.any(Number) },
        { relations: ['episodes'] },
      );
      expect(result).toEqual({
        ok: false,
        error: `Podcast with id ${PODCAST_ID} not found`,
      });
    });

    it('should fail on exception', async () => {
      podcastsRepository.findOne.mockRejectedValue(new Error());
      const result = await service.getPodcast(PODCAST_ID);
      expect(result).toEqual(InternalServerErrorOutput);
    });
  });

  describe('deletePodcast', () => {
    it('should delete podcast', async () => {
      jest.spyOn(service, 'getPodcast').mockImplementationOnce(async id => ({
        ok: true,
        podcast: new Podcast(),
      }));
      const result = await service.deletePodcast(PODCAST_ID);
      expect(podcastsRepository.delete).toHaveBeenCalledTimes(1);
      expect(podcastsRepository.delete).toHaveBeenCalledWith({
        id: PODCAST_ID,
      });
      expect(result).toEqual({ ok: true });
    });

    it('should fail on delete podcast if podcast does not exist', async () => {
      jest.spyOn(service, 'getPodcast').mockImplementationOnce(async id => ({
        ok: false,
        error: 'getPodcast error',
      }));
      const result = await service.deletePodcast(PODCAST_ID);
      expect(podcastsRepository.delete).toHaveBeenCalledTimes(0);
      expect(result).toEqual({
        ok: false,
        error: 'getPodcast error',
      });
    });

    it('should fail on exception', async () => {
      jest.spyOn(service, 'getPodcast').mockImplementationOnce(async id => ({
        ok: true,
      }));
      podcastsRepository.delete.mockRejectedValue(new Error());
      const result = await service.deletePodcast(PODCAST_ID);
      expect(podcastsRepository.delete).toHaveBeenCalledTimes(1);
      expect(podcastsRepository.delete).toHaveBeenCalledWith({
        id: PODCAST_ID,
      });
      expect(result).toEqual(InternalServerErrorOutput);
    });
  });

  describe('updatePodcast', () => {
    const updatePodcastArgs = {
      id: PODCAST_ID,
      payload: { title: 'new' },
    };

    it("should fail if podcast doesn't exist", async () => {
      const updatePodcastArgs = {
        id: PODCAST_ID,
        payload: new UpdatePodcastPayload({ rating: 3 }),
      };
      jest.spyOn(service, 'getPodcast').mockImplementationOnce(async id => ({
        ok: false,
        error: 'getPodcast error',
      }));
      const result = await service.updatePodcast(updatePodcastArgs);
      expect(result).toEqual({
        ok: false,
        error: 'getPodcast error',
      });
    });

    it('should not update rating if there is no rating payload', async () => {
      const updatePodcastArgs = {
        id: PODCAST_ID,
        payload: { title: 'new', rating: null },
      };
      const oldPodcast = TEST_PODCAST;
      const newPodcast = { ...oldPodcast, ...updatePodcastArgs.payload };
      jest.spyOn(service, 'getPodcast').mockImplementationOnce(async id => ({
        ok: true,
        podcast: TEST_PODCAST,
      }));
      const result = await service.updatePodcast(updatePodcastArgs);
      expect(podcastsRepository.save).toHaveBeenCalledTimes(1);
      expect(podcastsRepository.save).toHaveBeenCalledWith(newPodcast);
      expect(result).toEqual({
        ok: true,
      });
    });

    it('should fail on rating limit', async () => {
      const updatePodcastArgs = {
        id: PODCAST_ID,
        payload: { rating: 6 },
      };
      jest.spyOn(service, 'getPodcast').mockImplementationOnce(async id => ({
        ok: true,
      }));
      const result = await service.updatePodcast(updatePodcastArgs);
      expect(result).toEqual({
        ok: false,
        error: 'Rating must be between 1 and 5.',
      });
    });

    it('should update podcast', async () => {
      const oldPodcast = TEST_PODCAST;
      const newPodcast = {
        ...oldPodcast,
        ...updatePodcastArgs.payload,
      };
      jest.spyOn(service, 'getPodcast').mockImplementationOnce(async id => ({
        ok: true,
        podcast: oldPodcast,
      }));
      const result = await service.updatePodcast(updatePodcastArgs);
      expect(podcastsRepository.save).toHaveBeenCalledTimes(1);
      expect(podcastsRepository.save).toHaveBeenCalledWith(newPodcast);
      expect(result).toEqual({ ok: true });
    });

    it('should fail on exception', async () => {
      jest.spyOn(service, 'getPodcast').mockImplementationOnce(async id => ({
        ok: true,
        podcast: new Podcast(),
      }));
      podcastsRepository.save.mockRejectedValue(new Error());
      const result = await service.updatePodcast(updatePodcastArgs);
      expect(result).toEqual(InternalServerErrorOutput);
    });
  });

  describe('getEpisodes', () => {
    it("should fail if podcast doesn't exist", async () => {
      jest.spyOn(service, 'getPodcast').mockImplementationOnce(async id => ({
        ok: false,
        error: 'getPodcast error',
      }));
      const result = await service.getEpisodes(PODCAST_ID);
      expect(result).toEqual({
        ok: false,
        error: 'getPodcast error',
      });
    });

    it('should return episodes', async () => {
      jest.spyOn(service, 'getPodcast').mockImplementationOnce(async id => ({
        ok: true,
        podcast: TEST_PODCAST,
      }));
      const result = await service.getEpisodes(PODCAST_ID);
      expect(result).toEqual({
        ok: true,
        episodes: TEST_PODCAST.episodes,
      });
    });

    it('should fail on exception', async () => {
      jest.spyOn(service, 'getPodcast').mockRejectedValue(new Error());
      const result = await service.getEpisodes(PODCAST_ID);
      expect(result).toEqual(InternalServerErrorOutput);
    });
  });

  describe('getEpisode', () => {
    const getEpisodeArgs = { podcastId: PODCAST_ID, episodeId: EPISODE_ID };

    it('should fail if there is no podcast', async () => {
      jest.spyOn(service, 'getEpisodes').mockImplementationOnce(async id => ({
        ok: false,
        error: 'getEpisodes error',
      }));
      const result = await service.getEpisode(getEpisodeArgs);
      expect(result).toEqual({
        ok: false,
        error: 'getEpisodes error',
      });
    });

    it('should fail if there is no episode', async () => {
      jest.spyOn(service, 'getEpisodes').mockImplementationOnce(async id => ({
        ok: true,
        episodes: [],
      }));
      const result = await service.getEpisode(getEpisodeArgs);
      expect(result).toEqual({
        ok: false,
        error: `Episode with id ${EPISODE_ID} not found in podcast with id ${PODCAST_ID}`,
      });
    });

    it('should return episode', async () => {
      jest.spyOn(service, 'getEpisodes').mockImplementationOnce(async id => ({
        ok: true,
        episodes: [TEST_EPISODE],
      }));
      const result = await service.getEpisode(getEpisodeArgs);
      expect(result).toEqual({
        ok: true,
        episode: TEST_EPISODE,
      });
    });

    it('should fail on exception', async () => {
      jest.spyOn(service, 'getEpisodes').mockRejectedValue(new Error());
      const result = await service.getEpisode(getEpisodeArgs);
      expect(result).toEqual(InternalServerErrorOutput);
    });
  });

  describe('createEpisode', () => {
    const createEpisodeArgs = {
      podcastId: PODCAST_ID,
      title: '',
      category: '',
    };

    it('should fail if there is no podcast', async () => {
      jest.spyOn(service, 'getPodcast').mockImplementationOnce(async id => ({
        ok: false,
        error: 'getPodcast error',
      }));
      const result = await service.createEpisode(createEpisodeArgs);
      expect(result).toEqual({
        ok: false,
        error: 'getPodcast error',
      });
    });

    it('should create episode', async () => {
      jest.spyOn(service, 'getPodcast').mockImplementationOnce(async id => ({
        ok: true,
        podcast: TEST_PODCAST,
      }));
      episodesRepository.create.mockReturnValue({
        title: createEpisodeArgs.title,
        category: createEpisodeArgs.category,
      });
      episodesRepository.save.mockResolvedValue(TEST_EPISODE);
      const result = await service.createEpisode(createEpisodeArgs);
      expect(episodesRepository.create).toHaveBeenCalledTimes(1);
      expect(episodesRepository.create).toHaveBeenCalledWith({
        title: createEpisodeArgs.title,
        category: createEpisodeArgs.category,
      });
      expect(episodesRepository.save).toHaveBeenCalledTimes(1);
      expect(result).toEqual({
        ok: true,
        id: TEST_EPISODE.id,
      });
    });

    it('should fail on exception', async () => {
      jest.spyOn(service, 'getPodcast').mockRejectedValue(new Error());
      const result = await service.createEpisode(createEpisodeArgs);
      expect(result).toEqual(InternalServerErrorOutput);
    });
  });

  describe('deleteEpisode', () => {
    const deleteEpisodeArgs = { podcastId: PODCAST_ID, episodeId: EPISODE_ID };

    it('should fail if there is no episode', async () => {
      jest.spyOn(service, 'getEpisode').mockImplementationOnce(async id => ({
        ok: false,
        error: 'getEpisode error',
      }));
      const result = await service.deleteEpisode(deleteEpisodeArgs);
      expect(result).toEqual({
        ok: false,
        error: 'getEpisode error',
      });
    });

    it('should delete episode', async () => {
      jest.spyOn(service, 'getEpisode').mockImplementationOnce(async id => ({
        ok: true,
        episode: TEST_EPISODE,
      }));
      const result = await service.deleteEpisode(deleteEpisodeArgs);
      expect(result).toEqual({
        ok: true,
      });
    });

    it('should fail on exception', async () => {
      jest.spyOn(service, 'getEpisode').mockRejectedValue(new Error());
      const result = await service.deleteEpisode(deleteEpisodeArgs);
      expect(result).toEqual(InternalServerErrorOutput);
    });
  });

  describe('updateEpisode', () => {
    const updateEpisodeArgs = {
      podcastId: PODCAST_ID,
      episodeId: EPISODE_ID,
      title: 'new',
    };

    it('should fail if there is no episode', async () => {
      jest.spyOn(service, 'getEpisode').mockImplementationOnce(async id => ({
        ok: false,
        error: 'getEpisode error',
      }));
      const result = await service.updateEpisode(updateEpisodeArgs);
      expect(result).toEqual({
        ok: false,
        error: 'getEpisode error',
      });
    });

    it('should update episode', async () => {
      jest.spyOn(service, 'getEpisode').mockImplementationOnce(async id => ({
        ok: true,
        episode: TEST_EPISODE,
      }));
      episodesRepository.save.mockResolvedValue;
      const result = await service.updateEpisode(updateEpisodeArgs);
      expect(episodesRepository.save).toHaveBeenCalledTimes(1);
      expect(episodesRepository.save).toHaveBeenCalledWith({
        ...TEST_EPISODE,
        title: updateEpisodeArgs.title,
      });
      expect(result).toEqual({
        ok: true,
      });
    });

    it('should fail on exception', async () => {
      jest.spyOn(service, 'getEpisode').mockRejectedValue(new Error());
      const result = await service.updateEpisode(updateEpisodeArgs);
      expect(result).toEqual(InternalServerErrorOutput);
    });
  });
});
