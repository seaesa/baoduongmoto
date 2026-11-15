#!/usr/bin/env python3
"""Static site generator for the E-Moto clone.
Input : src/partials/*.html (head, header, footer), src/pages/home.html, content/data.json
Output: index.html + one <dir>/index.html per page (clean URLs, no ".html").
Placeholders: {{P}} relative prefix to site root, {{HOME}}, {{SELF}}, {{TITLE}}, {{DESC}}, {{KEYWORDS}},
{{LEAFLET_CSS}}, {{FOOTER_NEWS}};  "@@" inside content = site root prefix.
Run: python3 scripts/build.py
"""
import html, json, pathlib, re, shutil, urllib.parse

ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC = ROOT / 'src'
_raw = (ROOT / 'content' / 'data.json').read_text(encoding='utf-8')
# no visible mention of the original domain: link text inside articles becomes the brand name
_raw = re.sub(r'>(?:https?://)?(?:www\.)?e-moto\.vn/?<', '>E-MOTO<', _raw)
D = json.loads(_raw)
PART = {n: (SRC / 'partials' / f'{n}.html').read_text(encoding='utf-8') for n in ('head', 'header', 'footer')}
HOME_BODY = (SRC / 'pages' / 'home.html').read_text(encoding='utf-8')
LEAFLET_CSS = '  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css">\n'
LEAFLET_JS = '  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>\n'
GENERATED = []                      # top-level dirs written by this script (cleaned on each run)
esc = lambda s: html.escape(s, quote=True)

# ------------------------------------------------------------------ shared fragments
def card(p, P):
    url = f'{P}san-pham/cho-thue-10/{p["slug"]}/'
    speed, km, power, status = p['specs']
    n = esc(p['name'])
    return f'''        <div class="col-lg-4 mb-4 product">
          <div class="card bg-light border-0">
            <div class="card-body p-4">
              <h4 class="card-title fw-bold text-uppercase mb-0">
                <a href="{url}" title="{n}" class="text-dark">{n}</a>
                <span class="fw-bold text-danger float-end h5 mt-1 mb-0">{p["price"]}</span>
              </h4>
            </div>
            <a href="{url}" title="{n}" class="position-relative">
              <img src="{p["img"].replace("@@", P)}" alt="{n}" class="card-img-top">
            </a>
            <div class="card-body p-4">
{specs(p, False)}
            </div>
          </div>
        </div>
'''

def specs(p, big):
    speed, km, power, status = p['specs']
    fa = ' fa-2x' if big else ''
    top, bot = ('mb-4', ' mb-lg-0') if big else ('mb-3', '')
    return f'''              <div class="row text-black-50">
                <div class="col-6">
                  <div class="d-flex {top}">
                    <div class="flex-shrink-0 text-dark"><i class="fas fa-tachometer-alt{fa}"></i></div>
                    <div class="flex-grow-1 ms-2">
                      <h5 class="text-uppercase fw-bold h6 mb-0">Tốc Độ Tối Đa</h5>
                      <p class="mb-0">{speed}</p>
                    </div>
                  </div>
                </div>
                <div class="col-6">
                  <div class="d-flex {top}">
                    <div class="flex-shrink-0"><i class="fas fa-sort-amount-down text-dark{fa}"></i></div>
                    <div class="flex-grow-1 ms-2">
                      <h5 class="text-uppercase fw-bold h6 mb-0">Km Mỗi Lần Sạc</h5>
                      <p class="mb-0">{km}</p>
                    </div>
                  </div>
                </div>
                <div class="col-6">
                  <div class="d-flex{bot}">
                    <div class="flex-shrink-0"><i class="fas fa-hashtag text-dark{fa}"></i></div>
                    <div class="flex-grow-1 ms-3">
                      <h5 class="text-uppercase fw-bold h6 mb-0">Công Suất</h5>
                      <p class="mb-0">{power}</p>
                    </div>
                  </div>
                </div>
                <div class="col-6">
                  <div class="d-flex{bot}">
                    <div class="flex-shrink-0"><i class="fas fa-calendar-alt text-dark{fa}"></i></div>
                    <div class="flex-grow-1 ms-2">
                      <h5 class="text-uppercase fw-bold h6 mb-0">Tình Trạng</h5>
                      <p class="mb-0">{status}</p>
                    </div>
                  </div>
                </div>
              </div>'''

