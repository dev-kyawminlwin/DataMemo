import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { TikTokAsset, Prisma } from '@prisma/client';
import type { Request } from 'express';

import type { JwtUser } from '../auth/types';
import { CredentialsCryptoService } from '../credentials/credentials-crypto.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  assertTikTokRead,
  assertTikTokWrite,
  canRevealTikTokPassword,
} from './tiktok-access';
import type {
  CreateTikTokAssetDto,
  TikTokListQuery,
  UpdateTikTokAssetDto,
} from './tiktok-assets.dto';

type Row = TikTokAsset & {
  assignedTo: { id: string; email: string; displayName: string | null } | null;
};

@Injectable()
export class TikTokAssetsService {
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
        resourceType: 'tiktok_asset',
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

  private accessWhere(user: JwtUser): Prisma.TikTokAssetWhereInput {
    if (user.role === 'staff') {
      return { assignedToUserId: user.id };
    }
    return {};
  }

  async list(user: JwtUser, query: TikTokListQuery) {
    assertTikTokRead(user.role);
    const { page, pageSize, q, category, assetType, status } = query;
    const access = this.accessWhere(user);
    const search: Prisma.TikTokAssetWhereInput[] = [];
    if (q?.trim()) {
      const s = q.trim();
      search.push(
        { name: { contains: s, mode: 'insensitive' } },
        { loginEmail: { contains: s, mode: 'insensitive' } },
      );
    }
    const where: Prisma.TikTokAssetWhereInput = {
      deletedAt: null,
      ...access,
      ...(category ? { category } : {}),
      ...(assetType ? { assetType } : {}),
      ...(status ? { status } : {}),
      ...(search.length ? { OR: search } : {}),
    };

    const [total, rows] = await this.prisma.$transaction([
      this.prisma.tikTokAsset.count({ where }),
      this.prisma.tikTokAsset.findMany({
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
    assertTikTokRead(user.role);
    const row = await this.prisma.tikTokAsset.findFirst({
      where: { id, deletedAt: null, ...this.accessWhere(user) },
      include: {
        assignedTo: {
          select: { id: true, email: true, displayName: true },
        },
      },
    });
    if (!row) throw new NotFoundException('TikTok asset not found');

    if (revealPassword && !canRevealTikTokPassword(user.role)) {
      throw new ForbiddenException('Cannot reveal passwords for your role');
    }

    const showPlain = revealPassword && canRevealTikTokPassword(user.role);

    return this.toDetail(row as Row, showPlain);
  }

  async create(user: JwtUser, body: CreateTikTokAssetDto, req?: Request) {
    assertTikTokWrite(user.role);
    const cipher = this.crypto.encrypt(body.password);
    const created = await this.prisma.tikTokAsset.create({
      data: {
        name: body.name,
        category: body.category,
        assetType: body.assetType,
        loginEmail: body.loginEmail,
        passwordCipher: cipher,
        assignedToUserId: body.assignedToUserId ?? null,
        status: body.status,
        spendLimit:
          body.spendLimit === undefined || body.spendLimit === null
            ? null
            : body.spendLimit,
        pixelId: body.pixelId ?? null,
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
      'tiktok_asset.create',
      created.id,
      { name: created.name },
      req,
    );
    return this.toDetail(created as Row, false);
  }

  async update(
    user: JwtUser,
    id: string,
    body: UpdateTikTokAssetDto,
    req?: Request,
  ) {
    assertTikTokWrite(user.role);
    const existing = await this.prisma.tikTokAsset.findFirst({
      where: { id, deletedAt: null },
    });
    if (!existing) throw new NotFoundException('TikTok asset not found');

    const data: Prisma.TikTokAssetUpdateInput = {};
    if (body.name !== undefined) data.name = body.name;
    if (body.category !== undefined) data.category = body.category;
    if (body.assetType !== undefined) data.assetType = body.assetType;
    if (body.loginEmail !== undefined) data.loginEmail = body.loginEmail;
    if (body.password !== undefined) {
      data.passwordCipher = this.crypto.encrypt(body.password);
    }
    if (body.assignedToUserId !== undefined) {
      data.assignedTo = body.assignedToUserId
        ? { connect: { id: body.assignedToUserId } }
        : { disconnect: true };
    }
    if (body.status !== undefined) data.status = body.status;
    if (body.spendLimit !== undefined) {
      data.spendLimit = body.spendLimit === null ? null : body.spendLimit;
    }
    if (body.pixelId !== undefined) {
      data.pixelId = body.pixelId === null ? null : body.pixelId;
    }
    if (body.notes !== undefined) data.notes = body.notes;

    if (Object.keys(data).length === 0) {
      const row = await this.prisma.tikTokAsset.findFirst({
        where: { id, deletedAt: null },
        include: {
          assignedTo: {
            select: { id: true, email: true, displayName: true },
          },
        },
      });
      if (!row) throw new NotFoundException('TikTok asset not found');
      return this.toDetail(row as Row, false);
    }

    const updated = await this.prisma.tikTokAsset.update({
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
      'tiktok_asset.update',
      id,
      { fields: Object.keys(body) },
      req,
    );
    return this.toDetail(updated as Row, false);
  }

  async remove(user: JwtUser, id: string, req?: Request) {
    assertTikTokWrite(user.role);
    const existing = await this.prisma.tikTokAsset.findFirst({
      where: { id, deletedAt: null },
    });
    if (!existing) throw new NotFoundException('TikTok asset not found');
    await this.prisma.tikTokAsset.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    await this.audit(user, 'tiktok_asset.delete', id, {}, req);
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
      pixelId: row.pixelId ?? null,
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
      status: row.status,
      spendLimit: row.spendLimit?.toString() ?? null,
      pixelId: row.pixelId ?? null,
      notes: row.notes,
      assignedTo: row.assignedTo,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }
}
