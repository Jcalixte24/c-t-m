"""Génère les trois pages du site CTM (accueil, talent, entreprise) avec un en-tête et un pied de page communs."""
import os
import urllib.parse

ROOT = os.path.dirname(os.path.abspath(__file__))
WA = "2250719509526"

RIBBON = '''<div class="ribbon" aria-hidden="true"><svg viewBox="0 0 800 460" xmlns="http://www.w3.org/2000/svg">
<defs><linearGradient id="rg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#8b1e3f"/><stop offset=".55" stop-color="#d95729"/><stop offset="1" stop-color="#fdc758"/></linearGradient></defs>
<path d="M400 230C340 120 190 60 120 140C60 215 150 330 270 300C340 282 380 250 400 230C420 210 460 178 530 160C650 130 740 245 680 320C610 400 460 340 400 230Z"/>
<path class="b" d="M400 230C350 150 230 105 170 160C120 210 190 290 280 270C345 255 380 245 400 230C420 215 455 190 515 178C610 160 680 235 635 290C580 350 455 310 400 230Z"/>
</svg></div>'''


def head(title, desc, r):
    return f'''<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{title}</title>
<meta name="description" content="{desc}">
<meta name="theme-color" content="#faf6f0">
<meta name="robots" content="noindex, nofollow">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,500;0,600;0,700;1,500;1,600;1,700&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,700&display=swap">
<link rel="stylesheet" href="{r}assets/css/style.css">
<link rel="icon" href="{r}assets/img/logo.png">
</head>
<body>
<a class="skip" href="#contenu">Aller au contenu</a>
'''


def nav(r, cur=""):
    items = [("talent/", "Talents", "talent"), ("entreprise/", "Entreprises", "entreprise"), (r + "index.html#domaines" if r else "#domaines", "Domaines", ""), (r + "index.html#fondatrice" if r else "#fondatrice", "Fondatrice", ""), (r + "index.html#contact" if r else "#contact", "Contact", "")]
    def href(h):
        return h if h.startswith(("#", "..")) else r + h
    links = "".join(f'<a href="{href(h)}"{" aria-current=page" if k and k == cur else ""}>{t}</a>' for h, t, k in items)
    mob = "".join(f'<a href="{href(h)}">{t}</a>' for h, t, k in items)
    return f'''<header class="nav"><div class="inner nav-in">
<a class="brand" href="{r}index.html" aria-label="Creative Talent Management, accueil"><img src="{r}assets/img/logo.png" alt="" width="60" height="49"><span><b>Creative Talent</b><span>Management</span></span></a>
<nav class="links" aria-label="Navigation principale">{links}</nav>
<div class="lang" aria-label="Langue"><i class="fr">FR</i><i class="en" title="English (bientôt)">EN</i></div>
<button class="burger" aria-label="Ouvrir le menu">☰</button>
</div></header>
<div class="mob" id="mob" role="dialog" aria-label="Menu"><button aria-label="Fermer">✕</button>{mob}</div>
'''


def foot(r):
    return f'''<footer class="foot"><div class="inner"><span>© 2026 Creative Talent Management · Abidjan, Côte d'Ivoire</span>
<span><a href="mailto:contact@ctm-africa.com">contact@ctm-africa.com</a> · <a href="#">Mentions légales</a> · <a href="#">Confidentialité</a></span></div></footer>
<a class="wa-fab" href="https://wa.me/{WA}?text=Bonjour%20Creative%20Talent%20Management%2C%20" target="_blank" rel="noopener" aria-label="Écrire sur WhatsApp">WhatsApp</a>
<script src="{r}assets/js/main.js" defer></script>
</body>
</html>
'''


