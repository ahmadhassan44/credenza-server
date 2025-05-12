import { Transform, Type } from 'class-transformer';
import { IsDate, IsISO8601, IsNotEmpty, IsString } from 'class-validator';

export class GetPlatfromMetricsDto {
  @IsString()
  @IsNotEmpty()
  creatorId: string;

  @IsString()
  @IsNotEmpty()
  platformType: string;

  @IsNotEmpty()
  @Transform(({ value }) => new Date(value))
  startDate: Date;

  @IsNotEmpty()
  @Transform(({ value }) => new Date(value))
  endDate: Date;
}
