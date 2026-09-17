# 3강(I3) 회독 레슨 공통 도우미: 용어 표기, 조사, 장면 생성, SVG, 저장
# build_I3_001-016.py, build_I3_017-032.py 가 가져다 쓴다.
import json, math, os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
DICT_PATH = os.path.join(HERE, "..", "rules", "용어사전.json")
DICT = json.load(open(DICT_PATH, encoding="utf-8"))

MANTRA = "센서가 느끼고, 네트워크가 나르고, 허브와 플랫폼이 판단하고, 기기가 움직여요."

# key: (ko, en, 받침) 받침 None 이면 ko 마지막 글자로 계산. 0 모음, 1 받침, 2 ㄹ받침
TERMS = {
    "hub": ("홈 허브", "Home Hub", None),
    "hubtype": ("허브 방식", "Hub-based Type", None),
    "nohub": ("논허브 방식", "Hubless / Non-Hub Type", None),
    "space": ("공간 중심", "Space-centric", None),
    "device": ("기기 중심", "Device-centric", None),
    "l1loop": ("로컬 1-Loop", "Local 1-Loop", 0),
    "loop": ("", "1-Loop", 0),
    "sense": ("감지", "Sense", None),
    "trans": ("전달", "Transmit", None),
    "analyze": ("판단", "Analyze", None),
    "act": ("실행", "Act", None),
    "sensor": ("센서", "Sensor", None),
    "actuator": ("액추에이터", "Actuator", None),
    "pipeline": ("IoT 데이터 파이프라인", "IoT Data Pipeline", None),
    "wpan": ("WPAN", "Wireless Personal Area Network", 1),
    "ieee15": ("", "IEEE 802.15", 0),
    "tradeoff": ("물리적 트레이드오프", "Trade-off", None),
    "wifi": ("와이파이", "Wi-Fi", None),
    "zigbee": ("지그비", "Zigbee", None),
    "thread": ("스레드", "Thread", None),
    "zwave": ("지웨이브", "Z-Wave", None),
    "matter": ("매터", "Matter", None),
    "protocol": ("프로토콜", "Protocol", None),
    "ptrans": ("프로토콜 번역", "Protocol Translation", None),
    "orch": ("로컬 오케스트레이션", "Local Orchestration", None),
    "gateway": ("게이트웨이", "Gateway", None),
    "commission": ("커미셔닝", "Commissioning", None),
    "encrypt": ("암호화", "Encryption", None),
    "firmware": ("펌웨어", "Firmware", None),
    "ap": ("AP", "Access Point", 0),
    "router": ("라우터", "Router", None),
    "coord": ("코디네이터", "Coordinator", None),
    "mesh": ("메시 네트워크", "Mesh Network", None),
    "packet": ("패킷", "Packet", None),
    "standalone": ("독립형 전용 허브", "Standalone Hub", None),
    "embedded": ("가전/스피커 내장형 허브", "Embedded Hub", None),
    "wallhub": ("아파트 월패드 연동형 허브", "Wallpad & Bridge Hub", None),
    "wallpad": ("세대단말기", "Wall Pad", None),
    "bridge": ("브릿지", "Bridge", None),
    "always": ("상시 전원", "Always-on Power", None),
    "shield": ("금속 차폐", "Metal Shielding", None),
    "deadzone": ("음영 지역", "Dead Zone", None),
    "chint": ("채널 간섭", "Channel Interference", None),
    "band": ("주파수 대역", "Frequency Band", None),
    "b24": ("2.4GHz 대역", "2.4 GHz Band", None),
    "sub1": ("", "Sub-1GHz", 0),
    "ism": ("ISM 대역", "ISM Band", None),
    "straight": ("전파 직진성", "Straightness of Propagation", None),
    "diffr": ("회절", "Diffraction", None),
    "penet": ("투과력", "Penetration", None),
    "ieee154": ("", "IEEE 802.15.4", 0),
    "enddev": ("엔드 디바이스", "End Device", None),
    "selfheal": ("자가 치유", "Self-Healing", None),
    "sleep": ("Sleep 상태", "Sleep Mode", None),
    "rtable": ("라우팅 테이블", "Routing Table", None),
    "topo": ("토폴로지", "Topology", None),
    "ble": ("Bluetooth LE", "Bluetooth Low Energy", 0),
    "blemesh": ("BLE Mesh", "Bluetooth Low Energy Mesh", 0),
    "provision": ("프로비저닝", "Provisioning", None),
    "panelsync": ("패널 동기화", "Panel Sync", None),
    "threeway": ("3로 스위치", "3-way Switch", None),
    "plug": ("스마트 플러그", "Smart Plug", None),
    "switch": ("스마트 스위치", "Smart Switch", None),
    "scenario": ("자동화 시나리오", "Automation Scenario", None),
    "atten": ("신호 감쇠", "Attenuation", None),
    "repeater": ("중계기", "Repeater", None),
    "bt": ("블루투스", "Bluetooth", None),
    "edge": ("엣지 컴퓨팅", "Edge Computing", None),
    "cloud": ("클라우드 컴퓨팅", "Cloud Computing", None),
    "nfc": ("NFC", "Near Field Communication", 0),
    "sniff": ("스니핑", "Sniffing", None),
    "uwb": ("UWB", "Ultra-Wideband", 0),
    "relay": ("릴레이 공격", "Relay Attack", None),
    "rfid": ("RFID", "Radio Frequency Identification", 0),
    "range": ("도달 거리", "Range", None),
    "rate": ("전송 속도", "Data Rate", None),
    "wlan": ("WLAN", "Wireless Local Area Network", 1),
    "division": ("통신 분업 설계", "Communication Division Design", None),
    "rangeorder": ("무선 네트워크 통신 범위 순서", "WPAN < WLAN < WMAN < WWAN", None),
    "btsig": ("Bluetooth SIG", "Bluetooth Special Interest Group", 0),
    "tgroup": ("", "Thread Group", 1),
    "rs485": ("", "RS-485", 0),
    "frag": ("파편화", "Fragmentation", None),
    "ocf": ("OCF", "Open Connectivity Foundation", 0),
    "csa": ("CSA", "Connectivity Standards Alliance", 0),
    "hca": ("HCA", "Home Connectivity Alliance", 0),
    "c2c": ("C2C", "Cloud to Cloud", 0),
    "stack": ("프로토콜 스택", "Protocol Stack", None),
    "applayer": ("애플리케이션 계층", "Application Layer", None),
    "phylayer": ("물리 계층", "Physical Layer", None),
    "ipv6": ("IPv6", "Internet Protocol version 6", 0),
    "interop": ("상호운용성", "Interoperability", None),
    "tbr": ("보더 라우터", "Thread Border Router", None),
    "mot": ("", "Matter over Thread", 0),
    "pathloss": ("경로 손실", "Path Loss", None),
    "db": ("dB", "Decibel", 2),
    "rssi": ("RSSI", "Received Signal Strength Indicator", 0),
    "dbm": ("dBm", "Decibel-milliwatts", 1),
    "lqi": ("LQI", "Link Quality Indicator", 0),
    "snr": ("SNR", "Signal to Noise Ratio", 2),
    "noise": ("노이즈 플로어", "Noise Floor", None),
    "retry": ("패킷 재전송률", "Packet Retry Rate", None),
}

