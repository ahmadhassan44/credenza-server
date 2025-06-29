import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';

import { GeolocationService } from 'src/geolocation/geolocation.service';
import { Type } from 'class-transformer';
import { CreateUserDto, UpdateUserDto } from './dtos/user.dtos';

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

    // Creator data to be populated
    const creatorData: any = {
      name: `${rest.firstName || ''} ${rest.lastName || ''}`.trim(),
      email,
      user: {
        connect: {
          id: user.id,
        },
      },
    };

    // Only process location if it exists
    if (location) {
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
          },
        });

      // Add geographic location to creator data if we have it
      creatorData.geographicLocation = {
        connect: {
          id: geographicLocation.id,
        },
      };
    }

    // Create creator with the prepared data
    const creator = await this.prisma.creator.create({
      data: creatorData,
    });

    return { user, creatorId: creator.id };
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
    const creator = await this.prisma.creator.findUnique({
      where: { userId: id },
    });

    if (creator) {
      await this.prisma.creator.update({
        where: { userId: id },
        data: {
          name: `${updateUserDto.firstName || ''} ${updateUserDto.lastName || ''}`.trim(),
          email: updateUserDto.email,
        },
      });
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
  async getUserProfile(userId: string, userRole: string) {
    if (userRole === 'CREATOR') {
      const creator = await this.prisma.creator.findUnique({
        where: { userId: userId },
        include: {
          // User information
          user: {
            select: {
              email: true,
              firstName: true,
              lastName: true,
              role: true,
              createdAt: true,
              updatedAt: true,
            },
          },
          // Geographic location details
          geographicLocation: true,
          // Connected platforms
          platforms: true,
          // Credit scores history
          creditScores: {
            orderBy: {
              timestamp: 'desc',
            },
            include: {
              platformScores: true,
            },
          },
          // Metrics data with optional filters
          Metric: {
            orderBy: {
              date: 'desc',
            },
            take: 30, // Limit to last 30 metrics entries
            include: {
              Platform: true,
            },
          },
        },
      });
      return creator;
    }

    // Handle other user roles
    return null;
  }
}
