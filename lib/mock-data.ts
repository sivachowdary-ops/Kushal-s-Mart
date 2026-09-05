export interface ProductData {
  id: string;
  slug: string;
  name: string;
  brand: string;
  category: string;
  categorySlug: string;
  description: string;
  mrp: number; // paise
  sellingPrice: number; // paise
  costPrice?: number; // paise (purchase price)
  weightGrams?: number;
  lengthCm?: number;
  widthCm?: number;
  heightCm?: number;
  images: string[];
  inStock: boolean;
  stockCount: number;
  badgeType?: "DEALS" | "SAVE" | "NEW";
  discountPercent?: number;
  variants: {
    id: string;
    name: string;
    sku: string;
    stock: number;
    priceOffset?: number; // paise
  }[];
  specifications: { key: string; value: string }[];
  whatsInTheBox: string[];
}

export const MOCK_CATEGORIES = [
  {
    name: "RC Crawlers",
    slug: "rc-crawlers",
    description: "Hobby-grade 4WD off-road rock crawlers built for tough terrain and steep climbs.",
    imageUrl: "https://images.unsplash.com/photo-1594787318286-3d835c1d207f?auto=format&fit=crop&w=400&q=80",
  },
  {
    name: "Mini RC Car",
    slug: "mini-rc-car",
    description: "Compact 1:16 & 1:24 desktop drift cars with gyro stability control.",
    imageUrl: "https://images.unsplash.com/photo-1617814076367-b759c7d7e738?auto=format&fit=crop&w=400&q=80",
  },
  {
    name: "RC Car Accessories",
    slug: "rc-car-accessories",
    description: "Spare parts, LiPo batteries, chargers, metal upgrades, and 2.4GHz controllers.",
    imageUrl: "https://images.unsplash.com/photo-1563720223185-11003d516935?auto=format&fit=crop&w=400&q=80",
  },
  {
    name: "RC Helicopter",
    slug: "rc-helicopter",
    description: "Remote control helicopters and drones for indoor & outdoor flight.",
    imageUrl: "https://images.unsplash.com/photo-1508614589041-895b88991e3e?auto=format&fit=crop&w=400&q=80",
  },
  {
    name: "Construction RC",
    slug: "construction-rc",
    description: "Heavy duty alloy excavators, dump trucks, and engineering vehicles.",
    imageUrl: "https://images.unsplash.com/photo-1581094288338-2314dddb7ece?auto=format&fit=crop&w=400&q=80",
  },
  {
    name: "RC Boat",
    slug: "rc-boat",
    description: "High speed waterproof RC motor boats for pools and lakes.",
    imageUrl: "https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=400&q=80",
  },
  {
    name: "RC Drift",
    slug: "rc-drift",
    description: "High-speed rear-wheel & 4WD drift racers with realistic body shells.",
    imageUrl: "https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&w=400&q=80",
  },
  {
    name: "RC Monster",
    slug: "rc-monster",
    description: "Big wheel monster trucks designed for bashing and high jumps.",
    imageUrl: "https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=400&q=80",
  },
  {
    name: "1:64 Scale Models",
    slug: "164-scale-models",
    description: "Collectible diecast scale cars from Hot Wheels, Tomica, Mini GT, and Inno64.",
    imageUrl: "https://images.unsplash.com/photo-1580273916550-e323be2ae537?auto=format&fit=crop&w=400&q=80",
  },
  {
    name: "1:43 Scale Models",
    slug: "143-scale-models",
    description: "Detailed 1:43 scale diecast models of Formula 1, sports, and classic cars.",
    imageUrl: "https://images.unsplash.com/photo-1605559424843-9e4c228bf1c2?auto=format&fit=crop&w=400&q=80",
  },
  {
    name: "1:18 Scale Models",
    slug: "118-scale-models",
    description: "Large 1:18 scale metal diecast cars with opening doors, hood, and steering.",
    imageUrl: "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=400&q=80",
  },
  {
    name: "1:32 Scale Models",
    slug: "132-scale-models",
    description: "Diecast cars with light & sound pull-back mechanisms.",
    imageUrl: "https://images.unsplash.com/photo-1541899481282-d53bffe3c35d?auto=format&fit=crop&w=400&q=80",
  },
];