def footer_news(P):
    out = []
    for n in D['news_list'][:4]:
        href, t = n['href'].replace('@@', P), esc(n['title'])
        out.append(f'''          <div class="d-flex mb-4">
            <div class="flex-shrink-0"><a href="{href}"><img class="new-img" src="{n["img"].replace("@@", P)}" alt="{t}"></a></div>
            <div class="flex-grow-1 ms-3"><h4 class="mt-0 h6 fw-bold"><a href="{href}" class="text-capitalize">{t}</a></h4></div>
          </div>''')
    return '\n'.join(out)

def hero(h, P):
    crumbs = ''.join(f'<li class="breadcrumb-item"><a href="{(P + c["href"] + "/") if (c["href"] + "/") in PATHS else "#"}" class="text-danger fw-bold">{esc(c["name"])}</a></li>'
                     for c in h['crumbs'])
    act = 'breadcrumb-item active fw-bold' if h['active_bold'] else 'breadcrumb-item active'
    return f'''  <section class="section-hero" id="bg-info">
    <div class="container pt-lg-0 pt-2">
      <div class="row py-3 align-items-center" id="center-ct">
        <div class="col-lg-12">
          <h1 class="h2 mt-5 mb-4 text-uppercase fw-bold text-white">{esc(h["h1"])}</h1>
          <nav aria-label="breadcrumb fw-bold">
            <ol class="breadcrumb mb-0">
              <li class="breadcrumb-item"><a href="{P or './'}" class="text-danger fw-bold">Trang Chủ</a></li>{crumbs}
              <li class="{act}" aria-current="page">{esc(h["active"])}</li>
            </ol>
          </nav>
        </div>
      </div>
    </div>
  </section>
'''

def h4(text, cls):
    return f'<h4 class="h4 fw-bold border-start border-danger border-2 py-1 ps-3 {cls}">{text}</h4>'

def sidebar(P):
    prods = ''.join(f'''
          <div class="d-flex py-3 border-bottom">
            <div class="flex-shrink-0"><a href="{P}san-pham/cho-thue-10/{p["slug"]}/" title="{esc(p["name"])}"><img class="mr-3 new-img" src="{p["img"].replace("@@", P)}" alt="{esc(p["name"])}"></a></div>
            <div class="flex-grow-1 ms-3">
              <h4 class="mt-0 h6 fw-bold"><a href="{P}san-pham/cho-thue-10/{p["slug"]}/" class="text-uppercase text-dark">{esc(p["name"])}</a></h4>
              <div class="text-capitalize text-secondary mb-0"><h6 class="mb-0 fw-bold text-danger">{p["price"]}</h6></div>
            </div>
          </div>''' for p in D['products'][:5])
    news = ''.join(f'''
          <div class="d-flex py-3 border-bottom">
            <div class="flex-shrink-0"><a href="{n["href"].replace("@@", P)}" title="{esc(n["title"])}"><img class="mr-3 new-img" src="{n["img"].replace("@@", P)}" alt="{esc(n["title"])}"></a></div>
            <div class="flex-grow-1 ms-3">
              <h4 class="mt-0 h6 fw-bold"><a href="{n["href"].replace("@@", P)}" class="text-capitalize text-dark">{esc(n["title"])}</a></h4>
            </div>
          </div>''' for n in D['news_list'][:4])
    return f'''      <div class="col-lg-3">
        {h4("Được Yêu Thích", "mb-0 mt-5 mt-lg-0")}{prods}
        {h4("Tin Mới", "mb-0 mt-5")}{news}
      </div>
'''

