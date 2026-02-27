<?php

require_once __DIR__ . '/sidebar.php';
require_once __DIR__ . '/header.php';
require_once __DIR__ . '/content.php';
require_once __DIR__ . '/components.php';

function renderAdminLayoutStart(array $config): void
{
    $pageTitle = $config['pageTitle'] ?? 'Admin';
    $userName = $config['userName'] ?? '';
    $currentPage = $config['currentPage'] ?? 'dashboard';
    $dir = $config['dir'] ?? 'rtl';
    $lang = $config['lang'] ?? ($dir === 'rtl' ? 'ar' : 'en');
    $htmlTitle = $config['htmlTitle'] ?? $pageTitle;

    echo '<!DOCTYPE html>';
    echo '<html lang="' . htmlspecialchars($lang, ENT_QUOTES, 'UTF-8') . '" dir="' . htmlspecialchars($dir, ENT_QUOTES, 'UTF-8') . '">';
    echo '<head>';
    echo '<meta charset="UTF-8">';
    echo '<meta name="viewport" content="width=device-width, initial-scale=1.0">';
    echo '<title>' . htmlspecialchars($htmlTitle, ENT_QUOTES, 'UTF-8') . '</title>';
    echo '<script src="https://cdn.tailwindcss.com"></script>';
    echo '<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">';
    echo '<script>';
    echo 'tailwind.config = { darkMode: "class" };';
    echo '(function(){ try { var stored = localStorage.getItem("theme"); if (stored === "dark") { document.documentElement.classList.add("dark"); } } catch(e) {} })();';
    echo '</script>';
    renderAdminComponentStyles();
    echo '</head>';
    echo '<body class="bg-slate-50 dark:bg-slate-950">';

    renderAdminSidebar($currentPage, $dir);
    renderContentWrapperStart();
    renderAdminHeader($pageTitle, $userName, $dir);
    renderPageContainerStart();
}

function renderAdminLayoutEnd(): void
{
    renderPageContainerEnd();
    renderContentWrapperEnd();

    echo '<script>';
    echo '(function(){';
    echo 'var sidebar = document.getElementById("appSidebar");';
    echo 'var sidebarToggle = document.getElementById("sidebarToggle");';
    echo 'if (sidebar && sidebarToggle) {';
    echo 'sidebarToggle.addEventListener("click", function(){ sidebar.classList.toggle("-translate-x-full"); if (document.documentElement.getAttribute("dir") === "rtl") { sidebar.classList.toggle("rtl:translate-x-full"); } });';
    echo '}';
    echo 'var themeToggle = document.getElementById("themeToggle");';
    echo 'if (themeToggle) {';
    echo 'themeToggle.addEventListener("click", function(){';
    echo 'var isDark = document.documentElement.classList.toggle("dark");';
    echo 'try { localStorage.setItem("theme", isDark ? "dark" : "light"); } catch (e) {}';
    echo '});';
    echo '}';
    echo '})();';
    echo '</script>';

    renderAdminComponentRuntimeBindings();

    echo '</body>';
    echo '</html>';
}
