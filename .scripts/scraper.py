import requests
import csv
import json
import logging
from typing import Optional, List, Dict
from pathlib import Path
from bs4 import BeautifulSoup
from dataclasses import dataclass
import html

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

URL = "https://www.gov.uk/government/publications/register-of-licensed-sponsors-workers"
OUTPUT_DIR = "sponsors_pages"

@dataclass
class Sponsor:
    organisation_name: str
    town_city: str
    county: str
    type_rating: str
    route: str

def get_url() -> Optional[str]:
    """Fetch the CSV URL from the government website."""
    try:
        response = requests.get(URL, timeout=30)
        response.raise_for_status()
        
        soup = BeautifulSoup(response.text, 'html.parser')
        link = soup.find('a', href=lambda href: href and href.endswith('.csv'))
        
        if not link:
            logger.error("No CSV link found on the page")
            return None
            
        csv_url = link['href']
        logger.info(f"Found CSV URL: {csv_url}")
        return csv_url
        
    except requests.RequestException as e:
        logger.error(f"Failed to fetch URL: {e}")
        return None

def sanitize_data(data: str) -> str:
    """Sanitize data to be safe for HTML display."""
    return html.escape(data)

def save_page(page_data: List[Dict], page_number: int) -> None:
    """Save a page of data to a separate JSON file."""
    output_path = Path(OUTPUT_DIR) / f"sponsors_page_{page_number}.json"
    with output_path.open('w', encoding='utf-8') as f:
        json.dump(page_data, f, indent=2)
    logger.info(f"Saved page {page_number} with {len(page_data)} sponsors to {output_path}")

def process_csv(url: str) -> Optional[List[Dict]]:
    """Process the CSV file and convert to structured data."""
    try:
        response = requests.get(url, timeout=30)
        response.raise_for_status()
        
        content = response.content.decode('utf-8')
        csv_reader = csv.DictReader(content.splitlines())
        
        sponsors = []
        for row in csv_reader:
            sponsor = Sponsor(
                organisation_name=sanitize_data(row['Organisation Name']),
                town_city=sanitize_data(row['Town/City']),
                county=sanitize_data(row['County']),
                type_rating=sanitize_data(row['Type & Rating']),
                route=sanitize_data(row['Route'])
            )
            sponsors.append(sponsor.__dict__)
        
        # Split data into pages and save each page
        page_size = 10000  # Number of sponsors per page
        for i in range(0, len(sponsors), page_size):
            page_data = sponsors[i:i + page_size]
            save_page(page_data, i // page_size + 1)
            
        logger.info(f"Processed {len(sponsors)} sponsors and saved to pages")
        return sponsors
        
    except (requests.RequestException, csv.Error, json.JSONDecodeError) as e:
        logger.error(f"Error processing CSV: {e}")
        return None

def main():
    """Main entry point of the script."""
    url = get_url()
    if url:
        sponsors = process_csv(url)
        if sponsors:
            logger.info("Successfully processed sponsor data")
        else:
            logger.error("Failed to process sponsor data")

if __name__ == "__main__":
    main()