def pagination(cur, total, href):
    li = []
    if cur == 1:
        li.append('<li class="page-item disabled" aria-disabled="true" aria-label="&laquo; Trước"><span class="page-link" aria-hidden="true">&lsaquo;</span></li>')
    else:
        li.append(f'<li class="page-item"><a class="page-link" href="{href(cur - 1)}" rel="prev" aria-label="&laquo; Trước">&lsaquo;</a></li>')
    for i in range(1, total + 1):
        li.append(f'<li class="page-item active" aria-current="page"><span class="page-link">{i}</span></li>' if i == cur
                  else f'<li class="page-item"><a class="page-link" href="{href(i)}">{i}</a></li>')
    if cur == total:
        li.append('<li class="page-item disabled" aria-disabled="true" aria-label="Sau &raquo;"><span class="page-link" aria-hidden="true">&rsaquo;</span></li>')
    else:
        li.append(f'<li class="page-item"><a class="page-link" href="{href(cur + 1)}" rel="next" aria-label="Sau &raquo;">&rsaquo;</a></li>')
    return '<ul class="pagination mb-3 justify-content-center" role="navigation">\n          ' + '\n          '.join(li) + '\n        </ul>'

def qr_svg():
    rows = (ROOT / 'content' / 'qr-tel.txt').read_text().split()
    d = ''.join(f'M{x} {y}h1v1h-1z' for y, r in enumerate(rows) for x, c in enumerate(r) if c == '1')
    return ('<svg xmlns="http://www.w3.org/2000/svg" version="1.1" width="48" height="48" viewBox="0 0 48 48" role="img" aria-label="QR tel:0914002002">'
            f'<rect x="0" y="0" width="48" height="48" fill="#ffffff"/><g transform="scale(2.286)"><path fill="#000000" d="{d}"/></g></svg>')

def hero_form():
    i = HOME_BODY.index('<form'); j = HOME_BODY.index('</form>', i) + 7
    return HOME_BODY[i:j]

# ------------------------------------------------------------------ page writer
# Brand name: "E-Moto" -> "Bảo Dương moto". Only whole words that are not part of a URL or file name
# (slugs are lower-case "e-moto"; the one image file name has "_E-Moto", which the look-behind skips).
BRAND, BRAND_UP = 'Bảo Dương moto', 'BẢO DƯƠNG MOTO'
_BRAND_RE = re.compile(r'(?<![\w/.\-])(E-MOTO|E-Moto)(?:\.vn)?(?![\w\-])')


def brand(text):
    return _BRAND_RE.sub(lambda m: BRAND_UP if m.group(1) == 'E-MOTO' else BRAND, text)


def write(path, title, desc, kw, body, page, P, leaflet=False, extra_js=''):
    head = (PART['head'].replace('{{TITLE}}', esc(title)).replace('{{DESC}}', esc(desc)).replace('{{KEYWORDS}}', esc(kw))
            .replace('{{LEAFLET_CSS}}', LEAFLET_CSS if leaflet else ''))
    header = PART['header'].replace('{{TITLE}}', esc(title))
    footer = PART['footer'].replace('{{FOOTER_NEWS}}', footer_news(P))
    doc = (head + f'<body data-page="{page}">\n' + header + body + footer +
           (LEAFLET_JS if leaflet else '') + f'  <script src="{P}assets/js/main.js"></script>\n' + extra_js + '</body>\n</html>\n')
    doc = doc.replace('{{HOME}}', P or './').replace('{{SELF}}', './').replace('{{P}}', P).replace('@@', P)
    doc = brand(doc)
    out = ROOT / urllib.parse.unquote(path) / 'index.html' if path else ROOT / 'index.html'
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(doc, encoding='utf-8')

def prefix(path):
    return '../' * path.strip('/').count('/') + '../' if path else ''

# every page that exists in the clone (dir paths, url-encoded like the original slugs)
PATHS = {'san-pham/', 'san-pham/trang-2/', 'danh-muc/cho-thue-10/', 'danh-muc/cho-thue-10/trang-2/',
         'tin-tuc/', 'cua-hang-emoto-electric-motorbike-rental/'}
PATHS |= {f'san-pham/cho-thue-10/{p["slug"]}/' for p in D['products']}
PATHS |= {f'bai-viet/{a["slug"]}/' for a in D['articles']}
PATHS |= {n['path'] + '/' for n in D['news']}

# clean previously generated dirs
for top in {p.split('/')[0] for p in PATHS}:
    shutil.rmtree(ROOT / top, ignore_errors=True)

H = D['heads']

