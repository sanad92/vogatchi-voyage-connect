<?php

function renderAdminComponentStyles(): void
{
    echo '<style>';
    echo ':root{--app-bg:#f8fafc;--card-bg:#ffffff;--card-border:#e2e8f0;--card-shadow:0 1px 2px rgba(15,23,42,.04),0 10px 24px -16px rgba(15,23,42,.22);--focus:#2563eb;--radius:12px;--radius-sm:10px;--radius-lg:14px;--control-sm:34px;--control-md:40px;--control-lg:46px;--text-strong:#0f172a;--text-muted:#64748b;--surface:#ffffff;--surface-soft:#f8fafc;--transition-fast:140ms cubic-bezier(.2,.8,.2,1);--transition-base:220ms cubic-bezier(.2,.8,.2,1);}';
    echo '.dark:root,.dark{--app-bg:#020617;--card-bg:#0b1220;--card-border:#1e293b;--card-shadow:0 1px 2px rgba(2,6,23,.35),0 10px 24px -16px rgba(2,6,23,.7);--text-strong:#e2e8f0;--text-muted:#94a3b8;--surface:#0f172a;--surface-soft:#111827;}';
    echo 'html,body{font-family:Inter,ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,"Helvetica Neue",Arial,"Noto Sans",sans-serif;max-width:100%;overflow-x:hidden;}';
    echo 'body{background:var(--app-bg);}';

    echo '.ui-card{background:var(--card-bg)!important;border:1px solid var(--card-border);box-shadow:var(--card-shadow)!important;border-radius:var(--radius-lg)!important;transition:transform var(--transition-base),box-shadow var(--transition-base),border-color var(--transition-base);}';
    echo '.ui-card:hover{transform:translateY(-1px);box-shadow:0 2px 6px rgba(15,23,42,.06),0 18px 32px -22px rgba(15,23,42,.34)!important;}';
    echo '.dark .ui-card:hover{box-shadow:0 2px 6px rgba(2,6,23,.45),0 18px 32px -22px rgba(2,6,23,.85)!important;}';
    echo '.ui-card-body{padding:1.2rem;}';
    echo '.ui-card .flex.items-center{gap:.75rem;}';

    echo '.ui-btn{display:inline-flex;align-items:center;justify-content:center;gap:.5rem;font-weight:500;border:1px solid transparent;border-radius:var(--radius-sm);transition:transform var(--transition-fast),background-color var(--transition-fast),border-color var(--transition-fast),box-shadow var(--transition-fast),color var(--transition-fast);white-space:nowrap;}';
    echo '.ui-btn:hover{transform:translateY(-1px);} .ui-btn:active{transform:translateY(0);}';
    echo '.ui-btn-sm{height:var(--control-sm);padding:0 .75rem;font-size:.79rem;}';
    echo '.ui-btn-md{height:var(--control-md);padding:0 1rem;font-size:.86rem;}';
    echo '.ui-btn-lg{height:var(--control-lg);padding:0 1.125rem;font-size:.92rem;}';
    echo '.ui-btn-primary{background:#2563eb;color:#fff;box-shadow:0 1px 2px rgba(37,99,235,.22);} .ui-btn-primary:hover{background:#1d4ed8;box-shadow:0 6px 12px -8px rgba(37,99,235,.6);}';
    echo '.ui-btn-success{background:#059669;color:#fff;box-shadow:0 1px 2px rgba(5,150,105,.22);} .ui-btn-success:hover{background:#047857;box-shadow:0 6px 12px -8px rgba(5,150,105,.58);}';
    echo '.ui-btn-danger{background:#e11d48;color:#fff;box-shadow:0 1px 2px rgba(225,29,72,.22);} .ui-btn-danger:hover{background:#be123c;box-shadow:0 6px 12px -8px rgba(225,29,72,.58);}';
    echo '.ui-btn-secondary{background:var(--surface);color:var(--text-strong);border-color:var(--card-border);} .ui-btn-secondary:hover{background:var(--surface-soft);}';
    echo '.ui-btn-ghost{background:transparent;color:var(--text-strong);} .ui-btn-ghost:hover{background:var(--surface-soft);}';
    echo '.ui-icon-btn{height:34px;min-width:34px;padding:0;border-radius:10px;display:inline-flex;align-items:center;justify-content:center;background:transparent;border:1px solid transparent;color:var(--text-muted);transition:all var(--transition-fast);} .ui-icon-btn:hover{background:var(--surface-soft);color:var(--text-strong);border-color:var(--card-border);transform:translateY(-1px);}';

    echo '.ui-input,.ui-select,.ui-textarea{width:100%;border:1px solid #cbd5e1;border-radius:var(--radius-sm);background:#fff;color:#0f172a;transition:border-color var(--transition-fast),box-shadow var(--transition-fast),background-color var(--transition-fast);}';
    echo '.dark .ui-input,.dark .ui-select,.dark .ui-textarea{background:#0f172a;color:#e2e8f0;border-color:#334155;}';
    echo '.ui-input,.ui-select{height:var(--control-md);padding:0 .8rem;font-size:.87rem;}';
    echo '.ui-input-sm,.ui-select-sm{height:var(--control-sm);font-size:.8rem;}';
    echo '.ui-input-lg,.ui-select-lg{height:var(--control-lg);font-size:.92rem;}';
    echo '.ui-textarea{min-height:84px;padding:.65rem .8rem;line-height:1.45;}';
    echo '.ui-input:focus,.ui-select:focus,.ui-textarea:focus{outline:none;box-shadow:0 0 0 3px rgba(37,99,235,.15);border-color:#3b82f6;}';

    echo '.ui-table-wrap{position:relative;overflow-x:auto;max-width:100%;border-radius:var(--radius-lg);}';
    echo '.ui-table{width:100%;min-width:980px;border-collapse:separate;border-spacing:0;}';
    echo '.ui-table thead{background:#f8fafc;} .dark .ui-table thead{background:#0f172a;}';
    echo '.ui-table thead th{position:sticky;top:0;z-index:10;background:inherit;}';
    echo '.ui-table th{font-size:.72rem;letter-spacing:.04em;color:#64748b;font-weight:600;padding:.82rem 1rem;border-bottom:1px solid #e2e8f0;white-space:nowrap;} .dark .ui-table th{color:#94a3b8;border-color:#1e293b;}';
    echo '.ui-table td{padding:.9rem 1rem;vertical-align:middle;border-bottom:1px solid #f1f5f9;color:var(--text-strong);} .dark .ui-table td{border-color:#1e293b;}';
    echo '.ui-table tbody tr{transition:background-color var(--transition-fast),transform var(--transition-fast);}';
    echo '.ui-table tbody tr:hover{background:#f8fafc;} .dark .ui-table tbody tr:hover{background:#111827;}';
    echo '.ui-col-start{text-align:start;} .ui-col-center{text-align:center;} .ui-col-end{text-align:end;}';
    echo '.ui-table-footer{display:flex;align-items:center;justify-content:space-between;gap:1rem;padding:.9rem 1rem;border-top:1px solid var(--card-border);background:var(--surface);}';

    echo '.ui-badge{display:inline-flex;align-items:center;gap:.35rem;border:1px solid transparent;border-radius:9999px;padding:.22rem .62rem;font-size:.72rem;font-weight:600;line-height:1.15;}';
    echo '.ui-badge-neutral{background:#f1f5f9;color:#475569;border-color:#e2e8f0;} .dark .ui-badge-neutral{background:#1e293b;color:#cbd5e1;border-color:#334155;}';
    echo '.ui-badge-success{background:#ecfdf5;color:#047857;border-color:#a7f3d0;} .dark .ui-badge-success{background:#064e3b;color:#6ee7b7;border-color:#065f46;}';
    echo '.ui-badge-warning{background:#fffbeb;color:#b45309;border-color:#fde68a;} .dark .ui-badge-warning{background:#78350f;color:#fcd34d;border-color:#92400e;}';
    echo '.ui-badge-danger{background:#fff1f2;color:#be123c;border-color:#fecdd3;} .dark .ui-badge-danger{background:#881337;color:#fda4af;border-color:#9f1239;}';
    echo '.ui-badge-info{background:#eff6ff;color:#1d4ed8;border-color:#bfdbfe;} .dark .ui-badge-info{background:#172554;color:#93c5fd;border-color:#1d4ed8;}';

    echo '.ui-row-actions{position:relative;display:inline-flex;}';
    echo '.ui-action-trigger{height:34px;width:34px;padding:0;}';
    echo '.ui-action-menu{position:absolute;inset-inline-end:0;top:calc(100% + .25rem);min-width:10rem;background:var(--surface);border:1px solid var(--card-border);border-radius:10px;box-shadow:var(--card-shadow);padding:.35rem;display:none;z-index:30;}';
    echo '.ui-action-menu.open{display:block;}';
    echo '.ui-action-item{display:flex;align-items:center;gap:.5rem;width:100%;padding:.45rem .55rem;border-radius:8px;font-size:.8rem;color:var(--text-strong);text-align:start;transition:all var(--transition-fast);}';
    echo '.ui-action-item:hover{background:var(--surface-soft);transform:translateX(-1px);}';
    echo '.ui-action-item-danger{color:#be123c;} .dark .ui-action-item-danger{color:#fda4af;}';

    echo '.ui-table-skeleton{display:none;}';
    echo '.ui-skeleton-row{display:grid;grid-template-columns:2fr 1.3fr 1.3fr 1fr .8fr;gap:.75rem;padding:.8rem 1rem;border-bottom:1px solid #f1f5f9;} .dark .ui-skeleton-row{border-color:#1e293b;}';
    echo '.ui-skeleton-line{height:.85rem;border-radius:999px;background:linear-gradient(90deg,#e2e8f0 25%,#f1f5f9 50%,#e2e8f0 75%);background-size:200% 100%;animation:uiShimmer 1.2s linear infinite;}';
    echo '.dark .ui-skeleton-line{background:linear-gradient(90deg,#1e293b 25%,#334155 50%,#1e293b 75%);background-size:200% 100%;}';
    echo '@keyframes uiShimmer{0%{background-position:200% 0;}100%{background-position:-200% 0;}}';
    echo '.js-loading .ui-table-wrap{display:none;}';
    echo '.js-loading .ui-table-skeleton{display:block;}';

    echo '.ui-modal-overlay{background:rgba(15,23,42,.45);backdrop-filter:blur(2px);}';
    echo '.ui-modal-panel{background:var(--card-bg);border:1px solid var(--card-border);border-radius:var(--radius-lg);box-shadow:var(--card-shadow);animation:uiPopIn var(--transition-base);}';
    echo '.ui-modal-header{padding-bottom:.9rem;margin-bottom:1rem;border-bottom:1px solid var(--card-border);}';

    echo '.ui-tabs{display:flex;gap:.5rem;border-bottom:1px solid var(--card-border);padding-bottom:.5rem;}';
    echo '.ui-tab{display:inline-flex;align-items:center;height:34px;padding:0 .8rem;border-radius:10px;color:var(--text-muted);font-size:.83rem;font-weight:500;}';
    echo '.ui-tab:hover{background:var(--surface-soft);color:var(--text-strong);}';
    echo '.ui-tab-active{background:#eff6ff;color:#1d4ed8;} .dark .ui-tab-active{background:#172554;color:#93c5fd;}';

    echo '.ui-empty,.ui-loading,.ui-error{border:1px dashed var(--card-border);border-radius:var(--radius);padding:1rem 1.25rem;color:var(--text-muted);background:var(--surface-soft);}';
    echo '.ui-empty-icon{font-size:1.1rem;opacity:.65;margin-inline-end:.35rem;}';
    echo '.ui-helper-text{margin-top:.35rem;font-size:.76rem;color:var(--text-muted);}';
    echo '.ui-field-error{margin-top:.3rem;font-size:.73rem;color:#be123c;display:none;} .dark .ui-field-error{color:#fda4af;}';
    echo '.ui-invalid{border-color:#e11d48 !important;box-shadow:0 0 0 3px rgba(225,29,72,.12)!important;}';

    echo '.ui-loading-overlay{position:fixed;inset:0;z-index:80;background:rgba(2,6,23,.35);backdrop-filter:blur(2px);display:none;align-items:center;justify-content:center;padding:1rem;}';
    echo '.ui-loading-overlay.show{display:flex;}';
    echo '.ui-loading-card{display:flex;align-items:center;gap:.75rem;background:var(--surface);border:1px solid var(--card-border);border-radius:12px;padding:.85rem 1rem;box-shadow:var(--card-shadow);font-size:.86rem;color:var(--text-strong);}';
    echo '.ui-spinner{width:16px;height:16px;border-radius:9999px;border:2px solid #cbd5e1;border-top-color:#2563eb;animation:uiSpin .8s linear infinite;}';
    echo '@keyframes uiSpin{to{transform:rotate(360deg);}}';

    echo '.ui-toast-stack{position:fixed;z-index:90;inset-inline-start:1rem;bottom:1rem;display:flex;flex-direction:column;gap:.5rem;max-width:min(92vw,360px);}';
    echo '.ui-toast{display:flex;align-items:flex-start;gap:.6rem;background:var(--surface);border:1px solid var(--card-border);border-radius:12px;padding:.7rem .8rem;box-shadow:var(--card-shadow);font-size:.82rem;color:var(--text-strong);animation:uiSlideIn var(--transition-base);}';
    echo '.ui-toast-success{border-color:#86efac;} .dark .ui-toast-success{border-color:#166534;}';
    echo '.ui-toast-error{border-color:#fda4af;} .dark .ui-toast-error{border-color:#9f1239;}';
    echo '.ui-toast-info{border-color:#93c5fd;} .dark .ui-toast-info{border-color:#1e40af;}';

    echo '.ui-confirm-overlay{position:fixed;inset:0;z-index:85;background:rgba(2,6,23,.45);backdrop-filter:blur(2px);display:none;align-items:center;justify-content:center;padding:1rem;}';
    echo '.ui-confirm-overlay.show{display:flex;}';
    echo '.ui-confirm-card{width:min(100%,420px);background:var(--surface);border:1px solid var(--card-border);border-radius:14px;box-shadow:var(--card-shadow);padding:1rem;animation:uiPopIn var(--transition-base);}';
    echo '.ui-confirm-title{font-size:.95rem;font-weight:600;color:var(--text-strong);}';
    echo '.ui-confirm-text{margin-top:.4rem;font-size:.83rem;color:var(--text-muted);line-height:1.5;}';
    echo '.ui-confirm-actions{display:flex;justify-content:flex-end;gap:.5rem;margin-top:1rem;}';

    echo '.ui-space-y > * + *{margin-top:1.5rem;}';
    echo '.ui-entrance{animation:uiFadeUp var(--transition-base) both;}';
    echo '.ui-sidebar-backdrop{position:fixed;inset:0;z-index:35;background:rgba(2,6,23,.32);backdrop-filter:blur(1px);opacity:0;pointer-events:none;transition:opacity var(--transition-base);}';
    echo '.ui-sidebar-backdrop.show{opacity:1;pointer-events:auto;}';

    echo 'a:focus-visible,button:focus-visible,[role="button"]:focus-visible,input:focus-visible,select:focus-visible,textarea:focus-visible{outline:none;box-shadow:0 0 0 3px rgba(37,99,235,.18),0 0 0 1px rgba(37,99,235,.45);}';
    echo '@keyframes uiFadeUp{from{opacity:0;transform:translateY(6px);}to{opacity:1;transform:translateY(0);}}';
    echo '@keyframes uiSlideIn{from{opacity:0;transform:translateY(8px);}to{opacity:1;transform:translateY(0);}}';
    echo '@keyframes uiPopIn{from{opacity:0;transform:scale(.985);}to{opacity:1;transform:scale(1);}}';
    echo '@media (prefers-reduced-motion: reduce){*,*::before,*::after{animation:none!important;transition:none!important;scroll-behavior:auto!important;}}';
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
    echo 'document.querySelectorAll(".overflow-x-auto").forEach(function(el){ add(el,"ui-table-wrap"); });';

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

    echo 'document.querySelectorAll("[data-action-trigger]").forEach(function(btn){';
    echo 'btn.addEventListener("click", function(e){ e.stopPropagation(); var menu = document.getElementById(btn.getAttribute("data-action-trigger")); if(!menu) return; document.querySelectorAll(".ui-action-menu.open").forEach(function(openMenu){ if(openMenu !== menu) openMenu.classList.remove("open"); }); menu.classList.toggle("open"); });';
    echo '});';
    echo 'document.addEventListener("click", function(){ document.querySelectorAll(".ui-action-menu.open").forEach(function(menu){ menu.classList.remove("open"); }); });';

    echo 'if(!document.getElementById("globalLoadingOverlay")){';
    echo 'var loading = document.createElement("div"); loading.id = "globalLoadingOverlay"; loading.className = "ui-loading-overlay";';
    echo 'loading.innerHTML = "<div class=\"ui-loading-card\"><span class=\"ui-spinner\"></span><span id=\"globalLoadingText\">جاري التنفيذ...</span></div>";';
    echo 'document.body.appendChild(loading);';
    echo '}';

    echo 'if(!document.getElementById("uiToastStack")){ var stack = document.createElement("div"); stack.id = "uiToastStack"; stack.className = "ui-toast-stack"; document.body.appendChild(stack); }';

    echo 'if(!document.getElementById("uiConfirmDialog")){';
    echo 'var confirmEl = document.createElement("div"); confirmEl.id = "uiConfirmDialog"; confirmEl.className = "ui-confirm-overlay";';
    echo 'confirmEl.innerHTML = "<div class=\"ui-confirm-card\"><h3 id=\"uiConfirmTitle\" class=\"ui-confirm-title\">تأكيد الإجراء</h3><p id=\"uiConfirmText\" class=\"ui-confirm-text\">هل أنت متأكد من المتابعة؟</p><div class=\"ui-confirm-actions\"><button type=\"button\" id=\"uiConfirmCancel\" class=\"ui-btn ui-btn-sm ui-btn-secondary\">إلغاء</button><button type=\"button\" id=\"uiConfirmOk\" class=\"ui-btn ui-btn-sm ui-btn-danger\">تأكيد</button></div></div>";';
    echo 'document.body.appendChild(confirmEl);';
    echo '}';

    echo 'window.setGlobalLoading = function(show, text){ var overlay = document.getElementById("globalLoadingOverlay"); var label = document.getElementById("globalLoadingText"); if(!overlay) return; if(label && text) label.textContent = text; overlay.classList[show ? "add" : "remove"]("show"); };';
    echo 'window.showToast = function(message, type){ var stack = document.getElementById("uiToastStack"); if(!stack || !message) return; var toast = document.createElement("div"); var variant = "ui-toast-info"; if(type === "success") variant = "ui-toast-success"; else if(type === "error") variant = "ui-toast-error"; toast.className = "ui-toast " + variant; toast.innerHTML = "<i class=\"fa-solid fa-circle-info mt-0.5\"></i><span>" + String(message) + "</span>"; stack.appendChild(toast); setTimeout(function(){ toast.style.opacity = "0"; toast.style.transform = "translateY(6px)"; }, 2600); setTimeout(function(){ toast.remove(); }, 3200); };';
    echo 'window.showConfirmDialog = function(options){ options = options || {}; return new Promise(function(resolve){ var root = document.getElementById("uiConfirmDialog"); var title = document.getElementById("uiConfirmTitle"); var text = document.getElementById("uiConfirmText"); var ok = document.getElementById("uiConfirmOk"); var cancel = document.getElementById("uiConfirmCancel"); if(!root || !ok || !cancel) return resolve(false); title.textContent = options.title || "تأكيد الإجراء"; text.textContent = options.text || "هل أنت متأكد من المتابعة؟"; ok.textContent = options.confirmText || "تأكيد"; cancel.textContent = options.cancelText || "إلغاء"; function cleanup(result){ root.classList.remove("show"); ok.removeEventListener("click", onOk); cancel.removeEventListener("click", onCancel); root.removeEventListener("click", onBackdrop); resolve(result); } function onOk(){ cleanup(true); } function onCancel(){ cleanup(false); } function onBackdrop(e){ if(e.target === root) cleanup(false); } ok.addEventListener("click", onOk); cancel.addEventListener("click", onCancel); root.addEventListener("click", onBackdrop); root.classList.add("show"); }); };';

    echo 'window.setButtonLoading = function(button, loading){ if(!button) return; if(loading){ button.dataset.originalText = button.innerHTML; button.disabled = true; button.innerHTML = "<span class=\"ui-spinner\"></span><span>جاري التنفيذ...</span>"; } else { button.disabled = false; if(button.dataset.originalText){ button.innerHTML = button.dataset.originalText; } } };';
    echo 'window.validateField = function(field){ if(!field) return true; var error = field.parentElement ? field.parentElement.querySelector(".ui-field-error") : null; var value = (field.value || "").trim(); var valid = true; var message = ""; if(field.hasAttribute("required") && value === ""){ valid = false; message = "هذا الحقل مطلوب"; } if(valid && field.type === "email" && value !== ""){ var emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/; if(!emailPattern.test(value)){ valid = false; message = "يرجى إدخال بريد إلكتروني صحيح"; } } if(valid && field.type === "tel" && value !== "" && value.length < 8){ valid = false; message = "يرجى إدخال رقم هاتف صحيح"; } field.classList.toggle("ui-invalid", !valid); if(error){ error.textContent = message; error.style.display = valid ? "none" : "block"; } return valid; };';
    echo 'window.validateFormInline = function(form){ if(!form) return true; var fields = form.querySelectorAll("input, select, textarea"); var isValid = true; fields.forEach(function(field){ if(!window.validateField(field)){ isValid = false; } }); return isValid; };';

    echo 'document.querySelectorAll("form").forEach(function(form){ form.setAttribute("novalidate", "novalidate"); form.querySelectorAll("input,select,textarea").forEach(function(field){ field.addEventListener("blur", function(){ window.validateField(field); }); field.addEventListener("input", function(){ if(field.classList.contains("ui-invalid")){ window.validateField(field); } }); }); });';
    echo 'document.querySelectorAll("section,.ui-card,.ui-table-wrap").forEach(function(el,index){ el.classList.add("ui-entrance"); el.style.animationDelay = Math.min(index * 28, 220) + "ms"; });';

    echo 'if (document.documentElement.classList.contains("js-loading")) { document.documentElement.classList.remove("js-loading"); }';
    echo '})();';
    echo '</script>';
}
