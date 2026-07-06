import pytest
from app.services.secret_scan_service import (
    SECRET_PATTERNS,
    _scan_content,
    _detect_git_exposure,
)


class TestSecretPatterns:
    def test_aws_key_pattern(self):
        for rule in SECRET_PATTERNS:
            if rule["type"] == "aws_key":
                assert rule["pattern"].search("AKIAIOSFODNN7EXAMPLE")
                assert not rule["pattern"].search("AKIA123")
                assert rule["severity"] == "Critical"

    def test_github_token_pattern(self):
        for rule in SECRET_PATTERNS:
            if rule["type"] == "github_token":
                assert rule["pattern"].search("ghp_" + "a" * 36)
                assert rule["severity"] == "Critical"

    def test_slack_token_pattern(self):
        for rule in SECRET_PATTERNS:
            if rule["type"] == "slack_token":
                assert rule["pattern"].search("xoxb-123456789012-123456789012-abc123def456")
                assert rule["severity"] == "Critical"

    def test_jwt_pattern(self):
        for rule in SECRET_PATTERNS:
            if rule["type"] == "jwt":
                token = "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U"
                assert rule["pattern"].search(token)
                assert rule["severity"] == "High"

    def test_private_key_pattern(self):
        for rule in SECRET_PATTERNS:
            if rule["type"] == "private_key":
                assert rule["pattern"].search("-----BEGIN PRIVATE KEY-----")
                assert rule["pattern"].search("-----BEGIN RSA PRIVATE KEY-----")
                assert rule["pattern"].search("-----BEGIN EC PRIVATE KEY-----")
                assert rule["severity"] == "Critical"

    def test_generic_secret_pattern(self):
        for rule in SECRET_PATTERNS:
            if rule["type"] == "generic_secret":
                assert rule["pattern"].search("api_key = 'supersecretvalue12345678'")
                assert rule["pattern"].search("SECRET: 'abcdefghijklmnop12345678'")
                assert rule["severity"] == "Medium"

    def test_all_patterns_have_types(self):
        for rule in SECRET_PATTERNS:
            assert "type" in rule
            assert "pattern" in rule
            assert "severity" in rule


class TestScanContent:
    def test_detect_aws_key(self):
        content = "const accessKey = 'AKIAIOSFODNN7EXAMPLE';"
        secrets = _scan_content(content, "https://example.com/js/app.js")
        assert len(secrets) >= 1
        assert secrets[0].type == "aws_key"
        assert secrets[0].severity == "Critical"

    def test_detect_multiple(self):
        content = "aws_key=AKIAIOSFODNN7EXAMPLE\nghp_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
        secrets = _scan_content(content, "https://example.com/config.js")
        types = [s.type for s in secrets]
        assert "aws_key" in types

    def test_no_match(self):
        content = "const x = 42; // just numbers"
        secrets = _scan_content(content, "https://example.com/app.js")
        assert len(secrets) == 0


class TestGitExposure:
    def test_detect_git_head(self):
        secret = _detect_git_exposure("example.com", ".git/HEAD", "ref: refs/heads/main")
        assert secret is not None
        assert secret.type == "git_config"
        assert secret.severity == "Critical"

    def test_no_exposure(self):
        secret = _detect_git_exposure("example.com", ".git/config", "nothing")
        assert secret is None
