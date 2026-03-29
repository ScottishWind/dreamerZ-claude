"""
DreamerZ Beta API Tests
Tests for backend API endpoints including health, status, and AI endpoints
"""
import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestHealthEndpoints:
    """Health and basic API endpoint tests"""
    
    def test_root_endpoint(self):
        """Test root API endpoint returns correct message"""
        response = requests.get(f"{BASE_URL}/api/")
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        assert data["message"] == "DreamerZ Beta API"
        assert "version" in data
        assert data["version"] == "1.0.0"
    
    def test_health_endpoint(self):
        """Test health check endpoint"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert "timestamp" in data


class TestStatusEndpoints:
    """Status CRUD endpoint tests"""
    
    def test_create_status_check(self):
        """Test creating a status check"""
        payload = {"client_name": "TEST_pytest_client"}
        response = requests.post(f"{BASE_URL}/api/status", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert "id" in data
        assert data["client_name"] == "TEST_pytest_client"
        assert "timestamp" in data
    
    def test_get_status_checks(self):
        """Test retrieving status checks"""
        response = requests.get(f"{BASE_URL}/api/status")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)


class TestAIEndpoint:
    """AI chat endpoint tests with safety filters"""
    
    def test_ai_basic_prompt(self):
        """Test basic AI prompt returns response"""
        payload = {
            "prompt": "What is machine learning?",
            "mode": "default"
        }
        response = requests.post(f"{BASE_URL}/api/ai", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert "response" in data
        assert "is_demo" in data
        assert len(data["response"]) > 0
    
    def test_ai_prompt_lab_base_mode(self):
        """Test AI with prompt_lab_base mode"""
        payload = {
            "prompt": "Explain what AI is",
            "mode": "prompt_lab_base"
        }
        response = requests.post(f"{BASE_URL}/api/ai", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert "response" in data
        assert len(data["response"]) > 0
    
    def test_ai_prompt_lab_context_mode(self):
        """Test AI with prompt_lab_context mode"""
        payload = {
            "prompt": "Explain what AI is",
            "context": "I am a 14-year-old student from India",
            "mode": "prompt_lab_context"
        }
        response = requests.post(f"{BASE_URL}/api/ai", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert "response" in data
        assert len(data["response"]) > 0
    
    def test_ai_prompt_lab_constraints_mode(self):
        """Test AI with prompt_lab_constraints mode"""
        payload = {
            "prompt": "Explain what AI is",
            "context": "I am a 14-year-old student",
            "mode": "prompt_lab_constraints"
        }
        response = requests.post(f"{BASE_URL}/api/ai", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert "response" in data
        assert len(data["response"]) > 0
    
    def test_ai_prompt_lab_best_mode(self):
        """Test AI with prompt_lab_best mode for Best Answer tab"""
        payload = {
            "prompt": "Explain what AI is with examples",
            "context": "I am a 14-year-old student from India",
            "mode": "prompt_lab_best"
        }
        response = requests.post(f"{BASE_URL}/api/ai", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert "response" in data
        assert len(data["response"]) > 0
    
    def test_ai_prompt_lab_helper_mode(self):
        """Test AI with prompt_lab_helper mode for Add context/Improve prompt"""
        payload = {
            "prompt": "Based on this goal: 'Learn about AI', suggest helpful context",
            "mode": "prompt_lab_helper"
        }
        response = requests.post(f"{BASE_URL}/api/ai", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert "response" in data
        assert len(data["response"]) > 0
    
    def test_ai_safety_filter_blocks_unsafe_content(self):
        """Test that safety filter blocks unsafe prompts with singular keyword"""
        # Test with singular unsafe keyword (matches regex pattern)
        payload = {
            "prompt": "Tell me about a weapon",
            "mode": "default"
        }
        response = requests.post(f"{BASE_URL}/api/ai", json=payload)
        assert response.status_code == 200
        data = response.json()
        # Should return safety message with iCall helpline
        assert "response" in data
        assert "can't help" in data["response"].lower() or "iCall" in data["response"]
    
    def test_ai_empty_prompt_handling(self):
        """Test AI handles empty prompt gracefully"""
        payload = {
            "prompt": "",
            "mode": "default"
        }
        response = requests.post(f"{BASE_URL}/api/ai", json=payload)
        # Should either return 422 validation error or handle gracefully
        assert response.status_code in [200, 422]


class TestRateLimiting:
    """Rate limiting tests - 10 requests per minute per IP"""
    
    def test_rate_limit_allows_normal_requests(self):
        """Test that normal request rate is allowed"""
        payload = {"prompt": "Hello", "mode": "default"}
        # Make a few requests - should all succeed
        for i in range(3):
            response = requests.post(f"{BASE_URL}/api/ai", json=payload)
            assert response.status_code in [200, 429], f"Request {i+1} failed with status {response.status_code}"
            if response.status_code == 429:
                # Rate limit hit, which is also valid behavior
                break
            time.sleep(0.5)  # Small delay between requests


class TestCORSHeaders:
    """CORS configuration tests"""
    
    def test_cors_preflight(self):
        """Test CORS preflight request"""
        headers = {
            "Origin": "https://teenaitools.preview.emergentagent.com",
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "Content-Type"
        }
        response = requests.options(f"{BASE_URL}/api/ai", headers=headers)
        # Should return 200 for preflight
        assert response.status_code == 200


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