EXPERTS = [
    dict(k="tech", dom="Tech & IA", name="Japhet C. N'DRI", role="Développeur Web / IA & Data Analyst", img="jcn.jpg", slug="japhet",
         contact="https://talent-ci-form.netlify.app/#jc",
         bio=[("Profil", "Ingénierie & Solutions Data."), ("Expertise", "Modélisation de données, développement d'architectures d'Intelligence Artificielle et solutions technologiques innovantes."), ("Impact international", "Une maîtrise technique pointue alignée sur les derniers standards globaux, prête à répondre aux défis des entreprises et projets technologiques transfrontaliers.")],
         links=[("Portfolio", "https://creative-talent-management.netlify.app/portfolio"), ("LinkedIn", "https://fr.linkedin.com/in/japhet-calixte-n%E2%80%99dri-0b73832a0")]),
    dict(k="gastro", dom="Gastronomie & Événementiel", name="Inaice Lago", role="Cheffe de cuisine / Cheffe privée", img="inaice.jpg", slug="inaice",
         contact="https://talent-ci-form.netlify.app/#yo",
         bio=[("Profil", "Chef de cuisine privé / consultant culinaire."), ("Expertise", "Haute gastronomie, création de concepts culinaires modernes (notamment « Afro-fusion ») et organisation d'expériences de restauration privées ou événementielles de premier plan."), ("Impact international", "Une cuisine d'avant-garde qui réinvente et exporte les saveurs locales vers des tables et des publics internationaux exigeants.")],
         links=[("Site internet", "https://chef-inaice.netlify.app/"), ("LinkedIn", "https://www.linkedin.com/in/inaice-lago"), ("Instagram", "https://www.instagram.com/cheffe_inaice"), ("TikTok", "https://www.tiktok.com/@cheffe.inaice")]),
    dict(k="culture", dom="Industries Culturelles & Créatives", name="Illman Touré (Sir Heal)", role="Compositeur & Sound Designer", img="illman.jpg", slug="illman",
         contact="https://talent-ci-form.netlify.app/",
         bio=[("Profil", "Compositeur & sound designer."), ("Expertise", "Composition de musique à l'image, design sonore et gestion stratégique des droits de synchronisation pour le cinéma."), ("Impact international", "Un univers sonore unique qui a déjà voyagé au sein de délégations et festivals internationaux majeurs.")],
         links=[("Portfolio", "https://sir-heal.lovable.app/"), ("LinkedIn", "https://www.linkedin.com/in/illman-tour%C3%A9-973a52bb"), ("Instagram", "https://www.instagram.com/_sir_heal")]),
]


def expert(i, e, r):
    bio = "".join(f"<p><b>{k}</b> {v}</p>" for k, v in e["bio"])
    links = "".join(f'<a href="{u}" target="_blank" rel="noopener">{t} ↗</a>' for t, u in e["links"])
    return f'''<article class="expert rv" data-dom="{e['k']}"><div class="ph"><img src="{r}assets/img/{e['img']}" alt="{e['name']}" loading="lazy" width="680" height="800"></div>
<div class="bd"><span class="tag">{e['dom']}</span><h3>{e['name']}</h3><p class="role">{e['role']}</p><div class="act"><a href="{e['contact']}" target="_blank" rel="noopener">Contacter</a><button type="button" class="more" data-open="m-{e['slug']}">Découvrir</button></div></div>
<dialog class="modal" id="m-{e['slug']}" aria-label="{e['name']}"><div class="modal-in"><button type="button" class="modal-x" data-close aria-label="Fermer">✕</button><div class="modal-ph"><img src="{r}assets/img/{e['img']}" alt="" loading="lazy" width="680" height="800"></div><div class="modal-bd"><span class="tag">{e['dom']}</span><h3>{e['name']}</h3><p class="role">{e['role']}</p><div class="bio">{bio}</div><div class="modal-links">{links}</div><a class="btn btn-rouge" href="{e['contact']}" target="_blank" rel="noopener">Contacter {e['name'].split(' ')[0]}</a></div></div></dialog></article>'''


