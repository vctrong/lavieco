import type {
  BenefitIcon,
  EventFormat,
  EventKind,
  EventStatus,
  QuestionType,
} from "@lavieco/shared/events";

/**
 * DEVELOPMENT-ONLY programs written by `npm run dev:seed` into the LOCAL MongoDB
 * (docs/dev-local.md). One program per state the web and admin must render: open with
 * paid tickets, free online, few seats left, sold out, sale not started, online link
 * pending, closed, draft, ended with check-ins, and archive-only past events.
 * Buyers are fictional (`*@lavieco.test`, never deliverable); nothing about children
 * (BR-08, BR-13). Dates are relative to the run so the states stay true.
 */

/** Days from today (Asia/Ho_Chi_Minh) and a local "HH:MM" time. */
export type When = { day: number; time: string };

export type DevQuestion = {
  key: string;
  type: QuestionType;
  label: string;
  description?: string;
  required: boolean;
  options?: string[];
  hidden?: boolean;
};

export type DevTicketType = {
  key: string;
  name: string;
  description?: string;
  price: number;
  quantity: number | null;
  maxPerOrder: number;
  saleStartAt?: When;
  saleEndAt?: When;
  hidden?: boolean;
};

/**
 * One order. `pending` holds its seats for 15 minutes (the expiry job releases them
 * afterwards, like a real one); `paid` and `refunded` carry tickets.
 */
export type DevOrder = {
  buyer: number;
  status: "paid" | "pending" | "expired" | "cancelled" | "refunded";
  items: Array<{ ticketType: string; quantity: number }>;
  /** Days before the run the order was placed (default 2). */
  placedDaysAgo?: number;
  /** Tickets checked in at the door (paid orders of a started event only). */
  checkedIn?: number;
  /** Answers by question key: option labels for choice questions, text otherwise. */
  answers?: Record<string, string | string[]>;
  note?: string;
};

export type DevEvent = {
  slug: string;
  kind: EventKind;
  status: EventStatus;
  typeKey: "workshop" | "talkshow" | "trien-lam";
  title: string;
  format: EventFormat;
  start: When;
  end: When;
  venue?: { name: string; address: string; mapUrl?: string };
  onlineUrl?: string;
  summary: string;
  description: string;
  safetyNotes?: string;
  cancellationPolicy?: string;
  cancellationRules?: Array<{ condition: string; result: string }>;
  minAge?: number;
  benefits?: Array<{ icon: BenefitIcon; title: string; description?: string }>;
  forChildren?: boolean;
  speakers?: Array<{ name: string; role: string; bio?: string }>;
  agenda?: Array<{ time: string; title: string; description?: string }>;
  /** Only with `status: "cancelled"`: the public reason. */
  cancellationReason?: string;
  /** Archive-only events: typed attendance, public only when approved (BR-09). */
  attendance?: { count: number; approved: boolean };
  faq?: Array<{ question: string; answer: string }>;
  questions?: DevQuestion[];
  ticketTypes?: DevTicketType[];
  orders?: DevOrder[];
};

/** Fictional buyers; `.test` addresses can never receive mail. */
export const DEV_BUYERS = [
  { fullName: "Nguyễn Văn An", email: "an@lavieco.test", phone: "0901234561" },
  { fullName: "Trần Thị Bình", email: "binh@lavieco.test", phone: "0901234562" },
  { fullName: "Lê Minh Châu", email: "chau@lavieco.test", phone: "0912345673" },
  { fullName: "Phạm Quốc Dũng", email: "dung@lavieco.test", phone: "0923456784" },
  { fullName: "Võ Thị Hà", email: "ha@lavieco.test", phone: "0934567895" },
  { fullName: "Huỳnh Gia Huy", email: "huy@lavieco.test", phone: "0945678906" },
  { fullName: "Đặng Ngọc Lan", email: "lan@lavieco.test", phone: "0356789017" },
  { fullName: "Bùi Thanh Long", email: "long@lavieco.test", phone: "0367890128" },
  { fullName: "Trương Mỹ Ngọc", email: "ngoc@lavieco.test", phone: "0778901239" },
  { fullName: "Ngô Hoàng Phúc", email: "phuc@lavieco.test", phone: "0789012340" },
  { fullName: "Lý Thu Trang", email: "trang@lavieco.test", phone: "0890123451" },
  { fullName: "Cao Văn Tâm", email: "tam@lavieco.test", phone: "0981234562" },
] as const;

