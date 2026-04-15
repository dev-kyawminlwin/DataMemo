import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { FacebookAsset, Prisma } from '@prisma/client';
import type { Request } from 'express';

import type { JwtUser } from '../auth/types';
import { CredentialsCryptoService } from '../credentials/credentials-crypto.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  assertFacebookRead,
  assertFacebookWrite,
  canRevealFacebookPassword,
} from './facebook-access';
import type {
  CreateFacebookAssetDto,
  FacebookListQuery,
  UpdateFacebookAssetDto,
} from './facebook-assets.dto';

type Row = FacebookAsset & {
  assignedTo: { id: string; email: string; displayName: string | null } | null;
};

@Injectable()
export class FacebookAssetsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly crypto: CredentialsCryptoService,
  ) {}

  private async audit(
    actor: JwtUser,
    action: string,
    resourceId: string,
    metadata?: Record<string, unknown>,
    req?: Request,
  ) {
    await this.prisma.auditLog.create({
      data: {
        actorUserId: actor.id,
        action,
        resourceType: 'facebook_asset',
        resourceId,
        metadata: metadata as Prisma.InputJsonValue | undefined,
        ip: req?.ip ?? undefined,
        userAgent:
          typeof req?.headers?.['user-agent'] === 'string'
            ? req.headers['user-agent']
            : undefined,
      },
    });
  }

  private accessWhere(user: JwtUser): Prisma.FacebookAssetWhereInput {
    if (user.role === 'staff') {
      return { assignedToUserId: user.id };
    }
    return {};
  }

  async list(user: JwtUser, query: FacebookListQuery) {
    assertFacebookRead(user.role);
    const { page, pageSize, q, category, assetType, status } = query;
    const access = this.accessWhere(user);
    const search: Prisma.FacebookAssetWhereInput[] = [];
    if (q?.trim()) {
      const s = q.trim();
      search.push(
        { name: { contains: s, mode: 'insensitive' } },
        { loginEmail: { contains: s, mode: 'insensitive' } },
      );
    }
    const where: Prisma.FacebookAssetWhereInput = {
      deletedAt: null,
      ...access,
      ...(category ? { category } : {}),
      ...(assetType ? { assetType } : {}),
      ...(status ? { status } : {}),
      ...(search.length ? { OR: search } : {}),
    };

    const [total, rows] = await this.prisma.$transaction([
      this.prisma.facebookAsset.count({ where }),
      this.prisma.facebookAsset.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          assignedTo: {
            select: { id: true, email: true, displayName: true },
          },
        },
      }),
    ]);

    return {
      total,
      page,
      pageSize,
      items: rows.map((r) => this.toListItem(r as Row)),
    };
  }

  async getById(user: JwtUser, id: string, revealPassword: boolean) {
    assertFacebookRead(user.role);
    const row = await this.prisma.facebookAsset.findFirst({
      where: { id, deletedAt: null, ...this.accessWhere(user) },
      include: {
        assignedTo: {
          select: { id: true, email: true, displayName: true },
        },
      },
    });
    if (!row) throw new NotFoundException('Facebook asset not found');

    if (revealPassword && !canRevealFacebookPassword(user.role)) {
      throw new ForbiddenException('Cannot reveal passwords for your role');
    }

    const showPlain =
      revealPassword && canRevealFacebookPassword(user.role);

    return this.toDetail(row as Row, showPlain);
  }

  async create(
    user: JwtUser,
    body: CreateFacebookAssetDto,
    req?: Request,
  ) {
    assertFacebookWrite(user.role);
    const cipher = this.crypto.encrypt(body.password);
    const created = await this.prisma.facebookAsset.create({
      data: {
        name: body.name,
        category: body.category,
        assetType: body.assetType,
        loginEmail: body.loginEmail,
        passwordCipher: cipher,
        twoFaRecoveryInfo: body.twoFaRecoveryInfo ?? null,
        assignedToUserId: body.assignedToUserId ?? null,
        status: body.status,
        spendLimit:
          body.spendLimit === undefined || body.spendLimit === null
            ? null
            : body.spendLimit,
        notes: body.notes ?? null,
      },
      include: {
        assignedTo: {
          select: { id: true, email: true, displayName: true },
        },
      },
    });
    await this.audit(
      user,
      'facebook_asset.create',
      created.id,
      { name: created.name },
      req,
    );
    return this.toDetail(created as Row, false);
  }

  async update(
    user: JwtUser,
    id: string,
    body: UpdateFacebookAssetDto,
    req?: Request,
  ) {
    assertFacebookWrite(user.role);
    const existing = await this.prisma.facebookAsset.findFirst({
      where: { id, deletedAt: null },
    });
    if (!existing) throw new NotFoundException('Facebook asset not found');

    const data: Prisma.FacebookAssetUpdateInput = {};
    if (body.name !== undefined) data.name = body.name;
    if (body.category !== undefined) data.category = body.category;
    if (body.assetType !== undefined) data.assetType = body.assetType;
    if (body.loginEmail !== undefined) data.loginEmail = body.loginEmail;
    if (body.password !== undefined) {
      data.passwordCipher = this.crypto.encrypt(body.password);
    }
    if (body.twoFaRecoveryInfo !== undefined) {
      data.twoFaRecoveryInfo = body.twoFaRecoveryInfo;
    }
    if (body.assignedToUserId !== undefined) {
      data.assignedTo = body.assignedToUserId
        ? { connect: { id: body.assignedToUserId } }
        : { disconnect: true };
    }
    if (body.status !== undefined) data.status = body.status;
    if (body.spendLimit !== undefined) {
      data.spendLimit =
        body.spendLimit === null ? null : body.spendLimit;
    }
    if (body.notes !== undefined) data.notes = body.notes;

    if (Object.keys(data).length === 0) {
      const row = await this.prisma.facebookAsset.findFirst({
        where: { id, deletedAt: null },
        include: {
          assignedTo: {
            select: { id: true, email: true, displayName: true },
          },
        },
      });
      if (!row) throw new NotFoundException('Facebook asset not found');
      return this.toDetail(row as Row, false);
    }

    const updated = await this.prisma.facebookAsset.update({
      where: { id },
      data,
      include: {
        assignedTo: {
          select: { id: true, email: true, displayName: true },
        },
      },
    });
    await this.audit(
      user,
      'facebook_asset.update',
      id,
      { fields: Object.keys(body) },
      req,
    );
    return this.toDetail(updated as Row, false);
  }

  async remove(user: JwtUser, id: string, req?: Request) {
    assertFacebookWrite(user.role);
    const existing = await this.prisma.facebookAsset.findFirst({
      where: { id, deletedAt: null },
    });
    if (!existing) throw new NotFoundException('Facebook asset not found');
    await this.prisma.facebookAsset.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    await this.audit(user, 'facebook_asset.delete', id, {}, req);
    return { ok: true };
  }

  private toListItem(row: Row) {
    return {
      id: row.id,
      name: row.name,
      category: row.category,
      assetType: row.assetType,
      loginEmail: row.loginEmail,
      passwordMasked: '••••••••',
      status: row.status,
      spendLimit: row.spendLimit?.toString() ?? null,
      assignedTo: row.assignedTo,
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private toDetail(row: Row, revealPlain: boolean) {
    let passwordField: string;
    if (revealPlain) {
      try {
        passwordField = this.crypto.decrypt(row.passwordCipher);
      } catch {
        passwordField = '••••••••';
      }
    } else {
      passwordField = '••••••••';
    }
    return {
      id: row.id,
      name: row.name,
      category: row.category,
      assetType: row.assetType,
      loginEmail: row.loginEmail,
      password: passwordField,
      twoFaRecoveryInfo: row.twoFaRecoveryInfo,
      status: row.status,
      spendLimit: row.spendLimit?.toString() ?? null,
      notes: row.notes,
      assignedTo: row.assignedTo,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }
}
