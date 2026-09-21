import { TEXT } from "./text";
import type { TeamContacts, TeamImage, TeamMember } from "../types";

/**
 * Single source of truth for the "Sáu người kể chuyện" grid and its profile modal.
 *
 * Names, catalogue numbers and titles come from the design prototype. Everything
 * else marked "[Mẫu]" is PLACEHOLDER content (`draft: true`) and must be replaced
 * with real, approved content before launch: see docs/runbooks/cap-nhat-noi-dung-thanh-vien.md.
 * Sample text deliberately contains no figures, years, school or place names.
 *
 * TODO(consent): each person must consent to their photo being published (AC6, docs/04 §5.1).
 * Two alpha cutouts per person, both trimmed to 1400px tall:
 * - `<slug>-nobg.webp`: borderless, used on the grid card (the card supplies the edge light).
 * - `<slug>-sticker.webp`: white-outlined, used in the open profile only (loaded lazily).
 */
const nobg = (slug: string, width: number): TeamImage => ({
  src: `/images/team/${slug}-nobg.webp`,
  width,
  height: 1400,
});

const sticker = (slug: string, width: number): TeamImage => ({
  src: `/images/team/${slug}-sticker.webp`,
  width,
  height: 1400,
});

const SAMPLE_CONTACTS: TeamContacts = { facebook: "#", email: "#" };

const SAMPLE_SKILLS = [
  { label: "[Mẫu] Kể chuyện", achievementId: "a1" },
  { label: "[Mẫu] Thiết kế", achievementId: "a2" },
  { label: "[Mẫu] Nghiên cứu", achievementId: "a3" },
  { label: "[Mẫu] Làm việc nhóm", achievementId: "a2" },
] as const;

const SAMPLE_ACHIEVEMENTS = [
  { id: "a1", text: "[Mẫu] Một thành tựu về kể chuyện, sẽ được thay bằng nội dung thật." },
  {
    id: "a2",
    text: "[Mẫu] Một thành tựu về sáng tạo cùng cộng đồng, sẽ được thay bằng nội dung thật.",
  },
  {
    id: "a3",
    text: "[Mẫu] Một thành tựu về nghiên cứu vật liệu, sẽ được thay bằng nội dung thật.",
  },
] as const;

const SAMPLE_EDUCATION = {
  school: "[Mẫu] Tên trường",
  major: "[Mẫu] Chuyên ngành",
  cohort: "[Mẫu] Khóa",
} as const;

const SAMPLE_NOTES = [
  { text: "[Mẫu] một điều ít ai biết, sẽ được viết bởi chính bạn ấy", side: "left" },
  { text: "[Mẫu] đang say mê điều gì đó", side: "right" },
] as const;

