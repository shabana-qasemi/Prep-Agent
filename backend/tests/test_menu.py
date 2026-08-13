import asyncio
import io
import json
from unittest.mock import patch, MagicMock
from starlette.datastructures import UploadFile, Headers
from menu import decode_menu_photo


def make_fake_upload(content_type="image/jpeg"):
    return UploadFile(
        file=io.BytesIO(b"fake image bytes"),
        filename="menu.jpg",
        headers=Headers({"content-type": content_type}),
    )


def test_decode_menu_photo_returns_parsed_picks():
    fake_result = {
        "picks": [
            {
                "item_name": "Grilled Chicken Salad",
                "why_it_fits": "High protein, low carb.",
                "estimated_calories": 450,
                "estimated_protein_g": 40,
                "estimated_carbs_g": 20,
                "estimated_fat_g": 18,
                "modification_tip": "Ask for dressing on the side.",
            }
        ],
        "menu_note": "Estimates only — menus rarely list exact nutrition.",
    }

    fake_response = MagicMock()
    fake_response.content = [MagicMock(type="text", text=json.dumps(fake_result))]

    with patch("menu.client.messages.create", return_value=fake_response) as mock_create:
        result = asyncio.run(decode_menu_photo(make_fake_upload(), "bulking, need high protein"))

    assert result == fake_result

    sent_content = mock_create.call_args.kwargs["messages"][0]["content"]
    assert sent_content[0]["source"]["media_type"] == "image/jpeg"
    assert "bulking, need high protein" in sent_content[1]["text"]


def test_decode_menu_photo_falls_back_to_jpeg_for_unsupported_type():
    fake_response = MagicMock()
    fake_response.content = [MagicMock(type="text", text=json.dumps({"picks": [], "menu_note": ""}))]

    with patch("menu.client.messages.create", return_value=fake_response) as mock_create:
        asyncio.run(decode_menu_photo(make_fake_upload(content_type="application/pdf"), "just eat healthy"))

    sent_content = mock_create.call_args.kwargs["messages"][0]["content"]
    assert sent_content[0]["source"]["media_type"] == "image/jpeg"
