import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtService } from 'src/jwt/jwt.service';
import { Repository } from 'typeorm';
import { User } from './entity/user.entity';
import { UsersService } from './users.service';

const mockRepository = () => ({
  findOne: jest.fn(),
  save: jest.fn(),
  create: jest.fn(),
  findOneOrFail: jest.fn(),
});

const mockJwtService = {
  sign: jest.fn(() => 'signed-token'),
  verify: jest.fn(),
};

type MockRepository<T = any> = Partial<
  Record<keyof Repository<User>, jest.Mock>
>;

describe('UsersService', () => {
  let service: UsersService;
  let usersRepository: MockRepository<User>;
  let jwtService: JwtService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getRepositoryToken(User),
          useValue: mockRepository(),
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
      ],
    }).compile();
    service = module.get<UsersService>(UsersService);
    usersRepository = module.get(getRepositoryToken(User));
    jwtService = module.get<JwtService>(JwtService);
  });

  it('to be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createUser', () => {
    const createUserArgs = {
      email: '',
      password: '',
      role: 0,
    };

    it('should fail if user exists', async () => {
      usersRepository.findOne.mockResolvedValue({
        id: 1,
        email: 'test@test.com',
      });
      const result = await service.createUser(createUserArgs);
      expect(result).toMatchObject({
        ok: false,
        error: 'Email already exists!',
      });
    });

    it('should create a new user', async () => {
      usersRepository.findOne.mockResolvedValue(undefined);
      usersRepository.create.mockReturnValue(createUserArgs);
      usersRepository.save.mockReturnValue(createUserArgs);
      const result = await service.createUser(createUserArgs);
      expect(usersRepository.create).toHaveBeenCalledTimes(1);
      expect(usersRepository.create).toHaveBeenCalledWith(createUserArgs);
      expect(usersRepository.save).toHaveBeenCalledTimes(1);
      expect(usersRepository.save).toHaveBeenCalledWith(createUserArgs);
      expect(result).toEqual({ ok: true });
    });

    it('should fail on exception', async () => {
      usersRepository.findOne.mockRejectedValue(new Error());
      const result = await service.createUser(createUserArgs);
      expect(result).toEqual({ ok: false, error: "Couldn't create a user" });
    });
  });

  describe('login', () => {
    const loginArgs = {
      email: '',
      password: '',
    };

    it('should fail if user does not exist', async () => {
      usersRepository.findOne.mockResolvedValue(null);
      const result = await service.login(loginArgs);
      expect(usersRepository.findOne).toBeCalledTimes(1);
      expect(usersRepository.findOne).toBeCalledWith(
        expect.any(Object),
        expect.any(Object),
      );
      expect(result).toEqual({ ok: false, error: "User doesn't exist!" });
    });

    it('should fail if the password is wrong', async () => {
      const mockedUser = {
        checkPassword: jest.fn(() => Promise.resolve(false)),
      };
      usersRepository.findOne.mockResolvedValue(mockedUser);
      const result = await service.login(loginArgs);
      expect(result).toEqual({ ok: false, error: 'Wrong password!' });
    });

    it('should return token if login succeed', async () => {
      const mockedUser = {
        id: 1,
        checkPassword: jest.fn(() => Promise.resolve(true)),
      };
      usersRepository.findOne.mockResolvedValue(mockedUser);
      const result = await service.login(loginArgs);
      expect(jwtService.sign).toHaveBeenCalledTimes(1);
      expect(jwtService.sign).toHaveBeenCalledWith(expect.any(Number));
      expect(result).toEqual({ ok: true, token: 'signed-token' });
    });

    it('should fail on exception', async () => {
      usersRepository.findOne.mockRejectedValue(new Error());
      const result = await service.login(loginArgs);
      expect(result).toEqual({ ok: false, error: "Couldn't login" });
    });
  });

  describe('seeProfile', () => {
    const seeProfileArgs = expect.any(Number);
    const mockedUser = { id: 1, email: '', password: '', role: 0 };

    it('should return user if there is user', async () => {
      usersRepository.findOneOrFail.mockResolvedValue(mockedUser);
      const result = await service.seeProfile(seeProfileArgs);
      expect(result).toEqual({ ok: true, user: mockedUser });
    });

    it('should fail if there is no user', async () => {
      usersRepository.findOneOrFail.mockRejectedValue(new Error());
      const result = await service.seeProfile(seeProfileArgs);
      expect(result).toEqual({
        ok: false,
        error: "Couldn't see user's profile",
      });
    });
  });

  describe('editProfile', () => {
    it("should fail if user doesn't exist", async () => {
      usersRepository.findOne.mockResolvedValue(null);
      const result = await service.editProfile(expect.any(Number), {
        email: '',
      });
      expect(result).toEqual({ ok: false, error: "User doesn't exist!" });
    });

    it('should change email', async () => {
      const oldUser = { email: 'test@old.com' };
      const editProfileArgs = {
        userId: 1,
        input: { email: 'test@new.com' },
      };
      const newUser = { email: 'test@new.com' };
      usersRepository.findOne.mockResolvedValue(oldUser);
      usersRepository.save.mockResolvedValue(newUser);
      const result = await service.editProfile(
        editProfileArgs.userId,
        editProfileArgs.input,
      );
      expect(usersRepository.findOne).toHaveBeenCalledTimes(1);
      expect(usersRepository.findOne).toHaveBeenCalledWith(
        editProfileArgs.userId,
      );
      expect(usersRepository.save).toHaveBeenCalledTimes(1);
      expect(usersRepository.save).toHaveBeenCalledWith(newUser);
      expect(result).toEqual({ ok: true });
    });

    it('should change password', async () => {
      const oldUser = { password: 'old' };
      const editProfileArgs = {
        userId: 1,
        input: { password: 'new' },
      };
      const newUser = { password: 'new' };
      usersRepository.findOne.mockResolvedValue(oldUser);
      usersRepository.save.mockResolvedValue(newUser);
      const result = await service.editProfile(
        editProfileArgs.userId,
        editProfileArgs.input,
      );
      expect(usersRepository.findOne).toHaveBeenCalledTimes(1);
      expect(usersRepository.findOne).toHaveBeenCalledWith(
        editProfileArgs.userId,
      );
      expect(usersRepository.save).toHaveBeenCalledTimes(1);
      expect(usersRepository.save).toHaveBeenCalledWith(newUser);
      expect(result).toEqual({ ok: true });
    });

    it('should fail on exception', async () => {
      usersRepository.findOne.mockRejectedValue(new Error());
      const result = await service.editProfile(expect.any(Number), {
        email: '',
      });
      expect(result).toEqual({ ok: false, error: "Couldn't edit the profile" });
    });
  });
});
