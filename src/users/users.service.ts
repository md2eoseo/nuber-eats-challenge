import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { JwtService } from 'src/jwt/jwt.service';
import { Repository } from 'typeorm';
import { CreateUserInput, CreateUserOutput } from './dtos/create-user.dto';
import { EditProfileInput, EditProfileOutput } from './dtos/edit-profile.dto';
import { LoginInput, LoginOutput } from './dtos/login.dto';
import { SeeProfileOutput } from './dtos/see-profile.dto';
import { User } from './entity/user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly users: Repository<User>,
    private readonly jwtService: JwtService,
  ) {}

  async createUser({
    email,
    password,
    role,
  }: CreateUserInput): Promise<CreateUserOutput> {
    try {
      const exists = await this.users.findOne({ email });
      if (exists) {
        return { ok: false, error: 'Email already exists!' };
      }
      const newUser = this.users.create({ email, password, role });
      await this.users.save(newUser);
      return { ok: true };
    } catch (error) {
      return { ok: false, error };
    }
  }

  async seeProfile(userId: number): Promise<SeeProfileOutput> {
    try {
      const user = await this.users.findOne(userId);
      if (!user) {
        return { ok: false, error: "User doesn't exist!" };
      }
      return { ok: true, user };
    } catch (error) {
      return { ok: false, error };
    }
  }

  async login({ email, password }: LoginInput): Promise<LoginOutput> {
    try {
      const user = await this.users.findOne(
        { email },
        { select: ['id', 'password'] },
      );
      if (!user) {
        return { ok: false, error: "User doesn't exist!" };
      }

      const passwordCorrect = await user.checkPassword(password);
      if (!passwordCorrect) {
        return { ok: false, error: 'Wrong password!' };
      }

      const token = this.jwtService.sign(user.id);
      return { ok: true, token };
    } catch (error) {
      return { ok: false, error };
    }
  }

  async editProfile(
    userId: number,
    { email, password }: EditProfileInput,
  ): Promise<EditProfileOutput> {
    try {
      const user = await this.users.findOne(userId);
      if (!user) {
        return { ok: false, error: "User doesn't exist!" };
      }
      if (email) {
        user.email = email;
      }
      if (password) {
        user.password = password;
      }
      await this.users.save(user);
      return { ok: true };
    } catch (error) {
      return { ok: false, error };
    }
  }
}
