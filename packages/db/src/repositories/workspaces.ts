import { and, eq } from 'drizzle-orm';
import type { Db } from '../client';
import {
  workspaces,
  workspaceMembers,
  type WorkspaceRow,
  type NewWorkspaceRow,
} from '../schema/workspaces';
import type { WorkspaceRole } from '../types';

export class WorkspacesRepository {
  constructor(private readonly db: Db) {}

  async findById(id: string): Promise<WorkspaceRow | null> {
    const rows = await this.db.select().from(workspaces).where(eq(workspaces.id, id)).limit(1);
    return rows[0] ?? null;
  }

  async findForUser(userId: string): Promise<WorkspaceRow | null> {
    const rows = await this.db
      .select({ workspace: workspaces })
      .from(workspaceMembers)
      .innerJoin(workspaces, eq(workspaceMembers.workspaceId, workspaces.id))
      .where(eq(workspaceMembers.userId, userId))
      .limit(1);
    return rows[0]?.workspace ?? null;
  }

  async create(input: NewWorkspaceRow): Promise<WorkspaceRow> {
    const [row] = await this.db.insert(workspaces).values(input).returning();
    if (!row) throw new Error('[@hal/db] failed to insert workspace');
    return row;
  }

  async addMember(input: {
    workspaceId: string;
    userId: string;
    role: WorkspaceRole;
  }): Promise<void> {
    await this.db.insert(workspaceMembers).values(input);
  }

  async isMember(workspaceId: string, userId: string): Promise<boolean> {
    const rows = await this.db
      .select({ id: workspaceMembers.id })
      .from(workspaceMembers)
      .where(
        and(eq(workspaceMembers.workspaceId, workspaceId), eq(workspaceMembers.userId, userId)),
      )
      .limit(1);
    return rows.length > 0;
  }

  async createPersonal(input: {
    userId: string;
    name: string;
    dekWrapped: Uint8Array;
    dekKmsKeyId: string;
  }): Promise<WorkspaceRow> {
    return this.db.transaction(async (tx) => {
      const [ws] = await tx
        .insert(workspaces)
        .values({
          name: input.name,
          plan: 'personal',
          dekWrapped: input.dekWrapped,
          dekKmsKeyId: input.dekKmsKeyId,
        })
        .returning();
      if (!ws) throw new Error('[@hal/db] failed to insert workspace');
      await tx.insert(workspaceMembers).values({
        workspaceId: ws.id,
        userId: input.userId,
        role: 'owner',
      });
      return ws;
    });
  }
}
