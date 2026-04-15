import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { SupportToolAccount, Prisma } from '@prisma/client';
import type { Request } from 'express';

import type { JwtUser } from '../auth/types';
import { CredentialsCryptoService } from '../credentials/credentials-crypto.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  assertSupportRead,
  assertSupportWrite,
  canRevealSupportPassword,
} from './support-access';
import type {
  CreateSupportAccountDto,
  SupportListQuery,
  UpdateSupportAccountDto,
} from './support.dto';

type Row = SupportToolAccount;

@Injectable()
export class SupportService {
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
        resourceType: 'support_tool_account',
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

  async list(user: JwtUser, query: SupportListQuery) {
    assertSupportRead(user.role);
    const { page, pageSize, q, platformType } = query;
    const search: Prisma.SupportToolAccountWhereInput[] = [];
    if (q?.trim()) {
      const s = q.trim();
      search.push({ companyName: { contains: s, mode: 'insensitive' } });
    }
    const where: Prisma.SupportToolAccountWhereInput = {
      ...(platformType ? { platformType } : {}),
      ...(search.length ? { OR: search } : {}),
    };

    const [total, rows] = await this.prisma.$transaction([
      this.prisma.supportToolAccount.count({ where }),
      this.prisma.supportToolAccount.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
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
    assertSupportRead(user.role);
    const row = await this.prisma.supportToolAccount.findUnique({
      where: { id },
    });
    if (!row) throw new NotFoundException('Support tool account not found');

    if (revealPassword && !canRevealSupportPassword(user.role)) {
      throw new ForbiddenException('Cannot reveal passwords for your role');
    }

    const showPlain = revealPassword && canRevealSupportPassword(user.role);

    // Also update last Accessed At if a user actually retrieves details
    await this.prisma.supportToolAccount.update({
      where: { id },
      data: { lastAccessedAt: new Date() },
    });

    return this.toDetail(row as Row, showPlain);
  }

  async create(user: JwtUser, body: CreateSupportAccountDto, req?: Request) {
    assertSupportWrite(user.role);
    
    const encryptOrNull = (pw?: string | null) => pw ? this.crypto.encrypt(pw) : null;

    const created = await this.prisma.supportToolAccount.create({
      data: {
        companyName: body.companyName,
        platformType: body.platformType,
        adminAccount: body.adminAccount ?? null,
        adminPassword: encryptOrNull(body.adminPassword),
        adminNickname: body.adminNickname ?? null,
        csAccount: body.csAccount ?? null,
        csPassword: encryptOrNull(body.csPassword),
        csNickname: body.csNickname ?? null,
        financeAccount: body.financeAccount ?? null,
        financePassword: encryptOrNull(body.financePassword),
        financeNickname: body.financeNickname ?? null,
        notes: body.notes ?? null,
      },
    });
    await this.audit(
      user,
      'support_tool.create',
      created.id,
      { companyName: created.companyName },
      req,
    );
    return this.toDetail(created as Row, false);
  }

  async update(
    user: JwtUser,
    id: string,
    body: UpdateSupportAccountDto,
    req?: Request,
  ) {
    assertSupportWrite(user.role);
    const existing = await this.prisma.supportToolAccount.findUnique({
      where: { id },
    });
    if (!existing) throw new NotFoundException('Support tool account not found');

    const data: Prisma.SupportToolAccountUpdateInput = {};
    if (body.companyName !== undefined) data.companyName = body.companyName;
    if (body.platformType !== undefined) data.platformType = body.platformType;
    
    if (body.adminAccount !== undefined) data.adminAccount = body.adminAccount === null ? null : body.adminAccount;
    if (body.adminPassword !== undefined) data.adminPassword = body.adminPassword ? this.crypto.encrypt(body.adminPassword) : null;
    if (body.adminNickname !== undefined) data.adminNickname = body.adminNickname === null ? null : body.adminNickname;

    if (body.csAccount !== undefined) data.csAccount = body.csAccount === null ? null : body.csAccount;
    if (body.csPassword !== undefined) data.csPassword = body.csPassword ? this.crypto.encrypt(body.csPassword) : null;
    if (body.csNickname !== undefined) data.csNickname = body.csNickname === null ? null : body.csNickname;

    if (body.financeAccount !== undefined) data.financeAccount = body.financeAccount === null ? null : body.financeAccount;
    if (body.financePassword !== undefined) data.financePassword = body.financePassword ? this.crypto.encrypt(body.financePassword) : null;
    if (body.financeNickname !== undefined) data.financeNickname = body.financeNickname === null ? null : body.financeNickname;

    if (body.notes !== undefined) data.notes = body.notes === null ? null : body.notes;

    if (Object.keys(data).length === 0) {
      return this.toDetail(existing as Row, false);
    }

    const updated = await this.prisma.supportToolAccount.update({
      where: { id },
      data,
    });
    await this.audit(
      user,
      'support_tool.update',
      id,
      { fields: Object.keys(body) },
      req,
    );
    return this.toDetail(updated as Row, false);
  }

  async remove(user: JwtUser, id: string, req?: Request) {
    assertSupportWrite(user.role);
    const existing = await this.prisma.supportToolAccount.findUnique({
      where: { id },
    });
    if (!existing) throw new NotFoundException('Support tool account not found');
    await this.prisma.supportToolAccount.delete({
      where: { id },
    });
    await this.audit(user, 'support_tool.delete', id, {}, req);
    return { ok: true };
  }

  private toListItem(row: Row) {
    return {
      id: row.id,
      companyName: row.companyName,
      platformType: row.platformType,
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private toDetail(row: Row, revealPlain: boolean) {
    const decryptOrMask = (cipher?: string | null) => {
      if (!cipher) return null;
      if (revealPlain) {
        try {
          return this.crypto.decrypt(cipher);
        } catch {
          return '••••••••';
        }
      }
      return '••••••••';
    };

    return {
      id: row.id,
      companyName: row.companyName,
      platformType: row.platformType,
      adminAccount: row.adminAccount,
      adminPassword: decryptOrMask(row.adminPassword),
      adminNickname: row.adminNickname,
      csAccount: row.csAccount,
      csPassword: decryptOrMask(row.csPassword),
      csNickname: row.csNickname,
      financeAccount: row.financeAccount,
      financePassword: decryptOrMask(row.financePassword),
      financeNickname: row.financeNickname,
      notes: row.notes,
      lastAccessedAt: row.lastAccessedAt?.toISOString() ?? null,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }
}