# ---- home
cards6 = ''.join(card(p, '') for p in D['products'][:6]).rstrip('\n')
gallery = ["xe-may-dien-1", "xe-may-dien-4", "xe-may-dien-5", "xe-may-dien-6", "xe-may-dien-7", "xe-may-dien-8", "xem-may-dien-2", "xem-may-dien-3"]
gal = ''.join(f'''      <div class="col-lg-3 col-6 mb-4">
        <a href="{{{{P}}}}assets/images/thu_vien/{n}.jpg" data-fancybox="hinhanh-nhamau" data-caption="{n}">
          <img src="{{{{P}}}}assets/images/thu_vien/{n}.jpg" alt="{n}" class="d-block w-100" loading="lazy">
        </a>
      </div>
''' for n in gallery).rstrip('\n')
write('', H['home']['title'], H['home']['description'], H['home']['keywords'],
      HOME_BODY.replace('<!--PRODUCTS-->', cards6).replace('<!--GALLERY-->', gal), 'home', '', leaflet=True)

# ---- product lists: /san-pham/ and /danh-muc/cho-thue-10/ (+ trang-2)
per, prods = D['per_page'], D['products']
pages = (len(prods) + per - 1) // per
for base, hk in (('san-pham', 'san-pham'), ('danh-muc/cho-thue-10', 'danh-muc')):
    for n in range(1, pages + 1):
        path = base + ('' if n == 1 else f'/trang-{n}')
        P = prefix(path)
        href = lambda i, P=P: f'{P}{base}/' + ('' if i == 1 else f'trang-{i}/')
        chunk = prods[(n - 1) * per:n * per]
        body = (hero(H[hk + '-hero'], P) + '  <div class="container">\n    <div class="row my-5 pt-lg-5">\n' +
                ''.join(card(p, P) for p in chunk) + ('      <div class="w-100"></div>\n' if len(chunk) == per else '') +
                f'      <div class="col-lg-12">\n        {pagination(n, pages, href)}\n      </div>\n    </div>\n  </div>\n')
        write(path, H[hk]['title'] + ('' if n == 1 else f' - Trang {n}'), H[hk]['description'], H[hk]['keywords'], body, 'products', P)

# ---- product detail
for p in prods:
    path = f'san-pham/cho-thue-10/{p["slug"]}'
    P = prefix(path)
    g = [x.replace('@@', P) for x in p['gallery']]
    n = esc(p['name'])
    items = ''.join(f'''
            <div class="carousel-item{' active' if i == 0 else ''}"><img class="d-block w-100" src="{s}" alt="{n}"></div>''' for i, s in enumerate(g))
    inds = ''.join(f'''
            <li data-bs-target="#carouselExampleIndicators" data-bs-slide-to="{i}"{' class="active" aria-current="true"' if i == 0 else ''} aria-label="Ảnh {i + 1}"><img class="d-block w-100" src="{s}" alt="{n}"></li>''' for i, s in enumerate(g))
    tags = ''.join(f'<a href="#" title="{esc(t["title"])}"><span class="badge bg-primary me-1">{esc(t["text"])}</span></a> ' for t in p['tags'])
    others = ''.join(card(o, P) for o in prods[:7] if o['slug'] != p['slug'])
    modal = f'''
  <div class="modal fade" id="ModalReg" tabindex="-1" aria-labelledby="RegModalLabel" aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered">
      <div class="modal-content p-3">
        <div class="modal-body text-center">
          <button type="button" class="btn-close" data-dismiss="modal" aria-label="Close"><i class="fas fa-times"></i></button>
          <h3 class="mb-4 text-uppercase fw-bold text-white h3" id="RegModalLabel">Đặt Thuê Xe</h3>
          <p class="mb-4 text-white">Quý khách vui lòng điền đầy đủ thông tin bên dưới để chúng tôi có thể tư vấn được chính xác nhất.</p>
          {hero_form()}
        </div>
      </div>
    </div>
  </div>
'''
    body = hero(p['hero'], P) + f'''  <div class="container">
    <div class="row my-5 pt-lg-5">
      <div class="col-lg-7">
        <div id="carouselExampleIndicators" class="carousel slide product-carousel" data-ride="carousel">
          <div class="carousel-inner border">{items}
          </div>
          <ol class="carousel-indicators">{inds}
          </ol>
        </div>
      </div>
      <div class="col-lg-5">
        <div class="card-body p-4">
{specs(p, True)}
        </div>
        <hr class="mt-0 mb-3">
        <dl class="row">
          <dt class="col-4 col-lg-3 h3 mb-0">Giá Thuê</dt>
          <dd class="col-8 col-lg-9 mb-0"><h3 class="text-danger">{p["price_dd"]}</h3></dd>
        </dl>
        <hr class="mt-3 mb-3">
        {p["intro"]}
        <hr class="my-2">
        <div class="mt-3">
          <a href="tel:0914002002" title="Liên Hệ Ngay" class="btn btn-lg btn-danger shadow px-3 rounded-0 me-1"><i class="fas fa-phone me-2 animate__animated animate__heartBeat animate__infinite"></i> Liên hệ ngay</a>
          <a href="#" title="Nhận báo giá" class="btn btn-lg btn-danger shadow px-3 rounded-0" data-toggle="modal" data-target="#ModalReg"><i class="far fa-envelope me-2 animate__animated animate__heartBeat animate__infinite"></i> Đặt Thuê Xe</a>
          {qr_svg()}
        </div>
      </div>
      <div class="col-lg-12">
        <hr>
        {h4(esc(p["detail_h"]), "my-4")}
      </div>
      <div class="col-lg-12 product-detail">
        {p["detail"]}
        <hr>
        {tags}
        <hr>
      </div>
      <div class="col-lg-12">
        {h4("Mẫu Xe Khác", "mb-4 mt-5")}
      </div>
      <div class="col-lg-12">
        <div class="row">
{others}          <div class="w-100"></div>
        </div>
      </div>
    </div>
  </div>
''' + modal
    hd = p['head']
    write(path, hd['title'], hd['description'], hd['keywords'], body, 'product', P)

