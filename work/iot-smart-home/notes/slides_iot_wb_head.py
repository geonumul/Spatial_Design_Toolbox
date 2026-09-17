"""기초 다지기 슬라이드 생성: slides_wb.json (week b). 실행: python build_slides_wb.py"""
import json, math, os, re, sys
from xml.sax.saxutils import escape

sys.stdout.reconfigure(encoding="utf-8")
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "slides_wb.json")

# ---------------------------------------------------------------- 용어 표
# ko: (en, say). 본문에서 [[ko]] 또는 [[ko|은/는]] 으로 쓰면 **ko(en)** + 받침에 맞는 조사가 된다.
# 표기는 rules\용어사전.json 과 같게 한다.
TERMS = {
    # wb-1 전기
    "전압": ("Voltage", "전기를 밀어 주는 힘. 단위는 볼트(V)"),
    "전류": ("Current", "1초 동안 흐르는 전기의 양. 단위는 암페어(A)"),
    "저항": ("Resistance", "전기가 흐르지 못하게 방해하는 정도. 단위는 옴(Ω)"),
    "전력": ("Electric Power", "전기가 1초 동안 하는 일의 양. 단위는 와트(W)"),
    "직류": ("Direct Current", "한쪽 방향으로만 흐르는 전기. 배터리 전기"),
    "교류": ("Alternating Current", "흐르는 방향이 계속 바뀌는 전기. 벽 콘센트 전기"),
    "누전차단기": ("Earth Leakage Circuit Breaker", "전기가 새면 바로 끊어 주는 안전 스위치"),
    "PoE": ("Power over Ethernet", "랜선 하나로 인터넷과 전기를 함께 보내는 기술"),
    "SMPS": ("Switching Mode Power Supply", "콘센트의 교류를 기기가 쓰는 직류로 바꿔 주는 전원 장치"),
    "접지": ("Earth/Ground", "새는 전기를 땅으로 흘려보내 감전을 막는 선"),
    # wb-2 신호
    "아날로그": ("Analog", "끊김 없이 부드럽게 이어지는 실제 세상의 값"),
    "디지털 데이터": ("Digital Data", "컴퓨터가 읽을 수 있게 0과 1로 바꾼 기록"),
    "부호화": ("Encoding", "값을 0과 1 암호표로 바꿔 적기"),
    "비트": ("Bit", "0 또는 1 하나를 담는 가장 작은 칸"),
    "바이트": ("Byte", "비트 8개를 묶은 한 덩어리"),
    "이진수": ("Binary Number", "0과 1 두 숫자만으로 수를 적는 방법"),
    "패킷": ("Packet", "데이터를 작게 나눠 담은 택배 상자"),
    # wb-3 센서
    "센서": ("Sensor", "온도, 밝기, 움직임을 느껴 전기 신호로 바꾸는 집의 눈, 코, 피부"),
    "액추에이터": ("Actuator", "명령을 받아 실제로 움직이는 집의 손발"),
    "PIR 센서": ("Passive Infrared Sensor", "사람이 움직일 때만 반짝 알아채는 적외선 센서"),
    "자이로스코프 센서": ("Gyroscope Sensor", "빙글 도는 빠르기(각속도)를 재는 센서"),
    "도어 센서": ("Door Sensor", "문이 열렸는지 자석의 힘으로 아는 센서"),
    "미세먼지 센서": ("Particulate Matter Sensor", "공기 속 아주 작은 먼지를 재는 센서"),
    "조도 센서": ("Illuminance Sensor", "주변이 얼마나 밝은지 재는 센서"),
    "릴레이": ("Relay", "작은 신호로 큰 전기를 켜고 끄는 스위치 부품"),
    "트리거": ("Trigger", "자동화를 '땅!' 하고 시작시키는 신호"),
    # wb-4 파동
    "주파수": ("Frequency", "1초에 파도가 몇 번 출렁이는지 센 수"),
    "파장": ("Wavelength", "파도 꼭대기에서 다음 꼭대기까지의 길이"),
    "헤르츠": ("Hertz", "주파수의 단위 Hz. 1초에 한 번 출렁이면 1Hz"),
    "주파수 대역": ("Frequency Band", "전파가 다니는 차선. 라디오 채널 묶음"),
    "신호 감쇠": ("Attenuation", "전파가 멀리 가거나 벽을 만나 힘이 빠지는 것"),
    "dB": ("Decibel", "신호가 몇 배 커지거나 줄었는지 나타내는 단위, 데시벨"),
    "회절": ("Diffraction", "전파가 장애물을 돌아서 가는 성질"),
    "채널 간섭": ("Channel Interference", "같은 차선을 쓰는 무선끼리 부딪혀 말이 안 들리는 것"),
    "SNR": ("Signal to Noise Ratio", "잡음에 비해 내 신호가 얼마나 큰지 나타낸 비율"),
    # wb-5 무선의 저울
    "도달 거리": ("Range", "전파가 얼마나 멀리 가는지"),
    "전송 속도": ("Data Rate", "1초에 비트를 몇 개 보내는지. 단위 bps"),
    "대역폭": ("Bandwidth", "한 번에 쓰는 주파수 차선의 폭"),
    "물리적 트레이드오프": ("Trade-off", "하나를 주고 다른 하나를 받는 것"),
    "WPAN": ("Wireless Personal Area Network", "내 몸이나 방 하나 크기 안에서 전기를 조금 쓰는 근거리 무선망"),
    "WLAN": ("Wireless Local Area Network", "집이나 건물 안의 빠른 무선 인터넷망"),
    "WMAN": ("Wireless Metropolitan Area Network", "도시 하나 크기를 덮는 무선망"),
    "WWAN": ("Wireless Wide Area Network", "휴대폰 기지국으로 나라 전체를 잇는 무선망"),
    "LPWAN": ("Low Power Wide Area Network", "전기는 적게 먹고 멀리 가는 무선망"),
    # wb-6 네트워크 모양
    "노드": ("Node", "네트워크에 연결된 기기 하나하나"),
    "토폴로지": ("Topology", "기기들이 이어진 모양"),
    "스타형": ("Star Topology", "가운데 하나에 모두가 바로 붙는 별 모양"),
    "메시 네트워크": ("Mesh Network", "기기들이 서로 쪽지를 릴레이하듯 신호를 이어 주는 그물망"),
    "트리형": ("Tree Topology", "가지를 치듯 위에서 아래로 뻗는 나무 모양"),
    "홈 허브": ("Home Hub", "집 안 기기들을 한데 모아 주는 반장"),
    "네트워크 스위치": ("Network Switch", "같은 네트워크 안의 기기들을 줄로 이어 주는 장치"),
    "라우터": ("Router", "쪽지를 다음 길로 건네주는 전달자"),
    "AP": ("Access Point", "무선 인터넷을 뿌려 주는 기지국 상자"),
    "게이트웨이": ("Gateway", "서로 다른 네트워크 사이의 문이자 통역사"),
    # wb-7 주소와 약속
    "IP 주소": ("IP Address", "인터넷에서 기기를 찾는 논리적 집 주소"),
    "MAC 주소": ("MAC Address", "기기가 태어날 때 받는 물리적 이름표"),
    "포트 번호": ("Port Number", "한 기기 안에서 어느 프로그램에 줄지 정하는 방 번호"),
    "IPv6": ("Internet Protocol version 6", "모든 기기에 인터넷 주소를 넉넉히 붙여 주는 새 주소 체계"),
    "프로토콜": ("Protocol", "기기끼리 대화할 때 지키는 말의 규칙, 서로 쓰는 언어"),
    "OSI 7계층": ("Open Systems Interconnection Model", "통신을 7층짜리 건물로 나눠 생각하기"),
    "표준": ("Standard", "여러 회사가 똑같이 따르기로 정한 공식 규칙"),
    # wb-8 인터넷과 클라우드
    "서버": ("Server", "요청을 받아 일을 해 주는 컴퓨터"),
    "클라우드 컴퓨팅": ("Cloud Computing", "집 밖 먼 곳의 큰 컴퓨터를 빌려 쓰는 방식, 먼 곳의 큰 도서관"),
    "엣지 컴퓨팅": ("Edge Computing", "데이터가 생긴 곳 가까이에서 바로 처리하는 방식, 우리 집 책상"),
    "포그 컴퓨팅": ("Fog Computing", "엣지와 클라우드 사이 로컬 계층에서 처리하는 방식"),
    "지연 시간": ("Latency", "명령하고 기기가 반응할 때까지 기다리는 시간"),
    "IoT 플랫폼": ("IoT Platform", "여러 기기를 한 곳에 모아 관리하는 운동장"),
    "원격 모니터링": ("Remote Monitoring", "집 밖에서도 우리 집 상태를 들여다보기"),
    "로컬 1-Loop": ("Local 1-Loop", "감지부터 실행까지 집 안에서 한 바퀴를 다 도는 자동화"),
    # wb-9 데이터와 AI
    "상태 데이터": ("State Data", "'지금 몇 도야?' 를 주기적으로 계속 알려 주는 데이터"),
    "이벤트 데이터": ("Event Data", "'방금 문 열렸어!' 를 그 순간 한 번 알리는 데이터"),
    "시계열 데이터": ("Time-series Data", "시간 순서대로 쌓인 일기장 같은 데이터"),
    "규칙 기반 자동화": ("Rule-based Automation", "미리 정한 '이러면 저렇게' 약속대로만 움직이는 방식"),
    "머신러닝": ("Machine Learning", "예시를 잔뜩 보고 스스로 규칙을 찾는 컴퓨터"),
    "지도 학습": ("Supervised Learning", "정답이 적힌 문제집으로 공부하기"),
    "비지도 학습": ("Unsupervised Learning", "정답 없이 비슷한 것끼리 스스로 묶어 보기"),
    "강화 학습": ("Reinforcement Learning", "잘하면 칭찬(보상), 못하면 벌점으로 배우기"),
    "다중 클래스 분류": ("Multiclass Classification", "셋 이상 중에서 하나 고르기"),
    # wb-10 보안
    "보안의 3대 원칙": ("CIA Triad", "비밀 지키기, 안 바뀌게 하기, 언제든 쓰게 하기"),
    "기밀성": ("Confidentiality", "허락받은 사람만 볼 수 있게 하기"),
    "무결성": ("Integrity", "내용이 몰래 바뀌지 않게 지키기"),
    "가용성": ("Availability", "필요할 때 언제든 쓸 수 있게 하기"),
    "암호화": ("Encryption", "남이 못 읽게 데이터를 비밀 글씨로 바꾸기"),
    "인증": ("Authentication", "들어오려는 사람이나 기기가 진짜인지 확인하기"),
    "최소 권한 원칙": ("Principle of Least Privilege", "꼭 필요한 열쇠만 나눠 주기"),
    "개인정보 보호법": ("Personal Information Protection Act", "개인 정보를 함부로 모으거나 쓰지 못하게 하는 법"),
    "방화벽": ("Firewall", "정해진 규칙에 맞는 통신만 들여보내는 문지기"),
    # 단원 용어는 아니지만 본문에서 부르는 이름 (용어사전 표기)
    "와이파이": ("Wi-Fi", "집 안의 빠른 무선 인터넷"),
    "지그비": ("Zigbee", "전기를 조금 쓰는 스마트홈용 근거리 무선"),
    "스레드": ("Thread", "스마트홈 기기들이 쓰는 저전력 무선 그물망"),
    "지웨이브": ("Z-Wave", "900MHz 근처 대역을 쓰는 스마트홈용 무선"),
    "블루투스": ("Bluetooth", "휴대폰과 이어폰을 잇는 짧은 거리 무선"),
    "NFC": ("Near Field Communication", "10cm 안에서 톡 대면 통하는 아주 짧은 무선"),
    "허브 방식": ("Hub-based Type", "센서들이 반장(허브)에게 모이는 연결 방법"),
    "홈게이트웨이": ("Home Gateway", "집 안 세대망과 아파트 단지망을 이어 주는 장치"),
    "스마트 플러그": ("Smart Plug", "콘센트에 꽂아 원격으로 전원을 켜고 끄는 플러그"),
}


