/* ============================================================
   paywall.js — gestion du paiement et du déblocage des PDF
   Inclure avec : <script src="paywall.js"></script>
   Ne contient AUCUNE clé secrète : tout le secret reste côté serveur (/api).
   ============================================================ */
(function(){
  "use strict";

  // Formules en vente (doit correspondre aux prix de /api/create-checkout.js)
  var PRODUCTS = {
    fiche:  { label:"1 fiche de paie",           price:"10 €", grants:{ fiche:1 } },
    bundle: { label:"Pack 3 fiches + 1 contrat", price:"50 €", grants:{ fiche:3, contrat:1 } }
  };

  var KEY = "pp_credits_v1";
  function read(){ try{ return JSON.parse(localStorage.getItem(KEY)) || {}; }catch(e){ return {}; } }
  function write(c){ try{ localStorage.setItem(KEY, JSON.stringify(c)); }catch(e){} }
  function credits(type){ return read()[type] || 0; }
  function addProduct(p){
    var def = PRODUCTS[p]; if(!def) return;
    var c = read();
    for(var k in def.grants){ c[k] = (c[k]||0) + def.grants[k]; }
    write(c);
  }
  function consume(type){
    var c = read();
    if((c[type]||0) > 0){ c[type]--; write(c); return true; }
    return false;
  }

  async function checkout(product){
    try{
      var r = await fetch("/api/create-checkout", {
        method:"POST", headers:{ "Content-Type":"application/json" },
        body: JSON.stringify({ product: product })
      });
      var d = await r.json();
      if(d && d.url){ window.location.href = d.url; }
      else { alert("Erreur de paiement : " + ((d && d.error) || "inconnue")); }
    }catch(e){
      alert("Le paiement ne fonctionne qu'une fois le site mis en ligne avec votre clé Stripe (voir README).");
    }
  }

  /* ---------- styles injectés ---------- */
  var css = ""
  + ".pp-protect{position:absolute;inset:0;z-index:6;display:none;align-items:flex-start;justify-content:center;padding:30px 16px;}"
  + ".pp-lock{background:rgba(255,255,255,.96);border:1px solid #cdd6e3;border-radius:14px;padding:20px 24px;text-align:center;max-width:300px;box-shadow:0 14px 44px rgba(10,20,35,.22);color:#0e2342;}"
  + ".pp-lock svg{color:#2c3a4f;}"
  + ".pp-lock-t{font-weight:700;font-size:15px;margin-top:8px;color:#16202e;}"
  + ".pp-lock-s{font-size:12.5px;color:#5d6b7e;margin-top:5px;line-height:1.45;}"
  + ".pp-modal{position:fixed;inset:0;z-index:99999;background:rgba(10,20,35,.55);display:none;align-items:center;justify-content:center;padding:20px;font-family:ui-sans-serif,-apple-system,'Segoe UI',Roboto,sans-serif;}"
  + ".pp-modal.open{display:flex;}"
  + ".pp-card{background:#fff;border-radius:14px;max-width:440px;width:100%;padding:24px;box-shadow:0 24px 70px rgba(10,20,35,.45);}"
  + ".pp-card h3{margin:0 0 4px;font-size:18px;color:#0e2342;}"
  + ".pp-card .pp-sub{margin:0 0 16px;font-size:13px;color:#5d6b7e;line-height:1.5;}"
  + ".pp-opt{display:flex;justify-content:space-between;align-items:center;border:2px solid #cdd6e3;border-radius:10px;padding:13px 15px;margin-bottom:10px;cursor:pointer;transition:border-color .12s,background .12s;}"
  + ".pp-opt:hover{background:#f5f8fe;}"
  + ".pp-opt .l{font-weight:600;color:#16202e;font-size:14px;}"
  + ".pp-opt .pr{font-weight:800;color:#2563c9;font-size:17px;}"
  + ".pp-att{display:flex;gap:9px;align-items:flex-start;font-size:12px;color:#46535f;line-height:1.45;margin:8px 0 14px;cursor:pointer;}"
  + ".pp-att input{margin-top:2px;flex:0 0 auto;}"
  + ".pp-buy{width:100%;border:0;border-radius:9px;background:#2563c9;color:#fff;font-weight:600;font-size:14px;padding:12px;cursor:pointer;}"
  + ".pp-buy:disabled{opacity:.45;cursor:not-allowed;}"
  + ".pp-x{background:none;border:0;color:#94a1b2;font-size:13px;cursor:pointer;margin-top:10px;width:100%;}";
  var st = document.createElement("style"); st.textContent = css; document.head.appendChild(st);

  /* ---------- protection de l'aperçu : floutage ---------- */
  function mountWatermark(el){
    if(!el) return { show:function(){}, hide:function(){} };
    el.style.position = "relative";
    var ov = document.createElement("div"); ov.className = "pp-protect"; ov.setAttribute("aria-hidden","true");
    ov.innerHTML =
      "<div class='pp-lock'>"
      + "<svg width='30' height='30' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round'><rect x='4' y='10.5' width='16' height='9.5' rx='2'/><path d='M8 10.5V7a4 4 0 0 1 8 0v3.5'/></svg>"
      + "<div class='pp-lock-t'>Aper\u00e7u prot\u00e9g\u00e9</div>"
      + "<div class='pp-lock-s'>T\u00e9l\u00e9chargez le document pour obtenir la version nette et compl\u00e8te.</div>"
      + "</div>";
    el.appendChild(ov);
    function setProtected(on){
      var kids = el.children;
      for(var i=0;i<kids.length;i++){
        if(kids[i]===ov) continue;
        kids[i].style.filter = on ? "blur(6px)" : "";
        kids[i].style.webkitFilter = on ? "blur(6px)" : "";
        kids[i].style.userSelect = on ? "none" : "";
        kids[i].style.webkitUserSelect = on ? "none" : "";
        kids[i].style.pointerEvents = on ? "none" : "";
      }
      ov.style.display = on ? "flex" : "none";
    }
    return { show:function(){ setProtected(true); }, hide:function(){ setProtected(false); } };
  }

  /* ---------- fenêtre d'achat ---------- */
  var modalEl = null, picked = "fiche";
  function buildModal(){
    modalEl = document.createElement("div"); modalEl.className = "pp-modal";
    modalEl.innerHTML =
      "<div class='pp-card'>"
      + "<h3>D\u00e9bloquer le t\u00e9l\u00e9chargement</h3>"
      + "<p class='pp-sub'>Votre document est pr\u00eat. Choisissez une formule pour t\u00e9l\u00e9charger le PDF net et complet.</p>"
      + "<div class='pp-opt' data-p='fiche'><span class='l'>1 fiche de paie</span><span class='pr'>10 \u20ac</span></div>"
      + "<div class='pp-opt' data-p='bundle'><span class='l'>Pack 3 fiches + 1 contrat</span><span class='pr'>50 \u20ac</span></div>"
      + "<label class='pp-att'><input type='checkbox' id='pp-att-chk'> Je certifie sur l'honneur \u00eatre employeur ou d\u00fbment mandat\u00e9, et utiliser ce service uniquement pour produire des documents authentiques, \u00e0 des fins l\u00e9gitimes.</label>"
      + "<button class='pp-buy' id='pp-buy' disabled>Continuer vers le paiement</button>"
      + "<button class='pp-x' id='pp-x'>Annuler</button>"
      + "</div>";
    document.body.appendChild(modalEl);
    var chk = modalEl.querySelector("#pp-att-chk");
    var buy = modalEl.querySelector("#pp-buy");
    function paint(){
      var opts = modalEl.querySelectorAll(".pp-opt");
      for(var i=0;i<opts.length;i++){ opts[i].style.borderColor = (opts[i].getAttribute("data-p")===picked ? "#2563c9" : "#cdd6e3"); }
    }
    var opts = modalEl.querySelectorAll(".pp-opt");
    for(var i=0;i<opts.length;i++){ (function(o){ o.onclick=function(){ picked=o.getAttribute("data-p"); paint(); }; })(opts[i]); }
    chk.onchange = function(){ buy.disabled = !chk.checked; };
    buy.onclick = function(){ if(chk.checked){ checkout(picked); } };
    modalEl.querySelector("#pp-x").onclick = function(){ modalEl.classList.remove("open"); };
    modalEl.onclick = function(e){ if(e.target===modalEl){ modalEl.classList.remove("open"); } };
    paint();
  }
  function openBuy(preselect){
    if(!modalEl) buildModal();
    if(preselect && PRODUCTS[preselect]){ picked = preselect; }
    modalEl.classList.add("open");
    var opts = modalEl.querySelectorAll(".pp-opt");
    for(var i=0;i<opts.length;i++){ opts[i].style.borderColor = (opts[i].getAttribute("data-p")===picked ? "#2563c9" : "#cdd6e3"); }
  }

  window.Paywall = {
    PRODUCTS: PRODUCTS,
    credits: credits,
    addProduct: addProduct,
    consume: consume,
    checkout: checkout,
    mountWatermark: mountWatermark,
    openBuy: openBuy
  };
})();
