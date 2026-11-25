import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities';

export type JwtPayload = {
  sub: number;
  username: string;
};

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'change-me-in-production',
    });
  }

  async validate(payload: JwtPayload) {
    const user = await this.userRepo.findOne({
      where: { id: payload.sub },
      relations: [
        'userRoles',
        'userRoles.role',
        'userRoles.role.rolePermissions',
        'userRoles.role.rolePermissions.permission',
      ],
    });
    if (!user || !user.isActive) {
      throw new UnauthorizedException();
    }
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
    };
  }
}
