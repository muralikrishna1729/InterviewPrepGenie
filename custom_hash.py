from passlib.handlers.bcrypt import bcrypt as _bcrypt

def custom_hashpw(password, config):
    truncated_password = password[:72]  # Truncate password if longer than 72 bytes
    return _bcrypt.hashpw(truncated_password, config)