def josa(word, pair):
    """받침 있을 때/없을 때 조사 쌍 (은/는, 이/가, 을/를, 과/와, 으로/로, 이에요/예요, 이라고/라고)."""
    x, y = pair.split("/")
    # 받침 있을 때 쓰는 쪽을 a 로 (순서를 거꾸로 적어도 되게)
    if x in ("은", "을", "과") or x[0] in "이으":
        a, b = x, y
    else:
        a, b = y, x
    ch = word.strip()[-1]
    ro = a == "으로"
    if "가" <= ch <= "힣":
        jong = (ord(ch) - 0xAC00) % 28
        has = jong != 0 and not (ro and jong == 8)
    elif ch.upper() in "LMNR":
        has = not (ro and ch.upper() in "LR")
    elif word.strip().endswith("v6"):  # IPv6 는 '아이피브이식스'
        has = False
    elif ch in "013678":
        has = not (ro and ch in "178")
    else:
        has = False
    return a if has else b


def show(ko, p=""):
    if ko not in TERMS:
        raise KeyError("모르는 용어 표시: " + ko)
    return "**%s(%s)**" % (ko, TERMS[ko][0]) + (josa(ko, p) if p else "")


def fill(o):
    if isinstance(o, str):
        return re.sub(r"\[\[(.+?)(?:\|(.+?))?\]\]", lambda m: show(m.group(1), m.group(2) or ""), o)
    if isinstance(o, list):
        return [fill(x) for x in o]
    if isinstance(o, dict):
        return {k: (v if k == "svg" else fill(v)) for k, v in o.items()}
    return o


