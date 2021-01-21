import { Field, InputType, Int, ObjectType, PickType } from '@nestjs/graphql';
import { CoreOutput } from 'src/common/dtos/output.dto';
import { Review } from '../entities/review.entity';

@InputType()
export class ReviewPodcastInput extends PickType(Review, ['content']) {
  @Field(type => Int)
  podcastId: number;
}

@ObjectType()
export class ReviewPodcastOutput extends CoreOutput {}
