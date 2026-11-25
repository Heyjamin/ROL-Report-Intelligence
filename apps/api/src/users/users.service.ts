import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { AuditLog, Role, User, UserRole } from '../entities';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(Role) private readonly roleRepo: Repository<Role>,
    @InjectRepository(UserRole) private readonly urRepo: Repository<UserRole>,
    @InjectRepository(AuditLog)
    private readonly auditRepo: Repository<AuditLog>,
  ) {}

  private serialize(user: User) {
    return {
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      email: user.email,
      isActive: user.isActive,
      roles: (user.userRoles || []).map((ur) => ur.role.code),
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  async findAll() {
    const users = await this.userRepo.find({
      relations: ['userRoles', 'userRoles.role'],
      order: { id: 'ASC' },
    });
    return users.map((u) => this.serialize(u));
  }

  async findOne(id: number) {
    const user = await this.userRepo.findOne({
      where: { id },
      relations: ['userRoles', 'userRoles.role'],
    });
    if (!user) throw new NotFoundException('User not found');
    return this.serialize(user);
  }

  async create(dto: CreateUserDto, actor?: { id: number; username: string }) {
    const existing = await this.userRepo.findOne({
      where: { username: dto.username },
    });
    if (existing) throw new ConflictException('Username already exists');

    const user = await this.userRepo.save(
      this.userRepo.create({
        username: dto.username,
        passwordHash: await bcrypt.hash(dto.password, 10),
        displayName: dto.displayName || null,
        email: dto.email || null,
        isActive: dto.isActive !== false,
      }),
    );

    if (dto.roleCodes?.length) {
      await this.assignRoles(user, dto.roleCodes);
    }

    await this.auditRepo.save(
      this.auditRepo.create({
        userId: actor?.id ?? null,
        username: actor?.username ?? null,
        action: 'CREATE',
        resource: 'users',
        resourceId: String(user.id),
        details: JSON.stringify({ username: user.username }),
      }),
    );

    return this.findOne(user.id);
  }

  async update(
    id: number,
    dto: UpdateUserDto,
    actor?: { id: number; username: string },
  ) {
    const user = await this.userRepo.findOne({ where: { id } });
    if (!user) throw new NotFoundException('User not found');

    if (dto.password) {
      user.passwordHash = await bcrypt.hash(dto.password, 10);
    }
    if (dto.displayName !== undefined) user.displayName = dto.displayName;
    if (dto.email !== undefined) user.email = dto.email;
    if (dto.isActive !== undefined) user.isActive = dto.isActive;
    await this.userRepo.save(user);

    if (dto.roleCodes) {
      await this.urRepo.delete({ user: { id: user.id } });
      await this.assignRoles(user, dto.roleCodes);
    }

    await this.auditRepo.save(
      this.auditRepo.create({
        userId: actor?.id ?? null,
        username: actor?.username ?? null,
        action: 'UPDATE',
        resource: 'users',
        resourceId: String(id),
      }),
    );

    return this.findOne(id);
  }

  async remove(id: number, actor?: { id: number; username: string }) {
    const user = await this.userRepo.findOne({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
    await this.userRepo.remove(user);
    await this.auditRepo.save(
      this.auditRepo.create({
        userId: actor?.id ?? null,
        username: actor?.username ?? null,
        action: 'DELETE',
        resource: 'users',
        resourceId: String(id),
      }),
    );
    return { deleted: true };
  }

  private async assignRoles(user: User, roleCodes: string[]) {
    const roles = await this.roleRepo.find({
      where: { code: In(roleCodes) },
    });
    for (const role of roles) {
      await this.urRepo.save(this.urRepo.create({ user, role }));
    }
  }
}
