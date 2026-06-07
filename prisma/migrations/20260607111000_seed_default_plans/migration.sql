INSERT INTO "plans" (
  "id", "code", "name", "description", "role", "priceVnd",
  "dailyTokenLimit", "monthlyTokenLimit", "monthlySessionLimit",
  "classLimit", "studentLimit", "assignmentLimit", "featuresJson", "isActive",
  "createdAt", "updatedAt"
)
VALUES
  (
    'plan_free_default', 'free', 'Free', 'Dùng thử cho học viên cá nhân', 'student', 0,
    15000, 120000, 5,
    NULL, NULL, NULL, '["Luyện nói AI cơ bản","Feedback tự động"]', true,
    NOW(), NOW()
  ),
  (
    'plan_student_plus_default', 'student-plus', 'Student Plus', 'Học viên luyện đều mỗi ngày', 'student', 199000,
    60000, 1200000, 100,
    NULL, NULL, NULL, '["Luyện nói AI","Lịch sử & tiến độ","Chấm điểm chi tiết"]', true,
    NOW(), NOW()
  ),
  (
    'plan_teacher_starter_default', 'teacher-starter', 'Teacher Starter', 'Giáo viên quản lý lớp nhỏ', 'teacher', 299000,
    120000, 2500000, 300,
    3, 50, 100, '["Tạo lớp","Giao bài AI","Theo dõi tiến độ","Yêu cầu luyện lại"]', true,
    NOW(), NOW()
  ),
  (
    'plan_teacher_class_default', 'teacher-class', 'Teacher Class', 'Giáo viên/nhóm lớp dùng thường xuyên', 'teacher', 599000,
    300000, 6000000, 1000,
    10, 200, 500, '["Tất cả tính năng Teacher Starter","Quota cao hơn","Nhiều lớp hơn"]', true,
    NOW(), NOW()
  )
ON CONFLICT ("code") DO UPDATE SET
  "name" = EXCLUDED."name",
  "description" = EXCLUDED."description",
  "role" = EXCLUDED."role",
  "priceVnd" = EXCLUDED."priceVnd",
  "dailyTokenLimit" = EXCLUDED."dailyTokenLimit",
  "monthlyTokenLimit" = EXCLUDED."monthlyTokenLimit",
  "monthlySessionLimit" = EXCLUDED."monthlySessionLimit",
  "classLimit" = EXCLUDED."classLimit",
  "studentLimit" = EXCLUDED."studentLimit",
  "assignmentLimit" = EXCLUDED."assignmentLimit",
  "featuresJson" = EXCLUDED."featuresJson",
  "isActive" = EXCLUDED."isActive",
  "updatedAt" = NOW();
