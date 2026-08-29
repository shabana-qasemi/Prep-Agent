import asyncio
import io
from unittest.mock import patch
import pytest
from starlette.datastructures import UploadFile, Headers
from scan import scan_food_photo, FoodScanResult, MAX_IMAGE_BYTES


def make_fake_upload(content_type="image/jpeg"):
    return UploadFile(
        file=io.BytesIO(b"fake image bytes"),
        filename="food.jpg",
        headers=Headers({"content-type": content_type}),
    )


def test_scan_food_photo_returns_parsed_result():
    fake_result = FoodScanResult(
        food_description="Grilled chicken with rice and broccoli",
        estimated_serving="1 plate (~400g)",
        calories=520,
        protein_g=42,
        carbs_g=48,
        fat_g=14,
        confidence_note="Visual estimate only — portion size and oil used may shift the real numbers.",
    )

    with patch("scan.structured_vision_llm") as mock_llm:
        mock_llm.invoke.return_value = fake_result
        result = asyncio.run(scan_food_photo(make_fake_upload()))

    assert result == fake_result.model_dump()

    sent_messages = mock_llm.invoke.call_args.args[0]
    sent_content = sent_messages[0].content
    assert sent_content[1]["image_url"]["url"].startswith("data:image/jpeg;base64,")


def test_scan_food_photo_falls_back_to_jpeg_for_unsupported_type():
    fake_result = FoodScanResult(
        food_description="",
        estimated_serving="",
        calories=0,
        protein_g=0,
        carbs_g=0,
        fat_g=0,
        confidence_note="",
    )

    with patch("scan.structured_vision_llm") as mock_llm:
        mock_llm.invoke.return_value = fake_result
        asyncio.run(scan_food_photo(make_fake_upload(content_type="application/pdf")))

    sent_messages = mock_llm.invoke.call_args.args[0]
    sent_content = sent_messages[0].content
    assert sent_content[1]["image_url"]["url"].startswith("data:image/jpeg;base64,")


def test_scan_food_photo_rejects_oversized_upload():
    # Regression guard: an unbounded file upload is a memory-exhaustion /
    # cost vector (every byte gets base64-encoded and sent to the paid-tier
    # vision API) — this must be rejected before ever reaching the LLM call.
    oversized = UploadFile(
        file=io.BytesIO(b"x" * (MAX_IMAGE_BYTES + 1)),
        filename="huge.jpg",
        headers=Headers({"content-type": "image/jpeg"}),
    )

    with patch("scan.structured_vision_llm") as mock_llm:
        with pytest.raises(ValueError):
            asyncio.run(scan_food_photo(oversized))

    mock_llm.invoke.assert_not_called()