export const MEMBERS: readonly TeamMember[] = [
  {
    slug: "vo-chi-trong",
    no: "01",
    nameLines: ["Võ Chí Trọng"],
    roleShort: "CTO",
    roleFull: "Giám đốc Công nghệ",
    summary: "Phụ trách hệ sinh thái công nghệ & quy trình sản xuất tuần hoàn.",
    quote: "[Mẫu] Mình tin một mảnh vỏ sò cũng biết kể chuyện.",
    quoteHighlight: "kể chuyện",
    bio: "[Mẫu] Đoạn giới thiệu ngắn về vai trò và cách bạn ấy góp phần biến vỏ sò thành trải nghiệm học tập.",
    story:
      "[Mẫu] Câu chuyện đầu tiên khiến bạn ấy nhìn vỏ sò bằng con mắt khác, sẽ được kể bằng lời của chính bạn ấy.",
    education: SAMPLE_EDUCATION,
    hometown: "[Mẫu] Quê quán",
    location: "[Mẫu] Nơi đang sống",
    skills: SAMPLE_SKILLS,
    achievements: SAMPLE_ACHIEVEMENTS,
    notes: SAMPLE_NOTES,
    contacts: {
      facebook: "#",
      zalo: "#",
      email: "#",
      github: "#",
    },
    portraitList: nobg("vo-chi-trong", 807),
    portraitDetail: sticker("vo-chi-trong", 822),
    backdrop: "network",
    draft: true,
  },
  {
    slug: "ngo-chuc-quynh",
    no: "02",
    nameLines: ["Ngô Chúc Quỳnh"],
    roleShort: "Product & R&D Lead",
    roleFull: "Trưởng nhóm Sản phẩm & Nghiên cứu phát triển",
    summary: "Nghiên cứu công thức vật liệu bột sò, thử nghiệm quy chuẩn an toàn cho sản phẩm.",
    quote: "[Mẫu] Vật liệu tốt bắt đầu từ sự kiên nhẫn.",
    quoteHighlight: "kiên nhẫn",
    bio: "[Mẫu] Đoạn giới thiệu ngắn về công việc nghiên cứu vật liệu và thử nghiệm sản phẩm.",
    story:
      "[Mẫu] Lần đầu bạn ấy chạm vào bột vỏ sò và nhận ra nó có thể trở thành gì đó, sẽ được kể lại ở đây.",
    education: SAMPLE_EDUCATION,
    hometown: "[Mẫu] Quê quán",
    location: "[Mẫu] Nơi đang sống",
    skills: SAMPLE_SKILLS,
    achievements: SAMPLE_ACHIEVEMENTS,
    notes: SAMPLE_NOTES,
    contacts: SAMPLE_CONTACTS,
    portraitList: nobg("ngo-chuc-quynh", 1065),
    portraitDetail: sticker("ngo-chuc-quynh", 1075),
    backdrop: "particles",
    photoScale: 0.98,
    draft: true,
  },
  {
    slug: "le-do-minh-vy",
    no: "03",
    nameLines: ["Lê Đỗ Minh Vy"],
    roleShort: "Brand & Design Manager",
    roleFull: "Quản lý Thương hiệu & Thiết kế",
    summary: "Định hình ngôn ngữ thị giác The Living Gallery & câu chuyện văn hóa bản địa.",
    quote: "[Mẫu] Cái đẹp là cách ta trân trọng điều nhỏ bé.",
    quoteHighlight: "trân trọng",
    bio: "[Mẫu] Đoạn giới thiệu ngắn về cách bạn ấy giữ gìn diện mạo và giọng nói của thương hiệu.",
    story:
      "[Mẫu] Khoảnh khắc bạn ấy thấy màu của biển hiện lên trên một mảnh vỏ, sẽ được kể lại ở đây.",
    education: SAMPLE_EDUCATION,
    hometown: "[Mẫu] Quê quán",
    location: "[Mẫu] Nơi đang sống",
    skills: SAMPLE_SKILLS,
    achievements: SAMPLE_ACHIEVEMENTS,
    notes: SAMPLE_NOTES,
    contacts: { facebook: "#", email: "#", behance: "#" },
    portraitList: nobg("le-do-minh-vy", 801),
    portraitDetail: sticker("le-do-minh-vy", 821),
    backdrop: "palette",
    photoScale: 0.97,
    draft: true,
  },
  {
    slug: "nguyen-dinh-xuan-anh",
    no: "04",
    nameLines: ["Nguyễn Đình", "Xuân Anh"],
    roleShort: "Head of Edutainment Experience",
    roleFull: "Trưởng bộ phận Trải nghiệm Giáo dục giải trí",
    summary: "Xây dựng giáo án ngoại khóa & điều phối trải nghiệm workshop cho học sinh.",
    quote: "[Mẫu] Học bằng đôi tay là học bằng cả trái tim.",
    quoteHighlight: "đôi tay",
    bio: "[Mẫu] Đoạn giới thiệu ngắn về cách bạn ấy thiết kế những buổi học vui và giàu ý nghĩa.",
    story:
      "[Mẫu] Buổi workshop đầu tiên khiến bạn ấy tin vào sức mạnh của việc làm bằng tay, sẽ được kể lại ở đây.",
    education: SAMPLE_EDUCATION,
    hometown: "[Mẫu] Quê quán",
    location: "[Mẫu] Nơi đang sống",
    skills: SAMPLE_SKILLS,
    achievements: SAMPLE_ACHIEVEMENTS,
    notes: SAMPLE_NOTES,
    contacts: { facebook: "#", zalo: "#", email: "#" },
    portraitList: nobg("nguyen-dinh-xuan-anh", 740),
    portraitDetail: sticker("nguyen-dinh-xuan-anh", 753),
    backdrop: "stairs",
    photoScale: 0.98,
    draft: true,
  },
  {
    slug: "tran-ngoc-thi",
    no: "05",
    nameLines: ["Trần Ngọc Thi"],
    roleShort: "CCO, Storytelling Lead",
    roleFull: "Giám đốc Nội dung, Trưởng nhóm Kể chuyện",
    summary: "Chắp bút cho từng câu chuyện, kết nối truyền thông giáo dục với cộng đồng.",
    quote: "[Mẫu] Mỗi vỏ sò đều mang theo một câu chuyện chưa kể.",
    quoteHighlight: "câu chuyện",
    bio: "[Mẫu] Đoạn giới thiệu ngắn về cách bạn ấy tìm và kể những câu chuyện của cộng đồng.",
    story:
      "[Mẫu] Người đầu tiên kể cho bạn ấy nghe về nghề vỏ sò, và điều đó đã ở lại, sẽ được kể lại ở đây.",
    education: SAMPLE_EDUCATION,
    hometown: "[Mẫu] Quê quán",
    location: "[Mẫu] Nơi đang sống",
    skills: SAMPLE_SKILLS,
    achievements: SAMPLE_ACHIEVEMENTS,
    notes: SAMPLE_NOTES,
    contacts: { facebook: "#", email: "#", linkedin: "#" },
    portraitList: nobg("tran-ngoc-thi", 958),
    portraitDetail: sticker("tran-ngoc-thi", 979),
    backdrop: "story",
    photoScale: 0.97,
    draft: true,
  },
  {
    slug: "tieu-phung",
    no: "06",
    nameLines: ["Trần Nguyễn", "Tiểu Phụng"],
    roleShort: "CISO, Data & Security Lead",
    roleFull: "Giám đốc An toàn thông tin, Trưởng nhóm Dữ liệu & Bảo mật",
    summary: "Quản trị dữ liệu số của cẩm nang, kiểm soát an toàn thông tin hệ sinh thái.",
    quote: "[Mẫu] Giữ an toàn dữ liệu cũng là giữ gìn niềm tin.",
    quoteHighlight: "niềm tin",
    bio: "[Mẫu] Đoạn giới thiệu ngắn về cách bạn ấy bảo vệ dữ liệu của người đọc và cộng đồng.",
    story:
      "[Mẫu] Lý do bạn ấy chọn bảo vệ những thứ vô hình như dữ liệu và niềm tin, sẽ được kể lại ở đây.",
    education: SAMPLE_EDUCATION,
    hometown: "[Mẫu] Quê quán",
    location: "[Mẫu] Nơi đang sống",
    skills: SAMPLE_SKILLS,
    achievements: SAMPLE_ACHIEVEMENTS,
    notes: SAMPLE_NOTES,
    contacts: { facebook: "#", email: "#", github: "#", linkedin: "#" },
    portraitList: nobg("tieu-phung", 1328),
    portraitDetail: sticker("tieu-phung", 1327),
    backdrop: "keyhole",
    photoScale: 0.93,
    draft: true,
  },
];

export function getPhotoAlt(member: Pick<TeamMember, "nameLines" | "roleShort">): string {
  return `${getFullName(member)}, ${member.roleShort} ${TEXT.vi.photoAltOrg}`;
}

export function getFullName(member: Pick<TeamMember, "nameLines">): string {
  return member.nameLines.join(" ");
}
