#!/usr/bin/env python3
"""Pulls the *content* (texts, prices, specs, article bodies, image files) of e-moto.vn
into content/data.json + assets/images/. No layout/code is taken: the markup of every
page is written by hand in src/ and rendered by scripts/build.py.

Links inside content are rewritten:
  - to a page that exists in the clone  -> "@@<path>/"   (build.py replaces @@ with a relative prefix)
  - to any other e-moto.vn page         -> "#"
  - images                              -> "@@assets/images/<path>" (downloaded)
Usage: python3 scripts/extract-content.py <cache-dir>
"""
import json, pathlib, re, sys, urllib.parse, urllib.request
from bs4 import BeautifulSoup, NavigableString, Comment

ROOT = pathlib.Path(__file__).resolve().parent.parent
CACHE = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else '/tmp/emoto-cache')
CACHE.mkdir(parents=True, exist_ok=True)
BASE = 'https://e-moto.vn'
UA = {'User-Agent': 'Mozilla/5.0 (Macintosh) content-extract'}

ARTICLES = ['ve-chung-toi-1', 'chinh-sach--quy-dinh-5', 'quy-trinh-thue-xe-4', 'cam-ket-bao-mat-3',
            'bang-gia-dich-vu-2', 'cho-thue-xe-may-dien-da-nang-e-moto---cua-hang-thue-xe-may-uy-tin-tai-da-nang-6']
NEWS_SAMPLES = 4          # detail pages built for the 4 newest posts only (user: "vài bài mẫu")

def fetch(path):
    f = CACHE / (re.sub(r'[^A-Za-z0-9._-]+', '_', path.strip('/')) or 'home')
    f = f.with_suffix('.html')
    if not f.exists():
        req = urllib.request.Request(BASE + path, headers=UA)
        f.write_bytes(urllib.request.urlopen(req, timeout=60).read())
    return BeautifulSoup(f.read_text(encoding='utf-8'), 'lxml')

PAGES = set()             # clone paths that will exist, e.g. "san-pham/cho-thue-10/vinfast-ludo-46"
IMAGES = set()

def norm_path(url):
    u = urllib.parse.urlsplit(url.strip())
    if u.netloc and u.netloc.lower() not in ('e-moto.vn', 'www.e-moto.vn'):
        return None
    p = u.path
    p = re.sub(r'^/(vi|en|ru|ja|zh|ko)(?=/|$)', '', p)
    return p.strip('/')

def link(url):
    if not url or url.startswith(('#', 'tel:', 'mailto:', 'javascript:')):
        return url
    u = urllib.parse.urlsplit(url)
    if u.scheme in ('http', 'https', '') and (not u.netloc or u.netloc.lower() in ('e-moto.vn', 'www.e-moto.vn')):
        p = norm_path(url)
        if p.startswith('images/'):
            return img(url)
        if p == '':
            return '@@'
        return '@@' + p + '/' if p in PAGES else '#'
    return url                                   # third-party link: unchanged

def img(url):
    p = norm_path(url)
    if p is None:
        return url
    p = urllib.parse.unquote(p)
    assert p.startswith('images/'), url
    IMAGES.add(p)
    return '@@assets/' + urllib.parse.quote(p)

def rewrite(node):
    for a in ([node] if node.name == 'a' and node.get('href') else []) + node.find_all('a', href=True):
        a['href'] = link(a['href'])
    for i in ([node] if node.name == 'img' else []) + node.find_all('img'):
        for k in ('src', 'data-src'):
            if i.get(k):
                i[k] = img(i[k])
    for c in node.find_all(string=lambda s: isinstance(s, Comment)):
        c.extract()
    return node

def html_of(nodes):
    return ''.join(str(rewrite(n)) if not isinstance(n, NavigableString) else str(n) for n in nodes).strip()

def txt(n):
    return re.sub(r'\s+', ' ', n.get_text()).strip()

