#!/usr/bin/env python3
"""
Real-time grid stress fetcher for FlexCompute Edge demo scheduler.

Fetches 5 sources concurrently, returns locale-grouped JSON to stdout.
Python 3.8+ stdlib only. Per-source errors are caught silently (source → null).
Always exits 0.

Sources:
  FR locale: Hydro-Québec (JSON, no auth) + ISNE via EIA (JSON, free key)
  EN locale: CAISO OASIS (ZIP/CSV, no auth) + NYISO MIS (CSV, no auth)
  PT locale: ONS Brasil (JSON, no auth)

Usage:
  EIA_API_KEY=<key> python3 grid_signal.py
"""
import json, os, sys, threading, time
import urllib.request, urllib.error
from datetime import datetime, timezone, timedelta

EIA_API_KEY = os.environ.get('EIA_API_KEY', '')
TIMEOUT = 12  # seconds per request


# ── HTTP helpers ──────────────────────────────────────────────────────────────

def _fetch(url):
    req = urllib.request.Request(url, headers={'User-Agent': 'flexcompute-edge-grid/1.0'})
    with urllib.request.urlopen(req, timeout=TIMEOUT) as r:
        return r.read()

def _json(url):
    return json.loads(_fetch(url))


# ── Tier mapping ──────────────────────────────────────────────────────────────

def _tier(pct, t1, t2, t3):
    """Map demand % to tier. Thresholds are exclusive lower bounds."""
    if pct >= t3: return 3
    if pct >= t2: return 2
    if pct >= t1: return 1
    return 0


# ── Hydro-Québec ──────────────────────────────────────────────────────────────

def fetch_hq():
    BASE = 'https://donnees.hydroquebec.com/api/explore/v2.1/catalog/datasets'

    # 1. Latest demand (15-min updates) — skip records where field is null
    d = _json(
        f'{BASE}/demande-electricite-quebec/records'
        '?limit=5&order_by=date%20desc'
        '&where=valeurs_demandetotal%20is%20not%20null'
    )
    records = d.get('results', [])
    if not records:
        return None

    latest = records[0]
    demand_mw = float(latest.get('valeurs_demandetotal') or 0)
    if demand_mw == 0:
        return None
    CAPACITY_MW = 40_000
    demand_pct = round(demand_mw / CAPACITY_MW * 100, 1)
    updated = latest.get('date', '')

    # 2. Active peak event check
    now_utc = datetime.now(timezone.utc)
    peak_active = False
    peak_name = None
    try:
        pd = _json(f'{BASE}/evenements-pointe/records?limit=10&order_by=date_debut%20desc')
        for rec in pd.get('results', []):
            s = rec.get('date_debut', '')
            e = rec.get('date_fin', '')
            if not s or not e:
                continue
            try:
                start = datetime.fromisoformat(s.replace('Z', '+00:00'))
                end   = datetime.fromisoformat(e.replace('Z', '+00:00'))
                if start <= now_utc <= end:
                    peak_active = True
                    peak_name = rec.get('titre') or rec.get('type_pointe') or ''
                    break
            except Exception:
                continue
    except Exception:
        pass

    tier = 3 if peak_active else _tier(demand_pct, 70, 80, 90)

    return {
        'demand_mw': round(demand_mw),
        'capacity_mw': CAPACITY_MW,
        'demand_pct': demand_pct,
        'peak_event_active': peak_active,
        'peak_event_name': peak_name,
        'tier': tier,
        'updated': updated,
    }


# ── EIA — generic ISO fetcher (ISNE, CISO, NYIS) ─────────────────────────────

# Annual peak capacities (MW) — historical highs used as reference.
# Rolling-max approach produces false 100% readings in shoulder seasons
# (e.g. Feb–May window misses summer peaks for NYISO/CAISO/ISNE).
_EIA_CAPACITY = {
    'NYIS': 34_000,   # NYISO historical peak ~33,956 MW
    'ISNE': 28_000,   # ISO-NE historical peak ~28,130 MW
    'CISO': 52_000,   # CAISO historical peak ~52,061 MW
}

def _fetch_eia_iso(respondent):
    """Fetch latest hourly demand for any EIA RTO respondent code.
    Percentage is against a fixed annual peak capacity, not a rolling max,
    so shoulder-season demand never falsely reads as 100%."""
    if not EIA_API_KEY:
        return None
    url = (
        'https://api.eia.gov/v2/electricity/rto/region-data/data/'
        f'?api_key={EIA_API_KEY}'
        '&frequency=hourly'
        '&data[0]=value'
        f'&facets[respondent][]={respondent}'
        '&facets[type][]=D'
        '&sort[0][column]=period&sort[0][direction]=desc'
        '&length=1'
    )
    d = _json(url)
    rows = d.get('response', {}).get('data', [])
    if not rows or rows[0].get('value') is None:
        return None
    current_mw  = float(rows[0]['value'])
    capacity_mw = _EIA_CAPACITY.get(respondent, 50_000)
    demand_pct  = round(current_mw / capacity_mw * 100, 1)
    return {
        'demand_mw': round(current_mw),
        'capacity_mw': capacity_mw,
        'demand_pct': demand_pct,
        'tier': _tier(demand_pct, 80, 88, 95),
        'updated': rows[0].get('period', ''),
    }

def fetch_isne():  return _fetch_eia_iso('ISNE')
def fetch_caiso(): return _fetch_eia_iso('CISO')
def fetch_nyiso(): return _fetch_eia_iso('NYIS')