# ---- articles (bai-viet)
for a in D['articles']:
    path = f'bai-viet/{a["slug"]}'
    P = prefix(path)
    rel = ''.join(f'\n            <li class="list-unstyled mb-2"><a href="{r["href"].replace("@@", P)}" class="text-dark text-capitalize"><i class="fas fa-angle-double-right"></i> {esc(r["title"])}</a></li>' for r in a['related'])
    body = hero(a['hero'], P) + f'''  <div class="container">
    <div class="row my-5 pt-lg-5">
      <div class="col-lg-9 pe-5 post-content">
        {a["html"]}
        <p class="text-secondary"><i class="far fa-calendar-alt"></i> {a["date"]}</p>
        <hr class="mt-0 mb-0">
        {h4(a["related_h"], "mb-4 mt-5")}
        <div class="row">
          <ul class="list-unstyled">{rel}
          </ul>
        </div>
      </div>
{sidebar(P)}    </div>
  </div>
'''
    write(path, a['head']['title'], a['head']['description'], a['head']['keywords'], body, 'article', P)

# ---- news list (page 1 built; other pages -> "#", per user)
path = 'tin-tuc'; P = prefix(path)
items = ''.join(f'''
        <div class="col-lg-12">
          <div class="d-flex">
            <div class="flex-shrink-0"><a href="{n["href"].replace("@@", P)}" title="{esc(n["title"])}"><img class="mr-3 new-img-dt" src="{n["img"].replace("@@", P)}" alt="{esc(n["title"])}"></a></div>
            <div class="flex-grow-1 ms-3">
              <h4 class="mt-0 h6 fw-bold"><a href="{n["href"].replace("@@", P)}" class="text-uppercase text-dark">{esc(n["title"])}</a></h4>
              {n["excerpt"]}
            </div>
          </div>
          <hr>
        </div>''' for n in D['news_list'])
body = hero(H['tin-tuc-hero'], P) + f'''  <div class="container">
    <div class="row my-5 pt-lg-5">
      <div class="col-lg-9 pe-lg-5">{items}
        <div class="col-lg-12 mb-5 mb-lg-0">
          {pagination(1, D["news_pages"], lambda i: "./" if i == 1 else "#")}
        </div>
      </div>
{sidebar(P)}    </div>
  </div>
'''
write(path, H['tin-tuc']['title'], H['tin-tuc']['description'], H['tin-tuc']['keywords'], body, 'news-list', P)

