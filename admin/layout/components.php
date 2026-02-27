<?php

function renderAdminComponentStyles(): void
{
    echo '<style>';
    echo ':root{--app-bg:#f8fafc;--card-bg:#ffffff;--card-border:#e2e8f0;--card-shadow:0 1px 2px rgba(15,23,42,.04),0 10px 24px -16px rgba(15,23,42,.22);--focus:#2563eb;--radius:12px;--radius-sm:10px;--radius-lg:14px;--control-sm:34px;--control-md:40px;--control-lg:46px;--text-strong:#0f172a;--text-muted:#64748b;--surface:#ffffff;--surface-soft:#f8fafc;}';
    echo '.dark:root,.dark{--app-bg:#020617;--card-bg:#0b1220;--card-border:#1e293b;--card-shadow:0 1px 2px rgba(2,6,23,.35),0 10px 24px -16px rgba(2,6,23,.7);--text-strong:#e2e8f0;--text-muted:#94a3b8;--surface:#0f172a;--surface-soft:#111827;}';
    echo 'html,body{font-family:Inter,ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,"Helvetica Neue",Arial,"Noto Sans",sans-serif;}';
    echo 'body{background:var(--app-bg);}';

    echo '.ui-card{background:var(--card-bg)!important;border:1px solid var(--card-border);box-shadow:var(--card-shadow)!important;border-radius:var(--radius-lg)!important;}';
    echo '.ui-card-body{padding:1.25rem;}';

    echo '.ui-btn{display:inline-flex;align-items:center;justify-content:center;gap:.5rem;font-weight:500;border:1px solid transparent;border-radius:var(--radius-sm);transition:all .16s ease;white-space:nowrap;}';
    echo '.ui-btn-sm{height:var(--control-sm);padding:0 .75rem;font-size:.79rem;}';
    echo '.ui-btn-md{height:var(--control-md);padding:0 1rem;font-size:.86rem;}';
    echo '.ui-btn-lg{height:var(--control-lg);padding:0 1.125rem;font-size:.92rem;}';
    echo '.ui-btn-primary{background:#2563eb;color:#fff;box-shadow:0 1px 2px rgba(37,99,235,.22);} .ui-btn-primary:hover{background:#1d4ed8;}';
    echo '.ui-btn-success{background:#059669;color:#fff;box-shadow:0 1px 2px rgba(5,150,105,.22);} .ui-btn-success:hover{background:#047857;}';
    echo '.ui-btn-danger{background:#e11d48;color:#fff;box-shadow:0 1px 2px rgba(225,29,72,.22);} .ui-btn-danger:hover{background:#be123c;}';
    echo '.ui-btn-secondary{background:var(--surface);color:var(--text-strong);border-color:var(--card-border);} .ui-btn-secondary:hover{background:var(--surface-soft);}';
    echo '.ui-btn-ghost{background:transparent;color:var(--text-strong);} .ui-btn-ghost:hover{background:var(--surface-soft);}';
    echo '.ui-icon-btn{height:34px;min-width:34px;padding:0;border-radius:10px;display:inline-flex;align-items:center;justify-content:center;background:transparent;border:1px solid transparent;color:var(--text-muted);} .ui-icon-btn:hover{background:var(--surface-soft);color:var(--text-strong);border-color:var(--card-border);}';

    echo '.ui-input,.ui-select,.ui-textarea{width:100%;border:1px solid #cbd5e1;border-radius:var(--radius-sm);background:#fff;color:#0f172a;transition:all .16s ease;}';
    echo '.dark .ui-input,.dark .ui-select,.dark .ui-textarea{background:#0f172a;color:#e2e8f0;border-color:#334155;}';
    echo '.ui-input,.ui-select{height:var(--control-md);padding:0 .8rem;font-size:.87rem;}';
    echo '.ui-input-sm,.ui-select-sm{height:var(--control-sm);font-size:.8rem;}';
    echo '.ui-input-lg,.ui-select-lg{height:var(--control-lg);font-size:.92rem;}';
    echo '.ui-textarea{min-height:84px;padding:.65rem .8rem;line-height:1.45;}';
    echo '.ui-input:focus,.ui-select:focus,.ui-textarea:focus{outline:none;box-shadow:0 0 0 3px rgba(37,99,235,.15);border-color:#3b82f6;}';

    echo '.ui-table{width:100%;border-collapse:separate;border-spacing:0;}';
    echo '.ui-table thead{background:#f8fafc;} .dark .ui-table thead{background:#0f172a;}';
    echo '.ui-table th{font-size:.72rem;letter-spacing:.04em;color:#64748b;font-weight:600;padding:.8rem 1rem;border-bottom:1px solid #e2e8f0;} .dark .ui-table th{color:#94a3b8;border-color:#1e293b;}';
    echo '.ui-table td{padding:.82rem 1rem;vertical-align:middle;border-bottom:1px solid #f1f5f9;} .dark .ui-table td{border-color:#1e293b;}';
    echo '.ui-table tbody tr{transition:background-color .16s ease;}';
    echo '.ui-table tbody tr:hover{background:#f8fafc;} .dark .ui-table tbody tr:hover{background:#111827;}';

    echo '.ui-modal-overlay{background:rgba(15,23,42,.45);backdrop-filter:blur(2px);}';
    echo '.ui-modal-panel{background:var(--card-bg);border:1px solid var(--card-border);border-radius:var(--radius-lg);box-shadow:var(--card-shadow);}';
    echo '.ui-modal-header{padding-bottom:.9rem;margin-bottom:1rem;border-bottom:1px solid var(--card-border);}';

    echo '.ui-tabs{display:flex;gap:.5rem;border-bottom:1px solid var(--card-border);padding-bottom:.5rem;}';
    echo '.ui-tab{display:inline-flex;align-items:center;height:34px;padding:0 .8rem;border-radius:10px;color:var(--text-muted);font-size:.83rem;font-weight:500;}';
    echo '.ui-tab:hover{background:var(--surface-soft);color:var(--text-strong);}';
    echo '.ui-tab-active{background:#eff6ff;color:#1d4ed8;} .dark .ui-tab-active{background:#172554;color:#93c5fd;}';

    echo '.ui-empty,.ui-loading,.ui-error{border:1px dashed var(--card-border);border-radius:var(--radius);padding:1rem 1.25rem;color:var(--text-muted);background:var(--surface-soft);}';
    echo '.ui-space-y > * + *{margin-top:1.5rem;}';
    echo '</style>';
}

