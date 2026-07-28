from passlib.registry import register_crypt_handler
from passlib.handlers.bcrypt import _bcrypt

def _calc_checksum(secret, config):
    # Truncate the password to a maximum of 72 bytes before hashing
    truncated_secret = secret[:72]
    return _bcrypt.hashpw(truncated_secret, config)

# Register the bcrypt handler
register_crypt_handler(_bcrypt)