def index():
    r = ""
    doms = [
        ("01", "✦", "Recrutement de jeunes talents", "Nous repérons, préparons et présentons de jeunes talents qualifiés aux entreprises qui recrutent.", True),
        ("02", "⌘", "Tech & IA", "Développeurs web et applications IA, data analysts : des solutions digitales robustes, fluides et optimisées.", False),
        ("03", "✺", "Gastronomie & Événementiel", "Chefs privés, expériences culinaires immersives, tables intimistes et pop-ups gastronomiques.", False),
        ("04", "♬", "Industries Culturelles & Créatives", "Artistes, musiciens, compositeurs de musique à l'image, sound designers, beatmakers, ingénieurs son.", False),
        ("05", "◎", "Leadership & Management", "Coaching d'entrepreneurs, gestion de projets sociaux, consulting, formation et ateliers communautaires.", False),
    ]
    d = ""
    for n, ic, t, p, new in doms:
        if new:
            d += f'<article class="dom new rv"><span class="badge">Nouveau</span><span class="n">{n}</span><span class="ic">{ic}</span><h3>{t}</h3><p>{p}</p><a href="talent/index.html#emploi">Je cherche un emploi →</a></article>'
        else:
            d += f'<article class="dom rv"><span class="n">{n}</span><span class="ic">{ic}</span><h3>{t}</h3><p>{p}</p></article>'
    ex = "".join(expert(i, e, r) for i, e in enumerate(EXPERTS))
    return head("Creative Talent Management · Chaque talent a sa place", "Agence de talents à Abidjan : accompagnement, formation et recrutement de talents. Vous êtes un talent ou une entreprise ? Choisissez votre espace.", r) + nav(r) + f'''<main id="contenu">
<section class="hero">{RIBBON}
<div class="inner">
<p class="lbl rise">Creative Talent Management · Abidjan</p>
<h1 class="rise" style="--i:1">Chaque talent a <em>sa place.</em></h1>
<p class="sub rise" style="--i:2">From Côte d'Ivoire to the world. Nous accompagnons, formons et recrutons les talents d'Afrique. Qui êtes-vous ?</p>
<div class="gate">
<a class="door door-t rise" style="--i:3" href="talent/index.html"><span class="k">Espace talent</span><b>Je suis un talent</b><span class="d">Je cherche un emploi, je suis entrepreneur ou j'ai un autre projet : on m'accompagne.</span><span class="go">Entrer <i></i></span></a>
<a class="door door-e rise" style="--i:4" href="entreprise/index.html"><span class="k">Espace entreprise</span><b>Je cherche des talents</b><span class="d">Experts à contacter, profils disponibles au recrutement, besoins sur mesure.</span><span class="go">Entrer <i></i></span></a>
</div></div><span class="scrollcue">Découvrir ↓</span></section>
<div class="marquee" aria-hidden="true"><div><span>Recrutement de jeunes talents</span><i>✦</i><span>Tech & IA</span><i>✦</i><span>Gastronomie & Événementiel</span><i>✦</i><span>Industries Culturelles & Créatives</span><i>✦</i><span>Leadership & Management</span><i>✦</i><span>Recrutement de jeunes talents</span><i>✦</i><span>Tech & IA</span><i>✦</i><span>Gastronomie & Événementiel</span><i>✦</i><span>Industries Culturelles & Créatives</span><i>✦</i><span>Leadership & Management</span><i>✦</i></div></div>
<section class="sec" id="domaines"><div class="inner"><div class="sec-h rv"><p class="lbl">Notre expertise</p><h2>Nos domaines <em>d'activités</em></h2><p>L'excellence ivoirienne a désormais une adresse internationale.</p></div><div class="doms">{d}</div></div></section>
<section class="sec warm" id="experts"><div class="inner"><div class="sec-h rv"><p class="lbl">Nos experts</p><h2>Le <em>répertoire</em></h2><p>Découvrez notre sélection exclusive d'experts que nous accompagnons.</p></div><div class="experts">{ex}</div>
<p style="margin-top:34px"><a class="btn btn-rouge" href="entreprise/index.html#experts">Voir tous les experts →</a></p></div></section>
<section class="sec" id="fondatrice"><div class="inner founder"><div class="ph rv"><img src="assets/img/fondatrice.jpg" alt="Cassandra Touré, fondatrice" loading="lazy" width="680" height="849"></div>
<div class="rv"><p class="lbl">Notre fondatrice</p><h2 style="font-size:clamp(2rem,5vw,3.6rem);margin:14px 0 18px">Cassandra <em>Touré</em></h2><p style="color:var(--dim);font-size:1.1rem;max-width:56ch">Fondatrice et manager de Creative Talent Management. Dix ans d'expérience entre la France et la Côte d'Ivoire : elle crée des passerelles entre les talents, les projets et les opportunités pour rendre l'autonomie professionnelle accessible à tous. Spécialisée en insertion socioprofessionnelle, coaching et formation.</p><blockquote>« De la vision à l'impact mondial. »</blockquote></div></div></section>
<section class="sec" id="contact" style="padding-top:0"><div class="inner"><div class="cta rv"><p class="lbl" style="color:var(--gold)">Travaillons ensemble</p><h2>Talent, entreprise ou partenaire ?</h2><p>Parlons de votre projet. Chaque conversation peut être le début d'une grande collaboration.</p>
<form class="formcard" style="color:var(--ink);text-align:left;width:min(720px,100%)" novalidate><div class="grid2"><div class="field"><label for="c-role">Vous êtes</label><select id="c-role" name="role"><option>Un talent</option><option>Une entreprise</option><option>Un partenaire</option></select></div><div class="field"><label for="c-nom">Nom complet</label><input id="c-nom" name="nom" required autocomplete="name"></div><div class="field full"><label for="c-email">Adresse e-mail</label><input id="c-email" name="email" type="email" required autocomplete="email"></div><div class="field full"><label for="c-msg">Votre demande</label><textarea id="c-msg" name="msg" rows="4" required></textarea></div></div><button class="btn btn-rouge btn-block" type="submit">Préparer mon message</button><div class="out"></div></form></div></div></section>
</main>''' + foot(r)


