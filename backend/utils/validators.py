"""Input validation utilities."""
import re
from typing import Optional


def validate_email(email: str) -> bool:
    """Validate email format."""
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return bool(re.match(pattern, email))


def validate_url(url: str) -> bool:
    """Validate URL format."""
    pattern = r'^https?://[^\s/$.?#].[^\s]*$'
    return bool(re.match(pattern, url))


def validate_session_id(session_id: str) -> bool:
    """Validate session ID format (UUID)."""
    pattern = r'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    return bool(re.match(pattern, session_id.lower()))


def sanitize_filename(filename: str) -> str:
    """Sanitize filename to prevent path traversal."""
    # Remove path separators and dangerous characters
    filename = re.sub(r'[/\\]', '', filename)
    filename = re.sub(r'[^\w\s.-]', '', filename)
    return filename.strip()


def validate_file_size(size_bytes: int, max_mb: int = 50) -> bool:
    """Validate file size is within limits."""
    max_bytes = max_mb * 1024 * 1024
    return 0 < size_bytes <= max_bytes


def validate_file_extension(filename: str, allowed_extensions: list) -> bool:
    """Validate file has allowed extension."""
    ext = filename.lower().split('.')[-1] if '.' in filename else ''
    return ext in [e.lower().strip('.') for e in allowed_extensions]


def sanitize_text(text: str, max_length: Optional[int] = None) -> str:
    """Sanitize text input by removing potentially dangerous content."""
    # Remove null bytes
    text = text.replace('\x00', '')
    
    # Trim whitespace
    text = text.strip()
    
    # Limit length if specified
    if max_length and len(text) > max_length:
        text = text[:max_length]
    
    return text


def validate_phone(phone: str) -> bool:
    """Validate phone number format (basic)."""
    # Remove common separators
    cleaned = re.sub(r'[\s\-\(\)\+]', '', phone)
    # Check if it's 10-15 digits
    return bool(re.match(r'^\d{10,15}$', cleaned))


def validate_github_token(token: str) -> bool:
    """Validate GitHub token format."""
    # GitHub tokens start with ghp_, gho_, ghu_, ghs_, or ghr_
    pattern = r'^gh[pousr]_[A-Za-z0-9]{36,}$'
    return bool(re.match(pattern, token))


def validate_api_key(key: str, min_length: int = 20) -> bool:
    """Validate generic API key format."""
    return len(key) >= min_length and key.isalnum()

# Made with Bob
