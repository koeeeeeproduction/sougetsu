import os
import contextlib
import time
import json
import sys
import re
import argparse
import tempfile
import warnings


warnings.filterwarnings("ignore")

def format_timestamp(seconds):
    hours = int(seconds // 3600)
    minutes = int((seconds % 3600) // 60)
    secs = int(seconds % 60)
    millis = int((seconds % 1) * 1000)
    return f"{hours:02d}:{minutes:02d}:{secs:02d},{millis:03d}"


def _clamp_to_range(start, end, real_preroll):



















    if start >= 0.0:
        return (start, end)
    if end > 0.0:
        return (0.0, end)
    if real_preroll > 0.001:
        return None
    duration = max(0.05, end - start)
    return (0.0, duration)




















_HEAD_GAP_SECONDS = 2.0
_HEAD_MAX_SECONDS = 90.0
_HEAD_SILENCE_RMS = 0.004
_HEAD_PAD_SECONDS = 1.0
_HEAD_FILLERS = ("thank you", "thanks for watching", "thank you for watching", "thanks for watching!",
                 "please subscribe", "subscribe", "subtitles by the amara.org community", "you", "bye",
                 "music", "applause", "so", "okay", "oh")


def _flex_num(value, fallback=None):
    try:
        number = float(value)
        if number != number:
            return fallback
        return number
    except (TypeError, ValueError):
        return fallback


def _flex_first_heard(result):
    for segment in result.get('segments') or []:
        for word in segment.get('words') or []:
            start = _flex_num(word.get('start'))
            if start is not None:
                return start
        start = _flex_num(segment.get('start'))
        if start is not None and str(segment.get('text') or '').strip():
            return start
    return None


def _flex_is_filler(text):
    plain = re.sub(r"[\[\(].*?[\]\)]", " ", text or "")
    plain = re.sub(r"[^\w\s']", " ", plain, flags=re.UNICODE)
    plain = re.sub(r"\s+", " ", plain).strip().lower()
    return (not plain) or plain in _HEAD_FILLERS


def _flex_head_rescue(model, result, wav_path, head_at, transcribe_args):

    temp_path = None
    try:
        import wave
        import array
        import math
        with wave.open(wav_path, 'rb') as source:
            if source.getnchannels() != 1 or source.getsampwidth() != 2:
                return 0
            rate = source.getframerate()
            total = source.getnframes() / float(rate)
            first = _flex_first_heard(result)
            if first is None:
                first = total
            if first - head_at < _HEAD_GAP_SECONDS:
                return 0
            span_end = min(first + 0.25, head_at + _HEAD_MAX_SECONDS, total)
            if span_end - head_at < 1.0:
                return 0
            source.setpos(int(head_at * rate))
            raw = source.readframes(int((span_end - head_at) * rate))
        samples = array.array('h')
        samples.frombytes(raw[:len(raw) - (len(raw) % 2)])
        if sys.byteorder == 'big':
            samples.byteswap()
        if not len(samples):
            return 0
        step = max(1, len(samples) // 200000)
        picked = samples[::step]
        rms = math.sqrt(sum(float(v) * float(v) for v in picked) / len(picked)) / 32768.0
        if rms < _HEAD_SILENCE_RMS:
            return 0

        print("No captions were found for the first %.1fs although there is sound there. Listening to the opening again on its own..." % (first - head_at))
        temp_path = os.path.join(tempfile.gettempdir(), "flex_head_%d.wav" % os.getpid())
        with wave.open(temp_path, 'wb') as target:
            target.setnchannels(1)
            target.setsampwidth(2)
            target.setframerate(rate)
            target.writeframes(b"\x00\x00" * int(_HEAD_PAD_SECONDS * rate))
            if sys.byteorder == 'big':
                samples.byteswap()
            target.writeframes(samples.tobytes())
            target.writeframes(b"\x00\x00" * int(0.5 * rate))

        retry = dict(transcribe_args or {})
        retry['word_timestamps'] = True
        retry['condition_on_previous_text'] = False
        if 'language' not in retry and result.get('language'):
            retry['language'] = result.get('language')
        head = model.transcribe(temp_path, verbose=False, **retry)

        limit = first - 0.05
        recovered = []
        for segment in head.get('segments') or []:
            if _flex_num(segment.get('avg_logprob'), 0.0) < -1.0:
                continue
            if _flex_num(segment.get('compression_ratio'), 0.0) > 2.4:
                continue
            if _flex_num(segment.get('no_speech_prob'), 0.0) > 0.6:
                continue
            words = []
            for word in segment.get('words') or []:
                start = _flex_num(word.get('start'))
                end = _flex_num(word.get('end'))
                if start is None or end is None:
                    continue
                start = start - _HEAD_PAD_SECONDS + head_at
                end = end - _HEAD_PAD_SECONDS + head_at
                if end > limit:
                    break
                if start < head_at:
                    start = head_at
                if end <= start:
                    end = start + 0.05
                placed = dict(word)
                placed['start'] = round(start, 3)
                placed['end'] = round(end, 3)
                words.append(placed)
            text = "".join(str(w.get('word') or '') for w in words).strip()
            if not words or _flex_is_filler(text):
                continue
            recovered.append({'start': words[0]['start'], 'end': words[-1]['end'], 'text': " " + text,
                              'words': words, 'avg_logprob': segment.get('avg_logprob'),
                              'no_speech_prob': segment.get('no_speech_prob'), 'flex_rescued': True})
        if not recovered:
            print("Nothing intelligible in the opening; leaving it without captions.")
            return 0
        merged = recovered + list(result.get('segments') or [])
        for number, segment in enumerate(merged):
            segment['id'] = number
        result['segments'] = merged
        result['text'] = " ".join(str(s.get('text') or '').strip() for s in merged).strip()
        count = sum(len(s['words']) for s in recovered)
        print("Recovered %d word(s) from the opening %.1fs." % (count, first - head_at))
        return count
    except Exception as rescue_error:
        print("Could not re-check the opening (%s); continuing with the first pass." % rescue_error)
        return 0
    finally:
        if temp_path and os.path.exists(temp_path):
            try:
                os.remove(temp_path)
            except Exception:
                pass


def _flex_sort_words_into_range(result, pad_start, real_preroll, sel_duration):

    segments = result.get('segments') or []
    low = float(pad_start or 0.0)
    high = (low + float(sel_duration)) if sel_duration is not None else None
    synthetic = not (real_preroll and real_preroll > 0.001)
    kept_segments, early, dropped_before, dropped_after = [], [], 0, 0
    for segment in segments:
        words = segment.get('words') or []
        if not words:
            kept_segments.append(segment)
            continue
        kept, changed = [], False
        for word in words:
            start = _flex_num(word.get('start'), _flex_num(segment.get('start'), low))
            end = _flex_num(word.get('end'), _flex_num(segment.get('end'), start))
            if end <= low + 0.02:
                if not synthetic:
                    dropped_before += 1
                    changed = True
                    continue
                early.append(word)
                changed = True
            elif start < low:
                word['start'] = low
                changed = True
            if high is not None and start >= high - 0.02:
                dropped_after += 1
                changed = True
                continue
            kept.append(word)
        if not kept:
            continue
        if changed:
            segment['words'] = kept
            segment['text'] = " " + "".join(str(w.get('word') or '') for w in kept).strip()
        kept_segments.append(segment)

    if early:
        following = None
        for segment in kept_segments:
            for word in segment.get('words') or []:
                if word not in early:
                    following = _flex_num(word.get('start'))
                    break
            if following is not None:
                break
        lengths = [max(0.08, (_flex_num(w.get('end'), 0.0) - _flex_num(w.get('start'), 0.0))) for w in early]
        room = (following - low) if following is not None else sum(lengths)
        room = max(room, 0.05 * len(early))
        scale = min(1.0, room / sum(lengths))
        cursor = low
        for word, length in zip(early, lengths):
            word['start'] = round(cursor, 3)
            cursor += length * scale
            word['end'] = round(cursor, 3)

    for segment in kept_segments:
        words = segment.get('words') or []
        if words:
            first_start = _flex_num(words[0].get('start'))
            last_end = _flex_num(words[-1].get('end'))
            if first_start is not None and last_end is not None and last_end > first_start:
                if _flex_num(segment.get('start'), first_start) < first_start or segment.get('flex_rescued'):
                    segment['start'] = first_start
                if high is not None and _flex_num(segment.get('end'), last_end) > max(last_end, high):
                    segment['end'] = last_end
    result['segments'] = kept_segments
    if dropped_before or dropped_after or early:
        print("Range edges: %d word(s) before it and %d after it left out, %d opening word(s) kept at the top." % (dropped_before, dropped_after, len(early)))
    return result


def _flex_fix_opening(model, result, wav_path, pad_start, real_preroll, start_time, end_time, transcribe_args):
    try:
        is_wav = bool(wav_path) and str(wav_path).lower().endswith(".wav")
        if is_wav:
            _flex_head_rescue(model, result, wav_path, float(pad_start or 0.0), transcribe_args)
        sel_duration = (end_time - start_time) if (start_time is not None and end_time is not None) else None
        _flex_sort_words_into_range(result, pad_start, real_preroll, sel_duration)
    except Exception as opening_error:
        print("Opening check skipped (%s)." % opening_error)
    return result


def generate_srt(result, max_words=0, fill_gaps=False, start_time=None, end_time=None, pad_start=0.0, real_preroll=0.0):
    blocks = []
    sel_duration = (end_time - start_time) if (start_time is not None and end_time is not None) else None

    for segment in result.get('segments', []):
        words = segment.get('words', [])
        if max_words > 0:
            if words:

                for i in range(0, len(words), max_words):
                    chunk = words[i:i + max_words]
                    raw_start = chunk[0].get('start', segment['start'])
                    raw_end = chunk[-1].get('end', segment['end'])

                    start = raw_start - pad_start
                    end = raw_end - pad_start


                    _placed = _clamp_to_range(start, end, real_preroll)
                    if _placed is None:
                        continue
                    start, end = _placed


                    if sel_duration is not None:
                        if start >= sel_duration:
                            continue
                        if end > sel_duration:
                            end = sel_duration

                    text = "".join([w.get('word', '') for w in chunk]).strip()
                    if text:
                        blocks.append({'start': start, 'end': end, 'text': text})
            else:

                seg_words = segment['text'].strip().split()
                if not seg_words:
                    continue

                duration = segment['end'] - segment['start']
                num_words = len(seg_words)
                for i in range(0, num_words, max_words):
                    chunk_words = seg_words[i:i + max_words]
                    word_start_idx = i
                    word_end_idx = min(i + max_words, num_words)

                    raw_start = segment['start'] + (word_start_idx / num_words) * duration
                    raw_end = segment['start'] + (word_end_idx / num_words) * duration

                    start = raw_start - pad_start
                    end = raw_end - pad_start


                    _placed = _clamp_to_range(start, end, real_preroll)
                    if _placed is None:
                        continue
                    start, end = _placed


                    if sel_duration is not None:
                        if start >= sel_duration:
                            continue
                        if end > sel_duration:
                            end = sel_duration

                    text = " ".join(chunk_words).strip()
                    if text:
                        blocks.append({'start': start, 'end': end, 'text': text})
        else:
            raw_start = segment['start']
            raw_end = segment['end']

            start = raw_start - pad_start
            end = raw_end - pad_start


            _placed = _clamp_to_range(start, end, real_preroll)
            if _placed is None:
                continue
            start, end = _placed


            if sel_duration is not None:
                if start >= sel_duration:
                    continue
                if end > sel_duration:
                    end = sel_duration

            text = segment['text'].strip()
            if text:
                blocks.append({'start': start, 'end': end, 'text': text})


    if fill_gaps and len(blocks) > 1:
        for i in range(len(blocks) - 1):
            curr_end = blocks[i]['end']
            next_start = blocks[i+1]['start']
            if next_start > curr_end and (next_start - curr_end) < 2.0:
                blocks[i]['end'] = next_start

    srt_content = ""
    idx = 1
    for b in blocks:
        srt_content += f"{idx}\n{format_timestamp(b['start'])} --> {format_timestamp(b['end'])}\n{b['text']}\n\n"
        idx += 1
    return srt_content


















_VOWELS = {
    'अ': 'a', 'आ': 'aa', 'इ': 'i', 'ई': 'ee', 'उ': 'u', 'ऊ': 'oo',
    'ऋ': 'ri', 'ए': 'e', 'ऐ': 'ai', 'ओ': 'o', 'औ': 'au',
    'ऑ': 'o', 'ऍ': 'e',
}

_MATRAS = {
    'ा': 'aa', 'ि': 'i', 'ी': 'ee', 'ु': 'u', 'ू': 'oo', 'ृ': 'ri',
    'े': 'e', 'ै': 'ai', 'ो': 'o', 'ौ': 'au', 'ॉ': 'o', 'ॅ': 'e',
}

_CONSONANTS = {
    'क': 'k', 'ख': 'kh', 'ग': 'g', 'घ': 'gh', 'ङ': 'n',
    'च': 'ch', 'छ': 'chh', 'ज': 'j', 'झ': 'jh', 'ञ': 'n',
    'ट': 't', 'ठ': 'th', 'ड': 'd', 'ढ': 'dh', 'ण': 'n',
    'त': 't', 'थ': 'th', 'द': 'd', 'ध': 'dh', 'न': 'n',
    'प': 'p', 'फ': 'ph', 'ब': 'b', 'भ': 'bh', 'म': 'm',
    'य': 'y', 'र': 'r', 'ल': 'l', 'व': 'v', 'ळ': 'l',
    'श': 'sh', 'ष': 'sh', 'स': 's', 'ह': 'h',

    'क़': 'q', 'ख़': 'kh', 'ग़': 'gh', 'ज़': 'z', 'ड़': 'r', 'ढ़': 'rh',
    'फ़': 'f', 'य़': 'y',
}

_SIGNS = {
    'ं': 'n', 'ँ': 'n', 'ः': 'h', 'ॐ': 'om',
    '।': '.', '॥': '.', '़': '',
}

_DIGITS = {'०': '0', '१': '1', '२': '2', '३': '3', '४': '4',
           '५': '5', '६': '6', '७': '7', '८': '8', '९': '9'}

_VIRAMA = '्'
_ZWNJ = '‌'
_ZWJ = '‍'


def _is_devanagari(ch):
    return 'ऀ' <= ch <= 'ॿ'


def transliterate_word(word):

    out = []
    i = 0
    n = len(word)
    while i < n:
        ch = word[i]


        if i + 1 < n and word[i + 1] == '़' and (ch + '़') in _CONSONANTS:
            ch = ch + '़'
            i += 1

        if ch in _CONSONANTS:
            out.append(_CONSONANTS[ch])
            nxt = word[i + 1] if i + 1 < n else ''
            if nxt == _VIRAMA:

                i += 2
                continue
            if nxt in _MATRAS:
                out.append(_MATRAS[nxt])
                i += 2
                continue
            if nxt in (_ZWNJ, _ZWJ):
                i += 2
                continue



            at_end = (i + 1 >= n) or not _is_devanagari(word[i + 1])
            if not at_end:
                out.append('a')
            i += 1
            continue

        if ch in _VOWELS:
            out.append(_VOWELS[ch]); i += 1; continue
        if ch in _MATRAS:
            out.append(_MATRAS[ch]); i += 1; continue
        if ch in _SIGNS:
            out.append(_SIGNS[ch]); i += 1; continue
        if ch in _DIGITS:
            out.append(_DIGITS[ch]); i += 1; continue
        if ch == _VIRAMA or ch in (_ZWNJ, _ZWJ):
            i += 1; continue



        out.append(ch)
        i += 1
    return ''.join(out)


def has_devanagari(text):
    return any(_is_devanagari(c) for c in (text or ''))


def to_roman(text):

    if not text or not has_devanagari(text):
        return text
    parts = []
    for token in text.split(' '):
        parts.append(transliterate_word(token) if has_devanagari(token) else token)
    return ' '.join(parts)





_COMMON = {
    'हम': 'hum', 'नहीं': 'nahi', 'हूँ': 'hoon', 'हूं': 'hoon',
    'यह': 'yeh', 'वह': 'woh', 'ये': 'ye', 'वो': 'wo',
    'यहाँ': 'yahan', 'वहाँ': 'wahan', 'कहाँ': 'kahan', 'जहाँ': 'jahan',
    'मैंने': 'maine', 'तुमने': 'tumne', 'उसने': 'usne', 'हमने': 'humne',
    'कुछ': 'kuch', 'बहुत': 'bahut', 'और': 'aur', 'मुझे': 'mujhe',
    'तुम्हें': 'tumhe', 'हमें': 'hamein', 'उन्हें': 'unhe',
    'क्यों': 'kyun', 'क्योंकि': 'kyunki', 'इसलिए': 'isliye',
    'लेकिन': 'lekin', 'सिर्फ़': 'sirf', 'सिर्फ': 'sirf',
    'ज़्यादा': 'zyada', 'ठीक': 'theek', 'साथ': 'saath',
    'अभी': 'abhi', 'कभी': 'kabhi', 'सब': 'sab', 'लोग': 'log',
}


def _polish(word):

    if len(word) > 2 and word.endswith('aa'):
        return word[:-2] + 'a'
    return word


_transliterate_word_raw = transliterate_word


def transliterate_word(word):
    stripped = word.strip('।॥.,!?;:"‘’“”()')
    if stripped in _COMMON:
        return word.replace(stripped, _COMMON[stripped])
    return _polish(_transliterate_word_raw(word))

















CLOUD_BASE = ""  # vendor cloud disabled in this build




CLOUD_PREFIX = os.environ.get("FLEX_AI_TRANSCRIBE_PREFIX", "/v1/flex-ai/transcribe")
CLOUD_POLL_CEILING = 5.0
CLOUD_JOB_DEADLINE = 900.0


class CloudError(Exception):


    def __init__(self, message, code="", retryable=False, payload=None):
        Exception.__init__(self, message)
        self.code = code
        self.retryable = retryable
        self.payload = payload or {}


def _cloud_auth_headers():






    headers = {"Accept": "application/json"}
    jwt = os.environ.get("FLEX_SESSION_JWT", "").strip()
    if jwt:
        headers["Authorization"] = "Bearer " + jwt
        return headers
    key = os.environ.get("FLEX_LICENSE_KEY", "").strip()
    install = os.environ.get("FLEX_INSTALL_ID", "").strip()
    if not key:
        raise CloudError(
            "No licence key was supplied to the cloud engine. The panel passes it in "
            "the environment as FLEX_LICENSE_KEY.",
            code="INVALID_LICENSE")
    headers["X-Flex-License-Key"] = key
    if install:
        headers["X-Install-ID"] = install
    return headers


def _cloud_call(method, url, body=None, headers=None, timeout=60.0, raw_body=None,
                content_type="application/json"):








    raise CloudError("Cloud AI is not available in this version.", code="404")
    import urllib.request
    import urllib.error

    send = raw_body if raw_body is not None else (
        json.dumps(body).encode("utf-8") if body is not None else None)

    req = urllib.request.Request(url, data=send, method=method)
    for name, value in (headers or {}).items():
        req.add_header(name, value)
    if send is not None:
        req.add_header("Content-Type", content_type)

    try:
        response = urllib.request.urlopen(req, timeout=timeout)
        status, text = response.getcode(), response.read().decode("utf-8", "replace")
    except urllib.error.HTTPError as http_error:
        status = http_error.code
        try:
            text = http_error.read().decode("utf-8", "replace")
        except Exception:
            text = ""
    except Exception as transport_error:
        raise CloudError("Could not reach Akira AI: %s" % transport_error,
                         code="NETWORK", retryable=True)

    try:
        parsed = json.loads(text) if text.strip() else {}
    except ValueError:
        snippet = " ".join(text.split())[:180]
        raise CloudError(
            "Akira AI returned something that is not JSON (HTTP %s). %s" % (status, snippet),
            code="BAD_GATEWAY_BODY", retryable=True)







    if isinstance(parsed, dict):
        err = parsed.get("error")
        failed = parsed.get("success") is False or (
            isinstance(err, dict) and err.get("message") and parsed.get("success") is not True)
        if failed:
            err = err if isinstance(err, dict) else {}
            raise CloudError(err.get("message") or "The request was refused.",
                             code=str(err.get("code") or (status if status >= 400 else "")),
                             retryable=bool(err.get("retryable")),
                             payload=parsed)




        if status >= 400 and not err and parsed.get("success") is not True:
            raise CloudError("Akira AI answered HTTP %s with no explanation." % status,
                             code=str(status), retryable=status >= 500, payload=parsed)
    return parsed


def _audio_duration(path):









    import re
    import subprocess

    try:
        out = subprocess.run(
            ["ffprobe", "-v", "error", "-show_entries", "format=duration",
             "-of", "default=noprint_wrappers=1:nokey=1", path],
            capture_output=True, text=True, timeout=30)
        value = float((out.stdout or "").strip())
        if value > 0:
            return value
    except Exception:
        pass



    try:
        out = subprocess.run(["ffmpeg", "-i", path],
                             capture_output=True, text=True, timeout=60)
        found = re.search(r"Duration:\s*(\d+):(\d\d):(\d\d(?:\.\d+)?)",
                          (out.stderr or "") + (out.stdout or ""))
        if found:
            hours, minutes, seconds = found.groups()
            value = int(hours) * 3600 + int(minutes) * 60 + float(seconds)
            if value > 0:
                return value
    except Exception:
        pass

    try:
        import wave
        with contextlib.closing(wave.open(path, "rb")) as handle:
            return handle.getnframes() / float(handle.getframerate())
    except Exception:
        pass



    try:
        kbps = float(os.environ.get("FLEX_UPLOAD_KBPS", "") or 0)
        if kbps > 0:
            return (os.path.getsize(path) * 8.0) / (kbps * 1000.0)
    except Exception:
        pass
    return 0.0


AUDIO_MIME = {
    ".wav": "audio/wav",   ".m4a": "audio/mp4",  ".mp4": "audio/mp4",
    ".mp3": "audio/mpeg",  ".aac": "audio/aac",  ".flac": "audio/flac",
    ".ogg": "audio/ogg",   ".opus": "audio/opus", ".aiff": "audio/aiff",
}


def _audio_mime(path):
    return AUDIO_MIME.get(os.path.splitext(path)[1].lower(), "audio/wav")


def cloud_transcribe(audio_path, language=None, diarization=False, on_status=None, tier="standard"):


    def say(message):
        if on_status:
            on_status(message)
        else:
            print(message)

    headers = _cloud_auth_headers()
    size = os.path.getsize(audio_path)
    duration = _audio_duration(audio_path)



    say("Checking your Akira AI balance...")
    init = _cloud_call("POST", CLOUD_BASE + CLOUD_PREFIX + "/init", body={
        "duration_seconds": round(duration, 2),
        "file_size_bytes": size,
        "audio_format": os.path.splitext(audio_path)[1].lstrip(".").lower(),
        "language": language or None,
        "diarization": bool(diarization),



        "tier": tier or "standard",
    }, headers=headers, timeout=45.0)





    available = init.get("available_credits")
    if available is not None:
        print("FLEXAI_CREDITS:%s" % available)

    job_id = init.get("job_id")





    upload_url = str(init.get("direct_upload_url") or init.get("upload_url") or "")
    if upload_url and not upload_url.lower().startswith(("http://", "https://")):
        upload_url = CLOUD_BASE.rstrip("/") + "/" + upload_url.lstrip("/")

    if not job_id or not upload_url:
        raise CloudError("Akira AI did not return a job to upload to.", code="BAD_INIT")








    say("Uploading %.1f MB of audio..." % (size / 1048576.0))
    with open(audio_path, "rb") as handle:
        payload = handle.read()
    _cloud_call("PUT", upload_url, raw_body=payload,
                headers={"Accept": "*/*"},
                content_type=_audio_mime(audio_path),
                timeout=max(120.0, size / 20000.0))

    say("Transcribing on Akira AI...")

    def start_job():
        return _cloud_call("POST", CLOUD_BASE + CLOUD_PREFIX + "/jobs/%s/start" % job_id,
                           body={}, headers=headers, timeout=45.0)

    try:
        started = start_job()
    except CloudError as start_error:





        if start_error.code != "AUDIO_NOT_UPLOADED":
            raise
        say("Akira AI did not see the upload; sending it once more...")
        _cloud_call("POST", upload_url, raw_body=payload,
                    headers={"Accept": "*/*"},
                    content_type="application/octet-stream",
                    timeout=max(120.0, size / 20000.0))
        started = start_job()


    interval = min(CLOUD_POLL_CEILING,
                   max(1.0, float(started.get("poll_interval_ms",
                                              init.get("poll_interval_ms", 3000))) / 1000.0))



    try:
        server_deadline = float(init.get("deadline_seconds") or 0)
    except (TypeError, ValueError):
        server_deadline = 0.0
    budget = max(CLOUD_JOB_DEADLINE, server_deadline + 120.0) if server_deadline else CLOUD_JOB_DEADLINE
    deadline = time.time() + budget
    last_progress = -1.0








    first_poll = True
    while True:
        if time.time() > deadline:
            cloud_cancel(job_id)
            raise CloudError(
                "Akira AI did not finish within %d minutes. The job was cancelled and any "
                "held credits released." % int(budget / 60), code="TIMEOUT")

        if first_poll:
            first_poll = False
        else:
            time.sleep(interval)
        state = _cloud_call("GET",
                            CLOUD_BASE + CLOUD_PREFIX + "/jobs/%s" % job_id,
                            headers=headers, timeout=45.0)
        status = str(state.get("status", "")).lower()




        served = state.get("provider") or state.get("tier")
        if served and not getattr(cloud_transcribe, "_said_provider", None) == served:
            cloud_transcribe._said_provider = served
            say("Engine: %s" % served)

        if status in ("completed", "done", "succeeded"):
            done = _cloud_normalise(state.get("result") or state)
            left = (done.get("billing") or {}).get("balance_remaining")
            if left is not None:
                print("FLEXAI_CREDITS:%s" % left)
            return done
        if status in ("failed", "error", "cancelled"):
            err = state.get("error") or {}
            raise CloudError(err.get("message") or "Akira AI could not transcribe that audio.",
                             code=err.get("code", "FAILED"))




        progress = float(state.get("progress") or 0.0)
        if progress > 1.0:
            progress = progress / 100.0
        if progress > 1.0:
            progress = 1.0
        if progress > last_progress + 0.04:
            last_progress = progress
            say("Transcribing... %d%%" % int(progress * 100))


def cloud_cancel(job_id):

    try:
        _cloud_call("POST",
                    CLOUD_BASE + CLOUD_PREFIX + "/jobs/%s/cancel" % job_id,
                    body={}, headers=_cloud_auth_headers(), timeout=20.0)
    except Exception:
        pass


def _cloud_normalise(result):







    segments = []
    for raw in (result.get("segments") or []):
        words = []
        for word in (raw.get("words") or []):
            text = str(word.get("word") or word.get("text") or "").strip()
            if not text:
                continue
            try:
                start, end = float(word.get("start")), float(word.get("end"))
            except (TypeError, ValueError):
                continue
            if end <= start:
                continue






            entry = {"word": " " + text, "start": start, "end": end}
            if word.get("speaker"):
                entry["speaker"] = word["speaker"]
            words.append(entry)

        try:
            seg_start = float(raw.get("start", 0.0))
            seg_end = float(raw.get("end", 0.0))
        except (TypeError, ValueError):
            continue

        segment = {"start": seg_start, "end": seg_end,
                   "text": str(raw.get("text") or "").strip(), "words": words}
        if raw.get("speaker"):
            segment["speaker"] = raw["speaker"]
        segments.append(segment)

    if not segments:
        raise CloudError("Akira AI returned no speech for that audio.", code="EMPTY_RESULT")

    return {
        "text": str(result.get("text") or " ".join(s["text"] for s in segments)).strip(),
        "language": result.get("language"),
        "segments": segments,
        "speakers": result.get("speakers") or [],
        "billing": result.get("billing") or {},
    }


class _CloudModel(object):







    def __init__(self, diarization=True, tier="standard"):
        self.diarization = diarization
        self.tier = tier

    def transcribe(self, path, verbose=False, **kwargs):
        return cloud_transcribe(
            path,
            language=kwargs.get("language"),
            diarization=self.diarization,
            tier=self.tier,
        )


def _flex_cloud_words(result):
    words = []
    for segment in result.get("segments", []) or []:
        for word in segment.get("words", []) or []:
            try:
                start, end = float(word.get("start")), float(word.get("end"))
            except (TypeError, ValueError):
                continue
            if end > start:
                words.append((start, end, word))
    words.sort(key=lambda item: item[0])
    return words


def _flex_cloud_cut(result, total):






    words = _flex_cloud_words(result)
    if not words or total <= 0:
        return None
    lengths = sorted(end - start for start, end, _ in words)
    median = lengths[len(lengths) // 2]
    limit = max(2.5, median * 6.0)
    for start, end, _ in words:
        if end - start > limit and total - start > 2.0:
            return start
    last_end = max(end for _, end, _ in words)
    if total - last_end > 3.0:
        return last_end
    return None


def _flex_cut_audio(src, start, dst, for_upload):
    import subprocess
    cmd = ["ffmpeg", "-y", "-ss", "%.3f" % max(0.0, start), "-i", src, "-vn", "-ac", "1", "-ar", "16000"]
    if for_upload:
        cmd += ["-c:a", "aac", "-b:a", "64k"]
    else:
        cmd += ["-c:a", "pcm_s16le"]
    subprocess.run(cmd + [dst], check=True, capture_output=True)
    return dst


def _flex_shift(result, offset, keep_from):

    out = []
    for segment in result.get("segments", []) or []:
        words = []
        for word in segment.get("words", []) or []:
            try:
                start, end = float(word.get("start")) + offset, float(word.get("end")) + offset
            except (TypeError, ValueError):
                continue
            if end <= start or (start + end) / 2.0 < keep_from:
                continue
            moved = dict(word)
            moved["start"], moved["end"] = start, end
            words.append(moved)
        if not words:
            continue
        seg = dict(segment)
        seg["words"] = words
        seg["start"], seg["end"] = words[0]["start"], words[-1]["end"]
        seg["text"] = "".join(w.get("word", "") for w in words).strip()
        out.append(seg)
    return out


def _flex_head(result, cut):

    out = []
    for segment in result.get("segments", []) or []:
        words = []
        for word in segment.get("words", []) or []:
            try:
                start, end = float(word.get("start")), float(word.get("end"))
            except (TypeError, ValueError):
                continue
            if start < cut - 0.02 and end <= cut + 0.35:
                words.append(word)
        if not words:
            continue
        seg = dict(segment)
        seg["words"] = words
        seg["end"] = min(float(segment.get("end", words[-1]["end"])), float(words[-1]["end"]))
        seg["text"] = "".join(w.get("word", "") for w in words).strip()
        out.append(seg)
    return out


def _flex_trim_stretched(result):

    words = _flex_cloud_words(result)
    for i, (start, end, word) in enumerate(words):
        text = str(word.get("word") or "").strip()
        natural = min(1.6, max(0.35, 0.2 + 0.09 * len(text)))
        if end - start > max(2.5, natural * 4):
            nxt = words[i + 1][0] if i + 1 < len(words) else None
            new_end = start + natural
            if nxt is not None:
                new_end = min(new_end, max(start + 0.05, nxt))
            word["end"] = new_end
    for segment in result.get("segments", []) or []:
        ws = segment.get("words") or []
        if ws:
            try:
                segment["end"] = float(ws[-1]["end"])
            except (TypeError, ValueError, KeyError):
                pass
    return result


def _flex_join_tail(result, tail, cut, lead):


    head = _flex_head(result, cut)
    head_end = cut
    for segment in head:
        for word in segment.get("words", []) or []:
            try:
                head_end = max(head_end, float(word.get("end")))
            except (TypeError, ValueError):
                pass
    added = []
    for segment in _flex_shift(tail, cut - lead, cut - 0.05):
        kept = []
        for word in segment["words"]:
            if word["start"] < head_end:
                if word["end"] <= head_end + 0.05:
                    continue
                word["start"] = head_end
            kept.append(word)
        if kept:
            segment["words"] = kept
            segment["start"] = kept[0]["start"]
            segment["text"] = "".join(w.get("word", "") for w in kept).strip()
            added.append(segment)
    result["segments"] = head + added
    result["text"] = " ".join(s.get("text", "") for s in result["segments"]).strip()
    return bool(added)


def _flex_local_complete(model, result, audio_path, transcribe_args):




    total = 0.0
    try:
        total = float(_audio_duration(audio_path) or 0.0)
    except Exception:
        total = 0.0
    args = dict(transcribe_args)
    if not _FLEX_STATE["keep_prompt"]:
        args.pop("initial_prompt", None)
    args["condition_on_previous_text"] = False
    for attempt in range(4):
        cut = _flex_cloud_cut(result, total)
        if cut is None:
            break
        print("Whisper stopped following the speech at %.1fs of %.1fs; transcribing the rest again..." % (cut, total))
        lead = min(0.3, cut)
        tail_file = None
        try:
            tail_file = _flex_cut_audio(audio_path, cut - lead, os.path.join(tempfile.gettempdir(), "flex_local_tail_%d_%d.wav" % (os.getpid(), attempt)), False)
            tail = model.transcribe(tail_file, verbose=False, **args)
        except Exception as tail_error:
            print("  could not transcribe the rest: %s" % tail_error)
            tail = None
        if tail_file:
            try:
                os.remove(tail_file)
            except Exception:
                pass
        if tail is None:
            break
        if not _flex_join_tail(result, tail, cut, lead):
            print("  no more speech after %.1fs." % cut)
            break
    return _flex_trim_stretched(result)


def _flex_cloud_complete(model, result, audio_path, transcribe_args, local_model_name):



    total = 0.0
    try:
        total = float(_audio_duration(audio_path) or 0.0)
    except Exception:
        total = 0.0
    local = None
    for attempt in range(4):
        cut = _flex_cloud_cut(result, total)
        if cut is None:
            break
        print("Akira AI stopped following the speech at %.1fs of %.1fs; transcribing the rest..." % (cut, total))
        lead = min(0.3, cut)
        tail = None
        tail_file = None
        try:
            if local is None:
                import whisper
                local = whisper.load_model(_flex_load_name(local_model_name))
            tail_file = _flex_cut_audio(audio_path, cut - lead, os.path.join(tempfile.gettempdir(), "flex_tail_%d_%d.wav" % (os.getpid(), attempt)), False)
            tail = local.transcribe(tail_file, verbose=False, **transcribe_args)
            print("  the rest came from the local Whisper engine.")
        except Exception:
            tail = None
        if tail is None:
            try:
                tail_file = _flex_cut_audio(audio_path, cut - lead, os.path.join(tempfile.gettempdir(), "flex_tail_%d_%d.m4a" % (os.getpid(), attempt)), True)
                tail = model.transcribe(tail_file, verbose=False, **transcribe_args)
                print("  the rest came from a second Akira AI pass (%.0fs of audio)." % (total - cut + lead))
            except CloudError as tail_error:
                print("  could not transcribe the rest: %s" % tail_error)
                tail = None
            except Exception as tail_error:
                print("  could not transcribe the rest: %s" % tail_error)
                tail = None
        if tail_file:
            try:
                os.remove(tail_file)
            except Exception:
                pass
        if tail is None:
            break
        if not _flex_join_tail(result, tail, cut, lead):
            print("  no more speech after %.1fs." % cut)
            break
        result["text"] = " ".join(s.get("text", "") for s in result["segments"]).strip()
    return _flex_trim_stretched(result)










_FLEX_KEPT_MODELS = ("turbo", "medium", "large")
_FLEX_MODEL_ALIASES = {
    "tiny": "turbo", "tiny.en": "turbo", "base": "turbo", "base.en": "turbo",
    "small": "turbo", "small.en": "turbo", "medium.en": "medium",
    "large-v1": "large", "large-v2": "large", "large-v3": "large",
    "large-v3-turbo": "turbo",
}
_FLEX_MODEL_LABELS = {"turbo": "Large V3 Turbo", "medium": "Medium", "large": "Large V3", "hinglish": "Flex Hinglish"}


def _flex_whisper_cache():
    root = os.environ.get("XDG_CACHE_HOME") or os.path.join(os.path.expanduser("~"), ".cache")
    return os.path.join(root, "whisper")


def _flex_model_file(name):

    names = {"turbo": ("large-v3-turbo.pt",), "medium": ("medium.pt",),
             "large": ("large-v3.pt", "large-v2.pt")}.get(name, ())
    for filename in names:
        full = os.path.join(_flex_whisper_cache(), filename)
        try:
            if os.path.getsize(full) > 10000000:
                return filename
        except OSError:
            pass
    return None


def _flex_fallback_model():
    wanted = os.environ.get("FLEX_LOCAL_FALLBACK_MODEL", "").strip().lower()
    wanted = _FLEX_MODEL_ALIASES.get(wanted, wanted)
    if wanted in _FLEX_KEPT_MODELS:
        return wanted
    for name in ("turbo", "medium", "large"):
        if _flex_model_file(name):
            return name
    return "turbo"


def _flex_resolve_model(name):

    raw = (name or "").strip()
    key = raw.lower()
    if key in _FLEX_KEPT_MODELS:
        return key
    if key == "hinglish" and _flex_hinglish_file():
        return key
    mapped = _FLEX_MODEL_ALIASES.get(key)
    if not mapped or not _flex_model_file(mapped):


        for name in ("turbo", "medium", "large"):
            if _flex_model_file(name):
                mapped = name
                break
        mapped = mapped or _flex_fallback_model()
    if mapped != key:
        print("Model '%s' is no longer offered; using %s." % (raw or "none", _FLEX_MODEL_LABELS[mapped]))
    return mapped


def _flex_load_name(name):


    if name == "large" and _flex_model_file("large") == "large-v2.pt":
        return "large-v2"
    return name


def _flex_decode_args(model_name):










    return {"condition_on_previous_text": False}


def _flex_detect_language(model, audio_path):



    try:
        import numpy as np
        import whisper
        audio = whisper.load_audio(audio_path)
    except Exception as detect_error:
        print("NOTE: language detection fell back to Whisper's own (%s)." % detect_error)
        return None
    rate, window = 16000, 30 * 16000
    if len(audio) < rate:
        return None
    hop = 10 * rate
    starts = list(range(0, max(1, len(audio) - window + 1), hop)) or [0]
    energy = []
    for start in starts:
        chunk = audio[start:start + window]
        energy.append(float(np.sqrt(np.mean(chunk * chunk))) if len(chunk) else 0.0)
    ranked = sorted(range(len(starts)), key=lambda i: -energy[i])[:4]
    totals = {}
    try:
        n_mels = getattr(model.dims, "n_mels", 80)
        for index in sorted(ranked):
            if energy[index] < 0.004:
                continue
            chunk = whisper.pad_or_trim(audio[starts[index]:starts[index] + window])
            mel = whisper.log_mel_spectrogram(chunk, n_mels).to(model.device)
            _, probs = model.detect_language(mel)
            for code, p in probs.items():
                totals[code] = totals.get(code, 0.0) + float(p)
    except Exception as detect_error:
        print("NOTE: language detection fell back to Whisper's own (%s)." % detect_error)
        return None
    if not totals:
        return None
    best = max(totals, key=totals.get)
    share = totals[best] / max(1e-9, sum(totals.values()))
    print("Detected language: %s (%d%% across %d part(s) of the audio)."
          % (_FLEX_LANGUAGE_NAMES.get(best, best).title(), round(share * 100), len(ranked)))
    return best


_FLEX_LANGUAGE_NAMES = {
    "en": "english", "zh": "chinese", "de": "german", "es": "spanish", "ru": "russian", "ko": "korean",
    "fr": "french", "ja": "japanese", "pt": "portuguese", "tr": "turkish", "pl": "polish", "ca": "catalan",
    "nl": "dutch", "ar": "arabic", "sv": "swedish", "it": "italian", "id": "indonesian", "hi": "hindi",
    "fi": "finnish", "vi": "vietnamese", "he": "hebrew", "uk": "ukrainian", "el": "greek", "ms": "malay",
    "cs": "czech", "ro": "romanian", "da": "danish", "hu": "hungarian", "ta": "tamil", "no": "norwegian",
    "th": "thai", "ur": "urdu", "hr": "croatian", "bg": "bulgarian", "lt": "lithuanian", "la": "latin",
    "mi": "maori", "ml": "malayalam", "cy": "welsh", "sk": "slovak", "te": "telugu", "fa": "persian",
    "lv": "latvian", "bn": "bengali", "sr": "serbian", "az": "azerbaijani", "sl": "slovenian", "kn": "kannada",
    "et": "estonian", "mk": "macedonian", "br": "breton", "eu": "basque", "is": "icelandic", "hy": "armenian",
    "ne": "nepali", "mn": "mongolian", "bs": "bosnian", "kk": "kazakh", "sq": "albanian", "sw": "swahili",
    "gl": "galician", "mr": "marathi", "pa": "punjabi", "si": "sinhala", "km": "khmer", "sn": "shona",
    "yo": "yoruba", "so": "somali", "af": "afrikaans", "oc": "occitan", "ka": "georgian", "be": "belarusian",
    "tg": "tajik", "sd": "sindhi", "gu": "gujarati", "am": "amharic", "yi": "yiddish", "lo": "lao",
    "uz": "uzbek", "fo": "faroese", "ht": "haitian creole", "ps": "pashto", "tk": "turkmen", "nn": "nynorsk",
    "mt": "maltese", "sa": "sanskrit", "lb": "luxembourgish", "my": "burmese", "bo": "tibetan",
    "tl": "tagalog", "mg": "malagasy", "as": "assamese", "tt": "tatar", "haw": "hawaiian", "ln": "lingala",
    "ha": "hausa", "ba": "bashkir", "jw": "javanese", "su": "sundanese", "yue": "cantonese",
}
_FLEX_TRANSLATE_EXTRA = {
    "hi-latn": "Hinglish: Hindi written in Roman (Latin) letters, with everyday English words left in English",
    "zh-tw": "Traditional Chinese",
    "pt-br": "Brazilian Portuguese",
}


_FLEX_NO_SPACE = ("zh", "zh-tw", "ja", "th", "lo", "km", "my", "bo", "yue")


def _flex_language_name(code):
    code = (code or "").strip().lower()
    if code in _FLEX_TRANSLATE_EXTRA:
        return _FLEX_TRANSLATE_EXTRA[code]
    return _FLEX_LANGUAGE_NAMES.get(code, code).title()


def _flex_split_units(text, lang):


    text = " ".join((text or "").split())
    if not text:
        return []
    if (lang or "").lower() not in _FLEX_NO_SPACE:
        return [" " + w for w in text.split(" ")]
    import unicodedata
    units = []
    for ch in text:
        if ch.isspace():
            if units and not units[-1].endswith(" "):
                units[-1] += " "
            continue
        cat = unicodedata.category(ch)
        joins = bool(units) and (
            cat in ("Mn", "Mc", "Me") or cat.startswith("P")
            or (ch.isascii() and ch.isalnum() and units[-1][-1:].isascii() and units[-1][-1:].isalnum()))
        if joins:
            units[-1] += ch
        else:
            units.append(ch)
    return units


def _flex_retime(segment, units):

    spoken = []
    for word in segment.get("words", []) or []:
        try:
            start, end = float(word.get("start")), float(word.get("end"))
        except (TypeError, ValueError):
            continue
        if end > start:
            spoken.append((start, end))
    if spoken:
        start, end = spoken[0][0], spoken[-1][1]
    else:
        start, end = float(segment.get("start", 0.0)), float(segment.get("end", 0.0))
    if end <= start:
        end = start + 0.25 * max(1, len(units))
    weights = [max(1, len(u.strip())) for u in units]
    total = float(sum(weights)) or 1.0
    out, cursor = [], start
    for unit, weight in zip(units, weights):
        step = (end - start) * weight / total
        out.append({"word": unit, "start": round(cursor, 3), "end": round(cursor + step, 3),
                    "probability": 1.0})
        cursor += step
    return out


def _flex_chat(payload):
    import uuid
    url = CLOUD_BASE.rstrip("/") + os.environ.get("FLEX_AI_CHAT_PATH", "/v1/flex-ai/chat")
    headers = _cloud_auth_headers()
    headers["Idempotency-Key"] = str(uuid.uuid4())
    headers["X-Product-Name"] = "Akira AI"
    install = os.environ.get("FLEX_INSTALL_ID", "").strip()
    if install:
        payload = dict(payload, installId=install)
    for attempt in range(3):
        try:
            return _cloud_call("POST", url, body=payload, headers=headers, timeout=150.0)
        except CloudError as chat_error:
            data = chat_error.payload or {}
            message = data.get("message") or data.get("error")
            if isinstance(message, str) and message and str(chat_error) == "The request was refused.":
                chat_error = CloudError(message, code=chat_error.code, retryable=chat_error.retryable, payload=data)
            limited = chat_error.code in ("429", "RATE_LIMITED") or "rate limit" in str(chat_error).lower()
            if attempt < 2 and (limited or chat_error.code in ("NETWORK", "BAD_GATEWAY_BODY", "500", "502", "503", "504")):
                wait = data.get("retry_after") or data.get("retryAfter") or (8 if limited else 3)
                try:
                    wait = min(30.0, max(1.0, float(wait)))
                except (TypeError, ValueError):
                    wait = 5.0
                print("Akira AI is busy; retrying the translation in %d s..." % wait)
                time.sleep(wait)
                continue
            raise chat_error


_FLEX_TRANSLATE_SCHEMA = {
    "type": "OBJECT",
    "properties": {
        "items": {
            "type": "ARRAY",
            "items": {
                "type": "OBJECT",
                "properties": {"id": {"type": "INTEGER"}, "text": {"type": "STRING"}},
                "required": ["id", "text"],
                "propertyOrdering": ["id", "text"],
            },
        }
    },
    "required": ["items"],
}


def _flex_translate_batch(batch, context, source, target):
    tgt = _flex_language_name(target)
    src = _flex_language_name(source) if source else "the spoken language"
    instruction = (
        "You translate video captions from %s to %s. Translate every caption so it reads as natural, "
        "spoken %s that fits on screen. Keep the meaning and tone. Keep names, brands, numbers, URLs "
        "and code exactly as they are. Never merge, split, drop, reorder or add captions: return one "
        "item for every id you receive, with the same id. If a caption is already in %s, return it "
        "unchanged. Return only the translation, with no notes." % (src, tgt, tgt, tgt))
    body = {"captions": [{"id": i, "text": t} for i, t in batch]}
    if context:
        body["context_before"] = context
    payload = {
        "prompt": json.dumps(body, ensure_ascii=False),
        "system_instruction": instruction,
        "response_schema": _FLEX_TRANSLATE_SCHEMA,
        "max_tokens": 8192,
        "temperature": 0.2,
        "clientVersion": "flex-stt-2",
    }
    data = _flex_chat(payload)
    reply = data.get("reply") if isinstance(data, dict) else None
    if isinstance(data, dict) and data.get("remainingCredits") is not None:
        try:
            print("FLEXAI_CREDITS:%d" % int(data.get("remainingCredits")))
        except (TypeError, ValueError):
            pass
    try:
        parsed = json.loads(reply) if isinstance(reply, str) else (reply or {})
    except ValueError:
        parsed = {}
    out = {}
    for item in (parsed.get("items") if isinstance(parsed, dict) else None) or []:
        try:
            key = int(item.get("id"))
        except (TypeError, ValueError, AttributeError):
            continue
        text = " ".join(str(item.get("text") or "").split())
        if text:
            out[key] = text
    charged = data.get("creditsCharged", 0) if isinstance(data, dict) else 0
    return out, charged


def flex_translate_result(result, target, source=None):



    segments = [s for s in result.get("segments", []) or [] if (s.get("text") or "").strip()]
    if not segments:
        return 0
    lines = [(i, " ".join(s["text"].split())) for i, s in enumerate(segments)]
    batches, current, size = [], [], 0
    for item in lines:
        if current and (len(current) >= 40 or size + len(item[1]) > 4000):
            batches.append(current)
            current, size = [], 0
        current.append(item)
        size += len(item[1])
    if current:
        batches.append(current)

    translated, credits = {}, 0
    name = _flex_language_name(target)
    for number, batch in enumerate(batches):
        print("Translating to %s... %d%%" % (name, int(100 * number / len(batches))))
        context = [t for _, t in lines[max(0, batch[0][0] - 3):batch[0][0]]]
        got, charged = _flex_translate_batch(batch, context, source, target)
        credits += charged or 0
        missing = [item for item in batch if item[0] not in got]
        if missing:
            again, charged = _flex_translate_batch(missing, context, source, target)
            credits += charged or 0
            got.update(again)
        translated.update(got)

    kept = 0
    for i, segment in enumerate(segments):
        text = translated.get(i)
        if not text:
            kept += 1
            continue
        units = _flex_split_units(text, target)
        segment["text"] = ("" if target in _FLEX_NO_SPACE else " ") + text
        segment["words"] = _flex_retime(segment, units)
    result["text"] = "".join(s.get("text", "") for s in result.get("segments", []) or [])
    result["translated_to"] = target
    print("Translating to %s... 100%%" % name)
    print("Translated %d caption(s) to %s%s." % (len(segments) - kept, name,
          (" (%s Akira AI credit(s))" % credits) if credits else ""))
    if kept:
        print("NOTE: %d caption(s) came back untranslated and were left as spoken." % kept)
    return len(segments) - kept


def _flex_whisper_translate(model, model_name, audio_path, transcribe_args):


    import whisper
    translator = model
    if model_name == "turbo":
        translator = None
        for name in ("large", "medium"):
            if _flex_model_file(name):
                print("Loading %s for offline translation..." % _FLEX_MODEL_LABELS[name])
                translator = whisper.load_model(_flex_load_name(name))
                break
        if translator is None:
            return None
    args = dict(transcribe_args)
    args.pop("initial_prompt", None)
    args["task"] = "translate"
    if _FLEX_STATE.get("spoken"):
        args["language"] = _FLEX_STATE["spoken"]
        args.pop("carry_initial_prompt", None)
    print("Translating to English offline with Whisper...")
    return translator.transcribe(audio_path, verbose=False, **args)


def _flex_apply_translation(target, result, model, model_name, audio_path, transcribe_args,
                            pad_start, real_preroll, start_time, end_time, local_engine):



    target = (target or "").strip().lower()
    if not target or target in ("off", "none"):
        return result
    source = (_FLEX_STATE.get("spoken") or result.get("language") or transcribe_args.get("language") or "").strip().lower() or None
    if source and source == target:
        print("Captions are already in %s; nothing to translate." % _flex_language_name(target))
        return result
    if target != "en":
        print("NOTE: translation to %s is not available offline; only English is." % _flex_language_name(target))
    if target == "en" and local_engine:
        try:
            english = _flex_whisper_translate(model, model_name, audio_path, transcribe_args)
            if english and english.get("segments"):
                sel_duration = (end_time - start_time) if (start_time is not None and end_time is not None) else None
                _flex_sort_words_into_range(english, pad_start, real_preroll, sel_duration)
                english["translated_to"] = "en"
                print("Translated to English offline (%d caption(s))." % len(english.get("segments") or []))
                return english
            print("NOTE: offline translation needs the Large V3 or Medium model; Turbo cannot translate.")
        except Exception as offline_error:
            print("NOTE: offline translation failed: %s" % offline_error)
    print("Captions were kept in the spoken language.")
    return result










_FLEX_HINGLISH_PROMPT = ("Kya aap bhi video editing seekhna chahte ho? Toh simply After Effects open karo, "
                         "layer select karo aur effect apply kar do.")
_FLEX_STATE = {"keep_prompt": False, "spoken": None}


def _flex_carry_supported():
    try:
        import inspect
        import whisper
        return "carry_initial_prompt" in inspect.signature(whisper.transcribe).parameters
    except Exception:
        return False


def _flex_hinglish_policy(transcribe_args, roman):


    prompt = transcribe_args.get("initial_prompt") or ""
    if prompt and has_devanagari(prompt):
        transcribe_args.pop("initial_prompt", None)
    if roman and transcribe_args.get("language") in ("hi", "ur"):
        _FLEX_STATE["spoken"] = transcribe_args.get("language")
        transcribe_args["language"] = "en"
        transcribe_args["initial_prompt"] = _FLEX_HINGLISH_PROMPT
        if _flex_carry_supported():


            transcribe_args["carry_initial_prompt"] = True
        else:

            transcribe_args["condition_on_previous_text"] = True
        _FLEX_STATE["keep_prompt"] = True
        print("Hinglish: Whisper writes Roman Hinglish directly; English words stay in English.")
    return transcribe_args


def _flex_tokens(text):
    return re.findall(r"[a-z0-9']+", str(text or "").lower())


def _flex_is_prompt_echo(text, prompt):


    a, b = _flex_tokens(text), _flex_tokens(prompt)
    if len(a) < 6 or len(b) < 6:
        return False
    grams = set(tuple(b[i:i + 6]) for i in range(len(b) - 5))
    return any(tuple(a[i:i + 6]) in grams for i in range(len(a) - 5))


def _flex_drop_prompt_echo(result, transcribe_args):
    prompt = (transcribe_args or {}).get("initial_prompt") or ""
    if not prompt:
        return result
    kept, dropped = [], 0
    for segment in result.get("segments") or []:
        if _flex_is_prompt_echo(segment.get("text"), prompt):
            dropped += 1
            continue
        kept.append(segment)
    if dropped:
        for number, segment in enumerate(kept):
            segment["id"] = number
        result["segments"] = kept
        result["text"] = " ".join(str(s.get("text") or "").strip() for s in kept).strip()
        print("Removed %d caption(s) that only repeated the transcription prompt." % dropped)
    return result


def _flex_gap_rescue(model, result, wav_path, transcribe_args):



    temp_path = None
    try:
        import wave
        import array
        import math
        if not wav_path or not str(wav_path).lower().endswith(".wav"):
            return result
        with wave.open(wav_path, "rb") as source:
            if source.getnchannels() != 1 or source.getsampwidth() != 2:
                return result
            rate = source.getframerate()
            raw = source.readframes(source.getnframes())
        pcm = array.array("h")
        pcm.frombytes(raw[:len(raw) - (len(raw) % 2)])
        if sys.byteorder == "big":
            pcm.byteswap()

        def rms(a, b):
            lo, hi = max(0, int(a * rate)), min(len(pcm), int(b * rate))
            if hi - lo < rate // 10:
                return 0.0
            step = max(1, (hi - lo) // 40000)
            part = pcm[lo:hi:step]
            return math.sqrt(sum(float(v) * float(v) for v in part) / len(part)) / 32768.0

        words = []
        for segment in result.get("segments") or []:
            for word in segment.get("words") or []:
                start, end = _flex_num(word.get("start")), _flex_num(word.get("end"))
                if start is not None and end is not None and end > start:
                    words.append((start, end))
        words.sort()
        if len(words) < 2:
            return result
        spoken = sorted(rms(a, b) for a, b in words[:200])
        floor = max(0.01, 0.35 * spoken[len(spoken) // 2])
        gaps = []
        for (a0, a1), (b0, b1) in zip(words, words[1:]):
            if b0 - a1 >= 2.5 and rms(a1 + 0.05, b0 - 0.05) >= floor:
                gaps.append((a1, b0))
        gaps = sorted(gaps, key=lambda g: g[0] - g[1])[:6]
        added = []
        for g0, g1 in gaps:
            print("No captions between %.1fs and %.1fs although there is speech; listening again..." % (g0, g1))
            lo, hi = max(0.0, g0 - 0.1), g1 + 0.1
            temp_path = os.path.join(tempfile.gettempdir(), "flex_gap_%d.wav" % os.getpid())
            pad = int(0.5 * rate)
            with wave.open(temp_path, "wb") as target:
                target.setnchannels(1)
                target.setsampwidth(2)
                target.setframerate(rate)
                chunk = pcm[int(lo * rate):int(hi * rate)]
                if sys.byteorder == "big":
                    chunk = array.array("h", chunk)
                    chunk.byteswap()
                target.writeframes(b"\x00\x00" * pad + chunk.tobytes() + b"\x00\x00" * pad)
            retry = dict(transcribe_args or {})
            retry["word_timestamps"] = True
            retry["condition_on_previous_text"] = False
            again = model.transcribe(temp_path, verbose=False, **retry)
            prompt = retry.get("initial_prompt") or ""
            for segment in again.get("segments") or []:
                if _flex_num(segment.get("avg_logprob"), 0.0) < -1.0 or _flex_num(segment.get("compression_ratio"), 0.0) > 2.4:
                    continue
                if _flex_num(segment.get("no_speech_prob"), 0.0) > 0.6 or _flex_is_prompt_echo(segment.get("text"), prompt):
                    continue
                placed = []
                for word in segment.get("words") or []:
                    start, end = _flex_num(word.get("start")), _flex_num(word.get("end"))
                    if start is None or end is None:
                        continue
                    start, end = start - 0.5 + lo, end - 0.5 + lo
                    if start < g0 - 0.05 or end > g1 + 0.05:
                        continue
                    w = dict(word)
                    w["start"], w["end"] = round(start, 3), round(max(end, start + 0.05), 3)
                    placed.append(w)
                text = "".join(str(w.get("word") or "") for w in placed).strip()
                if placed and not _flex_is_filler(text):
                    added.append({"start": placed[0]["start"], "end": placed[-1]["end"], "text": " " + text,
                                  "words": placed, "avg_logprob": segment.get("avg_logprob"),
                                  "no_speech_prob": segment.get("no_speech_prob"), "flex_rescued": True})
        if added:
            merged = sorted(list(result.get("segments") or []) + added, key=lambda s: _flex_num(s.get("start"), 0.0))
            for number, segment in enumerate(merged):
                segment["id"] = number
            result["segments"] = merged
            result["text"] = " ".join(str(s.get("text") or "").strip() for s in merged).strip()
            print("Recovered %d word(s) from %d gap(s)." % (sum(len(s["words"]) for s in added), len(gaps)))
        return result
    except Exception as gap_error:
        print("Could not re-check gaps (%s); continuing." % gap_error)
        return result
    finally:
        if temp_path and os.path.exists(temp_path):
            try:
                os.remove(temp_path)
            except Exception:
                pass






def _flex_hinglish_file():
    full = os.path.join(_flex_whisper_cache(), "flex-hinglish.pt")
    try:
        if os.path.getsize(full) > 10000000:
            return full
    except OSError:
        pass
    return None


def _flex_load_model(whisper, name):


    if name == "hinglish":
        path = _flex_hinglish_file()
        model = whisper.load_model(path)
        try:
            import torch
            base = torch.load(path, map_location="cpu", weights_only=False).get("flex", {}).get("base", "medium")
            heads = getattr(whisper, "_ALIGNMENT_HEADS", {}).get(base)
            if heads:
                model.set_alignment_heads(heads)
        except Exception as heads_error:
            print("NOTE: word timings use default heads (%s)." % heads_error)
        return model
    return whisper.load_model(_flex_load_name(name))


def main():
    parser = argparse.ArgumentParser(description="Whisper Transcription Script")
    parser.add_argument("--emit-json", default=None,
                        help="Also write the raw transcript (segments + words) to this path. "
                             "The Silence/Retakes tools consume the same shape Whisper's CLI "
                             "emits, so they can share this engine instead of running their own.")
    parser.add_argument("--engine", default="local", choices=["local", "cloud"],
                        help="cloud = Akira AI Transcribe (default); local = Whisper on this machine")
    parser.add_argument("--input", required=True, help="Input media file path")
    parser.add_argument("--output", required=True, help="Output SRT file path")
    parser.add_argument("--model", default="turbo", help="Whisper model: turbo, medium or large")
    parser.add_argument("--max-words", type=int, default=0, help="Maximum words per line")
    parser.add_argument("--language", default=None, help="Transcription language code")
    parser.add_argument("--initial-prompt", default=None, help="Initial prompt to guide Whisper")
    parser.add_argument("--translate-to", default=None,
                        help="Translate the captions into this language code (Akira AI)")
    parser.add_argument("--roman", action="store_true",
                        help="Transliterate Devanagari output to Roman/Hinglish script")
    parser.add_argument("--fill-gaps", action="store_true", help="Fill small gaps between subtitles to make them continuous")
    parser.add_argument("--start-time", type=float, default=None, help="Start time in seconds for selective transcription")
    parser.add_argument("--end-time", type=float, default=None, help="End time in seconds for selective transcription")
    args = parser.parse_args()

    input_path = args.input
    output_path = args.output
    model_name = args.model
    max_words = args.max_words
    language = args.language
    initial_prompt = args.initial_prompt
    fill_gaps = args.fill_gaps
    start_time = args.start_time
    end_time = args.end_time

    if not os.path.exists(input_path):
        print(f"Error: Input file does not exist: {input_path}")
        sys.exit(1)

    print(f"Processing input file: {input_path}")
    temp_audio_path = None


    ext = os.path.splitext(input_path)[1].lower()
    is_video = ext in ['.mp4', '.mov', '.avi', '.mkv', '.m4v', '.webm']


    temp_dir = tempfile.gettempdir()
    temp_audio_path = os.path.join(temp_dir, f"normalized_audio_{os.getpid()}.wav")

    total_pad_start = 0.0
    real_preroll_start = 0.0

    if args.engine == "cloud":



        temp_audio_path = os.path.join(temp_dir, f"flex_cloud_audio_{os.getpid()}.m4a")
        total_pad_start = 0.0

        span = None
        if start_time is not None and end_time is not None:
            span = max(0.0, end_time - start_time)
        bitrate = 64
        if span and span > 0:
            fits = int((85.0 * 8 * 1024 * 1024) / span / 1000.0)
            bitrate = max(32, min(64, fits))



        os.environ["FLEX_UPLOAD_KBPS"] = str(bitrate)
        print(f"Extracting audio for upload ({bitrate} kbps mono)...")
        try:
            import subprocess
            cmd = ["ffmpeg", "-y", "-i", input_path]
            if start_time is not None and end_time is not None:
                cmd += ["-ss", f"{start_time:.3f}", "-to", f"{end_time:.3f}"]
            cmd += ["-vn", "-ac", "1", "-ar", "16000",
                    "-c:a", "aac", "-b:a", f"{bitrate}k", temp_audio_path]
            subprocess.run(cmd, check=True, capture_output=True)
            transcription_path = temp_audio_path
            print(f"Audio ready: {temp_audio_path}")
        except Exception as extract_error:
            print(f"ffmpeg unavailable ({extract_error}); trying moviepy...")
            try:
                from moviepy import VideoFileClip, AudioFileClip
                temp_audio_path = os.path.join(temp_dir, f"flex_cloud_audio_{os.getpid()}.wav")
                if is_video:
                    audio_clip = VideoFileClip(input_path).audio
                else:
                    audio_clip = AudioFileClip(input_path)
                if start_time is not None and end_time is not None:
                    trim = getattr(audio_clip, "subclipped", None) or audio_clip.subclip
                    audio_clip = trim(start_time, end_time)
                audio_clip.write_audiofile(temp_audio_path, fps=16000, nbytes=2,
                                           codec="pcm_s16le", logger=None)
                transcription_path = temp_audio_path
                print(f"Audio ready via moviepy: {temp_audio_path}")
            except Exception as moviepy_error:
                if not is_video and start_time is None and end_time is None:
                    print(f"moviepy unavailable ({moviepy_error}); uploading the audio as-is.")
                    transcription_path = input_path
                    temp_audio_path = None
                else:
                    print(f"Error: could not extract audio for upload: {moviepy_error}")
                    sys.exit(1)
    else:
        print("Normalizing audio format (16kHz, mono)...")
        try:
            import subprocess

            if start_time is not None and end_time is not None:

                actual_crop_start = max(0.0, start_time - 1.0)
                pad_start = start_time - actual_crop_start
                silence_delay_ms = int((1.0 - pad_start) * 1000)
                total_pad_start = 1.0
                real_preroll_start = pad_start

                cmd = [
                    "ffmpeg", "-y",
                    "-i", input_path,
                    "-ss", f"{actual_crop_start:.3f}",
                    "-to", f"{end_time + 1.0:.3f}",
                    "-af", f"aformat=channel_layouts=mono,adelay={silence_delay_ms},apad=pad_dur=1",
                    "-ar", "16000",
                    "-c:a", "pcm_s16le",
                    temp_audio_path
                ]
            else:

                total_pad_start = 1.0
                cmd = [
                    "ffmpeg", "-y",
                    "-i", input_path,
                    "-af", "aformat=channel_layouts=mono,adelay=1000,apad=pad_dur=1",
                    "-ar", "16000",
                    "-c:a", "pcm_s16le",
                    temp_audio_path
                ]

            print(f"Running ffmpeg command: {' '.join(cmd)}")
            subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=True)
            transcription_path = temp_audio_path
            print(f"Audio normalized successfully to: {temp_audio_path}")
        except Exception as ffmpeg_e:
            print(f"FFmpeg normalization failed or not found: {str(ffmpeg_e)}")

            if is_video:
                print("Falling back to moviepy for video audio extraction...")
                try:
                    from moviepy import VideoFileClip
                    video = VideoFileClip(input_path)


                    if start_time is not None and end_time is not None:
                        actual_crop_start = max(0.0, start_time - 1.0)
                        pad_start = start_time - actual_crop_start
                        total_pad_start = pad_start
                        real_preroll_start = pad_start
                        print(f"Applying padded subclip from {actual_crop_start}s to {end_time + 1.0}s...")
                        if hasattr(video, "subclipped"):
                            video = video.subclipped(actual_crop_start, min(end_time + 1.0, video.duration))
                        else:
                            video = video.subclip(actual_crop_start, min(end_time + 1.0, video.duration))
                    else:
                        total_pad_start = 0.0

                    video.audio.write_audiofile(
                        temp_audio_path,
                        fps=16000,
                        nbytes=2,
                        codec='pcm_s16le',
                        ffmpeg_params=["-ac", "1"],
                        logger=None
                    )
                    transcription_path = temp_audio_path
                    print(f"Audio extracted successfully via moviepy to: {temp_audio_path}")
                except Exception as moviepy_e:
                    print(f"Error extracting audio via moviepy: {str(moviepy_e)}")
                    sys.exit(1)
            else:
                if start_time is not None or end_time is not None:
                    print("Warning: Selective range cropping requested, but ffmpeg is missing and input is audio.")
                    print("Using original audio file directly without cropping (all captions will be transcribed).")
                transcription_path = input_path
                temp_audio_path = None
                total_pad_start = 0.0







    if model_name == "flex-ai-high":
        cloud_tier = "high"
    else:
        cloud_tier = "standard"
    if model_name in ("flex-ai", "flex-ai-high"):
        model_name = _flex_fallback_model()
    model_name = _flex_resolve_model(model_name)

    model = None
    if args.engine == "cloud":
        print("Using Akira AI Transcribe (cloud engine, %s tier)." % cloud_tier)
        model = _CloudModel(diarization=True, tier=cloud_tier)
    else:
        print(f"Loading Whisper model '{model_name}'...")

    try:
        if model is None:
            import whisper
            model = _flex_load_model(whisper, model_name)
    except Exception as e:
        print(f"Error loading Whisper model: {str(e)}")






        print("  Interpreter: %s" % sys.executable)
        print("  Version:     %s" % sys.version.split()[0])
        if isinstance(e, ImportError):
            print("  Whisper is not installed for THIS interpreter. Either press")
            print("  Install / Fix Dependencies in the Auto Captions tab, or run:")
            print("      %s -m pip install --user openai-whisper" % sys.executable)
        if temp_audio_path and os.path.exists(temp_audio_path):
            try:
                os.remove(temp_audio_path)
            except:
                pass
        sys.exit(1)

    print("Transcribing audio...")
    try:
        transcribe_args = {}


        transcribe_args['word_timestamps'] = True
        if language and language.strip() and language.lower() != "auto":
            transcribe_args['language'] = language
        if initial_prompt and initial_prompt.strip():
            transcribe_args['initial_prompt'] = initial_prompt
        if not isinstance(model, _CloudModel):
            transcribe_args.update(_flex_decode_args(model_name))
            if 'language' not in transcribe_args:
                detected = _flex_detect_language(model, transcription_path)
                if detected:
                    transcribe_args['language'] = detected
            if model_name == "hinglish" and transcribe_args.get("language") in (None, "hi", "ur"):
                transcribe_args["language"] = "hi"
            transcribe_args = _flex_hinglish_policy(transcribe_args, getattr(args, 'roman', False) or model_name == "hinglish")

        try:
            result = model.transcribe(transcription_path, verbose=False, **transcribe_args)
        except CloudError as cloud_error:









            preflight = cloud_error.code in (
                "INVALID_LICENSE", "AUTHENTICATION_REQUIRED", "INSUFFICIENT_CREDITS",
                "NETWORK", "BAD_INIT", "BAD_GATEWAY_BODY", "AUDIO_NOT_UPLOADED",
                "404", "401", "402", "403")
            if not preflight:
                raise

            print("")
            print("Akira AI could not start: %s" % cloud_error)
            print("Falling back to the local Whisper engine for this run.")
            print("")
            try:
                import whisper
                model = _flex_load_model(whisper, model_name)
            except Exception as whisper_error:
                print("The local engine is not available either: %s" % whisper_error)
                print("  Interpreter: %s" % sys.executable)
                print("Press Install / Fix Dependencies in the Auto Captions tab, or add "
                      "credits to use Akira AI Transcribe.")
                sys.exit(1)
            transcribe_args.update(_flex_decode_args(model_name))
            result = model.transcribe(transcription_path, verbose=False, **transcribe_args)



        if isinstance(model, _CloudModel):
            result = _flex_cloud_complete(model, result, transcription_path, transcribe_args, model_name)

        if not isinstance(model, _CloudModel):
            result = _flex_local_complete(model, result, transcription_path, transcribe_args)
            result = _flex_drop_prompt_echo(result, transcribe_args)
            result = _flex_gap_rescue(model, result, transcription_path, transcribe_args)
            result = _flex_fix_opening(model, result, transcription_path, total_pad_start, real_preroll_start,
                                       start_time, end_time, transcribe_args)

        if getattr(args, 'translate_to', None):
            result = _flex_apply_translation(args.translate_to, result, model, model_name,
                                             transcription_path, transcribe_args, total_pad_start,
                                             real_preroll_start, start_time, end_time,
                                             not isinstance(model, _CloudModel))







        if getattr(args, 'roman', False):
            converted = 0
            for segment in result.get('segments', []):
                if has_devanagari(segment.get('text', '')):
                    segment['text'] = to_roman(segment['text']); converted += 1
                for word in segment.get('words', []) or []:
                    key = 'word' if 'word' in word else ('text' if 'text' in word else None)
                    if key and has_devanagari(word.get(key, '')):
                        word[key] = to_roman(word[key])
            if 'text' in result and has_devanagari(result['text']):
                result['text'] = to_roman(result['text'])
            print("Converted %d segment(s) to Roman script." % converted)
    except Exception as e:
        print(f"Error during transcription: {str(e)}")
        if temp_audio_path and os.path.exists(temp_audio_path):
            try:
                os.remove(temp_audio_path)
            except:
                pass
        sys.exit(1)


    print("Formatting subtitles...")
    srt_content = generate_srt(
        result,
        max_words=max_words,
        fill_gaps=fill_gaps,
        start_time=start_time,
        end_time=end_time,
        pad_start=total_pad_start,
        real_preroll=real_preroll_start
    )



    if getattr(args, "emit_json", None):
        try:
            os.makedirs(os.path.dirname(os.path.abspath(args.emit_json)), exist_ok=True)
            with open(args.emit_json, "w", encoding="utf-8") as jf:
                json.dump(result, jf, ensure_ascii=False)
            print("SUCCESS: Transcript JSON written to %s" % args.emit_json)
        except Exception as emit_error:
            print("NOTE: could not write the transcript JSON: %s" % emit_error)


    try:
        os.makedirs(os.path.dirname(os.path.abspath(output_path)), exist_ok=True)
        with open(output_path, "w", encoding="utf-8") as f:
            f.write(srt_content)
        print(f"SUCCESS: Subtitles written to {output_path}")
    except Exception as e:
        print(f"Error writing SRT file: {str(e)}")
    finally:

        if temp_audio_path and os.path.exists(temp_audio_path):
            try:
                os.remove(temp_audio_path)
                print("Temporary files cleaned up.")
            except Exception as e:
                print(f"Warning: Failed to remove temporary audio file: {str(e)}")

if __name__ == "__main__":
    main()
