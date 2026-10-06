// =====================================================================
// RVUI - componentes de UI modernos (toasts + confirmacao nao-bloqueante)
// Substitui window.alert / window.confirm por toasts elegantes.
// Uso:
//   RVUI.alert('mensagem')                      -> toast informativo
//   RVUI.alert('mensagem', { error: true })     -> toast de erro
//   await RVUI.confirm('mensagem')              -> Promise<boolean>
//   await RVUI.confirm('mensagem', { danger:true, confirmText:'Excluir' })
// Depende (opcional) de showToast do host; cai para toast proprio se ausente.
// =====================================================================
(function (global) {
    'use strict';

    var STYLE_ID = 'rvui-style';
    var STACK_ID = 'rvui-stack';

    function ensureStyles() {
        if (document.getElementById(STYLE_ID)) return;
        var s = document.createElement('style');
        s.id = STYLE_ID;
        s.textContent =
            '.rvui-stack{position:fixed;top:20px;right:20px;z-index:99999;display:flex;flex-direction:column;gap:10px;max-width:370px;width:calc(100% - 40px);}' +
            '.rvui-overlay{position:fixed;inset:0;z-index:100000;display:flex;align-items:center;justify-content:center;padding:20px;background:rgba(15,23,42,.45);animation:rvui-fade .18s ease;}' +
            '@keyframes rvui-fade{from{opacity:0}to{opacity:1}}' +
            '.rvui-overlay.rvui-out{animation:rvui-fade-out .18s ease forwards;}' +
            '@keyframes rvui-fade-out{to{opacity:0}}' +
            '.rvui-overlay .rvui-card{max-width:420px;width:100%;box-shadow:0 25px 60px -12px rgba(15,23,42,.5);}' +
            '.rvui-card{background:#fff;border-radius:14px;box-shadow:0 20px 45px -12px rgba(15,23,42,.35);border:1px solid #e2e8f0;overflow:hidden;animation:rvui-in .22s ease;font-family:inherit;}' +
            '@keyframes rvui-in{from{opacity:0;transform:translateY(-8px) scale(.98)}to{opacity:1;transform:none}}' +
            '.rvui-card.rvui-out{animation:rvui-out .18s ease forwards;}' +
            '@keyframes rvui-out{to{opacity:0;transform:translateY(-8px) scale(.98)}}' +
            '.rvui-bar{height:4px;background:#2563eb;}' +
            '.rvui-bar.danger{background:#dc2626;}' +
            '.rvui-bar.success{background:#16a34a;}' +
            '.rvui-body{padding:14px 16px;color:#334155;font-size:13px;font-weight:600;line-height:1.45;white-space:pre-line;}' +
            '.rvui-actions{display:flex;gap:8px;justify-content:flex-end;padding:0 16px 14px;}' +
            '.rvui-btn{border:0;cursor:pointer;font-weight:700;font-size:12px;padding:8px 15px;border-radius:9px;transition:.15s;}' +
            '.rvui-btn.cancel{background:#f1f5f9;color:#475569;}' +
            '.rvui-btn.cancel:hover{background:#e2e8f0;}' +
            '.rvui-btn.ok{background:#2563eb;color:#fff;}' +
            '.rvui-btn.ok:hover{background:#1d4ed8;}' +
            '.rvui-btn.ok.danger{background:#dc2626;}' +
            '.rvui-btn.ok.danger:hover{background:#b91c1c;}';
        document.head.appendChild(s);
    }

    function stack() {
        var w = document.getElementById(STACK_ID);
        if (!w) {
            w = document.createElement('div');
            w.id = STACK_ID;
            w.className = 'rvui-stack';
            document.body.appendChild(w);
        }
        return w;
    }

    function close(card) {
        card.classList.add('rvui-out');
        setTimeout(function () { if (card.parentNode) card.parentNode.removeChild(card); }, 180);
    }

    function buildCard(barType, msg, actionsHtml) {
        var c = document.createElement('div');
        c.className = 'rvui-card';
        c.innerHTML = '<div class="rvui-bar ' + (barType || '') + '"></div>' +
            '<div class="rvui-body"></div>' +
            (actionsHtml || '');
        c.querySelector('.rvui-body').textContent = msg;
        return c;
    }

    function toast(msg, opts) {
        opts = opts || {};
        ensureStyles();
        var c = buildCard(opts.error ? 'danger' : (opts.success ? 'success' : ''), msg, '');
        stack().appendChild(c);
        setTimeout(function () { close(c); }, opts.error ? 5000 : 3500);
        return Promise.resolve(true);
    }

    function alert(msg, opts) {
        opts = opts || {};
        if (typeof global.showToast === 'function') {
            global.showToast(msg, !!opts.error);
            return Promise.resolve(true);
        }
        ensureStyles();
        return new Promise(function (resolve) {
            var c = buildCard(opts.error ? 'danger' : '', msg,
                '<div class="rvui-actions"><button type="button" class="rvui-btn ok' + (opts.error ? ' danger' : '') + '">OK</button></div>');
            var done = function () { close(c); resolve(true); };
            c.querySelector('.rvui-btn.ok').addEventListener('click', done);
            stack().appendChild(c);
            setTimeout(done, 5000);
        });
    }

    function confirm(msg, opts) {
        opts = opts || {};
        ensureStyles();
        return new Promise(function (resolve) {
            var overlay = document.createElement('div');
            overlay.className = 'rvui-overlay';
            var c = buildCard(opts.danger ? 'danger' : '', msg,
                '<div class="rvui-actions">' +
                '<button type="button" class="rvui-btn cancel">' + (opts.cancelText || 'Cancelar') + '</button>' +
                '<button type="button" class="rvui-btn ok' + (opts.danger ? ' danger' : '') + '">' + (opts.confirmText || 'Confirmar') + '</button>' +
                '</div>');
            var done = function (v) {
                close(c);
                overlay.classList.add('rvui-out');
                setTimeout(function () { if (overlay.parentNode) overlay.parentNode.removeChild(overlay); }, 180);
                resolve(v);
            };
            c.querySelector('.rvui-btn.cancel').addEventListener('click', function () { done(false); });
            c.querySelector('.rvui-btn.ok').addEventListener('click', function () { done(true); });
            overlay.appendChild(c);
            document.body.appendChild(overlay);
        });
    }

    global.RVUI = { alert: alert, confirm: confirm, toast: toast };
})(typeof window !== 'undefined' ? window : globalThis);