# ---- news detail samples
for nw in D['news']:
    path = nw['path']; P = prefix(path)
    tags = ''.join(f'<a href="#" title="{esc(t["title"])}"><span class="badge bg-primary me-1">{esc(t["text"])}</span></a> ' for t in nw['tags'])
    rel = ''.join(f'''
          <div class="col-lg-6">
            <div class="d-flex border-bottom pb-2 mb-2">
              <div class="flex-shrink-0"><a href="{r["href"].replace("@@", P)}" title="{esc(r["title"])}"><img class="mr-3 new-rela-dt" src="{r["img"].replace("@@", P)}" alt="{esc(r["title"])}"></a></div>
              <div class="flex-grow-1 ms-3"><h4 class="mt-0 h6 fw-bold"><a href="{r["href"].replace("@@", P)}" class="text-capitalize text-dark">{esc(r["title"])}</a></h4></div>
            </div>
          </div>''' for r in nw['related'])
    body = hero(nw['hero'], P) + f'''  <div class="container">
    <div class="row my-5 pt-lg-5">
      <div class="col-lg-9 pe-lg-5 post-content">
        {nw["html"]}
        <hr>
        {tags}
        <hr>
        <p class="text-secondary"><i class="far fa-calendar-alt"></i> {nw["date"]}</p>
        <hr class="mt-0 mb-0">
        {h4(nw["related_h"], "mb-4 mt-5")}
        <div class="row">{rel}
          <div class="w-100"></div>
        </div>
      </div>
{sidebar(P)}    </div>
  </div>
'''
    write(path, nw['head']['title'], nw['head']['description'], nw['head']['keywords'], body, 'news', P)

# ---- stores / contact
path = 'cua-hang-emoto-electric-motorbike-rental'; P = prefix(path)
i = HOME_BODY.index('<div class="g-recaptcha">'); j = HOME_BODY.index('</div>\n            </div>', i)
recaptcha = HOME_BODY[i:j] + '</div>'
def field(icon, ph, name, typ='text', req=True, fid=''):
    fb = f'\n              <div class="invalid-feedback">{ph}</div>' if req else ''
    return f'''            <div class="input-group mb-3">
              <span class="input-group-text"><i class="{icon}"></i></span>
              <input type="{typ}" class="form-control" id="validationCustom{fid}" placeholder="{ph}" name="{name}"{' required' if req else ''}>{fb}
            </div>
'''
body = hero(H['cua-hang-hero'], P) + f'''  <div class="container">
    <div class="row my-5 pt-lg-5">
      <div class="col-lg-12"></div>
      <div class="col-lg-12">
        <h2 class="h4 mb-4 text-uppercase fw-bold text-danger">Đi đến cửa hàng gần bạn !</h2>
      </div>
      <div class="col-lg-6 mb-5 mb-lg-0">
        <div id="map"></div>
      </div>
      <div class="col-lg-6">
        <form method="POST" action="#" accept-charset="UTF-8" class="needs-validation" novalidate>
{field("far fa-file", "Vui lòng nhập tiêu đề", "title", fid="Title")}{field("far fa-user", "Vui lòng nhập họ tên", "name", fid="Name")}{field("far fa-envelope", "Vui lòng nhập email", "email", "email", fid="Email")}{field("fas fa-road", "Vui lòng nhập địa chỉ", "address", req=False, fid="Address")}{field("fas fa-mobile-alt", "Vui lòng nhập số điện thoại", "phone", req=False, fid="Phone")}            <div class="input-group mb-3">
              <span class="input-group-text"><i class="far fa-comment-alt"></i></span>
              <textarea name="content" class="form-control" id="validationCustomContent" placeholder="Vui lòng nhập nội dung" rows="7" required></textarea>
              <div class="invalid-feedback">Vui lòng nhập nội dung</div>
            </div>
            <div class="input-group mb-4">
              {recaptcha}
            </div>
            <div class="mb-0">
              <button type="submit" class="btn btn-danger btn-lg px-4"><i class="far fa-paper-plane"></i> Gửi Liên Hệ</button>
            </div>
        </form>
      </div>
    </div>
  </div>
'''
hc = H['cua-hang']
write(path, hc['title'], hc['description'], hc['keywords'], body, 'stores', P, leaflet=True)
print('pages:', 1 + len(PATHS))
