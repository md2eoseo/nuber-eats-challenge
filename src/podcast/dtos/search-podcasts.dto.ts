import { Field, InputType, ObjectType } from '@nestjs/graphql';
import { CoreOutput } from 'src/common/dtos/output.dto';
import { Podcast } from '../entities/podcast.entity';

@InputType()
export class SearchPodcastsInput {
  @Field(type => String)
  query: string;
}

@ObjectType()
export class SearchPodcastsOutput extends CoreOutput {
  @Field(type => [Podcast], { nullable: true })
  podcasts?: Podcast[];
}
