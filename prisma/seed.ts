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
// Spec plan: 0000001 Users … 0000007 Audit Logs, then paddle 0000008 Courts, 0000009 Bookings, 0000010 Members, 0000011 Reports
const FEATURES: FeatureDef[] = [
  { key: "users", name: "Users", route: "/dashboard/users", icon: "users", sortOrder: 10, isSystem: true },
  { key: "roles", name: "Roles", route: "/dashboard/roles", icon: "shield", sortOrder: 20, isSystem: true },
  { key: "organizations", name: "Organizations", route: "/dashboard/organizations", icon: "building", sortOrder: 30, isSystem: true },
  { key: "features", name: "Features", route: "/dashboard/features", icon: "layout", sortOrder: 40, isSystem: true },
  { key: "locked-records", name: "Locked Records", route: "/dashboard/locked-records", icon: "lock", sortOrder: 50, isSystem: true },
  { key: "external-api-demo", name: "External API Demo", route: "/dashboard/external-api-demo", icon: "plug", sortOrder: 60, isSystem: false },
  { key: "audit-logs", name: "Audit Logs", route: "/dashboard/audit-logs", icon: "scroll", sortOrder: 70, isSystem: true },
  { key: "courts", name: "Courts", route: "/dashboard/courts", icon: "court", sortOrder: 80, isSystem: false },
  { key: "bookings", name: "Bookings", route: "/dashboard/bookings", icon: "calendar", sortOrder: 90, isSystem: false },
  { key: "members", name: "Members", route: "/dashboard/members", icon: "users-round", sortOrder: 100, isSystem: false },
  { key: "reports", name: "Reports", route: "/dashboard/reports", icon: "chart", sortOrder: 110, isSystem: false },
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

async function seedCourts() {
  // Inline import to avoid circular deps; reuses same COURTS definition as seed-courts.ts
  // Keep in sync with prisma/seed-courts.ts
  const { PrismaClient: PC } = await import("@prisma/client");
  void PC;
  const U = (id: string, w = 1200) =>
    `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${w}&q=80`;
  const courts = [
    { code: "alpha", name: "Court Alpha", location: "Kinetic Downtown Hub", type: "INDOOR" as const, surface: "Premium Artificial Turf", pricePerHour: 180000, rating: 4.9, reviews: 128, amenities: ["Cafe","Parking","Showers"], image: U("photo-1622163642998-1ea32b0bbc67", 1200), status: "AVAILABLE" as const, badge: "Premium", sortOrder: 10 },
    { code: "panoramic", name: "Court Panoramic", location: "Kinetic Riverside", type: "OUTDOOR" as const, surface: "Panoramic Glass", pricePerHour: 140000, rating: 4.7, reviews: 86, amenities: ["Parking"], image: U("photo-1595435934249-5df7ed86e1c0", 1200), status: "AVAILABLE" as const, badge: null, sortOrder: 20 },
    { code: "center", name: "Center Court", location: "Kinetic Downtown Hub", type: "INDOOR" as const, surface: "Pro Size Turf", pricePerHour: 220000, rating: 4.9, reviews: 215, amenities: ["Cafe","Parking","Showers","Pro Shop"], image: U("photo-1554068865-24cecd4e34b8", 1200), status: "AVAILABLE" as const, badge: "Pro Size", sortOrder: 30 },
    { code: "east", name: "Court East", location: "Kinetic Riverside", type: "OUTDOOR" as const, surface: "Acrylic Hard Court", pricePerHour: 120000, rating: 4.6, reviews: 54, amenities: ["Parking"], image: U("photo-1517649763962-0c623066013b", 1200), status: "MAINTENANCE" as const, badge: null, sortOrder: 40 },
    { code: "velocity", name: "Velocity Arena", location: "Kinetic Westside", type: "INDOOR" as const, surface: "Textured Acrylic", pricePerHour: 160000, rating: 4.8, reviews: 92, amenities: ["Cafe","Showers"], image: U("photo-1542144582-1ba00456b5e3", 1200), status: "AVAILABLE" as const, badge: null, sortOrder: 50 },
    { code: "skyline", name: "Skyline Courts", location: "Skyline Rooftop", type: "ROOFTOP" as const, surface: "Panoramic Outdoor", pricePerHour: 200000, rating: 4.9, reviews: 178, amenities: ["Cafe","Parking"], image: U("photo-1571008887538-b36bb32f4571", 1200), status: "AVAILABLE" as const, badge: "Rooftop", sortOrder: 60 },
    { code: "beta", name: "Court Beta", location: "Kinetic Downtown Hub", type: "INDOOR" as const, surface: "Artificial Turf", pricePerHour: 150000, rating: 4.7, reviews: 64, amenities: ["Showers","Parking"], image: U("photo-1461896836934-ffe607ba8211", 1200), status: "OCCUPIED" as const, badge: null, sortOrder: 70 },
    { code: "gamma", name: "Court Gamma", location: "Kinetic Westside", type: "COVERED" as const, surface: "Semi-Indoor Turf", pricePerHour: 135000, rating: 4.6, reviews: 41, amenities: ["Cafe"], image: U("photo-1518611012118-696072aa579a", 1200), status: "AVAILABLE" as const, badge: null, sortOrder: 80 },
  ];
  for (const c of courts) {
    await prisma.court.upsert({
      where: { code: c.code },
      update: {
        name: c.name, location: c.location, type: c.type as never, surface: c.surface,
        pricePerHour: c.pricePerHour, rating: c.rating, reviews: c.reviews,
        amenities: c.amenities, image: c.image, status: c.status as never,
        badge: c.badge, sortOrder: c.sortOrder, deletedAt: null,
      },
      create: {
        code: c.code, name: c.name, location: c.location, type: c.type as never, surface: c.surface,
        pricePerHour: c.pricePerHour, rating: c.rating, reviews: c.reviews,
        amenities: c.amenities, image: c.image, status: c.status as never,
        badge: c.badge, sortOrder: c.sortOrder,
      },
    });
  }
  const count = await prisma.court.count({ where: { deletedAt: null } });
  console.log(`[seed] Courts OK: ${count}/8`);
}

async function main() {
  console.log("[seed] Starting...");

  await seedRoles();
  await seedSuperAdmin();
  await seedFeaturesAndPermissions();
  await seedSystemSettings();
  await seedCourts();

  // Verifikasi ringkas
  const seq = await prisma.permissionSequence.findUnique({ where: { id: 1 } });
  const permCount = await prisma.permission.count();
  const courtCount = await prisma.court.count({ where: { deletedAt: null } });
  console.log(`[seed] Done. PermissionSequence nextVal=${seq?.nextVal} | Permission count=${permCount} | Courts=${courtCount}`);
  // Harapan: 11 features * 4 = 44 permissions, nextVal = 12, 8 courts
  if (permCount !== 44) {
    console.warn(`[seed] WARN: expected 44 permissions (11*4), got ${permCount}`);
  }
  if (seq?.nextVal !== 12) {
    console.warn(`[seed] WARN: expected nextVal=12, got ${seq?.nextVal}`);
  }
  if (courtCount !== 8) {
    console.warn(`[seed] WARN: expected 8 courts, got ${courtCount}`);
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
