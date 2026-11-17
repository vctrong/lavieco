import { mongo } from "mongoose";

import { toSearchKey, toSlug } from "@lavieco/shared";

import { REVALIDATE_PRODUCT_JOB } from "../modules/shop-catalog";

/**
 * Sample shop for local development (`npm run dev:seed`): a partner brand and products
 * covering what the pages must show (variants, sale price, low and sold-out stock,
 * approved and pending impact, a draft). Written straight into the local database, so
 * the products are published **without images** (images live in Cloudinary and are
 * added in admin); the web shows its illustration instead. Never run against Atlas
 * (dev-guard). Products are recognised by the `dev-` SKU prefix and reset on every run.
 */

type DevVariant = {
  sku: string;
  values?: Record<string, string>;
  price: number;
  compareAt?: number;
  stock: number;
};

type DevProduct = {
  slug: string;
  title: string;
  summary: string;
  category: string;
  brand?: boolean;
  status: "published" | "draft";
  materials: string[];
  care: string;
  dimensions: string;
  story: { message: string; story: string; lesson: string };
  handbook: { slug: string; title: string };
  options?: { name: string; values: string[] }[];
  variants: DevVariant[];
  impact?: {
    items: { label: string; value: string; unit: string; source: string }[];
    approved: boolean;
  };
  badges?: ("new" | "limited" | "handmade")[];
  sortOrder: number;
};

const BRAND = {
  slug: "xuong-giay-moc",
  name: "Xưởng Giấy Mộc (mẫu)",
  story: "Thương hiệu mẫu cho môi trường dev: sổ tay đóng từ giấy vụn văn phòng.",
  commissionRate: 150,
};

const HANDBOOK = { slug: "vo-so-di-dau", title: "Vỏ sò đi đâu sau bữa ăn?" };

