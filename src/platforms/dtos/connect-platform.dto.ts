import { IsNotEmpty, IsString } from 'class-validator';

export class ConnectPlatformDto {
  @IsString()
  @IsNotEmpty()
  creatorId: string;

  @IsString()
  @IsNotEmpty()
  type: string;

  @IsString()
  @IsNotEmpty()
  handle: string;
}