const CAN_THO_STUDIO = {
  name: "Xưởng LAVIECO Cần Thơ",
  address: "12 Đường 30/4, Phường Xuân Khánh, Quận Ninh Kiều, Cần Thơ",
  mapUrl: "https://maps.google.com/?q=Ninh+Kieu+Can+Tho",
};

const STANDARD_POLICY = "Liên hệ LAVIECO qua email trong vé để huỷ hoặc chuyển vé.";

const STANDARD_RULES = [
  { condition: "Huỷ trước 72 giờ", result: "Hoàn 100%" },
  { condition: "Huỷ trong vòng 72 giờ", result: "Không hoàn, được chuyển vé cho người khác" },
  { condition: "LAVIECO huỷ chương trình", result: "Hoàn 100%" },
];

const WORKSHOP_BENEFITS: NonNullable<DevEvent["benefits"]> = [
  {
    icon: "package",
    title: "Bộ vật liệu đã xử lý",
    description: "Vật liệu tái chế đã làm sạch, phân loại, đủ dùng cho cả buổi.",
  },
  {
    icon: "award",
    title: "Tác phẩm mang về",
    description: "Bức tranh khổ 20×20 cm do chính bạn hoàn thiện.",
  },
  {
    icon: "book",
    title: "Một trang Cẩm nang xanh",
    description: "Hướng dẫn để tiếp tục thực hành tại nhà, đọc qua mã QR.",
  },
  {
    icon: "coffee",
    title: "Trà và bánh",
    description: "Giải lao giữa buổi cùng người hướng dẫn.",
  },
];

const SHELL_SAFETY =
  "Vỏ sò, vỏ ốc đã được làm sạch và mài cạnh nhưng vẫn có thể sắc. Bạn sẽ được phát găng tay và kính bảo hộ; vui lòng mặc quần áo có thể dính keo và màu.";

const HEARD_FROM: DevQuestion = {
  key: "heard",
  type: "single_choice",
  label: "Bạn biết đến chương trình qua đâu?",
  required: true,
  options: ["Facebook", "Bạn bè giới thiệu", "Mã QR trên sản phẩm", "Khác"],
};

