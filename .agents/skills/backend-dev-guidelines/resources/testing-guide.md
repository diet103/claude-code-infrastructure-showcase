# Testing Guide - Backend Testing Strategies

Complete guide to testing backend services with Jest and best practices.

## Table of Contents

- [Unit Testing](#unit-testing)
- [Integration Testing](#integration-testing)
- [Mocking Strategies](#mocking-strategies)
- [Test Data Management](#test-data-management)
- [Testing Authenticated Routes](#testing-authenticated-routes)
- [Coverage Targets](#coverage-targets)

---

## Unit Testing

### Test Structure

```typescript
// services/userService.test.ts
import { UserService } from './userService';
import { UserRepository } from '../repositories/UserRepository';

jest.mock('../repositories/UserRepository');

describe('UserService', () => {
    let service: UserService;
    let mockRepository: jest.Mocked<UserRepository>;

    beforeEach(() => {
        mockRepository = {
            findByEmail: jest.fn(),
            create: jest.fn(),
        } as any;

        service = new UserService();
        (service as any).userRepository = mockRepository;
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('create', () => {
        it('should throw error if email exists', async () => {
            mockRepository.findByEmail.mockResolvedValue({ id: '123' } as any);

            await expect(
                service.create({ email: 'test@test.com' })
            ).rejects.toThrow('Email already in use');
        });

        it('should create user if email is unique', async () => {
            mockRepository.findByEmail.mockResolvedValue(null);
            mockRepository.create.mockResolvedValue({ id: '123' } as any);

            const user = await service.create({
                email: 'test@test.com',
                firstName: 'John',
                lastName: 'Doe',
            });

            expect(user).toBeDefined();
            expect(mockRepository.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    email: 'test@test.com'
                })
            );
        });
    });
});
```

---

## Integration Testing

### Test with Real Database

```typescript
import { PrismaService } from '@myapp/database';

describe('UserService Integration', () => {
    let testUser: any;

    beforeAll(async () => {
        // Create test data
        testUser = await PrismaService.main.user.create({
            data: {
                email: 'test@test.com',
                profile: { create: { firstName: 'Test', lastName: 'User' } },
            },
        });
    });

    afterAll(async () => {
        // Cleanup
        await PrismaService.main.user.delete({ where: { id: testUser.id } });
    });

    it('should find user by email', async () => {
        const user = await userService.findByEmail('test@test.com');
        expect(user).toBeDefined();
        expect(user?.email).toBe('test@test.com');
    });
});
```

---

## Mocking Strategies

### Mock PrismaService

```typescript
jest.mock('@myapp/database', () => ({
    PrismaService: {
        main: {
            user: {
                findMany: jest.fn(),
                findUnique: jest.fn(),
                create: jest.fn(),
                update: jest.fn(),
            },
        },
        isAvailable: true,
    },
}));
```

### Mock Services

```typescript
const mockUserService = {
    findById: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
} as jest.Mocked<UserService>;
```

---

## Test Data Management

### Setup and Teardown

```typescript
describe('PermissionService', () => {
    let instanceId: number;

    beforeAll(async () => {
        // Create test post
        const post = await PrismaService.main.post.create({
            data: { title: 'Test Post', content: 'Test', authorId: 'test-user' },
        });
        instanceId = post.id;
    });

    afterAll(async () => {
        // Cleanup
        await PrismaService.main.post.delete({
            where: { id: instanceId },
        });
    });

    beforeEach(() => {
        // Clear caches
        permissionService.clearCache();
    });

    it('should check permissions', async () => {
        const hasPermission = await permissionService.checkPermission(
            'user-id',
            instanceId,
            'VIEW_WORKFLOW'
        );
        expect(hasPermission).toBeDefined();
    });
});
```

---

## Testing Authenticated Routes

### Using cURL or a Test Script

```bash
# Test authenticated endpoint with a token
curl -H "Authorization: Bearer $TOKEN" http://localhost:3000/api/users

# Test with POST data
curl -X POST -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com"}' \
  http://localhost:3000/api/users
```

### Mock Authentication in Tests

```typescript
// Mock auth middleware
jest.mock('../middleware/authMiddleware', () => ({
    authMiddleware: (req, res, next) => {
        res.locals.user = {
            id: 'test-user-id',
            username: 'testuser',
        };
        next();
    },
}));
```

---

## Coverage Targets

### Recommended Coverage

- **Unit Tests**: 70%+ coverage
- **Integration Tests**: Critical paths covered
- **E2E Tests**: Happy paths covered

### Run Coverage

```bash
npm test -- --coverage
```

---

**Related Files:**
- [SKILL.md](SKILL.md)
- [services-and-repositories.md](services-and-repositories.md)
- [complete-examples.md](complete-examples.md)
