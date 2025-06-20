import { Transform } from 'class-transformer';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class GetPlatfromMetricsDto {
  @IsString()
  @IsNotEmpty()
  creatorId: string;

  @IsString()
  @IsOptional()
  platformType: string;

  @IsString()
  @IsOptional()
  platformId: string;

  @IsOptional()
  @Transform(({ value }) => new Date(value))
  startDate: Date;

  @IsOptional()
  @Transform(({ value }) => new Date(value))
  endDate: Date;
}