MANTRA = "센서가 느끼고, 네트워크가 나르고, 허브와 플랫폼이 판단하고, 기기가 움직여요."


# ---------------------------------------------------------------- 슬라이드 도우미
def title(big, sub):
    assert len(big) <= 20, big
    return {"kind": "title", "big": big, "sub": sub}


def goal(*items):
    return {"kind": "goal", "items": list(items)}


def pts(head, *items):
    return {"kind": "points", "head": head, "items": list(items)}


def ana(head, scene, *pairs):
    return {"kind": "analogy", "head": head, "scene": scene, "map": [list(p) for p in pairs]}


def fml(head, tex, parts, whole):
    return {"kind": "formula", "head": head, "tex": tex,
            "parts": [{"sym": s, "say": w} for s, w in parts], "whole": whole}


def stp(head, given, steps, answer):
    d = {"kind": "steps", "head": head, "steps": list(steps), "answer": answer}
    if given:
        d["given"] = given
    return d


def cmp(head, cols, rows):
    return {"kind": "compare", "head": head, "cols": list(cols), "rows": [list(r) for r in rows]}


def chk(q, choices, a, why):
    return {"kind": "check", "q": q, "choices": list(choices), "a": a, "why": why}


def warn(head, *items):
    return {"kind": "warn", "head": head, "items": list(items)}


