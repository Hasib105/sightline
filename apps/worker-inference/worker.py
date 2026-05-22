import argparse
import json
import time
import urllib.request


def post_json(url, payload):
    data = json.dumps(payload).encode("utf-8")
    request = urllib.request.Request(
        url,
        data=data,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(request, timeout=10) as response:
        return json.loads(response.read().decode("utf-8"))


def main():
    parser = argparse.ArgumentParser(description="Sightline synthetic video-analysis worker")
    parser.add_argument("--api-url", default="http://127.0.0.1:8000/api")
    parser.add_argument("--interval", type=int, default=30)
    args = parser.parse_args()

    print("Sightline video-analysis worker started. Press Ctrl+C to stop.")
    while True:
        try:
            response = post_json(f"{args.api_url.rstrip('/')}/integrity/simulate-alert/", {})
            print(f"created alert {response['alert']['id']} from synthetic video-analysis loop")
        except Exception as exc:
            print(f"worker cycle failed: {exc}")
        time.sleep(args.interval)


if __name__ == "__main__":
    main()