const PRODUCTS: readonly DevProduct[] = [
  {
    slug: "chau-gom-vo-so-mam-xanh",
    title: "Chậu gốm vỏ sò Mầm Xanh",
    summary: "Chậu cây nhỏ đúc từ bột vỏ sò thu gom ở các quán ăn Cần Thơ.",
    category: "gom-bot-vo-so",
    status: "published",
    materials: ["Bột vỏ sò", "Jesmonite"],
    care: "Lau bằng khăn ẩm. Có lỗ thoát nước, đặt kèm đĩa lót.",
    dimensions: "Đường kính 8 cm, cao 7 cm",
    story: {
      message: "Một vỏ sò bỏ đi có thể trở thành nơi một mầm cây bắt đầu.",
      story: "Vỏ sò được rửa sạch, phơi nắng, nghiền mịn rồi đúc thủ công tại xưởng nhỏ ở Cần Thơ.",
      lesson: "Phân loại rác hữu cơ tại nguồn giúp vật liệu có đời sống thứ hai.",
    },
    handbook: HANDBOOK,
    options: [{ name: "Màu", values: ["Xanh rêu", "Nâu đất", "Trắng cát"] }],
    variants: [
      {
        sku: "DEV-POT-REU",
        values: { mau: "xanh-reu" },
        price: 89_000,
        compareAt: 115_000,
        stock: 12,
      },
      {
        sku: "DEV-POT-NAU",
        values: { mau: "nau-dat" },
        price: 89_000,
        compareAt: 115_000,
        stock: 2,
      },
      { sku: "DEV-POT-CAT", values: { mau: "trang-cat" }, price: 95_000, stock: 0 },
    ],
    impact: {
      items: [
        {
          label: "Vỏ sò được tái sử dụng",
          value: "120",
          unit: "g",
          source: "Cân tại xưởng, lô 10/2026",
        },
      ],
      approved: true,
    },
    badges: ["handmade"],
    sortOrder: 1,
  },
  {
    slug: "set-2-lot-ly-song-nho",
    title: "Set 2 lót ly Sóng Nhỏ",
    summary: "Hai lót ly chống ẩm, vân sóng như mặt nước sông Hậu.",
    category: "gom-bot-vo-so",
    status: "published",
    materials: ["Bột vỏ sò", "Nhựa gốc nước"],
    care: "Không ngâm nước lâu.",
    dimensions: "Đường kính 10 cm",
    story: {
      message: "Đồ dùng hằng ngày cũng có thể kể chuyện về phế liệu.",
      story: "Mỗi lót ly dùng khoảng 45 g bột vỏ sò, đổ khuôn silicon và chà nhám tay.",
      lesson: "Đồ bền dùng lâu là cách giảm rác dễ nhất.",
    },
    handbook: HANDBOOK,
    variants: [{ sku: "DEV-COASTER-2", price: 69_000, stock: 25 }],
    impact: {
      items: [
        {
          label: "Vỏ sò được tái sử dụng",
          value: "90",
          unit: "g",
          source: "Ước tính theo công thức đổ khuôn",
        },
      ],
      approved: false,
    },
    badges: ["new"],
    sortOrder: 2,
  },
  {
    slug: "moc-khoa-vo-so-nguyen-ban",
    title: "Móc khoá vỏ sò nguyên bản",
    summary: "Vỏ sò được tuyển chọn, giữ nguyên hình dáng và vân tự nhiên.",
    category: "phu-kien-vo-nguyen-ban",
    status: "published",
    materials: ["Vỏ sò", "Khoen thép không gỉ"],
    care: "Tránh va đập mạnh.",
    dimensions: "Khoảng 4 cm",
    story: {
      message: "Không vỏ sò nào giống vỏ sò nào.",
      story: "Từ mỗi mẻ vỏ thu gom, đội chọn ra những vỏ có vân đẹp nhất để làm phụ kiện.",
      lesson: "Nhìn kỹ một thứ bị bỏ đi, ta thấy giá trị ta chưa từng để ý.",
    },
    handbook: HANDBOOK,
    options: [{ name: "Loại vỏ", values: ["Sò điệp", "Sò lông"] }],
    variants: [
      { sku: "DEV-KEY-DIEP", values: { "loai-vo": "so-diep" }, price: 35_000, stock: 40 },
      { sku: "DEV-KEY-LONG", values: { "loai-vo": "so-long" }, price: 39_000, stock: 18 },
    ],
    sortOrder: 3,
  },
  {
    slug: "phone-charm-vo-oc",
    title: "Phone charm vỏ ốc",
    summary: "Dây treo điện thoại với vỏ ốc nhỏ và hạt gỗ.",
    category: "phu-kien-vo-nguyen-ban",
    status: "published",
    materials: ["Vỏ ốc", "Hạt gỗ", "Dây dù"],
    care: "Lau khô sau khi dính nước.",
    dimensions: "Dài 12 cm",
    story: {
      message: "Mang theo một mẩu câu chuyện tái sinh mỗi ngày.",
      story: "Vỏ ốc nhỏ quá để làm gốm, nên được giữ nguyên và kết dây thủ công.",
      lesson: "Mỗi vật liệu có cách dùng hợp với nó.",
    },
    handbook: HANDBOOK,
    variants: [{ sku: "DEV-CHARM-OC", price: 45_000, stock: 3 }],
    badges: ["limited"],
    sortOrder: 4,
  },
  {
    slug: "ly-nen-thom-vo-so",
    title: "Ly nến thơm vỏ sò",
    summary: "Ly gốm vỏ sò dùng lại được sau khi nến cháy hết.",
    category: "gom-bot-vo-so",
    status: "published",
    materials: ["Bột vỏ sò", "Sáp đậu nành"],
    care: "Đặt nơi thoáng, xa vật dễ cháy.",
    dimensions: "Cao 8 cm",
    story: {
      message: "Khi nến tàn, chiếc ly vẫn còn để dùng tiếp.",
      story: "Ly được đúc từ bột vỏ sò, nến đổ từ sáp đậu nành và tinh dầu.",
      lesson: "Thiết kế để dùng lại là thiết kế ít rác.",
    },
    handbook: HANDBOOK,
    options: [{ name: "Mùi", values: ["Sả chanh", "Gỗ đàn hương"] }],
    variants: [
      { sku: "DEV-CANDLE-SA", values: { mui: "sa-chanh" }, price: 149_000, stock: 0 },
      { sku: "DEV-CANDLE-GO", values: { mui: "go-dan-huong" }, price: 159_000, stock: 0 },
    ],
    sortOrder: 5,
  },
  {
    slug: "combo-qua-tang-xanh-co-ban",
    title: "Combo quà tặng xanh cơ bản",
    summary: "Chậu Mầm Xanh, set lót ly, story card và mã QR vào Cẩm nang.",
    category: "combo-qua-tang-xanh",
    status: "published",
    materials: ["Gốm bột vỏ sò", "Hộp giấy kraft"],
    care: "Xem hướng dẫn trong story card.",
    dimensions: "Hộp 20 × 20 × 10 cm",
    story: {
      message: "Một món quà đi kèm một bài học.",
      story: "Combo đóng trong hộp kraft, kèm story card và mã QR dẫn vào Cẩm nang xanh số.",
      lesson: "Quà tặng có thể là lời mời cùng thay đổi một thói quen.",
    },
    handbook: HANDBOOK,
    variants: [{ sku: "DEV-COMBO-BASIC", price: 269_000, compareAt: 299_000, stock: 8 }],
    sortOrder: 6,
  },
  {
    slug: "so-tay-giay-tai-che",
    title: "Sổ tay giấy tái chế",
    summary: "Sổ tay khâu tay từ giấy vụn văn phòng (thương hiệu đối tác mẫu).",
    category: "doi-tac-xanh",
    brand: true,
    status: "published",
    materials: ["Giấy tái chế", "Chỉ cotton"],
    care: "Tránh ẩm.",
    dimensions: "A6, 80 trang",
    story: {
      message: "Giấy đã dùng một mặt vẫn còn một mặt để viết.",
      story: "Đối tác thu giấy vụn từ văn phòng, nghiền và xeo lại thành giấy mới.",
      lesson: "Tái chế bắt đầu từ việc gom đúng loại.",
    },
    handbook: HANDBOOK,
    variants: [{ sku: "DEV-NOTEBOOK-A6", price: 59_000, stock: 30 }],
    sortOrder: 7,
  },
  {
    slug: "dia-dung-trang-suc-nhap",
    title: "Đĩa đựng trang sức (bản nháp)",
    summary: "Sản phẩm nháp: chưa có story card đầy đủ, không hiện trên web.",
    category: "gom-bot-vo-so",
    status: "draft",
    materials: ["Bột vỏ sò"],
    care: "",
    dimensions: "",
    story: { message: "", story: "", lesson: "" },
    handbook: HANDBOOK,
    variants: [{ sku: "DEV-DISH-DRAFT", price: 79_000, stock: 5 }],
    sortOrder: 8,
  },
];

