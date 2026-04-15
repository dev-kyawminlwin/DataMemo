import { Injectable, NotFoundException } from '@nestjs/common';
import type { FinanceTransaction } from '@prisma/client';
import { Prisma } from '@prisma/client';
import type { Request } from 'express';

import type { JwtUser } from '../auth/types';
import { PrismaService } from '../prisma/prisma.service';
import { assertFinanceAccess, assertFinanceWrite } from './finance-access';
import type {
  CreateFinanceTransactionDto,
  FinanceListQuery,
  UpdateFinanceTransactionDto,
} from './finance.dto';

type Row = FinanceTransaction & {
  createdBy: { id: string; email: string; displayName: string | null } | null;
};

@Injectable()
export class FinanceService {
  constructor(private readonly prisma: PrismaService) {}

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
        resourceType: 'finance_transaction',
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

  async getDashboardStats(user: JwtUser) {
    assertFinanceAccess(user.role);

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const transactions = await this.prisma.financeTransaction.findMany({
      select: { amount: true, date: true, category: true },
    });

    let totalIncome = new Prisma.Decimal(0);
    let totalExpense = new Prisma.Decimal(0);
    let todayCashflow = new Prisma.Decimal(0);
    let thisMonthCashflow = new Prisma.Decimal(0);

    const categoryBreakdown: Record<string, Prisma.Decimal> = {};

    for (const t of transactions) {
      if (t.amount.greaterThan(0)) {
        totalIncome = totalIncome.add(t.amount);
      } else {
        totalExpense = totalExpense.add(t.amount.abs());
      }

      if (t.date >= startOfToday) {
        todayCashflow = todayCashflow.add(t.amount);
      }

      if (t.date >= startOfMonth) {
        thisMonthCashflow = thisMonthCashflow.add(t.amount);
      }

      if (!categoryBreakdown[t.category]) {
        categoryBreakdown[t.category] = new Prisma.Decimal(0);
      }
      categoryBreakdown[t.category] = categoryBreakdown[t.category].add(t.amount);
    }

    const netProfit = totalIncome.sub(totalExpense);

    return {
      kpis: {
        totalIncome: totalIncome.toNumber(),
        totalExpense: totalExpense.toNumber(),
        netProfit: netProfit.toNumber(),
        todayCashflow: todayCashflow.toNumber(),
        thisMonthCashflow: thisMonthCashflow.toNumber(),
      },
      categoryBreakdown: Object.fromEntries(
        Object.entries(categoryBreakdown).map(([k, v]) => [k, v.toNumber()])
      )
    };
  }

  async list(user: JwtUser, query: FinanceListQuery) {
    assertFinanceAccess(user.role);
    const { page, pageSize, q, category } = query;
    const search: Prisma.FinanceTransactionWhereInput[] = [];
    if (q?.trim()) {
      const s = q.trim();
      search.push(
        { description: { contains: s, mode: 'insensitive' } },
        { receivedFrom: { contains: s, mode: 'insensitive' } },
        { paidTo: { contains: s, mode: 'insensitive' } },
      );
    }
    const where: Prisma.FinanceTransactionWhereInput = {
      ...(category ? { category } : {}),
      ...(search.length ? { OR: search } : {}),
    };

    const [total, rows] = await this.prisma.$transaction([
      this.prisma.financeTransaction.count({ where }),
      this.prisma.financeTransaction.findMany({
        where,
        orderBy: { date: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          createdBy: {
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

  async getById(user: JwtUser, id: string) {
    assertFinanceAccess(user.role);
    const row = await this.prisma.financeTransaction.findUnique({
      where: { id },
      include: {
        createdBy: {
          select: { id: true, email: true, displayName: true },
        },
      },
    });
    if (!row) throw new NotFoundException('Transaction not found');
    return this.toDetail(row as Row);
  }

  async create(user: JwtUser, body: CreateFinanceTransactionDto, req?: Request) {
    assertFinanceWrite(user.role);
    const created = await this.prisma.financeTransaction.create({
      data: {
        amount: body.amount,
        description: body.description,
        date: new Date(body.date),
        receivedFrom: body.receivedFrom ?? null,
        paidTo: body.paidTo ?? null,
        category: body.category,
        referenceNote: body.referenceNote ?? null,
        createdById: user.id,
      },
      include: {
        createdBy: {
          select: { id: true, email: true, displayName: true },
        },
      },
    });
    await this.audit(
      user,
      'finance_transaction.create',
      created.id,
      { amount: body.amount, category: body.category },
      req,
    );
    return this.toDetail(created as Row);
  }

  async update(
    user: JwtUser,
    id: string,
    body: UpdateFinanceTransactionDto,
    req?: Request,
  ) {
    assertFinanceWrite(user.role);
    const existing = await this.prisma.financeTransaction.findUnique({
      where: { id },
    });
    if (!existing) throw new NotFoundException('Transaction not found');

    const data: Prisma.FinanceTransactionUpdateInput = {};
    if (body.amount !== undefined) data.amount = body.amount;
    if (body.description !== undefined) data.description = body.description;
    if (body.date !== undefined) data.date = new Date(body.date);
    if (body.receivedFrom !== undefined) data.receivedFrom = body.receivedFrom;
    if (body.paidTo !== undefined) data.paidTo = body.paidTo;
    if (body.category !== undefined) data.category = body.category;
    if (body.referenceNote !== undefined) data.referenceNote = body.referenceNote === null ? null : body.referenceNote;

    if (Object.keys(data).length === 0) {
      const row = await this.prisma.financeTransaction.findUnique({
        where: { id },
        include: {
          createdBy: {
            select: { id: true, email: true, displayName: true },
          },
        },
      });
      if (!row) throw new NotFoundException('Transaction not found');
      return this.toDetail(row as Row);
    }

    const updated = await this.prisma.financeTransaction.update({
      where: { id },
      data,
      include: {
        createdBy: {
          select: { id: true, email: true, displayName: true },
        },
      },
    });
    await this.audit(
      user,
      'finance_transaction.update',
      id,
      { fields: Object.keys(body) },
      req,
    );
    return this.toDetail(updated as Row);
  }

  async remove(user: JwtUser, id: string, req?: Request) {
    assertFinanceWrite(user.role);
    const existing = await this.prisma.financeTransaction.findUnique({
      where: { id },
    });
    if (!existing) throw new NotFoundException('Transaction not found');
    await this.prisma.financeTransaction.delete({
      where: { id },
    });
    await this.audit(user, 'finance_transaction.delete', id, {}, req);
    return { ok: true };
  }

  private toListItem(row: Row) {
    return {
      id: row.id,
      amount: row.amount.toNumber(),
      type: row.amount.toNumber() > 0 ? 'income' : 'expense',
      description: row.description,
      date: row.date.toISOString(),
      category: row.category,
      receivedFrom: row.receivedFrom,
      paidTo: row.paidTo,
      createdBy: row.createdBy,
    };
  }

  private toDetail(row: Row) {
    return {
      id: row.id,
      amount: row.amount.toNumber(),
      type: row.amount.toNumber() > 0 ? 'income' : 'expense',
      description: row.description,
      date: row.date.toISOString(),
      receivedFrom: row.receivedFrom,
      paidTo: row.paidTo,
      category: row.category,
      referenceNote: row.referenceNote,
      createdBy: row.createdBy,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }
}
