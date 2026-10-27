# Unity Scene Guidelines

این فایل توضیح می‌دهد چگونه یک صحنهٔ پایه (Main) را در Unity بسازید و چه آبجکت‌هایی باید اضافه شود تا پروتوتایپ بازی سریع راه‌اندازی شود.

پله‌ها:
1. در Unity Hub یک پروژه جدید با نام SegaRiot بسازید و ورژن پیشنهادی 2022.3 LTS انتخاب کنید.
2. ایجاد Scene جدید و ذخیره با نام `Assets/Scenes/MainScene.unity`.
3. در Hierarchy آبجکت‌های زیر را اضافه کنید:
   - GameManager (Prefab or empty) -> اضافه کردن اسکریپت SegaRiot.Game.GameManager
   - NetManager -> اضافه کردن اسکریپت SegaRiot.Net.PhotonManager یا NetManager
   - Player (Prefab) -> برای تست می‌توانید یک Capsule به عنوان Player استفاده کنید و اسکریپت PlayerController به آن الصاق کنید.
   - UI Canvas -> ایجاد HUD و صفحات منو و الصاق UIManager
4. در Project → Create → Folder: Scripts, Prefabs, Scenes, Art, Audio
5. اضافه کردن Input System یا استفاده از Input قدیمی برای تست حرکت
6. برای مولتی‌پلیر: نصب Photon PUN 2 (از Asset Store یا از Package Manager از طریق شناسۀ PUN)

نکات:
- برای تست محلی، می‌توانید با باز کردن دو instance از بازی (در Editor و build) و اتصال به Photon، رفتار آنلاین را تست کنید.
- برای Voice: نصب Photon Voice و راه‌اندازی امنیتی API key در تنظیمات Photon