def talent():
    r = "../"
    def sel(name, label, opts, req=True):
        o = "".join(f"<option>{x}</option>" for x in opts)
        return f'<div class="field"><label for="{name}">{label}</label><select id="{name}" name="{name}"{" required" if req else ""}>{o}</select></div>'
    other = lambda title, hint, anchor: f'''<h2>{title}</h2><p class="hint">{hint}</p><a class="btn btn-rouge" href="https://talent-ci-form.netlify.app/{anchor}" target="_blank" rel="noopener">Ouvrir le formulaire CTM ↗</a><p class="hint">Vous pouvez aussi nous écrire à <a href="mailto:contact@ctm-africa.com"><b>contact@ctm-africa.com</b></a>.</p>'''
    return head("Je suis un talent · Creative Talent Management", "Espace talent de Creative Talent Management : emploi, entrepreneuriat ou autre projet, nous vous accompagnons.", r) + nav(r, "talent") + f'''<main id="contenu">
<section class="sub-hero"><div class="inner"><a class="crumb" href="../index.html">← Accueil</a><p class="lbl" style="margin-top:18px">Espace talent</p><h1 class="rise">Vous êtes un <em>talent.</em></h1><p class="l rise" style="--i:1">Dites-nous où vous en êtes : nous vous orientons vers le bon accompagnement.</p></div></section>
<section class="sec" style="padding-top:20px"><div class="inner">
<div class="paths">
<button class="path rv" data-form="emploi" aria-pressed="false"><span class="ic">✦</span><b>Je cherche un emploi</b><span class="d">CV, entretien, plan d'action, réseau : un coaching personnalisé construit sur votre profil.</span><span class="wa">100 % WhatsApp</span></button>
<button class="path rv" data-form="entrepreneur" aria-pressed="false"><span class="ic">◎</span><b>Je suis entrepreneur</b><span class="d">Cadrer votre projet, structurer votre offre, avancer avec un accompagnement dédié.</span></button>
<button class="path rv" data-form="autre" aria-pressed="false"><span class="ic">♬</span><b>J'ai un autre talent</b><span class="d">Tech, gastronomie, arts, culture, leadership : présentez-nous votre univers.</span></button>
</div>
<section class="formcard" id="emploi" hidden><p class="lbl">Je cherche un emploi</p><h2>Démarrons sur <em>WhatsApp.</em></h2><p class="hint">Quelques informations, et votre message est prêt pour Cassandra. Elle vous répond sur WhatsApp.</p>
<form novalidate><div class="grid2"><div class="field"><label>Nom complet</label><input name="nom" required autocomplete="name"></div><div class="field"><label>Numéro WhatsApp</label><input name="wa" type="tel" required autocomplete="tel"></div><div class="field"><label>Ville</label><input name="ville" placeholder="Abidjan"></div>{sel("situation", "Votre situation", ["Étudiant(e)", "Jeune diplômé(e)", "En recherche d'emploi", "Salarié(e)", "En reconversion"])}{sel("objectif", "Ce que vous cherchez", ["Trouver un emploi", "Améliorer mon CV et mes entretiens", "Gagner en confiance", "Construire mon réseau"])}<div class="field full"><label>Un mot sur votre projet (facultatif)</label><textarea name="msg" rows="3"></textarea></div></div><button class="btn btn-wa btn-block" type="submit">Préparer mon message WhatsApp</button><div class="out"></div></form></section>
<section class="formcard" id="entrepreneur" hidden><p class="lbl">Entrepreneur</p>{other("Parlons de <em>votre projet.</em>", "Remplissez le formulaire de Creative Talent Management : décrivez votre activité et ce dont vous avez besoin, l'équipe vous recontacte.", "")}</section>
<section class="formcard" id="autre" hidden><p class="lbl">Autre talent</p>{other("Présentez-nous <em>votre univers.</em>", "Remplissez le formulaire de Creative Talent Management : dites-nous qui vous êtes et ce que vous cherchez à construire.", "")}</section>
</div></section></main>''' + foot(r)


PROFILS = [
    ("MK", "Assistante marketing digital", "Marketing & communication", "Junior", "Abidjan", "Disponible de suite"),
    ("AY", "Développeur web junior", "Tech & IA", "Junior", "Abidjan", "Disponible de suite"),
    ("SD", "Community manager", "Marketing & communication", "Junior", "Abidjan", "Dans 1 mois"),
    ("KT", "Chargé de logistique", "Logistique", "Stagiaire", "Abidjan", "Disponible de suite"),
    ("NB", "Assistante commerciale", "Commercial", "Junior", "Abidjan", "Disponible de suite"),
    ("OC", "Graphiste / motion designer", "Industries créatives", "Junior", "Abidjan", "Dans 2 semaines"),
]


