import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import {
  IsEmail,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { GeolocationService } from 'src/geolocation/geolocation.service';

class LocationDto {
  @IsNumber()
  latitude: number;

  @IsNumber()
  longitude: number;
}
export class CreateUserDto {
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @IsNotEmpty()
  @MinLength(6)
  password: string;
  @IsNotEmpty()
  firstName?: string;
  lastName?: string;

  @IsOptional()
  @ValidateNested({ each: true })
  location: LocationDto;
}

export interface UpdateUserDto {
  firstName?: string;
  lastName?: string;
  email?: string;
  password?: string;
}

@Injectable()
export class UserService {
  constructor(
    private prisma: PrismaService,
    private readonly geolocationService: GeolocationService,
  ) {}

  async create(createUserDto: CreateUserDto) {
    const { email, password, location, ...rest } = createUserDto;

    // Check if user already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new ConflictException('Email already in use');
    }

    const hashedPassword = await this.hashPassword(password);

    const user = await this.prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        ...rest,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    const { latitude, longitude } = location;
    const geoData =
      await this.geolocationService.getLocationDataFromCoordinates(
        latitude,
        longitude,
      );

    const geographicLocation =
      await this.prisma.creatorGeographicLocation.create({
        data: {
          countryCode: geoData.countryCode,
          countryName: geoData.countryName,
          region: geoData.region,
          currency: geoData.currency,
          averageCpmUsd: geoData.averageCpmUsd,
          language: geoData.language,
          timezone: geoData.timezone,
          creatorId: '', // This will be updated by the relation
        },
      });

    await this.prisma.creator.create({
      data: {
        name: `${rest.firstName || ''} ${rest.lastName || ''}`.trim(),
        email,
        user: {
          connect: {
            id: user.id,
          },
        },
        geographicLocation: {
          connect: {
            id: geographicLocation.id,
          },
        },
      },
    });
    return user;
  }

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
      include: {
        creator: true,
      },
    });
  }

  async findById(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      include: {
        creator: true,
      },
    });
  }

  async update(id: string, updateUserDto: UpdateUserDto) {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const data: any = { ...updateUserDto };

    if (updateUserDto.password) {
      data.password = await this.hashPassword(updateUserDto.password);
    }

    return this.prisma.user.update({
      where: { id },
      data,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async delete(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.prisma.user.delete({
      where: { id },
      select: {
        id: true,
      },
    });
  }

  async validateUser(email: string, password: string) {
    const user = await this.findByEmail(email);

    if (!user) {
      return null;
    }

    const passwordValid = await bcrypt.compare(password, user.password);

    if (!passwordValid) {
      return null;
    }

    return user;
  }

  private async hashPassword(password: string): Promise<string> {
    const saltRounds = 10;
    return bcrypt.hash(password, saltRounds);
  }
}