# 조사: 받침형 -> (받침형, 모음형). "으로" 는 ㄹ 받침이면 "로"
JOSA = {
    "은": ("은", "는"), "이": ("이", "가"), "을": ("을", "를"), "과": ("과", "와"),
    "으로": ("으로", "로"), "이라고": ("이라고", "라고"), "이라는": ("이라는", "라는"),
    "이에요": ("이에요", "예요"), "이나": ("이나", "나"), "이고": ("이고", "고"),
    "이며": ("이며", "며"), "이지만": ("이지만", "지만"), "이라서": ("이라서", "라서"),
    "이란": ("이란", "란"), "이죠": ("이죠", "죠"), "이랑": ("이랑", "랑"), "이야": ("이야", "야"),
    "이었어요": ("이었어요", "였어요"), "이요": ("이요", "요"),
}


def _fin(key):
    ko, en, f = TERMS[key]
    if f is not None:
        return f
    c = (ko or en)[-1]
    if "가" <= c <= "힣":
        jong = (ord(c) - 0xAC00) % 28
        return 0 if jong == 0 else (2 if jong == 8 else 1)
    raise ValueError(f"받침을 모름: {key}")


def disp(key):
    ko, en, _ = TERMS[key]
    return f"**{ko}({en})**" if ko and en else f"**{ko or en}**"