export const MOCK_PRODUCTS: ProductData[] = [
  {
    id: "prod-1",
    slug: "hb-toys-hb-zp1002-1-10-4wd-defender",
    name: "HB TOYS HB-ZP1002 1/10 4WD RC Rock Crawler – Defender Edition",
    brand: "HB TOYS",
    category: "RC Crawlers",
    categorySlug: "rc-crawlers",
    description:
      "The HB Toys HB-ZP1002 is a hobby-grade 1/10 scale 4WD remote control rock crawler featuring high torque 280 motor, full proportional steering, working roof light bar, and heavy-duty off-road suspension. Built for conquering rugged outdoor terrain.",
    mrp: 1999900,          // ₹19,999
    sellingPrice: 999900,  // ₹9,999
    images: [
      "https://images.unsplash.com/photo-1594787318286-3d835c1d207f?auto=format&fit=crop&w=1000&q=80",
      "https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=1000&q=80",
      "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1000&q=80",
    ],
    inStock: true,
    stockCount: 8,
    badgeType: "DEALS",
    variants: [
      { id: "v1-1", name: "Tactical Grey (1 Battery)", sku: "HB-ZP1002-GREY-1B", stock: 5 },
      { id: "v1-2", name: "Tactical Grey (2 Batteries Combo)", sku: "HB-ZP1002-GREY-2B", stock: 3, priceOffset: 80000 },
      { id: "v1-3", name: "Desert Yellow (1 Battery)", sku: "HB-ZP1002-YLW-1B", stock: 4 },
    ],
    specifications: [
      { key: "Scale", value: "1/10 Full Scale" },
      { key: "Drive System", value: "4WD Shaft Drive" },
      { key: "Motor", value: "280 High Torque Brushed Motor" },
      { key: "Control Distance", value: "Up to 50 meters" },
      { key: "Battery", value: "7.4V 1500mAh Li-ion" },
      { key: "Play Time", value: "Approx. 25-30 mins" },
      { key: "Charging Time", value: "2.5 Hours via USB" },
    ],
    whatsInTheBox: [
      "1x HB Toys 1/10 Defender RC Crawler",
      "1x 2.4GHz Pistol Grip Transmitter",
      "1x 7.4V 1500mAh Rechargeable Battery",
      "1x Smart USB Charger",
      "1x User Manual & Tool Set",
    ],
  },
  {
    id: "prod-2",
    slug: "1-64-monster-off-road-rc-truck",
    name: "1:64 Monster Off-Road RC Truck – 2.4GHz Mini Alloy Remote Control",
    brand: "WPL",
    category: "Mini RC Car",
    categorySlug: "mini-rc-car",
    description:
      "Ultra-compact 1:64 scale mini alloy monster truck with 2.4GHz remote control, soft rubber off-road tires, and responsive throttle. Ideal for desktop obstacle courses and indoor fun.",
    mrp: 180000,         // ₹1,800
    sellingPrice: 90000, // ₹900
    images: [
      "https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=1000&q=80",
      "https://images.unsplash.com/photo-1617814076367-b759c7d7e738?auto=format&fit=crop&w=1000&q=80",
    ],
    inStock: true,
    stockCount: 15,
    badgeType: "DEALS",
    variants: [
      { id: "v2-1", name: "Monster Blue", sku: "MN-64-BLU", stock: 8 },
      { id: "v2-2", name: "Monster Red", sku: "MN-64-RED", stock: 7 },
    ],
    specifications: [
      { key: "Scale", value: "1/64 Mini Scale" },
      { key: "Material", value: "Diecast Alloy Shell + ABS" },
      { key: "Control Frequency", value: "2.4GHz" },
      { key: "Play Time", value: "15-20 mins" },
    ],
    whatsInTheBox: [
      "1x 1:64 Mini Monster Truck",
      "1x Remote Controller",
      "1x USB Charging Cable",
    ],
  },
  {
    id: "prod-3",
    slug: "fms-fcx10-discovery-camel-trophy-edition",
    name: "FMS FCX10 Discovery Camel Trophy Edition RS 1/10 Scale RTR",
    brand: "FMS",
    category: "RC Crawlers",
    categorySlug: "rc-crawlers",
    description:
      "Officially licensed 1/10 FMS Discovery Camel Trophy Edition with two-speed transmission, remote locking differentials, scale interior detailing, and heavy-duty steel ladder frame.",
    mrp: 5500000,          // ₹55,000
    sellingPrice: 4799900, // ₹47,999
    images: [
      "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1000&q=80",
      "https://images.unsplash.com/photo-1594787318286-3d835c1d207f?auto=format&fit=crop&w=1000&q=80",
    ],
    inStock: true,
    stockCount: 3,
    badgeType: "DEALS",
    variants: [
      { id: "v3-1", name: "Camel Trophy Yellow (RTR)", sku: "FMS-FCX10-CAMEL", stock: 3 },
    ],
    specifications: [
      { key: "Scale", value: "1/10 Scale Professional" },
      { key: "Transmission", value: "2-Speed Mechanical Shift" },
      { key: "Differentials", value: "Front & Rear Remote Locking" },
    ],
    whatsInTheBox: [
      "1x FMS FCX10 Discovery RTR",
      "1x 6-Channel Radio System",
      "1x Scale Accessories Kit",
    ],
  },
  {
    id: "prod-4",
    slug: "rc-forklift-mini-scale-1-64-engineering",
    name: "RC Forklift Mini Scale 1:64 Engineering Speed Regulating Truck",
    brand: "HobbyEngine",
    category: "Construction RC",
    categorySlug: "construction-rc",
    description:
      "Fully functional 1:64 RC Forklift with motorized lifting mast, pallet accessory, working headlights, and realistic sound effects.",
    mrp: 239900,         // ₹2,399
    sellingPrice: 149900,// ₹1,499
    images: [
      "https://images.unsplash.com/photo-1581094288338-2314dddb7ece?auto=format&fit=crop&w=1000&q=80",
    ],
    inStock: true,
    stockCount: 12,
    badgeType: "DEALS",
    variants: [
      { id: "v4-1", name: "Yellow Forklift Set", sku: "RC-FORKLIFT-YLW", stock: 12 },
    ],
    specifications: [
      { key: "Functions", value: "Drive Forward/Reverse, Lift Up/Down" },
      { key: "Included", value: "Mini Pallet + Cargo Box" },
    ],
    whatsInTheBox: [
      "1x RC Forklift",
      "1x Controller",
      "1x Mini Wooden Pallet",
    ],
  },
  {
    id: "prod-5",
    slug: "hot-wheels-silver-series-fast-furious",
    name: "Hot Wheels Silver Series Fast & Furious Race-Off S15",
    brand: "Hot Wheels",
    category: "1:64 Scale Models",
    categorySlug: "164-scale-models",
    description:
      "Limited edition 1:64 diecast Hot Wheels Silver Series Nissan Silvia S15 from Fast & Furious. Premium card packaging with Real Riders rubber tires and full diecast chassis.",
    mrp: 180000,        // ₹1,800
    sellingPrice: 49900,// ₹499
    images: [
      "https://images.unsplash.com/photo-1580273916550-e323be2ae537?auto=format&fit=crop&w=1000&q=80",
    ],
    inStock: true,
    stockCount: 20,
    badgeType: "SAVE",
    discountPercent: 72,
    variants: [
      { id: "v5-1", name: "Single Card Pack", sku: "HW-FF-SILVIA", stock: 20 },
    ],
    specifications: [
      { key: "Scale", value: "1/64 Diecast" },
      { key: "Tires", value: "Real Riders Rubber Tires" },
      { key: "Chassis", value: "Full Metal/Metal" },
    ],
    whatsInTheBox: [
      "1x Hot Wheels Sealed Carded Diecast Car",
    ],
  },
  {
    id: "prod-6",
    slug: "hot-wheels-nissan-silvia-s15-tokyo-drift",
    name: "Hot Wheels Nissan Silvia S15 – Fast & Furious Tokyo Drift Edition",
    brand: "Hot Wheels",
    category: "1:64 Scale Models",
    categorySlug: "164-scale-models",
    description:
      "Iconic Mona Lisa S15 Silvia diecast car from Tokyo Drift. Detailed livery, custom wheels, and mint condition blister card.",
    mrp: 129900,        // ₹1,299
    sellingPrice: 69900,// ₹699
    images: [
      "https://images.unsplash.com/photo-1617814076367-b759c7d7e738?auto=format&fit=crop&w=1000&q=80",
    ],
    inStock: true,
    stockCount: 14,
    badgeType: "SAVE",
    discountPercent: 46,
    variants: [
      { id: "v6-1", name: "Tokyo Drift Edition", sku: "HW-TD-S15", stock: 14 },
    ],
    specifications: [
      { key: "Scale", value: "1/64 Scale" },
      { key: "Series", value: "Fast & Furious Premium" },
    ],
    whatsInTheBox: [
      "1x Hot Wheels Carded Vehicle",
    ],
  },
  {
    id: "prod-7",
    slug: "takara-tomy-tomica-premium-nissan-skyline-gt-r",
    name: "Takara Tomy Tomica Premium No. 11 Nissan Skyline GT-R V-Spec II",
    brand: "Tomica",
    category: "1:64 Scale Models",
    categorySlug: "164-scale-models",
    description:
      "Takara Tomy Tomica Premium Japanese import No. 11 Nissan Skyline GT-R R34 V-Spec II in iconic Bayside Blue. Features opening doors and working suspension.",
    mrp: 150000,        // ₹1,500
    sellingPrice: 99900,// ₹999
    images: [
      "https://images.unsplash.com/photo-1605559424843-9e4c228bf1c2?auto=format&fit=crop&w=1000&q=80",
    ],
    inStock: true,
    stockCount: 9,
    badgeType: "SAVE",
    discountPercent: 33,
    variants: [
      { id: "v7-1", name: "Bayside Blue Box", sku: "TOMICA-11-R34", stock: 9 },
    ],
    specifications: [
      { key: "Scale", value: "1/62 Scale" },
      { key: "Features", value: "Opening Doors, Suspension" },
    ],
    whatsInTheBox: [
      "1x Tomica Premium Sealed Boxed Car",
    ],
  },
  {
    id: "prod-8",
    slug: "lamborghini-essenza-scv12-1-64-scale-model",
    name: "Lamborghini Essenza SCV12 1:64 Scale Model Car – Tomica Premium",
    brand: "Tomica",
    category: "1:64 Scale Models",
    categorySlug: "164-scale-models",
    description:
      "Supercar diecast replica of the track-only Lamborghini Essenza SCV12 in Verde Selvans green livery with matte black aerodynamics.",
    mrp: 150000,        // ₹1,500
    sellingPrice: 99900,// ₹999
    images: [
      "https://images.unsplash.com/photo-1541899481282-d53bffe3c35d?auto=format&fit=crop&w=1000&q=80",
    ],
    inStock: true,
    stockCount: 11,
    badgeType: "SAVE",
    discountPercent: 33,
    variants: [
      { id: "v8-1", name: "Verde Green Box", sku: "TOMICA-LAMBO-SCV12", stock: 11 },
    ],
    specifications: [
      { key: "Scale", value: "1/64 Scale" },
      { key: "Livery", value: "Official Track Edition" },
    ],
    whatsInTheBox: [
      "1x Tomica Premium Lamborghini Box",
    ],
  },
];