# ── ONS Brasil ────────────────────────────────────────────────────────────────

_ONS_LOAD_FIELDS = ('val_cargaglobal', 'val_cargaglobalcons', 'val_cargaenergiamwmed', 'val_carga')

def fetch_ons():
    now_utc = datetime.now(timezone.utc)
    now_brt = now_utc - timedelta(hours=3)  # BRT = UTC-3 (no DST)
    today      = now_brt.strftime('%Y-%m-%d')
    month_ago  = (now_brt - timedelta(days=30)).strftime('%Y-%m-%d')

    # SECO (SE/CO) is tried first — known-working area code, ~50% of Brazilian
    # load. SIN (national total) is tried next if SECO returns empty; SE is the
    # legacy code as last resort. SECO-first avoids burning the 12s per-request
    # TIMEOUT budget before the known-good fallback gets a chance to respond.
    # 30-day window captures seasonal variation for a credible reference peak.
    records = None
    area_used = None
    for area in ('SECO', 'SIN', 'SE'):
        try:
            url = (
                'https://apicarga.ons.org.br/prd/cargaverificada'
                f'?dat_inicio={month_ago}&dat_fim={today}'
                f'&cod_areacarga={area}'
            )
            d = _json(url)
            recs = d if isinstance(d, list) else d.get('cargaVerificada', d.get('records', []))
            if recs:
                records = recs
                area_used = area
                break
        except Exception:
            continue
    if not records:
        return None

    def _load(rec):
        for key in _ONS_LOAD_FIELDS:
            if key in rec:
                try:
                    return float(rec[key])
                except (ValueError, TypeError):
                    pass
        return None

    # Find the last record with a non-zero load value (trailing zeros are future placeholders)
    latest_rec = None
    for rec in reversed(records):
        v = _load(rec)
        if v is not None and v > 0:
            latest_rec = rec
            break
    if latest_rec is None:
        return None

    latest_mw   = _load(latest_rec)
    values      = [v for v in (_load(r) for r in records) if v is not None and v > 0]
    ref_peak_mw = max(values)
    demand_pct  = round(latest_mw / ref_peak_mw * 100, 1) if ref_peak_mw else 0
    updated     = str(latest_rec.get('din_referenciautc') or latest_rec.get('din_atualizacao') or '')

    # Cap at T2 — 30-min lag makes T3 over-reactive
    tier = min(_tier(demand_pct, 80, 90, 999), 2)

    return {
        'demand_mw': round(latest_mw),
        'ref_peak_mw': round(ref_peak_mw),
        'demand_pct': demand_pct,
        'tier': tier,
        'updated': updated,
        'area': area_used,
    }


# ── Locale grouping ───────────────────────────────────────────────────────────

def _locale_tier(pairs):
    """Return (max_tier, winning_source_key) from [(key, result), ...]."""
    best_tier, best_key = 0, None
    for key, result in pairs:
        t = (result or {}).get('tier', 0)
        if t > best_tier:
            best_tier, best_key = t, key
    return best_tier, best_key

def build_signal(hq, isne, caiso, nyiso, ons):
    fr_tier, fr_src = _locale_tier([('hydroquebec', hq), ('isne', isne)])
    en_tier, en_src = _locale_tier([('caiso', caiso), ('nyiso', nyiso)])
    pt_tier, pt_src = _locale_tier([('ons', ons)])

    overall = max(fr_tier, en_tier, pt_tier)

    # FR wins ties — hardware is physically in Montréal
    if fr_tier == overall and overall > 0:
        tbl, tbs = 'fr', fr_src
    elif en_tier == overall and overall > 0:
        tbl, tbs = 'en', en_src
    elif pt_tier == overall and overall > 0:
        tbl, tbs = 'pt', pt_src
    else:
        tbl, tbs = None, None

    return {
        'tier': overall,
        'triggered_by_locale': tbl,
        'triggered_by_source': tbs,
        'is_synthetic': False,
        'fetched_at': int(time.time()),
        'fr': {
            'tier': fr_tier,
            'triggered_by': fr_src if fr_tier > 0 else None,
            'hq': hq,
            'isne': isne,
        },
        'en': {
            'tier': en_tier,
            'triggered_by': en_src if en_tier > 0 else None,
            'caiso': caiso,
            'nyiso': nyiso,
        },
        'pt': {
            'tier': pt_tier,
            'triggered_by': pt_src if pt_tier > 0 else None,
            'ons': ons,
        },
    }


# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    fetchers = {
        'hq':    fetch_hq,
        'isne':  fetch_isne,
        'caiso': fetch_caiso,
        'nyiso': fetch_nyiso,
        'ons':   fetch_ons,
    }
    results = {}
    lock = threading.Lock()

    def run(name, fn):
        try:
            result = fn()
        except Exception as e:
            sys.stderr.write(f'[grid_signal] {name}: {e}\n')
            result = None
        with lock:
            results[name] = result

    threads = [
        threading.Thread(target=run, args=(n, f), daemon=True)
        for n, f in fetchers.items()
    ]
    for t in threads:
        t.start()
    for t in threads:
        t.join(timeout=20)

    signal = build_signal(
        results.get('hq'),
        results.get('isne'),
        results.get('caiso'),
        results.get('nyiso'),
        results.get('ons'),
    )
    print(json.dumps(signal))


if __name__ == '__main__':
    main()
