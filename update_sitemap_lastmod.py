from pathlib import Path
from datetime import date
import sys
import xml.etree.ElementTree as ET

def main():
    # Default to sitemap.xml in the project root; allow override via argv
    if len(sys.argv) > 1:
        sitemap_path = Path(sys.argv[1]).resolve()
    else:
        sitemap_path = Path(__file__).resolve().parent / "sitemap.xml"

    if not sitemap_path.exists():
        print(f"Error: {sitemap_path} not found")
        sys.exit(1)

    today = date.today().isoformat()

    ns = {"sm": "http://www.sitemaps.org/schemas/sitemap/0.9"}
    tree = ET.parse(sitemap_path)
    root = tree.getroot()

    count = 0
    for url_el in root.findall("sm:url", ns):
        lastmod_el = url_el.find("sm:lastmod", ns)
        if lastmod_el is not None:
            lastmod_el.text = today
            count += 1

    tree.write(sitemap_path, encoding="utf-8", xml_declaration=True)
    print(f"Updated {count} lastmod entries to {today} in {sitemap_path}")

if __name__ == "__main__":
    main()
