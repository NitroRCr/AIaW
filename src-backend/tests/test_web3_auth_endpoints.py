"""
Tests for Web3 authentication endpoints
"""

import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, AsyncMock
import json
import os
from app import app

client = TestClient(app)

class TestWeb3AuthEndpoints:

    @patch('auth.challenge_service.ChallengeService.create_challenge')
    def test_create_challenge_endpoint(self, mock_create_challenge):
        """Test challenge creation"""
        # Mock the service response
        mock_create_challenge.return_value = {
            "nonce": "test-nonce-123",
            "message": "Sign this message to authenticate with cyber14r6j7h4n2hmuam8tj224mw8g3earax5t4vvlkk.\nNonce: test-nonce-123"
        }

        # Prepare environment variables
        with patch.dict(os.environ, {
            'SUPABASE_URL': 'https://test.supabase.co',
            'SUPABASE_ANON_KEY': 'test-key'
        }):
            response = client.post(
                "/auth/web3/challenge",
                json={"wallet_address": "cyber14r6j7h4n2hmuam8tj224mw8g3earax5t4vvlkk"}
            )

        assert response.status_code == 200
        data = response.json()
        assert "nonce" in data
        assert "message" in data
        assert data["nonce"] == "test-nonce-123"

    @patch('auth.challenge_service.ChallengeService.verify_challenge')
    def test_verify_challenge_success(self, mock_verify_challenge):
        """Test successful challenge verification"""
        # Mock successful response
        mock_verify_challenge.return_value = {
            "success": True,
            "wallet_address": "cyber14r6j7h4n2hmuam8tj224mw8g3earax5t4vvlkk"
        }

        with patch.dict(os.environ, {
            'SUPABASE_URL': 'https://test.supabase.co',
            'SUPABASE_ANON_KEY': 'test-key'
        }):
            response = client.post(
                "/auth/web3/verify",
                json={
                    "wallet_address": "cyber14r6j7h4n2hmuam8tj224mw8g3earax5t4vvlkk",
                    "pub_key": "Ag3EI2K4aGNMdk/OVQbDCEn8OEPNylNhHNSv/l+ct9sQ",
                    "signature": "test-signature",
                    "nonce": "test-nonce-123"
                }
            )

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["wallet_address"] == "cyber14r6j7h4n2hmuam8tj224mw8g3earax5t4vvlkk"

    @patch('auth.challenge_service.ChallengeService.verify_challenge')
    def test_verify_challenge_failure(self, mock_verify_challenge):
        """Test failed challenge verification"""
        # Mock unsuccessful response
        mock_verify_challenge.return_value = {
            "success": False,
            "error": "Invalid signature"
        }

        with patch.dict(os.environ, {
            'SUPABASE_URL': 'https://test.supabase.co',
            'SUPABASE_ANON_KEY': 'test-key'
        }):
            response = client.post(
                "/auth/web3/verify",
                json={
                    "wallet_address": "cyber14r6j7h4n2hmuam8tj224mw8g3earax5t4vvlkk",
                    "pub_key": "invalid-key",
                    "signature": "invalid-signature",
                    "nonce": "invalid-nonce"
                }
            )

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is False
        assert data["error"] == "Invalid signature"

if __name__ == "__main__":
    pytest.main([__file__, "-v"])
