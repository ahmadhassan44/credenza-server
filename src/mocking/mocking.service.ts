import { Injectable } from '@nestjs/common';
import { CATEGORY_TAGS } from 'src/commons/content-category-tags';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class MockingService {
  constructor(private readonly prismaService: PrismaService) {}
  async genrateCreatorMockData(creatorId: string) {
    const creator = await this.prismaService.creator.findUnique({
      where: {
        userId: creatorId,
      },
    });
    const contentCategory = creator!.contentCategory;
    const contentTags = this.getRandomElements(CATEGORY_TAGS[contentCategory]);
  }

  private getRandomElements(array: string[]): string[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled.slice(0, Math.min(3, shuffled.length));
  }
}