/**
 * Plain fillers so `/bo-suu-tap` has more than one page (12 per page) to try the
 * pagination with. One variant each, in stock, no impact figures.
 */
const FILLERS: readonly DevProduct[] = [
  ["bong-tai-vo-so-hat-mua", "Bông tai vỏ sò Hạt Mưa", "phu-kien-vo-nguyen-ban", 55_000],
  ["kep-toc-vo-diep", "Kẹp tóc vỏ điệp", "phu-kien-vo-nguyen-ban", 42_000],
  ["vong-tay-vo-oc-nho", "Vòng tay vỏ ốc nhỏ", "phu-kien-vo-nguyen-ban", 65_000],
  ["day-chuyen-mat-vo-so", "Dây chuyền mặt vỏ sò", "phu-kien-vo-nguyen-ban", 79_000],
  ["khay-gom-vo-so-mini", "Khay gốm vỏ sò mini", "gom-bot-vo-so", 85_000],
  ["gia-cam-but-gom-vo-so", "Giá cắm bút gốm vỏ sò", "gom-bot-vo-so", 99_000],
  ["dia-xa-phong-vo-so", "Đĩa xà phòng vỏ sò", "gom-bot-vo-so", 59_000],
  ["chan-nen-gom-vo-so", "Chân nến gốm vỏ sò", "gom-bot-vo-so", 109_000],
  ["combo-hoc-cu-tai-che", "Combo học cụ tái chế", "combo-qua-tang-xanh", 189_000],
  ["combo-ban-lam-viec-xanh", "Combo bàn làm việc xanh", "combo-qua-tang-xanh", 239_000],
].map(([slug, title, category, price], index) => ({
  slug: slug as string,
  title: title as string,
  summary: "Sản phẩm mẫu để thử phân trang của bộ sưu tập.",
  category: category as string,
  status: "published" as const,
  materials: ["Vỏ sò"],
  care: "Lau bằng khăn khô.",
  dimensions: "Cỡ nhỏ",
  story: {
    message: "Phế liệu nào cũng có thể kể một câu chuyện.",
    story: "Làm thủ công tại xưởng nhỏ ở Cần Thơ từ vỏ sò thu gom.",
    lesson: "Dùng lại trước khi bỏ đi.",
  },
  handbook: HANDBOOK,
  variants: [
    { sku: `DEV-FILL-${String(index + 1).padStart(2, "0")}`, price: price as number, stock: 30 },
  ],
  sortOrder: 20 + index,
}));