def head(soup):
    g = lambda n: (soup.find('meta', attrs={'name': n}) or {}).get('content', '')
    return {'title': txt(soup.title), 'description': g('description'), 'keywords': g('keywords')}

def hero(soup):
    sec = soup.select_one('section#bg-info')
    items = sec.select('.breadcrumb-item')
    crumbs = []
    for li in items[1:-1]:
        a = li.find('a')
        crumbs.append({'name': txt(a), 'href': norm_path(a['href'])})
    return {'h1': txt(sec.find('h1')), 'crumbs': crumbs, 'active': txt(items[-1]),
            'active_bold': 'fw-bold' in items[-1].get('class', [])}

# ---------------------------------------------------------------- products
def card_data(c):
    a = c.select_one('h4.card-title a')
    specs = [txt(p) for p in c.select('.row.text-black-50 p.mb-0')]
    return {'name': a['title'], 'slug': norm_path(a['href']).split('/')[-1],
            'price': txt(c.select_one('h4.card-title span')),
            'img_url': c.select_one('img.card-img-top')['src'], 'specs': specs}

def product_list(path):
    s = fetch(path)
    return s, [card_data(c) for c in s.select('.col-lg-4.mb-4.product')]

s1, l1 = product_list('/san-pham')
s2, l2 = product_list('/san-pham?page=2')
products = l1 + l2
PER_PAGE = len(l1)
for p in products:
    PAGES.add('san-pham/cho-thue-10/' + p['slug'])
for a in ARTICLES:
    PAGES.add('bai-viet/' + a)
PAGES.update(['san-pham', 'tin-tuc', 'danh-muc/cho-thue-10', 'cua-hang-emoto-electric-motorbike-rental'])

news_soup = fetch('/tin-tuc')
news_list = []
for col in news_soup.select('.col-lg-9.pe-lg-5 > .col-lg-12'):
    a = col.select_one('h4 a')
    if not a:
        continue
    body = col.select_one('.flex-grow-1')
    excerpt = ''.join(str(x) for x in a.parent.next_siblings).strip()
    news_list.append({'title': txt(a), 'path': norm_path(a['href']), 'img_url': col.select_one('img')['src'],
                      'excerpt': re.sub(r'\s+', ' ', excerpt)})
for n in news_list[:NEWS_SAMPLES]:
    PAGES.add(n['path'])
news_pages = len(news_soup.select('.pagination .page-item')) - 2

# now that PAGES is known, rewrite image urls of the lists
for p in products:
    p['img'] = img(p.pop('img_url'))
for n in news_list:
    n['img'] = img(n.pop('img_url'))
    n['href'] = link(BASE + '/' + n['path'])

for p in products:
    s = fetch('/san-pham/cho-thue-10/' + p['slug'])
    p['head'] = head(s)
    p['hero'] = hero(s)
    p['gallery'] = [img(i['src']) for i in s.select('#carouselExampleIndicators .carousel-inner img')]
    col5 = s.select_one('.row.my-5 > .col-lg-5')
    hr = col5.find('hr', class_='mt-3')
    intro = []
    for n in hr.next_siblings:
        if getattr(n, 'name', None) == 'script' or (getattr(n, 'get', None) and 'addthis_inline_share_toolbox' in (n.get('class') or [])):
            break
        if isinstance(n, Comment):
            continue
        intro.append(n)
    p['intro'] = html_of(intro)
    p['price_dd'] = txt(col5.select_one('dd h3'))
    det_h = s.find('h4', string=re.compile(r'^\s*Chi Tiết'))
    det = det_h.find_next_sibling('div', class_='col-lg-12') or det_h.parent.find_next_sibling('div')
    nodes = list(det.children)
    cut = next(i for i, n in enumerate(nodes) if getattr(n, 'name', None) == 'hr')
    p['detail_h'] = txt(det_h)
    p['detail'] = html_of(nodes[:cut])
    p['tags'] = [{'title': a.get('title', ''), 'text': a.get_text().strip()} for a in det.select('a span.badge')
                 for a in [a.parent]]
    p['head']['og_image'] = img((s.find('meta', property='og:image') or {}).get('content', '') or BASE + '/images/' + p['img'])