def where(*items):
    return pts("이게 이 과목 어디에 나오나", *items)


def recap(*items):
    return {"kind": "recap", "items": list(items)}


# ---------------------------------------------------------------- SVG 도우미 (클래스만)
W = 480


def tw(s, size):
    """글자 폭 대략 추정 (한글 1em, 영숫자 0.6em, 공백 0.3em)."""
    w = 0.0
    for ch in s:
        w += 0.3 if ch == " " else (1.0 if ord(ch) > 0x2E80 else 0.6)
    return w * size


def _c(c, b):
    return c + (" b%d" % b if b else "")


def R(x, y, w, h, c="box", b=0, rx=2):
    assert 0 <= rx <= 3
    return '<rect x="%g" y="%g" width="%g" height="%g" rx="%g" class="%s"/>' % (x, y, w, h, rx, _c(c, b))


def C(cx, cy, r, c="n", b=0):
    return '<circle cx="%g" cy="%g" r="%g" class="%s"/>' % (cx, cy, r, _c(c, b))


def L(x1, y1, x2, y2, c="e", b=0):
    return '<line x1="%g" y1="%g" x2="%g" y2="%g" class="%s"/>' % (x1, y1, x2, y2, _c(c, b))


def T(x, y, s, c="t", b=0, fs=15, a="middle", maxw=None):
    assert 14 <= fs <= 20
    w = tw(s, fs)
    left = x - w / 2 if a == "middle" else (x if a == "start" else x - w)
    assert left >= 1 and left + w <= W - 1, "화면 밖 글자 %r left=%.0f w=%.0f" % (s, left, w)
    if maxw is not None:
        assert w <= maxw, "글자 넘침 %r %.0f>%s" % (s, w, maxw)
    return '<text x="%g" y="%g" font-size="%d" text-anchor="%s" class="%s">%s</text>' % (
        x, y, fs, a, _c(c, b), escape(s))


