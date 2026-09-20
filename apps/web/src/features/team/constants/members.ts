import type { TeamMember } from "../types";

// Names, titles and bios come from the design prototype (docs/design/landing-page/code.html).
// TODO(consent): each person must consent to their photo being published (AC6, docs/04 §5.1).
const PHOTO_SIZE = { width: 1500, height: 2000 } as const;

export const MEMBERS: readonly TeamMember[] = [
  {
    id: "vo-chi-trong",
    number: "Nº 01",
    name: "Võ Chí Trọng",
    shortRole: "CTO · Vật liệu xanh",
    title: "CTO",
    bio: "Phụ trách hệ sinh thái công nghệ & quy trình sản xuất tuần hoàn.",
    photo: { src: "/images/team/vo-chi-trong.jpg", ...PHOTO_SIZE },
  },
  {
    id: "ngo-chuc-quynh",
    number: "Nº 02",
    name: "Ngô Chúc Quỳnh",
    shortRole: "R&D Lead",
    title: "Product & R&D Lead",
    bio: "Nghiên cứu công thức vật liệu bột sò, thử nghiệm quy chuẩn an toàn cho sản phẩm.",
    photo: { src: "/images/team/ngo-chuc-quynh.jpg", ...PHOTO_SIZE },
  },
  {
    id: "le-do-minh-vy",
    number: "Nº 03",
    name: "Lê Đỗ Minh Vy",
    shortRole: "Brand & Design",
    title: "Brand & Design Manager",
    bio: "Định hình ngôn ngữ thị giác The Living Gallery & câu chuyện văn hóa bản địa.",
    photo: { src: "/images/team/le-do-minh-vy.jpg", ...PHOTO_SIZE },
  },
  {
    id: "nguyen-dinh-xuan-anh",
    number: "Nº 04",
    name: "Nguyễn Đình Xuân Anh",
    shortRole: "Edutainment Experience",
    title: "Head of Edutainment Experience",
    bio: "Xây dựng giáo án ngoại khóa & điều phối trải nghiệm workshop cho học sinh.",
    photo: { src: "/images/team/nguyen-dinh-xuan-anh.jpg", ...PHOTO_SIZE },
  },
  {
    id: "tran-ngoc-thi",
    number: "Nº 05",
    name: "Trần Ngọc Thi",
    shortRole: "Storytelling & Community",
    title: "CCO, Storytelling Lead",
    bio: "Chắp bút cho từng câu chuyện, kết nối truyền thông giáo dục với cộng đồng.",
    photo: { src: "/images/team/tran-ngoc-thi.jpg", ...PHOTO_SIZE },
  },
  {
    id: "tieu-phung",
    number: "Nº 06",
    name: "Tiểu Phụng",
    shortRole: "CISO & Data Security",
    title: "CISO, Data & Security Lead",
    bio: "Quản trị dữ liệu số của cẩm nang, kiểm soát an toàn thông tin hệ sinh thái.",
    photo: { src: "/images/team/tieu-phung.jpg", ...PHOTO_SIZE },
  },
];
