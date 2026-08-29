import asyncio
import io
from unittest.mock import patch
import pytest
from starlette.datastructures import UploadFile, Headers
from menu import decode_menu_photo, MenuDecoderResult, MenuPick, MAX_IMAGE_BYTES


def make_fake_upload(content_type="image/jpeg"):
    return UploadFile(
        file=io.BytesIO(b"fake image bytes"),
        filename="menu.jpg",
        headers=Headers({"content-type": content_type}),
    )


def test_decode_menu_photo_returns_parsed_picks():
    fake_result = MenuDecoderResult(
        picks=[
            MenuPick(
                item_name="Grilled Chicken Salad",
                why_it_fits="High protein, low carb.",
                estimated_calories=450,
                estimated_protein_g=40,
                estimated_carbs_g=20,
                estimated_fat_g=18,
                modification_tip="Ask for dressing on the side.",
            )
        ],
        menu_note="Estimates only — menus rarely list exact nutrition.",
    )

    with patch("menu.structured_vision_llm") as mock_llm:
        mock_llm.invoke.return_value = fake_result
        result = asyncio.run(decode_menu_photo(make_fake_upload(), "bulking, need high protein"))

    assert result == fake_result.model_dump()

    sent_messages = mock_llm.invoke.call_args.args[0]
    sent_content = sent_messages[0].content
    assert sent_content[1]["image_url"]["url"].startswith("data:image/jpeg;base64,")
    assert "bulking, need high protein" in sent_content[0]["text"]


def test_decode_menu_photo_falls_back_to_jpeg_for_unsupported_type():
    fake_result = MenuDecoderResult(picks=[], menu_note="")

    with patch("menu.structured_vision_llm") as mock_llm:
        mock_llm.invoke.return_value = fake_result
        asyncio.run(decode_menu_photo(make_fake_upload(content_type="application/pdf"), "just eat healthy"))

    sent_messages = mock_llm.invoke.call_args.args[0]
    sent_content = sent_messages[0].content
    assert sent_content[1]["image_url"]["url"].startswith("data:image/jpeg;base64,")


def test_decode_menu_photo_rejects_oversized_upload():
    oversized = UploadFile(
        file=io.BytesIO(b"x" * (MAX_IMAGE_BYTES + 1)),
        filename="huge.jpg",
        headers=Headers({"content-type": "image/jpeg"}),
    )

    with patch("menu.structured_vision_llm") as mock_llm:
        with pytest.raises(ValueError):
            asyncio.run(decode_menu_photo(oversized, "bulking"))

    mock_llm.invoke.assert_not_called()
