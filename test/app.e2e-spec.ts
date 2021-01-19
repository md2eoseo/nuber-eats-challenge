import * as request from 'supertest';
import { Test } from '@nestjs/testing';
import { AppModule } from './../src/app.module';
import { INestApplication } from '@nestjs/common';
import { getConnection, Repository } from 'typeorm';
import { User } from 'src/users/entity/user.entity';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Podcast } from 'src/podcast/entities/podcast.entity';

const GRAPHQL_ENDPOINT = '/graphql';
const testUser = {
  email: 'test@test.com',
  password: '1234',
};
const testPodcast = {
  title: 'testPodcast',
  category: 'Comedy',
};

describe('App (e2e)', () => {
  let app: INestApplication;
  let usersRepository: Repository<User>;
  let podcastsRepository: Repository<Podcast>;
  let jwtToken: string;

  const baseTest = () => request(app.getHttpServer()).post(GRAPHQL_ENDPOINT);
  const publicTest = (query: string) => baseTest().send({ query });
  const privateTest = (query: string) =>
    baseTest().set('X-JWT', jwtToken).send({ query });

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    usersRepository = moduleFixture.get<Repository<User>>(
      getRepositoryToken(User),
    );
    podcastsRepository = moduleFixture.get<Repository<Podcast>>(
      getRepositoryToken(Podcast),
    );
    await app.init();
  });

  afterAll(async () => {
    await getConnection().dropDatabase();
    app.close();
  });

  describe('Users Resolver', () => {
    describe('createUser', () => {
      it('should create user', () => {
        return request(app.getHttpServer())
          .post(GRAPHQL_ENDPOINT)
          .send({
            query: `
                mutation{
                    createUser(input:{
                        email:"${testUser.email}",
                        password:"${testUser.password}",
                        role:Host
                    }) {
                        ok
                        error
                    }
                }`,
          })
          .expect(200)
          .expect(res => {
            expect(res.body.data.createUser.ok).toBe(true);
            expect(res.body.data.createUser.error).toBe(null);
          });
      });

      it('should fail if account already exists', () => {
        return request(app.getHttpServer())
          .post(GRAPHQL_ENDPOINT)
          .send({
            query: `
                  mutation{
                    createUser(input: {
                      email:"${testUser.email}",
                      password:"${testUser.password}",
                      role:Host
                    }) {
                      ok
                      error
                    }
                  }
                `,
          })
          .expect(200)
          .expect(res => {
            expect(res.body.data.createUser.ok).toBe(false);
            expect(res.body.data.createUser.error).toBe(
              'Email already exists!',
            );
          });
      });
    });

    describe('login', () => {
      it('should login with correct credentials', () => {
        return request(app.getHttpServer())
          .post(GRAPHQL_ENDPOINT)
          .send({
            query: `
              mutation {
                login(input:{
                  email:"${testUser.email}",
                  password:"${testUser.password}",
                }) {
                  ok
                  error
                  token
                }
              }
            `,
          })
          .expect(200)
          .expect(res => {
            const {
              body: {
                data: { login },
              },
            } = res;
            expect(login.ok).toBe(true);
            expect(login.error).toBe(null);
            expect(login.token).toEqual(expect.any(String));
            jwtToken = login.token;
          });
      });

      it('should not be able to login with wrong credentials', () => {
        return request(app.getHttpServer())
          .post(GRAPHQL_ENDPOINT)
          .send({
            query: `
              mutation {
                login(input:{
                  email:"${testUser.email}",
                  password:"wrongpassword",
                }) {
                  ok
                  error
                  token
                }
              }
            `,
          })
          .expect(200)
          .expect(res => {
            const {
              body: {
                data: { login },
              },
            } = res;
            expect(login.ok).toBe(false);
            expect(login.error).toBe('Wrong password!');
            expect(login.token).toBe(null);
          });
      });
    });

    describe('seeProfile', () => {
      let userId: number;

      beforeAll(async () => {
        const [user] = await usersRepository.find();
        userId = user.id;
      });

      it("should see a user's profile", () => {
        return request(app.getHttpServer())
          .post(GRAPHQL_ENDPOINT)
          .set('X-JWT', jwtToken)
          .send({
            query: `
            {
              seeProfile(userId:${userId}){
                ok
                error
                user {
                  id
                }
              }
            }
            `,
          })
          .expect(200)
          .expect(res => {
            const {
              body: {
                data: {
                  seeProfile: {
                    ok,
                    error,
                    user: { id },
                  },
                },
              },
            } = res;
            expect(ok).toBe(true);
            expect(error).toBe(null);
            expect(id).toBe(userId);
          });
      });

      it('should not find a profile', () => {
        return request(app.getHttpServer())
          .post(GRAPHQL_ENDPOINT)
          .set('X-JWT', jwtToken)
          .send({
            query: `
            {
              seeProfile(userId:666){
                ok
                error
                user {
                  id
                }
              }
            }
            `,
          })
          .expect(200)
          .expect(res => {
            const {
              body: {
                data: {
                  seeProfile: { ok, error, user },
                },
              },
            } = res;
            expect(ok).toBe(false);
            expect(error).toBe("Couldn't see user's profile");
            expect(user).toBe(null);
          });
      });
    });

    describe('me', () => {
      it('should find my profile', () => {
        return request(app.getHttpServer())
          .post(GRAPHQL_ENDPOINT)
          .set('X-JWT', jwtToken)
          .send({
            query: `
              {
                me {
                  email
                }
              }
            `,
          })
          .expect(200)
          .expect(res => {
            const {
              body: {
                data: {
                  me: { email },
                },
              },
            } = res;
            expect(email).toBe(testUser.email);
          });
      });

      it('should not allow logged out user', () => {
        return request(app.getHttpServer())
          .post(GRAPHQL_ENDPOINT)
          .send({
            query: `
            {
              me {
                email
              }
            }
          `,
          })
          .expect(200)
          .expect(res => {
            const {
              body: { errors },
            } = res;
            const [error] = errors;
            expect(error.message).toBe('Forbidden resource');
          });
      });
    });

    describe('editProfile', () => {
      const NEW_EMAIL = 'tae@new.com';
      it('should change email', () => {
        return request(app.getHttpServer())
          .post(GRAPHQL_ENDPOINT)
          .set('X-JWT', jwtToken)
          .send({
            query: `
                mutation {
                  editProfile(input:{
                    email: "${NEW_EMAIL}"
                  }) {
                    ok
                    error
                  }
                }
            `,
          })
          .expect(200)
          .expect(res => {
            const {
              body: {
                data: {
                  editProfile: { ok, error },
                },
              },
            } = res;
            expect(ok).toBe(true);
            expect(error).toBe(null);
          });
      });

      it('should have new email', () => {
        return request(app.getHttpServer())
          .post(GRAPHQL_ENDPOINT)
          .set('X-JWT', jwtToken)
          .send({
            query: `
              {
                me {
                  email
                }
              }
            `,
          })
          .expect(200)
          .expect(res => {
            const {
              body: {
                data: {
                  me: { email },
                },
              },
            } = res;
            expect(email).toBe(NEW_EMAIL);
          });
      });
    });
  });

  describe('Podcasts Resolver', () => {
    describe('createPodcast', () => {
      it('should create podcast', async () => {
        return privateTest(`
          mutation{
              createPodcast(input:{
                  title:"${testPodcast.title}",
                  category:"${testPodcast.category}"
              }){
                  ok
                  error
                  id
              }
          }`)
          .expect(200)
          .expect(res => {
            const {
              body: {
                data: {
                  createPodcast: { ok, error, id },
                },
              },
            } = res;
            expect(ok).toBe(true);
            expect(error).toBe(null);
            expect(id).toStrictEqual(expect.any(Number));
          });
      });
    });

    describe('getAllPodcasts', () => {
      it('should list all podcasts', async () => {
        return publicTest(`{
          getAllPodcasts{
            ok
            error
            podcasts{
              id
              title
              category
            }
          }
        }`)
          .expect(200)
          .expect(res => {
            const {
              body: {
                data: {
                  getAllPodcasts: { ok, error, podcasts },
                },
              },
            } = res;
            expect(ok).toBe(true);
            expect(error).toBe(null);
            expect(podcasts.length).toBe(1);
          });
      });
    });

    describe('getPodcast', () => {
      let podcastId: number;

      beforeAll(async () => {
        const [podcast] = await podcastsRepository.find();
        podcastId = podcast.id;
      });

      it('should get podcast data with id', async () => {
        return publicTest(`
        {
            getPodcast(input:{id:${podcastId}}){
                ok
                error
                podcast{
                    id
                }
            }
        }`)
          .expect(200)
          .expect(res => {
            const {
              body: {
                data: {
                  getPodcast: { ok, error, podcast },
                },
              },
            } = res;
            expect(ok).toBe(true);
            expect(error).toBe(null);
            expect(podcast.id).toBe(podcastId);
          });
      });

      it('should fail to get podcast data with wrong id', async () => {
        return publicTest(`
        {
            getPodcast(input:{id:666}){
                ok
                error
                podcast{
                    id
                }
            }
        }`)
          .expect(200)
          .expect(res => {
            const {
              body: {
                data: {
                  getPodcast: { ok, error, podcast },
                },
              },
            } = res;
            expect(ok).toBe(false);
            expect(error).toBe(`Podcast with id 666 not found`);
            expect(podcast).toBe(null);
          });
      });
    });

    describe('updatePodcast', () => {
      const NEW_PODCAST_TITLE = 'newPodcast';
      let podcastId: number;

      beforeAll(async () => {
        const [podcast] = await podcastsRepository.find();
        podcastId = podcast.id;
      });

      it('should update podcast with payload', async () => {
        return privateTest(`
        mutation{
          updatePodcast(input:{
            id:${podcastId}
            payload:{
              title:"${NEW_PODCAST_TITLE}"
            }
          }){
            ok
            error
          }
        }`)
          .expect(200)
          .expect(res => {
            const {
              body: {
                data: {
                  updatePodcast: { ok, error },
                },
              },
            } = res;
            expect(ok).toBe(true);
            expect(error).toBe(null);
          });
      });

      it('should have new title', async () => {
        return publicTest(`
        {
          getPodcast(input:{id:${podcastId}}){
            ok
            error
            podcast{
              title
            }
          }
        }`)
          .expect(200)
          .expect(res => {
            const {
              body: {
                data: {
                  getPodcast: { ok, error, podcast },
                },
              },
            } = res;
            expect(ok).toBe(true);
            expect(error).toBe(null);
            expect(podcast.title).toBe(NEW_PODCAST_TITLE);
          });
      });

      it("should fail if rating doesn't fit condition", async () => {
        return privateTest(`
        mutation{
          updatePodcast(input:{
            id:${podcastId}
            payload:{
              rating:7
            }
          }){
            ok
            error
          }
        }`)
          .expect(200)
          .expect(res => {
            const {
              body: {
                data: {
                  updatePodcast: { ok, error },
                },
              },
            } = res;
            expect(ok).toBe(false);
            expect(error).toBe('Rating must be between 1 and 5.');
          });
      });
    });

    describe('createEpisode', () => {
      it('should create episode', async () => {
        return privateTest(`
          mutation{
              createEpisode(input:{
                  podcastId:1,
                  title:"${testPodcast.title}",
                  category:"${testPodcast.category}"
              }){
                  ok
                  error
                  id
              }
          }`)
          .expect(200)
          .expect(res => {
            const {
              body: {
                data: {
                  createEpisode: { ok, error, id },
                },
              },
            } = res;
            expect(ok).toBe(true);
            expect(error).toBe(null);
            expect(id).toStrictEqual(expect.any(Number));
          });
      });
    });

    describe('getEpisodes', () => {
      it('should get episodes from podcast', async () => {
        return publicTest(`
        {
          getEpisodes(input:{id:1}){
            ok
            episodes{
              id
            }
          }
        }`)
          .expect(200)
          .expect(res => {
            const {
              body: {
                data: {
                  getEpisodes: { ok, episodes },
                },
              },
            } = res;
            expect(ok).toBe(true);
            expect(episodes.length).toBe(1);
          });
      });
    });

    describe('updateEpisode', () => {
      const NEW_EPISODE_TITLE = 'newEpisode';
      let podcastId: number = 1;
      let episodeId: number = 1;

      it('should update episode with payload', async () => {
        return privateTest(`
        mutation{
          updateEpisode(input:{
            podcastId:${podcastId},
            episodeId:${episodeId},
            title:"${NEW_EPISODE_TITLE}"
          }){
            ok
            error
          }
        }`)
          .expect(200)
          .expect(res => {
            const {
              body: {
                data: {
                  updateEpisode: { ok, error },
                },
              },
            } = res;
            expect(ok).toBe(true);
            expect(error).toBe(null);
          });
      });

      it('should have new title', async () => {
        return publicTest(`
      {
        getEpisodes(input:{id:${podcastId}}){
          ok
          error
          episodes{
            title
          }
        }
      }`)
          .expect(200)
          .expect(res => {
            const {
              body: {
                data: {
                  getEpisodes: { ok, error, episodes },
                },
              },
            } = res;
            expect(ok).toBe(true);
            expect(error).toBe(null);
            expect(episodes[0].title).toBe(NEW_EPISODE_TITLE);
          });
      });
    });

    describe('deleteEpisode', () => {
      it('should delete episode', async () => {
        return privateTest(`mutation{
          deleteEpisode(input:{podcastId:1,episodeId:1}){
            ok
            error
          }
        }`)
          .expect(200)
          .expect(res => {
            const {
              body: {
                data: {
                  deleteEpisode: { ok, error },
                },
              },
            } = res;
            expect(ok).toBe(true);
            expect(error).toBe(null);
          });
      });

      it('should not find deleted episode', () => {
        return publicTest(`{
          getEpisodes(input:{id:1}){
            ok
            error
            episodes{
              id
            }
          }
        }`)
          .expect(200)
          .expect(res => {
            const {
              body: {
                data: {
                  getEpisodes: { ok, error, episodes },
                },
              },
            } = res;
            expect(ok).toBe(true);
            expect(error).toBe(null);
            expect(episodes.length).toBe(0);
          });
      });
    });
    describe('deletePodcast', () => {
      it('should delete podcast', async () => {
        return privateTest(`mutation{
          deletePodcast(input:{id:1}){
            ok
            error
          }
        }`)
          .expect(200)
          .expect(res => {
            const {
              body: {
                data: {
                  deletePodcast: { ok, error },
                },
              },
            } = res;
            expect(ok).toBe(true);
            expect(error).toBe(null);
          });
      });

      it('should not find deleted podcast', () => {
        return publicTest(`{
          getPodcast(input:{id:1}){
            ok
            error
          }
        }`)
          .expect(200)
          .expect(res => {
            const {
              body: {
                data: {
                  getPodcast: { ok, error },
                },
              },
            } = res;
            expect(ok).toBe(false);
            expect(error).toBe('Podcast with id 1 not found');
          });
      });
    });
  });
});
