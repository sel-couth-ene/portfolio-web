"""
Streamlit Community Cloud entry point for the portfolio.

The site itself stays plain HTML (it still works on GitHub Pages as-is).
This wrapper serves each page inside one full-screen component:

  - style.css and the page's scripts are inlined, since the component
    iframe can't fetch sibling files
  - images and PDFs are served by Streamlit's static file serving from
    ./static (a symlink to ./assets), so "assets/..." becomes "app/static/..."
  - links between pages become "?page=<name>", followed from the outermost
    window (see NAV_SCRIPT), which reruns this script with the new page
"""
import re
from pathlib import Path

import streamlit as st
import streamlit.components.v1 as components

ROOT = Path(__file__).parent
PAGES = {
    "home": "index.html",
    "experience": "experience.html",
    "projects": "projects.html",
    "about": "about.html",
    "ask": "ask.html",
}
FILE_TO_PAGE = {file: page for page, file in PAGES.items()}


def inline_assets(html: str) -> str:
    def read(name: str) -> str:
        return (ROOT / name).read_text(encoding="utf-8")

    html = html.replace('<link rel="stylesheet" href="style.css" />', "<style>\n" + read("style.css") + "\n</style>")
    return re.sub(
        r'<script src="([\w/.-]+\.js)"></script>',
        lambda m: "<script>\n" + read(m.group(1)) + "\n</script>",
        html,
    )


def rewrite_links(html: str) -> str:
    # Relative to the app's URL, which the srcdoc iframe inherits as its base.
    # Any quoted path, so the chatbot's avatars and answer links are caught too.
    html = re.sub(r"""(["'])assets/""", r"\1app/static/", html)

    # Page-to-page links reload the app on the right page
    def page_link(m: re.Match) -> str:
        return f'href="./?page={FILE_TO_PAGE[m.group(1)]}" data-page="{FILE_TO_PAGE[m.group(1)]}"'

    html = re.sub(r'href="(' + "|".join(map(re.escape, PAGES.values())) + r')"', page_link, html)

    html = re.sub(r'<a href="(mailto:|tel:)', r'<a data-top href="\1', html)
    return html.replace("</body>", NAV_SCRIPT + "</body>")


# The component iframe's sandbox blocks it from navigating the window, but it
# shares the app's origin. So page, mailto: and tel: links are re-clicked from
# the outermost same-origin window: Streamlit's page locally, Community Cloud's
# wrapper when deployed, whose URL then keeps its own path and swaps ?page=.
NAV_SCRIPT = """<script>
document.addEventListener("click", (e) => {
  const a = e.target.closest("a[data-page], a[data-top]");
  if (!a || e.metaKey || e.ctrlKey || e.shiftKey) return;
  let win = window.parent;
  try { if (window.top.document) win = window.top; } catch (err) {}
  let href = a.href;
  if (a.dataset.page) {
    const url = new URL(win.location.href);
    url.search = "?page=" + a.dataset.page;
    url.hash = "";
    href = url.href;
  }
  const link = win.document.createElement("a");
  link.href = href;
  win.document.body.append(link);
  link.click();
  link.remove();
  e.preventDefault();
});
</script>
"""


@st.cache_data
def build(file: str) -> tuple[str, str]:
    html = (ROOT / file).read_text(encoding="utf-8")
    title = re.search(r"<title>(.*?)</title>", html, re.S).group(1).strip()
    return title, rewrite_links(inline_assets(html))


page = st.query_params.get("page", "home")
if page not in PAGES:
    page = "home"
title, html = build(PAGES[page])

st.set_page_config(page_title=title, page_icon=str(ROOT / "assets/img/sel.jpg"), layout="wide")

# Hide Streamlit's own chrome and let the page fill the window
st.markdown(
    """
    <style>
      header[data-testid="stHeader"], [data-testid="stToolbar"], [data-testid="stDecoration"], footer { display: none !important; }
      .stMainBlockContainer, .block-container { padding: 0 !important; max-width: none !important; }
      [data-testid="stAppViewContainer"], .stApp { background: #f5eee9; }
      [data-testid="stVerticalBlock"] { gap: 0 !important; }
      iframe { display: block; width: 100%; height: 100vh !important; height: 100dvh !important; border: 0; }
    </style>
    """,
    unsafe_allow_html=True,
)

components.html(html, height=900, scrolling=True)