def entreprise():
    r = "../"
    ex = "".join(expert(i, e, r) for i, e in enumerate(EXPERTS))
    pr = "".join(f'''<article class="prof rv"><span class="av">{i}</span><div><b>{t}</b><small>{d}</small><div class="meta"><span>{n}</span><span>{v}</span><span>{dp}</span></div></div><a href="https://wa.me/{WA}?text={urllib.parse.quote(f"Bonjour, notre entreprise est intéressée par le profil P-{k + 1:02d} ({t}). Pouvons-nous en discuter ?")}" target="_blank" rel="noopener">Demander ce profil →</a></article>''' for k, (i, t, d, n, v, dp) in enumerate(PROFILS))
    return head("Je cherche des talents · Creative Talent Management", "Espace entreprise : nos experts, nos profils disponibles au recrutement et vos besoins sur mesure.", r) + nav(r, "entreprise") + f'''<main id="contenu">
<section class="sub-hero"><div class="inner"><a class="crumb" href="../index.html">← Accueil</a><p class="lbl" style="margin-top:18px">Espace entreprise</p><h1 class="rise">Le bon talent, <em>au bon moment.</em></h1><p class="l rise" style="--i:1">Contactez nos experts, découvrez les profils disponibles au recrutement ou décrivez-nous votre besoin.</p>
<p style="margin-top:26px;display:flex;gap:12px;flex-wrap:wrap"><a class="btn btn-rouge" href="#experts">Nos experts</a><a class="btn" href="#profils">Profils disponibles</a><a class="btn" href="#besoin">Exprimer un besoin</a></p></div></section>
<section class="sec" id="experts" style="padding-top:30px"><div class="inner"><div class="sec-h rv"><p class="lbl">Nos experts</p><h2>Des experts à <em>contacter</em></h2><p>Des talents confirmés, accompagnés par CTM, disponibles pour vos projets et vos événements.</p></div>
<div class="chips"><button class="chip on" data-f="all">Tous</button><button class="chip" data-f="tech">Tech & IA</button><button class="chip" data-f="gastro">Gastronomie & Événementiel</button><button class="chip" data-f="culture">Industries Culturelles & Créatives</button></div>
<div class="experts">{ex}</div></div></section>
<section class="sec warm" id="profils"><div class="inner"><div class="sec-h rv"><p class="lbl">Recrutement</p><h2>Nos profils disponibles <em>au recrutement</em></h2><p>De jeunes talents préparés, qui ont déjà contacté CTM. Les identités restent confidentielles : vous demandez un profil, nous organisons la rencontre.</p></div>
<div class="profils">{pr}</div><p class="note">Liste de démonstration : les profils réels seront ajoutés au fil des candidatures reçues par CTM.</p></div></section>
<section class="sec" id="besoin"><div class="inner"><section class="formcard"><p class="lbl">Exprimer un besoin</p><h2>Décrivez le profil <em>que vous cherchez.</em></h2><p class="hint">Quelques lignes suffisent : nous revenons vers vous rapidement.</p>
<form novalidate><div class="grid2"><div class="field"><label>Entreprise</label><input name="entreprise" required autocomplete="organization"></div><div class="field"><label>Votre nom</label><input name="nom" required autocomplete="name"></div><div class="field"><label>Téléphone ou e-mail</label><input name="contact" required></div><div class="field"><label>Profil recherché</label><input name="poste" required placeholder="Ex. assistant(e) marketing, développeur junior…"></div><div class="field full"><label>Domaine</label><select name="domaine"><option>Recrutement de jeunes talents</option><option>Tech & IA</option><option>Gastronomie & Événementiel</option><option>Industries Culturelles & Créatives</option><option>Leadership & Management</option></select></div><div class="field full"><label>Précisions (facultatif)</label><textarea name="msg" rows="3"></textarea></div></div><button class="btn btn-rouge btn-block" type="submit">Préparer ma demande</button><div class="out"></div></form></section></div></section>
</main>''' + foot(r)


for path, html in (("index.html", index()), ("talent/index.html", talent()), ("entreprise/index.html", entreprise())):
    full = os.path.join(ROOT, path)
    os.makedirs(os.path.dirname(full), exist_ok=True)
    open(full, "w", encoding="utf-8").write(html)
    print(path, len(html))
