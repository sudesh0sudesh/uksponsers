import requests
import csv
import json
import logging
from typing import Optional, List, Dict
from pathlib import Path
from bs4 import BeautifulSoup
from dataclasses import dataclass

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

URL = "https://www.gov.uk/government/publications/register-of-licensed-sponsors-workers"
OUTPUT_FILE = "../sponsors.json"

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
                organisation_name=row['Organisation Name'],
                town_city=row['Town/City'],
                county=row['County'],
                type_rating=row['Type & Rating'],
                route=row['Route']
            )
            sponsors.append(sponsor.__dict__)
        
        # Save to JSON file
        output_path = Path(OUTPUT_FILE)
        with output_path.open('w', encoding='utf-8') as f:
            json.dump(sponsors, f, indent=2)
            
        logger.info(f"Saved {len(sponsors)} sponsors to {output_path}")
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