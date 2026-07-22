# Production Readiness Checklist

## Local validation
- [x] Install dependencies: `npm ci`
- [x] Copy `.env.example` to `.env.local`
- [ ] Fill `GROQ_API_KEY`, `OPENAI_API_KEY`, or `GEMINI_API_KEY`
- [ ] Fill `NEXTAUTH_SECRET`
- [ ] Fill `DATABASE_URL`
- [x] Run migrations: `npm run prisma:dev`
- [x] Seed DB: `npm run prisma:seed` (thêm `prisma:seed:demo` nếu cần dữ liệu mẫu — chỉ dev)
- [x] Start dev server: `npm run dev`

## Code quality
- [x] Lint code: `npm run lint`
- [x] Type check: `npm run type-check`
- [ ] Run tests: `npm run test`
- [ ] Build production: `npm run build`

## Environment and security
- [ ] Use production PostgreSQL database, e.g. Neon/Supabase/Prisma Postgres
- [ ] Set `NEXTAUTH_URL` to production URL
- [ ] Set `NEXTAUTH_SECRET` to a strong secret
- [ ] Configure `GROQ_API_KEY`, `OPENAI_API_KEY`, or `GEMINI_API_KEY`
- [ ] Configure production rate limiting if needed
- [ ] Ensure no secrets are committed to Git
- [x] Trang đăng nhập không hiển thị tài khoản test
- [ ] Tạo admin đầu tiên qua `ADMIN_EMAIL` / `ADMIN_PASSWORD` rồi đổi mật khẩu sau lần đăng nhập đầu
- [ ] KHÔNG chạy `npm run prisma:seed:demo` trên DB production
- [ ] Xác nhận DB production không tồn tại tài khoản `*@gbspeaking.com`:
      `select email from users where email like '%@gbspeaking.com';` phải trả về 0 dòng

## Deployment
- [ ] Deploy to Vercel or Node.js host
- [ ] Set production environment variables in deployment platform
- [ ] Use build command `npm run vercel-build` on Vercel
- [ ] Validate production app loads correctly
- [ ] Test authentication and AI chat flows in production

## Post-deploy checks
- [ ] Confirm AI responses are returned correctly
- [ ] Validate microphone/audio experience
- [ ] Verify user session handling works
- [ ] Monitor logs for runtime errors