def A(x1, y1, x2, y2, c="e2", b=0):
    dx, dy = x2 - x1, y2 - y1
    n = math.hypot(dx, dy)
    ux, uy = dx / n, dy / n
    bx, by = x2 - ux * 10, y2 - uy * 10
    px, py = -uy * 5, ux * 5
    head = '<polygon points="%.1f,%.1f %.1f,%.1f %.1f,%.1f" class="%s"/>' % (
        x2, y2, bx + px, by + py, bx - px, by - py, _c("arrow", b))
    return L(round(x1, 1), round(y1, 1), round(bx, 1), round(by, 1), c, b) + head


def PL(pts_, c="e2", b=0):
    s = " ".join("%.1f,%.1f" % p for p in pts_)
    return '<polyline points="%s" fill="none" class="%s"/>' % (s, _c(c, b))


def wave(x0, x1, ymid, amp, cycles, c="e2", b=0):
    n = 160
    pts_ = [(x0 + (x1 - x0) * i / n, ymid - amp * math.sin(2 * math.pi * cycles * i / n)) for i in range(n + 1)]
    return PL(pts_, c, b)


def BOX(x, y, w, h, lines, c="box", b=0):
    """사각형 + 가운데 정렬 글자 여러 줄. lines = [(글자, 크기, 클래스)]"""
    out = [R(x, y, w, h, c, b)]
    total = sum(sz for _, sz, _ in lines) + 5 * (len(lines) - 1)
    assert total <= h - 4, "상자 높이 부족 %r" % (lines,)
    cy = y + (h - total) / 2
    for s, sz, cl in lines:
        cy += sz
        out.append(T(x + w / 2, round(cy - 2), s, cl, b, sz, maxw=w - 6))
        cy += 5
    return "".join(out)


def fig(head, els, caption, h=270):
    svg = '<svg viewBox="0 0 480 %d" xmlns="http://www.w3.org/2000/svg">%s</svg>' % (h, "".join(els))
    bs = [int(m) for m in re.findall(r'class="[^"]*\bb(\d)\b', svg)]
    return {"kind": "figure", "head": head, "svg": svg, "caption": caption, "builds": max(bs) if bs else 1}


def _strings(o):
    if isinstance(o, str):
        yield o
    elif isinstance(o, list):
        for x in o:
            yield from _strings(x)
    elif isinstance(o, dict):
        for k, v in o.items():
            if k != "svg":
                yield from _strings(v)


def unit(uid, ttl, gl, terms, slides):
    slides = fill(slides)
    body = " ".join(_strings(slides))
    tl = []
    for ko in terms:
        en, say = TERMS[ko]
        n = body.count(ko)
        assert n >= 3, "%s: 용어 %s 가 %d번" % (uid, ko, n)
        tl.append({"ko": ko, "en": en, "say": say})
    names = ", ".join("%s(%s)" % (t["ko"], t["en"]) for t in tl)
    assert slides[-1]["kind"] == "recap"
    slides[-1]["items"].append("오늘의 용어: " + names)
    return {"id": uid, "title": ttl, "goal": fill(gl), "terms": tl, "slides": slides}


UNITS = []