def K(key, josa=""):
    """용어 표기 + 조사. 조사는 받침형으로 적는다(은, 이, 을, 과, 으로 ...)."""
    s = disp(key)
    if not josa:
        return s
    if josa in JOSA:
        f = _fin(key)
        if josa == "으로":
            return s + ("으로" if f == 1 else "로")
        return s + (JOSA[josa][0] if f >= 1 else JOSA[josa][1])
    return s + josa


def gloss_entry(key):
    ko, en, _ = TERMS[key]
    for d in DICT:
        if (d.get("ko") or "") == ko and (d.get("en") or "") == en:
            g = {"ko": ko, "en": en, "say": d["say"]}
            if d.get("more"):
                g["more"] = d["more"]
            return g
    raise KeyError(f"용어 사전에 없음: {key} {ko} {en}")


# ---------------- 장면 ----------------
W, H = 1400, 990


def say(*lines):
    return {"kind": "say", "lines": list(lines)}


def look(head, *boxes):
    """boxes: (x1, y1, x2, y2, 설명) 픽셀(1400x990 그림 기준)"""
    out = []
    for x1, y1, x2, y2, s in boxes:
        out.append({"x": round(x1 / W, 3), "y": round(y1 / H, 3),
                    "w": round((x2 - x1) / W, 3), "h": round((y2 - y1) / H, 3), "say": s})
    return {"kind": "look", "head": head, "boxes": out}


def points(head, *items):
    return {"kind": "points", "head": head, "items": list(items)}


def analogy(head, scene, *pairs):
    return {"kind": "analogy", "head": head, "scene": scene, "map": [list(p) for p in pairs]}


def compare(head, cols, *rows):
    return {"kind": "compare", "head": head, "cols": list(cols), "rows": [list(r) for r in rows]}


def steps(head, stps, answer, given=None):
    d = {"kind": "steps", "head": head}
    if given:
        d["given"] = given
    d["steps"] = list(stps)
    d["answer"] = answer
    return d


def figure(head, svg, caption, builds):
    return {"kind": "figure", "head": head, "svg": svg, "caption": caption, "builds": builds}


def check(q, choices, a, why):
    return {"kind": "check", "q": q, "choices": list(choices), "a": a, "why": why}


def warn(head, *items):
    return {"kind": "warn", "head": head, "items": list(items)}


def exam(src, q, qko, solve, answer):
    return {"kind": "exam", "src": src, "q": q, "qko": qko, "solve": list(solve), "answer": answer}


def english(head, en, ko, tip=None):
    d = {"kind": "english", "head": head, "en": en, "ko": ko}
    if tip:
        d["tip"] = tip
    return d


def bg(src, *lines):
    return {"kind": "bg", "src": src, "lines": list(lines)}


def recap(*items):
    return {"kind": "recap", "items": list(items)}


# ---------------- SVG ----------------
def _b(b):
    return f" b{b}" if b else ""


