import { Controller, Get } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';

@Controller()
export class AppController {
  constructor(private prisma: PrismaService) {}

  @Get('health')
  async health() {
    const count = await this.prisma.utilisateur.count();
    return { status: 'ok', utilisateursCount: count };
  }
}
