(function () {
    const RV_VERSAO_KEY = 'rvneg_versao_em_uso';
    let _rvNovaVersao = null;
    let _rvAvisoMostrado = false;

    function rvMostrarAvisoAtualizacao() {
        if (_rvAvisoMostrado || document.getElementById('rv-update-banner')) return;
        _rvAvisoMostrado = true;
        const bar = document.createElement('div');
        bar.id = 'rv-update-banner';
        bar.style.cssText = 'position:fixed;left:50%;bottom:20px;transform:translateX(-50%);z-index:99999;display:flex;align-items:center;gap:12px;padding:10px 16px;border-radius:12px;background:#0f172a;color:#fff;box-shadow:0 10px 25px rgba(0,0,0,.35);font-size:14px;max-width:92vw;';
        const txt = document.createElement('span');
        txt.textContent = 'Nova versão disponível.';
        const btn = document.createElement('button');
        btn.textContent = 'Atualizar agora';
        btn.style.cssText = 'background:#10b981;color:#fff;border:0;border-radius:8px;padding:8px 12px;font-weight:600;cursor:pointer;white-space:nowrap;';
        btn.onclick = function () {
            try { localStorage.setItem(RV_VERSAO_KEY, _rvNovaVersao || ''); } catch (_) {}
            window.location.reload();
        };
        const x = document.createElement('button');
        x.textContent = '\u00d7';
        x.setAttribute('aria-label', 'Fechar');
        x.style.cssText = 'background:transparent;color:#94a3b8;border:0;font-size:18px;line-height:1;cursor:pointer;';
        x.onclick = function () { bar.remove(); };
        bar.appendChild(txt);
        bar.appendChild(btn);
        bar.appendChild(x);
        document.body.appendChild(bar);
    }

    async function rvChecarAtualizacao() {
        try {
            const resp = await fetch('version.json?_=' + Date.now(), { cache: 'no-store' });
            if (!resp.ok) return;
            const data = await resp.json();
            const v = data && data.v;
            if (!v) return;
            let reconhecida = null;
            try { reconhecida = localStorage.getItem(RV_VERSAO_KEY); } catch (_) {}
            if (reconhecida === null) {
                try { localStorage.setItem(RV_VERSAO_KEY, v); } catch (_) {}
                return;
            }
            if (reconhecida !== v) {
                _rvNovaVersao = v;
                rvMostrarAvisoAtualizacao();
            }
        } catch (_) {}
    }

    rvChecarAtualizacao();
    window.addEventListener('focus', rvChecarAtualizacao);
    document.addEventListener('visibilitychange', function () {
        if (document.visibilityState === 'visible') rvChecarAtualizacao();
    });
    setInterval(rvChecarAtualizacao, 5 * 60 * 1000);
})();
