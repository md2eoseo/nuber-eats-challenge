import { Episode } from './episode.entity';
import { ObjectType, Field, InputType } from '@nestjs/graphql';
import { IsString, Min, Max, IsNumber } from 'class-validator';
import { Column, Entity, OneToMany } from 'typeorm';
import { CoreEntity } from '../../common/entity/core.entity';
import { Review } from 'src/podcast/entities/review.entity';
import { Subscription } from './subscription.entity';

@Entity()
@InputType({ isAbstract: true })
@ObjectType()
export class Podcast extends CoreEntity {
  @Column({ unique: true })
  @Field(type => String)
  @IsString()
  title: string;

  @Column()
  @Field(type => String)
  @IsString()
  category: string;

  @Column({ default: 0 })
  @Field(type => Number)
  @IsNumber()
  @Min(0)
  @Max(5)
  rating: number;

  @OneToMany(() => Episode, episode => episode.podcast)
  @Field(type => [Episode])
  episodes: Episode[];

  @OneToMany(() => Review, review => review.podcast)
  @Field(type => [Review])
  reviews: Review[];

  @OneToMany(() => Subscription, subscription => subscription.podcast)
  @Field(type => [Subscription])
  subscriptions: Subscription[];
}
