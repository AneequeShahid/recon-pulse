from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime

class ReportRequest(BaseModel):
    url: str

class TechStack(BaseModel):
    technologies: List[str] = []
    categories: Dict[str, Any] = {}

class SecurityInfo(BaseModel):
    ssl_grade: Optional[str] = None
    headers_grade: Optional[str] = None
    https: bool = False

class PerformanceInfo(BaseModel):
    performance_score: Optional[int] = None
    lcp: Optional[float] = None
    cls: Optional[float] = None
    fcp: Optional[float] = None

class HostingInfo(BaseModel):
    ip: Optional[str] = None
    country: Optional[str] = None
    city: Optional[str] = None
    isp: Optional[str] = None
    asn: Optional[str] = None

class DomainInfo(BaseModel):
    registrar: Optional[str] = None
    created: Optional[str] = None
    expires: Optional[str] = None
    age_days: Optional[int] = None
    nameservers: Optional[List[str]] = None

class NewsItem(BaseModel):
    title: str
    source: str
    date: str
    url: str

class GitHubInfo(BaseModel):
    exists: bool = False
    repos: Optional[int] = None
    followers: Optional[int] = None
    top_repos: Optional[List[str]] = None

class ColorPalette(BaseModel):
    dominant: Optional[str] = None
    palette: Optional[List[str]] = None

class CarbonInfo(BaseModel):
    grams_per_view: Optional[float] = None
    cleaner_than: Optional[int] = None
    rating: Optional[str] = None

class TrafficInfo(BaseModel):
    tranco_rank: Optional[int] = None
    rank_label: Optional[str] = None

class RedirectHop(BaseModel):
    url: str
    status: int
    location: Optional[str] = None

class RedirectChain(BaseModel):
    hops: List[RedirectHop] = []
    total: int = 0

class EmailSecurity(BaseModel):
    spf: bool
    dmarc: bool
    dkim: bool
    spf_record: Optional[str] = None
    dmarc_record: Optional[str] = None

class ReportData(BaseModel):
    id: str
    url: str
    screenshot_url: Optional[str] = None
    og_title: Optional[str] = None
    og_description: Optional[str] = None
    favicon: Optional[str] = None
    tech_stack: Optional[TechStack] = None
    security: Optional[SecurityInfo] = None
    performance: Optional[PerformanceInfo] = None
    hosting: Optional[HostingInfo] = None
    domain: Optional[DomainInfo] = None
    news: Optional[List[NewsItem]] = None
    github: Optional[GitHubInfo] = None
    colors: Optional[ColorPalette] = None
    carbon: Optional[CarbonInfo] = None
    traffic: Optional[TrafficInfo] = None
    dns_records: Optional[Dict[str, Any]] = None
    redirect_chain: Optional[RedirectChain] = None
    email_security: Optional[EmailSecurity] = None
    created_at: datetime
    status: str  # "pending" | "partial" | "complete" | "error"


