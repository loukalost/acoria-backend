import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { Role } from '@prisma/client';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';

describe('AuthService', () => {
  let service: AuthService;
  let prisma: { utilisateur: { findUnique: jest.Mock; create: jest.Mock } };

  const mockUtilisateur = {
    id: 'uuid-1',
    email: 'test@acoria.fr',
    passwordHash: 'hashed_password',
    nom: 'Dupont',
    prenom: 'Marie',
    role: Role.THERAPEUTE,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    prisma = {
      utilisateur: {
        findUnique: jest.fn(),
        create: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        {
          provide: JwtService,
          useValue: { sign: jest.fn().mockReturnValue('fake-jwt-token') },
        },
        {
          provide: ConfigService,
          useValue: {
            getOrThrow: jest.fn().mockReturnValue('fake-secret-or-value'),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('register', () => {
    it('should create a new utilisateur and return tokens', async () => {
      prisma.utilisateur.findUnique.mockResolvedValue(null);
      prisma.utilisateur.create.mockResolvedValue(mockUtilisateur);

      const result = await service.register({
        email: 'test@acoria.fr',
        password: 'motdepasse123',
        nom: 'Dupont',
        prenom: 'Marie',
      });

      expect(result).toEqual({
        accessToken: 'fake-jwt-token',
        refreshToken: 'fake-jwt-token',
      });
      expect(prisma.utilisateur.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ email: 'test@acoria.fr' }),
        }),
      );
    });

    it('should throw ConflictException if email already exists', async () => {
      prisma.utilisateur.findUnique.mockResolvedValue(mockUtilisateur);

      await expect(
        service.register({
          email: 'test@acoria.fr',
          password: 'motdepasse123',
          nom: 'Dupont',
          prenom: 'Marie',
        }),
      ).rejects.toThrow(ConflictException);

      expect(prisma.utilisateur.create).not.toHaveBeenCalled();
    });
  });

  describe('login', () => {
    it('should return tokens for valid credentials', async () => {
      const hashedPassword = await bcrypt.hash('motdepasse123', 10);
      prisma.utilisateur.findUnique.mockResolvedValue({
        ...mockUtilisateur,
        passwordHash: hashedPassword,
      });

      const result = await service.login({
        email: 'test@acoria.fr',
        password: 'motdepasse123',
      });

      expect(result).toEqual({
        accessToken: 'fake-jwt-token',
        refreshToken: 'fake-jwt-token',
      });
    });

    it('should throw UnauthorizedException if utilisateur does not exist', async () => {
      prisma.utilisateur.findUnique.mockResolvedValue(null);

      await expect(
        service.login({ email: 'inconnu@acoria.fr', password: 'whatever' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if password is incorrect', async () => {
      const hashedPassword = await bcrypt.hash('bon_mot_de_passe', 10);
      prisma.utilisateur.findUnique.mockResolvedValue({
        ...mockUtilisateur,
        passwordHash: hashedPassword,
      });

      await expect(
        service.login({
          email: 'test@acoria.fr',
          password: 'mauvais_mot_de_passe',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });
});
