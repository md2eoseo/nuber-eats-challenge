import { Field, InputType, ObjectType } from '@nestjs/graphql';
import { CoreEntity } from 'src/common/entity/core.entity';
import { Column, Entity, ManyToOne } from 'typeorm';
import { User } from '../../users/entity/user.entity';
import { Podcast } from 'src/podcast/entities/podcast.entity';

@InputType({ isAbstract: true })
@ObjectType()
@Entity()
export class Subscription extends CoreEntity {
  @ManyToOne(() => Podcast, podcast => podcast.subscriptions, {
    onDelete: 'CASCADE',
  })
  @Field(type => Podcast)
  podcast: Podcast;

  @ManyToOne(() => User, user => user.subscriptions, { onDelete: 'CASCADE' })
  @Field(type => User)
  listener: User;
}
