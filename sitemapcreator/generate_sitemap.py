import csv
import re
from pathlib import Path
from urllib.parse import quote
import xml.etree.ElementTree as ET
from xml.dom import minidom
from datetime import date

def make_slug(s):
    base = re.sub(r'[^a-z0-9]+', '-', str(s or '').lower())
    base = re.sub(r'^-+|-+$', '', base)
    return (base + '-') if base else ''

def main():
    csv_path = Path(__file__).parent / 'titles.csv'
    out_path = Path(__file__).parent / 'sitemap.xml'
    titles = []
    with csv_path.open('r', encoding='utf-8', newline='') as f:
        r = csv.DictReader(f)
        for row in r:
            t = (row.get('title') or '').strip()
            if t:
                titles.append(t)
    seen = set()
    urls = []
    for t in titles:
        slug = make_slug(t)
        if not slug:
            continue
        u = 'https://depotpartori.my' + '/product?slug=' + quote(slug, safe='-_.!~*\'()')
        if u in seen:
            continue
        seen.add(u)
        urls.append(u)
    urlset = ET.Element('urlset', xmlns="http://www.sitemaps.org/schemas/sitemap/0.9")
    for u in urls:
        url_el = ET.SubElement(urlset, 'url')
        loc_el = ET.SubElement(url_el, 'loc')
        loc_el.text = u
        lastmod_el = ET.SubElement(url_el, 'lastmod')
        lastmod_el.text = date.today().isoformat()
        changefreq_el = ET.SubElement(url_el, 'changefreq')
        changefreq_el.text = 'daily'
    xml_bytes = ET.tostring(urlset, encoding='utf-8')
    pretty = minidom.parseString(xml_bytes).toprettyxml(indent="  ", encoding="utf-8")
    with out_path.open('wb') as f:
        f.write(pretty)

if __name__ == '__main__':
    main()
