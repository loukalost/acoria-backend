import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@prisma/client';
import { RolesGuard } from './roles.guard';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: { getAllAndOverride: jest.Mock };

  function createMockContext(role?: Role): ExecutionContext {
    return {
      switchToHttp: () => ({
        getRequest: () => ({ user: role ? { role } : undefined }),
      }),
      getHandler: () => jest.fn(),
      getClass: () => jest.fn(),
    } as unknown as ExecutionContext;
  }

  beforeEach(() => {
    reflector = { getAllAndOverride: jest.fn() };
    guard = new RolesGuard(reflector as unknown as Reflector);
  });

  it('should allow access if no roles are required', () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);

    const context = createMockContext(Role.THERAPEUTE);

    expect(guard.canActivate(context)).toBe(true);
  });

  it('should allow access if user has the required role', () => {
    reflector.getAllAndOverride.mockReturnValue([Role.THERAPEUTE]);

    const context = createMockContext(Role.THERAPEUTE);

    expect(guard.canActivate(context)).toBe(true);
  });

  it('should deny access if user does not have the required role', () => {
    reflector.getAllAndOverride.mockReturnValue([Role.THERAPEUTE]);

    const context = createMockContext(Role.PATIENT);

    expect(guard.canActivate(context)).toBe(false);
  });

  it('should deny access if user is undefined', () => {
    reflector.getAllAndOverride.mockReturnValue([Role.THERAPEUTE]);

    const context = createMockContext(undefined);

    expect(guard.canActivate(context)).toBe(false);
  });
});