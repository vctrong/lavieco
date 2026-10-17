/** Site-wide UI copy (metadata and page chrome). */
export const SITE_TEXT = {
  vi: {
    siteName: "LAVIECO",
    metaTitle: "LAVIECO: Giáo dục mỹ thuật xanh kết hợp truyền thông",
    metaDescription:
      "Giáo dục sáng tạo xanh, thông qua nghệ thuật. LAVIECO là thương hiệu giáo dục mỹ thuật xanh kết hợp truyền thông, biến phế liệu thành tác phẩm mỹ thuật và chương trình giáo dục, bắt đầu từ vỏ hải sản, thí điểm tại Cần Thơ.",
    /** Provenance line closing every utility page (404, 500). */
    utilityFooter: "LAVIECO · 2026 · Cần Thơ",
    /** Accessible labels of the shared 6-digit code input (sign-up, checkout, ticket lookup). */
    otp: {
      groupLabel: "Mã xác thực 6 số",
      digitLabel: (index: number) => `Chữ số ${index} trên 6`,
    },
  },
} as const;
