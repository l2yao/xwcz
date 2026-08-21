"""Python client for the xwcz.org public API (mirror of the former packages/api-client).

Provides the `api` namespace and URL builders used by the sync tools. Base URL
and request params (client=h5, v=2) mirror what the xwcz.org webapp sends.
"""

import json
import urllib.parse
import urllib.request

API_BASE_URL = "https://api.xwcz.org/api/v1/"

MEDIA_HOSTS = {
    "primary": "https://v.xwcz.org/",
    "backup": "https://v2.xwcz.org/",
    "live": "https://live.xwcz.org/",
}

DEFAULT_PARAMS = {"client": "h5", "v": "2"}


class XwczApiError(RuntimeError):
    pass


def request(path, params=None, base_url=API_BASE_URL):
    """GET a xwcz API endpoint, returning the parsed JSON payload."""
    merged = dict(DEFAULT_PARAMS)
    if params:
        merged.update({k: str(v) for k, v in params.items() if v not in (None, "", 0, [])})
    url = urllib.parse.urljoin(base_url, path) + (
        "?" + urllib.parse.urlencode(merged) if merged else ""
    )
    with urllib.request.urlopen(url, timeout=60) as resp:
        payload = json.loads(resp.read().decode("utf-8"))
    if payload.get("code") and payload.get("code") != 200:
        raise XwczApiError(
            "xwcz API {}: {}".format(payload["code"], payload.get("msg") or path)
        )
    return payload


def category_list(model="video", cid=None):
    return request("category/list", {"model": model, "cid": cid})


def album_list(cid, page=1):
    return request("album/list", {"cid": cid, "page": page})


def video_list(aid):
    return request("video/list", {"aid": aid})


def video_content(eid):
    return request("video/content", {"id": eid})


api = {
    "categoryList": category_list,
    "albumList": album_list,
    "videoList": video_list,
    "videoContent": video_content,
}


def _split_num(num):
    if not num:
        return None, None
    parts = str(num).split("-")
    if len(parts) < 2:
        return None, None
    return parts[0], parts[1]


def build_numbered_asset_url(host, folder, num, ext):
    """Build the v.xwcz.org asset URL for a numbered code.

    e.g. build_numbered_asset_url('https://v.xwcz.org/', 'mp3', '15-003-0001', 'mp3')
         -> https://v.xwcz.org/mp3/15/15-003/15-003-0001.mp3
    """
    if not num:
        return ""
    major, minor = _split_num(num)
    if not major or not minor:
        return ""
    base = "{}{}/{}/{}-{}/".format(host, folder, major, major, minor)
    if ext == "m3u8":
        return "{}{}/{}.{}".format(base, num, num, ext)
    return "{}{}.{}".format(base, num, ext)


def get_text_url(num, variant="CHT", ext="doc", host=MEDIA_HOSTS["primary"]):
    return build_numbered_asset_url(host, variant, num, ext)


def get_audio_mp3_url(num, host=MEDIA_HOSTS["primary"]):
    return build_numbered_asset_url(host, "mp3", num, "mp3")


def get_video_mp4_url(num, host=MEDIA_HOSTS["primary"]):
    return build_numbered_asset_url(host, "mp4", num, "mp4")


def get_video_hls_url(num, host=MEDIA_HOSTS["primary"]):
    return build_numbered_asset_url(host, "m3u8", num, "m3u8")


def get_poster_url(num, host=MEDIA_HOSTS["primary"]):
    return build_numbered_asset_url(host, "image", num, "jpg")