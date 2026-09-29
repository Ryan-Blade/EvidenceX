import re

class PIIMasker:
    """
    Masking runs before storage of any display copy.
    OTP and PINs are hard redacted (****) and can NEVER be revealed.
    Phone, Email, UPI, Bank accounts are masked and require authorized reveal with audit log.
    """

    @staticmethod
    def mask_phone(phone: str) -> str:
        clean = re.sub(r'[\s\-\(\)\+]', '', phone)
        if len(clean) >= 10:
            # show first 2 and last 2 digits
            return f"{clean[:2]}******{clean[-2:]}"
        elif len(clean) >= 6:
            return f"{clean[:2]}***{clean[-1:]}"
        return "****"

    @staticmethod
    def mask_email(email: str) -> str:
        if "@" in email:
            parts = email.split("@")
            user = parts[0]
            domain = parts[1]
            if len(user) > 2:
                masked_user = f"{user[:2]}***"
            else:
                masked_user = f"{user[:1]}***"
            return f"{masked_user}@{domain}"
        return "****@***.com"

    @staticmethod
    def mask_upi(upi: str) -> str:
        if "@" in upi:
            handle, bank = upi.split("@", 1)
            if len(handle) > 3:
                masked_handle = f"{handle[:3]}***"
            else:
                masked_handle = f"{handle[:1]}***"
            return f"{masked_handle}@{bank}"
        return "***@upi"

    @staticmethod
    def mask_bank_account(acc: str) -> str:
        clean = re.sub(r'\s+', '', acc)
        if len(clean) >= 8:
            return f"********{clean[-4:]}"
        elif len(clean) >= 4:
            return f"****{clean[-2:]}"
        return "********"

    @staticmethod
    def mask_card_number(card: str) -> str:
        clean = re.sub(r'[\s\-]', '', card)
        if len(clean) >= 12:
            return f"**** **** **** {clean[-4:]}"
        return "**** **** **** ****"

    @staticmethod
    def redact_otp_or_pin(secret: str) -> str:
        # OTP / PIN is NEVER revealable to anyone
        return "****"

    @classmethod
    def mask_value(cls, entity_type: str, raw_val: str) -> str:
        etype = entity_type.upper()
        if not raw_val:
            return ""
        if etype in ["PHONE", "PHONE_NUMBER"]:
            return cls.mask_phone(raw_val)
        elif etype == "EMAIL":
            return cls.mask_email(raw_val)
        elif etype in ["UPI", "UPI_ID"]:
            return cls.mask_upi(raw_val)
        elif etype in ["BANK_ACCOUNT", "ACCOUNT_NUMBER"]:
            return cls.mask_bank_account(raw_val)
        elif etype in ["CARD", "CARD_NUMBER"]:
            return cls.mask_card_number(raw_val)
        elif etype in ["OTP", "PIN", "PASSWORD", "CVV"]:
            return cls.redact_otp_or_pin(raw_val)
        return raw_val

    @classmethod
    def redact_text(cls, text: str) -> str:
        """
        Comprehensive forensic redactor: replaces unmasked phone numbers, emails,
        UPI VPAs, bank account numbers, card numbers, and credentials/PINs
        with privacy-compliant masked tokens.
        """
        if not text:
            return ""

        redacted = str(text)

        # 1. Redact OTP / PIN occurrences
        redacted = re.sub(
            r'(?i)\b(OTP|PIN|CVV|password|passcode)\b(\s*(?:is|:|code|#)?\s*)([0-9]{4,8})\b',
            r'\1\2****',
            redacted
        )

        # 2. Redact Email addresses
        def _replace_email(match):
            em = match.group(0)
            if "***" in em:
                return em
            return cls.mask_email(em)

        redacted = re.sub(r'\b[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+\b', _replace_email, redacted)

        # 3. Redact UPI IDs / VPAs (e.g. fraud119@upi, groceries@bigbasket)
        def _replace_upi(match):
            upi_str = match.group(0)
            if "***" in upi_str:
                return upi_str
            return cls.mask_upi(upi_str)

        redacted = re.sub(
            r'\b[a-zA-Z0-9.\-_]{3,}@(?!gmail|yahoo|hotmail|outlook|gov|nic|example|test)[a-zA-Z0-9.\-_]+\b',
            _replace_upi,
            redacted
        )

        # 4. Redact Phone numbers (+91 90000 11122, +919000011122, 9876543210)
        def _replace_phone(match):
            ph = match.group(0).strip()
            # Ignore helplines starting with 1800
            if ph.startswith("1800") or "1800-" in ph:
                return ph
            if "***" in ph:
                return ph
            clean = re.sub(r'[\s\-\(\)\+]', '', ph)
            if len(clean) >= 10:
                return f"+91 {clean[-10:-8]}******{clean[-2:]}" if ph.startswith("+91") else f"{clean[:2]}******{clean[-2:]}"
            return "****"

        redacted = re.sub(
            r'(?:\+?91[\-\s]?)?[6-9]\d{4}[\-\s]?\d{5}\b|\+91\s*[0-9]{5}\s*[0-9]{5}\b',
            _replace_phone,
            redacted
        )

        # 5. Redact Bank Account Numbers (e.g. XXXXXXXX4482 -> ********4482, 309988219034 -> ********9034)
        def _replace_bank_acc(match):
            acc_str = match.group(0)
            if "********" in acc_str or "****" in acc_str:
                return acc_str
            return cls.mask_bank_account(acc_str)

        redacted = re.sub(r'\b[X]{4,12}[0-9]{2,6}\b|\b[0-9]{11,18}\b', _replace_bank_acc, redacted)

        return redacted

    @classmethod
    def is_reveal_permitted(cls, entity_type: str) -> bool:
        etype = entity_type.upper()
        if etype in ["OTP", "PIN", "PASSWORD", "CVV"]:
            return False
        return True
