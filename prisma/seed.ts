import { PrismaClient } from "@prisma/client";
import * as argon2 from "argon2";

// Spec: starter-kit-spec.md § Data Model / RBAC / Soft Delete
// Idempoten: semua write pakai upsert/update — re-run tidak duplikat.
// Seed order (PermissionSequence): Users 0000001 ... Audit Logs 0000007
// Tiap MenuFeature -> 4 Permission (AM/AD/ED/DD + 7-digit), assign ke SUPER_ADMIN.

const prisma = new PrismaClient();

type FeatureDef = {
  key: string; // for idempotency lookup (route)
  name: string;
  route: string;
  icon: string;
  sortOrder: number;
  isSystem: boolean;
};

// Seed order — jangan diubah tanpa bump PermissionSequence secara eksplisit
const FEATURES: FeatureDef[] = [
  { key: "users", name: "Users", route: "/dashboard/users", icon: "users", sortOrder: 10, isSystem: true },
  { key: "roles", name: "Roles", route: "/dashboard/roles", icon: "shield", sortOrder: 20, isSystem: true },
  { key: "organizations", name: "Organizations", route: "/dashboard/organizations", icon: "building", sortOrder: 30, isSystem: true },
  { key: "features", name: "Features", route: "/dashboard/features", icon: "layout", sortOrder: 40, isSystem: true },
  { key: "locked-records", name: "Locked Records", route: "/dashboard/locked-records", icon: "lock", sortOrder: 50, isSystem: true },
  { key: "external-api-demo", name: "External API Demo", route: "/dashboard/external-api-demo", icon: "plug", sortOrder: 60, isSystem: false },
  { key: "audit-logs", name: "Audit Logs", route: "/dashboard/audit-logs", icon: "scroll", sortOrder: 70, isSystem: true },
];

const PREFIXES = [
  { prefix: "AM", action: "MENU" },
  { prefix: "AD", action: "ADD" },
  { prefix: "ED", action: "EDIT" },
  { prefix: "DD", action: "DELETE" },
] as const;

function padSeq(n: number): string {
  return String(n).padStart(7, "0");
}

async function ensurePermissionSequence(): Promise<number> {
  const row = await prisma.permissionSequence.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1, nextVal: 1 },
  });
  return row.nextVal;
}

async function nextSequence(): Promise<number> {
  // Atomic bump inside update — Prisma translates to UPDATE ... SET nextVal = nextVal + 1 RETURNING
  // Prisma Client does not support increment in upsert directly; use update with increment
  const updated = await prisma.permissionSequence.update({
    where: { id: 1 },
    data: { nextVal: { increment: 1 } },
  });
  // nextVal sudah di-increment; seq yang dipakai adalah previous value
  return updated.nextVal - 1;
}

async function seedRoles() {
  const roles = [
    { name: "SUPER_ADMIN", code: "SUPER_ADMIN", isSystem: true, status: "ACTIVE" as const },
    { name: "ADMIN", code: "ADMIN", isSystem: false, status: "ACTIVE" as const },
    { name: "USER", code: "USER", isSystem: false, status: "ACTIVE" as const },
  ];
  for (const r of roles) {
    await prisma.role.upsert({
      where: { name: r.name },
      update: { code: r.code, status: r.status, deletedAt: null },
      create: { name: r.name, code: r.code, isSystem: r.isSystem, status: r.status },
    });
  }
  console.log("[seed] Roles OK (SUPER_ADMIN/ADMIN/USER)");
}

async function seedSuperAdmin() {
  const username = process.env.SUPER_ADMIN_USERNAME?.trim() || "superadmin";
  const rawPassword = process.env.SUPER_ADMIN_PASSWORD ?? "superadmin";

  // Hash dengan Argon2id (argon2 defaults sudah Argon2id; spec: jangan plaintext)
  const passwordHash = await argon2.hash(rawPassword, { type: argon2.argon2id });

  const user = await prisma.user.upsert({
    where: { username },
    update: {
      passwordHash,
      displayName: "Super Admin",
      status: "ACTIVE",
      isSystem: true,
      deletedAt: null,
    },
    create: {
      username,
      passwordHash,
      displayName: "Super Admin",
      status: "ACTIVE",
      isSystem: true,
    },
  });

  // Assign SUPER_ADMIN role (idempoten)
  const superRole = await prisma.role.findUniqueOrThrow({ where: { name: "SUPER_ADMIN" } });
  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: user.id, roleId: superRole.id } },
    update: {},
    create: { userId: user.id, roleId: superRole.id },
  });

  console.log(`[seed] Superadmin OK (${username} / isSystem)`);
  return user;
}

