import { Field, ObjectType } from '@nestjs/graphql';
import { CoreOutput } from 'src/common/dtos/output.dto';
import { Subscription } from '../entities/subscription.entity';

@ObjectType()
export class GetSubscriptionsOutput extends CoreOutput {
  @Field(type => [Subscription], { nullable: true })
  subscriptions?: Subscription[];
}
