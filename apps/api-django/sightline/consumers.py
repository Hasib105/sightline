import json

from channels.generic.websocket import AsyncWebsocketConsumer


def analysis_group_name(video_id: int) -> str:
    return f"exam_video_analysis_{video_id}"


class AlertConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        await self.channel_layer.group_add("alerts", self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard("alerts", self.channel_name)

    async def alert_created(self, event):
        await self.send(text_data=json.dumps(event["payload"]))


class ExamVideoAnalysisConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.video_id = int(self.scope["url_route"]["kwargs"]["video_id"])
        self.group_name = analysis_group_name(self.video_id)
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def analysis_frame(self, event):
        payload = event.get("payload") or {}
        await self.send(text_data=json.dumps({"type": "progress", **payload}))
        await self.send(bytes_data=event["frame"])

    async def analysis_status(self, event):
        await self.send(text_data=json.dumps(event["payload"]))
