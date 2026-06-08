# GB Speaking AI

GB Speaking AI là ứng dụng luyện nói tiếng Anh bằng AI, kết hợp chat, voice input/output và phản hồi ngữ pháp.

## Tính năng chính
- Next.js 16 + React 19
- Đăng ký / đăng nhập bằng NextAuth credentials
- Prisma + PostgreSQL cho production-ready database
- Hỗ trợ OpenAI và Google Gemini
- Lưu lịch sử chat, session và usage log

## Cài đặt nhanh
```bash
npm ci
cp .env.example .env.local
# chỉnh sửa .env.local trước khi chạy
npm run prisma:dev
npm run prisma:seed || true
npm run dev
```

Mở `http://localhost:3000` và kiểm tra ứng dụng.

## Scripts
- `npm run dev` — chạy local dev server
- `npm run build` — build production
- `npm run start` — chạy build production
- `npm run lint` — kiểm tra lint
- `npm run type-check` — kiểm tra TypeScript không emit
- `npm run test` — chạy unit tests
- `npm run e2e` — chạy Playwright E2E tests
- `npm run prisma:migrate` — apply migrations production
- `npm run prisma:dev` — tạo migration local

## Cấu hình môi trường
Sao chép `.env.example` thành `.env.local` và cập nhật giá trị.

Các biến cần thiết:
- `DATABASE_URL`
- `NEXTAUTH_URL`
- `NEXTAUTH_SECRET`
- `OPENAI_API_KEY` hoặc `GEMINI_API_KEY`

Ví dụ `.env.local` cho PostgreSQL:
```env
DATABASE_URL=postgresql://user:password@localhost:5432/gb_speaking_ai
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=replace-with-a-long-random-string
OPENAI_API_KEY=sk-your-openai-api-key-here
OPENAI_MODEL=gpt-4o-mini
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_APP_NAME=GB Speaking AI
AI_RATE_LIMIT_PER_IP_PER_HOUR=20
```

## Chuẩn bị production
1. Chuyển `DATABASE_URL` sang PostgreSQL hoặc MySQL production.
2. Đặt `NEXTAUTH_URL` bằng URL production của app.
3. Đặt `NEXTAUTH_SECRET` đủ dài và đủ ngẫu nhiên.
4. Cấu hình `OPENAI_API_KEY` hoặc `GEMINI_API_KEY` trên môi trường production.
5. Nếu cần, bật rate limit qua `AI_RATE_LIMIT_PER_IP_PER_HOUR`.
6. Chạy `npm run lint && npm run type-check && npm run test && npm run build`.

Tài liệu vận hành:
- Branch/release: `docs/BRANCHING_AND_RELEASES.md`
- Neon backup: `docs/NEON_BACKUP_POLICY.md`
- Observability/Sentry: `docs/OBSERVABILITY.md`
- Release note template: `docs/RELEASE_TEMPLATE.md`

> Lưu ý: hiện dự án đã chuyển Prisma sang `postgresql` provider. Nếu bạn muốn tiếp tục dùng local dev, cần chạy PostgreSQL cục bộ hoặc sử dụng dịch vụ database trên máy.

## Kiểm tra trước deploy
- `npm run predeploy:check` không lỗi
- Nếu server đang chạy, kiểm tra tải nhẹ bằng `npm run smoke:load`
- Đăng ký/đăng nhập hoạt động chính xác
- API chat trả về phản hồi AI
- Tính năng microphone/audio hoạt động
- Môi trường production có đủ biến môi trường cần thiết

## Deploy
Ứng dụng deploy được lên Vercel hoặc bất kỳ server Node.js nào:
- Tạo PostgreSQL production trước, ví dụ Neon, Supabase, Railway, hoặc Prisma Postgres trên Vercel Marketplace.
- Trong Vercel, đặt biến môi trường `DATABASE_URL`, `NEXTAUTH_URL`, `NEXTAUTH_SECRET`, `GROQ_API_KEY`, `OPENAI_API_KEY`, `GEMINI_API_KEY`.
- Build command khuyến nghị trên Vercel: `npm run vercel-build`.
- Nếu deploy trên server khác, chạy `npm run build` rồi `npm run start`.
- Production chỉ nên deploy từ branch `main`; các thay đổi nhỏ đi qua `develop` và Pull Request trước.

### Production DB nhanh với Neon
1. Tạo project/database trên Neon.
2. Copy pooled connection string dạng `postgresql://...`.
3. Dán vào Vercel env var `DATABASE_URL`.
4. Đặt `NEXTAUTH_URL` bằng domain Vercel production.
5. Đặt `NEXTAUTH_SECRET` bằng chuỗi ngẫu nhiên dài, ví dụ `openssl rand -base64 32`.
6. Deploy với build command `npm run vercel-build`.
7. Nếu cần dữ liệu mẫu, chạy local với production URL:
   ```bash
   DATABASE_URL='postgresql://...' npm run prisma:seed
   ```

## Ghi chú
- SQLite chỉ dùng cho development/demo.
- Với production nhiều user, hãy dùng DB mạnh hơn và bảo mật môi trường.
- Không commit `NEXTAUTH_SECRET` và API key vào Git.

## CI
GitHub Actions chạy tự động khi push hoặc mở Pull Request vào `develop` và `main`.

Pipeline hiện tại:
- PostgreSQL service cho CI
- `npm ci`
- `prisma migrate deploy`
- seed dữ liệu demo
- `npm run lint`
- `npm run type-check`
- `npm test -- --run`
- `npm run build`
- `npm run e2e`

Trước khi merge `develop` vào `main`, cập nhật `CHANGELOG.md` và kiểm tra backup Neon nếu release có migration.
