// =====================================================================
// RVModals - utilidades globais de modal
//  1) Fecha qualquer modal com a tecla ESC
//  2) Protege modais de lancamento/digitacao: ao tentar fechar sem salvar
//     pergunta "Existem campos nao salvos. Tem certeza que deseja fechar?"
//     com as opcoes Sim / Cancelar.
// Depende de: RVUI (js/ui.js). Compartilhado por sistema.html e mobile.html.
// =====================================================================
(function (global) {
    'use strict';

    var GUARD_MSG = 'Existem campos não salvos. Tem certeza que deseja fechar?';

    // Modais que exigem confirmacao ao fechar com dados nao salvos.
    var GUARD_IDS = [
        'obra-form-container', 'equipe-form-container', 'fornecedor-form-container',
        'prod-form-container', 'fase-form-container', 'user-form-container',
        'terc-form-container', 'modal-expense', 'modal-revenue',
        'modal-producao-terc', 'modal-vale', 'modal-conta',
        'modal-transferencia', 'modal-ajuste', 'modal-baixa', 'modal-pagar-fatura',
        'modal-preco-manual'
    ];

    var dirty = {};
    var observer = null;

    function isGuarded(id) { return GUARD_IDS.indexOf(id) !== -1; }

    function isVisible(el) {
        if (!el) return false;
        if (el.classList.contains('hidden') || el.classList.contains('modal-hidden')) return false;
        var cs = getComputedStyle(el);
        return cs.display !== 'none' && cs.visibility !== 'hidden';
    }

    function tag(el) {
        if (!el || el.getAttribute('data-rv-modal')) return;
        el.setAttribute('data-rv-modal', '1');
        if (!observer && typeof MutationObserver !== 'undefined') {
            observer = new MutationObserver(function (muts) {
                muts.forEach(function (m) {
                    var t = m.target;
                    if (t && t.id && isGuarded(t.id) && !isVisible(t)) dirty[t.id] = false;
                });
            });
        }
        if (observer) observer.observe(el, { attributes: true, attributeFilter: ['class', 'style'] });
    }

    function registerAll(root) {
        Array.prototype.forEach.call(
            (root || document).querySelectorAll('[id^="modal-"], [id$="-form-container"], #pos-product-modal, #pos-fornecedor-modal'),
            tag
        );
    }

    function closestModal(el) {
        while (el && el !== document.body) {
            if (el.getAttribute && el.getAttribute('data-rv-modal')) return el;
            el = el.parentElement;
        }
        return null;
    }

    function openModals() {
        return Array.prototype.slice.call(document.querySelectorAll('[data-rv-modal]')).filter(isVisible);
    }

    function topModal() {
        var list = openModals();
        if (!list.length) return null;
        var best = null, bz = -1;
        list.forEach(function (el) {
            var z = parseInt(getComputedStyle(el).zIndex, 10);
            if (isNaN(z)) z = 0;
            if (z >= bz) { bz = z; best = el; }
        });
        return best;
    }

    function doClose(id) {
        var el = document.getElementById(id);
        if (!el) return;
        var mobileScheme = el.classList.contains('mobile-modal') ||
            el.classList.contains('modal-visible') || el.classList.contains('modal-hidden');
        if (mobileScheme) {
            el.classList.remove('modal-visible');
            el.classList.add('modal-hidden');
        } else {
            el.classList.add('hidden');
        }
        var overlay = el.closest ? el.closest('#overlay-forms') : null;
        if (overlay) {
            var anyVisible = Array.prototype.some.call(overlay.children, function (c) {
                return isVisible(c);
            });
            if (!anyVisible) overlay.classList.add('hidden');
        }
        if (isGuarded(id)) dirty[id] = false;
    }

    function requestClose(id) {
        var el = document.getElementById(id);
        if (!el) return;
        if (isGuarded(id) && dirty[id] && typeof global.RVUI !== 'undefined') {
            global.RVUI.confirm(GUARD_MSG, { confirmText: 'Sim', cancelText: 'Cancelar' }).then(function (ok) {
                if (ok) doClose(id);
            });
            return;
        }
        doClose(id);
    }

    function markDirty(target) {
        var m = closestModal(target);
        if (m && isGuarded(m.id)) dirty[m.id] = true;
    }

    function clearDirty(id) {
        if (id) { dirty[id] = false; }
        else { dirty = {}; }
    }

    function parseCloseTarget(code) {
        if (!code) return null;
        var m;
        m = code.match(/getElementById\(\s*['"]([^'"]+)['"]\s*\)\s*\.classList\.add\(\s*['"]hidden['"]\s*\)/);
        if (m) return m[1];
        m = code.match(/closeModal\(\s*['"]([^'"]+)['"]\s*\)/);
        if (m) return m[1];
        m = code.match(/closeOverlayForm\(\s*['"]([^'"]+)['"]\s*\)/);
        if (m) return m[1];
        if (/fecharModalSaldo\s*\(\s*\)/.test(code)) return 'modal-saldo-ponto';
        if (/fecharModalDocs\s*\(\s*\)/.test(code)) return 'modal-docs-equipe';
        if (/fecharModalVale\s*\(\s*\)/.test(code)) return 'modal-vale';
        return null;
    }

    function onKeydown(e) {
        var key = e.key || '';
        if (key !== 'Escape' && key !== 'Esc' && e.keyCode !== 27) return;

        var conf = document.querySelector('.rvui-overlay');
        if (conf) {
            var cancel = conf.querySelector('.rvui-btn.cancel');
            if (cancel) { e.preventDefault(); cancel.click(); return; }
        }
        var top = topModal();
        if (!top) return;
        e.preventDefault();
        requestClose(top.id);
    }

    function onClickCapture(e) {
        var el = e.target;
        while (el && el !== document.body) {
            if (el.getAttribute && el.getAttribute('onclick')) {
                var id = parseCloseTarget(el.getAttribute('onclick'));
                if (id && isGuarded(id)) {
                    e.preventDefault();
                    e.stopImmediatePropagation();
                    requestClose(id);
                }
                return;
            }
            el = el.parentElement;
        }
    }

    function onMouseDownCapture(e) {
        var target = e.target;
        var m = closestModal(target);
        if (m && target === m && isGuarded(m.id)) {
            e.preventDefault();
            requestClose(m.id);
            return;
        }
        if (target && target.id === 'overlay-forms') {
            var vis = Array.prototype.filter.call(target.children, isVisible);
            if (vis.length) {
                var child = vis[vis.length - 1];
                if (isGuarded(child.id)) { e.preventDefault(); requestClose(child.id); }
            }
        }
    }

    function init() {
        registerAll();
        document.addEventListener('input', function (e) { markDirty(e.target); }, true);
        document.addEventListener('change', function (e) { markDirty(e.target); }, true);
        document.addEventListener('click', onClickCapture, true);
        document.addEventListener('mousedown', onMouseDownCapture, true);
        document.addEventListener('keydown', onKeydown, true);
    }

    global.RVModals = {
        init: init,
        registerAll: registerAll,
        requestClose: requestClose,
        close: doClose,
        isGuarded: isGuarded,
        markDirty: markDirty,
        clearDirty: clearDirty
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})(typeof window !== 'undefined' ? window : globalThis);
