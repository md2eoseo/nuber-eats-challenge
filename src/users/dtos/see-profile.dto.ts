import { ArgsType, Field, Int, ObjectType } from '@nestjs/graphql';
import { CoreOutput } from 'src/common/dtos/output.dto';
import { User } from '../entity/user.entity';

@ArgsType()
export class SeeProfileInput {
  @Field(type => Int)
  userId: number;
}

@ObjectType()
export class SeeProfileOutput extends CoreOutput {
  @Field(type => User, { nullable: true })
  user?: User;
}
