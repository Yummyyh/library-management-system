R1 (2026.04.07 - 04.13)：

Reader / 学生端：
1. Authentication (login / register) — 用户认证（登录 / 注册）
2. Book search and browse — 图书搜索与浏览
3. Borrow and return books — 借书还书

Librarian / 馆员端：
1. Book CRUD (add / edit / delete) — 图书增删改查
2. Process borrow and return — 处理借书还书

Admin / 管理员端：
1. User CRUD (create / edit / deactivate) — 用户增删改查
2. Role assignment (Student / Librarian / Admin) — 角色分配



R2 (2026.04.26 - 05.11)：

Reader / 学生端：
1. Book catalog with search and pagination — 带搜索分页的图书目录
2. Book detail page with availability — 含可借状态的图书详情页
3. My borrowing history — 我的借阅记录
4. Overdue alert notifications — 逾期提醒通知
5. Hold reservation notifications — 预约通知

Librarian / 馆员端：
1. ISBN auto-lookup for book info — ISBN 自动查询图书信息
2. Barcode generation and batch printing — 条形码生成与批量打印
3. Overdue loan management page — 逾期借阅管理页
4. Expandable barcode rows in book list — 图书列表行内条形码展开

Admin / 管理员端：
1. UI English translation — 界面英文化
2. Database schema upgrade — 数据库架构升级



R3 (2026.05.24 - 06.07)：

Reader / 学生端：
1. Fine list with Alipay QR simulated payment — 罚款列表与支付宝二维码模拟支付
2. Book reservation / hold with status tracking — 图书预约与状态追踪
3. Loan renewal — 借阅续期
4. Notification dialog with type-based styling (Overdue / Ready / Cancelled) — 按类型区分样式的通知弹窗
5. Barcode zoom on book detail page — 图书详情页条形码放大

Librarian / 馆员端：
1. Print queue (batch collect barcodes across books) — 打印暂存区（跨图书批量条形码）
2. Inline barcode expansion with lightbox — 行内条形码展开与放大灯箱
3. Return page with searchable loan list — 带搜索的还书页借阅列表
4. Reservation management page — 预约管理页

Admin / 管理员端：
1. System configuration (General / Borrowing Limits / Backup / Audit Log) — 系统配置（通用 / 借阅限额 / 备份 / 审计日志）
2. Config sync to borrow / return business logic — 配置同步至借还业务逻辑
3. Dashboa 数字化看板
