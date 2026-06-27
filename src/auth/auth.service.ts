import {
  Injectable,
  ConflictException,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import * as bcrypt from "bcrypt";
import { Role } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { RegisterDto } from "./dto/register.dto";
import { LoginDto } from "./dto/login.dto";

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.prisma.utilisateur.findUnique({
      where: { email: dto.email },
    });
    if (existing) {
      throw new ConflictException("Un compte existe déjà avec cet email");
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    const utilisateur = await this.prisma.utilisateur.create({
      data: {
        email: dto.email,
        passwordHash,
        nom: dto.nom,
        prenom: dto.prenom,
        role: dto.role ?? Role.THERAPEUTE,
      },
    });

    return this.generateTokens(utilisateur.id, utilisateur.email, utilisateur.role);
  }

  async login(dto: LoginDto) {
    const utilisateur = await this.prisma.utilisateur.findUnique({
      where: { email: dto.email },
    });

    if (!utilisateur) {
      throw new UnauthorizedException("Identifiants invalides");
    }

    const isPasswordValid = await bcrypt.compare(
      dto.password,
      utilisateur.passwordHash,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException("Identifiants invalides");
    }

    return this.generateTokens(utilisateur.id, utilisateur.email, utilisateur.role);
  }

  async validateUtilisateur(id: string) {
    const utilisateur = await this.prisma.utilisateur.findUnique({
      where: { id },
    });
    if (!utilisateur) {
      throw new UnauthorizedException();
    }
    const { passwordHash, ...result } = utilisateur;
    return result;
  }

  private generateTokens(sub: string, email: string, role: Role) {
    const accessToken = this.jwtService.sign(
      { sub, email, role },
      {
        secret: this.configService.getOrThrow<string>("JWT_ACCESS_SECRET"),
        expiresIn: this.configService.get("JWT_ACCESS_EXPIRES_IN"),
      },
    );

    const refreshToken = this.jwtService.sign(
      { sub, email, role },
      {
        secret: this.configService.getOrThrow<string>("JWT_REFRESH_SECRET"),
        expiresIn: this.configService.get("JWT_REFRESH_EXPIRES_IN"),
      },
    );

    return { accessToken, refreshToken };
  }
}