async function seedFeaturesAndPermissions() {
  // Pastikan sequence ada
  await ensurePermissionSequence();

  const superRole = await prisma.role.findUniqueOrThrow({ where: { name: "SUPER_ADMIN" } });

  for (const def of FEATURES) {
    // Cari feature by route (unique-ish; kita pakai route untuk idempotency sebelum T05 punya code)
    // MenuFeature tidak punya unique route di schema, jadi cari by name+route
    let feature = await prisma.menuFeature.findFirst({
      where: { route: def.route, deletedAt: null },
    });

    let seq: number | null = null;
    let isNew = false;

    if (!feature) {
      // Allocate sequence atomically sebelum create
      seq = await nextSequence();
      const seqStr = padSeq(seq);
      feature = await prisma.menuFeature.create({
        data: {
          name: def.name,
          route: def.route,
          icon: def.icon,
          sortOrder: def.sortOrder,
          isSystem: def.isSystem,
          status: "ACTIVE",
          recordLockEnabled: true,
        },
      });
      isNew = true;
      console.log(`[seed] Feature ${def.name} (${seqStr}) created: ${feature.id}`);
    } else {
      // Update mutable fields, keep existing permissions
      feature = await prisma.menuFeature.update({
        where: { id: feature.id },
        data: {
          name: def.name,
          icon: def.icon,
          sortOrder: def.sortOrder,
          status: "ACTIVE",
          deletedAt: null,
        },
      });
      console.log(`[seed] Feature ${def.name} exists: ${feature.id} — skip seq alloc`);
    }

    // Untuk feature baru: generate 4 Permission
    // Untuk feature existing: pastikan 4 permission ada (re-run safety)
    const seqForPerms = seq ?? (await resolveSeqForExistingFeature(feature.id));

    if (seqForPerms === null) {
      console.warn(`[seed] WARN: could not resolve seq for ${def.name} — skip permission seed`);
      continue;
    }

    const seqStr = padSeq(seqForPerms);

    for (const { prefix, action } of PREFIXES) {
      const code = `${prefix}${seqStr}`;
      const perm = await prisma.permission.upsert({
        where: { code },
        update: { action, featureId: feature.id },
        create: { code, action, featureId: feature.id },
      });
      // Assign ke SUPER_ADMIN (idempoten)
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: superRole.id, permissionId: perm.id } },
        update: {},
        create: { roleId: superRole.id, permissionId: perm.id },
      });
    }

    if (isNew) {
      console.log(`[seed] Permissions ${seqStr} (AM/AD/ED/DD) -> SUPER_ADMIN OK`);
    }
  }
}

async function resolveSeqForExistingFeature(featureId: string): Promise<number | null> {
  // Resolve seq dari salah satu Permission yang sudah ada untuk feature ini
  const perm = await prisma.permission.findFirst({
    where: { featureId },
    orderBy: { code: "asc" },
  });
  if (!perm) return null;
  // code = AM0000001 -> seq = 1
  const seqStr = perm.code.slice(2);
  const n = parseInt(seqStr, 10);
  return Number.isNaN(n) ? null : n;
}

async function seedSystemSettings() {
  const defaults: Array<{ key: string; value: unknown }> = [
    { key: "recordLockEnabled", value: true },
    { key: "recordLockTtlSeconds", value: 120 },
    { key: "recordLockHeartbeatSeconds", value: 30 },
  ];
  for (const { key, value } of defaults) {
    await prisma.systemSetting.upsert({
      where: { key },
      update: { value: value as never },
      create: { key, value: value as never },
    });
  }
  console.log("[seed] SystemSetting OK");
}

async function main() {
  console.log("[seed] Starting...");

  await seedRoles();
  await seedSuperAdmin();
  await seedFeaturesAndPermissions();
  await seedSystemSettings();

  // Verifikasi ringkas
  const seq = await prisma.permissionSequence.findUnique({ where: { id: 1 } });
  const permCount = await prisma.permission.count();
  console.log(`[seed] Done. PermissionSequence nextVal=${seq?.nextVal} | Permission count=${permCount}`);
  // Harapan: 7 features * 4 = 28 permissions, nextVal = 8
  if (permCount !== 28) {
    console.warn(`[seed] WARN: expected 28 permissions (7*4), got ${permCount}`);
  }
  if (seq?.nextVal !== 8) {
    console.warn(`[seed] WARN: expected nextVal=8, got ${seq?.nextVal}`);
  }
}

main()
  .catch((e) => {
    console.error("[seed] Failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
