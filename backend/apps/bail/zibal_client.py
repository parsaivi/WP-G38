"""
Zibal IPG (درگاه پرداخت زیبال) API client.
Base URL: https://gateway.zibal.ir
Docs: request -> start/{trackId} -> callback (GET) -> verify
"""
import requests
from django.conf import settings

ZIBAL_BASE = getattr(settings, "ZIBAL_GATEWAY_BASE", "https://gateway.zibal.ir")
ZIBAL_MERCHANT = getattr(settings, "ZIBAL_MERCHANT", "zibal")


def request_payment(amount_rials, callback_url, order_id=None, description=None):
    """
    POST /v1/request
    Returns (success: bool, track_id: int|None, message: str)
    """
    payload = {
        "merchant": ZIBAL_MERCHANT,
        "amount": amount_rials,
        "callbackUrl": callback_url,
    }
    if order_id is not None:
        payload["orderId"] = str(order_id)
    if description:
        payload["description"] = description
    try:
        r = requests.post(
            f"{ZIBAL_BASE}/v1/request",
            json=payload,
            timeout=15,
        )
        data = r.json()
        result = data.get("result")
        track_id = data.get("trackId")
        msg = data.get("message", "")
        if result == 100 and track_id is not None:
            return True, track_id, msg
        return False, None, msg or f"Zibal result code: {result}"
    except requests.RequestException as e:
        return False, None, str(e)


def verify_payment(track_id):
    """
    POST /v1/verify
    Returns (success: bool, data: dict|None, message: str)
    On success data has: paidAt, amount, refNumber, cardNumber, orderId, status, ...
    """
    payload = {
        "merchant": ZIBAL_MERCHANT,
        "trackId": track_id,
    }
    try:
        r = requests.post(
            f"{ZIBAL_BASE}/v1/verify",
            json=payload,
            timeout=15,
        )
        data = r.json()
        result = data.get("result")
        msg = data.get("message", "")
        if result == 100:
            return True, data, msg
        return False, data, msg or f"Zibal verify result: {result}"
    except requests.RequestException as e:
        return False, None, str(e)


def payment_start_url(track_id):
    """URL to redirect user to Zibal payment page."""
    return f"{ZIBAL_BASE}/start/{track_id}"