function renderAdminComponentRuntimeBindings(): void
{
    echo '<script>';
    echo '(function(){';
    echo 'function add(el, cls){ if(!el) return; cls.split(" ").forEach(function(c){ if(c) el.classList.add(c); }); }';

    echo 'document.querySelectorAll(".bg-white.rounded-lg.shadow").forEach(function(el){ add(el,"ui-card"); });';
    echo 'document.querySelectorAll(".bg-white.rounded-lg.shadow.p-6").forEach(function(el){ add(el,"ui-card-body"); });';

    echo 'document.querySelectorAll("table").forEach(function(el){ add(el,"ui-table"); });';

    echo 'document.querySelectorAll("input:not([type=hidden]), select, textarea").forEach(function(el){';
    echo 'if(el.tagName === "SELECT") add(el,"ui-select ui-select-md");';
    echo 'else if(el.tagName === "TEXTAREA") add(el,"ui-textarea");';
    echo 'else add(el,"ui-input ui-input-md");';
    echo '});';

    echo 'document.querySelectorAll("button, a[class*=\"bg-\"]").forEach(function(el){';
    echo 'if(el.classList.contains("ui-btn") || el.classList.contains("ui-icon-btn")) return;';
    echo 'var text = (el.textContent || "").trim();';
    echo 'var iconOnly = text === "" && el.querySelector("i");';
    echo 'if(iconOnly){ add(el,"ui-icon-btn"); return; }';
    echo 'add(el,"ui-btn ui-btn-md");';
    echo 'var c = el.className;';
    echo 'if(c.indexOf("bg-green") !== -1) add(el,"ui-btn-success");';
    echo 'else if(c.indexOf("bg-red") !== -1 || c.indexOf("text-red") !== -1) add(el,"ui-btn-danger");';
    echo 'else if(c.indexOf("bg-blue") !== -1) add(el,"ui-btn-primary");';
    echo 'else if(c.indexOf("border") !== -1) add(el,"ui-btn-secondary");';
    echo 'else add(el,"ui-btn-ghost");';
    echo '});';

    echo 'document.querySelectorAll("[id$=Modal]").forEach(function(overlay){ add(overlay,"ui-modal-overlay"); var panel = overlay.querySelector(".bg-white.rounded-lg"); if(panel) add(panel,"ui-modal-panel"); var header = overlay.querySelector(".flex.items-center.justify-between.mb-6"); if(header) add(header,"ui-modal-header"); });';

    echo '})();';
    echo '</script>';
}