def TX(x, y, s, cls="t", fs=15, anc="middle", b=0):
    s = s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
    return f'<text x="{x}" y="{y}" font-size="{fs}" text-anchor="{anc}" class="{cls}{_b(b)}">{s}</text>'


def R(x, y, w, h, cls="box", b=0, rx=2):
    return f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{rx}" class="{cls}{_b(b)}"/>'


def C(x, y, r, cls="n", b=0):
    return f'<circle cx="{x}" cy="{y}" r="{r}" class="{cls}{_b(b)}"/>'


def L(x1, y1, x2, y2, cls="e", b=0):
    return f'<line x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" class="{cls}{_b(b)}"/>'


def A(x1, y1, x2, y2, cls="e2", b=0):
    ang = math.atan2(y2 - y1, x2 - x1)
    hx, hy = x2 - 9 * math.cos(ang), y2 - 9 * math.sin(ang)
    px, py = -math.sin(ang) * 5, math.cos(ang) * 5
    pts = f"{x2:.0f},{y2:.0f} {hx + px:.0f},{hy + py:.0f} {hx - px:.0f},{hy - py:.0f}"
    return L(x1, y1, f"{hx:.0f}", f"{hy:.0f}", cls, b) + f'<polygon points="{pts}" class="arrow{_b(b)}"/>'


def NODE(x, y, r, label, cls="n", b=0, fs=14):
    return C(x, y, r, cls, b) + TX(x, y + fs // 3 + 1, label, "tl", fs, "middle", b)


def BOX(x, y, w, h, label, cls="box", tcls="tb", b=0, fs=15):
    return R(x, y, w, h, cls, b) + TX(x + w / 2, y + h / 2 + fs // 3 + 1, label, tcls, fs, "middle", b)


def SVG(*parts, h=270):
    return f'<svg viewBox="0 0 480 {h}" xmlns="http://www.w3.org/2000/svg">' + "".join(parts) + "</svg>"


# ---------------- 저장 ----------------
BAD = [chr(0x2014), chr(0x2013), chr(0xB7), chr(0x30FB)]


def _text(o):
    if isinstance(o, str):
        yield o
    elif isinstance(o, list):
        for x in o:
            yield from _text(x)
    elif isinstance(o, dict):
        for k, v in o.items():
            if k != "svg":
                yield from _text(v)


def build(path, deck, lo, hi, slides):
    gl_keys = []
    for s in slides:
        body = " ".join(_text([s.get(f"pass{i}", []) for i in range(1, 6)]))
        terms = []
        for key in TERMS:
            if disp(key) in body:
                ko, en, _ = TERMS[key]
                terms.append(en or ko)
                if key not in gl_keys:
                    gl_keys.append(key)
        s["terms"] = terms
    out = {"deck": deck, "from": lo, "to": hi,
           "glossary": [gloss_entry(k) for k in gl_keys],
           "slides": [{"p": s["p"], "title": s["title"], "terms": s["terms"],
                       **{f"pass{i}": s.get(f"pass{i}", []) for i in range(1, 6)}} for s in slides]}
    raw = json.dumps(out, ensure_ascii=False, indent=1)
    for ch in BAD:
        if ch in raw:
            i = raw.index(ch)
            raise ValueError(f"금지 문자 {ch!r}: {raw[max(0, i - 40):i + 10]}")
    # 줄 길이 점검(70자 권장)
    for s in out["slides"]:
        for i in range(1, 6):
            for f in s[f"pass{i}"]:
                if f["kind"] == "say":
                    for ln in f["lines"]:
                        if len(re.sub(r"\*\*", "", ln)) > 90:
                            print(f"  긴 줄 p.{s['p']} pass{i}: {ln[:40]}...")
    with open(path, "w", encoding="utf-8") as fp:
        fp.write(raw)
    print(f"저장 {path}: 쪽 {len(slides)}, 용어 {len(gl_keys)}")
    return out
