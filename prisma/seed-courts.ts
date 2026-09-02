import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Port of uidesign/src/js/data/courts.js — 8 courts
// code = id from uidesign; sortOrder mirrors array index
const U = (id: string, w = 1200) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${w}&q=80`;

type CourtSeed = {
  code: string;
  name: string;
  location: string;
  type: "INDOOR" | "OUTDOOR" | "ROOFTOP" | "COVERED";
  surface: string;
  pricePerHour: number;
  rating: number;
  reviews: number;
  amenities: string[];
  image: string;
  status: "AVAILABLE" | "MAINTENANCE" | "OCCUPIED";
  badge: string | null;
  sortOrder: number;
};

const COURTS: CourtSeed[] = [
  {
    code: "alpha",
    name: "Court Alpha",
    location: "Kinetic Downtown Hub",
    type: "INDOOR",
    surface: "Premium Artificial Turf",
    pricePerHour: 180000,
    rating: 4.9, reviews: 128,
    amenities: ["Cafe","Parking","Showers"],
    image: U("photo-1622163642998-1ea32b0bbc67", 1200),
    status: "AVAILABLE",
    badge: "Premium",
    sortOrder: 10,
  },
  {
    code: "panoramic",
    name: "Court Panoramic",
    location: "Kinetic Riverside",
    type: "OUTDOOR",
    surface: "Panoramic Glass",
    pricePerHour: 140000,
    rating: 4.7, reviews: 86,
    amenities: ["Parking"],
    image: U("photo-1595435934249-5df7ed86e1c0", 1200),
    status: "AVAILABLE",
    badge: null,
    sortOrder: 20,
  },
  {
    code: "center",
    name: "Center Court",
    location: "Kinetic Downtown Hub",
    type: "INDOOR",
    surface: "Pro Size Turf",
    pricePerHour: 220000,
    rating: 4.9, reviews: 215,
    amenities: ["Cafe","Parking","Showers","Pro Shop"],
    image: U("photo-1554068865-24cecd4e34b8", 1200),
    status: "AVAILABLE",
    badge: "Pro Size",
    sortOrder: 30,
  },
  {
    code: "east",
    name: "Court East",
    location: "Kinetic Riverside",
    type: "OUTDOOR",
    surface: "Acrylic Hard Court",
    pricePerHour: 120000,
    rating: 4.6, reviews: 54,
    amenities: ["Parking"],
    image: U("photo-1517649763962-0c623066013b", 1200),
    status: "MAINTENANCE",
    badge: null,
    sortOrder: 40,
  },
  {
    code: "velocity",
    name: "Velocity Arena",
    location: "Kinetic Westside",
    type: "INDOOR",
    surface: "Textured Acrylic",
    pricePerHour: 160000,
    rating: 4.8, reviews: 92,
    amenities: ["Cafe","Showers"],
    image: U("photo-1542144582-1ba00456b5e3", 1200),
    status: "AVAILABLE",
    badge: null,
    sortOrder: 50,
  },
  {
    code: "skyline",
    name: "Skyline Courts",
    location: "Skyline Rooftop",
    type: "ROOFTOP",
    surface: "Panoramic Outdoor",
    pricePerHour: 200000,
    rating: 4.9, reviews: 178,
    amenities: ["Cafe","Parking"],
    image: U("photo-1571008887538-b36bb32f4571", 1200),
    status: "AVAILABLE",
    badge: "Rooftop",
    sortOrder: 60,
  },
  {
    code: "beta",
    name: "Court Beta",
    location: "Kinetic Downtown Hub",
    type: "INDOOR",
    surface: "Artificial Turf",
    pricePerHour: 150000,
    rating: 4.7, reviews: 64,
    amenities: ["Showers","Parking"],
    image: U("photo-1461896836934-ffe607ba8211", 1200),
    status: "OCCUPIED",
    badge: null,
    sortOrder: 70,
  },
  {
    code: "gamma",
    name: "Court Gamma",
    location: "Kinetic Westside",
    type: "COVERED",
    surface: "Semi-Indoor Turf",
    pricePerHour: 135000,
    rating: 4.6, reviews: 41,
    amenities: ["Cafe"],
    image: U("photo-1518611012118-696072aa579a", 1200),
    status: "AVAILABLE",
    badge: null,
    sortOrder: 80,
  },
];

async function main() {
  console.log("[seed:courts] Starting...");
  for (const c of COURTS) {
    await prisma.court.upsert({
      where: { code: c.code },
      update: {
        name: c.name,
        location: c.location,
        type: c.type as never,
        surface: c.surface,
        pricePerHour: c.pricePerHour,
        rating: c.rating,
        reviews: c.reviews,
        amenities: c.amenities,
        image: c.image,
        status: c.status as never,
        badge: c.badge,
        sortOrder: c.sortOrder,
        deletedAt: null,
      },
      create: {
        code: c.code,
        name: c.name,
        location: c.location,
        type: c.type as never,
        surface: c.surface,
        pricePerHour: c.pricePerHour,
        rating: c.rating,
        reviews: c.reviews,
        amenities: c.amenities,
        image: c.image,
        status: c.status as never,
        badge: c.badge,
        sortOrder: c.sortOrder,
      },
    });
  }
  const count = await prisma.court.count({ where: { deletedAt: null } });
  console.log(`[seed:courts] Done. courts=${count}`);
  if (count !== 8) console.warn(`[seed:courts] WARN: expected 8, got ${count}`);
}

main()
  .catch((e) => { console.error("[seed:courts] Failed:", e); process.exit(1); })
  .finally(async () => prisma.$disconnect());
