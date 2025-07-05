<?php
require_once 'config/database.php';
require_once 'classes/Database.php';
require_once 'classes/Auth.php';

$auth = new Auth();

if ($_POST) {
    try {
        if ($auth->login($_POST['email'], $_POST['password'])) {
            header('Location: /admin/dashboard.php');
            exit;
        } else {
            $error = "البريد الإلكتروني أو كلمة المرور غير صحيحة";
        }
    } catch (Exception $e) {
        $error = $e->getMessage();
    }
}
?>
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>تسجيل الدخول - Vogatchi Travel</title>
    <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-gray-100 min-h-screen flex items-center justify-center">
    <div class="max-w-md w-full bg-white rounded-lg shadow-md p-8">
        <div class="text-center mb-8">
            <h1 class="text-2xl font-bold text-gray-900">تسجيل الدخول</h1>
            <p class="text-gray-600 mt-2">نظام إدارة السياحة</p>
        </div>

        <?php if (isset($error)): ?>
        <div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            <?php echo $error; ?>
        </div>
        <?php endif; ?>

        <form method="POST" class="space-y-6">
            <div>
                <label class="block text-gray-700 font-semibold mb-2">البريد الإلكتروني</label>
                <input type="email" name="email" required class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
            </div>
            
            <div>
                <label class="block text-gray-700 font-semibold mb-2">كلمة المرور</label>
                <input type="password" name="password" required class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
            </div>
            
            <button type="submit" class="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 px-6 rounded-lg font-semibold">
                تسجيل الدخول
            </button>
        </form>

        <div class="mt-6 text-center">
            <a href="/" class="text-blue-600 hover:text-blue-800">العودة للصفحة الرئيسية</a>
        </div>
    </div>
</body>
</html>