# ---------------------------------------------------------------- articles (bai-viet)
def body_until(col, stop):
    out = []
    for n in col.children:
        if stop(n):
            break
        out.append(n)
    return out

articles = []
for slug in ARTICLES:
    s = fetch('/bai-viet/' + slug)
    col = s.select_one('.row.my-5 > .col-lg-9')
    datep = col.find('p', class_='text-secondary', recursive=False)
    rel = col.find('h4', string=re.compile('Liên Quan'))
    articles.append({'slug': slug, 'head': head(s), 'hero': hero(s),
                     'html': html_of(body_until(col, lambda n: n is datep)),
                     'date': txt(datep),
                     'related_h': txt(rel),
                     'related': [{'title': txt(a), 'href': link(a['href'])} for a in rel.find_next_sibling('div').select('a')]})

# ---------------------------------------------------------------- news detail samples
news = []
for n in news_list[:NEWS_SAMPLES]:
    s = fetch('/' + n['path'])
    col = s.select_one('.row.my-5 > .col-lg-9')
    kids = [k for k in col.children]
    first_tag = col.select_one('a > span.badge')
    tag_hr = first_tag.parent.find_previous_sibling('hr') if first_tag else None
    datep = col.find('p', class_='text-secondary', recursive=False)
    stop = tag_hr or datep
    tags = []
    if first_tag:
        for a in col.find_all('a', recursive=False):
            sp = a.find('span', class_='badge')
            if sp:
                tags.append({'title': a.get('title', ''), 'text': sp.get_text()})
    rel = col.find('h4', string=re.compile('Liên Quan'))
    related = []
    for d in rel.find_next_sibling('div').select('.d-flex'):
        a = d.select_one('h4 a')
        related.append({'title': txt(a), 'href': link(a['href']), 'img': img(d.select_one('img')['src'])})
    news.append({'path': n['path'], 'head': head(s), 'hero': hero(s),
                 'html': html_of(body_until(col, lambda k: k is stop)),
                 'tags': tags, 'date': txt(datep), 'related_h': txt(rel), 'related': related})

# ---------------------------------------------------------------- misc page heads / titles
heads = {'home': head(fetch('/')), 'san-pham': head(s1), 'san-pham-hero': hero(s1),
         'tin-tuc': head(news_soup), 'tin-tuc-hero': hero(news_soup)}
dm = fetch('/danh-muc/cho-thue-10')
heads['danh-muc'] = head(dm); heads['danh-muc-hero'] = hero(dm)
ch = fetch('/cua-hang-emoto-electric-motorbike-rental')
heads['cua-hang'] = head(ch); heads['cua-hang-hero'] = hero(ch)

data = {'products': products, 'per_page': PER_PAGE, 'articles': articles, 'news_list': news_list,
        'news_pages': news_pages, 'news': news, 'heads': heads}
(ROOT / 'content' / 'data.json').write_text(json.dumps(data, ensure_ascii=False, indent=1), encoding='utf-8')

# ---------------------------------------------------------------- images
missing = []
for p in sorted(IMAGES):
    dest = ROOT / 'assets' / p
    if dest.exists() and dest.stat().st_size:
        continue
    dest.parent.mkdir(parents=True, exist_ok=True)
    try:
        req = urllib.request.Request(BASE + '/' + urllib.parse.quote(p), headers=UA)
        dest.write_bytes(urllib.request.urlopen(req, timeout=60).read())
    except Exception as e:
        missing.append((p, str(e)))
print('products', len(products), 'articles', len(articles), 'news list', len(news_list),
      'news pages', news_pages, 'news samples', len(news), 'images', len(IMAGES), 'missing', missing)
