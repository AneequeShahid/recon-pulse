import pytest
from app.services.cloud_scan_service import scan_aws, scan_gcp, scan_azure, scan_all_clouds


@pytest.mark.asyncio
async def test_scan_aws_no_creds():
    result = await scan_aws()
    assert result == []


@pytest.mark.asyncio
async def test_scan_gcp_no_creds():
    result = await scan_gcp()
    assert result == []


@pytest.mark.asyncio
async def test_scan_azure_no_creds():
    result = await scan_azure()
    assert result == []


@pytest.mark.asyncio
async def test_scan_all_empty():
    result = await scan_all_clouds({})
    assert isinstance(result, dict)
    assert "aws" in result
    assert "gcp" in result
    assert "azure" in result
    assert result["aws"] == []
    assert result["gcp"] == []
    assert result["azure"] == []


@pytest.mark.asyncio
async def test_scan_all_with_aws_creds():
    result = await scan_all_clouds({
        "aws": {"access_key_id": "test", "secret_access_key": "test"},
    })
    assert result["aws"] == []  # will fail gracefully with bad creds
    assert result["gcp"] == []
    assert result["azure"] == []