export async function seedShop(db: mongo.Db, now: Date) {
  const categories = new Map(
    (await db.collection("product_categories").find().toArray()).map((c) => [
      c.key as string,
      c._id,
    ]),
  );
  // Reset what a previous run wrote (dev- SKUs and their products), nothing else.
  const old = await db.collection("product_variants").find({ sku: /^DEV-/ }).toArray();
  const oldProducts = [...new Set(old.map((v) => String(v.productId)))].map(
    (id) => new mongo.ObjectId(id),
  );
  await db.collection("product_variants").deleteMany({ sku: /^DEV-/ });
  await db.collection("stock_movements").deleteMany({ productId: { $in: oldProducts } });
  await db.collection("products").deleteMany({ _id: { $in: oldProducts } });

  const brand = await db.collection("partner_brands").findOneAndUpdate(
    { slug: BRAND.slug },
    {
      $set: {
        name: BRAND.name,
        story: BRAND.story,
        commissionRate: BRAND.commissionRate,
        active: true,
      },
      $setOnInsert: { website: "", logo: null, revision: 1, schemaVersion: 1, createdAt: now },
      $currentDate: { updatedAt: true },
    },
    { upsert: true, returnDocument: "after" },
  );

  for (const seed of [...PRODUCTS, ...FILLERS]) {
    const categoryId = categories.get(seed.category);
    if (!categoryId) throw new Error(`Category ${seed.category} is missing: run the migrations`);
    if (await db.collection("products").findOne({ slug: seed.slug })) {
      console.log(`skip   ${seed.slug}: slug used by a product made in admin, left untouched`);
      continue;
    }
    const productId = new mongo.ObjectId();
    const options = (seed.options ?? []).map((option) => ({
      key: toSlug(option.name, 40),
      name: option.name,
      values: option.values.map((label) => ({ key: toSlug(label, 40), label })),
    }));
    const prices = seed.variants.map((v) => v.price);
    await db.collection("products").insertOne({
      _id: productId,
      schemaVersion: 1,
      slug: seed.slug,
      slugHistory: [],
      title: seed.title,
      summary: seed.summary,
      categoryId,
      partnerBrandId: seed.brand ? brand?._id : null,
      story: seed.story,
      handbookLink: seed.handbook,
      materials: seed.materials,
      care: seed.care,
      dimensions: seed.dimensions,
      options,
      images: [],
      impact: seed.impact
        ? {
            items: seed.impact.items,
            status: seed.impact.approved ? "approved" : "pending",
            approvedBy: seed.impact.approved ? "dev-seed" : null,
            approvedAt: seed.impact.approved ? now : null,
          }
        : { items: [], status: "none", approvedBy: null, approvedAt: null },
      seo: { title: "", description: seed.summary.slice(0, 160) },
      badges: seed.badges ?? [],
      sortOrder: seed.sortOrder,
      status: seed.status,
      live: seed.status === "published",
      priceMin: Math.min(...prices),
      priceMax: Math.max(...prices),
      search: { key: toSearchKey([seed.title, seed.summary, ...seed.materials].join(" ")) },
      publishedAt: seed.status === "published" ? now : null,
      revision: 1,
      createdAt: now,
      updatedAt: now,
    });
    await db.collection("product_variants").insertMany(
      seed.variants.map((variant, index) => {
        const values = variant.values ?? {};
        return {
          _id: new mongo.ObjectId(),
          schemaVersion: 1,
          productId,
          sku: variant.sku,
          optionKey: options.map((o) => `${o.key}=${values[o.key] ?? ""}`).join("|") || "default",
          optionValues: values,
          price: variant.price,
          compareAtPrice: variant.compareAt ?? null,
          lowStockThreshold: 3,
          weightGrams: null,
          status: "active",
          sortOrder: index,
          stock: { onHand: variant.stock, held: 0, sold: 0 },
          createdAt: now,
          updatedAt: now,
        };
      }),
    );
    await db.collection("outbox").insertOne({
      schemaVersion: 1,
      type: REVALIDATE_PRODUCT_JOB,
      payload: { slug: seed.slug },
      status: "pending",
      attempts: 0,
      availableAt: now,
      lockedUntil: null,
      lastErrorCode: null,
      purgeAt: null,
      createdAt: now,
      updatedAt: now,
    });
    console.log(`reset  ${seed.slug}: ${seed.status}, ${seed.variants.length} variant(s)`);
  }
}
