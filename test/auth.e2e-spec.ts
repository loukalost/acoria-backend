import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/prisma/prisma.service';

describe('Auth (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  const testEmail = 'e2e-test@acoria.fr';
  const testPassword = 'motdepasse123';

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideGuard(ThrottlerGuard)
      .useValue({ canActivate: () => true })
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    prisma = moduleFixture.get<PrismaService>(PrismaService);
    // Nettoyage préventif si un précédent run a échoué avant son propre nettoyage
    await prisma.utilisateur.deleteMany({ where: { email: testEmail } });
  });

  afterAll(async () => {
    await prisma.utilisateur.deleteMany({ where: { email: testEmail } });
    await app.close();
  });

  describe('/auth/register (POST)', () => {
    it('should register a new utilisateur and return tokens', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: testEmail,
          password: testPassword,
          nom: 'Test',
          prenom: 'E2E',
        })
        .expect(201);

      expect(res.body).toHaveProperty('accessToken');
      expect(res.body).toHaveProperty('refreshToken');
    });

    it('should reject duplicate email with 409', async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: testEmail,
          password: testPassword,
          nom: 'Test',
          prenom: 'E2E',
        })
        .expect(409);
    });

    it('should reject invalid payload with 400', async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({ email: 'pas-un-email', password: '123', nom: 'Test', prenom: 'E2E' })
        .expect(400);
    });
  });

  describe('/auth/login (POST)', () => {
    it('should login with valid credentials and return tokens', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: testEmail, password: testPassword })
        .expect(201);

      expect(res.body).toHaveProperty('accessToken');
      expect(res.body).toHaveProperty('refreshToken');
    });

    it('should reject invalid password with 401', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: testEmail, password: 'mauvais_mot_de_passe' })
        .expect(401);
    });

    it('should reject unknown email with 401', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'inconnu@acoria.fr', password: testPassword })
        .expect(401);
    });
  });

  describe('/auth/me (GET)', () => {
    it('should return utilisateur info with a valid token', async () => {
      const loginRes = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: testEmail, password: testPassword });

      const { accessToken } = loginRes.body;

      const res = await request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body).toMatchObject({
        email: testEmail,
        nom: 'Test',
        prenom: 'E2E',
        role: 'THERAPEUTE',
      });
      expect(res.body).not.toHaveProperty('passwordHash');
    });

    it('should reject request without token with 401', async () => {
      await request(app.getHttpServer()).get('/auth/me').expect(401);
    });
  });
});