import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { AuditLog, User } from '../entities';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(AuditLog)
    private readonly auditRepo: Repository<AuditLog>,
    private readonly jwtService: JwtService,
  ) {}

  async login(username: string, password: string, ip?: string) {
    const user = await this.userRepo.findOne({
      where: { username },
      relations: [
        'userRoles',
        'userRoles.role',
        'userRoles.role.rolePermissions',
        'userRoles.role.rolePermissions.permission',
      ],
    });
    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid credentials');
    }
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const roles = (user.userRoles || []).map((ur) => ur.role.code);
    const permissions = new Set<string>();
    for (const ur of user.userRoles || []) {
      for (const rp of ur.role.rolePermissions || []) {
        permissions.add(rp.permission.code);
      }
    }

    const access_token = await this.jwtService.signAsync({
      sub: user.id,
      username: user.username,
    });

    await this.auditRepo.save(
      this.auditRepo.create({
        userId: user.id,
        username: user.username,
        action: 'LOGIN',
        resource: 'auth',
        ipAddress: ip || null,
      }),
    );

    return {
      access_token,
      user: {
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        email: user.email,
        roles,
        permissions: [...permissions],
      },
    };
  }

  async me(userId: number) {
    const user = await this.userRepo.findOne({
      where: { id: userId },
      relations: [
        'userRoles',
        'userRoles.role',
        'userRoles.role.rolePermissions',
        'userRoles.role.rolePermissions.permission',
      ],
    });
    if (!user) throw new UnauthorizedException();
    const roles = (user.userRoles || []).map((ur) => ur.role.code);
    const permissions = new Set<string>();
    for (const ur of user.userRoles || []) {
      for (const rp of ur.role.rolePermissions || []) {
        permissions.add(rp.permission.code);
      }
    }
    return {
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      email: user.email,
      roles,
      permissions: [...permissions],
      isActive: user.isActive,
    };
  }
}
