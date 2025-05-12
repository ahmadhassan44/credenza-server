import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserService } from '../users/user.service';
import { PrismaService } from '../prisma/prisma.service';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class AuthService {
  constructor(
    private userService: UserService,
    private jwtService: JwtService,
    private prisma: PrismaService,
  ) {}

  async validateUser(email: string, password: string) {
    const user = await this.userService.validateUser(email, password);

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return user;
  }

  async login(user: any) {
    const payload = {
      email: user.email,
      sub: user.id,
      role: user.role,
    };

    const accessToken = this.jwtService.sign(payload);
    const refreshToken = await this.generateRefreshToken(user.id);

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        creatorId: user.creator?.id,
      },
    };
  }

  async refreshToken(token: string) {
    // Find the refresh token in the database
    const refreshTokenData = await this.prisma.refreshToken.findUnique({
      where: { token },
      include: { user: true },
    });

    // Check if token exists and is not expired
    if (!refreshTokenData || refreshTokenData.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    // Generate new tokens
    const payload = {
      email: refreshTokenData.user.email,
      sub: refreshTokenData.user.id,
      role: refreshTokenData.user.role,
    };

    const accessToken = this.jwtService.sign(payload);
    const newRefreshToken = await this.generateRefreshToken(
      refreshTokenData.user.id,
    );

    // Delete the old refresh token
    await this.prisma.refreshToken.delete({
      where: { id: refreshTokenData.id },
    });

    return {
      accessToken,
      refreshToken: newRefreshToken,
      user: {
        id: refreshTokenData.user.id,
        email: refreshTokenData.user.email,
        firstName: refreshTokenData.user.firstName,
        lastName: refreshTokenData.user.lastName,
        role: refreshTokenData.user.role,
      },
    };
  }

  async logout(userId: string) {
    // Delete all refresh tokens for the user
    await this.prisma.refreshToken.deleteMany({
      where: { userId },
    });

    return { success: true };
  }

  private async generateRefreshToken(userId: string): Promise<string> {
    const token = uuidv4();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days from now

    await this.prisma.refreshToken.create({
      data: {
        token,
        userId,
        expiresAt,
      },
    });

    return token;
  }
}
