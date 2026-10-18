import socket
from database import companies_col


def get_server_local_ip() -> str | None:
    """Detect the server local IP address."""
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return "127.0.0.1"


import ipaddress


def match_ip_rule(client_ip: str, rule: str) -> bool:
    """Check if client_ip matches an exact IP, CIDR block, or subnet prefix."""
    if not client_ip or not rule:
        return False
    client_ip = client_ip.strip()
    rule = rule.strip()
    if client_ip == rule:
        return True
    # Try CIDR / network matching
    try:
        net = ipaddress.ip_network(rule, strict=False)
        ip = ipaddress.ip_address(client_ip)
        return ip in net
    except Exception:
        pass
    # Try prefix matching (e.g. 192.168.29)
    if client_ip.startswith(rule):
        return True
    return False


def is_office_ip(client_ip: str, company_id: str = None, strict_check: bool = False) -> tuple[bool, str]:
    """
    Verify if the client is on the organization's authorized office Wi-Fi / IP subnet.
    Supports:
    - Office static IP / public IP
    - IP CIDR ranges (e.g. 192.168.1.0/24, 10.0.0.0/16)
    - Comma-separated IP / CIDR list
    - Subnet prefixes
    """
    server_ip = get_server_local_ip() or "127.0.0.1"

    configured_rules = []
    if company_id:
        company = companies_col.find_one({"company_id": company_id.upper()})
        if company:
            # 1. Super Admin Attendance Controller rule (authoritative when set)
            controller = company.get("attendance_controller") or {}
            office_ip_setting = controller.get("office_wifi_ip") or controller.get("officeWifiIp")
            if office_ip_setting:
                for item in str(office_ip_setting).split(","):
                    if item.strip():
                        configured_rules.append(item.strip())

            # 2. Company Organization setting / legacy aliases
            if not configured_rules:
                office_ip_setting = company.get("officeWifiIp") or company.get("office_wifi_ip")
                if office_ip_setting:
                    for item in str(office_ip_setting).split(","):
                        if item.strip():
                            configured_rules.append(item.strip())

            # 3. Office-location subnets
            locations = company.get("office_locations", [])
            for loc in locations:
                subnet = loc.get("wifi_subnet") or loc.get("wifi_ip")
                if subnet and subnet.strip():
                    configured_rules.append(subnet.strip())

    # Direct match against configured office rules
    if configured_rules:
        for rule in configured_rules:
            if match_ip_rule(client_ip, rule):
                return True, f"Authorized Office Wi-Fi/IP verified ({client_ip} matches rule {rule})"

        # A configured organization rule is a hard boundary. There is no
        # localhost/server fallback once an authorized rule exists.
        return False, f"Device IP ({client_ip}) does not match organization's authorized office Wi-Fi network ({', '.join(configured_rules)})"

    # Layer 1: Localhost / Server machine (development fallback only when no
    # organization rule has been configured).
    if not client_ip or client_ip in ("127.0.0.1", "::1", "localhost"):
        return True, f"Verified on Local Office Network ({server_ip})"

    # If client IP matches server IP directly
    if client_ip == server_ip:
        return True, f"Verified on Server Network ({server_ip})"

    if not configured_rules:
        default_subnets = ["192.168.29", "192.168.1", "10.0.0", "172.16.0"]
        client_subnet = ".".join(client_ip.split(".")[:3])
        server_subnet = ".".join(server_ip.split(".")[:3])

        if client_subnet in default_subnets or client_subnet == server_subnet:
            return True, f"Authorized Office WiFi verified (IP: {client_ip} on Subnet {client_subnet}.*)"
        return False, f"Device IP ({client_ip}) is not connected to company's authorized office WiFi subnets ({', '.join(default_subnets)})"

    return False, f"Device IP ({client_ip}) is not connected to company's authorized office WiFi ({', '.join(configured_rules)})"


def get_client_real_ip(request) -> str:
    """Extract the real client IP from request headers."""
    forwarded = request.headers.get("X-Forwarded-For", "")
    if forwarded:
        return forwarded.split(",")[0].strip()
    real = request.headers.get("X-Real-IP", "")
    if real:
        return real.strip()
    return request.remote_addr or "127.0.0.1"