export const DEV_EVENTS: readonly DevEvent[] = [
  {
    slug: "workshop-tranh-kham-vo-so",
    kind: "standard",
    status: "published",
    typeKey: "workshop",
    title: "Workshop tranh khảm vỏ sò: Biển trong lòng bàn tay",
    format: "offline",
    start: { day: 14, time: "08:30" },
    end: { day: 14, time: "11:30" },
    venue: CAN_THO_STUDIO,
    summary:
      "Ba giờ biến vỏ sò phế liệu từ chợ hải sản thành một bức tranh khảm nhỏ, và hiểu vì sao chất thải có thể trở thành chất liệu.",
    description:
      "Mỗi ngày các chợ hải sản ở Cần Thơ thải ra hàng tạ vỏ sò, vỏ nghêu. Trong buổi workshop này, bạn sẽ đi qua toàn bộ hành trình của chất liệu: từ thu gom, làm sạch, phân loại theo màu, đến ghép thành một bức tranh khảm khổ 20×20 cm.\n\nKhông cần biết vẽ. Người hướng dẫn sẽ chia sẻ nguyên lý phối màu từ tự nhiên và kể câu chuyện phía sau mỗi tác phẩm của LAVIECO. Bạn mang tranh về và một trang Cẩm nang xanh để tiếp tục thực hành tại nhà.",
    safetyNotes: SHELL_SAFETY,
    cancellationPolicy: STANDARD_POLICY,
    cancellationRules: STANDARD_RULES,
    minAge: 12,
    benefits: WORKSHOP_BENEFITS,
    speakers: [
      {
        name: "Phan Minh Khoa",
        role: "Nghệ sĩ chất liệu, hướng dẫn chính",
        bio: "Làm việc với vật liệu tái chế hơn tám năm, phụ trách giáo án các lớp sáng tạo xanh của LAVIECO.",
      },
      {
        name: "Nguyễn Thảo Vy",
        role: "Trợ giảng mỹ thuật",
        bio: "Giáo viên mỹ thuật, hỗ trợ từng người tham gia trong suốt buổi.",
      },
    ],
    agenda: [
      {
        time: "08:30",
        title: "Đón khách, trà và câu chuyện chất liệu",
        description: "Vì sao phế liệu có thể trở thành chất liệu nghệ thuật.",
      },
      {
        time: "09:00",
        title: "Phân loại và xử lý chất liệu",
        description: "Làm sạch, mài cạnh an toàn và phân nhóm theo màu.",
      },
      { time: "09:45", title: "Phác thảo bố cục, phối màu tự nhiên" },
      { time: "10:15", title: "Khảm tranh" },
      { time: "11:15", title: "Trưng bày, chụp ảnh và chia sẻ" },
    ],
    faq: [
      {
        question: "Tôi chưa từng làm thủ công, có theo được không?",
        answer: "Được. Mọi bước đều có hướng dẫn và trợ giảng hỗ trợ trực tiếp.",
      },
      {
        question: "Có bãi giữ xe không?",
        answer: "Có bãi giữ xe máy miễn phí ngay trước xưởng.",
      },
    ],
    questions: [
      HEARD_FROM,
      {
        key: "experience",
        type: "dropdown",
        label: "Bạn đã từng làm thủ công với vật liệu tái chế chưa?",
        required: false,
        options: ["Chưa bao giờ", "Đã thử vài lần", "Thường xuyên"],
      },
      {
        key: "expect",
        type: "paragraph",
        label: "Bạn mong đợi điều gì ở buổi workshop?",
        required: false,
      },
    ],
    ticketTypes: [
      {
        key: "early",
        name: "Vé sớm",
        description: "Số lượng có hạn, đã gồm vật liệu và trà bánh.",
        price: 220_000,
        quantity: 10,
        maxPerOrder: 2,
        saleEndAt: { day: 7, time: "23:59" },
      },
      {
        key: "standard",
        name: "Vé tiêu chuẩn",
        description: "Đã gồm vật liệu, trà bánh và tranh mang về.",
        price: 280_000,
        quantity: 20,
        maxPerOrder: 4,
      },
    ],
    orders: [
      {
        buyer: 0,
        status: "paid",
        items: [{ ticketType: "early", quantity: 2 }],
        placedDaysAgo: 5,
        answers: {
          heard: "Facebook",
          experience: "Chưa bao giờ",
          expect: "Muốn thử làm tranh cùng bạn",
        },
      },
      {
        buyer: 2,
        status: "paid",
        items: [{ ticketType: "early", quantity: 1 }],
        placedDaysAgo: 4,
        answers: { heard: "Mã QR trên sản phẩm" },
      },
      {
        buyer: 3,
        status: "paid",
        items: [{ ticketType: "standard", quantity: 3 }],
        placedDaysAgo: 3,
        answers: { heard: "Bạn bè giới thiệu", experience: "Đã thử vài lần" },
        note: "Nhóm 3 người, mong được ngồi cạnh nhau.",
      },
      {
        buyer: 4,
        status: "pending",
        items: [{ ticketType: "standard", quantity: 1 }],
        placedDaysAgo: 0,
        answers: { heard: "Facebook" },
      },
      {
        buyer: 5,
        status: "expired",
        items: [{ ticketType: "standard", quantity: 2 }],
        placedDaysAgo: 2,
        answers: { heard: "Khác" },
      },
      {
        buyer: 6,
        status: "cancelled",
        items: [{ ticketType: "early", quantity: 1 }],
        placedDaysAgo: 2,
        answers: { heard: "Facebook" },
      },
      {
        buyer: 7,
        status: "refunded",
        items: [{ ticketType: "standard", quantity: 1 }],
        placedDaysAgo: 6,
        answers: { heard: "Bạn bè giới thiệu" },
      },
    ],
  },
  {
    slug: "talkshow-giao-duc-xanh-truc-tuyen",
    kind: "standard",
    status: "published",
    typeKey: "talkshow",
    title: "Talkshow trực tuyến: Dạy trẻ yêu môi trường qua nghệ thuật",
    format: "online",
    start: { day: 7, time: "19:30" },
    end: { day: 7, time: "21:00" },
    onlineUrl: "https://meet.google.com/lav-ieco-dev",
    summary:
      "Một buổi trò chuyện với giáo viên mỹ thuật và phụ huynh về cách đưa vật liệu tái chế vào giờ học sáng tạo.",
    description:
      "Giáo dục môi trường hiệu quả nhất khi trẻ được tự tay làm. Buổi talkshow chia sẻ kinh nghiệm thực tế từ các lớp học thí điểm của LAVIECO tại Cần Thơ: chọn vật liệu an toàn, thiết kế bài học theo độ tuổi, và đo lường sự thay đổi trong thói quen của học sinh.\n\nĐường dẫn tham gia được gửi kèm vé qua email.",
    speakers: [
      { name: "Lê Hoàng Yến", role: "Giáo viên mỹ thuật tiểu học" },
      { name: "Trần Đức Minh", role: "Điều phối chương trình giáo dục, LAVIECO" },
    ],
    agenda: [
      { time: "19:30", title: "Mở đầu: vì sao giáo dục xanh cần nghệ thuật" },
      { time: "19:45", title: "Chia sẻ từ lớp học thí điểm" },
      { time: "20:30", title: "Hỏi đáp" },
    ],
    questions: [
      {
        key: "role",
        type: "multiple_choice",
        label: "Bạn tham gia với vai trò nào?",
        required: true,
        options: ["Phụ huynh", "Giáo viên", "Sinh viên", "Tổ chức / doanh nghiệp"],
      },
      {
        key: "question",
        type: "short_text",
        label: "Câu hỏi bạn muốn gửi trước cho diễn giả",
        required: false,
      },
    ],
    ticketTypes: [
      {
        key: "free",
        name: "Vé miễn phí",
        description: "Đăng ký để nhận đường dẫn tham gia.",
        price: 0,
        quantity: 200,
        maxPerOrder: 1,
      },
    ],
    orders: [
      {
        buyer: 1,
        status: "paid",
        items: [{ ticketType: "free", quantity: 1 }],
        answers: { role: ["Phụ huynh"], question: "Bé 6 tuổi có làm được không?" },
      },
      {
        buyer: 8,
        status: "paid",
        items: [{ ticketType: "free", quantity: 1 }],
        answers: { role: ["Giáo viên", "Phụ huynh"] },
      },
      {
        buyer: 9,
        status: "paid",
        items: [{ ticketType: "free", quantity: 1 }],
        placedDaysAgo: 1,
        answers: { role: ["Sinh viên"] },
      },
      {
        buyer: 10,
        status: "paid",
        items: [{ ticketType: "free", quantity: 1 }],
        placedDaysAgo: 1,
        answers: { role: ["Tổ chức / doanh nghiệp"], question: "Có hợp tác với trường học không?" },
      },
    ],
  },
  {
    slug: "workshop-gia-dinh-chuong-gio-vo-oc",
    kind: "standard",
    status: "published",
    typeKey: "workshop",
    title: "Workshop gia đình: Làm chuông gió từ vỏ ốc",
    format: "offline",
    start: { day: 10, time: "15:00" },
    end: { day: 10, time: "17:00" },
    venue: CAN_THO_STUDIO,
    forChildren: true,
    summary: "Phụ huynh và bé cùng làm một chiếc chuông gió từ vỏ ốc tái chế. Chỉ còn vài chỗ.",
    description:
      "Một buổi chiều cuối tuần dành cho gia đình. Bé (từ 6 tuổi) cùng phụ huynh xâu vỏ ốc, tô màu và hoàn thiện chuông gió treo cửa sổ. Mỗi vé dành cho một phụ huynh và một bé.\n\nPhụ huynh luôn đi cùng và chịu trách nhiệm cho bé trong suốt buổi.",
    safetyNotes:
      "Có dùng kim xâu đầu tròn và keo nến. Phụ huynh vui lòng giám sát bé khi dùng súng bắn keo.",
    cancellationPolicy: STANDARD_POLICY,
    speakers: [{ name: "Nguyễn Thảo Vy", role: "Hướng dẫn" }],
    questions: [HEARD_FROM],
    ticketTypes: [
      {
        key: "family",
        name: "Vé gia đình (1 phụ huynh + 1 bé)",
        price: 350_000,
        quantity: 12,
        maxPerOrder: 3,
      },
    ],
    orders: [
      {
        buyer: 0,
        status: "paid",
        items: [{ ticketType: "family", quantity: 2 }],
        answers: { heard: "Facebook" },
      },
      {
        buyer: 2,
        status: "paid",
        items: [{ ticketType: "family", quantity: 3 }],
        answers: { heard: "Bạn bè giới thiệu" },
      },
      {
        buyer: 5,
        status: "paid",
        items: [{ ticketType: "family", quantity: 2 }],
        answers: { heard: "Facebook" },
      },
      {
        buyer: 9,
        status: "paid",
        items: [{ ticketType: "family", quantity: 3 }],
        answers: { heard: "Khác" },
      },
    ],
  },
  {
    slug: "workshop-tui-vai-tu-luoi-danh-ca",
    kind: "standard",
    status: "published",
    typeKey: "workshop",
    title: "Workshop đan túi từ lưới đánh cá cũ",
    format: "offline",
    start: { day: 5, time: "09:00" },
    end: { day: 5, time: "12:00" },
    venue: CAN_THO_STUDIO,
    summary: "Lưới đánh cá bỏ đi trở thành chiếc túi đựng đồ. Đã hết chỗ.",
    description:
      "Lưới đánh cá cũ là một trong những loại rác khó phân huỷ nhất ở sông nước miền Tây. Buổi workshop hướng dẫn kỹ thuật đan cơ bản để biến lưới thành túi đi chợ bền chắc.",
    cancellationPolicy: STANDARD_POLICY,
    questions: [HEARD_FROM],
    ticketTypes: [
      { key: "standard", name: "Vé tiêu chuẩn", price: 180_000, quantity: 8, maxPerOrder: 4 },
    ],
    orders: [
      {
        buyer: 3,
        status: "paid",
        items: [{ ticketType: "standard", quantity: 4 }],
        answers: { heard: "Facebook" },
      },
      {
        buyer: 6,
        status: "paid",
        items: [{ ticketType: "standard", quantity: 2 }],
        answers: { heard: "Mã QR trên sản phẩm" },
      },
      {
        buyer: 11,
        status: "paid",
        items: [{ ticketType: "standard", quantity: 2 }],
        answers: { heard: "Bạn bè giới thiệu" },
      },
      {
        buyer: 8,
        status: "expired",
        items: [{ ticketType: "standard", quantity: 1 }],
        answers: { heard: "Facebook" },
      },
    ],
  },
  {
    slug: "trien-lam-song-thu-hai-cua-vo-so",
    kind: "standard",
    status: "published",
    typeKey: "trien-lam",
    title: "Triển lãm: Đời sống thứ hai của vỏ sò",
    format: "offline",
    start: { day: 30, time: "09:00" },
    end: { day: 33, time: "17:00" },
    venue: {
      name: "Nhà văn hoá Thanh niên Cần Thơ",
      address: "Đường Hoà Bình, Quận Ninh Kiều, Cần Thơ",
    },
    summary: "Ba mươi tác phẩm từ vỏ hải sản phế liệu. Mở đăng ký vào tuần sau.",
    description:
      "Triển lãm giới thiệu các tác phẩm của LAVIECO và học sinh các lớp thí điểm. Mỗi tác phẩm đi kèm thẻ câu chuyện về chất liệu và mã QR dẫn tới Cẩm nang xanh.",
    ticketTypes: [
      {
        key: "free",
        name: "Vé tham quan",
        price: 0,
        quantity: null,
        maxPerOrder: 5,
        saleStartAt: { day: 7, time: "09:00" },
      },
    ],
  },
  {
    slug: "webinar-ve-sinh-vo-hai-san",
    kind: "standard",
    status: "published",
    typeKey: "talkshow",
    title: "Webinar: Xử lý và vệ sinh vỏ hải sản an toàn",
    format: "online",
    start: { day: 20, time: "20:00" },
    end: { day: 20, time: "21:00" },
    summary: "Đường dẫn phòng họp đang được chuẩn bị, sẽ mở đăng ký khi có link.",
    description:
      "Hướng dẫn quy trình làm sạch, khử mùi và bảo quản vỏ hải sản trước khi đưa vào sáng tác, dành cho giáo viên và người làm thủ công.",
    ticketTypes: [
      { key: "standard", name: "Vé tham gia", price: 50_000, quantity: 100, maxPerOrder: 2 },
    ],
  },
  {
    slug: "workshop-in-tranh-tu-la-cay",
    kind: "standard",
    status: "closed",
    typeKey: "workshop",
    title: "Workshop in tranh từ lá cây và bã cà phê",
    format: "offline",
    start: { day: 3, time: "14:00" },
    end: { day: 3, time: "16:30" },
    venue: CAN_THO_STUDIO,
    summary: "Đăng ký đã đóng để đội chuẩn bị vật liệu.",
    description:
      "Kỹ thuật in tranh bằng lá cây và màu tự nhiên từ bã cà phê. Đăng ký đã đóng sớm; vé đã đặt vẫn có hiệu lực.",
    cancellationPolicy: STANDARD_POLICY,
    questions: [HEARD_FROM],
    ticketTypes: [
      { key: "standard", name: "Vé tiêu chuẩn", price: 150_000, quantity: 15, maxPerOrder: 3 },
    ],
    orders: [
      {
        buyer: 4,
        status: "paid",
        items: [{ ticketType: "standard", quantity: 2 }],
        answers: { heard: "Facebook" },
      },
      {
        buyer: 10,
        status: "paid",
        items: [{ ticketType: "standard", quantity: 1 }],
        answers: { heard: "Khác" },
      },
    ],
  },
  {
    slug: "workshop-ban-nhap-den-ngu-vo-so",
    kind: "standard",
    status: "draft",
    typeKey: "workshop",
    title: "Workshop đèn ngủ từ vỏ sò (bản nháp)",
    format: "offline",
    start: { day: 45, time: "18:30" },
    end: { day: 45, time: "21:00" },
    venue: CAN_THO_STUDIO,
    summary: "",
    description: "Nội dung đang soạn.",
    safetyNotes: "Có sử dụng dây điện và bóng LED 5V.",
    ticketTypes: [
      { key: "standard", name: "Vé tiêu chuẩn", price: 320_000, quantity: 12, maxPerOrder: 2 },
    ],
  },
  {
    slug: "workshop-mo-dau-tranh-vo-nghieu",
    kind: "standard",
    status: "ended",
    typeKey: "workshop",
    title: "Workshop mở màn: Tranh vỏ nghêu cho người mới",
    format: "offline",
    start: { day: -12, time: "08:30" },
    end: { day: -12, time: "11:00" },
    venue: CAN_THO_STUDIO,
    summary: "Buổi workshop đầu tiên của LAVIECO trên nền tảng, đã diễn ra.",
    description:
      "Buổi workshop mở màn với 20 người tham gia, mỗi người hoàn thành một bức tranh vỏ nghêu nhỏ.",
    safetyNotes: SHELL_SAFETY,
    cancellationPolicy: STANDARD_POLICY,
    questions: [HEARD_FROM],
    ticketTypes: [
      { key: "standard", name: "Vé tiêu chuẩn", price: 200_000, quantity: 20, maxPerOrder: 4 },
    ],
    orders: [
      {
        buyer: 1,
        status: "paid",
        items: [{ ticketType: "standard", quantity: 2 }],
        placedDaysAgo: 20,
        checkedIn: 2,
        answers: { heard: "Facebook" },
      },
      {
        buyer: 7,
        status: "paid",
        items: [{ ticketType: "standard", quantity: 3 }],
        placedDaysAgo: 18,
        checkedIn: 2,
        answers: { heard: "Bạn bè giới thiệu" },
      },
      {
        buyer: 11,
        status: "paid",
        items: [{ ticketType: "standard", quantity: 1 }],
        placedDaysAgo: 15,
        checkedIn: 0,
        answers: { heard: "Khác" },
      },
      {
        buyer: 9,
        status: "refunded",
        items: [{ ticketType: "standard", quantity: 1 }],
        placedDaysAgo: 19,
        answers: { heard: "Facebook" },
      },
    ],
  },
  {
    slug: "trien-lam-thi-diem-can-tho-2025",
    kind: "past",
    status: "ended",
    typeKey: "trien-lam",
    title: "Triển lãm thí điểm Cần Thơ 2025",
    format: "offline",
    start: { day: -300, time: "09:00" },
    end: { day: -298, time: "17:00" },
    venue: { name: "Đại học Cần Thơ, Khu II", address: "Đường 3/2, Quận Ninh Kiều, Cần Thơ" },
    summary: "Lần đầu tác phẩm từ vỏ hải sản của LAVIECO ra mắt công chúng.",
    description:
      "Triển lãm ba ngày trong khuôn viên trường, giới thiệu 18 tác phẩm và mô hình lớp học sáng tạo xanh đầu tiên.",
    // Approved: "N người đã tham gia" is public.
    attendance: { count: 420, approved: true },
  },
  {
    slug: "lop-hoc-sang-tao-xanh-thi-diem",
    kind: "past",
    status: "ended",
    typeKey: "workshop",
    title: "Lớp học sáng tạo xanh thí điểm tại trường tiểu học",
    format: "offline",
    start: { day: -200, time: "08:00" },
    end: { day: -200, time: "10:30" },
    venue: { name: "Một trường tiểu học tại Ninh Kiều", address: "Quận Ninh Kiều, Cần Thơ" },
    summary: "Buổi học thí điểm với 3 lớp, mỗi học sinh làm một tấm thiệp từ vỏ sò.",
    description:
      "Buổi học thí điểm giúp đội ngũ kiểm chứng giáo án: vật liệu an toàn, thời lượng phù hợp và cách kể câu chuyện chất liệu cho học sinh.",
    // Typed but not approved yet (BR-09): nothing is shown publicly, admin sees "Chờ duyệt".
    attendance: { count: 96, approved: false },
  },
  {
    slug: "workshop-giay-tai-che-da-huy",
    kind: "standard",
    status: "cancelled",
    typeKey: "workshop",
    title: "Workshop làm giấy tái chế từ bã mía",
    format: "offline",
    start: { day: 9, time: "14:00" },
    end: { day: 9, time: "16:30" },
    venue: CAN_THO_STUDIO,
    summary: "Làm giấy thủ công từ bã mía và giấy vụn. Chương trình đã huỷ.",
    description: "Từ bã mía và giấy vụn, bạn tự xeo một tờ giấy thủ công và in hoa lá lên đó.",
    cancellationReason:
      "Người hướng dẫn bị ốm đột xuất. LAVIECO sẽ thông báo lịch mới trên trang Chương trình.",
    cancellationPolicy: STANDARD_POLICY,
    cancellationRules: STANDARD_RULES,
    questions: [HEARD_FROM],
    ticketTypes: [
      { key: "standard", name: "Vé tiêu chuẩn", price: 160_000, quantity: 12, maxPerOrder: 2 },
    ],
    orders: [
      {
        buyer: 2,
        status: "paid",
        items: [{ ticketType: "standard", quantity: 2 }],
        answers: { heard: "Facebook" },
      },
      {
        buyer: 11,
        status: "paid",
        items: [{ ticketType: "standard", quantity: 1 }],
        answers: { heard: "Khác" },
      },
    ],
  },
];
